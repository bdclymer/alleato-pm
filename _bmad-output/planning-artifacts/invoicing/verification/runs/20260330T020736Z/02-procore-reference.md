# Procore Invoicing Feature - Complete Reference

**Document Version:** 1.0  
**Generated:** 2026-03-30  
**Data Source:** Comprehensive Procore crawl (47 app pages, 34+ doc pages)  
**Reference URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214671/tools/contracts/commitments/purchase_order_contracts/562949959141576/invoices

---

## Executive Summary

Procore's Invoicing tool is a comprehensive financial management system that handles both owner-facing invoices (billing to project owners) and incoming invoices from subcontractors. The tool integrates deeply with commitments (Purchase Orders, Subcontracts, Work Orders), Schedule of Values, billing periods, and financial reporting systems.

**Key Characteristics:**
- Dual invoice management (Owner + Subcontractor)
- Commitment-centric organization
- Multi-step approval workflows
- Period-based billing organization
- Extensive export capabilities
- Payment tracking integration
- Budget variance analysis

---

## What is Procore Invoicing?

Procore Invoicing is a financial module within the Commitments tool that manages:

### Owner Invoices
Invoices created to bill project owners based on:
- Schedule of Values (SOV) line items
- Work completed in billing periods
- Materials stored on-site
- Retention calculations
- Tax considerations

### Subcontractor Invoices
Invoices received from subcontractors tied to:
- Purchase Orders (PO)
- Subcontracts
- Work Orders
- Progressive billing with period-over-period tracking
- Approval and payment workflows

### Billing Periods
Organizational structure:
- Define billing cycles (e.g., monthly, bi-weekly)
- Associate invoices with specific periods
- Enable period-based financial reporting
- Track period-open/period-closed status

### Payment Tracking
Financial transaction management:
- "Payments Issued" tab for tracking disbursements
- Link payments to specific invoices
- Maintain paid-to-date and balance-due fields
- Support ERP synchronization

---

## Invoice Statuses & Workflow

### Owner Invoice Statuses

```
DRAFT → SUBMITTED → APPROVED → (optionally paid)
```

**Draft**
- Initial state when invoice is created
- Fully editable (number, dates, line items)
- Can be deleted by creator
- Not submitted for approval

**Submitted**
- Invoice submitted for review/approval
- Read-only state (cannot edit)
- Awaiting approver action
- Can be rejected back to draft

**Approved**
- Invoice has been approved by authorized user
- Cannot be edited or deleted
- Ready for payment
- Locked in for financial records

### Subcontractor Invoice Statuses

```
PENDING → APPROVED → PAID (or REJECTED)
```

**Pending**
- Invoice received from subcontractor
- Awaiting review and approval
- May be editable for corrections
- Not yet approved for payment

**Approved**
- Invoice approved for payment
- Ready to record payment
- Cannot be edited

**Paid**
- Payment has been recorded against invoice
- Fully resolved
- Historical/archive status

**Rejected**
- Invoice rejected/cancelled
- Returned to subcontractor
- Can be resubmitted

**Voided**
- Invoice cancelled without payment
- Kept for audit trail

---

## Expected List Page Columns

### Owner Invoices Table

| Column | Type | Description |
|--------|------|-------------|
| Invoice Number | TEXT | Unique identifier (e.g., INV-001) |
| Billing Period | TEXT | Associated billing period name/date range |
| Due Date | DATE | Payment due date |
| Total Amount | CURRENCY | Total invoice amount |
| Status | BADGE | Draft, Submitted, Approved |
| Created By | TEXT | User who created invoice |
| Created Date | DATE | Creation timestamp |
| Actions | MENU | Edit, Approve, Delete, Export |

**Filtering Options:**
- By status (Draft, Submitted, Approved)
- By billing period
- By date range
- By creator
- By amount range

**Sorting:**
- By invoice number
- By due date
- By total amount
- By creation date
- By status

