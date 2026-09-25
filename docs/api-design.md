# DokanOS REST API Specification

> **Status:** Canonical REST API Specification  
> **API Version:** `v1`  
> **Base URL:** `/api/v1`  
> **Target Audience:** Frontend Developers, Backend Engineers, QA Engineers, AI Agents

---

## 1. Global API Conventions & Standards

### 1.1. Base URL & Protocol

- All endpoints are prefixed with `/api/v1`.
- Production traffic strictly enforces **HTTPS**.
- All request and response bodies use **JSON** (`Content-Type: application/json`), unless explicitly noted (e.g. multipart file uploads or webhook raw payloads).

### 1.2. Standard Request Headers

| Header            | Description                                                          | Required             | Example                                |
| :---------------- | :------------------------------------------------------------------- | :------------------- | :------------------------------------- |
| `Authorization`   | Bearer JWT access token for protected endpoints                      | Conditional          | `Bearer eyJhbGciOiJIUzI1Ni...`         |
| `Content-Type`    | MIME type of the payload                                             | Yes (for POST/PATCH) | `application/json`                     |
| `Idempotency-Key` | UUID to prevent duplicate mutations (e.g. checkout, payments)        | Recommended          | `9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d` |
| `X-Session-Token` | Ephemeral guest session tracking for unauthenticated carts & AI chat | Optional             | `sess_8f3a9e1b2c4d`                    |
| `X-Request-Id`    | Unique tracing identifier propagated through logs and responses      | Automatic / Optional | `req_01HPX7K9M...`                     |

---

## 2. Standardized Response Envelope & Status Codes

### 2.1. Success Envelope Format

Every successful response returns a standardized JSON structure:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-09-24T15:30:00.000Z",
  "path": "/api/v1/products"
}
```

For paginated collections:

```json
{
  "success": true,
  "statusCode": 200,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 142,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2026-09-24T15:30:00.000Z",
  "path": "/api/v1/products"
}
```

### 2.2. Error Envelope Format (RFC 7807 Inspired)

Failed requests return a structured error envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed",
    "details": [
      {
        "field": "price",
        "issue": "Price must be a positive number greater than 0"
      },
      {
        "field": "stockQuantity",
        "issue": "stockQuantity must not be negative"
      }
    ]
  },
  "timestamp": "2026-09-24T15:30:00.000Z",
  "path": "/api/v1/products"
}
```

### 2.3. HTTP Status Codes Reference

