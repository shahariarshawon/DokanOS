import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum OptimizationTone {
  COMMERCIAL = 'commercial',
  LUXURY = 'luxury',
  TECHNICAL = 'technical',
  CASUAL = 'casual',
}

export class ProductOptimizeDto {
  @ApiPropertyOptional({
    enum: OptimizationTone,
    default: OptimizationTone.COMMERCIAL,
    description: 'Tone of voice for optimized copywriting',
  })
  @IsEnum(OptimizationTone)
  @IsOptional()
  tone?: OptimizationTone = OptimizationTone.COMMERCIAL;

  @ApiPropertyOptional({
    example: ['ergonomic', 'bluetooth 5.3', 'mechanical'],
    description: 'Target keywords to weave into optimization',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetKeywords?: string[];
}
