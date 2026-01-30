# PRP: Submittals Tool — Complete Implementation

**Feature:** Submittals (Project Management)
**Category:** pm-tools
**Date:** 2026-01-28
**Status:** Ready for execution

---

## 1. Objective

Complete the Submittals tool implementation to match Procore's functionality. The database tables already exist (`submittals`, `active_submittals` view, `submittal_types`, `submittal_documents`, `submittal_history`). The global list page (`(tables)/submittals`) and settings pages are partially built. This PRP fills the remaining gaps: service layer, hook, API routes, CRUD forms, detail view, and missing tab functionality.

---

## 2. Current State Assessment

### What EXISTS (DO NOT RECREATE)
- **Database tables:** `submittals`, `active_submittals` (view), `submittal_types`, `submittal_documents`, `submittal_history`, `submittal_notifications`, `submittal_project_dashboard`, `submittal_analytics_events`, `submittal_performance_metrics`
- **Project-scoped page:** `[projectId]/submittals/page.tsx` — server component wrapper
- **Global table page:** `(tables)/submittals/submittals-client.tsx` — Items tab with status cards, filtering, search, sorting
- **Settings pages:** general (numbering prefix), workflow templates, custom fields — all functional
- **Preferences system:** `user_project_preferences` table storage via `settings/preferences.ts`
- **Data layer:** `submittals-data.ts` with `SubmittalRow` type alias to `active_submittals` view
- **Tests:** `tests/e2e/submittals.spec.ts` and `tests/e2e/submittals.smoke.spec.ts`
- **Crawl data:** Screenshots, DOM, metadata for list view, settings, dropdowns

### What's MISSING (scope of this PRP)
1. **`submittalService.ts`** — Service class for CRUD operations
2. **`use-submittals.ts`** — React hook wrapping the service
3. **API routes** — `api/projects/[projectId]/submittals/` for CRUD
4. **Create/Edit submittal form dialog** — Form matching Procore's fields
5. **Submittal detail view** — Individual submittal display with workflow
6. **Export functionality** — CSV/PDF/Excel export handlers
7. **Packages tab** — Submittal package grouping
8. **Recycle Bin tab** — Soft-deleted items
9. **Wired-up action handlers** — Create, Edit, Delete connected to actual operations

---

## 3. Database Schema (VERIFIED from database.types.ts)

### submittals table (Row type)
```typescript
{
  id: string                          // UUID primary key
  project_id: number                  // INTEGER FK → projects(id)
  submittal_number: string            // Required, e.g., "SUB-001"
  title: string                       // Required
  description: string | null
  status: string | null               // Draft, Submitted, Under Review, Requires Revision, Approved, Rejected, Superseded
  priority: string | null             // High, Normal, Low
  submitted_by: string                // Required UUID
  submitter_company: string | null
  submission_date: string | null      // ISO date
  required_approval_date: string | null
  submittal_type_id: string           // Required UUID FK → submittal_types(id)
  specification_id: string | null
  current_version: number | null
  total_versions: number | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
}
```

### active_submittals view (Row type — used for display)
Same as above PLUS:
- `project_name: string | null` (from projects join)
- `submittal_type_name: string | null` (from submittal_types join)
- `submitted_by_email: string | null` (from users join)
- `discrepancy_count: number | null`
- `critical_discrepancies: number | null`

**CRITICAL: `project_id` is INTEGER (not UUID). The `id` column is UUID.**

---

## 4. Procore Terminology (from tutorials)

### Field Names (match these exactly in UI)
- Title, Spec Section, Number & Revision, Submittal Package
- Status, Responsible Contractor, Received From
- Submit By, Issue Date, Received Date, Final Due Date
- Lead Time, Required On-Site Date, Cost Code
- Submittal Manager, Type, Private, Location
- Linked Drawings, Description, Attachments, Distribution List

### Workflow Concepts
- **Ball in Court** — tracks which party has responsibility
- **Submitter** — person who submits the submittal
- **Approver** — person who approves/rejects
- **Workflow Template** — reusable approval sequence
- Sequential and parallel approval paths

### Status Values
- Draft, Submitted, Under Review, Requires Revision, Approved, Rejected, Superseded

### Priority Values
- High, Normal, Low

---

## 5. Implementation Tasks

### Task 1: Create `submittalService.ts`

