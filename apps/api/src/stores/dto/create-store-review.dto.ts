import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStoreReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Outstanding seller experience!' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example:
      'Fast delivery, responsive customer support, and original packaging.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Review comment cannot be empty' })
  comment!: string;
}
