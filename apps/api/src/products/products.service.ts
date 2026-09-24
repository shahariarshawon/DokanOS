import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductSortBy, QueryProductDto } from './dto/query-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductDto): Promise<Product> {
    // 1. Verify store exists and caller is owner or admin
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      include: { sellerProfile: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID '${dto.storeId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to add products to this store');
    }

    // 2. Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
    }

    // 3. Generate unique slug if not explicitly passed
    let slug = (dto.slug || dto.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      const suffix = Math.random().toString(36).substring(2, 7);
      slug = `${slug}-${suffix}`;
    }

    // 4. Verify SKU uniqueness within this store if passed
    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: {
          storeId_sku: {
            storeId: dto.storeId,
            sku: dto.sku,
          },
        },
      });
      if (existingSku) {
        throw new ConflictException(`SKU '${dto.sku}' already exists in this store`);
      }
    }

    // 5. Create product and nested images
    return this.prisma.product.create({
      data: {
        storeId: dto.storeId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        description: dto.description,
        sku: dto.sku,
        barcode: dto.barcode,
        price: new Prisma.Decimal(dto.price),
        compareAtPrice: dto.compareAtPrice ? new Prisma.Decimal(dto.compareAtPrice) : null,
        costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null,
        stockQuantity: dto.stockQuantity ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        status: dto.status ?? 'ACTIVE',
        attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
        isFeatured: dto.isFeatured ?? false,
        images: dto.images && dto.images.length > 0
          ? {
              create: dto.images.map((img, index) => ({
                url: img.url,
                altText: img.altText ?? dto.title,
                sortOrder: img.sortOrder ?? index,
                isPrimary: img.isPrimary ?? index === 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findAll(query: QueryProductDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (query.sortBy) {
      case ProductSortBy.PRICE_ASC:
        orderBy = { price: 'asc' };
        break;
      case ProductSortBy.PRICE_DESC:
        orderBy = { price: 'desc' };
        break;
      case ProductSortBy.RATING:
        orderBy = { rating: 'desc' };
        break;
      case ProductSortBy.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          store: {
            select: { id: true, name: true, slug: true, rating: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(idOrSlug: string): Promise<Product> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug.toLowerCase() },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        store: {
          select: { id: true, name: true, slug: true, rating: true, logoUrl: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${idOrSlug}' not found`);
    }

    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (product.store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to modify this product');
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.title) data.title = dto.title;
    if (dto.description) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = dto.compareAtPrice ? new Prisma.Decimal(dto.compareAtPrice) : null;
    }
    if (dto.costPrice !== undefined) {
      data.costPrice = dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null;
    }
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.status) data.status = dto.status;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.attributes) data.attributes = dto.attributes as Prisma.InputJsonValue;

    if (dto.images && dto.images.length > 0) {
      // Replace existing gallery images with the newly supplied set
      await this.prisma.productImage.deleteMany({ where: { productId } });
      data.images = {
        create: dto.images.map((img, index) => ({
          url: img.url,
          altText: img.altText ?? product.title,
          sortOrder: img.sortOrder ?? index,
          isPrimary: img.isPrimary ?? index === 0,
        })),
      };
    }

    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: {
        images: true,
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(userId: string, productId: string): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (product.store.sellerProfile.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this product');
    }

    // Soft delete / archive to keep catalog data safe
    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'ARCHIVED' },
    });

    return { message: `Product '${product.title}' has been archived successfully` };
  }
}
