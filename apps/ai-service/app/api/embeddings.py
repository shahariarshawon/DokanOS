from fastapi import APIRouter, HTTPException, status
from app.schemas.embedding import (
    ProductEmbeddingResponse,
    BulkSyncRequest,
    BulkSyncResponse,
)
from app.services.product_pipeline import product_pipeline

router = APIRouter(prefix="/embeddings", tags=["Product Embeddings Pipeline"])

@router.post(
    "/product/{product_id}",
    response_model=ProductEmbeddingResponse,
    status_code=status.HTTP_200_OK,
    summary="Index Single Product Embedding",
    description="Computes 1536-dimensional vector for a product and upserts into pgvector.",
)
async def index_product_embedding(product_id: str):
    try:
        return await product_pipeline.index_product(product_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}"
        )

@router.post(
    "/sync",
    response_model=BulkSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk Sync Product Embeddings",
    description="Scans active products missing vector embeddings and generates them in batch.",
)
async def sync_all_embeddings(request: BulkSyncRequest = BulkSyncRequest()):
    try:
        return await product_pipeline.sync_all_products(
            force_reindex=request.force_reindex, limit=request.limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk sync failed: {str(e)}"
        )
