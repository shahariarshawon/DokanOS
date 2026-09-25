import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { QueryInventoryTransactionsDto } from './dto/query-inventory-transactions.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    // Find stores owned by this seller
    const stores = await this.prisma.store.findMany({
      where: isAdmin ? {} : { sellerProfile: { userId } },
      select: { id: true, name: true },
    });

    const storeIds = stores.map((s) => s.id);

    const products = await this.prisma.product.findMany({
      where: {
        storeId: { in: storeIds },
        status: { not: 'ARCHIVED' },
      },
      include: {
        variants: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: Array<{
      productId: string;
      title: string;
      stockQuantity: number;
      lowStockThreshold: number;
      variantCount: number;
      primaryImage: string | null;
    }> = [];

    for (const p of products) {
      // Calculate effective stock considering variants if they exist
      const productStock =
        p.variants.length > 0
          ? p.variants.reduce((sum, v) => sum + v.stockQuantity, 0)
          : p.stockQuantity;

      totalStock += productStock;

      if (productStock === 0) {
        outOfStockCount++;
      } else if (productStock <= p.lowStockThreshold) {
        lowStockCount++;
      }

      if (productStock <= p.lowStockThreshold) {
        lowStockItems.push({
          productId: p.id,
          title: p.title,
          stockQuantity: productStock,
          lowStockThreshold: p.lowStockThreshold,
          variantCount: p.variants.length,
          primaryImage: p.images[0]?.url ?? null,
        });
      }
    }

    return {
      totalProducts: products.length,
      totalStock,
      lowStockProducts: lowStockCount,
      outOfStockProducts: outOfStockCount,
      lowStockItems: lowStockItems.slice(0, 10),
    };
  }

  async getTransactions(userId: string, query: QueryInventoryTransactionsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    const stores = await this.prisma.store.findMany({
      where: isAdmin ? {} : { sellerProfile: { userId } },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const inventoryWhere: Prisma.InventoryWhereInput = {
      product: {
        storeId: { in: storeIds },
      },
    };

    if (query.productId) {
      inventoryWhere.productId = query.productId;
    }

    if (query.variantId) {
      inventoryWhere.variantId = query.variantId;
    }

    const where: Prisma.InventoryTransactionWhereInput = {
      inventory: inventoryWhere,
    };

    if (query.type) {
      where.type = query.type;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            include: {
              product: {
                select: { id: true, title: true, sku: true },
              },
              variant: {
                select: { id: true, title: true, sku: true },
              },
            },
          },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
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

  async adjustStock(userId: string, dto: AdjustStockDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        store: { include: { sellerProfile: true } },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID '${dto.productId}' not found`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwner = product.store.sellerProfile.userId === userId;
    const isAdmin = user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to adjust inventory for this product',
      );
    }

    let targetVariant = null;
    if (dto.variantId) {
      targetVariant = product.variants.find((v) => v.id === dto.variantId);
      if (!targetVariant) {
        throw new NotFoundException(
          `Variant with ID '${dto.variantId}' not found for this product`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Find or create Inventory record
      let inventory = await tx.inventory.findFirst({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
        },
      });

      const currentStock = targetVariant
        ? targetVariant.stockQuantity
        : product.stockQuantity;
      const sku = targetVariant
        ? targetVariant.sku
        : (product.sku ?? `PROD-${product.id.slice(0, 8)}`);

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId: dto.productId,
            variantId: dto.variantId ?? null,
            sku,
            stockQuantity: currentStock,
            lowStockThreshold: product.lowStockThreshold,
          },
        });
      }

      const previousStock = inventory.stockQuantity;
      const newStock = previousStock + dto.quantity;

      if (newStock < 0) {
        throw new BadRequestException(
          `Insufficient stock to deduct ${Math.abs(dto.quantity)}. Current stock is ${previousStock}.`,
        );
      }

      // Update Inventory record
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { stockQuantity: newStock },
      });

      // Update variant or product stock
      if (dto.variantId) {
        await tx.productVariant.update({
          where: { id: dto.variantId },
          data: { stockQuantity: newStock },
        });

        // Recalculate total product stock from all variants
        const allVariants = await tx.productVariant.findMany({
          where: { productId: dto.productId },
          select: { stockQuantity: true },
        });
        const aggregateStock = allVariants.reduce(
          (sum, v) => sum + v.stockQuantity,
          0,
        );

        await tx.product.update({
          where: { id: dto.productId },
          data: {
            stockQuantity: aggregateStock,
            status: aggregateStock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
          },
        });
      } else {
        await tx.product.update({
          where: { id: dto.productId },
          data: {
            stockQuantity: newStock,
            status: newStock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
          },
        });
      }

      // Create transaction log
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: dto.type,
          quantity: dto.quantity,
          previousStock,
          newStock,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      });

      return {
        inventoryId: inventory.id,
        productId: dto.productId,
        variantId: dto.variantId,
        previousStock,
        newStock,
        quantity: dto.quantity,
        transaction,
      };
    });
  }

  async deductStock(
    tx: Prisma.TransactionClient,
    items: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
      referenceId: string;
    }>,
  ) {
    for (const item of items) {
      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant || variant.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant '${variant?.title ?? item.variantId}'. Available: ${variant?.stockQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        let inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              sku: variant.sku,
              stockQuantity: variant.stockQuantity,
              lowStockThreshold: variant.product.lowStockThreshold,
            },
          });
        }

        const prev = inventory.stockQuantity;
        const next = prev - item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { stockQuantity: next },
        });

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: next },
        });

        // Recalculate total product stock
        const allVariants = await tx.productVariant.findMany({
          where: { productId: item.productId },
          select: { stockQuantity: true },
        });
        const aggregateStock = allVariants.reduce(
          (sum, v) => sum + v.stockQuantity,
          0,
        );

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: aggregateStock,
            status: aggregateStock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: 'ORDER_DEDUCTION',
            quantity: -item.quantity,
            previousStock: prev,
            newStock: next,
            referenceId: item.referenceId,
            note: `Order deduction for #${item.referenceId}`,
          },
        });
      } else {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product '${product?.title ?? item.productId}'. Available: ${product?.stockQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        let inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: null },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: item.productId,
              sku: product.sku ?? `PROD-${product.id.slice(0, 8)}`,
              stockQuantity: product.stockQuantity,
              lowStockThreshold: product.lowStockThreshold,
            },
          });
        }

        const prev = inventory.stockQuantity;
        const next = prev - item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { stockQuantity: next },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: next,
            status: next === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: 'ORDER_DEDUCTION',
            quantity: -item.quantity,
            previousStock: prev,
            newStock: next,
            referenceId: item.referenceId,
            note: `Order deduction for #${item.referenceId}`,
          },
        });
      }
    }
  }

  async restoreStock(
    tx: Prisma.TransactionClient,
    items: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
      referenceId: string;
      note?: string;
    }>,
  ) {
    for (const item of items) {
      if (item.variantId) {
        let inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId },
        });

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) continue;

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              sku: variant.sku,
              stockQuantity: variant.stockQuantity,
              lowStockThreshold: variant.product.lowStockThreshold,
            },
          });
        }

        const prev = inventory.stockQuantity;
        const next = prev + item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { stockQuantity: next },
        });

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: next },
        });

        const allVariants = await tx.productVariant.findMany({
          where: { productId: item.productId },
          select: { stockQuantity: true },
        });
        const aggregateStock = allVariants.reduce(
          (sum, v) => sum + v.stockQuantity,
          0,
        );

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: aggregateStock,
            status: aggregateStock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: 'ORDER_RETURN',
            quantity: item.quantity,
            previousStock: prev,
            newStock: next,
            referenceId: item.referenceId,
            note:
              item.note ??
              `Stock restored for cancellation/return on #${item.referenceId}`,
          },
        });
      } else {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue;

        let inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: null },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: item.productId,
              sku: product.sku ?? `PROD-${product.id.slice(0, 8)}`,
              stockQuantity: product.stockQuantity,
              lowStockThreshold: product.lowStockThreshold,
            },
          });
        }

        const prev = inventory.stockQuantity;
        const next = prev + item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { stockQuantity: next },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: next,
            status: next > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: 'ORDER_RETURN',
            quantity: item.quantity,
            previousStock: prev,
            newStock: next,
            referenceId: item.referenceId,
            note:
              item.note ??
              `Stock restored for cancellation/return on #${item.referenceId}`,
          },
        });
      }
    }
  }
}
