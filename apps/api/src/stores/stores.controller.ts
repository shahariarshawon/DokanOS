import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoresService } from './stores.service.js';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { UpdateStoreThemeDto } from './dto/update-store-theme.dto.js';
import { UpdateStoreSectionsDto } from './dto/update-store-sections.dto.js';
import { CreateStoreReviewDto } from './dto/create-store-review.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Stores & Sellers')
@Controller()
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // ---------------------------------------------------------------------------
  // SELLER PROFILE & SELLER STORE MANAGEMENT
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or update seller profile' })
  @Post('stores/seller-profile')
  @HttpCode(HttpStatus.OK)
  async createSellerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSellerProfileDto,
  ) {
    return this.storesService.createOrUpdateSellerProfile(userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user seller profile with stores' })
  @Get('stores/seller-profile')
  async getSellerProfile(@CurrentUser('id') userId: string) {
    return this.storesService.getSellerProfile(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new storefront' })
  @Post('stores')
  @HttpCode(HttpStatus.CREATED)
  async createStore(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.createStore(userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores owned by the current seller' })
  @Get('stores/my-stores')
  async getMyStores(@CurrentUser('id') userId: string) {
    return this.storesService.getMyStores(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller analytics metrics & chart data' })
  @Get('stores/seller/analytics')
  async getStoreAnalytics(
    @CurrentUser('id') userId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.storesService.getStoreAnalytics(userId, storeId);
  }

  // ---------------------------------------------------------------------------
  // STORE THEME & SECTIONS CUSTOMIZATION
  // ---------------------------------------------------------------------------

  @Public()
  @ApiOperation({ summary: 'Get store theme configuration' })
  @Get('stores/:id/theme')
  async getStoreTheme(@Param('id') storeId: string) {
    return this.storesService.getStoreTheme(storeId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update store theme settings (Primary color, Font, Layout)',
  })
  @Patch('stores/:id/theme')
  async updateStoreTheme(
    @CurrentUser('id') userId: string,
    @Param('id') storeId: string,
    @Body() dto: UpdateStoreThemeDto,
  ) {
    return this.storesService.updateStoreTheme(userId, storeId, dto);
  }

  @Public()
  @ApiOperation({ summary: 'Get store homepage section configuration' })
  @Get('stores/:id/sections')
  async getStoreSections(@Param('id') storeId: string) {
    return this.storesService.getStoreSections(storeId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder / update store homepage sections' })
  @Put('stores/:id/sections')
  async updateStoreSections(
    @CurrentUser('id') userId: string,
    @Param('id') storeId: string,
    @Body() dto: UpdateStoreSectionsDto,
  ) {
    return this.storesService.updateStoreSections(userId, storeId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store details (ownership guarded)' })
  @Patch('stores/:id')
  async updateStore(
    @CurrentUser('id') userId: string,
    @Param('id') storeId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(userId, storeId, dto);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC STOREFRONT & CUSTOMER STORE EXPERIENCE
  // ---------------------------------------------------------------------------

  @Public()
  @ApiOperation({ summary: 'Publicly get a store profile by URL slug' })
  @Get('stores/:slug')
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post customer review for a seller store' })
  @Post('stores/:slug/reviews')
  async postStoreReview(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateStoreReviewDto,
  ) {
    return this.storesService.postStoreReview(userId, slug, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow or unfollow a seller store' })
  @Post('stores/:slug/follow')
  async toggleStoreFollow(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.storesService.toggleStoreFollow(userId, slug);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user follows store' })
  @Get('stores/:slug/follow-status')
  async checkFollowStatus(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.storesService.checkFollowStatus(userId, slug);
  }
}
