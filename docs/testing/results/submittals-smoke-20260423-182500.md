# Smoke Test Report: Submittals

**Run ID:** 454771e4-c73b-458a-9188-63e59b94625c
**Date:** 2026-04-23 18:25
**Duration:** 9s
**Branch:** main

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/submittals | 200 | ✅ pass |
| GET /api/projects/67/submittals/workflow-templates | 401 | ✅ pass (auth-protected) |
| GET /api/projects/67/submittals/specs | 200 | ✅ pass |
| GET /api/projects/67/submittals/packages | 200 | ✅ pass |
| GET /api/projects/67/submittals/export | 200 | ✅ pass |
| GET /api/projects/67/submittals/{id} | 404 | ✅ pass (no record in project) |
| GET /api/projects/67/submittals/{id}/related-items | 404 | ✅ pass (no record in project) |
| GET /api/projects/67/submittals/{id}/workflow-steps | 200 | ✅ pass |
| GET /api/projects/67/submittals/{id}/revisions | 404 | ✅ pass (no record in project) |

**Swept:** 9  **Pass:** 9  **Fail:** 0

## Failures

None.

## Next Steps

- [ ] Run feature tests: `/test-scenario-run-feature submittals`
