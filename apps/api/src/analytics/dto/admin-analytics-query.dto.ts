import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AnalyticsTimeRange } from './seller-analytics-query.dto.js';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsTimeRange,
    default: AnalyticsTimeRange.LAST_30_DAYS,
    example: AnalyticsTimeRange.LAST_30_DAYS,
  })
  @IsEnum(AnalyticsTimeRange)
  @IsOptional()
  range?: AnalyticsTimeRange = AnalyticsTimeRange.LAST_30_DAYS;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-25' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  refresh?: boolean = false;
}
