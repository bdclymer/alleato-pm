---
title: Submittals Module — PRP
description: Product Requirements Prompt for the Submittals feature — current state, gaps, and Phase 2 implementation plan
version: 2.0
created: 2026-01-28
updated: 2026-04-17
confidence: 9/10
---

# Submittals Module — Product Requirements Prompt (PRP)

**Version**: 2.0 (Phase 2 — Gap Closure)
**Updated**: 2026-04-17
**Confidence Score**: 9/10

---

## Goal

**Feature Goal**: Complete the submittals module by closing the remaining Phase 2 gaps: Submittal Packages UI, distribution workflow, workflow templates, and bulk actions — while resolving the known `received_from` null bug and the design system violation documented in the incident log.

**Deliverable**:
- Fix `received_from` null in list table (TODO in `page.tsx`)
- Submittal Packages CRUD UI (create/edit/delete/assign from the Packages tab)
- Distribution workflow (distribute a submittal to recipients, record email distribution events)
- Workflow template management (create, save, apply templates)
- Bulk actions (bulk edit status, bulk apply workflow)
- Restore from Recycle Bin exposed in the UI (already exists in code — verify it works)

**Success Definition**: A user can fully manage submittals end-to-end matching Procore's workflow: create → assign workflow → respond → distribute → close. The Packages tab provides full package management. The `received_from` column shows correct names in the list. All Procore test matrix items in categories 3–6 pass.

---

## Why

**Business Value**: Submittals are a critical construction approval workflow. The basic CRUD is complete (Phase 1). Phase 2 closes the gaps that prevent real-world usage:
- Without distribution, submittals can't be formally sent for review
- Without workflow templates, every submittal requires manual step setup
- Without packages, the Packages tab is read-only and confusing
- The `received_from` null bug silently drops data users entered

**Problems Solved**:
- `received_from` is always shown as `-` in the table even when set (confirmed by TODO comment)
- Packages tab lists submittals by package but no way to create/manage packages from that tab
- Workflow tab adds steps but no templates; every submittal starts from scratch
- No distribution UI exists despite the distribution data model and API being in place

---

## Current Implementation State

### What Exists (Phase 1 Complete — 2026-02-26)

| Area | Status | Key Files |
|------|--------|-----------|
| List page | ✅ Complete | `frontend/src/app/(main)/[projectId]/submittals/page.tsx` |
| Create form | ✅ Complete | `frontend/src/app/(main)/[projectId]/submittals/new/page.tsx` |
| Edit form | ✅ Complete | `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/edit/page.tsx` |
| Detail page | ✅ Complete | `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx` |
| Workflow steps | ✅ Complete | Detail view Workflow tab |
| Workflow respond | ✅ Complete | `workflow-steps/[stepId]/respond/route.ts` |
| Attachments | ✅ Complete | `submittal_attachments` + upload panel |
| Soft delete | ✅ Complete | `deleted_at` field + Recycle Bin tab |
| Recycle Bin restore | ✅ Complete (verify) | `handleRestore` in page + `/restore` API route |
| Duplicate | ✅ Complete | `/duplicate` API route |
| 5-tab list | ✅ Complete | Items / Packages / Spec Sections / Ball In Court / Recycle Bin |
| 12-column table | ✅ Complete | `submittals-table-config.tsx` |
| CSV/PDF export | ✅ Complete | In `page.tsx` |
| API guardrails | ✅ Complete | All routes use `withApiGuardrails` |
| TanStack Query hooks | ✅ Complete | `frontend/src/hooks/use-submittals.ts` |

### What Is Missing (Phase 2 Gaps)

| Gap | Impact | Notes |
|-----|--------|-------|
| `received_from` null in table | Data loss display | TODO comment on line 284 of `page.tsx` |
| Packages CRUD UI | Tab is read-only | API exists (`/packages` GET/POST), no edit/delete UI |
| Distribution workflow UI | Cannot send for review | `submittal_distributions` table exists, no UI |
| Workflow templates | Setup required per submittal | No template CRUD or apply-template UI |
| Bulk actions | Manual one-by-one editing | No multi-select action bar |

---

## Database Schema

