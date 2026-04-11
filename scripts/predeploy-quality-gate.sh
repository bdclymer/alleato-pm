#!/usr/bin/env bash
set -euo pipefail

echo "== Pre-deploy Quality Gate =="

echo "1) Validate runtime config"
node scripts/validate-runtime-config.mjs

echo "2) Route sanity checks"
bash scripts/verify-api-routes.sh
npm run check:routes
echo "2b) Changed-route guardrail enforcement"
if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  GUARDRAIL_BASE_REF="$(git rev-parse HEAD~1)" node scripts/check-changed-route-guardrails.mjs
else
  echo "Skipping changed-route guardrail check (no prior commit available)."
fi

echo "3) Frontend lint + typecheck + build"
cd frontend
npm run lint
npm run typecheck
npm run build
npm run test:unit:ci
cd ..

echo "4) Migration validation"
node scripts/playwright-crawl/scripts/utils/validate-migrations.js

echo "5) API smoke contracts"
node scripts/api-smoke-contracts.mjs

echo "Pre-deploy quality gate passed."
