import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class CreateSubscriptionCheckoutDto {
  @ApiProperty({
    enum: SubscriptionTier,
    example: SubscriptionTier.PRO,
    description: 'Target subscription tier',
  })
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier!: SubscriptionTier;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/dashboard/billing?status=success',
    description: 'Success return URL',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/dashboard/billing?status=canceled',
    description: 'Cancel return URL',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class UpdateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionTier,
    example: SubscriptionTier.PRO,
    description: 'Target plan tier for upgrade or downgrade',
  })
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier!: SubscriptionTier;
}
