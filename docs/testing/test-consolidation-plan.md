# Tool Test Consolidation Plan (Phase 1)

- Updated: 2026-04-20
- Action codes: `KEEP` (retain as canonical), `MERGE` (consolidate into another canonical suite), `ARCHIVE` (move to historical/scratch and exclude from default runs).

## Phase 2 Progress (Implemented)

- `change-events` pilot completed on 2026-04-20.
- Canonical suites created:
  - `frontend/tests/e2e/change-events/change-events.smoke.spec.ts`
  - `frontend/tests/e2e/change-events/change-events.regression.spec.ts`
  - `frontend/tests/e2e/change-events/change-events.api.spec.ts` (renamed from `change-events-api.spec.ts`)
- Archived change-events legacy/ad-hoc suites:
  - `frontend/tests/_archive/2026-04-20/change-events/top-level/*`
  - `frontend/tests/_archive/2026-04-20/change-events/e2e/*`
- `change-orders` pilot completed on 2026-04-20.
- Canonical suites created:
  - `frontend/tests/e2e/change-orders/change-orders.smoke.spec.ts`
  - `frontend/tests/e2e/change-orders/change-orders.regression.spec.ts`
- Archived change-orders fragmented suites:
  - `frontend/tests/_archive/2026-04-20/change-orders/top-level/*`
  - `frontend/tests/_archive/2026-04-20/change-orders/e2e/*`
- `commitments` pilot completed on 2026-04-20.
- Canonical suites created:
  - `frontend/tests/e2e/commitments/commitments.smoke.spec.ts`
  - `frontend/tests/e2e/commitments/commitments.regression.spec.ts`
  - `frontend/tests/e2e/commitments/commitments.api.spec.ts` (renamed from `commitment-api.spec.ts`)
- Archived commitments fragmented suites:
  - `frontend/tests/_archive/2026-04-20/commitments/financial/*`
  - `frontend/tests/_archive/2026-04-20/commitments/e2e/*`
- `budget` pilot completed on 2026-04-20.
- Canonical suites created:
  - `frontend/tests/e2e/budget/budget.smoke.spec.ts`
  - `frontend/tests/e2e/budget/budget.regression.spec.ts` (renamed from `budget-validation.spec.ts`)
- Archived budget fragmented suites:
  - `frontend/tests/_archive/2026-04-20/budget/top-level/*`
  - `frontend/tests/_archive/2026-04-20/budget/e2e-budget/*`
  - `frontend/tests/_archive/2026-04-20/budget/e2e-root/*`

## Documentation Files (`docs/testing`)

| Tool | File | Action | Recommendation |
|---|---|---|---|
| budget | `docs/testing/budget-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| budget | `docs/testing/budget-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| change-events | `docs/testing/change-events-consolidation.md` | KEEP | Use as template for per-tool consolidation playbooks. |
| change-events | `docs/testing/change-events/change-events-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| change-events | `docs/testing/change-events/change-events-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| change-orders | `docs/testing/change-orders/change-orders-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| change-orders | `docs/testing/change-orders/change-orders-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| commitments | `docs/testing/commitments/commitments-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| commitments | `docs/testing/commitments/commitments-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| daily-log | `docs/testing/daily-log-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| daily-log | `docs/testing/daily-log-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| direct-costs | `docs/testing/direct-costs-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| direct-costs | `docs/testing/direct-costs-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| directory | `docs/testing/directory-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| directory | `docs/testing/directory-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| documents | `docs/testing/documents-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| documents | `docs/testing/documents-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| drawings | `docs/testing/drawings/drawings-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| drawings | `docs/testing/drawings/drawings-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| invoices | `docs/testing/invoices-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| invoices | `docs/testing/invoices-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| meetings | `docs/testing/meetings-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| meetings | `docs/testing/meetings-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| photos | `docs/testing/photos/photos-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| photos | `docs/testing/photos/photos-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| prime-contracts | `docs/testing/prime-contracts/prime-contracts-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| prime-contracts | `docs/testing/prime-contracts/prime-contracts-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| project-lifecycle | `docs/testing/project-lifecycle-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| punch-list | `docs/testing/punch-list-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| punch-list | `docs/testing/punch-list-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| rfis | `docs/testing/rfis-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| rfis | `docs/testing/rfis-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| schedule | `docs/testing/schedule-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| schedule | `docs/testing/schedule-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| specifications | `docs/testing/specifications/specifications-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |
| submittals | `docs/testing/submittals/submittals-scenarios.md` | MERGE | Condense to smoke/regression guided paths; remove overlap with matrix. |
| submittals | `docs/testing/submittals/submittals-test-cases.md` | ARCHIVE | Duplicate intermediate artifact; merge useful cases into matrix/scenarios then archive. |
| submittals | `docs/testing/submittals/submittals-test-matrix.md` | KEEP | Keep as parity source; trim duplicate low-value permutations during phase 2. |

