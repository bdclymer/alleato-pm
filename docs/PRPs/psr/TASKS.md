# PSR Implementation Tasks

**Feature:** Project Status Report (PSR)
**PRP:** [prp-psr.md](./prp-psr.md)
**Status:** 🟡 Ready to implement

---

## Progress Summary

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| 1. Database | 2 | 0 | ⬜ Pending |
| 2. Types | 1 | 0 | ⬜ Pending |
| 3. API Routes | 3 | 0 | ⬜ Pending |
| 4. Components | 8 | 0 | ⬜ Pending |
| 5. Page | 2 | 0 | ⬜ Pending |
| 6. Navigation | 1 | 0 | ⬜ Pending |
| 7. PDF Export | 2 | 0 | ⬜ Pending |
| 8. Validation | 5 | 0 | ⬜ Pending |
| **Total** | **24** | **0** | ⬜ Pending |

---

## Phase 1: Database

- [ ] **Task 1.1** — Create migration `supabase/migrations/YYYYMMDDHHMMSS_psr_tables.sql`
  - `psr_comments` table with RLS (project_id INTEGER, month TEXT, section TEXT, body TEXT, UNIQUE constraint)
  - Index on `(project_id, month)`

- [ ] **Task 1.2** — Run `cd frontend && npm run db:types` to regenerate types after migration
  - Verify `psr_comments` appears in `frontend/src/types/database.types.ts`

---

## Phase 2: Types

- [ ] **Task 2.1** — Create `frontend/src/types/psr.types.ts`
  - `PsrProjectInfo`, `PsrMonthlyBilling`, `PsrOpenItemCounts`
  - `PsrBudgetLine` (17 columns), `PsrSubmittal`, `PsrRfi`
  - `PsrChangeRequest`, `PsrChangeOrder`, `PsrScheduleTask`, `PsrComment`
  - Root `PsrApiResponse` interface
  - Run `npx tsc --noEmit` to validate

---

## Phase 3: API Routes

- [ ] **Task 3.1** — Create `frontend/src/app/api/projects/[projectId]/psr/route.ts`
  - `GET` with `withApiGuardrails` wrapper
  - `?month=YYYY-MM` query param (defaults to current month)
  - 10-way `Promise.all`: project, budget (via `computeBudgetGrandTotals`), submittals, RFIs, change events, change orders, schedule tasks, owner invoices, sub invoices, comments
  - `buildPsrResponse()` function to shape data
  - Open item counts computed from already-fetched arrays (no extra DB calls)
  - ⚠️ Quote `"start date"` and `"est completion"` in projects query
  - ⚠️ Owner invoices: join through `prime_contracts!inner(project_id)` — no direct project_id
  - Smoke test: `curl http://localhost:3000/api/projects/67/psr?month=2026-04 | jq .projectInfo`

- [ ] **Task 3.2** — Create `frontend/src/app/api/projects/[projectId]/psr/comments/route.ts`
  - `GET`: list comments for `?month=YYYY-MM`
  - `POST`: upsert comment with `onConflict: "project_id,month,section"`

