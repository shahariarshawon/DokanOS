import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;
  let gatewayMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    };

    gatewayMock = {
      emitNotificationToUser: vi.fn(),
    };

    service = new NotificationsService(prismaMock, gatewayMock);
  });

  describe('createAndDispatch', () => {
    it('should create notification and emit to user room', async () => {
      const mockUser = { id: 'user-123' };
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-123',
        type: NotificationType.ORDER_STATUS,
        title: 'Order Shipped',
        body: 'Your order is on the way',
        payload: { orderId: 'ord-1' },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createAndDispatch({
        userId: 'user-123',
        type: NotificationType.ORDER_STATUS,
        title: 'Order Shipped',
        body: 'Your order is on the way',
        payload: { orderId: 'ord-1' },
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true },
      });
      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(gatewayMock.emitNotificationToUser).toHaveBeenCalledWith(
        'user-123',
        mockNotification,
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications and unread counts', async () => {
      const mockNotifications = [{ id: 'notif-1', isRead: false }];
      prismaMock.notification.findMany.mockResolvedValue(mockNotifications);
      prismaMock.notification.count.mockResolvedValueOnce(1); // total
      prismaMock.notification.count.mockResolvedValueOnce(1); // unread

      const result = await service.getUserNotifications('user-123', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockNotifications);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      prismaMock.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-123',
      });
      prismaMock.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead('user-123', 'notif-1');

      expect(result.isRead).toBe(true);
      expect(prismaMock.notification.update).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(result.updatedCount).toBe(5);
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });
});
