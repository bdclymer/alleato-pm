# Cross-project attribution — TRIAGE (duplicate vs re-point)

Generated: 2026-07-09T09:27:59.383Z
Read-only classification of the 90 findings. NOT applied.

Disposition counts: {"ASSIGN":19,"REPOINT":48,"DUPLICATE→SOFT-DELETE":23}

- **DUPLICATE→SOFT-DELETE** — a matching row already exists on the suggested project; the flagged row on the current project is a redundant copy.
- **REPOINT** — no counterpart on the suggested project; genuine mis-attribution to correct.
- **ASSIGN** — row currently has NULL project_id; description names exactly one project.

| disp | conf | kind | ref | current → suggested | amount | del? | dup evidence (level: target row ids) | within-dup ids | description |
|------|------|------|-----|---------------------|--------|------|--------------------------------------|----------------|-------------|
| ASSIGN | HIGH | ap_bill | 002880 | null → 1012 CEVA Bernville ASRS Phase 2 | $25483.5 |  |  |  | Sprinkler permit 26-104 |
| ASSIGN | HIGH | ap_bill | 002895 | null → 1012 CEVA Bernville ASRS Phase 2 | $15000 |  |  |  | 26-104 26-104 - CEVA Bernville ASRS Phase 2 Bernville, PA |
| REPOINT | HIGH | ap_bill | 003492 | 1008 → 1028 Champagne Ace Addition IL | $34000 |  |  |  | PO-8530-0001 Champagne Ace 003492 Pay App 1 |
| REPOINT | HIGH | direct_cost | 003492 | 1008 → 1028 Champagne Ace Addition IL | $34000 |  |  |  | PO-8530-0001 Champagne Ace 003492 Pay App 1 |
| ASSIGN | HIGH | ap_bill | 001653 | null → 829 Core Mark | $10000 |  |  |  | Double Payment 001A  24-107 |
| REPOINT | HIGH | direct_cost | 001653 | 43 → 829 Core Mark | $10000 |  |  |  | Double Payment 001A  24-107 |
| DUPLICATE→SOFT-DELETE | HIGH | direct_cost | 000888 | 43 → 805 Purrs and Gurrs | $17332 |  | D2: d292d7a1-d0d8-4aed-ad5a-585162d9df5c |  | Project 22-107 CC 26-1000 Electrical - To close bill / paid via settle |
| DUPLICATE→SOFT-DELETE | HIGH | direct_cost | 000889 | 43 → 805 Purrs and Gurrs | $2828.03 |  | D2: d3ef731a-4fbb-4913-9965-de59414afa0b |  | Project 22-107 CC 22-1116 Plumbing - to close bill / paid via settleme |
| ASSIGN | HIGH | ap_bill | 000922 | null → 822 Zion Pratt Whitney | $12000 |  |  |  | Invoice 1143 : Design ASRS System for Zion Pratt Whitney project PO# 2 |
| ASSIGN | HIGH | ap_bill | 000947 | null → 822 Zion Pratt Whitney | $5000 |  |  |  | Design ASRS System for Zion Pratt Whitney project PO# 23-112 |
| ASSIGN | MEDIUM | ap_bill | 001654 | null → 24108 Aspire Ridge Haven | $1300 |  |  |  | Ridge Haven plan & Aspire Oaktree plan |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000218 | 43 → 810 Bella Vegas | $32567.5 |  | D2: 45206997-438b-476f-b43e-a457819d834a | 43df85d8-a9b6-4dda-9f99-e286d8e415b5 | Permits for Bella North Vegas |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000218 | 43 → 810 Bella Vegas | $32567.5 |  | D2: 45206997-438b-476f-b43e-a457819d834a | f02ccb1b-bb46-4d4b-945b-5c2602ec8570 | Permits for Bella North Vegas |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000345 | 43 → 810 Bella Vegas | $24479.8 |  | D2: 5073329d-2688-4eb2-961f-6c0df338f877 | 0afdace2-6d85-4fa5-abb3-5b8a8eaa87a1 | permits for Bella North Las Vegas |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000345 | 43 → 810 Bella Vegas | $24479.8 |  | D2: 5073329d-2688-4eb2-961f-6c0df338f877 | 1429d668-493a-4b49-b165-a8e06cc446ad | permits for Bella North Las Vegas |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000380 | 43 → 810 Bella Vegas | $223429.8 |  | D2: da7a2e2c-7601-45c9-9e45-4201eb2dcfdd | 90e22616-2a9d-489f-9270-490c1705e16e | Permits Bella Vegas |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000380 | 43 → 810 Bella Vegas | $223429.8 |  | D2: da7a2e2c-7601-45c9-9e45-4201eb2dcfdd | 1b5a1979-526b-4a20-8ed9-012409b479e3 | Permits Bella Vegas |
| ASSIGN | MEDIUM | ap_bill | 000624 | null → 820 Brennan Pittsburgh | $4600 |  |  |  | Invoice 28498 Brennan Pittsburgh Concrete Cutting |
| ASSIGN | MEDIUM | ap_bill | 000675 | null → 820 Brennan Pittsburgh | $4600 |  |  |  | Invoice 28498 Brennan Pittsburgh Concrete Cutting - to correct Class |
| REPOINT | MEDIUM | direct_cost | 000675 | 43 → 820 Brennan Pittsburgh | $4600 |  |  |  | Invoice 28498 Brennan Pittsburgh Concrete Cutting - to correct Class |
| REPOINT | MEDIUM | ap_bill | 001910 | 832 → 829 Core Mark | $63099 |  |  |  | SC-2733-0001 PayApp1 Core Mark Altanta |
| REPOINT | MEDIUM | direct_cost | 001910 | 832 → 829 Core Mark | $70110 |  |  |  | SC-2733-0001 PayApp1 Core Mark Altanta |
| REPOINT | MEDIUM | ap_bill | 002009 | 832 → 829 Core Mark | $9611.88 |  |  |  | SC-2733-0001 PayApp2 Core Mark Altanta |
| REPOINT | MEDIUM | direct_cost | 002009 | 832 → 829 Core Mark | $10679.86 |  |  |  | SC-2733-0001 PayApp2 Core Mark Altanta |
| REPOINT | MEDIUM | ap_bill | 002252 | 832 → 829 Core Mark | $7599.6 |  |  |  | SC-2733-0001 PayApp3 Core Mark Altanta |
| REPOINT | MEDIUM | direct_cost | 002252 | 832 → 829 Core Mark | $8444 |  |  |  | SC-2733-0001 PayApp3 Core Mark Altanta |
| REPOINT | MEDIUM | ap_bill | 002253 | 832 → 829 Core Mark | $1067.98 |  |  |  | SC-2733-0001 PayApp2 Core Mark Altanta |
| REPOINT | MEDIUM | ap_bill | 002254 | 832 → 829 Core Mark | $7011 |  |  |  | SC-2733-0001 PayApp1 Core Mark Altanta |
| REPOINT | MEDIUM | ap_bill | 002256 | 832 → 829 Core Mark | $844.4 |  |  |  | SC-2733-0001 PayApp3 Core Mark Altanta |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000255 | 43 → 809 Craig St office | $12800 |  | D2: 6977d33f-4a07-4f0c-9627-953a41597488 | 1230ae2f-7c3e-47bc-9d3b-02cdefdab503 | Craig Street Office Flooring |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000255 | 43 → 809 Craig St office | $12800 |  | D2: 6977d33f-4a07-4f0c-9627-953a41597488 | fbb60555-64d5-49ef-8c19-8d760082be53 | Craig Street Office Flooring |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 001294 | 43 → 53 Crate Escapes | $564 |  | D2: 2a207c24-87b4-479f-a0b1-4a61bfc4b2a4,b4f6d665-b5cf-460a-bfd0-a198f4b6f80a |  | Invoice 260446 : Crate Escapes Office - 10/30/2024 |
| REPOINT | MEDIUM | direct_cost | 001544 | 43 → 53 Crate Escapes | $4500 |  |  |  | Pay App#1 - Framing and Siding Labor - Crate Escapes |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 001582 | 43 → 53 Crate Escapes | $1555.65 |  | D2: 461a29f9-b047-4bf7-9bf6-11c2f682cfb3,f3f7cc22-5b10-4ff5-9865-f335ecccc15d,88bc42a2-374a-4a4b-bd86-a2273087c65d |  | Crate Escapes - Westfield Dog Park & Bar |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 001849 | 43 → 53 Crate Escapes | $242 |  | D2: ec746298-9557-40ea-8a6d-f17ef1718d1a,21ef6b27-759a-45e5-8a47-a7bc6d5dce08 |  | Invoice #72555420 - SM PRIMED - CRATE ESCAPES |
| ASSIGN | MEDIUM | ap_bill | 001157 | null → 766 Forza Dayton | $4200 |  |  |  | Invoice #782 - Architectural Design - Construction Documents - Forza D |
| ASSIGN | MEDIUM | ap_bill | 001158 | null → 766 Forza Dayton | $700 |  |  |  | Invoice #784 -Architectural Design - Construction Documents: ASR #1 -  |
| ASSIGN | MEDIUM | ap_bill | 001159 | null → 766 Forza Dayton | $2000 |  |  |  | Invoice #786 -Architectural Design -  Architectural Design Drafting La |
| ASSIGN | MEDIUM | ap_bill | 001290 | null → 24109 Goodwill Bloomington | $8500 |  |  |  | Goodwill Bloomington Survey and Civil Retainer |
| ASSIGN | MEDIUM | ap_bill | 001462 | null → 24109 Goodwill Bloomington | $2027.5 |  |  |  | Invoice # 170569000-1124 (Goodwill Bloomington - CONSTRUCTION DOCUMENT |
| REPOINT | MEDIUM | ap_bill | 003671 | 47 → 24109 Goodwill Bloomington | $4500 |  |  |  | GW Bloomington |
| REPOINT | MEDIUM | direct_cost | 003671 | 47 → 24109 Goodwill Bloomington | $4500 |  |  |  | GW Bloomington |
| REPOINT | MEDIUM | direct_cost | PM00010358 | 47 → 24109 Goodwill Bloomington | $-26429.38 |  |  |  | RI-5048-0002 GW Bloomington Pay App 2 |
| REPOINT | MEDIUM | direct_cost | 002977 | 43 → 830 Goodwill Curb Cut | $972 |  |  |  | SC-2787-0001 Goodwill Curb Cut - Retainage |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 002109 | 43 → 836 Goodwill Foundations | $900 |  | D2: 20c8b316-1eb0-485d-975b-6b56288c4466,e59ae9fa-bcaa-4fdc-b09b-602940b56044 | b8bfa2eb-2b90-4a48-bdfb-6eb5dee54d42 | Goodwill Foundations |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 002110 | 43 → 836 Goodwill Foundations | $900 |  | D2: 20c8b316-1eb0-485d-975b-6b56288c4466,e59ae9fa-bcaa-4fdc-b09b-602940b56044 | c3255ff5-3775-4dd5-b951-4daf9a567afb | Goodwill Foundations |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 002538 | 43 → 836 Goodwill Foundations | $4500 |  | D3: 5f271db0-960e-4e5a-94b4-0069a1dc4346 |  | Credit for not having to combine meters - Goodwill Foundations |
| REPOINT | MEDIUM | direct_cost | 002581 | 43 → 836 Goodwill Foundations | $500 |  |  |  | Credit for not having to combine meters - Goodwill Foundations |
| REPOINT | MEDIUM | ap_bill | 003456 | 754 → 25125 Goodwill Noblesville | $133.88 |  |  |  | I49394 - Standard Toilet - Goodwill Noblesville 5/6/26-6/4/26 |
| REPOINT | MEDIUM | direct_cost | 003456 | 754 → 25125 Goodwill Noblesville | $133.88 |  |  |  | I49394 - Standard Toilet - Goodwill Noblesville 5/6/26-6/4/26 |
| REPOINT | MEDIUM | direct_cost | PM00010017 | 762 → 871 Goodwill Pioneer | $-130328.27 |  |  |  | RI-7654-0001 Goodwill Pioneer Parkway Pay App 1 |
| ASSIGN | MEDIUM | ap_bill | 002876 | null → 25108 Goodwill Tremont | $705.03 |  |  |  | 12/01/25 to 12/31/25 TD25308:Goodwill - Tremont St. Indianapolis, I |
| REPOINT | MEDIUM | ap_bill | 003238 | 865 → 870 Goodwill Washington | $4950 |  |  |  | SC-8105-0004 3236 GW Washington Pay App 1 |
| REPOINT | MEDIUM | direct_cost | 003238 | 865 → 870 Goodwill Washington | $5500 |  |  |  | SC-8105-0004 3236 GW Washington Pay App 1 |
| REPOINT | MEDIUM | ap_bill | 003275 | 754 → 870 Goodwill Washington | $487.3 |  |  |  | GW Washington Trash Service 4/21/26 |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 003275 | 754 → 870 Goodwill Washington | $487.3 |  | D2: 1319b749-c9cf-472f-a2de-ca81b5dde121 | c4020478-0aee-44ff-b381-1642caf76717,7214049b-8070-43e3-b9b6-68ed0f095f75 | GW Washington Trash Service 4/21/26 |
| REPOINT | MEDIUM | ap_bill | 003276 | 754 → 870 Goodwill Washington | $487.3 |  |  |  | GW Washington Trash Service 4/21/26 |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 003276 | 754 → 870 Goodwill Washington | $487.3 |  | D2: 1319b749-c9cf-472f-a2de-ca81b5dde121 | e63302e3-cbed-45ff-aaaa-33b6615fcd1c,7214049b-8070-43e3-b9b6-68ed0f095f75 | GW Washington Trash Service 4/21/26 |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | PM00010381 | 754 → 870 Goodwill Washington | $487.3 |  | D2: 1319b749-c9cf-472f-a2de-ca81b5dde121 | c4020478-0aee-44ff-b381-1642caf76717,e63302e3-cbed-45ff-aaaa-33b6615fcd1c | GW Washington Trash Service 4/21/26 |
| REPOINT | MEDIUM | direct_cost | PM00010382 | 754 → 870 Goodwill Washington | $-487.3 |  |  |  | GW Washington Trash Service 4/21/26 |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 002488 | 43 → 840 Goodwill- Decatur | $18654 |  | D2: a5abcbe0-87b3-4289-98b3-8d8c529a70f2,0c4e312a-5ba0-4416-93ac-abb3eb17e90e,cf54af87-1ec1-41bc-adad-7df18cf01461 |  | SC-4389-0001 Goodwill Decatur (July Billing) |
| ASSIGN | MEDIUM | ap_bill | 000139 | null → 805 Purrs and Gurrs | $3040.97 |  |  |  | Purrs and Gurrs |
| REPOINT | MEDIUM | direct_cost | 000139 | 43 → 805 Purrs and Gurrs | $3040.97 |  |  |  | Purrs and Gurrs |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000373 | 43 → 805 Purrs and Gurrs | $2728.5 |  | D2: 10db78b3-8aac-4620-9e15-49d4c7356107 | 56005679-207c-4d32-a203-c3a8a17e4c8a | Purrs and Gurrs |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 000373 | 43 → 805 Purrs and Gurrs | $2728.5 |  | D2: 10db78b3-8aac-4620-9e15-49d4c7356107 | 8c0b09aa-1ecb-4652-b2f5-be858db58be0 | Purrs and Gurrs |
| REPOINT | MEDIUM | direct_cost | PM00007288 | 796 → 25113 Radial Martinsville VA | $79.45 |  |  |  | AIRBNB * Kebba Trim to Radial Martinsville? |
| REPOINT | MEDIUM | direct_cost | PM00007293 | 796 → 25113 Radial Martinsville VA | $47.98 |  |  |  | UBER   *TRIP Kebba Trim to Radial Martinsville |
| REPOINT | MEDIUM | direct_cost | PM00007294 | 796 → 25113 Radial Martinsville VA | $3 |  |  |  | UBER   *TRIP Kebba Trim to Radial Martinsville |
| REPOINT | MEDIUM | direct_cost | PM00007296 | 796 → 25113 Radial Martinsville VA | $8 |  |  |  | UBER   *TRIP Kebba Trim to Radial Martinsville |
| REPOINT | MEDIUM | direct_cost | PM00007297 | 796 → 25113 Radial Martinsville VA | $84.96 |  |  |  | UBER   *TRIP Kebba Trim to Radial Martinsville |
| REPOINT | MEDIUM | direct_cost | PM00007298 | 796 → 25113 Radial Martinsville VA | $99.61 |  |  |  | UBER   *TRIP Kebba Trim to Radial Martinsville |
| REPOINT | MEDIUM | direct_cost | PM00007299 | 796 → 25113 Radial Martinsville VA | $292.18 |  |  |  | DELTA AIR  Kebba Trim to Radial Martinsville |
| ASSIGN | MEDIUM | ap_bill | 002169 | null → 841 The Roebling Homes | $1700 |  |  |  | INV 49176072525 - Roebling Homes |
| ASSIGN | MEDIUM | ap_bill | 002330 | null → 841 The Roebling Homes | $0 |  |  |  | INV 49176072525 - Roebling Homes |
| REPOINT | MEDIUM | direct_cost | 002347 | 43 → 55 Ulta Dallas | $26981.22 |  |  |  | Amod HVAC Demo - Ulta Dallas PayApp2 |
| DUPLICATE→SOFT-DELETE | MEDIUM | direct_cost | 002348 | 43 → 55 Ulta Dallas | $242830.96 |  | D3: 49c68f82-e798-44ad-b382-f258ca5cea2d |  | Amod HVAC Demo - Ulta Dallas PayApp2 |
| REPOINT | MEDIUM | ap_bill | 000562 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 221225 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | direct_cost | 000562 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 221225 - Ulta Beauty Greenwood |
| ASSIGN | MEDIUM | ap_bill | 000570 | null → 1031 Ulta Greenwood | $564 |  |  |  | Invoice 221734 - Ulta Beauty Greenwood |
| ASSIGN | MEDIUM | ap_bill | 000572 | null → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 222132 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | ap_bill | 000577 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 222933 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | direct_cost | 000577 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 222933 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | ap_bill | 000587 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood - Invoice 223343 |
| REPOINT | MEDIUM | direct_cost | 000587 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood - Invoice 223343 |
| REPOINT | MEDIUM | ap_bill | 000684 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood |
| REPOINT | MEDIUM | direct_cost | 000684 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood |
| REPOINT | MEDIUM | direct_cost | PM00000392 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 221225 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | direct_cost | PM00000395 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Invoice 222933 - Ulta Beauty Greenwood |
| REPOINT | MEDIUM | direct_cost | PM00000400 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood - Invoice 223343 |
| REPOINT | MEDIUM | direct_cost | PM00000471 | 800 → 1031 Ulta Greenwood | $658 |  |  |  | Dumpster Ulta Greenwood |
