import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('InventoryService (Backend Testing)', () => {
  let inventoryService: InventoryService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-uuid-1',
    storeId: 'store-uuid-1',
    title: 'Nike Air Max',
    sku: 'NIKE-AM-01',
    stockQuantity: 100,
    lowStockThreshold: 10,
    status: 'ACTIVE',
    variants: [],
    images: [{ url: 'https://cdn.example.com/shoe.jpg' }],
    store: {
      id: 'store-uuid-1',
      sellerProfile: { userId: 'seller-user-1' },
    },
  };

  const mockInventory = {
    id: 'inv-uuid-1',
    productId: 'prod-uuid-1',
    variantId: null,
    sku: 'NIKE-AM-01',
    stockQuantity: 100,
    lowStockThreshold: 10,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'seller-user-1', role: 'SELLER' }),
      },
      store: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'store-uuid-1', name: 'Shoe Haven' }]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
        findUnique: vi.fn().mockResolvedValue(mockProduct),
        update: vi.fn().mockResolvedValue(mockProduct),
      },
      productVariant: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      inventory: {
        findFirst: vi.fn().mockResolvedValue(mockInventory),
        create: vi.fn().mockResolvedValue(mockInventory),
        update: vi.fn().mockResolvedValue(mockInventory),
      },
      inventoryTransaction: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'txn-1' }),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    inventoryService = new InventoryService(prisma as PrismaService);
  });

  describe('Inventory Overview', () => {
    it('should compute overview metrics: total products, total stock, low stock and out of stock counts', async () => {
      const overview = await inventoryService.getOverview('seller-user-1');

      expect(overview.totalProducts).toBe(1);
      expect(overview.totalStock).toBe(100);
      expect(overview.lowStockProducts).toBe(0);
      expect(overview.outOfStockProducts).toBe(0);
    });

    it('should flag low stock and out of stock items properly', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          ...mockProduct,
          id: 'p-low',
          stockQuantity: 4,
          lowStockThreshold: 10,
          variants: [],
          images: [],
        },
        {
          ...mockProduct,
          id: 'p-out',
          stockQuantity: 0,
          lowStockThreshold: 5,
          variants: [],
          images: [],
        },
      ]);

      const overview = await inventoryService.getOverview('seller-user-1');
      expect(overview.totalProducts).toBe(2);
      expect(overview.lowStockProducts).toBe(1);
      expect(overview.outOfStockProducts).toBe(1);
      expect(overview.lowStockItems.length).toBe(2);
    });
  });

  describe('Stock Adjustment & History Tracking', () => {
    it('should restock inventory (+100) and record RESTOCK transaction', async () => {
      const result = await inventoryService.adjustStock('seller-user-1', {
        productId: 'prod-uuid-1',
        type: 'RESTOCK',
        quantity: 100,
        note: 'Restock shipment received',
      });

      expect(result.previousStock).toBe(100);
      expect(result.newStock).toBe(200);
      expect(result.quantity).toBe(100);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        data: { stockQuantity: 200 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'RESTOCK',
          quantity: 100,
          previousStock: 100,
          newStock: 200,
        }),
      });
    });

    it('should prevent deduction below zero with BadRequestException', async () => {
      await expect(
        inventoryService.adjustStock('seller-user-1', {
          productId: 'prod-uuid-1',
          type: 'DAMAGE',
          quantity: -150, // exceeds current 100
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Order Stock Operations', () => {
    it('should deduct stock on order placement and record ORDER_DEDUCTION transaction', async () => {
      await inventoryService.deductStock(prisma, [
        {
          productId: 'prod-uuid-1',
          quantity: 5,
          referenceId: 'ORD-101',
        },
      ]);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        data: { stockQuantity: 95 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ORDER_DEDUCTION',
          quantity: -5,
          referenceId: 'ORD-101',
        }),
      });
    });

    it('should restore stock on order cancellation and record ORDER_RETURN transaction', async () => {
      await inventoryService.restoreStock(prisma, [
        {
          productId: 'prod-uuid-1',
          quantity: 5,
          referenceId: 'ORD-101',
          note: 'Cancelled order',
        },
      ]);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        data: { stockQuantity: 105 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ORDER_RETURN',
          quantity: 5,
          referenceId: 'ORD-101',
        }),
      });
    });
  });
});
