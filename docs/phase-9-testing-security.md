# DokanOS Phase 9: Testing Strategy & Quality Engineering Guide

## 1. Testing Strategy Overview

DokanOS adopts an enterprise **Test Pyramid** methodology ensuring rapid developer feedback, transactional correctness, and resilient user flows across multi-tenant commerce operations.

```
                   /\
                  /  \
                 / E2E\            Playwright Browser Tests
                /------\           (Checkout, Cart, Auth, BI)
               /  API   \          Postman Collections & Newman
              / Integration\       (Auth, Products, Orders, AI, Telemetry)
             /--------------\
            /  Unit & Service \    Jest / Vitest Specs
           /    Architecture   \   (Prisma Mock, Logic, RBAC, Services)
          /---------------------\
```

---

## 2. Prioritization of Critical Business Flows

In high-concurrency multi-vendor marketplaces, test coverage is strictly prioritized based on financial risk, customer experience, and data integrity:

| Priority         | Business Domain                        | Critical Path & Failure Modes                                                                                          | Verification Layer                                                         |
| :--------------- | :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **P0 (Highest)** | **Order Placement & Stock Atomicity**  | Race conditions during simultaneous checkouts, overselling inventory, stock depletion, rollback on failed payment.     | `orders.service.spec.ts` + Playwright `checkout.spec.ts`                   |
| **P0 (Highest)** | **Payment Processing & Idempotency**   | Double charges, invalid order IDs, unauthorized payment intents, Stripe webhook signature spoofing.                    | `payments.service.spec.ts` + Postman Payments Suite                        |
| **P1**           | **Authentication & RBAC Security**     | Suspended accounts attempting login, privilege escalation (Customer calling Seller/Admin endpoints), token expiration. | `auth.service.spec.ts`, `users.service.spec.ts`, Playwright `auth.spec.ts` |
| **P1**           | **Multi-Tenant Store Boundaries**      | Sellers updating/deleting products owned by competitor stores, cross-store data leakage.                               | `products.service.spec.ts` + RBAC Guards                                   |
| **P2**           | **AI Assistant & Relational Fallback** | AI FastAPI service downtime, pgvector timeout, ensuring customer shopping queries never 500 error.                     | `ai.service.spec.ts`                                                       |
| **P2**           | **Analytics & Telemetry Aggregation**  | Incorrect revenue calculation, platform take-rate discrepancies, cache invalidation delays.                            | `analytics.service.spec.ts`, Playwright `seller-dashboard.spec.ts`         |

---

## 3. Backend Testing (Jest / Vitest)

The backend (`apps/api`) implements modular unit and service tests with dependency injection mocks and transactional simulation.

### Test Suites Implemented:

1. **Authentication (`src/auth/auth.service.spec.ts`)**:
   - `register`: Creates customer accounts, hashes passwords with bcrypt, checks for duplicates, and generates JWT access/refresh tokens.
   - `login`: Validates password hashes, throws `UnauthorizedException` for wrong credentials, rejects suspended accounts.
   - `refreshToken`: Validates incoming tokens, issues fresh tokens, rejects invalid signatures.

2. **User Management (`src/users/users.service.spec.ts`)**:
   - Sanitizes user entities to prevent password hash leakage.
   - Validates unique email constraints and role assignments.

3. **Products Catalog (`src/products/products.service.spec.ts`)**:
   - Enforces unique SKU and slug generation per tenant.
   - Verifies seller ownership: prevents Vendor A from editing Vendor B's catalog items (`ForbiddenException`).
   - Triggers automated background pgvector embedding generation upon product creation.

4. **Order Processing (`src/orders/orders.service.spec.ts`)**:
   - Converts cart items to immutable order line items within a Prisma atomic transaction (`$transaction`).
   - Verifies stock availability; decrements quantity on order confirmation.
   - Restores stock back to inventory if an order transitions to `CANCELLED`.

5. **Payments (`src/payments/payments.service.spec.ts`)**:
   - Generates Stripe PaymentIntents with currency and amount verification.
   - Protects against cross-user payment intent generation.

6. **AI Services (`src/ai/ai.service.spec.ts`)**:
   - Tests RAG shopping assistant query pipeline.
   - Validates **graceful relational fallback**: if FastAPI AI service is unreachable, falls back to SQL keyword search with zero downtime.
   - Tests seller marketing copy generator and similarity recommendations.

7. **Analytics & BI (`src/analytics/analytics.service.spec.ts`)**:
   - Tests seller Gross Sales, Net Revenue, Orders, and AOV calculations.
   - Tests platform GMV, take-rate commissions, and active vendor statistics.
   - Tests telemetry event ingestion (`PRODUCT_VIEW`, `CART_ADD`).

### Execution:

```bash
# Run backend test suites
pnpm --filter api run test
```

---

## 4. Frontend Testing (Playwright E2E)

Playwright E2E suites validate end-to-end user journeys in real browser contexts (Chromium, Firefox, WebKit, Mobile Chrome).

### Test Specs (`apps/web/e2e/`):

1. **`auth.spec.ts`**:
   - Renders login form, validates email format and password length.
   - Tests error banner display on invalid credentials (`invalid@dokanos.dev`).
   - Tests demo accounts autofill (Buyer, Seller, Admin).
   - Validates redirect to `/dashboard` for Sellers and `/products` for Buyers.

