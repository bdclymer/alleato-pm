# contract_change_orders.project_id backfill — reconcile

- Mode: **APPLY**  ·  DB: `https://lgveqfnpkxvzbnnwuled.supabase.co`
- 137 orphan rows (null project_id) of 172 total
- **AUTO 132** → backfilled  ·  **FLAG 5** → left null

## AUTO by project

| project_id | name | rows |
|---|---|---|
| 43 | Westfield Collective | 132 |

## FLAGGED (need human review)

| co# | contract_id (8) | amount | status | reason | description |
|---|---|---|---|---|---|
| CCO-002 | d0132bca | 45600 | approved | no acumatica_external_key | IT room supplemental CRAC unit and electrical |
| CCO-004 | d0132bca | 53340 | pending | no acumatica_external_key | Lobby polished concrete upgrade (VCT credit applied) |
| 000582 | 20906925 | 0 | pending | no acumatica_external_key | re-inserted |
| CCO-003 | d0132bca | 274200 | pending | no acumatica_external_key | Emergency generator, ATS, pad, and fuel storage |
| CCO-001 | d0132bca | 104592 | approved | no acumatica_external_key | Rock excavation — unforeseen subsurface conditions at footings A1-C4 |
