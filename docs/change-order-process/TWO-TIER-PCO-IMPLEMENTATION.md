# Two-Tier PCO Implementation Plan

**Date:** 2026-04-10
**Status:** In Progress
**Goal:** Replace the current one-step "Convert to Change Order" flow with Procore's two-tier process: Change Event → PCO → Change Order

---

## Overview

Currently, our system skips the PCO (Potential Change Order) tier entirely — change events convert directly to final change orders. Procore's two-tier system introduces PCOs as an intermediate step that allows for review, bundling multiple change events, and separate routing to the revenue side (Prime Contract PCO) and cost side (Commitment PCO).

### The Flow

```
Change Event(s) ──→ PCO (Potential Change Order) ──→ Official Change Order
                     │                                  │
                     ├── Prime Contract PCO ──→ Prime Contract Change Order (PCCO)
                     │   (revenue side)          (updates prime contract revised value)
                     │
                     └── Commitment PCO ──→ Commitment Change Order (CCO)
                         (cost side)        (updates commitment revised value)
```

### Key Rules

1. **Whole CE routing** — a change event goes as a unit (all line items), not per-line-item
2. **Multiple CEs → one PCO** — several change events can be bundled into a single PCO
3. **Dual routing** — a CE can be sent to BOTH a commitment PCO (cost) AND a prime contract PCO (revenue)
4. **Amount logic:**
   - Prime PCO pulls **Latest Price** (Revenue ROM + markups)
   - Commitment PCO pulls **Latest Cost** by default
   - If a Prime PCO already exists for that CE when the Commitment PCO is created → pulls **Latest Price** instead
5. **CE status** — a CE sent to a PCO is NOT "Converted". It tracks which side(s) it's been sent to. Only fully resolved when both sides are handled.

---

## Phase 1: Data Model (Migration)

### New Tables

#### `prime_contract_pcos`
Revenue-side potential change orders.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` DEFAULT gen_random_uuid() | PK |
| `project_id` | `INTEGER` NOT NULL | FK → projects |
| `prime_contract_id` | `BIGINT` NOT NULL | FK → prime_contracts |
| `pco_number` | `TEXT` | Auto-assigned per project (e.g., "PCO-001") |
| `title` | `TEXT` NOT NULL | |
| `status` | `TEXT` NOT NULL DEFAULT 'draft' | draft, pending, approved, void |
| `description` | `TEXT` | |
| `total_amount` | `NUMERIC(14,2)` | Sum of SOV line items |
| `schedule_impact` | `INTEGER` | Days |
| `designated_reviewer_id` | `UUID` | FK → auth.users |
| `due_date` | `TIMESTAMPTZ` | |
| `created_by` | `UUID` | FK → auth.users |
| `created_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `updated_by` | `UUID` | |
| `approved_at` | `TIMESTAMPTZ` | |
| `approved_by` | `UUID` | |
| `promoted_to_co_id` | `BIGINT` | FK → prime_contract_change_orders (filled when promoted) |
| `promoted_at` | `TIMESTAMPTZ` | |

#### `commitment_pcos`
Cost-side potential change orders.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` DEFAULT gen_random_uuid() | PK |
| `project_id` | `INTEGER` NOT NULL | FK → projects |
| `commitment_id` | `UUID` NOT NULL | FK → subcontracts or purchase_orders |
| `commitment_type` | `TEXT` NOT NULL | 'subcontract' or 'purchase_order' |
| `pco_number` | `TEXT` | Auto-assigned per project |
| `title` | `TEXT` NOT NULL | |
| `status` | `TEXT` NOT NULL DEFAULT 'draft' | draft, pending, approved, void |
| `description` | `TEXT` | |
| `total_amount` | `NUMERIC(14,2)` | |
| `schedule_impact` | `INTEGER` | |
| `designated_reviewer_id` | `UUID` | |
| `due_date` | `TIMESTAMPTZ` | |
| `created_by` | `UUID` | |
| `created_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `updated_by` | `UUID` | |
| `approved_at` | `TIMESTAMPTZ` | |
| `approved_by` | `UUID` | |
| `promoted_to_co_id` | `UUID` | FK → contract_change_orders (filled when promoted) |
| `promoted_at` | `TIMESTAMPTZ` | |

#### `pco_line_items`
Shared line items table for both PCO types (distinguished by `pco_type`).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` DEFAULT gen_random_uuid() | PK |
| `pco_id` | `UUID` NOT NULL | FK → prime_contract_pcos or commitment_pcos |
| `pco_type` | `TEXT` NOT NULL | 'prime' or 'commitment' |
| `change_event_id` | `UUID` | FK → change_events (source CE) |
| `change_event_line_item_id` | `UUID` | FK → change_event_line_items (source line item) |
| `budget_code_id` | `UUID` | FK → budget_lines |
| `description` | `TEXT` | |
| `quantity` | `NUMERIC` | |
| `unit_of_measure` | `TEXT` | |
| `unit_cost` | `NUMERIC(14,2)` | |
| `amount` | `NUMERIC(14,2)` | The calculated amount (Latest Price or Latest Cost) |
| `sort_order` | `INTEGER` DEFAULT 0 | |
| `created_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` DEFAULT now() | |

#### `change_event_pco_links`
Tracks which CEs have been sent to which PCOs (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` DEFAULT gen_random_uuid() | PK |
| `change_event_id` | `UUID` NOT NULL | FK → change_events |
| `pco_id` | `UUID` NOT NULL | FK → prime_contract_pcos or commitment_pcos |
| `pco_type` | `TEXT` NOT NULL | 'prime' or 'commitment' |
| `linked_at` | `TIMESTAMPTZ` DEFAULT now() | |
| `linked_by` | `UUID` | FK → auth.users |

