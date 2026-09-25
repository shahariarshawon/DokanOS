import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                store: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                attributes: true,
                stockQuantity: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                  store: { select: { id: true, name: true, slug: true } },
                },
              },
              variant: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  price: true,
                  attributes: true,
                  stockQuantity: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Compute subtotal and evaluate stock availability dynamically
    let subtotal = new Prisma.Decimal(0);
    let totalItems = 0;
    const storeMap = new Map<
      string,
      {
        store: { id: string; name: string; slug: string };
        items: any[];
        subtotal: Prisma.Decimal;
      }
    >();

    const formattedItems = cart.items.map((item) => {
      const unitPrice = item.variant?.price ?? item.product.price;
      const itemTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(itemTotal);
      totalItems += item.quantity;

      const availableQuantity = item.variant
        ? item.variant.stockQuantity
        : item.product.stockQuantity;

      const inStock =
        item.product.status === 'ACTIVE' && availableQuantity >= item.quantity;

      const formatted = {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.product.title,
        variantTitle: item.variant?.title ?? null,
        productSlug: item.product.slug,
        sku: item.variant?.sku ?? item.product.sku,
        unitPrice,
        quantity: item.quantity,
        totalItemPrice: itemTotal,
        selectedAttributes: item.variant?.attributes ?? item.selectedAttributes,
        inStock,
        availableQuantity,
        primaryImage: item.product.images[0]?.url ?? null,
        store: item.product.store,
      };

      // Group by store for multi-vendor checkout presentation
      const storeId = item.product.store.id;
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          store: item.product.store,
          items: [],
          subtotal: new Prisma.Decimal(0),
        });
      }
      const storeGroup = storeMap.get(storeId)!;
      storeGroup.items.push(formatted);
      storeGroup.subtotal = storeGroup.subtotal.add(itemTotal);

      return formatted;
    });

    const stores = Array.from(storeMap.values());

    return {
      id: cart.id,
      userId: cart.userId,
      items: formattedItems,
      stores,
      subtotal,
      totalItems,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });

    if (!product || product.status === 'ARCHIVED') {
      throw new NotFoundException(
        `Product with ID '${dto.productId}' not found`,
      );
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Product '${product.title}' is currently not available for purchase`,
      );
    }

    let targetVariant = null;
    if (dto.variantId) {
      targetVariant = product.variants.find((v) => v.id === dto.variantId);
      if (!targetVariant) {
        throw new NotFoundException(
          `Variant '${dto.variantId}' not found on product '${product.title}'`,
        );
      }
    }

    const availableStock = targetVariant
      ? targetVariant.stockQuantity
      : product.stockQuantity;

    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart with this exact variant
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    if (availableStock < newQuantity) {
      const name = targetVariant
        ? `${product.title} (${targetVariant.title})`
        : product.title;
      throw new BadRequestException(
        `Insufficient stock for '${name}'. Only ${availableStock} available in inventory.`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          selectedAttributes: dto.selectedAttributes
            ? (dto.selectedAttributes as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: dto.quantity,
          selectedAttributes: (dto.selectedAttributes ??
            {}) as Prisma.InputJsonValue,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Cart item '${itemId}' not found in user cart`,
      );
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.getOrCreateCart(userId);
    }

    const availableStock = item.variant
      ? item.variant.stockQuantity
      : item.product.stockQuantity;

    if (availableStock < quantity) {
      const name = item.variant
        ? `${item.product.title} (${item.variant.title})`
        : item.product.title;
      throw new BadRequestException(
        `Insufficient stock for '${name}'. Maximum available is ${availableStock}.`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException(`Cart item '${itemId}' not found`);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { message: 'Cart cleared successfully' };
  }
}
