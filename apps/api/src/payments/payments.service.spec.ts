import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProvider, Prisma, SubscriptionTier } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService (Backend Testing)', () => {
  let paymentsService: PaymentsService;
  let prisma: any;
  let configService: any;
  let notificationsService: any;

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'DOK-2026-100234',
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
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      paymentTransaction: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
      },
      subscriptionPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'plan-free',
            name: 'FREE',
            tier: 'FREE',
            price: new Prisma.Decimal(0.0),
            currency: 'USD',
            interval: 'month',
            features: ['Basic store themes', 'Basic analytics'],
            limits: { maxProducts: 20 },
            isActive: true,
          },
          {
            id: 'plan-pro',
            name: 'PRO',
            tier: 'PRO',
            price: new Prisma.Decimal(19.0),
            currency: 'USD',
            interval: 'month',
            features: [
              'Unlimited products',
              'AI Copilot & Product Vision Analyzer',
            ],
            limits: { maxProducts: 999999 },
            isActive: true,
          },
        ]),
        findFirst: vi.fn().mockImplementation((args: any) => {
          const tier = args?.where?.tier || 'PRO';
          if (tier === 'FREE') {
            return Promise.resolve({
              id: 'plan-free',
              name: 'FREE',
              tier: 'FREE',
              price: new Prisma.Decimal(0.0),
              currency: 'USD',
              interval: 'month',
              features: ['Basic store themes', 'Basic analytics'],
              limits: { maxProducts: 20 },
              isActive: true,
            });
          }
          return Promise.resolve({
            id: 'plan-pro',
            name: 'PRO',
            tier: 'PRO',
            price: new Prisma.Decimal(19.0),
            currency: 'USD',
            interval: 'month',
            features: ['Unlimited products', 'AI Copilot'],
            limits: { maxProducts: 999999 },
            isActive: true,
          });
        }),
        upsert: vi.fn(),
      },
      sellerProfile: {
        findUnique: vi.fn(),
      },
      sellerSubscription: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({
          id: 'sub-uuid-1',
          sellerId: 'seller-uuid-1',
          planId: 'plan-pro',
          status: 'ACTIVE',
        }),
        update: vi.fn(),
      },
      aIUsage: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { tokensUsed: 120 } }),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb(prisma);
      }),
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'mock_stripe_key';
        return null;
      }),
    };

    notificationsService = {
      dispatchPaymentCompleted: vi.fn().mockResolvedValue({}),
      createAndDispatch: vi.fn().mockResolvedValue({}),
    };

    paymentsService = new PaymentsService(
      prisma as PrismaService,
      configService as ConfigService,
      notificationsService as any,
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
      expect(prisma.paymentTransaction.create).toHaveBeenCalled();
    });

    it('should create SSLCommerz redirect URL and pending payment', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.payment.create.mockResolvedValue({
        id: 'payment-sslc-1',
        orderId: mockOrder.id,
        provider: PaymentProvider.SSLCOMMERZ,
        amount: mockOrder.totalAmount,
        currency: 'USD',
        status: 'PENDING',
      });

      const res = await paymentsService.createPayment('user-uuid-1', {
        orderId: 'order-uuid-1',
        provider: PaymentProvider.SSLCOMMERZ,
      });

      expect(res.provider).toBe(PaymentProvider.SSLCOMMERZ);
      expect(res.redirectUrl).toBeDefined();
      expect(res.redirectUrl).toContain('gwprocess');
    });
  });

  describe('Webhook & Settlement Flow', () => {
    it('should process Stripe payment_intent.succeeded webhook and mark order PAID', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-uuid-1',
        orderId: 'order-uuid-1',
        amount: new Prisma.Decimal(150.0),
        currency: 'USD',
        status: 'PENDING',
      });

      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: { orderId: 'order-uuid-1' },
          },
        },
      };

      prisma.order.update.mockResolvedValue({
        id: 'order-uuid-1',
        orderNumber: 'DOK-2026-100234',
        userId: 'user-uuid-1',
        status: 'PAID',
      });

      prisma.payment.update.mockResolvedValue({
        id: 'payment-uuid-1',
        status: 'COMPLETED',
        amount: new Prisma.Decimal(150.0),
        currency: 'USD',
      });

      const result = await paymentsService.handleStripeWebhook(webhookPayload);
      expect(result.received).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-uuid-1' },
          data: { status: 'PAID' },
        }),
      );
    });

    it('should process SSLCommerz IPN callback and complete order', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-sslc-1',
        orderId: 'order-uuid-1',
        amount: new Prisma.Decimal(150.0),
        currency: 'USD',
        status: 'PENDING',
      });

      prisma.order.update.mockResolvedValue({
        id: 'order-uuid-1',
        orderNumber: 'DOK-2026-100234',
        userId: 'user-uuid-1',
        status: 'PAID',
      });

      prisma.payment.update.mockResolvedValue({
        id: 'payment-sslc-1',
        status: 'COMPLETED',
        amount: new Prisma.Decimal(150.0),
        currency: 'USD',
      });

      const ipnPayload = {
        tran_id: 'SSLC_12345',
        status: 'VALID',
        val_id: 'val_9999',
      };

      const result = await paymentsService.handleSslCommerzWebhook(ipnPayload);
      expect(result.status).toBe('SUCCESS');
      expect(prisma.order.update).toHaveBeenCalled();
    });
  });

  describe('Seller Subscription System', () => {
    it('should return available subscription plans', async () => {
      const plans = await paymentsService.getSubscriptionPlans();
      expect(plans.length).toBeGreaterThanOrEqual(2);
      expect(plans.some((p) => p.tier === 'PRO')).toBe(true);
    });

    it('should activate FREE subscription plan immediately', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-uuid-1',
        userId: 'user-uuid-1',
        stores: [{ id: 'store-1', name: 'My Tech Store' }],
      });

      const result = await paymentsService.createSubscriptionCheckout(
        'user-uuid-1',
        {
          tier: SubscriptionTier.FREE,
        },
      );

      expect(result.planTier).toBe('FREE');
      expect(result.amount).toBe(0);
      expect(prisma.sellerSubscription.upsert).toHaveBeenCalled();
    });

    it('should return checkout session for PRO subscription plan', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-uuid-1',
        userId: 'user-uuid-1',
        stores: [{ id: 'store-1', name: 'My Tech Store' }],
      });

      const result = await paymentsService.createSubscriptionCheckout(
        'user-uuid-1',
        {
          tier: SubscriptionTier.PRO,
        },
      );

      expect(result.planTier).toBe('PRO');
      expect(result.amount).toBe(19);
      expect(result.checkoutUrl).toBeDefined();
    });
  });
});
