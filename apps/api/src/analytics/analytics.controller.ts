import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import { SellerAnalyticsQueryDto } from './dto/seller-analytics-query.dto.js';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';
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
  @ApiResponse({ status: 200, description: 'Admin platform analytics dashboard data' })
  @Get('admin/dashboard')
  async getAdminDashboard(@Query() query: AdminAnalyticsQueryDto) {
    return this.analyticsService.getAdminDashboard(query);
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
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.analyticsService.trackEvent(dto, userId, ip, userAgent);
  }
}
