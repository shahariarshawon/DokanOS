import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './database/prisma.service.js';
import { RedisService } from './common/redis/redis.service.js';

@Injectable()
export class AppService {
  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  getLiveHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'dokanos-api',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }

  async getReadyHealth() {
    const checks: Record<
      string,
      { status: string; latencyMs?: number; error?: string }
    > = {};

    // 1. PostgreSQL + pgvector check
    if (this.prisma) {
      const dbStart = Date.now();
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'up', latencyMs: Date.now() - dbStart };
      } catch (err: unknown) {
        checks.database = {
          status: 'down',
          error: err instanceof Error ? err.message : 'Database error',
        };
      }
    }

    // 2. Redis Cache & Socket Adapter check
    if (this.redis) {
      const redisStart = Date.now();
      try {
        const client = this.redis.getClient();
        if (client) {
          await client.ping();
          checks.redis = { status: 'up', latencyMs: Date.now() - redisStart };
        } else {
          checks.redis = { status: 'disabled' };
        }
      } catch (err: unknown) {
        checks.redis = {
          status: 'down',
          error: err instanceof Error ? err.message : 'Redis error',
        };
      }
    }

    // 3. AI Service check
    const aiUrl = this.configService?.get<string>(
      'AI_SERVICE_URL',
      'http://127.0.0.1:8000',
    );
    if (aiUrl) {
      const aiStart = Date.now();
      try {
        const res = await fetch(`${aiUrl}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        checks.aiService = {
          status: res.ok ? 'up' : 'degraded',
          latencyMs: Date.now() - aiStart,
        };
      } catch {
        checks.aiService = {
          status: 'fallback_relational',
          latencyMs: Date.now() - aiStart,
        };
      }
    }

    const allGood = Object.values(checks).every((c) => c.status !== 'down');

    return {
      status: allGood ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'dokanos-api',
      version: '1.0.0',
      uptime: process.uptime(),
      checks,
    };
  }
}
