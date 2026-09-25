import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('AuditService (Audit Log System)', () => {
  let service: AuditService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      } as any,
    };
    service = new AuditService(prisma as PrismaService);
  });

  it('should record an audit log event with metadata', async () => {
    (prisma.auditLog!.create as any).mockResolvedValue({ id: 'audit-1' });

    await service.log({
      userId: 'user-uuid-1',
      action: 'LOGIN',
      resource: 'User',
      resourceId: 'user-uuid-1',
      details: { email: 'seller@dokanos.com' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(prisma.auditLog!.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-uuid-1',
        action: 'LOGIN',
        resource: 'User',
        resourceId: 'user-uuid-1',
        details: { email: 'seller@dokanos.com' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    });
  });

  it('should gracefully swallow database logging errors without throwing', async () => {
    (prisma.auditLog!.create as any).mockRejectedValue(
      new Error('DB connection dropped'),
    );

    await expect(
      service.log({
        action: 'PAYMENT_FAILED',
        resource: 'Payment',
        details: { reason: 'Gateway timeout' },
      }),
    ).resolves.not.toThrow();
  });

  it('should paginate and filter audit log entries', async () => {
    const mockLogs = [
      { id: 'log-1', action: 'ORDER_CREATED', resource: 'Order' },
      { id: 'log-2', action: 'ORDER_STATUS_CHANGED', resource: 'Order' },
    ];
    (prisma.auditLog!.findMany as any).mockResolvedValue(mockLogs);
    (prisma.auditLog!.count as any).mockResolvedValue(2);

    const result = await service.findAll({
      action: 'ORDER_CREATED' as any,
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.totalItems).toBe(2);
    expect(result.meta.totalPages).toBe(1);
  });
});
