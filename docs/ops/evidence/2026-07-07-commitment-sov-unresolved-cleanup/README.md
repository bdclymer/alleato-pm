# Commitment SOV Unresolved Cleanup Ledger

Generated: 2026-07-07T06:01:15.266Z

## Summary

| Metric | Count |
| --- | ---: |
| Total unresolved SOV rows | 306 |
| Projects represented | 26 |
| Purchase-order SOV rows | 73 |
| Subcontract SOV rows | 233 |

## Reason Counts

| Reason | Count | Action |
| --- | ---: | --- |
| no_project_budget_code_match | 142 | Create/activate the missing project budget code or mark the row intentionally unmapped. |
| ambiguous_typed_matches | 128 | Manual selection required: choose the specific cost type candidate. |
| blank_code_nonzero_amount | 29 | Source data repair required: assign a project budget code before this financial amount can be trusted. |
| blank_code_zero_amount | 7 | Can remain unmapped if row is intentionally zero-value, otherwise assign a project budget code. |

## Table By Reason

| Table + reason | Count |
| --- | ---: |
| purchase_order_sov_items:ambiguous_typed_matches | 49 |
| purchase_order_sov_items:blank_code_nonzero_amount | 5 |
| purchase_order_sov_items:blank_code_zero_amount | 2 |
| purchase_order_sov_items:no_project_budget_code_match | 17 |
| subcontract_sov_items:ambiguous_typed_matches | 79 |
| subcontract_sov_items:blank_code_nonzero_amount | 24 |
| subcontract_sov_items:blank_code_zero_amount | 5 |
| subcontract_sov_items:no_project_budget_code_match | 125 |

## Artifacts

- Row ledger: `unresolved-commitment-sov-ledger.csv`
- Machine summary: `unresolved-commitment-sov-summary.json`

## Automated Backfill Decision

No rows classified as `safe_typed_match_remaining`. No additional automated FK backfill should run from this ledger without a new deterministic rule.
