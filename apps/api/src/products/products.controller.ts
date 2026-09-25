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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product SKU in a seller store' })
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
  @ApiOperation({ summary: 'Get product detail by ID or Slug' })
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Public()
  @ApiOperation({ summary: 'Get AI content-based recommendations for a product' })
  @Get(':idOrSlug/recommendations')
  async getRecommendations(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getRecommendations(idOrSlug, limit ? Number(limit) : 6);
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
  @ApiOperation({ summary: 'Archive/Delete product (ownership guarded)' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.remove(userId, productId);
  }
}
