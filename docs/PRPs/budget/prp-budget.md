# Budget Feature — PRP

**Status:** 80% complete → targeting 100% Procore parity  
**Generated:** 2026-04-18  
**Confidence Score:** 9/10

---

## Goal

**Feature Goal:** Close all remaining gaps between Alleato's budget implementation and Procore's specification. The budget module is 80% complete — all 15 core columns, the modification workflow, lock/unlock, and basic forecasting are implemented. This PRP targets the remaining 20%: Export/Import (HIGH), Budget Details tab (MEDIUM), Financial Views UI (MEDIUM), missing DB columns for modifications, sub-job UI, and several low-impact polish items.

**Deliverable:** A fully functional budget module with Export (Excel/CSV), Import from Excel, Budget Details tab, Financial Views selector, modification_type + change_event linkage, sub-job line item picker, snapshot arbitrary comparison, voided_reason on void workflow, red-text row warnings, S-curve visualization, and removal of display limits on forecasting/snapshot tabs.

**Success Definition:**
- Export downloads real budget data as `.xlsx` with two sheets (line items + grand totals) and `.csv`
- Import parses a CSV/XLSX template and creates budget line items in bulk
- Budget Details tab renders at `?tab=details` showing project-level budget metadata and sub-job breakdown
- Financial Views modal allows saving/loading named column configurations
- Budget modification form has `modification_type` (addition/deduction) and `change_event_id` fields
- Void workflow prompts for `voided_reason` before saving
- Over-budget rows highlight in red when `projectedCosts > revisedBudget`
- Forecasting tab paginates (not capped at 10 cost codes)
- Snapshots tab paginates (not capped at 5 snapshots)

---

## Why

The budget module is the most-used financial tool in Alleato — PMs check it daily for cost tracking. The current export stubs ("coming soon" toasts) block owner reporting and GC billing package workflows, which are the highest-frequency external deliverables for project managers. Import blocks initial project setup from existing spreadsheets. The Financial Views selector is in the DB but has no UI — it was promised as a column customization feature.

---

## What — List of Deliverables

**Pages / Tabs**
- Budget Details tab at `?tab=budget-details` (NEW)
- All existing tabs retain current behavior

**Database Migrations (REQUIRED before code changes)**
- `ALTER TABLE budget_mod_lines ADD COLUMN modification_type TEXT CHECK (modification_type IN ('addition','deduction'))`
- `ALTER TABLE budget_mod_lines ADD COLUMN change_event_id UUID REFERENCES change_events(id)`
- `ALTER TABLE budget_modification_lines ADD COLUMN voided_reason TEXT`
- `ALTER TABLE budget_lines ADD COLUMN vendor_id UUID REFERENCES companies(id)` (LOW)
- `ALTER TABLE budget_lines ADD COLUMN wbs_attributes JSONB` (LOW)

**API Endpoints**
- `GET /api/projects/[projectId]/budget/export` — full implementation (replace stub)
- `POST /api/projects/[projectId]/budget/import` — full implementation (replace stub)
- `GET /api/projects/[projectId]/budget/details` — full implementation
- `GET/POST /api/projects/[projectId]/budget/views` — verify fully working
- `PATCH /api/projects/[projectId]/budget/views/[viewId]` — verify column update works

**Components**
- `ExportBudgetDropdown` — real export logic with `xlsx` library
- `ImportBudgetModal` — file upload, parse, preview, bulk create
- `BudgetDetailsTab` — new tab component
- `BudgetViewsModal` — confirm working, add column reorder
- `BudgetModificationModal` — add `modification_type` field, `change_event_id` field
- Red-text row highlighting in `budget-table.tsx`
- `SnapshotComparisonSelector` — arbitrary snapshot selection (not just sequential)
- Pagination for forecasting tab cost codes
- Pagination for snapshots tab

**Frontend Form Fields**
- Budget modification form: `modification_type` (radio: Addition / Deduction)
- Budget modification form: `change_event_id` (combobox, optional)
- Void confirmation dialog: `voided_reason` (textarea, required when voiding)

### Success Criteria

- [ ] Export to `.xlsx` downloads real data (not empty/stub) with cost code, all 15 columns
- [ ] Export to `.csv` downloads plain comma-separated line items
- [ ] Import: upload `.xlsx` or `.csv` → preview modal → confirm → lines created
- [ ] Import rejects files with missing required columns (budget_code, amount)
- [ ] Budget Details tab renders without errors at `?tab=budget-details`
- [ ] Financial Views modal: create/save/load a custom view persists to DB and filters columns
- [ ] Budget modification form shows `modification_type` field (required) and `change_event_id` (optional)
- [ ] Void workflow requires `voided_reason` text before saving void status
- [ ] Rows where `projectedCosts > revisedBudget` display in red text
- [ ] Forecasting tab shows all cost codes (paginated or scrolled, not capped at 10)
- [ ] Snapshots tab shows all snapshots (not capped at 5)
- [ ] Snapshot comparison allows selecting any two snapshots (not just sequential)
- [ ] All TypeScript strict mode passes: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint`

---

## All Needed Context

### Context Completeness Check

*This PRP was written after reading every budget API route, component, hook, and DB schema. An agent reading only this PRP should have complete context for all gap implementations.*

### Documentation & References

```yaml
# MUST READ BEFORE ANY IMPLEMENTATION

- file: frontend/src/app/(main)/[projectId]/budget/page.tsx
  why: Main budget page — 1293 lines, client component. Tab navigation uses URL query params (?tab=). Understand state before modifying tabs.
  pattern: fetchBudgetData() pattern, tab switching via searchParams, lock state management
  gotcha: Uses raw useState/useCallback/useEffect — NOT React Query. Data fetching via apiFetch.

- file: frontend/src/lib/budget/compute-grand-totals.ts
  why: Core orchestrator for all budget calculations — fires 10+ parallel Supabase queries. DO NOT bypass this for new features.
  pattern: How to add new data sources to the budget rollup
  gotcha: Falls back from v_budget_lines to budget_lines — must handle both view schemas.

- file: frontend/src/app/api/projects/[projectId]/budget/route.ts
  why: GET/POST pattern for budget routes. Shows withApiGuardrails, requirePermission, BudgetFetchError handling.
  pattern: withApiGuardrails("route-name", handler) wraps ALL routes — follow exactly.
  gotcha: projectId from params must be parsed to integer via parseInt(projectId, 10).

