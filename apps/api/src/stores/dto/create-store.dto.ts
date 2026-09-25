import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({ example: 'Gadget Hub', description: 'Public storefront name' })
  @IsString()
  @IsNotEmpty({ message: 'Store name is required' })
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'gadget-hub', description: 'Unique URL slug' })
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be URL-safe (lowercase letters, numbers, and hyphens only)',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'Premium keyboards and computing gear.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.dokanos.com/stores/gadget-hub/logo.webp',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.dokanos.com/stores/gadget-hub/banner.webp',
  })
  @IsString()
  @IsOptional()
  bannerUrl?: string;
}
