# Cross-project mis-attribution audit — Acumatica cost rows

**Date:** 2026-07-09 · **DB:** PM APP Supabase (`lgveqfnpkxvzbnnwuled`)
**Tool:** [`scripts/acumatica/audit-cross-project-attribution.mjs`](../../../../scripts/acumatica/audit-cross-project-attribution.mjs)
**Machine output:** [`REPORT.md`](./REPORT.md) · [`findings.json`](./findings.json) · [`applied-2026-07-09.json`](./applied-2026-07-09.json)

## Origin

Continuation of the 2026-07-09 Noblesville subcontractor-invoice triage. Two Renascent
(waste-hauler) bills — `002571` ("Invoice 292753 : Westfield Collective 10/21/25") and
`002592` ("Invoice 293863 : Westfield Collective Nov4/7, 2025") — were posted to **Goodwill
Noblesville (project 25125)** in both `acumatica_ap_bills` and `direct_costs`, but their
descriptions name **Westfield Collective (project 43, job 24-115)**. The bills are coded to
the wrong *Project* in Acumatica; our sync faithfully mirrors that mis-coding.

## Detection method (conservative by design)

A description "names another project" **only** when it contains that project's **full
multi-token name** (every significant token present) **or** its **project number** (`NN-NNN`).
Single tokens are never matched — this is the crucial safeguard:

> "Westfield" is also a **city**. `Crate Escapes - Westfield Dog Park & Bar` (project 53) is
> **correctly** posted. Requiring the full phrase `westfield collective` (both tokens) avoids
> that whole false-positive class. `GW` is expanded to `GOODWILL` before matching.

A row is flagged only when another project's name/number appears **and** the row's own
project's name/number does **not**. Confidence: **HIGH** (matched via `NN-NNN` number),
**MEDIUM** (full name phrase). `⚠` = names more than one other project (extra-careful review).

Scanned **3,584** `acumatica_ap_bills` + **6,457** acumatica-originated `direct_costs` →
**97 suspects** + 19 assignable unassigned rows. Full table in [`REPORT.md`](./REPORT.md).

## ✅ Fixed — all 4 Westfield Collective mis-attributions → project 43

Re-pointed by exact row id (never by ref — `acumatica_ref_nbr` is **not unique** in
`direct_costs`; e.g. ref `001582` has a proj-53 row *and* a duplicate proj-43 row). The first
two were pre-confirmed by the triage; `002087` + `002125` approved by Megan 2026-07-09.

| ref | vendor | table | row | before | after |
|-----|--------|-------|-----|--------|-------|
| 002571 | RENASCENT | acumatica_ap_bills | #2501 | 25125 Noblesville | **43** |
| 002571 | RENASCENT | direct_costs | 538e46cf… | 25125 | **43** |
| 002592 | RENASCENT | acumatica_ap_bills | #2520 | 25125 Noblesville | **43** |
| 002592 | RENASCENT | direct_costs | be4a008e… | 25125 | **43** |
| 002087 | RENASCENT | acumatica_ap_bills | #2052 | 836 Foundations | **43** |
| 002087 | RENASCENT | direct_costs | 365075d5… | 836 | **43** |
| 002125 | JQOL | acumatica_ap_bills | #2085 | 24109 Bloomington | **43** |

`002125` has **no** `direct_costs` row (the AP bill was never projected — no cost-code detail
lines). Read-back verified: **0** "Westfield Collective"-named rows remain off project 43 in
either table.

## ⚠ Durability caveat + guardrail (READ THIS)

`acumatica_sync._sync_ap_bills` (backend) sets `project_id` on **both** tables from the
Acumatica bill's `Project` field and re-upserts every sync (`on_conflict=external_key` /
`acumatica_document_key`). After the fix, `acumatica_ap_bills.project_code` is **still
`25125`** — the divergence from `project_id=43` is the live proof.

- The sync is **incremental** (`modified_after=cursor`), so these old/closed bills persist
  in practice — **until** the bill is edited in Acumatica again or a **full backfill** runs,
  at which point `project_id` **silently reverts** to 25125.
- **Chosen fix (Megan, 2026-07-09): correct the bill's *Project* in Acumatica** (accounting
  action, refs `002571`, `002592`, `002087`, `002125` → job 24-115 Westfield Collective). That
  is the only permanent fix; once done, the next sync confirms `project_id=43` and never
  reverts. I cannot write to Acumatica AP bills, so this step is on accounting.
- **Not building the in-app override guardrail** (was the alternative) — superseded by the
  upstream fix above.
- **Monitoring:** this audit script **is** the post-deploy monitor — re-run it (or on a cron)
  to detect any re-drift, including a revert if the Acumatica correction is delayed.

## 🙋 Remaining suspects — the wider audit (separate task)

The other ~93 findings include a **separate, larger issue**: a cluster of `direct_costs`
sitting on **project 43** whose descriptions name unrelated projects (Purrs and Gurrs, Bella
Vegas, Craig St, Goodwill Foundations/Decatur/Curb Cut, Crate Escapes…). These look like a
historical catch-all/duplicate import (some are literal duplicates of a correctly-posted
proj-53/others row), **not** the Acumatica mis-coding pattern. Recommend triaging that cluster
as its own task — do **not** bulk-move.

## Re-run

```bash
# full dry-run audit (regenerates REPORT.md / findings.json)
node scripts/acumatica/audit-cross-project-attribution.mjs

# scope to one vendor
node scripts/acumatica/audit-cross-project-attribution.mjs --vendor=RENASCENT

# correct a REVIEWED allowlist only (targets exact row ids; skips ambiguous)
node scripts/acumatica/audit-cross-project-attribution.mjs --apply --refs=002087
```
