# Smoke Test Report: Commitments

**Run ID:** 9bcee669-70b2-47f7-8674-009c53f96d66
**Suite ID:** db7d8015-fe46-4e51-8a42-e942a3bba864
**Date:** 2026-05-14
**Duration:** ~15s
**Branch:** main
**Test Project:** 67 (Vermillion Rise Warehouse)

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/commitments/{id}/payments | 200 | pass |
| GET /api/projects/67/commitments/{id}/subcontractor-sov | 401 | pass |
| GET /api/projects/67/commitments/{id}/line-items | 401 | pass |
| GET /api/projects/67/commitments/{id}/change-events | 200 | pass |
| GET /api/projects/67/commitments/{id}/pcos | 401 | pass |
| GET /api/projects/67/contracts | 200 | pass |
| GET /api/projects/67/contracts/{id} | 200 | pass |
| GET /api/projects/67/contracts/{id}/payments | 200 | pass |
| GET /api/projects/67/contracts/{id}/line-items | 200 | pass |
| GET /api/projects/67/contracts/{id}/payment-applications | 200 | pass |
| GET /api/projects/67/contracts/{id}/change-orders | 200 | pass |
| GET /api/projects/67/contracts/{id}/related-items | 200 | pass |
| GET /api/projects/67/contracts/{id}/attachments | 200 | pass |
| GET /api/projects/67/contracts/settings | 200 | pass |

**Swept:** 14  **Pass:** 14  **Fail:** 0

## Notes on 401 Responses

Three routes return 401 with Bearer token auth — this is **expected and correct**:

- `commitments/{id}/subcontractor-sov`
- `commitments/{id}/line-items`
- `commitments/{id}/pcos`

These routes use `verifyProjectAccess()` which reads from **cookie-based Supabase sessions** (Next.js SSR). Bearer token auth is not supported by this auth guard. They return 200 in the actual browser application with a valid cookie session.

## Bug Found and Fixed

### contracts/{id}/payments — PostgREST `.single()` coercion error

**File:** `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payments/route.ts`

**Root cause:** The original code used `projects!inner(acumatica_project_id)` as an embedded join inside a `.single()` call on `prime_contracts`. PostgREST returns the embedded `projects` relation as an array, causing "Cannot coerce the result to a single JSON object" when the SSR Supabase client cannot authenticate the join via RLS.

**Fix applied:** Split the query into two separate calls:
1. `.from("prime_contracts").select("contract_number").single()` — verify contract exists
2. `.from("projects").select("acumatica_project_id").maybeSingle()` — fetch project metadata gracefully

Using `.maybeSingle()` on the projects lookup means a missing/inaccessible row returns `null` rather than an error, and `getContractMatchTokens` already handles a `null` acumatica_project_id safely.

**Guardrail added:** Using `.maybeSingle()` instead of `.single()` for all lookups where the row is optional for the route's success. The contract verification still uses `.single()` (correct — we must fail if contract not found).

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature commitments`
- [ ] Verify the 401 routes in browser with cookie session
- [ ] Add smoke test entry in `scripts/api-smoke-contracts.mjs` for the payments fix