- file: frontend/src/app/api/projects/[projectId]/budget/export/route.ts
  why: Current export stub — replace this with real xlsx generation using the xlsx library.
  pattern: GET handler that returns binary file response with Content-Disposition header.

- file: frontend/src/app/api/projects/[projectId]/budget/import/route.ts
  why: Current import stub — replace with multipart form data parsing + bulk insert.
  pattern: POST handler that accepts multipart/form-data with a file field.

- file: frontend/src/lib/schemas/budget.ts
  why: Zod schemas for all budget payloads — extend these when adding new fields.
  pattern: BudgetLineItemsPayloadSchema, BudgetModificationPayloadSchema, BudgetModificationActionSchema

- file: frontend/src/types/budget.ts
  why: Frontend TypeScript interfaces for BudgetLineItem, BudgetGrandTotals, BudgetView, BudgetSnapshot.
  pattern: When adding new fields to modifications (modification_type, change_event_id), add them here first.

- file: frontend/src/hooks/use-budget-data.ts
  why: Primary hook for budget data — uses apiFetch, NOT React Query.
  pattern: useState + useCallback + useEffect pattern used throughout budget feature.
  gotcha: "use client" directive required at hook file top.

- file: frontend/src/components/budget/budget-modification-modal.tsx
  why: Current modification form — add modification_type and change_event_id fields here.
  pattern: Modal form pattern using React Hook Form or controlled state.

- file: frontend/src/components/budget/BudgetViewsModal.tsx
  why: Financial Views modal — verify column save/load works end-to-end.
  pattern: Dual-list or checkbox approach for 19 configurable columns.

- file: frontend/src/components/budget/snapshots-tab.tsx
  why: Snapshots tab — remove max-5 cap and add arbitrary comparison selector.
  pattern: How snapshots are fetched and displayed.

- file: frontend/src/components/budget/forecasting-tab.tsx
  why: Forecasting tab — remove max-10 cost code cap; add pagination.
  pattern: How forecast data is structured.

- file: frontend/src/components/budget/budget-table.tsx
  why: Main TanStack table — add red-text row highlighting when projectedCosts > revisedBudget.
  pattern: TanStack Table getCoreRowModel + getExpandedRowModel. Row className logic.
  gotcha: Selection only enabled for leaf nodes (rows without children).

- file: frontend/src/lib/budget-filters.ts
  why: Quick filter logic (over-budget / under-budget / no-activity / all).
  pattern: applyQuickFilter() — relevant for red-text threshold logic.

- url: https://www.npmjs.com/package/xlsx
  why: xlsx library already installed for export. Use SheetJS/xlsx to build workbooks.
  critical: Use XLSX.utils.json_to_sheet() for line items, XLSX.write() for binary, return as Buffer.

- file: frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts
  why: POST modification creation — must add modification_type + change_event_id to insert.
  pattern: PATCH handler for status transitions (draft→pending→approved→void). Calls refresh_budget_rollup RPC on approve.
  gotcha: Status values MUST be lowercase: 'draft', 'pending', 'approved', 'void'.

- file: supabase/migrations/
  why: Reference migration patterns for ADD COLUMN. Always use IF NOT EXISTS guards.
  pattern: Migration filename format: YYYYMMDD_HHMMSS_description.sql

- file: frontend/src/lib/guardrails/api.ts
  why: withApiGuardrails() wrapper — all new routes MUST use this.
  pattern: Handles request-id propagation, error serialization, structured logging.

- file: frontend/src/lib/permissions-guard.ts
  why: requirePermission() pattern for all budget routes.
  pattern: requirePermission(projectIdNum, "budget", "read"|"write"|"admin")
```

### Current Codebase Tree (Budget Feature)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/budget/
│   │   ├── page.tsx                        # Main 1293-line client component
│   │   ├── error.tsx                       # Next.js error boundary
│   │   ├── setup/
│   │   │   ├── page.tsx                    # Budget setup page
│   │   │   └── components/
│   │   │       ├── BudgetLineItemRow.tsx
│   │   │       ├── BudgetCodeSelector.tsx
│   │   │       ├── CreateBudgetCodeModal.tsx
│   │   │       └── DivisionTree.tsx
│   │   └── line-item/new/page.tsx
│   └── api/projects/[projectId]/
│       ├── budget/
│       │   ├── route.ts                    # GET/POST main budget data
│       │   ├── lines/[lineId]/
│       │   │   ├── route.ts                # GET/PATCH/DELETE individual line
│       │   │   └── history/route.ts        # GET line audit trail
│       │   ├── modifications/route.ts      # GET/POST/PATCH/DELETE modifications
│       │   ├── lock/route.ts              # POST/DELETE lock/unlock
│       │   ├── snapshots/route.ts         # GET/POST snapshots
│       │   ├── forecast/route.ts          # GET/POST forecast data
│       │   ├── settings/route.ts          # GET/PUT per-project settings
│       │   ├── views/
│       │   │   ├── route.ts               # GET/POST views
│       │   │   ├── [viewId]/route.ts      # GET/PATCH/DELETE specific view
│       │   │   └── [viewId]/clone/route.ts
│       │   ├── export/route.ts            # GET — STUB (needs real impl)
│       │   ├── import/route.ts            # POST — STUB (needs real impl)
│       │   ├── history/route.ts           # GET change history
│       │   ├── details/route.ts           # GET budget details
│       │   ├── direct-costs/route.ts
│       │   ├── commitments/route.ts
│       │   ├── change-orders/route.ts
│       │   └── pending-cost-changes/route.ts
│       ├── budget-codes/route.ts
│       └── budget-changes/route.ts
├── components/budget/
│   ├── index.ts
│   ├── budget-table.tsx                   # TanStack Table, 16 columns
│   ├── budget-page-header.tsx
│   ├── budget-tabs.tsx                    # Tab bar component
│   ├── budget-filters.tsx
│   ├── budget-modification-modal.tsx      # Add modification_type, change_event_id
│   ├── budget-modification-modal-animated.tsx
│   ├── budget-line-item-modal-animated.tsx
│   ├── original-budget-edit-modal.tsx
│   ├── budget-settings-panel.tsx
│   ├── cost-codes-tab.tsx
│   ├── forecasting-tab.tsx                # Remove max-10 cap
│   ├── snapshots-tab.tsx                  # Remove max-5 cap, add comparison selector
│   ├── change-history-tab.tsx
│   ├── BudgetViewsModal.tsx               # Financial Views UI
│   ├── BudgetViewsManager.tsx
│   ├── ImportBudgetModal.tsx              # STUB — needs real impl
│   ├── BudgetLineItemCreatorModal.tsx
│   └── modals/
│       ├── BaseModal.tsx
│       ├── BaseSidebar.tsx
│       └── [10 column-detail modals]
├── hooks/
│   └── use-budget-data.ts                 # useState/useCallback/useEffect pattern
├── lib/
│   ├── budget/
│   │   ├── compute-grand-totals.ts        # Core data orchestrator
│   │   ├── update-budget-line-item.ts
│   │   └── snapshot-totals.ts
│   ├── budget-filters.ts
│   ├── budget-grouping.ts
│   └── schemas/budget.ts                  # Zod schemas
└── types/budget.ts                        # TypeScript interfaces
```

