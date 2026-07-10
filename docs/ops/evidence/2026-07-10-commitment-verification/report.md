# Commitment Verification — App vs JobPlanner

**Date:** 2026-07-10  
**Scope:** All 27 active projects in `batch-plan.csv` with both a JP and app project id.  
**Mode:** READ-ONLY audit. No database writes.  
**Source of truth:** JobPlanner (`api-v2.jobplanner.com`). App = Supabase PM APP project.

Each JP commitment is matched to an app commitment by `contract_number == JP .number`, then checked for: existence, dollar tie-out (sum of app SOV `amount` == JP header `amount`, to the cent), SOV line count, per-line cost-code/type mapping, and vendor linkage.

## Grand totals

| Metric | Count |
|---|---:|
| JP commitments audited | 263 |
| — matched to an active app commitment | 220 |
| — **fully PASS** (ties to the cent, every line mapped, vendor OK, code+type match) | 117 |
| Dollar tie-out PASS (matched, delta = $0) | 218 |
| Dollar tie-out FAIL (matched, delta ≠ $0) | 2 |
| Missing in app (JP-only) | 43 |
| Matched but with UNMAPPED budget-code lines | 0 |
| Matched but NULL / mismatched vendor | 22 |
| Matched but JP cost-**type** not captured on app line (code OK) | 89 |
| App-only, JP-numbered (in app, not in JP) | 0 |
| App-only, Acumatica/legacy number | 101 |
| App-only, test/other number | 5 |

### How to read this
- **Fully PASS (117/263)** is the only "green" state: the app commitment exists, its SOV sums to the JP header to the cent, every SOV line has a valid mapped cost code, the vendor is linked and matches, and the (cost-code, cost-type) set matches JP.
- The largest single gap is **coverage**: 43 JP commitments have no matching app row, and 101 app rows carry legacy Acumatica numbers (`SC-000xxx`) that JP does not use. On several projects these are two views of the same underlying commitments under a different numbering scheme — the JP-number import has not replaced the Acumatica rows. Treat missing-in-app + acumatica-legacy on the same project as a numbering-migration gap, not necessarily 144 distinct missing contracts.
- The **cost-type-not-captured** finding (89) is systemic and low-severity: the app `budget_code` holds the right cost code (e.g. `26-1000`) but drops the JP cost-type suffix (`.S`), so the code maps but the type is lost. Dollar totals still tie.

## Per-project summary

| Project | JP# | app# | JP commits | matched | tie-out PASS | tie-out FAIL | missing-in-app | app-only (JP#) | app-only (legacy) | unmapped-code | vendor issue | fully PASS |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| 26-109 Goodwill Macomb | 8143 | 868 | 8 | 2 | 2 | 0 | 6 | 0 | 7 | 0 | 0 | **2** |
| 25-127 Ulta Beauty Fresno | 5347 | 761 | 9 | 9 | 9 | 0 | 0 | 0 | 1 | 0 | 0 | **9** |
| 26-108 Goodwill Galesburg | 8126 | 869 | 6 | 1 | 1 | 0 | 5 | 0 | 6 | 0 | 0 | **1** |
| 26-110 Goodwill Peru | 8184 | 867 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 25-126 Vermillion Rise Warehouse | 5296 | 67 | 31 | 30 | 29 | 1 | 1 | 0 | 0 | 0 | 6 | **23** |
| 26-106 Goodwill Washington | 8105 | 870 | 12 | 6 | 6 | 0 | 6 | 0 | 10 | 0 | 0 | **6** |
| 26-105 Goodwill Pioneer PKWY | 7654 | 762 | 9 | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 26-111 Goodwill Morris | 8208 | 866 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 26-123 Playmakers | 9299 | 1067 | 5 | 4 | 4 | 0 | 1 | 0 | 1 | 0 | 1 | **3** |
| 25-108 Goodwill Tremont | 3620 | 25108 | 9 | 6 | 6 | 0 | 3 | 0 | 9 | 0 | 0 | **6** |
| 24-115 Westfield Collective | 2403 | 43 | 46 | 41 | 41 | 0 | 5 | 0 | 32 | 0 | 4 | **37** |
| 26-113 Goodwill Allisonville Rd IN | 8189 | 754 | 22 | 22 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | **1** |
| 26-112 McLane Jazz - UT | 8509 | 879 | 3 | 2 | 2 | 0 | 1 | 0 | 2 | 0 | 0 | **2** |
| 26-114 Goodwill Brookville Road | 8262 | 877 | 24 | 23 | 22 | 1 | 1 | 0 | 0 | 0 | 8 | **0** |
| 26-107 Goodwill Canton, IL | 8109 | 865 | 7 | 5 | 5 | 0 | 2 | 0 | 6 | 0 | 0 | **5** |
| 26-115 Vargo Greenwood Permitting | 8290 | 1027 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 25-125 Goodwill Noblesville | 5092 | 25125 | 18 | 18 | 18 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 26-119 Union Collective | 8628 | 1009 | 5 | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | **5** |
| 26-120 NEXCOM SEDC | 8840 | 1014 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| 26-117 Superior Beverae Exotec | 8862 | 178 | 3 | 2 | 2 | 0 | 1 | 0 | 2 | 0 | 2 | **0** |
| 26-118 Champaign Ace Addition | 8530 | 1008 | 3 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | **3** |
| 26-102 Goodwill Commons | 6669 | 764 | 8 | 2 | 2 | 0 | 6 | 0 | 10 | 0 | 0 | **2** |
| 26-103 Exol Wilmer | 7487 | 760 | 3 | 2 | 2 | 0 | 1 | 0 | 4 | 0 | 0 | **2** |
| 25-120 GPC Hai Robotic | 4493 | 795 | 4 | 3 | 3 | 0 | 1 | 0 | 2 | 0 | 0 | **3** |
| 25-119 Goodwill- Decatur | 4389 | 840 | 1 | 1 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | **1** |
| 25-109 Uniqlo Phillipsburg NJ | 3729 | 31 | 8 | 6 | 6 | 0 | 2 | 0 | 6 | 0 | 0 | **6** |
| 26-116 Exol Morrisville | 8344 | 876 | 18 | 17 | 17 | 0 | 1 | 0 | 1 | 0 | 1 | **0** |

