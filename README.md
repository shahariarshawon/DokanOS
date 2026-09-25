# DokanOS

## AI-Powered Commerce Operating System

DokanOS is a modern AI-powered multi-vendor marketplace platform designed to help customers discover products intelligently and enable sellers to manage their businesses using automation and artificial intelligence.

## Vision

The goal of DokanOS is to build a scalable commerce ecosystem where traditional marketplace operations are enhanced with AI-powered search, recommendations, automation, and intelligent seller tools.

# Core Concept

DokanOS combines:

- Modern full-stack web architecture
- Marketplace business logic
- Artificial Intelligence
- Retrieval-Augmented Generation (RAG)
- Vector Search
- Automation

# Main Users

## Customer

Customers can:

- Browse products
- Search products
- Get AI-powered recommendations
- Chat with sellers
- Add products to cart
- Purchase products
- Review products

## Seller

Sellers can:

- Create their own store
- Manage products
- Manage orders
- View analytics
- Generate product content using AI
- Use AI tools to improve sales

## Admin

Admins can:

- Manage users
- Manage sellers
- Monitor marketplace activity
- Handle reports
- Manage payments

# Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- React Query
- Zustand

## Backend

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis

## AI System

Separate AI service:

- Python
- FastAPI
- LangChain
- OpenAI/Gemini API
- pgvector

## Storage

- Cloudflare R2

## Realtime

- Socket.io

## Payment

- Stripe
- SSLCommerz

## Infrastructure

- Docker
- GitHub Actions
- VPS Deployment

# System Architecture

DokanOS follows a modular monolithic architecture with separated AI services.

             Client

               |

          Next.js Web

               |

          NestJS API

               |

    ----------------------

    |          |         |

                  |

          AI Service

               |

      LLM + Vector Search

# AI Features

## AI Shopping Assistant

Users can ask natural language questions.

Example:

"I need a laptop for programming under $800"

The system:

1. Understands user intent
2. Searches product embeddings
3. Retrieves relevant products
4. Generates intelligent responses

## AI Seller Assistant

Automatically generates:

- Product descriptions
- SEO keywords
- Categories
- Product tags

## Product Intelligence

AI analyzes product information and images to extract:

- Category
- Attributes
- Features
- Similar products

# Development Philosophy

DokanOS is not designed as an over-engineered enterprise system.

The goal is to demonstrate production-level engineering practices:

- Clean architecture
- Scalable database design
- Secure APIs
- AI integration
- Testing
- Deployment automation

# Project Architecture Principles

## Backend

Feature-based modular architecture.

## Database

Relational modeling using PostgreSQL.

## AI

Independent AI service for flexibility.

## Security

Implementation includes:

- Authentication
- Authorization
- Validation
- Secure payments

# Development Roadmap

## Phase 1

Foundation

- Project setup
- Authentication
- Database

## Phase 2

Marketplace Core

- Stores
- Products
- Cart
- Orders

## Phase 3

Commerce Features

- Payments
- Subscription
- Notifications

## Phase 4

AI Integration

- RAG chatbot
- AI seller assistant
- Recommendation system

## Phase 5

Production

- Testing
- Docker
- Deployment
- CI/CD

# Current Status

🚧 Under active development

# Author

Al Shahariar Arafat Shawon
