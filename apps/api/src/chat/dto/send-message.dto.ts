import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    example: 'Hello! Yes, we have this item in stock ready to ship today.',
    description: 'Message content text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @ApiPropertyOptional({
    description:
      'Array of uploaded attachment objects (e.g. images, invoices, receipts)',
    example: [
      {
        url: 'https://cdn.dokanos.com/images/receipt.jpg',
        fileName: 'receipt.jpg',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    url: string;
    fileName?: string;
    fileType?: string;
    size?: number;
  }>;
}
