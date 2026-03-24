# Master Progress Log

All feature work is logged here in reverse chronological order (newest first).
One entry per session. Link to investigation reports, PRPs, and code changes where relevant.

**Related files:**
- Feature index: [`planning-artifacts/INDEX.md`](./planning-artifacts/INDEX.md)
- Cross-feature task list: [`planning-artifacts/MASTER-TASK-LIST.md`](./planning-artifacts/MASTER-TASK-LIST.md)
- Bug reports: `.claude/investigations/<feature>/investigation-report.md`

---

## How to Add an Entry

Copy this template and paste at the top of the log (below the divider):

```
### YYYY-MM-DD — <Feature> — <What was done>

**Status before:** X/10 or X%
**Status after:** X/10 or X%

**Done:**
- item

**Still needed:**
- item

**Files changed:**
- `path/to/file` — what changed
```

---

## Log

---

### 2026-02-23 — Prime Contracts — Live crawl + verified gap analysis

**Status before:** 6/10 (prior investigation had stale info — vendor_id fix was already done)
**Status after:** 7/10 (structure), 4/10 (financial accuracy — all calcs show $0)

**Method:** Ran live Playwright crawl against project 562949954728542. Extracted ag-grid col-ids, form labels, and action dropdowns from live DOM. Cross-referenced with Procore official support docs.

**Confirmed ALREADY FIXED (were listed as blockers):**

- vendor_id → client_id: ✅ DONE
- executed_at field: ✅ DONE
- Status enum mismatch: ✅ SAME VALUES in both files
- 7 date fields: ✅ ALL PRESENT in DB

**Still broken:**

