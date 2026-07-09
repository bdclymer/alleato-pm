# contract_change_orders.project_id backfill — root cause, resolution, guardrail

**Date:** 2026-07-09  ·  **DB:** PM APP (`lgveqfnpkxvzbnnwuled`)  ·  **Applied:** yes (service-role)

## Symptom
137 of 172 rows in `contract_change_orders` (commitment/subcontract executed-CO table)
had `project_id = null` → invisible per-project, un-twinnable to Job Planner CCOs.

## Why the documented chain failed
The task's assumed path `contract_change_orders.contract_id → commitments_unified.id →
project_id` **dead-ends**: all 137 orphans share just **2** `contract_id`s
(`20906925…` ×133, `d0132bca…` ×4) and **neither exists** in `subcontracts`,
`purchase_orders`, `prime_contracts`, or `commitments_unified`. Acumatica synced the
change orders (and 23 SOV lines) for a commitment header that was never synced.
`acumatica_external_key` (`ChangeOrder|000430`) encodes only the CO number, not a project.

## The working resolution — the Acumatica-native record carries the project
`contract_change_orders.acumatica_external_key` → `acumatica_change_orders.external_key`,
whose `project_id` + `project_code` are authoritative. **132/137** matched, all resolving
to **project 43 (Westfield Collective / Acumatica 24-115)**, with three agreeing signals:
- `acumatica_change_orders.project_id = 43` (native)
- `acumatica_change_orders.project_code = 24115` → `projects.acumatica_project_id = 24115` → id 43
- description `CCO-2403-####` (JP project 2403 = Westfield) on 131/132

**5 rows FLAGGED, left null** (no `acumatica_external_key`, no project signal — seed/demo):
`CCO-001..004` (cluster `d0132bca`: Rock excavation / CRAC / generator / polished concrete)
and `000582` ("re-inserted", $0). These need human assignment.

## Result (read-back)
| project_id | rows | Σ amount |
|---|---|---|
| 43 (backfilled) | 132 | 1,204,203.55 |
| 25125 | 27 | 156,566.79 |
| 767 | 3 | 0.00 |
| 67 | 2 | 0.00 |
| 754 | 1 | 2,500.00 |
| 876 | 1 | 500.00 |
| 1010 | 1 | 475.00 |
| **(null)** | **5** | 477,732.00 |

The 35 pre-existing tagged rows were untouched. 132 updated, 0 errors.

## Guardrail (Core Principles: no recurring bug without one)
Root cause in the writer: `acumatica_sync.py::_project_commitment_change_orders()` built the
`contract_change_orders` upsert row **without `project_id`**, even though its source query
already filters `acumatica_change_orders` to `project_id IS NOT NULL`. Fixed to stamp
`"project_id": row.get("project_id")` at write time, so a missing commitment header can no
longer orphan a CO through this path. (This is a *should-have-been-prevented* class →
validation at the write boundary.)

- Backfill script (dry-run default, idempotent): `scripts/jobplanner/backfill-cco-project-id.mjs`
- Writer fix: `backend/src/services/acumatica_sync.py` (`_project_commitment_change_orders`)
- Follow-up: assign the 5 flagged rows to a project (or delete if seed/demo).
