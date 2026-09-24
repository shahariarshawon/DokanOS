import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { Notification, NotificationType, Prisma } from '@prisma/client';

export interface PaginatedNotifications {
  data: Notification[];
  meta: {
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Persists a notification to the database and broadcasts it via WebSocket.
   */
  async createAndDispatch(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        payload: (dto.payload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    // WebSocket real-time delivery
    try {
      this.gateway.emitNotificationToUser(dto.userId, notification);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast notification via WebSocket: ${message}`);
    }

    return notification;
  }

  /**
   * Fetch paginated notification history for a user.
   */
  async getUserNotifications(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedNotifications> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for badge display.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  /**
   * Delete a notification.
   */
  async deleteNotification(userId: string, notificationId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  // -------------------------------------------------------------
  // DOMAIN EVENT DISPATCH HELPERS
  // -------------------------------------------------------------

  /**
   * Dispatch Order status lifecycle notifications.
   */
  async dispatchOrderNotification(
    userId: string,
    data: {
      orderId: string;
      orderNumber: string;
      status: string;
      totalAmount: number | string;
    },
  ): Promise<Notification> {
    return this.createAndDispatch({
      userId,
      type: NotificationType.ORDER_STATUS,
      title: `Order #${data.orderNumber} Status: ${data.status}`,
      body: `Your order #${data.orderNumber} is now ${data.status.toLowerCase()}. Total: $${data.totalAmount}`,
      payload: { orderId: data.orderId, orderNumber: data.orderNumber, status: data.status },
    });
  }

  /**
   * Dispatch Payment completion notifications.
   */
  async dispatchPaymentCompleted(
    userId: string,
    data: {
      orderId: string;
      orderNumber: string;
      amount: number | string;
      currency: string;
      provider: string;
    },
  ): Promise<Notification> {
    return this.createAndDispatch({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: `Payment Received for #${data.orderNumber}`,
      body: `Successfully charged ${data.amount} ${data.currency} via ${data.provider}.`,
      payload: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        provider: data.provider,
      },
    });
  }

  /**
   * Dispatch Seller updates (e.g. KYC approval, store status change).
   */
  async dispatchSellerUpdate(
    userId: string,
    data: {
      storeId?: string;
      storeName?: string;
      status: string;
      message?: string;
    },
  ): Promise<Notification> {
    return this.createAndDispatch({
      userId,
      type: NotificationType.SELLER_UPDATE,
      title: `Store Update: ${data.storeName || 'Merchant Account'}`,
      body:
        data.message ||
        `Your store '${data.storeName}' status has been updated to ${data.status}.`,
      payload: { storeId: data.storeId, status: data.status },
    });
  }

  /**
   * Dispatch Low stock alerts to sellers.
   */
  async dispatchLowStockAlert(
    userId: string,
    data: {
      productId: string;
      productTitle: string;
      remainingStock: number;
    },
  ): Promise<Notification> {
    return this.createAndDispatch({
      userId,
      type: NotificationType.STOCK_LOW,
      title: `Low Stock Alert: ${data.productTitle}`,
      body: `Product '${data.productTitle}' has only ${data.remainingStock} units left in stock.`,
      payload: { productId: data.productId, remainingStock: data.remainingStock },
    });
  }
}

