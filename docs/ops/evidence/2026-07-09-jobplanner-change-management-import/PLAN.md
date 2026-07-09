# Job Planner → App: Change Management Import Plan (CR → PCCO/CCO)

**Date:** 2026-07-09  **Status:** Draft (verification done, not yet built)

## Why this order matters

Job Planner's **change request** is the parent record and the ONLY place the
CR→CO linkage lives. Verified live on JP projects 8189 (GW Allisonville) and
5092 (Noblesville):

- `/projects/{id}/changerequests` returns CRs, each with a `lineItems[]` array.
- **Each CR line item carries the fork:** `changeRequestId` + (`pccoId`/`pccoNumber`
  for the prime side) OR (`ccoId`/`ccoNumber` for the commitment side), plus
  `costCodeId`, `costTypeId`, `vendorId`, `amount`, `revenue`.
- The commitment-CO (`CCO`) and prime-CO (`PCCO`) records themselves have **no
  back-reference to the change request**. Import COs without CRs = orphaned COs.

So: **import change requests + their line items FIRST**, then the PCCOs/CCOs are
wired via `li.pccoId` / `li.ccoId`.

## App destination — Subsystem A (the split PCO model)

The app has two PCO subsystems. JP's structure (CR line item forks to prime PCCO
**or** commitment CCO) is the **split model = Subsystem A**, which is a 1:1 fit and
even carries `pco_line_items.change_event_line_item_id` — the exact analog of the
JP CR line item. (Subsystem B — `potential_change_orders` unified PCO — is NOT the
target.)

```
JP Change Request (CR-####-####)          →  change_events (+ change_event_line_items)
   li.pccoId → PCCO-####-####             →  prime_contract_pcos      (Subsystem A prime PCO)
   li.ccoId  → CCO-####-####              →  commitment_pcos          (Subsystem A commitment PCO)
   CR ↔ PCO junction                      →  change_event_pco_links (pco_type prime|commitment)
   per-line cost                          →  pco_line_items (pco_type, change_event_line_item_id back-ref)
   (optional) executed CO                 →  prime_contract_change_orders / contract_change_orders  [Acumatica-owned]
```

Canonical tables confirmed (all live in the UI):
- `change_events` (id uuid, `number`, `prime_contract_id`, `potential_change_order_id`, `origin`/`origin_id`)
- `change_event_line_items` (`commitment_id`, `commitment_line_item_id`, `commitment_type`, `contract_id`, `budget_code_id`, `vendor_id`, `cost_rom`, `revenue_rom`, `unit_cost`, `quantity`)
- `prime_contract_pcos` (id uuid, `prime_contract_id` REQUIRED, `pco_number`, `total_amount`, `status`, `executed`, `promoted_to_co_id`→prime_contract_change_orders.id)
- `commitment_pcos` (id uuid, `commitment_id` REQUIRED, `commitment_type` subcontract|purchase_order, `pco_number`, `total_amount`, `status`, `promoted_to_co_id`→contract_change_orders.id)
- `pco_line_items` (shared; `pco_id` uuid, `pco_type` prime|commitment, `change_event_id`, `change_event_line_item_id`, `budget_code_id`, `amount`, `unit_cost`, `quantity`)
- `change_event_pco_links` (`change_event_id`, `pco_id` uuid, `pco_type` prime|commitment)

## Current data state (queried live 2026-07-09)

| Table | rows | Notes |
|---|---|---|
| change_events | 70 | 17 already on Noblesville as `CE-5092-####` (JP proj 5092) — **collision risk** |
| change_event_line_items | 56 | |
| change_event_pco_links | 12 | |
| prime_contract_pcos | (Subsystem A) | near-empty — greenfield |
| commitment_pcos | 2 | greenfield |
| pco_line_items | 3 | greenfield |
| prime_contract_change_orders | 157 | **Acumatica-owned** (`acumatica_external_key`); 1 on Noblesville |
| contract_change_orders | 172 | **Acumatica-owned** commitment executed CO; 27 on Noblesville |

**Two implications:**
1. The PCO layer (Subsystem A) is essentially empty → importing JP PCCOs/CCOs there
   is low-collision and safe.
2. The **executed**-CO tables are already populated from Acumatica. Do NOT write JP
   rows there. Instead set the PCO's `promoted_to_co_id` to an existing executed CO
   only on a confident twin match (number/amount); else leave null.
