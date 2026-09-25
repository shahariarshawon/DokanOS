import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum AutomationTaskType {
  ALL = 'all',
  DAILY_REPORT = 'daily_report',
  PRODUCT_ANALYSIS = 'product_analysis',
  RECOMMENDATIONS = 'recommendations',
  INVENTORY_ALERTS = 'inventory_alerts',
}

export class AiAutomationDto {
  @ApiPropertyOptional({
    enum: AutomationTaskType,
    default: AutomationTaskType.ALL,
    description: 'Specific automation pipeline task to execute',
  })
  @IsEnum(AutomationTaskType)
  @IsOptional()
  task?: AutomationTaskType = AutomationTaskType.ALL;

  @ApiPropertyOptional({
    example: 'store-uuid-1',
    description: 'Target store ID (optional, applies to all if admin)',
  })
  @IsUUID('4')
  @IsOptional()
  storeId?: string;
}
