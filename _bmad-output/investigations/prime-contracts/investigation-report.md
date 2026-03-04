# Investigation Report — Prime Contracts

**Score:** 6/10
**Date:** 2025-03-03
**Status:** Core Features Present, Missing API & Gaps in Compliance

---

## Procore Reference

**Table Columns (from Procore DOM analysis):**
- Multiple column structure exists (Procore has filter/search capabilities)
- Export functionality
- Create button available
- Configure/Filters buttons

**Key Actions Available:**
- Create new prime contracts
- Export contract data
- Filter and clear filters
- Configure columns
- Search contracts

**Features:**
- Multi-select filtering
- Data export
- Table configuration
- Contract lifecycle management

---

## What Exists in Codebase

**Files Found:**
- Pages: 5 (main + [contractId]/edit + [contractId] + configure + new)
- API Routes: 0 — CRITICAL GAP
- Hook: 1 (`use-prime-contracts.ts`)
- Components: 0 (using generic table, no domain-specific components)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ❌ | ✅ | ✅ | ✅ | BROKEN |
| Create | ❌ | ✅ | ✅ | ✅ | BROKEN |
| Read | ❌ | ✅ | ✅ | ✅ | BROKEN |
| Update | ❌ | ✅ | ✅ | ✅ | BROKEN |
| Delete | ❌ | ✅ | ✅ | ✅ | BROKEN |

**Key Implementation Details:**
- Uses UnifiedTablePage component (shared across 5 financial tools)
- Has navigation (Contracts / Recycle Bin tabs)
- Form pages exist for create/edit
- Configure page exists

---

## Gap Analysis

### Critical Issues (Blockers)

1. **MISSING API ROUTES** — No API endpoints defined
   - Expected paths: `/api/projects/[projectId]/prime-contracts/*`
   - Impact: All CRUD operations cannot execute; forms will fail silently
   - Evidence: Found 0 route.ts files in API directory
   - Fix: Create route handlers for GET, POST, PUT, DELETE operations

2. **No Service Layer** — Missing dedicated service for prime contract operations
   - UI calls API endpoints that don't exist
   - No centralized business logic for contract validation
   - Impact: Data integrity issues, validation gaps

### High Issues

1. **Incomplete Form Implementation** — Create/edit forms exist but lack:
   - Required field validation
   - Error state handling for API failures
   - Success feedback (toast notifications)
   - File: `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx`

2. **No Component Abstraction** — Using generic components instead of domain-specific ones
   - Should have: `PrimeContractForm`, `PrimeContractTable`, `ContractHeader`
   - Impact: UI patterns inconsistent across tools, code reusability low

3. **Missing Header Pattern** — No ProjectPageHeader usage
   - Current: Generic header with settings icon
   - Target: Standard `ProjectPageHeader` from `@/components/layout`

### Medium Issues

1. **Database Schema Mismatch** — Unclear if prime_contracts table has all Procore columns
   - Need to verify: Procore has filter options that require specific DB columns
   - Update database.types.ts to confirm schema completeness

2. **Filter Implementation** — Configure page exists but unclear if filters persist
   - Stateless filter management could cause UX issues
   - Need Redux/Zustand store for filter state

---

## Recommended Fixes (Priority Order)

1. **CRITICAL (Blocks Feature):** Create API routes
   ```
   frontend/src/app/api/projects/[projectId]/prime-contracts/
   ├── route.ts (GET list, POST create)
   └── [contractId]/
       ├── route.ts (GET one, PUT update, DELETE)
       └── duplicate/route.ts (POST duplicate)
   ```
   - Effort: Medium

2. **CRITICAL (Blocks Feature):** Create service layer
   - `frontend/src/services/prime-contracts-service.ts`
   - Implement CRUD operations with validation
   - Effort: Medium

3. **HIGH:** Refactor page header to use ProjectPageHeader
   - File: `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx`
   - Effort: Low

4. **HIGH:** Create domain-specific components
   - `frontend/src/components/domain/prime-contracts/`
   - PrimeContractForm, PrimeContractTable, etc.
   - Effort: Medium

5. **HIGH:** Add form validation and error handling
   - Use Zod schemas for validation
   - Add toast feedback on success/failure
   - Effort: Low

6. **MEDIUM:** Implement persistent filter state
   - Use URL search params or Zustand store
   - Update hook to sync filter state
   - Effort: Medium

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` — Main page
- `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx` — Create form
- `frontend/src/hooks/use-prime-contracts.ts` — Data hook (exists but API calls will fail)
- `scripts/screenshot-capture/outputs/analysis-json/goodwill_bart_-_prime_contracts.json` — Procore reference

---

## Summary

Prime Contracts has UI scaffolding but is missing backend implementation. The biggest blocker is missing API routes. All CRUD operations currently fail. This is the highest-priority fix among the 7 financial tools. The feature cannot be used in its current state.
