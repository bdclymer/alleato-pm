#!/usr/bin/env bash
# Run eve with a Node 24 runtime, portably.
#
# eve requires Node >= 24. On macOS this project uses an isolated, keg-only
# Homebrew node@24 so the global Node can stay on another version; if that
# install is present we prepend it to PATH. In CI/Linux (where Node 24 is
# already the default) the brew lookup is skipped and eve runs directly.
#
# Usage (via package.json scripts): `pnpm eve <args>` / `pnpm eve:dev`.
set -euo pipefail

if command -v brew >/dev/null 2>&1; then
  node24_bin="$(brew --prefix node@24 2>/dev/null)/bin"
  if [ -d "$node24_bin" ]; then
    PATH="$node24_bin:$PATH"
  fi
fi

exec pnpm exec eve "$@"
