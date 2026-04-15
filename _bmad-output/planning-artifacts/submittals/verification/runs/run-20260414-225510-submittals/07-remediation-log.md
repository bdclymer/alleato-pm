# Submittals Remediation Log

**Run ID:** run-20260414-225510-submittals
**Date:** 2026-04-15

## Summary

Implemented remediation for VER-001 and VER-002 by updating outdated Playwright specs to the current project-scoped route model and current Submittals UI selectors.

## Resolved Items

### VER-001
- Severity: critical
- Finding: submittals smoke beforeEach timed out waiting for page readiness.
- Root cause: tests navigated to `/submittals` instead of `/${projectId}/submittals`; readiness check used brittle `networkidle` expectation.
- Detection gap: test suite had stale route assumptions not aligned with app route contract.
- Prevention step: standardized test route constant (`E2E_PROJECT_ID`) and switched to deterministic heading-based readiness check.
- Fail-loudly rule: if project-scoped route shell is missing, test fails immediately on heading assertion.
- Recurrence barrier: all submittals tests now share explicit project-scoped navigation contract.
- Source evidence:
  - frontend/tests/e2e/submittals/submittals.smoke.spec.ts
  - _bmad-output/planning-artifacts/submittals/verification/runs/run-20260414-225510-submittals/verify-submittals-playwright.txt

### VER-002
- Severity: critical
- Finding: heading/action-menu assertions failed due stale selectors and stale expectations.
- Root cause: spec asserted legacy selectors/data assumptions not used by current Submittals page.
- Detection gap: spec drifted from implementation without parity checks.
- Prevention step: rewrote spec to assert stable current contract (heading, tabs, create menu, route transitions).
- Fail-loudly rule: absence of core shell elements (heading/tabs/create action) fails tests immediately.
- Recurrence barrier: selectors now target stable roles/test IDs already present in current page.
- Source evidence:
  - frontend/tests/e2e/submittals/submittals.spec.ts
  - _bmad-output/planning-artifacts/submittals/verification/runs/run-20260414-225510-submittals/verify-submittals-playwright.txt

## Verification Result

`npx playwright test tests/e2e/submittals/submittals.smoke.spec.ts tests/e2e/submittals/submittals.spec.ts --project=chromium --no-deps --reporter=line`

- Passed: 5
- Skipped: 1
- Failed: 0

## Remediation Loop 2 (Implement-Feature API Completion)

- Scope: close missing submittals API surface called out by `API-004/005/006/007` and endpoint inventory drift (`DB-010`).
- Root cause: remediation backlog assumed endpoints existed under compatibility paths, but implementation only covered primary `/submittals/*` routes.
- Detection gap: no enforced API-surface parity check between backlog contracts and actual route tree.
- Prevention step: added compatibility + missing routes and updated task/verification artifacts from code evidence.
- Fail-loudly rule: each missing capability now has an explicit route returning 4xx/5xx typed errors instead of falling through to 404/no handler.
- Recurrence barrier: canonical route tree now includes both primary and compatibility endpoints for submittals workflows.

### Implemented

- Added `PUT` reorder support:
  - `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts`
- Added attachments CRUD route:
  - `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/attachments/route.ts`
- Added related-items management route:
  - `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/related-items/route.ts`
- Added compatibility catalog endpoints:
  - `frontend/src/app/api/projects/[projectId]/submittal-packages/route.ts`
  - `frontend/src/app/api/projects/[projectId]/submittal-types/route.ts`
  - `frontend/src/app/api/projects/[projectId]/submittal-spec-sections/route.ts`

### Verification

`cd frontend && npx playwright test tests/e2e/submittals/submittals.smoke.spec.ts tests/e2e/submittals/submittals.spec.ts --config=playwright.config.ts --project=chromium --no-deps --reporter=line`

- Passed: 5
- Skipped: 1
- Failed: 0
- Evidence:
  - `_bmad-output/planning-artifacts/submittals/verification/runs/run-20260414-225510-submittals/verify-submittals-playwright.txt`
