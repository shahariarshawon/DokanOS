#!/usr/bin/env bash
# ==========================================
# DokanOS Production Database Migration Utility
# ==========================================

set -euo pipefail

echo "=== DokanOS Database Migration Tool ==="

# Check if running locally or via docker
if command -v pnpm &> /dev/null; then
    echo "Running Prisma migration status via local pnpm..."
    pnpm --filter api exec prisma migrate status
    
    read -p "Do you want to deploy pending migrations to production? (y/N): " -r CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Deploying migrations..."
        pnpm --filter api exec prisma migrate deploy
        echo "✔ Migrations applied successfully."
    else
        echo "Migration cancelled."
    fi
else
    echo "Running Prisma migration deploy in Docker container..."
    docker compose -f docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy
    echo "✔ Production migrations deployed."
fi