| Code  | Status                    | Usage in DokanOS                                                                                                            |
| :---- | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------- |
| `200` | **OK**                    | Standard successful response for `GET`, `PATCH`, and non-creational `POST`.                                                 |
| `201` | **Created**               | Resource successfully created via `POST` (e.g., user registered, product created, order placed).                            |
| `204` | **No Content**            | Mutation succeeded with nothing to return (e.g. `DELETE /products/:id`).                                                    |
| `400` | **Bad Request**           | Malformed JSON syntax or schema validation error via `class-validator`.                                                     |
| `401` | **Unauthorized**          | Missing, malformed, or expired JWT access token.                                                                            |
| `403` | **Forbidden**             | Valid token, but user lacks permissions (e.g. Customer accessing seller routes, or Seller editing another store's product). |
| `404` | **Not Found**             | Resource identified by UUID/slug does not exist.                                                                            |
| `409` | **Conflict**              | Unique constraint violation (e.g. email already exists, store slug taken).                                                  |
| `422` | **Unprocessable Entity**  | Business rule failed (e.g. checkout attempted on out-of-stock product).                                                     |
| `429` | **Too Many Requests**     | Rate limit threshold exceeded on Redis sliding-window guard.                                                                |
| `500` | **Internal Server Error** | Unexpected unhandled server exception.                                                                                      |

---

## 3. Authentication Domain

### 3.1. `POST /auth/register`

- **HTTP Method:** `POST`
- **Purpose:** Create a new user account (Customer or Seller).
- **Authentication:** `Public` (No token required)
- **Request Body:**

```json
{
  "email": "sarah.merchant@example.com",
  "password": "SecurePassword123!",
  "firstName": "Sarah",
  "lastName": "Rahman",
  "phone": "+8801712345678",
  "role": "SELLER"
}
```

_Validation Rules:_

- `email`: valid email string, required, normalized lowercase
- `password`: string, min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
- `firstName`: string, 2-100 chars, required
- `lastName`: string, 2-100 chars, required
- `phone`: optional valid E.164 phone string
- `role`: optional enum (`CUSTOMER` | `SELLER`), default `CUSTOMER`

- **Response Format (`201 Created`):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "user": {
      "id": "e9b25126-7d84-4824-a74d-91b7e4521401",
      "email": "sarah.merchant@example.com",
      "firstName": "Sarah",
      "lastName": "Rahman",
      "role": "SELLER",
      "status": "ACTIVE",
      "createdAt": "2026-09-24T15:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-09-24T15:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

_Headers Sent:_ `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800`

- **Error Cases:**
  - `400 Bad Request`: Validation failure on weak password or missing fields (`VALIDATION_FAILED`).
  - `409 Conflict`: Email already registered (`EMAIL_ALREADY_EXISTS`).
  - `429 Too Many Requests`: Registration rate limit exceeded.

---

### 3.2. `POST /auth/login`

- **HTTP Method:** `POST`
- **Purpose:** Authenticate credentials, issue short-lived access token, and establish refresh session in Redis.
- **Authentication:** `Public`
- **Request Body:**

```json
{
  "email": "sarah.merchant@example.com",
  "password": "SecurePassword123!"
}
```

- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": "e9b25126-7d84-4824-a74d-91b7e4521401",
      "email": "sarah.merchant@example.com",
      "firstName": "Sarah",
      "lastName": "Rahman",
      "role": "SELLER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-09-24T15:35:00.000Z",
  "path": "/api/v1/auth/login"
}
```

_Headers Sent:_ `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800`

- **Error Cases:**
  - `400 Bad Request`: Malformed email or missing password.
  - `401 Unauthorized`: Invalid credentials or password mismatch (`INVALID_CREDENTIALS`).
  - `403 Forbidden`: Account suspended or deactivated (`ACCOUNT_SUSPENDED`).
  - `429 Too Many Requests`: Exceeded 5 failed login attempts in 15 minutes.

---

### 3.3. `POST /auth/refresh`

- **HTTP Method:** `POST`
- **Purpose:** Rotate refresh token and issue a fresh access token without requiring re-login.
- **Authentication:** `Cookie-based` (`refreshToken` cookie required)
- **Request Body:** `{}` (Empty; token read from HTTP-only Cookie or optional `{ "refreshToken": "..." }` body fallback for non-browser mobile clients).
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "timestamp": "2026-09-24T15:50:00.000Z",
  "path": "/api/v1/auth/refresh"
}
```

_Headers Sent:_ Rotated `Set-Cookie: refreshToken=new_token; HttpOnly; Secure; SameSite=Strict; ...`

- **Error Cases:**
  - `401 Unauthorized`: Missing, expired, or invalid refresh token (`REFRESH_TOKEN_INVALID`).
  - `403 Forbidden`: Token reuse detected! (Causes automatic revocation of all family sessions in Redis).

---

## 4. Users Domain

### 4.1. `GET /users/profile`

- **HTTP Method:** `GET`
- **Purpose:** Retrieve the full authenticated user profile, active role, notification counter, and store affiliation (if Seller).
- **Authentication:** `Bearer JWT` (Any authenticated user)
- **Request Body:** None
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "e9b25126-7d84-4824-a74d-91b7e4521401",
    "email": "sarah.merchant@example.com",
    "firstName": "Sarah",
    "lastName": "Rahman",
    "phone": "+8801712345678",
    "avatarUrl": "https://cdn.dokanos.com/avatars/sarah.webp",
    "role": "SELLER",
    "status": "ACTIVE",
    "sellerProfile": {
      "id": "67f1a308-4e8c-4bc3-a612-4f3df91192b1",
      "businessName": "Rahman Tech Dynamics Ltd.",
      "verificationStatus": "VERIFIED",
      "stores": [
        {
          "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
          "name": "Gadget Hub",
          "slug": "gadget-hub",
          "status": "ACTIVE"
        }
      ]
    },
    "unreadNotificationsCount": 3,
    "createdAt": "2026-09-24T15:30:00.000Z"
  },
  "timestamp": "2026-09-24T15:55:00.000Z",
  "path": "/api/v1/users/profile"
}
```

- **Error Cases:**
  - `401 Unauthorized`: Token missing or expired.
  - `404 Not Found`: User no longer exists in database (`USER_NOT_FOUND`).

---

## 5. Stores Domain

### 5.1. `POST /stores`

- **HTTP Method:** `POST`
- **Purpose:** Create a new vendor storefront on the marketplace.
- **Authentication:** `Bearer JWT` (Role: `SELLER` or `ADMIN`)
- **Request Body:**

```json
{
  "name": "Gadget Hub",
  "slug": "gadget-hub",
  "description": "Your premier source for genuine mechanical keyboards, audio gear, and laptops.",
  "logoUrl": "https://cdn.dokanos.com/stores/gadget-hub/logo.webp",
  "bannerUrl": "https://cdn.dokanos.com/stores/gadget-hub/banner.webp"
}
```

_Validation Rules:_

- `name`: string, 2-150 chars, required
- `slug`: string, lowercase alphanumeric and hyphens only, 2-160 chars, required
- `description`: optional string, max 2000 chars
- `logoUrl`: optional valid URI
- `bannerUrl`: optional valid URI

- **Response Format (`201 Created`):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
    "name": "Gadget Hub",
    "slug": "gadget-hub",
    "description": "Your premier source for genuine mechanical keyboards, audio gear, and laptops.",
    "status": "PENDING",
    "commissionRate": "10.00",
    "rating": "0.00",
    "reviewCount": 0,
    "createdAt": "2026-09-24T16:00:00.000Z"
  },
  "timestamp": "2026-09-24T16:00:00.000Z",
  "path": "/api/v1/stores"
}
```

