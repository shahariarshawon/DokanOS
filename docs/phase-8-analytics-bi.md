# DokanOS Phase 8: Analytics and Business Intelligence Architecture

## 1. Executive Summary & Architecture Overview

DokanOS Phase 8 delivers a comprehensive, production-grade **Analytics and Business Intelligence (BI)** engine for both marketplace sellers and platform administrators.

The system combines:

1. **Telemetry & Event Ingestion Pipeline**: High-throughput, non-blocking ingestion of customer interactions (`PRODUCT_VIEW`, `STORE_VIEW`, `ADD_TO_CART`, `CHECKOUT_START`, `PURCHASE`).
2. **Optimized Aggregation & Snapshot Data Structure**: Real-time indexed relational aggregations combined with daily snapshot tables (`DailyStoreAnalytics` and `DailyPlatformAnalytics`) for zero-lag historical trend reporting.
3. **Multi-Tier Caching Architecture**: Primary Redis caching with transparent in-memory TTL fallback to protect the primary transactional database from high-frequency dashboard queries.
4. **Interactive Next.js Dashboard**: Visualized with Recharts, featuring continuous time-series area charts, order volume bar charts, payment distribution pie charts, top-performing product rankings, and real-time shopper activity streams.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│   Next.js 16 Web Dashboard (/dashboard, Recharts, Tabs)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 NestJS Backend API Gateway                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   AnalyticsModule                     │  │
│  │  - AnalyticsController (/analytics/seller, /admin)    │  │
│  │  - AnalyticsService (Metrics, Growth, Timelines)      │  │
│  │  - Telemetry Ingestion (/analytics/events)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ▼                               ▼              │
│     ┌─────────────────┐             ┌─────────────────┐     │
│     │  RedisService   │  Fallback   │  In-Memory Map  │     │
│     │  (5-min TTL)    │ ──────────► │  (Local Cache)  │     │
│     └─────────────────┘             └─────────────────┘     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Optimized SQL + Composite Indexes
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL 16 Database                     │
│  - orders, order_items, payments, users, stores, products   │
│  - analytics_events (Event Stream)                          │
│  - daily_store_analytics (Pre-aggregated Snapshots)         │
│  - daily_platform_analytics (Platform Daily Rollups)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Metrics & Dashboards Breakdown

### A. Seller Dashboard (`/analytics/seller/dashboard`)

Designed for merchant store owners to monitor sales velocity, financial earnings, and customer funnel performance:

| Metric                        | Calculation / Source                                                                         | Purpose                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Total Sales**               | $\sum \text{OrderItem.totalPrice}$ for orders not cancelled/refunded                         | Gross customer transaction volume                          |
| **Net Revenue**               | $\sum \text{OrderItem.vendorPayoutAmount}$                                                   | Net seller earnings after marketplace take-rate commission |
| **Orders Count**              | $\text{COUNT}(\text{DISTINCT } \text{OrderItem.orderId})$                                    | Total orders placed containing store items                 |
| **Items Sold**                | $\sum \text{OrderItem.quantity}$                                                             | Total individual SKU units purchased                       |
| **Average Order Value (AOV)** | $\frac{\text{TotalSales}}{\text{OrdersCount}}$                                               | Average basket spend per order                             |
| **Conversion Rate**           | $\frac{\text{Completed Orders}}{\text{Total Product/Store Views}} \times 100\%$              | Storefront conversion efficiency                           |
| **Growth Statistics**         | $\frac{\text{Current Period} - \text{Previous Period}}{\text{Previous Period}} \times 100\%$ | Period-over-period trajectory (Sales, Orders, Revenue)     |
| **Sales & Revenue Timeline**  | Daily continuous bucket of gross sales vs net payout                                         | Visualizes cash flow and sales seasonality                 |
| **Top Products**              | Grouped by `productId`, sorted by revenue & units                                            | Identifies hero products and inventory replenishment needs |
| **Customer Activity**         | Chronological stream of recent orders and customer names                                     | Real-time merchant fulfillment awareness                   |

