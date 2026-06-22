# Smoke Test Report: Change Events

**Run ID:** 7cec7a27-d622-4bca-ab3c-e509b84fea8a
**Suite ID:** f6a48926-582f-4dae-a08a-bd9cd36c6b43
**Date:** 2026-05-14T13:42:00Z
**Duration:** 84s
**Branch:** main
**Test Project:** 67 (Vermillion Rise Warehouse)

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/change-events | 200 | pass |
| GET /api/projects/67/change-events/origin-options | 200 | pass |
| GET /api/projects/67/change-events/rfqs | 200 | pass |
| GET /api/projects/67/change-events/commitment-options | 405 | pass (POST-only route) |
| GET /api/projects/67/change-events/{changeEventId} | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/line-items | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/line-items/{lineItemId} | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/commitment-pcos | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/prime-pcos | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/prime-contract-change-orders | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/related-items | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/related-items/options | 400 | pass (requires `type` param) |
| GET /api/projects/67/change-events/{changeEventId}/lineage | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/history | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/approvals | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/attachments | 200 | pass |
| GET /api/projects/67/change-events/rfqs/{rfqId} | 200 | pass |
| GET /api/projects/67/change-events/rfqs/{rfqId}/responses | 200 | pass |
| GET /api/projects/67/change-events/{changeEventId}/pdf | 200 | pass |

**Swept:** 19  **Pass:** 19  **Fail:** 0

## Non-200 Notes (all expected, not failures)

- **commitment-options → 405**: Route only exports `POST`. Calling GET correctly returns Method Not Allowed.
- **related-items-options → 400**: Route requires a `type` query param (e.g. `?type=rfi`). Calling without returns `{"error":"Invalid related item type"}`. Expected.

## Failures

None.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature change-events`
- [ ] Run PRP validation: `/prp-validate change-events`
