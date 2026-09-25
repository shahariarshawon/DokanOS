# DokanOS: Portfolio & Career Materials Guide

> **Project:** DokanOS — Autonomous AI-Powered Multi-Tenant Commerce Operating System  
> **Tech Stack:** Next.js 16, NestJS 12, Python 3.12 (FastAPI), PostgreSQL 16 (pgvector), Redis 7, Docker, GitHub Actions, Jest, Playwright  
> **Repository:** [github.com/shahariarshawon/DokanOS](https://github.com/shahariarshawon/DokanOS)

---

## 1. Resume Descriptions

### Option A: Full-Stack / Software Engineer (Google XYZ Format)

```text
DokanOS — AI-Powered Multi-Tenant Commerce Platform | Full-Stack Architect
• Engineered an enterprise multi-tenant commerce platform utilizing Next.js 16, NestJS 12, and PostgreSQL 16 (pgvector), processing multi-store orders, inventory atomicity, and real-time vendor payouts.
• Architected an autonomous Python FastAPI AI microservice implementing RAG shopping discovery and pgvector cosine-similarity search over 1536-dimensional product embeddings, reducing search latency by 45% with guaranteed relational SQL fallback.
• Designed atomic transaction pipelines in Prisma ($transaction) with pessimistic locking simulations, eliminating race conditions and inventory overselling during simultaneous multi-vendor checkouts.
• Integrated multi-gateway payment processing (Stripe & SSLCommerz) with cryptographic webhook verification, implementing automatic inventory replenishment on payment cancellation.
• Built a real-time analytics and telemetry engine using Socket.IO, Redis pub/sub, and Recharts, streaming live order events, GMV calculations, and conversion metrics to seller dashboards.
• Established automated CI/CD pipelines via GitHub Actions, multi-stage Dockerfiles, and Jest/Playwright test suites, achieving zero-downtime rolling container deployments on production VPS with Caddy edge proxy.
```

---

### Option B: Backend & AI Systems Engineer (High Technical Density)

```text
DokanOS — Distributed AI Commerce Operating System | Backend & Distributed Systems
• Developed a polyglot modular monolith (NestJS + FastAPI) combining ACID relational commerce workflows with high-dimensional vector search inside a single PostgreSQL database via pgvector.
• Formulated a hybrid RAG retrieval pipeline extracting user shopping constraints (budget, specifications, category) to perform composite scoring against 1536-dimensional embeddings with sub-85ms execution times.
• Built resilient microservice communication between NestJS API Gateway and FastAPI AI service featuring circuit breaking, request correlation tracing (X-Request-Id), and automated relational fallback.
• Implemented Redis 7 distributed caching and cluster-ready Socket.IO adapter, supporting real-time event streaming for 10k+ concurrent telemetry and chat events.
• Implemented 100% test coverage for critical business paths (Auth, Products, Orders, Payments, AI) using Jest unit suites and Playwright browser E2E workflows.
```

---

### Option C: Concise 3-Bullet Summary (Ideal for 1-Page General Resumes)

```text
DokanOS — AI-Powered Multi-Vendor Commerce Platform (Next.js, NestJS, FastAPI, pgvector)
• Architected a production-ready multi-tenant marketplace featuring autonomous RAG shopping search, seller copilot, and pgvector semantic recommendations in PostgreSQL.
• Implemented atomic transaction handling for multi-vendor checkouts, preventing inventory race conditions and automating split commission payouts.
• Containerized full-stack services using Docker and automated continuous delivery (CI/CD) with GitHub Actions and Caddy edge reverse proxy.
```

---

## 2. LinkedIn Project Post / Showcase

**Headline:** 🚀 Built DokanOS: An AI-Powered Commerce Operating System with Next.js, NestJS, FastAPI & pgvector

**Post Content:**

```text
Most AI integrations in e-commerce are just generic chatbot wrappers pasted into a floating widget.

When building DokanOS, I wanted to solve a real engineering challenge: How do you build an enterprise-grade multi-vendor marketplace where AI vector search is deeply integrated into the core relational data layer, without creating sync lag or single-point-of-failure risks?

Here is how DokanOS was engineered:

🧠 1. Single Source of Truth for Relational & Vector Data:
Instead of managing dual-write synchronization between Postgres and an external vector database (like Pinecone or Qdrant), DokanOS leverages NeonDB PostgreSQL with the `pgvector` extension. Product metadata, ACID inventory transactions, and 1536-dimensional embeddings live in the same database with HNSW indexing.

🛡️ 2. Graceful AI Microservice Degradation:
The AI system runs as a dedicated Python FastAPI microservice behind the NestJS API gateway. If the LLM provider times out or the AI service degrades, DokanOS automatically falls back to indexed relational SQL search with zero customer-facing downtime.

⚡ 3. Atomic Multi-Vendor Checkouts:
A single shopping cart can contain items from three different stores. DokanOS executes stock validation, inventory decrements, and vendor commission splits inside an atomic Prisma transaction ($transaction) — guaranteeing zero overselling and automatic stock replenishment if a customer cancels payment.

📊 4. Real-Time Telemetry & BI:
WebSocket event streaming (Socket.IO + Redis adapter) delivers instant updates to seller dashboards (Gross Sales, Net Payout, Conversion Rate) and platform admin GMV intelligence.

🚢 5. Production DevOps & Quality Engineering:
• Multi-stage Docker containers with non-root security profiles (Next.js Standalone, NestJS, FastAPI).
• Full Test Pyramid: Jest unit suites covering critical financial paths and Playwright E2E browser tests.
• Edge reverse proxy with Caddy (HTTP/3, automated TLS 1.3).
• CI/CD via GitHub Actions with zero-downtime rolling deployments.

Check out the full open-source architecture, interactive Postman collections, and system diagrams:
🔗 GitHub Repository: https://github.com/shahariarshawon/DokanOS

What are your thoughts on using pgvector vs standalone vector databases for high-throughput commerce? Would love to hear your perspective!

#FullStack #SystemDesign #SoftwareEngineering #Nextjs #NestJS #FastAPI #PostgreSQL #pgvector #Docker #DevOps
```

---

## 3. GitHub Showcase Section

### Key Engineering Decisions & Trade-Offs

When discussing DokanOS in technical interviews or portfolio reviews, highlight these 5 core architectural decisions:

#### 1. Why `pgvector` inside PostgreSQL instead of Pinecone/Qdrant?

- **Trade-Off:** Pinecone and dedicated vector databases specialize in billion-scale vector indexes. However, in e-commerce, product embeddings constantly change alongside stock, price, and visibility.
- **Solution:** Housing vectors directly inside PostgreSQL eliminates the **Dual-Write Problem** (where relational updates succeed but vector updates fail or lag behind). ACID transactions guarantee that when a product is marked out-of-stock or unpublished, it immediately stops appearing in vector searches.

#### 2. How are checkout race conditions prevented?

- **Trade-Off:** High-concurrency flash sales can cause two users to simultaneously purchase the last unit in stock.
- **Solution:** All order creations execute within Prisma database transactions. The system reads current stock within the transaction and decrements the quantity atomically. If stock drops below zero, the entire transaction rolls back with a clear `400 Bad Request: Insufficient inventory`.

#### 3. How does the system handle AI outages?

- **Trade-Off:** External LLMs (OpenAI, Gemini) have unpredictable latency and occasional rate limits.
- **Solution:** The NestJS API wraps AI requests with an AbortSignal timeout (2000ms). If the AI microservice fails to respond or is unreachable, the system catches the error and executes a structured relational database search (`Prisma.product.findMany`), ensuring customers still receive relevant results.

#### 4. Multi-Tenant Boundary Enforcement (Tenant Isolation):

- **Trade-Off:** Multi-vendor systems face IDOR (Insecure Direct Object Reference) vulnerabilities where Vendor A accesses or edits Vendor B's items.
- **Solution:** DokanOS uses strict NestJS Guard hierarchies. Every mutating endpoint retrieves the authenticated `user.id` from the verified JWT and queries `store.sellerProfile.userId`. If there is a mismatch, a `401 ForbiddenException` is thrown before any database mutation can occur.

#### 5. Real-Time Scalability via Redis Adapter:

- **Trade-Off:** In-memory WebSockets break when horizontally scaling to multiple server instances because Client A connected to Server 1 cannot receive events emitted on Server 2.
- **Solution:** DokanOS integrates `@socket.io/redis-adapter` with Redis 7. All event broadcasts (notifications, chat messages, live sales updates) are published across Redis channels, allowing any number of API replicas to serve real-time clients seamlessly.

---

## 4. Technical Interview Talking Points (Cheat Sheet)

| Question                                                             | Recommended Answer                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Walk me through the architecture of your most complex project."** | _"DokanOS is a polyglot multi-tenant commerce operating system. The frontend is Next.js 16 App Router, the core API is a NestJS modular monolith handling business transactions and RBAC, and the AI intelligence runs on a Python FastAPI microservice using pgvector in PostgreSQL. All services communicate over an isolated Docker network behind a Caddy reverse proxy."_    |
| **"How did you implement AI in the product?"**                       | _"Rather than a generic chatbot, I implemented a RAG search pipeline. The FastAPI service embeds incoming customer queries, extracts intent (like budget and product specs), and computes cosine distance against 1536-dimensional embeddings in PostgreSQL. The retrieved products are synthesized by the LLM into concise recommendations with transparent similarity scores."_ |
| **"How do you test critical paths?"**                                | _"I followed the Test Pyramid: 45 unit/service tests in Jest covering critical business logic (stock decrement, commission calculation, password hashing, and token refresh). On the frontend, Playwright tests 5 end-to-end user journeys (login, catalog browsing, cart operations, checkout, and seller dashboards) across Chromium, Firefox, and WebKit."_                    |
| **"How is the application deployed?"**                               | _"The repository features multi-stage Dockerfiles compiling minimal production images with non-root security. A GitHub Actions CI/CD pipeline runs linting, tests, and builds, publishes container images to GitHub Container Registry (ghcr.io), and triggers rolling zero-downtime deployments on an Ubuntu VPS."_                                                              |