- [ ] **Task 3.3** — Create `frontend/src/app/api/projects/[projectId]/psr/export/route.ts`
  - Install `@react-pdf/renderer` in `frontend/`
  - `export const runtime = "nodejs"` (required — won't work on edge)
  - 9-page PDF matching original format
  - Returns `application/pdf` with Content-Disposition attachment

---

## Phase 4: Components

- [ ] **Task 4.1** — Create `frontend/src/components/domain/psr/PsrSummaryCard.tsx`
  - Project info (name, dates, contract budget, fee, insurance)
  - Open item counts using `KpiBlock` from `@/components/ds/kpi`
  - 6-month billing table (Owner Payments / Owner Billing / Sub Billing)
  - Job-to-date cost

- [ ] **Task 4.2** — Create `frontend/src/components/domain/psr/PsrBudgetTable.tsx`
  - 17-column table from `PsrBudgetLine[]`
  - Horizontal scroll on mobile
  - Grand totals row at bottom
  - Use `DataTable` from `@/components/ds/data-table` or `InlineTable`

- [ ] **Task 4.3** — Create `frontend/src/components/domain/psr/PsrSubmittalsSection.tsx`
  - Columns: Submittal #, Title, Status (`StatusBadge`), Ball in Court
  - `EmptyState` when no submittals

- [ ] **Task 4.4** — Create `frontend/src/components/domain/psr/PsrRfisSection.tsx`
  - Columns: #, Subject, Status (`StatusBadge`), Due Date, Ball in Court
  - `EmptyState` when no RFIs

- [ ] **Task 4.5** — Create `frontend/src/components/domain/psr/PsrChangeRequestsSection.tsx`
  - Columns: CR #, Contract, Title, Scope, Status, Cost, Markup, Total
  - Total row at bottom (sum of cost/markup/total)

- [ ] **Task 4.6** — Create `frontend/src/components/domain/psr/PsrChangeOrdersSection.tsx`
  - Columns: Status, Contract #, Description, Amount
  - Total row

- [ ] **Task 4.7** — Create `frontend/src/components/domain/psr/PsrScheduleSection.tsx`
  - Summary KPIs: total tasks, % complete, overdue count
  - Task table: Name, Duration, Start, Finish

- [ ] **Task 4.8** — Create `frontend/src/components/domain/psr/PsrCommentEditor.tsx`
  - Textarea + Save button
  - Calls `POST /api/projects/[projectId]/psr/comments`
  - Shows saved confirmation (no toast — inline feedback)

---

## Phase 5: Page

- [ ] **Task 5.1** — Create `frontend/src/app/(main)/[projectId]/project-status-report/page.tsx`
  - `export const dynamic = "force-dynamic"` (FIRST LINE)
  - `export const runtime = "nodejs"`
  - Server component — fetches initial PSR data server-side
  - Passes `initialData` + `initialMonth` as props to client component
  - Uses `PageShell variant="content" title="Project Status Report"`

- [ ] **Task 5.2** — Create `frontend/src/app/(main)/[projectId]/project-status-report/psr-client.tsx`
  - `"use client"` directive
  - Month picker (`<select>` or `DatePicker`) — triggers `apiFetch` to PSR API
  - Renders all 7 section components
  - Export button: `<a href="/api/projects/${projectId}/psr/export?month=${month}" download>`

---

## Phase 6: Navigation

- [ ] **Task 6.1** — Modify `frontend/src/lib/navigation-config.ts`
  - Add PSR entry to `financialManagementTools` array
  - `{ name: "Project Status Report", path: "project-status-report", icon: ClipboardList, requiresProject: true, module: "budget" }`
  - Import `ClipboardList` from `lucide-react`

---

## Phase 7: PDF Export (can be deferred to Phase 2)

- [ ] **Task 7.1** — Create `frontend/src/components/domain/psr/pdf/PsrDocument.tsx`
  - React PDF document with 9 pages
  - Page 1: Cover (project info, billing table, open items, comments)
  - Pages 2-3: Budget detail table
  - Page 4: Submittals
  - Page 5: RFIs
  - Page 6: Change requests
  - Page 7: PCCOs
  - Pages 8-9: Schedule list

- [ ] **Task 7.2** — Wire PDF download button in psr-client.tsx
  - Direct browser download: `<a href="/api/projects/${projectId}/psr/export?month=${month}" download>`
  - No JavaScript needed — the route streams the PDF

---

## Phase 8: Validation

- [ ] **Task 8.1** — Type check: `cd frontend && npx tsc --noEmit` → 0 errors
- [ ] **Task 8.2** — Quality gate: `cd frontend && npm run quality` → 0 errors
- [ ] **Task 8.3** — Build: `cd frontend && npm run build` → successful
- [ ] **Task 8.4** — API smoke tests:
  ```bash
  curl http://localhost:3000/api/projects/67/psr?month=2026-04 | jq '.projectInfo.name'
  curl http://localhost:3000/api/projects/67/psr?month=2026-04 | jq '.openItems'
  curl http://localhost:3000/api/projects/67/psr?month=2026-04 | jq '.budgetLines | length'
  curl http://localhost:3000/api/projects/67/psr/comments?month=2026-04 | jq .
  ```
- [ ] **Task 8.5** — Browser verification (agent-browser):
  ```
  agent-browser open http://localhost:3000/67/project-status-report
  agent-browser screenshot /tmp/psr-page.png
  ```
  Verify: all 7 sections visible, month picker works, nav entry shows in sidebar

---

## Session Log

| Date | Agent | Progress |
|------|-------|----------|
| 2026-05-01 | PRP creation | PRP written, TASKS.md created |
