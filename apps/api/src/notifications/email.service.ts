import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  template:
    | 'ORDER_CONFIRMATION'
    | 'PAYMENT_RECEIPT'
    | 'SUBSCRIPTION_UPDATE'
    | 'NOTIFICATION';
  context: Record<string, unknown>;
}

export interface EmailResult {
  messageId: string;
  delivered: boolean;
  timestamp: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Dispatches a transactional email using configured provider (SES, Resend, Sendgrid) or sandbox simulation.
   */
  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    this.logger.log(
      `[EmailService] Dispatching transactional email: [to: ${payload.to}, template: ${payload.template}, subject: "${payload.subject}", messageId: ${messageId}]`,
    );

    // In production, integrate with Resend / AWS SES / SendGrid SDK
    return {
      messageId,
      delivered: true,
      timestamp,
    };
  }

  /**
   * Helper to dispatch Order Confirmation email
   */
  async sendOrderConfirmation(
    to: string,
    data: {
      orderNumber: string;
      totalAmount: number | string;
      itemsCount: number;
      trackingUrl?: string;
    },
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Order Confirmation #${data.orderNumber} - DokanOS`,
      template: 'ORDER_CONFIRMATION',
      context: data,
    });
  }

  /**
   * Helper to dispatch Payment Receipt email
   */
  async sendPaymentReceipt(
    to: string,
    data: {
      orderNumber: string;
      amount: number | string;
      currency: string;
      provider: string;
      transactionId: string;
    },
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Receipt for Payment #${data.orderNumber} - DokanOS`,
      template: 'PAYMENT_RECEIPT',
      context: data,
    });
  }

  /**
   * Helper to dispatch SaaS Subscription Update email
   */
  async sendSubscriptionUpdate(
    to: string,
    data: { planTier: string; status: string; renewalDate?: string },
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Subscription Updated to ${data.planTier} - DokanOS`,
      template: 'SUBSCRIPTION_UPDATE',
      context: data,
    });
  }
}
