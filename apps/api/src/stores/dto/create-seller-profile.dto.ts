import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSellerProfileDto {
  @ApiProperty({ example: 'Rahman Tech Dynamics Ltd.', description: 'Legal business name' })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName!: string;

  @ApiPropertyOptional({ example: 'REG-2026-98124' })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({ example: 'TIN-8912401' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Standard Chartered Bank' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'SCBLBDDX' })
  @IsString()
  @IsOptional()
  bankRoutingNumber?: string;
}
