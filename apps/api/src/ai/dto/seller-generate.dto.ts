import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SellerGenerateDto {
  @ApiPropertyOptional({ example: 'Keychron Q1 Pro Wireless Mechanical Keyboard' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ example: 'Keychron Q1 Pro Wireless Mechanical Keyboard' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Electronics & Keyboards' })
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category!: string;

  @ApiPropertyOptional({
    example: [
      'Full CNC aluminum body',
      'Hot-swappable switches',
      'Wireless Bluetooth 5.1 & Type-C wired',
      'South-facing RGB',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({
    example: [
      'Full CNC aluminum body',
      'Hot-swappable switches',
      'Wireless Bluetooth 5.1 & Type-C wired',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyFeatures?: string[];

  @ApiPropertyOptional({ example: 'PROFESSIONAL', default: 'PROFESSIONAL' })
  @IsString()
  @IsOptional()
  tone?: string;
}