### Subcontractor Invoices Table

| Column | Type | Description |
|--------|------|-------------|
| Invoice Number | TEXT | Vendor invoice number |
| Vendor/Contractor | TEXT | Subcontractor name |
| Commitment | TEXT | PO/Subcontract/Work Order reference |
| Commitment Type | BADGE | Type of commitment |
| Period Covering | TEXT | Invoice billing period (Start - End) |
| Total Amount | CURRENCY | Invoice total |
| Retention | CURRENCY | Retention amount (if applicable) |
| Balance Due | CURRENCY | Remaining unpaid amount |
| Status | BADGE | Pending, Approved, Paid, Rejected |
| Submitted Date | DATE | When invoice was submitted |
| Actions | MENU | View, Approve, Pay, Reject |

**Filtering Options:**
- By status (Pending, Approved, Paid, Rejected)
- By commitment type (PO, Subcontract, Work Order)
- By vendor/contractor
- By date range
- By amount range

**Sorting:**
- By invoice number
- By vendor name
- By total amount
- By balance due
- By status
- By submitted date

---

## Expected Create Form Fields

### Owner Invoice Creation Form

**Basic Information:**
- Invoice Number (text, auto-filled or manual)
- Billing Period (dropdown - select from existing periods)
- Invoice Date (date picker)
- Due Date (date picker)

**Line Items Section:**
- SOV Line Item Selector (dropdown to select from Schedule of Values)
- For each line item:
  - Description (read-only from SOV)
  - Completed to Date (currency input)
  - Materials Stored (currency input)
  - Retention % (percentage input)
  - Total Amount (calculated/auto-fill)
  - Net Amount (calculated after retention)

**Summary Section (Auto-calculated):**
- Subtotal
- Retention Total
- Tax (if applicable)
- Total Amount

**Additional Fields:**
- Notes/Comments (text area)
- Attachments (file upload)
- Status (dropdown: Draft, Submitted)

**Buttons:**
- Save as Draft
- Submit for Approval
- Cancel

### Subcontractor Invoice Creation Form

**Commitment Selection:**
- Commitment Type (radio: Purchase Order, Subcontract, Work Order)
- Commitment Selector (dropdown showing available commitments)

**Invoice Basic Info:**
- Invoice Number (text)
- Vendor (auto-filled from commitment)
- Invoice Date (date picker)
- Period Covering Start (date picker)
- Period Covering End (date picker)

**Line Items Section:**
- For each commitment line item:
  - Description (read-only from commitment)
  - This Period Quantity (number input)
  - This Period Amount (currency input)
  - Previous Period Total (read-only, calculated)
  - Total to Date (calculated automatically)
  - Scheduled Value (reference, read-only)

**Financial Section:**
- Subtotal (auto-calculated)
- Retention % (dropdown or input)
- Retention Amount (auto-calculated)
- Tax (currency input)
- Total Amount (auto-calculated)
- Paid to Date (read-only, from payment history)
- Balance Due (auto-calculated)

**Additional Fields:**
- Notes (text area)
- Attachments (file upload)
- Terms/Payment info (text)

**Buttons:**
- Save & Submit
- Save as Draft
- Cancel

---

## Expected Detail View Tabs/Sections

### Owner Invoice Detail Page

**Main Tabs:**
1. **Invoice Details** (default tab)
2. **Line Items** (itemized breakdown)
3. **Approvals** (workflow history)
4. **Payments** (if Payments Issued tab enabled)
5. **Activity** (change log)

### Tab 1: Invoice Details

**Header Section:**
- Invoice Number (heading)
- Status Badge (Approved/Submitted/Draft)
- Action Menu (Edit, Approve, Submit, Delete, Export)

**Invoice Information Card:**
- Invoice Date
- Due Date
- Billing Period
- Created By / Created Date
- Last Modified By / Modified Date

**Financial Summary Card:**
- Subtotal
- Retention (amount and %)
- Tax
- Total Amount
- Notes/Comments display

