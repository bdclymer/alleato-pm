#!/usr/bin/env bash
# Wrapper for lint-staged: cd into frontend/, run eslint with optional --fix
# and an optional inline strict-rule override, on the file paths passed as
# trailing args.
#
# Why: lint-staged 16 spawns commands without a shell, so we can't use
# `cd X && eslint --rule '<json>' ...` directly in .lintstagedrc.js — the
# JSON quoting breaks the string-argv tokenizer. Wrapping the invocation
# in this script avoids the quoting problem.
#
# Usage:
#   run-frontend-eslint.sh fix <file>...
#   run-frontend-eslint.sh strict <file>...

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
ESLINT_BIN="${FRONTEND_DIR}/node_modules/.bin/eslint"

mode="${1:-}"
shift || true

if [[ -z "$mode" || $# -eq 0 ]]; then
  echo "usage: $0 <fix|strict> <file>..." >&2
  exit 2
fi

cd "$FRONTEND_DIR"

case "$mode" in
  fix)
    exec "$ESLINT_BIN" --fix "$@"
    ;;
  strict)
    exec "$ESLINT_BIN" --rule '{"design-system/require-api-client":"error","design-system/no-hardcoded-colors":"error","design-system/no-arbitrary-spacing":"error","design-system/require-semantic-colors":"error","design-system/no-design-violations":"error","design-system/require-page-shell":"error","design-system/no-oversized-shadows":"error","design-system/no-raw-button":"error","design-system/no-raw-form-controls":"error","design-system/require-money-field":"error","design-system/require-info-alert":"error","no-restricted-imports":["error",{"paths":[{"name":"@/components/ui/dialog","message":"Use \"@/components/ui/unified-modal\" for app-level modals to keep animation, positioning, and spacing consistent."}]}]}' "$@"
    ;;
  *)
    echo "unknown mode: $mode (expected fix|strict)" >&2
    exit 2
    ;;
esac
