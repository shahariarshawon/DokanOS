from fastapi import APIRouter, HTTPException, status
from modules.rag.contracts import (
    ShoppingChatRequest,
    ShoppingChatResponse,
    SellerAssistantRequest,
    SellerAssistantResponse,
    ParsedIntent,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    ReviewAnalysisRequest,
    ReviewAnalysisResponse,
    HybridSearchRequest,
    HybridSearchResponse,
)
from modules.rag.shopping_assistant import shopping_assistant_service
from modules.rag.seller_assistant import seller_assistant_service
from modules.rag.intent_parser import query_intent_parser
from modules.rag.vision_analyzer import vision_analyzer_service
from modules.rag.review_analyzer import review_analyzer_service
from modules.embedding.embedding_service import embedding_service
from modules.rag.vector_search import vector_search_service

router = APIRouter(tags=["AI Shopping, Vision & Intelligence Services"])

@router.post(
    "/shopping/chat",
    response_model=ShoppingChatResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Shopping Assistant RAG Chat",
    description="Conversational shopping assistant that parses user intent, searches pgvector embeddings, and synthesizes grounded recommendations with explicit explanations.",
)
async def chat_shopping_assistant(request: ShoppingChatRequest):
    try:
        return await shopping_assistant_service.chat(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shopping assistant error: {str(e)}",
        )

@router.post(
    "/seller/generate",
    response_model=SellerAssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Seller Copilot Content Generator",
    description="Generates rich markdown product description, SEO keywords, marketing promotional copy, and marketplace tags.",
)
async def generate_seller_copy(request: SellerAssistantRequest):
    try:
        return await seller_assistant_service.generate_product_copy(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seller assistant generation failed: {str(e)}",
        )

@router.post(
    "/vision/analyze",
    response_model=ImageAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Product Image Analyzer",
    description="Extracts product category, primary color, style, materials, and auto-generated titles from uploaded images.",
)
async def analyze_product_image(request: ImageAnalysisRequest):
    try:
        return await vision_analyzer_service.analyze(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision image analysis error: {str(e)}",
        )

@router.post(
    "/reviews/analyze",
    response_model=ReviewAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Customer Review Analyzer",
    description="Analyzes customer feedback to generate overall sentiment, positive points, negative points, common complaints, and executive summaries.",
)
async def analyze_customer_reviews(request: ReviewAnalysisRequest):
    try:
        return await review_analyzer_service.analyze_reviews(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Review analysis error: {str(e)}",
        )

@router.post(
    "/shopping/search",
    response_model=HybridSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Hybrid & Semantic Product Search",
    description="Combines query embedding similarity search with keyword relevance for high precision product discovery.",
)
async def hybrid_search_products(request: HybridSearchRequest):
    import time
    start = time.perf_counter()
    try:
        query_vector = await embedding_service.get_embedding(request.query)
        results = await vector_search_service.search_similar_products(
            query_vector=query_vector,
            limit=request.limit,
            min_price=request.min_price,
            max_price=request.max_price,
            category_id=request.category_id,
            category_hint=request.query,
        )
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        return HybridSearchResponse(
            query=request.query,
            products=results,
            total_found=len(results),
            execution_time_ms=duration_ms,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid search failed: {str(e)}",
        )

@router.post(
    "/rag/parse-intent",
    response_model=ParsedIntent,
    status_code=status.HTTP_200_OK,
    summary="Parse Natural Language Shopping Query Intent",
    description="Understands e-commerce queries, extracting price limits (min/max price), category domains, and feature constraints.",
)
async def parse_query_intent(query: str):
    try:
        return query_intent_parser.parse(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intent parser error: {str(e)}",
        )

