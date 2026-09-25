import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsEventType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class TrackEventDto {
  @ApiProperty({
    enum: AnalyticsEventType,
    example: AnalyticsEventType.PRODUCT_VIEW,
    description: 'Type of analytics tracking event',
  })
  @IsEnum(AnalyticsEventType)
  @IsNotEmpty()
  eventType!: AnalyticsEventType;

  @ApiPropertyOptional({ example: '38a19bc0-4e20-48a1-9cb1-7a89102b41c0' })
  @IsUUID('4')
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: '87b19bc0-4e20-48a1-9cb1-7a89102b41c0' })
  @IsUUID('4')
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ example: 'sess_12345abcdef' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    example: {
      referrer: 'https://google.com',
      screen: 'desktop',
      price: 99.99,
    },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
