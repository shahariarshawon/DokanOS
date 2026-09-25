import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class NaturalSearchDto {
  @ApiProperty({
    example: 'I need affordable shoes for running under $100',
    description: 'Conversational or natural language shopper search query',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search query cannot be empty' })
  query!: string;

  @ApiPropertyOptional({ example: 8, default: 8, minimum: 1, maximum: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  limit?: number = 8;
}
