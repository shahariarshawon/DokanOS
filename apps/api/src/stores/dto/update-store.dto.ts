import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: 'Gadget Hub Pro' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description of our tech products' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.dokanos.com/stores/gadget-hub/logo-new.webp' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.dokanos.com/stores/gadget-hub/banner-new.webp' })
  @IsString()
  @IsOptional()
  bannerUrl?: string;
}
