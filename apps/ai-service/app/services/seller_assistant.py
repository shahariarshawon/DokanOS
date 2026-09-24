import json
import logging
import re
import httpx
from typing import List, Dict, Any
from app.core.config import settings
from app.schemas.seller import (
    SellerAssistantRequest,
    SellerAssistantResponse,
    SeoMeta,
)

logger = logging.getLogger("dokanos.ai.seller_assistant")

class SellerAssistantService:
    async def generate_product_copy(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        """
        Generates product description, SEO keywords, and tags from minimal seller attributes.
        """
        # Attempt OpenAI if key is configured
        if settings.OPENAI_API_KEY:
            try:
                return await self._call_openai_seller(req)
            except Exception as e:
                logger.warning(f"OpenAI seller generation failed, falling back: {e}")

        # Attempt Gemini if key is configured
        if settings.GEMINI_API_KEY:
            try:
                return await self._call_gemini_seller(req)
            except Exception as e:
                logger.warning(f"Gemini seller generation failed, falling back: {e}")

        # High quality algorithmic copywriter fallback
        return self._generate_fallback_copy(req)

    def _generate_fallback_copy(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        clean_name = req.product_name.strip()
        clean_cat = req.category.strip()
        features_list = [f.strip() for f in req.features if f.strip()]

        feature_bullets = "\n".join([f"- **{f}**" for f in features_list])

        description_markdown = (
            f"### Elevate Your Experience with the {clean_name}\n\n"
            f"Engineered for excellence in **{clean_cat}**, the **{clean_name}** pairs cutting-edge design "
            f"with reliable performance. Whether you're upgrading your daily setup or demanding peak durability, "
            f"this item delivers unrivaled satisfaction.\n\n"
            f"#### Key Highlights & Features:\n"
            f"{feature_bullets}\n\n"
            f"#### Why Choose {clean_name}?\n"
            f"Built to uncompromising standards, every detail is refined to maximize efficiency and longevity. "
            f"Enjoy premium craftsmanship backed by DokanOS marketplace verified vendor support."
        )

        # Generate SEO keywords
        words = re.findall(r"\b[A-Za-z0-9]{3,}\b", f"{clean_name} {clean_cat} " + " ".join(features_list))
        unique_words = list(dict.fromkeys([w.lower() for w in words]))
        
        seo_keywords = [
            f"{clean_name.lower()}",
            f"best {clean_name.lower()}",
            f"{clean_cat.lower()} online",
            f"buy {clean_name.lower()}",
            f"affordable {clean_name.lower()}"
        ] + [w for w in unique_words[:5] if w not in [clean_name.lower(), clean_cat.lower()]]

        # Generate tags
        tags = [
            clean_cat.lower().replace(" ", "-"),
            "featured",
            "trending",
            "premium-quality",
        ] + [f.split()[0].lower() for f in features_list[:3] if len(f.split()[0]) > 2]
        tags = list(dict.fromkeys(tags))[:8]

        meta_title = f"{clean_name} | Buy Online at DokanOS"
        meta_description = (
            f"Shop {clean_name} in {clean_cat}. Discover top features: "
            f"{', '.join(features_list[:2])}. Fast shipping and guaranteed authenticity."
        )[:155]

        return SellerAssistantResponse(
            description=description_markdown,
            seo_keywords=seo_keywords,
            tags=tags,
            seo_meta=SeoMeta(
                meta_title=meta_title,
                meta_description=meta_description,
                keywords=seo_keywords[:7],
            ),
            key_selling_points=features_list[:5],
        )

    async def _call_openai_seller(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        system_prompt = (
            "You are DokanOS AI Seller Copilot, an elite e-commerce copywriter and SEO expert. "
            "Given product name, category, and feature list, generate compelling markdown product description, "
            "SEO metadata, and tags. You must output strictly valid JSON matching this schema:\n"
            "{\n"
            '  "description": "markdown text",\n'
            '  "seo_keywords": ["keyword1", "keyword2", ...],\n'
            '  "tags": ["tag1", "tag2", ...],\n'
            '  "seo_meta": {\n'
            '    "meta_title": "string",\n'
            '    "meta_description": "string (under 160 chars)",\n'
            '    "keywords": ["string"]\n'
            "  },\n"
            '  "key_selling_points": ["point1", "point2"]\n'
            "}"
        )

        user_prompt = (
            f"Product Name: {req.product_name}\n"
            f"Category: {req.category}\n"
            f"Tone: {req.tone}\n"
            f"Features:\n" + "\n".join([f"- {f}" for f in req.features])
        )

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
            "response_format": {"type": "json_object"},
            "temperature": 0.7
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            parsed = json.loads(data["choices"][0]["message"]["content"])
            return SellerAssistantResponse(**parsed)

    async def _call_gemini_seller(self, req: SellerAssistantRequest) -> SellerAssistantResponse:
        prompt = (
            f"Generate an e-commerce product description, SEO metadata, and tags for DokanOS marketplace.\n"
            f"Product Name: {req.product_name}\n"
            f"Category: {req.category}\n"
            f"Features: {', '.join(req.features)}\n"
            f"Tone: {req.tone}\n\n"
            "Respond ONLY with a JSON object in this exact format:\n"
            "{\n"
            '  "description": "markdown text",\n'
            '  "seo_keywords": ["kw1", "kw2"],\n'
            '  "tags": ["tag1", "tag2"],\n'
            '  "seo_meta": {\n'
            '    "meta_title": "title",\n'
            '    "meta_description": "description",\n'
            '    "keywords": ["kw1"]\n'
            "  },\n"
            '  "key_selling_points": ["point1", "point2"]\n'
            "}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Clean markdown codeblocks if returned
            clean_json = re.sub(r"^```json\s*|\s*```$", "", raw_text.strip())
            parsed = json.loads(clean_json)
            return SellerAssistantResponse(**parsed)

seller_assistant_service = SellerAssistantService()
