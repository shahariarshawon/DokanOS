import time
import logging
import httpx
from typing import List
from app.core.config import settings
from app.schemas.shopping import (
    ShoppingChatRequest,
    ShoppingChatResponse,
    ProductRecommendation,
)
from app.services.embedding_service import embedding_service
from app.services.vector_search import vector_search_service

logger = logging.getLogger("dokanos.ai.shopping_assistant")

class ShoppingAssistantService:
    async def chat(self, req: ShoppingChatRequest) -> ShoppingChatResponse:
        start_time = time.perf_counter()

        # Step 1 & 2: Generate embedding for user query
        logger.info(f"Generating query embedding for: '{req.query}'")
        query_vector = await embedding_service.get_embedding(req.query)

        # Step 3 & 4: Search pgvector and retrieve matched products
        products = await vector_search_service.search_similar_products(
            query_vector=query_vector,
            limit=req.limit,
            min_price=req.min_price,
            max_price=req.max_price,
            category_id=req.category_id,
        )

        # Step 5: Synthesize conversational response based on retrieved products
        reply = await self._generate_response(req.query, products)

        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        return ShoppingChatResponse(
            reply=reply,
            recommended_products=products,
            conversation_id=req.conversation_id,
            execution_time_ms=exec_time,
        )

    async def _generate_response(
        self, query: str, products: List[ProductRecommendation]
    ) -> str:
        """Generates contextual conversational answer using LLM or structured RAG fallback."""
        if not products:
            return (
                f"I looked across the marketplace for \"{query}\", but couldn't find an exact match "
                "in stock right now. Try adjusting your price filters or browsing our trending categories!"
            )

        # Attempt OpenAI if key is present
        if settings.OPENAI_API_KEY:
            try:
                return await self._call_openai_llm(query, products)
            except Exception as e:
                logger.warning(f"OpenAI LLM completion failed, using intelligent template: {e}")

        # Attempt Gemini if key is present
        if settings.GEMINI_API_KEY:
            try:
                return await self._call_gemini_llm(query, products)
            except Exception as e:
                logger.warning(f"Gemini LLM completion failed, using intelligent template: {e}")

        # Default intelligent RAG response generator
        top_product = products[0]
        other_products = products[1:3]

        lines = [
            f"Based on your search for **\"{query}\"**, here are the best recommendations from our marketplace:\n",
            f"🌟 **Top Match:** **{top_product.title}** by *{top_product.store_name}* for **${top_product.price:.2f}** (Rating: {top_product.rating:.1f} ★).",
        ]
        if top_product.description:
            lines.append(f"> *{top_product.description.strip()}*\n")

        if other_products:
            lines.append("Other notable options to consider:")
            for p in other_products:
                lines.append(f"- **{p.title}** (${p.price:.2f} from *{p.store_name}*)")

        lines.append("\nWould you like more details on any of these items, or should I add one to your cart?")
        return "\n".join(lines)

    async def _call_openai_llm(self, query: str, products: List[ProductRecommendation]) -> str:
        prompt_context = "\n".join(
            [f"- {p.title} (${p.price:.2f}, Store: {p.store_name}): {p.description or 'No description'}" for p in products]
        )
        system_prompt = (
            "You are DokanOS AI Shopping Assistant, a helpful, polite, and knowledgeable e-commerce guide. "
            "Use the provided product context to recommend items that best match the customer query. "
            "Highlight prices, key advantages, and store names. Keep response concise and friendly."
        )
        user_prompt = f"Customer Query: {query}\n\nAvailable Products:\n{prompt_context}"

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 400
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _call_gemini_llm(self, query: str, products: List[ProductRecommendation]) -> str:
        prompt_context = "\n".join(
            [f"- {p.title} (${p.price:.2f}, Store: {p.store_name}): {p.description or 'No description'}" for p in products]
        )
        prompt = (
            f"You are DokanOS AI Shopping Assistant. Help the shopper based on this query: \"{query}\".\n"
            f"Matching products from marketplace:\n{prompt_context}\n"
            "Provide a helpful, friendly recommendation in markdown explaining why these fit the shopper's needs."
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

shopping_assistant_service = ShoppingAssistantService()