**Associated Documents:**
- Linked SOV
- Linked Prime Contract
- Attachments list

### Tab 2: Line Items

**Table with columns:**
- Description (from SOV)
- Scheduled Value
- Completed to Date
- Materials Stored
- Total This Invoice
- Retention %
- Retention Amount
- Net Amount

### Tab 3: Approvals

**Approval Workflow Timeline:**
- Created: [User] on [Date] - Status: Draft
- Submitted: [User] on [Date] - Status: Submitted
- Approved: [User] on [Date] - Status: Approved
- (or Rejected: [User] on [Date] with reason)

**Current Approver Information (if pending):**
- Next approver(s)
- Due date for approval
- Message to approver

### Tab 4: Payments (if enabled)

**Payments Table:**
| Check #/Reference | Amount | Date | Status |
|-------------------|--------|------|--------|
| (Payment records linked to this invoice) |

### Tab 5: Activity

**Change Log Timeline:**
- Field changed
- Old value → New value
- Changed by [User]
- [Timestamp]

---

### Subcontractor Invoice Detail Page

**Main Tabs:**
1. **Invoice Details** (default)
2. **Line Items** (itemized breakdown)
3. **Commitment Details** (linked commitment info)
4. **Approvals** (workflow history)
5. **Payments** (payment tracking)
6. **Activity** (change log)

### Tab 1: Invoice Details

**Header:**
- Invoice Number (from vendor)
- Commitment Reference (PO/Subcontract/Work Order)
- Status Badge (Pending/Approved/Paid/Rejected)
- Action Menu (Approve, Reject, Record Payment, Export)

**Vendor Information Card:**
- Vendor/Contractor Name
- Contact Information
- Vendor Invoice Number
- Invoice Date

**Billing Period Card:**
- Period: [Start Date] - [End Date]

**Financial Summary Card:**
- Subtotal (all line items)
- Retention (amount and %)
- Tax
- **Total Invoice Amount**
- Less: Paid to Date
- **Balance Due**

**Terms & Notes Section:**
- Payment Terms
- Special Notes
- Attachments

### Tab 2: Line Items

**Detailed Line Items Table:**
| Item | Description | Scheduled Value | Prior Period | This Period | Total to Date | % Complete |
|------|-------------|-----------------|--------------|-------------|---------------|------------|
| (commitment line items with progressive billing tracking) |

### Tab 3: Commitment Details

**Commitment Summary:**
- Commitment Number/ID
- Commitment Type (PO/Subcontract/Work Order)
- Vendor Name
- Commitment Amount
- Committed to Date
- Balance Remaining

**Linked Commitment Line Items Table:**
(Read-only view of parent commitment for reference)

### Tab 4: Approvals

**Multi-Level Approval Workflow:**
- Submitted: [User] on [Date]
- Approval Level 1: [User] on [Date] - Approved/Pending/Rejected
- Approval Level 2: [User] on [Date] - Approved/Pending/Rejected
- Final Approval: [User] on [Date] - Approved/Rejected

**Rejection Details (if applicable):**
- Reason for rejection
- Rejected by [User] on [Date]
- Option to resubmit with corrections

### Tab 5: Payments

**Payments Issued:**
| Payment Date | Payment Method | Amount | Check # | Status |
|--------------|----------------|--------|---------|--------|
| (records of all payments made against this invoice) |

**Summary:**
- Original Invoice Total: $X
- Total Paid to Date: $X
- Retention Withheld: $X
- Balance Due: $X

### Tab 6: Activity

**Detailed Change Log:**
- All modifications timestamped
- Field-level change tracking
- User attribution for each change

---

## Expected Line Item Structure

### Owner Invoice Line Items (from Schedule of Values)