- **Error Cases:**
  - `400 Bad Request`: Invalid slug format (e.g. contains spaces or special characters).
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: User has `CUSTOMER` role; must upgrade to `SELLER` first (`SELLER_PROFILE_REQUIRED`).
  - `409 Conflict`: Store slug is already taken (`STORE_SLUG_TAKEN`).

---

### 5.2. `GET /stores/:slug`

- **HTTP Method:** `GET`
- **Purpose:** Public endpoint to view a vendor's storefront profile, statistics, and policies.
- **Authentication:** `Public`
- **Request Parameters:**
  - `slug`: URL slug string (e.g. `gadget-hub`)
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
    "name": "Gadget Hub",
    "slug": "gadget-hub",
    "description": "Your premier source for genuine mechanical keyboards, audio gear, and laptops.",
    "logoUrl": "https://cdn.dokanos.com/stores/gadget-hub/logo.webp",
    "bannerUrl": "https://cdn.dokanos.com/stores/gadget-hub/banner.webp",
    "rating": "4.85",
    "reviewCount": 128,
    "totalProducts": 42,
    "isVerifiedSeller": true,
    "createdAt": "2026-09-24T16:00:00.000Z"
  },
  "timestamp": "2026-09-24T16:05:00.000Z",
  "path": "/api/v1/stores/gadget-hub"
}
```

- **Error Cases:**
  - `404 Not Found`: Store with slug not found or suspended (`STORE_NOT_FOUND`).

---

## 6. Products Domain

### 6.1. `POST /products`

- **HTTP Method:** `POST`
- **Purpose:** Create a new product SKU in a vendor store. Automatically triggers asynchronous embedding generation in the AI service.
- **Authentication:** `Bearer JWT` (Role: `SELLER`, `ADMIN`)
- **Request Body:**

```json
{
  "storeId": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
  "categoryId": "4c94b712-32a1-4089-9cb1-7c98112e45fa",
  "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
  "slug": "keychron-q1-pro-wireless-mechanical-keyboard",
  "description": "Full aluminum 75% mechanical keyboard with wireless Bluetooth 5.1 and QMK/VIA support.",
  "sku": "KEY-Q1P-BLK-RED",
  "barcode": "8901234567890",
  "price": 199.99,
  "compareAtPrice": 219.99,
  "costPrice": 130.0,
  "stockQuantity": 35,
  "lowStockThreshold": 5,
  "status": "ACTIVE",
  "attributes": {
    "switchType": "K Pro Red (Linear)",
    "connectivity": "Bluetooth 5.1 & Type-C",
    "layout": "75% ANSI",
    "color": "Carbon Black"
  },
  "images": [
    {
      "url": "https://cdn.dokanos.com/products/keychron-q1-hero.webp",
      "altText": "Keychron Q1 Pro angled view",
      "sortOrder": 0,
      "isPrimary": true
    },
    {
      "url": "https://cdn.dokanos.com/products/keychron-q1-top.webp",
      "altText": "Keychron Q1 Pro top-down layout",
      "sortOrder": 1,
      "isPrimary": false
    }
  ]
}
```

- **Response Format (`201 Created`):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "f4892c10-9b41-47fa-891d-5c782103a891",
    "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
    "slug": "keychron-q1-pro-wireless-mechanical-keyboard",
    "sku": "KEY-Q1P-BLK-RED",
    "price": "199.99",
    "stockQuantity": 35,
    "status": "ACTIVE",
    "embeddingStatus": "QUEUED",
    "createdAt": "2026-09-24T16:15:00.000Z"
  },
  "timestamp": "2026-09-24T16:15:00.000Z",
  "path": "/api/v1/products"
}
```

