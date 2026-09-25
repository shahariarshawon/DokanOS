import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import {
  AuditAction,
  UserRole,
  UserStatus,
  VerificationStatus,
  StoreStatus,
  Prisma,
} from '@prisma/client';
import {
  QueryAdminUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/admin-users.dto.js';
import {
  VerifySellerDto,
  ModerateStoreDto,
} from './dto/admin-operations.dto.js';

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  category: 'AI_FEATURES' | 'PREMIUM_TOOLS' | 'EXPERIMENTAL';
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // In-memory feature flag registry with persistent defaults
  private featureFlags: Map<string, FeatureFlagDefinition> = new Map([
    [
      'AI_COPILOT',
      {
        key: 'AI_COPILOT',
        name: 'Seller AI Sales Copilot',
        description:
          'Autonomous sales drop diagnostics, price tuning, and catalog optimization',
        category: 'AI_FEATURES',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'AI_SHOPPING_ASSISTANT',
      {
        key: 'AI_SHOPPING_ASSISTANT',
        name: 'Customer RAG Shopping Assistant',
        description:
          'Multi-turn natural language product search and store policy FAQ assistant',
        category: 'AI_FEATURES',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'AI_VISION_ANALYZER',
      {
        key: 'AI_VISION_ANALYZER',
        name: 'Vision AI Image Attribute Extractor',
        description:
          'Auto-detect style, color, category and tags from uploaded product photos',
        category: 'AI_FEATURES',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'ADVANCED_ANALYTICS',
      {
        key: 'ADVANCED_ANALYTICS',
        name: 'Advanced Business Intelligence & BI',
        description:
          'Cohort retention analysis, conversion velocity, and CSV ledger exports',
        category: 'PREMIUM_TOOLS',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'CUSTOM_STORE_THEMES',
      {
        key: 'CUSTOM_STORE_THEMES',
        name: 'Store Builder Custom Themes',
        description:
          'Custom font pairings, layout architecture, and dynamic color tokens',
        category: 'PREMIUM_TOOLS',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'FRAUD_DETECTION_AUTO_LOCK',
      {
        key: 'FRAUD_DETECTION_AUTO_LOCK',
        name: 'Automated Fraud Order Lock',
        description:
          'Automatically freeze fulfillment for orders with RiskScore >= 80',
        category: 'EXPERIMENTAL',
        enabled: false,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'VECTOR_RECOMMENDATIONS',
      {
        key: 'VECTOR_RECOMMENDATIONS',
        name: 'pgvector Cosine Similarity Recommendations',
        description:
          'Vector-space similarity reranking based on user browsing history',
        category: 'EXPERIMENTAL',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // -------------------------------------------------------------
  // USER MANAGEMENT
  // -------------------------------------------------------------

  async listUsers(query: QueryAdminUsersDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          sellerProfile: {
            select: {
              id: true,
              businessName: true,
              verificationStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found.`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.ADMIN_ACTION,
      resource: 'User',
      resourceId: userId,
      details: {
        previousStatus: user.status,
        newStatus: dto.status,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found.`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.ADMIN_ACTION,
      resource: 'User',
      resourceId: userId,
      details: {
        previousRole: user.role,
        newRole: dto.role,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // SELLER APPROVAL & STORE MODERATION
  // -------------------------------------------------------------

  async listSellers(status?: VerificationStatus) {
    const where: Prisma.SellerProfileWhereInput = {};
    if (status) where.verificationStatus = status;

    return this.prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifySeller(sellerId: string, dto: VerifySellerDto, adminId?: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });
    if (!profile) {
      throw new NotFoundException(`Seller profile '${sellerId}' not found.`);
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        verificationStatus: dto.status,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.ADMIN_ACTION,
      resource: 'SellerProfile',
      resourceId: sellerId,
      details: {
        previousStatus: profile.verificationStatus,
        newStatus: dto.status,
        rejectionReason: dto.rejectionReason,
      },
    });

    return updated;
  }

  async listStores(status?: StoreStatus) {
    const where: Prisma.StoreWhereInput = {};
    if (status) where.status = status;

    return this.prisma.store.findMany({
      where,
      include: {
        sellerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateStore(
    storeId: string,
    dto: ModerateStoreDto,
    adminId?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException(`Store with ID '${storeId}' not found.`);
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { status: dto.status },
    });

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.STORE_UPDATED,
      resource: 'Store',
      resourceId: storeId,
      details: {
        previousStatus: store.status,
        newStatus: dto.status,
        reason: dto.reason,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // PAYMENT & ESCROW MONITORING
  // -------------------------------------------------------------

  async getPaymentMonitoring() {
    const payments = await this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    const totalCount = payments.length;
    let completedCount = 0;
    let failedCount = 0;
    let totalGrossVolume = 0;
    let stripeVolume = 0;
    let sslcommerzVolume = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.status === 'COMPLETED') {
        completedCount++;
        totalGrossVolume += amt;
        if (p.provider === 'STRIPE') stripeVolume += amt;
        if (p.provider === 'SSLCOMMERZ') sslcommerzVolume += amt;
      } else if (p.status === 'FAILED') {
        failedCount++;
      }
    }

    const failureRate =
      totalCount > 0 ? Math.round((failedCount / totalCount) * 1000) / 10 : 0;

    return {
      overview: {
        totalGrossVolume,
        completedCount,
        failedCount,
        failureRate,
        stripeVolume,
        sslcommerzVolume,
        currency: 'USD',
      },
      recentTransactions: payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber,
        provider: p.provider,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        transactionId: p.transactionId,
        createdAt: p.createdAt,
      })),
    };
  }

  // -------------------------------------------------------------
  // AI USAGE MONITORING
  // -------------------------------------------------------------

  async getAiUsageMonitoring() {
    const usages = await this.prisma.aIUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    let totalTokens = 0;
    let totalCost = 0;
    const featureBreakdown: Record<
      string,
      { count: number; tokens: number; cost: number }
    > = {};

    for (const u of usages) {
      totalTokens += u.tokensUsed;
      const c = Number(u.cost);
      totalCost += c;

      if (!featureBreakdown[u.feature]) {
        featureBreakdown[u.feature] = { count: 0, tokens: 0, cost: 0 };
      }
      featureBreakdown[u.feature].count++;
      featureBreakdown[u.feature].tokens += u.tokensUsed;
      featureBreakdown[u.feature].cost += c;
    }

    return {
      summary: {
        totalCalls: usages.length,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
        averageTokensPerCall:
          usages.length > 0 ? Math.round(totalTokens / usages.length) : 0,
      },
      featureBreakdown,
      recentEvents: usages.slice(0, 25).map((u) => ({
        id: u.id,
        feature: u.feature,
        tokensUsed: u.tokensUsed,
        cost: Number(u.cost),
        userEmail: u.user?.email || 'Anonymous / Storefront',
        userRole: u.user?.role || 'GUEST',
        createdAt: u.createdAt,
      })),
    };
  }

  // -------------------------------------------------------------
  // AUDIT & COMPLIANCE
  // -------------------------------------------------------------

  async getAuditLogs(query: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    page?: number;
    limit?: number;
  }) {
    return this.auditService.findAll(query);
  }

  // -------------------------------------------------------------
  // FEATURE FLAGS MANAGEMENT
  // -------------------------------------------------------------

  getFeatureFlags(): FeatureFlagDefinition[] {
    return Array.from(this.featureFlags.values());
  }

  isFeatureEnabled(key: string): boolean {
    const flag = this.featureFlags.get(key);
    return flag ? flag.enabled : false;
  }

  async toggleFeatureFlag(
    key: string,
    enabled: boolean,
    adminId?: string,
  ): Promise<FeatureFlagDefinition> {
    const flag = this.featureFlags.get(key);
    if (!flag) {
      throw new NotFoundException(`Feature flag '${key}' not found.`);
    }

    flag.enabled = enabled;
    flag.updatedAt = new Date().toISOString();
    flag.updatedBy = adminId;
    this.featureFlags.set(key, flag);

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.ADMIN_ACTION,
      resource: 'FeatureFlag',
      resourceId: key,
      details: {
        flag: key,
        enabled,
      },
    });

    return flag;
  }
}