### B. Admin Dashboard (`/analytics/admin/dashboard`)

Designed for marketplace administrators to monitor platform health, liquidity, and growth:

| Metric                      | Calculation / Source                                                       | Purpose                                           |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| **Platform GMV**            | $\sum \text{Order.totalAmount}$ across all marketplace stores              | Gross Marketplace Volume                          |
| **Platform Revenue**        | $\sum \text{OrderItem.commissionAmount}$                                   | Net commissions earned by DokanOS platform        |
| **Take Rate**               | $\frac{\text{PlatformRevenue}}{\text{PlatformGMV}} \times 100\%$           | Effective platform monetization rate (~10%)       |
| **Total Users & Breakdown** | $\text{COUNT}(User)$ grouped by role and status                            | Measures audience acquisition and merchant supply |
| **Active Sellers**          | Verified `SellerProfile` records with active stores                        | Healthy supplier liquidity                        |
| **Transaction Health**      | Grouped by `Payment.status` (`COMPLETED`, `PENDING`, `FAILED`, `REFUNDED`) | Gateway settlement reliability                    |
| **Gateway Distribution**    | Grouped by `Payment.provider` (`STRIPE`, `SSLCOMMERZ`)                     | Payment processor adoption                        |
| **Growth Rates**            | Period-over-period % change in GMV, Orders, and Users                      | Month-over-month marketplace expansion            |
| **Top Merchant Stores**     | Stores ranked by GMV, commission paid, and review rating                   | Merchant relationship management and tiering      |

---

## 3. Database Schema & Query Optimization

### Prisma Schema Additions (`apps/api/prisma/schema.prisma`)

```prisma
enum AnalyticsEventType {
  PAGE_VIEW
  PRODUCT_VIEW
  STORE_VIEW
  ADD_TO_CART
  REMOVE_FROM_CART
  SEARCH
  CHECKOUT_START
  PURCHASE
}

model AnalyticsEvent {
  id        String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventType AnalyticsEventType
  userId    String?            @db.Uuid
  sessionId String?            @db.VarChar(100)
  storeId   String?            @db.Uuid
  productId String?            @db.Uuid
  metadata  Json?              @db.JsonB
  ipAddress String?            @db.VarChar(45)
  userAgent String?            @db.Text
  createdAt DateTime           @default(now()) @db.Timestamptz

  user      User?              @relation(fields: [userId], references: [id], onDelete: SetNull)
  store     Store?             @relation(fields: [storeId], references: [id], onDelete: Cascade)
  product   Product?           @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([storeId, eventType, createdAt])
  @@index([productId, eventType, createdAt])
  @@index([eventType, createdAt])
  @@index([sessionId, createdAt])
  @@map("analytics_events")
}

model DailyStoreAnalytics {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  storeId        String   @db.Uuid
  date           DateTime @db.Date
  grossSales     Decimal  @default(0.00) @db.Decimal(12, 2)
  netRevenue     Decimal  @default(0.00) @db.Decimal(12, 2)
  commissionPaid Decimal  @default(0.00) @db.Decimal(12, 2)
  orderCount     Int      @default(0)
  itemsSold      Int      @default(0)
  viewCount      Int      @default(0)
  cartAddCount   Int      @default(0)
  conversionRate Decimal  @default(0.00) @db.Decimal(5, 2)
  createdAt      DateTime @default(now()) @db.Timestamptz
  updatedAt      DateTime @updatedAt @db.Timestamptz

  store          Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([storeId, date])
  @@index([date])
  @@map("daily_store_analytics")
}

model DailyPlatformAnalytics {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  date            DateTime @unique @db.Date
  totalGmv        Decimal  @default(0.00) @db.Decimal(14, 2)
  platformRevenue Decimal  @default(0.00) @db.Decimal(14, 2)
  totalOrders     Int      @default(0)
  totalItemsSold  Int      @default(0)
  newUsers        Int      @default(0)
  newSellers      Int      @default(0)
  activeSellers   Int      @default(0)
  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @updatedAt @db.Timestamptz

  @@index([date])
  @@map("daily_platform_analytics")
}
```

