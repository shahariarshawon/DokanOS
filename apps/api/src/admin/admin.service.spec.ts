import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from './admin.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import {
  UserRole,
  UserStatus,
  VerificationStatus,
  StoreStatus,
  Prisma,
} from '@prisma/client';

describe('AdminService (Admin Control Center & Feature Flags)', () => {
  let adminService: AdminService;
  let prisma: Partial<PrismaService>;
  let auditService: Partial<AuditService>;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      sellerProfile: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      store: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      payment: {
        findMany: vi.fn(),
      } as any,
      aIUsage: {
        findMany: vi.fn(),
      } as any,
    };

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    adminService = new AdminService(
      prisma as PrismaService,
      auditService as AuditService,
    );
  });

  it('should list users with pagination and search metadata', async () => {
    (prisma.user!.findMany as any).mockResolvedValue([
      {
        id: 'u-1',
        email: 'merchant@dokan.os',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
      },
    ]);
    (prisma.user!.count as any).mockResolvedValue(1);

    const res = await adminService.listUsers({
      page: 1,
      limit: 10,
      search: 'merchant',
    });

    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(1);
    expect(res.totalPages).toBe(1);
  });

  it('should update user status and record an audit log', async () => {
    (prisma.user!.findUnique as any).mockResolvedValue({
      id: 'u-suspect',
      email: 'bad@actor.com',
      status: UserStatus.ACTIVE,
    });
    (prisma.user!.update as any).mockResolvedValue({
      id: 'u-suspect',
      status: UserStatus.SUSPENDED,
    });

    const res = await adminService.updateUserStatus(
      'u-suspect',
      {
        status: UserStatus.SUSPENDED,
        reason: 'Fraudulent transaction history',
      },
      'admin-super',
    );

    expect(res.status).toBe(UserStatus.SUSPENDED);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-super',
        resource: 'User',
        resourceId: 'u-suspect',
      }),
    );
  });

  it('should verify seller profile and log the decision', async () => {
    (prisma.sellerProfile!.findUnique as any).mockResolvedValue({
      id: 'seller-profile-1',
      verificationStatus: VerificationStatus.PENDING,
    });
    (prisma.sellerProfile!.update as any).mockResolvedValue({
      id: 'seller-profile-1',
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const res = await adminService.verifySeller(
      'seller-profile-1',
      { status: VerificationStatus.VERIFIED },
      'admin-super',
    );

    expect(res.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(auditService.log).toHaveBeenCalled();
  });

  it('should moderate store status to SUSPENDED', async () => {
    (prisma.store!.findUnique as any).mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.ACTIVE,
    });
    (prisma.store!.update as any).mockResolvedValue({
      id: 'store-1',
      status: StoreStatus.SUSPENDED,
    });

    const res = await adminService.moderateStore(
      'store-1',
      { status: StoreStatus.SUSPENDED, reason: 'Trademark violation notice' },
      'admin-super',
    );

    expect(res.status).toBe(StoreStatus.SUSPENDED);
    expect(auditService.log).toHaveBeenCalled();
  });

  it('should aggregate payment monitoring stats accurately', async () => {
    (prisma.payment!.findMany as any).mockResolvedValue([
      {
        id: 'pay-1',
        amount: new Prisma.Decimal(100.0),
        status: 'COMPLETED',
        provider: 'STRIPE',
      },
      {
        id: 'pay-2',
        amount: new Prisma.Decimal(50.0),
        status: 'COMPLETED',
        provider: 'SSLCOMMERZ',
      },
      {
        id: 'pay-3',
        amount: new Prisma.Decimal(200.0),
        status: 'FAILED',
        provider: 'STRIPE',
      },
    ]);

    const res = await adminService.getPaymentMonitoring();

    expect(res.overview.totalGrossVolume).toBe(150.0);
    expect(res.overview.completedCount).toBe(2);
    expect(res.overview.failedCount).toBe(1);
    expect(res.overview.stripeVolume).toBe(100.0);
    expect(res.overview.sslcommerzVolume).toBe(50.0);
    expect(res.overview.failureRate).toBe(33.3);
  });

  it('should manage and toggle feature flags with audit logs', async () => {
    const flags = adminService.getFeatureFlags();
    expect(flags.length).toBeGreaterThan(3);

    const updated = await adminService.toggleFeatureFlag(
      'FRAUD_DETECTION_AUTO_LOCK',
      true,
      'admin-super',
    );

    expect(updated.enabled).toBe(true);
    expect(adminService.isFeatureEnabled('FRAUD_DETECTION_AUTO_LOCK')).toBe(
      true,
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'FeatureFlag',
        resourceId: 'FRAUD_DETECTION_AUTO_LOCK',
      }),
    );
  });
});
