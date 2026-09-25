import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from './chat.service.js';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let prismaMock: any;
  let notificationsMock: any;

  beforeEach(() => {
    prismaMock = {
      store: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
      },
      conversation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      message: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
        groupBy: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    notificationsMock = {
      createAndDispatch: vi.fn().mockResolvedValue({}),
    };

    service = new ChatService(prismaMock, notificationsMock);
  });

  describe('getOrCreateConversation', () => {
    it('should reject if customer attempts to start conversation with their own store', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: 'store-1',
        sellerProfile: { userId: 'user-seller-1' },
      });

      await expect(
        service.getOrCreateConversation('user-seller-1', {
          storeId: 'store-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing conversation if found', async () => {
      const mockStore = {
        id: 'store-1',
        sellerProfile: { userId: 'seller-2' },
      };
      const mockConversation = {
        id: 'conv-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        orderId: null,
        messages: [],
      };

      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation('customer-1', {
        storeId: 'store-1',
      });

      expect(result.id).toBe('conv-1');
      expect(prismaMock.conversation.create).not.toHaveBeenCalled();
    });

    it('should create conversation if not exists', async () => {
      const mockStore = {
        id: 'store-1',
        sellerProfile: { userId: 'seller-2' },
      };
      const createdConv = {
        id: 'conv-new',
        customerId: 'customer-1',
        storeId: 'store-1',
        orderId: null,
        messages: [],
      };

      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue(createdConv);

      const result = await service.getOrCreateConversation('customer-1', {
        storeId: 'store-1',
      });

      expect(result.id).toBe('conv-new');
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should create message and update conversation lastMessageAt', async () => {
      const mockConversation = {
        id: 'conv-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        store: { sellerProfile: { userId: 'seller-1' } },
      };

      prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'customer-1',
        content: 'Hi seller!',
        sender: { firstName: 'Alice', lastName: 'Customer' },
      });
      prismaMock.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage('customer-1', 'conv-1', {
        content: 'Hi seller!',
      });

      expect(result.recipientId).toBe('seller-1');
      expect(prismaMock.message.create).toHaveBeenCalled();
      expect(prismaMock.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
      });
      expect(notificationsMock.createAndDispatch).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      const mockConversation = {
        id: 'conv-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        store: { sellerProfile: { userId: 'seller-1' } },
      };

      prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);
      prismaMock.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' });

      await expect(
        service.sendMessage('random-user-3', 'conv-1', { content: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it('should mark unread messages as read', async () => {
      const mockConversation = {
        id: 'conv-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        store: { sellerProfile: { userId: 'seller-1' } },
      };

      prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);
      prismaMock.message.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead('customer-1', 'conv-1');

      expect(result.updatedCount).toBe(3);
      expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          senderId: { not: 'customer-1' },
          isRead: false,
        },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });
});
