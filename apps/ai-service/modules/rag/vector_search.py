import json
import logging
from typing import List, Optional, Dict, Any
import numpy as np
from app.core.database import get_db_pool
from modules.rag.contracts import ProductRecommendation

logger = logging.getLogger("dokanos.ai.vector_search")

class VectorSearchService:
    """
    High-performance vector similarity search over product embeddings using PostgreSQL pgvector.
    Utilizes cosine distance operator (<=>) with dynamic filtering on price bounds,
    stock availability, and product category.
    """

    async def search_similar_products(
        self,
        query_vector: List[float],
        limit: int = 5,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        category_id: Optional[str] = None,
        category_hint: Optional[str] = None,
    ) -> List[ProductRecommendation]:
        pool = await get_db_pool()
        vec_arr = np.array(query_vector, dtype=np.float32)

        where_clauses = ["p.status = 'ACTIVE'", "p.\"stockQuantity\" > 0"]
        params: list[Any] = [vec_arr, limit]
        param_idx = 3

        if min_price is not None:
            where_clauses.append(f"p.price >= ${param_idx}")
            params.append(min_price)
            param_idx += 1

        if max_price is not None:
            where_clauses.append(f"p.price <= ${param_idx}")
            params.append(max_price)
            param_idx += 1

        if category_id is not None:
            where_clauses.append(f"p.\"categoryId\" = ${param_idx}::uuid")
            params.append(category_id)
            param_idx += 1
        elif category_hint:
            where_clauses.append(f"(c.name ILIKE ${param_idx} OR c.slug ILIKE ${param_idx})")
            params.append(f"%{category_hint}%")
            param_idx += 1

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT 
                p.id::text as id,
                p.title,
                p.slug,
                p.price::float as price,
                p.rating::float as rating,
                p.description,
                p.attributes::text as attributes_raw,
                s.name as store_name,
                (1.0 - (pe.embedding <=> $1)) as similarity,
                (
                    SELECT pi.url 
                    FROM product_images pi 
                    WHERE pi."productId" = p.id 
                    ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC 
                    LIMIT 1
                ) as image_url
            FROM product_embeddings pe
            JOIN products p ON p.id = pe."productId"
            JOIN stores s ON s.id = p."storeId"
            LEFT JOIN categories c ON c.id = p."categoryId"
            WHERE {where_sql}
            ORDER BY pe.embedding <=> $1 ASC
            LIMIT $2;
        """

        results: List[ProductRecommendation] = []

        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql, *params)
                for r in rows:
                    similarity = float(r["similarity"] or 0.0)
                    parsed_attrs = None
                    if r["attributes_raw"]:
                        try:
                            parsed_attrs = json.loads(r["attributes_raw"])
                        except Exception:
                            parsed_attrs = None

                    results.append(
                        ProductRecommendation(
                            id=r["id"],
                            title=r["title"],
                            slug=r["slug"],
                            price=r["price"],
                            rating=r["rating"],
                            similarity_score=round(max(0.0, similarity), 4),
                            store_name=r["store_name"],
                            image_url=r["image_url"],
                            description=r["description"][:250] if r["description"] else None,
                            attributes=parsed_attrs,
                        )
                    )
        except Exception as e:
            logger.error(f"Vector search failed: {e}", exc_info=True)

        # Fallback to ILIKE text search if no vector results were found
        if not results:
            logger.info("No vector embeddings matched criteria; running text fallback search.")
            results = await self._fallback_text_search(
                query_limit=limit,
                min_price=min_price,
                max_price=max_price,
                category_hint=category_hint,
            )

        return results

    async def _fallback_text_search(
        self,
        query_limit: int = 5,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        category_hint: Optional[str] = None,
    ) -> List[ProductRecommendation]:
        """Relational database fallback when vector embeddings are not yet synchronized."""
        pool = await get_db_pool()
        where_clauses = ["p.status = 'ACTIVE'", "p.\"stockQuantity\" > 0"]
        params: list[Any] = [query_limit]
        param_idx = 2

        if min_price is not None:
            where_clauses.append(f"p.price >= ${param_idx}")
            params.append(min_price)
            param_idx += 1

        if max_price is not None:
            where_clauses.append(f"p.price <= ${param_idx}")
            params.append(max_price)
            param_idx += 1

        if category_hint:
            where_clauses.append(f"(p.title ILIKE ${param_idx} OR c.name ILIKE ${param_idx})")
            params.append(f"%{category_hint}%")
            param_idx += 1

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT 
                p.id::text as id,
                p.title,
                p.slug,
                p.price::float as price,
                p.rating::float as rating,
                p.description,
                p.attributes::text as attributes_raw,
                s.name as store_name,
                (
                    SELECT pi.url 
                    FROM product_images pi 
                    WHERE pi."productId" = p.id 
                    ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC 
                    LIMIT 1
                ) as image_url
            FROM products p
            JOIN stores s ON s.id = p."storeId"
            LEFT JOIN categories c ON c.id = p."categoryId"
            WHERE {where_sql}
            ORDER BY p.rating DESC, p."createdAt" DESC
            LIMIT $1;
        """

        results: List[ProductRecommendation] = []
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql, *params)
                for r in rows:
                    parsed_attrs = None
                    if r["attributes_raw"]:
                        try:
                            parsed_attrs = json.loads(r["attributes_raw"])
                        except Exception:
                            parsed_attrs = None

                    results.append(
                        ProductRecommendation(
                            id=r["id"],
                            title=r["title"],
                            slug=r["slug"],
                            price=r["price"],
                            rating=r["rating"],
                            similarity_score=0.75,
                            store_name=r["store_name"],
                            image_url=r["image_url"],
                            description=r["description"][:250] if r["description"] else None,
                            attributes=parsed_attrs,
                        )
                    )
        except Exception as e:
            logger.error(f"Fallback text search error: {e}")

        return results

vector_search_service = VectorSearchService()
