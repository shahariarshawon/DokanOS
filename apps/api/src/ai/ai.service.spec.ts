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
});