- **Error Cases:**
  - `400 Bad Request`: Negative price or stock quantity (`INVALID_INPUT`).
  - `403 Forbidden`: Authenticated seller does not own `storeId` (`FORBIDDEN_STORE_ACCESS`).
  - `404 Not Found`: `categoryId` or `storeId` does not exist.
  - `409 Conflict`: Slug or SKU within this store already exists (`SKU_ALREADY_EXISTS`).

---

### 6.2. `GET /products`

- **HTTP Method:** `GET`
- **Purpose:** Public marketplace catalog browsing with full filtering, sorting, and pagination.
- **Authentication:** `Public`
- **Query Parameters:**
  - `page`: integer (default `1`)
  - `limit`: integer (default `20`, max `100`)
  - `search`: string (FTS keyword match against title/description)
  - `categoryId`: UUID
  - `storeId`: UUID
  - `minPrice`: decimal
  - `maxPrice`: decimal
  - `status`: string (default `ACTIVE`)
  - `sortBy`: `price_asc` | `price_desc` | `newest` | `rating` (default `newest`)
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "f4892c10-9b41-47fa-891d-5c782103a891",
      "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
      "slug": "keychron-q1-pro-wireless-mechanical-keyboard",
      "price": "199.99",
      "compareAtPrice": "219.99",
      "stockQuantity": 35,
      "rating": "4.90",
      "reviewCount": 18,
      "primaryImage": "https://cdn.dokanos.com/products/keychron-q1-hero.webp",
      "store": {
        "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
        "name": "Gadget Hub",
        "slug": "gadget-hub"
      },
      "category": {
        "id": "4c94b712-32a1-4089-9cb1-7c98112e45fa",
        "name": "Keyboards",
        "slug": "keyboards"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2026-09-24T16:20:00.000Z",
  "path": "/api/v1/products"
}
```

---

### 6.3. `GET /products/:id`

- **HTTP Method:** `GET`
- **Purpose:** Public product detail view with full specifications, gallery images, and seller ratings.
- **Authentication:** `Public`
- **Parameters:**
  - `id`: UUID or slug
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "f4892c10-9b41-47fa-891d-5c782103a891",
    "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
    "slug": "keychron-q1-pro-wireless-mechanical-keyboard",
    "description": "Full aluminum 75% mechanical keyboard with wireless Bluetooth 5.1 and QMK/VIA support.",
    "sku": "KEY-Q1P-BLK-RED",
    "price": "199.99",
    "compareAtPrice": "219.99",
    "stockQuantity": 35,
    "status": "ACTIVE",
    "rating": "4.90",
    "reviewCount": 18,
    "attributes": {
      "switchType": "K Pro Red (Linear)",
      "connectivity": "Bluetooth 5.1 & Type-C",
      "layout": "75% ANSI",
      "color": "Carbon Black"
    },
    "images": [
      {
        "id": "c1a938d2-5a41-49b1-872e-0a41d9182390",
        "url": "https://cdn.dokanos.com/products/keychron-q1-hero.webp",
        "altText": "Keychron Q1 Pro angled view",
        "sortOrder": 0,
        "isPrimary": true
      }
    ],
    "store": {
      "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
      "name": "Gadget Hub",
      "slug": "gadget-hub",
      "rating": "4.85"
    }
  },
  "timestamp": "2026-09-24T16:25:00.000Z",
  "path": "/api/v1/products/f4892c10-9b41-47fa-891d-5c782103a891"
}
```

