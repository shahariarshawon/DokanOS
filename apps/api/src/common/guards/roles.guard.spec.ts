import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard (RBAC Security)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: { id: string; role?: UserRole }) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required on route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has one of the required roles (SELLER)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.SELLER,
      UserRole.ADMIN,
    ]);
    const context = createMockContext({
      id: 'seller-1',
      role: UserRole.SELLER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has ADMIN role on admin-only route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access (403 Forbidden) if customer attempts to access seller route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.SELLER,
      UserRole.ADMIN,
    ]);
    const context = createMockContext({
      id: 'cust-1',
      role: UserRole.CUSTOMER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access if user context is missing or unauthenticated', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.CUSTOMER,
    ]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