- 🔴 Permission check disabled — `route.ts:152`
- 🔴 `database.types.ts` is 0 bytes (empty file)
- 🟠 All 10 financial calculated columns show $0 (no view/calc implemented)
- 🟠 No invoice/payment_applications infrastructure (missing 2 tables + routes)
- 🟠 No React Query hook (use-prime-contracts.ts doesn't exist)
- 🟡 payment_terms + billing_schedule not in create/edit form

**New verified findings:**

- List page has 18 ag-grid columns (we display ~10)
- Contract detail has "Create Invoice" and "Create Payment" actions → requires payment infra
- Configure tab has 8 settings (none built)
- ERP Status is a list column (system-managed, low priority)

**Bugs fixed in this session:**

- ✅ Re-enabled permission check — `route.ts:152` uncommented (was security hole)
- ✅ Fixed `database.types.ts` (was 0 bytes) — now re-exports from `database.local.types.ts`, resolves TS2306 across ~15 files
- ✅ Created `frontend/src/hooks/use-prime-contracts.ts` — React Query hooks for full CRUD

**Files created:**

- `.claude/investigations/prime-contracts/procore-definitive-feature-list.md` — live DOM evidence
- `.claude/investigations/prime-contracts/gap-analysis-verified.md` — full gap analysis
- `_bmad-output/planning-artifacts/prime-contracts/tasks-prime-contracts.md` — updated task list
- `frontend/src/hooks/use-prime-contracts.ts` — new React Query hook

**Files modified:**

- `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts` — permission check re-enabled
- `frontend/src/types/database.types.ts` — fixed empty file, now re-exports from local types

---

### 2026-02-23 — Documentation — Master index and folder reorganization

**Done:**
- Created `_bmad-output/planning-artifacts/INDEX.md` — master index of all PRP files across all features
- Created `_bmad-output/planning-artifacts/prime-contracts/index.md` — per-feature file map with critical issues table
- Created `_bmad-output/PROGRESS.md` — this file
- Copied all PRPs from `docs/PRPs/` → `_bmad-output/planning-artifacts/` (PRPs now live in this repo, not the docs site)
- Added stub `README.md` in `docs/PRPs/` pointing to new location
- Updated `docs/index.md` — added `project-context.md` and `agent-systems-analysis.md` entries
- Updated `.claude/rules/FILE-ORGANIZATION-GATE.md` — added Folder Ownership decision tree, clarified `docs/` is a symlink to a separate repo, updated PRP location to `_bmad-output/planning-artifacts/`
- Moved `_bmad-output/project-context.md` → `docs/project-context.md`
- Created `docs/agent-systems-analysis.md` — saved previously unsaved BMAD structure analysis

**Files changed:**
- `_bmad-output/planning-artifacts/INDEX.md` — created
- `_bmad-output/planning-artifacts/prime-contracts/index.md` — created
- `_bmad-output/PROGRESS.md` — created
- `docs/index.md` — updated
- `docs/project-context.md` — moved here from `_bmad-output/`
- `docs/agent-systems-analysis.md` — created
- `.claude/rules/FILE-ORGANIZATION-GATE.md` — updated
- `docs/PRPs/README.md` — stub created

---

### 2026-02-23 — Prime Contracts — Bug investigation (6/10)

**Status before:** ~70% (self-reported, untested)
**Status after:** 6/10 (live browser test)

**Confirmed working:**
- Page loads, create form renders, form validation fires
- API routes (full CRUD + line items + change order approve/reject)
- SOV line items UI (Add Group / Add Line / Import CSV)
- Change Orders tab in detail view
- File attachments
- All 4 database tables
- 89% column parity with Procore (25/28 columns)

**Broken / missing:**
- 🔴 Permission check disabled — anyone can edit any contract (`route.ts:152` — uncomment 4 lines)
- 🔴 Status enum mismatch — `types/prime-contracts.ts` defines wrong values
- 🟠 `vendor_id` should be `client_id` (prime contracts are with clients, not vendors)
- 🟠 Payment terms + billing schedule hardcoded null in create form
- 🟠 No React Query hook — all pages use raw `fetch()`
- Phase 4 components not built (actions toolbar, filters, line items sub-page, change orders UI, billing UI)
- Phase 5 data model fixes not started (7 financial calc columns, `executed_at`)
- Phase 6 tests: 0%

**Files:**
- `.claude/investigations/prime-contracts/investigation-report.md` — full bug list
- `.claude/investigations/prime-contracts/code-audit.md` — code-level findings
- `.claude/investigations/prime-contracts/live-test.md` — browser evidence

---

### 2026-01-11 — Prime Contracts — Phase 1-3 implementation (~70%)

**Done:**
- All 7 database tables with RLS
- All 13 API routes (CRUD, line items, change order workflow)
- List page, create form, detail view (tabs), edit form
- `ContractForm`, `ScheduleOfValuesGrid`, `ScheduleOfValuesRow` components
- Table configuration

**Still needed at time of log:**
- Contract Actions Toolbar
- Line Items sub-page
- Change Orders management UI
- Billing/Payments UI
- `vendor_id` → `client_id` data model fix
- 7 financial calculation columns
- E2E tests

**Files:**
- `_bmad-output/planning-artifacts/prime-contracts/status.md`
- `_bmad-output/planning-artifacts/prime-contracts/tasks-prime-contracts.md`

---

### 2026-02-05 — Direct Costs — Audit (BLOCKED)

**Status:** 80% files exist, but create form CANNOT SUBMIT

**Done (before audit):**
- Database table, API routes, list page, 8 React Query hooks (CRUD + bulk + export)

**Blocked:**
- Create form submission broken (root cause in audit)

**Files:**
- `_bmad-output/planning-artifacts/direct-costs/audit-2026-02-05.md`
- `_bmad-output/planning-artifacts/direct-costs/status.md`

---

### 2026-02-23 — Codebase-wide — Phase 0 fixes (from MASTER-TASK-LIST)

**Done:**
- 0.1 RFIs API routes moved to `/api/projects/[projectId]/rfis/`
- 0.2 Created `use-direct-costs.ts` hook (8 hooks: CRUD + bulk + export)
- 0.3 Verified Meetings DB uses `document_metadata` table — no fix needed
- 0.4 Removed Budget-v2 nav entry and page directory
- 0.5 Removed Tasks pages, updated 6 nav files to point to Schedule
- 0.6 Decision: Invoices and Invoicing are separate features

**Source:** `planning-artifacts/MASTER-TASK-LIST.md` Phase 0
