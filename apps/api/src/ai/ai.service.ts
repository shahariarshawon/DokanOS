import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';
import { ShoppingChatDto } from './dto/shopping-chat.dto.js';
import { SellerGenerateDto } from './dto/seller-generate.dto.js';
import { SyncEmbeddingsDto } from './dto/sync-embeddings.dto.js';
import { RecommendationQueryDto } from './dto/recommendation-query.dto.js';

export interface RecommendedProduct {
  id: string;
  title: string;
  slug: string;
  price: string;
  rating: string;
  storeName: string;
  categoryName?: string;
  imageUrl?: string;
  similarityScore: number;
  compositeScore?: number;
  recommendationReason?: string;
  matchReasons?: string[];
}

export interface ShoppingAssistantResult {
  conversationId?: string;
  reply: string;
  recommendedProducts: RecommendedProduct[];
  intent?: {
    query: string;
    detectedCategory?: string;
    minPrice?: number;
    maxPrice?: number;
    extractedFeatures?: string[];
    semanticIntent?: string;
  };
  cached?: boolean;
  executionTimeMs: number;
}

export interface SellerAssistantResult {
  description: string;
  descriptionMarkdown: string;
  marketingText: string;
  seoKeywords: string[];
  tags: string[];
  seoMeta: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  keySellingPoints: string[];
  cached?: boolean;
}

