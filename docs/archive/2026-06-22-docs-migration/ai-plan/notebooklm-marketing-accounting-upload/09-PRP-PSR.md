# PRP: Project Status Report (PSR)

**Version:** 1.0
**Created:** 2026-05-01
**Confidence Score:** 9/10

---

## Goal

**Feature Goal:** Build a live, always-current Project Status Report (PSR) page that aggregates data already in the app — eliminating the monthly manual assembly process that accounting currently does in JobPlanner/Excel. The PSR is generated on demand for any month and can be exported as a PDF matching the format Alleato's accounting team currently produces manually.

**Deliverable:**
1. `GET /api/projects/[projectId]/psr` — aggregation endpoint returning all PSR sections as structured JSON
2. `/(main)/[projectId]/project-status-report/page.tsx` — live PSR page with month picker and Export PDF button
3. `psr_comments` table — stores PM freetext notes per budget line per month
4. PDF export route — server-side PDF matching the current 9-page format
5. Navigation entry in sidebar under Financial Management

**Success Definition:** A user can navigate to a project's PSR page, select any month, see all 7 sections populated from live app data in under 3 seconds, write/save comments, and export a PDF matching the format in `26-106 GW Washington- April PSR Full report.pdf`.

---

## Why

- Accounting assembles this report manually every month by exporting from JobPlanner — all the data is already in the app.
- The current process is ~monthly lag. A live PSR is instantaneous and always up-to-date.
- Project managers need this view for real-time project health: budget-to-actual, open items, billing status.
- The report drives owner conversations and subcontractor management decisions.
- Phase 2 can dramatically improve the format (AI-generated commentary, trend analysis, variance flagging) once the data pipeline is established.

---

## What — List of Deliverables

**Pages**
- `frontend/src/app/(main)/[projectId]/project-status-report/page.tsx` — PSR main page (server component)
- `frontend/src/app/(main)/[projectId]/project-status-report/psr-client.tsx` — client display component

**Database Schema**
- New table: `psr_comments` — PM freetext notes per budget line per month
- (Optional Phase 2) New table: `psr_snapshots` — frozen month-end PSR JSON blobs
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_psr_tables.sql`

**API Endpoints**
- `GET /api/projects/[projectId]/psr?month=YYYY-MM` — aggregate all 7 PSR sections
- `GET /api/projects/[projectId]/psr/comments` — fetch PM comments for a project+month
- `POST /api/projects/[projectId]/psr/comments` — save/update a comment
- `GET /api/projects/[projectId]/psr/export?month=YYYY-MM` — server-side PDF generation

**Components**
- `frontend/src/components/domain/psr/PsrSummaryCard.tsx` — cover page (project info + open item counts + monthly billing)
- `frontend/src/components/domain/psr/PsrBudgetTable.tsx` — 17-column budget detail table (all budget codes)
- `frontend/src/components/domain/psr/PsrSubmittalsSection.tsx` — submittal log table
- `frontend/src/components/domain/psr/PsrRfisSection.tsx` — RFI log table
- `frontend/src/components/domain/psr/PsrChangeRequestsSection.tsx` — change requests table
- `frontend/src/components/domain/psr/PsrChangeOrdersSection.tsx` — PCCOs table
- `frontend/src/components/domain/psr/PsrScheduleSection.tsx` — schedule summary + task list
- `frontend/src/components/domain/psr/PsrCommentEditor.tsx` — inline comment editor (per section or per budget line)

**Types**
- `frontend/src/types/psr.types.ts` — all PSR TypeScript interfaces

---

## Success Criteria

- [ ] PSR page loads for project 67 (Vermillion Rise Warehouse) with live data
- [ ] Month picker changes all data — defaults to current month
- [ ] Section 1 (cover page) shows: project name, dates, contract budget, fee, insurance, open item counts, monthly billing table, job-to-date cost
- [ ] Section 2 (budget detail) shows all budget codes with all 17 columns, matching computeBudgetGrandTotals output
- [ ] Section 3 (submittals) shows all submittals with number, title, status, ball-in-court
- [ ] Section 4 (RFIs) shows all open RFIs with number, title, due date
- [ ] Section 5 (change requests) shows CRs with cost, markup, total
- [ ] Section 6 (change orders/PCCOs) shows approved PCCOs with amount
- [ ] Section 7 (schedule) shows task summary + list with start/finish dates
- [ ] PM can type a comment in the comments field and it persists on refresh
- [ ] Export PDF button generates a downloadable PDF matching the 9-page format
- [ ] PSR nav entry appears in sidebar under Financial Management
- [ ] `npm run quality` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Page loads in under 3 seconds on localhost

---

## All Needed Context

### Context Completeness Check

*This PRP provides exact file paths, function signatures, database schemas, and copy-paste patterns. The executing agent does NOT need to search for anything — all references are explicit.*

---

### Documentation & References

```yaml
# MUST READ — Primary patterns to copy exactly