## Playwright Files (`frontend/tests`)

### budget

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/budget/budget-core.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/budget/budget-end-user.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/budget/budget-modal-endpoints.spec.ts` | 1 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/budget-details-sorting-filtering.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/budget-negative-amount-warning.spec.ts` | 7 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/budget/budget-calculations.spec.ts` | 8 | 6 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/budget-code-autopopulation.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-code-creation.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-code-modal-debug.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/budget/budget-column-modals.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-column-sidebars.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-comprehensive.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-core.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/budget/budget-details.spec.ts` | 12 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-edit-cancel.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-export.spec.ts` | 4 | 6 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/budget-filters.spec.ts` | 6 | 6 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/budget-forecast-to-complete.spec.ts` | 3 | 2 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/budget/budget-forecasting-tab.spec.ts` | 16 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-grouping.spec.ts` | 19 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-import-export-comprehensive.spec.ts` | 10 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-import.spec.ts` | 3 | 3 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/budget-line-item-improvements.spec.ts` | 4 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-line-item-validation.spec.ts` | 2 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/budget/budget-line-items-api.spec.ts` | 9 | 8 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-lock.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/budget/budget-modals.spec.ts` | 10 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-modifications.spec.ts` | 3 | 3 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/budget-phase-1a-1b.spec.ts` | 19 | 12 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-quick-wins.spec.ts` | 13 | 2 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-setup.spec.ts` | 11 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-tabs.spec.ts` | 9 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/budget/budget-validate-seed.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/budget-validation.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/budget/budget-views-api.spec.ts` | 14 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-views-ui.spec.ts` | 14 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/budget/budget-views.spec.ts` | 4 | 10 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/budget/line-items-table.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/budget/verify-budget-tabs.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/budget/verify-cost-codes-loading.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/budget/verify-searchparams-fix.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/financial/budget.spec.ts` | 7 | 1 | ARCHIVE | legacy migrated spec kept skipped |

_Summary: KEEP 11 · MERGE 8 · ARCHIVE 23_

### prime-contracts

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/contracts/contract-form-visual.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/contract-smoke.spec.ts` | 1 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/contracts/contracts-comprehensive.spec.ts` | 32 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/contracts/prime-contract-form.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/prime-contracts-financial-integrity.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/contracts/prime-contracts-form.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/prime-contracts-invoices-payments.spec.ts` | 16 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/prime-contracts-new.spec.ts` | 6 | 2 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/prime-contracts-settings.spec.ts` | 15 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/contracts/purchase-order-form-comprehensive.spec.ts` | 14 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/contracts/subcontract-form-comprehensive.spec.ts` | 11 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/gauntlet-bulk-delete-contracts.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/gauntlet-delete-contract.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/prime-contracts-live-test.spec.ts` | 7 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/prime-contracts-targeted.spec.ts` | 8 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts` | 36 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/prime-contracts/api-crud.spec.ts` | 7 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/prime-contracts/api-line-items.spec.ts` | 12 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/prime-contracts/billing-payments-schema.spec.ts` | 20 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/prime-contracts/change-orders-schema.spec.ts` | 11 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/prime-contracts/database-schema.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/prime-contracts/debug-auth.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/prime-contracts/line-items-schema.spec.ts` | 10 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/prime-contracts/supporting-tables-schema.spec.ts` | 15 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/verify-delete-contract.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |

_Summary: KEEP 15 · MERGE 4 · ARCHIVE 6_

