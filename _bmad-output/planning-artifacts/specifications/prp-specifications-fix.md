# PRP: Specifications Feature — Fix & Complete

## Goal

Fix broken patterns, remove type safety issues, and align the Specifications feature with project standards. The feature is ~90% complete — this PRP addresses the remaining gaps.

## Why

The specifications feature has a working backend (database, services, API routes) but the frontend pages violate the project's mandatory Page Header Consistency Gate (#10), have excessive `as any` type casts indicating type mismatches, and an inconsistent download pattern. These issues degrade maintainability and break visual consistency with the rest of the app.

## What (Summary of Changes)

| Category | Issue | Fix |
|----------|-------|-----|
| **Page Header** | Both pages use deprecated `ProjectToolPage` | Migrate to `ProjectPageHeader` + `PageContainer` |
| **Type Safety** | Detail page has 15+ `(as any)` casts | Fix hook return types and remove casts |
| **Download** | List table uses raw `file_url`; detail uses signed URL | Standardize on signed URL download endpoint |
| **Orphaned Table** | `specifications` table exists alongside `specification_sections` | Investigate and drop if unused |
| **E2E Tests** | Extended tests reference UI patterns that may not match | Fix selectors to match actual UI |

---

## Working (DO NOT TOUCH)

These files pass all validation checks and must NOT be modified:

### Database
- `supabase/migrations/20260201000001_add_specifications_system.sql` — 5 tables, indexes, triggers, RLS, `create_specification_revision` function

### Services
- `frontend/src/services/SpecificationService.ts`
- `frontend/src/services/SpecificationRevisionService.ts`
- `frontend/src/services/SpecificationAreaService.ts`

### Hooks
- `frontend/src/hooks/use-specifications.ts`
- `frontend/src/hooks/use-specification-revisions.ts`
- `frontend/src/hooks/use-specification-areas.ts`

### Types & Schemas
- `frontend/src/types/specifications.types.ts`
- `frontend/src/lib/schemas/specification-schemas.ts`

### API Routes (all 7 route files)
- `frontend/src/app/api/projects/[projectId]/specifications/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/areas/route.ts`
- `frontend/src/app/api/projects/[projectId]/specifications/areas/[areaId]/route.ts`

### Components (leave these alone unless directly needed for a fix)
- `frontend/src/components/specifications/SpecificationUploadDialog.tsx`
- `frontend/src/components/specifications/SpecificationEditModal.tsx`
- `frontend/src/components/specifications/AddRevisionDialog.tsx`
- `frontend/src/components/specifications/index.ts`

### Test Fixtures
- `frontend/tests/fixtures/test-document.pdf`
- `frontend/tests/fixtures/revised-drawing.pdf`
- `frontend/tests/fixtures/invalid-file.txt`

---

## Broken (FIX THESE)

### Issue 1: Page Header Pattern Violation (BOTH pages)

**Files:**
- `frontend/src/app/(main)/[projectId]/specifications/page.tsx`
- `frontend/src/app/(main)/[projectId]/specifications/[sectionId]/page.tsx`

**Problem:** Both pages import and use `ProjectToolPage` which is deprecated per CLAUDE.md Gate #10.

**Fix:** Replace `ProjectToolPage` with `ProjectPageHeader` + `PageContainer` pattern.

**Reference pattern (from submittals page):**
```tsx
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";

// In JSX:
<>
  <PageHeader
    title="Specifications"
    description="Manage project specifications and revisions"
    actions={<div>...</div>}
  />
  <PageContainer>
    {/* page content */}
  </PageContainer>
</>
```

**Remove:** The `ProjectToolPage` import from both files.

---

### Issue 2: Excessive `as any` Type Casts in Detail Page

**File:** `frontend/src/app/(main)/[projectId]/specifications/[sectionId]/page.tsx`

**Problem:** 15+ instances of `(specification as any).title`, `(specification as any).section_number`, `(revisions as any)?.revisions`, etc. This means the `useSpecification` hook's `SpecificationWithAreas` type doesn't match what the component expects.