2. **`products.spec.ts`**:
   - Tests dynamic product grid rendering with store labels and stock indicators.
   - Tests category filtering (e.g., Audio, Laptops, Accessories).
   - Tests live search query filtering by product title.
   - Tests adding items to shopping cart and verifies real-time badge count increment.

3. **`cart.spec.ts`**:
   - Tests itemized cart breakdown with unit and line-item totals.
   - Tests quantity increment (`+`) and decrement (`-`) controls.
   - Tests promotional coupon code application (`DOKAN10` applies 10% discount).
   - Tests item removal and empty cart display state.

4. **`checkout.spec.ts`**:
   - Validates shipping address inputs (Name, Email, Street, City, Zip).
   - Tests payment method radio toggles (Stripe Card vs Cash On Delivery).
   - Simulates order processing and verifies order confirmation receipt with generated Order ID (`DKN-XXXXXX`).

5. **`seller-dashboard.spec.ts`**:
   - Verifies Seller BI dashboard metric cards: Gross Sales, Net Revenue, Orders, Conversion Rate.
   - Tests tab navigation between Seller Dashboard and Admin Platform Intelligence.
   - Tests time-range selector filters (`7d`, `30d`, `90d`, `1y`).

### Execution:

```bash
# Run Playwright E2E tests
pnpm --filter web run test:e2e

# Run with interactive UI mode
pnpm --filter web run test:e2e:ui
```

---

## 5. API Testing (Postman Collection)

Located in `docs/postman/`:

- `DokanOS_API.postman_collection.json` (Postman Collection v2.1.0 format)
- `DokanOS_Environment.postman_environment.json` (Environment variables configuration)

### Test Coverage:

- **Authentication**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/users/profile`.
  - Automatic token capture script: extracts `accessToken` and sets `pm.environment.set("jwt_token", ...)` automatically for subsequent authenticated calls.
- **Product APIs**: `GET /api/v1/products`, `GET /api/v1/products/:id`, `POST /api/v1/products`, `PATCH /api/v1/products/:id`.
- **Order APIs**: `POST /api/v1/orders`, `GET /api/v1/orders`, `PATCH /api/v1/orders/:id/status`.
- **AI APIs**: `POST /api/v1/ai/chat`, `GET /api/v1/ai/recommendations/:id`, `POST /api/v1/ai/copywrite`, `GET :8000/search`.
- **Analytics APIs**: `GET /api/v1/analytics/seller/dashboard`, `GET /api/v1/analytics/admin/intelligence`, `POST /api/v1/analytics/events`.
- **Payments APIs**: `POST /api/v1/payments/create-intent`.

---

## 6. Code Quality & Pre-Commit Governance

### 1. Prettier (`.prettierrc`, `.prettierignore`):

- Single quotes, trailing commas, 100 character print width, 2 space indentation.
- Configured in root workspace and applied to all `.ts`, `.tsx`, `.js`, `.json`, `.css`, and `.md` files.

### 2. ESLint:

- Configured with Next.js Core Web Vitals and TypeScript strict rules in `apps/web`.
- High-performance type-aware linting in `apps/api`.

### 3. Husky & Commit Hooks (`.husky/`):

- **`pre-commit`**: Runs `lint-staged` on staged files before every commit, ensuring unformatted code is never committed.
- **`commit-msg`**: Validates Conventional Commit message formats:
  - Format: `<type>(<scope>): <subject>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - Example: `feat(orders): implement stock restoration on order cancellation`.

---

## 7. Security Architecture Review

### 1. Authentication Security:

- **Bcrypt Hashing**: Passwords hashed with 10 salt rounds. Plaintext passwords never stored or returned in DTOs.
- **JWT Protection**: Access tokens are short-lived with user ID and role claims. Refresh tokens are tracked for revocation.
- **Account Suspension Guard**: Suspended accounts are immediately blocked from authentication and token renewal.

### 2. Authorization & Tenant Isolation (RBAC):

- **Role Hierarchy**: System strictly differentiates `CUSTOMER`, `SELLER`, and `ADMIN`.
- **Tenant Boundaries**: Sellers cannot inspect or modify products or orders belonging to another store. Every mutating query verifies ownership against `store.ownerId`.
- **Admin Privilege**: Platform intelligence, user status modifications, and dispute resolutions are restricted to `ADMIN` roles.

### 3. Input Validation:

- **NestJS Global ValidationPipe**:
  - `whitelist: true`: Strips unknown properties from request bodies.
  - `forbidNonWhitelisted: true`: Rejects payloads with extraneous fields (prevents mass-assignment vulnerabilities).
  - `transform: true`: Automatically transforms incoming payloads into typed DTO instances.
- **Injection Prevention**: All database interactions use Prisma Client parameterized queries, neutralizing SQL injection vectors.

### 4. API & Infrastructure Security:

- **CORS Policy**: Configured to restrict unauthorized cross-origin requests.
- **Secret Governance**: API keys (Stripe, OpenAI, JWT secrets, Database passwords) injected strictly via environment variables (`.env`), barred from git tracking via `.gitignore`.
- **Error Sanitization**: Production error responses suppress internal stack traces and database schema errors.
