import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Store, SellerProfile } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateSellerProfile(
    userId: string,
    dto: CreateSellerProfileDto,
  ): Promise<SellerProfile> {
    const profile = await this.prisma.sellerProfile.upsert({
      where: { userId },
      create: {
        userId,
        businessName: dto.businessName,
        businessRegistrationNumber: dto.businessRegistrationNumber,
        taxId: dto.taxId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankRoutingNumber: dto.bankRoutingNumber,
        verificationStatus: 'VERIFIED', // auto-verified in dev/MVP
        verifiedAt: new Date(),
      },
      update: {
        businessName: dto.businessName,
        businessRegistrationNumber: dto.businessRegistrationNumber,
        taxId: dto.taxId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankRoutingNumber: dto.bankRoutingNumber,
      },
    });

    // Promote user role to SELLER if currently CUSTOMER
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    });

    return profile;
  }

  async getSellerProfile(
    userId: string,
  ): Promise<SellerProfile & { stores: Store[] }> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { stores: true },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found for this user');
    }

    return profile;
  }

  async createStore(userId: string, dto: CreateStoreDto): Promise<Store> {
    // Ensure seller profile exists
    let profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-create seller profile if not initialized yet
      profile = await this.createOrUpdateSellerProfile(userId, {
        businessName: `${dto.name} Merchant`,
      });
    }

    // Check slug uniqueness
    const normalizedSlug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      throw new ConflictException(
        `Store slug '${normalizedSlug}' is already taken`,
      );
    }

    return this.prisma.store.create({
      data: {
        sellerProfileId: profile.id,
        name: dto.name,
        slug: normalizedSlug,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        status: 'ACTIVE',
      },
    });
  }

  async getMyStores(userId: string): Promise<Store[]> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return [];
    }

    return this.prisma.store.findMany({
      where: { sellerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreBySlug(
    slug: string,
  ): Promise<Store & { _count: { products: number } }> {
    const store = await this.prisma.store.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with slug '${slug}' not found`);
    }

    return store;
  }

  async updateStore(
    userId: string,
    storeId: string,
    dto: UpdateStoreDto,
  ): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { sellerProfile: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check user ownership
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to modify this store',
      );
    }

    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
      },
    });
  }
}