## Detailed FAIL list

Every commitment that failed a hard check (missing, dollar mismatch, unmapped budget code, null vendor, or an app-only JP-numbered row). Cost-type-not-captured and vendor-name/legacy differences are WARNINGS and listed separately below.

### 26-109 Goodwill Macomb

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8143-0002 | SC | — | $2,135.00 | — | — | 2 | MISSING in app — JP has $2,135.00 / 2 line(s), vendor "Appletree Woodworks, Inc." |
| SC-8143-0005 | SC | — | $8,230.00 | — | — | 1 | MISSING in app — JP has $8,230.00 / 1 line(s), vendor "Standard Heating & Cooling" |
| SC-8143-0004 | SC | — | $12,000.00 | — | — | 2 | MISSING in app — JP has $12,000.00 / 2 line(s), vendor "Dries Plumbing Inc." |
| SC-8143-0007 | SC | — | $22,100.00 | — | — | 1 | MISSING in app — JP has $22,100.00 / 1 line(s), vendor "CertaPro Painters of Central Illinois" |
| SC-8143-0003 | SC | — | $37,660.00 | — | — | 2 | MISSING in app — JP has $37,660.00 / 2 line(s), vendor "360 Electric, LLC" |
| SC-8143-0006 | SC | — | $5,400.00 | — | — | 1 | MISSING in app — JP has $5,400.00 / 1 line(s), vendor "CertaPro Painters of Central Illinois" |

### 26-108 Goodwill Galesburg

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8126-0005 | SC | — | $2,500.00 | — | — | 1 | MISSING in app — JP has $2,500.00 / 1 line(s), vendor "CertaPro Painters of Central Illinois" |
| SC-8126-0004 | SC | — | $2,470.00 | — | — | 1 | MISSING in app — JP has $2,470.00 / 1 line(s), vendor "Appletree Woodworks, Inc." |
| SC-8126-0002 | SC | — | $9,937.35 | — | — | 1 | MISSING in app — JP has $9,937.35 / 1 line(s), vendor "Wayne Dalton Sales & Service Division of Overhead" |
| SC-8126-0006 | SC | — | $27,750.00 | — | — | 1 | MISSING in app — JP has $27,750.00 / 1 line(s), vendor "CertaPro Painters of Central Illinois" |
| SC-8126-0003 | SC | — | $10,840.00 | — | — | 4 | MISSING in app — JP has $10,840.00 / 4 line(s), vendor "360 Electric, LLC" |

