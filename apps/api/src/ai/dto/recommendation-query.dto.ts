import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class RecommendationQueryDto {
  @ApiPropertyOptional({ example: 6, default: 6, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 0.35, default: 0.35, minimum: 0.05, maximum: 1.0, description: 'Price band tolerance' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1.0)
  @IsOptional()
  priceTolerance?: number;

  @ApiPropertyOptional({ example: false, default: false, description: 'Filter strictly to the same category' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  sameCategory?: boolean;
}
