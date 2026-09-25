# DokanOS Phase 7: Advanced AI Integration Architecture

## 1. Executive Summary & Architecture Overview

DokanOS Phase 7 introduces an autonomous, production-grade AI microservice designed to power intelligent marketplace capabilities for both buyers and merchants:

1. **AI Shopping Assistant (RAG Pipeline)**: Intent-aware conversational product discovery with transparent recommendation explanations.
2. **Product Embedding Pipeline**: Automatic 1536-dimensional semantic vector indexing in PostgreSQL `pgvector` incorporating titles, descriptions, categories, and structured JSON attributes.
3. **AI Seller Assistant (Copilot)**: Automated high-converting product descriptions, SEO keywords, promotional marketing copy, and marketplace tags.
4. **Content-Based Product Recommendation Engine**: Heuristic and semantic similarity engine factoring vector distance, category hierarchy, price band proximity, and hardware attribute overlap.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  (Next.js Web Storefront, Seller Dashboard, Mobile Apps)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST / WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS API Gateway                        │
│   (Auth, Business Logic, DB Orchestration, Circuit Breaker) │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / Internal Secret Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI AI Microservice                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Cache Manager                       │  │
│  │     (TTL In-Memory Cache / Redis-Ready Layer)         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │  modules/       │ │  modules/       │ │  modules/     │  │
│  │  embedding/     │ │  rag/           │ │  recommend/   │  │
│  │  - Pipeline     │ │  - Intent Parser│ │  - Content-   │  │
│  │  - Provider     │ │  - Shopping RAG │ │    Based Recs │  │
│  │    Cascade      │ │  - Seller Copilot││  - Multi-Score│  │
│  │  - Fallback     │ │  - Prompts      │ │    Heuristics │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
└──────────────┬───────────────────────────────┬──────────────┘
               │ Cosine Similarity (<=>)       │ LLM API Calls
               ▼                               ▼
┌────────────────────────────────┐ ┌──────────────────────────┐
│ PostgreSQL 16 + pgvector       │ │ External LLM Providers   │
│ - products                     │ │ - OpenAI (gpt-4o-mini)   │
│ - product_embeddings (1536-dim)│ │ - Gemini (1.5-flash)     │
│ - categories, stores           │ │ - Algorithmic Fallbacks  │
└────────────────────────────────┘ └──────────────────────────┘
```

---

## 2. Directory Structure & Independence

The AI microservice is isolated inside `apps/ai-service/` and accessible via `modules/`:

```
apps/ai-service/
├── modules/
│   ├── cache/
│   │   ├── __init__.py
│   │   └── cache_manager.py         # Thread-safe in-memory TTL cache with SHA-256 keying
│   ├── embedding/
│   │   ├── __init__.py
│   │   ├── contracts.py             # Pydantic request/response schemas
│   │   ├── embedding_service.py     # OpenAI / Gemini / Offline L2 projection fallback
│   │   ├── pipeline.py              # Product semantic document builder & pgvector upsert
│   │   └── router.py                # Endpoints (/v1/embeddings/...)
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── contracts.py             # Pydantic schemas for shopping & seller assistants
│   │   ├── intent_parser.py         # Natural language intent & price bounds extractor
│   │   ├── prompts.py               # Prompt templates & anti-hallucination guardrails
│   │   ├── vector_search.py         # pgvector cosine similarity (<=>) search + fallback
│   │   ├── shopping_assistant.py    # End-to-end RAG orchestrator with explanations
│   │   ├── seller_assistant.py      # Description, SEO, marketing text, and tags generator
│   │   └── router.py                # Endpoints (/v1/shopping/..., /v1/seller/...)
│   └── recommendation/
│       ├── __init__.py
│       ├── contracts.py             # Pydantic schemas for recommendations
│       ├── content_based.py         # Multi-heuristic content-based recommendation engine
│       └── router.py                # Endpoints (/v1/recommendations/...)
├── app/
│   ├── core/                        # Config, asyncpg connection pool, pgvector codec
│   ├── api/router.py                # Central v1 router delegating to modules
│   └── main.py                      # FastAPI lifespan, middleware, health check
└── tests/
    └── test_ai_features.py          # Unit & integration tests for all AI capabilities
