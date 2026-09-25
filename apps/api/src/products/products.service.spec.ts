import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { AiService } from '../ai/ai.service.js';

describe('ProductsService (Backend Testing)', () => {
  let productsService: ProductsService;
  let prisma: any;
  let aiService: Partial<AiService>;

  const mockStore = {
    id: 'store-uuid-1',
    sellerProfile: { userId: 'seller-user-1' },
    name: 'TechStore',
  };

  const mockCategory = {
    id: 'cat-uuid-1',
    name: 'Electronics',
    slug: 'electronics',
  };

  const mockProduct = {
    id: 'prod-uuid-1',
    storeId: 'store-uuid-1',
    categoryId: 'cat-uuid-1',
    title: 'Keychron Mechanical Keyboard',
    slug: 'keychron-mechanical-keyboard',
    description: 'High performance wireless mechanical keyboard',
    sku: 'KEY-001',
    price: new Prisma.Decimal(129.99),
    stockQuantity: 25,
    status: 'ACTIVE',
    attributes: { switches: 'Gateron Brown' },
    rating: new Prisma.Decimal(4.8),
    reviewCount: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      store: { findUnique: vi.fn() },
      category: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      productVariant: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventory: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'inv-uuid-1', stockQuantity: 25 }),
        update: vi.fn(),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'txn-uuid-1' }),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    aiService = {
      indexProductEmbedding: vi.fn().mockResolvedValue(undefined),
      getProductRecommendations: vi.fn(),
    };

    productsService = new ProductsService(
      prisma as PrismaService,
      aiService as AiService,
    );
  });

  describe('Create Product Flow', () => {
    const createDto = {
      storeId: 'store-uuid-1',
      categoryId: 'cat-uuid-1',
      title: 'Keychron Mechanical Keyboard',
      description: 'High performance wireless mechanical keyboard',
      sku: 'KEY-001',
      price: 129.99,
      stockQuantity: 25,
    };

    it('should create product, verify store owner, and trigger background embedding indexing', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.user.findUnique.mockResolvedValue({
        id: 'seller-user-1',
        role: 'SELLER',
      });
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.product.findUnique.mockResolvedValue(null); // No slug or SKU collision
      prisma.product.create.mockResolvedValue(mockProduct);

      const result = await productsService.create('seller-user-1', createDto);

      expect(result.id).toBe('prod-uuid-1');
      expect(prisma.product.create).toHaveBeenCalled();
      expect(aiService.indexProductEmbedding).toHaveBeenCalledWith(
        'prod-uuid-1',
      );
    });

    it('should throw ForbiddenException if user does not own the target store', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.user.findUnique.mockResolvedValue({
        id: 'malicious-user-2',
        role: 'CUSTOMER',
      });

      await expect(
        productsService.create('malicious-user-2', createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if SKU already exists within the store', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.user.findUnique.mockResolvedValue({
        id: 'seller-user-1',
        role: 'SELLER',
      });
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      // First slug check returns null, second SKU check returns existing
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(mockProduct); // sku check

      await expect(
        productsService.create('seller-user-1', createDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Query & Filter Flow', () => {
    it('should list products with pagination and filters', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);
      prisma.product.count.mockResolvedValue(1);

      const res = await productsService.findAll({
        page: 1,
        limit: 10,
        categoryId: 'cat-uuid-1',
        minPrice: 50,
        maxPrice: 200,
      });

      expect(res.data).toHaveLength(1);
      expect(res.meta.totalItems).toBe(1);
      expect(res.meta.page).toBe(1);
    });

    it('should find product by slug or UUID', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const found = await productsService.findOne(
        'keychron-mechanical-keyboard',
      );
      expect(found.title).toBe('Keychron Mechanical Keyboard');
    });

    it('should throw NotFoundException if product is missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        productsService.findOne('non-existent-product'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
