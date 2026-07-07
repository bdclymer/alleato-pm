# JobPlanner Commitment SOV FK Backfill Evidence

Date: 2026-07-07

## Source

- JobPlanner API:
  - `GET https://api.jobplanner.com/projects`
  - `GET https://api-v2.jobplanner.com/projects/{projectId}/commitments`
  - `GET https://api-v2.jobplanner.com/projects/{projectId}/costcodes`
  - `GET https://api-v2.jobplanner.com/projects/{projectId}/costtypes`
  - `GET https://api-v2.jobplanner.com/commitments/{commitmentId}/lineitems`
- Supabase tables/views:
  - `commitments_unified`
  - `purchase_order_sov_items`
  - `subcontract_sov_items`
  - `project_budget_codes`
  - `cost_code_types`
  - `projects`
  - `companies`

## Applied Backfill

The resolver started with 268 SOV rows that had legacy budget-code text but no
`project_budget_code_id`.

| Table | Rows Updated |
| ----- | ------------ |
| `purchase_order_sov_items` | 54 |
| `subcontract_sov_items` | 146 |
| Total | 200 |

The resolver only updated rows where JobPlanner proved the parent commitment and
the source commitment line item resolved to one exact cost-code/cost-type pair.

## Remaining Rows

After apply, the resolver reported zero additional safe updates.

| Reason | Rows |
| ------ | ---- |
| `missing_project_budget_code` | 38 |
| `weak_parent_match` | 14 |
| `missing_jobplanner_project_match` | 9 |
| `ambiguous_source_cost_types` | 7 |

Independent DB read-back after apply:

| Table | FK-backed rows | Legacy text with missing FK |
| ----- | -------------- | --------------------------- |
| `purchase_order_sov_items` | 255 | 10 |
| `subcontract_sov_items` | 949 | 58 |

## Files

- `dry-run.json`: pre-apply resolver output.
- `apply.json`: apply-mode resolver output.
