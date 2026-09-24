from pydantic import BaseModel, Field
from typing import List, Optional

class ShoppingChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Customer shopping query")
    conversation_id: Optional[str] = Field(None, description="Optional conversation session ID")
    limit: int = Field(5, ge=1, le=20, description="Max products to retrieve")
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    category_id: Optional[str] = Field(None, description="Optional category filter")

class ProductRecommendation(BaseModel):
    id: str
    title: str
    slug: str
    price: float
    rating: float
    similarity_score: float
    store_name: str
    image_url: Optional[str] = None
    description: Optional[str] = None

class ShoppingChatResponse(BaseModel):
    reply: str
    recommended_products: List[ProductRecommendation]
    conversation_id: Optional[str] = None
    execution_time_ms: float
