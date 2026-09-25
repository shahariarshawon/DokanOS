import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: 'Shahariar Arafat' })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiProperty({ example: 'House 12, Road 4, Sector 7' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Uttara, Dhaka' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: '1230' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ example: 'Bangladesh' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: '+8801700000000' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  shippingAddress!: AddressDto;

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  billingAddress?: AddressDto;

  @ApiPropertyOptional({ example: 'Please deliver after 2 PM' })
  @IsString()
  @IsOptional()
  customerNote?: string;
}