- file: frontend/src/app/(main)/[projectId]/home/page.tsx
  why: "EXACT pattern for project-scoped server component with parallel data fetching"
  pattern: "export const dynamic = 'force-dynamic'; Promise.all([...multiple Supabase queries...]); pass to client component"
  gotcha: "Always await params in Next.js 15: const { projectId } = await params"

- file: frontend/src/lib/budget/compute-grand-totals.ts
  why: "CALL this function — do NOT re-implement. Returns all 15 budget financial metrics."
  pattern: "computeBudgetGrandTotals(supabase, projectIdNum) → { lineItems, grandTotals, source }"
  gotcha: "projectIdNum MUST be an INTEGER (parseInt). grandTotals has all columns for budget section."

- file: frontend/src/lib/guardrails/api.ts
  why: "EVERY API route must use withApiGuardrails wrapper — handles auth, logging, error envelopes"
  pattern: "export const GET = withApiGuardrails<{ projectId: string }>('psr/[projectId]#GET', async ({ params }) => {...})"
  gotcha: "Always await params: const { projectId } = await params"

- file: frontend/src/lib/api-client.ts
  why: "Use apiFetch for all client-side API calls — NEVER raw fetch()"
  pattern: "const data = await apiFetch<PsrApiResponse>(`/api/projects/${projectId}/psr?month=${month}`)"

- file: frontend/src/app/api/projects/[projectId]/budget/route.ts
  why: "Copy the withApiGuardrails + requirePermission + parseInt pattern exactly"

- file: frontend/src/app/api/projects/[projectId]/submittals/route.ts
  why: "Pattern for querying submittals with status filter and joins"

- file: frontend/src/app/api/projects/[projectId]/change-events/route.ts
  why: "Pattern for querying change events with computed financial fields"

- file: frontend/src/app/api/projects/[projectId]/rfis/route.ts
  why: "Simple GET with status filter — simplest route pattern in codebase"

- file: frontend/src/app/api/projects/[projectId]/scheduling/tasks/route.ts
  why: "Pattern for schedule queries, especially ?view=summary for ScheduleSummary"
  pattern: "?view=summary returns { total_tasks, completed_tasks, overdue_tasks, overall_percent_complete }"

- file: frontend/src/app/(main)/executive/page.tsx
  why: "PageShell variant='content' example with force-dynamic + nodejs runtime"
  pattern: "export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';"

- file: frontend/src/components/layout/page-shell.tsx
  why: "PageShell usage — use variant='content' for PSR (document/report page)"

- file: frontend/src/lib/navigation-config.ts
  why: "Add PSR nav entry here — follow exact object shape of existing financial tools"
  pattern: "{ name: 'Project Status Report', path: 'project-status-report', icon: FileText, requiresProject: true }"

- file: frontend/src/lib/permissions-guard.ts
  why: "requirePermission pattern for API route auth checks"

- file: frontend/src/types/budget.ts
  why: "BudgetLineItem and GrandTotals types — PSR budget section uses these directly"
```

---

### Database Schema — All Relevant Tables

#### `projects` (INTEGER primary key)
```
id: number (PK — INTEGER, NOT UUID)
name: string | null
"start date": string | null     ← QUOTED — column name has a space
"est completion": string | null  ← QUOTED — column name has a space
budget: number | null
completion_percentage: number | null
current_phase: string | null
health_score: number | null
health_status: string | null
project_manager: number | null
summary: string | null
```
⚠️ Columns with spaces MUST be quoted in Supabase queries: `.select('"start date", "est completion"')`

#### `prime_contracts`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
contract_number: string
original_contract_value: number
revised_contract_value: number
start_date: string | null
end_date: string | null
actual_completion_date: string | null
status: prime_contract_status_v2 enum
```

#### `budget_lines`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
cost_code_id: string
cost_type_id: string
original_amount: number
```
→ Do NOT query this directly for totals. Use `computeBudgetGrandTotals()`.

#### `submittals`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
submittal_number: string
title: string
status: string | null  — values: "Draft", "Open", "Submitted", "Distributed", "Closed"
ball_in_court: string | null
deleted_at: string | null  — exclude where deleted_at IS NOT NULL
```

#### `rfis`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
number: number
subject: string
status: string — values: "Open", "Closed", "Draft"
due_date: string | null
ball_in_court: string | null
```

#### `change_events`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
number: string
title: string
status: string — values: "Open", "Draft", "Resolved", "Void"
type: string
scope: string
sent_to_prime_pco: boolean | null
sent_to_commitment_pco: boolean | null
deleted_at: string | null
```

