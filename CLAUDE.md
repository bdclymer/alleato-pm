# CLAUDE.md

## Core Principles

**Never ship silent failures. Never return generic errors. Never fix a recurring bug without a guardrail.**

Every issue falls into one of three buckets:
- **Should have been prevented** → add validation / constraints
- **Should have been caught pre-deploy** → add tests / CI
- **Should have been caught post-deploy** → add monitoring

After every bug fix, answer:
1. What would have caught this before production?
2. What guardrail am I adding so this class of bug cannot recur?
3. Does this reveal a pattern needing a system-level fix?

---

## Project Overview

Next.js 15 frontend + Supabase backend construction project management platform. Mirrors Procore: budgets, contracts, change orders, directory, scheduling.

**Stack:** Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, Radix, Framer Motion, TanStack Query, Zustand, Supabase (PostgreSQL/Auth/RLS), Python FastAPI, React Hook Form + Zod.

```
frontend/src/
  app/          # (main)/ project pages, (admin)/ internal, api/ routes
  components/
    ui/         # shadcn primitives only — do not add here
    ds/         # design system components + barrel re-exports
    layout/     # PageShell, PageContainer
    domain/     # feature-specific components
  hooks/        # React Query hooks (use-*.ts)
  lib/          # supabase/, schemas/, api-client, fetch-with-guardrails
  types/        # database.types.ts (generated)
```

---

## Development Commands

```bash
# Root
npm run dev                 # frontend + backend
npm run build               # production build
npm run quality             # typecheck + lint
npm run quality:fix         # typecheck + lint + auto-fix

# frontend/
npm run lint
npm run typecheck
npm run db:types            # REQUIRED before any DB work — regenerates database.types.ts
npm run check:routes        # verify no dynamic route conflicts
```

**Tests:**
```bash
npm run test                # Playwright E2E headless
npm run test:unit           # Jest unit
npx playwright test tests/e2e/<file>.spec.ts --headed
```

Auth pre-configured. Playwright session at `tests/.auth/user.json`. If expired, run `npx playwright test tests/auth.setup.ts` once.

---

## Verification Delegation (Mandatory)

Always delegate routine expensive verification to a lower-cost sub-agent when sub-agents are available. This includes full typechecks, lint/quality runs, production builds, full test suites, long crawls, and deployment log monitoring.

Main thread responsibilities:
- Implement code changes.
- Run only short targeted checks needed to make immediate decisions.
- Fix concrete blockers reported by verification.

Lower-cost sub-agent responsibilities:
- Run `npm run typecheck`, `npm run quality`, `npm run build`, full Playwright/Jest suites, predeploy gates, and other long-running checks.
- Return only a compact report: pass/fail, exact failing command, concise error lines, likely owner file(s), and whether the failure is related to the current task or unrelated repo debt.

Do not burn a frontier/main conversation model on routine verification unless the user explicitly requests it or sub-agents are unavailable.

---

## External Service Ownership (Mandatory)

If a task requires an environment variable, provider key, deployment setting,
migration, backend service change, or operational configuration, do not ask the
user to do it when a CLI, API, MCP connector, or configured credential is
available. Use the tool directly and verify the result.

This applies to Vercel env vars/deployments, Sentry configuration, PostHog,
Supabase migrations and type generation, Render services/logs/deployments,
GitHub, Linear, Teams, Microsoft integrations, and similar configured systems.

Only call the work blocked when the tool is unavailable, auth/permissions fail,
or the needed secret value cannot be found in an existing secure source. When
blocked, state the exact missing capability or credential, the command/tool that
proved it, and the smallest setup action needed. Never expose secret values in
logs, docs, commits, or final responses.

---

## What the Toolchain Enforces

**You do not need to remember these — violating them blocks your commit or build.**

| What | Enforced by |
|------|------------|
| No `<button>` raw elements | ESLint `no-raw-button` → error on staged files |
| No hardcoded colors (hex, gray-*, blue-*) | ESLint `no-hardcoded-colors` → error on staged files |
| No `<h1>`/`<h2>` raw headings | ESLint `no-raw-heading` → global error |
| No raw `fetch("/api/...")` in components | ESLint `require-api-client` → error on staged files |
| No raw `fetch("https://...")` in API routes | ESLint `no-external-fetch-in-api-routes` → error on staged files |
| No raw `<TableBody>`/`<TableRow>` in pages | ESLint `no-raw-table-primitives` → error on staged files |
| No `<PageContainer>` + `<h1>` on new pages | ESLint `require-page-shell` → error on staged files |
| No `.from("nonexistent_table")` | pre-commit phantom-table check |
| No `[id]` dynamic route params | pre-commit `check:routes` |
| No `.md`/`.js`/`.ts` at project root | pre-commit root file guard |
| No server pages missing `force-dynamic` | pre-commit `check-server-prerender-safety.mjs` |
| No module-level server client init | pre-commit `check-no-module-level-server-init.mjs` |
| No new `eslint-disable` without approval | pre-commit `check-no-new-disables.mjs` |
| No new explicit `any` | pre-commit `check-no-new-any.mjs` |

