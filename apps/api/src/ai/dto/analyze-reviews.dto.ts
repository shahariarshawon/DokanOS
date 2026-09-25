import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ReviewItemDto {
  @ApiProperty({ description: 'Review star rating (1 to 5)', example: 5 })
  rating!: number;

  @ApiProperty({
    description: 'Review comment content',
    example: 'Fast shipping, exceptional sound quality!',
  })
  comment!: string;
}

export class AnalyzeReviewsDto {
  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Optional manual reviews list to analyze',
    type: [ReviewItemDto],
  })
  @IsOptional()
  @IsArray()
  reviews?: ReviewItemDto[];
}
