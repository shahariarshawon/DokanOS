import os
import sys
import unittest
import numpy as np

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.cache.cache_manager import InMemoryTTLCache
from modules.embedding.embedding_service import embedding_service, EMBEDDING_DIM
from modules.rag.intent_parser import query_intent_parser
from modules.rag.seller_assistant import seller_assistant_service
from modules.rag.contracts import SellerAssistantRequest

class TestAiFeatures(unittest.IsolatedAsyncioTestCase):
    def test_cache_manager(self):
        cache = InMemoryTTLCache(default_ttl_seconds=2)
        cache.set("test_key", {"data": 123})
        val = cache.get("test_key")
        self.assertIsNotNone(val)
        self.assertEqual(val["data"], 123)
        self.assertEqual(cache.hits, 1)

    async def test_embedding_generation_and_fallback(self):
        text = "Mechanical keyboard with hot-swappable switches and RGB"
        vec, provider = await embedding_service.get_embedding(text)
        self.assertEqual(len(vec), EMBEDDING_DIM)
        # Verify L2 norm is approximately 1.0
        norm = np.linalg.norm(np.array(vec))
        self.assertAlmostEqual(norm, 1.0, places=2)

    def test_intent_parser_laptop_budget(self):
        query = "Suggest a laptop for programming under $1000"
        intent = query_intent_parser.parse(query)
        self.assertEqual(intent.detected_category, "laptop")
        self.assertEqual(intent.max_price, 1000.0)
        self.assertIn("16GB RAM or higher", intent.extracted_features)

    def test_intent_parser_price_range(self):
        query = "Show headphones between $50 and $150 with noise cancellation"
        intent = query_intent_parser.parse(query)
        self.assertEqual(intent.detected_category, "audio")
        self.assertEqual(intent.min_price, 50.0)
        self.assertEqual(intent.max_price, 150.0)

    async def test_seller_assistant_fallback_copy(self):
        req = SellerAssistantRequest(
            product_name="ProBook Ultralight 14",
            category="Computers & Laptops",
            features=[
                "Intel Core i7 13th Gen",
                "16GB LPDDR5 RAM",
                "512GB NVMe SSD",
                "14-inch 2.8K OLED Display",
            ],
            tone="PROFESSIONAL",
        )
        res = await seller_assistant_service.generate_product_copy(req)
        self.assertIn("ProBook Ultralight 14", res.description)
        self.assertGreater(len(res.seo_keywords), 3)
        self.assertIsNotNone(res.marketing_text)
        self.assertGreater(len(res.tags), 2)
        self.assertTrue(res.seo_meta.meta_title.startswith("ProBook Ultralight 14"))

if __name__ == "__main__":
    unittest.main()
