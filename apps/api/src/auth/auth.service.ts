import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService, UserWithoutSecrets } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserWithoutSecrets;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(registerDto);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sanitized = this.usersService.sanitizeUser(user);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return { user: sanitized, tokens };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    let payload: { sub: string; email: string; role: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: refreshSecret,
      });
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

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

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

  private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
  }
}
