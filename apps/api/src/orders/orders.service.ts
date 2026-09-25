import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { AuditService } from '../common/audit/audit.service.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { store: true },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 1. Verify stock availability for all items
    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Product '${item.product.title}' is no longer active`,
        );
      }

      const availableStock = item.variant
        ? item.variant.stockQuantity
        : item.product.stockQuantity;

      if (availableStock < item.quantity) {
        const title = item.variant
          ? `${item.product.title} (${item.variant.title})`
          : item.product.title;
        throw new BadRequestException(
          `Insufficient stock for '${title}'. Requested: ${item.quantity}, Available: ${availableStock}`,
        );
      }
    }

    // 2. Perform atomic stock decrement, order generation, and inventory audit logs
    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0);

      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `DOK-${year}-${randomSuffix}`;

      // Deduct stock using InventoryService
      await this.inventoryService.deductStock(
        tx,
        cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          referenceId: orderNumber,
        })),
      );

      // Compute financial totals
      for (const item of cart.items) {
        const itemPrice = item.variant?.price ?? item.product.price;
        subtotal = subtotal.add(itemPrice.mul(item.quantity));
      }

      const taxAmount = subtotal.mul(0.05); // 5% tax
      const shippingAmount = subtotal.gte(500)
        ? new Prisma.Decimal(0.0)
        : new Prisma.Decimal(15.0); // Free shipping over $500
      const discountAmount = new Prisma.Decimal(0.0);
      const totalAmount = subtotal
        .add(taxAmount)
        .add(shippingAmount)
        .sub(discountAmount);

      // Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          subtotal,
          taxAmount,
          shippingAmount,
          discountAmount,
          totalAmount,
          currency: 'USD',
          shippingAddress:
            dto.shippingAddress as unknown as Prisma.InputJsonValue,
          billingAddress: (dto.billingAddress ??
            dto.shippingAddress) as unknown as Prisma.InputJsonValue,
          customerNote: dto.customerNote,
          items: {
            create: cart.items.map((item) => {
              const itemPrice = item.variant?.price ?? item.product.price;
              const itemTotal = itemPrice.mul(item.quantity);
              const commissionRate = item.product.store.commissionRate;
              const commissionAmount = itemTotal.mul(commissionRate).div(100);
              const vendorPayoutAmount = itemTotal.sub(commissionAmount);

              return {
                productId: item.productId,
                variantId: item.variantId,
                variantTitle: item.variant?.title ?? null,
                storeId: item.product.storeId,
                productTitle: item.product.title,
                productSku: item.variant?.sku ?? item.product.sku,
                unitPrice: itemPrice,
                quantity: item.quantity,
                totalPrice: itemTotal,
                commissionRate,
                commissionAmount,
                vendorPayoutAmount,
                selectedAttributes: (item.variant?.attributes ??
                  item.selectedAttributes ??
                  {}) as Prisma.InputJsonValue,
                fulfillmentStatus: 'UNFULFILLED',
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              store: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      // Clear the user's cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      if (this.auditService) {
        await this.auditService.log({
          userId,
          action: 'ORDER_CREATED',
          resource: 'Order',
          resourceId: order.id,
          details: {
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
            itemCount: cart.items.length,
          },
        });
      }

      return order;
    });
  }

  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            store: { select: { id: true, name: true, slug: true } },
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            provider: true,
            status: true,
            amount: true,
            transactionId: true,
          },
        },
      },
      orderBy: { placedAt: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      timeline: this.buildOrderTimeline(order),
    }));
  }

  async getSellerOrders(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    const stores = await this.prisma.store.findMany({
      where: isAdmin ? {} : { sellerProfile: { userId } },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);

    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: { storeId: { in: storeIds } },
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          where: isAdmin ? {} : { storeId: { in: storeIds } },
          include: {
            store: { select: { id: true, name: true, slug: true } },
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { placedAt: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      timeline: this.buildOrderTimeline(order),
    }));
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          include: {
            store: { select: { id: true, name: true, slug: true } },
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isCustomer = order.userId === userId;
    const isAdmin = user?.role === 'ADMIN';

    // Verify if user is seller of any line item in this order
    const sellerStores = await this.prisma.store.findMany({
      where: { sellerProfile: { userId } },
      select: { id: true },
    });
    const sellerStoreIds = new Set(sellerStores.map((s) => s.id));
    const isSeller = order.items.some((item) =>
      sellerStoreIds.has(item.storeId),
    );

    if (!isCustomer && !isAdmin && !isSeller) {
      throw new ForbiddenException('You do not have access to view this order');
    }

    return {
      ...order,
      timeline: this.buildOrderTimeline(order),
    };
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwner = order.userId === userId;
    const isAdmin = user?.role === 'ADMIN';

    // Check if user is a seller owning any store containing items from this order
    const sellerStores = await this.prisma.store.findMany({
      where: { sellerProfile: { userId } },
      select: { id: true },
    });
    const sellerStoreIds = new Set(sellerStores.map((s) => s.id));
    const isSellerOfOrder = order.items.some((item) =>
      sellerStoreIds.has(item.storeId),
    );

    if (!isAdmin && !isSellerOfOrder && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to manage this order',
      );
    }

    // Customers can only cancel their own PENDING orders
    if (isOwner && !isAdmin && !isSellerOfOrder) {
      if (dto.status !== 'CANCELLED' || order.status !== 'PENDING') {
        throw new ForbiddenException(
          'Customers can only cancel orders in PENDING status',
        );
      }
    }

    // If order is transitioning to CANCELLED or REFUNDED, restore inventory via InventoryService
    if (
      (dto.status === 'CANCELLED' || dto.status === 'REFUNDED') &&
      order.status !== 'CANCELLED' &&
      order.status !== 'REFUNDED'
    ) {
      return this.prisma.$transaction(async (tx) => {
        await this.inventoryService.restoreStock(
          tx,
          order.items
            .filter((item) => item.productId !== null)
            .map((item) => ({
              productId: item.productId!,
              variantId: item.variantId,
              quantity: item.quantity,
              referenceId: order.orderNumber,
              note: `Order ${order.orderNumber} ${dto.status.toLowerCase()}`,
            })),
        );

        await tx.orderItem.updateMany({
          where: { orderId },
          data: { fulfillmentStatus: 'CANCELLED' },
        });

        return tx.order.update({
          where: { id: orderId },
          data: { status: dto.status },
          include: { items: true },
        });
      });
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (dto.fulfillmentStatus) {
        await tx.orderItem.updateMany({
          where: { orderId },
          data: {
            fulfillmentStatus: dto.fulfillmentStatus,
            ...(dto.trackingNumber
              ? { trackingNumber: dto.trackingNumber }
              : {}),
            ...(dto.carrier ? { carrier: dto.carrier } : {}),
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
        },
        include: { items: true },
      });
    });

    if (this.auditService) {
      await this.auditService.log({
        userId,
        action:
          dto.status === 'CANCELLED'
            ? 'ORDER_CANCELLED'
            : 'ORDER_STATUS_CHANGED',
        resource: 'Order',
        resourceId: order.id,
        details: {
          orderNumber: order.orderNumber,
          previousStatus: order.status,
          newStatus: dto.status,
        },
      });
    }

    return updatedOrder;
  }

  private buildOrderTimeline(order: {
    status: string;
    placedAt: Date;
    updatedAt: Date;
    items?: Array<{
      fulfillmentStatus: string;
      trackingNumber?: string | null;
      carrier?: string | null;
    }>;
  }) {
    const isCompleted = (statusList: string[]) =>
      statusList.includes(order.status);
    const trackingInfo = order.items?.find((i) => i.trackingNumber);

    return [
      {
        step: 1,
        status: 'PENDING',
        title: 'Order Placed',
        description: 'Order created and payment authorization initiated',
        timestamp: order.placedAt,
        completed: true,
        current: order.status === 'PENDING',
      },
      {
        step: 2,
        status: 'PAID',
        title: 'Payment Confirmed',
        description: 'Payment verified and held in marketplace escrow',
        timestamp: isCompleted(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'])
          ? order.updatedAt
          : null,
        completed: isCompleted(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
        current: order.status === 'PAID',
      },
      {
        step: 3,
        status: 'PROCESSING',
        title: 'Order Accepted & Processing',
        description: 'Seller is picking, preparing, and packaging your items',
        timestamp: isCompleted(['PROCESSING', 'SHIPPED', 'DELIVERED'])
          ? order.updatedAt
          : null,
        completed: isCompleted(['PROCESSING', 'SHIPPED', 'DELIVERED']),
        current: order.status === 'PROCESSING',
      },
      {
        step: 4,
        status: 'SHIPPED',
        title: 'Shipped with Carrier',
        description: trackingInfo?.trackingNumber
          ? `Dispatched via ${trackingInfo.carrier ?? 'Courier'} (${trackingInfo.trackingNumber})`
          : 'Items have been dispatched and are in transit',
        timestamp: isCompleted(['SHIPPED', 'DELIVERED'])
          ? order.updatedAt
          : null,
        completed: isCompleted(['SHIPPED', 'DELIVERED']),
        current: order.status === 'SHIPPED',
      },
      {
        step: 5,
        status: 'DELIVERED',
        title: 'Delivered',
        description: 'Package delivered to the destination address',
        timestamp: order.status === 'DELIVERED' ? order.updatedAt : null,
        completed: order.status === 'DELIVERED',
        current: order.status === 'DELIVERED',
      },
    ];
  }
}
