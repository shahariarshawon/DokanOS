import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantAccessDeniedException } from '../exceptions/domain.exceptions.js';

describe('TenantGuard (Multi-Tenant Isolation)', () => {
  let guard: TenantGuard;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      store: {
        findFirst: vi.fn(),
      } as any,
    };
    guard = new TenantGuard(prisma as PrismaService);
  });

  const createMockContext = (
    user: any,
    headers = {},
    params = {},
    query = {},
    body = {},
  ) => {
    const request = {
      user,
      headers,
      params,
      query,
      body,
      tenant: null,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should pass if no user is attached (deferring to JwtAuthGuard)', async () => {
    const ctx = createMockContext(null);
    const canActivate = await guard.canActivate(ctx);
    expect(canActivate).toBe(true);
  });

  it('should allow non-tenant-specific requests with base tenant context', async () => {
    const user = { id: 'seller-1', role: 'SELLER' };
    const ctx = createMockContext(user);

    const canActivate = await guard.canActivate(ctx);
    expect(canActivate).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.tenant).toEqual({
      role: 'SELLER',
      isCrossTenantAdmin: false,
    });
  });

  it('should allow Admin full cross-tenant access', async () => {
    const adminUser = { id: 'admin-1', role: 'ADMIN' };
    const ctx = createMockContext(
      adminUser,
      {},
      { storeId: 'store-arbitrary' },
    );

    const canActivate = await guard.canActivate(ctx);
    expect(canActivate).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.tenant.isCrossTenantAdmin).toBe(true);
    expect(req.tenant.storeId).toBe('store-arbitrary');
    expect(prisma.store!.findFirst).not.toHaveBeenCalled();
  });

  it('should allow Seller to access their own store', async () => {
    const sellerUser = { id: 'seller-123', role: 'SELLER' };
    const ctx = createMockContext(sellerUser, {
      'x-tenant-id': 'store-own-99',
    });

    (prisma.store!.findFirst as any).mockResolvedValue({
      id: 'store-own-99',
      slug: 'apple-zone',
      status: 'ACTIVE',
      sellerProfileId: 'profile-1',
    });

    const canActivate = await guard.canActivate(ctx);
    expect(canActivate).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.tenant.storeId).toBe('store-own-99');
    expect(req.tenant.sellerId).toBe('seller-123');
    expect(req.tenant.isCrossTenantAdmin).toBe(false);
  });

  it('should throw TenantAccessDeniedException if Seller attempts to access another store', async () => {
    const sellerUser = { id: 'seller-intruder', role: 'SELLER' };
    const ctx = createMockContext(sellerUser, {}, { storeId: 'store-victim' });

    (prisma.store!.findFirst as any).mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      TenantAccessDeniedException,
    );
  });
});
