# Cross-project mis-attribution audit — dry run

Generated: 2026-07-09T08:31:23.523Z
Scope: all Acumatica-originated ap_bills + direct_costs
Scanned: 3584 ap_bills, 6457 direct_costs (acumatica-originated).

**93 suspected mis-attributions** (description names a different project than `project_id`).

| conf | kind | ref | vendor | current project | → named in description | amount | description |
|------|------|-----|--------|-----------------|------------------------|--------|-------------|
| HIGH | ap_bill | 002880 | UPPERTUL | null  | 1012 CEVA Bernville ASRS Phase 2 (number) | $25483.5 | Sprinkler permit 26-104 |
| HIGH | ap_bill | 002895 | CLFIRE | null  | 1012 CEVA Bernville ASRS Phase 2 (number) | $15000 | 26-104 26-104 - CEVA Bernville ASRS Phase 2 Bernville, PA |
| HIGH | ap_bill | 003492 | DKGR | 1008 Champaign Ace Addition | 1028 Champagne Ace Addition IL (number) | $34000 | PO-8530-0001 Champagne Ace 003492 Pay App 1 |
| HIGH | direct_cost | 003492 | 85e5be1f-2521-40c1-8b20-2b223f17f9a3 | 1008 Champaign Ace Addition | 1028 Champagne Ace Addition IL (number) | $34000 | PO-8530-0001 Champagne Ace 003492 Pay App 1 |
| HIGH | ap_bill | 001653 | SIEMENS | null  | 829 Core Mark (number) | $10000 | Double Payment 001A  24-107 |
| HIGH | direct_cost | 001653 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 829 Core Mark (number) | $10000 | Double Payment 001A  24-107 |
| HIGH | direct_cost | 000888 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 805 Purrs and Gurrs (number) | $17332 | Project 22-107 CC 26-1000 Electrical - To close bill / paid via settlement. |
| HIGH | direct_cost | 000889 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 805 Purrs and Gurrs (number) | $2828.03 | Project 22-107 CC 22-1116 Plumbing - to close bill / paid via settlement. |
| HIGH | ap_bill | 000922 | H&HDES | null  | 822 Zion Pratt Whitney (number) | $12000 | Invoice 1143 : Design ASRS System for Zion Pratt Whitney project PO# 23-112 |
| HIGH | ap_bill | 000947 | H&HDES | null  | 822 Zion Pratt Whitney (number) | $5000 | Design ASRS System for Zion Pratt Whitney project PO# 23-112 |
| MEDIUM | ap_bill | 001654 | CHRISTIAN | null  | 24108 Aspire Ridge Haven (name) | $1300 | Ridge Haven plan & Aspire Oaktree plan |
| MEDIUM | direct_cost | 000218 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $32567.5 | Permits for Bella North Vegas |
| MEDIUM | direct_cost | 000218 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $32567.5 | Permits for Bella North Vegas |
| MEDIUM | direct_cost | 000345 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $24479.8 | permits for Bella North Las Vegas |
| MEDIUM | direct_cost | 000345 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $24479.8 | permits for Bella North Las Vegas |
| MEDIUM | direct_cost | 000380 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $223429.8 | Permits Bella Vegas |
| MEDIUM | direct_cost | 000380 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 810 Bella Vegas (name) | $223429.8 | Permits Bella Vegas |
| MEDIUM | ap_bill | 000624 | MATCON | null  | 820 Brennan Pittsburgh (name) | $4600 | Invoice 28498 Brennan Pittsburgh Concrete Cutting |
| MEDIUM | ap_bill | 000675 | MATCON | null  | 820 Brennan Pittsburgh (name) | $4600 | Invoice 28498 Brennan Pittsburgh Concrete Cutting - to correct Class |
| MEDIUM | direct_cost | 000675 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 820 Brennan Pittsburgh (name) | $4600 | Invoice 28498 Brennan Pittsburgh Concrete Cutting - to correct Class |
| MEDIUM | ap_bill | 001910 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $63099 | SC-2733-0001 PayApp1 Core Mark Altanta |
| MEDIUM | direct_cost | 001910 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 832 Core Mark Atlanta | 829 Core Mark (name) | $70110 | SC-2733-0001 PayApp1 Core Mark Altanta |
| MEDIUM | ap_bill | 002009 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $9611.88 | SC-2733-0001 PayApp2 Core Mark Altanta |
| MEDIUM | direct_cost | 002009 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 832 Core Mark Atlanta | 829 Core Mark (name) | $10679.86 | SC-2733-0001 PayApp2 Core Mark Altanta |
| MEDIUM | ap_bill | 002252 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $7599.6 | SC-2733-0001 PayApp3 Core Mark Altanta |
| MEDIUM | direct_cost | 002252 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 832 Core Mark Atlanta | 829 Core Mark (name) | $8444 | SC-2733-0001 PayApp3 Core Mark Altanta |
| MEDIUM | ap_bill | 002253 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $1067.98 | SC-2733-0001 PayApp2 Core Mark Altanta |
| MEDIUM | ap_bill | 002254 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $7011 | SC-2733-0001 PayApp1 Core Mark Altanta |
| MEDIUM | ap_bill | 002256 | SEVHILLS | 832 Core Mark Atlanta | 829 Core Mark (name) | $844.4 | SC-2733-0001 PayApp3 Core Mark Altanta |
| MEDIUM | direct_cost | 000255 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 809 Craig St office (name) | $12800 | Craig Street Office Flooring |
| MEDIUM | direct_cost | 000255 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 809 Craig St office (name) | $12800 | Craig Street Office Flooring |
| MEDIUM | direct_cost | 001294 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 53 Crate Escapes (name) | $564 | Invoice 260446 : Crate Escapes Office - 10/30/2024 |
| MEDIUM | direct_cost | 001544 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 53 Crate Escapes (name) | $4500 | Pay App#1 - Framing and Siding Labor - Crate Escapes |
| MEDIUM | direct_cost | 001582 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 53 Crate Escapes (name) | $1555.65 | Crate Escapes - Westfield Dog Park & Bar |
| MEDIUM | direct_cost | 001849 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 53 Crate Escapes (name) | $242 | Invoice #72555420 - SM PRIMED - CRATE ESCAPES |
| MEDIUM | ap_bill | 001157 | KIMSMI | null  | 766 Forza Dayton (name) | $4200 | Invoice #782 - Architectural Design - Construction Documents - Forza Dayton job  |
| MEDIUM | ap_bill | 001158 | KIMSMI | null  | 766 Forza Dayton (name) | $700 | Invoice #784 -Architectural Design - Construction Documents: ASR #1 - Forza Dayt |
| MEDIUM | ap_bill | 001159 | KIMSMI | null  | 766 Forza Dayton (name) | $2000 | Invoice #786 -Architectural Design -  Architectural Design Drafting Layout - For |
| MEDIUM | ap_bill | 001290 | KIMHOR | null  | 24109 Goodwill Bloomington (name) | $8500 | Goodwill Bloomington Survey and Civil Retainer |
| MEDIUM | ap_bill | 001462 | KIMHOR | null  | 24109 Goodwill Bloomington (name) | $2027.5 | Invoice # 170569000-1124 (Goodwill Bloomington - CONSTRUCTION DOCUMENTS and MEET |
| MEDIUM | ap_bill | 003671 | KIMHOR | 47 Goodwill Bloomington Excel | 24109 Goodwill Bloomington (name) | $4500 | GW Bloomington |
| MEDIUM | direct_cost | 003671 | d7fe27b0-fbca-4584-a18b-09dd3a969e89 | 47 Goodwill Bloomington Excel | 24109 Goodwill Bloomington (name) | $4500 | GW Bloomington |
| MEDIUM | direct_cost | PM00010358 | b264a228-96a9-40ea-9d1f-1cf9a862b9ce | 47 Goodwill Bloomington Excel | 24109 Goodwill Bloomington (name) | $-26429.38 | RI-5048-0002 GW Bloomington Pay App 2 |
| MEDIUM | direct_cost | 002977 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 830 Goodwill Curb Cut (name) | $972 | SC-2787-0001 Goodwill Curb Cut - Retainage |
| MEDIUM | direct_cost | 002109 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 836 Goodwill Foundations (name) | $900 | Goodwill Foundations |
| MEDIUM | direct_cost | 002110 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 836 Goodwill Foundations (name) | $900 | Goodwill Foundations |
| MEDIUM | direct_cost | 002538 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 836 Goodwill Foundations (name) | $4500 | Credit for not having to combine meters - Goodwill Foundations |
| MEDIUM | direct_cost | 002581 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 836 Goodwill Foundations (name) | $500 | Credit for not having to combine meters - Goodwill Foundations |
| MEDIUM | ap_bill | 003456 | ANYTIME | 754 Goodwill Allisonville Rd IN | 25125 Goodwill Noblesville (name) | $133.88 | I49394 - Standard Toilet - Goodwill Noblesville 5/6/26-6/4/26 |
| MEDIUM | direct_cost | 003456 | 020fa3a5-2961-4216-b384-490fbc6f5e40 | 754 Goodwill Allisonville Rd IN | 25125 Goodwill Noblesville (name) | $133.88 | I49394 - Standard Toilet - Goodwill Noblesville 5/6/26-6/4/26 |
| MEDIUM | direct_cost | PM00010017 | b264a228-96a9-40ea-9d1f-1cf9a862b9ce | 762 Goodwill Pioneer PKWY | 871 Goodwill Pioneer (name) | $-130328.27 | RI-7654-0001 Goodwill Pioneer Parkway Pay App 1 |
| MEDIUM | ap_bill | 002876 | ALTWITZ | null  | 25108 Goodwill Tremont (name) | $705.03 | 12/01/25 to 12/31/25 TD25308:Goodwill - Tremont St. Indianapolis, I |
| MEDIUM | ap_bill | 003238 | CERTAPRO | 865 Goodwill Canton, IL | 870 Goodwill Washington (name) | $4950 | SC-8105-0004 3236 GW Washington Pay App 1 |
| MEDIUM | direct_cost | 003238 | aa9e831b-c361-4bc5-bcf7-cc419ef0c159 | 865 Goodwill Canton, IL | 870 Goodwill Washington (name) | $5500 | SC-8105-0004 3236 GW Washington Pay App 1 |
| MEDIUM | ap_bill | 003275 | GFL ENV | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | direct_cost | 003275 | ceeab026-8db5-46ec-bd0a-1eaf5b685e96 | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | ap_bill | 003276 | GFL ENV | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | direct_cost | 003276 | ceeab026-8db5-46ec-bd0a-1eaf5b685e96 | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | direct_cost | PM00010381 | ceeab026-8db5-46ec-bd0a-1eaf5b685e96 | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | direct_cost | PM00010382 | ceeab026-8db5-46ec-bd0a-1eaf5b685e96 | 754 Goodwill Allisonville Rd IN | 870 Goodwill Washington (name) | $-487.3 | GW Washington Trash Service 4/21/26 |
| MEDIUM | direct_cost | 002488 |  | 43 Westfield Collective | 840 Goodwill- Decatur (name) | $18654 | SC-4389-0001 Goodwill Decatur (July Billing) |
| MEDIUM | ap_bill | 000139 | FBM | null  | 805 Purrs and Gurrs (name) | $3040.97 | Purrs and Gurrs |
| MEDIUM | direct_cost | 000139 |  | 43 Westfield Collective | 805 Purrs and Gurrs (name) | $3040.97 | Purrs and Gurrs |
| MEDIUM | direct_cost | 000373 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 805 Purrs and Gurrs (name) | $2728.5 | Purrs and Gurrs |
| MEDIUM | direct_cost | 000373 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 805 Purrs and Gurrs (name) | $2728.5 | Purrs and Gurrs |
| MEDIUM | direct_cost | PM00007288 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $79.45 | AIRBNB * Kebba Trim to Radial Martinsville? |
| MEDIUM | direct_cost | PM00007293 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $47.98 | UBER   *TRIP Kebba Trim to Radial Martinsville |
| MEDIUM | direct_cost | PM00007294 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $3 | UBER   *TRIP Kebba Trim to Radial Martinsville |
| MEDIUM | direct_cost | PM00007296 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $8 | UBER   *TRIP Kebba Trim to Radial Martinsville |
| MEDIUM | direct_cost | PM00007297 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $84.96 | UBER   *TRIP Kebba Trim to Radial Martinsville |
| MEDIUM | direct_cost | PM00007298 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $99.61 | UBER   *TRIP Kebba Trim to Radial Martinsville |
| MEDIUM | direct_cost | PM00007299 |  | 796 Radial Avon IN | 25113 Radial Martinsville VA (name) | $292.18 | DELTA AIR  Kebba Trim to Radial Martinsville |
| MEDIUM | ap_bill | 002169 | SCOTTO | null  | 841 The Roebling Homes (name) | $1700 | INV 49176072525 - Roebling Homes |
| MEDIUM | ap_bill | 002330 | SCOTTO | null  | 841 The Roebling Homes (name) | $0 | INV 49176072525 - Roebling Homes |
| MEDIUM | direct_cost | 002347 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 55 Ulta Dallas (name) | $26981.22 | Amod HVAC Demo - Ulta Dallas PayApp2 |
| MEDIUM | direct_cost | 002348 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 43 Westfield Collective | 55 Ulta Dallas (name) | $242830.96 | Amod HVAC Demo - Ulta Dallas PayApp2 |
| MEDIUM | ap_bill | 000562 | RENASCENT | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 221225 - Ulta Beauty Greenwood |
| MEDIUM | direct_cost | 000562 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 221225 - Ulta Beauty Greenwood |
| MEDIUM | ap_bill | 000570 | RENASCENT | null  | 1031 Ulta Greenwood (name) | $564 | Invoice 221734 - Ulta Beauty Greenwood |
| MEDIUM | ap_bill | 000572 | RENASCENT | null  | 1031 Ulta Greenwood (name) | $658 | Invoice 222132 - Ulta Beauty Greenwood |
| MEDIUM | ap_bill | 000577 | RENASCENT | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 222933 - Ulta Beauty Greenwood |
| MEDIUM | direct_cost | 000577 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 222933 - Ulta Beauty Greenwood |
| MEDIUM | ap_bill | 000587 | RENASCENT | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood - Invoice 223343 |
| MEDIUM | direct_cost | 000587 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood - Invoice 223343 |
| MEDIUM | ap_bill | 000684 | RENASCENT | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood |
| MEDIUM | direct_cost | 000684 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood |
| MEDIUM | direct_cost | PM00000392 | 0222463c-1ee9-4257-a07c-48ffa5d71e42 | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 221225 - Ulta Beauty Greenwood |
| MEDIUM | direct_cost | PM00000395 | 0222463c-1ee9-4257-a07c-48ffa5d71e42 | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Invoice 222933 - Ulta Beauty Greenwood |
| MEDIUM | direct_cost | PM00000400 | 0222463c-1ee9-4257-a07c-48ffa5d71e42 | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood - Invoice 223343 |
| MEDIUM | direct_cost | PM00000471 | 0222463c-1ee9-4257-a07c-48ffa5d71e42 | 800 Ulta Beauty Sprinkler/Electrical | 1031 Ulta Greenwood (name) | $658 | Dumpster Ulta Greenwood |
| MEDIUM | ap_bill | 002087 | RENASCENT | 836 Goodwill Foundations | 43 Westfield Collective (name) | $445 | Invoice 281512 : Westfield Collective 6/30 |
| MEDIUM | direct_cost | 002087 | bef9dcfc-531e-47c9-90a5-4cadd99447fb | 836 Goodwill Foundations | 43 Westfield Collective (name) | $445 | Invoice 281512 : Westfield Collective 6/30 |
| MEDIUM | ap_bill | 002125 | JQOL | 24109 Goodwill Bloomington | 43 Westfield Collective (name) | $150 | Inv101294 - Construction Administration - Westfield Collective |

