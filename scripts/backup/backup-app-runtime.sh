#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/socialjuridico-n8n/htdocs/n8n.socialjuridico.com.br}"
BACKUP_DIR="${BACKUP_DIR:-/home/backups/apisocialjuridico}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST_DIR="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$DEST_DIR"
chmod 700 "$BACKUP_DIR" "$DEST_DIR"

cd "$APP_DIR"

echo "[backup-app] coletando metadata de runtime..."
{
  echo "timestamp=$TIMESTAMP"
  echo "hostname=$(hostname)"
  echo "pwd=$APP_DIR"
  echo "node=$(node -v 2>/dev/null || true)"
  echo "npm=$(npm -v 2>/dev/null || true)"
  echo "git_commit=$(git rev-parse HEAD 2>/dev/null || true)"
  echo "git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
} > "$DEST_DIR/runtime-meta.txt"

pm2 jlist > "$DEST_DIR/pm2-jlist.json" || true
pm2 list > "$DEST_DIR/pm2-list.txt" || true

cp package.json "$DEST_DIR/package.json" 2>/dev/null || true
cp package-lock.json "$DEST_DIR/package-lock.json" 2>/dev/null || true

if [ -f .env ]; then
  if [ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]; then
    echo "[backup-app] criptografando .env..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
      -in .env \
      -out "$DEST_DIR/env.enc" \
      -pass env:BACKUP_ENCRYPTION_PASSPHRASE
    chmod 600 "$DEST_DIR/env.enc"
  else
    echo "[backup-app] .env NAO foi salvo porque BACKUP_ENCRYPTION_PASSPHRASE nao foi definido."
    echo "env_backup=skipped_missing_passphrase" >> "$DEST_DIR/runtime-meta.txt"
  fi
fi

tar --exclude='./node_modules' \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./logs' \
  -czf "$DEST_DIR/app-source.tar.gz" .

sha256sum "$DEST_DIR"/* > "$DEST_DIR/SHA256SUMS.txt"
chmod 600 "$DEST_DIR"/* || true

echo "[backup-app] backup criado em: $DEST_DIR"
