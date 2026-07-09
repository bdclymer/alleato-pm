# Cross-project attribution — REVIEWED dry-run (per-row disposition)

Reviewed: 2026-07-09 · Analyst pass over the 90 audit findings (separate from the 4 Westfield
Collective bills already fixed in PR #774). Read-only — **nothing applied.**

Source data: `findings.json` (audit) → `triage.json` (duplicate-vs-repoint auto-classification,
each verified against the suggested project) → `reviewed.json` (this pass, with manual overrides).

## Bottom line

The 90 findings split into six buckets. **They are NOT safe to bulk-move**, and the audit
script's `--apply` (which only *re-points*) would actively **double-count** the 23 duplicate
rows if pointed at them. Nine flagged rows are outright **false positives**.

| Bucket | Rows | $ (abs) | Safe action | Can the script's `--apply` do it? |
|--------|-----:|--------:|-------------|-----------------------------------|
| **REPOINT** — genuine mis-attribution, no counterpart on the correct project | 29 refs | ~$484k | re-point `project_id` | ✅ yes (row-id targeted) |
| **DUPLICATE → SOFT-DELETE** — a **live** counterpart already exists on the correct project | 23 rows | ~$884k | soft-delete the stray copy (`is_deleted=true`) | ❌ **no** — `--apply` re-points → would create a 2nd copy on the correct project |
| **ASSIGN** — `project_id` is NULL; description names exactly one project | 19 refs | ~$102k | set `project_id` | ⚠️ no — `--apply` guard `eq(project_id, current)` can't match NULL |
| **FALSE_POSITIVE — LEAVE** — already correctly posted; audit matched on a typo | 9 | — | none | n/a |
| **HOLD — AMBIGUOUS** — two distinct projects share a name | 3 | — | manual | n/a |
| **HOLD — JUDGMENT** — cost-allocation call (employee travel-to) | 7 | — | manual | n/a |

### Durability (proven, not assumed)
`backend/src/services/acumatica_sync.py` re-derives `project_id` from the Acumatica **Project**
field on every upsert — and for `direct_costs` it **hard-codes `is_deleted: False`** (line 1208,
upsert `on_conflict="acumatica_document_key"`; `acumatica_ap_bills` upsert `on_conflict="external_key"`,
line 1216). So **both** a DB re-point **and** a DB soft-delete get **reset** whenever the sync
re-touches that bill. Sync is incremental (`modified_after` cursor), so a correction persists
day-to-day but reverts on any future edit of the bill or a full backfill. **The authoritative,
durable fix is upstream: correct the bill's Project (and delete the stray duplicate) in
Acumatica accounting** — the same posture Megan chose for the Westfield 4.

---

## FALSE POSITIVES — leave as-is (9 rows)

`SEVHILLS` subcontractor pay-apps for **832 "Core Mark Atlanta" (25-101, GA)**. The description
misspells "Atlanta" as **"Altanta"**, so the audit's own-project token match failed and it
suggested **829 "Core Mark" (24-107)** — a *different, real* project. The rows are **correctly
posted on 832**. Do not move.

- refs: `001910, 002009, 002252, 002253, 002254, 002256` (6 ap_bill + related direct_cost rows = 9 findings)
- Guardrail: audit should treat a fuzzy own-name match (1-char edit) as "own project named" to suppress this class.

## HOLD — AMBIGUOUS (3 rows) — need Megan to pick the project

Two distinct Bloomington projects exist: **47 "Goodwill Bloomington Excel" (25-124)** and
**24109 "Goodwill Bloomington" (24-109)**. Descriptions say only "GW Bloomington".

- `003671` ($4,500, KIMHOR) and `PM00010358` (−$26,429.38, Pay App 2) currently on **47** → audit suggests **24109**. Which Bloomington?

## HOLD — JUDGMENT (7 rows) — allocation call

Employee travel **to** Radial Martinsville ("Kebba Trim to Radial Martinsville" — Airbnb / Uber /
Delta) currently on **796 "Radial Avon IN" (25-114)**, audit suggests **25113 "Radial
Martinsville VA"**. Travel-to-site costs can legitimately sit on either the home project or the
destination project — accounting call, not a data bug.

- refs: `PM00007288, PM00007293, PM00007294, PM00007296, PM00007297, PM00007298, PM00007299` (~$615 total)

---

## REPOINT — genuine mis-attribution (29 refs, ~$484k)

No counterpart on the suggested project → the row is simply on the wrong project. Safe for the
script's row-id-targeted `--apply` (subject to the revert caveat above). Examples:

- `003492` PO-8530-0001 Champagne Ace Pay App 1 — on **1008 Champaign** → **1028 Champagne Ace IL** (number match, HIGH).
- `003456` Standard Toilet — Goodwill Noblesville — on **754 Allisonville** → **25125 Noblesville**.
- `000562/000577/000587/000684 + PM0000039x/0471` Ulta Beauty Greenwood — on **800** → **1031 Ulta Greenwood**.
- `003238` GW Washington Pay App 1 — on **865 Canton IL** → **870 Goodwill Washington**.
- Full list: `000139, 000562, 000577, 000587, 000675, 000684, 001544, 001653, 002347, 002581, 002977, 003238, 003275, 003276, 003456, 003492, PM00000392, PM00000395, PM00000400, PM00000471, PM00010017, PM00010382`

Command (only after sign-off): `node scripts/acumatica/audit-cross-project-attribution.mjs --apply --refs=<subset>`

## DUPLICATE → SOFT-DELETE (23 rows, ~$884k) — do NOT run `--apply` on these

Each has a **live** counterpart already on the correct project (verified: no target counterpart is
itself deleted). Several are also doubled **within** project 43 (2 identical rows). The correct
action is to **soft-delete the stray copy**, not move it. The audit `--apply` would re-point it
onto the correct project where the twin already lives → **double the cost there.** These need a
separate soft-delete step (script does not support it today). High-value examples:

- `000380` Permits Bella Vegas — **two** $223,429.80 copies on 43; keeper `da7a2e2c…` on **810 Bella Vegas**.
- `002348` Ulta Dallas PayApp2 — $242,830.96 on 43; keeper `49c68f82…` on **55 Ulta Dallas**.
- `000888/000889` 22-107 settlement — $17,332 / $2,828.03 on 43; keepers on **805 Purrs and Gurrs**.
- `002488` Goodwill Decatur July billing — $18,654 on 43; keepers on **840 Goodwill-Decatur**.
- Full row-id list: `reviewed.json` (filter `review == "DUPLICATE→SOFT-DELETE"`).

## ASSIGN (19 refs, ~$102k) — currently NULL project_id

Description names exactly one project; just needs assignment (not a cross-project move). The
script's `--apply` guard (`eq(project_id, current)`) can't match a NULL current, so these need
either a NULL-aware apply or the upstream Acumatica coding. Examples: `002880/002895` CEVA
Bernville, `000922/000947` Zion Pratt Whitney, `001157–001159` Forza Dayton, `001290/001462`
Goodwill Bloomington, `002169/002330` Roebling Homes, `002876` Goodwill Tremont.
