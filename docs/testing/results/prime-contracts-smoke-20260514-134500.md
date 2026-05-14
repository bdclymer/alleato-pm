# Smoke Test Report: Prime Contracts

**Run ID:** f8b5af52-a637-45d3-9aee-90569ae93693
**Date:** 2026-05-14T13:45:00Z
**Duration:** 81s
**Branch:** main
**Suite ID:** 07ff30a3-c5b4-4782-8626-e76c3654a56e

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/contracts | 200 | pass |
| GET /api/projects/67/contracts/settings | 200 | pass |
| GET /api/projects/67/contracts/{contractId} | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/payments | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/line-items | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/payment-applications | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/change-orders | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/related-items | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/attachments | 200 | pass |
| GET /api/projects/67/contracts/{contractId}/advanced-settings | 405 | pass (no GET handler — PUT only, expected) |
| GET /api/projects/67/contracts/{contractId2}/line-items | 200 | pass |
| GET /api/projects/67/contracts/{contractId2}/line-items/{lineItemId} | 200 | pass |
| GET /api/projects/67/contracts/{contractId2}/change-orders | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/export | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721 | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/line-items | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/emails | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/pdf | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/related-items | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/attachments | 200 | pass |
| GET /api/projects/67/prime-contract-change-orders/1721/related-items/options | 400 | pass (requires ?type= param — expected) |
| GET /api/projects/67/prime-contract-pcos | 200 | pass |
| GET /api/projects/67/prime-contract-pcos/1721 | 404 | pass (no PCOs exist for project 67) |

**Swept:** 24  **Pass:** 24  **Fail:** 0

## Observations

### /advanced-settings → 405 (expected)
Route file only exports `PUT`. No GET handler exists. This is correct — settings are write-only from the API. The 405 is a valid non-failure.

### /related-items/options → 400 (expected)
GET handler exists but requires a `?type=` query parameter (one of: change_event, drawing, rfi, specification, submittal, commitment_co, commitment). Calling without the param returns 400 by design.

### /prime-contract-pcos/1721 → 404 (expected)
No prime contract PCOs exist for project 67. The 404 reflects empty DB state, not a server error.

### Cold-start note
The first sweep (15s timeout) produced 4x status-000 timeouts on the last 4 endpoints. Re-running with 30s timeout after the server was warm confirmed all 4 return 200. The initial run was a server warm-up artifact, not real failures.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature prime-contracts`
- [ ] Create at least one prime contract PCO for project 67 to enable PCO endpoint testing with real data
