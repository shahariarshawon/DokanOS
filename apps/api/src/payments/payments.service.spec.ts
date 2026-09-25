import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService (Backend Testing)', () => {
  let paymentsService: PaymentsService;
  let prisma: any;
  let configService: any;

  const mockOrder = {
    id: 'order-uuid-1',
    userId: 'user-uuid-1',
    status: 'PENDING',
    totalAmount: new Prisma.Decimal(150.0),
    currency: 'USD',
  };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'mock_stripe_key';
        return null;
      }),
    };

    paymentsService = new PaymentsService(
      prisma as PrismaService,
      configService as ConfigService,
    );
  });

  describe('Payment Initiation Flow', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.createPayment('user-uuid-1', {
          orderId: 'missing-order-id',
          provider: PaymentProvider.STRIPE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: 'other-user-uuid',
      });

      await expect(
        paymentsService.createPayment('user-uuid-1', {
          orderId: 'order-uuid-1',
          provider: PaymentProvider.STRIPE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is already paid', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PAID',
      });

      await expect(
        paymentsService.createPayment('user-uuid-1', {
          orderId: 'order-uuid-1',
          provider: PaymentProvider.STRIPE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment record and return intent response for Stripe', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.payment.create.mockResolvedValue({
        id: 'payment-uuid-1',
        orderId: mockOrder.id,
        provider: PaymentProvider.STRIPE,
        amount: mockOrder.totalAmount,
        currency: 'USD',
        status: 'PENDING',
      });

      const res = await paymentsService.createPayment('user-uuid-1', {
        orderId: 'order-uuid-1',
        provider: PaymentProvider.STRIPE,
      });

      expect(res.orderId).toBe('order-uuid-1');
      expect(res.provider).toBe(PaymentProvider.STRIPE);
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });
});
