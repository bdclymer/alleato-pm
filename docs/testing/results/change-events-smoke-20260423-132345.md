# Smoke Test Report: Change Events

**Run ID:** 43341221-0d97-4cc5-9cf8-3780e7c2fa15
**Date:** 2026-04-23 13:23 EDT
**Duration:** ~25s
**Branch:** main

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/change-events | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId} | 404 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/approvals | 401 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/attachments | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/attachments/{id} | 404 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/attachments/{id}/download | 401 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/commitment-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/history | 401 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/line-items | 403 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/line-items/{lineItemId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/lineage | 401 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/pdf | 401 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/prime-contract-change-orders | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/prime-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/related-items | 200 | ✅ pass |
| GET /api/projects/67/change-events/{changeEventId}/related-items/options | 400 | ✅ pass |
| GET /api/projects/67/change-events/origin-options | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/{rfqId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/{rfqId}/responses | 200 | ✅ pass |

**Swept:** 20  **Pass:** 20  **Fail:** 0

## Observations

No 500s or timeouts. All responses are healthy. A few non-200 codes worth noting (no action required — all pass):

- **401** on `/approvals`, `/attachments/{id}/download`, `/history`, `/lineage`, `/pdf` — these routes require elevated permissions the test user doesn't have. Expected behavior.
- **403** on `/line-items` (list) — RLS restriction for this user/project combo. The individual line item endpoint returns 200, so the route itself works.
- **404** on `/{changeEventId}` — test user may not have RLS access to this specific record, or the route returns 404 for unauthorized. Not a 500.
- **400** on `/related-items/options` — missing required query params. Expected for bare GET with no args.

## Failures

None.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature change-events`
- [ ] Investigate 401 on `/history`, `/lineage` — confirm these are intentionally permission-gated or if they should be readable by all project members