```json
{
  "id": 1,
  "invoice_id": 123,
  "sov_line_item_id": 456,
  "description": "General Labor",
  "scheduled_value": 10000.00,
  "completed_to_date": 8500.00,
  "materials_stored": 1500.00,
  "total_this_invoice": 10000.00,
  "retention_percent": 5.0,
  "retention_amount": 500.00,
  "net_amount": 9500.00
}
```

**Key Calculations:**
- Total = Completed to Date + Materials Stored
- Retention Amount = Total * Retention %
- Net Amount = Total - Retention Amount

### Subcontractor Invoice Line Items (Progressive Billing)

```json
{
  "id": 1,
  "invoice_id": 789,
  "commitment_line_item_id": 321,
  "description": "Framing Labor",
  "scheduled_value": 50000.00,
  
  "previous_quantity": 100.0,
  "previous_amount": 5000.00,
  
  "this_period_quantity": 50.0,
  "this_period_amount": 2500.00,
  
  "total_quantity": 150.0,              // COMPUTED: previous + this_period
  "total_amount": 7500.00,              // COMPUTED: previous + this_period
  
  "percent_complete": 15.0,             // COMPUTED: (total_amount / scheduled_value) * 100
  "unit_price": 50.00
}
```

**Key Calculations:**
- Total Quantity = Previous Period Quantity + This Period Quantity
- Total Amount = Previous Period Amount + This Period Amount
- Percent Complete = (Total Amount / Scheduled Value) * 100, capped at 100%

**Progressive Billing Purpose:**
- Tracks cumulative billing across multiple invoices
- Prevents double-billing of same work
- Shows invoice-by-invoice breakdown
- Displays overall project completion percentage

---

## Expected Workflow & Status Transitions

### Owner Invoice Workflow

```
┌─────────┐
│  DRAFT  │  ← User creates invoice
└────┬────┘
     │ Click "Submit"
     ↓
┌──────────────┐
│  SUBMITTED   │  ← Awaiting approval
└────┬─────────┘
     │
     ├─→ Click "Reject" → Back to DRAFT
     │
     └─→ Click "Approve" → APPROVED
            ↓
        ┌──────────┐
        │ APPROVED │  ← Ready to pay / Final state
        └──────────┘
```

**Transition Rules:**
- DRAFT → SUBMITTED: Only if invoice is complete and valid
- SUBMITTED → DRAFT: Rejection allows edits
- SUBMITTED → APPROVED: Requires approval permission
- APPROVED: Final state, cannot edit or delete
- DRAFT: Can be deleted only by creator or admin
- SUBMITTED/APPROVED: Can export to PDF/Excel

### Subcontractor Invoice Workflow

```
┌─────────┐
│ PENDING │  ← Vendor submits invoice
└────┬────┘
     │
     ├─→ Click "Reject" → REJECTED (sent back to vendor)
     │
     └─→ Click "Approve" → APPROVED
            ↓
        ┌──────────┐
        │ APPROVED │  ← Ready for payment
        └────┬─────┘
             │ Record payment
             ↓
          ┌──────┐
          │ PAID │  ← Final state
          └──────┘
```

**Special States:**
- VOIDED: Cancelled without payment (admin action)
- ON HOLD: Temporarily stopped (pending issue resolution)

**Transition Rules:**
- PENDING → APPROVED: Requires approval permission
- APPROVED → PAID: Record payment action
- PENDING/APPROVED → REJECTED: With reason/comment
- PENDING/APPROVED → VOIDED: Admin action only
- Cannot edit once APPROVED (unless special override)

---

## Approval Workflows & Permissions

### Owner Invoice Approvals

**Typical Approval Chain:**
1. **Reviewer/Submitter** - Project Manager or cost analyst submits for approval
2. **Approver** - Designated approver reviews and approves
3. **Final Authority** - Company may require final sign-off (optional)

**Permission Levels:**
- **Create**: Project team members
- **Edit Draft**: Invoice creator, project admin
- **Submit**: Invoice creator, project manager
- **Approve**: Designated approvers, project lead, admin
- **Delete Draft**: Creator, project admin
- **View**: All project team members with invoicing access
- **Export**: Approvers and above

