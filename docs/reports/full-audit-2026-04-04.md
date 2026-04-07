# Alleato PM — Full Application Audit
**Date:** 2026-04-04
**Scope:** 80 pages, 292 API routes, 53 hooks, 141+ components

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **CRITICAL** | 8 |
| **HIGH** | 38 |
| **MEDIUM** | 45+ |
| **LOW** | 20+ |

### Top 5 Most Critical Issues

1. **SQL injection via generic table CRUD endpoints** — `table-insert`, `table-delete`, `table-update` accept arbitrary table names from request body, bypassing all access control
2. **80 API routes have zero authentication** — financial data, PII, and permission management endpoints are publicly accessible to any caller
3. **98 API routes return generic "Internal server error"** — making every failure impossible to diagnose without server access
4. **76 of 80 pages have no error boundary** — any unhandled error crashes the entire page with no recovery
5. **431 hardcoded color violations across 141 files** — ESLint enforces these as errors; dark mode is broken in these components

### Overall Quality Score: **4/10**
The core architecture (Next.js + Supabase + React Query + shadcn) is solid. But the implementation has severe gaps in security, error handling, and consistency that make the app fragile and hard to debug.

---

## CRITICAL Issues (Fix Immediately)

### SEC-1. Arbitrary Table Access via Generic CRUD Endpoints
- **Files:** `api/table-insert/route.ts`, `api/table-delete/route.ts`, `api/table-update/route.ts`, `api/table-metadata/route.ts`
- **Impact:** Any authenticated user can INSERT/DELETE/UPDATE any row in any table. `table-metadata` uses service client (bypasses RLS) with NO auth.
- **Fix:** Delete these endpoints entirely or add a strict table allowlist.

### SEC-2. Supabase Management API Proxy with No Real Permission Check
- **File:** `api/supabase-proxy/[...path]/route.ts`
- **Impact:** Forwards arbitrary requests to `api.supabase.com` using the management token. "Permission check" is just `Boolean(projectRef)` — any truthy path grants access. Could delete databases.
- **Fix:** Remove or lock down to admin-only with proper role verification.

### SEC-3. File System Read with Path Traversal Risk
- **File:** `api/files/read/route.ts`
- **Impact:** Reads arbitrary server files. Path traversal check is fragile. Exposes source code and env files.
- **Fix:** Remove or restrict to a specific safe directory with strict validation.

### SEC-4. Admin Routes Without Authentication (5 routes)
- **Files:** `api/admin/feedback/github-comments/route.ts`, `api/admin/feedback/crawl/route.ts`, `api/admin/feedback/tools/route.ts`, `api/admin/company-context/route.ts`, `api/admin/company-knowledge/route.ts`
- **Impact:** Admin functionality accessible without any auth check.
- **Fix:** Add `getApiRouteUser()` + admin role check to each.

### SEC-5. 80 API Routes Have Zero Authentication
- **Includes:** `projects/route.ts` (lists all projects), `budget/details`, `budget/export`, `budget/import`, `employees`, `permissions/assign`, `permissions/override`, all `ai-assistant/*` routes, all `initiative-cards/*` routes, all `financial-insights/*` routes
- **Impact:** Financial data, PII, and access control endpoints are unprotected.
- **Fix:** Add auth middleware or per-route `getUser()` checks.

### SEC-6. Cron Routes Skip Auth When Secret Not Set
- **Files:** `api/cron/daily-flags/route.ts`, `api/cron/decay-memories/route.ts`
- **Impact:** If `CRON_SECRET` env var is unset, the check is skipped entirely — routes become publicly accessible.
- **Fix:** Return 401 when `CRON_SECRET` is not configured.

### SEC-7. `dev/make-admin` Route Relies Only on NODE_ENV
- **File:** `api/dev/make-admin/route.ts`
- **Impact:** Any authenticated user can grant themselves admin if `NODE_ENV` is manipulated.
- **Fix:** Add additional safeguards or remove from production builds.

### RT-1. Route Naming Violation: `commitments/[id]` (12 files)
- **Files:** All routes under `api/commitments/[id]/`
- **Impact:** Uses generic `[id]` instead of `[commitmentId]` — can cause Next.js routing conflicts per mandatory Route Naming Gate.
- **Fix:** Rename to `[commitmentId]`.

---

## HIGH Issues (Fix This Sprint)

### Error Handling (98 files, ~252 routes)

**ERR-1. Generic "Internal server error" in 98 API route files**
The `apiErrorResponse()` utility exists and classifies errors beautifully (FK violations, duplicates, permission denied, etc.). But only 40 of 292 route files use it. The other 252 routes return `{ error: "Internal server error" }` with zero context.

**Worst offenders by resource:**
| Resource | Files | Occurrences |
|----------|-------|-------------|
| Commitments (`api/commitments/[id]/*`) | 12 | 30+ |
| Budget (`api/projects/*/budget/*`) | 14 | 20+ |
| Change Events (`api/projects/*/change-events/*`) | 16 | 15+ |
| Directory (`api/projects/*/directory/*`) | 25 | 15+ |
| Drawings (`api/projects/*/drawings/*`) | 7 | 10+ |
| PCOs (`api/projects/*/pcos/*`) | 5 | 10+ |

