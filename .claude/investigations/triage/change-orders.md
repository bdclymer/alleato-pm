# Change Orders Tool — Triage Report
**Date:** 2026-03-03
**Score:** 7/10

## File Inventory
- **Page:** `frontend/src/app/(main)/[projectId]/change-orders/page.tsx` (88 lines) — Server Component
- **Client:** `frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx`
- **API Route:** `frontend/src/app/api/projects/[projectId]/change-orders/route.ts` (155 lines)
  - Sub-routes: [changeOrderId]/, export/, reviewer-settings/
- **Hooks:**
  - `use-change-orders.ts` (247 lines) — general change orders
  - `use-commitment-change-orders.ts` (433 lines) — commitment-specific
  - `use-contract-change-orders.ts` (412 lines) — contract-specific

## Architecture: Complex 3-Type Merge
The page.tsx is a Server Component that fetches from ALL THREE change order tables simultaneously:
1. `change_orders` — general change orders table
2. `prime_contract_change_orders` — joined with `contracts!inner(project_id)`
3. Commitment change orders (via `change_orders` with commitment_id)

The client receives a `UnifiedChangeOrder[]` array and renders with `UnifiedTablePage`.

## What Works
- Client uses `UnifiedTablePage` — correct pattern
- Three-source data merge in server component
- `normalizedStatus` field for status normalization across types
- Reviewer settings dialog exists
- Status filter logic: "pending" matches both "pending" and "submitted"

## Issues Found

### Issue 1: page.tsx fetches prime_contract_change_orders using `contracts!inner` (HIGH)
- Query: `prime_contract_change_orders` joined with `contracts!inner(project_id)`
- But `prime_contracts` and `contracts` are different tables in this codebase
- **Risk:** The join may fail if `prime_contract_change_orders` has FK to `prime_contracts.id` (UUID) not `contracts.id` (integer)

### Issue 2: No Create Flow Visible (HIGH)
- No "new" page found under change-orders/
- `change-orders-client.tsx` uses UnifiedTablePage but create action may redirect or be missing
- Where does "Add Change Order" navigate to?

### Issue 3: Missing ProjectPageHeader in Client (MEDIUM)
- `change-orders-client.tsx` uses `UnifiedTablePage` but no explicit `ProjectPageHeader` wrapper visible

### Issue 4: API route is thin (155 lines) for a 3-type entity (MEDIUM)
- The GET route may only return general `change_orders`, not the merged view
- The page.tsx server component does the merge; the API route may not

## Top 3 Issues
1. **Prime contract change orders join** — possible FK mismatch between contracts vs prime_contracts tables
2. **No create flow** — cannot add new change orders
3. **API route thin** — only 155 lines for complex 3-type entity

## Recommendation
**High priority for create flow verification.** The data read works but may be fetching wrong table. Create flow needs investigation.