```

---

## 3. Feature Breakdown & Implementation Details

### Feature 1: AI Shopping Assistant (RAG Pipeline)

**Flow**:

1. **User Query**: e.g., `"Suggest a laptop for programming under $1000"`.
2. **Intent Parsing (`QueryIntentParser`)**:
   - Detects category domain: `"laptop"`.
   - Extracts budget ceiling: `max_price = 1000.0`.
   - Maps use-case features: `["16GB RAM or higher", "Fast multi-core processor", "High-speed SSD"]`.
3. **Query Embedding**: Generates 1536-dimensional vector using cache or external provider.
4. **pgvector Similarity Search**:
   - Executes ANN search using cosine distance `<=>` operator against `product_embeddings`.
   - Enforces active in-stock filters: `p.status = 'ACTIVE' AND p."stockQuantity" > 0`.
   - Enforces budget constraint: `p.price <= 1000.0`.
5. **Context Augmentation**: Formats retrieved products with title, price, store, rating, attributes, and reason tags.
6. **LLM Synthesis & Explainability**:
   - Passes grounded context and system instructions.
   - Generates personalized recommendations explaining _why_ each product satisfies the query:
     - Confirms budget compliance (e.g., "$899 is $101 under your $1000 budget").
     - Confirms hardware suitability for programming.
   - Includes graceful fallback if external LLM APIs are unreachable.

### Feature 2: Product Embedding Pipeline

**Trigger**:

- Dispatched automatically and asynchronously when a product is created or updated in NestJS `ProductsService`.
- Can also be invoked manually or via bulk sync endpoint `POST /v1/embeddings/sync`.

**Semantic Document Construction**:
Incorporates all key product signals:

- **Title**: Primary identity
- **Category**: Name and taxonomic path
- **Merchant Store**: Seller identity
- **Price**: Numerical reference point
- **Description**: Detailed product copy
- **Attributes**: Formatted key-value attributes (e.g. `RAM: 16GB`, `Brand: Apple`, `Storage: 512GB SSD`)

**Database Upsert**:

```sql
INSERT INTO product_embeddings (id, "productId", content, embedding, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), $1::uuid, $2, $3, NOW(), NOW())
ON CONFLICT ("productId") DO UPDATE SET
    content = EXCLUDED.content,
    embedding = EXCLUDED.embedding,
    "updatedAt" = NOW();
