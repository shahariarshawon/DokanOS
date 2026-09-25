import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import {
  UserRole,
  VerificationStatus,
  StoreStatus,
  AuditAction,
} from '@prisma/client';
import {
  QueryAdminUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/admin-users.dto.js';
import {
  VerifySellerDto,
  ModerateStoreDto,
  ToggleFeatureFlagDto,
} from './dto/admin-operations.dto.js';

@ApiTags('Admin Control Center')
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // -------------------------------------------------------------
  // PUBLIC / COMMON FEATURE FLAGS
  // -------------------------------------------------------------

  @Public()
  @ApiOperation({ summary: 'Get active platform feature flags' })
  @Get('feature-flags')
  getPublicFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  // -------------------------------------------------------------
  // USER MANAGEMENT
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List platform users with filters and pagination' })
  @Get('admin/users')
  async listUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.listUsers(query);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update user account status (ACTIVE, SUSPENDED, DELETED)',
  })
  @Patch('admin/users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserStatus(userId, dto, adminId);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update user system role' })
  @Patch('admin/users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserRole(userId, dto, adminId);
  }

  // -------------------------------------------------------------
  // SELLER APPROVAL & STORE MODERATION
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List registered sellers with verification status' })
  @Get('admin/sellers')
  async listSellers(@Query('status') status?: VerificationStatus) {
    return this.adminService.listSellers(status);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Approve or reject seller verification' })
  @Patch('admin/sellers/:id/verification')
  async verifySeller(
    @Param('id') sellerId: string,
    @Body() dto: VerifySellerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.verifySeller(sellerId, dto, adminId);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List all marketplace stores' })
  @Get('admin/stores')
  async listStores(@Query('status') status?: StoreStatus) {
    return this.adminService.listStores(status);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Moderate store status (ACTIVE, SUSPENDED)' })
  @Patch('admin/stores/:id/moderation')
  async moderateStore(
    @Param('id') storeId: string,
    @Body() dto: ModerateStoreDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.moderateStore(storeId, dto, adminId);
  }

  // -------------------------------------------------------------
  // PAYMENT & ESCROW MONITORING
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get payment gateway and transaction monitoring metrics',
  })
  @Get('admin/payments')
  async getPaymentMonitoring() {
    return this.adminService.getPaymentMonitoring();
  }

  // -------------------------------------------------------------
  // AI USAGE MONITORING
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Monitor LLM token usage and cost metrics' })
  @Get('admin/ai-usage')
  async getAiUsageMonitoring() {
    return this.adminService.getAiUsageMonitoring();
  }

  // -------------------------------------------------------------
  // AUDIT & COMPLIANCE
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Query enterprise audit log trail' })
  @Get('admin/audit-logs')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAuditLogs({
      userId,
      action,
      resource,
      page,
      limit,
    });
  }

  // -------------------------------------------------------------
  // FEATURE FLAGS MANAGEMENT
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List all configurable feature flags' })
  @Get('admin/feature-flags')
  getAdminFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Enable or disable a feature flag' })
  @Patch('admin/feature-flags/:key')
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body() dto: ToggleFeatureFlagDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.toggleFeatureFlag(key, dto.enabled, adminId);
  }
}
