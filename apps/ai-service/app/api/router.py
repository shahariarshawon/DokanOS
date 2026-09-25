from fastapi import APIRouter
from modules.embedding.router import router as embeddings_router
from modules.rag.router import router as rag_router
from modules.recommendation.router import router as recommendations_router

api_v1_router = APIRouter(prefix="/v1")

# Mount modular domain routers
api_v1_router.include_router(embeddings_router)
api_v1_router.include_router(rag_router)
api_v1_router.include_router(recommendations_router)
