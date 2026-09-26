import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Prisma, UserRole } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create new product SKU in a seller store (supports variants & inventory)',
  })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(userId, dto);
  }

  @Public()
  @ApiOperation({ summary: 'List, search, filter, and paginate products' })
  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @ApiOperation({
    summary: 'Get product detail by ID or Slug (with variants & reviews)',
  })
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Public()
  @ApiOperation({
    summary: 'Get AI content-based recommendations for a product',
  })
  @Get(':idOrSlug/recommendations')
  async getRecommendations(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getRecommendations(
      idOrSlug,
      limit ? Number(limit) : 6,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product listing (ownership guarded)' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(userId, productId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Duplicate an existing product (one-click clone with fresh SKUs)',
  })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.duplicateProduct(userId, productId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive/Delete product (ownership guarded)' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.remove(userId, productId);
  }

  // Variant Endpoints
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new variant to an existing product' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  async createVariant(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(userId, productId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant attributes, price, or stock' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Patch('variants/:variantId')
  async updateVariant(
    @CurrentUser('id') userId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(userId, variantId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product variant' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Delete('variants/:variantId')
  async deleteVariant(
    @CurrentUser('id') userId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteVariant(userId, variantId);
  }

  // Product Reviews
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a verified customer review for a product' })
  @Post(':id/reviews')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.productsService.createReview(userId, productId, dto);
  }

  @Public()
  @ApiOperation({ summary: 'Get paginated reviews for a product' })
  @Get(':id/reviews')
  async getReviews(
    @Param('id') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getReviews(
      productId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}
