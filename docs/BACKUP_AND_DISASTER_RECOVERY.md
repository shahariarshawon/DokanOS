# DokanOS Backup & Disaster Recovery Guide

This document details the automated backup strategy, file storage persistence, and disaster recovery runbooks for DokanOS.

---

## 1. Database Backup Architecture

DokanOS utilizes PostgreSQL with `pgvector` for vector embeddings and relational commerce records.

### Automated Daily Cron Schedule

Add the following entry to the root crontab on the production host (`crontab -e`):

```bash
# Run DokanOS PostgreSQL backup every day at 02:30 UTC
30 2 * * * /opt/dokanos/scripts/backup-db.sh >> /var/log/dokanos_backup.log 2>&1
```

### Storage Retention Policy

- Backups are stored in `/opt/dokanos/backups/db/` compressed with `gzip -9`.
- The backup script automatically prunes dumps older than **14 days**.
- For multi-region resilience, periodic sync to an external off-site S3 bucket is recommended:
  ```bash
  aws s3 sync /opt/dokanos/backups/db/ s3://dokanos-production-backups/db/ --delete
  ```

---

## 2. File & Media Storage Persistence

All merchant and product imagery is uploaded directly to **Supabase Storage** (or an AWS S3 / Cloudflare R2 bucket) with the following safeguards:

- **Bucket Versioning**: Enabled to protect against accidental deletions or overwrites.
- **Cross-Region Replication**: Configured in Supabase/AWS to ensure data survives localized cloud outages.
- **Direct CDN Delivery**: Assets are served through Cloudflare edge caching for low latency.

---

## 3. Disaster Recovery Runbook

### Scenario A: PostgreSQL Data Corruption or Accidental Deletion

1. **Identify the latest valid backup**:
   ```bash
   ls -lht /opt/dokanos/backups/db/
   ```
2. **Execute the restore script**:
   ```bash
   bash /opt/dokanos/scripts/restore-db.sh /opt/dokanos/backups/db/dokanos_db_YYYYMMDD_HHMMSS.sql.gz
   ```
3. **Verify data integrity**:
   ```bash
   curl -f http://127.0.0.1:4000/api/v1/health
   ```

### Scenario B: Complete VPS Hardware Failure / Cloud Instance Loss

1. **Provision a fresh Ubuntu VPS** (22.04 LTS or 24.04 LTS).
2. **Run initial provisioning**:
   ```bash
   git clone https://github.com/shahariarshawon/DokanOS.git /opt/dokanos
   cd /opt/dokanos
   bash scripts/setup-vps.sh
   ```
3. **Copy environment secrets**:
   ```bash
   cp .env.production.example /opt/dokanos/apps/api/.env
   # Populate secrets (DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, etc.)
   ```
4. **Restore database backup**:
   ```bash
   bash scripts/restore-db.sh /path/to/latest_backup.sql.gz
   ```
5. **Launch production Docker containers**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
6. **Issue Let's Encrypt SSL certificate**:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot --webroot-path=/var/www/certbot \
     -d yourdomain.com -d www.yourdomain.com
   docker compose -f docker-compose.prod.yml restart nginx
   ```
