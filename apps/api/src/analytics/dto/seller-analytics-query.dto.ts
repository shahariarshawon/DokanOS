import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export enum AnalyticsTimeRange {
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  YEAR_TO_DATE = 'ytd',
  LAST_1_YEAR = '1y',
}

export class SellerAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '87b19bc0-4e20-48a1-9cb1-7a89102b41c0' })
  @IsUUID('4')
  @IsOptional()
  storeId?: string;

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