#### `change_orders`
```
id: string (UUID)
project_id: number (FK → projects.id — INTEGER)
title: string
amount: number | null
status: string | null — "Pending", "Approved", "Rejected"
type: string | null
prime_contract_id: string | null
number: number | null
description: string | null
```

#### `owner_invoices`
```
id: number (INTEGER PK)
prime_contract_id: string | null  ← NO direct project_id — must join through prime_contracts
status: string | null
invoice_number: string | null
billing_date: string | null
gross_amount: number | null
net_amount: number | null
paid_amount: number | null
```
⚠️ To filter by project: `owner_invoices.prime_contract_id → prime_contracts.project_id`

#### `subcontractor_invoices`
```
id: number (INTEGER PK)
project_id: number NOT NULL (FK → projects.id — direct)
status: invoice_status enum
invoice_number: string | null
billing_date: string | null
subcontract_id: string | null
```

#### `schedule_tasks`
```
id: string (UUID)
project_id: number NOT NULL (FK → projects.id — INTEGER)
name: string
status: string | null — "Not Started", "In Progress", "Complete"
percent_complete: number | null
start_date: string | null
finish_date: string | null
duration_days: number | null
is_milestone: boolean | null
parent_task_id: string | null (self-referential FK)
wbs_code: string | null
```

#### New Table: `psr_comments` (to be created)
```sql
CREATE TABLE psr_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,  -- format: 'YYYY-MM'
  section     TEXT NOT NULL,  -- 'budget_line:{budget_line_id}' | 'change_requests' | 'general'
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, month, section)
);
```

---

### PSR Data Model

```typescript
// frontend/src/types/psr.types.ts

export interface PsrProjectInfo {
  name: string;
  projectNumber: string | null;
  startDate: string | null;
  completionDate: string | null;  // from prime_contracts.end_date
  contractBudget: number;          // prime_contracts.original_contract_value
  currentBudget: number;           // prime_contracts.revised_contract_value
  currentProjectedProfit: number;  // currentBudget - estimatedCostAtCompletion
  originalFee: number;             // budget line 550500 original_amount
  currentFee: number;              // budget line 550500 revised amount
  originalInsurance: number;       // budget line 550050 original_amount
  currentInsurance: number;        // budget line 550050 revised amount
  currentUnallocatedCosts: number; // budget line 550099 amount
  currentOwnerContingency: number; // budget line 550100 amount
  remainingBuyout: number;         // projected budget - committed costs
  jobToDateCost: number;           // grandTotals.jobToDateCostDetail
}

export interface PsrMonthlyBilling {
  month: string;                   // 'YYYY-MM'
  monthLabel: string;              // 'April', 'May', etc.
  ownerPayments: number;           // sum of owner_invoices.paid_amount in month
  ownerBilling: number;            // sum of owner_invoices.gross_amount in month
  subBilling: number;              // sum of subcontractor_invoices billed in month
}

export interface PsrOpenItemCounts {
  openRfis: number;
  openSubmittals: number;
  openCEsNotInPCO: number;
  openPCCOs: number;
  subCOsNotFunded: number;
  openPCOs: number;
}

export interface PsrBudgetLine {
  budgetCode: string;              // e.g. "013128 - Project Manager - Labor"
  originalBudget: number;
  budgetModifications: number;
  contractChangeOrders: number;
  revisedBudget: number;
  actualAmount: number;
  pendingBudgetChanges: number;
  projectedBudget: number;
  directCosts: number;
  commitments: number;
  commitmentChangeOrders: number;
  committedCosts: number;
  projectedCosts: number;
  committedInvoicedAmount: number;
  pendingCostChanges: number;
  forecastToComplete: number;
  estimatedCostAtCompletion: number;
  projectOverUnder: number;
}

export interface PsrSubmittal {
  submittalNumber: string;
  title: string;
  status: string;
  ballInCourt: string | null;
}

export interface PsrRfi {
  number: number;
  subject: string;
  status: string;
  dueDate: string | null;
  ballInCourt: string | null;
}

export interface PsrChangeRequest {
  number: string;
  contractNumber: string | null;
  title: string;
  scope: string;
  status: string;
  cost: number;
  markup: number;
  total: number;
}

export interface PsrChangeOrder {
  number: number | null;
  contractNumber: string | null;
  description: string | null;
  status: string;
  amount: number;
}

export interface PsrScheduleTask {
  id: string;
  name: string;
  duration: number | null;
  startDate: string | null;
  finishDate: string | null;
  status: string | null;
  percentComplete: number | null;
  isMilestone: boolean | null;
  wbsCode: string | null;
}

export interface PsrComment {
  section: string;
  body: string;
  updatedAt: string;
}

// Root PSR response type
export interface PsrApiResponse {
  month: string;                      // 'YYYY-MM'
  projectInfo: PsrProjectInfo;
  monthlyBilling: PsrMonthlyBilling[]; // last 6 months
  openItems: PsrOpenItemCounts;
  budgetLines: PsrBudgetLine[];
  budgetGrandTotals: {
    originalBudget: number;
    revisedBudget: number;
    actualAmount: number;
    committedCosts: number;
    forecastToComplete: number;
    estimatedCostAtCompletion: number;
    projectOverUnder: number;
  };
  submittals: PsrSubmittal[];
  rfis: PsrRfi[];
  changeRequests: PsrChangeRequest[];
  changeOrders: PsrChangeOrder[];
  scheduleTasks: PsrScheduleTask[];
  comments: PsrComment[];
}
```

