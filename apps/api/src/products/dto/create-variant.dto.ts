import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    example: 'Black / 128GB',
    description: 'Human-readable title describing the variant attributes',
  })
  @IsString()
  @IsNotEmpty({ message: 'Variant title is required' })
  title!: string;

  @ApiProperty({
    example: 'IPH15P-BLK-128',
    description: 'Unique SKU code for this specific variant',
  })
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku!: string;

  @ApiPropertyOptional({ example: '8901234567891' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({
    example: 999.0,
    description: 'Selling price for this variant',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;

  @ApiPropertyOptional({ example: 1099.0, description: 'Compare-at price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 650.0, description: 'Internal cost price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({
    example: { color: 'Black', storage: '128GB' },
    description: 'Dynamic key-value attributes defining this variant',
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: ['https://cdn.dokanos.com/products/iphone15pro-black.webp'],
    description: 'Optional variant-specific image URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
