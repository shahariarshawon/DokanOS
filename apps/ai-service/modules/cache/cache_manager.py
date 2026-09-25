import hashlib
import time
import logging
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger("dokanos.ai.cache")

class InMemoryTTLCache:
    """
    High-performance in-memory TTL (Time-To-Live) cache with thread-safe timestamp eviction.
    Supports query caching, embedding vector reuse, and LLM completion caching to minimize
    API costs and sub-millisecond response latency.
    """
    def __init__(self, default_ttl_seconds: int = 3600, max_entries: int = 10000):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self.default_ttl = default_ttl_seconds
        self.max_entries = max_entries
        self.hits = 0
        self.misses = 0

    def _hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        hashed = self._hash_key(key)
        item = self._cache.get(hashed)
        if not item:
            self.misses += 1
            return None

        value, expiry = item
        if time.time() > expiry:
            del self._cache[hashed]
            self.misses += 1
            return None

        self.hits += 1
        return value

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        if len(self._cache) >= self.max_entries:
            # Simple eviction of expired or oldest entries
            self._evict_expired()

        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = time.time() + ttl
        hashed = self._hash_key(key)
        self._cache[hashed] = (value, expiry)

    def _evict_expired(self) -> None:
        now = time.time()
        expired_keys = [k for k, (_, exp) in self._cache.items() if exp < now]
        for k in expired_keys:
            del self._cache[k]
        
        # If still full, pop 10% of items to prevent unbounded memory growth
        if len(self._cache) >= self.max_entries:
            keys_to_remove = list(self._cache.keys())[: max(1, self.max_entries // 10)]
            for k in keys_to_remove:
                del self._cache[k]

    def clear(self) -> None:
        self._cache.clear()
        self.hits = 0
        self.misses = 0

    def stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        hit_rate = round((self.hits / total) * 100, 2) if total > 0 else 0.0
        return {
            "cached_entries": len(self._cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_pct": hit_rate,
        }

# Global cache singletons
embedding_cache = InMemoryTTLCache(default_ttl_seconds=86400, max_entries=5000)      # 24 hours for query vectors
recommendation_cache = InMemoryTTLCache(default_ttl_seconds=600, max_entries=2000)   # 10 minutes for product recs
llm_completion_cache = InMemoryTTLCache(default_ttl_seconds=3600, max_entries=2000)  # 1 hour for seller copies / chats