---

### Current Codebase Tree (relevant paths)

```
frontend/src/
├── app/
│   ├── (main)/
│   │   └── [projectId]/
│   │       ├── home/page.tsx              ← COPY parallel-fetch server component pattern
│   │       ├── project-status-report/     ← CREATE THIS
│   │       │   ├── page.tsx
│   │       │   └── psr-client.tsx
│   │       ├── budget/
│   │       ├── submittals/
│   │       ├── rfis/
│   │       └── change-events/
│   └── api/
│       └── projects/
│           └── [projectId]/
│               ├── budget/route.ts        ← COPY withApiGuardrails pattern
│               ├── submittals/route.ts
│               ├── rfis/route.ts
│               ├── change-events/route.ts
│               ├── scheduling/tasks/route.ts
│               └── psr/                   ← CREATE THIS
│                   ├── route.ts           ← GET aggregate
│                   ├── export/route.ts    ← GET PDF
│                   └── comments/route.ts  ← GET + POST
├── components/
│   └── domain/
│       └── psr/                           ← CREATE THIS
│           ├── PsrSummaryCard.tsx
│           ├── PsrBudgetTable.tsx
│           ├── PsrSubmittalsSection.tsx
│           ├── PsrRfisSection.tsx
│           ├── PsrChangeRequestsSection.tsx
│           ├── PsrChangeOrdersSection.tsx
│           ├── PsrScheduleSection.tsx
│           └── PsrCommentEditor.tsx
├── types/
│   ├── psr.types.ts                       ← CREATE THIS
│   └── database.types.ts                  ← READ for FK types
├── hooks/
│   └── use-psr.ts                         ← CREATE THIS (if client-side needed)
└── lib/
    ├── budget/compute-grand-totals.ts     ← CALL (don't re-implement)
    ├── guardrails/api.ts                  ← USE withApiGuardrails
    ├── api-client.ts                      ← USE apiFetch
    ├── navigation-config.ts               ← ADD nav entry here
    └── permissions-guard.ts               ← USE requirePermission

supabase/migrations/
└── YYYYMMDDHHMMSS_psr_tables.sql          ← CREATE THIS
```

---

## Implementation Blueprint

### Phase 1: Database Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_psr_tables.sql`

```sql
-- PSR Comments: PM can write notes per section per month
CREATE TABLE IF NOT EXISTS psr_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month       TEXT NOT NULL CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  section     TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, month, section)
);

CREATE INDEX idx_psr_comments_project_month ON psr_comments(project_id, month);

-- RLS: Allow authenticated users to read/write comments for projects they can access
ALTER TABLE psr_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psr_comments_select" ON psr_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "psr_comments_insert" ON psr_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "psr_comments_update" ON psr_comments FOR UPDATE USING (auth.uid() IS NOT NULL);
```

After creating the migration, run: `npm run db:types` to regenerate `database.types.ts`.

---

### Phase 2: Types

**File:** `frontend/src/types/psr.types.ts`

Create all interfaces from the "PSR Data Model" section above. No external dependencies.

---

### Phase 3: API Route — Main Aggregator

**File:** `frontend/src/app/api/projects/[projectId]/psr/route.ts`

