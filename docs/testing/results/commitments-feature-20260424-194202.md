# Feature Test Report: Commitments

**Run ID:** 374d4845-f540-4545-ac46-b9ba1e29bc19
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-04-24T19:42:02-04:00
**Duration:** ~5m

## Summary

| Status | Count |
|--------|-------|
| Passed | 0 |
| Failed | 0 |
| Skipped | 0 |
| Blocked | 26 |
| Incomplete evidence | 0 |
| **Total** | 26 |

Pass rate: **0%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | All commitment tabs switch without reload errors | HIGH | blocked | high | [auth-state](../agent-browser-runs/20260424-194202-feature-commitments/screenshots/374d4845-f540-4545-ac46-b9ba1e29bc19/auth-state.png) [login-failed](../agent-browser-runs/20260424-194202-feature-commitments/screenshots/374d4845-f540-4545-ac46-b9ba1e29bc19/login-failed.png) [commitments-error](../agent-browser-runs/20260424-194202-feature-commitments/screenshots/374d4845-f540-4545-ac46-b9ba1e29bc19/commitments-error.png) |

## Failures

None recorded as pass/fail because the run blocked before any case could complete.

## Skipped / Blocked

- **All 26 feature cases:** blocked before case execution because the commitments page crashed in the browser session with `TypeError: crypto.randomUUID is not a function` from `LiveCursorsRoom`, and the agent-browser session could not attach to a secure localhost browser context.

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| none | none | not applicable |

## Next Steps

- [ ] Fix the `crypto.randomUUID` crash on the commitments page
- [ ] Re-run after fix in a secure localhost browser context: `/test-scenario-run-feature commitments`
- [ ] Verify the runner can attach to the app without falling back to the insecure `192.168.1.67` HTTP origin
