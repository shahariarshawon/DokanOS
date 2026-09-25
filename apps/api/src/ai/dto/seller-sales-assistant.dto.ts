import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SellerSalesAssistantDto {
  @ApiProperty({
    example: 'Why are my sales dropping this month?',
    description:
      'Analytical question from the seller concerning sales, conversion, or inventory',
  })
  @IsString()
  @IsNotEmpty({ message: 'Question cannot be empty' })
  @MaxLength(1000)
  question!: string;

  @ApiPropertyOptional({
    example: 'store-uuid-1',
    description: 'Target store ID (optional if seller has one store)',
  })
  @IsUUID('4')
  @IsOptional()
  storeId?: string;
}