### 25-126 Vermillion Rise Warehouse

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-5296-0024 | SC | $5,075.00 | $5,075.00 | $0.00 | 7 | 7 | NULL vendor (contract_company_id) |
| SC-5296-0025 | SC | $2,015.00 | $2,015.00 | $0.00 | 6 | 6 | NULL vendor (contract_company_id) |
| SC-5296-0026 | SC | — | $1,363,773.25 | — | — | 5 | MISSING in app — JP has $1,363,773.25 / 5 line(s), vendor "Grounded Solutions" |
| SC-5296-0015 | SC | $50,184.85 | $50,184.85 | $0.00 | 4 | 4 | NULL vendor (contract_company_id) |
| PO-5296-0008 | PO | $0.00 | $0.00 | $0.00 | 0 | 0 | NULL vendor (contract_company_id) |
| SC-5296-0014 | SC | $60,664.83 | $50,328.00 | $10,336.83 | 3 | 3 | TOTAL mismatch: app 60664.83 vs JP 50328.00 (Δ 10336.83) |
| SC-5296-0016 | SC | $29,800.00 | $29,800.00 | $0.00 | 2 | 2 | NULL vendor (contract_company_id) |
| SC-5296-0023 | SC | $71,486.00 | $71,486.00 | $0.00 | 3 | 3 | NULL vendor (contract_company_id) |

### 26-106 Goodwill Washington

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8105-0007 | SC | — | $10,597.89 | — | — | 1 | MISSING in app — JP has $10,597.89 / 1 line(s), vendor "Wayne Dalton Sales & Service Division of Overhead" |
| SC-8105-0010 | SC | — | $13,620.00 | — | — | 4 | MISSING in app — JP has $13,620.00 / 4 line(s), vendor "Standard Heating & Cooling" |
| SC-8105-0008 | SC | — | $11,360.00 | — | — | 1 | MISSING in app — JP has $11,360.00 / 1 line(s), vendor "CertaPro Painters of Central Illinois" |
| SC-8105-0011 | SC | — | $9,205.00 | — | — | 1 | MISSING in app — JP has $9,205.00 / 1 line(s), vendor "Appletree Woodworks, Inc." |
| SC-8105-0009 | SC | — | $19,664.00 | — | — | 4 | MISSING in app — JP has $19,664.00 / 4 line(s), vendor "A&H Steel LLC" |
| SC-8105-0001 | SC | — | $25,600.00 | — | — | 5 | MISSING in app — JP has $25,600.00 / 5 line(s), vendor "360 Electric, LLC" |

### 26-123 Playmakers

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-9299-0004 | SC | $20,000.00 | $20,000.00 | $0.00 | 4 | 4 | NULL vendor (contract_company_id) |
| SC-9299-0002 | SC | — | $55,650.00 | — | — | 19 | MISSING in app — JP has $55,650.00 / 19 line(s), vendor "Right Image Construction LLC" |

### 25-108 Goodwill Tremont

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-3620-0004 | SC | — | $41,917.00 | — | — | 1 | MISSING in app — JP has $41,917.00 / 1 line(s), vendor "Rad Fabrication LLC" |
| SC-3620-0011 | SC | — | $5,350.00 | — | — | 1 | MISSING in app — JP has $5,350.00 / 1 line(s), vendor "Inline Painting LLC" |
| SC-3620-0010 | SC | — | $12,650.00 | — | — | 1 | MISSING in app — JP has $12,650.00 / 1 line(s), vendor "Multicraft Fire LLC" |

### 24-115 Westfield Collective

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-2403-0010 | SC | — | $61,300.00 | — | — | 4 | MISSING in app — JP has $61,300.00 / 4 line(s), vendor "CNC Foundations" |
| SC-2403-0029 | SC | — | $10,025.00 | — | — | 2 | MISSING in app — JP has $10,025.00 / 2 line(s), vendor "KLEENIT GROUP INC." |
| SC-2403-0003 | SC | — | $93,500.00 | — | — | 4 | MISSING in app — JP has $93,500.00 / 4 line(s), vendor "Executive Elevator Company" |
| SC-2403-0031 | SC | — | $2,500.00 | — | — | 1 | MISSING in app — JP has $2,500.00 / 1 line(s), vendor "Top Notch Pressure Washing" |
| SC-2403-0020 | SC | — | $9,700.00 | — | — | 3 | MISSING in app — JP has $9,700.00 / 3 line(s), vendor "North Indy Fence Deck & Rail" |
| SC-000158 | SC | $567,220.00 | $567,220.00 | $0.00 | 6 | 6 | NULL vendor (contract_company_id) |

