#!/usr/bin/env bash
# ==========================================
# DokanOS Standalone Production Deployment Script
# ==========================================

set -euo pipefail

APP_DIR="/opt/dokanos"
cd "$APP_DIR"

echo "=== [1/4] Pulling Latest Production Images ==="
docker compose -f docker-compose.prod.yml pull

echo "=== [2/4] Executing Prisma Database Migrations against NeonDB ==="
docker compose -f docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy

echo "=== [3/4] Starting Services with Rolling Zero Downtime ==="
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "=== [4/4] Verifying Service Health ==="
sleep 8

if curl -s -f http://127.0.0.1:4000/api/v1/health > /dev/null; then
    echo "✔ Backend API is healthy!"
else
    echo "✖ Backend API healthcheck failed! Check logs: docker compose -f docker-compose.prod.yml logs api"
    exit 1
fi

if curl -s -f http://127.0.0.1:8000/health > /dev/null; then
    echo "✔ AI Service is healthy!"
else
    echo "✖ AI Service healthcheck failed!"
    exit 1
fi

echo "Cleaning up unused container images..."
docker image prune -f --filter "until=48h"

echo "=== DokanOS Successfully Deployed! ==="