**File:** `frontend/src/services/submittalService.ts`
**Scaffold:** Copy from `.claude/scaffolds/crud-resource/service.ts`
**Reference:** `frontend/src/services/companyService.ts`

```
Replace placeholders:
  __ENTITY__ → Submittal
  __entity__ → submittal
  __entities__ → submittals
  __ENTITY_TABLE__ → submittals
```

**Methods to implement:**
- `getSubmittals(projectId: number, filters)` — query `active_submittals` view with pagination, search, status/priority filters
- `getSubmittalById(id: string)` — single submittal with type info
- `createSubmittal(projectId: number, data: SubmittalInsert)` — insert into `submittals` table
- `updateSubmittal(id: string, data: SubmittalUpdate)` — update `submittals` table
- `deleteSubmittal(id: string)` — soft delete (set status to 'deleted' or use metadata flag) OR hard delete
- `getSubmittalTypes(projectId: number)` — list types from `submittal_types`

**Key implementation details:**
- Constructor takes `SupabaseClient<Database>`
- Use `active_submittals` view for reads (has joined data)
- Use `submittals` table for writes (Insert/Update types)
- Pagination: offset-based with count
- Search: across title, submittal_number, submitter_company
- Sort: by submission_date desc default

---

### Task 2: Create `use-submittals.ts`

**File:** `frontend/src/hooks/use-submittals.ts`
**Scaffold:** Copy from `.claude/scaffolds/crud-resource/hook.ts`
**Reference:** `frontend/src/hooks/use-companies.ts`

```
Replace placeholders:
  __ENTITY__ → Submittal
  __entity__ → submittal
  __entities__ → submittals
  __ENTITY_TABLE__ → active_submittals (for reads)
```

**Interface:**
```typescript
interface UseSubmittalsOptions {
  projectId: number | string;
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}
```

**Returns:**
- `submittals` — array of SubmittalRow
- `isLoading`, `error` — loading/error state
- `pagination` — { current_page, per_page, total, total_pages }
- `createSubmittal(data)` — create mutation
- `updateSubmittal(id, data)` — update mutation
- `deleteSubmittal(id)` — delete mutation
- `refetch()` — manual refetch
- `submittalTypes` — array of submittal types for dropdowns

---

### Task 3: Create API Routes

**Directory:** `frontend/src/app/api/projects/[projectId]/submittals/`
**Scaffold:** Copy from `.claude/scaffolds/crud-resource/api-route.ts`

**Files:**
1. `route.ts` — GET (list with pagination/filters) and POST (create)
2. `[submittalId]/route.ts` — GET (single), PUT (update), DELETE

**Route param:** `[submittalId]` (NOT `[id]`)

**Implementation:**
- Import `createClient` from `@/lib/supabase/server`
- Await params: `const { projectId } = await params`
- Parse projectId to number: `parseInt(projectId, 10)`
- Instantiate `SubmittalService` and delegate
- Return JSON responses with proper error codes

---

### Task 4: Create Submittal Form Dialog

**File:** `frontend/src/components/domain/submittals/SubmittalFormDialog.tsx`
**Scaffold:** Copy from `.claude/scaffolds/crud-resource/form-dialog.tsx`
**Reference:** `frontend/src/components/domain/companies/CompanyFormDialog.tsx`

**Form fields (from Procore tutorials):**
- `title` — text, required
- `submittal_number` — text, auto-generated with prefix from settings
- `submittal_type_id` — select dropdown from `submittal_types`
- `status` — select: Draft, Submitted, Under Review, Approved, Rejected
- `priority` — select: High, Normal, Low
- `description` — textarea
- `submitted_by` — hidden (current user UUID)
- `submitter_company` — text
- `submission_date` — date picker
- `required_approval_date` — date picker
- `specification_id` — text (optional)

**Zod schema:**
```typescript
const submittalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  submittal_number: z.string().min(1, "Number is required"),
  submittal_type_id: z.string().uuid("Select a type"),
  status: z.string().default("Draft"),
  priority: z.string().default("Normal"),
  description: z.string().optional(),
  submitter_company: z.string().optional(),
  submission_date: z.string().optional(),
  required_approval_date: z.string().optional(),
  specification_id: z.string().optional(),
});
```

**Modes:** Create and Edit (determined by `item` prop)

---

### Task 5: Wire Up Create/Edit/Delete Actions

**File:** Modify `frontend/src/app/(tables)/submittals/submittals-client.tsx`
AND create project-scoped equivalent at `frontend/src/app/(main)/[projectId]/submittals/page.tsx`