```

### Feature 3: AI Seller Assistant (Copilot)

**Input**:

- `product_name`, `category`, `features` (list of specifications), `tone` (PROFESSIONAL, PERSUASIVE, LUXURY, etc.).

**Outputs**:

- **Description**: Rich Markdown with headlines, bullet points, spec summary, and buyer guarantees.
- **SEO Keywords**: 10+ high-intent search terms (primary and long-tail).
- **Marketing Text**: 1-2 punchy promotional sentences designed for social ads, banners, and hero headers.
- **Tags**: 6-8 standardized hyphenated tags for marketplace search indexing.
- **SEO Meta**: Google-compliant meta title (< 60 chars) and meta description (< 155 chars).
- **Key Selling Points**: 3-5 concise bullet points highlighting unique value propositions.

### Feature 4: Product Recommendation System (Content-Based)

**Initial Version**: Pure content-based engine without complex ML overhead.
**Composite Scoring Formula**:
$$\text{Score} = 0.45 \times S_{\text{vector}} + 0.25 \times C_{\text{category}} + 0.15 \times P_{\text{price}} + 0.10 \times \left(\frac{R}{5.0}\right) + 0.05 \times A_{\text{attributes}}$$

Where:

- $S_{\text{vector}}$: Cosine similarity $1.0 - (pe.embedding \Leftrightarrow target\_embedding)$.
- $C_{\text{category}}$: $1.0$ if category matches source product, otherwise $0.0$.
- $P_{\text{price}}$: Price proximity $1.0 - \min\left(1.0, \frac{|price - target\_price|}{target\_price}\right)$.
- $R$: Product review rating (0.0 to 5.0).
- $A_{\text{attributes}}$: Overlap ratio of key-value attributes (e.g., shared brand or hardware spec).

**Match Explanations**:
Each recommended item provides human-readable match reasons, such as:

- `"Same Category: Laptops & Computers"`
- `"Similar price tier ($899 vs $949)"`
- `"88% visual & descriptive similarity"`
- `"Customer favorite (4.8 ★)"`

---

## 4. API Contracts

### AI Service (FastAPI) Endpoints

| Method | Path                                | Description                                 | Access             |
| ------ | ----------------------------------- | ------------------------------------------- | ------------------ |
| `POST` | `/v1/shopping/chat`                 | AI Shopping Assistant RAG Chat              | Internal / Public  |
| `POST` | `/v1/seller/generate`               | AI Seller Copilot Marketing & SEO Generator | Internal / Seller  |
| `POST` | `/v1/rag/parse-intent`              | Natural Language Query Intent Extractor     | Internal           |
| `POST` | `/v1/embeddings/product/{id}`       | Index Single Product into pgvector          | Internal / Backend |
| `POST` | `/v1/embeddings/sync`               | Bulk Sync Marketplace Embeddings            | Internal / Admin   |
| `POST` | `/v1/embeddings/generate`           | Direct 1536-dim Text Vector Generation      | Internal           |
| `GET`  | `/v1/recommendations/products/{id}` | Content-Based Product Recommendations       | Internal / Public  |
| `GET`  | `/health`                           | Health Check with Modules & Cache Metrics   | Public             |

### NestJS Backend Endpoints

| Method | Path                                  | Description                           | Access        |
| ------ | ------------------------------------- | ------------------------------------- | ------------- |
| `POST` | `/ai/chat`                            | Proxies Shopping Chat to AI Service   | Public        |
| `POST` | `/ai/product-description`             | Proxies Seller Copy Generation        | Seller, Admin |
| `GET`  | `/ai/recommendations/:productId`      | Content-Based Recommendations Proxy   | Public        |
| `GET`  | `/products/:idOrSlug/recommendations` | Storefront Product Recommendations    | Public        |
| `POST` | `/ai/embeddings/sync`                 | Trigger Background Vector Re-Indexing | Admin         |

---

## 5. Prompt Engineering Strategy

1. **System Persona Definition**:
   The AI Shopping Assistant is instructed as a friendly, knowledgeable marketplace advisor. The Seller Assistant is instructed as an elite e-commerce conversion copywriter and SEO strategist.
2. **Grounding & Anti-Hallucination**:
   - LLMs are explicitly restricted: _"Only recommend products provided in the Context below. Never invent products, brands, or fake prices."_
   - Context injected contains exact product titles, actual prices, vendor names, and ratings.
3. **Structured JSON Mode**:
   - For Seller Copilot, schema enforcement is applied via OpenAI `response_format: {"type": "json_object"}` and Gemini structured formatting with regex sanitation fallback.
4. **Explainability Guidance**:
   - Prompts mandate that the assistant explains the rationale behind each recommendation (e.g. how it solves the user's explicit use-case and aligns with their price budget).

---

## 6. Error Handling & Circuit Breaking

1. **Multi-Provider Fallback Cascade**:
   - **Vector Generation**: Memory Cache $\to$ OpenAI `text-embedding-3-small` $\to$ Gemini `text-embedding-004` $\to$ Deterministic L2 Normalized Hash Projection.
   - **LLM Synthesis**: OpenAI `gpt-4o-mini` $\to$ Gemini `1.5-flash` $\to$ Algorithmic Structured Markdown Template.
   - **Search Query**: pgvector Cosine Search $\to$ PostgreSQL `ILIKE` Relational Search.
2. **NestJS Circuit Breaker & Graceful Degradation**:
   - If the AI microservice is temporarily down, unresponsive, or times out (8-10s timeout), NestJS automatically intercepts the exception and serves relational database results without throwing a 500 error to the customer.
3. **Resilient Database Pool**:
   - `asyncpg` connection pool with automatic vector codec registration (`register_vector(conn)`), SSL validation for NeonDB, and proactive connection recycling.

---

## 7. Cost Optimization Strategy

1. **Model Selection**:
   - Using lightweight, high-speed, cost-effective models (`gpt-4o-mini` at $0.15/1M tokens and `gemini-1.5-flash`) instead of costly reasoning models.
2. **Context Compression**:
   - Product descriptions injected into the prompt are pruned to the first 200-250 characters, minimizing prompt token consumption while preserving semantic value.
3. **Embedding Vector Caching**:
   - Query vectors are cached with a 24-hour TTL. Repeating searches like `"gaming laptop under 1500"` incur zero embedding API cost.
4. **Batch Embedding**:
   - Bulk synchronization chunks operations into batches of 25 to respect API rate limits and optimize throughput.

---

## 8. Multi-Layer Caching Strategy

```
User Query / Product Request
             │
             ▼
