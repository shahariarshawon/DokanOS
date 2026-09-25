import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'e148a092-7489-4bc2-a1b9-389104bc1230',
    description: 'Pending Order UUID',
  })
  @IsUUID('4', { message: 'orderId must be a valid UUID' })
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  @IsEnum(PaymentProvider, { message: 'provider must be STRIPE or SSLCOMMERZ' })
  @IsNotEmpty()
  provider!: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Optional client idempotency key to prevent double charging',
    example: 'idem_94883920_ab93',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Success redirect URL for browser redirect flows',
    example: 'http://localhost:3000/orders/confirmation',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel redirect URL for browser redirect flows',
    example: 'http://localhost:3000/checkout',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
