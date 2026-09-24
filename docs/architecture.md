# DokanOS System Architecture

## Overview

DokanOS is an AI-powered commerce operating system designed as a modular marketplace platform.

The system enables customers to discover products, sellers to manage stores, and administrators to control marketplace operations.

The architecture follows:

- Modular Monolithic Backend
- Separate AI Service Layer
- API-first development
- Cloud-ready deployment

---

# High Level Architecture

                Users

                  |

                  |

          Next.js Frontend

                  |

                  |

          NestJS API Gateway

                  |

---

| | |
|

|

pgvector

|

|

AI Service

|

|

---

# Architecture Components

## 1. Frontend Layer

Technology:

- Next.js
- TypeScript
- Tailwind CSS
- React Query
- Zustand

Responsibilities:

- User interface
- Client-side state management
- API communication
- Authentication handling
- Product browsing experience

---

# 2. Backend API Layer

Technology:

- NestJS
- TypeScript
- Prisma ORM

Architecture Style:

Feature-based modular architecture.

Example:
src/

auth/

users/

stores/

products/

orders/

payments/

notifications/

ai/

Each module contains:

module/

controller

service

dto

entity

repository

Responsibilities:

- Business logic
- Authentication
- Authorization
- Database operations
- API management

---

# 3. Database Layer

Technology:

PostgreSQL

Responsibilities:

Stores:

- Users
- Stores
- Products
- Orders
- Payments
- Messages
- AI conversations

ORM:

Prisma

Reasons:

- Type safety
- Migration support
- Developer productivity

---

# 4. Cache Layer

Technology:

Redis

Usage:

- Session management
- Rate limiting
- Frequently accessed data
- Real-time features

---

# 5. Storage Layer

Technology:

Cloudflare R2

Stores:

- Product images
- Seller logos
- User uploaded files

---

# 6. AI Service Layer

Technology:

Python FastAPI

Purpose:

Dedicated AI processing service.

Responsibilities:

- LLM communication
- Embedding generation
- Vector search
- Recommendation logic
- AI content generation

Communication:

Backend communicates with AI service through REST API.

---

# Application Flow

## Customer Product Search

User

↓

Next.js

↓

NestJS API

↓

PostgreSQL

↓

Return Products

---

# AI Shopping Assistant Flow

User Question

Example:

"Best laptop for programming under $800"

↓

Frontend

↓

NestJS API

↓

AI Service

↓

Generate embedding

↓

Search pgvector

↓

Retrieve relevant products

↓

LLM generates response

↓

Return answer

---

# Seller AI Assistant Flow

Seller uploads product information

↓

Backend validates data

↓

AI Service receives request

↓

LLM generates:

- Product description
- SEO keywords
- Category suggestion

↓

Seller reviews output

↓

Save product

---

# Authentication Architecture

Authentication method:

JWT based authentication.

Flow:

User Login

↓

Validate credentials

↓

Generate access token

-

Refresh token

↓

Authenticated API requests

---

# Authorization

Role based access control.

Roles:

- Customer
- Seller
- Admin

Permissions:

- CRUD operations on own resources
- Admin has global access

---

# Performance Optimization

Optimizations include:

1. Caching for hot data
2. Pagination for large datasets
3. Indexing for database queries
4. Rate limiting for AI features

---

# Security

Security measures:

- HTTPS
- JWT authentication
- Role-based authorization
- Input validation
- Rate limiting
- SQL injection prevention
- XSS protection

---

# Scalability Features

Scalability achieved through:

1. Modular backend design
2. Separate AI service
3. Stateless API design
4. Database indexing
5. Caching

Future scaling options:

- Microservices architecture
- Read replicas
- Horizontal scaling

---

# Deployment

Deployment approach:

Docker-based deployment.

Components to deploy:

- Frontend (Next.js)
- Backend (NestJS)
- Database (PostgreSQL)
- AI Service (Python FastAPI)
- Redis

CI/CD:

Automated deployment using GitHub Actions.

Example:

Customer:

- Browse products
- Purchase

Seller:

- Manage store
- Manage products

Admin:

- Manage platform

---

# Payment Architecture

Payment providers:

- Stripe
- SSLCommerz

Flow:

Create Order

↓

Create Payment Intent

↓

Payment Gateway

↓

Webhook verification

↓

Update Order Status

Important:

Frontend payment response is not trusted.

Payment confirmation happens through webhook.

---

# Realtime Architecture

Technology:

Socket.io

Used for:

- Seller customer chat
- Notifications
- Online status

Flow:

Client

↓

WebSocket Connection

↓

NestJS Gateway

↓

Database

---

# Deployment Architecture

Production:

             Users

               |

           Vercel

         Next.js App


               |

          VPS Server


      NestJS + FastAPI


               |

      PostgreSQL Database


               |

          Redis


               |

      Cloud Storage


---

# Design Decisions

## Why Modular Monolith?

DokanOS avoids unnecessary microservices.

Benefits:

- Easier development
- Easier deployment
- Clear module boundaries
- Suitable for portfolio and real startups

Future services can be extracted if needed.

---

## Why Separate AI Service?

AI workloads require different ecosystem.

Python provides:

- ML libraries
- AI frameworks
- Better model integration

Keeping AI isolated improves maintainability.

---

# Future Scalability

Possible future improvements:

- Message queue
- Microservices extraction
- Kubernetes deployment
- Advanced recommendation models
- Local LLM support
