import {
  Body,
  Controller,
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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment session (Stripe PaymentIntent or SSLCommerz)' })
  @Post('create')
  @HttpCode(HttpStatus.OK)
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(userId, dto);
  }

  @Public()
  @ApiOperation({ summary: 'Stripe asynchronous webhook notification endpoint' })
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
  @ApiOperation({ summary: 'SSLCommerz asynchronous IPN notification endpoint' })
  @Post('webhook/sslcommerz')
  @HttpCode(HttpStatus.OK)
  async handleSslCommerzWebhook(@Body() ipnPayload: Record<string, unknown>) {
    return this.paymentsService.handleSslCommerzWebhook(ipnPayload);
  }
}
