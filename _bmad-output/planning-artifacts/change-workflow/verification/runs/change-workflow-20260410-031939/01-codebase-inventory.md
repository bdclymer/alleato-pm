# Codebase Inventory: Change Workflow

## Scope

Full lifecycle: Change Events -> PCOs -> Change Orders (Prime Contract + Commitment paths)

---

## Database Tables

### `change_events`
- **Columns**: id (uuid), project_id, number, title, status, scope, type, reason, origin, description, expecting_revenue, line_item_revenue_source, prime_contract_id, potential_change_order_id, workflow_stage, originator_role, internal_subtype, created_by, updated_by, deleted_at, created_at, updated_at
- **FKs**: project_id -> projects, prime_contract_id -> prime_contracts, potential_change_order_id -> potential_change_orders

### `potential_change_orders` (PCOs)
- **Columns**: id (int), project_id, number, title, type, status, description, estimated_value, approved_value, markup_percentage, schedule_impact_days, schedule_impact_description, rfq_required, rfq_status, root_cause, annotation, annotation_note, current_version, prime_change_order_id, submitted_at, approved_at, created_by_id, created_at, updated_at
- **FKs**: project_id -> projects, prime_change_order_id -> prime_contract_change_orders

### `prime_contract_change_orders`
- **Columns**: id (int), project_id, prime_contract_id, contract_id, pcco_number, title, status, total_amount, description, change_reason, designated_reviewer, request_received_from, due_date, invoiced_date, revision, schedule_impact, revised_substantial_completion_date, location, reference, executed, field_change, is_private, paid_in_full, contract_company, rejection_reason, review_date, signed_co_received_date, submitted_at, approved_at, created_by, acumatica_external_key, created_at
- **FKs**: project_id -> projects, prime_contract_id -> prime_contracts

### `contract_change_orders` (Commitment COs)
- **Columns**: id (uuid), contract_id, contract_type, change_order_number, title, description, amount, status, change_reason, designated_reviewer, requested_by, requested_date, approved_by, approved_date, due_date, invoiced_date, revision, schedule_impact, location, reference, executed, field_change, is_private, paid_in_full, parallel_mode, prime_change_order_id, rejection_reason, contract_company, acumatica_external_key, created_by, created_at, updated_at
- **FKs**: contract_id -> financial_contracts, prime_change_order_id -> prime_contract_change_orders

### `change_orders` (Legacy/generic)
- **Columns**: id (uuid), project_id, number, title, status, type, reason, description, amount, due_date, change_event_id, commitment_id, prime_contract_id, executed_date, created_by, created_at, updated_at
- **FKs**: project_id -> projects

### `pco_change_events` (Junction table)
- Links PCOs to change events

---

## Page Routes

### Change Events
| Route | File | Purpose |
|-------|------|---------|
| `/{projectId}/change-events` | `change-events/page.tsx` | List page (UnifiedTablePage) with tabs: Line Items, No Line Items, RFQs, Recycle Bin |
| `/{projectId}/change-events/new` | `change-events/new/page.tsx` | Create form |
| `/{projectId}/change-events/{id}` | `change-events/[changeEventId]/page.tsx` | Detail page with tabs (General, Line Items, History, Related Items, Prime COs, Approval) |
| `/{projectId}/change-events/{id}/edit` | `change-events/[changeEventId]/edit/page.tsx` | Edit form |

### PCOs (Potential Change Orders)
| Route | File | Purpose |
|-------|------|---------|
| `/{projectId}/pcos` | `pcos/page.tsx` | List page (UnifiedTablePage) with KPI row |
| `/{projectId}/pcos/new` | `pcos/new/page.tsx` | Create form |
| `/{projectId}/pcos/{id}` | `pcos/[pcoId]/page.tsx` | Detail page |
| `/{projectId}/pcos/{id}/edit` | `pcos/[pcoId]/edit/page.tsx` | Edit form |

