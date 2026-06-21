#!/usr/bin/env bash
set -euo pipefail

echo "[validate] verificando pre-requisitos de backup..."

MISSING=0

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "[ok] $1: $(command -v "$1")"
  else
    echo "[erro] comando ausente: $1"
    MISSING=1
  fi
}

check_cmd node
check_cmd npm
check_cmd git
check_cmd pm2
check_cmd tar
check_cmd sha256sum
check_cmd openssl
check_cmd pg_dump

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "[warn] SUPABASE_DB_URL nao definido. Backup do banco nao podera rodar."
else
  echo "[ok] SUPABASE_DB_URL definido."
fi

if [ -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]; then
  echo "[warn] BACKUP_ENCRYPTION_PASSPHRASE nao definido. Segredos e dump criptografado nao serao gerados."
else
  echo "[ok] BACKUP_ENCRYPTION_PASSPHRASE definido."
fi

if [ "$MISSING" -eq 1 ]; then
  echo "[validate] existem comandos obrigatorios ausentes."
  exit 1
fi

echo "[validate] pre-requisitos basicos OK."
