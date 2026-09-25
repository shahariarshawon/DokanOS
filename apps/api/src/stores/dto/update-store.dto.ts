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

  @ApiPropertyOptional({
    example: 'https://cdn.dokanos.com/stores/gadget-hub/logo-new.webp',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.dokanos.com/stores/gadget-hub/banner-new.webp',
  })
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: 'gadget-hub-official' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Electronics & Hardware' })
  @IsString()
  @IsOptional()
  businessCategory?: string;

  @ApiPropertyOptional({ example: 'support@gadgethub.com' })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1 (555) 019-2831' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: {
      twitter: 'https://x.com/gadgethub',
      instagram: 'https://instagr.am/gadgethub',
    },
  })
  @IsOptional()
  socialLinks?: Record<string, string>;
}
