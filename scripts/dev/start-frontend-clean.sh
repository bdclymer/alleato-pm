#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
PORT="${PORT:-3001}"
PID_FILE="/tmp/alleato-next-dev.pid"
DEV_HEAP_MB="${DEV_HEAP_MB:-12288}"
NEXT_DEV_ENGINE="${NEXT_DEV_ENGINE:-webpack}"

find_escaped_node_modules_link() {
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    return 1
  fi

  local link
  while IFS= read -r link; do
    local target
    target="$(realpath "$link" 2>/dev/null || true)"
    if [[ -n "$target" && "$target" != "$FRONTEND_DIR/"* ]]; then
      printf '%s -> %s\n' "$link" "$target"
      return 0
    fi
  done < <(find "$FRONTEND_DIR/node_modules" -maxdepth 1 -type l 2>/dev/null | sort)

  return 1
}

assert_local_node_modules() {
  local escaped_link
  escaped_link="$(find_escaped_node_modules_link || true)"
  if [[ -n "$escaped_link" ]]; then
    cat >&2 <<EOF
[frontend-dev] Refusing to start with node_modules symlinked outside this checkout.
[frontend-dev] First escaped dependency: $escaped_link
[frontend-dev] Repair with:
[frontend-dev]   rm -rf "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/.next"
[frontend-dev]   pnpm --dir "$FRONTEND_DIR" install --frozen-lockfile
EOF
    exit 1
  fi
}

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

assert_local_node_modules

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
echo "$$" > "$PID_FILE"
export NODE_OPTIONS="--max-old-space-size=${DEV_HEAP_MB}"
NEXT_BIN="$FRONTEND_DIR/node_modules/.bin/next"

if [[ ! -x "$NEXT_BIN" ]]; then
  echo "[frontend-dev] Missing local Next.js binary at $NEXT_BIN" >&2
  exit 1
fi

if [[ "$NEXT_DEV_ENGINE" == "turbopack" ]]; then
  exec "$NEXT_BIN" dev --port "$PORT" --turbopack
fi

exec "$NEXT_BIN" dev --port "$PORT"
