#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
PID_FILE="/tmp/alleato-next-dev.pid"
NEXT_MATCH="next dev --turbopack"

is_matching_next_pid() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ -n "$cmd" ]] && [[ "$cmd" == *"$NEXT_MATCH"* ]]
}

# Stop only the process previously started by this script.
if [[ -f "$PID_FILE" ]]; then
  managed_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${managed_pid:-}" ]] && is_matching_next_pid "$managed_pid"; then
    echo "[frontend-dev] Stopping managed Next dev process (PID $managed_pid)"
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

# Guardrail: fail loudly instead of killing unrelated Next processes from other sessions.
other_next_pids="$(pgrep -f "$NEXT_MATCH" || true)"
if [[ -n "${other_next_pids:-}" ]]; then
  echo "[frontend-dev] Refusing to start: found existing Next dev process(es) not managed by this script:"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    ps -p "$pid" -o pid=,command=
  done <<< "$other_next_pids"
  echo "[frontend-dev] Prevention: stop those process(es) first or run only one frontend dev session."
  exit 1
fi

cd "$FRONTEND_DIR"
rm -rf .next
echo "$$" > "$PID_FILE"
exec npx next dev --turbopack
