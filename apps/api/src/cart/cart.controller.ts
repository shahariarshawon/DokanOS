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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: 'Get current user cart with live stock status and subtotal',
  })
  @Get()
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getOrCreateCart(userId);
  }

  @ApiOperation({ summary: 'Add product to cart or increment quantity' })
  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(userId, dto);
  }

  @ApiOperation({ summary: 'Update item quantity in cart (0 removes item)' })
  @Patch('items/:itemId')
  async updateQuantity(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(userId, itemId, dto.quantity);
  }

  @ApiOperation({ summary: 'Remove a specific item from cart' })
  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @ApiOperation({ summary: 'Empty entire cart' })
  @Delete()
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
