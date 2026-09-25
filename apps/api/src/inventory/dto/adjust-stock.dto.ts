import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  NotEquals,
} from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class AdjustStockDto {
  @ApiProperty({
    example: 'a1c5d984-2e33-4f91-8dc1-6c2e3914a112',
    description: 'Product ID',
  })
  @IsUUID('4')
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({
    example: 'b2c5d984-2e33-4f91-8dc1-6c2e3914a113',
    description: 'Variant ID (if applicable)',
  })
  @IsUUID('4')
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    enum: InventoryTransactionType,
    example: InventoryTransactionType.RESTOCK,
    description:
      'Adjustment transaction type (RESTOCK, ADJUSTMENT, DAMAGE, ORDER_RETURN)',
  })
  @IsEnum(InventoryTransactionType)
  @IsNotEmpty()
  type!: InventoryTransactionType;

  @ApiProperty({
    example: 100,
    description:
      'Stock quantity adjustment delta (positive for add, negative for deduction)',
  })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'Quantity change cannot be zero' })
  quantity!: number;

  @ApiPropertyOptional({
    example: 'PO-2026-904',
    description: 'Reference ID (PO number, order ID, etc.)',
  })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({
    example: 'Received summer inventory replenishment',
    description: 'Reason note',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
