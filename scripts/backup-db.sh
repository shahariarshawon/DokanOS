#!/usr/bin/env bash
# ==========================================
# DokanOS Automated Database Backup Script
# PostgreSQL + pgvector Automated Dump
# ==========================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/dokanos/backups/db}"
DATE_TAG=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dokanos_db_${DATE_TAG}.sql.gz"
RETENTION_DAYS=${RETENTION_DAYS:-14}

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting DokanOS Database Backup..."

# Check if running with NeonDB / Remote URL or Local Docker PostgreSQL container
if [ -n "${DATABASE_URL:-}" ]; then
    echo "Dumping database via DATABASE_URL..."
    pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
elif docker ps --format '{{.Names}}' | grep -q 'dokanos-postgres'; then
    echo "Dumping database via dokanos-postgres container..."
    docker exec dokanos-postgres pg_dump -U dokanos -d dokanos --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
else
    echo "ERROR: Neither DATABASE_URL nor running dokanos-postgres container was found!"
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Enforce retention policy: prune backups older than RETENTION_DAYS
echo "Pruning database backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "dokanos_db_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup & Cleanup Routine Finished."
