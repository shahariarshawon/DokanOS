import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RedisService } from '../redis/redis.service.js';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id?: string } }>();
    const res = http.getResponse<Response>();

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    ) || {
      limit: 120, // Global default: 120 req / minute
      windowSeconds: 60,
    };

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'anonymous';

    const identifier = req.user?.id ? `user:${req.user.id}` : `ip:${clientIp}`;
    const endpoint = req.route?.path || req.path || 'unknown';
    const rateLimitKey = `${identifier}:${req.method}:${endpoint}`;

    const { allowed, remaining, resetTime } =
      await this.redisService.checkRateLimit(
        rateLimitKey,
        options.limit,
        options.windowSeconds,
      );

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', options.limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
    }

    if (!allowed) {
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = Math.max(1, resetTime - now);
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfter.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'API rate limit exceeded. Please wait before making further requests.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
