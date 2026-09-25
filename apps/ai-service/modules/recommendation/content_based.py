import json
import logging
import time
from typing import List, Optional, Dict, Any
import numpy as np
from app.core.database import get_db_pool
from modules.cache.cache_manager import recommendation_cache
from modules.embedding.pipeline import product_pipeline
from modules.recommendation.contracts import (
    ContentBasedRecommendationRequest,
    RecommendationResponse,
    RecommendedProductItem,
)

logger = logging.getLogger("dokanos.ai.recommendation")

class ContentBasedRecommender:
    """
    Content-Based Product Recommendation Engine.
    Combines:
    1. Vector Semantic Similarity (pgvector cosine distance)
    2. Category Context & Hierarchy Match
    3. Price Band Proximity
    4. Hardware & Attribute Overlap
    5. Customer Rating & Availability
    """

    async def get_recommendations(
        self, req: ContentBasedRecommendationRequest
    ) -> RecommendationResponse:
        start_time = time.perf_counter()
        cache_key = f"rec:{req.product_id}:{req.limit}:{req.price_tolerance_pct}:{req.same_category_only}"

        cached = recommendation_cache.get(cache_key)
        if cached:
            exec_time = round((time.perf_counter() - start_time) * 1000, 2)
            cached["execution_time_ms"] = exec_time
            cached["cached"] = True
            return RecommendationResponse(**cached)

        pool = await get_db_pool()

        # Step 1: Fetch source product metadata and embedding
        sql_source = """
            SELECT 
                p.id::text as id,
                p.title,
                p.price::float as price,
                p."categoryId"::text as category_id,
                p.attributes::text as attributes_raw,
                c.name as category_name,
                pe.embedding
            FROM products p
            LEFT JOIN categories c ON c.id = p."categoryId"
            LEFT JOIN product_embeddings pe ON pe."productId" = p.id
            WHERE p.id = $1::uuid;
        """

        async with pool.acquire() as conn:
            source_row = await conn.fetchrow(sql_source, req.product_id)
            if not source_row:
                raise ValueError(f"Product '{req.product_id}' not found")

            source_title = source_row["title"]
            source_price = source_row["price"] or 1.0
            source_cat_id = source_row["category_id"]
            source_cat_name = source_row["category_name"] or "General"
            source_embedding = source_row["embedding"]

            source_attrs = {}
            if source_row["attributes_raw"]:
                try:
                    source_attrs = json.loads(source_row["attributes_raw"])
                except Exception:
                    source_attrs = {}

        # If product is not embedded yet, trigger immediate on-demand indexing
        if source_embedding is None:
            logger.info(f"Source product '{req.product_id}' lacks embedding; indexing on demand.")
            try:
                emb_res = await product_pipeline.index_product(req.product_id)
                # Re-fetch embedding vector from db
                async with pool.acquire() as conn:
                    emb_row = await conn.fetchrow(
                        'SELECT embedding FROM product_embeddings WHERE "productId" = $1::uuid',
                        req.product_id,
                    )
                    if emb_row and emb_row["embedding"] is not None:
                        source_embedding = emb_row["embedding"]
            except Exception as e:
                logger.warning(f"On-demand embedding failed for '{req.product_id}': {e}")

        # Step 2: Query candidate products
        items = []
        if source_embedding is not None:
            items = await self._vector_content_search(
                source_id=req.product_id,
                source_embedding=source_embedding,
                source_price=source_price,
                source_cat_id=source_cat_id,
                source_attrs=source_attrs,
                limit=req.limit,
                price_tolerance=req.price_tolerance_pct,
                same_category_only=req.same_category_only,
            )

        # Fallback to relational heuristic if no vector results
        if not items:
            logger.info(f"Using relational fallback recommendation for '{req.product_id}'")
            items = await self._relational_content_search(
                source_id=req.product_id,
                source_price=source_price,
                source_cat_id=source_cat_id,
                source_attrs=source_attrs,
                limit=req.limit,
            )

        exec_time = round((time.perf_counter() - start_time) * 1000, 2)
        response = RecommendationResponse(
            source_product_id=req.product_id,
            source_product_title=source_title,
            recommendations=items,
            strategy="content_based_pgvector_composite" if source_embedding is not None else "relational_category_price",
            cached=False,
            execution_time_ms=exec_time,
        )

        recommendation_cache.set(cache_key, response.model_dump(), ttl_seconds=600)
        return response

    async def _vector_content_search(
        self,
        source_id: str,
        source_embedding: Any,
        source_price: float,
        source_cat_id: str,
        source_attrs: Dict[str, Any],
        limit: int,
        price_tolerance: float,
        same_category_only: bool,
    ) -> List[RecommendedProductItem]:
        pool = await get_db_pool()

        # Calculate price bounds
        min_p = max(0.0, source_price * (1.0 - price_tolerance))
        max_p = source_price * (1.0 + price_tolerance)

        where_clauses = [
            "p.id != $1::uuid",
            "p.status = 'ACTIVE'",
            "p.\"stockQuantity\" > 0",
        ]
        params: list[Any] = [source_id, source_embedding, limit * 2]
        param_idx = 4

        if same_category_only and source_cat_id:
            where_clauses.append(f"p.\"categoryId\" = ${param_idx}::uuid")
            params.append(source_cat_id)
            param_idx += 1

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT 
                p.id::text as id,
                p.title,
                p.slug,
                p.price::float as price,
                p.rating::float as rating,
                p.attributes::text as attributes_raw,
                p."categoryId"::text as category_id,
                c.name as category_name,
                s.name as store_name,
                (1.0 - (pe.embedding <=> $2)) as similarity,
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
            ORDER BY pe.embedding <=> $2 ASC
            LIMIT $3;
        """

        candidates = []
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql, *params)
                for r in rows:
                    sim = float(r["similarity"] or 0.0)
                    price = float(r["price"] or 0.0)
                    rating = float(r["rating"] or 0.0)
                    cat_id = r["category_id"]

                    # Heuristic 1: Category Match
                    cat_match = 1.0 if cat_id == source_cat_id else 0.0

                    # Heuristic 2: Price Proximity
                    price_diff = abs(price - source_price)
                    price_proximity = max(0.0, 1.0 - (price_diff / max(source_price, 1.0)))

                    # Heuristic 3: Attribute Overlap
                    attr_match_score = 0.0
                    matched_specs = []
                    candidate_attrs = {}
                    if r["attributes_raw"]:
                        try:
                            candidate_attrs = json.loads(r["attributes_raw"])
                        except Exception:
                            candidate_attrs = {}

                    if source_attrs and candidate_attrs:
                        overlap_keys = set(source_attrs.keys()) & set(candidate_attrs.keys())
                        for k in overlap_keys:
                            if str(source_attrs[k]).lower() == str(candidate_attrs[k]).lower():
                                attr_match_score += 0.3
                                matched_specs.append(f"Matching {k}: {source_attrs[k]}")
                        attr_match_score = min(1.0, attr_match_score)

                    # Composite Scoring formula
                    composite = (
                        0.45 * sim +
                        0.25 * cat_match +
                        0.15 * price_proximity +
                        0.10 * (rating / 5.0) +
                        0.05 * attr_match_score
                    )

                    # Match explanations
                    reasons = []
                    if cat_match == 1.0:
                        reasons.append(f"Same Category ({r['category_name']})")
                    if min_p <= price <= max_p:
                        reasons.append(f"Similar price tier (${price:.2f} vs ${source_price:.2f})")
                    if sim >= 0.70:
                        reasons.append(f"{int(sim * 100)}% visual & descriptive similarity")
                    if matched_specs:
                        reasons.extend(matched_specs[:2])
                    if rating >= 4.5:
                        reasons.append(f"Customer favorite ({rating:.1f} ★)")

                    candidates.append(
                        RecommendedProductItem(
                            id=r["id"],
                            title=r["title"],
                            slug=r["slug"],
                            price=price,
                            rating=rating,
                            similarity_score=round(max(0.0, sim), 4),
                            composite_score=round(composite, 4),
                            store_name=r["store_name"],
                            category_name=r["category_name"],
                            image_url=r["image_url"],
                            match_reasons=reasons or ["Semantically related catalog item"],
                            attributes=candidate_attrs,
                        )
                    )
        except Exception as e:
            logger.error(f"Vector content recommendation search failed: {e}", exc_info=True)

        # Sort by composite score descending
        candidates.sort(key=lambda x: x.composite_score, reverse=True)
        return candidates[:limit]

    async def _relational_content_search(
        self,
        source_id: str,
        source_price: float,
        source_cat_id: str,
        source_attrs: Dict[str, Any],
        limit: int,
    ) -> List[RecommendedProductItem]:
        pool = await get_db_pool()

        sql = """
            SELECT 
                p.id::text as id,
                p.title,
                p.slug,
                p.price::float as price,
                p.rating::float as rating,
                p.attributes::text as attributes_raw,
                p."categoryId"::text as category_id,
                c.name as category_name,
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
            WHERE p.id != $1::uuid
              AND p.status = 'ACTIVE'
              AND p."stockQuantity" > 0
              AND (p."categoryId" = $2::uuid OR p.price BETWEEN $3 AND $4)
            ORDER BY (p."categoryId" = $2::uuid) DESC, p.rating DESC
            LIMIT $5;
        """

        min_p = max(0.0, source_price * 0.6)
        max_p = source_price * 1.4
        items = []

        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql, source_id, source_cat_id, min_p, max_p, limit)
                for r in rows:
                    price = float(r["price"] or 0.0)
                    rating = float(r["rating"] or 0.0)
                    reasons = []
                    if r["category_id"] == source_cat_id:
                        reasons.append(f"In same category: {r['category_name']}")
                    if min_p <= price <= max_p:
                        reasons.append(f"Comparable price (${price:.2f})")
                    if rating >= 4.0:
                        reasons.append(f"High customer rating ({rating:.1f} ★)")

                    items.append(
                        RecommendedProductItem(
                            id=r["id"],
                            title=r["title"],
                            slug=r["slug"],
                            price=price,
                            rating=rating,
                            similarity_score=0.70,
                            composite_score=0.75,
                            store_name=r["store_name"],
                            category_name=r["category_name"],
                            image_url=r["image_url"],
                            match_reasons=reasons or ["Featured marketplace item"],
                        )
                    )
        except Exception as e:
            logger.error(f"Relational recommendation search failed: {e}")

        return items

content_based_recommender = ContentBasedRecommender()
