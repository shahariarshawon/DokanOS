import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNotificationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter only unread notifications' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean = false;
}
