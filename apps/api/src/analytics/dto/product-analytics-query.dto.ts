import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsTimeRange } from './seller-analytics-query.dto.js';

export class ProductAnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'Specific store ID to query (optional if seller has only one store)',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    enum: AnalyticsTimeRange,
    default: AnalyticsTimeRange.LAST_30_DAYS,
    description: 'Reporting time window',
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeRange)
  timeRange?: AnalyticsTimeRange = AnalyticsTimeRange.LAST_30_DAYS;

  @ApiPropertyOptional({
    description: 'Sort by revenue, orders, views, or conversion',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'revenue' | 'orders' | 'views' | 'conversion' = 'revenue';
}
