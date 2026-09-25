import re
import logging
from typing import Optional
from modules.rag.contracts import ParsedIntent

logger = logging.getLogger("dokanos.ai.intent_parser")

CATEGORY_KEYWORDS = {
    "laptop": ["laptop", "notebook", "macbook", "chromebook", "ultrabook", "thinkpad"],
    "smartphone": ["phone", "smartphone", "iphone", "android", "mobile", "samsung galaxy"],
    "audio": ["headphone", "earphone", "earbuds", "speaker", "soundbar", "airpods"],
    "computing": ["computer", "desktop", "pc", "monitor", "cpu", "gpu", "keyboard", "mouse"],
    "wearables": ["watch", "smartwatch", "fitness tracker", "band"],
    "cameras": ["camera", "dslr", "mirrorless", "lens", "tripod"],
    "apparel": ["shirt", "t-shirt", "jacket", "pants", "shoes", "sneakers", "hoodie"],
    "home": ["desk", "chair", "furniture", "lamp", "vacuum", "blender"],
}

USE_CASE_FEATURES = {
    "programming": ["16GB RAM or higher", "Fast multi-core processor", "High-speed SSD", "Comfortable keyboard"],
    "coding": ["16GB RAM or higher", "Fast multi-core processor", "High-speed SSD"],
    "gaming": ["Dedicated GPU", "High refresh rate screen", "Advanced thermal cooling"],
    "design": ["High resolution display", "Accurate color gamut (sRGB/DCI-P3)", "Dedicated graphics"],
    "travel": ["Long battery life", "Lightweight build under 1.5kg", "Compact form factor"],
    "student": ["Good battery endurance", "Affordable price-to-performance", "Portability"],
    "office": ["Quiet operation", "Clear webcam & microphone", "Ergonomic design"],
}

class QueryIntentParser:
    """
    High-accuracy, zero-latency natural language intent parser for e-commerce search queries.
    Extracts price boundaries, category domains, use-case specifications, and search tokens.
    """

    def parse(self, query: str) -> ParsedIntent:
        clean_q = query.strip()
        lower_q = clean_q.lower()

        min_price, max_price = self._extract_price_bounds(lower_q)
        detected_category = self._detect_category(lower_q)
        features = self._extract_features(lower_q)

        intent_type = "product_search"
        if any(term in lower_q for term in ["suggest", "recommend", "best", "compare", "what is"]):
            intent_type = "recommendation_request"

        parsed = ParsedIntent(
            query=clean_q,
            detected_category=detected_category,
            min_price=min_price,
            max_price=max_price,
            extracted_features=features,
            semantic_intent=intent_type,
        )

        logger.info(
            f"Parsed intent for '{clean_q}': Cat={detected_category}, Price=[{min_price}, {max_price}], Features={features}"
        )
        return parsed

    def _extract_price_bounds(self, text: str) -> tuple[Optional[float], Optional[float]]:
        min_p = None
        max_p = None

        # Pattern 1: "between $X and $Y" or "from $X to $Y"
        between_match = re.search(r"(?:between|from)\s+\$?(\d+(?:\.\d+)?)\s*(?:and|to|-)\s+\$?(\d+(?:\.\d+)?)", text)
        if between_match:
            min_p = float(between_match.group(1))
            max_p = float(between_match.group(2))
            return min_p, max_p

        # Pattern 2: "under $X", "below $X", "less than $X", "< $X", "max $X", "budget of $X"
        max_match = re.search(r"(?:under|below|less than|within|up to|max(?:imum)? of|budget of|\<)\s*\$?(\d+(?:k|\.\d+)?)", text)
        if max_match:
            val_str = max_match.group(1).lower()
            if "k" in val_str:
                max_p = float(val_str.replace("k", "")) * 1000.0
            else:
                max_p = float(val_str)

        # Pattern 3: "above $X", "over $X", "more than $X", "> $X", "min $X"
        min_match = re.search(r"(?:above|over|more than|at least|min(?:imum)? of|\>)\s*\$?(\d+(?:k|\.\d+)?)", text)
        if min_match:
            val_str = min_match.group(1).lower()
            if "k" in val_str:
                min_p = float(val_str.replace("k", "")) * 1000.0
            else:
                min_p = float(val_str)

        return min_p, max_p

    def _detect_category(self, text: str) -> Optional[str]:
        for cat, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                # Whole word match with optional plural 's'
                if re.search(rf"\b{re.escape(kw)}s?\b", text):
                    return cat
        return None

    def _extract_features(self, text: str) -> list[str]:
        found = []
        for use_case, features in USE_CASE_FEATURES.items():
            if re.search(rf"\b{re.escape(use_case)}\b", text):
                found.extend(features)
        return list(dict.fromkeys(found))

query_intent_parser = QueryIntentParser()