### 26-112 McLane Jazz - UT

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8509-0002 | SC | — | $5,000.00 | — | — | 1 | MISSING in app — JP has $5,000.00 / 1 line(s), vendor "Christopher William Lopez" |

### 26-114 Goodwill Brookville Road

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8262-0025 | SC | $30,947.00 | $30,947.00 | $0.00 | 7 | 7 | cost-code/type set differs (JP-only: 32-9000|S; app-only: 32-9000|?); NULL vendor (contract_company_id) |
| SC-8262-0017 | SC | $4,550.00 | $4,550.00 | $0.00 | 3 | 3 | cost-code/type set differs (JP-only: 10-2813|M; app-only: 10-2813|?); NULL vendor (contract_company_id) |
| SC-8262-0014 | SC | $30,032.00 | $30,032.00 | $0.00 | 5 | 5 | cost-code/type set differs (JP-only: 08-4229|S; app-only: 08-4229|?); NULL vendor (contract_company_id) |
| SC-8262-0010 | SC | $20,620.00 | $20,620.00 | $0.00 | 5 | 5 | cost-code/type set differs (JP-only: 07-2400|S; app-only: 07-2400|?); NULL vendor (contract_company_id) |
| SC-8262-0026 | SC | — | $447,005.10 | — | — | 7 | MISSING in app — JP has $447,005.10 / 7 line(s), vendor "JTP Excavation" |
| SC-8262-0003 | SC | $812,734.00 | $313,268.00 | $499,466.00 | 19 | 19 | TOTAL mismatch: app 812734.00 vs JP 313268.00 (Δ 499466.00) |
| SC-8262-0021 | SC | $10,050.00 | $10,050.00 | $0.00 | 4 | 4 | cost-code/type set differs (JP-only: 12-3000|S; app-only: 12-3000|?); NULL vendor (contract_company_id) |
| SC-8262-0019 | SC | $1,175.40 | $1,175.40 | $0.00 | 3 | 3 | cost-code/type set differs (JP-only: 09-6513|S; app-only: 09-6513|?); NULL vendor (contract_company_id) |
| SC-8262-0020 | SC | $29,221.18 | $29,221.18 | $0.00 | 6 | 6 | cost-code/type set differs (JP-only: 11-1300|S; app-only: 11-1300|?); NULL vendor (contract_company_id) |
| SC-8262-0023 | SC | $13,600.00 | $13,600.00 | $0.00 | 5 | 5 | cost-code/type set differs (JP-only: 02-2113|S; app-only: 02-2113|?); NULL vendor (contract_company_id) |

### 26-107 Goodwill Canton, IL

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8109-0006 | SC | — | $8,770.00 | — | — | 3 | MISSING in app — JP has $8,770.00 / 3 line(s), vendor "Appletree Woodworks, Inc." |
| SC-8109-0005 | SC | — | $9,186.00 | — | — | 1 | MISSING in app — JP has $9,186.00 / 1 line(s), vendor "A&H Steel LLC" |

### 26-117 Superior Beverae Exotec

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8862-0002 | SC | $467,000.00 | $467,000.00 | $0.00 | 1 | 1 | NULL vendor (contract_company_id) |
| SC-8862-0001 | SC | — | $25,000.00 | — | — | 1 | MISSING in app — JP has $25,000.00 / 1 line(s), vendor "Christopher William Lopez" |

### 26-102 Goodwill Commons

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-6669-0004 | SC | — | $14,323.00 | — | — | 1 | MISSING in app — JP has $14,323.00 / 1 line(s), vendor "Inline Painting LLC" |
| SC-6669-0006 | SC | — | $3,850.00 | — | — | 1 | MISSING in app — JP has $3,850.00 / 1 line(s), vendor "Tidwell Roofing and Sheet Metal Inc." |
| SC-6669-0007 | SC | — | $22,300.00 | — | — | 1 | MISSING in app — JP has $22,300.00 / 1 line(s), vendor "Otto Baum Company, Inc." |
| SC-6669-0001 | SC | — | $56,898.00 | — | — | 2 | MISSING in app — JP has $56,898.00 / 2 line(s), vendor "Standard Heating & Cooling" |
| SC-6669-0005 | SC | — | $6,750.00 | — | — | 1 | MISSING in app — JP has $6,750.00 / 1 line(s), vendor "H & S Industries, Inc." |
| SC-6669-0008 | SC | — | $27,000.00 | — | — | 1 | MISSING in app — JP has $27,000.00 / 1 line(s), vendor "Nu Veterans Construction Services, Inc" |

