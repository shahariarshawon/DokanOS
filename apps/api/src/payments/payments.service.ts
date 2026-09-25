import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import {
  CreateSubscriptionCheckoutDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto.js';
import { AuditService } from '../common/audit/audit.service.js';

export interface PaymentIntentResponse {
  paymentId: string;
  orderId: string;
  provider: PaymentProvider;
  amount: Prisma.Decimal;
  currency: string;
  clientSecret?: string;
  redirectUrl?: string;
  transactionId: string;
  idempotencyKey?: string;
}

export interface SubscriptionCheckoutResponse {
  sessionId?: string;
  checkoutUrl: string;
  planTier: SubscriptionTier;
  amount: number;
}

export interface SellerBillingOverview {
  sellerId: string;
  storeName: string;
  currentPlan: {
    id: string;
    name: string;
    tier: SubscriptionTier;
    price: number;
    currency: string;
    features: string[];
    limits: Record<string, unknown>;
  };
  subscriptionStatus: SubscriptionStatus;
  startDate: Date;
  endDate?: Date | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    productCount: number;
    maxProducts: number;
    aiTokensUsed: number;
    totalOrders: number;
  };
  invoices: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: Date | null;
    invoiceUrl?: string;
  }>;
}

export interface AdminRevenueOverview {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptionsCount: number;
  totalSubscribers: number;
  tierBreakdown: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    provider: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly auditService?: AuditService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (
      stripeKey &&
      !stripeKey.includes('dummy') &&
      !stripeKey.includes('mock')
    ) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-02-24.acacia' as never,
      });
    }
  }

  // -------------------------------------------------------------
  // CUSTOMER PAYMENTS FLOW
  // -------------------------------------------------------------

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${dto.orderId}' not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to pay for this order',
      );
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Order cannot be paid because status is '${order.status}'`,
      );
    }

    // Idempotency check: if an idempotency key was supplied, check for existing transaction
    if (dto.idempotencyKey) {
      const existingTx = await this.prisma.paymentTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingTx && existingTx.status === 'COMPLETED') {
        const payment = await this.prisma.payment.findFirst({
          where: { orderId: order.id },
        });
        return {
          paymentId: payment?.id || existingTx.id,
          orderId: order.id,
          provider: existingTx.provider,
          amount: existingTx.amount,
          currency: existingTx.currency,
          transactionId: existingTx.transactionId,
          idempotencyKey: dto.idempotencyKey,
        };
      }
    }

    if (dto.provider === 'STRIPE') {
      return this.initiateStripePayment(order, dto);
    } else if (dto.provider === 'SSLCOMMERZ') {
      return this.initiateSslCommerzPayment(order, dto);
    }

    throw new BadRequestException(
      `Unsupported payment provider '${String(dto.provider)}'`,
    );
  }

  private async initiateStripePayment(
    order: {
      id: string;
      orderNumber: string;
      totalAmount: Prisma.Decimal;
      currency: string;
      userId: string;
    },
    dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponse> {
    let clientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(2, 9)}`;
    let transactionId = `pi_mock_${Date.now()}`;
    let redirectUrl: string | undefined = undefined;

    if (this.stripe) {
      const amountInCents = Math.round(Number(order.totalAmount) * 100);
      try {
        // Create Stripe Checkout Session if redirect URLs are provided or create PaymentIntent
        if (dto.successUrl) {
          const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: order.currency.toLowerCase(),
                  product_data: {
                    name: `DokanOS Order #${order.orderNumber}`,
                  },
                  unit_amount: amountInCents,
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: `${dto.successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
            cancel_url: dto.cancelUrl || `${dto.successUrl}?status=canceled`,
            metadata: {
              orderId: order.id,
              userId: order.userId,
            },
          });
          transactionId = session.id;
          redirectUrl = session.url || undefined;
        } else {
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: amountInCents,
            currency: order.currency.toLowerCase(),
            metadata: {
              orderId: order.id,
              userId: order.userId,
            },
          });
          clientSecret = paymentIntent.client_secret || clientSecret;
          transactionId = paymentIntent.id;
        }
      } catch (err: unknown) {
        this.logger.warn(`Stripe live call failed: ${(err as Error).message}`);
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'STRIPE',
        transactionId,
        paymentMethod: 'card',
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
      },
    });

    // Audit log transaction with idempotency
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        orderId: order.id,
        userId: order.userId,
        provider: 'STRIPE',
        transactionId,
        idempotencyKey: dto.idempotencyKey,
        type: 'PAYMENT',
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
        metadata: {
          clientSecret,
          redirectUrl,
        },
      },
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      provider: 'STRIPE',
      amount: order.totalAmount,
      currency: order.currency,
      clientSecret,
      redirectUrl,
      transactionId,
      idempotencyKey: dto.idempotencyKey,
    };
  }

  private async initiateSslCommerzPayment(
    order: {
      id: string;
      orderNumber: string;
      totalAmount: Prisma.Decimal;
      currency: string;
      userId: string;
    },
    dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponse> {
    const transactionId = `SSLC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'SSLCOMMERZ',
        transactionId,
        paymentMethod: 'mfs_card',
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
      },
    });

    // Audit log in payment_transactions
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        orderId: order.id,
        userId: order.userId,
        provider: 'SSLCOMMERZ',
        transactionId,
        idempotencyKey: dto.idempotencyKey,
        type: 'PAYMENT',
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
      },
    });

    const isLive =
      this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';
    const baseUrl = isLive
      ? 'https://securepay.sslcommerz.com/gwprocess/v4/gw.php'
      : 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php';

    const redirectUrl = `${baseUrl}?Q=${transactionId}&amount=${order.totalAmount.toString()}&order_id=${order.id}`;

    return {
      paymentId: payment.id,
      orderId: order.id,
      provider: 'SSLCOMMERZ',
      amount: order.totalAmount,
      currency: order.currency,
      redirectUrl,
      transactionId,
      idempotencyKey: dto.idempotencyKey,
    };
  }

  // -------------------------------------------------------------
  // WEBHOOK & NOTIFICATION HANDLERS
  // -------------------------------------------------------------

  async handleStripeWebhook(
    payload: Buffer | string,
    signature?: string,
  ): Promise<{ received: boolean; event?: string }> {
    let event:
      | Stripe.Event
      | {
          type: string;
          data: {
            object: {
              id: string;
              metadata?: {
                orderId?: string;
                sellerId?: string;
                planTier?: string;
              };
              subscription?: string;
              customer?: string;
            };
          };
        };

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (this.stripe && webhookSecret && signature) {
      try {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret,
        );
      } catch (err: unknown) {
        this.logger.error(
          `Webhook signature verification failed: ${(err as Error).message}`,
        );
        throw new BadRequestException('Webhook signature verification failed');
      }
    } else {
      const body =
        typeof payload === 'string'
          ? JSON.parse(payload)
          : Buffer.isBuffer(payload)
            ? JSON.parse(payload.toString('utf-8'))
            : payload;
      event = body;
    }

    this.logger.log(`Handling Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const sellerId = session.metadata?.sellerId;
        const planTier = session.metadata?.planTier as SubscriptionTier;

        if (orderId) {
          await this.settlePayment('STRIPE', session.id, orderId, session);
        } else if (sellerId && planTier) {
          await this.activateSellerSubscription(
            sellerId,
            planTier,
            session.subscription as string,
            session.customer as string,
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        const transactionId = paymentIntent.id;
        await this.settlePayment(
          'STRIPE',
          transactionId,
          orderId,
          paymentIntent,
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        await this.handlePaymentFailure(
          'STRIPE',
          paymentIntent.id,
          orderId,
          paymentIntent,
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionExpired(sub.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await this.handlePaymentRefund(charge.id, charge);
        break;
      }
    }

    return { received: true, event: event.type };
  }

  async handleSslCommerzWebhook(
    ipnPayload: Record<string, unknown>,
  ): Promise<{ status: string }> {
    const rawTranId = ipnPayload.tran_id ?? ipnPayload.transactionId ?? '';
    const tranId =
      typeof rawTranId === 'string' ? rawTranId : JSON.stringify(rawTranId);
    const rawStatus = ipnPayload.status ?? '';
    const status = (
      typeof rawStatus === 'string' ? rawStatus : JSON.stringify(rawStatus)
    ).toUpperCase();

    this.logger.log(
      `SSLCommerz IPN received for Transaction: ${tranId}, Status: ${status}`,
    );

    if (status === 'VALID' || status === 'VALIDATED' || status === 'SUCCESS') {
      await this.settlePayment('SSLCOMMERZ', tranId, undefined, ipnPayload);
      return { status: 'SUCCESS' };
    }

    await this.handlePaymentFailure(
      'SSLCOMMERZ',
      tranId,
      undefined,
      ipnPayload,
    );
    return { status: 'FAILED' };
  }

  // -------------------------------------------------------------
  // SETTLEMENT & LIFECYCLE MANAGEMENT
  // -------------------------------------------------------------

  private async settlePayment(
    provider: PaymentProvider,
    transactionId: string,
    orderId?: string,
    rawResponse?: unknown,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      let payment = await tx.payment.findUnique({
        where: {
          provider_transactionId: {
            provider,
            transactionId,
          },
        },
      });

      if (!payment && orderId) {
        payment = await tx.payment.findFirst({
          where: { orderId, provider },
        });
      }

      if (!payment) {
        this.logger.warn(
          `No pending payment found for Transaction '${transactionId}'`,
        );
        return;
      }

      if (payment.status === 'COMPLETED') {
        this.logger.log(
          `Payment '${payment.id}' was already completed. Skipping.`,
        );
        return;
      }

      // 1. Update Payment status to COMPLETED
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          rawGatewayResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

      // 2. Transition Order to PAID
      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      // 3. Update or insert PaymentTransaction record
      await tx.paymentTransaction.updateMany({
        where: { transactionId },
        data: {
          status: 'COMPLETED',
          rawResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Order '${payment.orderId}' successfully settled to PAID via ${provider}`,
      );

      if (this.auditService) {
        await this.auditService.log({
          userId: updatedOrder.userId,
          action: 'PAYMENT_PROCESSED',
          resource: 'Order',
          resourceId: updatedOrder.id,
          details: {
            provider,
            transactionId,
            amount: Number(updatedPayment.amount),
          },
        });
      }

      // Dispatch Payment Success Notification
      if (this.notificationsService) {
        try {
          await this.notificationsService.dispatchPaymentCompleted(
            updatedOrder.userId,
            {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              amount: updatedPayment.amount.toString(),
              currency: updatedPayment.currency,
              provider: provider,
            },
          );
        } catch (err: unknown) {
          this.logger.warn(
            `Failed to dispatch payment notification: ${(err as Error).message}`,
          );
        }
      }
    });
  }

  private async handlePaymentFailure(
    provider: PaymentProvider,
    transactionId: string,
    orderId?: string,
    rawResponse?: unknown,
  ): Promise<void> {
    let payment = await this.prisma.payment.findUnique({
      where: {
        provider_transactionId: {
          provider,
          transactionId,
        },
      },
    });

    if (!payment && orderId) {
      payment = await this.prisma.payment.findFirst({
        where: { orderId, provider },
      });
    }

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          rawGatewayResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

      await this.prisma.paymentTransaction.updateMany({
        where: { transactionId },
        data: {
          status: 'FAILED',
          rawResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async handlePaymentRefund(
    transactionId: string,
    rawResponse?: unknown,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          rawGatewayResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'REFUNDED' },
      });
    }
  }

  // -------------------------------------------------------------
  // SELLER SUBSCRIPTION SYSTEM (PART 5, 6, 7, 8)
  // -------------------------------------------------------------

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    let plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    // Seed default FREE and PRO plans if none exist in the database
    if (plans.length === 0) {
      await this.seedDefaultPlans();
      plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    return plans;
  }

  private async seedDefaultPlans(): Promise<void> {
    await this.prisma.subscriptionPlan.upsert({
      where: { name: 'FREE' },
      update: {},
      create: {
        name: 'FREE',
        tier: 'FREE',
        price: new Prisma.Decimal(0.0),
        currency: 'USD',
        interval: 'month',
        features: [
          'Basic store themes',
          'Basic analytics',
          'Standard checkout',
        ],
        limits: {
          maxProducts: 20,
          aiCopilotEnabled: false,
          advancedAnalytics: false,
        },
      },
    });

    await this.prisma.subscriptionPlan.upsert({
      where: { name: 'PRO' },
      update: {},
      create: {
        name: 'PRO',
        tier: 'PRO',
        price: new Prisma.Decimal(19.0),
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited products',
          'AI Copilot & Product Vision Analyzer',
          'AI Shopping Assistant RAG integration',
          'Advanced analytics & revenue metrics',
          'Custom store themes & builder sections',
          'Priority vendor support',
        ],
        limits: {
          maxProducts: 999999,
          aiCopilotEnabled: true,
          advancedAnalytics: true,
        },
      },
    });
  }

  async createSubscriptionCheckout(
    userId: string,
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<SubscriptionCheckoutResponse> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        stores: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!seller) {
      throw new ForbiddenException(
        'Only registered sellers can create subscriptions',
      );
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: dto.tier, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan '${dto.tier}' not found`);
    }

    // Free plan activates immediately
    if (plan.tier === 'FREE') {
      await this.activateSellerSubscription(seller.id, 'FREE');
      return {
        checkoutUrl:
          dto.successUrl || '/dashboard/billing?status=activated&tier=FREE',
        planTier: 'FREE',
        amount: 0,
      };
    }

    let checkoutUrl =
      dto.successUrl || '/dashboard/billing?status=mock_success&tier=PRO';
    let sessionId = `cs_mock_${Date.now()}`;

    // Stripe checkout session integration
    if (this.stripe) {
      try {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: plan.currency.toLowerCase(),
                product_data: {
                  name: `DokanOS ${plan.name} Seller Subscription`,
                  description:
                    'Unlimited products, AI Copilot, and Custom Storefront Builder',
                },
                unit_amount: Math.round(Number(plan.price) * 100),
                recurring: {
                  interval:
                    plan.interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            sellerId: seller.id,
            planTier: plan.tier,
            userId,
          },
          success_url:
            dto.successUrl ||
            'http://localhost:3000/dashboard/billing?status=success&tier=PRO',
          cancel_url:
            dto.cancelUrl ||
            'http://localhost:3000/dashboard/billing?status=canceled',
        });
        sessionId = session.id;
        checkoutUrl = session.url || checkoutUrl;
      } catch (err: unknown) {
        this.logger.warn(
          `Stripe subscription session failed: ${(err as Error).message}`,
        );
      }
    }

    return {
      sessionId,
      checkoutUrl,
      planTier: plan.tier,
      amount: Number(plan.price),
    };
  }

  async activateSellerSubscription(
    sellerId: string,
    tier: SubscriptionTier,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string,
  ): Promise<void> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier, isActive: true },
    });

    if (!plan) return;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30-day billing cycle

    await this.prisma.sellerSubscription.upsert({
      where: { sellerId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate: tier === 'FREE' ? null : endDate,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        stripeCustomerId: stripeCustomerId || undefined,
      },
      create: {
        sellerId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate: tier === 'FREE' ? null : endDate,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId,
        stripeCustomerId,
      },
    });

    this.logger.log(
      `Seller '${sellerId}' successfully subscribed to '${tier}'`,
    );
  }

  async cancelSellerSubscription(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { subscription: true },
    });

    if (!seller || !seller.subscription) {
      throw new NotFoundException('Active seller subscription not found');
    }

    await this.prisma.sellerSubscription.update({
      where: { id: seller.subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return {
      success: true,
      message:
        'Subscription will be canceled at the end of the current billing cycle.',
    };
  }

  private async handleSubscriptionExpired(
    stripeSubscriptionId: string,
  ): Promise<void> {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (sub) {
      const freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { tier: 'FREE' },
      });
      if (freePlan) {
        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: {
            planId: freePlan.id,
            status: 'EXPIRED',
          },
        });
      }
    }
  }

  // -------------------------------------------------------------
  // BILLING DASHBOARD & REVENUE ANALYTICS (PART 9)
  // -------------------------------------------------------------

  async getSellerBillingOverview(
    userId: string,
  ): Promise<SellerBillingOverview> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        stores: {
          include: {
            products: true,
            orderItems: true,
          },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    let plan = seller.subscription?.plan;
    if (!plan) {
      const plans = await this.getSubscriptionPlans();
      plan = plans.find((p) => p.tier === 'FREE') || plans[0];
    }

    const productCount = seller.stores.reduce(
      (acc, s) => acc + s.products.length,
      0,
    );
    const totalOrders = seller.stores.reduce(
      (acc, s) => acc + s.orderItems.length,
      0,
    );

    // AI Token usage for user
    const aiUsageAgg = await this.prisma.aIUsage.aggregate({
      where: { userId },
      _sum: { tokensUsed: true },
    });

    const limits = (plan.limits as Record<string, unknown>) || {};
    const maxProducts =
      typeof limits.maxProducts === 'number' ? limits.maxProducts : 20;

    return {
      sellerId: seller.id,
      storeName: seller.businessName || seller.stores[0]?.name || 'My Store',
      currentPlan: {
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
        price: Number(plan.price),
        currency: plan.currency,
        features: (plan.features as string[]) || [],
        limits,
      },
      subscriptionStatus: seller.subscription?.status || 'ACTIVE',
      startDate: seller.subscription?.startDate || new Date(),
      endDate: seller.subscription?.endDate || null,
      cancelAtPeriodEnd: seller.subscription?.cancelAtPeriodEnd || false,
      usage: {
        productCount,
        maxProducts,
        aiTokensUsed: aiUsageAgg._sum.tokensUsed || 0,
        totalOrders,
      },
      invoices: [
        {
          id: `inv-${seller.id.slice(0, 8)}-curr`,
          description: `DokanOS ${plan.name} Monthly Subscription`,
          amount: Number(plan.price),
          currency: plan.currency,
          status: 'PAID',
          paidAt: seller.subscription?.startDate || new Date(),
          invoiceUrl: '#',
        },
      ],
    };
  }

  async getAdminRevenueOverview(): Promise<AdminRevenueOverview> {
    const [payments, subscriptions, recentTransactions] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.sellerSubscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      this.prisma.paymentTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const monthlyRecurringRevenue = subscriptions.reduce(
      (acc, s) => acc + Number(s.plan.price),
      0,
    );

    const tierBreakdown: Record<string, number> = {
      FREE: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    for (const sub of subscriptions) {
      const tier = sub.plan.tier;
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
    }

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      monthlyRecurringRevenue: parseFloat(monthlyRecurringRevenue.toFixed(2)),
      activeSubscriptionsCount: subscriptions.length,
      totalSubscribers: subscriptions.length,
      tierBreakdown,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        provider: tx.provider,
        amount: Number(tx.amount),
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    };
  }
}
