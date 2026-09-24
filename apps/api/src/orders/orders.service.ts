import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { store: true },
            },
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
        throw new BadRequestException(`Product '${item.product.title}' is no longer active`);
      }
      if (item.product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for '${item.product.title}'. Requested: ${item.quantity}, Available: ${item.product.stockQuantity}`,
        );
      }
    }

    // 2. Perform atomic stock decrement and order generation
    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0);

      // Decrement stock for all items
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
        subtotal = subtotal.add(item.product.price.mul(item.quantity));
      }

      const taxAmount = subtotal.mul(0.05); // 5% tax
      const shippingAmount = new Prisma.Decimal(10.0); // $10 standard shipping
      const discountAmount = new Prisma.Decimal(0.0);
      const totalAmount = subtotal.add(taxAmount).add(shippingAmount).sub(discountAmount);

      // Generate human-readable order number: DOK-YYYY-RANDOM
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `DOK-${year}-${randomSuffix}`;

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
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          billingAddress: (dto.billingAddress ?? dto.shippingAddress) as unknown as Prisma.InputJsonValue,
          customerNote: dto.customerNote,
          items: {
            create: cart.items.map((item) => {
              const itemTotal = item.product.price.mul(item.quantity);
              const commissionRate = item.product.store.commissionRate;
              const commissionAmount = itemTotal.mul(commissionRate).div(100);
              const vendorPayoutAmount = itemTotal.sub(commissionAmount);

              return {
                productId: item.productId,
                storeId: item.product.storeId,
                productTitle: item.product.title,
                productSku: item.product.sku,
                unitPrice: item.product.price,
                quantity: item.quantity,
                totalPrice: itemTotal,
                commissionRate,
                commissionAmount,
                vendorPayoutAmount,
                selectedAttributes: item.selectedAttributes
                  ? (item.selectedAttributes as Prisma.InputJsonValue)
                  : undefined,
                fulfillmentStatus: 'UNFULFILLED',
              };
            }),
          },
        },
        include: {
          items: true,
        },
      });

      // Clear the user's cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            store: { select: { id: true, name: true, slug: true } },
          },
        },
        payments: {
          select: { id: true, provider: true, status: true, amount: true, transactionId: true },
        },
      },
      orderBy: { placedAt: 'desc' },
    });
  }

  async getOrderById(userId: string, orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            store: { select: { id: true, name: true, slug: true } },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (order.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
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
    const isSellerOfOrder = order.items.some((item) => sellerStoreIds.has(item.storeId));

    if (!isAdmin && !isSellerOfOrder && !isOwner) {
      throw new ForbiddenException('You do not have permission to manage this order');
    }

    // Customers can only cancel their own PENDING orders
    if (isOwner && !isAdmin && !isSellerOfOrder) {
      if (dto.status !== 'CANCELLED' || order.status !== 'PENDING') {
        throw new ForbiddenException('Customers can only cancel orders in PENDING status');
      }
    }

    // If order is transitioning to CANCELLED, restore product stock quantities
    if (dto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          }
        }

        await tx.orderItem.updateMany({
          where: { orderId },
          data: { fulfillmentStatus: 'CANCELLED' },
        });

        return tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
          include: { items: true },
        });
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.fulfillmentStatus) {
        await tx.orderItem.updateMany({
          where: { orderId },
          data: {
            fulfillmentStatus: dto.fulfillmentStatus,
            ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
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
  }
}
