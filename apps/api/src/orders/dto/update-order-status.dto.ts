import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @IsEnum(OrderStatus, { message: 'Must provide a valid OrderStatus' })
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({
    enum: FulfillmentStatus,
    example: FulfillmentStatus.PROCESSING,
  })
  @IsEnum(FulfillmentStatus, {
    message: 'Must provide a valid FulfillmentStatus',
  })
  @IsOptional()
  fulfillmentStatus?: FulfillmentStatus;

  @ApiPropertyOptional({ example: 'TRK-9812401' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'DHL Express' })
  @IsString()
  @IsOptional()
  carrier?: string;
}