### Subcontractor Invoice Approvals

**Typical Approval Chain:**
1. **Initial Review** - PM/QA reviews invoice against commitment
2. **Cost Review** - Cost analyst reviews amounts and calculations
3. **Approval** - Designated approver authorizes payment
4. **Payment Recording** - Finance records payment

**Permission Levels:**
- **View**: Project team members
- **Approve**: Designated approvers, cost analyst, PM
- **Record Payment**: Finance, cost analyst
- **Reject**: Reviewers with approval rights

---

## Export Capabilities

### Export Formats

**PDF Export:**
- Full invoice with header, line items, totals
- Includes approval status and workflow
- Can include company letterhead
- Professional formatting for sending/filing

**Excel Export:**
- Structured spreadsheet format
- Line items as separate rows
- Summary totals section
- Maintains formulas for calculations
- Multiple worksheets (summary + details)

**CSV Export:**
- Flat file format for ERP integration
- Includes all invoice and line item data
- Standard delimiters for import

### Export Contents

**Invoice Summary:**
- Invoice number, dates, parties
- Status, approval information
- Total amounts, retention, tax

**Detailed Line Items:**
- Item descriptions
- Quantities and unit prices
- Amount calculations
- Retention applied per item

**Financial Summary:**
- Subtotal
- Tax
- Retention
- Net amount/balance due

---

## Integration Points

### Commitment Integration
- Owner invoices: Link to Prime Contracts
- Subcontractor invoices: Link to Purchase Orders, Subcontracts, Work Orders
- Line items inherit from commitment line items
- Commitment status affects invoice ability

### Schedule of Values (SOV)
- Owner invoices draw line items from SOV
- Prevents double-billing
- Tracks completion percentage
- Used for progress billing calculations

### Budget Integration
- Invoiced amounts compared against budget
- Variance analysis and reporting
- Budget vs. actual tracking
- Commitment vs. invoiced vs. paid visibility

### Payment System
- Payment recording against invoices
- Paid to date tracking
- Balance due calculations
- Check number and payment method tracking

### ERP Integration
- Export invoice data to external systems
- Payments Issued tab synchronization
- Financial data flow to accounting systems

### Change Order Integration
- Approved changes reflected in invoicing
- Line item updates propagate to invoices
- Budget impacts on new invoices

### Reporting
- Financial variance reports
- Job cost summary reports
- Committed costs reporting
- Payment aging reports

---

## Key Data Fields & Their Purposes

### Owner Invoice Fields

| Field | Type | Purpose |
|-------|------|---------|
| invoice_number | TEXT | Unique identifier |
| project_id | BIGINT | Which project |
| contract_id | BIGINT | Link to prime contract |
| billing_period_id | UUID | Organizational grouping |
| invoice_date | DATE | When invoice was created |
| due_date | DATE | When payment is due |
| status | ENUM | Draft, Submitted, Approved |
| total_amount | DECIMAL | Sum of all line items (net of retention) |
| subtotal | DECIMAL | Before retention/tax |
| tax | DECIMAL | Tax applied |
| retention_percent | DECIMAL | Default retention % for invoice |
| submitted_at | TIMESTAMP | When submitted for approval |
| approved_at | TIMESTAMP | When approved |
| approved_by | BIGINT | User who approved |
| created_by | BIGINT | Invoice creator |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last modification |
| notes | TEXT | Additional comments |

### Subcontractor Invoice Fields

