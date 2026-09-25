import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeImageDto {
  @ApiProperty({
    description: 'Image public URL or base64 data string',
    example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;
}
