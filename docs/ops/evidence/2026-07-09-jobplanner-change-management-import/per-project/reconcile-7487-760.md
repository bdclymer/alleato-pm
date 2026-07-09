# JP change-management reconcile — DRY RUN (no writes)

JP project 7487 → app project 760 · 2026-07-09T05:08:01.431Z

**Change requests:** 6  →  ADOPT 1 · CREATE 1 · FLAG 4
**Existing app change events:** 5 (app-only after match: 1)
**Executed-CO twins:** commitment 0/0 · prime 0/2

## Change-request decisions

| JP CR | Title | Cost | Fork (P/C/–) | Decision | Matched existing | Reason |
|---|---|---|---|---|---|---|
| CR-7487-0004 | Painting | $0.00 | 0/0/2 | **FLAG** | 004 ($97,500.00) | seq 4 matches 004 but title (sim 0.00) AND amount (Δ $-97,500.00) both diverge — verify manually |
| CR-7487-0002 | Joint Sealant | $557,881.00 | 2/0/2 | **FLAG** | 002 ($681,779.00) | seq 2 matches 002 but title (sim 0.00) AND amount (Δ $-123,898.00) both diverge — verify manually |
| CR-7487-0005 | Added Electrical for FA | $0.00 | 1/0/2 | **ADOPT** | 005 ($0.00) | seq 5 == 005; amount matches; titleSim 0.00 |
| CR-7487-0007 | Dmarc outlets | $1,470.00 | 0/0/3 | **FLAG** | 003 ($1,470.00) | no seq match, but "003" is a strong title+amount match (sim 1.00) — possible renumber, verify |
| CR-7487-0003 | Dock Packages | $1,289,595.00 | 0/0/7 | **FLAG** | 003 ($1,470.00) | seq 3 matches 003 but title (sim 0.00) AND amount (Δ $1,288,125.00) both diverge — verify manually |
| CR-7487-0006 | Added Electrical Panel Option A | $59,222.00 | 0/0/3 | **CREATE** | — | no existing change event matches seq 6, title, or amount |

## App-only change events (no JP CR matched — left untouched)

- 001 · $557,881.00 · Joint Sealant