```typescript
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";
import { computeBudgetGrandTotals } from "@/lib/budget/compute-grand-totals";
import type { PsrApiResponse } from "@/types/psr.types";

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/psr#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const url = new URL(request.url);
    // Default to current month if not specified
    const month = url.searchParams.get("month") ??
      new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const supabase = await createClient();

    const { denied, response } = await requirePermission(projectIdNum, "budget", "read");
    if (denied) return response!;

    // All queries run in parallel
    const [
      projectResult,
      budgetResult,
      submittalsResult,
      rfisResult,
      changeEventsResult,
      changeOrdersResult,
      scheduleResult,
      ownerInvoicesResult,
      subInvoicesResult,
      commentsResult,
    ] = await Promise.all([
      // 1. Project info + prime contract
      supabase
        .from("projects")
        .select(`id, name, project_number, "start date", "est completion", budget,
                 prime_contracts(id, contract_number, original_contract_value,
                   revised_contract_value, start_date, end_date)`)
        .eq("id", projectIdNum)
        .single(),

      // 2. Budget — use the authoritative grand totals computation
      computeBudgetGrandTotals(supabase, projectIdNum),

      // 3. Submittals (exclude deleted)
      supabase
        .from("submittals")
        .select("id, submittal_number, title, status, ball_in_court")
        .eq("project_id", projectIdNum)
        .is("deleted_at", null)
        .order("submittal_number", { ascending: true }),

      // 4. RFIs
      supabase
        .from("rfis")
        .select("id, number, subject, status, due_date, ball_in_court")
        .eq("project_id", projectIdNum)
        .order("number", { ascending: true }),

      // 5. Change events (exclude deleted)
      supabase
        .from("change_events")
        .select("id, number, title, status, scope, type, sent_to_prime_pco, sent_to_commitment_pco")
        .eq("project_id", projectIdNum)
        .is("deleted_at", null)
        .order("number", { ascending: true }),

      // 6. Change orders (PCCOs)
      supabase
        .from("change_orders")
        .select("id, number, title, description, status, amount, type, prime_contract_id")
        .eq("project_id", projectIdNum)
        .order("number", { ascending: true }),

      // 7. Schedule tasks (top-level only for PSR — no deep nesting)
      supabase
        .from("schedule_tasks")
        .select("id, name, status, percent_complete, start_date, finish_date, duration_days, is_milestone, wbs_code, parent_task_id")
        .eq("project_id", projectIdNum)
        .order("sort_order", { ascending: true })
        .limit(200),

      // 8. Owner invoices (last 6 months via prime_contracts join)
      supabase
        .from("owner_invoices")
        .select("id, invoice_number, billing_date, gross_amount, paid_amount, status, prime_contract_id, prime_contracts!inner(project_id)")
        .eq("prime_contracts.project_id", projectIdNum)
        .gte("billing_date", getMonthStart(month, -5))
        .order("billing_date", { ascending: true }),

      // 9. Subcontractor invoices (last 6 months)
      supabase
        .from("subcontractor_invoices")
        .select("id, invoice_number, billing_date, status, subcontract_id")
        .eq("project_id", projectIdNum)
        .gte("billing_date", getMonthStart(month, -5))
        .order("billing_date", { ascending: true }),

      // 10. PSR comments for this month
      supabase
        .from("psr_comments")
        .select("section, body, updated_at")
        .eq("project_id", projectIdNum)
        .eq("month", month),
    ]);

    // Shape and return
    const psrData = buildPsrResponse({
      month,
      projectIdNum,
      project: projectResult.data,
      budget: budgetResult,
      submittals: submittalsResult.data ?? [],
      rfis: rfisResult.data ?? [],
      changeEvents: changeEventsResult.data ?? [],
      changeOrders: changeOrdersResult.data ?? [],
      scheduleTasks: scheduleResult.data ?? [],
      ownerInvoices: ownerInvoicesResult.data ?? [],
      subInvoices: subInvoicesResult.data ?? [],
      comments: commentsResult.data ?? [],
    });

    return NextResponse.json(psrData satisfies PsrApiResponse);
  },
);

// Helper: get YYYY-MM-DD for first day of (month + offsetMonths)
function getMonthStart(month: string, offsetMonths: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + offsetMonths, 1);
  return d.toISOString().slice(0, 10);
}
```

The `buildPsrResponse()` function shapes all raw query results into `PsrApiResponse`. Key transforms:
- Budget lines: map `budgetResult.lineItems` → `PsrBudgetLine[]` using the 17-column structure
- Monthly billing: group invoices by month, sum gross_amount / paid_amount per month bucket
- Open item counts: filter by status from the already-fetched arrays (no extra DB calls)
  - `openRfis`: rfis where status !== 'Closed'
  - `openSubmittals`: submittals where status not in ['Closed', 'Distributed']
  - `openCEsNotInPCO`: changeEvents where `sent_to_prime_pco === false` and status !== 'Void'
  - `openPCCOs`: changeOrders where type includes 'PCCO' and status === 'Pending'
  - `subCOsNotFunded`: changeOrders where type includes 'commitment' and status === 'Pending'
  - `openPCOs`: changeEvents where `sent_to_prime_pco === false` (PCOs not yet converted)