### commitments

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/commitments/commitment-api.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/commitments/commitment-create.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitment-creation-debug.spec.ts` | 2 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/commitments/commitment-creation-flow.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitment-debug.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/commitments/commitment-forms.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitment-full-submit.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitment-sov-import.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/commitments/commitment-submit.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/commitments/commitment-validation.spec.ts` | 2 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/commitments/commitments-comprehensive.spec.ts` | 44 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/commitments/commitments-configure.spec.ts` | 45 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitments-crud-flows.spec.ts` | 13 | 8 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/commitments/commitments-detail-tabs.spec.ts` | 14 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/commitments/commitments-edit.spec.ts` | 12 | 8 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/commitments/commitments-list-page.spec.ts` | 37 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitments-recycle-bin.spec.ts` | 27 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitments-soft-delete.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/commitments/commitments-sov-line-items.spec.ts` | 30 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/financial/commitments.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 13 · MERGE 3 · ARCHIVE 4_

### direct-costs

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/dc-create-edit-delete.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/dc-form-investigation.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/direct-costs-verification.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/direct-costs/direct-costs-basic.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/direct-costs/direct-costs-comprehensive.spec.ts` | 21 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/direct-costs/direct-costs-functional-verification.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/direct-costs/direct-costs.spec.ts` | 14 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/financial/direct-costs.spec.ts` | 5 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 6 · MERGE 1 · ARCHIVE 1_

### change-events

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/change-events/change-events.spec.ts` | 6 | 4 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/change-events/live-tester-verification.spec.ts` | 7 | 3 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/change-events/targeted-investigation.spec.ts` | 4 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/change-events/change-events-api.spec.ts` | 18 | 8 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/change-events/change-events-browser-verification.spec.ts` | 10 | 2 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-events/change-events-comprehensive.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-events/change-events-e2e.spec.ts` | 12 | 4 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-events/change-events-quick-verify.spec.ts` | 3 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/change-events/change-events-ui.spec.ts` | 4 | 3 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |

_Summary: KEEP 4 · MERGE 0 · ARCHIVE 5_

### change-orders

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/change-orders/change-orders.spec.ts` | 8 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-orders/change-order-contract-picker.spec.ts` | 3 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-orders/change-order-reviewer-picker.spec.ts` | 6 | 5 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/e2e/change-orders/change-order-reviewer-response.spec.ts` | 10 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-orders/change-order-scope-schedule.spec.ts` | 7 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-orders/change-order-ui.spec.ts` | 10 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/change-orders/change-orders-comprehensive.spec.ts` | 15 | 2 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/change-orders/change-orders-crud.spec.ts` | 7 | 1 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/verify-change-order-gauntlet.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |

_Summary: KEEP 6 · MERGE 1 · ARCHIVE 2_

### invoices

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/invoices/invoices-comprehensive.spec.ts` | 12 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/invoices/invoices-ui.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/invoicing-deep-test.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/invoicing-edit-detail.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/invoicing-final-test.spec.ts` | 5 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/invoicing-live-test.spec.ts` | 5 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/live-verify-invoicing-new.spec.ts` | 2 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/live-verify-invoicing.spec.ts` | 3 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |

_Summary: KEEP 2 · MERGE 2 · ARCHIVE 4_

### directory

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/directory/directory-api.spec.ts` | 15 | 1 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/directory/directory-final.spec.ts` | 2 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/directory/directory-functionality.spec.ts` | 13 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/directory/directory-simple.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/directory/directory-workflow.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/directory/contacts.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/directory/directory-companies.spec.ts` | 14 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-comprehensive.spec.ts` | 36 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/directory/directory-distribution-groups.spec.ts` | 11 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-invitation-workflow.spec.ts` | 13 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/directory/directory-performance.spec.ts` | 19 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-permissions.spec.ts` | 20 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-post-migration.spec.ts` | 14 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-users.spec.ts` | 18 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-visual-check.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/directory-workflows.spec.ts` | 13 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/directory/employees-page.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/directory/tables-directory.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 15 · MERGE 2 · ARCHIVE 1_

