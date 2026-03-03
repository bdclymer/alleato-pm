# Implementation Report — Prime Contracts

**Date:** 2026-03-03
**Agent:** implementor-alpha
**Status:** Fixes Applied

---

## Investigation Report Correction

The investigation report stated "0 API routes" and scored 6/10. This was **incorrect**. API routes exist under `frontend/src/app/api/projects/[projectId]/contracts/` (17+ route files). The investigation searched for `prime-contracts` but routes use `contracts` path.

**Corrected Score:** 7.5/10 (API works, real issues are smaller)

---

## Fixes Applied

### 1. Field Name Mismatch — `invoiced_amount` vs `invoiced` (HIGH)
**Files changed:**
- `frontend/src/lib/validation/prime-contracts.ts` — Changed `invoiced` to `invoiced_amount` in Zod schema
- `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx` — Updated column config ID, render, csvValue, sortValue to use `invoiced_amount`
- `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` — Updated reducer accumulator and footer totals to use `invoiced_amount`

**Root cause:** API route returns `invoiced_amount` (line 119 of contracts/route.ts) but frontend schema expected `invoiced`. Since the schema uses `.passthrough()`, the field was silently dropped, showing `$0.00` for all invoiced amounts.

### 2. Design System Violation — Badge replaced with StatusBadge (MEDIUM)
**Files changed:**
- `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx` — Replaced `Badge` import with `StatusBadge` from `@/components/ds`
- `frontend/src/components/ds/status-badge.tsx` — Added status mappings: "out for bid" (warning), "out for signature" (warning), "complete" (success), "terminated" (error), "executed" (success)

**What changed:** Removed manual `getStatusVariant` function and `Variant` type. StatusBadge now handles all color mapping automatically via its centralized STATUS_TO_VARIANT map.

### 3. Status Labels Preserved
The human-readable `STATUS_LABELS` map was preserved so StatusBadge receives display names like "Out for Bid" instead of raw enum values like "out_for_bid".

---

## Not Changed (Correct As-Is)
- API routes: Already comprehensive (17+ endpoints)
- Status enum: Matches database `prime_contract_status_v2` exactly
- `payment_terms`: Already wired in both API and frontend schemas
- Delete pattern: Already uses AlertDialog (not window.confirm)
- Header pattern: Uses `UnifiedTablePage` which provides its own header

---

## TypeScript Check
0 new errors introduced. 4 pre-existing errors in unrelated file (`mega-menu-panel.tsx`).
