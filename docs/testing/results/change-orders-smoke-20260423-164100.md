# Smoke Test Report: Change Orders

**Run ID:** fc7cb432-34a7-4236-8d6d-1e1199b83b10
**Date:** 2026-04-23 16:41:00 UTC
**Duration:** 35s
**Branch:** testing/change-orders-smoke-run-fixes
**Suite ID:** 8550d593-a626-46a1-a512-2764e9b5d1a6

---

## API Sweep

Swept 40 GET endpoints across 7 change-order related API directories:
`commitment-change-orders`, `prime-contract-change-orders`, `change-events`, `pcos`, `commitment-pcos`, `prime-contract-pcos`, `budget-changes`

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/commitment-change-orders | 200 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/1 | 404 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/1/line-items | 500 | ❌ FAIL |
| GET /api/projects/67/commitment-change-orders/1/attachments | 401 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/export | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/export | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/1 | 404 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/1/line-items | 401 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/1/pdf | 401 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/1/attachments | 401 | ✅ pass |
| GET /api/projects/67/change-events | 200 | ✅ pass |
| GET /api/projects/67/change-events/origin-options | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/1 | 404 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/1/responses | 500 | ❌ FAIL |
| GET /api/projects/67/change-events/1 | 404 | ✅ pass |
| GET /api/projects/67/change-events/1/commitment-pcos | 500 | ❌ FAIL |
| GET /api/projects/67/change-events/1/line-items | 404 | ✅ pass |
| GET /api/projects/67/change-events/1/line-items/1 | 404 | ✅ pass |
| GET /api/projects/67/change-events/1/prime-pcos | 500 | ❌ FAIL |
| GET /api/projects/67/change-events/1/prime-contract-change-orders | 400 | ✅ pass |
| GET /api/projects/67/change-events/1/pdf | 401 | ✅ pass |
| GET /api/projects/67/change-events/1/related-items | 500 | ❌ FAIL |
| GET /api/projects/67/change-events/1/related-items/options | 400 | ✅ pass |
| GET /api/projects/67/change-events/1/lineage | 401 | ✅ pass |
| GET /api/projects/67/change-events/1/history | 401 | ✅ pass |
| GET /api/projects/67/change-events/1/approvals | 401 | ✅ pass |
| GET /api/projects/67/change-events/1/attachments | 404 | ✅ pass |
| GET /api/projects/67/change-events/1/attachments/1 | 404 | ✅ pass |
| GET /api/projects/67/change-events/1/attachments/1/download | 401 | ✅ pass |
| GET /api/projects/67/pcos | 200 | ✅ pass |
| GET /api/projects/67/pcos/1 | 404 | ✅ pass |
| GET /api/projects/67/pcos/1/line-items | 500 | ❌ FAIL |
| GET /api/projects/67/pcos/1/change-events | 200 | ✅ pass |
| GET /api/projects/67/commitment-pcos | 401 | ✅ pass |
| GET /api/projects/67/commitment-pcos/1 | 401 | ✅ pass |
| GET /api/projects/67/prime-contract-pcos | 401 | ✅ pass |
| GET /api/projects/67/prime-contract-pcos/1 | 401 | ✅ pass |
| GET /api/projects/67/budget-changes | 200 | ✅ pass |

**Swept:** 40 &nbsp; **Pass:** 34 &nbsp; **Fail:** 6

---

## UI Health

Change Orders page (`/67/change-orders`) loads correctly — 2 Prime Contract COs visible (Approved + Draft), totalling $17,500.

---

## Failures

### Root Cause A — Missing UUID Validation (5 endpoints)

Routes receive a string ID parameter but pass it directly to Supabase without validating UUID format first. PostgreSQL throws `invalid input syntax for type uuid` which surfaces as 500 instead of 400.

**Confirmed scope:** Retested with real UUIDs — all 5 return 200. These only fail when the ID is non-UUID format.

| Endpoint | Error |
|----------|-------|
| GET /api/projects/67/commitment-change-orders/1/line-items | `invalid input syntax for type uuid: "1"` |
| GET /api/projects/67/change-events/1/commitment-pcos | `invalid input syntax for type uuid: "1"` |
| GET /api/projects/67/change-events/1/prime-pcos | `invalid input syntax for type uuid: "1"` |
| GET /api/projects/67/change-events/1/related-items | `invalid input syntax for type uuid: "1"` |
| GET /api/projects/67/pcos/1/line-items | `invalid input syntax for type uuid: "1"` (+ schema mismatch: route treats pco_id as bigint, DB column is uuid) |

**Fix:** Add UUID format validation at the top of each GET handler — return 400 for invalid format, preventing the Postgres error from reaching the client as a 500.

**Bonus bug on `/pcos/1/line-items`:** The route code does `parseInt(pcoId, 10)` and the inline comment says `pco_id (bigint)`, but `pco_line_items.pco_id` is `uuid` in the database. The `isNaN` check passes for `"1"` (valid integer), so the route queries `.eq("pco_id", "1")` against a uuid column → 500.

### Root Cause B — Not-Found Returned as 500 (1 endpoint)

| Endpoint | Error |
|----------|-------|
| GET /api/projects/67/change-events/rfqs/1/responses | `"RFQ not found"` returned as `INTERNAL_ERROR` (500) |

**Fix:** The RFQ lookup should return `NextResponse.json({ error: "RFQ not found" }, { status: 404 })` instead of throwing/returning via `apiErrorResponse` which maps to 500.

---

## Schema Mismatch (Separate Issue)

`pco_line_items.pco_id` — DB column is `uuid`, route code treats it as `bigint` with `parseInt`. This is a code/schema divergence that will cause incorrect queries even with valid integer IDs.

**Action:** Check migration history or update the route to use UUID parameter handling matching the actual column type.

---

## Next Steps

- [ ] Add UUID param validation to 5 affected nested route handlers (return 400 for non-UUID format)
- [ ] Fix `/change-events/rfqs/[rfqId]/responses` GET: return 404 when RFQ not found, not 500
- [ ] Resolve `pco_line_items.pco_id` type mismatch (uuid in DB vs bigint in route code)
- [ ] Re-run: `/test-scenario-run change-orders`
- [ ] Run feature tests: `/test-scenario-run change-orders feature`

---

## Evidence

- Screenshot: `e2e-screenshots/fc7cb432/change-orders-page.png` — UI page loads correctly
- DB run record: `test_runs.id = fc7cb432-34a7-4236-8d6d-1e1199b83b10`
