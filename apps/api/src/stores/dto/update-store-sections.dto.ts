import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StoreSectionItemDto {
  @ApiProperty({ example: 'HERO_BANNER' })
  @IsString()
  sectionType!: string;

  @ApiProperty({ example: 'Premium Tech Catalog' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Handcrafted peripherals directly from authorized vendors.',
  })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ example: { ctaText: 'Shop Collection', ctaUrl: '/products' } })
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}

export class UpdateStoreSectionsDto {
  @ApiProperty({ type: [StoreSectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreSectionItemDto)
  sections!: StoreSectionItemDto[];
}