**Root Cause:** The hook returns `SpecificationWithAreas` which extends `SpecificationSection` and adds `areas` and `current_revision`. The page accesses `.title`, `.section_number`, `.status`, `.description`, `.areas`, `.current_revision`, `.current_revision_id` — all of which exist on `SpecificationWithAreas`. The `as any` casts are unnecessary.

**Fix:**
1. Type the `useSpecification` data properly: `const { data: specification } = useSpecification(...)` already returns `SpecificationWithAreas | undefined`
2. Remove ALL `(specification as any)` casts — just use `specification.title`, `specification.section_number`, etc.
3. For revisions: Type the `useSpecificationRevisions` return as `RevisionListResponse` and access `revisions.revisions` properly.
4. Add proper null checks where needed instead of `as any`.

---

### Issue 3: Inconsistent Download Pattern in List Table

**File:** `frontend/src/components/specifications/SpecificationListTable.tsx`

**Problem:** Line 196 does `window.open(spec.current_revision!.file_url, "_blank")` — opening the raw storage URL. The detail page correctly uses the `/download` API endpoint which returns a signed URL.

**Fix:** Change the download in `SpecificationListTable.tsx` to use the download API:
```tsx
const handleDownload = async (specId: number, revisionId: number) => {
  const response = await fetch(
    `/api/projects/${projectId}/specifications/${specId}/revisions/${revisionId}/download`
  );
  if (response.ok) {
    const { url } = await response.json();
    window.open(url, "_blank");
  }
};
```

---

### Issue 4: Orphaned `specifications` Table

**Problem:** The database contains BOTH:
- `specification_sections` (used by all code, BIGSERIAL id, proper schema)
- `specifications` (UUID id, has `ai_summary`, `keywords`, `division`, `document_url` — different schema)

The `specifications` table appears to be from an earlier implementation attempt and is not used by any current code.

**Fix:** Create a migration to drop the orphaned table:
```sql
DROP TABLE IF EXISTS specifications;
```

**Pre-check:** Verify no code references `specifications` table (not `specification_sections`).

---

### Issue 5: E2E Extended Tests — Selector Mismatches

**File:** `frontend/tests/e2e/specifications-extended.spec.ts`

**Problems:**
1. Line 237: `page.locator('[data-current="true"]')` — no `data-current` attribute exists in the revision table UI
2. Line 267-270: Looks for action menu buttons on revision rows, but the actual UI uses direct icon buttons (`<Download>`, `<Trash2>`) not dropdown menus
3. Line 290: Same `data-current` attribute issue
4. Line 354: `page.getByLabel(/area/i)` in edit modal — the edit modal (`SpecificationEditModal.tsx`) needs to be checked if it has area fields

**Fix:** Update selectors to match the actual rendered UI:
- Use `page.getByText("Current")` or `page.locator('tr:has-text("Current")')` instead of `data-current`
- Update revision action selectors to match the actual button structure (direct icon buttons, not dropdown menus)

---

## Success Criteria

- [ ] Both pages use `PageHeader` + `PageContainer` (no `ProjectToolPage` imports)
- [ ] Zero `as any` casts in either page file
- [ ] List table download uses signed URL endpoint (not raw file_url)
- [ ] Orphaned `specifications` table dropped (if confirmed unused)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] ESLint passes (`npx next lint`)
- [ ] E2E tests pass: `npx playwright test tests/e2e/specifications.spec.ts`
- [ ] Extended E2E tests pass: `npx playwright test tests/e2e/specifications-extended.spec.ts`

---

## Validation

### Level 1: Syntax
```bash
cd frontend && npx tsc --noEmit
```

### Level 2: Lint
```bash
cd frontend && npx next lint
```

### Level 3: Route Check
```bash
npm run check:routes
```

### Level 4: E2E Tests
```bash
cd frontend && npx playwright test tests/e2e/specifications.spec.ts --headed
cd frontend && npx playwright test tests/e2e/specifications-extended.spec.ts --headed
```

### Level 5: Production Build
```bash
cd frontend && npm run build
```
