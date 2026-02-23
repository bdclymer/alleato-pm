# Specifications Fix — Task Tracker

## Progress Summary

| Phase | Status | Tasks |
|-------|--------|-------|
| Page Headers | Complete | 2/2 |
| Type Safety | Complete | 2/2 |
| Download Fix | Complete | 1/1 |
| Database Cleanup | Deferred | 0/1 |
| E2E Test Fixes | Complete | 1/1 |
| Validation | In Progress | 2/3 |
| **Total** | **8/10** | |

---

## Phase 1: Page Header Migration

- [x] **1.1** Migrate specifications list page (`page.tsx`) from `ProjectToolPage` to `PageHeader` + `PageContainer`
- [x] **1.2** Migrate specification detail page (`[sectionId]/page.tsx`) from `ProjectToolPage` to `PageHeader` + `PageContainer`

## Phase 2: Type Safety

- [x] **2.1** Remove all `as any` casts from detail page — use proper types from `SpecificationWithAreas` and `RevisionListResponse`
  - Removed 15+ `(specification as any)` and `(revisions as any)` casts
  - Fixed `revision.created_at` → `revision.uploaded_at` (correct DB column)
  - Fixed `revision.uploader_email` → `revision.uploader?.email || revision.uploaded_by`
  - Updated `SpecificationEditModal` prop type: `SpecificationWithRevision` → `SpecificationSection` (only uses base fields)
  - Fixed `status as any` casts in edit modal to use union literal type
- [x] **2.2** Verify TypeScript compiles clean after removing casts — PASSED

## Phase 3: Download Consistency

- [x] **3.1** Update `SpecificationListTable.tsx` download action to use signed URL via `/download` API endpoint instead of raw `file_url`

## Phase 4: Database Cleanup

- [ ] **4.1** ~~Verify orphaned `specifications` table is unused, then create migration to drop it~~
  - **DEFERRED:** Table is referenced in `drizzle/schema.ts`. Dropping requires coordinated Drizzle schema update. Low severity — current feature correctly uses `specification_sections`.

## Phase 5: E2E Test Fixes

- [x] **5.1** Fix extended test selectors to match actual UI
  - Replaced `[data-current="true"]` selectors with `page.getByText("Current")`
  - Updated revision delete test to use direct button selectors (not dropdown menus)
  - Updated "prevent delete of current" test to check for absence of trash button

## Phase 6: Validation

- [x] **6.1** TypeScript compiles clean: `npx tsc --noEmit` — PASSED
- [x] **6.2** ESLint passes: `npx next lint` — PASSED (0 warnings, 0 errors)
- [ ] **6.3** E2E tests pass (both spec files) — PENDING (requires dev server + Playwright)

---

## Session Log

| Date | Session | Tasks Completed | Notes |
|------|---------|-----------------|-------|
| 2026-02-03 | Audit | 0 | Audit complete. Fix PRP generated. |
| 2026-02-03 | Execute | 8/10 | All code fixes applied. tsc + lint pass. E2E tests pending. DB cleanup deferred. |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/(main)/[projectId]/specifications/page.tsx` | Replaced `ProjectToolPage` → `PageHeader` + `PageContainer` |
| `src/app/(main)/[projectId]/specifications/[sectionId]/page.tsx` | Full rewrite: header migration + removed all `as any` casts + fixed field names |
| `src/components/specifications/SpecificationEditModal.tsx` | Changed prop type to `SpecificationSection`, fixed `status as any` |
| `src/components/specifications/SpecificationListTable.tsx` | Added signed URL download handler, replaced raw `file_url` usage |
| `tests/e2e/specifications-extended.spec.ts` | Fixed selectors for revision management tests |

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cd frontend && npx tsc --noEmit` | TypeScript check |
| `cd frontend && npx next lint` | ESLint |
| `npm run check:routes` | Route conflicts |
| `npx playwright test tests/e2e/specifications.spec.ts` | Core E2E tests |
| `npx playwright test tests/e2e/specifications-extended.spec.ts` | Extended E2E tests |
| `cd frontend && npm run build` | Production build |