| Field | Type | Purpose |
|-------|------|---------|
| invoice_number | TEXT | Vendor's invoice number |
| project_id | BIGINT | Which project |
| commitment_id | BIGINT | PO/Subcontract/Work Order |
| commitment_type | ENUM | purchase_order, subcontract, work_order |
| vendor_id | BIGINT | Which vendor |
| status | ENUM | Pending, Approved, Paid, Rejected |
| total_amount | DECIMAL | Total invoice amount |
| subtotal | DECIMAL | Before retention/tax |
| tax | DECIMAL | Tax |
| retention_percent | DECIMAL | Retention % |
| retention_amount | DECIMAL | Retention $ |
| paid_to_date | DECIMAL | Cumulative paid |
| balance_due | DECIMAL | Remaining owed |
| period_covering_start | DATE | Invoice period start |
| period_covering_end | DATE | Invoice period end |
| invoice_date | DATE | When vendor sent invoice |
| submitted_at | TIMESTAMP | When received |
| approved_at | TIMESTAMP | When approved |
| paid_at | TIMESTAMP | When marked paid |
| created_by | BIGINT | User who created record |
| created_at | TIMESTAMP | When record created |
| updated_at | TIMESTAMP | Last modification |

### Line Item Fields (Owner)

| Field | Type | Purpose |
|-------|------|---------|
| sov_line_item_id | BIGINT | Link to Schedule of Values |
| description | TEXT | What work/material |
| scheduled_value | DECIMAL | Total value per SOV |
| completed_to_date | DECIMAL | Work completed this invoice |
| materials_stored | DECIMAL | Materials on-site this invoice |
| total_this_invoice | DECIMAL | Total amount this invoice |
| retention_percent | DECIMAL | Retention for this line |
| retention_amount | DECIMAL | Retention $ |
| net_amount | DECIMAL | Amount after retention |

### Line Item Fields (Subcontractor)

| Field | Type | Purpose |
|-------|------|---------|
| commitment_line_item_id | BIGINT | Parent commitment line |
| description | TEXT | What work/material |
| scheduled_value | DECIMAL | Total value per commitment |
| unit_price | DECIMAL | Price per unit |
| this_period_quantity | DECIMAL | Quantity billed this invoice |
| this_period_amount | DECIMAL | Amount this invoice |
| previous_quantity | DECIMAL | Qty billed previous invoices |
| previous_amount | DECIMAL | Amt billed previous invoices |
| total_quantity | DECIMAL | COMPUTED: previous + this_period |
| total_amount | DECIMAL | COMPUTED: previous + this_period |
| percent_complete | DECIMAL | COMPUTED: total / scheduled * 100 |

---

## Billing Periods Configuration

### Billing Period Fields

| Field | Type | Purpose |
|-------|------|---------|
| id | BIGINT | Unique identifier |
| project_id | BIGINT | Which project |
| name/number | TEXT | Period identifier (e.g., "Period 1", "January 2024") |
| period_start_date | DATE | When period begins |
| period_end_date | DATE | When period ends |
| is_closed | BOOLEAN | Whether period is finalized |
| closed_date | DATE | When closed (if closed) |
| closed_by | BIGINT | User who closed period (if applicable) |
| created_at | TIMESTAMP | Creation date |

### Billing Period States

**Open Period:**
- Invoices can be created and modified
- Period can be edited
- Can add/remove invoices

**Closed Period:**
- Locked for new invoices
- Invoices within period are read-only
- Cannot modify period dates
- Financial reporting locked
- Useful for month-end, quarter-end closure

### Billing Period Associations

- Each owner invoice linked to a billing period
- Each subcontractor invoice linked to a billing period
- Enables period-based reporting and closure
- Supports financial close-out procedures

---

## Retention Tracking

### Owner Invoice Retention

**Purpose:** Hold back a percentage of payment until work is complete/verified

**Calculation:**
- Retention % set per invoice or per line item
- Retention Amount = Line Item Total × Retention %
- Net Amount = Line Item Total - Retention Amount

**Example:**
- Line item: $10,000
- Retention: 5%
- Retention amount: $500
- Payment: $9,500 (with $500 held back)

**Release:**
- Final invoice may release retained amounts
- Manual release by approver
- Track retained amounts separately for reporting

### Subcontractor Invoice Retention

