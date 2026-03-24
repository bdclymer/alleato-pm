# Change Events & Change Orders — Owner Requirements (Voice Recording)

> **Source:** Voice recording with Brandon (company owner), transcribed 2026-03-21
> **Purpose:** Implementation requirements for Claude Code — how change events and change orders should work in Alleato PM

---

## Executive Summary

The change management workflow follows this flow:

```
Something changes on the project
  → Change Event created (source + reason logged)
    → Line items added (budget code, commitment, cost, revenue)
    → RFQs sent to subs for pricing
    → Sub responds with price
    → PM fills in cost/revenue on line items
      → If OWNER change: Create PCO (Potential Change Order) → send to owner for approval
        → Owner approves → Create Commitment Change Order → send to sub for signature
        → Sub signs → Executed → Exported to Acumatica → Sub can bill it
      → If INTERNAL change: Same flow but NO markup applied, may be $0 cost CO
```

---

## 1. Change Event Creation

### Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| **Title** | What the change is | e.g., "Add additional door" |
| **Source / Origin** | Where did this change come from? | Dropdown: RFI, Owner Request, Design Directive, Field Directive, Allowance, etc. |
| **Reason / Type** | Is this an owner cost or internal cost? | **Critical field** — drives markup behavior |

### Reason/Type Options (CRITICAL — drives markup logic)

| Value | Meaning | Markup Behavior |
|-------|---------|-----------------|
| **Owner Change** (External) | Owner requested the change (e.g., Mike texts saying add something to kitchen) | **Auto-apply financial markup** (insurance, fee, etc.) from prime contract vertical markup settings |
| **Internal Change** | Our cost, not owner-driven (e.g., using contingency, fixing our mistake) | **NO markup applied** |

### Markup Auto-Application Logic

```
IF change_event.type === "Owner Change" (or "External"):
  → When creating line items, auto-calculate and apply vertical markup
  → Markup percentages come from the prime contract's vertical_markup table
  → Types: insurance, fee, bond, overhead, etc.
  → Compound markups calculated in calculation_order

IF change_event.type === "Internal":
  → NO markup auto-applied
  → Cost and revenue may be the same (or $0 change order)
  → Still creates change orders to show money movement (e.g., contingency usage)
```

> **Key quote from Brandon:** "Whether markup is applied is controlled in the change event setup. Because you'll say, is this an internal or is this an owner change? The markup amounts themselves are controlled by the vertical markup you initially create on the prime contract."

---

## 2. Change Event Line Items

### Fields per Line Item

| Field | Required? | Description |
|-------|-----------|-------------|
| **Budget Code** | **YES** | Must select a budget code (cost code / division) |
| **Commitment** | No | Can optionally link to an existing commitment (subcontract). If selected, auto-fills budget code since budget is tied to commitment. |
| **Cost (ROM)** | Yes | Rough order of magnitude cost — e.g., $500 |
| **Revenue (ROM)** | Yes | Can equal cost, or manually override to different amount |
| **Description** | Yes | What this line item covers |

### Revenue vs Cost Logic

- **Default:** Revenue = Cost (mirrors the cost)
- **Manual override:** PM can set revenue higher than cost to add margin on the work itself
  - Example: Cost = $500 (what sub charges), Revenue = $600 (what we charge owner) → $100 extra margin BEFORE markup
- **Markup** is then applied ON TOP of the revenue amount (insurance, fee, etc.)

### Commitment Auto-Fill

```
IF user selects a commitment:
  → Auto-populate budget_code from the commitment's linked budget
  → "I always liked that feature" — Brandon

IF no commitment exists:
  → User manually selects budget code
  → commitment field left blank
```

---

## 3. RFQ Workflow (Request for Quote)

### Flow

```
1. Change Event created with line items
2. PM clicks "Create RFQ" button on the change event
3. RFQ is generated and sent to the subcontractor
4. Sub prices the work and responds
5. PM fills in the actual cost on the change event line items
```

