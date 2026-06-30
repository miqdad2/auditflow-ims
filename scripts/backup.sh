#!/usr/bin/env bash
# RECAFCO AuditFlow ISO — Linux/Server Backup Script
# Backs up the PostgreSQL database and the uploads folder.
# Run manually or schedule with cron.
#
# Prerequisites:
#   - pg_dump must be in PATH (postgresql-client package)
#   - PGPASSWORD or a ~/.pgpass file configured for non-interactive auth
#
# Usage:
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh
#
#   With custom settings:
#   PG_HOST=10.0.0.1 PG_DB=auditflow ./scripts/backup.sh
#
# Cron example (daily at 02:00):
#   0 2 * * * /opt/auditflow/scripts/backup.sh >> /var/log/auditflow-backup.log 2>&1
#
# WARNING: A database backup without the uploads folder is INCOMPLETE.
# Both must be backed up together to allow a full restore.

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-auditflow_ims}"
PG_USER="${PG_USER:-postgres}"
UPLOADS_DIR="${UPLOADS_DIR:-$PROJECT_ROOT/uploads}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/auditflow}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
DB_DUMP_FILE="$BACKUP_DIR/auditflow_db.sql"
UPLOADS_ARCHIVE="$BACKUP_DIR/auditflow_uploads.tar.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# ── Helpers ──────────────────────────────────────────────────────────────────

log() {
    local level="${2:-INFO}"
    local line="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $1"
    echo "$line"
    echo "$line" >> "$LOG_FILE"
}

fail() {
    log "$1" "ERROR"
    log "Backup FAILED. Check $LOG_FILE for details." "ERROR"
    exit 1
}

# ── Setup ────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
log "Backup started — destination: $BACKUP_DIR"

# ── Step 1: PostgreSQL dump ───────────────────────────────────────────────────

log "Starting database backup (pg_dump)..."

if [ -z "${PGPASSWORD:-}" ]; then
    log "PGPASSWORD is not set. pg_dump may fail if the DB requires a password." "WARNING"
    log "Set PGPASSWORD or configure ~/.pgpass before running this script." "WARNING"
fi

pg_dump \
    --host="$PG_HOST" \
    --port="$PG_PORT" \
    --username="$PG_USER" \
    --dbname="$PG_DB" \
    --format=plain \
    --no-password \
    --file="$DB_DUMP_FILE" \
    || fail "pg_dump failed. Is pg_dump installed? Is PostgreSQL running on $PG_HOST:$PG_PORT?"

DB_SIZE="$(du -sh "$DB_DUMP_FILE" | cut -f1)"
log "Database dump complete: $DB_DUMP_FILE ($DB_SIZE)"

# ── Step 2: Uploads folder backup ────────────────────────────────────────────

log "Starting uploads folder backup..."

if [ ! -d "$UPLOADS_DIR" ]; then
    log "Uploads directory not found: $UPLOADS_DIR" "WARNING"
    log "Skipping uploads backup. If the application has stored files, this backup is INCOMPLETE." "WARNING"
else
    tar -czf "$UPLOADS_ARCHIVE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" \
        || fail "Failed to compress uploads folder."

    UPLOADS_SIZE="$(du -sh "$UPLOADS_ARCHIVE" | cut -f1)"
    log "Uploads backup complete: $UPLOADS_ARCHIVE ($UPLOADS_SIZE)"
fi

# ── Step 3: Set permissions ───────────────────────────────────────────────────

chmod 600 "$DB_DUMP_FILE" 2>/dev/null || true
[ -f "$UPLOADS_ARCHIVE" ] && chmod 600 "$UPLOADS_ARCHIVE" 2>/dev/null || true
log "Backup file permissions set to 600 (owner read/write only)."

# ── Step 4: Verify backup files ───────────────────────────────────────────────

log "Verifying backup files..."

if [ ! -f "$DB_DUMP_FILE" ]; then
    fail "Database dump file missing after pg_dump."
fi

DB_BYTES="$(stat -c%s "$DB_DUMP_FILE" 2>/dev/null || stat -f%z "$DB_DUMP_FILE" 2>/dev/null || echo 0)"
if [ "$DB_BYTES" -lt 100 ]; then
    fail "Database dump file is suspiciously small ($DB_BYTES bytes). Backup may be corrupt."
fi

log "Verification passed."
log "------------------------------------------------------------"
log "Database : $DB_DUMP_FILE"
[ -f "$UPLOADS_ARCHIVE" ] && log "Uploads  : $UPLOADS_ARCHIVE"
log "Log      : $LOG_FILE"
log "------------------------------------------------------------"
log "IMPORTANT: Store this backup folder in a secure, off-server location."
log "A database backup without the uploads folder is INCOMPLETE."
log "Backup complete."

# ── Restore instructions ──────────────────────────────────────────────────────
#
# To restore the database:
#   1. Create a clean database:
#        createdb -h localhost -U postgres auditflow_ims_restore
#   2. Restore the dump:
#        psql -h localhost -U postgres -d auditflow_ims_restore -f /var/backups/auditflow/<timestamp>/auditflow_db.sql
#   3. Update DATABASE_URL in your .env to point to the restored database.
#   4. Run migrations to ensure schema is current:
#        pnpm --filter db prisma migrate deploy
#
# To restore uploaded files:
#   1. Extract the uploads archive:
#        tar -xzf /var/backups/auditflow/<timestamp>/auditflow_uploads.tar.gz -C /opt/auditflow/
#
# Run both restore steps. A partial restore will leave file metadata records
# pointing to missing files, breaking document downloads.