When a lint rule blocks you, **fix the violation** — do not add `eslint-disable`.

---

## What Requires Judgment (Can't Be Automated)

### Database Work
Run `npm run db:types` before writing any query. Read `frontend/src/types/database.types.ts` to confirm the table, columns, and FK types exist. `projects.id` is INTEGER — not UUID.

### Route Naming
Use specific param names: `[projectId]`, `[contractId]`, `[commitmentId]`, `[invoiceId]`, `[companyId]`. Never `[id]`. Run `npm run check:routes` after creating any dynamic route.

### Form ↔ DB FK Validation
Before building any form with dropdowns: check which table the dropdown fetches from vs. which table the FK column points to. If they differ, add ID resolution in both read and write paths. Known mismatches: `budget_code_id` (FK→budget_lines, dropdown→project_cost_codes), `vendor_id` (FK→companies, dropdown→vendors). Full reference: `docs/patterns/form-id-mismatch-prevention.md`.

### Cache Clearing
Before debugging any 404 or routing issue with new files:
```bash
cd frontend && rm -rf .next
```
Never debug routing before clearing the cache.

### Browser Verification
Never claim UI work complete without verifying in `agent-browser`. Take a screenshot, read it, then report.

### Authentication
Never ask the user to log in. Credentials are in `.env`:
- App: `TEST_USER_1` / `TEST_PASSWORD_1`
- Procore crawlers: `PROCORE_USER` / `PROCORE_PASSWORD`
- Playwright: uses `tests/.auth/user.json`

### Bug Fixes
A fix is not complete without: a test that would have caught it, a validation rule preventing the bad input, a smoke test entry, or a guardrail in the shared wrapper. `scripts/api-smoke-contracts.mjs` is the first place to add regression coverage for endpoint failures.

### UI Signal-to-Noise
Remove anything that earns no place. No borders around sections — use spacing and tonal backgrounds. No labels next to self-explanatory icons. Three stacked buttons should be a `<Select>`. When in doubt, remove.

### Chat UI
No `<Alert>`/`<Card>` wrappers. No `Bot` icon — use "A" or `BriefcaseIcon`. User messages: `bg-primary text-primary-foreground`. Loading: animated dots.

---

## Supabase Client
- **Client components:** `import { createClient } from "@/lib/supabase/client"`
- **Server/API routes:** `import { createClient } from "@/lib/supabase/server"`
- Never install `@supabase/auth-helpers-nextjs` — conflicts with `@supabase/ssr`.

---

## Two Supabase Projects (RAG migration 2026-05-15)

This app uses **two** Supabase projects. Using the wrong one will silently give stale data or fail on write.

| Project | Ref | What lives here |
|---------|-----|-----------------|
| **PM APP** (primary app DB) | `lgveqfnpkxvzbnnwuled` | All app tables: projects, contracts, budgets, RFIs, submittals, emails, meetings, insights, tasks, etc. Reached via `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`. |
| **AI Database** (RAG vector store) | `fqcvmfqldlewvbsuxdvz` | **Active** `document_chunks`, `rag_document_metadata`, `rag_pipeline_state`. Reached via `RAG_SUPABASE_URL` and the `get_rag_read_client()` / `get_rag_write_client()` helpers. |

**Legacy tables in PM APP (do not write):** `document_chunks` and `rag_pipeline_state` still exist in the PM APP project but were migrated on 2026-05-15. They are now **read-only at the database level** — a `BEFORE INSERT/UPDATE/DELETE/TRUNCATE` trigger raises `LEGACY TABLE: ...` with a pointer to the new location. Reads still work for historical queries. Never re-enable writes here; point clients at the AI Database project instead.

**Rule of thumb:** anything RAG/embeddings/chunks → AI Database (use the RAG client). Everything else → PM APP (use the regular Supabase client).

---

## Key Patterns

**API fetch (components/hooks):** `apiFetch` from `@/lib/api-client` — never raw `fetch`.

**External service calls (API routes):** `fetchWithGuardrails` from `@/lib/fetch-with-guardrails` — never raw `fetch`.

