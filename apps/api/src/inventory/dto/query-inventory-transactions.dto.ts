import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class QueryInventoryTransactionsDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({ example: 'a1c5d984-2e33-4f91-8dc1-6c2e3914a112' })
  @IsUUID('4')
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: 'b2c5d984-2e33-4f91-8dc1-6c2e3914a113' })
  @IsUUID('4')
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({ enum: InventoryTransactionType })
  @IsEnum(InventoryTransactionType)
  @IsOptional()
  type?: InventoryTransactionType;
}
