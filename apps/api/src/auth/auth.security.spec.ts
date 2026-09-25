import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service.js';
import { StoresService } from '../stores/stores.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { AiService } from '../ai/ai.service.js';

describe('Security & Multi-Tenant Isolation Tests', () => {
  let productsService: ProductsService;
  let storesService: StoresService;
  let prisma: Partial<PrismaService>;
  let aiService: Partial<AiService>;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      store: {
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      user: {
        findUnique: vi.fn(),
      } as any,
    };

    aiService = {
      indexProductEmbedding: vi.fn().mockResolvedValue(undefined),
    };

    productsService = new ProductsService(
      prisma as PrismaService,
      aiService as AiService,
    );

    storesService = new StoresService(prisma as PrismaService);
  });

  describe('Multi-Tenant Cross-Store Isolation', () => {
    it('should prevent Seller A from updating Seller B product', async () => {
      const sellerAId = 'seller-a-uuid';
      const sellerBId = 'seller-b-uuid';

      // Product belongs to Store of Seller B
      (prisma.product!.findUnique as any).mockResolvedValue({
        id: 'prod-b',
        title: "Seller B's Flagship Item",
        store: {
          id: 'store-b',
          sellerProfile: {
            userId: sellerBId,
          },
        },
      });

      // Caller is Seller A (Role SELLER)
      (prisma.user!.findUnique as any).mockResolvedValue({
        id: sellerAId,
        role: 'SELLER',
      });

      await expect(
        productsService.update(sellerAId, 'prod-b', {
          title: 'Hacked Title',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.product!.update).not.toHaveBeenCalled();
    });

    it('should allow Admin to update any product across all stores', async () => {
      const adminId = 'admin-super-uuid';
      const sellerBId = 'seller-b-uuid';

      (prisma.product!.findUnique as any).mockResolvedValue({
        id: 'prod-b',
        title: "Seller B's Flagship Item",
        store: {
          id: 'store-b',
          sellerProfile: {
            userId: sellerBId,
          },
        },
      });

      (prisma.user!.findUnique as any).mockResolvedValue({
        id: adminId,
        role: 'ADMIN',
      });

      (prisma.product!.update as any).mockResolvedValue({
        id: 'prod-b',
        title: 'Moderated Title',
      });

      const result = await productsService.update(adminId, 'prod-b', {
        title: 'Moderated Title',
      });

      expect(result.title).toBe('Moderated Title');
      expect(prisma.product!.update).toHaveBeenCalled();
    });

    it('should prevent Seller A from updating Seller B store details', async () => {
      const sellerAId = 'seller-a-uuid';
      const sellerBId = 'seller-b-uuid';

      (prisma.store!.findUnique as any).mockResolvedValue({
        id: 'store-b',
        name: "Seller B's Store",
        sellerProfile: {
          userId: sellerBId,
        },
      });

      (prisma.user!.findUnique as any).mockResolvedValue({
        id: sellerAId,
        role: 'SELLER',
      });

      await expect(
        storesService.updateStore(sellerAId, 'store-b', {
          name: 'Compromised Name',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.store!.update).not.toHaveBeenCalled();
    });
  });

  describe('Data Exposure Protection', () => {
    it('should never expose sensitive fields in user profile queries', () => {
      const rawUser = {
        id: 'user-1',
        email: 'user@dokanos.com',
        firstName: 'Jane',
        lastName: 'Doe',
        passwordHash: '$2a$10$supersecretpasswordhash',
        refreshTokenHash: '$2a$10$secretrefreshtokenhash',
        passwordResetToken: 'raw_reset_token',
        emailVerificationToken: 'raw_verification_token',
        status: 'ACTIVE' as const,
        role: 'CUSTOMER' as const,
      };

      const {
        passwordHash: _,
        refreshTokenHash: __,
        passwordResetToken: ___,
        emailVerificationToken: ____,
        ...sanitized
      } = rawUser;

      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized).not.toHaveProperty('refreshTokenHash');
      expect(sanitized).not.toHaveProperty('passwordResetToken');
      expect(sanitized).not.toHaveProperty('emailVerificationToken');
      expect(sanitized.email).toBe('user@dokanos.com');
    });
  });
});
