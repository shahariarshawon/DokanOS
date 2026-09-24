from fastapi import APIRouter, HTTPException, status
from app.schemas.shopping import ShoppingChatRequest, ShoppingChatResponse
from app.services.shopping_assistant import shopping_assistant_service

router = APIRouter(prefix="/shopping", tags=["Shopping Assistant"])

@router.post(
    "/chat",
    response_model=ShoppingChatResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Shopping Assistant RAG Chat",
    description="Conversational shopping assistant that searches pgvector for relevant products and returns curated recommendations.",
)
async def chat_shopping_assistant(request: ShoppingChatRequest):
    try:
        return await shopping_assistant_service.chat(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shopping assistant error: {str(e)}"
        )
