import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
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
}
