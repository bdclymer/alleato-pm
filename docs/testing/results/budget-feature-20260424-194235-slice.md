# Feature Test Report: budget

**Run ID:** `f1c148c9-d339-4289-8150-6f9a19d908ca`
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** `2026-04-24T23:42:35+00:00`
**Duration:** `12237s`

## Summary

This is a narrowed slice of the budget feature run. It covers the next five unexecuted cases after the prior partial run for project `67`.

| Status  | Count |
|---------|-------|
| Passed  | 2     |
| Failed  | 3     |
| Skipped | 0     |
| Blocked | 0     |
| Incomplete evidence | 0 |
| **Total** | 5 |

Pass rate: **40%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 11.1 | Open Budget Views modal and save a new view | LOW | ✅ pass | — | [setup](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/11.1-setup.png) [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/11.1-final.png) |
| 12.1 | Import modal opens and rejects invalid file | MEDIUM | ❌ fail | medium | [setup](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1-setup.png) [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1-final.png) [video](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1.webm) |
| 12.2 | Export CSV downloads a file | MEDIUM | ❌ fail | high | [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.2-final.png) [video](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.2.webm) |
| 12.3 | Export Excel downloads a file | LOW | ❌ fail | high | [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.3-final.png) [video](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.3.webm) |
| 13.1 | Quick filter persists across reloads | LOW | ✅ pass | — | [setup](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/13.1-setup.png) [final](/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/13.1-final.png) |

## Failures

### 12.1 — Import modal opens and rejects invalid file

- **Expected:** The import modal opens. Submitting an invalid file triggers a validation error describing the expected format. No rows are created.
- **Actual:** The dialog stayed open with the Import button disabled and no visible validation toast or inline error appeared after selecting a `.txt` file.
- **Severity:** medium
- **Cause:** The invalid-file path does not surface a user-visible rejection in the current UI.
- **Detection gap:** The case would pass if only the control state is checked.
- **Prevention:** Add explicit validation messaging and a regression that asserts the message is rendered.
- **Fails loudly next time:** The test should fail on missing visible feedback, not just on disabled submit.
- **Video:** `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1.webm`
- **Screenshots:**
  - Setup: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1-setup.png`
  - Final: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.1-final.png`
- **Console errors:** warning-only dialog accessibility noise; no blocking JS error.
- **DB assertion:** none
- **Test data marker:** not applicable
- **Remediation hint:** `frontend/src/components/budget/BudgetImportModal.tsx`

### 12.2 — Export CSV downloads a file

- **Expected:** A success toast reads "Export completed successfully!" with file details. A file named `budget-export.csv` is downloaded in the browser.
- **Actual:** Clicking Export to CSV returned to the budget page, but no discoverable `budget-export.csv` file appeared in checked download locations and no success toast/file path was visible.
- **Severity:** high
- **Cause:** Export action completed visually only.
- **Detection gap:** The case did not assert the presence of the downloaded file.
- **Prevention:** Configure a known download path or add an API-level assertion for the generated file.
- **Fails loudly next time:** The export case should fail on missing file evidence rather than passing on the click alone.
- **Video:** `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.2.webm`
- **Screenshots:**
  - Final: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.2-final.png`
- **Console errors:** none blocking
- **DB assertion:** none
- **Test data marker:** not applicable
- **Remediation hint:** `frontend/src/components/budget/budget-page-header.tsx`

### 12.3 — Export Excel downloads a file

- **Expected:** A success toast confirms the export. A file named `budget-export.xlsx` is downloaded.
- **Actual:** Clicking Export to Excel returned to the budget page, but no discoverable `budget-export.xlsx` file appeared in checked download locations and no success toast/file path was visible.
- **Severity:** high
- **Cause:** Export action completed visually only.
- **Detection gap:** The case did not assert the presence of the downloaded file.
- **Prevention:** Configure a known download path or add an API-level assertion for the generated file.
- **Fails loudly next time:** The export case should fail on missing file evidence rather than passing on the click alone.
- **Video:** `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/recordings/f1c148c9-d339-4289-8150-6f9a19d908ca/12.3.webm`
- **Screenshots:**
  - Final: `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-234235-feature-budget/screenshots/f1c148c9-d339-4289-8150-6f9a19d908ca/12.3-final.png`
- **Console errors:** none blocking
- **DB assertion:** none
- **Test data marker:** not applicable
- **Remediation hint:** `frontend/src/components/budget/budget-page-header.tsx`

## Passed / Verified

### 11.1 — Open Budget Views modal and save a new view

- Opened the Configure Budget Views modal from the header menu.
- Created `Test View`, made a column order adjustment, and saved successfully.
- Final screenshot shows the success toast and the budget page remaining stable.

### 13.1 — Quick filter persists across reloads

- Selected `Over Budget`, reloaded the page, and the filter state persisted.
- The table reloaded into the empty-state message `No budget line items yet.` with no error banner.

## Skipped / Blocked

- None in this slice.

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| `E2E-f1c148c9-d339-4289-8150-6f9a19d908ca-11.1` | none | not applicable |
| `E2E-f1c148c9-d339-4289-8150-6f9a19d908ca-12.1` | none | not applicable |
| `E2E-f1c148c9-d339-4289-8150-6f9a19d908ca-12.2` | none | not applicable |
| `E2E-f1c148c9-d339-4289-8150-6f9a19d908ca-12.3` | none | not applicable |
| `E2E-f1c148c9-d339-4289-8150-6f9a19d908ca-13.1` | none | not applicable |

## Next Steps

- [ ] Fix the invalid import validation messaging and re-run `12.1`
- [ ] Fix budget export download evidence capture and re-run `12.2` / `12.3`
- [ ] Continue the remaining budget feature cases only after the export path is instrumented

## Evidence

- Run row: `public.test_runs.id = f1c148c9-d339-4289-8150-6f9a19d908ca`
- Result rows updated in `public.test_results`
- Local evidence root: `tests/agent-browser-runs/20260424-234235-feature-budget/`
