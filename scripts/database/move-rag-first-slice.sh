#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Move the first high-risk RAG tables to the AI/RAG database.

Required env:
  APP_DB_URL   Source app database URL
  RAG_DB_URL   Target AI/RAG database URL

Optional env:
  WORK_DIR             Default: /tmp/alleato-rag-db-move
  CONNECT_TIMEOUT      Default: 8
  SKIP_RESTORE         Set to 1 to dump and validate only
  RELOAD_TARGET_DATA   Set to 1 to truncate target tables before data-only restore

This script is intentionally copy-only for the source database. It never drops,
truncates, or cleans source tables.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_env() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing required env var: $1" >&2
    exit 1
  fi
}

require_command psql
require_command pg_dump
require_command pg_restore
require_env APP_DB_URL
require_env RAG_DB_URL

WORK_DIR="${WORK_DIR:-/tmp/alleato-rag-db-move}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-8}"
DUMP_FILE="${WORK_DIR}/rag-first-slice.dump"
SCHEMA_PREVIEW_FILE="${WORK_DIR}/rag-first-slice.schema.sql"

mkdir -p "$WORK_DIR"

with_timeout() {
  local url="$1"
  if [[ "$url" == *"connect_timeout="* ]]; then
    printf '%s' "$url"
  elif [[ "$url" == *"?"* ]]; then
    printf '%s&connect_timeout=%s' "$url" "$CONNECT_TIMEOUT"
  else
    printf '%s?connect_timeout=%s' "$url" "$CONNECT_TIMEOUT"
  fi
}

APP_DB_URL_TIMEOUT="$(with_timeout "$APP_DB_URL")"
RAG_DB_URL_TIMEOUT="$(with_timeout "$RAG_DB_URL")"

echo "Checking source app database readiness..."
psql "$APP_DB_URL_TIMEOUT" -v ON_ERROR_STOP=1 -qAt -c "select 'source_ready';" >/dev/null

echo "Checking target AI/RAG database readiness..."
psql "$RAG_DB_URL_TIMEOUT" -v ON_ERROR_STOP=1 -qAt -c "select 'target_ready';" >/dev/null

echo "Preparing target extensions..."
psql "$RAG_DB_URL_TIMEOUT" -v ON_ERROR_STOP=1 <<'SQL'
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
select 'extensions.halfvec'::regtype;
SQL

echo "Dumping source RAG first-slice tables..."
pg_dump "$APP_DB_URL_TIMEOUT" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --table=public.document_chunks \
  --table=public.fireflies_ingestion_jobs \
  --file="$DUMP_FILE"

echo "Writing schema preview..."
pg_restore \
  --schema-only \
  --file="$SCHEMA_PREVIEW_FILE" \
  "$DUMP_FILE"

if [[ "${SKIP_RESTORE:-0}" == "1" ]]; then
  echo "SKIP_RESTORE=1 set; stopping after dump."
  echo "Dump: $DUMP_FILE"
  echo "Schema preview: $SCHEMA_PREVIEW_FILE"
  exit 0
fi

if [[ "${RELOAD_TARGET_DATA:-0}" == "1" ]]; then
  echo "RELOAD_TARGET_DATA=1 set; truncating target RAG tables only."
  psql "$RAG_DB_URL_TIMEOUT" -v ON_ERROR_STOP=1 <<'SQL'
truncate table public.document_chunks restart identity cascade;
truncate table public.fireflies_ingestion_jobs restart identity cascade;
SQL
  RESTORE_MODE=(--data-only --disable-triggers)
else
  RESTORE_MODE=()
fi

echo "Restoring into target AI/RAG database..."
pg_restore "$RAG_DB_URL_TIMEOUT" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "${RESTORE_MODE[@]}" \
  "$DUMP_FILE"

echo "Running target parity summary..."
psql "$RAG_DB_URL_TIMEOUT" -v ON_ERROR_STOP=1 <<'SQL'
select 'document_chunks' as table_name, count(*) from public.document_chunks
union all
select 'fireflies_ingestion_jobs', count(*) from public.fireflies_ingestion_jobs;

select
  count(*) as total_chunks,
  count(*) filter (where embedding is not null) as embedded_chunks,
  count(*) filter (where embedding is null) as missing_embeddings
from public.document_chunks;

select stage, count(*)
from public.fireflies_ingestion_jobs
group by stage
order by count(*) desc;
SQL

echo "RAG first-slice move completed."