### Key Points

- RFQ creation is **manual action** — user clicks a button, it's not auto-generated
- From the change event, user can: **Create RFQ**, **Create PCO**, **Create Commitment Change Order**
- These are all action buttons available from the change event detail view
- RFQ goes to the sub who will do the work (e.g., "Central Indian Hardware, price up a 3070 door, frame, whole metal")
- Sub responds with price via email or through the system
- PM updates the line item costs based on the response

> **Already implemented:** `change_event_rfqs` table, `change_event_rfq_responses` table, API routes, and form components exist.

---

## 4. PCO — Potential Change Order (Prime Contract Side)

### What It Is

A PCO is sent to the **owner** (e.g., "Mike") for approval before work proceeds.

### Flow

```
1. Change Event has cost/revenue filled out
2. PM clicks "Create PCO" from change event
3. PCO is generated with all the cost/revenue/markup data
4. PCO form/PDF sent to owner for review
5. Owner reviews and either:
   a. APPROVES → proceed to create Commitment Change Order
   b. REJECTS → "No, that costs too much" → work doesn't proceed
```

### Key Data

- PCO pulls line item data from the change event
- Includes cost + markup breakdown
- Must be printable to PDF ("Pretty much any document you send can be printed to PDF")
- Owner signs the PCO form

> **DB table:** `prime_contract_change_orders` — has `status`, `executed` (boolean), `submitted_at`, `approved_at`

---

## 5. Commitment Change Order (Sub Side)

### What It Is

After the owner approves the PCO, a Commitment Change Order is created and sent to the **subcontractor** for signature.

### Flow

```
1. Owner approves PCO
2. PM goes back to change event, clicks "Create Commitment Change Order"
3. System creates a commitment change order linked to the sub's contract
4. CO form generated → sent to sub for signature
5. Sub signs it, we sign it → status = "Executed"
6. Executed CO exported to Acumatica (updates the contract)
7. Sub can now bill for the change order amount in their next invoice
```

### Execution

- **"Executed" means both parties have signed it** — fully executed
- Both the PCO (owner) and Commitment CO (sub) have execution/signature tracking
- Send for signature → both sign → mark as executed

### Billing Impact

```
After Commitment CO is executed:
  → Export to Acumatica (updates contract value)
  → When sub submits next invoice:
    → They click "Add to Invoice"
    → Invoice shows: base schedule of values + Change Order 01 ($X amount)
    → Sub can bill for the CO amount
```

> **DB table:** `contract_change_orders` — has `status`, fields for amounts, links to commitment

---

## 6. Internal Changes (No Owner Involvement)

### How It Differs

Internal changes follow the **exact same workflow** except:

1. **No markup applied** (controlled by the change event type setting)
2. **No PCO sent to owner** (skip that step)
3. **May be a $0 change order** (just showing money movement)

### Use Case: Contingency

```
Example: Using contingency funds for unexpected cost
  → Change Event created (type: Internal)
  → Line items show the cost movement
  → Still create a Commitment Change Order (to track money movement)
  → But no markup, no owner approval needed
  → Could be $0 on prime contract side (nothing changes for owner)
```

### Key Quote

> "Nothing changes whether it's internal or an owner-requested item. The only difference is, is there markup applied."

---

## 7. Action Buttons on Change Event

From a change event detail view, the PM should be able to:

| Action | What It Does |
|--------|-------------|
| **Create RFQ** | Generate an RFQ to send to a sub for pricing |
| **Create PCO** | Generate a Potential Change Order to send to the owner |
| **Create Commitment Change Order** | Generate a CO to send to the sub (after owner approval) |

These are the three main "create" actions available from a change event.

---

## 8. Status Flow Summary

### Change Event Statuses

```
Draft → Open → Pending → Pending Review → Approved → Closed/Converted
```

