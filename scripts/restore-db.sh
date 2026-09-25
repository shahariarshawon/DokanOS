#!/usr/bin/env bash
# ==========================================
# DokanOS Database Restore Script
# Restores compressed PostgreSQL backup
# ==========================================

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Example: $0 /opt/dokanos/backups/db/dokanos_db_20260925_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file '${BACKUP_FILE}' does not exist!"
    exit 1
fi

echo "=========================================================="
echo "  WARNING: This will overwrite data in the target database! "
echo "  Backup file: ${BACKUP_FILE}"
echo "=========================================================="
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore aborted by user."
    exit 0
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring database..."

if [ -n "${DATABASE_URL:-}" ]; then
    gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
elif docker ps --format '{{.Names}}' | grep -q 'dokanos-postgres'; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i dokanos-postgres psql -U dokanos -d dokanos
else
    echo "ERROR: Neither DATABASE_URL nor running dokanos-postgres container found!"
    exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database restored successfully from ${BACKUP_FILE}!"