- **Error Cases:**
  - `404 Not Found`: Product ID does not exist (`PRODUCT_NOT_FOUND`).

---

### 6.4. `PATCH /products/:id`

- **HTTP Method:** `PATCH`
- **Purpose:** Update product inventory, pricing, or metadata.
- **Authentication:** `Bearer JWT` (Role: `SELLER` who owns the store, or `ADMIN`)
- **Request Body (Partial Update):**

```json
{
  "price": 189.99,
  "stockQuantity": 50,
  "status": "ACTIVE"
}
```

- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "f4892c10-9b41-47fa-891d-5c782103a891",
    "price": "189.99",
    "stockQuantity": 50,
    "status": "ACTIVE",
    "updatedAt": "2026-09-24T16:30:00.000Z"
  },
  "timestamp": "2026-09-24T16:30:00.000Z",
  "path": "/api/v1/products/f4892c10-9b41-47fa-891d-5c782103a891"
}
```

- **Error Cases:**
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Authenticated user is not the owner of the store listing this product (`OWNERSHIP_VIOLATION`).
  - `404 Not Found`: Product not found.

---

### 6.5. `DELETE /products/:id`

- **HTTP Method:** `DELETE`
- **Purpose:** Soft-delete/archive a product so historical orders remain intact.
- **Authentication:** `Bearer JWT` (Role: `SELLER` owner, or `ADMIN`)
- **Request Body:** None
- **Response Format (`200 OK` or `204 No Content`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "f4892c10-9b41-47fa-891d-5c782103a891",
    "status": "ARCHIVED",
    "message": "Product successfully archived"
  },
  "timestamp": "2026-09-24T16:35:00.000Z",
  "path": "/api/v1/products/f4892c10-9b41-47fa-891d-5c782103a891"
}
```

- **Error Cases:**
  - `403 Forbidden`: Attempting to delete another seller's product.
  - `404 Not Found`: Product not found.

---

## 7. Cart Domain

### 7.1. `GET /cart`

- **HTTP Method:** `GET`
- **Purpose:** Fetch the active user's cart (or guest cart via `X-Session-Token` header). Evaluates live stock availability for each item.
- **Authentication:** `Optional` (Supports authenticated Bearer token or `X-Session-Token` guest header)
- **Request Body:** None
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "8914bca0-3e21-49b9-91a4-7c98129a3411",
    "items": [
      {
        "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "productId": "f4892c10-9b41-47fa-891d-5c782103a891",
        "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
        "unitPrice": "199.99",
        "quantity": 2,
        "totalItemPrice": "399.98",
        "selectedAttributes": {
          "switchType": "K Pro Red (Linear)",
          "color": "Carbon Black"
        },
        "inStock": true,
        "availableQuantity": 35,
        "image": "https://cdn.dokanos.com/products/keychron-q1-hero.webp",
        "store": {
          "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
          "name": "Gadget Hub"
        }
      }
    ],
    "subtotal": "399.98",
    "itemCount": 2
  },
  "timestamp": "2026-09-24T16:40:00.000Z",
  "path": "/api/v1/cart"
}
```

---

### 7.2. `POST /cart/items`

- **HTTP Method:** `POST`
- **Purpose:** Add an item to the cart or increment its quantity if already present.
- **Authentication:** `Optional` (Bearer JWT or `X-Session-Token`)
- **Request Body:**

```json
{
  "productId": "f4892c10-9b41-47fa-891d-5c782103a891",
  "quantity": 1,
  "selectedAttributes": {
    "switchType": "K Pro Red (Linear)",
    "color": "Carbon Black"
  }
}
```

_Validation Rules:_

- `productId`: valid UUID, required
- `quantity`: integer >= 1, required
- `selectedAttributes`: optional key-value object

- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cartId": "8914bca0-3e21-49b9-91a4-7c98129a3411",
    "itemId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "quantity": 2,
    "subtotal": "399.98",
    "message": "Item added to cart"
  },
  "timestamp": "2026-09-24T16:45:00.000Z",
  "path": "/api/v1/cart/items"
}
```

- **Error Cases:**
  - `400 Bad Request`: `quantity` less than 1.
  - `404 Not Found`: `productId` does not exist.
  - `422 Unprocessable Entity`: Requested quantity exceeds available inventory (`INSUFFICIENT_STOCK`).

