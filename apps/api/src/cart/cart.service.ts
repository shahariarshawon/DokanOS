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
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Compute subtotal and evaluate stock availability dynamically
    let subtotal = new Prisma.Decimal(0);
    let totalItems = 0;

    const formattedItems = cart.items.map((item) => {
      const unitPrice = item.product.price;
      const itemTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(itemTotal);
      totalItems += item.quantity;

      const inStock =
        item.product.status === 'ACTIVE' && item.product.stockQuantity >= item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productTitle: item.product.title,
        productSlug: item.product.slug,
        unitPrice: item.product.price,
        quantity: item.quantity,
        totalItemPrice: itemTotal,
        selectedAttributes: item.selectedAttributes,
        inStock,
        availableQuantity: item.product.stockQuantity,
        primaryImage: item.product.images[0]?.url ?? null,
        store: item.product.store,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items: formattedItems,
      subtotal,
      totalItems,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || product.status === 'ARCHIVED') {
      throw new NotFoundException(`Product with ID '${dto.productId}' not found`);
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException(`Product '${product.title}' is currently not available for purchase`);
    }

    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    if (product.stockQuantity < newQuantity) {
      throw new BadRequestException(
        `Insufficient stock for '${product.title}'. Only ${product.stockQuantity} available in inventory.`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        selectedAttributes: (dto.selectedAttributes ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        quantity: newQuantity,
        selectedAttributes: dto.selectedAttributes
          ? ((dto.selectedAttributes ?? {}) as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException(`Cart item '${itemId}' not found in user cart`);
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.getOrCreateCart(userId);
    }

    if (item.product.stockQuantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for '${item.product.title}'. Maximum available is ${item.product.stockQuantity}.`,
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