**Table pages:** `UnifiedTablePage` + `useUnifiedTableState` from `@/components/tables/unified`. Reference: `frontend/src/app/(main)/[projectId]/commitments/page.tsx`.

**Page layout:** `<PageShell variant="table|dashboard|form|detail|content">` from `@/components/layout`.

**Design system components:** Check `frontend/src/components/ds/` before writing any UI. Reference: `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx`.

**Data fetching:** Hooks in `hooks/use-*.ts` wrap Supabase with React Query.

**New CRUD features:** `/create-feature <EntityName>` instead of writing from scratch.

---

## Reference Docs

- `docs/design/DESIGN.md` — design system (single source of truth)
- `docs/design/tables/table-system.md` — UnifiedTablePage API
- `docs/design/forms/FORM-SYSTEM.md` — RHF + Zod patterns
- `docs/patterns/` — known error patterns (auth, DB, API routing, integrations)
- `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md` — email/sync/AI pipeline
- `docs/architecture/AI-RAG-ARCHITECTURE.md` — AI/RAG architecture (hand-edited; kept fresh by `.claude/rules/RAG-DOCS-GATE.md`)
- `docs/architecture/tables.yaml` — **source of truth** for table metadata (hand-edited)
- `docs/architecture/TABLE-LIST.md` — **auto-generated** live list of every table with status + rows. Regenerated by `npm run db:inventory`. Never edit by hand.
- `docs/architecture/TABLE-INVENTORY.md` — narrative + dated corrections log (hand-edited)

## RAG / table docs are kept fresh by a gate, not by trust

Whenever you touch RAG code, the embedding pipeline, RAG migrations, or anything under `frontend/src/lib/ai/`, `backend/src/services/pipeline/`, `backend/src/services/integrations/microsoft_graph/`, or `alleato-ai/alleato_ai/tools/`, you MUST update at least one of:
- `docs/architecture/AI-RAG-ARCHITECTURE.md` (when architecture/tools/flow changes), OR
- `docs/architecture/tables.yaml` (when tables/columns/purpose changes) — then run `npm run db:inventory` so `TABLE-LIST.md` regenerates.

A pre-commit hook (`.husky/pre-commit-rag-docs`) enforces this — it blocks any commit that stages RAG-touching code without staging at least one of those sources, AND blocks any commit that stages `tables.yaml` without the regenerated `TABLE-LIST.md`. Full rule: `.claude/rules/RAG-DOCS-GATE.md`. Do not bypass with `--no-verify`; use the `[skip-rag-docs]` commit-subject token only for genuine no-ops.

---

## Agentation Watch Mode

When I say "watch mode", call `agentation_watch_annotations` in a loop. For each annotation: acknowledge it, make the fix, resolve with a summary. Continue until I say stop.

---

## Saved Research Snapshots (read before re-crawling)

Deep architectural analysis is expensive. Before spawning research agents, check if a memory snapshot already covers the domain:

- **Financial domain** (estimates, prime contracts, commitments, budget): `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/architecture_financial_domain.md` — full FK map, table columns, API routes, tech debt. Verified 2026-05-15.
- **Index:** `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md`

**Light-refresh protocol:** Load the snapshot → run `git log --oneline --since=<snapshot date> -- <relevant files>` → read only changed files → cross-analyze deltas. This saves ~400k tokens vs a full re-crawl.

After any deep research session, save a new snapshot to the memory directory following the pattern in `feedback_reuse_deep_research.md`.

---

## Git Workflow

**General work** (refactors, features, infrastructure): commit directly to `main`, push to `origin/main`.

**GitHub issue fixes**: use a branch + PR so the fix is reviewable and traceable to the issue.

```bash
# 1. Create branch
git checkout -b fix/issue-{number}-{short-slug}

# 2. Fix, commit
git add <files>
git commit -m "fix: <description>"

# 3. Push + open PR
git push -u origin fix/issue-{number}-{short-slug}
gh pr create --title "fix: <description>" --body "Closes #{number}" --base main
```

Branch naming: `fix/issue-{number}-{slug}` (e.g. `fix/issue-427-direct-costs-panel`).
PR body must contain `Closes #{number}` so GitHub auto-closes the issue on merge.
After PR is merged, delete the branch.

**Never** push a `fix/issue-*` branch to main directly — the PR is the record.

---

## Behavioral Rules

- Use MCP, CLI, or Bash — never tell the user to do something manually.
- When you find a bug during any task, fix it or spawn a sub-agent. No "improvement opportunities" lists.
- `cd X && command` chains fail in zsh — use absolute paths.
- **START of session:** Read `WORKING_CONTEXT.md`.
- **END of session:** Update `WORKING_CONTEXT.md`.