export interface ProductRecommendationResult {
  sourceProductId: string;
  sourceProductTitle: string;
  recommendations: RecommendedProduct[];
  strategy: string;
  cached?: boolean;
  executionTimeMs: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiBaseUrl: string;
  private readonly internalKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.aiBaseUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://127.0.0.1:8000';
    this.internalKey = this.configService.get<string>('AI_INTERNAL_KEY');
  }

  /**
   * AI Shopping Assistant (RAG Pipeline)
   */
  async chatShoppingAssistant(
    dto: ShoppingChatDto,
  ): Promise<ShoppingAssistantResult> {
    const payload = {
      query: dto.message,
      conversation_id: dto.conversationId,
      limit: dto.limit || 5,
      min_price: dto.minPrice,
      max_price: dto.maxPrice,
      category_id: dto.categoryId,
    };

    try {
      const response = await fetch(`${this.aiBaseUrl}/v1/shopping/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.internalKey ? { 'X-Internal-Key': this.internalKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        conversationId: data.conversation_id,
        reply: data.reply,
        recommendedProducts: (data.recommended_products || []).map(
          (p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            price: String(p.price),
            rating: String(p.rating),
            storeName: p.store_name,
            categoryName: p.category_name,
            imageUrl: p.image_url,
            similarityScore: p.similarity_score,
            recommendationReason: p.recommendation_reason,
          }),
        ),
        intent: data.intent
          ? {
              query: data.intent.query,
              detectedCategory: data.intent.detected_category,
              minPrice: data.intent.min_price,
              maxPrice: data.intent.max_price,
              extractedFeatures: data.intent.extracted_features,
              semanticIntent: data.intent.semantic_intent,
            }
          : undefined,
        cached: data.cached,
        executionTimeMs: data.execution_time_ms,
      };
    } catch (err: unknown) {
      this.logger.warn(
        `AI Service unavailable or timed out: ${(err as Error).message}. Using relational fallback.`,
      );
      return this.fallbackShoppingSearch(dto);
    }
  }

  /**
   * AI Seller Assistant (Description, Marketing Text & SEO Copilot)
   */
  async generateSellerCopy(
    dto: SellerGenerateDto,
  ): Promise<SellerAssistantResult> {
    const name = dto.productName || dto.title || 'Product';
    const features = dto.features || dto.keyFeatures || [];

    const payload = {
      product_name: name,
      category: dto.category,
      features:
        features.length > 0
          ? features
          : ['High quality materials', 'Modern ergonomic design'],
      tone: dto.tone || 'PROFESSIONAL',
    };

    try {
      const response = await fetch(`${this.aiBaseUrl}/v1/seller/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.internalKey ? { 'X-Internal-Key': this.internalKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        description: data.description,
        descriptionMarkdown: data.description,
        marketingText:
          data.marketing_text ||
          `Elevate your lifestyle with ${name}. Premium quality crafted for perfection.`,
        seoKeywords: data.seo_keywords,
        tags: data.tags,
        seoMeta: {
          metaTitle: data.seo_meta?.meta_title || `${name} | DokanOS`,
          metaDescription:
            data.seo_meta?.meta_description ||
            `Discover ${name} in ${dto.category}.`,
          keywords: data.seo_meta?.keywords || data.seo_keywords || [],
        },
        keySellingPoints: data.key_selling_points || features,
        cached: data.cached,
      };
    } catch (err: unknown) {
      this.logger.warn(
        `AI Service unavailable for seller copy: ${(err as Error).message}. Using fallback generator.`,
      );
      return this.fallbackSellerCopy(name, dto.category, features);
    }
  }

  /**
   * Content-Based Product Recommendations
   */
  async getProductRecommendations(
    productId: string,
    query?: RecommendationQueryDto,
  ): Promise<ProductRecommendationResult> {
    const limit = query?.limit ?? 6;
    const priceTolerance = query?.priceTolerance ?? 0.35;
    const sameCategory = query?.sameCategory ?? false;

    const url = new URL(
      `${this.aiBaseUrl}/v1/recommendations/products/${productId}`,
    );
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('price_tolerance', String(priceTolerance));
    url.searchParams.set('same_category', String(sameCategory));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.internalKey ? { 'X-Internal-Key': this.internalKey } : {}),
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        sourceProductId: data.source_product_id,
        sourceProductTitle: data.source_product_title,
        strategy: data.strategy,
        cached: data.cached,
        executionTimeMs: data.execution_time_ms,
        recommendations: (data.recommendations || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          price: String(r.price),
          rating: String(r.rating),
          storeName: r.store_name,
          categoryName: r.category_name,
          imageUrl: r.image_url,
          similarityScore: r.similarity_score,
          compositeScore: r.composite_score,
          matchReasons: r.match_reasons || [],
        })),
      };
    } catch (err: unknown) {
      this.logger.warn(
        `AI Service recommendation offline for product '${productId}': ${(err as Error).message}. Using relational fallback.`,
      );
      return this.fallbackProductRecommendations(productId, limit);
    }
  }

  /**
   * Index single product embedding in background
   */
  async indexProductEmbedding(productId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.aiBaseUrl}/v1/embeddings/product/${productId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.internalKey ? { 'X-Internal-Key': this.internalKey } : {}),
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.ok) {
        this.logger.log(
          `Product '${productId}' embedding indexed successfully.`,
        );
      } else {
        this.logger.warn(
          `Failed to index product '${productId}' embedding: HTTP ${response.status}`,
        );
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Could not index embedding for product '${productId}': ${(err as Error).message}`,
      );
    }
  }

  /**
   * Trigger bulk embedding sync
   */
  async syncAllEmbeddings(dto: SyncEmbeddingsDto) {
    const response = await fetch(`${this.aiBaseUrl}/v1/embeddings/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.internalKey ? { 'X-Internal-Key': this.internalKey } : {}),
      },
      body: JSON.stringify({
        force_reindex: dto.forceReindex ?? false,
        limit: dto.limit,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`AI service bulk sync failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Graceful fallback when AI service is offline
   */
  private async fallbackShoppingSearch(
    dto: ShoppingChatDto,
  ): Promise<ShoppingAssistantResult> {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        stockQuantity: { gt: 0 },
        ...(dto.minPrice ? { price: { gte: dto.minPrice } } : {}),
        ...(dto.maxPrice ? { price: { lte: dto.maxPrice } } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      },
      include: {
        store: true,
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: dto.limit || 5,
      orderBy: { rating: 'desc' },
    });

    const recommended = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price.toString(),
      rating: p.rating.toString(),
      storeName: p.store.name,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url,
      similarityScore: 0.75,
      recommendationReason: `Top rated in ${p.category.name}`,
    }));

    return {
      conversationId: dto.conversationId,
      reply:
        recommended.length > 0
          ? `Here are top rated recommendations from DokanOS matching "${dto.message}":`
          : `We couldn't find items currently matching "${dto.message}". Try exploring our top categories!`,
      recommendedProducts: recommended,
      executionTimeMs: 15,
    };
  }

  private fallbackSellerCopy(
    name: string,
    category: string,
    features: string[],
  ): SellerAssistantResult {
    const featureBullets = features.map((f) => `- **${f}**`).join('\n');
    const desc = `### ${name}\n\nDesigned for top-tier performance in **${category}**, this product brings reliable craftsmanship and modern utility.\n\n#### Key Features:\n${featureBullets || '- Built with premium grade components'}\n\nShop with confidence on DokanOS with fast shipping and authentic merchant guarantees.`;

    const seoKeywords = [
      name.toLowerCase(),
      `best ${name.toLowerCase()}`,
      `buy ${name.toLowerCase()}`,
      `${category.toLowerCase()} deals`,
      'dokan marketplace',
    ];

    const tags = [
      category.toLowerCase().replace(/\s+/g, '-'),
      'featured',
      'best-seller',
    ];

    return {
      description: desc,
      descriptionMarkdown: desc,
      marketingText: `Discover ${name} in ${category}. Premium build quality and reliable performance delivered to your door.`,
      seoKeywords,
      tags,
      seoMeta: {
        metaTitle: `${name} | DokanOS`.slice(0, 60),
        metaDescription:
          `Discover ${name} in ${category}. Premium features and guaranteed authenticity.`.slice(
            0,
            155,
          ),
        keywords: seoKeywords,
      },
      keySellingPoints:
        features.length > 0
          ? features
          : ['Durable construction', 'Verified seller'],
    };
  }

  private async fallbackProductRecommendations(
    productId: string,
    limit: number,
  ): Promise<ProductRecommendationResult> {
    const source = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, categoryId: true, price: true },
    });

    if (!source) {
      return {
        sourceProductId: productId,
        sourceProductTitle: 'Unknown Product',
        recommendations: [],
        strategy: 'relational_fallback_empty',
        executionTimeMs: 5,
      };
    }

    const priceNum = Number(source.price);
    const related = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        status: 'ACTIVE',
        stockQuantity: { gt: 0 },
        OR: [
          { categoryId: source.categoryId },
          { price: { gte: priceNum * 0.7, lte: priceNum * 1.3 } },
        ],
      },
      include: {
        store: true,
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: limit,
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    });

    const recommendations = related.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price.toString(),
      rating: p.rating.toString(),
      storeName: p.store.name,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url,
      similarityScore: 0.7,
      compositeScore: 0.75,
      matchReasons: [
        p.categoryId === source.categoryId
          ? `Same category: ${p.category.name}`
          : 'Similar price tier',
      ],
    }));

    return {
      sourceProductId: source.id,
      sourceProductTitle: source.title,
      recommendations,
      strategy: 'relational_category_price_fallback',
      executionTimeMs: 12,
    };
  }
}
