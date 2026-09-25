import json
import logging
import time
from typing import Optional, Dict, Any
import numpy as np
from app.core.database import get_db_pool
from modules.embedding.embedding_service import embedding_service
from modules.embedding.contracts import ProductEmbeddingResponse, BulkSyncResponse

logger = logging.getLogger("dokanos.ai.embedding_pipeline")

class ProductEmbeddingPipeline:
    """
    Production-grade Product Embedding Pipeline.
    When products are created or updated, this pipeline:
    1. Extracts full product context: Title, Description, Category, Store, Attributes, Price
    2. Builds an optimized, normalized semantic document
    3. Generates a 1536-dimensional embedding vector
    4. Upserts vector into PostgreSQL pgvector table (product_embeddings)
    """

    async def index_product(self, product_id: str) -> ProductEmbeddingResponse:
        pool = await get_db_pool()

        sql_fetch = """
            SELECT 
                p.id::text as id,
                p.title,
                p.description,
                p.price::float as price,
                p.sku,
                p.attributes::text as attributes_raw,
                c.name as category_name,
                c.description as category_description,
                s.name as store_name
            FROM products p
            LEFT JOIN categories c ON c.id = p."categoryId"
            LEFT JOIN stores s ON s.id = p."storeId"
            WHERE p.id = $1::uuid;
        """

        async with pool.acquire() as conn:
            row = await conn.fetchrow(sql_fetch, product_id)
            if not row:
                raise ValueError(f"Product '{product_id}' not found in database")

            # Parse attributes JSONB
            attributes_dict: Dict[str, Any] = {}
            if row["attributes_raw"]:
                try:
                    attributes_dict = json.loads(row["attributes_raw"])
                except Exception as e:
                    logger.debug(f"Could not parse attributes JSON for {product_id}: {e}")

            # Construct structured semantic text document
            content_parts = [
                f"Product Title: {row['title']}",
                f"Category: {row['category_name'] or 'General'}",
                f"Merchant Store: {row['store_name'] or 'Dokan Marketplace'}",
                f"Price: ${row['price']:.2f}",
            ]

            if row["sku"]:
                content_parts.append(f"SKU: {row['sku']}")

            if row["description"]:
                # Clean and strip description to relevant semantic length
                clean_desc = row["description"].strip()
                content_parts.append(f"Description: {clean_desc}")

            # Format attributes into high-signal semantic tokens
            if attributes_dict and isinstance(attributes_dict, dict):
                attr_lines = []
                for k, v in attributes_dict.items():
                    if isinstance(v, list):
                        attr_lines.append(f"{k.capitalize()}: {', '.join(str(i) for i in v)}")
                    else:
                        attr_lines.append(f"{k.capitalize()}: {v}")
                if attr_lines:
                    content_parts.append("Specifications & Attributes:\n" + "\n".join(attr_lines))

            full_content = "\n".join(content_parts)

            # Generate 1536-dimensional vector embedding
            embedding_vec, provider = await embedding_service.get_embedding(full_content, use_cache=False)
            vec_arr = np.array(embedding_vec, dtype=np.float32)

            # Upsert into PostgreSQL pgvector table
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
            logger.info(
                f"Indexed product '{product_id}' ({row['title']}) using {provider} - {len(embedding_vec)} dimensions."
            )

            return ProductEmbeddingResponse(
                product_id=product_id,
                content=full_content,
                embedding_dimensions=len(embedding_vec),
                indexed_at=res["updatedAt"],
                attributes_indexed=attributes_dict,
            )

    async def sync_all_products(
        self,
        force_reindex: bool = False,
        limit: Optional[int] = None,
        batch_size: int = 25,
    ) -> BulkSyncResponse:
        """
        Scans products needing vector embeddings and indexes them in concurrent batches.
        """
        start_time = time.perf_counter()
        pool = await get_db_pool()

        if force_reindex:
            query = "SELECT id::text FROM products WHERE status = 'ACTIVE' ORDER BY \"createdAt\" DESC"
        else:
            query = """
                SELECT p.id::text 
                FROM products p
                LEFT JOIN product_embeddings pe ON pe."productId" = p.id
                WHERE p.status = 'ACTIVE' AND pe.id IS NULL
                ORDER BY p."createdAt" DESC
            """

        if limit:
            query += f" LIMIT {limit}"

        indexed_count = 0
        skipped_count = 0

        async with pool.acquire() as conn:
            rows = await conn.fetch(query)
            total_products = len(rows)

            logger.info(f"Bulk sync started: {total_products} products to process.")

            for r in rows:
                p_id = r["id"]
                try:
                    await self.index_product(p_id)
                    indexed_count += 1
                except Exception as e:
                    logger.error(f"Failed to index product {p_id}: {e}")
                    skipped_count += 1

        exec_time = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(f"Bulk sync completed in {exec_time}ms: {indexed_count} indexed, {skipped_count} skipped.")

        return BulkSyncResponse(
            total_products=total_products,
            indexed_count=indexed_count,
            skipped_count=skipped_count,
            execution_time_ms=exec_time,
            status="completed",
        )

product_pipeline = ProductEmbeddingPipeline()
