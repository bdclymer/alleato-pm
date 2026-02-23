# Status: Direct Costs

> **AUDITED** - Ground truth verified by `/prp-audit` on 2026-02-05

## Current State

| Field | Value |
|-------|-------|
| **Phase** | BLOCKED |
| **Last Updated** | 2026-02-05T09:00:00Z |
| **Last Audited** | 2026-02-05T09:00:00Z |
| **Progress** | 16/20 items (80% files exist, BUT FORM BROKEN) |
| **Overall Status** | 🔴 BLOCKED - Create form CANNOT SUBMIT |

---

## Verified Artifacts (Audited 2026-02-05)

### Database Layer ✅ COMPLETE

| Item | Status | Evidence |
|------|--------|----------|
| Table in types | ✅ VERIFIED | Line 5060 in database.types.ts |
| Schema correct | ✅ VERIFIED | project_id: number (FK matches projects.id) |
| Migration | ✅ VERIFIED | 20260201051928_alter_direct_costs_employee_id_to_uuid.sql |
| RLS policies | ⚠️ NOT VERIFIED | Need Supabase check |

### API Routes ✅ COMPLETE (7 routes)

| Route | Status | Path |
|-------|--------|------|
| Legacy CRUD | ✅ EXISTS | `api/direct-costs/route.ts` |
| Legacy Detail | ✅ EXISTS | `api/direct-costs/[id]/route.ts` |
| Project CRUD | ✅ EXISTS | `api/projects/[projectId]/direct-costs/route.ts` |
| Project Detail | ✅ EXISTS | `api/projects/[projectId]/direct-costs/[costId]/route.ts` |
| Bulk Operations | ✅ EXISTS | `api/projects/[projectId]/direct-costs/bulk/route.ts` |
| Export | ✅ EXISTS | `api/projects/[projectId]/direct-costs/export/route.ts` |
| Budget Integration | ✅ EXISTS | `api/projects/[projectId]/budget/direct-costs/route.ts` |

### Service Layer ❌ MISSING

| Item | Status | Notes |
|------|--------|-------|
| Service file | ❌ NOT FOUND | No `directCostsService.ts` exists |
| CRUD methods | ❌ N/A | |

**Note:** Page uses server-side Supabase queries directly - valid pattern but inconsistent.

### React Hook ❌ MISSING

| Item | Status | Notes |
|------|--------|-------|
| Hook file | ❌ NOT FOUND | No `use-direct-costs.ts` exists |
| React Query | ❌ N/A | |

**Note:** Page uses server-side data fetching - client mutations may be inline.

### Frontend Pages ✅ COMPLETE (3 pages)

| Page | Status | Path |
|------|--------|------|
| List page | ✅ EXISTS | `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` |
| Create page | ✅ EXISTS | `frontend/src/app/(main)/[projectId]/direct-costs/new/page.tsx` |
| Detail page | ✅ EXISTS | `frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx` |

### Components ✅ COMPLETE (10 components)

| Component | Status | Path |
|-----------|--------|------|
| CreateDirectCostForm | ✅ | `components/direct-costs/CreateDirectCostForm.tsx` |
| DirectCostForm | ✅ | `components/direct-costs/DirectCostForm.tsx` |
| DirectCostSummaryCards | ✅ | `components/direct-costs/DirectCostSummaryCards.tsx` |
| FiltersPanel | ✅ | `components/direct-costs/FiltersPanel.tsx` |
| ExportDialog | ✅ | `components/direct-costs/ExportDialog.tsx` |
| BulkActionsToolbar | ✅ | `components/direct-costs/BulkActionsToolbar.tsx` |
| LineItemsManager | ✅ | `components/direct-costs/LineItemsManager.tsx` |
| AttachmentManager | ✅ | `components/direct-costs/AttachmentManager.tsx` |
| AutoSaveIndicator | ✅ | `components/direct-costs/AutoSaveIndicator.tsx` |
| DirectCostsModal | ✅ | `components/budget/modals/DirectCostsModal.tsx` |