**Purpose:** Hold payment percentage pending final acceptance/lien waivers

**Calculation:**
- Retention % applied to invoice total
- Can be set per invoice
- May override commitment-level retention

**Retention Fields:**
- retention_percent - The percentage withheld
- retention_amount - Calculated amount
- Subtotal - Before retention
- Total - After retention and tax

**Payment Tracking:**
- Balance Due = Total - Paid to Date
- When payment recorded, paid_to_date increases
- Retention released as separate "final payment"

---

## Reference Implementation Patterns

### From Procore Screenshots Analysis

**List Page Pattern:**
- Tab navigation (Owner/Subcontractor)
- Summary cards (count by status, total amounts)
- Sortable table with filtering
- Bulk actions menu
- Individual row action menus
- Search bar for invoice number/vendor

**Detail Page Pattern:**
- Full-width header with status badge and actions
- Multi-tab layout
- Approval workflow timeline
- Financial summary card
- Line items table (read-only in approved state)
- Payment history (if enabled)
- Activity/change log

**Form Pattern (Create/Edit):**
- Step-by-step form sections
- Line item selector/builder
- Auto-calculated totals
- Save as Draft vs. Submit distinction
- Cancel action
- Validation with inline error messages

**Approval Pattern:**
- Status badge indicates approval state
- Action buttons change based on status
- Cannot edit approved invoices
- Approval history visible in detail view
- Optional rejection workflow with comments

---

## Common Issues & Edge Cases

### Double Billing Prevention
- Progressive billing fields track cumulative amounts
- Cannot invoice same work twice
- System prevents line item duplication

### Retention Complexity
- Multiple retention scenarios (general + specific items)
- Final invoice typically releases all retentions
- Tracking retained amounts separately for reporting
- Retention release can be tied to conditions (lien waiver, etc.)

### Multi-Currency Considerations
- Project currency established at project level
- All invoices in project currency
- Exchange rates for international subcontractors

### Approval Authority Conflicts
- Define clear approval chains
- Escalation procedures for large amounts
- Rejection workflows with comments
- Re-submission capabilities

### Period Closure
- Prevent new invoices after period closed
- Handle invoices spanning periods
- Financial close procedures
- Audit trail for period closures

---

## Summary of Key Characteristics

**Procore Invoicing is:**
- **Dual-purpose:** Owner and subcontractor invoices in one tool
- **Commitment-centric:** Subcontractor invoices link to POs/Subcontracts/Work Orders
- **Approval-workflow-heavy:** Multi-step approvals with status tracking
- **Period-organized:** Invoices grouped by billing periods
- **Progressive-billing-aware:** Tracks previous + this-period amounts
- **Retention-capable:** Holds back percentages with separate tracking
- **Export-rich:** PDF, Excel, CSV with multiple formats
- **Integrated:** Deep connections to SOV, budgets, payments, ERP
- **Audit-trail-focused:** Complete change history and approvals
- **Role-based:** Different permissions for creators, reviewers, approvers, finance

---

## Notes on Reference URL

The reference URL provided (`https://us02.procore.com/...invoices`) points to a specific commitment's invoices within the Invoicing tool. This indicates that:

1. Invoicing is accessible from within the Commitments tool
2. Individual commitments (in this case a Purchase Order 562949959141576) have an invoices section
3. The view shows all invoices linked to that specific commitment
4. Navigation flows: Company → Project → Commitments → Specific PO → Invoices

This nesting shows that invoicing is deeply integrated with the commitment system, where subcontractor invoices are always associated with a specific commitment.

---

**End of Procore Invoicing Reference Document**

For detailed implementation guidance, see:
- `/invoicing/invoicing-crawl-status.md` - Complete crawl analysis with 47 captured pages
- `/invoicing/database-schema-summary.md` - Schema implementation details
- `/invoicing/api-reference.md` - API endpoint specifications
- `/invoicing/research.md` - Codebase research and implementation status

