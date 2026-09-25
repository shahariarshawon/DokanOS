import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PersonalizedRecommendationQueryDto {
  @ApiPropertyOptional({ example: 8, default: 8, minimum: 1, maximum: 24 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24)
  @IsOptional()
  limit?: number = 8;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to incorporate historical browsing and order data',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeHistory?: boolean = true;
}
