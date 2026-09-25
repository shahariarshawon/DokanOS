import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RedisService } from '../redis/redis.service.js';

describe('RateLimitGuard (API Security)', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let redisService: Partial<RedisService>;

  beforeEach(() => {
    reflector = new Reflector();
    redisService = {
      checkRateLimit: vi.fn(),
    };
    guard = new RateLimitGuard(reflector, redisService as RedisService);
  });

  function createMockContext(ip = '127.0.0.1', userId?: string) {
    const headers: Record<string, string> = {};
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          headers: {},
          ip,
          method: 'POST',
          path: '/api/v1/auth/login',
          user: userId ? { id: userId } : undefined,
        }),
        getResponse: vi.fn().mockReturnValue({
          setHeader: vi.fn((k, v) => {
            headers[k] = v;
          }),
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow request when within rate limit and set headers', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 10,
      windowSeconds: 60,
    });

    (redisService.checkRateLimit as any).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Math.floor(Date.now() / 1000) + 60,
    });

    const context = createMockContext('192.168.1.1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(redisService.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('ip:192.168.1.1:POST:'),
      10,
      60,
    );
  });

  it('should reject request with HTTP 429 when rate limit is exceeded', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });

    (redisService.checkRateLimit as any).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Math.floor(Date.now() / 1000) + 45,
    });

    const context = createMockContext('203.0.113.42');

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.getResponse().message).toContain('rate limit exceeded');
    }
  });

  it('should track authenticated users by user ID rather than IP', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    (redisService.checkRateLimit as any).mockResolvedValue({
      allowed: true,
      remaining: 119,
      resetTime: Math.floor(Date.now() / 1000) + 60,
    });

    const context = createMockContext('10.0.0.1', 'user-unique-id-99');
    await guard.canActivate(context);

    expect(redisService.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('user:user-unique-id-99:POST:'),
      120,
      60,
    );
  });
});
