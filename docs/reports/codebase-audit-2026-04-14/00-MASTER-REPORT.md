# Codebase Audit — Master Report

**Date:** 2026-04-14
**Scope:** Entire `frontend/src/` tree against project rules in `CLAUDE.md`
**Method:** 16 automated audit scripts in `scripts/audits/`, all idempotent and re-runnable

---

## Bottom line

The codebase has **~5,000+ rule violations** across 4 categories. Most are concentrated in a small number of files and directories — meaning a focused cleanup pass can clear 60-70% of the noise quickly.

| Category | Total Violations | Real Severity |
|----------|-----------------:|---------------|
| Schema drift (phantom tables/columns + migration drift) | **250** | 🔴 Critical — silent runtime bombs |
| Type escape hatches + raw fetch | **1,193** | 🔴 Critical — explains why nothing fails loudly |
| Dead / orphaned code | **1,107** | 🟡 Cleanup — ~30% are real, rest is barrel exports |
| Design system + layout + form FK | **3,558** | 🟡 Cleanup — 50% live in dead template files |

---

## 1. Schema Drift — 🔴 CRITICAL

**Detail:** [`01-schema-drift.md`](./01-schema-drift.md)

| Check | Count |
|-------|------:|
| Phantom tables (`.from(X)` where X doesn't exist in types) | **60** across 19 files |
| Phantom columns (best-effort) | 113 |
| Tables in migrations but missing from types | 15 |
| Tables in types but no migration | 62 |

**Worst offender:** Entire plugin system (`lib/plugins/plugin-manager.ts` + `components/plugins/plugin-manager-ui.tsx`) makes **12 calls** against `plugins` and `plugin_storage` tables that exist nowhere — fully phantom subsystem.

**Easy win:** ~13 of the phantom-table hits (`agent_learnings`, `acumatica_sync_runs`, etc.) are real tables in migrations — they're just stale types. Run `npm run db:types` and they vanish.

**Bigger problem:** **62 tables in production have no migration tracking them.** Drawings, Specifications, Observations, Submittals, Chat, Photos — all built directly in the Supabase dashboard. If you ever need to rebuild a branch DB, you can't.

---

## 2. Type Escape Hatches & Fetch Violations — 🔴 CRITICAL

**Detail:** [`02-type-escapes-and-fetch.md`](./02-type-escapes-and-fetch.md)

| Check | Count |
|-------|------:|
| `: any` annotations | 326 |
| `as any` casts | 224 |
| `as unknown as X` casts | 144 |
| `// @ts-ignore` / `@ts-expect-error` | 2 |
| **Untyped Supabase clients** (no `<Database>` generic) | **160** |
| Raw `fetch("/api/...")` (Rule 13 violation) | **336** |
| Raw `fetch("https://...")` in API routes (Rule 16) | 1 |

**The causal chain:** 160 untyped Supabase clients → engineers reach for `as any` because the client returns `SupabaseClient<any, "public", any>` → 148 type escapes pile up in `app/api/`. **Fix the Supabase factory typing once and a huge fraction of `as any` casts disappear mechanically.**

**This is the single highest-leverage fix in the entire codebase.** It's also the root cause of the phantom-table problem from category 1 — untyped clients let `.from("any-string-you-want")` slip past the compiler.

**336 raw `fetch("/api/...")` calls** = 336 places where an API failure shows the user "Failed to load" instead of the actual server error. Components (126) and `(main)` pages (76) are the worst.

---

## 3. Dead Code — 🟡 CLEANUP

**Detail:** [`03-dead-code.md`](./03-dead-code.md)

| Check | Orphans | Real Dead Code (estimated) |
|-------|--------:|---------------------------:|
| API routes with no callers | 35 + 25 borderline | 30-40 |
| Hooks with no importers | 74 | 50-60 |
| Services / lib utils | 319 | 100-150 |
| Components | 679 | ~380 (excluding `ai-elements` vendored kit) |

**Real dead code clusters:**
- `lib/schemas/` — 80 unused Zod schemas (validators built but never wired up)
- `lib/db/queries.ts` — 19 leftover chat/message queries from the AI chatbot template
- `lib/plugins/` — 21 exports for a plugin system that's fully phantom (see Category 1)
- `lib/ai/` — 25 orphan exports (orchestrator, prompts, mock models)

**Caveat:** Static analysis can't see dynamic imports. Verify before deleting. Cron routes (`/api/cron/*`), webhooks (`/api/webhooks/*`, `/api/liveblocks/webhook`) appear as orphans but are externally invoked — **don't delete those**.

---

## 4. Design System, Layout & Forms — 🟡 CLEANUP

**Detail:** [`04-design-and-forms.md`](./04-design-and-forms.md)

| Check | Count |
|-------|------:|
| Hardcoded Tailwind color scales (gray-/blue-/etc.) | **2,109** |
| Arbitrary spacing values (`p-[10px]`) | 460 |
| Hex codes in className/style | 182 |
| Lowercase `<button>` instead of `<Button>` | 237 |
| `text-white` outside dark surfaces | 374 |
| `bg-white` (should be `bg-card` or `bg-background`) | 108 |
| Hardcoded status colors | 78 |
| Oversized shadows | 7 |
| Generic `[id]` route params | 2 |
| Suspected form FK mismatches | 1 known + 3 heuristic |
| PageShell violations (deprecated layouts) | **0** ✅ |
| Double-header pages | 1 |

**Massive easy win:** A single file — `components/components-widgets.tsx` — contributes **270** color violations. The top-20 offenders are almost entirely unused template/demo code (`components/apps/**`, `components/layouts/header.tsx` + `sidebar.tsx`). **Deleting those template files would clear ~1,000 violations in one commit.**

**Confirmed FK mismatch:** `DirectCostForm.tsx` loads `vendor_id` options from `/api/.../vendors` instead of the FK target table `companies`. Same pattern as the budget code disaster you already documented.

**Good news:** Zero pages still use deprecated `ProjectToolPage` or `PageLayout`. That migration is done.

---

## Recommended fix order

### Wave 1 — Stop the bleeding (this week)
1. **Type the Supabase factory helpers with `<Database>` generic** — knocks out ~150 `as any` casts mechanically and prevents future phantom-table calls
2. **Delete the phantom plugin system** (`lib/plugins/`, `components/plugins/`) — it's calling tables that don't exist and is fully orphaned
3. **Run `npm run db:types`** — clears ~13 stale phantom-table hits
4. **Wire the audit scripts into pre-commit** — at least the phantom-table one. Set baseline counts; fail commit if counts grow

### Wave 2 — Clean dead code (1-2 days)
5. Delete unused template files (`components/apps/**`, `components-widgets.tsx`, deprecated `header.tsx`/`sidebar.tsx`) — clears ~1,000 design violations + ~50 dead components in one PR
6. Delete `lib/db/queries.ts` chat leftovers, `lib/schemas/` unused schemas, `lib/ai/` orphans

### Wave 3 — Real bugs (sprint)
7. Reconcile the 62 untracked tables — write retroactive migrations from `pg_dump` so the DB is reproducible
8. Fix the `DirectCostForm.tsx` FK mismatch (vendor_id → companies, not vendors)
9. Migrate the 336 raw `fetch("/api/...")` calls to `apiFetch`. Start with hooks (52 — biggest leverage since hooks have many consumers)

### Wave 4 — System-level guardrails
10. Add CI checks for each audit script — counts must monotonically decrease
11. Add ESLint rule to ban untyped `createClient()` calls

---

## How to re-run any audit

All scripts are in `scripts/audits/` and exit 0 even with violations:

```bash
# Schema
node scripts/audits/audit-phantom-tables.mjs
node scripts/audits/audit-phantom-columns.mjs
node scripts/audits/audit-migration-vs-types.mjs

# Type escapes & fetch
node scripts/audits/audit-type-escapes.mjs
node scripts/audits/audit-untyped-supabase-clients.mjs
node scripts/audits/audit-raw-internal-fetch.mjs
node scripts/audits/audit-raw-external-fetch.mjs

# Dead code
node scripts/audits/audit-orphaned-api-routes.mjs
node scripts/audits/audit-orphaned-hooks.mjs
node scripts/audits/audit-orphaned-services.mjs
node scripts/audits/audit-orphaned-components.mjs

# Design / layout / forms
node scripts/audits/audit-pageshell-violations.mjs
node scripts/audits/audit-design-system.mjs
node scripts/audits/audit-status-color-hardcoding.mjs
node scripts/audits/audit-route-param-conflicts.mjs
node scripts/audits/audit-form-fk-mismatches.mjs
```

---

## What this audit DOESN'T catch (yet)

- **N+1 query patterns** in API routes
- **Missing RLS policies** on tables (run `mcp__supabase__get_advisors` for that)
- **Silent failures** (try/catch blocks that swallow errors without logging)
- **Hooks without React Query wrappers** (raw `useState` + `useEffect` for data)
- **Test coverage gaps** per Rule 14/15

These are good candidates for Wave 5 if/when you want to extend the audit suite.