### 26-103 Exol Wilmer

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-7487-0003 | SC | — | $71,405.55 | — | — | 1 | MISSING in app — JP has $71,405.55 / 1 line(s), vendor "SFS Security Fire Systems" |

### 25-120 GPC Hai Robotic

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-4493-0001 | SC | — | $30,000.00 | — | — | 1 | MISSING in app — JP has $30,000.00 / 1 line(s), vendor "Christopher William Lopez" |

### 25-109 Uniqlo Phillipsburg NJ

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-3729-0004 | SC | — | $23,732.64 | — | — | 3 | MISSING in app — JP has $23,732.64 / 3 line(s), vendor "Pro Max Fence Systems, LLC" |
| SC-3729-0006 | SC | — | $16,600.00 | — | — | 2 | MISSING in app — JP has $16,600.00 / 2 line(s), vendor "Henderson Engineers" |

### 26-116 Exol Morrisville

| Commitment | Type | App total | JP total | Δ | App lines | JP lines | Failure |
|---|---|--:|--:|--:|--:|--:|---|
| SC-8344-0014 | SC | — | $2,693,611.00 | — | — | 4 | MISSING in app — JP has $2,693,611.00 / 4 line(s), vendor "R.J. Skelding Co, Inc" |
| SC-8344-0019 | SC | $23,860.00 | $23,860.00 | $0.00 | 1 | 1 | cost-code/type set differs (JP-only: 01-7123|S; app-only: 01-7123|?); NULL vendor (contract_company_id) |

## Warnings (non-blocking, review recommended)

### Dollar tie-out mismatches (already in FAIL list above)
- **25-126 Vermillion Rise Warehouse / SC-5296-0014**: app $60,664.83 vs JP $50,328.00 — Δ $10,336.83 (3 app / 3 JP lines)
- **26-114 Goodwill Brookville Road / SC-8262-0003**: app $812,734.00 vs JP $313,268.00 — Δ $499,466.00 (19 app / 19 JP lines)

### Vendor-name mismatches (linked but names differ)
- **24-115 Westfield Collective / PO-2403-0009**: app "Best Equipment & Welding Co., Inc." vs JP "Best Equipment and Welding"
- **24-115 Westfield Collective / SC-2403-0019**: app "Ski Landscape Corp" vs JP "Ski Landscape Corporation"
- **24-115 Westfield Collective / SC-000189**: app "Awning Partners Manufacturing Group, LLC" vs JP "Awning Partners"
- **26-117 Superior Beverae Exotec / PO-8862-0001**: app "Core & Main LP" vs JP "Core & Main LLP"

### JP cost-type not captured on app SOV line (code maps, type dropped)
89 commitments. The app `budget_code` matches the JP cost code but omits the JP cost-type suffix (e.g. app `26-1000` vs JP `26-1000` type `S`). Systemic; dollar totals still tie. Full per-commitment list in `report.json` under each commitment's `pairDiff`.

### App-only rows (in app, not in JobPlanner)
- **JP-numbered (0)**: real concern — number matches the project's JP scheme but the commitment is absent from JP.
- **Acumatica/legacy `SC-000xxx` (101)**: legacy imports; on projects that also show missing-in-app these are likely the same commitments under the old numbering.
- **Test/other (5)**: e.g. `SC-E2E-*`, `SC-GAUNTLET-*`, `PO-001` — test-data pollution.

Test/other rows:
- 25-126 Vermillion Rise Warehouse / SC-E2E-1a909977
- 25-126 Vermillion Rise Warehouse / SC-GAUNTLET-001-EDITED
- 25-126 Vermillion Rise Warehouse / SC-002
- 25-126 Vermillion Rise Warehouse / PO-001
- 25-126 Vermillion Rise Warehouse / PO-API-1779306906408

## Method / caveats

- JP amounts are in cents; divided by 100. App SOV `amount` is dollars; a commitment total = sum of its SOV items.
- Cost-code mapping: JP 6-digit `013144` → app `01-3144`. App `budget_code` may carry a cost-type suffix (`.S`/`.L`/`.M`/`.E`/`.X`) which is stripped before matching `cost_codes.id`.
- "Mapped" line = non-null `project_budget_code_id` **and** a `budget_code` whose base resolves to a real `cost_codes.id`.
- Matching is strictly by `contract_number`. A JP commitment imported into the app under a different (Acumatica) number reads as both missing-in-app and app-only-legacy.
- JP header total equaled the sum of its own SOV lines for **every** commitment (0 internal inconsistencies).
