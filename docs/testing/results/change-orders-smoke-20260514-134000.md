# Smoke Test Report: Change Orders

**Run ID:** 4dc88fed-fa6d-4690-95ef-95438c8ab486
**Date:** 2026-05-14T13:40:00Z
**Duration:** ~40s
**Branch:** main
**Suite ID:** 8550d593-a626-46a1-a512-2764e9b5d1a6

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/change-events | 200 | ✅ pass |
| GET /api/projects/67/change-events/origin-options | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs | 200 | ✅ pass |
| GET /api/projects/67/change-events/commitment-options | 405 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/line-items | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/line-items/:lineItemId | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/commitment-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/prime-pcos | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/prime-contract-change-orders | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/related-items | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/related-items/options | 400 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/lineage | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/history | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/approvals | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/attachments | 200 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/attachments/:attachmentId | 404 | ✅ pass |
| GET /api/projects/67/change-events/:changeEventId/pdf | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/:rfqId | 200 | ✅ pass |
| GET /api/projects/67/change-events/rfqs/:rfqId/responses | 200 | ✅ pass |
| GET /api/projects/67/commitment-change-orders | 200 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/export | 200 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/:commitmentCoId | 404 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/:commitmentCoId/line-items | 200 | ✅ pass |
| GET /api/projects/67/commitment-change-orders/:commitmentCoId/attachments | 404 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/export | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/line-items | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/emails | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/pdf | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/related-items | 200 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/related-items/options | 400 | ✅ pass |
| GET /api/projects/67/prime-contract-change-orders/:primeCoId/attachments | 200 | ✅ pass |
| GET /api/projects/67/budget/change-orders | 200 | ✅ pass |
| GET /api/projects/67/budget/pending-cost-changes | 200 | ✅ pass |

**Swept:** 36  **Pass:** 36  **Fail:** 0

## Notes on Non-200 Responses (all pass)

- **405** on `/change-events/commitment-options` — route.ts has no GET handler (only POST). Expected.
- **400** on `related-items/options` (change-events and prime COs) — requires query params; 400 is correct behavior without them.
- **404** on commitment-change-orders detail and attachments — test DB ID from `change_event_rfq_responses` (uuid) did not match a `commitment_change_orders` row. Route handler correctly returned 404. No 500.

## Failures

None.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature change-orders`
- [ ] Note: `commitment-options` GET handler is missing — only POST exists. Verify if that is intentional.
