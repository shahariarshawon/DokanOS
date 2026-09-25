import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService, UserWithoutSecrets } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserWithoutSecrets> {
    return this.usersService.findById(userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserWithoutSecrets> {
    return this.usersService.update(userId, updateUserDto);
  }
}
