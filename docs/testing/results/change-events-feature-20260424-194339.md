# Feature Test Report: change-events

**Run ID:** `e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff`
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** `2026-04-24T19:43:39-04:00`
**Duration:** `366s`

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 0 |
| Failed  | 1 |
| Skipped | 0 |
| Blocked | 0 |
| Incomplete evidence | 0 |
| **Total** | 1 |

Pass rate: **0%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Create a change event with all fields filled | HIGH | ❌ fail | high | [setup](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-setup.png) [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-final.png) [failure-current](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-failure-current.png) [video](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1.webm) |

## Failures

### 1.1 — Create a change event with all fields filled

- **Expected:** The browser navigates to the new change event detail page. The header shows a CE number and the title `Structural Steel Scope Addition`. All saved field values match what was entered.
- **Actual:** The record was created and the detail page loaded at `/67/change-events/05204534-3ef2-4e62-ade7-8c692ba163b9`, but the saved row showed `Origin = Emails` instead of the expected `Field`, and the description marker did not persist. The row in `public.change_events` was `05204534-3ef2-4e62-ade7-8c692ba163b9` with number `011`.
- **Severity:** high
- **Cause:** The create form accepts the save, but the Origin mapping does not offer the case's expected `Field` value and the description write path did not persist the marker text.
- **Detection gap:** The case did not assert the exact persisted Origin label or the presence of the description marker after save.
- **Prevention:** Add a post-save DB assertion for every required field and a field-mapping test for Origin so unsupported labels fail before the form is submitted.
- **Fails loudly next time:** The test should query the created row by marker and assert the exact persisted `origin`, `reason`, `scope`, and `description` values immediately after save.
- **Video:** `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1.webm`
- **Screenshots:**
  - Final: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-final.png`
  - Current failure state: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-failure-current.png`
- **Console errors:** none that blocked the save; the page finished on the detail URL.
- **DB assertion:** `public.change_events.id = 05204534-3ef2-4e62-ade7-8c692ba163b9`, `number = 011`, `title = Structural Steel Scope Addition`, `status = Open`, `origin = Emails`, `type = Owner Change`, `reason = Client Request`, `scope = Out of Scope`, `description = null`
- **Test data marker:** `E2E-e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff-1.1`
- **Remediation hint:** `frontend/src/components/domain/change-events/ChangeEventForm.tsx` and the `/67/change-events/new` submission path

## Skipped / Blocked

- None

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| `E2E-e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff-1.1` | `05204534-3ef2-4e62-ade7-8c692ba163b9` | retained for debugging |

## Next Steps

- [ ] Fix the Origin mapping and description persistence for change-event create
- [ ] Re-run `change-events` case `1.1`
- [ ] Expand the feature run to the remaining cases once the create path is stable

## Evidence

- Run row: `public.test_runs.id = e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff`
- Result row: `public.test_results.id = 300bcefb-7b0d-4914-a077-bd2cdbbb560b`
- Screenshot rows uploaded to `test-screenshots`:
  - `e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1/1.1-setup.png`
  - `e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1/1.1-final.png`
  - `e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1/1.1-failure-current.png`
