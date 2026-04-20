---
title: Submittals Phase 2 — Implementation Tasks
description: Live checklist for closing submittals gaps (received_from bug, packages CRUD, distribution, workflow templates, schema/security)
---

# Submittals — Phase 2 Implementation Tasks

| Phase | Tasks | Status |
|-------|-------|--------|
| **Phase 0: Schema & Security** | 3 tasks | ⚪ Not Started |
| **Phase 1: Fix received_from bug** | 3 tasks | ⚪ Not Started |
| **Phase 1b: Design violation fix** | 1 task | ⚪ Not Started |
| **Phase 2: Packages CRUD** | 2 tasks | ⚪ Not Started |
| **Phase 3: Distribution UI** | 2 tasks | ⚪ Not Started |
| **Phase 4: Workflow Templates** | 2 tasks | ⚪ Not Started |
| **Phase 5: Validation** | 2 tasks | ⚪ Not Started |
| **TOTAL** | **15 tasks** | **0% Complete** |

---

## Progress Summary

**Phase 1 (Phase 1 complete — 2026-02-26):** All core CRUD, workflow responses, attachments, 5-tab list, detail page, soft delete, restore, duplicate, and export are implemented and verified.

**Phase 2 (this file):** Focused on three remaining gaps:
1. `received_from` null bug in the list view table
2. Submittal Packages CRUD UI (API exists, no edit/delete/management)
3. Distribution workflow UI (the API route exists, no dialog to trigger it)

---

## Phase 0: Schema & Security

These were discovered during the audit (2026-04-17) and are not in the original PRP.

### Task 0.1 — Enable RLS on `submittals` table

**Severity:** 🔴 CRITICAL — any authenticated user can read/write any project's submittals

- [ ] Create migration: `supabase/migrations/[timestamp]_enable_rls_submittals.sql`
- [ ] Add `ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;`
- [ ] Add SELECT policy: users can see submittals in their projects (check via `project_members` or equivalent)
- [ ] Add INSERT/UPDATE/DELETE policies scoped to same check
- [ ] Run `npm run db:types` after migration
- [ ] Test: verify existing data still loads at `/767/submittals`

### Task 0.2 — Enable RLS on `submittal_history` table

**Severity:** 🔴 CRITICAL — audit log readable cross-project

- [ ] Create or extend migration to add RLS on `submittal_history`
- [ ] SELECT policy: users can read history for submittals in their projects (join via `submittal_id → submittals.project_id`)
- [ ] Test: verify History tab still loads on detail page

### Task 0.3 — Create `submittal_workflow_templates` table (Phase 4 prereq)

**Severity:** ⚠️ Blocker for Phase 4 only — skip if workflow templates are deferred

- [ ] Create migration: `supabase/migrations/[timestamp]_create_submittal_workflow_templates.sql`
- [ ] Minimum columns: `id uuid PK`, `project_id integer FK → projects(id)`, `name text NOT NULL`, `description text`, `steps jsonb` (array of step definitions), `created_by uuid`, `created_at`, `updated_at`
- [ ] Enable RLS with project-scoped policies
- [ ] Run `npm run db:types` after migration

---

## Pre-Flight Checks

- [ ] `npm run db:types` has been run and `database.types.ts` is current
- [ ] Verify `received_from_id` FK target: check `people` table columns in `database.types.ts`
- [ ] Verify `distribute/route.ts` is fully implemented or stub that needs body

---

## Phase 1: Fix `received_from` Bug

### Task 1.1 — Add received_from batch resolution to GET /submittals

**File**: `frontend/src/app/api/projects/[projectId]/submittals/route.ts`

- [ ] After existing `responsible_contractor` batch resolution (lines ~93–118), add the same pattern for `received_from_id`
- [ ] Collect unique non-null `received_from_id` UUIDs from results
- [ ] Batch-fetch from `people` table: `select("id, first_name, last_name").in("id", receivedFromIds)`
- [ ] Build `receivedFromMap: Record<string, string>` mapping id → `"First Last"`
- [ ] Enrich enriched objects: `received_from: receivedFromMap[id] ?? null`
- [ ] Return `received_from` string (not UUID) in the response

**CRITICAL**: Verify the `people` table column names in `database.types.ts` before writing the query.

### Task 1.2 — Update SubmittalSummary type

**File**: `frontend/src/hooks/use-submittals.ts`

- [ ] Add `received_from?: string | null` to `SubmittalSummary` interface (display name, not UUID)

### Task 1.3 — Remove TODO null from toTableRow()

**File**: `frontend/src/app/(main)/[projectId]/submittals/page.tsx`

- [ ] Locate line ~284: `received_from: null, // TODO: resolve from received_from_id...`
- [ ] Change to: `received_from: (item as SubmittalSummary & { received_from?: string | null }).received_from ?? null`
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Verify in browser: Items tab shows names in `Received From` column

---

## Phase 1b: Design Violation Fix

### Task 1b.1 — Remove Pencil icon from detail dropdown

**File**: `frontend/src/features/submittals/submittal-detail-client.tsx`

- [ ] Line ~5: Remove `Pencil` from lucide-react imports
- [ ] Line ~291: Remove `<Pencil className="mr-2 h-4 w-4" />` from the Edit `DropdownMenuItem`
- [ ] The text "Edit" alone is sufficient; no replacement icon needed
- [ ] Run `npx tsc --noEmit` to verify no broken import

