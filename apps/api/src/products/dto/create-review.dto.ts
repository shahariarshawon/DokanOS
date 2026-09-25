import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Star rating from 1 to 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Outstanding quality and battery life' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example:
      'Arrived quickly, packaged securely, and performs even better than expected.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Review comment cannot be empty' })
  comment!: string;
}
