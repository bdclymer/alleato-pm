# Feature Test Report: Change Orders

**Run ID:** `48580a03-4849-4f1d-b2e5-433cb6d5ca7d`
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-04-24T23:43:50Z
**Ended:** 2026-04-24T23:58:51Z
**Duration:** 883s

## Summary

| Status | Count |
|--------|-------|
| Passed | 4 |
| Failed | 1 |
| Skipped | 13 |
| Not tested / blocked | 5 |
| **Total** | **23** |

Pass rate on executed cases: **4 / 5 = 80%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Create prime contract change order (happy path) | HIGH | pass | - | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/1.1-final.png` |
| 1.2 | Prime create blocks when PCCO Number or Title is missing | HIGH | pass | - | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/1.2-final.png` |
| 1.3 | Create commitment change order (happy path) | HIGH | skip | - | no commitment COs in project 67 |
| 2.1 | Edit prime CO fields and persist after refresh | HIGH | not_tested | high | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/2.1-setup.png`, `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/2.1-blocked-current.png`, `tests/agent-browser-runs/20260424-194342-feature-change-orders/recordings/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/2.1.webm` |
| 2.2 | Edit commitment CO fields and persist after refresh | HIGH | skip | - | no commitment COs in project 67 |
| 3.1 | Delete prime CO from list row actions | HIGH | pass | - | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/3.1-final.png` |
| 3.2 | Delete commitment CO from list row actions | HIGH | skip | - | no commitment COs in project 67 |
| 4.1 | Approve prime CO | HIGH | skip | - | no pending/proposed prime CO available for approval |
| 4.2 | Reject prime CO | HIGH | skip | - | no pending/proposed prime CO available for rejection |
| 4.3 | Approve commitment CO | HIGH | skip | - | no commitment COs in project 67 |
| 4.4 | Reject commitment CO | HIGH | skip | - | no commitment COs in project 67 |
| 5.1 | Add prime line item and verify total updates | HIGH | fail | high | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/5.1-setup.png`, `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/5.1-final.png`, `tests/agent-browser-runs/20260424-194342-feature-change-orders/recordings/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/5.1.webm` |
| 5.2 | Edit and delete prime line item | HIGH | not_tested | high | blocked by 5.1 detail-page failure |
| 5.3 | Add commitment line item and verify total updates | HIGH | skip | - | no commitment COs in project 67 |
| 6.1 | Upload and delete attachment on prime CO | MEDIUM | not_tested | high | blocked by prime detail route failure from 5.1 |
| 6.2 | Upload and delete attachment on commitment CO | MEDIUM | skip | - | no commitment COs in project 67 |
| 7.1 | Prime status filter returns only matching rows | MEDIUM | pass | - | `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/7.1-final.png` |
| 7.2 | Commitment status filter returns only matching rows | MEDIUM | skip | - | no commitment COs in project 67 |
| 7.3 | Prime search matches number or title | MEDIUM | not_tested | high | repeated frontend dev server outage; `tests/agent-browser-runs/20260424-194342-feature-change-orders/screenshots/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/7.3-blocked-current.png` |
| 7.4 | Commitment search matches number or description | MEDIUM | skip | - | no commitment COs in project 67 |
| 8.1 | Export prime COs to CSV | MEDIUM | not_tested | high | blocked by repeated frontend dev server outage |
| 8.2 | Export commitment COs to CSV | MEDIUM | skip | - | no commitment COs in project 67 |
| 9.1 | Read-only user cannot mutate change orders | MEDIUM | skip | - | no read-only user configured |

## Failures

### 5.1 - Add prime line item and verify total updates

- **Expected:** add a prime line item and see totals update on the detail page.
- **Actual:** the prime CO detail route rendered an error page with "Failed to fetch change order" before the line-item UI could load.
- **Severity:** high
- **Cause:** the detail route for seeded prime COs returned server-side fetch errors, so the line-item flow could not start.
- **Detection gap:** the run did not assert that a seeded prime detail page loads before entering the line-item case.
- **Prevention:** add a dedicated preflight assertion for prime detail load, plus a route/API health check for the detail fetch path.
- **Fails loudly next time:** stop the case on the error page instead of continuing into line-item actions.
- **Video:** `tests/agent-browser-runs/20260424-194342-feature-change-orders/recordings/48580a03-4849-4f1d-b2e5-433cb6d5ca7d/5.1.webm`
- **Screenshots:** `5.1-setup.png`, `5.1-final.png`
- **Console errors:** repeated `Failed to fetch related items`, `Failed to fetch line items`, and `Failed to fetch attachments`
- **DB assertion:** page never reached the line-item add step
- **Test data marker:** not applicable

## Not Tested / Blocked

- **2.1:** frontend dev server died mid-case while on the edit form; saved as `not_tested` with high severity.
- **5.2:** blocked by 5.1 because no line item could be created.
- **6.1:** blocked by the same prime detail route failure that stopped 5.1.
- **7.3:** repeated frontend dev server outage while returning to the list view.
- **8.1:** repeated frontend dev server outage before export could be exercised.

## Skipped

- Commitment coverage was absent in project 67, so 1.3, 2.2, 3.2, 4.3, 4.4, 5.3, 6.2, 7.2, 7.4, and 8.2 were skipped.
- No pending/proposed prime CO was available for 4.1 and 4.2.
- No read-only user was configured for 9.1.

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| `E2E-48580a03-4849-4f1d-b2e5-433cb6d5ca7d-1.1` | `1723` | retained for debugging |

## Top Findings

1. Seeded prime CO detail pages are not reliably loadable. The edit, attachment, and line-item paths all depend on a route that is returning fetch errors and an error page.
2. The frontend dev server was unstable during the run and dropped `localhost:3000` multiple times, turning 2.1, 7.3, and 8.1 into blocked/not-tested outcomes.
3. Project 67 does not have commitment CO coverage or a read-only test user, so 13 of 23 cases were untestable from the current seed set.

## Next Steps

- [ ] Fix the prime CO detail route so seeded records load consistently.
- [ ] Stabilize the local dev server during browser runs.
- [ ] Seed commitment CO coverage and a read-only user, then rerun the skipped cases.
