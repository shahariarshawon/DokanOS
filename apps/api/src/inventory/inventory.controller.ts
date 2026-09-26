import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { QueryInventoryTransactionsDto } from './dto/query-inventory-transactions.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Prisma, UserRole } from '@prisma/client';

@ApiTags('Inventory Management')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({
    summary:
      'Get seller inventory overview: total products, total stock, low stock, out of stock',
  })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Get('overview')
  async getOverview(@CurrentUser('id') userId: string) {
    return this.inventoryService.getOverview(userId);
  }

  @ApiOperation({
    summary:
      'Get paginated audit trail of inventory adjustments and deductions',
  })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Get('transactions')
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: QueryInventoryTransactionsDto,
  ) {
    return this.inventoryService.getTransactions(userId, query);
  }

  @ApiOperation({
    summary:
      'Adjust inventory stock (+100 added, -5 damage/adjustment, return)',
  })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @CurrentUser('id') userId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(userId, dto);
  }
}
