import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyOptimizationDto {
  @ApiPropertyOptional({
    example:
      'Ergonomic Wireless Mechanical Keyboard (RGB Backlit, Hot-Swappable)',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example:
      '## Overview\nHigh-performance mechanical keyboard engineered for professional coders...',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['wireless keyboard', 'mechanical switches', 'rgb backlight'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  seoKeywords?: string[];

  @ApiPropertyOptional({
    example: ['Keyboards', 'Accessories', 'Tech'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
