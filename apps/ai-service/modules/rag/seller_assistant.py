import json
import logging
import re
import httpx
from typing import List
from app.core.config import settings
from modules.cache.cache_manager import llm_completion_cache
from modules.rag.contracts import (
    SellerAssistantRequest,
    SellerAssistantResponse,
    SeoMeta,
)
from modules.rag.prompts import (
    SELLER_SYSTEM_PROMPT,
    SELLER_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger("dokanos.ai.seller_assistant")

class SellerAssistantService:
    """
    AI Seller Copilot: Generates high-converting product descriptions, SEO keywords,
    punchy marketing text, and marketplace tags from seller input specifications.
    """

    async def generate_product_copy(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        cache_key = f"seller:{req.product_name.strip().lower()}:{req.category.strip().lower()}:{','.join(req.features)}:{req.tone}"
        cached = llm_completion_cache.get(cache_key)
        if cached:
            cached["cached"] = True
            return SellerAssistantResponse(**cached)

        # 1. Attempt OpenAI
        if settings.OPENAI_API_KEY:
            try:
                res = await self._call_openai_seller(req)
                llm_completion_cache.set(cache_key, res.model_dump(), ttl_seconds=86400)
                return res
            except Exception as e:
                logger.warning(f"OpenAI seller generation failed, falling back: {e}")

        # 2. Attempt Gemini
        if settings.GEMINI_API_KEY:
            try:
                res = await self._call_gemini_seller(req)
                llm_completion_cache.set(cache_key, res.model_dump(), ttl_seconds=86400)
                return res
            except Exception as e:
                logger.warning(f"Gemini seller generation failed, falling back: {e}")

        # 3. High quality algorithmic copywriter fallback
        res = self._generate_algorithmic_copy(req)
        llm_completion_cache.set(cache_key, res.model_dump(), ttl_seconds=86400)
        return res

    def _generate_algorithmic_copy(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        name = req.product_name.strip()
        cat = req.category.strip()
        features = [f.strip() for f in req.features if f.strip()]
        if not features:
            features = ["Engineered with premium durable materials", "Modern ergonomic design"]

        feature_bullets = "\n".join([f"- **{f}**" for f in features])

        # Markdown product description
        description_md = (
            f"### Discover the Next Level of Performance with {name}\n\n"
            f"Designed specifically for enthusiasts in **{cat}**, the **{name}** combines thoughtful engineering "
            f"with sleek, durable aesthetics. Whether you are upgrading your current setup or seeking unmatched daily reliability, "
            f"this item delivers an extraordinary experience from day one.\n\n"
            f"#### Key Features & Highlights:\n"
            f"{feature_bullets}\n\n"
            f"#### Why Shop on DokanOS?\n"
            f"Every purchase is backed by DokanOS verified merchant protection, authentic product guarantees, "
            f"and expedited dispatch. Upgrade today and experience the difference premium craftsmanship makes."
        )

        # SEO keywords extraction
        words = re.findall(r"\b[A-Za-z0-9]{3,}\b", f"{name} {cat} " + " ".join(features))
        unique_words = list(dict.fromkeys([w.lower() for w in words]))
        
        seo_keywords = [
            name.lower(),
            f"best {name.lower()}",
            f"buy {name.lower()} online",
            f"{cat.lower()} deals",
            f"authentic {name.lower()}",
            f"premium {cat.lower()}",
        ] + [w for w in unique_words[:6] if w not in [name.lower(), cat.lower()]]

        # Marketing promotional text
        marketing_text = (
            f"Meet the {name}: your all-in-one upgrade for {cat}. "
            f"Featuring {features[0].lower() if features else 'exceptional build quality'}, "
            "it is built to impress and crafted to last."
        )

        # Standardized tags
        tags = [
            cat.lower().replace(" ", "-"),
            "dokanos-featured",
            "trending-now",
            "premium-tier",
        ] + [f.split()[0].lower() for f in features[:4] if len(f.split()[0]) > 2]
        tags = list(dict.fromkeys(tags))[:8]

        meta_title = f"{name} | Buy Online at DokanOS"[:60]
        first_feature = features[0] if features else "Unbeatable Quality"
        meta_description = (
            f"Shop authentic {name} in {cat} on DokanOS. Enjoy {first_feature.lower()} and verified fast shipping. Order now!"
        )[:155]

        return SellerAssistantResponse(
            description=description_md,
            seo_keywords=seo_keywords[:10],
            marketing_text=marketing_text,
            tags=tags,
            seo_meta=SeoMeta(
                meta_title=meta_title,
                meta_description=meta_description,
                keywords=seo_keywords[:6],
            ),
            key_selling_points=features[:5],
            cached=False,
        )

    async def _call_openai_seller(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        user_prompt = SELLER_USER_PROMPT_TEMPLATE.format(
            name=req.product_name,
            category=req.category,
            tone=req.tone,
            audience=req.target_audience or "general",
            features="\n".join([f"- {f}" for f in req.features]),
        )

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SELLER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.7,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            parsed = json.loads(data["choices"][0]["message"]["content"])
            return SellerAssistantResponse(**parsed)

    async def _call_gemini_seller(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        prompt = (
            f"{SELLER_SYSTEM_PROMPT}\n\n"
            + SELLER_USER_PROMPT_TEMPLATE.format(
                name=req.product_name,
                category=req.category,
                tone=req.tone,
                audience=req.target_audience or "general",
                features="\n".join([f"- {f}" for f in req.features]),
            )
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            clean_json = re.sub(r"^```json\s*|\s*```$", "", raw_text.strip())
            parsed = json.loads(clean_json)
            return SellerAssistantResponse(**parsed)

seller_assistant_service = SellerAssistantService()