---

## 8. Orders Domain

### 8.1. `POST /orders`

- **HTTP Method:** `POST`
- **Purpose:** Checkout conversion. Atomically reserves product inventory, locks snapshots of line item prices in `OrderItem`, and creates a pending `Order`.
- **Authentication:** `Bearer JWT` (Role: `CUSTOMER`, `SELLER`, `ADMIN`)
- **Request Headers:**
  - `Idempotency-Key`: UUID (Recommended to prevent duplicate checkouts)
- **Request Body:**

```json
{
  "shippingAddress": {
    "recipientName": "Shahariar Arafat",
    "street": "House 12, Road 4, Sector 7",
    "city": "Uttara, Dhaka",
    "postalCode": "1230",
    "country": "Bangladesh",
    "phone": "+8801700000000"
  },
  "billingAddress": {
    "recipientName": "Shahariar Arafat",
    "street": "House 12, Road 4, Sector 7",
    "city": "Uttara, Dhaka",
    "postalCode": "1230",
    "country": "Bangladesh",
    "phone": "+8801700000000"
  },
  "customerNote": "Please call before delivery"
}
```

- **Response Format (`201 Created`):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "orderId": "e148a092-7489-4bc2-a1b9-389104bc1230",
    "orderNumber": "DOK-2026-90412",
    "status": "PENDING",
    "subtotal": "399.98",
    "taxAmount": "20.00",
    "shippingAmount": "15.00",
    "discountAmount": "0.00",
    "totalAmount": "434.98",
    "currency": "USD",
    "placedAt": "2026-09-24T16:50:00.000Z",
    "itemCount": 2
  },
  "timestamp": "2026-09-24T16:50:00.000Z",
  "path": "/api/v1/orders"
}
```

- **Error Cases:**
  - `400 Bad Request`: Cart is empty (`CART_EMPTY`).
  - `401 Unauthorized`: Unauthenticated.
  - `422 Unprocessable Entity`: One or more items in the cart are out of stock or price changed during checkout (`STOCK_CONFLICT`).

---

### 8.2. `GET /orders`

- **HTTP Method:** `GET`
- **Purpose:** Retrieve paginated order history for the current customer (or filtered vendor orders if user is a seller).
- **Authentication:** `Bearer JWT`
- **Query Parameters:**
  - `page`: integer (default `1`)
  - `limit`: integer (default `10`)
  - `status`: `PENDING` | `PAID` | `PROCESSING` | `SHIPPED` | `DELIVERED` | `CANCELLED`
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "e148a092-7489-4bc2-a1b9-389104bc1230",
      "orderNumber": "DOK-2026-90412",
      "status": "PAID",
      "totalAmount": "434.98",
      "currency": "USD",
      "placedAt": "2026-09-24T16:50:00.000Z",
      "items": [
        {
          "id": "4b918a20-3941-4ba2-8e10-91a238019b42",
          "productTitle": "Keychron Q1 Pro Wireless Mechanical Keyboard",
          "unitPrice": "199.99",
          "quantity": 2,
          "totalPrice": "399.98",
          "fulfillmentStatus": "PROCESSING",
          "store": {
            "name": "Gadget Hub",
            "slug": "gadget-hub"
          }
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2026-09-24T16:55:00.000Z",
  "path": "/api/v1/orders"
}
```

---

## 9. Payments Domain

### 9.1. `POST /payments/create`

- **HTTP Method:** `POST`
- **Purpose:** Initialize a payment intent (Stripe) or hosted checkout session (SSLCommerz) for an existing pending order.
- **Authentication:** `Bearer JWT`
- **Request Body:**

```json
{
  "orderId": "e148a092-7489-4bc2-a1b9-389104bc1230",
  "provider": "STRIPE"
}
```

_Validation Rules:_

- `orderId`: valid UUID, required
- `provider`: enum (`STRIPE` | `SSLCOMMERZ`), required

