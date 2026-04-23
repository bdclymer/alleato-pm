# Smoke Test Report: Prime Contracts

**Run ID:** fe6f8d7a-1559-4077-a4e5-ef4732f199e2
**Date:** 2026-04-23
**Duration:** ~15s
**Branch:** main
**Tool:** prime-contracts (routes at `/api/projects/[projectId]/contracts`)

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/contracts | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId] | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/related-items | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/attachments | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/change-orders | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/change-orders/[changeOrderId] (fake) | 404 | ✅ pass |
| GET /api/projects/67/contracts/settings | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/line-items | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/attachments/[attachmentId]/download (fake) | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payments | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications/[applicationId] (fake) | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications/[applicationId]/line-items (fake) | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/line-items/[lineItemId] | 200 | ✅ pass |

**Swept:** 14  **Pass:** 14  **Fail:** 0

## Test IDs Used

- Contract ID: `72dbba76-cd08-47b2-a8ad-b26d34439569` (project 67, has line items)
- Line Item ID: `e680fb0a-7642-41e8-b522-2f97710b6aaf`
- Fake UUID for not-found checks: `00000000-0000-0000-0000-000000000001`

## Notes

- No 500s on any endpoint
- `payment-applications/[applicationId]/line-items` returns 200 (empty list) even with a fake application ID — expected behavior
- No real payment, change order, or attachment records exist for project 67 contracts; those routes correctly return 404 for unknown UUIDs

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature prime-contracts`
- [ ] Seed some payment applications and change orders to enable deeper data coverage