- Status is **user-selectable** (not strictly enforced flow)
- "You can put status whatever you want — draft, pending, pending review..."

### PCO (Prime Contract Change Order) Statuses

```
Draft → Submitted → Pending → Approved / Rejected → Executed
```

### Commitment Change Order Statuses

```
Draft → Submitted → Pending → Approved / Rejected → Executed
```

- **Executed = both parties signed**

---

## 9. PDF Generation

Every document should be printable to PDF:
- Change Event summary
- PCO form (for owner signature)
- Commitment Change Order form (for sub signature)
- RFQ documents

> "Pretty much any document or whatever that you send can be printed to PDF inside."

---

## 10. Implementation Priority

Based on the conversation, the critical workflow that must work end-to-end:

### Priority 1: Owner Change Flow (Happy Path)
1. Create change event with type "Owner Change"
2. Add line items (budget code + optional commitment + cost + revenue)
3. Auto-apply markup based on prime contract vertical markup settings
4. Create RFQ → send to sub
5. Create PCO → send to owner → owner approves
6. Create Commitment CO → send to sub → sub signs → executed
7. Export to Acumatica
8. Sub can add CO to invoice billing

### Priority 2: Internal Change Flow
1. Create change event with type "Internal"
2. Add line items (no markup)
3. Create Commitment CO → execute
4. Track money movement (possibly $0 on prime side)

### Priority 3: Markup Automation
1. Vertical markup from prime contract auto-applies to owner changes
2. Insurance, fee, bond, overhead percentages
3. Compound calculation in correct order

---

## Current Implementation Status (What Exists)

| Feature | Status | Notes |
|---------|--------|-------|
| Change Event CRUD | DONE | Full API + UI |
| Change Event Line Items | DONE | CRUD API + grid UI |
| Change Event RFQs | DONE | Full API + forms |
| Source/Origin field | DONE | Field exists in DB and form |
| Type/Reason field | DONE | Field exists (`type` column) |
| Budget Code on line items | DONE | `budget_code_id` field |
| Commitment on line items | DONE | `contract_id` field |
| Cost/Revenue on line items | DONE | `cost_rom`, `revenue_rom` fields |
| Prime Contract COs (PCO) | PARTIAL | API + basic UI, needs workflow polish |
| Commitment COs | PARTIAL | API exists, UI needs work |
| **Markup auto-application** | **MISSING** | `vertical_markup` table exists, but no auto-calc on line items |
| **"Create PCO" from CE** | **MISSING** | Button/action to generate PCO from change event data |
| **"Create Commitment CO" from CE** | **MISSING** | Button/action to generate Commitment CO from change event |
| **PDF generation** | **MISSING** | No PDF export for COs or PCOs |
| **Execution tracking** | **PARTIAL** | `executed` boolean on prime COs, needs signature workflow |
| **Acumatica export on execution** | **MISSING** | `acumatica_external_key` field exists but no sync trigger |
| **Billing integration (add CO to invoice)** | **MISSING** | Sub invoice + CO line item addition not built |

---

## Database Tables Reference

### Existing Tables
- `change_events` — main change event record
- `change_event_line_items` — cost/revenue line items
- `change_event_rfqs` — RFQs sent to subs
- `change_event_rfq_responses` — sub pricing responses
- `change_event_attachments` — file attachments
- `change_event_history` — audit trail
- `prime_contract_change_orders` — PCOs (owner side)
- `contract_change_orders` — commitment COs (sub side)
- `vertical_markup` — markup percentages per project (insurance, fee, etc.)

### Key Relationships
```
change_events.prime_contract_id → prime_contracts.id
change_event_line_items.budget_code_id → budget_codes.id
change_event_line_items.contract_id → commitments.id (optional)
prime_contract_change_orders.contract_id → prime_contracts.id
contract_change_orders.contract_id → prime_contracts.id (or commitments)
vertical_markup.project_id → projects.id
```
