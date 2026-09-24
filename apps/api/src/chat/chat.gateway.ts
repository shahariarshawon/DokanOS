import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service.js';
import { RedisService } from '../common/redis/redis.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

interface AuthenticatedSocket extends Socket {
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
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Handle incoming socket connection with JWT authentication.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Unauthorized WebSocket connection rejected: [socket: ${client.id}]`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      (client as AuthenticatedSocket).data = { user: payload };
      const userId = payload.sub;

      // Join individual user room for directed events
      await client.join(`user:${userId}`);

      // Track online presence in Redis
      const { wasOffline } = await this.redisService.setUserOnline(userId, client.id);

      if (wasOffline) {
        this.server.emit('presence:change', {
          userId,
          status: 'online',
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(`Chat client connected: [user: ${userId}, socket: ${client.id}]`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Socket authentication failed for ${client.id}: ${message}`);
      client.disconnect();
    }
  }

  /**
   * Handle socket disconnect and update presence state in Redis.
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const user = (client as AuthenticatedSocket).data?.user;
    if (user?.sub) {
      const userId = user.sub;
      const { isOffline, lastSeen } = await this.redisService.setUserOffline(userId, client.id);

      if (isOffline) {
        this.server.emit('presence:change', {
          userId,
          status: 'offline',
          lastSeen,
        });
      }

      this.logger.log(`Chat client disconnected: [user: ${userId}, socket: ${client.id}]`);
    }
  }

  /**
   * Join a specific conversation room after verifying authorization.
   */
  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ status: string; conversationId: string }> {
    const userId = client.data.user?.sub;
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    if (!data?.conversationId) {
      throw new WsException('conversationId is required');
    }

    // Verify user is an authorized participant
    await this.chatService.verifyConversationParticipant(userId, data.conversationId);

    const room = `conversation:${data.conversationId}`;
    await client.join(room);

    this.logger.debug(`User ${userId} joined room ${room}`);
    return { status: 'joined', conversationId: data.conversationId };
  }

  /**
   * Leave a conversation room.
   */
  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ status: string; conversationId: string }> {
    if (data?.conversationId) {
      const room = `conversation:${data.conversationId}`;
      await client.leave(room);
      return { status: 'left', conversationId: data.conversationId };
    }
    return { status: 'ignored', conversationId: '' };
  }

  /**
   * Send a message in real-time, broadcast to the room, and return ACK.
   */
  @SubscribeMessage('send:message')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; content: string; attachments?: SendMessageDto['attachments'] },
  ): Promise<{ status: string; data: unknown }> {
    const userId = client.data.user?.sub;
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    if (!payload?.conversationId || !payload?.content) {
      throw new WsException('conversationId and content are required');
    }

    const { message } = await this.chatService.sendMessage(userId, payload.conversationId, {
      content: payload.content,
      attachments: payload.attachments,
    });

    const room = `conversation:${payload.conversationId}`;
    // Broadcast message to everyone in the room (including sender or excluding sender if optimistic UI is used)
    this.server.to(room).emit('message:received', message);

    return { status: 'ok', data: message };
  }

  /**
   * Broadcast typing indicator to conversation room (excluding sender).
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): void {
    const userId = client.data.user?.sub;
    if (userId && data?.conversationId) {
      client.to(`conversation:${data.conversationId}`).emit('user:typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    }
  }

  /**
   * Stop typing indicator.
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): void {
    const userId = client.data.user?.sub;
    if (userId && data?.conversationId) {
      client.to(`conversation:${data.conversationId}`).emit('user:typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    }
  }

  /**
   * Mark messages as read and broadcast read receipts.
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ status: string; updatedCount: number }> {
    const userId = client.data.user?.sub;
    if (!userId || !data?.conversationId) {
      throw new WsException('Invalid payload');
    }

    const result = await this.chatService.markAsRead(userId, data.conversationId);

    // Broadcast read receipt to room
    this.server.to(`conversation:${data.conversationId}`).emit('messages:read_receipt', {
      conversationId: data.conversationId,
      readerId: userId,
      readAt: result.readAt,
      count: result.updatedCount,
    });

    return { status: 'ok', updatedCount: result.updatedCount };
  }

  /**
   * Query online presence for a list of users.
   */
  @SubscribeMessage('presence:query')
  async handlePresenceQuery(
    @MessageBody() data: { userIds: string[] },
  ): Promise<unknown> {
    if (!data?.userIds || !Array.isArray(data.userIds)) {
      return [];
    }
    return this.redisService.getUsersPresence(data.userIds);
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
