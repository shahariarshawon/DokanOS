import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsTimeRange } from './seller-analytics-query.dto.js';

export class CustomerAnalyticsQueryDto {
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
}