### schedule

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/schedule/schedule-crud.spec.ts` | 30 | 4 | KEEP | aligns to canonical smoke/regression/API coverage |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### documents

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/documents/document-pipeline-direct.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/documents/document-pipeline-functionality.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/documents/document-pipeline-navigation.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/documents/document-pipeline-ui-test.spec.ts` | 5 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/documents/document-pipeline.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/documents/documents-infinite-filters.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 5 · MERGE 1 · ARCHIVE 0_

### drawings

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/documents/drawings-e2e.spec.ts` | 19 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### photos

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/documents/photos-page.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 0 · MERGE 1 · ARCHIVE 0_

### meetings

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/meetings/meeting-transcript-format.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/meetings/meetings-crud.spec.ts` | 7 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/meetings/meetings2-page.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 2 · MERGE 1 · ARCHIVE 0_

### daily-log

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/daily-logs/daily-logs-crud.spec.ts` | 1 | 1 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/daily-logs/daily-logs-subtabs-crud.spec.ts` | 1 | 1 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/daily-logs/daily-logs-tabs.spec.ts` | 1 | 1 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/daily-logs/daily-logs.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 3 · MERGE 1 · ARCHIVE 0_

### submittals

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/submittals/submittals.smoke.spec.ts` | 3 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/submittals/submittals.spec.ts` | 3 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 2 · MERGE 0 · ARCHIVE 0_

### specifications

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/documents/specifications-extended.spec.ts` | 21 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/documents/specifications.spec.ts` | 8 | 3 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 2 · MERGE 0 · ARCHIVE 0_

### rfis

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/financial/rfis.spec.ts` | 10 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### punch-list

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/punch-list.spec.ts` | 5 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### project-lifecycle

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/project/complete-project-creation-flow.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-bootstrap.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-creation-display.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-directory-setup.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-collapsible.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-home-edit-fields.spec.ts` | 13 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-edit-simple.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-home-edit.spec.ts` | 5 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-error-check.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-navigation.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-home-sections.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-summary-update.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-home-visual-check.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-homepage.spec.ts` | 14 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-meeting-detail.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-scoped-routing.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-scoping.spec.ts` | 8 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-setup-budget-e2e.spec.ts` | 3 | 1 | ARCHIVE | legacy migrated spec kept skipped |
| `frontend/tests/e2e/project/project-setup-document-upload.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-setup-wizard-comprehensive.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-setup-wizard.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-summary-format.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/project/project-team-feature.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/project/project-tools-dropdown.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 14 · MERGE 9 · ARCHIVE 1_

### _root

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/admin-pipeline.spec.ts` | 8 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/api.test.ts` | 6 | 0 | MERGE | root e2e should be absorbed into tool-specific suites |
| `frontend/tests/e2e/auth.test.ts` | 4 | 0 | MERGE | root e2e should be absorbed into tool-specific suites |
| `frontend/tests/e2e/chat.test.ts` | 7 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/crawled-pages.spec.ts` | 6 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/demo-form-video.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/emails-page.spec.ts` | 5 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/example.spec.ts` | 2 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/gauntlet-delete-sov.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/homepage-projects-loading.spec.ts` | 2 | 0 | MERGE | root e2e should be absorbed into tool-specific suites |
| `frontend/tests/e2e/library.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/live-verify-all-tools.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/manual-crud-test.spec.ts` | 8 | 6 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/model-selector.test.ts` | 6 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/pipeline-page.spec.ts` | 6 | 0 | MERGE | root e2e should be absorbed into tool-specific suites |
| `frontend/tests/e2e/plugins.spec.ts` | 12 | 2 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/qa-audit-new-columns.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/qa-audit-sidebar.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/seed.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/supabase-manager.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/transcript-formatting-verified.spec.ts` | 1 | 0 | ARCHIVE | root-level generic/one-off spec outside tool ownership |
| `frontend/tests/e2e/verify-bulk-delete.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/verify-cost-codes-load.spec.ts` | 1 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |

_Summary: KEEP 0 · MERGE 4 · ARCHIVE 19_

