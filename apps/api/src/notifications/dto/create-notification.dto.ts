import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user ID (recipient)' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.ORDER_STATUS,
    description: 'Type of notification event',
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    example: 'Order Shipped',
    description: 'Brief notification headline',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Your order #DOK-2026-89412 has been shipped via DHL.',
    description: 'Detailed notification content',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    description: 'Context payload (e.g. orderId, trackingNumber, link)',
    example: {
      orderId: '123e4567-e89b-12d3-a456-426614174000',
      url: '/orders/123',
    },
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
