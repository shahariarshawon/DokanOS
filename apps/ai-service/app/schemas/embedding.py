from pydantic import BaseModel, Field
from typing import Optional

class ProductEmbeddingRequest(BaseModel):
    product_id: str = Field(..., description="UUID of product to generate embedding for")

class ProductEmbeddingResponse(BaseModel):
    product_id: str
    content: str
    embedding_dimensions: int
    indexed_at: str

class BulkSyncRequest(BaseModel):
    force_reindex: bool = Field(False, description="Re-generate embeddings for already indexed products")
    limit: Optional[int] = Field(None, ge=1, le=1000, description="Max products to index in this batch")

class BulkSyncResponse(BaseModel):
    total_products: int
    indexed_count: int
    skipped_count: int
    execution_time_ms: float
