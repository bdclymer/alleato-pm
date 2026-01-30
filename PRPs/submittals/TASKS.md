# Submittals Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: 2026-01-28

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 17 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 17 |

---

## Tasks

### Phase 1: Data Layer

- [ ] **Task 1**: Create Supabase migration for submittals schema (8 tables: submittals, submittal_packages, submittal_workflow_steps, submittal_responses, submittal_distributions, submittal_distribution_recipients, submittal_attachments, submittal_linked_drawings). Include RLS policies, indexes, triggers, and active_submittals VIEW. **CRITICAL**: project_id must be INTEGER. **CRITICAL**: RLS policies must use `project_directory_memberships` (NOT `project_members`). Run `npm run db:types` after.
  - Reference: `scripts/playwright-crawl/procore-crawls/submittals/spec/schema.sql`
  - Pattern: `.claude/scaffolds/crud-resource/migration.sql`

- [ ] **Task 2**: Create `frontend/src/lib/schemas/submittal.ts` — Zod validation schemas (createSubmittalSchema, updateSubmittalSchema) with all form fields from FORMS.md. Use optionalNumber helpers from `common.ts`.
  - Reference: `scripts/playwright-crawl/procore-crawls/submittals/spec/FORMS.md`
  - Pattern: `frontend/src/lib/schemas/common.ts`

- [ ] **Task 3**: Create `frontend/src/services/submittalService.ts` — Class-based service with Supabase client injection. Methods: list (with SubmittalFilters + pagination), getById (with joined relations), create, update, softDelete.
  - Pattern: `frontend/src/services/directoryService.ts`

- [ ] **Task 4**: Create `frontend/src/hooks/use-submittals.ts` — React hook wrapping SubmittalService. Returns submittals[], isLoading, error, refetch, createSubmittal, updateSubmittal, deleteSubmittal. Options: projectId, filters, limit, enabled.
  - Pattern: `frontend/src/hooks/use-contacts.ts`

### Phase 2: API Layer

- [ ] **Task 5**: Create `frontend/src/app/api/projects/[projectId]/submittals/route.ts` — GET (list with filter query params) and POST (create with Zod validation).
  - NAMING: Use `[projectId]` parameter

- [ ] **Task 6**: Create `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` — GET (detail with relations), PUT (update), DELETE (soft-delete).
  - NAMING: Use `[submittalId]` parameter (NOT `[id]`)

### Phase 3: UI Layer

- [ ] **Task 7**: Enhance `frontend/src/app/(tables)/submittals/submittals-data.ts` — Add fetchSubmittalDetail() with joined relations. Add support for deleted submittals query (Recycle Bin). Remove `(supabase as any)` cast and `Record<string, unknown>` type — replace with proper typed queries after migration. Update SubmittalRow to use generated Database types.

- [ ] **Task 8**: Enhance `frontend/src/app/(tables)/submittals/submittals-client.tsx` — Update to 12 Procore-matching columns (Spec, #, Rev, Title, Type, Status, Responsible C., Received From, Ball In Court, Approvers, Response, Sent Date). Update status values (Draft, Open, Distributed, Closed). Add row click → detail navigation. Add 11 Procore filters.
  - Reference: `scripts/playwright-crawl/procore-crawls/submittals/spec/COMMANDS.md` (columns + filters)

- [ ] **Task 9**: Create `frontend/src/components/domain/submittals/SubmittalFormDialog.tsx` — Create/Edit dialog with React Hook Form + Zod. Sections: General Information (14 fields), Distribution & Scheduling (4 fields), Content (3 fields). Searchable dropdowns for contacts/companies.
  - Pattern: `frontend/src/components/domain/contacts/ContactFormDialog.tsx`
  - Reference: `scripts/playwright-crawl/procore-crawls/submittals/spec/FORMS.md`

- [ ] **Task 10**: Create `frontend/src/app/(tables)/submittals/submittal-detail-client.tsx` — Detail view with 4 tabs (General, Related Items, Emails, Change History). General tab: distribution summary, description, workflow responses. Toolbar: Edit, Redistribute, Actions dropdown.

- [ ] **Task 11**: Create `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx` — Server component for detail page. Fetch submittal with relations, pass to SubmittalDetailClient.
  - NAMING: Use `[submittalId]` parameter
  - Pattern: `frontend/src/app/(main)/[projectId]/submittals/page.tsx`

- [ ] **Task 12**: Create `frontend/src/components/domain/submittals/SubmittalWorkflowResponses.tsx` — Workflow response cards (person name + company, response status badge, comments, attachments with CURRENT badge).

- [ ] **Task 13**: Create `frontend/src/components/domain/submittals/SubmittalDistributionSummary.tsx` — Distribution display (From, To recipients list, Message, Attachments).

### Phase 4: Integration

- [ ] **Task 14**: Wire list view — Connect SubmittalsClient to hook/service for real-time data. Add Create Submittal → SubmittalFormDialog. Add row click → detail navigation. Wire Recycle Bin, Packages, Spec Sections tabs to real data.

- [ ] **Task 15**: Wire form dialog — Connect SubmittalFormDialog to API routes. Add toast notifications. Add refetch on success. Wire contact/company dropdowns from existing hooks.

### Phase 5: Testing & Validation

- [ ] **Task 16**: Run type check and build validation
  - `npm run db:types` (regenerate types)
  - `npx tsc --noEmit` (zero type errors)
  - `npm run lint` (zero lint errors)
  - `npm run build` (production build succeeds)
  - `npm run check:routes` (no route conflicts)

- [ ] **Task 17**: Manual verification
  - Navigate to /[projectId]/submittals — list renders with 12 columns
  - Click "Add Submittal" → form dialog opens
  - Create submittal → appears in list
  - Click row → detail view loads
  - Edit → form pre-filled
  - Delete → moves to Recycle Bin tab
  - All 5 tabs render content
  - Filters work correctly
  - Status cards show correct counts

---

## Session Log

### 2026-01-28
- Started: Implementation planning
- PRP: `PRPs/submittals/prp-submittals.md`
- Next: Begin Phase 1 tasks

---

## Quick Reference

**PRP Document**: `PRPs/submittals/prp-submittals.md`
**Crawl Data**: `scripts/playwright-crawl/procore-crawls/submittals/`
**Spec Artifacts**: `scripts/playwright-crawl/procore-crawls/submittals/spec/`

### Key Commands

```bash
# Generate types after migration
npm run db:types

# Validate types
npx tsc --noEmit

# Run linting
npm run lint

# Check route conflicts
npm run check:routes

# Build production
npm run build

# Start dev server
npm run dev
```

---

## How to Update This File

When completing a task:
1. Change `- [ ]` to `- [x]`
2. Update the Progress Summary counts
3. Add an entry to Session Log
4. Update the Status badge if changing phases

**Status Badges**:
- ⚪ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked
