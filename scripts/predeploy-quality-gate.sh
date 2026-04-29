#!/usr/bin/env bash
set -euo pipefail

echo "== Pre-deploy Quality Gate =="

echo "1) Validate runtime config"
node scripts/validate-runtime-config.mjs

echo "2) Route sanity checks"
bash scripts/verify-api-routes.sh
npm run check:routes
echo "2b) Changed-file API client enforcement"
npm run verify:changed-api-client-enforcement
echo "2c) Changed-route guardrail enforcement"
if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  GUARDRAIL_BASE_REF="$(git rev-parse HEAD~1)" npm run verify:changed-route-guardrails
else
  echo "Skipping changed-route guardrail check (no prior commit available)."
fi
echo "2d) Full-route guardrail debt gate"
GUARDRAIL_SCOPE=all node scripts/check-changed-route-guardrails.mjs

echo "2e) New explicit any debt gate"
node scripts/check-no-new-any.mjs

echo "2f) New unsafe frontend pattern gate"
node scripts/check-no-new-unsafe-patterns.mjs

echo "2g) New unvalidated request.json() debt gate"
node scripts/check-zod-coverage.mjs

echo "2h) Zod coverage report (informational)"
node scripts/check-zod-coverage.mjs --report-all || true

echo "2i) Build crash prevention: server-prerender safety"
node scripts/check-server-prerender-safety.mjs

echo "2j) Build crash prevention: no module-level server client init"
node scripts/check-no-module-level-server-init.mjs

echo "2k) Retired Cloudflare ingestion path gate"
if rg -n "backend/src/workers|CLOUDFLARE_WORKER_BASE_URL|WORKER_AUTH_TOKEN|fireflies-(parser|embedder|extractor)|workers\\.dev|src/workers/scripts/process_documents.py|railway\\.json|railway up|Railway CLI|Deploying to Railway|fly\\.toml|fly deploy|Fly\\.io|kubernetes/(deployment|secrets)\\.yaml" \
  backend frontend scripts docs .github package.json \
  --glob '!frontend/playwright-report/**' \
  --glob '!scripts/predeploy-quality-gate.sh'; then
  echo "Retired deployment/ingestion path reference found. Use the Render/FastAPI backend pipeline instead." >&2
  exit 1
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
if [ -n "${API_SMOKE_BASE_URL:-}" ]; then
  node scripts/api-smoke-contracts.mjs
else
  echo "Skipping: API_SMOKE_BASE_URL not set. Smoke contracts run via cron job post-deploy."
fi

echo "6) AI memory contract"
if [ -n "${DATABASE_URL:-}" ] || [ -n "${SUPABASE_DB_URL:-}" ]; then
  npm run rag:verify:memory
else
  echo "Skipping: DATABASE_URL / SUPABASE_DB_URL not set. AI memory contract runs via cron job."
fi

echo "Pre-deploy quality gate passed."
