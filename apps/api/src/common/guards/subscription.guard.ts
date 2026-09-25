import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service.js';

export const SUBSCRIPTION_FEATURE_KEY = 'subscription_feature';
export const RequireFeature = (featureName: string) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, featureName);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      SUBSCRIPTION_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication context is required');
    }

    // Admins bypass subscription feature restrictions
    if (user.role === 'ADMIN') {
      return true;
    }

    // Find the seller profile for this user
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: user.id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!seller) {
      throw new ForbiddenException(
        'Seller profile required to access this feature',
      );
    }

    const sub = seller.subscription;
    const planTier = sub?.plan?.tier || 'FREE';
    const isSubActive = sub?.status === 'ACTIVE' || planTier === 'FREE' || !sub;

    if (!isSubActive) {
      throw new ForbiddenException(
        `Your subscription is currently ${sub?.status}. Please update your billing information to continue using ${requiredFeature}.`,
      );
    }

    const features = (sub?.plan?.features as string[]) || [];

    // Pro tier has all features
    if (planTier === 'PRO' || planTier === 'ENTERPRISE') {
      return true;
    }

    // Free tier feature check
    const hasFeature =
      features.includes(requiredFeature) ||
      features.includes('*') ||
      features.some((f) => f.toLowerCase() === requiredFeature.toLowerCase());

    if (!hasFeature) {
      throw new ForbiddenException(
        `Access to '${requiredFeature}' requires a PRO subscription plan. Please upgrade your subscription on your billing dashboard.`,
      );
    }

    return true;
  }
}
