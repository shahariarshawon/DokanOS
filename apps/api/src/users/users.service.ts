import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

export type UserWithoutSecrets = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserWithoutSecrets> {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        role: createUserDto.role ?? 'CUSTOMER',
      },
    });

    return this.sanitizeUser(user);
  }

  async findById(id: string): Promise<UserWithoutSecrets> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithoutSecrets> {
    await this.findById(id);

    const data: Prisma.UserUpdateInput = {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      phone: updateUserDto.phone,
      avatarUrl: updateUserDto.avatarUrl,
    };

    if (updateUserDto.newPassword) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(updateUserDto.newPassword, salt);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.sanitizeUser(updated);
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  sanitizeUser(user: User): UserWithoutSecrets {
    const { passwordHash: _, refreshTokenHash: __, ...sanitized } = user;
    return sanitized;
  }
}
