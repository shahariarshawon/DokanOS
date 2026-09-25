import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class FraudAssessmentDto {
  @ApiProperty({
    example: '38a19bc0-4e20-48a1-9cb1-7a89102b41c0',
    description: 'Order ID to evaluate for fraud risk',
  })
  @IsUUID('4')
  @IsNotEmpty()
  orderId!: string;
}
