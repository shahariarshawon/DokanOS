import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService, EnrichedConversation } from './chat.service.js';
import { RedisService, UserPresence } from '../common/redis/redis.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import {
  BatchPresenceDto,
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/query-chat.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Initiate or retrieve an existing conversation with a vendor store' })
  @ApiResponse({ status: 201, description: 'Conversation thread created or retrieved' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ): Promise<EnrichedConversation> {
    return this.chatService.getOrCreateConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all active conversations for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of conversations with latest messages' })
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query() query: QueryConversationsDto,
  ): Promise<{ data: EnrichedConversation[]; meta: { total: number; page: number; limit: number } }> {
    return this.chatService.getUserConversations(userId, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get details of a specific conversation thread' })
  @ApiResponse({ status: 200, description: 'Conversation thread details' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EnrichedConversation> {
    const { conversation } = await this.chatService.verifyConversationParticipant(userId, id);
    return conversation;
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Fetch message history within a conversation thread' })
  @ApiResponse({ status: 200, description: 'Paginated message history' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMessagesDto,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.chatService.getMessages(userId, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation thread (REST fallback)' })
  @ApiResponse({ status: 201, description: 'Message created and dispatched' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<{ message: unknown; recipientId: string }> {
    return this.chatService.sendMessage(userId, id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark unread incoming messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ conversationId: string; updatedCount: number; readAt: Date }> {
    return this.chatService.markAsRead(userId, id);
  }

  @Get('presence/:userId')
  @ApiOperation({ summary: 'Query online presence and last seen timestamp for a specific user' })
  @ApiResponse({ status: 200, description: 'User presence information' })
  async getUserPresence(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ): Promise<UserPresence> {
    return this.redisService.getUserPresence(targetUserId);
  }

  @Post('presence/batch')
  @ApiOperation({ summary: 'Batch query online presence for multiple users' })
  @ApiResponse({ status: 200, description: 'List of presence states' })
  async getBatchPresence(@Body() dto: BatchPresenceDto): Promise<UserPresence[]> {
    return this.redisService.getUsersPresence(dto.userIds);
  }
}
