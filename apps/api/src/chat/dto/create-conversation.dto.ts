import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Store ID the customer wants to chat with',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  storeId!: string;

  @ApiPropertyOptional({
    description: 'Optional Order ID if the inquiry is regarding a specific purchase',
    example: 'b1ffcd88-8b1a-4de7-aa5c-5aa8ac270b22',
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Optional first message to automatically send upon thread creation',
    example: 'Hello! Is this item available in size L?',
  })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}