## Unassigned (project_id NULL) — description names exactly one project (assignable)

| ref | vendor | → project | amount | description |
|-----|--------|-----------|--------|-------------|
| 001653 | SIEMENS | 829 Core Mark | $10000 | Double Payment 001A  24-107 |
| 001158 | KIMSMI | 766 Forza Dayton | $700 | Invoice #784 -Architectural Design - Construction Documents: ASR #1 - Forza Dayt |
| 000675 | MATCON | 820 Brennan Pittsburgh | $4600 | Invoice 28498 Brennan Pittsburgh Concrete Cutting - to correct Class |
| 002880 | UPPERTUL | 1012 CEVA Bernville ASRS Phase 2 | $25483.5 | Sprinkler permit 26-104 |
| 002895 | CLFIRE | 1012 CEVA Bernville ASRS Phase 2 | $15000 | 26-104 26-104 - CEVA Bernville ASRS Phase 2 Bernville, PA |
| 000139 | FBM | 805 Purrs and Gurrs | $3040.97 | Purrs and Gurrs |
| 000570 | RENASCENT | 1031 Ulta Greenwood | $564 | Invoice 221734 - Ulta Beauty Greenwood |
| 000572 | RENASCENT | 1031 Ulta Greenwood | $658 | Invoice 222132 - Ulta Beauty Greenwood |
| 000624 | MATCON | 820 Brennan Pittsburgh | $4600 | Invoice 28498 Brennan Pittsburgh Concrete Cutting |
| 000922 | H&HDES | 822 Zion Pratt Whitney | $12000 | Invoice 1143 : Design ASRS System for Zion Pratt Whitney project PO# 23-112 |
| 000947 | H&HDES | 822 Zion Pratt Whitney | $5000 | Design ASRS System for Zion Pratt Whitney project PO# 23-112 |
| 001157 | KIMSMI | 766 Forza Dayton | $4200 | Invoice #782 - Architectural Design - Construction Documents - Forza Dayton job  |
| 001159 | KIMSMI | 766 Forza Dayton | $2000 | Invoice #786 -Architectural Design -  Architectural Design Drafting Layout - For |
| 001290 | KIMHOR | 24109 Goodwill Bloomington | $8500 | Goodwill Bloomington Survey and Civil Retainer |
| 001462 | KIMHOR | 24109 Goodwill Bloomington | $2027.5 | Invoice # 170569000-1124 (Goodwill Bloomington - CONSTRUCTION DOCUMENTS and MEET |
| 001654 | CHRISTIAN | 24108 Aspire Ridge Haven | $1300 | Ridge Haven plan & Aspire Oaktree plan |
| 002169 | SCOTTO | 841 The Roebling Homes | $1700 | INV 49176072525 - Roebling Homes |
| 002330 | SCOTTO | 841 The Roebling Homes | $0 | INV 49176072525 - Roebling Homes |
| 002876 | ALTWITZ | 25108 Goodwill Tremont | $705.03 | 12/01/25 to 12/31/25 TD25308:Goodwill - Tremont St. Indianapolis, I |
