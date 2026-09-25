import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { ShoppingChatDto } from './dto/shopping-chat.dto.js';
import { SellerGenerateDto } from './dto/seller-generate.dto.js';
import { SyncEmbeddingsDto } from './dto/sync-embeddings.dto.js';
import { RecommendationQueryDto } from './dto/recommendation-query.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('AI Intelligence')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @ApiOperation({
    summary: 'AI Shopping Assistant Chat (RAG + pgvector)',
    description:
      'Natural language conversational search. Embeds user query, queries pgvector database using cosine distance, and synthesizes contextual product recommendations with transparent explanations.',
  })
  @ApiResponse({ status: 200, description: 'AI conversational response with recommended products' })
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async shoppingChat(@Body() dto: ShoppingChatDto) {
    return this.aiService.chatShoppingAssistant(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiOperation({
    summary: 'AI Seller Assistant (Description, Marketing Text & SEO Copilot)',
    description:
      'Generates high-converting markdown product descriptions, SEO keywords, punchy marketing promotional copy, meta tags, and category tags.',
  })
  @ApiResponse({ status: 200, description: 'Generated description and SEO metadata' })
  @Post('product-description')
  @HttpCode(HttpStatus.OK)
  async generateSellerCopy(@Body() dto: SellerGenerateDto) {
    return this.aiService.generateSellerCopy(dto);
  }

  @Public()
  @ApiOperation({
    summary: 'Get Content-Based Product Recommendations',
    description:
      'Calculates content-based product recommendations using pgvector embedding cosine distance, category matching, price band proximity, and hardware attribute overlap.',
  })
  @ApiResponse({ status: 200, description: 'List of scored product recommendations' })
  @Get('recommendations/:productId')
  async getRecommendations(
    @Param('productId') productId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.aiService.getProductRecommendations(productId, query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Trigger bulk pgvector embedding synchronization',
    description:
      'Iterates across marketplace products and generates 1536-dimensional vector embeddings stored in pgvector table.',
  })
  @ApiResponse({ status: 200, description: 'Bulk sync summary' })
  @Post('embeddings/sync')
  @HttpCode(HttpStatus.OK)
  async syncEmbeddings(@Body() dto: SyncEmbeddingsDto) {
    return this.aiService.syncAllEmbeddings(dto);
  }
}
