from fastapi import APIRouter, HTTPException, status
from modules.rag.contracts import (
    ShoppingChatRequest,
    ShoppingChatResponse,
    SellerAssistantRequest,
    SellerAssistantResponse,
    ParsedIntent,
)
from modules.rag.shopping_assistant import shopping_assistant_service
from modules.rag.seller_assistant import seller_assistant_service
from modules.rag.intent_parser import query_intent_parser

router = APIRouter(tags=["AI Shopping & Seller Assistants"])

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
