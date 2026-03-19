# Change Order & Change Event — Table Audit

**Date:** 2026-03-19
**Purpose:** Identify which database tables are actively used vs. orphaned/legacy, to clean up confusion and prevent errors.

---

## KEEP — Actively Used (10 tables)

| Table | Rows | What It Does | Why Keep |
|-------|------|-------------|----------|
| `prime_contract_change_orders` | 100 | COs against the owner-GC contract (PCCOs). Synced from Acumatica. | Core data — powers the Prime Contract tab on the Change Orders page |
| `contract_change_orders` | 133 | COs against sub/vendor commitments (CCOs). Synced from Acumatica. | Core data — powers the Commitment tab on the Change Orders page |
| `commitment_change_order_lines` | 0 | Line items for commitment COs (cost code breakdowns) | Referenced by 27 files. Zero rows now but the schema is actively used in budget/contract APIs |
| `change_events` | 20 | Tracks potential changes *before* they become COs (the precursor step) | Fully implemented feature with its own pages, API routes, hooks |
| `change_event_line_items` | 2 | Cost/revenue estimates per change event | Used in conversion-to-CO flow and budget calcs |
| `change_event_history` | 20 | Audit trail of modifications to change events | Used by history API route |
| `change_event_approvals` | 0 | Approval workflow state for change events | Used by approval API route — empty because none are approved yet |
| `change_event_attachments` | 0 | File attachments on change events | Full CRUD API exists |
| `change_event_rfqs` | 0 | RFQs sent to subs for pricing on change events | API routes exist, feature is built |
| `change_event_rfq_responses` | 0 | Sub responses to those RFQs | API routes exist |

---

## DELETE — Legacy/Orphaned (8 tables)

| Table | Rows | What It Is | Why Delete |
|-------|------|-----------|------------|
| `change_orders` | 0 | Legacy "general" CO table. Was supposed to be the main CO table but was superseded by `prime_contract_change_orders` and `contract_change_orders`. | Zero rows. All code references removed. The detail page, hooks, and API routes for this table are dead code. |
| `change_order_approvals` | 0 | Approval log for the legacy `change_orders` table (FK to `change_orders.id`) | Parent table is empty and being deleted. Only referenced in schema docs, never queried by app code. |
| `change_order_attachments` | 0 | Attachments for the legacy `change_orders` table (FK to `change_orders.id`) | Parent table is empty and being deleted. API routes exist but have never stored a file. |
| `change_order_costs` | 0 | Cost breakdown (labor/materials/sub/overhead/contingency) for legacy `change_orders` | Parent table is empty. Zero code references. Only appears in schema docs. |
| `change_order_lines` | 0 | Line items for the legacy `change_orders` table | Parent table is empty. Referenced in budget code but since `change_orders` has zero rows, these queries always return nothing. Budget already gets real data from `commitment_change_order_lines`. |
| `prime_potential_change_orders` | 0 | Potential COs that haven't been formalized yet. Procore concept (PCOs before they become PCCOs). | Zero rows, zero code references. Only exists in auto-generated types file. Never implemented. |
| `change_event_rfq_attachments` | 0 | Attachments on RFQ responses | Zero rows, zero code references. Only in auto-generated types. RFQ feature exists but attachments were never implemented. |
| `acumatica_change_orders` | 1,817 | Staging table from the Acumatica sync. Raw imported data that gets processed into `prime_contract_change_orders` and `contract_change_orders`. | **CHECK FIRST:** No frontend code references it, but the Python sync pipeline may still write to it. Verify with backend/sync code before deleting. |

---

## Deletion Order

FK dependencies require dropping children before parents:

```
1. change_order_approvals        (FK → change_orders)
2. change_order_attachments      (FK → change_orders)
3. change_order_costs            (FK → change_orders)
4. change_order_lines            (FK → change_orders)
5. change_orders                 (parent — safe after children removed)
6. prime_potential_change_orders  (no FKs pointing to it)
7. change_event_rfq_attachments  (no FKs pointing to it)
8. acumatica_change_orders       (only after confirming sync pipeline doesn't need it)
```

---

## Dead Code to Clean Up After Table Deletion

Once the legacy `change_orders` table is dropped, these code paths become dead:

| File | What to Do |
|------|-----------|
| `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/route.ts` | Delete — served the legacy `change_orders` table |
| `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/approve/route.ts` | Delete |
| `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/reject/route.ts` | Delete |
| `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/line-items/` | Delete entire directory |
| `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/attachments/` | Delete entire directory |
| `frontend/src/app/api/projects/[projectId]/change-orders/route.ts` | Delete (list/create for legacy table) |
| `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx` | Delete — old detail page for legacy COs |
| `frontend/src/hooks/use-change-orders.ts` | Delete — hook wrapping the legacy table |
| `frontend/src/lib/change-orders/status-transitions.ts` | Review — may only apply to legacy table |
| `frontend/src/lib/change-orders/reviewer-access.ts` | Review — `canReviewGeneralChangeOrder()` is dead code |
| `frontend/src/components/domain/change-orders/ApprovalWorkflow.tsx` | Review — may only be used by old detail page |
| `frontend/src/components/domain/change-orders/LineItemsTable.tsx` | Review — used by old detail page's line items tab |
