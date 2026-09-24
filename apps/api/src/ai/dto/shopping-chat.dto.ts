import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ShoppingChatDto {
  @ApiProperty({
    example: 'I need a hot-swappable wireless keyboard for coding under $200',
    description: 'Natural language shopping query or product request',
  })
  @IsString()
  @IsNotEmpty({ message: 'Query message cannot be empty' })
  @MaxLength(1000, { message: 'Query cannot exceed 1000 characters' })
  message!: string;

  @ApiPropertyOptional({
    example: '38a19bc0-4e20-48a1-9cb1-7a89102b41c0',
    description: 'Optional conversation context UUID',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ example: 5, default: 5, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Minimum price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 250.0, description: 'Maximum price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ example: '4c94b712-32a1-4089-9cb1-7c98112e45fa' })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsOptional()
  categoryId?: string;
}
