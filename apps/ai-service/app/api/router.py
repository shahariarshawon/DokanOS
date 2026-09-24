from fastapi import APIRouter
from app.api.shopping import router as shopping_router
from app.api.seller import router as seller_router
from app.api.embeddings import router as embeddings_router

api_v1_router = APIRouter(prefix="/v1")

api_v1_router.include_router(shopping_router)
api_v1_router.include_router(seller_router)
api_v1_router.include_router(embeddings_router)