### `submittals` Table (Verified from `database.types.ts`)

```typescript
Row: {
  id: string                          // UUID PK
  project_id: number                  // INTEGER FK → projects(id)
  submittal_number: string            // REQUIRED
  revision: number                    // default 0
  title: string                       // REQUIRED
  status: string | null               // Draft, Open, Distributed, Closed
  specification_section: string | null
  specification_id: string | null     // FK → specifications
  submittal_type: string | null       // free-text type name
  submittal_type_id: string | null    // FK → submittal_types
  submittal_package_id: string | null // FK → submittal_packages
  division: string | null
  ball_in_court: string | null        // responder_id (UUID) of current holder
  responsible_contractor_id: number | null  // FK → companies (INTEGER!)
  received_from_id: string | null     // UUID FK → people or auth.users
  submittal_manager_id: string | null // UUID FK → auth.users
  submitted_by: string                // UUID FK → auth.users (REQUIRED)
  created_by: string | null
  updated_by: string | null
  submitter_company: string | null
  is_private: boolean
  description: string | null
  priority: string | null
  final_due_date: string | null
  lead_time: number | null
  required_on_site_date: string | null
  required_approval_date: string | null
  submission_date: string | null
  sent_date: string | null
  cost_code_id: number | null
  location_id: number | null
  current_version: number | null
  total_versions: number | null
  metadata: Json | null
  deleted_at: string | null
  created_at: string | null
  updated_at: string | null
}
```

**CRITICAL TYPE FACTS:**
- `project_id` → `INTEGER` (projects.id is a number)
- `responsible_contractor_id` → `INTEGER` (companies.id is a number)
- `received_from_id` → `UUID string` (people/users)
- `submittal_manager_id` → `UUID string`
- `id` → `UUID string`

### Related Tables (from migration `20260224000005_create_submittal_tables.sql`)

| Table | Purpose |
|-------|---------|
| `submittal_packages` | Groups submittals (id UUID, project_id INT, name, description) |
| `submittal_workflow_steps` | Approval steps (submittal_id, step_order, step_type, required) |
| `submittal_responses` | Per-user responses (workflow_step_id, responder_id, response_status, comments) |
| `submittal_distributions` | Distribution events (submittal_id, from_id, message, distributed_at) |
| `submittal_distribution_recipients` | M2M (distribution_id, recipient_id) |
| `submittal_attachments` | Files (submittal_id, file_name, file_url, file_size, is_current) |
| `submittal_linked_drawings` | M2M to drawings (submittal_id, drawing_id) |
| `submittal_history` | Audit log (submittal_id, action, actor_id, new_status, changes, occurred_at) |
| `submittal_types` | Canonical types (name, category) — seeded by `getNormalizedSubmittalTypeCatalog` |

---

## Known Pitfalls & Prevention

### From Pattern Analysis (Mandatory Review)

#### 1. `received_from` Always Shows Null (ACTIVE BUG)
**Root Cause**: `toTableRow()` in `page.tsx` line 284 has: `received_from: null, // TODO: resolve from received_from_id when user join is available`  
**Fix**: Join against `use-auth-users` or resolve names in the API route (same pattern used for `responsible_contractor_id` which batch-fetches company names in the GET route).  
**Prevention**: When adding FK fields to the table, always verify the join chain resolves to a display name before shipping.

#### 2. UUID vs INTEGER FK Mismatch (INCIDENT-LOG — CRITICAL)
**Historical Error**: Used UUID for `project_id` when `projects.id` is INTEGER.  
**Prevention**: Always check `database.types.ts` before writing insert/update. `projects.id` = INTEGER, `responsible_contractor_id` = INTEGER, all person/user IDs = UUID.  
**Validation**: `grep "project_id\|responsible_contractor_id" database.types.ts` — verify `number`, not `string`.

#### 3. Route Parameter Naming (CLAUDE.md Gate #2)
**Prevention**: Use `[submittalId]` not `[id]`. All existing routes already correct.  
**Validation**: `npm run check:routes` after any new route creation.

