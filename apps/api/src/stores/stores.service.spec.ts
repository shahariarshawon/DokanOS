import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { StoresService } from './stores.service.js';

describe('StoresService Unit Test Suite', () => {
  let service: StoresService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      sellerProfile: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      store: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      storeTheme: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      storeSection: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      storeReview: {
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      storeFollower: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      dailyStoreAnalytics: {
        findMany: vi.fn(),
      },
      orderItem: {
        aggregate: vi.fn(),
      },
      product: {
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    service = new StoresService(mockPrisma);
  });

  describe('createStore', () => {
    it('should create store with default theme and homepage sections', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'profile-123',
      });
      mockPrisma.store.findUnique.mockResolvedValue(null);
      mockPrisma.store.create.mockResolvedValue({
        id: 'store-1',
        name: 'Apple Zone',
        slug: 'apple-zone',
      });

      const result = await service.createStore('user-1', {
        name: 'Apple Zone',
        slug: 'apple-zone',
        description: 'Official store',
      });

      expect(result.id).toBe('store-1');
      expect(mockPrisma.storeTheme.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storeId: 'store-1',
            primaryColor: '#4F46E5',
          }),
        }),
      );
      expect(mockPrisma.storeSection.createMany).toHaveBeenCalled();
    });

    it('should throw ConflictException if store slug is already taken', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'profile-123',
      });
      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'existing-store',
        slug: 'apple-zone',
      });

      await expect(
        service.createStore('user-1', {
          name: 'Apple Zone',
          slug: 'apple-zone',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStoreTheme', () => {
    it('should update theme when caller is store owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-1',
        sellerProfile: { userId: 'user-1' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'SELLER',
      });
      mockPrisma.storeTheme.upsert.mockResolvedValue({
        storeId: 'store-1',
        primaryColor: '#10B981',
        fontStyle: 'OUTFIT',
      });

      const updated = await service.updateStoreTheme('user-1', 'store-1', {
        primaryColor: '#10B981',
        fontStyle: 'OUTFIT',
      });

      expect(updated.primaryColor).toBe('#10B981');
    });

    it('should throw ForbiddenException if user is not store owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-1',
        sellerProfile: { userId: 'other-user' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'SELLER',
      });

      await expect(
        service.updateStoreTheme('user-1', 'store-1', {
          primaryColor: '#000000',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleStoreFollow', () => {
    it('should follow store if not currently followed', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-1',
        slug: 'apple-zone',
      });
      mockPrisma.storeFollower.findUnique.mockResolvedValue(null);
      mockPrisma.storeFollower.count.mockResolvedValue(1);

      const res = await service.toggleStoreFollow('user-1', 'apple-zone');

      expect(res.isFollowing).toBe(true);
      expect(res.followerCount).toBe(1);
    });
  });
});
