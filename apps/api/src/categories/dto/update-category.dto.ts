import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Mechanical Keyboards' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'mechanical-keyboards' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be URL-safe (lowercase letters, numbers, and hyphens only)',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Updated category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.dokanos.com/icons/keyboard-v2.svg',
  })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ example: 'b91a82bc-41c0-4e20-48a1-9cb138a19bc0' })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
