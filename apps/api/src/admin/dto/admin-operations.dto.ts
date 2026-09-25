import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus, StoreStatus } from '@prisma/client';

export class VerifySellerDto {
  @ApiProperty({ enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ModerateStoreDto {
  @ApiProperty({ enum: StoreStatus })
  @IsEnum(StoreStatus)
  status!: StoreStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ToggleFeatureFlagDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