---

### Phase 4: Comments API

**File:** `frontend/src/app/api/projects/[projectId]/psr/comments/route.ts`

GET: returns all comments for project+month query param.
POST: upserts a single comment (`UNIQUE(project_id, month, section)` — use `.upsert()`).

```typescript
// POST body shape
{
  month: string;    // 'YYYY-MM'
  section: string;  // e.g. 'general', 'budget_line:uuid', 'change_requests'
  body: string;
}
```

Use `supabase.from("psr_comments").upsert({ ...data }, { onConflict: "project_id,month,section" })`.

---

### Phase 5: PDF Export Route

**File:** `frontend/src/app/api/projects/[projectId]/psr/export/route.ts`

Implementation: fetch PSR data from the main `/psr` endpoint (or call `buildPsrResponse` directly), then use `@react-pdf/renderer` to render a `<Document>` with 7 pages matching the original format.

```typescript
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/psr/export#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const url = new URL(request.url);
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    // Fetch PSR data (reuse logic)
    const psrData = await fetchPsrData(projectId, month);

    // Render PDF
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { PsrDocument } = await import("./PsrDocument");
    const buffer = await renderToBuffer(<PsrDocument data={psrData} />);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PSR-${projectId}-${month}.pdf"`,
      },
    });
  },
);
```

PDF document structure (9 pages matching original):
- Page 1: Cover/summary (project info, monthly billing table, open item counts, comments)
- Pages 2-3: Budget detail table (all budget codes, 17 columns — split across 2 pages)
- Page 4: Submittals log
- Page 5: RFIs log
- Page 6: Change requests
- Page 7: PCCOs
- Pages 8-9: Schedule list + Gantt chart

Install required dependency: `npm install @react-pdf/renderer --save` (frontend package).

---

### Phase 6: Server Component Page

**File:** `frontend/src/app/(main)/[projectId]/project-status-report/page.tsx`

```typescript
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/layout";
import { PsrClient } from "./psr-client";

export default async function ProjectStatusReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { projectId } = await params;
  const { month = new Date().toISOString().slice(0, 7) } = await searchParams;

  const supabase = await createClient();
  const projectIdNum = parseInt(projectId, 10);

  // Server-side fetch so the page is SSR — no loading flicker on initial render
  // The client component handles month changes via client-side apiFetch
  const psrData = await fetchPsrServerSide(supabase, projectIdNum, month);

  return (
    <PageShell
      variant="content"
      title="Project Status Report"
      description={`Month ending: ${formatMonthLabel(month)}`}
    >
      <PsrClient
        projectId={projectId}
        initialData={psrData}
        initialMonth={month}
      />
    </PageShell>
  );
}
```

**File:** `frontend/src/app/(main)/[projectId]/project-status-report/psr-client.tsx`

```typescript
"use client";

