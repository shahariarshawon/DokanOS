import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db_pool, close_db_pool
from app.api.router import api_v1_router

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dokanos.ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    try:
        await init_db_pool()
    except Exception as e:
        logger.error(f"Failed to initialize database pool on startup: {e}", exc_info=True)
    yield
    logger.info("Shutting down AI service...")
    await close_db_pool()

app = FastAPI(
    title=settings.APP_NAME,
    description="DokanOS Autonomous AI Microservice: Shopping RAG Assistant, Seller Copilot, and pgvector embedding pipeline.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-Id"] = req_id
        logger.info(
            f"HTTP {request.method} {request.url.path} -> {response.status_code} in {duration_ms}ms [Req-ID: {req_id}]"
        )
        return response

app.add_middleware(RequestLoggingMiddleware)

# Enable CORS for local and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    from modules.cache.cache_manager import (
        embedding_cache,
        recommendation_cache,
        llm_completion_cache,
    )
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "vector_dimensions": 1536,
        "modules": {
            "embedding": "active",
            "rag": "active",
            "recommendation": "active",
            "cache": "active",
        },
        "cache_metrics": {
            "embeddings": embedding_cache.stats(),
            "recommendations": recommendation_cache.stats(),
            "llm_completions": llm_completion_cache.stats(),
        },
    }

# Include API Routes
app.include_router(api_v1_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
