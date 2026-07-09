# Subcontractor-invoice triage — Goodwill Noblesville (25125) — DRY-RUN — no writes

Orphans (no commitment / no company): **30**

- **A. LINK to existing subcontract:** 8
- **B. DIRECT_COST — already a dup (safe remove):** 18
- **B'. DIRECT_COST — would create then remove:** 0
- **FLAG — probable subcontract, unmapped:** 2
- **FLAG — probable wrong project:** 2

## A. LINK to existing subcontract

| Acu ref | Vendor | Amount | → subcontract | Description |
|---|---|--:|---|---|
| 002540 | INTCON | $1,000.00 | SC-5092-0001 | SC-5092-0001 Goodwill Noblesville Retainage |
| 002524 | INTCON | $9,000.00 | SC-5092-0001 | SC-5092-0001 Goodwill Noblesville |
| 002834 | INTCON | $31,747.50 | SC-5092-0001 | SC-5092-0001 Goodwill Noblesville |
| 003256 | INTCON | $1,429.92 | SC-5092-0001 | SC-5092-0001 3250 GW Noblesville Pay App 4 |
| 003250 | INTCON | $12,869.26 | SC-5092-0001 | SC-5092-0001 3250 GW Noblesville Pay App 4 |
| 002997 | INTCON | $3,527.50 | SC-5092-0001 | SC-5092-0001 Goodwill Noblesville |
| 002911 | SUPERIOR | $88,783.10 | SC-5092-0002 | SC-5092-0002 25-125 Goodwill Noblesville |
| 002904 | BUL-TEC RO | $15,943.50 | SC-5092-0008 | SC-5092-0008 PayApp1 - 25-125 Goodwill Noblesville |

## B. Direct cost — already exists (safe to remove from this tab)

| Acu ref | Vendor | Amount | dup? | Description |
|---|---|--:|---|---|
| 002981 | RENASCENT | $1,210.00 | dup | Invoice 299497 Goodwill Noblesville |
| 002982 | RENASCENT | $1,210.00 | dup | Invoice 300039 Goodwill Noblesville |
| 002985 | RENASCENT | $605.00 | dup | Invoice 301567 Goodwill Noblesville |
| 002567 | DKGR | $28,800.00 | dup | Construction Documents Invoice002 - Goodwill Noblesville |
| 003188 | ANYTIME | $200.00 | dup | I46043 - Standard Toilet - Goodwill Noblesville 2/11-3/10/26 |
| 003162 | RENASCENT | $605.00 | dup | Invoice 305359 GW Noblesville |
| 003155 | ANYTIME | $125.00 | dup | INV I46976 - Standard Toilet - Goodwill Noblesville 3/11-4/7 |
| 003198 | RENASCENT | $1,210.00 | dup | Invoice 306791 GW Noblesville |
| 003170 | PEOPLE | $230.32 | dup | 29524332 GW Noblesville K. Burns |
| 002973 | RENASCENT | $1,210.00 | dup | Invoice 299046 : GW Noblesville 1/8/26 |
| 002989 | RENASCENT | $1,210.00 | dup | Invoice 302632 Goodwill Noblesville |
| 003024 | RENASCENT | $1,210.00 | dup | Invoice 303824 Goodwill Noblesville |
| 003286 | ANYTIME | $125.00 | dup | INV I48089 - Standard Toilet - Goodwill Noblesville 4/8-5/5/ |
| 002707 | CITYOFNOBL | $3,180.00 | dup | Permit fee to the City of Noblesville |
| 002959 | ANYTIME | $125.00 | dup | INV I45088 - Standard Toilet - Goodwill Noblesville |
| 002495 | DKGR | $4,000.00 | dup | Design Fee Invoice001 - Goodwill Noblesville |
| 002708 | DKGR | $8,550.00 | dup | Construction Documents Invoice002 - Goodwill Noblesville |
| 003249 | INTCON | $7,478.93 | dup | GW Noblesville |

## FLAG — probable subcontractor pay-app, no matching subcontract

| Acu ref | Vendor | Amount |  | Description |
|---|---|--:|---|---|
| 003244 | BUL-TEC RO | $3,514.50 |  | PI-5092-0030 Goodwill Noblesville Pay App 3 |
| 003246 | DEEM | $87,315.91 |  | 656332 Goodwill Noblesville Pay App 3 |

## FLAG — probable wrong project

| Acu ref | Vendor | Amount |  | Description |
|---|---|--:|---|---|
| 002571 | RENASCENT | $499.00 |  | Invoice 292753 : Westfield Collective 10/21/25 |
| 002592 | RENASCENT | $982.00 |  | Invoice 293863 : Westfield Collective Nov4/7, 2025 |

