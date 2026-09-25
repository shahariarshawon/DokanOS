import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

export interface PaymentIntentResponse {
  paymentId: string;
  orderId: string;
  provider: PaymentProvider;
  amount: Prisma.Decimal;
  currency: string;
  clientSecret?: string;
  redirectUrl?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
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

    if (dto.provider === 'STRIPE') {
      return this.initiateStripePayment(order);
    } else if (dto.provider === 'SSLCOMMERZ') {
      return this.initiateSslCommerzPayment(order);
    }

    throw new BadRequestException(
      `Unsupported payment provider '${String(dto.provider)}'`,
    );
  }

  private async initiateStripePayment(order: {
    id: string;
    totalAmount: Prisma.Decimal;
    currency: string;
  }): Promise<PaymentIntentResponse> {
    let clientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(2, 9)}`;
    let transactionId = `pi_mock_${Date.now()}`;

    if (this.stripe) {
      const amountInCents = Math.round(Number(order.totalAmount) * 100);
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: order.currency.toLowerCase(),
        metadata: {
          orderId: order.id,
        },
      });
      clientSecret = paymentIntent.client_secret || clientSecret;
      transactionId = paymentIntent.id;
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

    return {
      paymentId: payment.id,
      orderId: order.id,
      provider: 'STRIPE',
      amount: order.totalAmount,
      currency: order.currency,
      clientSecret,
    };
  }

  private async initiateSslCommerzPayment(order: {
    id: string;
    totalAmount: Prisma.Decimal;
    currency: string;
  }): Promise<PaymentIntentResponse> {
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

    const isLive =
      this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';
    const baseUrl = isLive
      ? 'https://securepay.sslcommerz.com/gwprocess/v4/gw.php'
      : 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php';

    const redirectUrl = `${baseUrl}?Q=${transactionId}&amount=${order.totalAmount.toString()}`;

    return {
      paymentId: payment.id,
      orderId: order.id,
      provider: 'SSLCOMMERZ',
      amount: order.totalAmount,
      currency: order.currency,
      redirectUrl,
    };
  }

  async handleStripeWebhook(
    payload: Buffer | string,
    signature?: string,
  ): Promise<{ received: boolean }> {
    let event:
      | Stripe.Event
      | {
          type: string;
          data: { object: { id: string; metadata?: { orderId?: string } } };
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
      // In development / testing mode, parse if string/buffer or use directly if object
      const body =
        typeof payload === 'string'
          ? JSON.parse(payload)
          : Buffer.isBuffer(payload)
            ? JSON.parse(payload.toString('utf-8'))
            : payload;
      event = body;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      const transactionId = paymentIntent.id;

      this.logger.log(
        `Stripe payment succeeded for Transaction: ${transactionId}, Order: ${orderId}`,
      );
      await this.settlePayment('STRIPE', transactionId, orderId, paymentIntent);
    }

    return { received: true };
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

    // Mark as failed if rejected
    const payment = await this.prisma.payment.findUnique({
      where: {
        provider_transactionId: {
          provider: 'SSLCOMMERZ',
          transactionId: tranId,
        },
      },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          rawGatewayResponse: ipnPayload as Prisma.InputJsonValue,
        },
      });
    }

    return { status: 'FAILED' };
  }

  private async settlePayment(
    provider: PaymentProvider,
    transactionId: string,
    orderId?: string,
    rawResponse?: unknown,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Find matching payment record
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
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          rawGatewayResponse: (rawResponse ?? {}) as Prisma.InputJsonValue,
        },
      });

      // 2. Transition Order to PAID
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      this.logger.log(
        `Order '${payment.orderId}' successfully settled to PAID`,
      );
    });
  }
}
