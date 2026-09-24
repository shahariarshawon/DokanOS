import ssl
import logging
from typing import Optional
from urllib.parse import urlparse, parse_qs
import asyncpg
from pgvector.asyncpg import register_vector
from app.core.config import settings

logger = logging.getLogger("dokanos.ai.database")

_db_pool: Optional[asyncpg.Pool] = None

def get_ssl_context():
    """Create a permissive SSL context for NeonDB / cloud PostgreSQL."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

async def init_connection(conn: asyncpg.Connection):
    """Register pgvector codec on every connection in the pool."""
    await register_vector(conn)

async def init_db_pool():
    global _db_pool
    if _db_pool is not None:
        return _db_pool

    raw_url = settings.DATABASE_URL
    # Strip Prisma/URL query parameters that asyncpg doesn't parse directly
    parsed = urlparse(raw_url)
    clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    needs_ssl = "sslmode=require" in raw_url or "ssl=require" in raw_url or "neon.tech" in raw_url
    ssl_ctx = get_ssl_context() if needs_ssl else None

    logger.info(f"Connecting to database at {parsed.hostname} (SSL: {bool(ssl_ctx)})")
    
    _db_pool = await asyncpg.create_pool(
        clean_url,
        ssl=ssl_ctx,
        init=init_connection,
        min_size=2,
        max_size=10,
        command_timeout=60,
    )
    logger.info("Database connection pool initialized with pgvector support.")
    return _db_pool

async def get_db_pool() -> asyncpg.Pool:
    global _db_pool
    if _db_pool is None:
        await init_db_pool()
    return _db_pool

async def close_db_pool():
    global _db_pool
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None
        logger.info("Database connection pool closed.")
