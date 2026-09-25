import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsEventType, Prisma, UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { RedisService } from '../common/redis/redis.service.js';

describe('AnalyticsService (Backend Testing)', () => {
  let analyticsService: AnalyticsService;
  let prisma: any;
  let redisService: any;

  const mockStore = {
    id: 'store-uuid-1',
    name: 'Apex Audio',
    sellerProfileId: 'seller-profile-1',
    sellerProfile: { userId: 'seller-uuid-1' },
  };

  beforeEach(() => {
    prisma = {
      analyticsEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-uuid-1' }),
        count: vi.fn().mockResolvedValue(100),
      },
      sellerProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'seller-profile-1',
          stores: [mockStore],
        }),
        count: vi.fn().mockResolvedValue(12),
      },
      store: {
        findUnique: vi.fn().mockResolvedValue(mockStore),
        findUniqueOrThrow: vi.fn().mockResolvedValue(mockStore),
        findMany: vi.fn().mockResolvedValue([mockStore]),
        count: vi.fn().mockResolvedValue(15),
      },
      orderItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: 'ord-1',
            productId: 'p-1',
            productTitle: 'ANC Headphones',
            productSku: 'ANC-01',
            quantity: 2,
            totalPrice: new Prisma.Decimal(200.0),
            vendorPayoutAmount: new Prisma.Decimal(180.0),
            commissionAmount: new Prisma.Decimal(20.0),
            createdAt: new Date(),
          },
        ]),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ord-1',
            totalAmount: new Prisma.Decimal(200.0),
            placedAt: new Date(),
            user: {
              firstName: 'Alice',
              lastName: 'Smith',
              email: 'alice@example.com',
            },
            items: [
              {
                productTitle: 'ANC Headphones',
                totalPrice: new Prisma.Decimal(200.0),
              },
            ],
          },
        ]),
      },
      user: {
        groupBy: vi.fn().mockResolvedValue([
          { role: UserRole.CUSTOMER, status: 'ACTIVE', _count: { id: 100 } },
          { role: UserRole.SELLER, status: 'ACTIVE', _count: { id: 12 } },
        ]),
        count: vi.fn().mockResolvedValue(112),
        findMany: vi.fn().mockResolvedValue([{ createdAt: new Date() }]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'p-1',
            stockQuantity: 15,
            rating: new Prisma.Decimal(4.9),
            images: [],
          },
        ]),
      },
      payment: {
        groupBy: vi.fn().mockResolvedValue([
          { status: 'COMPLETED', _count: { id: 25 } },
          { provider: 'STRIPE', _count: { id: 25 } },
        ]),
      },
    };

    redisService = {
      isReady: vi.fn().mockReturnValue(false), // tests in-memory cache path cleanly
      getClient: vi.fn(),
    };

    analyticsService = new AnalyticsService(
      prisma as PrismaService,
      redisService as RedisService,
    );
  });

  describe('Event Tracking Pipeline', () => {
    it('should ingest telemetry events non-blockingly', async () => {
      const res = await analyticsService.trackEvent(
        {
          eventType: AnalyticsEventType.PRODUCT_VIEW,
          productId: 'prod-uuid-1',
          storeId: 'store-uuid-1',
        },
        'user-uuid-1',
      );

      expect(res.success).toBe(true);
      expect(prisma.analyticsEvent.create).toHaveBeenCalled();
    });
  });

  describe('Seller Dashboard Calculations', () => {
    it('should compute total sales, net revenue, conversion rate, and timeline', async () => {
      const res = await analyticsService.getSellerDashboard(
        'seller-uuid-1',
        UserRole.SELLER,
        { storeId: 'store-uuid-1' },
      );

      expect(res.storeName).toBe('Apex Audio');
      expect(res.metrics.totalSales).toBe(200.0);
      expect(res.metrics.netRevenue).toBe(180.0);
      expect(res.metrics.ordersCount).toBe(1);
      expect(res.topProducts).toHaveLength(1);
      expect(res.recentActivity).toHaveLength(1);
      expect(res.timeline.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Dashboard Calculations', () => {
    it('should compute platform GMV, take-rate commissions, and user breakdown', async () => {
      const res = await analyticsService.getAdminDashboard({});

      expect(res.metrics.platformGmv).toBe(200.0);
      expect(res.metrics.platformRevenue).toBe(20.0);
      expect(res.metrics.averageCommissionRate).toBe(10.0);
      expect(res.metrics.totalUsers).toBe(112);
      expect(res.topStores).toHaveLength(1);
    });
  });
});