**Changes:**
1. Import and use `useSubmittals` hook instead of inline data fetching
2. Add `SubmittalFormDialog` with open/close state
3. Wire "Create" → "Submittal" dropdown to open dialog in create mode
4. Wire row action "Edit" to open dialog in edit mode with selected item
5. Wire row action "Delete" with confirmation dialog
6. Add toast notifications for success/error

---

### Task 6: Implement Export Handlers

**File:** Modify `submittals-client.tsx`

**Implementation:**
- CSV: Convert submittals array to CSV string, trigger download
- Excel: Use same CSV approach with .xlsx extension (or add xlsx library)
- PDF: Generate printable view or use simple text-based PDF

**Minimum viable:** CSV export with columns matching table display.

---

### Task 7: Implement Packages Tab

**What it does:** Groups submittals into named packages for bulk distribution.

**Requires:**
- Check if `submittal_packages` table exists in database types
- If not, this may need a migration (check first)
- If yes, add query to service and hook
- Display as grouped list in Packages tab

**Note:** If no database table exists for packages, implement as a placeholder with "Coming Soon" message rather than creating new tables without verification.

---

### Task 8: Implement Recycle Bin Tab

**Implementation:**
- Query submittals where status = 'deleted' or a soft-delete flag
- Display in same table format with "Restore" action instead of "Edit"
- Check if soft delete exists in current schema (metadata flag or status value)

---

## 6. File Manifest

| # | File | Action | Scaffold Source |
|---|------|--------|----------------|
| 1 | `frontend/src/services/submittalService.ts` | CREATE | `crud-resource/service.ts` |
| 2 | `frontend/src/hooks/use-submittals.ts` | CREATE | `crud-resource/hook.ts` |
| 3 | `frontend/src/app/api/projects/[projectId]/submittals/route.ts` | CREATE | `crud-resource/api-route.ts` |
| 4 | `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` | CREATE | `crud-resource/api-route.ts` |
| 5 | `frontend/src/components/domain/submittals/SubmittalFormDialog.tsx` | CREATE | `crud-resource/form-dialog.tsx` |
| 6 | `frontend/src/app/(tables)/submittals/submittals-client.tsx` | MODIFY | N/A |
| 7 | `frontend/src/app/(main)/[projectId]/submittals/page.tsx` | MODIFY | N/A |

---

## 7. Validation Criteria

### Must Pass
- [ ] `npm run quality --prefix frontend` — zero errors
- [ ] Submittals list loads with data from `active_submittals` view
- [ ] Create submittal via form dialog → record appears in list
- [ ] Edit submittal → changes persist and reflect in list
- [ ] Delete submittal → record removed from list
- [ ] CSV export downloads file with correct data
- [ ] Status/priority filters work correctly
- [ ] Search across title, number, company works
- [ ] Pagination controls work
- [ ] All route params use `[projectId]` and `[submittalId]` (not `[id]`)

### Playwright Tests
- [ ] `submittals.spec.ts` passes (load, status display, action menu)
- [ ] `submittals.smoke.spec.ts` passes (tabs, dropdowns, settings save)

---

## 8. Dependencies & Execution Order

```
Task 1 (Service) → Task 2 (Hook) → Task 3 (API Routes)
                                  → Task 4 (Form Dialog)
                                  → Task 5 (Wire Actions)
                                  → Task 6 (Export)
Task 7 (Packages) — independent, may need schema check
Task 8 (Recycle Bin) — independent
```

**Execute in order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## 9. Pre-Implementation Checklist

- [x] Read `.claude/PATTERNS.md`
- [x] Read `.claude/scaffolds/README.md`
- [x] Reviewed Procore tutorials for Submittals
- [x] Verified database types for `submittals` and `active_submittals`
- [x] Confirmed `project_id` is INTEGER (not UUID)
- [x] Identified existing code to modify vs. create
- [ ] **Must complete 3-step Supabase Gate before writing code**

---

## 10. Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|-----------|
| Write service from scratch | Copy from `companyService.ts` pattern |
| Use `[id]` in routes | Use `[submittalId]` |
| Query `submittals` table for reads | Use `active_submittals` view (has joins) |
| Assume UUID for project_id | It's INTEGER — verify in types |
| Create new tables without checking | Read `database.types.ts` first |
| Skip the Supabase Gate | Generate types → read types → confirm |