**ERR-2. 25 API routes have NO try/catch at all**
Any unhandled exception crashes with an opaque 500. Includes `tasks/route.ts`, `team-chat/messages/route.ts`, all `ai-assistant/*` routes, all `initiative-cards/*` routes, `admin/company-context`, `admin/company-knowledge`.

**ERR-3. 177 API routes have NO console.error logging**
Errors are silently swallowed — nothing in server logs to diagnose.

**ERR-4. ~80 routes don't check Supabase errors after queries**
`data` is used without verifying the query succeeded. If it fails, `data` is null → unhandled TypeError.

**ERR-5. Error details leaked to client in 15+ routes**
`error.message` returned directly, exposing table names, column names, constraint names.

### Missing Error Boundaries & Loading States

**PG-1. 76 of 80 pages have no error boundary (`error.tsx`)**
Only budget, change-events, commitments, and schedule have error boundaries. Every other page crashes fully on error.

**PG-2. Zero `loading.tsx` files exist**
No page shows a loading indicator during server-side navigation.

### Input Validation

**VAL-1. 214 POST/PUT/PATCH routes have no Zod validation**
Request bodies are passed directly to Supabase without schema validation. Invalid types, extra fields, and missing required fields cause cryptic database errors instead of clean 400 responses.

### Pages

**PG-3. 29 pages don't use PageShell**
Missing consistent layout structure. See full list in detailed findings.

**PG-4. 19 monolith page files (>400 lines)**
Largest: `change-orders/prime/[primeCoId]/page.tsx` at 1,429 lines, `directory/page.tsx` at 1,375 lines, `budget/page.tsx` at 1,252 lines.

**PG-5. Duplicate/competing routes**
- `invoices/` vs `invoicing/` — two complete invoicing systems co-exist
- `change-events/new/` vs `change-events/new2/` — duplicate creation forms

### Design System (141 files, 1,100+ violations)

**DS-1. 431 hardcoded `bg-*` color violations across 141 files**
**DS-2. 591 hardcoded `text-*` color violations across 193 files**
**DS-3. 90 hardcoded `border-*` color violations across 47 files**
**DS-4. ~100+ hex codes in component files**
**DS-5. 200+ arbitrary spacing values**

**Top 10 worst files:**
| File | Violations |
|------|-----------|
| `components/ui/linear-issue-table.tsx` | 33 |
| `components/monitoring/MonitoringCharts.tsx` | 32 |
| `components/drawings/DrawingLinksPanel.tsx` | 23 |
| `components/procore-docs/docs-chat.tsx` | 21 |
| `app/(admin)/rag-eval/page.tsx` | 20 |
| `components/notifications/custom-notification-kinds.tsx` | 19 |
| `app/(main)/[projectId]/home/project-command-center.tsx` | 19 |
| `components/ai-elements/test-results.tsx` | 18 |
| `components/ai-elements/schema-display.tsx` | 17 |
| `components/dev/DevModeProvider.tsx` | 17 |

**DS-6. 16 custom components incorrectly placed in `ui/` directory**
The `ui/` directory should be pure shadcn primitives only. Custom components like `metric-card.tsx`, `summary-card-grid.tsx`, `linear-issue-table.tsx`, `container.tsx`, `heading.tsx`, `stack.tsx` belong in `ds/` or `layout/`.

**DS-7. 3 components duplicate existing DS components**
- `ui/metric-card.tsx` duplicates `ds/kpi.tsx` (KpiBlock)
- `ui/summary-card-grid.tsx` duplicates `ds/kpi.tsx` (KpiRow)
- `domain/punch-items/punch-item-status-badge.tsx` duplicates `ds/status-badge.tsx`

### Hooks & Data Fetching

**HK-1. 6 completely unused hooks (1,100+ lines of dead code)**
`use-direct-costs.ts` (386 lines), `use-contract-change-orders.ts` (412 lines), `use-change-event-rfqs.ts`, `use-create-subcontract.ts`, `use-format-currency.ts`, `use-mobile copy.ts` (duplicate file).

**HK-2. Duplicate hooks with conflicting implementations**
- `use-commitments.ts` (old useState) vs `use-commitments-query.ts` (React Query) — both imported by different pages
- `use-realtime-chat.ts` vs `use-realtime-chat.tsx` — same export name, different implementations, bundler picks randomly

**HK-3. 29 hooks use old useState+useEffect pattern instead of React Query**
No caching, no deduplication, no background refetch, no stale-while-revalidate. Core hooks affected: `use-budget-data`, `use-change-events`, `use-contracts`, `use-projects`, `use-commitment-change-orders`.

**HK-4. 18 mutations with zero onError callbacks**
Users get no feedback when mutations fail. Includes company CRUD, distribution groups, initiative cards, project companies.

**HK-5. Zero AbortController usage across 53 hooks**
29 hooks using useState+useEffect can setState on unmounted components.

### Accessibility

