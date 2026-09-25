from fastapi import APIRouter, HTTPException, Query, status
from modules.recommendation.contracts import (
    ContentBasedRecommendationRequest,
    RecommendationResponse,
)
from modules.recommendation.content_based import content_based_recommender

router = APIRouter(prefix="/recommendations", tags=["Product Recommendation Engine"])

@router.get(
    "/products/{product_id}",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Content-Based Product Recommendations",
    description="Calculates content-based recommendations for a target product using pgvector cosine similarity, category matching, price proximity, and attribute overlap.",
)
async def get_product_recommendations(
    product_id: str,
    limit: int = Query(6, ge=1, le=20, description="Max recommended products to return"),
    price_tolerance: float = Query(0.35, ge=0.05, le=1.0, description="Price band tolerance (e.g. 0.35 = ±35%)"),
    same_category: bool = Query(False, description="Filter strictly to same product category"),
):
    try:
        req = ContentBasedRecommendationRequest(
            product_id=product_id,
            limit=limit,
            price_tolerance_pct=price_tolerance,
            same_category_only=same_category,
        )
        return await content_based_recommender.get_recommendations(req)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation computation failed: {str(e)}",
        )

@router.post(
    "/content-based",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute Content-Based Recommendations (POST payload)",
    description="Accepts full configuration parameters to retrieve scored and ranked product recommendations.",
)
async def compute_content_based_recommendations(request: ContentBasedRecommendationRequest):
    try:
        return await content_based_recommender.get_recommendations(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation computation failed: {str(e)}",
        )
