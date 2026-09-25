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

  describe('Product Analytics', () => {
    it('should aggregate product sales, views, conversion rate, and inventory status', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p-1',
          title: 'ANC Headphones',
          sku: 'ANC-01',
          price: new Prisma.Decimal(200.0),
          stockQuantity: 15,
          lowStockThreshold: 5,
          category: { name: 'Electronics' },
        },
      ]);
      prisma.analyticsEvent.groupBy = vi
        .fn()
        .mockResolvedValue([{ productId: 'p-1', _count: { id: 50 } }]);

      const res = await analyticsService.getProductAnalytics(
        'seller-uuid-1',
        UserRole.SELLER,
        { storeId: 'store-uuid-1' },
      );

      expect(res.storeId).toBe('store-uuid-1');
      expect(res.topSelling).toHaveLength(1);
      expect(res.topSelling[0].title).toBe('ANC Headphones');
      expect(res.topSelling[0].revenue).toBe(200.0);
      expect(res.topSelling[0].views).toBe(50);
      expect(res.topSelling[0].inventoryStatus).toBe('IN_STOCK');
      expect(res.categoryPerformance).toHaveLength(1);
      expect(res.categoryPerformance[0].category).toBe('Electronics');
    });
  });

  describe('Customer Analytics & Segmentation', () => {
    it('should group customers into New, Regular, and High-Value segments', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          placedAt: new Date(),
          user: {
            id: 'cust-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            createdAt: new Date(),
          },
          items: [{ totalPrice: new Prisma.Decimal(450.0) }],
        },
        {
          id: 'ord-2',
          placedAt: new Date(),
          user: {
            id: 'cust-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            createdAt: new Date(),
          },
          items: [{ totalPrice: new Prisma.Decimal(100.0) }],
        },
      ]);

      const res = await analyticsService.getCustomerAnalytics(
        'seller-uuid-1',
        UserRole.SELLER,
        { storeId: 'store-uuid-1' },
      );

      expect(res.totalCustomers).toBe(1);
      expect(res.segments.highValueCount).toBe(1);
      expect(res.topCustomers[0].name).toBe('John Doe');
      expect(res.topCustomers[0].totalSpent).toBe(550.0);
      expect(res.topCustomers[0].segment).toBe('HIGH_VALUE');
    });
  });

  describe('AI Analytics Insights', () => {
    it('should generate and persist actionable AI business insights', async () => {
      prisma.insight = {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'insight-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      };

      // After generation, findMany returns newly created insight
      prisma.insight.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          id: 'insight-1',
          storeId: 'store-uuid-1',
          userId: 'seller-uuid-1',
          type: 'SALES',
          title: 'Sales Revenue is Growing',
          message: 'Your store sales increased by 20% over the past 30 days.',
          severity: 'SUCCESS',
          metric: 'Net Revenue',
          changeRate: new Prisma.Decimal(20.0),
          metadata: null,
          isDismissed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const insights = await analyticsService.getInsights(
        'seller-uuid-1',
        UserRole.SELLER,
        'store-uuid-1',
      );

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].title).toBe('Sales Revenue is Growing');
      expect(prisma.insight.create).toHaveBeenCalled();
    });

    it('should allow dismissing an insight', async () => {
      prisma.insight = {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      };

      const res = await analyticsService.dismissInsight(
        'seller-uuid-1',
        'insight-1',
      );
      expect(res.success).toBe(true);
      expect(prisma.insight.updateMany).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
        data: { isDismissed: true },
      });
    });
  });

  describe('Export System (CSV)', () => {
    it('should generate properly sanitized CSV for sales reports', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-101',
          placedAt: new Date('2026-09-25T10:00:00Z'),
          user: {
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@skynet.com',
          },
          items: [{ totalPrice: new Prisma.Decimal(120.0) }],
          totalAmount: new Prisma.Decimal(120.0),
          status: 'DELIVERED',
          payments: [{ status: 'COMPLETED' }],
        },
      ]);

      const res = await analyticsService.exportReport(
        'seller-uuid-1',
        UserRole.SELLER,
        { type: 'sales' as any, storeId: 'store-uuid-1' },
      );

      expect(res.filename).toContain('dokanos_sales_report_');
      expect(res.csv).toContain('Order ID,Date,Customer Name');
      expect(res.csv).toContain('"ord-101"');
      expect(res.csv).toContain('"Sarah Connor"');
    });
  });
});
