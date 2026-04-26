# Feature Test Report: Prime Contracts

**Run ID:** `7a24e5c7-99bd-4c00-95e4-bef2cd40cf22`  
**Tester:** claude-code  
**Environment:** localhost:3000  
**Branch:** main  
**Started:** 2026-04-24T23:43:46Z  
**Duration:** partial run, approximately 18 minutes

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 5 |
| Failed  | 1 |
| Skipped | 0 |
| Blocked | 0 |
| Incomplete evidence | 0 |
| **Total** | 6 |

Pass rate: **83%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Create a prime contract with all fields | HIGH | pass | - | [setup](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.1-setup.png) [form](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.1-form.png) [sov](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.1-sov.png) [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.1-final.png) |
| 1.2 | Create form blocks submit without required fields | HIGH | pass | - | [setup](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.2-setup.png) [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.2-final.png) |
| 1.3 | Multiple SOV lines sum into the original contract value | HIGH | pass | - | [filled](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.3-filled.png) [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/1.3-final.png) |
| 2.1 | Edit from row action menu opens edit mode | HIGH | pass | - | [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/2.2-final.png) |
| 2.2 | Editing the title saves and persists after refresh | HIGH | pass | - | [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/2.2-final.png) |
| 2.3 | SOV tab supports adding a new line item | HIGH | fail | high | [final](../../tests/agent-browser-runs/20260424-234357-feature-prime-contracts/screenshots/7a24e5c7-99bd-4c00-95e4-bef2cd40cf22/2.3-final.png) |

## Failures

### 2.3 — SOV tab supports adding a new line item

- **Expected:** A new SOV line is added and remains visible after save.
- **Actual:** Save toast appeared, but after reload the page showed `No SOV lines yet`. The DB query against `prime_contract_sovs` for the contract ID returned no rows.
- **Severity:** high
- **Cause:** The SOV line-item save did not persist to the expected table.
- **Detection gap:** The flow trusted the success toast and did not assert persisted rows after save.
- **Prevention:** Add a post-save assertion for `prime_contract_sovs` rows and a reload-based regression test.
- **Fails loudly next time:** Verify line-item count in the DB and on the SOV tab immediately after save.
- **Video:** unavailable; record start was omitted for this case.
- **Screenshots:** local path only
- **Console errors:** only unrelated connection-refused noise from the browser session
- **DB assertion:** `prime_contract_sovs` returned `[]` for the saved contract ID
- **Test data marker:** `E2E-7a24e5c7-99bd-4c00-95e4-bef2cd40cf22`
- **Remediation hint:** `frontend/src/components/domain/contracts/ContractForm.tsx`

## Partial Run Notes

- The run was stopped after the first 6 cases in this pass.
- Contract create/edit metadata flows passed.
- SOV line-item persistence needs follow-up.

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| E2E-7a24e5c7-99bd-4c00-95e4-bef2cd40cf22 | `d94cebd8-c5d8-4724-95ef-bac19f6908f7`, `66626f40-a6bd-4cde-9373-6b7427cb42c7`, `72dbba76-cd08-47b2-a8ad-b26d34439569` | retained for debugging |

## Next Steps

- [ ] Fix SOV line-item persistence and add a regression check.
- [ ] Continue the remaining Prime Contracts feature cases.

## Continuation Note

The run was resumed in a narrowed scope for the next unexecuted cases. Results captured so far:

- `4.1` pass
- `4.2` pass
- `4.3` fail, high severity

The `4.3` save path returned a server-side `500 Internal Server Error` while attempting to move the contract from `Approved` to `Terminated`. The remaining narrowed-scope cases (`5.1`, `5.2`) were not started after that blocker surfaced.