### Tests ⚠️ FAILING

| Test File | Status | Results |
|-----------|--------|---------|
| direct-costs-basic.spec.ts | ❌ FAILING | 8 failed, 1 passed |
| direct-costs.spec.ts | ⚠️ NOT RUN | |
| direct-costs-comprehensive.spec.ts | ⚠️ NOT RUN | |
| financial/direct-costs.spec.ts | ⚠️ NOT RUN | |

---

## Quality Metrics (Verified)

| Metric | Status | Evidence |
|--------|--------|----------|
| TypeScript | ✅ PASS | No errors in direct-costs files |
| ESLint | ⚠️ NOT RUN | |
| E2E Tests | ❌ FAILING | 8/9 failing in basic tests |
| Route Conflicts | ✅ PASS | No [id] vs [costId] conflicts |

---

## Blockers

| Blocker | Severity | Description |
|---------|----------|-------------|
| **CREATE FORM BROKEN** | 🔴 CRITICAL | Submit button disabled - validation requires vendor/employee + budget codes |
| API Dependencies | HIGH | Form needs /vendors, /employees, /budget-codes APIs to return data |
| E2E Tests | HIGH | 8/9 tests failing - form can't submit |
| No Hook/Service | MEDIUM | Inconsistent with codebase patterns |

---

## 🔴 FUNCTIONAL VERIFICATION (Playwright Video Evidence)

**Test run:** 2026-02-05 09:00
**Video:** `test-results/e2e-direct-costs-functional*/video.webm`

| Step | Action | Result |
|------|--------|--------|
| 1 | Navigate to /67/direct-costs | ✅ Page loads |
| 2 | Click "Add Direct Cost" | ✅ Navigates to /new |
| 3 | Fill form fields | ✅ Fields accept input |
| 4 | Click submit | ❌ **BUTTON DISABLED** |
| 5 | Record created | ❌ BLOCKED |

### Root Cause: Zod Validation Schema

**File:** `frontend/src/lib/schemas/direct-costs.ts`

The form REQUIRES but test couldn't satisfy:
1. `line_items[].budget_code_id` - must be valid UUID from budget codes API
2. Either `vendor_id` OR `employee_id` must be selected (lines 116-122)

**The form fetches dropdown data from:**
- `/api/projects/${projectId}/vendors`
- `/api/projects/${projectId}/employees`
- `/api/projects/${projectId}/budget-codes`

**If ANY of these returns empty, the form can NEVER be valid.**

### Needed: Autocomplete Button for Testing

Add a dev-mode button that auto-fills valid test data so forms can be tested without manually satisfying complex validation.

---

## What's ACTUALLY Done vs NOT Done

### FILES EXIST ✅
- Database table with correct FK types
- 7 API routes (CRUD, bulk, export)
- 3 frontend pages (list, new, detail)
- 10 UI components
- TypeScript compiles cleanly
- List page loads and renders

### CRITICALLY BROKEN ❌
- **CREATE FORM CANNOT SUBMIT** - validation requires data from APIs that may be empty
- Users CANNOT create new direct costs

### MISSING ❌
- Hook (`use-direct-costs.ts`)
- Service (`directCostsService.ts`)
- Autocomplete/dev-fill button for testing
- E2E tests PASSING

---

## Next Steps

1. **CRITICAL:** Fix form validation - ensure vendors/employees/budget-codes APIs return data
2. **CRITICAL:** Test that create form actually submits and saves
3. **ADD:** Autocomplete button for dev testing (fills valid test data)
4. **DECIDE:** Add hook/service for consistency OR document exception
5. **UPDATE:** E2E tests to match actual form requirements

---

## Audit History

| Date | Auditor | Result | Notes |
|------|---------|--------|-------|
| 2026-02-05 | Claude Code | 80% verified | First ground truth audit |
| 2026-01-19 | Unknown | 70% claimed | Unverified |
| 2026-01-10 | Migrated | Unknown | Legacy workflow |

---

**Full audit report:** [audit-2026-02-05.md](./audit-2026-02-05.md)