### Desired Codebase Tree (Changes Only)

```
NEW/MODIFIED FILES:
├── supabase/migrations/
│   ├── 20260418_000000_budget_mod_lines_modification_type.sql    # ADD modification_type
│   ├── 20260418_000001_budget_mod_lines_change_event_id.sql      # ADD change_event_id FK
│   ├── 20260418_000002_budget_modification_lines_voided_reason.sql # ADD voided_reason
│   └── 20260418_000003_budget_lines_vendor_wbs.sql               # ADD vendor_id, wbs_attributes (LOW)
├── frontend/src/
│   ├── app/api/projects/[projectId]/budget/
│   │   ├── export/route.ts                # REWRITE (real xlsx/csv generation)
│   │   └── import/route.ts               # REWRITE (multipart parse + bulk insert)
│   ├── components/budget/
│   │   ├── budget-details-tab.tsx         # NEW — Budget Details tab
│   │   ├── budget-modification-modal.tsx  # MODIFY — add modification_type, change_event_id
│   │   ├── budget-table.tsx              # MODIFY — add red-text row highlighting
│   │   ├── forecasting-tab.tsx           # MODIFY — remove 10-item cap, add pagination
│   │   ├── snapshots-tab.tsx             # MODIFY — remove 5-item cap, add comparison selector
│   │   └── ImportBudgetModal.tsx         # REWRITE (real parse + preview)
│   └── lib/schemas/budget.ts             # MODIFY — add modification_type, change_event_id fields
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: ALL budget API routes MUST use withApiGuardrails — never raw NextResponse
import { withApiGuardrails } from "@/lib/guardrails/api";
export const GET = withApiGuardrails<{ projectId: string }>("route-name#GET", handler);

// CRITICAL: projectId is ALWAYS a string in params, ALWAYS parse to integer
const projectIdNum = parseInt(projectId, 10);
if (Number.isNaN(projectIdNum)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });

// CRITICAL: budget_modifications.status values MUST be lowercase
// WRONG: 'Draft', 'Pending', 'Approved', 'Void'
// RIGHT: 'draft', 'pending', 'approved', 'void'
// Source: CHECK constraint in migration. Runtime INSERT will fail silently on wrong case.

// CRITICAL: ALL client-side API calls MUST use apiFetch, not raw fetch
import { apiFetch } from "@/lib/api-client";
// NEVER: const data = await fetch('/api/projects/.../budget/...');

// CRITICAL: FK type for budget tables
// budget_lines.id = UUID (string) — any FK pointing to it must be UUID
// projects.id = INTEGER (number) — project_id FK must be number
// budget_modifications.id = UUID (string)

// CRITICAL: RLS on every new budget table
// Pattern: check project_directory_memberships, NOT just auth.uid() IS NOT NULL
// Reference: budget_lines policies as the gold standard

// CRITICAL: Run db:types after every migration
// cd frontend && npm run db:types
// Then grep for new columns to confirm they're in the generated types

// CRITICAL: Clear .next cache after creating new route files
// cd frontend && rm -rf .next

// CRITICAL: Calling refresh_budget_rollup after budget modifications
// On approval (status → 'approved') or on creation of modifications:
await supabase.rpc("refresh_budget_rollup", { p_project_id: projectIdNum });

// CRITICAL: xlsx export pattern
import * as XLSX from "xlsx";
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Budget");
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
return new NextResponse(buf, {
  headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="budget-${projectId}.xlsx"`,
  },
});

// CRITICAL: Budget table row styling — use getTanStack row.original to access data
// In budget-table.tsx, add className logic to <tr>:
const isOverBudget = row.original.projectedCosts > row.original.revisedBudget;
// Apply: className={isOverBudget ? "text-destructive" : ""}

// CRITICAL: Status transitions for budget modifications
// draft → pending (submit action)
// pending → approved (approve action) → calls refresh_budget_rollup
// pending → draft (reject action)
// approved/pending → void (void action, requires voided_reason)
// approved lines CANNOT be edited, only voided

// GOTCHA: Budget line DELETE is blocked at API level when:
// - original_amount > 0 (non-zero budget)
// - budget is locked (projects.budget_locked = true)
// - budget modifications reference that line
// These are BUSINESS RULES, not DB constraints — enforce at route handler level.

// GOTCHA: BudgetCodeSelector in forms uses project_cost_codes table for options
// but budget_lines.cost_code_id FK points to cost_codes table.
// The EXISTING implementation resolves this via cost_code_id + cost_type_id matching.
// Do NOT change this resolution logic.

// GOTCHA: Export route must call computeBudgetGrandTotals() to get the full data
// — do NOT re-implement the calculation. The view data is authoritative.

// GOTCHA: Import must validate:
// - Required columns: at minimum 'cost_code' (or 'budget_code') and 'amount'
// - amount must be numeric
// - cost_code must match existing project cost codes
// - Return a preview object before insert (not auto-insert)

// GOTCHA: Snapshot comparison selector — current implementation is sequential
// (each snapshot vs. prior snapshot). New selector allows user to pick any two.
// Store selectedSnapshotA and selectedSnapshotB in URL query params for shareability.

