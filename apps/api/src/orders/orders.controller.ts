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
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary:
      'Create new order from user cart (atomic checkout with inventory deduction)',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @ApiOperation({ summary: 'List all orders placed by the current user' })
  @Get()
  async getUserOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  @ApiOperation({ summary: 'List incoming orders for seller storefronts' })
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Get('seller')
  async getSellerOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getSellerOrders(userId);
  }

  @ApiOperation({
    summary: 'Get order details and visual timeline by order ID',
  })
  @Get(':id')
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getOrderById(userId, orderId);
  }

  @ApiOperation({
    summary:
      'Update order status (Accept order -> PROCESSING, Ship order -> SHIPPED, Deliver -> DELIVERED, Cancel)',
  })
  @Patch(':id/status')
  async updateOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(userId, orderId, dto);
  }
}