### Change Orders (Dual-tab: Prime + Commitment)
| Route | File | Purpose |
|-------|------|---------|
| `/{projectId}/change-orders` | `change-orders/page.tsx` + `change-orders-client.tsx` | List page with Prime/Commitment tabs |
| `/{projectId}/change-orders/prime/new` | `change-orders/prime/new/page.tsx` | Create prime CO form |
| `/{projectId}/change-orders/prime/{id}` | `change-orders/prime/[primeCoId]/page.tsx` | Prime CO detail |
| `/{projectId}/change-orders/commitment/new` | `change-orders/commitment/new/page.tsx` | Create commitment CO form |
| `/{projectId}/change-orders/commitment/{id}` | `change-orders/commitment/[commitmentCoId]/page.tsx` | Commitment CO detail |

### Also found:
- `/{projectId}/prime-contracts/change-orders/page.tsx` — Prime contract change orders sub-page

---

## API Routes

### Change Events
- `GET/POST /api/projects/{projectId}/change-events` — List + Create
- `GET/PUT/DELETE /api/projects/{projectId}/change-events/{id}` — CRUD
- `GET/POST /api/projects/{projectId}/change-events/{id}/line-items` — Line items
- `GET/PUT/DELETE /api/projects/{projectId}/change-events/{id}/line-items/{lineItemId}`
- `POST /api/projects/{projectId}/change-events/{id}/convert-to-change-order` — Convert CE to CO
- `POST /api/projects/{projectId}/change-events/add-to-pco` — Add CE to PCO
- `GET/POST /api/projects/{projectId}/change-events/{id}/attachments` — Attachments
- `GET/DELETE /api/projects/{projectId}/change-events/{id}/attachments/{attachmentId}`
- `GET /api/projects/{projectId}/change-events/{id}/attachments/{attachmentId}/download`
- `GET /api/projects/{projectId}/change-events/{id}/pdf` — PDF export
- `POST /api/projects/{projectId}/change-events/{id}/email` — Email
- `GET /api/projects/{projectId}/change-events/{id}/approvals` — Approval workflow
- `GET /api/projects/{projectId}/change-events/{id}/history` — History log
- `GET/POST/DELETE /api/projects/{projectId}/change-events/{id}/related-items` — Related items
- `GET /api/projects/{projectId}/change-events/{id}/related-items/options`
- `GET/POST /api/projects/{projectId}/change-events/rfqs` — RFQs
- `GET/PUT /api/projects/{projectId}/change-events/rfqs/{rfqId}`
- `GET/POST /api/projects/{projectId}/change-events/rfqs/{rfqId}/responses`
- `GET/POST /api/projects/{projectId}/change-events/{id}/prime-contract-change-orders`

### PCOs
- `GET/POST /api/projects/{projectId}/pcos` — List + Create
- `GET/PUT/DELETE /api/projects/{projectId}/pcos/{pcoId}` — CRUD
- `GET /api/projects/{projectId}/pcos/{pcoId}/change-events` — Linked CEs
- `GET/POST /api/projects/{projectId}/pcos/{pcoId}/line-items` — Line items
- `POST /api/projects/{projectId}/pcos/{pcoId}/client-decision` — Client decision
- `POST /api/projects/{projectId}/pcos/{pcoId}/convert-to-co` — Convert to CO
- `POST /api/projects/{projectId}/pcos/{pcoId}/submit` — Submit for review

### Prime Contract Change Orders
- `GET/POST /api/projects/{projectId}/prime-contract-change-orders` — List + Create
- `GET/PUT/DELETE /api/projects/{projectId}/prime-contract-change-orders/{id}` — CRUD
- `POST /api/projects/{projectId}/prime-contract-change-orders/{id}/approve` — Approve
- `POST /api/projects/{projectId}/prime-contract-change-orders/{id}/reject` — Reject
- `GET/POST /api/projects/{projectId}/prime-contract-change-orders/{id}/attachments`
- `DELETE /api/projects/{projectId}/prime-contract-change-orders/{id}/attachments/{attachmentId}`
- `GET /api/projects/{projectId}/prime-contract-change-orders/export` — Export