3. **Noblesville already has `CE-5092-####` change events** (hand/AI-entered mirror of
   JP). JP CRs are `CR-5092-####`. The importer MUST reconcile (adopt existing CE vs
   create) to avoid doubling change events — same pattern as the commitment adopt-twin.

## Idempotency — needs a migration

No change-management table has a `jobplanner_*`/`source_system` column (only
`acumatica_external_key` on the executed COs). Add, mirroring the
`punch_items.jobplanner_punchlist_item_id` precedent:

```
ALTER TABLE change_events            ADD COLUMN jobplanner_id bigint;
ALTER TABLE change_event_line_items  ADD COLUMN jobplanner_id bigint;
ALTER TABLE prime_contract_pcos      ADD COLUMN jobplanner_id bigint;
ALTER TABLE commitment_pcos          ADD COLUMN jobplanner_id bigint;
ALTER TABLE pco_line_items           ADD COLUMN jobplanner_id bigint;
ALTER TABLE change_event_pco_links   ADD COLUMN jobplanner_id bigint;
-- + partial unique indexes WHERE jobplanner_id IS NOT NULL
```

## Field mapping

### change_events  ← JP `changerequests[]`
| app column | JP source |
|---|---|
| project_id | app project (JP→app map) |
| number | JP `number` ("CR-8189-0006") — or adopted existing `CE-…` on reconcile |
| title / description | JP `title` / `description` |
| scope | JP `scope` (int) → app text ("In Scope"/"Out of Scope"/"TBD") |
| type | "Owner Change" (CR is the owner/revenue side) |
| status | JP `statusId` → app status (8 → Approved/Executed; else Open) |
| prime_contract_id | resolve JP `primeContractNumber` → `prime_contracts.id` |
| expecting_revenue | JP `revenue` > 0 or `revenueSource` set |
| origin / origin_id | "JobPlanner" / JP `id` |
| jobplanner_id | JP `id` (idempotency) |

### change_event_line_items ← JP CR `lineItems[]`
| app column | JP source |
|---|---|
| change_event_id | parent CE |
| description | li `description` |
| commitment_id | resolve li `ccoNumber`'s commitment → app subcontract/PO id |
| commitment_type | SC→subcontract, PO→purchase_order |
| contract_id | prime contract id (prime lines) |
| budget_code_id | resolve li `costCodeId`+`costTypeId` → `project_budget_codes.id` (same chain as SOV importer) |
| vendor_id | resolve li `vendor.companyName` → `companies.id` (same resolver as commitments importer) |
| cost_rom | dollars(li `amount`) |
| revenue_rom | dollars(li `revenue`) |
| unit_cost / quantity | li `unitPrice` / `quantity` |
| sort_order | li `sortOrder` |
| jobplanner_id | li `id` |

### prime_contract_pcos ← JP `primecontractchangeorders[]` (+ CR lines with `pccoId`)
| app column | JP source |
|---|---|
| prime_contract_id | resolve PCCO's prime contract → `prime_contracts.id` |
| pco_number | JP `number` ("PCCO-5092-0007") |
| title / description / total_amount | JP (amount = dollars, cents→$) |
| status / executed | JP `statusId` |
| promoted_to_co_id | confident twin in `prime_contract_change_orders` else null |
| jobplanner_id | JP PCCO `id` |

### commitment_pcos ← JP `commitmentchangeorders[]`
| app column | JP source |
|---|---|
| commitment_id | resolve JP `commitmentNumber` → subcontract/PO id |
| commitment_type | SC→subcontract, PO→purchase_order |
| pco_number | JP `number` ("CCO-8189-0008") |
| title / description | JP `description` |
| change_reason | JP `changeReason` |
| contract_company | JP `contractedContact.companyName` |
| total_amount | dollars(JP `totalAmount`) |
| status / executed | JP `statusId` |
| promoted_to_co_id | confident twin in `contract_change_orders` else null |
| jobplanner_id | JP CCO `id` |

### pco_line_items ← JP CR `lineItems[]` (one per li that has `pccoId` or `ccoId`)
| app column | JP source |
|---|---|
| pco_id | prime_contract_pcos.id (li.pccoId) or commitment_pcos.id (li.ccoId) |
| pco_type | "prime" if li.pccoId else "commitment" |
| change_event_id | parent CE |
| change_event_line_item_id | the CE line item created for this JP li |
| budget_code_id | resolved cost code |
| amount / unit_cost / quantity | li |
| jobplanner_id | li `id` |

