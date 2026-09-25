import time
import logging
import httpx
from typing import List, Optional
from app.core.config import settings
from modules.cache.cache_manager import llm_completion_cache
from modules.embedding.embedding_service import embedding_service
from modules.rag.contracts import (
    ShoppingChatRequest,
    ShoppingChatResponse,
    ProductRecommendation,
    ParsedIntent,
)
from modules.rag.intent_parser import query_intent_parser
from modules.rag.vector_search import vector_search_service
from modules.rag.prompts import (
    SHOPPING_SYSTEM_PROMPT,
    SHOPPING_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger("dokanos.ai.shopping_assistant")

class ShoppingAssistantService:
    """
    Production RAG Shopping Assistant.
    Pipeline: User Query -> Intent Extraction -> Embedding -> pgvector ANN Search
              -> Context Augmentation -> LLM Answer Synthesis with Recommendations.
    """

    async def chat(self, req: ShoppingChatRequest) -> ShoppingChatResponse:
        start_time = time.perf_counter()

        # Step 1: Check LLM completion cache
        cache_key = f"chat:{req.query.strip().lower()}:{req.min_price}:{req.max_price}:{req.category_id}:{req.limit}"
        cached_result = llm_completion_cache.get(cache_key)
        if cached_result:
            exec_time = round((time.perf_counter() - start_time) * 1000, 2)
            cached_result["execution_time_ms"] = exec_time
            cached_result["cached"] = True
            return ShoppingChatResponse(**cached_result)

        # Step 2: Understand Query Intent
        intent: ParsedIntent = query_intent_parser.parse(req.query)

        # Resolve price and category constraints (manual filter overrides natural language)
        effective_min_price = req.min_price if req.min_price is not None else intent.min_price
        effective_max_price = req.max_price if req.max_price is not None else intent.max_price
        category_hint = intent.detected_category

        # Step 3: Generate Embedding Vector for query
        query_vector, _ = await embedding_service.get_embedding(req.query, use_cache=True)

        # Step 4: Vector similarity search in pgvector
        products: List[ProductRecommendation] = await vector_search_service.search_similar_products(
            query_vector=query_vector,
            limit=req.limit,
            min_price=effective_min_price,
            max_price=effective_max_price,
            category_id=req.category_id,
            category_hint=category_hint,
        )

        # Step 5: Annotate products with recommendation explanations
        self._annotate_recommendation_reasons(products, intent, effective_max_price)

        # Step 6: Synthesize conversational answer with LLM or high-quality RAG fallback
        reply = await self._generate_response(req.query, products, intent)

        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        result = ShoppingChatResponse(
            reply=reply,
            recommended_products=products,
            intent=intent,
            conversation_id=req.conversation_id,
            cached=False,
            execution_time_ms=exec_time,
        )

        # Cache result for 1 hour
        llm_completion_cache.set(cache_key, result.model_dump(), ttl_seconds=3600)

        return result

    def _annotate_recommendation_reasons(
        self,
        products: List[ProductRecommendation],
        intent: ParsedIntent,
        max_price: Optional[float],
    ) -> None:
        """Adds specific contextual reasons why each product satisfies the query."""
        for p in products:
            reasons = []
            if max_price and p.price <= max_price:
                diff = max_price - p.price
                if diff > 0:
                    reasons.append(f"Comfortably within budget (${diff:.2f} under ${max_price:.2f})")
                else:
                    reasons.append(f"Matches your exact budget of ${max_price:.2f}")

            if p.rating >= 4.5:
                reasons.append(f"Top customer rating ({p.rating:.1f}/5.0 stars)")

            if intent.extracted_features:
                matched_specs = []
                if p.attributes:
                    for feat in intent.extracted_features:
                        for k, v in p.attributes.items():
                            if any(w.lower() in str(v).lower() for w in feat.split()):
                                matched_specs.append(f"{k}: {v}")
                if matched_specs:
                    reasons.append(f"Verified hardware: {', '.join(matched_specs[:2])}")
                else:
                    reasons.append(f"Well-suited for {', '.join(intent.extracted_features[:2])}")

            p.recommendation_reason = " | ".join(reasons) if reasons else "High marketplace semantic relevance"

    async def _generate_response(
        self,
        query: str,
        products: List[ProductRecommendation],
        intent: ParsedIntent,
    ) -> str:
        """Generates grounded answer using OpenAI, Gemini, or intelligent algorithmic fallback."""
        if not products:
            budget_note = f" under ${intent.max_price:.2f}" if intent.max_price else ""
            cat_note = f" in {intent.detected_category}" if intent.detected_category else ""
            return (
                f"I searched our marketplace catalog for **\"{query}\"**{cat_note}{budget_note}, "
                "but couldn't find an in-stock match fitting those exact constraints. "
                "Consider broadening your price range or exploring related categories!"
            )

        # Attempt OpenAI if key is configured
        if settings.OPENAI_API_KEY:
            try:
                return await self._call_openai(query, products)
            except Exception as e:
                logger.warning(f"OpenAI completion failed: {e}")

        # Attempt Gemini if key is configured
        if settings.GEMINI_API_KEY:
            try:
                return await self._call_gemini(query, products)
            except Exception as e:
                logger.warning(f"Gemini completion failed: {e}")

        # Intelligent structured RAG fallback generator
        return self._format_algorithmic_rag_reply(query, products, intent)

    def _format_context_text(self, products: List[ProductRecommendation]) -> str:
        lines = []
        for i, p in enumerate(products, 1):
            attr_str = ""
            if p.attributes:
                attr_str = ", Specs: " + ", ".join(f"{k}={v}" for k, v in list(p.attributes.items())[:3])
            lines.append(
                f"{i}. {p.title} | Price: ${p.price:.2f} | Store: {p.store_name} | Rating: {p.rating:.1f}/5.0"
                f"{attr_str} | Reason: {p.recommendation_reason}"
            )
        return "\n".join(lines)

    async def _call_openai(self, query: str, products: List[ProductRecommendation]) -> str:
        context = self._format_context_text(products)
        user_prompt = SHOPPING_USER_PROMPT_TEMPLATE.format(query=query, context=context)

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SHOPPING_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.6,
            "max_tokens": 500,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _call_gemini(self, query: str, products: List[ProductRecommendation]) -> str:
        context = self._format_context_text(products)
        prompt = f"{SHOPPING_SYSTEM_PROMPT}\n\n{SHOPPING_USER_PROMPT_TEMPLATE.format(query=query, context=context)}"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    def _format_algorithmic_rag_reply(
        self,
        query: str,
        products: List[ProductRecommendation],
        intent: ParsedIntent,
    ) -> str:
        top = products[0]
        others = products[1:4]

        lines = [
            f"Here are my top recommendations for **\"{query}\"** based on marketplace availability, specs, and price value:\n",
            f"### 🏆 Primary Recommendation: **{top.title}**",
            f"- **Price:** **${top.price:.2f}** from *{top.store_name}* (Rating: {top.rating:.1f} ★)",
        ]

        if top.recommendation_reason:
            lines.append(f"- **Why this fits:** {top.recommendation_reason}.")

        if top.description:
            lines.append(f"- **Overview:** {top.description.strip()[:180]}...")

        if others:
            lines.append("\n#### Other Great Options to Consider:")
            for p in others:
                reason = f" — *{p.recommendation_reason}*" if p.recommendation_reason else ""
                lines.append(f"- **{p.title}** for **${p.price:.2f}** ({p.store_name}){reason}")

        lines.append("\nWould you like more details on any of these specifications, or help adding one to your cart?")
        return "\n".join(lines)

shopping_assistant_service = ShoppingAssistantService()
