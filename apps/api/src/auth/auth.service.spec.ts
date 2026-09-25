import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService (Backend Testing)', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test@dokanos.com',
    passwordHash: '$2a$10$hashedpasswordstringforauth',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
    refreshTokenHash: '$2a$10$hashedrefreshtokenstring',
    phone: null,
    avatarUrl: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      sanitizeUser: vi.fn().mockImplementation((u) => {
        const {
          passwordHash: _passwordHash,
          refreshTokenHash: _refreshTokenHash,
          ...safe
        } = u;
        return safe;
      }),
      setRefreshTokenHash: vi.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      signAsync: vi
        .fn()
        .mockImplementation((payload) =>
          Promise.resolve(`jwt.token.${payload.sub}`),
        ),
      verifyAsync: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        return defaultValue || 'mock_val';
      }),
    };

    authService = new AuthService(
      usersService as UsersService,
      jwtService as JwtService,
      configService as ConfigService,
    );
  });

  describe('Registration Flow', () => {
    it('should register a new user, generate tokens, and hash refresh token', async () => {
      const registerDto = {
        email: 'newuser@dokanos.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      const sanitizedUser = {
        id: 'new-uuid',
        email: 'newuser@dokanos.com',
        firstName: 'New',
        lastName: 'User',
        role: 'CUSTOMER' as const,
        status: 'ACTIVE' as const,
        phone: null,
        avatarUrl: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersService.create as any).mockResolvedValue(sanitizedUser);

      const result = await authService.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(usersService.setRefreshTokenHash).toHaveBeenCalled();
      expect(result.user.email).toBe('newuser@dokanos.com');
    });
  });

  describe('Login Flow', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      (usersService.findByEmail as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(() =>
        Promise.resolve(true as never),
      );

      const loginDto = { email: 'test@dokanos.com', password: 'Password123!' };
      const result = await authService.login(loginDto);

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException if email is not found', async () => {
      (usersService.findByEmail as any).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@dokanos.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is suspended', async () => {
      (usersService.findByEmail as any).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      await expect(
        authService.login({
          email: 'test@dokanos.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      (usersService.findByEmail as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(() =>
        Promise.resolve(false as never),
      );

      await expect(
        authService.login({
          email: 'test@dokanos.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should issue new access & refresh tokens when refresh token is valid', async () => {
      (jwtService.verifyAsync as any).mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      (usersService.findByEmail as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(() =>
        Promise.resolve(true as never),
      );

      const tokens = await authService.refreshTokens({
        refreshToken: 'valid_refresh_token',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(usersService.setRefreshTokenHash).toHaveBeenCalled();
    });

    it('should reject invalid or expired refresh token with UnauthorizedException', async () => {
      (jwtService.verifyAsync as any).mockRejectedValue(
        new Error('jwt expired'),
      );

      await expect(
        authService.refreshTokens({ refreshToken: 'expired_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject mismatched refresh token hash with ForbiddenException', async () => {
      (jwtService.verifyAsync as any).mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      (usersService.findByEmail as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(() =>
        Promise.resolve(false as never),
      );

      await expect(
        authService.refreshTokens({ refreshToken: 'reused_or_tampered_token' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
