import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoresService } from './stores.service.js';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Stores & Sellers')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or update seller profile' })
  @Post('seller-profile')
  @HttpCode(HttpStatus.OK)
  async createSellerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSellerProfileDto,
  ) {
    return this.storesService.createOrUpdateSellerProfile(userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user seller profile with stores' })
  @Get('seller-profile')
  async getSellerProfile(@CurrentUser('id') userId: string) {
    return this.storesService.getSellerProfile(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new storefront' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createStore(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.createStore(userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores owned by the current seller' })
  @Get('my-stores')
  async getMyStores(@CurrentUser('id') userId: string) {
    return this.storesService.getMyStores(userId);
  }

  @Public()
  @ApiOperation({ summary: 'Publicly get a store profile by URL slug' })
  @Get(':slug')
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store details (ownership guarded)' })
  @Patch(':id')
  async updateStore(
    @CurrentUser('id') userId: string,
    @Param('id') storeId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(userId, storeId, dto);
  }
}
