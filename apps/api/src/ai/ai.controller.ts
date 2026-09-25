import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AiService } from './ai.service.js';
import { ShoppingChatDto } from './dto/shopping-chat.dto.js';
import { SellerGenerateDto } from './dto/seller-generate.dto.js';
import { SyncEmbeddingsDto } from './dto/sync-embeddings.dto.js';
import { RecommendationQueryDto } from './dto/recommendation-query.dto.js';
import { AnalyzeImageDto } from './dto/analyze-image.dto.js';
import { AnalyzeReviewsDto } from './dto/analyze-reviews.dto.js';
import { HybridSearchDto } from './dto/hybrid-search.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  SubscriptionGuard,
  RequireFeature,
} from '../common/guards/subscription.guard.js';

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
  @ApiResponse({
    status: 200,
    description: 'AI conversational response with recommended products',
  })
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async shoppingChat(@Body() dto: ShoppingChatDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.aiService.chatShoppingAssistant(dto, userId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard, SubscriptionGuard)
  @Roles('SELLER', 'ADMIN')
  @RequireFeature('AI Copilot & Product Vision Analyzer')
  @ApiOperation({
    summary: 'AI Seller Assistant (Description, Marketing Text & SEO Copilot)',
    description:
      'Generates high-converting markdown product descriptions, SEO keywords, punchy marketing promotional copy, meta tags, and category tags. Restricted to PRO plan subscribers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated description and SEO metadata',
  })
  @Post('product-description')
  @HttpCode(HttpStatus.OK)
  async generateSellerCopy(@Body() dto: SellerGenerateDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.aiService.generateSellerCopy(dto, userId);
  }

  @Public()
  @ApiOperation({
    summary: 'AI Product Image Analyzer (Vision)',
    description:
      'Extracts product category, primary color, style, materials, and auto-generated title from image URL/base64.',
  })
  @Post('vision/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeImage(@Body() dto: AnalyzeImageDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.aiService.analyzeProductImage(dto, userId);
  }

  @Public()
  @ApiOperation({
    summary: 'AI Hybrid & Semantic Product Search',
    description:
      'Combines query embedding similarity search with keyword relevance for high precision product discovery.',
  })
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async hybridSearch(@Body() dto: HybridSearchDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.aiService.hybridSearch(dto, userId);
  }

  @Public()
  @ApiOperation({
    summary: 'AI Customer Review Analyzer',
    description:
      'Analyzes reviews to generate overall sentiment, positive points, negative points, common complaints, and executive summary.',
  })
  @Post('reviews/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeReviews(@Body() dto: AnalyzeReviewsDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.aiService.analyzeReviews(dto, userId);
  }

  @Public()
  @ApiOperation({
    summary: 'Get Cached Review Analysis',
    description:
      'Retrieves precomputed review sentiment report by productId or storeId.',
  })
  @Get('reviews/analysis')
  async getReviewAnalysis(
    @Query('productId') productId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.aiService.getReviewAnalysis(productId, storeId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get User AI Conversation Memory History',
    description: 'Retrieves previous user AI shopping assistant interactions.',
  })
  @Get('conversations')
  async getUserConversations(@Req() req: any) {
    const userId = req.user?.id || 'demo-user-id';
    return this.aiService.getUserConversations(userId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiOperation({
    summary: 'Get Seller AI Dashboard Insights',
    description:
      'Returns AI-driven seller product performance insights, review sentiment, and growth suggestions.',
  })
  @Get('seller/insights')
  async getSellerInsights(@Req() req: any) {
    const sellerUserId = req.user?.id || 'demo-seller-id';
    return this.aiService.getSellerInsights(sellerUserId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get Admin AI Cost & Token Usage Analytics',
    description:
      'Returns AI request logs, token consumption, and cost tracking per feature.',
  })
  @Get('admin/usage')
  async getAdminUsageMetrics() {
    return this.aiService.getAdminUsageMetrics();
  }

  @Public()
  @ApiOperation({
    summary: 'Get Content-Based Product Recommendations',
    description:
      'Calculates content-based product recommendations using pgvector embedding cosine distance, category matching, price band proximity, and hardware attribute overlap.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of scored product recommendations',
  })
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
