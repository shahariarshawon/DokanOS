from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TextEmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Input text to generate vector embedding for")
    use_cache: bool = Field(True, description="Whether to check and store in memory embedding cache")

class TextEmbeddingResponse(BaseModel):
    dimensions: int = Field(1536, description="Dimension count of embedding vector")
    embedding: List[float] = Field(..., description="1536-dimensional floating point vector")
    cached: bool = Field(False, description="Whether result was served from cache")
    provider: str = Field("openai", description="Provider used: openai, gemini, or semantic_projection_fallback")

class ProductEmbeddingRequest(BaseModel):
    product_id: str = Field(..., description="UUID of product to generate embedding for")

class ProductEmbeddingResponse(BaseModel):
    product_id: str = Field(..., description="UUID of indexed product")
    content: str = Field(..., description="Constructed semantic text representation used for embedding")
    embedding_dimensions: int = Field(1536, description="Vector dimension size stored in pgvector")
    indexed_at: str = Field(..., description="ISO timestamp of indexing completion")
    attributes_indexed: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parsed attributes indexed")

class BulkSyncRequest(BaseModel):
    force_reindex: bool = Field(False, description="Whether to re-generate embeddings for already indexed products")
    limit: Optional[int] = Field(None, ge=1, le=2000, description="Max products to index in this batch")
    batch_size: int = Field(25, ge=1, le=100, description="Concurrent chunk size for batch processing")

class BulkSyncResponse(BaseModel):
    total_products: int = Field(..., description="Total candidate products in queue")
    indexed_count: int = Field(..., description="Number of products successfully embedded and upserted")
    skipped_count: int = Field(..., description="Number of products skipped or failed")
    execution_time_ms: float = Field(..., description="Total execution duration in milliseconds")
    status: str = Field("completed", description="Batch sync outcome status")
