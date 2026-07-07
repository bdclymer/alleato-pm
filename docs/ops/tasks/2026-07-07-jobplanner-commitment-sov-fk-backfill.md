# Task: JobPlanner Commitment SOV FK Backfill

Status: Complete
Owner: Codex
Created: 2026-07-07
Linear Issue: Blocked - Linear issue creation tool unavailable in this session; only Linear comment tools are exposed.
Related Handoff: None

## Objective

Use live JobPlanner commitment line-item data as the source of truth to resolve
remaining legacy purchase-order and subcontract SOV rows that still have
`project_budget_code_id IS NULL`, then backfill only rows whose source mapping
is proven by JobPlanner cost code and cost type.

## Scope Checklist

- [x] Classify as full task process.
- [x] Create task markdown before broad DB/data repair.
- [x] Regenerate Supabase database types before DB-backed work.
- [x] Pull live JobPlanner project, commitment, cost-code, and cost-type data.
- [x] Build a dry-run resolver for unresolved PO and subcontract SOV rows.
- [x] Apply only exact JobPlanner-backed mappings.
- [x] Leave ambiguous or unmatched rows unchanged with row-level evidence.
- [x] Verify DB read-back for all applied rows.
- [x] Avoid unrelated dirty checkout changes.

## Verification Checklist

- [x] Dry-run counts reconcile with current unresolved DB counts.
- [x] Applied row count equals DB read-back FK-backed delta.
- [x] No applied row has a missing `project_budget_code_id` after update.
- [x] No row is mapped without a JobPlanner commitment line-item proof.
- [x] Remaining unresolved rows are quantified and classified.

## Evidence Log

| Check | Result | Notes |
| ----- | ------ | ----- |
| DB types preflight | Pass | Ran `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`; command succeeded with existing inbucket deprecation warning. |
| Exact PO repair | Pass | Commitment `b27bee18-9d25-4d31-a54f-145700317e02` matched JobPlanner project `3729`, commitment `3119`; two visible PO SOV rows now link to `21-1313 / S / Wet-Pipe Sprinkler System - Subcontract`. |
| Dry-run resolver | Pass | `docs/ops/evidence/2026-07-07-jobplanner-commitment-sov-fk-backfill/dry-run.json` found 200 JobPlanner-proven updates from 268 unresolved rows. |
| Apply resolver | Pass | `docs/ops/evidence/2026-07-07-jobplanner-commitment-sov-fk-backfill/apply.json` applied 54 PO rows and 146 subcontract rows. |
| DB post-apply counts | Pass | `purchase_order_sov_items`: 255 FK-backed, 10 legacy-text rows still missing FK. `subcontract_sov_items`: 949 FK-backed, 58 legacy-text rows still missing FK. |
| Post-apply resolver rerun | Pass | Resolver returned 0 additional safe updates after apply; remaining blockers are 38 missing project budget codes, 14 weak parent matches, 9 missing JobPlanner project matches, and 7 ambiguous source cost types. |

## Failure Analysis

Cause: the previous deterministic backfill could only use local legacy budget-code
text. Rows with multiple typed candidates, missing project budget codes, or
blank legacy data could not be safely mapped without source-system context.

Detection gap: local-only checks correctly refused ambiguous mappings, but the
workflow did not then consult JobPlanner for the source commitment line-item
cost type.

Prevention: this task only applies rows where JobPlanner line items prove the
exact cost-code and cost-type pair, then writes the FK to the matching
`project_budget_codes.id`.

## Final Status

- [x] JobPlanner-backed resolver implemented.
- [x] Dry-run and apply evidence captured.
- [x] 200 SOV rows backfilled with real `project_budget_code_id` values.
- [x] Remaining unresolved rows quantified by blocker class.

## Remaining Risks

- `38` rows have a source-proven cost-code/cost-type but no matching local
  `project_budget_codes` row, so those need budget-code setup before FK backfill.
- `14` rows did not meet the parent-commitment confidence threshold.
- `9` rows are on local projects that did not match a JobPlanner project.
- `7` rows matched a parent/source cost code but JobPlanner still has multiple
  source cost types, so they need manual source review.
