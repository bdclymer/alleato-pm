# Alleato PM — Runbook

Every script, cron, in-app trigger, and manual action that can be invoked in this platform. When you know something exists but can't remember the exact command, this is the place to look.

---

## Table of Contents

1. [Dev Server](#1-dev-server)
2. [Build](#2-build)
3. [Database](#3-database)
4. [Seeding](#4-seeding)
5. [Testing](#5-testing)
6. [Quality & Guardrails](#6-quality--guardrails)
7. [Vercel Cron Jobs](#7-vercel-cron-jobs)
8. [Acumatica Sync](#8-acumatica-sync)
9. [RAG / AI Pipeline](#9-rag--ai-pipeline)
10. [AI Verification Suite](#10-ai-verification-suite)
11. [Intelligence Compiler (Daily Brief)](#11-intelligence-compiler-daily-brief)
12. [Procore Crawlers](#12-procore-crawlers)
13. [Admin / Ops](#13-admin--ops)
14. [In-App Triggers](#14-in-app-triggers)
15. [Audits](#15-audits)

---

## 1. Dev Server

All commands run from repo root unless noted.

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend (port 3000) + backend concurrently |
| `npm run dev:frontend` | Next.js only (port 3000), with cache clear |
| `npm run dev:backend` | Python FastAPI only |
| `npm start` | Start production build (frontend only) |

Clean start if you hit caching/routing issues:
```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10 && tail -20 /tmp/nextjs-dev.log
```

---

## 2. Build

| Command | What it does |
|---------|-------------|
| `npm run build` | Install deps + production Next.js build |
| `cd frontend && npm run build:production` | Full build with nonprod-route gate + webpack |
| `cd frontend && npm run typecheck` | TypeScript check only |
| `cd frontend && npm run lint` | ESLint with cache |
| `cd frontend && npm run quality` | typecheck + lint + DB audit + form audit |
| `cd frontend && npm run quality:fix` | Same but auto-fixes lint |
| `npm run quality:predeploy` | Full pre-deploy gate (routes, guardrails, any-types, zod coverage) |

---

## 3. Database

### Type generation (run this before any DB work)

```bash
npm run db:types
# Generates frontend/src/types/database.types.ts from live Supabase schema
```

### Schema & migrations

| Command | What it does |
|---------|-------------|
| `npm run db:types` | Re-generate TypeScript types from Supabase |
| `npm run db:types:check` | Verify types file is up-to-date |
| `npm run db:push` | Push schema changes + regenerate types |
| `npm run db:migrations:verify-applied` | Check migration ledger vs what's in Supabase |
| `npm run schema:extract` | Extract schema from types → JSON |
| `npm run schema:docs` | Extract + generate schema markdown docs |
| `npm run schema:audit-live-refs` | Audit live DB column references vs types |
| `npm run devtools:sync-schema-fk` | Regenerate page-schema FK map for dev tools |
| `npm run check:routes` | Verify no Next.js dynamic route conflicts |

---

## 4. Seeding

| Command | What it does |
|---------|-------------|
| `npm run seed:db` | Full database seed |
| `npm run seed:db:dry` | Dry run (no writes) |
| `npm run seed:db:reset` | Wipe + re-seed |
| `npm run seed:financial` | Seed financial data |
| `npm run seed:project` | Seed project-level financial data |
| `npm run smoke:fixtures` | Ensure smoke test fixtures exist |
| `npm run seed:commitments:invoice-fixture` | Ensure commitments invoice smoke fixture |
| `npx tsx scripts/seed-db/seed-westfield-intelligence-packet.mjs` | Seed Westfield intelligence packet for testing |

---

## 5. Testing

### E2E (Playwright)

| Command | What it does |
|---------|-------------|
| `cd frontend && npm test` | All E2E tests (headless, port 3002) |
| `cd frontend && npm run test:headed` | With visible browser |
| `cd frontend && npm run test:ui` | Interactive UI mode (best for debugging) |
| `cd frontend && npm run test:debug` | Debug mode |
| `cd frontend && npm run test:trace` | With trace recording |
| `cd frontend && npm run test:forms` | Form-specific E2E suite |
| `cd frontend && npm run test:submittals:smoke` | Submittals smoke (seeds + runs) |
| `npm run test:all` | Frontend unit + backend pytest |

Run a single spec:
```bash
npx playwright test tests/e2e/budget-line-item-validation.spec.ts --headed
```

Playwright auth: session lives at `tests/.auth/user.json`. If expired:
```bash
cd frontend && npx playwright test tests/auth.setup.ts
```

### Unit tests

| Command | What it does |
|---------|-------------|
| `cd frontend && npm run test:unit` | Jest unit tests |
| `cd frontend && npm run test:unit:watch` | Jest watch mode |
| `cd frontend && npm run test:unit:coverage` | With coverage |
| `cd frontend && npm run verify:budget:guardrails` | Budget-specific unit guardrail tests |

### Backend

```bash
cd backend && pytest
cd backend && pytest --cov --cov-report=html
```

### API smoke tests

```bash
# Hit every known GET endpoint against dev server, flag 500s
./scripts/api-smoke-test.sh
./scripts/api-smoke-test.sh --watch   # run every 5 minutes
./scripts/api-smoke-test.sh --quiet   # suppress passing endpoints

# Run against production
API_SMOKE_BASE_URL=https://projects.alleatogroup.com node scripts/api-smoke-contracts.mjs
```

---

## 6. Quality & Guardrails

| Command | What it does |
|---------|-------------|
| `npm run quality:predeploy` | Full pre-deploy gate |
| `npm run verify:postdeploy` | Post-deploy health checks |
| `npm run verify:api:contracts` | API smoke contracts vs production |
| `npm run verify:all-route-guardrails` | Check all routes for raw errors / missing guardrails |
| `npm run verify:changed-route-guardrails` | Only changed files since last commit |
| `npm run validate:runtime-config` | Validate env vars and runtime config |
| `npm run verify:nonprod-routes` | Detect dev-only routes accidentally shipping |
| `npm run guardrails:db-type-overrides` | Detect manual type overrides in DB code |
| `npm run db:audit` | Full DB audit (inserts, mappers, FK types, ambiguous embeds) |
| `npm run rag:verify:inbox-evals:prod` | Production AI inbox regression bundle; proves live Outlook/date/triage prompts use `getRecentEmails` |
| `npm run rag:verify:source-sync-evals:prod` | Production AI source-sync bundle; proves Teams/source-health prompts expose live sync and packet freshness |
| `cd frontend && npm run audit:forms` | Form field standards audit |
| `cd frontend && npm run design:ratchet` | Design system ratchet check |
| `cd frontend && npm run design:no-new-disables` | Detect new ESLint disable comments |

---

## 7. Vercel Cron Jobs

These run automatically on the schedule shown. **To trigger manually**, POST to the endpoint with `Authorization: Bearer <CRON_SECRET>`.

| Endpoint | Schedule | What it does |
|----------|----------|-------------|
| `POST /api/cron/daily-flags` | Daily 6am UTC | Scans all active projects; creates AI insights for budget variances >10%, past-due RFIs, late schedule tasks, stale change events >7 days |
| `POST /api/cron/acumatica-sync` | Daily 12pm UTC | Full Acumatica sync: mirror tables, vendors/companies, direct costs, AR invoices, AR payments |
| `POST /api/cron/progress-reports` | Monday 8am UTC | Auto-creates draft progress reports for all active projects that don't have one for the current week |
| `POST /api/cron/decay-memories` | Sunday 4am UTC | Decays importance/confidence on stale AI memory facts; expires context memories past their TTL |

Manual trigger example:
```bash
curl -X POST https://projects.alleatogroup.com/api/cron/daily-flags \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 8. Acumatica Sync

### Via npm scripts (manual, one-shot)

| Command | What it does |
|---------|-------------|
| `node scripts/sync-acumatica-invoices.mjs` | Sync AR invoices → `acumatica_ar_invoices` + `_lines` |
| `node scripts/sync-acumatica-payments.mjs` | Sync AR payments → Supabase |
| `node scripts/sync-acumatica-vendors.mjs` | Sync active vendors → `companies` table |

### Via API (authenticated, admin only)

| Endpoint | What it does |
|----------|-------------|
| `POST /api/sync/acumatica/ar-invoices` | Sync AR invoices |
| `POST /api/sync/acumatica/ar-payments` | Sync AR payments |
| `POST /api/sync/acumatica/commitments` | Sync commitments |
| `POST /api/sync/acumatica/direct-costs` | Sync direct costs |
| `POST /api/sync/acumatica/vendors` | Sync vendors |
| `POST /api/sync/acumatica/mirror` | Full mirror sync (all entities) |
| `POST /api/sync/acumatica/export` | Export data from Acumatica |
| `POST /api/accounting/sync` | Trigger accounting sync from admin UI |

### Python scripts (project-level)

```bash
python3 scripts/project-acumatica-commitments.py
python3 scripts/project-acumatica-change-orders.py
```

### Debug / inspect

```bash
node scripts/inspect-acumatica-invoice.mjs   # inspect a specific invoice
node scripts/inspect-acumatica-vendor.mjs    # inspect a specific vendor
```

---

## 9. RAG / AI Pipeline

### Ingest documents

```bash
# Ingest local folder into RAG pipeline
npm run rag:ingest:local
# or with options:
python3 scripts/ingestion/ingest_local_documents.py \
  --source-dir ~/Documents/AlleatoKnowledge --project-id 43

# Watch mode (re-ingest every hour)
npm run rag:ingest:local:watch

# SharePoint dry run
npm run rag:sharepoint:dry-run

# Import RFIs from SharePoint documents
npm run rag:sharepoint:import-rfis
```

### Backfill embeddings

```bash
# Backfill chunk embeddings for recent meetings
npm run rag:backfill:meeting-chunks

# Backfill embeddings for AI insights (decisions, risks, opportunities)
node scripts/backfill-insights-embeddings.mjs [--dry-run] [--limit N] [--type decision|risk|opportunity]

# Backfill meeting summary embeddings
node scripts/backfill-meeting-summary-embeddings.mjs [--dry-run] [--limit N]

# Backfill summary embeddings (general)
node scripts/backfill-summary-embeddings.mjs
```

### Enrichment

```bash
# Run meeting segment enrichment + risk snapshots
node scripts/run-enrichment.mjs           # both segments + snapshots
node scripts/run-enrichment.mjs --segments
node scripts/run-enrichment.mjs --snapshots
```

### Test RAG layers

```bash
# Test embedding → vector search → chat completion
node scripts/test-rag-terminal.mjs
node scripts/test-rag-terminal.mjs "what's the status of Vermillion Rise?"
node scripts/test-rag-terminal.mjs "budget overruns" --project-id 67
node scripts/test-rag-terminal.mjs --layer 1   # embeddings only
node scripts/test-rag-terminal.mjs --layer 2   # vector search only
node scripts/test-rag-terminal.mjs --layer 3   # chat completion only

# Test AI tool queries
node scripts/test-ai-tools.mjs
node scripts/test-ai-tool-queries.mjs

# Query RAG via API
./scripts/cli/query-rag.sh "your question here"
./scripts/cli/query-rag-raw.sh "your question here"   # no jq processing
```

### Backfill project assignments on communications

```bash
python3 scripts/ingestion/backfill_comm_project_assignments.py
python3 scripts/ingestion/run_comm_project_backfill.py
```

---

## 10. AI Verification Suite

These scripts verify the AI assistant is working correctly. Run after any AI changes.

| Command | What it verifies |
|---------|-----------------|
| `npm run rag:verify:meetings` | Meeting vectorization health |
| `npm run rag:verify:memory` | AI memory contract (facts, lessons, context) |
| `npm run rag:verify:chat-architecture` | Full chat architecture |
| `npm run rag:verify:response-contract` | Assistant response shape + tool calls |
| `npm run rag:verify:source-specific` | Source-specific RAG (meetings vs financial vs emails) |
| `npm run rag:verify:intelligence-compiler` | Intelligence compiler health + packet quality |
| `npm run rag:verify:graph-embedding` | Graph embedding contract |
| `npm run rag:verify:teams-ingestion` | Teams conversation ingestion pipeline |
| `npm run rag:verify:meeting-pipeline` | End-to-end meeting pipeline |
| `npm run rag:verify:render-ai` | Render AI gateway connectivity |
| `npm run rag:verify:strategist-frontend` | Strategist frontend conversation flow |
| `npm run rag:verify:latest-briefing` | Shape of the latest intelligence briefing |
| `npm run rag:verify:admin-comms` | Admin communications guardrails |
| `npm run rag:verify:risk-routing` | Risk routing accuracy |
| `npm run rag:verify:risk-quality` | Risk quality scoring |
| `npm run rag:verify:task-integrity` | Fireflies task extraction integrity |
| `npm run rag:verify:pm-briefing` | PM briefing retrieval quality |
| `npm run rag:verify:eval-suite` | Full AI assistant eval suite |
| `npm run rag:verify:financial` | Financial numeric retrieval |
| `npm run rag:verify:financial:fallback` | Financial fallback retrieval path |

### Dogfood the AI assistant

```bash
node scripts/verify/dogfood_ai_assistant.mjs
# Runs realistic CEO questions against the live assistant,
# cross-checks answers against actual DB data, outputs PASS/FAIL report
```

---

## 11. Intelligence Compiler (Daily Brief)

The intelligence compiler generates `ai_intelligence_packets` — the structured briefings the CEO sees. It is **not** on an automatic cron and must be triggered manually.

### Trigger via Admin UI

Navigate to `/admin/intelligence-compiler` → click **Run Compiler**.

### Trigger via API (admin only)

```bash
curl -X POST https://projects.alleatogroup.com/api/admin/intelligence-compiler/run \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "sourceLimit": 5,
    "packetLimit": 5,
    "dryRun": false,
    "background": true
  }'
```

Options:
- `sourceLimit` — max sources to process (0–100, default 5)
- `packetLimit` — max packets to generate (0–100, default 5)
- `dryRun` — true to preview without writing (default false)
- `background` — run async (default true)

### Check compiler status

```bash
GET /api/admin/intelligence-compiler/status
```

### Verify output quality

```bash
npm run rag:verify:intelligence-compiler
npm run rag:verify:latest-briefing   # check shape of most recent packet
```

---

## 12. Procore Crawlers

Used to capture Procore UI state for parity audits and PRP generation.

### Deep crawl a feature (generates manifest + screenshots)

```bash
node scripts/playwright-crawl/procore-deep-crawl.js <feature>
# Examples:
node scripts/playwright-crawl/procore-deep-crawl.js budget
node scripts/playwright-crawl/procore-deep-crawl.js change-events
node scripts/playwright-crawl/procore-deep-crawl.js prime-contracts

# Output: .claude/procore-manifests/<feature>/manifest.json
#         .claude/procore-manifests/<feature>/screenshots/
```

### Modal crawl

```bash
node scripts/playwright-crawl/procore-modal-crawl.js
```

### Generate spec markdown from manifest

```bash
node scripts/playwright-crawl/generate-procore-spec.js budget
node scripts/playwright-crawl/generate-procore-spec.js --all
# Output: docs/procore-spec/<tool>.md
```

### ETL: ingest crawl data into Supabase

```bash
node scripts/playwright-crawl/etl_ingest_procore_crawl.js
# Reads dom/<page>/metadata.json → writes to app_system_actions table
```

### Parity audit

```bash
node scripts/parity-audit.mjs <tool|all> [priority=HIGH] [projectId=767] [baseUrl=http://localhost:3000]
# Examples:
node scripts/parity-audit.mjs budget
node scripts/parity-audit.mjs all priority=HIGH
node scripts/parity-audit.mjs change-events,rfis
```

### Capture screenshots of specific features

```bash
node scripts/playwright-crawl/capture-change-orders.js
node scripts/playwright-crawl/take-financial-screenshots.js
```

---

## 13. Admin / Ops

### Set admin role

```bash
node scripts/set-admin.mjs <email>
# Example:
node scripts/set-admin.mjs megan@megankharrison.com
```

Also available as an npm script from `frontend/`:
```bash
cd frontend && npm run set-admin
```

### Health check (backend + frontend)

```bash
./scripts/misc/health-check.sh
```

### Visual audit (screenshots every page at 4 viewports)

```bash
bash scripts/visual-audit/run-visual-audit.sh
# Output: scripts/visual-audit/output/<timestamp>/
```

### Council data coverage audit

```bash
npx tsx scripts/audit-council-data-coverage.ts
# Reports per-project data coverage for Council Mode agents
```

### Check Supabase migration ledger

```bash
npm run db:migrations:verify-applied
```

### Validate help articles / docs system

```bash
npm run docs:validate-help
npm run docs:verify-help
HELP_VERIFY_BASE_URL=http://localhost:3000 npm run docs:verify-help:browser
```

### Prompt cache monitor

```bash
npm run cache:verify
npm run cache:stats
npm run cache:recent
npm run cache:export
npm run cache:reset
```

---

## 14. In-App Triggers

Actions users (or admins) can trigger from within the application itself.

| Location | Action | What it does |
|----------|--------|-------------|
| `/admin/intelligence-compiler` | Run Compiler button | Triggers intelligence packet generation |
| `/admin/intelligence-compiler` | Status panel | Shows last run, packet count, source stats |
| `/admin/rag-eval` | Run Eval button | `POST /api/admin/rag-eval/run` — runs RAG eval suite |
| Any project → Progress Reports | Download PDF | `GET /api/projects/[id]/progress-reports/[id]/pdf` |
| Any project → Progress Reports | Generate with AI | `POST /api/projects/[id]/progress-reports/[id]/ai-generate` |
| Any project → Progress Reports | Email report | `POST /api/projects/[id]/progress-reports/[id]/email` |
| Change Orders | Export | `GET /api/projects/[id]/prime-contract-change-orders/export` |
| Submittals | Export | `GET /api/projects/[id]/submittals/export` |
| Project Status Report | Export | `GET /api/projects/[id]/psr/export` |
| Commitments | Export PDF | `GET /api/commitments/[id]/export` |
| Settings → Telegram | Register webhook | `POST /api/settings/telegram/register-webhook` |
| Settings → Telegram | Link account | `POST /api/settings/telegram/link` |
| Admin → Acumatica logs | View outbound | `GET /api/admin/acumatica-outbound-logs` |
| Admin → Feedback | Dispatch fix | `POST /api/admin/feedback/dispatch` |
| Any project → Scheduling | Import tasks | `POST /api/projects/[id]/scheduling/tasks/import` |
| Any project → Drawings | (via backend) | Routes through 27 drawing API routes |

---

## 15. Audits

One-off audit scripts that produce reports. None write to the DB.

| Command | What it checks |
|---------|---------------|
| `node scripts/audits/audit-design-system.mjs` | Design system violations in components |
| `node scripts/audits/audit-form-fk-mismatches.mjs` | FK mismatches in form dropdowns |
| `node scripts/audits/audit-migration-vs-types.mjs` | Migrations vs generated types drift |
| `node scripts/audits/audit-orphaned-api-routes.mjs` | API routes with no callers |
| `node scripts/audits/audit-orphaned-components.mjs` | Components with no consumers |
| `node scripts/audits/audit-orphaned-hooks.mjs` | React hooks with no consumers |
| `node scripts/audits/audit-orphaned-services.mjs` | Service files with no consumers |
| `node scripts/audits/audit-pageshell-violations.mjs` | Pages not using PageShell |
| `node scripts/audits/audit-phantom-columns.mjs` | Code references to non-existent DB columns |
| `node scripts/audits/audit-phantom-tables.mjs` | Code references to non-existent DB tables |
| `node scripts/audits/audit-raw-external-fetch.mjs` | Raw `fetch()` to external services (should use `fetchWithGuardrails`) |
| `node scripts/audits/audit-raw-internal-fetch.mjs` | Raw `fetch("/api/...")` (should use `apiFetch`) |
| `node scripts/audits/audit-route-param-conflicts.mjs` | Next.js route param naming conflicts |
| `node scripts/audits/audit-status-color-hardcoding.mjs` | Hardcoded status colors |
| `node scripts/audits/audit-type-escapes.mjs` | `as any`, `@ts-ignore`, `@ts-expect-error` usage |
| `node scripts/audits/audit-untyped-supabase-clients.mjs` | Supabase clients missing type parameter |
| `node scripts/audits/check-no-manual-db-type-overrides.mjs` | Manual DB type overrides |
| `node scripts/audits/check-no-new-phantom-tables.mjs` | New phantom table references since last check |
| `node scripts/database/audit-live-schema-references.mjs` | Live schema vs code references |
| `npm run db:audit` | Full DB audit (inserts + mappers + FK types + ambiguous embeds) |