**Rule**: `feedback_no_pencil_edit_icons.md` — never use pencil/Pencil for edit actions

---

## Phase 2: Packages CRUD

### Task 2.1 — Create [packageId] API route (PATCH + DELETE)

**File**: `frontend/src/app/api/projects/[projectId]/submittals/packages/[packageId]/route.ts` (NEW)

- [ ] Create file with `withApiGuardrails` wrapper
- [ ] PATCH: Zod schema `{ name?: string, description?: string | null }` → `supabase.from("submittal_packages").update(...).eq("id", packageId).eq("project_id", projectId)`
- [ ] DELETE: Soft-delete or hard-delete package → verify no submittals reference it first (or set `submittal_package_id = null` on those submittals)
- [ ] Auth check for both methods (throw `GuardrailError` if not authenticated)
- [ ] Route naming: `[packageId]` not `[id]`

### Task 2.2 — Package management UI in Packages tab

**File**: `frontend/src/app/(main)/[projectId]/submittals/page.tsx`
**File**: `frontend/src/hooks/use-submittals.ts` (add hooks)

- [ ] Add `useCreatePackage(projectId)` mutation hook (POST to `/packages`)
- [ ] Add `useUpdatePackage(projectId)` mutation hook (PATCH to `/packages/[id]`)
- [ ] Add `useDeletePackage(projectId)` mutation hook (DELETE to `/packages/[id]`)
- [ ] In the Packages tab, show a "New Package" button in the tab's content area
- [ ] Add per-group kebab menu (MoreVertical) with Edit and Delete options
- [ ] Edit opens a simple inline dialog with name/description fields
- [ ] Delete shows confirmation then calls `useDeletePackage`

---

## Phase 3: Distribution Workflow UI

### Task 3.1 — Create SubmittalDistributeDialog

**File**: `frontend/src/features/submittals/submittal-distribute-dialog.tsx` (NEW)

- [ ] Dialog with `open` + `onOpenChange` props
- [ ] Recipients: multi-select from `useAuthUsers` results (tag chip pattern)
- [ ] Message: optional textarea
- [ ] Attachments: list of `submittal.submittal_attachments` with checkboxes to include
- [ ] Submit calls `apiFetch` POST to `/api/projects/[projectId]/submittals/[submittalId]/distribute`
- [ ] On success: `toast.success("Submittal distributed")` + `qc.invalidateQueries(submittalKeys.detail(...))`
- [ ] Verify `distribute/route.ts` handles the recipients/message payload correctly

### Task 3.2 — Add Distribute button to detail view

**File**: `frontend/src/features/submittals/submittal-detail-client.tsx`

- [ ] Import `SubmittalDistributeDialog`
- [ ] Add `distributeOpen` state
- [ ] Add "Distribute" button in header area (between title and actions dropdown)
- [ ] Only show when `submittal.status !== "Closed"` and `!submittal.deleted_at`
- [ ] Wire `open={distributeOpen}` to dialog

---

## Phase 4: Workflow Templates (Lower Priority)

### Task 4.1 — Verify submittal_workflow_templates table exists

- [ ] Run `grep "submittal_workflow_templates" frontend/src/types/database.types.ts`
- [ ] If NOT found: create migration first (`supabase/migrations/[timestamp]_create_submittal_workflow_templates.sql`)
- [ ] If found: proceed to Task 4.2

### Task 4.2 — Workflow template API + "Apply Template" UI

- [ ] Create `workflow-templates/route.ts` (GET/POST)
- [ ] Create `workflow-templates/[templateId]/route.ts` (PUT/DELETE)
- [ ] Add template selector dropdown at top of WorkflowBuilder in `submittal-detail-client.tsx`
- [ ] "Save as Template" button captures current workflow steps as a template

---

## Phase 5: Validation & Testing

### Task 5.1 — Technical validation

```bash
cd frontend
npm run db:types       # Regenerate after any schema changes
npx tsc --noEmit       # Zero errors
npm run lint           # Zero errors
npm run build          # Production build succeeds
npm run check:routes   # No conflicts
```

- [ ] `npm run db:types` — clean run
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — success
- [ ] `npm run check:routes` — no conflicts

### Task 5.2 — Manual verification (agent-browser or browser)

- [ ] Navigate to `/767/submittals`
- [ ] Items tab: `Received From` column shows name (not `-`) for records that have `received_from_id`
- [ ] Packages tab: "New Package" button is visible
- [ ] Create a new package → verify it appears as a group header
- [ ] Edit a package name → verify updated
- [ ] Delete a package → verify removed from tab
- [ ] Open any non-closed submittal detail
- [ ] Distribute button is visible in detail header
- [ ] Click Distribute → dialog opens → select at least one recipient → submit
- [ ] Distribution appears in "Distribution History" on General tab
- [ ] Recycle Bin tab: "Restore" button works (existing code — just verify)
- [ ] Run scenarios from `docs/testing/submittals/submittals-scenarios.md`

---

## Session Log

| Date | Agent | Work Done |
|------|-------|-----------|
| 2026-04-17 | PRP creation | Researched full codebase, created Phase 2 PRP + TASKS |
| 2026-04-17 | Audit (`/prp:prp-audit`) | Schema + codebase audit; added Phase 0 (RLS/templates), Phase 1b (pencil icon), updated task count to 15 |