- **Response Format (`200 OK`):**
  _For Stripe:_

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "paymentId": "91a82bc1-49e0-47fa-891d-38910a2bc194",
    "provider": "STRIPE",
    "clientSecret": "pi_3MtwPdLkdIwHu7ix28a3tqPa_secret_98y4hfa...",
    "amount": "434.98",
    "currency": "usd"
  },
  "timestamp": "2026-09-24T17:00:00.000Z",
  "path": "/api/v1/payments/create"
}
```

_For SSLCommerz:_

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "paymentId": "91a82bc1-49e0-47fa-891d-38910a2bc194",
    "provider": "SSLCOMMERZ",
    "redirectUrl": "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=...",
    "amount": "434.98",
    "currency": "BDT"
  },
  "timestamp": "2026-09-24T17:00:00.000Z",
  "path": "/api/v1/payments/create"
}
```

- **Error Cases:**
  - `400 Bad Request`: Order is already paid (`ORDER_ALREADY_PAID`).
  - `403 Forbidden`: Authenticated user does not own this order (`ORDER_ACCESS_DENIED`).
  - `404 Not Found`: Order does not exist.

---

### 9.2. `POST /payments/webhook`

- **HTTP Method:** `POST`
- **Purpose:** Asynchronous payment notification endpoint. Validates raw cryptographic HMAC signatures and transitions orders from `PENDING` to `PAID`.
- **Authentication:** `Signature Verified` (Stripe `stripe-signature` header or SSLCommerz IPN hash)
- **Request Body:** Raw Gateway Webhook JSON payload.
- **Response Format (`200 OK`):**

```json
{
  "received": true
}
```

- **Error Cases:**
  - `400 Bad Request`: Invalid signature header (`SIGNATURE_VERIFICATION_FAILED`).
  - `409 Conflict`: Duplicate transaction webhook dropped via Redis idempotency key.

---

## 10. AI Domain

### 10.1. `POST /ai/chat`

- **HTTP Method:** `POST`
- **Purpose:** Conversational RAG shopping assistant. Translates natural language questions into vector embeddings, queries `pgvector`, and generates contextual product recommendations with citations.
- **Authentication:** `Optional` (Supports authenticated Bearer token or `X-Session-Token`)
- **Request Body:**

```json
{
  "conversationId": "38a19bc0-4e20-48a1-9cb1-7a89102b41c0",
  "message": "I need a durable mechanical keyboard with linear switches for coding under $200",
  "categoryFilter": "keyboards"
}
```

- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "conversationId": "38a19bc0-4e20-48a1-9cb1-7a89102b41c0",
    "reply": "I recommend the **Keychron Q1 Pro Wireless Mechanical Keyboard**. It features a full aluminum CNC chassis, hot-swappable K Pro Red linear switches (smooth and quiet for long coding sessions), and wireless Bluetooth connectivity for $199.99.",
    "recommendedProducts": [
      {
        "id": "f4892c10-9b41-47fa-891d-5c782103a891",
        "title": "Keychron Q1 Pro Wireless Mechanical Keyboard",
        "price": "199.99",
        "rating": "4.90",
        "image": "https://cdn.dokanos.com/products/keychron-q1-hero.webp",
        "similarityScore": 0.892
      }
    ]
  },
  "timestamp": "2026-09-24T17:10:00.000Z",
  "path": "/api/v1/ai/chat"
}
```

- **Error Cases:**
  - `400 Bad Request`: Message is empty or exceeds 500 characters.
  - `429 Too Many Requests`: Exceeded 20 AI queries per minute per user/IP (`AI_RATE_LIMIT_EXCEEDED`).
  - `503 Service Unavailable`: AI service temporarily unreachable.

---

### 10.2. `POST /ai/product-description`

- **HTTP Method:** `POST`
- **Purpose:** Seller Copilot tool. Generates high-converting markdown descriptions, SEO meta tags, and category classifications from minimal bullet points.
- **Authentication:** `Bearer JWT` (Role: `SELLER`, `ADMIN`)
- **Request Body:**

```json
{
  "title": "Ergonomic Bamboo Laptop Stand",
  "keyFeatures": [
    "100% natural organic bamboo",
    "6 adjustable height angles",
    "Ventilation hollows for heat dissipation",
    "Foldable and portable"
  ],
  "targetAudience": "Remote workers and programmers",
  "tone": "PROFESSIONAL"
}
```

- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "descriptionMarkdown": "### Elevate Your Ergonomics with Natural Bamboo\n\nCrafted from **100% sustainable organic bamboo**, this adjustable laptop riser delivers the perfect blend of minimalist aesthetics and posture-enhancing functionality...\n\n#### Key Highlights:\n- **6 Adjustable Angles:** Prevents neck fatigue.\n- **Optimized Cooling:** Hollow airflow design protects against thermal throttling.\n- **Travel Ready:** Folds flat in seconds.",
    "seoMeta": {
      "metaTitle": "Organic Bamboo Adjustable Laptop Stand | DokanOS",
      "metaDescription": "Enhance your desk posture with our 100% organic bamboo adjustable laptop stand. Features 6 elevation angles and natural cooling vents.",
      "keywords": [
        "bamboo laptop stand",
        "ergonomic desk riser",
        "sustainable wooden stand",
        "ventilated laptop cooling",
        "portable laptop holder"
      ]
    },
    "suggestedCategoryId": "3b91a820-410a-4891-8dc1-91a238019b11"
  },
  "timestamp": "2026-09-24T17:15:00.000Z",
  "path": "/api/v1/ai/product-description"
}
```

