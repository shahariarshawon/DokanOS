import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsTimeRange } from './seller-analytics-query.dto.js';

export enum ExportReportType {
  SALES = 'sales',
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  REVENUE = 'revenue',
}

export class ExportAnalyticsQueryDto {
  @ApiProperty({
    enum: ExportReportType,
    description: 'Type of report to export',
  })
  @IsEnum(ExportReportType)
  type!: ExportReportType;

  @ApiPropertyOptional({
    description:
      'Specific store ID to export (optional for sellers with one store or admins)',
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
