# Smoke Test Report: change-events

**Run ID:** 11377650-b2a0-4655-a97a-b25ff6ecb30b
**Date:** 2026-04-23T17:00:00
**Duration:** ~15s
**Branch:** testing/change-orders-smoke-run-fixes
**Suite ID:** f6a48926-582f-4dae-a08a-bd9cd36c6b43

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/change-events | 200 | ✅ pass |
| GET /api/projects/67/change-events/origin-options | 200 | ✅ pass |
| GET /api/projects/67/change-events/commitment-options | 405 | ✅ pass |
| GET /api/projects/67/change-events/rfqs | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/approvals | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/attachments | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/attachments/{attId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/attachments/{attId}/download | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/commitment-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/history | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/line-items | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/line-items/{liId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/lineage | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/pdf | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/prime-contract-change-orders | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/prime-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/related-items | 200 | ✅ pass |
| GET /api/projects/67/change-events/{ceId}/related-items/options | 400 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/{rfqId} | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/{rfqId}/responses | 200 | ✅ pass |

**Swept:** 21  **Pass:** 21  **Fail:** 0

## Failures

None.

## Notes

- `commitment-options` returned 405 (Method Not Allowed) — route exists but does not implement GET; treated as pass per skill rules (non-500/000).
- `related-items/options` returned 400 — missing required query params; treated as pass.
- All 200s confirmed with real project 67 data using seeded change event IDs.

## Next Steps

- [x] All endpoints healthy — no fixes needed
- [ ] Run feature tests: `/test-scenario-run-feature change-events`
