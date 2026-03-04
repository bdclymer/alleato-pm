# Prime Contracts Tool — Triage Report
**Date:** 2026-03-03
**Score:** 7/10

## File Inventory
- **Page:** `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` (489 lines) — REAL, uses UnifiedTablePage
- **API Route:** `frontend/src/app/api/projects/[projectId]/contracts/route.ts` (229 lines)
  - Sub-routes: [contractId]/, settings/, validation.ts
- **Hook:** `frontend/src/hooks/use-prime-contracts.ts` (210 lines)

## What Works
- Page uses `UnifiedTablePage` + `useUnifiedTableState` — correct pattern
- API route exists and has GET + POST
- Hook exists
- Tab filtering by status (approved, complete, all)
- Status-based filtering in API route

## Issues Found

### Issue 1: Auth Check Commented Out in API Route (HIGH PRIORITY)
- Lines 161-173 in route.ts: Permission check for project_members is commented out
- Comment says: "DEVELOPMENT: Permission check disabled for easier testing"
- TODO: "Re-enable this in production"
- **Impact:** Any authenticated user can create prime contracts for any project — security hole

### Issue 2: Wrong API Route Path (HIGH PRIORITY)
- Page sends requests to `/api/projects/${projectId}/prime-contracts`
- But API route exists at `api/projects/[projectId]/contracts/` (no "prime-" prefix)
- Need to verify if there's a redirect or if the hook maps correctly

### Issue 3: Missing payment_terms and billing_schedule in Form (MEDIUM)
- DB schema (database.local.types.ts) shows `prime_contracts` table has:
  - `billing_schedule: string | null`
  - `payment_terms: string | null`
- These fields may not be in the create form
- Procore reference shows these as important contract fields

### Issue 4: No ProjectPageHeader (MEDIUM)
- Uses UnifiedTablePage internally, but no explicit ProjectPageHeader wrapper visible in grep
- Need to verify if UnifiedTablePage provides its own header

### Issue 5: Status Enum Alignment (LOW)
- Page uses statuses: "approved", "complete"
- API uses same values in filter queries
- But DB column type needs verification against actual enum values

## Top 3 Issues
1. **Auth check commented out** — security vulnerability, restore immediately
2. **API route path mismatch** — possible 404 on create if URL doesn't match
3. **Missing form fields** — payment_terms and billing_schedule not in create form

## Recommendation
**High priority.** Fix auth check and verify API route path alignment first. Then add missing form fields.