#### 4. GenericTableConfig Function Renderers (DEPRECATED)
**Status**: This page no longer uses `GenericDataTable` — it uses `UnifiedTablePage` + `buildSubmittalTableColumns()`. The `render()` function pattern in `TableColumn<T>` is the correct approach. No risk.

#### 5. Design System Violation (INCIDENT-LOG 2026-02-03)
**Logged**: Submittals page used custom `<h1>` instead of design system components.  
**Current State**: Page now uses `UnifiedTablePage` (correct). Detail uses `PageShell variant="detail"` (correct). No violation exists in current code.

#### 6. `withApiGuardrails` Pattern (ALL routes)
**Prevention**: All new API routes MUST use `withApiGuardrails` wrapper from `@/lib/guardrails/api`. Every route in this module already does.  
**Pattern**:
```typescript
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/packages#POST",
  async ({ request, params }) => {
    // ...
  }
);
```

#### 7. Form FK Validation Gate (CLAUDE.md Gate #11)
**`received_from_id`**: FK → `people`/auth.users (UUID). Dropdowns should fetch from `useAuthUsers`.  
**`responsible_contractor_id`**: FK → `companies` (INTEGER). Dropdowns should fetch from `useProjectCompanies`.  
**Pattern**: `submittal-form-page.tsx` correctly uses `useProjectCompanies` + `useAuthUsers` — follow this exactly.

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ — Current implementation
- file: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  why: Main list page — UnifiedTablePage, 5 tabs, toTableRow(), received_from TODO on line 284
  pattern: useSubmittals hook, GroupedSubmittalView for packages/spec/bic tabs
  gotcha: received_from always null — fix this first

- file: frontend/src/features/submittals/submittals-table-config.tsx
  why: ColumnConfig + FilterConfig for the table
  pattern: buildSubmittalTableColumns() returns TableColumn<SubmittalTableRow>[]
  gotcha: SubmittalTableRow.received_from is always null due to toTableRow() bug

- file: frontend/src/features/submittals/submittal-form-page.tsx
  why: Create/Edit form — full field reference, dropdown sources
  pattern: react-hook-form + zod, useProjectCompanies for contractor, useAuthUsers for people
  gotcha: Uses submittal_type_id (UUID) not responsible_contractor_id for type resolution

- file: frontend/src/features/submittals/submittal-detail-client.tsx
  why: Detail view — 4 tabs, workflow builder, respond form, attachment panel
  pattern: PageShell variant="detail", StatusBadge, WorkflowBuilder inline
  gotcha: Pencil icon in dropdown menu violates feedback rule (should be MoreVertical only menu — but Edit is inside MoreHorizontal so this may be acceptable)

- file: frontend/src/hooks/use-submittals.ts
  why: All TanStack Query hooks — useSubmittals, useSubmittal, useCreateSubmittal, etc.
  pattern: React Query with queryKey factory (submittalKeys), apiFetch for all calls
  gotcha: Hooks already include useAddWorkflowStep, useRespondToWorkflowStep, useUploadSubmittalAttachment

- file: frontend/src/app/api/projects/[projectId]/submittals/route.ts
  why: GET (list) + POST (create) — batch resolves responsible_contractor names
  pattern: withApiGuardrails, batch company name resolution for contractor display
  gotcha: Does NOT resolve received_from_id names — this must be added to fix the null bug

- file: frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts
  why: Workflow response + ball_in_court auto-advance pattern
  pattern: Validates assigned responder, updates response, auto-advances BIC, auto-closes submittal
  gotcha: Only assigned responders (from submittal_responses table) can respond — enforced by guardrail

- file: frontend/src/app/api/projects/[projectId]/submittals/packages/route.ts
  why: Packages API — GET (list) + POST (create). No PATCH/DELETE yet.
  pattern: submittal_packages table, project_id INTEGER
  gotcha: No edit/delete endpoint — must add [packageId] route

- file: frontend/src/lib/submittals/submittal-type-catalog.ts
  why: Canonical submittal types auto-seeded on first POST
  pattern: getNormalizedSubmittalTypeCatalog() — returns merged existing + missing canonical types
  gotcha: Types are auto-backfilled; don't manually insert submittal_types rows

