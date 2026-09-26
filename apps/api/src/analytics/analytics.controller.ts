import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import { SellerAnalyticsQueryDto } from './dto/seller-analytics-query.dto.js';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';
import { ProductAnalyticsQueryDto } from './dto/product-analytics-query.dto.js';
import { CustomerAnalyticsQueryDto } from './dto/customer-analytics-query.dto.js';
import { ExportAnalyticsQueryDto } from './dto/export-analytics-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('Analytics & Business Intelligence')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Seller Dashboard Analytics & Sales Performance',
    description:
      'Provides revenue, total sales, order metrics, conversion rate, top products, time-series chart data, and recent customer activity for merchant stores.',
  })
  @ApiResponse({ status: 200, description: 'Seller analytics dashboard data' })
  @Get('seller/dashboard')
  async getSellerDashboard(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: SellerAnalyticsQueryDto,
  ) {
    return this.analyticsService.getSellerDashboard(userId, role, query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin Marketplace Intelligence & Platform Analytics',
    description:
      'Provides marketplace GMV, platform commission revenues, transaction gateway breakdowns, user growth rates, and top performing vendor stores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin platform analytics dashboard data',
  })
  @Get('admin/dashboard')
  async getAdminDashboard(@Query() query: AdminAnalyticsQueryDto) {
    return this.analyticsService.getAdminDashboard(query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Product Analytics & Performance Intelligence',
    description:
      'Provides top-selling products, low-performing inventory, conversion rates, and category performance.',
  })
  @ApiResponse({ status: 200, description: 'Product analytics data' })
  @Get('seller/products')
  async getProductAnalytics(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: ProductAnalyticsQueryDto,
  ) {
    return this.analyticsService.getProductAnalytics(userId, role, query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Customer Analytics & Behavioral Segmentation',
    description:
      'Provides customer segments (New, Regular, High-Value), lifetime value, and repeat purchase frequency.',
  })
  @ApiResponse({ status: 200, description: 'Customer analytics data' })
  @Get('seller/customers')
  async getCustomerAnalytics(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: CustomerAnalyticsQueryDto,
  ) {
    return this.analyticsService.getCustomerAnalytics(userId, role, query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get AI Analytics Insights',
    description:
      'Returns actionable AI-generated business insights for sales, products, and customers.',
  })
  @ApiResponse({ status: 200, description: 'Active AI insights list' })
  @Get('seller/insights')
  async getInsights(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query('storeId') storeId?: string,
  ) {
    return this.analyticsService.getInsights(userId, role, storeId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generate/Refresh AI Analytics Insights',
    description:
      'Triggers AI synthesis of performance data to create actionable recommendations.',
  })
  @ApiResponse({ status: 201, description: 'Newly generated AI insights' })
  @Post('seller/insights/generate')
  async generateInsights(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query('storeId') storeId?: string,
  ) {
    return this.analyticsService.generateInsights(userId, role, storeId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Dismiss an AI Insight',
    description:
      'Marks an AI insight as dismissed so it no longer appears on the dashboard.',
  })
  @ApiResponse({ status: 200, description: 'Insight dismissed successfully' })
  @Patch('seller/insights/:id/dismiss')
  async dismissInsight(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    return this.analyticsService.dismissInsight(userId, insightId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Export Analytics Reports to CSV',
    description:
      'Exports sales, product performance, customer intelligence, or revenue trends in CSV format.',
  })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @Get('export')
  async exportReport(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: ExportAnalyticsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.analyticsService.exportReport(
      userId,
      role,
      query,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return result.csv;
  }

  @Public()
  @ApiOperation({
    summary: 'Ingest client analytics telemetry event',
    description:
      'Captures non-blocking shopper interaction events such as page views, product views, and cart additions to compute conversion funnels.',
  })
  @ApiResponse({ status: 200, description: 'Event tracked successfully' })
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Req() req: Request,
    @CurrentUser('id') userId?: string,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.analyticsService.trackEvent(dto, userId, ip, userAgent);
  }
}
