from fastapi import APIRouter, HTTPException, status
from modules.embedding.contracts import (
    TextEmbeddingRequest,
    TextEmbeddingResponse,
    ProductEmbeddingResponse,
    BulkSyncRequest,
    BulkSyncResponse,
)
from modules.embedding.embedding_service import embedding_service
from modules.embedding.pipeline import product_pipeline

router = APIRouter(prefix="/embeddings", tags=["Product Embedding Pipeline"])

@router.post(
    "/generate",
    response_model=TextEmbeddingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate 1536-dim text embedding vector",
    description="Encodes arbitrary text into normalized 1536-dimensional embedding using OpenAI, Gemini, or semantic fallback.",
)
async def generate_text_embedding(request: TextEmbeddingRequest):
    try:
        vec, provider = await embedding_service.get_embedding(request.text, use_cache=request.use_cache)
        return TextEmbeddingResponse(
            dimensions=len(vec),
            embedding=vec,
            cached=provider == "cache",
            provider=provider,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation error: {str(e)}",
        )

@router.post(
    "/product/{product_id}",
    response_model=ProductEmbeddingResponse,
    status_code=status.HTTP_200_OK,
    summary="Index Single Product into pgvector",
    description="Fetches product info (title, description, category, attributes), computes 1536-dim vector, and stores in PostgreSQL pgvector.",
)
async def index_product_embedding(product_id: str):
    try:
        return await product_pipeline.index_product(product_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Product embedding indexing failed: {str(e)}",
        )

@router.post(
    "/sync",
    response_model=BulkSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk Sync Product Vector Embeddings",
    description="Iterates across marketplace products missing pgvector embeddings and computes them in batches.",
)
async def sync_all_embeddings(request: BulkSyncRequest = BulkSyncRequest()):
    try:
        return await product_pipeline.sync_all_products(
            force_reindex=request.force_reindex,
            limit=request.limit,
            batch_size=request.batch_size,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk sync execution failed: {str(e)}",
        )