**Unique constraint:** `(change_event_id, pco_id, pco_type)` — prevent duplicate links.

### Changes to Existing Tables

#### `change_events` — add tracking columns

| Column | Type | Notes |
|--------|------|-------|
| `sent_to_prime_pco` | `BOOLEAN` DEFAULT false | Has this CE been sent to a prime PCO? |
| `sent_to_commitment_pco` | `BOOLEAN` DEFAULT false | Has this CE been sent to a commitment PCO? |

---

## Phase 2: API Routes

### Prime Contract PCOs
- `GET /api/projects/[projectId]/prime-contract-pcos` — list all
- `POST /api/projects/[projectId]/prime-contract-pcos` — create (from CE selection)
- `GET /api/projects/[projectId]/prime-contract-pcos/[pcoId]` — detail
- `PATCH /api/projects/[projectId]/prime-contract-pcos/[pcoId]` — update
- `DELETE /api/projects/[projectId]/prime-contract-pcos/[pcoId]` — delete (draft only)
- `POST /api/projects/[projectId]/prime-contract-pcos/[pcoId]/promote` — promote to PCCO

### Commitment PCOs
- `GET /api/projects/[projectId]/commitment-pcos` — list all
- `POST /api/projects/[projectId]/commitment-pcos` — create (from CE selection)
- `GET /api/projects/[projectId]/commitment-pcos/[pcoId]` — detail
- `PATCH /api/projects/[projectId]/commitment-pcos/[pcoId]` — update
- `DELETE /api/projects/[projectId]/commitment-pcos/[pcoId]` — delete (draft only)
- `POST /api/projects/[projectId]/commitment-pcos/[pcoId]/promote` — promote to CCO
- `POST /api/projects/[projectId]/commitment-pcos/bulk-create` — bulk create from CEs

### Change Event "Add to..." endpoint
- `POST /api/projects/[projectId]/change-events/add-to-pco` — routes selected CEs to the appropriate PCO type

---

## Phase 3: UI — Change Events List "Add to..." Menu

Replace the current "Convert to Change Order" modal on the CE detail page with an action menu on the CE list page.

### Trigger
- Checkboxes on change events in the list table
- "Add to..." dropdown button appears when 1+ CEs are selected

### Menu Structure
```
Add to ▾
├── Commitment
│   ├── New Purchase Order
│   └── New Subcontract
├── Commitment Change Order
│   ├── New Commitment PCO
│   │   ├── Contracts matching cost codes
│   │   └── All Contracts
│   └── Create Bulk Draft Commitment PCOs
└── Add to Prime Contract PCO
    ├── New Prime PCO
    └── Add to existing PCO (dropdown of open PCOs)
```

### Modals per action
Each menu item opens a specific modal:
- **New PO/Subcontract**: Contract creation form pre-filled from CE data
- **New Commitment PCO**: Contract picker (filtered by cost codes or all) + confirmation
- **Bulk Draft Commitment PCOs**: Confirmation showing which CEs → which commitments
- **New Prime PCO**: Prime contract picker + confirmation
- **Add to existing PCO**: PCO picker + confirmation

---

## Phase 4: UI — PCO List & Detail Pages

### PCO List Page
- New tab(s) on the existing Change Orders page, or a sub-section under each contract type
- Shows all PCOs with: Number, Title, Status, Amount, Source CEs count, Created date
- Filter by status, contract

### PCO Detail Page
- Header: PCO number, title, status, contract info
- SOV line items (from bundled CEs)
- Source Change Events list (linked CEs)
- Attachments
- "Promote to Change Order" action button (creates the official CO)

---

## Phase 5: Promotion (PCO → Official CO)

### Prime PCO → PCCO
- Creates a `prime_contract_change_orders` row
- Copies SOV line items
- Sets `promoted_to_co_id` and `promoted_at` on the PCO
- Updates the prime contract's revised value

### Commitment PCO → CCO
- Creates a `contract_change_orders` row
- Copies SOV line items to `commitment_change_order_lines`
- Sets `promoted_to_co_id` and `promoted_at` on the PCO
- Updates the commitment's revised value

---

## Implementation Order

| Step | What | Dependencies |
|------|------|-------------|
| 1 | Write migration SQL for new tables | None |
| 2 | Run migration, regenerate types | Step 1 |
| 3 | Create API routes (CRUD + promote) | Step 2 |
| 4 | Remove old "Convert to CO" modal | Step 3 |
| 5 | Build "Add to..." menu on CE list page | Step 3 |
| 6 | Build PCO list/detail pages | Step 3 |
| 7 | Build promotion flow (PCO → CO) | Steps 3, 6 |
| 8 | Update CE status tracking | Step 3 |

---

## References

- `docs/reports/procore-change-orders-gap-analysis.md` — full gap analysis
- `docs/change-orders-data-model-alignment.md` — table consolidation decision
- `docs/change-order-process/change-management-complete-process.md` — current process status
- `docs/change-order-process/TASKS-change-orders-rebuild.md` — completed rebuild tasks
- Procore: [Create a Prime PCO from a Change Event](https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-prime-potential-change-order-from-a-change-event)
- Procore: [Create a Commitment CO from a Change Event](https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-commitment-change-order-from-a-change-event)
- Procore: [Configure Commitment CO Tiers](https://v2.support.procore.com/product-manuals/commitments-project/tutorials/configure-the-number-of-commitment-change-order-tiers)
