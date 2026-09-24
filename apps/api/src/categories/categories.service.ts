import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Category slug '${slug}' is already in use`);
    }

    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
      }
      level = parent.level + 1;
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        iconUrl: dto.iconUrl,
        parentId: dto.parentId,
        level,
        isActive: true,
      },
    });
  }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(idOrSlug: string): Promise<Category & { children: Category[]; _count: { products: number } }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const category = await this.prisma.category.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug.toLowerCase() },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category '${idOrSlug}' not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug.toLowerCase().trim() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category slug '${dto.slug}' already in use`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug?.toLowerCase().trim(),
        description: dto.description,
        iconUrl: dto.iconUrl,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findOne(id);

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.products} existing products. Deactivate it instead.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: `Category '${category.name}' deleted successfully` };
  }
}