### Composite Index Optimization

To ensure sub-20ms queries across millions of rows, composite B-Tree indexes were added:

- `order_items`:
  - `@@index([storeId, createdAt])`: Accelerates seller time-range aggregation queries.
  - `@@index([productId, createdAt])`: Accelerates top-product sales ranking.
- `orders`:
  - `@@index([status, placedAt])`: Accelerates platform GMV queries filtering out cancelled orders.
- `analytics_events`:
  - `@@index([storeId, eventType, createdAt])`: Optimizes conversion rate calculation.

---

## 4. Multi-Tier Caching Strategy

```
Client Dashboard Request (e.g. range=30d)
                  │
                  ▼
         Check Redis Cache
         Key: analytics:seller:{storeId}:{range}:{dates}
                  │
        ┌─────────┴─────────┐
        │                   │
     Hit (< 1ms)         Miss / Disconnected
        │                   │
        ▼                   ▼
Return Cached JSON     Check In-Memory Map
                            │
                   ┌────────┴────────┐
                   │                 │
                Hit (< 1ms)       Miss
                   │                 │
                   ▼                 ▼
          Return Cached JSON    Execute Prisma SQL
                                     │
                                     ▼
                            Set Redis + Memory Cache (TTL: 300s)
```

- **TTL Duration**: 300 seconds (5 minutes). This reduces database query frequency by up to 99% under high concurrent dashboard traffic.
- **Cache Invalidation / Bypass**: Suffixing requests with `?refresh=true` bypasses the cache and recomputes the metrics directly from source tables.

---

## 5. Frontend Dashboard Implementation (`apps/web`)

1. **Dashboard Hub (`/dashboard`)**:
   - Tab switcher between **Seller Dashboard** and **Admin Intelligence**.
   - Time-range selector (`7 Days`, `30 Days`, `90 Days`, `1 Year`).
   - Interactive refresh button with spinner state.
   - Live sync status indicator with UTC/local timestamp.
2. **Recharts Component Suite (`chart-components.tsx`)**:
   - `RevenueAreaChart`: Smooth dual-area chart with linear gradients for Sales and Net Revenue.
   - `OrdersTrafficBarChart`: Bar visualization of daily order counts.
   - `PlatformGmvChart`: Multi-area chart comparing gross marketplace volume and platform commissions.
   - `DistributionPie`: Donut chart showing payment processor split (Stripe vs SSLCOMMERZ) and transaction status distributions.
3. **Responsive UI**:
   - Tailwind CSS with high-contrast dark mode (`bg-black`, `border-zinc-800`).
   - Lucide icons for semantic visual hierarchy.

---

## 6. Architecture Decisions & Trade-Offs

| Decision                         | Chosen Approach                                           | Rationale                                                                                  | Alternatives Considered                                                                                             |
| -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Aggregations vs Live Queries** | Hybrid (Live Indexed Relational + Snapshot Rollup Tables) | Sub-millisecond performance with full transactional accuracy and zero drift                | Heavy OLAP cluster (ClickHouse / Snowflake) was rejected to avoid unnecessary operational overhead at current scale |
| **Event Tracking Storage**       | PostgreSQL Table (`AnalyticsEvent`)                       | Relational foreign keys with stores and products, zero extra database infrastructure       | Kafka / Segment (Overkill for Phase 8 requirements)                                                                 |
| **Chart Library**                | Recharts 3.x with SSR Client Components                   | Declarative React SVG rendering, zero canvas complexity, full responsive container support | Chart.js, D3.js (Heavier bundle, less idiomatic in React 19)                                                        |
| **Caching Layer**                | Redis + In-Memory Fallback Map                            | High availability: works seamlessly in single-node dev and distributed multi-replica prod  | Pure in-memory cache (Fails to share state across load-balanced API instances)                                      |
