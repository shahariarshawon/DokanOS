import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStoreThemeDto {
  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#111827' })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({
    example: 'MODERN',
    description: 'MODERN | MINIMAL | BOLD | ELEGANT',
  })
  @IsString()
  @IsOptional()
  layoutType?: string;

  @ApiPropertyOptional({
    example: 'INTER',
    description: 'INTER | ROBOTO | OUTFIT | PLAYFAIR',
  })
  @IsString()
  @IsOptional()
  fontStyle?: string;

  @ApiPropertyOptional({
    example: '.custom-header { border-bottom: 2px solid primary; }',
  })
  @IsString()
  @IsOptional()
  customCss?: string;
}
