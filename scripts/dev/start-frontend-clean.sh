#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
PORT="${PORT:-3001}"
PID_FILE="/tmp/alleato-next-dev.pid"

is_alleato_next_pid() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ -n "$cmd" ]] && [[ "$cmd" == *"next dev"* ]] && \
    ps -p "$pid" -o command= 2>/dev/null | grep -q "alleato-pm"
}

is_server_healthy() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:${PORT}" 2>/dev/null | grep -qE "^[23]"
}

# If a managed process is already running and the server is healthy, do nothing.
if [[ -f "$PID_FILE" ]]; then
  managed_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${managed_pid:-}" ]] && is_alleato_next_pid "$managed_pid"; then
    if is_server_healthy; then
      echo "[frontend-dev] Server already running (PID $managed_pid) and healthy at http://localhost:${PORT} — following existing process."
      while kill -0 "$managed_pid" 2>/dev/null; do sleep 1; done
      exit 0
    fi
    echo "[frontend-dev] Server PID $managed_pid is not responding — restarting."
    kill "$managed_pid" 2>/dev/null || true
    for _ in {1..20}; do
      if ! ps -p "$managed_pid" >/dev/null 2>&1; then break; fi
      sleep 0.25
    done
  fi
  rm -f "$PID_FILE"
fi

# Kill any existing alleato-pm Next dev processes on our port.
alleato_pids="$(pgrep -f "alleato-pm.*next dev" 2>/dev/null || true)"
if [[ -n "${alleato_pids:-}" ]]; then
  if is_server_healthy; then
    echo "[frontend-dev] Found healthy alleato-pm server — adopting."
    first_pid="$(echo "$alleato_pids" | head -1)"
    echo "$first_pid" > "$PID_FILE"
    while kill -0 "$first_pid" 2>/dev/null; do sleep 1; done
    exit 0
  fi
  echo "[frontend-dev] Found stale alleato-pm Next dev processes — killing:"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    ps -p "$pid" -o pid=,command= 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done <<< "$alleato_pids"
  for _ in {1..20}; do
    remaining="$(pgrep -f "alleato-pm.*next dev" 2>/dev/null || true)"
    [[ -z "${remaining:-}" ]] && break
    sleep 0.25
  done
fi

cd "$FRONTEND_DIR"
rm -rf .next
echo "$$" > "$PID_FILE"
export NODE_OPTIONS='--max-old-space-size=6144'
exec npx next dev --port "$PORT"
