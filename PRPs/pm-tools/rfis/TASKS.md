# RFIs Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: 2026-02-01

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 16 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 16 |

---

## Tasks

### Phase 1: Data Layer

- [ ] **1.1** Generate fresh Supabase types: `npm run db:types` and verify `rfis` table schema in `database.types.ts`
- [ ] **1.2** Create Zod validation schemas (`frontend/src/lib/schemas/rfi-schema.ts`): `rfiDraftSchema`, `rfiOpenSchema`, `rfiEditSchema`, `RfiFormValues` type. Follow `submittal-schema.ts` pattern. Status values must be lowercase.
- [ ] **1.3** Create RFI service class (`frontend/src/services/rfi-service.ts`): static CRUD methods (list, getById, create, update, delete) with pagination and filtering. Follow `submittal-service.ts` pattern. CRITICAL: `projectId` is NUMBER (INTEGER), `rfiId` is STRING (UUID).

### Phase 2: API Layer

- [ ] **2.1** Create API route for list + create (`frontend/src/app/api/projects/[projectId]/rfis/route.ts`): GET with pagination/filters, POST with Zod validation. MUST `await params`. Validate projectId as number. Check auth.
- [ ] **2.2** Create API route for single + update + delete (`frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts`): GET, PATCH, DELETE. Use `[rfiId]` NOT `[id]`. Run `npm run check:routes` after creating directory.
- [ ] **2.3** Create React Query hook (`frontend/src/hooks/use-rfis.ts`): `useRfis(projectId)`, `useCreateRfi()`, `useUpdateRfi()`, `useDeleteRfi()`. Follow `use-submittals.ts` pattern. Use `router.refresh()` after mutations. Toast notifications via sonner.

### Phase 3: UI Layer

- [ ] **3.1** Create RFI form dialog component (`frontend/src/components/domain/rfi-form-dialog.tsx`): React Hook Form + Zod, all form fields (Subject, Question, Assignees, Due Date, RFI Manager, etc.), "Save as Draft" and "Create Open" buttons with different validation. Reset form on dialog open.
- [ ] **3.2** Create RFI list client component (`frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx`): GenericDataTable with columns (Number, Subject, Status badge, Assignees, Due Date, Ball In Court, RFI Manager), status summary cards (Draft/Open/Pending/Closed counts), filters (status dropdown, search, overdue), action menu (View/Edit/Delete).
- [ ] **3.3** Modify RFI list server page (`frontend/src/app/(main)/[projectId]/rfis/page.tsx`): Replace placeholder with server component that fetches RFIs via `getProjectRfis()` and renders `RfisClient`. CRITICAL: `const { projectId } = await params`.
- [ ] **3.4** Modify Create RFI page (`frontend/src/app/(main)/[projectId]/rfis/new/page.tsx`): Replace placeholder with full form using RfiFormDialog pattern. "Save as Draft" validates `rfiDraftSchema`, "Create Open" validates `rfiOpenSchema`. Redirect to list on success.
- [ ] **3.5** Create RFI detail server page (`frontend/src/app/(main)/[projectId]/rfis/[rfiId]/page.tsx`): Server component fetching single RFI. NAMING: `[rfiId]` directory. Clear `.next` cache after creating.
- [ ] **3.6** Create RFI detail client component (`frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx`): Two-column layout (main content + sidebar), RFI info, question, general info, edit/close/delete actions.

### Phase 4: Integration

- [ ] **4.1** Wire navigation: Verify project sidebar links to `/[projectId]/rfis`. Check `frontend/src/config/project-home.ts`.
- [ ] **4.2** Clear `.next` cache and restart dev server. Verify all RFI routes compile and render. Test with curl/browser.
- [ ] **4.3** Test RFI query returns real data: Run `node -e` Supabase query test script from PRP validation section.

### Phase 5: Testing & Validation

- [ ] **5.1** Create Playwright E2E tests (`frontend/tests/e2e/rfis.spec.ts`): REAL user interaction tests (NOT smoke tests). Required: Create RFI test (fill form + submit + verify in table), Read test (verify data renders), Edit test (change field + save + verify), Delete test, Validation test (empty required fields). Cleanup test data in afterAll. Auth is automatic via saved session.
- [ ] **5.2** Run full validation suite:
  - `npm run db:types` (fresh types)
  - `npx tsc --noEmit` (zero errors)
  - `npm run lint` (zero errors)
  - `npm run check:routes` (no conflicts)
  - `npm run build` (production build succeeds)
  - `npx playwright test tests/e2e/rfis.spec.ts` (E2E pass)

---

## Session Log

### 2026-02-01
- Started: PRP research and creation
- PRP: `PRPs/pm-tools/rfis/prp-rfis.md`
- Research: Verified database schema, analyzed Procore crawl data, reviewed codebase patterns
- Next: Begin Phase 1 tasks

---

## Quick Reference

**PRP Document**: `PRPs/pm-tools/rfis/prp-rfis.md`
**Existing Draft PRP**: `PRPs/pm-tools/rfis/rfi-tool.md`
**Crawl Data**: `PRPs/pm-tools/rfis/crawl-rfis/`
**Procore Research**: `PRPs/pm-tools/rfis/procore-rfi-tool.md`

### Critical Reminders

- `projects.id` is **INTEGER** -- `rfis.project_id` is **INTEGER** (not UUID)
- `rfis.id` is **UUID**
- Use `[projectId]` and `[rfiId]` for route params (NEVER `[id]`)
- `await params` in Next.js 15 server components and route handlers
- Clear `.next` cache after creating new route directories
- Auth is automatic in Playwright tests (saved session)
- Use `users_auth` table for RLS (NOT `people.auth_user_id`)
- Status values lowercase in DB: `draft`, `open`, `pending`, `closed`, `void`

### Key Commands

```bash
# Generate types (FIRST)
npm run db:types

# Validate types
npx tsc --noEmit

# Run linting
npm run lint

# Check route conflicts
npm run check:routes

# Clear Next.js cache (after new routes)
cd frontend && rm -rf .next

# Run E2E tests
npx playwright test tests/e2e/rfis.spec.ts --headed

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