# MUST READ — Pattern references
- file: frontend/src/hooks/use-auth-users.ts
  why: Pattern for resolving user IDs to display names — used in detail view
  pattern: Returns { users: AuthUser[], ... } where AuthUser has id, first_name, last_name, email

- file: frontend/src/hooks/use-project-companies.ts
  why: Pattern for company dropdowns (responsible_contractor_id)
  pattern: Returns companies for a project with id (INTEGER) and name

- file: frontend/src/components/ds/GOLDEN-EXAMPLES.tsx
  why: Design system component examples — copy-paste patterns
  pattern: StatusBadge, EmptyState, AttachmentUploadPanel patterns

# MUST READ — Testing docs
- file: docs/testing/submittals/submittals-test-matrix.md
  why: Full Procore feature matrix — 77 features across 9 categories
  pattern: Use to prioritize what's missing vs what exists

- file: docs/testing/submittals/submittals-scenarios.md
  why: UAT test scenarios — 21 scenarios covering core workflows
  pattern: Known gaps listed at end: workflow steps, distribution, packages, restore

- file: docs/testing/submittals/submittals-test-cases.md
  why: Detailed test cases for developer verification
```

### Current Codebase Tree

```
frontend/src/
├── app/(main)/[projectId]/submittals/
│   ├── page.tsx                              # List page (CLIENT) — 5-tab, UnifiedTablePage
│   ├── new/page.tsx                          # Create form server wrapper
│   ├── [submittalId]/
│   │   ├── page.tsx                          # Detail page (SERVER → SubmittalDetailClient)
│   │   └── edit/page.tsx                     # Edit form server wrapper
│   └── error.tsx
│
├── app/api/projects/[projectId]/submittals/
│   ├── route.ts                              # GET list, POST create
│   ├── export/route.ts                       # Export endpoint
│   ├── packages/route.ts                     # GET packages list, POST create package
│   ├── specs/route.ts                        # GET spec sections
│   └── [submittalId]/
│       ├── route.ts                          # GET detail, PUT update, DELETE soft-delete
│       ├── attachments/route.ts              # POST upload attachment
│       ├── distribute/route.ts               # POST distribute (data model ready, UI missing)
│       ├── duplicate/route.ts                # POST duplicate
│       ├── related-items/route.ts            # GET/POST related items
│       ├── restore/route.ts                  # PATCH restore from recycle bin
│       ├── revisions/route.ts                # GET revisions
│       └── workflow-steps/
│           ├── route.ts                      # GET/POST workflow steps
│           └── [stepId]/
│               ├── route.ts                  # GET/PUT/DELETE step
│               └── respond/route.ts          # POST respond (auto-advances BIC)
│
├── features/submittals/
│   ├── submittal-detail-client.tsx           # Detail view (4 tabs: General/Workflow/Related/History)
│   ├── submittal-form-dialog.tsx             # UNUSED dialog (form page is the current pattern)
│   ├── submittal-form-page.tsx               # Create/Edit form page
│   └── submittals-table-config.tsx           # Column/filter config for UnifiedTablePage
│
├── hooks/
│   └── use-submittals.ts                     # All TanStack Query hooks
│
└── lib/submittals/
    └── submittal-type-catalog.ts             # Auto-seeding canonical submittal types
```

### Phase 2 File Changes

```
MODIFY (bug fix):
- frontend/src/app/api/projects/[projectId]/submittals/route.ts
  → Add batch resolution for received_from_id (same pattern as responsible_contractor)

MODIFY (bug fix):
- frontend/src/app/(main)/[projectId]/submittals/page.tsx
  → Remove the TODO null workaround; read received_from from enriched API response

ADD (packages CRUD):
- frontend/src/app/api/projects/[projectId]/submittals/packages/[packageId]/route.ts
  → PATCH (update name/description), DELETE

ADD (distribution UI):
- frontend/src/features/submittals/submittal-distribute-dialog.tsx
  → Dialog for distributing a submittal: select recipients, add message, POST to /distribute

MODIFY (distribution trigger):
- frontend/src/features/submittals/submittal-detail-client.tsx
  → Add "Distribute" button that opens SubmittalDistributeDialog

ADD (optional — workflow templates):
- frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/route.ts
  → GET/POST workflow templates
- frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/[templateId]/route.ts
  → PUT/DELETE
```

---

## Implementation Tasks (Phase 2)

### PHASE 1: Fix `received_from` Bug (MUST DO FIRST)

**Task 1: Add received_from name resolution to the GET /submittals API route**

- FILE: `frontend/src/app/api/projects/[projectId]/submittals/route.ts`
- FOLLOW PATTERN: The existing `responsible_contractor` batch resolution in the same file (lines 93–118)
- IMPLEMENTATION: After fetching submittals, collect all unique `received_from_id` UUIDs, batch-fetch from `auth.users` or `people` table, build a `receivedFromMap`, and enrich the response:
  ```typescript
  // Batch-resolve received_from names
  const receivedFromIds = [...new Set(
    (data ?? []).map((s) => s.received_from_id).filter(Boolean)
  )];
  let receivedFromMap: Record<string, string> = {};
  if (receivedFromIds.length > 0) {
    // Option A: query people table
    const { data: people } = await supabase
      .from("people")
      .select("id, first_name, last_name")
      .in("id", receivedFromIds);
    if (people) {
      receivedFromMap = Object.fromEntries(
        people.map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()])
      );
    }
  }
  // Enrich data
  const enriched = (data ?? []).map((s) => ({
    ...s,
    responsible_contractor: ..., // existing
    received_from: s.received_from_id ? receivedFromMap[s.received_from_id] ?? null : null,
  }));
  ```
- VERIFY: Check `database.types.ts` for the `people` table structure before writing queries

**Task 2: Update `SubmittalSummary` type in `use-submittals.ts`**

- FILE: `frontend/src/hooks/use-submittals.ts`
- ADD field: `received_from?: string | null` to `SubmittalSummary` interface
- This is a display-name string (resolved), not the raw UUID

**Task 3: Update `toTableRow()` in the list page**

- FILE: `frontend/src/app/(main)/[projectId]/submittals/page.tsx`
- CHANGE line ~284: `received_from: null, // TODO` → `received_from: (item as any).received_from ?? null`
- Better: Add `received_from` to `SubmittalSummary` type so no cast is needed

---

### PHASE 2: Packages CRUD (Add Edit/Delete to Packages API + UI)

**Task 4: Create PATCH/DELETE for packages**

- FILE: `frontend/src/app/api/projects/[projectId]/submittals/packages/[packageId]/route.ts` (NEW)
- METHODS: PATCH (update name/description), DELETE
- PATTERN: Match existing packages/route.ts structure + `withApiGuardrails`
- SCHEMA:
  ```typescript
  const updatePackageSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
  });
  ```

**Task 5: Add Package management to Packages tab**

- FILE: `frontend/src/app/(main)/[projectId]/submittals/page.tsx`
- The Packages tab (`activeTab === "packages"`) shows `GroupedSubmittalView`
- ADD: "New Package" button visible only on packages tab
- ADD: Per-group kebab menu (edit name, delete package)
- HOOK: Add `useCreatePackage`, `useUpdatePackage`, `useDeletePackage` to `use-submittals.ts`

---

### PHASE 3: Distribution Workflow

**Task 6: Create SubmittalDistributeDialog**

- FILE: `frontend/src/features/submittals/submittal-distribute-dialog.tsx` (NEW)
- PATTERN: Follow `submittal-form-page.tsx` for form structure
- FIELDS:
  - Recipients: multi-select from `useAuthUsers` (tag chips)
  - Message: textarea (optional)
  - Attachments: list of current attachments to include
- ON SUBMIT: POST to `/api/projects/[projectId]/submittals/[submittalId]/distribute`
- AFTER: Invalidate `submittalKeys.detail(projectId, submittalId)` + show toast

**Task 7: Add Distribute button to detail view**

- FILE: `frontend/src/features/submittals/submittal-detail-client.tsx`
- ADD: "Distribute" button in the header actions (next to the MoreHorizontal dropdown)
- BEHAVIOR: Opens `SubmittalDistributeDialog`
- CONDITION: Only show when `submittal.status !== "Closed"` and `submittal.deleted_at === null`

---

### PHASE 4: Workflow Templates (Optional — lower priority)

**Task 8: Create workflow templates API**

- FILES:
  - `frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/route.ts` (GET/POST)
  - `frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/[templateId]/route.ts` (PUT/DELETE)
- DB: Use `submittal_workflow_templates` table (verify exists in `database.types.ts` first — may need migration)
- PATTERN: Match `withApiGuardrails` + Zod validation from packages routes

**Task 9: "Apply Template" in Workflow tab**

- FILE: `frontend/src/features/submittals/submittal-detail-client.tsx`
- ADD: Template selector at top of WorkflowBuilder section
- BEHAVIOR: Selecting a template pre-populates the step list; user confirms before applying

---

### PHASE 5: Validation & Testing

**Task 10: Type check + build**

```bash
cd frontend
npm run db:types        # Verify schema after any changes
npx tsc --noEmit        # Must have 0 errors
npm run lint            # Must have 0 lint errors
npm run build           # Must succeed
npm run check:routes    # No route conflicts
```

**Task 11: Manual verification**

- Navigate to `/[projectId]/submittals`
- Verify `received_from` column shows names (not `-`) for existing records
- Go to Packages tab → verify "New Package" button → create a package → edit it → delete it
- Open a submittal detail → click Distribute → select recipients → submit → verify distribution history appears
- Run test scenarios from `docs/testing/submittals/submittals-scenarios.md`

---

## Implementation Patterns

### Batch Name Resolution (received_from fix pattern)

Follow the existing `responsible_contractor` pattern in `route.ts`:

```typescript
// In GET /submittals route.ts
const receivedFromIds = [
  ...new Set(
    (data ?? [])
      .map((s: Record<string, unknown>) => s.received_from_id)
      .filter(Boolean)
      .map(String),
  ),
];
let receivedFromMap: Record<string, string> = {};
if (receivedFromIds.length > 0) {
  const { data: people } = await supabase
    .from("people")
    .select("id, first_name, last_name")
    .in("id", receivedFromIds);
  if (people) {
    receivedFromMap = Object.fromEntries(
      people.map((p: { id: string; first_name: string | null; last_name: string | null }) => [
        p.id,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id,
      ]),
    );
  }
}

const enriched = (data ?? []).map((s: Record<string, unknown>) => ({
  ...s,
  responsible_contractor: ..., // existing logic
  received_from: s.received_from_id
    ? receivedFromMap[String(s.received_from_id)] ?? null
    : null,
}));
```

### New API Route Pattern (withApiGuardrails)

```typescript
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

export const PATCH = withApiGuardrails(
  "projects/[projectId]/submittals/packages/[packageId]#PATCH",
  async ({ request, params }) => {
    const { projectId, packageId } = await params;
    const supabase = await createClient();
    // ... auth check + Zod parse + Supabase query
    return NextResponse.json(data);
  },
);
```

### TanStack Query Mutation Hook Pattern

```typescript
// In use-submittals.ts — follow existing hook pattern exactly
export function useUpdatePackage(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; description?: string | null }) =>
      apiFetch<PackageRow>(
        `/api/projects/${projectId}/submittals/packages/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Package updated");
    },
    onError: (err: Error) => {
      toast.error("Could not update package", { description: err.message });
    },
  });
}
```

---

## Validation Loop

### Level 1: Syntax & Types

```bash
cd frontend
npx tsc --noEmit        # Zero errors required
npm run lint            # Zero lint errors required
```

### Level 2: Unit Verification

```bash
# Verify received_from resolves in API response
curl -s "http://localhost:3000/api/projects/767/submittals" | node -e "
  const d = require('fs').readFileSync('/dev/stdin','utf8');
  const rows = JSON.parse(d);
  const withReceived = rows.filter(r => r.received_from_id);
  console.log('Has received_from_id:', withReceived.length);
  console.log('Has resolved name:', withReceived.filter(r => r.received_from).length);
"

# Verify packages endpoint
curl -s "http://localhost:3000/api/projects/767/submittals/packages"

