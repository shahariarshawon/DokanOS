import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string | null;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    const options = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, options);
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        ...options,
      });
    }

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Connected to Redis server for cache & state management');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('Redis client is ready for commands');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Redis connection terminated');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // -------------------------------------------------------------
  // ONLINE PRESENCE TRACKING
  // -------------------------------------------------------------

  /**
   * Register an active socket connection for a user.
   * If this is the user's first active socket, they transition from offline to online.
   */
  async setUserOnline(
    userId: string,
    socketId: string,
  ): Promise<{ wasOffline: boolean }> {
    try {
      const socketKey = `presence:sockets:${userId}`;
      const statusKey = `presence:user:${userId}`;

      const initialCount = await this.client.scard(socketKey);
      await this.client.sadd(socketKey, socketId);
      await this.client.expire(socketKey, 86400); // 24hr TTL refresh
      await this.client.set(statusKey, 'online');

      return { wasOffline: initialCount === 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to set user online in Redis: ${message}`);
      return { wasOffline: false };
    }
  }

  /**
   * Unregister a socket connection on disconnect.
   * If no remaining sockets exist, the user transitions to offline and lastSeen timestamp is saved.
   */
  async setUserOffline(
    userId: string,
    socketId: string,
  ): Promise<{ isOffline: boolean; lastSeen: string | null }> {
    try {
      const socketKey = `presence:sockets:${userId}`;
      const statusKey = `presence:user:${userId}`;
      const lastSeenKey = `presence:last_seen:${userId}`;

      await this.client.srem(socketKey, socketId);
      const remainingSockets = await this.client.scard(socketKey);

      if (remainingSockets === 0) {
        const now = new Date().toISOString();
        const pipeline = this.client.pipeline();
        pipeline.del(statusKey);
        pipeline.del(socketKey);
        pipeline.set(lastSeenKey, now, 'EX', 604800); // 7 days retention
        await pipeline.exec();

        return { isOffline: true, lastSeen: now };
      }

      return { isOffline: false, lastSeen: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to set user offline in Redis: ${message}`);
      return { isOffline: true, lastSeen: new Date().toISOString() };
    }
  }

  /**
   * Fetch online status and lastSeen for a single user.
   */
  async getUserPresence(userId: string): Promise<UserPresence> {
    try {
      const statusKey = `presence:user:${userId}`;
      const lastSeenKey = `presence:last_seen:${userId}`;

      const [status, lastSeen] = await Promise.all([
        this.client.get(statusKey),
        this.client.get(lastSeenKey),
      ]);

      return {
        userId,
        status: status === 'online' ? 'online' : 'offline',
        lastSeen: status === 'online' ? null : lastSeen,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to query user presence in Redis: ${message}`);
      return { userId, status: 'offline', lastSeen: null };
    }
  }

  /**
   * Batch query presence for multiple users (e.g. conversation participant list).
   */
  async getUsersPresence(userIds: string[]): Promise<UserPresence[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    try {
      const pipeline = this.client.pipeline();
      for (const userId of userIds) {
        pipeline.get(`presence:user:${userId}`);
        pipeline.get(`presence:last_seen:${userId}`);
      }

      const results = await pipeline.exec();
      if (!results) {
        return userIds.map((userId) => ({
          userId,
          status: 'offline',
          lastSeen: null,
        }));
      }

      const presenceList: UserPresence[] = [];
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const statusResult = results[i * 2];
        const lastSeenResult = results[i * 2 + 1];

        const status =
          statusResult && !statusResult[0] ? statusResult[1] : null;
        const lastSeen =
          lastSeenResult && !lastSeenResult[0]
            ? (lastSeenResult[1] as string)
            : null;

        presenceList.push({
          userId,
          status: status === 'online' ? 'online' : 'offline',
          lastSeen: status === 'online' ? null : lastSeen,
        });
      }

      return presenceList;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to batch query user presence in Redis: ${message}`,
      );
      return userIds.map((userId) => ({
        userId,
        status: 'offline',
        lastSeen: null,
      }));
    }
  }
}
