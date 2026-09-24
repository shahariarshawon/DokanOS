import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class ProductImageDto {
  @ApiProperty({ example: 'https://cdn.dokanos.com/products/keyboard-hero.webp' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ example: 'Keychron Q1 Pro Mechanical Keyboard' })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'a1c5d984-2e33-4f91-8dc1-6c2e3914a112', description: 'Store ID listing this SKU' })
  @IsUUID('4', { message: 'storeId must be a valid UUID' })
  @IsNotEmpty()
  storeId!: string;

  @ApiProperty({ example: '4c94b712-32a1-4089-9cb1-7c98112e45fa', description: 'Category ID' })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 'Keychron Q1 Pro Wireless Mechanical Keyboard' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @ApiPropertyOptional({ example: 'keychron-q1-pro-wireless-keyboard', description: 'URL slug (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Full aluminum 75% mechanical keyboard with wireless Bluetooth 5.1.' })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description!: string;

  @ApiPropertyOptional({ example: 'KEY-Q1P-BLK' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 199.99, description: 'Selling price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;

  @ApiPropertyOptional({ example: 219.99, description: 'MSRP / Compare price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 120.00, description: 'Cost price (private to seller)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 25, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Stock quantity cannot be negative' })
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({
    example: { switchType: 'Linear Red', connectivity: 'Wireless' },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];
}
