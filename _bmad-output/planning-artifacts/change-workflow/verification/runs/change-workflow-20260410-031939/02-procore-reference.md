# Procore Reference: Change Workflow

## Business Rules & Workflows (from Tier 1 RAG + Tier 3 WebFetch)

### The Change Management Lifecycle

Procore's change management follows a tiered hierarchy:

```
Change Event (trigger/tracking)
  ├── Prime Contract Path
  │     ├── 1-tier: CE → Prime Contract CO directly
  │     ├── 2-tier: CE → Prime PCO → Prime Contract CO (PCCO)
  │     └── 3-tier: CE → Prime PCO → COR → PCCO
  │
  └── Commitment Path
        ├── 1-tier: Direct Commitment CO (CCO)
        ├── 2-tier: Commitment PCO (CPCO) → CCO
        └── 3-tier: CPCO → COR → CCO
```

### Tier Configuration
- **1-Tier** (Default): Direct change order creation — simplest workflow
- **2-Tier**: PCO → CO — adds an intermediate approval layer
- **3-Tier**: PCO → COR → CO — most complex, groups monthly approved changes
- Tier setting must be configured BEFORE creating change orders
- Cannot change tier setting after COs exist (must delete all first)

### Change Events

**Purpose**: Track any change affecting a project's scope, schedule, or costs. The initial trigger for the change management process.

**Statuses**: Open, Pending Approval, Approved, Rejected, Closed, Void (configurable by admin)

**Required Fields**:
- Number (alphanumeric, max 10 chars, auto-increments as 001, 002, 003)
- Title
- Status
- Origin (Emails, Meetings, RFI's)
- Type (Allowance, Contingency, Owner Change, TBD, Transfer)
- Change Reason (Allowance, Backcharge, Client Request, Design Development, Existing Condition)
- Scope (In Scope, Out of Scope, TBD)

**Optional Fields**:
- Expecting Revenue (boolean)
- Line Item Revenue Source
- Prime Contract for Markup Estimates
- Description
- Attachments

**Line Item Fields**:
- Budget Codes, Description, Vendor, Contract, Qty, UOM, Unit Cost, Cost ROM, Non-Committed Cost

**Detail Page Tabs**: General (info + line items), with actions: Edit, Export (PDF), Email, Clone

**List Page Tabs**: Line Items, No Line Items, RFQs, Recycle Bin

**Column Groups**: Change Event (status, scope, type, reason, origin), Revenue (Prime/Prime PCO, PCO Title, Latest Price), Cost (Cost ROM, RFQ Title, Commitment/CO/PCO, Commitment Title, Latest Cost, Over/Under), Budget (Budget ROM, Budget Change, Latest Budget Impact)

**Predefined Views**: Classic Detail, Classic Summary, Complete View, Owners View, Scope View, Temporary View

**Add To Menu** (from line items view, after selecting line items):
- Commitment: New PO, New Subcontract, Link to existing
- Commitment CO/PCO: New or Link to existing
- Prime Contract CO/PCO: New or Link to existing
- Budget Changes: New or Link to existing

### Prime Contract PCOs

**Required Fields**: Number (auto-assigned), Title, Status
**Key Fields**: Contract Company, Contract (read-only link), PCCO linkage, Change Reason, Description, Request Received From, Schedule Impact, Location, Reference, Field Change, Private, Paid in Full, Attachments

**3-Tier Only**: Change Order Request selector (None, Add to Existing, Create New)

**SOV Line Items**: Cost Code, Description, Cost Type (inherits from Budget)

### Prime Contract Change Orders (PCCO)

**Required Fields**: Number, Title, Status
**Key Fields**: Due Date, Invoiced Date, Designated Reviewer, Paid Date, Schedule Impact, Revised Substantial Completion Date, Executed, Private, Description

**Statuses**: Draft → Out for Signature (DocuSign) → Approved → Executed

**Actions**: Create, Create & Email, Complete with DocuSign
**Post-approval**: Procore auto-updates Revised Substantial Completion Date

### Commitment PCOs (CPCO)

**Required Fields**: Title, Status, Number
**Key Fields**: Contract Company (auto-populated), Contract (read-only), Revision, Change Reason, Private, Accounting Method (inherited), Description, Request Received From, Schedule Impact, Location, Reference, Field Change, Paid in Full, Attachments

**SOV Line Items** (Amount-Based): Change Event Line Item, Budget Code (required), Description (required), Amount (required), Billed to Date (auto), Amount Remaining, Tax Code
**SOV Line Items** (Unit/Qty-Based): Change Event Line Item, Budget Code, Description, Qty, UOM, Unit Cost, Amount (auto)

**Key constraint**: Commitment must be in 'Approved' status to create a CO

### Commitment Change Orders (CCO)

**Required Fields**: Title (max 255 chars), Status, Number (auto-increments)
**Auto-populated**: Date Created, Created By, Revision (starts at 0), Contract Company, Contract, Accounting Method

**Optional Fields**: Change Reason, Due Date, Invoiced Date, Designated Reviewer, Request Received From, Description (1000-char limit for Sage export), Schedule Impact, Location, Reference, DocuSign, Private, Executed, Field Change, Paid in Full, Attachments

**SOV Tab Fields**: Prime Contract Line Item, Change Event Line Item, Sub Jobs (WBS), Budget Code, Description, Cost Amount, Tax Codes

**Key Status Rule**: Designated Reviewer can only approve/reject when status is "Pending - In Review"

---

## UI Structure & Fields (from Tier 2 Manifests)

### Change Events List Page
- Line Items view with configurable columns and column groups
- Grouping by any column with drag-and-drop
- 28+ filterable fields
- Row height options (small/medium/large)
- Column pinning, rearranging, auto-sizing
- Grand totals row at bottom

### Change Events Detail Page
- General Information card: Number, Title, Status, Origin, Type, Change Reason, Scope, Prime Contract for Markup Estimates, Description
- Line Items card with column groups matching list view
- Attachments section
- Actions: Edit, Export PDF, vertical ellipsis (Email, Clone)

### Change Orders List Page (Both Types)
- Prime Contract tab + Commitment tab
- Standard table with sorting, filtering, search
- Row actions: View, Edit, Delete
- Footer totals row

---

## Source URLs

1. https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events
2. https://v2.support.procore.com/product-manuals/change-events-project/tutorials/view-change-events
3. https://v2.support.procore.com/product-manuals/change-events-project/tutorials/view-the-change-events-line-items-view
4. https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-potential-change-order
5. https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-change-order-cco
6. https://v2.support.procore.com/product-manuals/commitments-project/tutorials/configure-the-number-of-commitment-change-order-tiers
7. https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-potential-change-order-for-a-prime-contract
8. https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order
9. https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-prime-contract-change-order-from-a-change-event
10. https://v2.support.procore.com/product-manuals/change-orders-project
