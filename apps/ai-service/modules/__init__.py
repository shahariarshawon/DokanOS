"""
DokanOS Autonomous AI Microservice Modules:
- embedding: Vector generation and pgvector indexing pipeline
- rag: Intent-aware RAG shopping assistant & AI seller copilot
- recommendation: Content-based product recommendation engine
- cache: High-performance in-memory TTL caching
"""

from . import cache, embedding, rag, recommendation

__all__ = ["cache", "embedding", "rag", "recommendation"]
