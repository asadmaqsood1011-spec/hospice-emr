#!/usr/bin/env bash
# Hospice EMR — encrypted backup of the Postgres database.
# Usage: ./scripts/backup.sh [output-dir]
# Requires: pg_dump, openssl, DATABASE_URL in .env

set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

# Load DATABASE_URL
if [ -f .env ]; then
  export $(grep -E '^DATABASE_URL=' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set" >&2
  exit 1
fi

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "BACKUP_PASSPHRASE not set — refusing to write unencrypted PHI" >&2
  exit 1
fi

TS=$(date -u +%Y%m%dT%H%M%SZ)
RAW_FILE="$OUT_DIR/hospice-emr-$TS.sql"
ENC_FILE="$RAW_FILE.enc"

echo "→ pg_dump ..."
pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=plain > "$RAW_FILE"

echo "→ encrypt (AES-256-CBC, PBKDF2) ..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$RAW_FILE" -out "$ENC_FILE" \
  -pass "env:BACKUP_PASSPHRASE"

echo "→ wipe plaintext"
shred -u "$RAW_FILE" 2>/dev/null || rm -f "$RAW_FILE"

echo "✓ backup: $ENC_FILE ($(du -h "$ENC_FILE" | cut -f1))"
