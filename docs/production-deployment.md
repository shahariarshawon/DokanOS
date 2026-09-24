# DokanOS Production Deployment & Architecture Guide

> **Status:** Production Reference Specification  
> **Version:** 1.0.0  
> **Audience:** DevOps Engineers, Backend Architects, Site Reliability Engineers (SRE), AI Engineers  

---

## 1. Production Architecture Overview

DokanOS employs a **Polyglot Containerized Micro-Service Architecture** designed for high throughput, robust resilience, and secure separation of concerns:

```mermaid
flowchart TB
    subgraph Internet["Public Ingress (Internet)"]
        CLIENT["Browser / Mobile Client"]
        STRIPE_HOOK["Stripe Webhook Gateway"]
        SSLC_HOOK["SSLCommerz IPN Gateway"]
    end

    subgraph Edge["Edge & Reverse Proxy Tier (VPS Host)"]
        CADDY["Caddy 2 / Nginx (Port 80/443)<br/>Automated Let's Encrypt TLS 1.3<br/>HTTP/3 QUIC + Gzip/Zstd Compression"]
    end

    subgraph DockerNet["Isolated Internal Docker Bridge (dokanos_net)"]
        WEB["Next.js 15 Standalone Web Container<br/>(Port 3000)<br/>Non-Root 'nextjs' User"]
        API["NestJS Core API Gateway Container<br/>(Port 4000)<br/>Non-Root 'node' User"]
        AI["FastAPI AI Intelligence Container<br/>(Port 8000)<br/>Non-Root 'appuser' User"]
        REDIS["Redis 7 Alpine Cache Container<br/>(Port 6379)<br/>Password Protected + AOF Persistence"]
    end

    subgraph ManagedCloud["Managed Cloud Data Tier"]
        NEON[("NeonDB Cloud PostgreSQL 16<br/>Connection Pooling + SSL Enforcement<br/>pgvector Extension (1536-dim HNSW Index)")]
        SUPABASE["Supabase Cloud Object Storage<br/>(Product Images & Chat Attachments)"]
    end

    %% Ingress Traffic
    CLIENT -->|"HTTPS (dokanos.com)"| CADDY
    STRIPE_HOOK -->|"HTTPS (dokanos.com/api/v1/payments/webhook/stripe)"| CADDY
    SSLC_HOOK -->|"HTTPS (dokanos.com/api/v1/payments/webhook/sslcommerz)"| CADDY

    %% Routing
    CADDY -->|"Reverse Proxy /*"| WEB
    CADDY -->|"Reverse Proxy /api/*"| API

    %% Internal Communication
    API -->|"Internal HTTP [Req-ID Tracing]"| AI
    API -->|"TCP / Auth"| REDIS
    API -->|"Prisma ORM (SSL Pooler)"| NEON
    AI -->|"asyncpg (SSL Pooler) + Cosine Distance"| NEON
    API -->|"REST SDK / S3 API"| SUPABASE
```

### Architectural Principles:
1. **Network Isolation:** Only the reverse proxy (`Caddy` / `Nginx`) exposes ports `80` and `443` to the host and public internet.
2. **Private AI Microservice:** The `ai-service` container is **never exposed** to the public internet. It only communicates over the private Docker bridge network (`dokanos_net`) with `api`, verified by `AI_INTERNAL_KEY`.
3. **Stateless App Containers:** Both `web` and `api` containers are completely stateless, allowing horizontal scaling and seamless rolling updates.
4. **Single Source of Truth for Relational & Vector Data:** All relational data and high-dimensional embeddings reside inside **NeonDB PostgreSQL with `pgvector`**, eliminating dual-write sync lags.

---

## 2. Containerization (Docker)

All three applications feature production-hardened, multi-stage Dockerfiles utilizing minimal Alpine / Slim base images and non-root system users:

| Container | Base Image | Build Strategy | Exposed Port | Non-Root User | Healthcheck |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`web`** | `node:22-alpine` | Multi-stage, Next.js Standalone (`output: 'standalone'`) | 3000 | `nextjs` (1001) | `curl -f http://localhost:3000/` |
| **`api`** | `node:22-alpine` | Multi-stage, pruned production pnpm dependencies | 4000 | `node` (1000) | `curl -f http://localhost:4000/api/v1/health` |
| **`ai-service`** | `python:3.12-slim` | Multi-stage, pip wheel caching, 2 Uvicorn workers | 8000 | `appuser` (1000) | `curl -f http://localhost:8000/health` |

### Docker Commands
- **Build production containers locally:**
  ```bash
  docker compose -f docker-compose.prod.yml build
  ```
- **Start the production stack:**
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```
- **Inspect running containers and health status:**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```

---

## 3. CI/CD Pipeline (GitHub Actions)

Continuous Integration and Continuous Deployment are automated across two workflows located in `.github/workflows/`:

