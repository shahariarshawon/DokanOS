import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    example: '638cb6f2-b9fd-4587-92bf-62d14a3f5ac0',
    description: 'Product UUID',
  })
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 1, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number = 1;

  @ApiPropertyOptional({
    example: { switchType: 'Linear Red', color: 'Carbon Black' },
  })
  @IsObject()
  @IsOptional()
  selectedAttributes?: Record<string, unknown>;
}
