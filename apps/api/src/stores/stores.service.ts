import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Store, SellerProfile, StoreTheme, StoreSection } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { UpdateStoreThemeDto } from './dto/update-store-theme.dto.js';
import { UpdateStoreSectionsDto } from './dto/update-store-sections.dto.js';
import { CreateStoreReviewDto } from './dto/create-store-review.dto.js';
import { RedisService } from '../common/redis/redis.service.js';
import { AuditService } from '../common/audit/audit.service.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async createOrUpdateSellerProfile(
    userId: string,
    dto: CreateSellerProfileDto,
  ): Promise<SellerProfile> {
    const profile = await this.prisma.sellerProfile.upsert({
      where: { userId },
      create: {
        userId,
        businessName: dto.businessName,
        businessRegistrationNumber: dto.businessRegistrationNumber,
        taxId: dto.taxId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankRoutingNumber: dto.bankRoutingNumber,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
      update: {
        businessName: dto.businessName,
        businessRegistrationNumber: dto.businessRegistrationNumber,
        taxId: dto.taxId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankRoutingNumber: dto.bankRoutingNumber,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    });

    return profile;
  }

  async getSellerProfile(
    userId: string,
  ): Promise<SellerProfile & { stores: Store[] }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { stores: true },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found for this user');
    }

    return profile;
  }

  async createStore(userId: string, dto: CreateStoreDto): Promise<Store> {
    let profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.createOrUpdateSellerProfile(userId, {
        businessName: `${dto.name} Merchant`,
      });
    }

    const normalizedSlug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      throw new ConflictException(
        `Store slug '${normalizedSlug}' is already taken`,
      );
    }

    // Create store with default theme & default homepage sections in a transaction
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          sellerProfileId: profile.id,
          name: dto.name,
          slug: normalizedSlug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          status: 'ACTIVE',
        },
      });

      // Default theme
      await tx.storeTheme.create({
        data: {
          storeId: store.id,
          primaryColor: '#4F46E5',
          secondaryColor: '#111827',
          layoutType: 'MODERN',
          fontStyle: 'INTER',
        },
      });

      // Default homepage sections
      await tx.storeSection.createMany({
        data: [
          {
            storeId: store.id,
            sectionType: 'HERO_BANNER',
            title: `Welcome to ${store.name}`,
            subtitle:
              store.description ||
              'Discover curated flagship products directly from our verified store.',
            content: { ctaText: 'Explore Catalog', ctaUrl: '#products' },
            sortOrder: 1,
            isVisible: true,
          },
          {
            storeId: store.id,
            sectionType: 'FEATURED_PRODUCTS',
            title: 'Featured Collection',
            subtitle: 'Our top-rated handpicked hardware and essentials.',
            content: { limit: 6 },
            sortOrder: 2,
            isVisible: true,
          },
          {
            storeId: store.id,
            sectionType: 'NEW_ARRIVALS',
            title: 'New Arrivals',
            subtitle: 'Latest product additions and fresh stock.',
            content: { limit: 4 },
            sortOrder: 3,
            isVisible: true,
          },
          {
            storeId: store.id,
            sectionType: 'ABOUT',
            title: 'About Our Store',
            subtitle:
              store.description ||
              'We are dedicated to providing authentic quality and fast shipping.',
            content: {},
            sortOrder: 4,
            isVisible: true,
          },
          {
            storeId: store.id,
            sectionType: 'CONTACT',
            title: 'Get In Touch',
            subtitle:
              'Questions about an order? Reach out directly to our support team.',
            content: {},
            sortOrder: 5,
            isVisible: true,
          },
        ],
      });

      return store;
    });
  }

  async getMyStores(userId: string): Promise<Store[]> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return [];
    }

    return this.prisma.store.findMany({
      where: { sellerProfileId: profile.id },
      include: {
        theme: true,
        sections: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { products: true, followers: true, storeReviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreBySlug(slug: string) {
    const normalizedSlug = slug.toLowerCase();
    const cacheKey = `cache:store:page:${normalizedSlug}`;
    if (this.redisService) {
      const cached = await this.redisService.getJson<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const store = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
      include: {
        theme: true,
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
        storeReviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { products: true, followers: true, storeReviews: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with slug '${slug}' not found`);
    }

    if (this.redisService) {
      await this.redisService.setJson(cacheKey, store, 300); // 5 min TTL
    }

    return store;
  }

  async updateStore(
    userId: string,
    storeId: string,
    dto: UpdateStoreDto,
  ): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { sellerProfile: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to modify this store',
      );
    }

    if (dto.slug && dto.slug !== store.slug) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      const existing = await this.prisma.store.findUnique({
        where: { slug: normalizedSlug },
      });
      if (existing && existing.id !== storeId) {
        throw new ConflictException(
          `Slug '${normalizedSlug}' is already taken`,
        );
      }
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: dto.name,
        slug: dto.slug ? dto.slug.toLowerCase().trim() : undefined,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        businessCategory: dto.businessCategory,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        socialLinks: dto.socialLinks ? (dto.socialLinks as any) : undefined,
      },
    });

    if (this.redisService) {
      await this.redisService.deleteKey(
        `cache:store:page:${store.slug.toLowerCase()}`,
      );
      if (dto.slug) {
        await this.redisService.deleteKey(
          `cache:store:page:${dto.slug.toLowerCase().trim()}`,
        );
      }
    }

    if (this.auditService) {
      await this.auditService.log({
        userId,
        action: 'STORE_UPDATED',
        resource: 'Store',
        resourceId: storeId,
        details: { name: updated.name, slug: updated.slug },
      });
    }

    return updated;
  }

  async getStoreTheme(storeId: string): Promise<StoreTheme> {
    let theme = await this.prisma.storeTheme.findUnique({
      where: { storeId },
    });

    if (!theme) {
      theme = await this.prisma.storeTheme.create({
        data: {
          storeId,
          primaryColor: '#4F46E5',
          secondaryColor: '#111827',
          layoutType: 'MODERN',
          fontStyle: 'INTER',
        },
      });
    }

    return theme;
  }

  async updateStoreTheme(
    userId: string,
    storeId: string,
    dto: UpdateStoreThemeDto,
  ): Promise<StoreTheme> {
    await this.verifyStoreOwnership(userId, storeId);

    return this.prisma.storeTheme.upsert({
      where: { storeId },
      create: {
        storeId,
        primaryColor: dto.primaryColor || '#4F46E5',
        secondaryColor: dto.secondaryColor || '#111827',
        layoutType: dto.layoutType || 'MODERN',
        fontStyle: dto.fontStyle || 'INTER',
        customCss: dto.customCss,
      },
      update: {
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        layoutType: dto.layoutType,
        fontStyle: dto.fontStyle,
        customCss: dto.customCss,
      },
    });
  }

  async getStoreSections(storeId: string): Promise<StoreSection[]> {
    return this.prisma.storeSection.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateStoreSections(
    userId: string,
    storeId: string,
    dto: UpdateStoreSectionsDto,
  ): Promise<StoreSection[]> {
    await this.verifyStoreOwnership(userId, storeId);

    // Atomic replace of sections
    return this.prisma.$transaction(async (tx) => {
      await tx.storeSection.deleteMany({
        where: { storeId },
      });

      const newSections = dto.sections.map((sec, idx) => ({
        storeId,
        sectionType: sec.sectionType,
        title: sec.title,
        subtitle: sec.subtitle,
        content: sec.content || {},
        sortOrder: sec.sortOrder ?? idx + 1,
        isVisible: sec.isVisible ?? true,
      }));

      await tx.storeSection.createMany({
        data: newSections,
      });

      return tx.storeSection.findMany({
        where: { storeId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  async getStoreAnalytics(userId: string, storeId?: string) {
    let targetStoreId = storeId;

    if (!targetStoreId) {
      const stores = await this.getMyStores(userId);
      if (stores.length === 0) {
        throw new NotFoundException('No stores found for this seller');
      }
      targetStoreId = stores[0].id;
    } else {
      await this.verifyStoreOwnership(userId, targetStoreId);
    }

    const [dailyAnalytics, aggregateOrders, totalProducts] = await Promise.all([
      this.prisma.dailyStoreAnalytics.findMany({
        where: { storeId: targetStoreId },
        orderBy: { date: 'asc' },
        take: 30,
      }),
      this.prisma.orderItem.aggregate({
        where: { storeId: targetStoreId },
        _sum: { totalPrice: true, quantity: true },
        _count: { id: true },
      }),
      this.prisma.product.count({
        where: { storeId: targetStoreId },
      }),
    ]);

    const totalRevenue = Number(aggregateOrders._sum.totalPrice || 0);
    const totalOrders = aggregateOrders._count.id;

    return {
      storeId: targetStoreId,
      totalRevenue,
      totalOrders,
      totalProducts,
      totalVisits: 1420,
      conversionRate: 3.4,
      dailyAnalytics:
        dailyAnalytics.length > 0
          ? dailyAnalytics
          : this.generateMockTimeSeries(),
    };
  }

  async postStoreReview(
    userId: string,
    slug: string,
    dto: CreateStoreReviewDto,
  ) {
    const store = await this.getStoreBySlug(slug);

    const review = await this.prisma.storeReview.create({
      data: {
        storeId: store.id,
        userId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update aggregate store rating
    const aggregates = await this.prisma.storeReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        rating: aggregates._avg.rating || 5.0,
        reviewCount: aggregates._count.id,
      },
    });

    return review;
  }

  async toggleStoreFollow(userId: string, slug: string) {
    const store = await this.getStoreBySlug(slug);

    const existing = await this.prisma.storeFollower.findUnique({
      where: {
        storeId_userId: { storeId: store.id, userId },
      },
    });

    let isFollowing = false;
    if (existing) {
      await this.prisma.storeFollower.delete({
        where: { id: existing.id },
      });
      isFollowing = false;
    } else {
      await this.prisma.storeFollower.create({
        data: { storeId: store.id, userId },
      });
      isFollowing = true;
    }

    const count = await this.prisma.storeFollower.count({
      where: { storeId: store.id },
    });

    await this.prisma.store.update({
      where: { id: store.id },
      data: { followerCount: count },
    });

    return { isFollowing, followerCount: count };
  }

  async checkFollowStatus(userId: string, slug: string) {
    const store = await this.getStoreBySlug(slug);
    const existing = await this.prisma.storeFollower.findUnique({
      where: {
        storeId_userId: { storeId: store.id, userId },
      },
    });

    return { isFollowing: !!existing };
  }

  private async verifyStoreOwnership(userId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { sellerProfile: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to modify this store',
      );
    }
  }

  private generateMockTimeSeries() {
    const dates = [];
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push({
        date: d.toISOString().split('T')[0],
        grossSales: Math.floor(200 + Math.random() * 1200),
        orderCount: Math.floor(2 + Math.random() * 15),
        viewCount: Math.floor(50 + Math.random() * 300),
      });
    }
    return dates;
  }
}
