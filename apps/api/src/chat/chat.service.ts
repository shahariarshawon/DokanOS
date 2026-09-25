import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import {
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/query-chat.dto.js';
import { NotificationType, Prisma } from '@prisma/client';

export interface EnrichedConversation {
  id: string;
  customerId: string;
  storeId: string;
  orderId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    sellerProfile: {
      userId: string;
      businessName: string;
    };
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: Prisma.Decimal;
  } | null;
  latestMessage?: unknown;
  unreadCount: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Verify whether a user is an authorized participant (customer, store owner, or admin)
   */
  async verifyConversationParticipant(
    userId: string,
    conversationId: string,
  ): Promise<{
    conversation: EnrichedConversation;
    recipientId: string;
    isCustomer: boolean;
  }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            sellerProfile: {
              select: {
                userId: true,
                businessName: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    const isCustomer = conversation.customerId === userId;
    const isSeller = conversation.store.sellerProfile.userId === userId;

    if (!isCustomer && !isSeller) {
      // Check if user is platform ADMIN
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You do not have permission to access this conversation',
        );
      }
    }

    const recipientId = isCustomer
      ? conversation.store.sellerProfile.userId
      : conversation.customerId;

    return {
      conversation: { ...conversation, unreadCount: 0 },
      recipientId,
      isCustomer,
    };
  }

  /**
   * Create or retrieve an existing conversation thread between a customer and a vendor store.
   */
  async getOrCreateConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<EnrichedConversation> {
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      include: {
        sellerProfile: {
          select: { userId: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${dto.storeId} not found`);
    }

    if (store.sellerProfile.userId === userId) {
      throw new BadRequestException(
        'You cannot initiate a conversation with your own store',
      );
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, userId: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
      }

      if (order.userId !== userId) {
        throw new ForbiddenException(
          'You can only attach orders that belong to your account',
        );
      }
    }

    // Check existing conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        customerId: userId,
        storeId: dto.storeId,
        orderId: dto.orderId ?? null,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            sellerProfile: {
              select: {
                userId: true,
                businessName: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      const created = await this.prisma.conversation.create({
        data: {
          customerId: userId,
          storeId: dto.storeId,
          orderId: dto.orderId ?? null,
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              sellerProfile: {
                select: {
                  userId: true,
                  businessName: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      conversation = created;
    }

    // If an initial message was provided, persist it
    if (dto.initialMessage && dto.initialMessage.trim().length > 0) {
      await this.sendMessage(userId, conversation.id, {
        content: dto.initialMessage.trim(),
      });
    }

    return {
      ...conversation,
      latestMessage: conversation.messages[0] ?? null,
      unreadCount: 0,
    };
  }

  /**
   * List all conversation inboxes for the current user (as customer or seller).
   */
  async getUserConversations(
    userId: string,
    query: QueryConversationsDto,
  ): Promise<{
    data: EnrichedConversation[];
    meta: { total: number; page: number; limit: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Find stores owned by this user (if seller)
    const sellerStores = await this.prisma.store.findMany({
      where: {
        sellerProfile: {
          userId,
        },
      },
      select: { id: true },
    });

    const storeIds = sellerStores.map((s) => s.id);

    const where: Prisma.ConversationWhereInput = {
      OR: [
        { customerId: userId },
        ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
      ],
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              sellerProfile: {
                select: {
                  userId: true,
                  businessName: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Compute unread message counts for each conversation
    const conversationIds = conversations.map((c) => c.id);
    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
      _count: { id: true },
    });

    const unreadMap = new Map<string, number>();
    for (const item of unreadCounts) {
      unreadMap.set(item.conversationId, item._count.id);
    }

    const data: EnrichedConversation[] = conversations.map((conv) => ({
      ...conv,
      latestMessage: conv.messages[0] ?? null,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  /**
   * Get messages within a conversation thread with pagination.
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: QueryMessagesDto,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.verifyConversationParticipant(userId, conversationId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' }, // Newest first for pagination
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.reverse(), // Client receives ascending chronological slice
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send a message inside a conversation and trigger real-time notifications.
   */
  async sendMessage(
    senderId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<{
    message: unknown;
    recipientId: string;
  }> {
    const { recipientId } = await this.verifyConversationParticipant(
      senderId,
      conversationId,
    );

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: dto.content,
        attachments: dto.attachments
          ? (dto.attachments as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Dispatch background notification to recipient
    const senderName =
      `${message.sender.firstName} ${message.sender.lastName}`.trim();
    const truncatedBody =
      dto.content.length > 80
        ? `${dto.content.substring(0, 77)}...`
        : dto.content;

    this.notificationsService
      .createAndDispatch({
        userId: recipientId,
        type: NotificationType.CHAT_MESSAGE,
        title: `Message from ${senderName}`,
        body: truncatedBody,
        payload: {
          conversationId,
          messageId: message.id,
          senderId,
        },
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to dispatch chat notification: ${err.message}`,
        );
      });

    return { message, recipientId };
  }

  /**
   * Mark all unread incoming messages in a conversation as read.
   */
  async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ conversationId: string; updatedCount: number; readAt: Date }> {
    await this.verifyConversationParticipant(userId, conversationId);

    const readAt = new Date();
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt,
      },
    });

    return {
      conversationId,
      updatedCount: result.count,
      readAt,
    };
  }
}
