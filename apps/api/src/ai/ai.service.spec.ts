import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AiService } from './ai.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';

describe('AiService (Backend Testing)', () => {
  let aiService: AiService;
  let prisma: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      aIConversation: {
        create: vi.fn().mockResolvedValue({ id: 'conv-1' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      aIUsage: {
        create: vi.fn().mockResolvedValue({ id: 'usage-1' }),
        count: vi.fn().mockResolvedValue(10),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      reviewAnalysis: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: 'rev-an-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      review: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      storeReview: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      sellerProfile: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      orderItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      payment: {
        count: vi.fn().mockResolvedValue(0),
      },
      analyticsEvent: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      analyticsCustomerEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'AI_SERVICE_URL') return 'http://127.0.0.1:8000';
        if (key === 'AI_INTERNAL_KEY') return 'test_secret';
        return null;
      }),
    };

    aiService = new AiService(
      configService as ConfigService,
      prisma as PrismaService,
    );
  });

  describe('Shopping Assistant RAG Flow', () => {
    it('should forward chat request to AI microservice and return recommendations', async () => {
      const mockFetchResponse = {
        ok: true,
        json: async () => ({
          reply:
            'Here are the best laptops for programming: the ThinkPad E16 is a top recommendation under $1000...',
          recommended_products: [
            {
              id: 'prod-1',
              title: 'ThinkPad E16',
              slug: 'thinkpad-e16',
              price: 899.0,
              rating: 4.8,
              store_name: 'TechHub',
              similarity_score: 0.92,
              recommendation_reason: '16GB RAM and Ryzen 7 within $1000 budget',
            },
          ],
          intent: {
            query: 'Suggest a laptop for programming under $1000',
            detected_category: 'laptop',
            max_price: 1000.0,
            extracted_features: ['16GB RAM or higher'],
          },
          execution_time_ms: 85,
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(mockFetchResponse as any),
      );

      const res = await aiService.chatShoppingAssistant({
        message: 'Suggest a laptop for programming under $1000',
      });

      expect(res.reply).toContain('ThinkPad');
      expect(res.recommendedProducts).toHaveLength(1);
      expect(res.recommendedProducts[0].similarityScore).toBe(0.92);
      expect(res.intent?.detectedCategory).toBe('laptop');
    });

    it('should gracefully degrade to relational database fallback if AI microservice times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Connection refused'),
      );

      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-fallback-1',
          title: 'MacBook Air M2',
          slug: 'macbook-air-m2',
          price: new Prisma.Decimal(999.0),
          rating: new Prisma.Decimal(4.9),
          store: { name: 'Apple Authorized' },
          category: { name: 'Laptops' },
          images: [{ url: 'https://images.example.com/macbook.png' }],
        },
      ]);

      const res = await aiService.chatShoppingAssistant({
        message: 'Suggest a laptop for programming under $1000',
        maxPrice: 1000,
      });

      expect(res.recommendedProducts).toHaveLength(1);
      expect(res.recommendedProducts[0].title).toBe('MacBook Air M2');
      expect(res.reply).toContain('recommendations from DokanOS');
    });
  });

  describe('Vision Image Analyzer & Review Analysis Flows', () => {
    it('should analyze product images using Vision AI and extract metadata', async () => {
      const mockVisionRes = {
        ok: true,
        json: async () => ({
          category: 'Footwear & Apparel',
          color: 'Black / Red',
          style: 'Athletic Running',
          material: 'Mesh & Carbon Fiber',
          tags: ['running', 'sports', 'sneakers'],
          suggested_title: 'Nike Air Zoom Carbon Runner',
          confidence: 0.96,
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(mockVisionRes as any),
      );

      const res = await aiService.analyzeProductImage({
        imageUrl: 'https://images.example.com/shoe.jpg',
      });

      expect(res.category).toBe('Footwear & Apparel');
      expect(res.color).toBe('Black / Red');
      expect(res.suggestedTitle).toContain('Runner');
    });

    it('should analyze customer reviews and generate sentiment summary', async () => {
      const mockReviewRes = {
        ok: true,
        json: async () => ({
          sentiment: 'POSITIVE',
          positive_points: ['Exceptional sound quality', 'Fast pairing'],
          negative_points: ['Mild ear-cup pressure after 4 hours'],
          common_complaints: ['Case zipper can snag'],
          summary: 'Analyzed 12 reviews with overwhelming 4.8 star positivity.',
          total_analyzed: 12,
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(mockReviewRes as any),
      );

      const res = await aiService.analyzeReviews({
        productId: 'prod-headphones-1',
        reviews: [
          { rating: 5, comment: 'Phenomenal audio fidelity and battery life!' },
        ],
      });

      expect(res.sentiment).toBe('POSITIVE');
      expect(res.positivePoints).toContain('Exceptional sound quality');
      expect(res.totalAnalyzed).toBe(12);
    });
  });

  describe('Seller Copilot Generator Flow', () => {
    it('should generate product description, SEO keywords, marketing text, and tags', async () => {
      const mockSellerResponse = {
        ok: true,
        json: async () => ({
          description:
            '### Premium Wireless Keyboard\n\nBuilt for professionals.',
          marketing_text: 'Experience wireless mechanical perfection.',
          seo_keywords: [
            'wireless keyboard',
            'mechanical keyboard',
            'hot swappable',
          ],
          tags: ['electronics', 'keyboards', 'featured'],
          seo_meta: {
            meta_title: 'Keychron Q1 | Buy on DokanOS',
            meta_description: 'Shop Keychron Q1 wireless mechanical keyboard.',
            keywords: ['keyboards'],
          },
          key_selling_points: ['CNC Aluminum', 'Hot-swappable'],
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(mockSellerResponse as any),
      );

      const res = await aiService.generateSellerCopy({
        productName: 'Keychron Q1',
        category: 'Keyboards',
        features: ['CNC Aluminum Body', 'Hot-swappable switches'],
      });

      expect(res.description).toBeDefined();
      expect(res.marketingText).toBe(
        'Experience wireless mechanical perfection.',
      );
      expect(res.seoKeywords).toHaveLength(3);
      expect(res.tags).toContain('keyboards');
    });
  });

  describe('Product Recommendations Flow', () => {
    it('should retrieve content-based product recommendations with composite scoring', async () => {
      const mockRecResponse = {
        ok: true,
        json: async () => ({
          source_product_id: 'prod-1',
          source_product_title: 'Keychron Keyboard',
          strategy: 'content_based_pgvector_composite',
          recommendations: [
            {
              id: 'prod-2',
              title: 'Epomaker Mechanical Keyboard',
              slug: 'epomaker-keyboard',
              price: 119.0,
              rating: 4.7,
              store_name: 'CustomKeys',
              similarity_score: 0.88,
              composite_score: 0.89,
              match_reasons: ['Same Category', 'Similar price tier'],
            },
          ],
          execution_time_ms: 18,
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(mockRecResponse as any),
      );

      const res = await aiService.getProductRecommendations('prod-1', {
        limit: 5,
      });

      expect(res.recommendations).toHaveLength(1);
      expect(res.recommendations[0].similarityScore).toBe(0.88);
      expect(res.recommendations[0].matchReasons).toContain('Same Category');
    });
  });

  describe('Personalized Recommendations Engine', () => {
    it('should generate personalized recommendations based on user browsing history', async () => {
      prisma.analyticsEvent = {
        findMany: vi.fn().mockResolvedValue([{ productId: 'prod-viewed-1' }]),
      };
      prisma.order = {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue(null),
      };
      prisma.product.findMany = vi
        .fn()
        .mockResolvedValueOnce([{ categoryId: 'cat-electronics' }])
        .mockResolvedValueOnce([
          {
            id: 'prod-rec-1',
            title: 'Wireless Earbuds',
            slug: 'wireless-earbuds',
            price: new Prisma.Decimal(99.0),
            rating: new Prisma.Decimal(4.8),
            reviewCount: 30,
            store: { name: 'AudioTech' },
            category: { name: 'Audio' },
            images: [{ url: 'https://example.com/earbuds.jpg' }],
          },
        ]);

      const res = await aiService.getPersonalizedRecommendations('user-1', {
        limit: 5,
        includeHistory: true,
      });

      expect(res.recommendations).toHaveLength(1);
      expect(res.strategy).toBe('behavioral_collaborative');
      expect(res.recommendations[0].title).toBe('Wireless Earbuds');
    });
  });

  describe('Natural Language AI Search Assistant', () => {
    it('should extract budget, category, and purpose from natural query', async () => {
      prisma.category = {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'cat-shoes', name: 'Shoes', slug: 'shoes' },
          ]),
      };
      prisma.product.findMany = vi.fn().mockResolvedValue([
        {
          id: 'prod-shoe-1',
          title: 'Speed Running Shoes',
          slug: 'speed-running-shoes',
          price: new Prisma.Decimal(79.99),
          rating: new Prisma.Decimal(4.7),
          store: { name: 'AthleticZone' },
          category: { name: 'Shoes' },
          images: [{ url: 'https://example.com/shoes.jpg' }],
        },
      ]);

      const res = await aiService.naturalSearch({
        query: 'I need affordable shoes for running under $100',
      });

      expect(res.extractedIntent.category).toBe('Shoes');
      expect(res.extractedIntent.maxBudget).toBe(100);
      expect(res.extractedIntent.purpose).toBe('running');
      expect(res.products).toHaveLength(1);
      expect(res.products[0].title).toBe('Speed Running Shoes');
      expect(res.aiSummary).toContain('running');
    });
  });

  describe('AI Sales Assistant for Sellers', () => {
    it('should diagnose sales drops and provide marketing, pricing, and product improvements', async () => {
      prisma.sellerProfile.findUnique = vi.fn().mockResolvedValue({
        stores: [{ id: 'store-1', name: 'Apex Audio' }],
      });
      prisma.orderItem = {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              totalPrice: new Prisma.Decimal(500),
              quantity: 5,
              productId: 'p-1',
            },
          ])
          .mockResolvedValueOnce([
            {
              totalPrice: new Prisma.Decimal(1000),
              quantity: 10,
              productId: 'p-1',
            },
          ]),
      };
      prisma.analyticsEvent.count = vi.fn().mockResolvedValue(200);
      prisma.product.findMany = vi
        .fn()
        .mockResolvedValue([
          {
            id: 'p-2',
            title: 'Wireless Headphones',
            stockQuantity: 40,
            price: new Prisma.Decimal(150),
          },
        ]);

      const res = await aiService.sellerSalesAssistant(
        { question: 'Why are my sales dropping this month?' },
        'seller-1',
        'SELLER',
      );

      expect(res.diagnostics).toContain('Analysis indicates');
      expect(res.marketingSuggestions.length).toBeGreaterThan(0);
      expect(res.pricingSuggestions.length).toBeGreaterThan(0);
      expect(res.productImprovements.length).toBeGreaterThan(0);
    });
  });

  describe('Automated Product Optimization', () => {
    it('should generate commercial titles, markdown descriptions, and SEO tags', async () => {
      prisma.product.findUnique = vi.fn().mockResolvedValue({
        id: 'p-1',
        title: 'Mechanical Keyboard',
        description: 'A basic keyboard',
        sku: 'KB-01',
        category: { name: 'Keyboards' },
        store: { name: 'KeyCraft' },
      });

      const res = await aiService.optimizeProduct('p-1');

      expect(res.optimizedTitle).toContain('High Performance Edition');
      expect(res.optimizedDescription).toContain('## Overview');
      expect(res.seoKeywords.length).toBeGreaterThan(0);
      expect(res.projectedVisibilityScore).toBeGreaterThan(90);
    });

    it('should apply optimization directly to product', async () => {
      prisma.product.findUnique = vi.fn().mockResolvedValue({
        id: 'p-1',
        attributes: {},
        store: { sellerProfile: { userId: 'seller-1' } },
      });
      prisma.product.update = vi.fn().mockResolvedValue({
        id: 'p-1',
        title: 'Optimized Keyboard',
      });

      const res = await aiService.applyProductOptimization(
        'p-1',
        { title: 'Optimized Keyboard' },
        'seller-1',
      );

      expect(res.title).toBe('Optimized Keyboard');
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('AI Fraud Detection Preparation', () => {
    it('should compute RiskScore and classify order risk accurately', async () => {
      prisma.order.findUnique = vi.fn().mockResolvedValue({
        id: 'ord-fraud-1',
        orderNumber: 'DOK-9921',
        totalAmount: new Prisma.Decimal(2500.0),
        userId: 'user-suspect',
        user: {
          id: 'user-suspect',
          firstName: 'Anon',
          lastName: 'Buyer',
          email: 'anon@darkmail.com',
          createdAt: new Date(), // registered just now
        },
        items: [{ productId: 'p-1', quantity: 6 }],
        payments: [{ status: 'FAILED' }],
      });
      prisma.payment = {
        count: vi.fn().mockResolvedValue(3),
      };
      prisma.order.count = vi.fn().mockResolvedValue(1);

      const res = await aiService.assessOrderFraud('ord-fraud-1');

      expect(res.riskScore).toBeGreaterThan(70);
      expect(res.recommendation).toBe('BLOCK');
      expect(res.triggers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('AI Automation Workflow', () => {
    it('should run background automation pipeline for product scans and seller reports', async () => {
      prisma.product.findMany = vi
        .fn()
        .mockResolvedValue([
          {
            id: 'p-1',
            title: 'Low Stock Item',
            stockQuantity: 2,
            storeId: 'store-1',
          },
        ]);
      prisma.store = {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'store-1', name: 'Apex Store' }]),
      };

      const res = await aiService.runAutomationWorkflow({});

      expect(res.summary.productsAnalyzed).toBe(1);
      expect(res.summary.alertsDispatched).toBe(1);
      expect(res.details.length).toBeGreaterThan(0);
    });
  });
});