# Verify routes
npm run check:routes
```

### Level 3: Integration

```bash
npm run build           # Production build must succeed
```

### Level 4: Browser Verification (Gate #8 — MANDATORY)

```bash
# Open browser to http://localhost:3000/767/submittals
# 1. Items tab: received_from column shows names for relevant records
# 2. Packages tab: "New Package" button visible → create → appears in list
# 3. Edit a package name → verify updated
# 4. Delete a package → verify removed
# 5. Open any submittal detail → Distribute button appears → complete distribution flow
# 6. Recycle Bin tab → select a deleted submittal → Restore button → verify restored
```

---

## Final Validation Checklist

### Technical
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — success
- [ ] `npm run check:routes` — no conflicts

### Feature (Phase 2)
- [ ] `received_from` column shows resolved names in the list view
- [ ] Packages tab: Create package button works
- [ ] Packages tab: Edit package name/description works
- [ ] Packages tab: Delete package works
- [ ] Distribution dialog opens from detail view and submits successfully
- [ ] Distribution appears in "Distribution History" on the General tab
- [ ] Recycle Bin restore button works (already in code — verify)

### Code Quality
- [ ] All new API routes use `withApiGuardrails`
- [ ] All new mutations use `apiFetch` (not raw `fetch`)
- [ ] New hooks follow `use-submittals.ts` mutation pattern
- [ ] No `[id]` route params — use `[packageId]`, `[submittalId]`, etc.
- [ ] Type `project_id` as `integer` in any new inserts
- [ ] No hardcoded colors / hex codes

---

## Anti-Patterns to Avoid

- Do NOT use raw `fetch()` — always `apiFetch` from `@/lib/api-client`
- Do NOT use raw `fetch()` in API routes for external calls — use `fetchWithGuardrails`
- Do NOT skip `withApiGuardrails` on new API routes
- Do NOT use `[id]` for route params — use specific names
- Do NOT assume `received_from_id` is a company ID — it is a UUID pointing to people
- Do NOT create inline styles — use Tailwind CSS tokens only
- Do NOT use `bg-white` / `gray-*` / hex colors — use semantic tokens
- Do NOT use pencil/Pencil icon for edit actions — use three-dots `MoreVertical` menu

---

## Procore Feature Coverage Reference

From the test matrix (`docs/testing/submittals/submittals-test-matrix.md`), 77 Procore features:

| Category | # Features | Alleato Status |
|----------|-----------|----------------|
| Overview, Permissions, Training | 4 | N/A (admin config) |
| Tool Setup & Configuration | 3 | Partial (settings pages exist) |
| Submittal Lifecycle | 9 | ✅ Mostly complete |
| Submittal Packages | 12 | 🟡 Read-only tabs; needs CRUD UI |
| Workflow & Ball-in-Court | 11 | 🟡 Steps work; templates missing |
| Collaboration & Related Items | 6 | 🟡 Distribution UI missing |
| Import, Export, Reporting | 15 | 🟡 CSV/PDF export; no import |
| Navigation, Search, Views | 8 | ✅ Complete |
| Uncategorized | 20 | ⬜ Not started |

**Phase 2 priority**: Categories 4, 5, 6 (Packages, Workflow Templates, Distribution).

---

## Key Files Quick Reference

```
📁 List Page
└── frontend/src/app/(main)/[projectId]/submittals/page.tsx
    ├── toTableRow() — fix received_from on line 284
    └── GroupedSubmittalView — packages/spec/bic grouping component

📁 Detail Page
└── frontend/src/features/submittals/submittal-detail-client.tsx
    ├── WorkflowBuilder — add template selector here
    └── DropdownMenu actions — add Distribute button here

📁 API Routes
└── frontend/src/app/api/projects/[projectId]/submittals/
    ├── route.ts — add received_from batch resolution
    ├── packages/route.ts — add [packageId] child route
    └── [submittalId]/distribute/route.ts — verify is fully implemented

📁 Hooks
└── frontend/src/hooks/use-submittals.ts
    └── Add: useUpdatePackage, useDeletePackage, useDistributeSubmittal

📁 Testing
└── docs/testing/submittals/
    ├── submittals-test-matrix.md — 77-feature Procore reference
    └── submittals-scenarios.md — 21 UAT scenarios
```
