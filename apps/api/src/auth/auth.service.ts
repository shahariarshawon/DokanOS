import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { UsersService, UserWithoutSecrets } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { AuditService } from '../common/audit/audit.service.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserWithoutSecrets;
  tokens: AuthTokens;
  verificationToken?: string;
}

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async register(
    registerDto: RegisterDto,
    context?: ClientContext,
  ): Promise<AuthResponse> {
    const user = await this.usersService.create(registerDto);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    // Generate email verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    if (this.auditService) {
      await this.auditService.log({
        userId: user.id,
        action: 'ACCOUNT_ACTIVATED',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email, role: user.role },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return { user, tokens, verificationToken };
  }

  async login(
    loginDto: LoginDto,
    context?: ClientContext,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      if (this.auditService) {
        await this.auditService.log({
          action: 'LOGIN_FAILED',
          resource: 'User',
          details: { email: loginDto.email, reason: 'User not found' },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      if (this.auditService) {
        await this.auditService.log({
          userId: user.id,
          action: 'LOGIN_FAILED',
          resource: 'User',
          resourceId: user.id,
          details: { email: user.email, status: user.status },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
      throw new UnauthorizedException('Your account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      if (this.auditService) {
        await this.auditService.log({
          userId: user.id,
          action: 'LOGIN_FAILED',
          resource: 'User',
          resourceId: user.id,
          details: { email: user.email, reason: 'Invalid password' },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    const sanitized = this.usersService.sanitizeUser(user);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    if (this.auditService) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email, role: user.role },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return { user: sanitized, tokens };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    let payload: { sub: string; email: string; role: string };

    try {
      payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access denied');
    }

    // Refresh token rotation: issue new access token AND new refresh token, then update DB hash
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    context?: ClientContext,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Return ambiguous message to prevent email enumeration attacks
      return {
        message:
          'If that email address is in our database, we will send a password reset link to it shortly.',
      };
    }

    // Generate secure random reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.setPasswordResetToken(
      user.id,
      resetToken,
      expiresAt,
    );

    if (this.auditService) {
      await this.auditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      message:
        'If that email address is in our database, we will send a password reset link to it shortly.',
      resetToken, // Provided for direct API confirmation & testing
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    context?: ClientContext,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByPasswordResetToken(dto.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.resetPassword(user.id, newPasswordHash);

    if (this.auditService) {
      await this.auditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      message:
        'Password has been successfully reset. You may now log in with your new password.',
    };
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    context?: ClientContext,
  ): Promise<{ message: string; user: UserWithoutSecrets }> {
    const user = await this.usersService.findByVerificationToken(dto.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    if (this.auditService) {
      await this.auditService.log({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      message: 'Email address has been successfully verified.',
      user: verifiedUser,
    };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ message: string; verificationToken?: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.emailVerifiedAt) {
      return {
        message:
          'If that email address requires verification, a new activation link has been sent.',
      };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    return {
      message:
        'If that email address requires verification, a new activation link has been sent.',
      verificationToken,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as never,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
  }
}