**A11Y-1. FormField uses `<div>` instead of `<label>` (affects ALL forms)**
`components/forms/FormField.tsx` line 27 renders label text in a `<div>`. This single fix would improve label association for TextField, SelectField, MoneyField, NumberField, DateField, TextareaField, MultiSelectField, FileUploadField, AutocompleteField, and RichTextField.

**A11Y-2. 100+ icon-only buttons missing `aria-label`**
The `MoreHorizontal` (three-dot menu) button appears on every table row. Toolbar icons (search, filter, columns, export) are unlabeled. Only ~4 instances in the entire codebase have proper labels.

**A11Y-3. Clickable divs without keyboard support**
`BudgetCodeSelector.tsx` has 3 click-only divs. SOV page has 7 click-only sortable headers. Prime contracts has click-only table rows.

---

## MEDIUM Issues (Fix Next Sprint)

### Accessibility
- No `aria-sort` on sortable table columns (A-10)
- Table checkboxes missing `aria-label` (A-7)
- Inline edit inputs unlabeled (A-8)
- Search input missing `aria-label` (A-9)
- Custom panels without focus traps (A-13, A-14)
- Color-only status indicators with no text alternative (A-11)
- Table rows with onClick but no keyboard handler (A-15)

### Data Fetching
- 25 React Query hooks missing `staleTime` — every mount triggers a refetch (HK-6)
- No shared queryKey factory — 25 of 41 React Query hooks use inline strings (HK-7)
- 11+ pages with direct fetch() calls missing error handling (HK-8)
- 6 pages with direct Supabase calls bypassing hooks (HK-9)

### Responsive Design
- AI panel fixed at `w-[380px]` — overflows on small phones (A-16)
- Drawings board `min-w-[700px]` — unusable on mobile (A-17)

### Code Quality
- 42 ESLint disable overrides for design system rules (DS-8)
- 4 unresolved TODO comments in production code (PG-6)
- Inconsistent page architecture — 3+ patterns across 80 pages (PG-7)
- Error response format inconsistency — 4 different formats (ERR-6)

---

## LOW Issues (Backlog)

- Footer `<nav>` without `aria-label` (A-23)
- Heading hierarchy skip in budget unlock dialog (A-22)
- Green "online" dot without text alternative (A-12)
- Search input fixed at `w-[200px]` in toolbar (A-18)
- Various fixed-width elements on narrow screens (A-19, A-20)
- Card trap anti-pattern in 3 settings pages (DS-9)
- `DataTablePage` template still exists (DS-10)
- Dev overlay dismiss not keyboard-accessible (A-4)

---

## Positive Findings

1. **Shadow usage is clean** — zero violations of the shadow-xs/shadow-sm rule
2. **No raw `<button>` or `<input>` in components** — all use shadcn primitives
3. **Contracts API routes are exemplary** — all 18 files use `apiErrorResponse`, have auth, and have Zod validation (after today's fixes)
4. **`PageLayout` and `ProjectToolPage` deprecated patterns have been removed** from active pages
5. **Budget table has proper `aria-label` on checkboxes** — can be used as the model for UnifiedTablePage
6. **`apiErrorResponse` utility is well-designed** — classifies errors, logs server-side, returns safe messages. Just needs broader adoption.
7. **React Query hooks that DO exist are well-structured** — proper queryKey factories, staleTime, cache invalidation

---

## Recommended Fix Priority

### Immediate (Today/Tomorrow)
1. **Delete or lock down `table-insert/delete/update` and `supabase-proxy`** (SEC-1, SEC-2)
2. **Add auth to the 5 unprotected admin routes** (SEC-4)
3. **Fix cron secret validation** (SEC-6)

### This Week
4. **Bulk-replace generic "Internal server error" with `apiErrorResponse`** across all 98 files (ERR-1) — can be done with a scripted find/replace
5. **Add auth checks to the 80 unprotected API routes** (SEC-5) — prioritize financial and PII endpoints
6. **Add error boundaries (`error.tsx`)** to the top-level route groups (PG-1)

### This Sprint
7. **Change `FormField.tsx` label from `<div>` to `<label>`** — single fix improves all forms (A11Y-1)
8. **Add `aria-label` to icon buttons in UnifiedTablePage and table configs** (A11Y-2)
9. **Delete 6 unused hooks** (HK-1) — 1,100 lines of dead code
10. **Resolve duplicate hooks** — remove old `use-commitments.ts`, fix `use-realtime-chat` file conflict (HK-2)
11. **Rename `commitments/[id]` to `commitments/[commitmentId]`** (RT-1)

### Next Sprint
12. **Migrate 29 old-pattern hooks to React Query** — start with `use-projects`, `use-budget-data`, `use-contracts` (HK-3)
13. **Add Zod validation to top POST/PUT routes** (VAL-1) — prioritize financial write endpoints
14. **Refactor 19 monolith pages** — start with 1,400+ line files (PG-4)
15. **Fix hardcoded colors** — start with the 10 worst files (DS-1 through DS-5)
16. **Move 16 custom components out of `ui/`** (DS-6)
17. **Resolve duplicate routes** — invoices vs invoicing, new vs new2 (PG-5)

---

*Generated by audit agents on 2026-04-04. This report documents issues only — no fixes were applied.*