### 1. `ci.yml` (Triggered on Pull Request & Push to `main`/`develop`)
- **`test-and-build-typescript`:**
  - Installs dependencies using `pnpm install --frozen-lockfile`.
  - Generates Prisma client.
  - Builds NestJS API (`pnpm --filter api build`).
  - Builds Next.js Web (`pnpm --filter web build`).
- **`test-ai-service`:**
  - Lints Python code with `flake8`.
  - Verifies package imports and Pydantic schemas.
- **`validate-docker-builds`:**
  - Builds Docker container images with GitHub Actions layer caching to prevent broken image pushes.

### 2. `deploy.yml` (Automated Production VPS Deployment)
- Authenticates with **GitHub Container Registry** (`ghcr.io`).
- Builds and publishes multi-architecture images tagged with commit SHA and `:latest`.
- Connects to VPS via secure SSH key:
  1. Pulls new images from `ghcr.io`.
  2. Runs safe database migrations:
     ```bash
     docker run --rm --env-file /opt/dokanos/apps/api/.env \
       ghcr.io/shahariarshawon/dokanos-api:latest \
       npx prisma migrate deploy
     ```
  3. Executes rolling container restart:
     ```bash
     docker compose -f docker-compose.prod.yml up -d --remove-orphans
     ```
  4. Runs post-deployment health check against `/api/v1/health`.

---

## 4. Production VPS Deployment Guide

### Provisioning Ubuntu VPS (Hetzner / DigitalOcean / AWS EC2)
1. **Clone repository onto VPS:**
   ```bash
   git clone https://github.com/shahariarshawon/DokanOS.git /opt/dokanos
   cd /opt/dokanos
   ```
2. **Run the automated provisioning script:**
   ```bash
   chmod +x scripts/setup-vps.sh
   ./scripts/setup-vps.sh
   ```
   *This automatically enables UFW firewall (allowing only ports 22, 80, 443), configures Fail2ban, installs Docker Engine & Docker Compose plugin, and sets up Docker daemon log rotation.*

3. **Configure Production Environment Files:**
   - Copy `.env.production.example` to `apps/api/.env` and `apps/ai-service/.env`.
   - Populate live keys (NeonDB, Stripe, SSLCommerz, Gemini, Supabase).
4. **Deploy Stack:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

---

## 5. Database Migration Management

### Migration Safety Rules in Production
1. **Never run `prisma migrate dev` in production.** Always use:
   ```bash
   npx prisma migrate deploy
   ```
2. **Backward-Compatible Schema Changes:**
   - When renaming columns, add the new column first, deploy code writing to both, backfill existing records, and drop the old column in a subsequent release.
   - Avoid destructive raw `ALTER TABLE DROP COLUMN` without a deprecation window.
3. **Migration Verification:**
   - Check pending migrations before deployment:
     ```bash
     ./scripts/migrate.sh
     ```

---

## 6. Logging & Error Monitoring Architecture

### 1. Request Correlation Tracing (`X-Request-Id`)
Every incoming HTTP request through `LoggingMiddleware` receives or propagates an `X-Request-Id` UUID:
```text
Client -> Caddy -> NestJS [X-Request-Id: 4d34b588-...] -> FastAPI [X-Request-Id: 4d34b588-...]
```
If an error occurs anywhere in the stack, the correlation ID is returned in the API error envelope:
```json
{
  "success": false,
  "statusCode": 500,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Gateway timeout"
  },
  "correlationId": "4d34b588-3a56-493e-a253-9dbe4ba0880c",
  "timestamp": "2026-09-24T23:20:00.000Z",
  "path": "/api/v1/orders"
}
```

### 2. Docker Log Rotation
Docker containers are configured with `json-file` log drivers to prevent disk exhaustion:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "20m"
    max-file: "5"
```

---

## 7. Production Security Checklist

- [x] **Zero Trust on Frontend Payments:** Payment confirmation occurs exclusively via cryptographically signed webhooks (`Stripe-Signature` and SSLCommerz IPN).
- [x] **Least Privilege Container Users:** All containers execute under unprivileged users (`node`, `nextjs`, `appuser`), preventing container breakout vulnerabilities.
- [x] **Strict Ingress Control:** Private microservices (`ai-service`, `redis`) have no host port bindings and communicate solely over internal bridge networks.
- [x] **Secure Reverse Proxy & TLS:** Caddy/Nginx enforces modern TLS 1.3, HSTS (`Strict-Transport-Security`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
- [x] **Database SSL Enforcement:** NeonDB connections strictly enforce `sslmode=require` with certificate validation.
- [x] **Input Validation & Sanitization:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips all untyped payload parameters.
- [x] **Graceful Process Lifecycle:** `enableShutdownHooks()` handles SIGTERM/SIGINT signals to allow active database transactions to drain cleanly.