// GOTCHA: Financial Views — budget_views.is_system = true rows are READ-ONLY
// Users cannot modify or delete system views. Enforce at API: PATCH/DELETE must
// return 403 if is_system = true (error code: BUDGET_SYSTEM_VIEW_READONLY).
```

---

## Database Schema

### Verified from `database.types.ts` (2026-04-18)

#### `budget_lines` (confirmed columns)
```typescript
{
  id: string                     // UUID, PK
  cost_code_id: string           // FK → cost_codes.id (string/text)
  cost_type_id: string           // FK → cost_code_types.id (string/UUID)
  project_id: number             // FK → projects.id (INTEGER — critical!)
  project_budget_code_id: string | null  // FK → project_project_budget_codes.id
  sub_job_id: string | null      // FK → sub_jobs.id — DB exists, NO UI yet
  sub_job_key: string | null
  original_amount: number        // DECIMAL(15,2)
  quantity: number | null
  unit_cost: number | null
  unit_of_measure: string | null
  description: string | null
  forecasting_enabled: boolean
  default_ftc_method: string | null   // enum: manual|automatic|lump_sum|monitored_resources
  default_curve_id: string | null     // FK → forecasting_curves.id
  created_by: string | null           // auth.uid()
  updated_by: string | null
  created_at: string
  updated_at: string
  // NOT IN DB YET — requires migration:
  // vendor_id: UUID FK → companies.id
  // wbs_attributes: JSONB
}
```

#### `budget_modifications` (confirmed columns)
```typescript
{
  id: string          // UUID, PK
  project_id: number  // FK → projects.id (INTEGER)
  number: string      // modification number (e.g. "MOD-001")
  title: string
  status: string      // MUST BE lowercase: 'draft'|'pending'|'approved'|'void'
  reason: string | null
  effective_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
```

#### `budget_mod_lines` (confirmed columns, FK → budget_modifications)
```typescript
{
  id: string
  budget_modification_id: string  // FK → budget_modifications.id
  cost_code_id: string            // FK → cost_codes.id
  cost_type_id: string            // FK → cost_code_types.id
  project_id: number
  sub_job_id: string | null       // FK → sub_jobs.id
  amount: number
  description: string | null
  created_at: string
  updated_at: string
  // NOT IN DB YET — requires migration:
  // modification_type: TEXT CHECK IN ('addition','deduction')
  // change_event_id: UUID FK → change_events.id
}
```

#### `budget_modification_lines` (OLDER table — different from budget_mod_lines)
```typescript
{
  id: string
  budget_line_id: string           // FK → budget_lines.id
  budget_modification_id: string   // FK → budget_modifications.id
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
  // NOT IN DB YET — requires migration:
  // voided_reason: TEXT
}
```

#### `budget_views` (confirmed columns)
```typescript
{
  id: string
  project_id: number
  name: string
  description: string | null
  is_default: boolean | null
  is_system: boolean | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}
```

### FK Type Requirements (CRITICAL)
| Column | Type | Why |
|--------|------|-----|
| `project_id` on any budget table | `number` (INTEGER) | `projects.id` is INTEGER, not UUID |
| `budget_lines.id` (and any FK to it) | `string` (UUID) | budget_lines uses UUID PK |
| `budget_modifications.id` (and FKs) | `string` (UUID) | UUID PK |
| `cost_code_id` | `string` (text, not UUID) | cost_codes.id is text |

### Required Migrations (run in order)

```sql
-- Migration 1: modification_type on budget_mod_lines
ALTER TABLE public.budget_mod_lines
  ADD COLUMN IF NOT EXISTS modification_type TEXT
  CHECK (modification_type IN ('addition', 'deduction'));

-- Migration 2: change_event_id on budget_mod_lines
ALTER TABLE public.budget_mod_lines
  ADD COLUMN IF NOT EXISTS change_event_id UUID
  REFERENCES public.change_events(id) ON DELETE SET NULL;

-- Migration 3: voided_reason on budget_modification_lines
ALTER TABLE public.budget_modification_lines
  ADD COLUMN IF NOT EXISTS voided_reason TEXT;

-- Migration 4 (LOW priority): vendor_id and wbs_attributes on budget_lines
ALTER TABLE public.budget_lines
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wbs_attributes JSONB;

-- After all migrations, run:
-- cd frontend && npm run db:types
-- Then grep for new columns to confirm they appear in generated types
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// EXTEND these existing types when adding new fields:

// frontend/src/lib/schemas/budget.ts — add to BudgetModificationPayloadSchema
import { z } from "zod";

const BudgetModificationPayloadSchema = z.object({
  // existing fields...
  modification_type: z.enum(["addition", "deduction"]).optional(),
  change_event_id: z.string().uuid().optional().nullable(),
  voided_reason: z.string().min(1).max(1000).optional(), // required when action = 'void'
});

// frontend/src/types/budget.ts — extend existing interfaces
export interface BudgetModification {
  id: string;
  projectId: number;
  number: string;
  title: string;
  status: "draft" | "pending" | "approved" | "void";
  reason: string | null;
  effectiveDate: string | null;
  modificationType?: "addition" | "deduction";  // NEW
  changeEventId?: string | null;                  // NEW
  voidedReason?: string | null;                   // NEW (on budget_modification_lines)
  lines?: BudgetModLine[];
}

export interface BudgetModLine {
  id: string;
  costCodeId: string;
  costTypeId: string;
  amount: number;
  description?: string | null;
  modificationType?: "addition" | "deduction";  // NEW — per line (inherits from parent)
  changeEventId?: string | null;                 // NEW
}

// Export API response type
export interface BudgetExportOptions {
  format: "xlsx" | "csv";
  includeGrandTotals?: boolean;  // default true
}

// Import preview type
export interface BudgetImportPreview {
  validRows: Array<{
    costCode: string;
    amount: number;
    description?: string;
  }>;
  errorRows: Array<{
    row: number;
    reason: string;
  }>;
  totalValid: number;
  totalErrors: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
# ============================================================
# PHASE 0: Database Migrations (ALWAYS FIRST)
# ============================================================

Task 0.1: CREATE supabase/migrations/20260418_000000_budget_mod_lines_modification_type.sql
  - IMPLEMENT: ADD COLUMN modification_type TEXT CHECK IN ('addition','deduction')
  - RUN: npx supabase db push (or via Supabase dashboard)
  - VALIDATE: npm run db:types && grep "modification_type" frontend/src/types/database.types.ts

Task 0.2: CREATE supabase/migrations/20260418_000001_budget_mod_lines_change_event_id.sql
  - IMPLEMENT: ADD COLUMN change_event_id UUID REFERENCES change_events(id) ON DELETE SET NULL
  - RUN migration
  - VALIDATE: grep "change_event_id" frontend/src/types/database.types.ts

Task 0.3: CREATE supabase/migrations/20260418_000002_budget_modification_lines_voided_reason.sql
  - IMPLEMENT: ADD COLUMN voided_reason TEXT on budget_modification_lines (not budget_mod_lines)
  - VALIDATE: grep "voided_reason" frontend/src/types/database.types.ts

# ============================================================
# PHASE 1: Schema Zod Extension
# ============================================================

Task 1.1: MODIFY frontend/src/lib/schemas/budget.ts
  - ADD modification_type field to BudgetModificationPayloadSchema
  - ADD change_event_id field to BudgetModificationPayloadSchema
  - ADD voided_reason field to BudgetModificationActionSchema (required when action = 'void')
  - FOLLOW pattern: existing Zod schemas in this file (z.enum, z.string().uuid().optional())

Task 1.2: MODIFY frontend/src/types/budget.ts
  - ADD BudgetModification interface (currently missing from types)
  - ADD BudgetModLine interface
  - ADD BudgetExportOptions, BudgetImportPreview types
  - FOLLOW pattern: existing BudgetLineItem, BudgetGrandTotals interface structure

# ============================================================
# PHASE 2: API Routes — Export and Import
# ============================================================

Task 2.1: REWRITE frontend/src/app/api/projects/[projectId]/budget/export/route.ts
  - IMPLEMENT real xlsx/csv export using existing xlsx library
  - CALL computeBudgetGrandTotals(supabase, projectIdNum) for data
  - SUPPORT format query param: ?format=xlsx (default) or ?format=csv
  - xlsx: two sheets — "Budget Lines" (all 15 columns) + "Grand Totals" (summary row)
  - csv: single sheet, same columns
  - RETURN binary with correct Content-Type and Content-Disposition headers
  - FOLLOW pattern: withApiGuardrails wrapper, requirePermission("budget", "read")
  - NAMING: export-{projectId}-{YYYY-MM-DD}.xlsx

Task 2.2: REWRITE frontend/src/app/api/projects/[projectId]/budget/import/route.ts
  - IMPLEMENT multipart/form-data file parsing with xlsx library
  - PARSE uploaded .xlsx or .csv file
  - VALIDATE: required columns 'cost_code'/'budget_code' and 'amount'
  - MAP cost_code values to project_budget_code_id via DB lookup
  - SUPPORT ?preview=true query param — return BudgetImportPreview without inserting
  - SUPPORT ?preview=false (or absent) — execute actual insert via upsert_budget_line_amount RPC
  - RETURN errors per-row (not entire reject) — partial success is valid
  - FOLLOW pattern: withApiGuardrails, requirePermission("budget", "write")

Task 2.3: MODIFY frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts
  - ADD modification_type to INSERT payload (from budget_mod_lines schema)
  - ADD change_event_id to INSERT payload
  - ADD voided_reason to PATCH void action handler
  - CALL refresh_budget_rollup RPC on approve action (already implemented — verify still called)
  - VALIDATE: status must be lowercase on insert/update

# ============================================================
# PHASE 3: Components — Export / Import
# ============================================================

Task 3.1: MODIFY frontend/src/components/budget/budget-page-header.tsx
  - REPLACE "coming soon" toast on Export button with real download
  - IMPLEMENT: call apiFetch('/api/projects/${projectId}/budget/export?format=xlsx', {})
    then trigger browser download via URL.createObjectURL(blob) + a.click()
  - ADD: Export submenu with "Excel (.xlsx)" and "CSV (.csv)" options
  - FOLLOW pattern: existing dropdown pattern in this header component

Task 3.2: REWRITE frontend/src/components/budget/ImportBudgetModal.tsx
  - IMPLEMENT file upload (accept: .xlsx, .csv)
  - CALL preview API on file selection: POST /budget/import?preview=true with FormData
  - DISPLAY preview table: valid rows + error rows from BudgetImportPreview
  - ADD "Import N line items" confirm button
  - ON confirm: POST /budget/import (no preview param) → show success toast
  - ON success: call refetchBudgetData() to refresh table
  - FOLLOW pattern: existing modal patterns in components/budget/modals/BaseModal.tsx

# ============================================================
# PHASE 4: Components — Budget Details Tab
# ============================================================

Task 4.1: CREATE frontend/src/components/budget/budget-details-tab.tsx
  - IMPLEMENT new tab showing project-level budget metadata
  - FETCH from /api/projects/[projectId]/budget/details
  - DISPLAY: total budget, total modifications, approved COs, revised budget (summary)
  - DISPLAY: per-cost-code breakdown table (sub-job segmentation if sub_jobs exist)
  - DISPLAY: budget_locked status, locked_at, locked_by
  - FOLLOW pattern: existing tab components (cost-codes-tab.tsx, change-history-tab.tsx)
  - USE PageShell variant="content" inside the tab body

Task 4.2: MODIFY frontend/src/app/(main)/[projectId]/budget/page.tsx
  - ADD "budget-details" to tab navigation (budget-tabs.tsx)
  - ADD conditional render: if (activeTab === "budget-details") → <BudgetDetailsTab>
  - FOLLOW pattern: existing tab switching logic in page.tsx (searchParams-based)

Task 4.3: VERIFY frontend/src/app/api/projects/[projectId]/budget/details/route.ts
  - READ current implementation — if stub, implement real query
  - QUERY: project budget metadata (budget_locked, locked_at, locked_by from projects table)
  - QUERY: per-cost-code breakdown joining budget_lines + project_project_budget_codes
  - RETURN: { isLocked, lockedAt, lockedBy, totalBudget, revisedBudget, costCodeBreakdown[] }

# ============================================================
# PHASE 5: Components — Budget Modification Form Fields
# ============================================================

Task 5.1: MODIFY frontend/src/components/budget/budget-modification-modal.tsx
  - ADD modification_type radio field: "Addition" / "Deduction" (required)
  - ADD change_event_id combobox (optional, loads from /api/projects/[projectId]/change-events)
  - ADD voided_reason textarea (shown only when action = 'void', required)
  - FOLLOW pattern: existing field patterns in the modal
  - VALIDATE: modification_type required on create/edit; voided_reason required on void

# ============================================================
# PHASE 6: Budget Table — Red-Text Row Highlighting
# ============================================================

Task 6.1: MODIFY frontend/src/components/budget/budget-table.tsx
  - ADD className logic to <tr> elements:
    const isOverBudget = row.original.projectedCosts > row.original.revisedBudget;
  - APPLY: className="text-destructive" when isOverBudget && !row.getIsGrouped()
  - NOTE: Only apply to leaf rows (not group/summary rows)
  - FOLLOW pattern: existing getCoreRowModel, getExpandedRowModel usage in this file

# ============================================================
# PHASE 7: Snapshot and Forecast Pagination
# ============================================================

Task 7.1: MODIFY frontend/src/components/budget/snapshots-tab.tsx
  - REMOVE hardcoded max-5 snapshot display limit
  - ADD pagination or full scrollable list
  - ADD snapshot comparison selector: two dropdowns (Snapshot A, Snapshot B)
  - STORE selected snapshot IDs in URL query params: ?snapshotA=uuid&snapshotB=uuid
  - SHOW diff table when both snapshots are selected

Task 7.2: MODIFY frontend/src/components/budget/forecasting-tab.tsx
  - REMOVE hardcoded max-10 cost code display limit
  - ADD pagination (page size 25) or full virtualized list
  - FOLLOW pattern: DataTable pagination from components/ds if available

# ============================================================
# PHASE 8: Financial Views UI (verify and complete)
# ============================================================

Task 8.1: VERIFY frontend/src/components/budget/BudgetViewsModal.tsx
  - READ current implementation — confirm GET/POST/PATCH to budget/views API works
  - TEST: create a custom view, save it, reload page — verify it persists
  - IF broken: fix the view column save/load loop (budget_view_columns upsert)
  - CONFIRM: system views (is_system=true) show lock icon, cannot be edited/deleted

Task 8.2: VERIFY frontend/src/app/api/projects/[projectId]/budget/views/route.ts
  - CONFIRM GET returns project's views including system defaults
  - CONFIRM POST creates new view with column configs in budget_view_columns
  - CONFIRM PATCH updates column visibility/order in budget_view_columns
  - CONFIRM DELETE blocked for is_system=true views (returns 403 BUDGET_SYSTEM_VIEW_READONLY)
```

### Implementation Patterns & Key Details

```typescript
// =============================
// EXPORT ROUTE PATTERN
// =============================
import * as XLSX from "xlsx";
import { computeBudgetGrandTotals } from "@/lib/budget/compute-grand-totals";

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget/export#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });

    const guard = await requirePermission(projectIdNum, "budget", "read");
    if (guard.denied) return guard.response;

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "xlsx";

    const supabase = await createClient();
    const { lineItems, grandTotals } = await computeBudgetGrandTotals(supabase, projectIdNum);

    if (format === "csv") {
      const csv = lineItems.map(row => [
        row.costCode, row.description, row.originalBudgetAmount,
        row.revisedBudget, row.projectedCosts, row.projectedOverUnder
      ].join(",")).join("\n");
      return new NextResponse(`Cost Code,Description,Original Budget,Revised Budget,Projected Costs,Over/Under\n${csv}`, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="budget-${projectId}.csv"`,
        },
      });
    }

    // xlsx
    const rows = lineItems.map(item => ({
      "Cost Code": item.costCode,
      "Description": item.description,
      "Original Budget": item.originalBudgetAmount,
      "Budget Modifications": item.budgetModifications,
      "Approved COs": item.approvedCOs,
      "Revised Budget": item.revisedBudget,
      "Job to Date Cost": item.jobToDateCostDetail,
      "Direct Costs": item.directCosts,
      "Pending Budget Changes": item.pendingChanges,
      "Projected Budget": item.projectedBudget,
      "Committed Costs": item.committedCosts,
      "Pending Cost Changes": item.pendingCostChanges,
      "Projected Costs": item.projectedCosts,
      "Forecast to Complete": item.forecastToComplete,
      "EAC": item.estimatedCostAtCompletion,
      "Projected Over/Under": item.projectedOverUnder,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Lines");
    const totalsWs = XLSX.utils.json_to_sheet([{
      "Original Budget": grandTotals.originalBudgetAmount,
      "Revised Budget": grandTotals.revisedBudget,
      "Projected Over/Under": grandTotals.projectedOverUnder,
    }]);
    XLSX.utils.book_append_sheet(wb, totalsWs, "Grand Totals");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="budget-${projectId}.xlsx"`,
      },
    });
  }
);

