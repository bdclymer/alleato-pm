#!/usr/bin/env bash
set -euo pipefail

# Stop any stale Next.js frontend dev server before rebuilding the .next cache.
pkill -f "next dev --turbopack|next-server" 2>/dev/null || true

for _ in {1..20}; do
  if ! pgrep -f "next dev --turbopack|next-server" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

cd frontend
rm -rf .next
exec npx next dev --turbopack
