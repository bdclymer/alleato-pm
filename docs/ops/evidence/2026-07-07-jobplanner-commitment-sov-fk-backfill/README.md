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
| `purchase_order_sov_items` | 56 |
| `subcontract_sov_items` | 151 |
| Total | 207 |

The resolver only updated rows where JobPlanner proved the parent commitment and
the source commitment line item resolved to one exact cost-code/cost-type pair.
The final 7 updates were link-only updates into existing `project_budget_codes`
where JobPlanner proved a single source cost type for the cost code, but the
source line amount was zero while the local SOV amount was nonzero. No
`project_budget_codes` rows were created by the final resolver.

## Rejected Create-Mode Attempt

An intermediate `--create-missing-budget-codes` attempt was reviewed and
rejected because it could create canonical budget master data from heuristic
source matches. That data was rolled back:

| Rolled Back Item | Count |
| ---------------- | ----- |
| PO SOV FKs to newly created PBC rows | 5 |
| Subcontract SOV FKs to newly created PBC rows | 33 |
| Newly created `project_budget_codes` rows | 26 |

Evidence: `rollback-unsafe-create-mode.txt`.

## Remaining Rows

After the final link-only apply, the resolver reported zero additional safe
updates.

| Reason | Rows |
| ------ | ---- |
| `missing_project_budget_code` | 38 |
| `weak_parent_match` | 14 |
| `missing_jobplanner_project_match` | 9 |

Independent DB read-back after apply:

| Table | FK-backed rows | Legacy text with missing FK |
| ----- | -------------- | --------------------------- |
| `purchase_order_sov_items` | 257 | 8 |
| `subcontract_sov_items` | 954 | 53 |

`project_budget_codes` total remained `3466` after rollback and final apply.

## DB-Level Workflow Contract Verification

`financial-workflow-verification.json` passed 26 checks against a disposable
project and cleaned up after itself. It verified:

- creating a subcontract and FK-backed subcontract SOV
- creating a purchase order and FK-backed PO SOV
- text-only nonzero SOV inserts fail for both PO and subcontract rows
- inactive `project_budget_code_id` inserts fail for both PO and subcontract rows
- wrong-project `project_budget_code_id` inserts fail for both PO and subcontract rows
- creating a change event and budget-linked change event line
- creating a prime PCO and prime change order with promotion linkage
- creating a commitment PCO and official commitment change order with line item
- FK readback joins for PO and subcontract SOV rows
- zero-row cleanup readback for every disposable DB record

## Route-Level Workflow Verification

`financial-api-workflow-verification.json` passed 12 checks through real
authenticated Next API routes on `http://localhost:3001` and cleaned up after
itself. It verified:

- `POST /api/projects/31/purchase-orders` creates a purchase order with an
  FK-backed SOV line
- `POST /api/projects/31/subcontracts` creates a subcontract with an FK-backed
  SOV line
- `POST /api/projects/31/change-events` creates a change event
- `POST /api/projects/31/change-events/{id}/line-items` creates a budget-linked
  line item
- `POST /api/projects/31/change-events/add-to-pco` creates and links both prime
  and commitment PCOs with copied `pco_line_items`; the verifier asserts one
  link and one line item for each PCO
- the prime and commitment PCO promote endpoints create official change orders
  and copy one line item into each promoted change order
- zero-row cleanup readback for every disposable route-created record

## Files

- `dry-run.json`: pre-apply resolver output.
- `apply.json`: apply-mode resolver output.
- `link-only-amount-unmatched-dry-run.json`: 7 extra existing-PBC updates found.
- `post-link-only-dry-run.json`: final dry-run with 0 remaining safe updates.
- `missing-budget-code-candidates.json`: report-only ledger for 26 missing PBC candidates across 38 rows.
- `financial-workflow-verification.json`: disposable DB-level workflow creation and FK guardrail proof.
- `financial-api-workflow-verification.json`: disposable route-level workflow proof through real Next API routes.
