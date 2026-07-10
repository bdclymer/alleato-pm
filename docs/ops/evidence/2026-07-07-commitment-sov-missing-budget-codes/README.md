# Commitment SOV Missing Budget Codes Evidence

Date: 2026-07-07

## Outcome

The previous JobPlanner-backed resolver left `38` SOV rows blocked only because
their source-proven cost-code/cost-type pairs did not exist in local
`project_budget_codes`. This slice validated and created those missing canonical
project budget codes from the resolver's candidate ledger, then reran the
link-only SOV resolver.

## Results

| Step | Result |
| ---- | ------ |
| Candidate validation | 26 candidates / 38 SOV rows passed candidate-ledger and current-DB validation |
| Project budget codes created | 26 |
| SOV FK rows updated | 38 total: 5 `purchase_order_sov_items`, 33 `subcontract_sov_items` |
| Final safe resolver updates | 0 |
| Final missing-budget-code candidates | 0 |
| Final unresolved rows | 23 total: 14 `weak_parent_match`, 9 `missing_jobplanner_project_match` |

## Verification Commands

| Check | Command | Result |
| ----- | ------- | ------ |
| Syntax | `node --check scripts/jobplanner/apply-missing-commitment-sov-budget-codes.mjs && node --check scripts/jobplanner/backfill-commitment-sov-fks.mjs` | Pass |
| Current final resolver dry-run | `node scripts/jobplanner/backfill-commitment-sov-fks.mjs --report-missing-budget-codes > /tmp/final-dry-run-current.json` | Pass: 23 unresolved, 0 resolvable updates, 0 missing-budget-code candidates |
| Current row-level DB readback | `node --input-type=module <<'NODE' ...` | Pass: 38 checked rows, 38 linked rows, 0 wrong links, 26 created PBCs still present |
| SOV UI regression | `cd frontend && npx jest src/components/commitments/tabs/__tests__/ScheduleOfValuesTab.columns.test.tsx --runInBand` | Pass: 8/8 |
| Secret scan | `rg -n "sb-[a-z0-9]+-auth-token|access_token|refresh_token|Authorization|Bearer|Cookie:|DATABASE_PASSWORD|TEST_PASSWORD|JOBPLANNER_PASSWORD|SUPABASE_SERVICE|service_role|eyJ|password|secret" docs/ops/evidence/2026-07-07-commitment-sov-missing-budget-codes --glob '!README.md'` | Pass: no matches in machine evidence artifacts |
| Duplicate candidate guard | `/tmp/duplicate-missing-budget-candidates.json` with one duplicated candidate, then `node scripts/jobplanner/apply-missing-commitment-sov-budget-codes.mjs --candidate-file=/tmp/duplicate-missing-budget-candidates.json --output=/tmp/duplicate-guard.json` | Pass: failed before DB validation/mutation with `Duplicate project_budget_code candidate` |

## Guardrails

- The rejected `--create-missing-budget-codes` mode in the JobPlanner resolver
  remains disabled.
- `apply-missing-commitment-sov-budget-codes.mjs` validates every candidate
  before insert:
  - project exists
  - cost code exists
  - cost type exists and code matches
  - no duplicate `(projectId, costCodeId, costTypeId)` candidate tuple exists in the input ledger
  - no active or inactive duplicate default-subjob PBC exists
  - every SOV row still exists under the same project
  - every SOV row still has `project_budget_code_id IS NULL`
  - every SOV row has `source_cost_type_and_amount` proof metadata from the JobPlanner-backed resolver ledger
- The existing SOV resolver performed the FK update after PBC creation and still
  reported `createdBudgetCodes: 0`.

## Files

- `candidate-validation-dry-run.json`: pre-mutation validation of all 26 candidates and 38 rows.
- `candidate-creation-apply.json`: inserted 26 active `project_budget_codes`.
- `post-budget-code-create-dry-run.json`: resolver dry-run after PBC creation, proving 38 rows became resolvable.
- `sov-backfill-apply.json`: applied 5 PO and 33 subcontract SOV FK updates.
- `final-dry-run.json`: final resolver state, with 0 remaining safe updates and 0 missing-budget-code candidates.
- `post-apply-row-readback.json`: row-level proof that all 38 target SOV rows link to the created PBC rows with 0 wrong links.