// =============================
// RED-TEXT ROW PATTERN (budget-table.tsx)
// =============================
// Inside the TanStack Table row render:
<tr
  key={row.id}
  className={cn(
    "hover:bg-muted/50 transition-colors",
    !row.getIsGrouped() && row.original.projectedCosts > row.original.revisedBudget
      ? "text-destructive"
      : ""
  )}
>

// =============================
// DOWNLOAD TRIGGER PATTERN (client component)
// =============================
const handleExport = async (format: "xlsx" | "csv") => {
  const response = await fetch(`/api/projects/${projectId}/budget/export?format=${format}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-${projectId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
};
// NOTE: Cannot use apiFetch here — apiFetch assumes JSON response. Use raw fetch for blob.
// This is the one case where raw fetch is acceptable (binary download, not JSON API call).
```

### Integration Points

```yaml
DATABASE:
  - Tables written to: budget_mod_lines (new fields), budget_modification_lines (voided_reason)
  - Tables read from: budget_lines, budget_modifications, v_budget_rollup (via computeBudgetGrandTotals)
  - RPC called on approve: refresh_budget_rollup(p_project_id)
  - Budget Views: budget_views, budget_view_columns

API ROUTES THAT CHANGE BEHAVIOR:
  - GET /budget/export — replace toast stub with real binary response
  - POST /budget/import — replace toast stub with real multipart parse + insert
  - PATCH /budget/modifications — accept new fields modification_type, change_event_id, voided_reason

EXTERNAL LIBRARIES:
  - xlsx (already installed) — for export and import parsing
  - TanStack Table (already installed) — budget-table.tsx row className logic

RLS POLICIES:
  - Any new table must add policies matching the budget_lines pattern
  - Existing budget_mod_lines and budget_modification_lines already have RLS — adding columns is safe

PERMISSIONS:
  - Export: requirePermission("budget", "read")
  - Import: requirePermission("budget", "write")
  - Financial Views: requirePermission("budget", "read") for GET, "write" for POST/PATCH/DELETE
```

---

## Known Pitfalls & Prevention

### From Incident Log (MANDATORY before starting)

#### Budget Views RLS Misconfiguration (CRITICAL — happened 2026-01-31)
**Error:** `budget_views` API returned 500 due to RLS policy checking only `auth.uid() IS NOT NULL` with no project scoping.  
**Prevention:** Every new budget table migration MUST include project-scoped RLS:
```sql
CREATE POLICY "project_member_select" ON public.budget_your_table
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM public.project_directory_memberships
      WHERE user_id = auth.uid()
    )
  );
```
**Verification:** After any budget migration: `psql -c "SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'budget%';"`

#### Budget Views Column Name Mismatch (WARNING — happened 2026-01-28)
**Error:** TypeScript compiled fine but runtime failed because migration renamed `display_name` → `name` but code still referenced `display_name`.  
**Prevention:** Run `npm run db:types` immediately after EVERY migration. Then grep for the new column names.  
**Verification:** `grep -A 10 "budget_views:" frontend/src/types/database.types.ts`

#### Route Parameter Conflict (CRITICAL — happened 2026-01-10)
**Error:** Using `[id]` in budget routes caused routing conflicts.  
**Prevention:** Budget routes MUST use named params:
- `[projectId]` for project
- `[lineId]` for budget lines
- `[modificationId]` for modifications
- `[viewId]` for views
- `[snapshotId]` for snapshots
**Verification:** `npm run check:routes` after any new budget route

#### Budget Test Suite Disabled (CRITICAL — found 2026-04-14)
**Error:** `budget-line-item-validation.spec.ts` had `test.skip(true)` — zero regression protection.  
**Prevention:** NEVER use `test.skip(true)` on an entire spec file. After any budget UI refactor, update matching Playwright specs.  
**Verification:** `grep -r "test.skip" frontend/tests/` before closing any budget PR.

#### Raw fetch() in Budget Components (CRITICAL — found 2026-04-14)
**Error:** Budget line-item sheet bypassed `apiFetch`, causing silent error degradation.  
**Prevention:** ALL budget API calls must use `apiFetch` from `@/lib/api-client`.  
**Exception:** Binary download (blob) responses — raw `fetch` is acceptable ONLY for this case.  
**Verification:** ESLint `require-api-client` rule + `npm run lint`

#### FK Budget Code ID Mismatch (CRITICAL — documented in form-id-mismatch-prevention.md)
**Error:** `budget_code_id` FK on change_event_line_items points to `budget_lines.id`, but dropdown loads from `project_cost_codes.id` — different UUIDs, Edit form shows blank.  
**Prevention:** For any form with budget code dropdown: verify both read path (GET maps budget_lines.id → cost_code for display) and write path (POST resolves cost_code back to budget_lines.id).  
**Verification:** Create record → navigate away → click Edit → ALL dropdowns must show pre-filled values.

#### Status Case Sensitivity (WARNING — documented in INCIDENT-LOG.md)
**Error:** Inserting budget_modifications with `Status='Draft'` (capitalized) violates CHECK constraint silently.  
**Prevention:** ALWAYS use lowercase: `'draft'`, `'pending'`, `'approved'`, `'void'`.  
**Verification:** `grep "status" supabase/migrations/*budget*` to confirm constraint casing.

#### Missing `vendor_id` / `wbs_attributes` on budget_lines
**Error:** If code references `budget_lines.vendor_id` without migration, runtime silently returns null/undefined.  
**Prevention:** Do NOT reference these columns in any query until the migration in Task 0 (LOW priority) is applied and `db:types` is regenerated.

#### Billing Completion > 100% (HISTORICAL — affects budget rollup)
**Error:** Invoices with completion > 100% corrupted `job_to_date_cost_detail` in budget rollup.  
**Prevention:** Import validation must reject amount values that would exceed the budget line's `original_amount` by more than 200% (configurable threshold).

---

## Validation Loop

### Level 1: Syntax & Style (run after each task)

```bash
# From frontend/ directory
npm run lint                    # ESLint — catches raw fetch, design system violations
npx tsc --noEmit               # TypeScript — catches type mismatches
npm run quality                # combined typecheck + lint

# Specific budget linting
grep -rn "raw fetch\|import.*fetch" frontend/src/components/budget/ | grep -v apiFetch
grep -rn "test.skip" frontend/tests/e2e/
```

### Level 2: Database Validation (after each migration)

```bash
# Verify migration applied
cd frontend && npm run db:types
grep "modification_type" src/types/database.types.ts    # should appear
grep "change_event_id" src/types/database.types.ts      # should appear
grep "voided_reason" src/types/database.types.ts        # should appear

# Verify budget_lines columns match code expectations
grep -A 30 "budget_lines:" src/types/database.types.ts | head -35
```

### Level 3: Integration Testing

```bash
# Clear Next.js cache before testing new routes
cd frontend && rm -rf .next

# Start dev server
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10 && tail -20 /tmp/nextjs-dev.log  # verify "Ready"

# Test export
curl -s -I "http://localhost:3000/api/projects/67/budget/export?format=xlsx" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" \
  | grep -E "Content-Type|Content-Disposition|HTTP"
# Expected: 200, Content-Type: application/vnd.openxmlformats...

# Test export CSV
curl -s "http://localhost:3000/api/projects/67/budget/export?format=csv" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" | head -3
# Expected: header row + data rows

# Test import preview
curl -s -X POST "http://localhost:3000/api/projects/67/budget/import?preview=true" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" \
  -F "file=@/tmp/test-budget-import.csv" | jq .
# Expected: { validRows: [...], errorRows: [...] }

# Test budget details
curl -s "http://localhost:3000/api/projects/67/budget/details" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" | jq .
# Expected: { isLocked, totalBudget, revisedBudget, costCodeBreakdown }

# Test modification with new fields
curl -s -X POST "http://localhost:3000/api/projects/67/budget/modifications" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" \
  -d '{"title":"Test Mod","modification_type":"addition","amount":1000}' | jq .
# Expected: created modification with modification_type field
```

### Level 4: Browser Verification (MANDATORY before claiming done)

```bash
# Use agent-browser to verify visual changes
# 1. Open budget page
# 2. Take screenshot of main table — verify red-text rows for over-budget items
# 3. Click Export → Excel — verify download triggers
# 4. Click Import — verify modal appears with file picker
# 5. Click Details tab — verify tab renders without error
# 6. Verify snapshots tab shows all snapshots (not capped at 5)
# 7. Verify forecasting tab shows all cost codes (not capped at 10)
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All 4 validation levels completed
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful production build
- [ ] All existing budget tests still pass (not skipped): `npx playwright test --grep budget`

### Feature Validation — HIGH Priority
- [ ] Export Excel: downloads `.xlsx` with real line item data (not empty, not toast)
- [ ] Export CSV: downloads `.csv` with correct headers and data
- [ ] Import: file upload → preview modal → valid rows shown → confirm → lines created
- [ ] Import: invalid file → error rows shown with row numbers and reasons
- [ ] Import: reject files missing required columns

### Feature Validation — MEDIUM Priority
- [ ] Budget Details tab renders at `?tab=budget-details`
- [ ] Financial Views: create view → save → reload → view persists
- [ ] Financial Views: system view shows lock icon, cannot be deleted
- [ ] Budget modification form: `modification_type` field present (required)
- [ ] Budget modification form: `change_event_id` field present (optional)
- [ ] Void workflow: `voided_reason` textarea required, blocks save if empty
- [ ] Snapshot comparison: can select any two snapshots (not just sequential)
- [ ] Forecasting tab: shows all cost codes (paginated, not capped at 10)
- [ ] Snapshots tab: shows all snapshots (paginated, not capped at 5)

### Feature Validation — LOW Priority
- [ ] Over-budget rows display in `text-destructive` color
- [ ] Over-budget highlight applies only to leaf rows (not group/summary rows)

### Database & RLS
- [ ] `modification_type` column appears in `database.types.ts` after migration
- [ ] `change_event_id` column appears in `database.types.ts` after migration
- [ ] `voided_reason` column appears in `database.types.ts` after migration
- [ ] New migrations do NOT break existing RLS patterns
- [ ] `npm run check:routes` passes after any new route files

### Code Quality
- [ ] No raw `fetch()` calls in budget components (except binary blob downloads)
- [ ] All new routes use `withApiGuardrails()`
- [ ] All new routes use `requirePermission()`
- [ ] No `test.skip(true)` in budget test files
- [ ] Status values lowercase throughout: 'draft', 'pending', 'approved', 'void'

---

## Anti-Patterns to Avoid

- ❌ Don't bypass `computeBudgetGrandTotals()` — it's the authoritative data source
- ❌ Don't use `[id]` as a route parameter — always use `[lineId]`, `[modificationId]`, etc.
- ❌ Don't use raw `fetch()` for JSON API calls in budget components — use `apiFetch`
- ❌ Don't insert status values with uppercase — always lowercase
- ❌ Don't reference `vendor_id` or `wbs_attributes` before running the migration
- ❌ Don't claim export is working without verifying binary response in browser
- ❌ Don't add `test.skip(true)` to budget test files
- ❌ Don't write RLS as `auth.uid() IS NOT NULL` — always scope to project membership
- ❌ Don't re-implement the 15-column formula logic — it lives in `v_budget_rollup`
- ❌ Don't use `bg-white` or hardcoded colors in budget components — use `bg-card`, `text-destructive`

---

## Procore Crawl Data Reference

Source: `_bmad-output/planning-artifacts/budget/.archive/` (Dec 2025 crawl, 14 unique views)

### Tab Navigation Structure (Procore)

| Page | URL Pattern | Screenshot |
|------|-------------|------------|
| Main Budget Table | `/tools/budgets` | Main 15-column table |
| Budget Details | `/tools/budgets?tab=details` | Sub-job breakdown, metadata |
| Forecast | `/tools/budgets?tab=forecast` | S-curve + FTC by method |
| Snapshots | `/tools/budgets?tab=snapshots` | Scrollable snapshot list |
| Change History | `/tools/budgets?tab=history` | Audit trail |

### Form Fields Reference (from Procore crawl)

**Budget Modification Form (7 fields total):**
- From Cost Code (combobox, required)
- To Cost Code (combobox, required, must differ)
- Amount (currency, required, > 0)
- Description (textarea, 10-500 chars)
- Effective Date (date, <= today)
- Modification Type (**NEW** radio: Addition / Deduction) — maps to `modification_type`
- Change Event # (**NEW** combobox, optional) — maps to `change_event_id`

**Void Dialog (1 field):**
- Void Reason (textarea, required when voiding) — maps to `voided_reason` on budget_modification_lines

**Financial Views — 19 configurable columns:**
`costCode`, `description`, `originalBudget`, `budgetModifications`, `approvedCOs`, `revisedBudget`, `pendingBudgetChanges`, `projectedBudget`, `committedCosts`, `pendingCostChanges`, `projectedCosts`, `jtdCostDetail`, `directCosts`, `forecastToComplete`, `projectedOverUnder`, `costType`, `unitQty`, `uom`, `unitCost`

### Key Procore Behaviors to Match

1. **Red-text threshold:** Row turns red when `projectedCosts > revisedBudget` by any amount (not a configurable threshold in base Procore).
2. **Export includes all columns** — not just a subset. Match our 15-column structure.
3. **Import template** — Procore provides a downloadable template. We should offer GET `/budget/import/template` that returns a blank Excel with the correct column headers.
4. **Modification Type affects budget math** — "Deduction" is a negative addition. Stored as a negative `amount` OR as a type flag — use the type flag approach (positive amount + type field) to match Procore's display.
5. **Snapshot comparison** — Procore shows a diff column highlighting cells that changed between two snapshots. Start with just showing both snapshots side-by-side.

---

*Confidence Score: 9/10 — all existing patterns are well-documented, all DB schemas verified from generated types, all gap items have clear implementation paths. The 1-point deduction is for the Financial Views UI which may have additional complexity in the column drag-drop reordering that requires in-browser testing to validate.*
