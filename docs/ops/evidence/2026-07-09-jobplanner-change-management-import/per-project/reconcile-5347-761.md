# JP change-management reconcile — DRY RUN (no writes)

JP project 5347 → app project 761 · 2026-07-09T05:07:47.021Z

**Change requests:** 10  →  ADOPT 3 · CREATE 7 · FLAG 0
**Existing app change events:** 4 (app-only after match: 1)
**Executed-CO twins:** commitment 0/14 · prime 0/0

## Change-request decisions

| JP CR | Title | Cost | Fork (P/C/–) | Decision | Matched existing | Reason |
|---|---|---|---|---|---|---|
| CR-5347-0012 | AC4 Duct Re-Route | $0.00 | 0/0/1 | **CREATE** | — | no existing change event matches seq 12, title, or amount |
| CR-5347-0006 | Mod Fan Electrical Rework  | $0.00 | 0/2/0 | **CREATE** | — | no existing change event matches seq 6, title, or amount |
| CR-5347-0013 | Fire Alarm System Pretest/Retest | $10,080.00 | 0/1/0 | **CREATE** | — | no existing change event matches seq 13, title, or amount |
| CR-5347-0003 | KascoFab Equipment 1 week Rental | $10,297.49 | 0/4/0 | **ADOPT** | CR-5347-0003 ($10,297.00) | seq 3 == CR-5347-0003; amount matches; titleSim 1.00 |
| CR-5347-0007 | AC-1 Crane Remobilization  | $19,849.00 | 0/1/0 | **CREATE** | — | no existing change event matches seq 7, title, or amount |
| CR-5347-0001 | Special Inspections for Structur | $4,075.00 | 0/0/1 | **ADOPT** | CR-5347-0001 ($4,075.00) | seq 1 == CR-5347-0001; amount matches; titleSim 1.00 |
| CR-5347-0010 | Add Sprinkler Heads under new Du | $14,686.00 | 0/1/0 | **CREATE** | — | no existing change event matches seq 10, title, or amount |
| CR-5347-0002 | Conflict with RTU and existing u | $61,659.79 | 0/7/0 | **ADOPT** | CR-5347-0002 ($61,660.00) | seq 2 == CR-5347-0002; amount matches; titleSim 1.00 |
| CR-5347-0014 | AC4 - 34" Duct Sock Re-route | $96,693.00 | 0/1/0 | **CREATE** | — | no existing change event matches seq 14, title, or amount |
| CR-5347-0011 | Relocate Solar Raceway on Roof c | $41,000.00 | 0/0/1 | **CREATE** | — | no existing change event matches seq 11, title, or amount |

## App-only change events (no JP CR matched — left untouched)

- CR-5347-0005 · $113,440.00 · AC-1 Relocation
