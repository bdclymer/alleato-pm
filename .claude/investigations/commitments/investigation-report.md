# Investigation Report — Commitments

**Score:** 7/10
**Date:** 2025-03-03
**Status:** Substantial Implementation with Pattern & Compliance Gaps

---

## Procore Reference

**Table Features (from Procore DOM analysis):**
- Main navigation: Contracts, Recycle Bin tabs
- Export functionality
- Create button (dropdown)
- Filter system with multi-select
- Configure columns option
- Search capability

**Key Actions Available:**
- Create commitment (Purchase Order, Subcontractor, etc.)
- Export commitments
- Clear filters
- Search commitments
- View recycle bin (deleted items)

**Features:**
- Multiple commitment types (PO, Subcontractor contracts)
- Recycle bin with restore capability
- Collaborative views
- Status tracking

---

## What Exists in Codebase

**Files Found:**
- Pages: 7 (main + [id]/edit + [id] + new + configure + recycle-bin + settings)
- API Routes: 16 endpoints
- Hooks: 2 (`use-commitments.ts`, `use-commitment-data.ts`)
- Components: 8 (forms, tables, modals)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ✅ | ✅ | ✅ | ✅ | OK |
| Delete | ✅ | ✅ | ✅ | ✅ | OK |

**Key Implementation Details:**
- Uses UnifiedTablePage for list view
- Has Recycle Bin (soft delete) implementation
- Settings/Configure pages exist
- Form validation present
- Multiple pages for different commitment types

---

## Gap Analysis

### Critical Issues (Blockers)
*None identified. Core functionality present.*

### High Issues

1. **Header Pattern Violation** — Not using ProjectPageHeader + PageContainer
   - File: `frontend/src/app/(main)/[projectId]/commitments/page.tsx`
   - Impact: Inconsistent with design system standards

2. **Recycle Bin Restoration UX** — Recycle bin page exists but unclear if restore function is implemented
   - Need to verify: Can users permanently delete or restore deleted commitments?
   - Impact: Data recovery might be missing

3. **Settings Page Unclear** — `/settings` route exists but unclear what's configurable
   - Should align with Procore's commitment settings (approval workflows, notification rules)
   - Impact: Feature parity gap with Procore

### Medium Issues

1. **Form Validation Gaps** — Create/edit forms may lack:
   - Dependency validation (vendor field required for POs)
   - Cross-field validation (contract type specific fields)
   - Amount range validation

2. **Component Reusability** — Components exist but may not be DRY
   - Review: Are create/edit forms duplicating logic?
   - Impact: Maintenance burden, inconsistent validation

3. **No Type Discrimination** — CommitmentForm may not handle different commitment types well
   - PO has different fields than Subcontractor contract
   - Impact: Forms may show wrong fields for contract type

### Low Issues

1. **Missing Empty State** — List page may not handle 0 commitments case
2. **No Bulk Actions** — Procore may support bulk operations not implemented
3. **Filter State Persistence** — Unclear if filters persist across navigation

---

## Recommended Fixes (Priority Order)

1. **HIGH:** Refactor page header to use ProjectPageHeader
   - File: `frontend/src/app/(main)/[projectId]/commitments/page.tsx`
   - Effort: Low

2. **HIGH:** Implement restore function in Recycle Bin
   - Add PUT endpoint for undelete
   - Add UI button "Restore" in recycle bin view
   - Effort: Low-Medium

3. **HIGH:** Clarify Settings page functionality
   - Document what settings are configurable
   - Align with Procore feature set
   - Effort: Medium

4. **MEDIUM:** Add form field validation for different commitment types
   - Use Zod discriminated unions for type-specific validation
   - Update: `frontend/src/components/domain/commitments/commitment-form.tsx`
   - Effort: Medium

5. **MEDIUM:** Verify and improve form validation
   - Test: negative amounts, invalid vendor references, missing required fields
   - Effort: Low

6. **LOW:** Add empty state UI when no commitments exist
   - Use EmptyState component from `@/components/ds`
   - Effort: Low

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/commitments/page.tsx` — Main page
- `frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx` — Recycle bin
- `frontend/src/hooks/use-commitments.ts` — Data hook
- `scripts/screenshot-capture/outputs/analysis-json/goodwill_bart_-_commitments.json` — Procore reference

---

## Summary

Commitments is substantially implemented with all CRUD operations working. Primary gaps are header pattern violation and unclear Settings page functionality. The feature is usable but needs polish and alignment with design system standards. Lower priority than Budget/Prime Contracts.