- **Error Cases:**
  - `400 Bad Request`: Missing title or key features.
  - `403 Forbidden`: Customers cannot use seller AI tools.
  - `429 Too Many Requests`: Exceeded monthly seller AI generation quota.

---

## 11. Real-Time & Chat Domain

### 11.1. `GET /conversations`

- **HTTP Method:** `GET`
- **Purpose:** Fetch the active messaging inbox for a customer or store, sorted by `lastMessageAt` with unread counts.
- **Authentication:** `Bearer JWT`
- **Query Parameters:**
  - `page`: integer (default `1`)
  - `limit`: integer (default `20`)
  - `storeId`: UUID (optional filter if seller is viewing a specific store inbox)
- **Response Format (`200 OK`):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "7a89102b-41c0-4e20-48a1-9cb138a19bc0",
      "lastMessageAt": "2026-09-24T17:20:00.000Z",
      "unreadCount": 1,
      "lastMessage": {
        "content": "Hi! Is the Keychron Q1 Pro available in blue?",
        "senderId": "e9b25126-7d84-4824-a74d-91b7e4521401",
        "createdAt": "2026-09-24T17:20:00.000Z"
      },
      "store": {
        "id": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
        "name": "Gadget Hub",
        "logoUrl": "https://cdn.dokanos.com/stores/gadget-hub/logo.webp"
      },
      "customer": {
        "id": "e9b25126-7d84-4824-a74d-91b7e4521401",
        "firstName": "Sarah",
        "lastName": "Rahman"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2026-09-24T17:25:00.000Z",
  "path": "/api/v1/conversations"
}
```

---

### 11.2. `POST /messages`

- **HTTP Method:** `POST`
- **Purpose:** Send a message in a conversation thread. Persists to PostgreSQL and emits a real-time WebSocket event via Socket.io to the conversation room (`chat:<conversationId>`).
- **Authentication:** `Bearer JWT`
- **Request Body:**

```json
{
  "conversationId": "7a89102b-41c0-4e20-48a1-9cb138a19bc0",
  "content": "Yes, we have 5 units of the Navy Blue variant in stock ready to ship!",
  "attachments": ["https://cdn.dokanos.com/chat/navy-blue-sample.webp"]
}
```

_Validation Rules:_

- `conversationId`: valid UUID, required
- `content`: string, 1-2000 chars, required
- `attachments`: optional array of valid URL strings (max 5)

- **Response Format (`201 Created`):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "2c918a40-3941-47ba-891d-5c782103a111",
    "conversationId": "7a89102b-41c0-4e20-48a1-9cb138a19bc0",
    "senderId": "a1c5d984-2e33-4f91-8dc1-6c2e3914a112",
    "content": "Yes, we have 5 units of the Navy Blue variant in stock ready to ship!",
    "attachments": ["https://cdn.dokanos.com/chat/navy-blue-sample.webp"],
    "isRead": false,
    "createdAt": "2026-09-24T17:30:00.000Z"
  },
  "timestamp": "2026-09-24T17:30:00.000Z",
  "path": "/api/v1/messages"
}
```

- **Error Cases:**
  - `400 Bad Request`: Missing or blank content.
  - `403 Forbidden`: User is neither the customer nor the store owner participating in this conversation (`NOT_CONVERSATION_PARTICIPANT`).
  - `404 Not Found`: Conversation does not exist.
