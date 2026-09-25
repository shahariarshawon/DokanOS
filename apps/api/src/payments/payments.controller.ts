import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { CreateSubscriptionCheckoutDto } from './dto/subscription.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@ApiTags('Payments & Subscriptions')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // -------------------------------------------------------------
  // CUSTOMER PAYMENTS
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initiate payment session (Stripe Checkout / PaymentIntent or SSLCommerz)',
  })
  @Post('create')
  @HttpCode(HttpStatus.OK)
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(userId, dto);
  }

  // -------------------------------------------------------------
  // WEBHOOKS
  // -------------------------------------------------------------

  @Public()
  @ApiOperation({
    summary:
      'Stripe asynchronous webhook notification endpoint (supports checkout, payment, subscription, refund)',
  })
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = req.body;
    return this.paymentsService.handleStripeWebhook(rawBody, signature);
  }

  @Public()
  @ApiOperation({
    summary: 'SSLCommerz asynchronous IPN notification endpoint',
  })
  @Post('webhook/sslcommerz')
  @HttpCode(HttpStatus.OK)
  async handleSslCommerzWebhook(@Body() ipnPayload: Record<string, unknown>) {
    return this.paymentsService.handleSslCommerzWebhook(ipnPayload);
  }

  // -------------------------------------------------------------
  // SELLER SUBSCRIPTIONS
  // -------------------------------------------------------------

  @Public()
  @ApiOperation({
    summary: 'Retrieve available SaaS subscription plans (FREE, PRO)',
  })
  @Get('subscriptions/plans')
  async getSubscriptionPlans() {
    return this.paymentsService.getSubscriptionPlans();
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate seller subscription checkout session or activate tier',
  })
  @Post('subscriptions/checkout')
  @HttpCode(HttpStatus.OK)
  async createSubscriptionCheckout(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.paymentsService.createSubscriptionCheckout(userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel current seller subscription at period end',
  })
  @Post('subscriptions/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.paymentsService.cancelSellerSubscription(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get seller billing overview, current tier, limits, and invoices',
  })
  @Get('subscriptions/billing')
  async getSellerBillingOverview(@CurrentUser('id') userId: string) {
    return this.paymentsService.getSellerBillingOverview(userId);
  }

  // -------------------------------------------------------------
  // ADMIN REVENUE INTELLIGENCE
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Admin platform revenue, MRR, subscriber distribution, and transaction audit log',
  })
  @Get('admin/revenue')
  async getAdminRevenueOverview() {
    return this.paymentsService.getAdminRevenueOverview();
  }
}
