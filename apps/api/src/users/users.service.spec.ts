import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersService } from './users.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('UsersService (Backend Testing)', () => {
  let usersService: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'user1@dokanos.com',
    passwordHash: '$2a$10$hashedstring',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+1234567890',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    refreshTokenHash: null,
    avatarUrl: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    usersService = new UsersService(prisma as PrismaService);
  });

  it('should create a new user with hashed password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'hash').mockImplementation(() =>
      Promise.resolve('mock_hashed_pw' as never),
    );

    const result = await usersService.create({
      email: 'user1@dokanos.com',
      password: 'StrongPassword1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user1@dokanos.com' },
    });
    expect(result.email).toBe('user1@dokanos.com');
    expect((result as any).passwordHash).toBeUndefined(); // Verify passwordHash is stripped
  });

  it('should throw ConflictException if email is already taken', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      usersService.create({
        email: 'user1@dokanos.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should return sanitized user when findById succeeds', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await usersService.findById('user-uuid-1');
    expect(result.id).toBe('user-uuid-1');
    expect((result as any).passwordHash).toBeUndefined();
  });

  it('should throw NotFoundException when findById cannot find user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(usersService.findById('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