┌───────────────────────────┐
│ Layer 1: In-Memory TTL    │  Hit (< 1ms)  ───► Returns cached response
│ Cache (CacheManager)      │
└────────────┬──────────────┘
             │ Miss
             ▼
┌───────────────────────────┐
│ Layer 2: Vector Cache     │  Hit (< 2ms)  ───► Reuses 1536-dim vector
│ (embedding_cache)         │
└────────────┬──────────────┘
             │ Miss
             ▼
┌───────────────────────────┐
│ Layer 3: pgvector ANN DB  │  Query (< 15ms)
└───────────────────────────┘
```

1. **`embedding_cache` (TTL: 24h, Max: 5,000 entries)**:
   - Key: `sha256(text)`.
   - Stores: 1536-dimensional float vector.
2. **`recommendation_cache` (TTL: 10m, Max: 2,000 entries)**:
   - Key: `sha256(product_id:limit:price_tolerance:same_category)`.
   - Stores: Scored list of recommended products.
3. **`llm_completion_cache` (TTL: 1h, Max: 2,000 entries)**:
   - Key: `sha256(query:min_price:max_price:category_id:limit)`.
   - Stores: Complete synthesized response.
4. **Redis Readiness**:
   - The `CacheManager` interface is designed to support a Redis client adapter with zero breaking changes to calling services.

---

## 9. Architectural Decisions & Trade-Offs

| Decision                   | Chosen Approach                     | Rationale                                                                                                     | Alternatives Considered                                                               |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Microservice Framework** | FastAPI (Python)                    | Native async, high throughput, direct `asyncpg` + `pgvector` codecs, clean Pydantic contracts                 | Embedded in NestJS (Node.js lacks mature vector/AI ecosystem)                         |
| **Vector Database**        | PostgreSQL `pgvector`               | Zero extra infrastructure, transactional integrity with DokanOS products table, unified backups               | Pinecone, Milvus, Qdrant (Added maintenance cost and data sync lag)                   |
| **Vector Dimensions**      | 1536 dimensions                     | Standardized with OpenAI `text-embedding-3-small` and Gemini `text-embedding-004` (with dimension projection) | 768 dimensions (Would limit provider interoperability)                                |
| **Intent Parsing**         | Rule-Based Regex + Semantic Mapping | Zero token cost, sub-millisecond latency, 100% predictable price boundary extraction                          | Pure LLM intent extraction (Adds 500ms latency and per-query token cost)              |
| **Recommendation Engine**  | Content-Based Heuristic             | Instant results, works on day one without cold-start problem or extensive historical purchase logs            | Collaborative Filtering (Fails for new stores, requires millions of purchase records) |
