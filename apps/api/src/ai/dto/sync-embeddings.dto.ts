import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SyncEmbeddingsDto {
  @ApiPropertyOptional({ example: false, default: false, description: 'Re-index already embedded products' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  forceReindex?: boolean;

  @ApiPropertyOptional({ example: 100, default: 50, minimum: 1, maximum: 1000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}
