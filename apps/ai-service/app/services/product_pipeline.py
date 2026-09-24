import json
import logging
import time
import numpy as np
from typing import Optional, Dict, Any
from app.core.database import get_db_pool
from app.services.embedding_service import embedding_service
from app.schemas.embedding import ProductEmbeddingResponse, BulkSyncResponse

logger = logging.getLogger("dokanos.ai.pipeline")

class ProductEmbeddingPipeline:
    async def index_product(self, product_id: str) -> ProductEmbeddingResponse:
        """
        Builds semantic text document for a product, computes embedding,
        and upserts into PostgreSQL pgvector table.
        """
        pool = await get_db_pool()

        sql_fetch = """
            SELECT 
                p.id::text as id,
                p.title,
                p.description,
                p.price::float as price,
                p.sku,
                p.attributes::text as attributes,
                c.name as category_name,
                s.name as store_name
            FROM products p
            JOIN categories c ON c.id = p."categoryId"
            JOIN stores s ON s.id = p."storeId"
            WHERE p.id = $1::uuid;
        """

        async with pool.acquire() as conn:
            row = await conn.fetchrow(sql_fetch, product_id)
            if not row:
                raise ValueError(f"Product '{product_id}' not found in database")

            # Construct structured semantic text representation
            content_parts = [
                f"Product: {row['title']}",
                f"Category: {row['category_name']}",
                f"Store: {row['store_name']}",
                f"Price: ${row['price']:.2f}",
            ]
            if row["description"]:
                content_parts.append(f"Description: {row['description'].strip()}")
            if row["sku"]:
                content_parts.append(f"SKU: {row['sku']}")
            if row["attributes"] and row["attributes"] != "{}":
                content_parts.append(f"Features: {row['attributes']}")

            full_content = "\n".join(content_parts)

            # Generate 1536-dim embedding
            embedding_vec = await embedding_service.get_embedding(full_content)
            vec_arr = np.array(embedding_vec, dtype=np.float32)

            # Upsert into product_embeddings table
            sql_upsert = """
                INSERT INTO product_embeddings (
                    id, 
                    "productId", 
                    content, 
                    embedding, 
                    "createdAt", 
                    "updatedAt"
                )
                VALUES (
                    gen_random_uuid(), 
                    $1::uuid, 
                    $2, 
                    $3, 
                    NOW(), 
                    NOW()
                )
                ON CONFLICT ("productId") 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    "updatedAt" = NOW()
                RETURNING "productId", "updatedAt"::text;
            """

            res = await conn.fetchrow(sql_upsert, product_id, full_content, vec_arr)
            logger.info(f"Successfully embedded product {product_id} with {len(embedding_vec)} dimensions.")

            return ProductEmbeddingResponse(
                product_id=product_id,
                content=full_content,
                embedding_dimensions=len(embedding_vec),
                indexed_at=res["updatedAt"],
            )

    async def sync_all_products(
        self, force_reindex: bool = False, limit: Optional[int] = None
    ) -> BulkSyncResponse:
        """
        Scans products needing embeddings and indexes them sequentially.
        """
        start_time = time.perf_counter()
        pool = await get_db_pool()

        if force_reindex:
            query = "SELECT id::text FROM products WHERE status = 'ACTIVE'"
        else:
            query = """
                SELECT p.id::text 
                FROM products p
                LEFT JOIN product_embeddings pe ON pe."productId" = p.id
                WHERE p.status = 'ACTIVE' AND pe.id IS NULL
            """

        if limit:
            query += f" LIMIT {limit}"

        indexed_count = 0
        skipped_count = 0

        async with pool.acquire() as conn:
            rows = await conn.fetch(query)
            total_products = len(rows)

            for r in rows:
                p_id = r["id"]
                try:
                    await self.index_product(p_id)
                    indexed_count += 1
                except Exception as e:
                    logger.error(f"Failed to index product {p_id}: {e}")
                    skipped_count += 1

        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        return BulkSyncResponse(
            total_products=total_products,
            indexed_count=indexed_count,
            skipped_count=skipped_count,
            execution_time_ms=exec_time,
        )

product_pipeline = ProductEmbeddingPipeline()
