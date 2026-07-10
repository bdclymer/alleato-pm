# Direct-cost line gross backfill — the 27 no-raw-payload residual (project 43)

**Date:** 2026-07-10 · **Project:** Westfield Collective (id 43 / 24-115)

## What this closes

The primary gross backfill (`backfill-direct-cost-line-gross.mjs`, same day) fixed the
Acumatica direct_costs whose net line items could be re-grossed from the bill's stored
`raw_payload.Details`. It correctly **refused to guess** for 27 multi-line documents that
had no `acumatica_ap_bills.raw_payload` and flagged them as
`residual_no_raw_payload_mismatches[]` in `backfill-all.json`. This is that closeout.

## Root cause / provenance

- All 27 are **project 43**, `cost_type = "Invoice"`, `status = "Approved"`.
- **No `acumatica_ap_bills` row exists** for any of them (not a colon/pipe join miss —
  the bills were never synced). They were created by a **one-time manual/seed import**
  (`created_by` = user_profiles `c5015de7…`, "Muhammad" / webiside@gmail.com, 2026-03),
  then later stamped with `acumatica_document_key` + `acumatica_sync_at` (2026-06-12).
- The line items are **NET of retainage**; the header `total_amount` is **GROSS**. Because
  `direct_cost_line_items.line_total` is a GENERATED column (`quantity * unit_cost`),
  budget JTD (which sums `line_total` per cost code) was understated by the retainage —
  the same net-vs-gross class fixed for the live `_sync_ap_bills` path in PR #878.

## Authoritative gross source (with no raw_payload)

The header `total_amount` is the authoritative gross value. Two methods:

- **25 documents — proportional gross-up.** Retainage is uniform per line at exactly 10%
  (verified: every line ÷0.9 yields round pre-retainage values summing to the header with a
  0-cent residual, e.g. `Bill|002525` → 53725/31000/2000/2000/39225/21415 = 149,365).
  `new_unit_cost = round2(unit_cost * header / lineSum)`, residual applied to the largest
  line so `sum(line_total) == header` exactly.
- **2 documents — single-cost-code residual** (`Bill|002855` pay-app deduct with a −$3,000
  line among $0 placeholders; `Debit Adj.|003085` with $0 placeholder lines). Proportional
  scaling is impossible (lineSum ≤ 0). Every line in each shares **one** `budget_code_id`,
  so budget JTD per cost code is identical for any line split — the residual was assigned to
  line 1 with **zero cost-code misattribution risk**. (If lines had spanned >1 code, the row
  would have been flagged, not guessed.)

Only `unit_cost` was updated; the generated `line_total` follows. **Headers were never touched.**

## Result

- **27/27** headers now reconcile to their line items (0 still off).
- **$200,259.74** of understated budget JTD restored across **12 cost codes** on project 43.
- Guardrail `npm run verify:direct-cost-reconciliation` → **PASS**.

## Files

- Fix: `scripts/acumatica/backfill-direct-cost-line-gross-noraw.mjs` (dry-run default; `--apply` used)
- Guardrail: `scripts/verify/verify-direct-cost-reconciliation.mjs` (`npm run verify:direct-cost-reconciliation`)
- Applied report: `backfill-noraw-all.json`
- JTD impact by code: `jtd-impact-by-code-p43.json`
- Visual proof: `PROOF-jtd-regross-p43.html`

## Why no live importer was patched

The only live code writing `direct_cost_line_items` is `_sync_ap_bills`, which already stores
GROSS via `_ap_bill_detail_amounts` and asserts reconciliation before projecting (PR #878).
The net `detail.UnitCost` write at `acumatica_sync.py:1566` targets `acumatica_ap_bill_lines`
(raw net preservation, by design), not the projection. These 27 came from a one-time manual
import, not a recurring path — so the systemic fix is the new standalone reconciliation
guardrail, which catches this class regardless of which importer wrote the rows.
