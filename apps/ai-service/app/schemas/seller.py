from pydantic import BaseModel, Field
from typing import List, Optional

class SeoMeta(BaseModel):
    meta_title: str
    meta_description: str
    keywords: List[str]

class SellerAssistantRequest(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=200, description="Product title / name")
    category: str = Field(..., min_length=2, max_length=100, description="Product category name")
    features: List[str] = Field(..., min_length=1, description="List of key product specifications and features")
    tone: str = Field("PROFESSIONAL", description="Tone of voice: PROFESSIONAL, PERSUASIVE, LUXURY, MINIMAL")

class SellerAssistantResponse(BaseModel):
    description: str = Field(..., description="Rich markdown formatted product description")
    seo_keywords: List[str] = Field(..., description="High conversion SEO keywords")
    tags: List[str] = Field(..., description="Standardized product tags")
    seo_meta: SeoMeta
    key_selling_points: List[str]
