import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      sub: string;
      email: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Unauthorized notification connection attempt from ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      (client as AuthenticatedSocket).data = { user: payload };
      const room = `user:${payload.sub}`;
      await client.join(room);

      this.logger.log(`User ${payload.sub} connected to notification stream [socket: ${client.id}]`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Notification socket auth failed for ${client.id}: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Notification client disconnected: ${client.id}`);
  }

  /**
   * Dispatches a real-time notification to a specific user's private channel.
   */
  emitNotificationToUser(userId: string, notification: unknown): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification:new', notification);
    this.logger.log(`Dispatched real-time notification to room ${room}`);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    const tokenFromAuth = client.handshake.auth?.token;
    if (tokenFromAuth && typeof tokenFromAuth === 'string') {
      return tokenFromAuth.startsWith('Bearer ') ? tokenFromAuth.substring(7).trim() : tokenFromAuth;
    }

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken.startsWith('Bearer ') ? queryToken.substring(7).trim() : queryToken;
    }

    return null;
  }
}