### Commitment Change Orders
- `GET/POST /api/projects/{projectId}/commitment-change-orders` — List + Create
- `GET/PUT/DELETE /api/projects/{projectId}/commitment-change-orders/{id}` — CRUD
- `GET/POST /api/projects/{projectId}/commitment-change-orders/{id}/attachments`
- `DELETE /api/projects/{projectId}/commitment-change-orders/{id}/attachments/{attachmentId}`
- `GET /api/projects/{projectId}/commitment-change-orders/export` — Export
- `GET/POST /api/commitments/{commitmentId}/change-orders` — Legacy per-commitment route
- `GET/PUT/DELETE /api/commitments/{commitmentId}/change-orders/{changeOrderId}` — Legacy
- `POST /api/commitments/{commitmentId}/change-orders/{changeOrderId}/approve`
- `POST /api/projects/{projectId}/contracts/{contractId}/change-orders` — Contract-scoped
- `GET/PUT/DELETE /api/projects/{projectId}/contracts/{contractId}/change-orders/{changeOrderId}`
- `POST /api/projects/{projectId}/contracts/{contractId}/change-orders/{changeOrderId}/approve`
- `POST /api/projects/{projectId}/contracts/{contractId}/change-orders/{changeOrderId}/reject`

---

## Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useChangeEvents` | `hooks/use-change-events.ts` | Fetch/create change events |
| `useProjectChangeEvents` | `hooks/use-change-events.ts` | Project-scoped wrapper |
| `useChangeEventDetail` | `hooks/use-change-event-detail.ts` | Single CE detail fetch |
| `useChangeManagement` | `hooks/use-change-management.ts` | Combined pipeline view (CEs + Prime COs + Commitment COs) |
| `useProjectPCOs` | `hooks/use-pcos.ts` | Fetch PCOs for a project |

---

## Domain Components

### Change Events
- `ChangeEventForm` — Create/edit form
- `ChangeEventExpandedRow` — Inline line items expansion
- `ChangeEventSelectionBar` — Bulk actions bar
- `ChangeEventRfqForm` — Send RFQ form
- `ChangeEventGeneralInfoPanel` — Detail view info panel
- `ChangeEventLineItemsTable` — Line items table
- `ChangeEventHistoryTab` — Audit history
- `ChangeEventRelatedItemsTab` — Related items linkage
- `ChangeEventPrimeContractCOsTab` — Linked prime COs tab
- `ChangeEventApprovalWorkflow` — Approval flow widget
- `ChangeEventConvertDialog` — Convert to CO dialog
- `ChangeEventEmailDialog` — Email dialog

### Feature Config
- `features/change-events/change-events-table-config.ts` — Column/filter/render config
- `features/change-orders/change-orders-table-config.ts` — CO table config

---

## Workflow Connections Already Implemented

1. **CE → PCO**: `add-to-pco` API + ChangeEventConvertDialog UI
2. **CE → Prime CO**: `convert-to-change-order` API + ChangeEventPrimeContractCOsTab
3. **PCO → CO**: `convert-to-co` API + PCO detail page
4. **PCO Submit**: `submit` API for review workflow
5. **PCO Client Decision**: `client-decision` API
6. **Prime CO Approve/Reject**: Dedicated API routes
7. **Commitment CO Approve**: Via commitment route

---

## Architecture Observations

1. **Change Events**: Most mature — full CRUD, line items, tabs, RFQs, attachments, PDF, email, history, approvals, related items, bulk actions, export
2. **PCOs**: Good list + detail + CRUD. Has convert-to-CO and submit workflows. Missing some Procore fields.
3. **Prime Contract COs**: Good CRUD + approve/reject. Attachments and export work. Missing some detail fields compared to Procore.
4. **Commitment COs**: CRUD works but form is simpler than Procore's. SOV/line items not visible in detail.
5. **Change Orders page**: Dual-tab layout works but is server-rendered with client component — no real-time refetch.
6. **Cross-linking**: CE→PCO and CE→CO paths exist. PCO→CO conversion exists. Missing: creating COs directly from change event line items view "Add To" menu.
