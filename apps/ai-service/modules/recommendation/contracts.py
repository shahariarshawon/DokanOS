from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ContentBasedRecommendationRequest(BaseModel):
    product_id: str = Field(..., description="UUID of source product to find related recommendations for")
    limit: int = Field(6, ge=1, le=20, description="Max recommendations to return")
    price_tolerance_pct: float = Field(0.35, ge=0.05, le=1.0, description="Price band tolerance (e.g. 0.35 = ±35%)")
    same_category_only: bool = Field(False, description="Filter strictly to the same category")

class RecommendedProductItem(BaseModel):
    id: str
    title: str
    slug: str
    price: float
    rating: float
    similarity_score: float = Field(..., description="Vector cosine similarity (0 to 1)")
    composite_score: float = Field(..., description="Combined heuristic score considering vector, category, price, and rating")
    store_name: str
    category_name: Optional[str] = None
    image_url: Optional[str] = None
    match_reasons: List[str] = Field(default_factory=list, description="Explanations for why this item was recommended")
    attributes: Optional[Dict[str, Any]] = None

class RecommendationResponse(BaseModel):
    source_product_id: str
    source_product_title: str
    recommendations: List[RecommendedProductItem] = Field(default_factory=list)
    strategy: str = Field("content_based_pgvector_composite", description="Recommendation algorithm used")
    cached: bool = False
    execution_time_ms: float