### change_event_pco_links ← distinct (CR, pcco|cco) from CR lines
| app column | JP source |
|---|---|
| change_event_id | CE |
| pco_id | prime_contract_pcos.id or commitment_pcos.id |
| pco_type | prime | commitment |

## Import order (single idempotent script, dry-run default)

**Step 0 — RECONCILE FIRST (read-only, no writes). This is the whole safety mechanism.**
Without it, JP's `CR-####` insert alongside the existing `CE-####` rows and every change
event (and its cost) is duplicated. Verified on Noblesville: 16/17 existing `CE-5092-####`
already have a line item with a real cost amount, and none has a `jobplanner_id`.

For every JP CR, match against existing app change_events on the project, in priority order:
  1. `jobplanner_id` already stamped → re-run/update-in-place.
  2. **Number-sequence match** — JP `CR-5092-0006` ↔ existing `CE-5092-0006` (trailing seq).
  3. **Title + amount corroboration** — confirm the sequence match; a coincidental seq must
     not merge two different changes.
Classify each CR: **ADOPT** (match → stamp `jobplanner_id` on the existing row, backfill only
missing linkage; never insert), **CREATE** (no match → new row), **FLAG** (ambiguous → human
review, never guessed). Do the same twin-check for PCCO/CCO vs the Acumatica executed COs.
Emit `adopt/create/flag` counts + matched pairs to this evidence folder. **No writes until reviewed.**

Then, on `--apply`, obey those decisions:
1. **Resolve maps** — JP→app project, prime contract by number, commitments by number,
   cost codes/types → budget codes, vendors by company name. (All already imported.)
2. **Upsert PCO headers** — `prime_contract_pcos` (JP PCCOs) + `commitment_pcos` (JP CCOs),
   keyed on `jobplanner_id`.
3. **Apply change_events per Step-0 decision** — ADOPT updates the existing `CE-####` row
   in place (stamp `jobplanner_id`, backfill linkage) and reconciles its existing line
   item against the JP line (match by cost code/amount — do NOT append a duplicate line);
   CREATE inserts under the JP `CR-####` number with its `lineItems`.
4. **Wire junctions** — `change_event_pco_links` + `pco_line_items`, using `li.pccoId`/`li.ccoId`
   → step-2 PCO ids and step-3 line-item ids.
5. **Link executed COs, never create** — set `promoted_to_co_id` on each PCO to the matching
   Acumatica `prime_contract_change_orders`/`contract_change_orders` row on a confident
   twin (number/amount). Writing JP rows into those Acumatica-owned tables would double 300+
   executed COs — forbidden.

## Guardrails (per CLAUDE.md core principles)
- Dry-run default; `--apply`; `--project=` scope; `--jp=`.
- Abort if a CR line references a `pccoId`/`ccoId` whose header we did not import.
- Abort if Σ(CR line amounts) ≠ CR header `totalAmount` (± rounding).
- Emit a **dedup report** of JP CRs vs existing app `CE-####` change events before writing.
- Idempotent: re-run updates in place on `jobplanner_id`; not transactional (re-run recovers).
- Regression: add a smoke check that every imported CE line with a `pccoId`/`ccoId` has a
  matching `change_event_pco_links` + `pco_line_items` row (the linkage is the whole point).

## Client additions (`frontend/src/lib/jobplanner/client.ts`)
- Add `getChangeRequests(projectId)` → `GET {V2}/projects/{id}/changerequests` (returns
  headers + embedded `lineItems`). Add `JpChangeRequest` + `JpChangeRequestLineItem` types.
- Reuse existing `getCommitmentChangeOrders` / `getPrimeContractChangeOrders` for PCCO/CCO
  header detail (status, dates, contractedContact) — the CR lineItems already embed
  `pccoNumber`/`ccoNumber`/costcode/vendor, but the header endpoints add status + contact.

## Pilot target
**Noblesville (app 25125 / JP 5092)** — richest example: 19 CRs, 7 PCCOs, 30 CCOs, several
fully-promoted CR→PCCO+CCO chains (e.g. changeRequestId 1915 → PCCO-5092-0007 + CCO-5092-0013).
Also the collision case (existing `CE-5092-####`), so it exercises the reconcile path.
