import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductSortBy, QueryProductDto } from './dto/query-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { RedisService } from '../common/redis/redis.service.js';
import { AuditService } from '../common/audit/audit.service.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

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
      throw new ForbiddenException(
        'You do not have permission to add products to this store',
      );
    }

    // 2. Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID '${dto.categoryId}' not found`,
      );
    }

    // 3. Generate unique slug if not explicitly passed
    let slug = (dto.slug || dto.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await this.prisma.product.findUnique({
      where: { slug },
    });
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
        throw new ConflictException(
          `SKU '${dto.sku}' already exists in this store`,
        );
      }
    }

    // 5. Calculate aggregated stock quantity if variants are passed
    const hasVariants = Boolean(dto.variants && dto.variants.length > 0);
    const initialStockQuantity = hasVariants
      ? dto.variants!.reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0)
      : (dto.stockQuantity ?? 0);

    return this.prisma.$transaction(async (tx) => {
      // Create product
      const product = await tx.product.create({
        data: {
          storeId: dto.storeId,
          categoryId: dto.categoryId,
          title: dto.title,
          slug,
          description: dto.description,
          sku: dto.sku,
          barcode: dto.barcode,
          price: new Prisma.Decimal(dto.price),
          compareAtPrice: dto.compareAtPrice
            ? new Prisma.Decimal(dto.compareAtPrice)
            : null,
          costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null,
          stockQuantity: initialStockQuantity,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          status: dto.status ?? 'ACTIVE',
          attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
          isFeatured: dto.isFeatured ?? false,
          images:
            dto.images && dto.images.length > 0
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

      // Handle variants creation and inventory records
      if (hasVariants) {
        for (const variantDto of dto.variants!) {
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              title: variantDto.title,
              sku: variantDto.sku,
              barcode: variantDto.barcode,
              price: new Prisma.Decimal(variantDto.price),
              compareAtPrice: variantDto.compareAtPrice
                ? new Prisma.Decimal(variantDto.compareAtPrice)
                : null,
              costPrice: variantDto.costPrice
                ? new Prisma.Decimal(variantDto.costPrice)
                : null,
              stockQuantity: variantDto.stockQuantity ?? 0,
              attributes: (variantDto.attributes ??
                {}) as Prisma.InputJsonValue,
              images: variantDto.images
                ? (variantDto.images as unknown as Prisma.InputJsonValue)
                : undefined,
              isDefault: variantDto.isDefault ?? false,
            },
          });

          // Create inventory and transaction log
          const inventory = await tx.inventory.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              sku: variant.sku,
              stockQuantity: variant.stockQuantity,
              lowStockThreshold: product.lowStockThreshold,
            },
          });

          if (variant.stockQuantity > 0) {
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                type: 'RESTOCK',
                quantity: variant.stockQuantity,
                previousStock: 0,
                newStock: variant.stockQuantity,
                referenceId: `INIT-${product.id.slice(0, 8)}`,
                note: `Initial stock for variant '${variant.title}'`,
              },
            });
          }
        }
      } else {
        // Base product inventory record
        const inventory = await tx.inventory.create({
          data: {
            productId: product.id,
            sku: product.sku ?? `PROD-${product.id.slice(0, 8)}`,
            stockQuantity: product.stockQuantity,
            lowStockThreshold: product.lowStockThreshold,
          },
        });

        if (product.stockQuantity > 0) {
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inventory.id,
              type: 'RESTOCK',
              quantity: product.stockQuantity,
              previousStock: 0,
              newStock: product.stockQuantity,
              referenceId: `INIT-${product.id.slice(0, 8)}`,
              note: 'Initial product inventory',
            },
          });
        }
      }

      // Asynchronously trigger embedding generation
      this.aiService.indexProductEmbedding(product.id).catch((err) => {
        this.logger.warn(
          `Failed to auto-index embedding for product ${product.id}: ${err.message}`,
        );
      });

      // Invalidate product & store caches
      if (this.redisService) {
        await this.redisService.invalidatePattern('cache:products:*');
        await this.redisService.invalidatePattern('cache:store:page:*');
      }

      if (this.auditService) {
        await this.auditService.log({
          userId,
          action: 'PRODUCT_CREATED',
          resource: 'Product',
          resourceId: product.id,
          details: {
            title: product.title,
            storeId: product.storeId,
            price: Number(product.price),
          },
        });
      }

      return product;
    });
  }

  async findAll(query: QueryProductDto) {
    const cacheKey = `cache:products:list:${JSON.stringify(query)}`;
    if (this.redisService) {
      const cached = await this.redisService.getJson<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.categorySlug) {
      where.category = {
        slug: query.categorySlug.toLowerCase(),
      };
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

    if (query.minRating !== undefined) {
      where.rating = {
        gte: new Prisma.Decimal(query.minRating),
      };
    }

    if (query.inStock) {
      where.OR = [
        { stockQuantity: { gt: 0 } },
        { variants: { some: { stockQuantity: { gt: 0 } } } },
      ];
    }

    if (query.search) {
      const search = query.search.trim();
      const searchConditions: Prisma.ProductWhereInput[] = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { store: { name: { contains: search, mode: 'insensitive' } } },
        {
          variants: {
            some: { title: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          variants: {
            some: { sku: { contains: search, mode: 'insensitive' } },
          },
        },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }, { OR: where.OR }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
      case ProductSortBy.POPULAR:
        orderBy = { reviewCount: 'desc' };
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
          variants: {
            orderBy: { price: 'asc' },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              rating: true,
              logoUrl: true,
              reviewCount: true,
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const result = {
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

    if (this.redisService) {
      await this.redisService.setJson(cacheKey, result, 120); // 2 minute cache for product queries
    }

    return result;
  }

  async findOne(idOrSlug: string): Promise<Product> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug.toLowerCase() },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            rating: true,
            logoUrl: true,
            reviewCount: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${idOrSlug}' not found`);
    }

    return product;
  }

  async update(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      product.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this product',
      );
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.title) data.title = dto.title;
    if (dto.description) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = dto.compareAtPrice
        ? new Prisma.Decimal(dto.compareAtPrice)
        : null;
    }
    if (dto.costPrice !== undefined) {
      data.costPrice = dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null;
    }
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.lowStockThreshold !== undefined)
      data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.status) data.status = dto.status;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.attributes)
      data.attributes = dto.attributes as Prisma.InputJsonValue;

    if (dto.images && dto.images.length > 0) {
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

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data,
      include: {
        images: true,
        variants: true,
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // Re-index product embedding with updated content
    this.aiService.indexProductEmbedding(updated.id).catch((err) => {
      this.logger.warn(
        `Failed to update embedding for product ${updated.id}: ${err.message}`,
      );
    });

    // Invalidate product caches
    if (this.redisService) {
      await this.redisService.invalidatePattern('cache:products:*');
      await this.redisService.invalidatePattern('cache:store:page:*');
    }

    if (this.auditService) {
      await this.auditService.log({
        userId,
        action: 'PRODUCT_UPDATED',
        resource: 'Product',
        resourceId: updated.id,
        details: { title: updated.title, price: Number(updated.price) },
      });
    }

    return updated;
  }

  async duplicateProduct(userId: string, productId: string): Promise<Product> {
    const original = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        variants: true,
        store: { include: { sellerProfile: true } },
      },
    });

    if (!original) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      original.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to duplicate this product',
      );
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newTitle = `${original.title} (Copy)`;
    const newSlug = `${original.slug}-copy-${randomSuffix}`;
    const newSku = original.sku
      ? `${original.sku}-COPY-${randomSuffix.toUpperCase()}`
      : null;

    return this.prisma.$transaction(async (tx) => {
      const cloned = await tx.product.create({
        data: {
          storeId: original.storeId,
          categoryId: original.categoryId,
          title: newTitle,
          slug: newSlug,
          description: original.description,
          sku: newSku,
          barcode: null,
          price: original.price,
          compareAtPrice: original.compareAtPrice,
          costPrice: original.costPrice,
          stockQuantity: original.stockQuantity,
          lowStockThreshold: original.lowStockThreshold,
          status: 'DRAFT', // duplicated products start as draft
          attributes: original.attributes as Prisma.InputJsonValue,
          isFeatured: false,
          images: {
            create: original.images.map((img) => ({
              url: img.url,
              altText: img.altText,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            })),
          },
        },
        include: {
          images: true,
          variants: true,
          store: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      // Clone variants if original had any
      if (original.variants.length > 0) {
        for (const variant of original.variants) {
          const variantSku = `${variant.sku}-COPY-${randomSuffix.toUpperCase()}`;
          const clonedVariant = await tx.productVariant.create({
            data: {
              productId: cloned.id,
              title: variant.title,
              sku: variantSku,
              barcode: null,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              costPrice: variant.costPrice,
              stockQuantity: variant.stockQuantity,
              attributes: variant.attributes as Prisma.InputJsonValue,
              images: variant.images as Prisma.InputJsonValue,
              isDefault: variant.isDefault,
            },
          });

          await tx.inventory.create({
            data: {
              productId: cloned.id,
              variantId: clonedVariant.id,
              sku: variantSku,
              stockQuantity: variant.stockQuantity,
              lowStockThreshold: cloned.lowStockThreshold,
            },
          });
        }
      } else {
        await tx.inventory.create({
          data: {
            productId: cloned.id,
            sku: newSku ?? `PROD-${cloned.id.slice(0, 8)}`,
            stockQuantity: cloned.stockQuantity,
            lowStockThreshold: cloned.lowStockThreshold,
          },
        });
      }

      return cloned;
    });
  }

  async remove(
    userId: string,
    productId: string,
  ): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      product.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'ARCHIVED' },
    });

    if (this.redisService) {
      await this.redisService.invalidatePattern('cache:products:*');
      await this.redisService.invalidatePattern('cache:store:page:*');
    }

    if (this.auditService) {
      await this.auditService.log({
        userId,
        action: 'PRODUCT_DELETED',
        resource: 'Product',
        resourceId: productId,
        details: { title: product.title },
      });
    }

    return {
      message: `Product '${product.title}' has been archived successfully`,
    };
  }

  // Variant operations
  async createVariant(
    userId: string,
    productId: string,
    dto: CreateVariantDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      product.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to add variants to this product',
      );
    }

    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existingSku) {
      throw new ConflictException(`Variant SKU '${dto.sku}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          title: dto.title,
          sku: dto.sku,
          barcode: dto.barcode,
          price: new Prisma.Decimal(dto.price),
          compareAtPrice: dto.compareAtPrice
            ? new Prisma.Decimal(dto.compareAtPrice)
            : null,
          costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null,
          stockQuantity: dto.stockQuantity ?? 0,
          attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
          images: dto.images
            ? (dto.images as unknown as Prisma.InputJsonValue)
            : undefined,
          isDefault: dto.isDefault ?? false,
        },
      });

      const inventory = await tx.inventory.create({
        data: {
          productId,
          variantId: variant.id,
          sku: variant.sku,
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: product.lowStockThreshold,
        },
      });

      if (variant.stockQuantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: 'RESTOCK',
            quantity: variant.stockQuantity,
            previousStock: 0,
            newStock: variant.stockQuantity,
            referenceId: `VARIANT-${variant.id.slice(0, 8)}`,
            note: `Initial stock for variant '${variant.title}'`,
          },
        });
      }

      // Aggregate total stock
      const allVariants = await tx.productVariant.findMany({
        where: { productId },
        select: { stockQuantity: true },
      });
      const totalStock = allVariants.reduce(
        (sum, v) => sum + v.stockQuantity,
        0,
      );

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: totalStock },
      });

      return variant;
    });
  }

  async updateVariant(
    userId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { include: { store: { include: { sellerProfile: true } } } },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID '${variantId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      variant.product.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this variant',
      );
    }

    const data: Prisma.ProductVariantUpdateInput = {};
    if (dto.title) data.title = dto.title;
    if (dto.sku) data.sku = dto.sku;
    if (dto.barcode !== undefined) data.barcode = dto.barcode;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = dto.compareAtPrice
        ? new Prisma.Decimal(dto.compareAtPrice)
        : null;
    }
    if (dto.costPrice !== undefined) {
      data.costPrice = dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null;
    }
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.attributes)
      data.attributes = dto.attributes as Prisma.InputJsonValue;
    if (dto.images)
      data.images = dto.images as unknown as Prisma.InputJsonValue;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data,
      });

      if (dto.stockQuantity !== undefined) {
        await tx.inventory.updateMany({
          where: { variantId },
          data: { stockQuantity: dto.stockQuantity },
        });

        const allVariants = await tx.productVariant.findMany({
          where: { productId: variant.productId },
          select: { stockQuantity: true },
        });
        const totalStock = allVariants.reduce(
          (sum, v) => sum + v.stockQuantity,
          0,
        );

        await tx.product.update({
          where: { id: variant.productId },
          data: { stockQuantity: totalStock },
        });
      }

      return updated;
    });
  }

  async deleteVariant(userId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { include: { store: { include: { sellerProfile: true } } } },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID '${variantId}' not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      variant.product.store.sellerProfile.userId !== userId &&
      user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this variant',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.delete({ where: { id: variantId } });

      const allVariants = await tx.productVariant.findMany({
        where: { productId: variant.productId },
        select: { stockQuantity: true },
      });
      const totalStock = allVariants.reduce(
        (sum, v) => sum + v.stockQuantity,
        0,
      );

      await tx.product.update({
        where: { id: variant.productId },
        data: { stockQuantity: totalStock },
      });
    });

    return { message: 'Variant deleted successfully' };
  }

  // Customer Reviews
  async createReview(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Check if user has already reviewed this product
    const existing = await this.prisma.review.findFirst({
      where: { productId, userId },
    });

    if (existing) {
      throw new ConflictException(
        'You have already submitted a review for this product',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          productId,
          userId,
          storeId: product.storeId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          isVerifiedPurchase: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Recalculate Product average rating & count
      const productReviews = await tx.review.findMany({
        where: { productId },
        select: { rating: true },
      });

      const avgRating =
        productReviews.reduce((sum, r) => sum + r.rating, 0) /
        productReviews.length;

      await tx.product.update({
        where: { id: productId },
        data: {
          rating: new Prisma.Decimal(avgRating.toFixed(2)),
          reviewCount: productReviews.length,
        },
      });

      // Recalculate Store average rating & count
      const storeReviews = await tx.review.findMany({
        where: { storeId: product.storeId },
        select: { rating: true },
      });

      const storeAvgRating =
        storeReviews.reduce((sum, r) => sum + r.rating, 0) /
        storeReviews.length;

      await tx.store.update({
        where: { id: product.storeId },
        data: {
          rating: new Prisma.Decimal(storeAvgRating.toFixed(2)),
          reviewCount: storeReviews.length,
        },
      });

      return review;
    });
  }

  async getReviews(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
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

  async getRecommendations(idOrSlug: string, limit: number = 6) {
    const product = await this.findOne(idOrSlug);
    return this.aiService.getProductRecommendations(product.id, { limit });
  }
}
