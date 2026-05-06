#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
PID_FILE="/tmp/alleato-next-dev.pid"
NEXT_MATCH="next dev"

is_matching_next_pid() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ -n "$cmd" ]] && [[ "$cmd" == *"$NEXT_MATCH"* ]]
}

is_server_healthy() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000 2>/dev/null | grep -qE "^[23]"
}

# If a managed process is already running and the server is healthy, do nothing.
if [[ -f "$PID_FILE" ]]; then
  managed_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${managed_pid:-}" ]] && is_matching_next_pid "$managed_pid"; then
    if is_server_healthy; then
      echo "[frontend-dev] Server already running (PID $managed_pid) and healthy at http://localhost:3000 — skipping restart."
      exit 0
    fi
    # Server process exists but isn't responding — kill and restart
    echo "[frontend-dev] Server PID $managed_pid is not responding — restarting."
    kill "$managed_pid" 2>/dev/null || true
    for _ in {1..20}; do
      if ! ps -p "$managed_pid" >/dev/null 2>&1; then
        break
      fi
      sleep 0.25
    done
  fi
  rm -f "$PID_FILE"
fi

# Auto-kill any unmanaged Next dev processes before starting.
other_next_pids="$(pgrep -f "$NEXT_MATCH" || true)"
if [[ -n "${other_next_pids:-}" ]]; then
  # Check if any of these are actually healthy
  if is_server_healthy; then
    echo "[frontend-dev] Found healthy Next dev server (unmanaged) — adopting it rather than restarting."
    # Write the first PID to the managed file and exit
    first_pid="$(echo "$other_next_pids" | head -1)"
    echo "$first_pid" > "$PID_FILE"
    exit 0
  fi
  echo "[frontend-dev] Found existing Next dev process(es) not managed by this script — killing them:"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    ps -p "$pid" -o pid=,command=
    kill "$pid" 2>/dev/null || true
  done <<< "$other_next_pids"
  # Wait up to 5s for them to exit
  for _ in {1..20}; do
    remaining="$(pgrep -f "$NEXT_MATCH" || true)"
    [[ -z "${remaining:-}" ]] && break
    sleep 0.25
  done
  echo "[frontend-dev] Cleared. Starting fresh."
fi

cd "$FRONTEND_DIR"
rm -rf .next
echo "$$" > "$PID_FILE"
# Cap Node.js heap at 4GB to prevent macOS from killing the process under memory pressure
export NODE_OPTIONS='--max-old-space-size=4096'
exec npx next dev
