import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private readonly adapterLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    appOrHttpServer: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(appOrHttpServer);
  }

  async connectToRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');

      const options = {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      };

      const pubClient: Redis = redisUrl
        ? new Redis(redisUrl, options)
        : new Redis({
            host,
            port,
            password: password || undefined,
            ...options,
          });

      const subClient: Redis = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.once('ready', () => resolve());
          pubClient.once('error', (err) => reject(err));
        }),
        new Promise<void>((resolve, reject) => {
          subClient.once('ready', () => resolve());
          subClient.once('error', (err) => reject(err));
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.adapterLogger.log(
        'Redis Socket.io Adapter initialized across pub/sub channels',
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.adapterLogger.warn(
        `Failed to initialize Redis Socket.io adapter: ${message}. Falling back to default in-memory adapter.`,
      );
    }
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const serverOptions = {
      ...options,
      cors: {
        origin: '*', // In production, can be constrained to frontend origins
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
      transports: ['websocket', 'polling'],
    } as ServerOptions;

    const server = super.createIOServer(port, serverOptions);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.adapterLogger.log(
        'Bound Redis adapter to Socket.io server instance',
      );
    }

    return server;
  }
}