### auth

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/auth/auth-flow.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/auth/auth-redirect-logout.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/auth/auth.spec.ts` | 5 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 3 · MERGE 0 · ARCHIVE 0_

### chat

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/chat/ai-chat-input-visibility.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/ai-chat-widget.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/chat/chat-rag-e2e.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/chat.spec.ts` | 6 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/docs-chat-nav.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/chat/docs-chat-sidebar.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/procore-docs-chat.spec.ts` | 9 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/chat/simple-chat-ui.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/team-chat.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/chat/westfield-chat-realtime.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 7 · MERGE 3 · ARCHIVE 0_

### mobile

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/mobile/mobile-quick-check.spec.ts` | 3 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/mobile/mobile-responsiveness.spec.ts` | 7 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/mobile/mobile-table-test.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 2 · MERGE 0 · ARCHIVE 1_

### supabase-e2e

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/supabase-e2e/studio/features/api-access-toggle.spec.ts` | 5 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/supabase-e2e/studio/features/assistant.spec.ts` | 1 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/auth-users.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/cron-jobs.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/database.spec.ts` | 14 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/home.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/supabase-e2e/studio/features/index-advisor.spec.ts` | 6 | 5 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/supabase-e2e/studio/features/log-drains.spec.ts` | 2 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/logs.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/supabase-e2e/studio/features/rls-policies.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/sql-editor.spec.ts` | 6 | 5 | ARCHIVE | high skip ratio indicates unstable/obsolete coverage |
| `frontend/tests/supabase-e2e/studio/features/storage.spec.ts` | 17 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/supabase-e2e/studio/features/table-editor.spec.ts` | 13 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 9 · MERGE 2 · ARCHIVE 2_

### ui

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/ui/comprehensive-form-testing.spec.ts` | 12 | 0 | MERGE | fold into canonical regression suite for this tool |
| `frontend/tests/e2e/ui/comprehensive-page-check.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/dropdown-hover-simple.spec.ts` | 1 | 1 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/dropdown-hover-verification.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/form-commitments-company-dropdown.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/form-layout-header.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/ui/generic-table-pages.spec.ts` | 11 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/header-navigation.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/layout-verification.spec.ts` | 7 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/migrated-tables-smoke.spec.ts` | 1 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/ui/migrated-tables.spec.ts` | 10 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/modal-demo-visual.spec.ts` | 5 | 0 | ARCHIVE | ad-hoc verification/debug script; move out of main suite |
| `frontend/tests/e2e/ui/modal-responsiveness.spec.ts` | 9 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/page-tabs-styling.spec.ts` | 1 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |
| `frontend/tests/e2e/ui/page-title-verification.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/portfolio-table-columns.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/ui/sidebar-collapse.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/ui/sidebar-dashboard.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/ui/ui-consistency.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 14 · MERGE 4 · ARCHIVE 1_

### capabilities.spec.ts

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/capabilities.spec.ts` | 4 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### core.spec.ts

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/core.spec.ts` | 1 | 0 | KEEP | aligns to canonical smoke/regression/API coverage |

_Summary: KEEP 1 · MERGE 0 · ARCHIVE 0_

### tasks

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/tasks/tasks-page-fix-verification.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |
| `frontend/tests/e2e/tasks/tasks-page-verification.spec.ts` | 1 | 0 | MERGE | single-assert spec; combine into broader workflow spec |

_Summary: KEEP 0 · MERGE 2 · ARCHIVE 0_

### team

| File | Tests | Skips | Action | Recommendation |
|---|---:|---:|---|---|
| `frontend/tests/e2e/team/team-member-complete-flow.spec.ts` | 3 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |
| `frontend/tests/e2e/team/team-member-selection.spec.ts` | 2 | 0 | KEEP | candidate for canonical tool suite pending dedupe pass |

_Summary: KEEP 2 · MERGE 0 · ARCHIVE 0_

## Execution Order

1. Archive all `ARCHIVE` files (move to `frontend/tests/_archive/YYYY-MM-DD/`).
2. For each tool, create/confirm canonical files: `tool.smoke.spec.ts`, `tool.regression.spec.ts`, optional `tool.api.spec.ts`.
3. Absorb `MERGE` coverage into canonical files and delete merged files.
4. Re-run suite and compare pass rate, runtime, and skip counts before/after.
5. Update `docs/testing/active/test-scenarios-active-v1.md` from reduced scenario set.