// Receives initialData as props (no loading state on first render)
// Month picker triggers client-side refetch via apiFetch
// Export button calls /api/projects/[projectId]/psr/export
// Comment editors save to /api/projects/[projectId]/psr/comments
```

---

### Phase 7: Navigation Entry

**File:** `frontend/src/lib/navigation-config.ts`

Add to `financialManagementTools` array (or create a new "Reporting" group):

```typescript
{
  name: "Project Status Report",
  path: "project-status-report",
  icon: ClipboardList,   // from lucide-react
  requiresProject: true,
  module: "budget",      // reuses budget read permission
}
```

---

## Known Gotchas & Prevention Rules

### 1. `projects` columns with spaces (CRITICAL)
**Issue:** `projects."start date"` and `projects."est completion"` have spaces in column names.
**Fix:** Always quote them in Supabase `.select()`: `'"start date", "est completion"'`
**Validation:** `grep '"start date"' frontend/src/app/api/projects/[projectId]/psr/route.ts`

### 2. `owner_invoices` has no direct `project_id` (CRITICAL)
**Issue:** `owner_invoices` links to projects via `prime_contract_id → prime_contracts.project_id`, NOT directly.
**Fix:** Use join: `.from("owner_invoices").select("*, prime_contracts!inner(project_id)").eq("prime_contracts.project_id", projectIdNum)`
**Validation:** Check query returns data for project 67.

### 3. `projects.id` is INTEGER — never UUID
**Issue:** `psr_comments.project_id` must be `INTEGER REFERENCES projects(id)`, not UUID.
**Validation:** `grep "project_id" supabase/migrations/*psr*.sql | grep -v INTEGER` → should return nothing.

### 4. Always `await params` in Next.js 15
**Fix:** `const { projectId } = await params;` (not `const { projectId } = params;`)
**Pattern:** Copy from `budget/route.ts` which already uses this correctly.

### 5. `export const dynamic = "force-dynamic"` on every server page
**Issue:** Without this, Next.js tries to prerender at build time — `createClient()` fails in CI.
**Fix:** First line of every `page.tsx` or `route.ts` that calls `createClient()`.
**Validation:** `scripts/check-server-prerender-safety.mjs` (runs in predeploy gate).

### 6. `computeBudgetGrandTotals` not to be re-implemented
**Issue:** The budget section's 17 columns require 12 parallel Supabase queries to compute. They are already implemented and battle-tested.
**Fix:** Call `computeBudgetGrandTotals(supabase, projectIdNum)` — don't re-query budget tables.

### 7. Integer parsing for projectId
**Fix:** Always `parseInt(projectId, 10)` and validate `isNaN()` before any query.

### 8. `@react-pdf/renderer` requires Node.js runtime
**Fix:** Add `export const runtime = "nodejs"` to the export route — it won't work on edge.

### 9. Budget line display names
**Issue:** Budget codes like `013128` need display names like "013128 - Project Manager - Labor". These come from joining `budget_lines` → `project_budget_codes` or `cost_codes` + `cost_code_types`.
**Fix:** `computeBudgetGrandTotals` already handles this — `lineItems[n].budgetCode` contains the display string.

---

## Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE supabase/migrations/YYYYMMDDHHMMSS_psr_tables.sql
  - IMPLEMENT: psr_comments table with RLS policies
  - Run: cd frontend && npm run db:types  (regenerate types after migration)
  - VALIDATE: grep "psr_comments" frontend/src/types/database.types.ts

Task 2: CREATE frontend/src/types/psr.types.ts
  - IMPLEMENT: All interfaces from "PSR Data Model" section above
  - DEPENDENCIES: None (pure types)
  - VALIDATE: npx tsc --noEmit

Task 3: CREATE frontend/src/app/api/projects/[projectId]/psr/route.ts
  - IMPLEMENT: GET handler using withApiGuardrails + 10-way Promise.all
  - FOLLOW: budget/route.ts for withApiGuardrails pattern
  - CALL: computeBudgetGrandTotals — do NOT re-query budget tables
  - CRITICAL: await params; parseInt projectId; quote "start date" and "est completion"
  - DEPENDENCIES: Task 2 (types)
  - VALIDATE: curl http://localhost:3000/api/projects/67/psr?month=2026-04 | jq .

Task 4: CREATE frontend/src/app/api/projects/[projectId]/psr/comments/route.ts
  - IMPLEMENT: GET (list comments for month) + POST (upsert comment)
  - FOLLOW: .upsert() with onConflict for idempotent saves
  - DEPENDENCIES: Task 1 (table), Task 2 (types)

Task 5: CREATE frontend/src/components/domain/psr/PsrSummaryCard.tsx
  - IMPLEMENT: Project info + open item KPIs + 6-month billing table
  - USE: KpiBlock from @/components/ds/kpi for open item counts
  - FOLLOW: existing domain component patterns (no raw <button>, no hand-rolled status)

Task 6: CREATE frontend/src/components/domain/psr/PsrBudgetTable.tsx
  - IMPLEMENT: 17-column table rendering PsrBudgetLine[]
  - USE: DataTable from @/components/ds/data-table OR InlineTable for the compact style
  - NOTE: This is a wide table — implement horizontal scroll on mobile

Task 7: CREATE frontend/src/components/domain/psr/ (remaining section components)
  - PsrSubmittalsSection.tsx — simple table: number, title, status, ball-in-court
  - PsrRfisSection.tsx — table: number, subject, status, due date
  - PsrChangeRequestsSection.tsx — table: CR number, title, cost, markup, total
  - PsrChangeOrdersSection.tsx — table: number, description, status, amount
  - PsrScheduleSection.tsx — summary KPIs + task list table
  - PsrCommentEditor.tsx — textarea + save button, calls comments POST endpoint

Task 8: CREATE frontend/src/app/(main)/[projectId]/project-status-report/page.tsx
  - IMPLEMENT: Server component with force-dynamic, server-side PSR fetch
  - USE: PageShell variant="content"
  - PASS: initialData + initialMonth as props to client component

Task 9: CREATE frontend/src/app/(main)/[projectId]/project-status-report/psr-client.tsx
  - IMPLEMENT: "use client" — month picker, renders all 7 section components
  - MONTH CHANGE: apiFetch to /api/projects/[projectId]/psr?month=YYYY-MM
  - EXPORT BUTTON: download link to /api/projects/[projectId]/psr/export?month=YYYY-MM

Task 10: MODIFY frontend/src/lib/navigation-config.ts
  - ADD: PSR entry to financialManagementTools array
  - ICON: ClipboardList from lucide-react

Task 11: CREATE frontend/src/app/api/projects/[projectId]/psr/export/route.ts
  - INSTALL: npm install @react-pdf/renderer (in frontend/)
  - IMPLEMENT: PDF generation with 9 pages matching original format
  - RUNTIME: export const runtime = "nodejs"
  - VALIDATE: Download PDF from browser and verify content

Task 12: VALIDATE
  - Run: cd frontend && npm run quality
  - Run: npm run build
  - Run: curl http://localhost:3000/api/projects/67/psr | jq .projectInfo
  - Open browser to http://localhost:3000/67/project-status-report
  - Verify all 7 sections render with live data
```

---

## Validation Loop

### Level 1: Type Safety
```bash
cd frontend && npx tsc --noEmit
# Expected: 0 errors
```

### Level 2: Quality Gate
```bash
cd frontend && npm run quality
# Expected: 0 lint errors, 0 type errors
```

### Level 3: API Smoke Tests
```bash
# Requires dev server running on port 3000
curl -s "http://localhost:3000/api/projects/67/psr?month=2026-04" | jq '.projectInfo.name'
# Expected: "Vermillion Rise Warehouse" (or whatever project 67 is named)

curl -s "http://localhost:3000/api/projects/67/psr?month=2026-04" | jq '.budgetLines | length'
# Expected: > 0

curl -s "http://localhost:3000/api/projects/67/psr?month=2026-04" | jq '.openItems'
# Expected: object with 6 numeric fields

curl -s "http://localhost:3000/api/projects/67/psr/comments?month=2026-04" | jq .
# Expected: [] (empty array — no comments yet)
```

### Level 4: Build Validation
```bash
cd frontend && npm run build
# Expected: successful build, no prerender errors
```

### Level 5: Browser Verification (required before claiming complete)
```
agent-browser open http://localhost:3000/67/project-status-report
agent-browser screenshot /tmp/psr-page.png
```
Verify: all 7 sections visible, month picker works, no console errors.

---

## Final Validation Checklist

### Database
- [ ] `psr_comments` table created and migrated
- [ ] `npm run db:types` run after migration
- [ ] `psr_comments` appears in `database.types.ts`

### API
- [ ] `GET /api/projects/67/psr` returns 200 with valid JSON
- [ ] `GET /api/projects/67/psr/comments` returns 200
- [ ] `POST /api/projects/67/psr/comments` saves and returns updated comment
- [ ] `GET /api/projects/67/psr/export` returns PDF content-type

### UI
- [ ] PSR page renders at `/67/project-status-report`
- [ ] All 7 sections display live data
- [ ] Month picker changes data without page reload
- [ ] Comments save and persist
- [ ] Export button downloads a PDF
- [ ] Nav entry appears in sidebar

### Quality
- [ ] `npm run quality` passes (0 errors)
- [ ] `npm run build` succeeds
- [ ] No `bg-white`, `gray-*`, raw `<button>` violations
- [ ] `force-dynamic` on page.tsx and export route
- [ ] All API routes use `withApiGuardrails`
- [ ] No raw `fetch()` calls — only `apiFetch`

---

## Anti-Patterns to Avoid

- ❌ Do NOT re-query budget tables — call `computeBudgetGrandTotals()`
- ❌ Do NOT use `[id]` as route param — use `[projectId]`
- ❌ Do NOT forget `await params` in Next.js 15 route handlers
- ❌ Do NOT query `owner_invoices` by project_id — it doesn't have one; join through prime_contracts
- ❌ Do NOT use `bg-white` or hardcoded colors — use `bg-card`, `bg-background`
- ❌ Do NOT hand-roll a loading spinner — use `EmptyState` or skeleton pattern from existing pages
- ❌ Do NOT put `@react-pdf/renderer` in the edge runtime — add `export const runtime = "nodejs"`
- ❌ Do NOT skip `force-dynamic` on the page.tsx — it will fail at build time
- ❌ Do NOT query `projects."start date"` without quoting the column name with spaces

---

## Confidence Score: 9/10

**What makes this 9/10:** All data sources exist, all API patterns are documented with exact file references, DB schema is fully mapped, no major unknowns remain.

**What prevents 10/10:**
- The monthly billing grouping logic for owner_invoices needs testing — the join through prime_contracts may need query adjustment depending on Supabase's filter-through-join behavior.
- PDF layout quality (page breaks, column widths) will require iteration to match the original format exactly.
- The specific markup rates on change requests may require joining a `vertical_markup` table (as the change-events route does at line 352) — verify this during implementation.
