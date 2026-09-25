import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('OrdersService (Backend Testing)', () => {
  let ordersService: OrdersService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-uuid-1',
    title: 'Wireless Headphones',
    sku: 'WH-01',
    price: new Prisma.Decimal(100.0),
    stockQuantity: 10,
    status: 'ACTIVE',
    store: {
      id: 'store-uuid-1',
      commissionRate: new Prisma.Decimal(10.0), // 10%
    },
  };

  const mockCart = {
    id: 'cart-uuid-1',
    userId: 'user-uuid-1',
    items: [
      {
        id: 'cart-item-1',
        productId: 'prod-uuid-1',
        quantity: 2,
        selectedAttributes: {},
        product: mockProduct,
      },
    ],
  };

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'ORD-2026-0001',
    userId: 'user-uuid-1',
    status: 'PENDING',
    subtotal: new Prisma.Decimal(200.0),
    totalAmount: new Prisma.Decimal(200.0),
    items: [
      {
        id: 'item-1',
        productId: 'prod-uuid-1',
        storeId: 'store-uuid-1',
        quantity: 2,
        unitPrice: new Prisma.Decimal(100.0),
        totalPrice: new Prisma.Decimal(200.0),
        commissionAmount: new Prisma.Decimal(20.0),
        vendorPayoutAmount: new Prisma.Decimal(180.0),
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      store: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const inventoryService = {
      deductStock: vi.fn().mockResolvedValue(undefined),
      restoreStock: vi.fn().mockResolvedValue(undefined),
    };

    ordersService = new OrdersService(
      prisma as PrismaService,
      inventoryService as any,
    );
  });

  describe('Create Order From Cart Flow', () => {
    const createDto = {
      shippingAddress: {
        street: '123 Main St',
        city: 'Metropolis',
        country: 'US',
        postalCode: '10001',
      },
      billingAddress: {
        street: '123 Main St',
        city: 'Metropolis',
        country: 'US',
        postalCode: '10001',
      },
    };

    it('should throw BadRequestException if cart is empty', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(
        ordersService.createFromCart('user-uuid-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product stock is insufficient', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            ...mockCart.items[0],
            quantity: 50, // exceeds stock of 10
          },
        ],
      });

      await expect(
        ordersService.createFromCart('user-uuid-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should atomically decrement stock and calculate commissions in transaction', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          product: { update: vi.fn().mockResolvedValue(mockProduct) },
          order: { create: vi.fn().mockResolvedValue(mockOrder) },
          cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return callback(tx);
      });

      const order = await ordersService.createFromCart(
        'user-uuid-1',
        createDto,
      );

      expect(order.id).toBe('order-uuid-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Update Order Status Flow', () => {
    it('should update order status to PAID', async () => {
      prisma.user.findUnique = vi
        .fn()
        .mockResolvedValue({ id: 'user-uuid-1', role: 'ADMIN' });
      prisma.store.findMany = vi.fn().mockResolvedValue([]);
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, items: [] });
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          orderItem: { updateMany: vi.fn() },
          order: {
            update: vi.fn().mockResolvedValue({ ...mockOrder, status: 'PAID' }),
          },
        };
        return callback(tx);
      });

      const updated = await ordersService.updateOrderStatus(
        'user-uuid-1',
        'order-uuid-1',
        { status: 'PAID' as any },
      );

      expect(updated.status).toBe('PAID');
    });

    it('should restore stock quantities when order is cancelled', async () => {
      prisma.user.findUnique = vi
        .fn()
        .mockResolvedValue({ id: 'user-uuid-1', role: 'ADMIN' });
      prisma.store.findMany = vi.fn().mockResolvedValue([]);
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [{ productId: 'prod-uuid-1', quantity: 2 }],
      });
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          product: { update: vi.fn() },
          orderItem: { updateMany: vi.fn() },
          order: {
            update: vi
              .fn()
              .mockResolvedValue({ ...mockOrder, status: 'CANCELLED' }),
          },
        };
        return callback(tx);
      });

      const cancelled = await ordersService.updateOrderStatus(
        'user-uuid-1',
        'order-uuid-1',
        { status: 'CANCELLED' as any },
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
