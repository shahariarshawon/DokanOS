# ==========================================
# DokanOS NestJS Backend API - Production Dockerfile
# ==========================================

# Stage 1: Base with PNPM
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache libc6-compat openssl

# Stage 2: Dependencies
FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/ ./packages/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 3: Builder
FROM dependencies AS builder
WORKDIR /app
COPY apps/api/ ./apps/api/

# Generate Prisma Client & Build NestJS Bundle
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# Prune devDependencies for minimal production image
RUN pnpm --filter api --prod deploy --legacy /app/pruned-api

# Stage 4: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install OpenSSL for Prisma Query Engine & curl for healthchecks
RUN apk add --no-cache openssl curl dumb-init

# Use standard non-root node user
USER node

# Copy pruned production dependencies, compiled output & Prisma schema
COPY --chown=node:node --from=builder /app/pruned-api/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/api/dist ./dist
COPY --chown=node:node --from=builder /app/apps/api/prisma ./prisma
COPY --chown=node:node --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
