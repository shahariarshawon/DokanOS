from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ParsedIntent(BaseModel):
    query: str
    detected_category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    extracted_features: List[str] = Field(default_factory=list)
    semantic_intent: str = "general_search"

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
    attributes: Optional[Dict[str, Any]] = None
    recommendation_reason: Optional[str] = None

class ShoppingChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Customer shopping question or query")
    conversation_id: Optional[str] = Field(None, description="Optional conversation session ID")
    limit: int = Field(5, ge=1, le=20, description="Max products to retrieve")
    min_price: Optional[float] = Field(None, ge=0, description="Optional manual minimum price filter")
    max_price: Optional[float] = Field(None, ge=0, description="Optional manual maximum price filter")
    category_id: Optional[str] = Field(None, description="Optional manual category UUID filter")

class ShoppingChatResponse(BaseModel):
    reply: str = Field(..., description="Conversational, grounded LLM recommendation answer")
    recommended_products: List[ProductRecommendation] = Field(default_factory=list)
    intent: Optional[ParsedIntent] = None
    conversation_id: Optional[str] = None
    cached: bool = False
    execution_time_ms: float

class SeoMeta(BaseModel):
    meta_title: str = Field(..., description="SEO page title (< 60 chars)")
    meta_description: str = Field(..., description="SEO meta description (< 160 chars)")
    keywords: List[str] = Field(default_factory=list, description="Target search engine keywords")

class SellerAssistantRequest(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=200, description="Product title / name")
    category: str = Field(..., min_length=2, max_length=100, description="Product category name")
    features: List[str] = Field(..., min_length=1, description="List of key product specifications and features")
    tone: str = Field("PROFESSIONAL", description="Tone of voice: PROFESSIONAL, PERSUASIVE, LUXURY, CASUAL, TECHNICAL")
    target_audience: Optional[str] = Field("general", description="Target customer persona, e.g. gamers, professionals, students")

class SellerAssistantResponse(BaseModel):
    description: str = Field(..., description="Rich markdown formatted product description")
    seo_keywords: List[str] = Field(..., description="High conversion SEO keywords")
    marketing_text: str = Field(..., description="Punchy promotional marketing copy for ads and banners")
    tags: List[str] = Field(..., description="Standardized marketplace tags")
    seo_meta: SeoMeta
    key_selling_points: List[str]
    cached: bool = False
