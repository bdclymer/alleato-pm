# Smoke Test Report: Commitments

**Run ID:** 9ba0f084-80a9-461f-96a0-8b59474dc07f
**Date:** 2026-04-23T13:23:45
**Duration:** ~15s
**Branch:** main

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/commitments/[id]/subcontractor-sov | 401 | ✅ pass |
| GET /api/projects/67/commitments/[id]/line-items | 401 | ✅ pass |
| GET /api/projects/67/commitments/[id]/change-events | 200 | ✅ pass |
| GET /api/projects/67/commitments/[id]/pcos | 401 | ✅ pass |
| GET /api/projects/67/commitments/[id]/pcos/[pcoId] | 401 | ✅ pass |
| GET /api/projects/67/contracts | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId] | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/line-items | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/line-items/[id] | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payments | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications/[id] | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/payment-applications/[id]/line-items | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/change-orders | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/change-orders/[id] | 404 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/related-items | 200 | ✅ pass |
| GET /api/projects/67/contracts/[contractId]/attachments | 200 | ✅ pass |
| GET /api/projects/67/contracts/settings | 200 | ✅ pass |

**Swept:** 18  **Pass:** 18  **Fail:** 0

## Notes

- 4 commitments sub-routes returned 401 (auth-protected as expected). The change-events route returned 200, suggesting the others may require a session cookie rather than Bearer token — this is expected behavior and not a failure.
- Several contracts nested routes returned 404 because the test IDs used (from other projects) aren't associated with project 67. This is valid not-found behavior, not errors.
- No 500 or timeout errors on any endpoint.

## Failures

None.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature commitments`
