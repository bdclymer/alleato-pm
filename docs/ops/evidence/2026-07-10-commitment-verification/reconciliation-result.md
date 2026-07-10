# Commitment Numbering Reconciliation — Result

**Date:** 2026-07-10
**Trigger:** `docs/ops/evidence/2026-07-10-commitment-verification/report.md` (audit: 43 JP commitments missing-in-app, 101 app rows on legacy Acumatica numbers).
**Source of truth:** JobPlanner. **Target:** Supabase PM APP (`lgveqfnpkxvzbnnwuled`), production.
**Mode:** live writes to production DB via `scripts/jobplanner/*` (established pattern — scripts are the record).

## Ground-truth correction

The `project_jobplanner_commitment_sov_import` memory claimed a "full rollout done 2026-07-08"
with all JP totals tying. The live DB did **not** reflect that — a batch dry-run of
`reconcile-commitments.mjs` against the live DB matched the audit exactly (adopt=41, create=16,
acu-only=111). The 2026-07-08 apply did not persist to this DB. The reconciler dry-run against
the live DB is the authoritative ground truth used here.

Also: both audit "dollar tie-out FAIL" rows were **stale** — in the live DB they already tie
(Vermillion `SC-5296-0014` = $50,328; Brookville `SC-8262-0003` = $313,268). No SOV correction
or $499k drop was needed.

## What was done

Ran `reconcile-commitments.mjs --reconcile-only --apply` per project (new flag added this run:
applies only ADOPT / CREATE / REACTIVATE and **skips** REBUILD_SOV of JP-numbered rows that
already tie — those rows carry $6.71M of live `billed_to_date` across 206 SOV rows + 186 invoices
+ 157 payments, which a blanket rebuild would have wiped for zero reconciliation benefit).

| Action | Count | Meaning |
|---|--:|---|
| **ADOPT** (re-key Acumatica `SC-000xxx` twin → JP number) | 41 | preserves row id → invoices/payments stay linked |
| — of which carried billing | 18 | verified 18/18 invoices+payments still attached |
| **CREATE** (genuine gap, no twin) | 16 | includes the three big ones below |
| **REBUILD skipped** (already tied, untouched) | ~207 | billing preserved |
| SOV lines written (adopt+create) | 132 | |
| Errors | 0 | |

Then `import-commitment-billed.mjs --apply` restored `billed_to_date` on the re-keyed SOV from
Acumatica AP bills (idempotent; already-correct rows unchanged).

### Genuine gaps imported (tie to JP exactly)
- **Vermillion Rise `SC-5296-0026` — $1,363,773.25** (Grounded Solutions) — the audit's flagship gap.
- **Exol Morrisville `SC-8344-0014` — $2,693,611.00** (R.J. Skelding Co).
- **Brookville `SC-8262-0026` — $447,005.10** (JTP Excavation).

## Cost-type suffix backfill (audit's systemic finding)

`backfill-sov-budget-code-cost-type.mjs --apply`: 223 SOV lines whose `budget_code` held the base
cost code (e.g. `26-1000`) now carry the native `CODE.TYPE` suffix (e.g. `26-1000.S`), sourced
from each row's own `project_budget_code_id` → cost type. **Text-only** (no amount/FK/billing
touch). Idempotent (re-run = 0 remaining).

## Verification (money-domain)

- **Billing preservation:** 18/18 billing-carrying adopts — JP row active, old Acumatica number
  gone (re-keyed, not duplicated), all invoices **and** payments still attached. **0 orphans.**
- **Tie-out:** 57/57 adopted+created commitments sum to their JP header total to the cent. **0 FAIL.**
- **Visual proof (production, live):**
  - `proof-mclane-SC-8509-0002.png` — re-keyed from Acumatica `SC-000385`; Invoices $5,000.00,
    SOV budget code shows `50-7000.S` (typed), Total ties $5,000.
  - `proof-vermillion-SC-5296-0026.png` — created $1,363,773.25, vendor Grounded Solutions, ties to JP.

## Deferred to Megan (not auto-applied — money rows)

`classify-acu-only-duplicates.mjs` (see `acu-only-classification.json`):
- **9 zero-billing acu rows** exactly duplicate a now-JP row's total+vendor (~$303k) but are all
  **N:1** (2–3 acu rows per 1 JP row) → ambiguous, could be distinct real commitments → NOT
  auto-retired. These inflate project commitment totals (double-count) until reviewed.
- **99 genuine ACU_ONLY** ($13.9M, many with active billing) — Acumatica commitments with no JP
  twin; the pre-existing OPEN "acu-only human review" item.
- **5 TEST rows** (`SC-E2E-*`, `SC-GAUNTLET-*`, `PO-001`, etc.) on Vermillion — test-data pollution, safe to purge.

## Guardrails added (per Core Principles)
- `--reconcile-only` flag prevents the billed_to_date-wipe regression on already-tied rows.
- Cost-type backfill is idempotent + text-only + base-code-guarded (only appends a suffix, never rewrites a code).
- Acu-only de-dup is dry-run-by-default and retires only unambiguous zero-billing rows on `--apply` (none qualified this run).
