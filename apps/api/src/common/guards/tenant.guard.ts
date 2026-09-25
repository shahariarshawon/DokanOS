import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantAccessDeniedException } from '../exceptions/domain.exceptions.js';

export interface TenantContext {
  storeId?: string;
  storeSlug?: string;
  sellerId?: string;
  role: string;
  isCrossTenantAdmin: boolean;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is not authenticated yet, let JwtAuthGuard handle it
    if (!user) {
      return true;
    }

    // Extract target store ID or slug from headers, params, or body
    const targetStoreId =
      request.headers['x-tenant-id'] ||
      request.params?.storeId ||
      request.query?.storeId ||
      request.body?.storeId;

    const targetStoreSlug =
      request.params?.storeSlug ||
      request.query?.storeSlug ||
      request.body?.storeSlug;

    // If route doesn't specify a tenant target, attach base context and proceed
    if (!targetStoreId && !targetStoreSlug) {
      request.tenant = {
        role: user.role,
        isCrossTenantAdmin: user.role === 'ADMIN',
      } as TenantContext;
      return true;
    }

    // Super Admin has global cross-tenant access with audit visibility
    if (user.role === 'ADMIN') {
      request.tenant = {
        storeId: targetStoreId,
        storeSlug: targetStoreSlug,
        role: user.role,
        isCrossTenantAdmin: true,
      } as TenantContext;
      return true;
    }

    // Customer role is allowed to view public tenant storefronts
    if (user.role === 'CUSTOMER') {
      request.tenant = {
        storeId: targetStoreId,
        storeSlug: targetStoreSlug,
        role: user.role,
        isCrossTenantAdmin: false,
      } as TenantContext;
      return true;
    }

    // For SELLER role: verify that the targeted store is owned by this authenticated seller
    if (user.role === 'SELLER') {
      const store = await this.prisma.store.findFirst({
        where: {
          ...(targetStoreId ? { id: targetStoreId } : {}),
          ...(targetStoreSlug ? { slug: targetStoreSlug } : {}),
          sellerProfile: {
            userId: user.id,
          },
        },
        select: {
          id: true,
          slug: true,
          status: true,
          sellerProfileId: true,
        },
      });

      if (!store) {
        throw new TenantAccessDeniedException(
          `Tenant access denied. You do not have permission to manage store '${targetStoreId || targetStoreSlug}'.`,
        );
      }

      request.tenant = {
        storeId: store.id,
        storeSlug: store.slug,
        sellerId: user.id,
        role: user.role,
        isCrossTenantAdmin: false,
      } as TenantContext;

      return true;
    }

    throw new ForbiddenException('Unauthorized tenant access.');
  }
}
