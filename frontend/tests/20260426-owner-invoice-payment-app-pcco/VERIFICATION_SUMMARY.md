# Owner Invoice + Payment Application PCCO Verification

Date: 2026-04-26
Project: 984 - Test Codex Budget Preview 2026-04-26

## Records

- Prime contract: `44a069a3-d7cb-40a5-8b85-3094c712aa32` / contract `177`
- Approved PCCO: `1724` / `001` / `$4,200.00`
- Payment application: `ad228cf0-338a-4796-af30-2242971ed1ae` / invoice `930126`
- Payment application line item: `65132657-fe5b-4603-a6b5-1c9b755fc54b`
- Owner invoice: `162` / `COD-OWNER-20260426130126`

## What Passed

- Prime Contract list now shows the approved PCCO in financial totals:
  - Original Contract Amount: `$900,000.00`
  - Approved Change Orders: `$4,200.00`
  - Revised Contract Amount: `$904,200.00`
- Payment application SOV population now includes approved prime contract change order lines from `pcco_line_items`.
- The populated payment application line item carried the PCCO cost code `03-3000` and scheduled value `$4,200.00`.
- Updating the payment application line item to `$4,200.00` completed work recalculated:
  - Retainage: `$420.00`
  - Net amount: `$3,780.00`
  - Percent complete: `100%`
- Linked owner invoice list now uses the payment application retainage values:
  - Gross amount: `$4,200.00`
  - Net amount: `$3,780.00`
  - Current changes: `$4,200.00`
  - Total contract amount: `$904,200.00`

## Fixes Made

- Added a shared live PCCO totals helper for prime contract financials.
- Updated prime contract list/detail APIs to merge live `prime_contract_change_orders` totals instead of trusting only the stale summary view.
- Updated owner invoice API to use the same live PCCO totals for total contract amount.
- Fixed owner invoice payment application join handling so the linked payment application object is read correctly.
- Fixed payment application SOV population to read approved `prime_contract_change_orders` and `pcco_line_items` instead of the commitment change order table.

## Evidence

- `session.webm`
- `01-prime-contracts-list.png`
- `02-owner-invoices-list.png`
- `03-payment-application-detail.png`

## Validation Commands

- `cd frontend && npx eslint 'src/lib/prime-contracts/live-change-order-totals.ts' 'src/app/api/projects/[projectId]/contracts/route.ts' 'src/app/api/projects/[projectId]/contracts/[contractId]/route.ts' 'src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts' 'src/app/api/projects/[projectId]/invoicing/owner/route.ts'`
- `cd frontend && npm run typecheck`

Both validation commands passed.
