# Fix Report: Change Orders

**Original Run ID:** fc7cb432-34a7-4236-8d6d-1e1199b83b10
**Date:** 2026-04-23 16:55:00 UTC
**Branch:** testing/change-orders-smoke-run-fixes

---

## Summary

| Severity | Failures | Fixed | Unresolved |
|----------|----------|-------|------------|
| critical | 1 (6 endpoints) | 1 | 0 |
| **Total** | **1** | **1** | **0** |

---

## Fixed

### 0.0.0 — API endpoint sweep

All 6 failing endpoints resolved in **1 attempt**.

#### Root Cause A — Missing UUID param validation (5 routes)

Routes passed dynamic path segments directly into Supabase `.eq()` calls on UUID columns without validating format. PostgreSQL threw `invalid input syntax for type uuid: "1"` which `apiErrorResponse` mapped to 500.

With real UUIDs all endpoints returned 200 — the logic was correct, only the guard was missing.

| File | Change |
|------|--------|
| `commitment-change-orders/[commitmentCoId]/line-items/route.ts` | Added `UUID_RE` guard on `commitmentCoId` → 400 |
| `change-events/[changeEventId]/commitment-pcos/route.ts` | Added `UUID_RE` guard on `changeEventId` → 400 |
| `change-events/[changeEventId]/prime-pcos/route.ts` | Added `UUID_RE` guard on `changeEventId` → 400 |
| `change-events/[changeEventId]/related-items/route.ts` | Added `UUID_RE` guard on `changeEventId` → 400 |
| `pcos/[pcoId]/line-items/route.ts` | Replaced `parseInt` with `UUID_RE` guard on `pcoId` → 400 (DB column is uuid) |

#### Root Cause B — RFQ not-found thrown as 500 (1 route)

`ensureRfq()` threw `new Error("RFQ not found")` when the RFQ query returned no data. `withApiGuardrails` caught unhandled throws and mapped them to `INTERNAL_ERROR` (500).

| File | Change |
|------|--------|
| `change-events/rfqs/[rfqId]/responses/route.ts` | Added `UUID_RE` guard on `rfqId` → 400; wrapped `ensureRfq()` call in try-catch → 404 |

#### Verification

```
✅ 400 /api/projects/67/commitment-change-orders/1/line-items
✅ 400 /api/projects/67/change-events/rfqs/1/responses
✅ 400 /api/projects/67/change-events/1/commitment-pcos
✅ 400 /api/projects/67/change-events/1/prime-pcos
✅ 400 /api/projects/67/change-events/1/related-items
✅ 400 /api/projects/67/pcos/1/line-items

✅ 200 /api/projects/67/commitment-change-orders/<real-uuid>/line-items
✅ 200 /api/projects/67/change-events/<real-uuid>/commitment-pcos
✅ 200 /api/projects/67/change-events/<real-uuid>/prime-pcos
✅ 200 /api/projects/67/change-events/<real-uuid>/related-items
```

TypeScript: clean (0 errors).

---

## Open Schema Issue (not a test failure — flagged for follow-up)

`pcos/[pcoId]/line-items` — `pco_line_items.pco_id` is `uuid` in the database but the POST/PATCH/DELETE handlers still use `parseInt` and insert `String(numericPcoId)` (e.g. `"123"`), which would fail at runtime for any write operation. Since no PCOs exist in project 67, this wasn't caught by the smoke sweep. The GET is now fixed (UUID guard). The write handlers need a separate investigation to determine whether:
- `pco_line_items` is meant to link to `commitment_pcos`/`prime_contract_pcos` (both uuid) rather than `potential_change_orders` (bigint), OR
- The column type needs to be migrated to bigint

---

## Files Changed

- `frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/route.ts` — UUID guard on GET
- `frontend/src/app/api/projects/[projectId]/change-events/rfqs/[rfqId]/responses/route.ts` — UUID guard + try-catch for not-found
- `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/commitment-pcos/route.ts` — UUID guard on GET
- `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/prime-pcos/route.ts` — UUID guard on GET
- `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/related-items/route.ts` — UUID guard on GET
- `frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/line-items/route.ts` — UUID guard replacing parseInt on GET

## Next Steps

- [ ] Investigate `pcos/[pcoId]/line-items` POST/PATCH/DELETE — write handlers use parseInt but pco_id column is uuid
- [ ] Re-run smoke: `/test-scenario-run change-orders` to confirm 0 failures
- [ ] Run feature tests: `/test-scenario-run change-orders feature`
