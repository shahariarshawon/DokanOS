from fastapi import APIRouter, HTTPException, status
from app.schemas.seller import SellerAssistantRequest, SellerAssistantResponse
from app.services.seller_assistant import seller_assistant_service

router = APIRouter(prefix="/seller", tags=["Seller Assistant"])

@router.post(
    "/generate",
    response_model=SellerAssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Seller Copilot Generation",
    description="Generates rich product description, SEO keywords, meta tags, and category tags based on product specifications.",
)
async def generate_seller_copy(request: SellerAssistantRequest):
    try:
        return await seller_assistant_service.generate_product_copy(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seller assistant generation failed: {str(e)}"
        )
