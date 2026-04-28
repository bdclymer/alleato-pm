# Change Events, Change Orders, and Budget Verification

Date: 2026-04-26
Project: 984 - Test Codex Budget Preview 2026-04-26

## Records Created

- Change Event: `a0a2ac38-6e18-4a09-a2b7-e3526f2dda86`
- Change Event line item: `029b4dab-d2cc-4f37-b95b-c78d952efe4d`
- Prime Contract Change Order: `1724`, number `001`, status `approved`, amount `$4,200.00`
- PCCO line item: `2`, cost code `03-3000`, amount `$4,200.00`
- Commitment Change Order: `be80c5c1-90fc-4feb-b525-26eb1a04554c`, number `COD-CO-1777205655629`, status `approved`, amount `$1,800.00`
- Commitment CO line item: `d872f385-fe08-4bbd-a3a1-1ee44f466f07`, cost code `03-3000`, amount `$1,800.00`

## Verified Outcomes

- Budget line `cf293445-39e7-4531-b390-a1ec39f3b873` now shows:
  - Original: `$95,000.00`
  - Approved COs: `$4,200.00`
  - Revised budget: `$99,200.00`
  - Committed costs: `$1,800.00`
- Budget grand totals now show:
  - Original budget: `$280,000.00`
  - Approved COs: `$4,200.00`
  - Revised budget: `$284,200.00`
  - Committed costs: `$1,800.00`
- Budget change-order drilldown now returns the approved PCCO row for the affected cost code.
- Change Events list shows one CE and fixed tab counts: All `1`, Line Items `1`.
- Change Event detail loads and shows revenue ROM `$5,500.00`, cost ROM `$4,200.00`, and one line item.
- Prime Contracts list expansion shows `Change Orders (1)` with PCCO `001`.
- Commitment CO detail shows approved status, `$1,800.00`, and the linked `03-3000` line item.

## Fixes Applied During Verification

- `frontend/src/lib/budget/compute-grand-totals.ts`
  - Included live `pcco_line_items` / `prime_contract_change_orders` in approved and pending budget change totals.
  - Included lowercase commitment CO statuses and switched legacy `commitments` lookup to `commitments_unified`.
- `frontend/src/app/api/projects/[projectId]/budget/change-orders/route.ts`
  - Added `pcco_line_items` to budget change-order drilldown.
  - Removed the early return that hid PCCO rows when legacy `change_order_lines` was missing.
- `frontend/src/app/api/projects/[projectId]/change-events/route.ts`
  - Fixed `tabSummary` generation for `tab=all` so list badges reflect returned records.

## Artifacts

- `session.webm`
- `01-budget-approved-co-loaded.png`
- `02-change-events-list-clean.png`
- `04-prime-contracts-expanded-change-orders-loaded.png`
- `05-commitment-change-order-detail-loaded.png`
- `06-change-event-detail-line-items-clean.png`

## Validation Commands

- `cd frontend && npx eslint 'src/app/api/projects/[projectId]/change-events/route.ts' 'src/lib/budget/compute-grand-totals.ts' 'src/app/api/projects/[projectId]/budget/change-orders/route.ts'`
- `cd frontend && npm run typecheck`
- Direct authenticated API checks against:
  - `/api/projects/984/budget`
  - `/api/projects/984/budget/change-orders?budgetLineId=cf293445-39e7-4531-b390-a1ec39f3b873&status=approved`
  - `/api/projects/984/change-events?page=1&limit=10&tab=all`
  - `/api/projects/984/prime-contract-change-orders?search=Codex%20PCCO%20Budget%20Impact&per_page=5`
  - `/api/commitments/6cd0d246-3e38-4a84-b04a-47879db9ca74/change-orders`
