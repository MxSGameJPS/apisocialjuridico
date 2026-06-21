#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/backups/apisocialjuridico}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST_DIR="$BACKUP_DIR/$TIMESTAMP"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "[backup-db] erro: defina SUPABASE_DB_URL com a connection string Postgres do Supabase."
  echo "[backup-db] exemplo: export SUPABASE_DB_URL='postgresql://postgres.PROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require'"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup-db] erro: pg_dump nao encontrado. Instale postgresql-client."
  exit 1
fi

mkdir -p "$DEST_DIR"
chmod 700 "$BACKUP_DIR" "$DEST_DIR"

SCHEMA_FILE="$DEST_DIR/supabase-schema.sql"
DATA_FILE="$DEST_DIR/supabase-data.dump"
META_FILE="$DEST_DIR/supabase-backup-meta.txt"

echo "[backup-db] iniciando backup schema..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file "$SCHEMA_FILE"

echo "[backup-db] iniciando backup dados..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$DATA_FILE"

{
  echo "timestamp=$TIMESTAMP"
  echo "hostname=$(hostname)"
  echo "schema_file=$(basename "$SCHEMA_FILE")"
  echo "data_file=$(basename "$DATA_FILE")"
  echo "pg_dump=$(pg_dump --version)"
} > "$META_FILE"

if [ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]; then
  echo "[backup-db] criptografando dump de dados..."
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
    -in "$DATA_FILE" \
    -out "$DATA_FILE.enc" \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE
  rm -f "$DATA_FILE"
  DATA_FILE="$DATA_FILE.enc"
fi

sha256sum "$DEST_DIR"/* > "$DEST_DIR/SHA256SUMS.txt"
chmod 600 "$DEST_DIR"/* || true

echo "[backup-db] backup criado em: $DEST_DIR"
