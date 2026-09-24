import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Keyboards', description: 'Category name' })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'keyboards', description: 'URL slug' })
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be URL-safe (lowercase letters, numbers, and hyphens only)',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'Mechanical, wireless, and ergonomic keyboards.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.dokanos.com/icons/keyboard.svg' })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ example: 'b91a82bc-41c0-4e20-48a1-9cb138a19bc0', description: 'Parent category UUID if subcategory' })
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string;
}
