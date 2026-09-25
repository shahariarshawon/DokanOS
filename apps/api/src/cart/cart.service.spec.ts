import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('CartService (Backend Testing)', () => {
  let cartService: CartService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-uuid-1',
    title: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    price: new Prisma.Decimal(999.0),
    stockQuantity: 20,
    status: 'ACTIVE',
    images: [{ url: 'https://cdn.example.com/iphone.jpg' }],
    store: {
      id: 'store-uuid-1',
      name: 'Apple Authorized Store',
      slug: 'apple-authorized',
    },
    variants: [
      {
        id: 'var-uuid-1',
        title: 'Black / 128GB',
        sku: 'IPH15P-BLK-128',
        price: new Prisma.Decimal(999.0),
        stockQuantity: 10,
        attributes: { color: 'Black', storage: '128GB' },
      },
      {
        id: 'var-uuid-2',
        title: 'Blue / 256GB',
        sku: 'IPH15P-BLU-256',
        price: new Prisma.Decimal(1099.0),
        stockQuantity: 5,
        attributes: { color: 'Blue', storage: '256GB' },
      },
    ],
  };

  const mockCart = {
    id: 'cart-uuid-1',
    userId: 'user-uuid-1',
    items: [],
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: vi.fn().mockResolvedValue(mockCart),
        create: vi.fn().mockResolvedValue(mockCart),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue(mockProduct),
      },
      cartItem: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    cartService = new CartService(prisma as PrismaService);
  });

  describe('Add to Cart with Variants', () => {
    it('should add specific product variant into cart', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await cartService.addItem('user-uuid-1', {
        productId: 'prod-uuid-1',
        variantId: 'var-uuid-1',
        quantity: 2,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cartId: 'cart-uuid-1',
          productId: 'prod-uuid-1',
          variantId: 'var-uuid-1',
          quantity: 2,
        }),
      });
    });

    it('should reject addition when quantity exceeds variant stock', async () => {
      await expect(
        cartService.addItem('user-uuid-1', {
          productId: 'prod-uuid-1',
          variantId: 'var-uuid-2', // stock is 5
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if variant does not exist on product', async () => {
      await expect(
        cartService.addItem('user-uuid-1', {
          productId: 'prod-uuid-1',
          variantId: 'non-existent-variant',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Cart Item Quantity Updates & Multi-Store Aggregation', () => {
    it('should remove item when updated quantity is zero or less', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-uuid-1',
        productId: 'prod-uuid-1',
        quantity: 1,
        product: mockProduct,
      });

      await cartService.updateItemQuantity('user-uuid-1', 'item-1', 0);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should group items by seller store in getOrCreateCart response', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-uuid-1',
        userId: 'user-uuid-1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-uuid-1',
            quantity: 1,
            product: mockProduct,
            variant: mockProduct.variants[0],
          },
        ],
        updatedAt: new Date(),
      });

      const result = await cartService.getOrCreateCart('user-uuid-1');

      expect(result.stores.length).toBe(1);
      expect(result.stores[0].store.name).toBe('Apple Authorized Store');
      expect(result.items[0].variantTitle).toBe('Black / 128GB');
    });
  });
});
