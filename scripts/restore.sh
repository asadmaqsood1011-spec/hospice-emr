#!/usr/bin/env bash
# Hospice EMR — restore from encrypted backup.
# Usage: ./scripts/restore.sh path/to/file.sql.enc
# Requires: psql, openssl, BACKUP_PASSPHRASE, DATABASE_URL

set -euo pipefail

ENC_FILE="${1:-}"
if [ -z "$ENC_FILE" ] || [ ! -f "$ENC_FILE" ]; then
  echo "Usage: $0 <path/to/file.sql.enc>" >&2
  exit 1
fi

if [ -f .env ]; then
  export $(grep -E '^DATABASE_URL=' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ] || [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "DATABASE_URL or BACKUP_PASSPHRASE not set" >&2
  exit 1
fi

read -p "This will DROP and recreate the schema. Type the database hostname to confirm: " confirm
DB_HOST=$(echo "$DATABASE_URL" | sed -nE 's#.*@([^/:]+).*#\1#p')
if [ "$confirm" != "$DB_HOST" ]; then
  echo "Aborted." >&2
  exit 1
fi

TMP=$(mktemp)
trap 'shred -u "$TMP" 2>/dev/null || rm -f "$TMP"' EXIT

echo "→ decrypt ..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$ENC_FILE" -out "$TMP" \
  -pass "env:BACKUP_PASSPHRASE"

echo "→ restore ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TMP"

echo "✓ restore complete"
