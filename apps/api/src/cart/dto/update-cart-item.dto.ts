import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'Updated item quantity (0 removes item)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity!: number;
}
