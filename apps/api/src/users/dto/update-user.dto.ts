import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsOptional()
  newPassword?: string;
}
