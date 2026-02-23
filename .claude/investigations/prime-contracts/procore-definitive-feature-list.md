# Procore Prime Contracts — Definitive Feature List

**Source:** Live DOM crawl (Feb 23 2026, project 562949954728542) + DOM analysis of Dec 2025 crawl + official Procore support documentation
**Evidence:** ag-grid col-ids from live page, label elements, support doc step-by-step workflows
**Date:** 2026-02-23

---

## 1. List Page (Index View)

### Table Columns (from ag-grid col-id — exact attribute values from live DOM)

| col-id | Display Name | Type |
|--------|-------------|------|
| `number` | Contract # | String (hyperlink to detail) |
| `vendor` | Vendor/Contractor | FK |
| `title` | Title | String |
| `erpStatus` | ERP Status | String (system-managed) |
| `status` | Status | Enum |
| `executed` | Executed | Boolean |
| `grandTotal` | Grand Total / Original Contract Amount | Currency |
| `approvedChangeOrderPackagesAmount` | Approved Change Orders | Currency (calculated) |
| `totalContractAmount` | Total / Revised Contract Amount | Currency (calculated) |
| `pendingChangeOrderPackagesAmount` | Pending Change Orders | Currency (calculated) |
| `draftChangeOrderPackagesAmount` | Draft Change Orders | Currency (calculated) |
| `invoicesAmount` | Invoices | Currency (calculated) |
| `totalPayments` | Payments Received | Currency (calculated) |
| `percentPaid` | Percent Paid | Percentage (calculated) |
| `totalRemaining` | Remaining Balance | Currency (calculated) |
| `private` | Private | Boolean |
| `attachmentsCount` | Attachments | Number |
| `rowActions` | — | Actions menu |

Additional displayable columns (from list view docs):
- Owner/Client, Contractor, Architect/Engineer, Default Retainage
- All date fields: Start Date, Estimated Completion, Actual Completion, Substantial Completion, Contract Date, Execution Date, Signed Contract Received Date, Issued On Date, Returned Date, Letter of Intent Date, Approval Letter Date, Contract Termination Date

### Toolbar Actions

- **Create** button (primary)
- **Export** dropdown (DOCX or PDF of entire list)
- **Configure Settings** (gear icon)
- **Row Groups** / **Grouping** (by any column)
- **Column Labels** (show/hide columns)
- **Filters** (multi-criteria filtering)
- **Table Settings** (row height, column width, pin columns)
- **Pagination** (First/Previous/Next/Last)
- **Search** (keyword filter)

### Row Actions (from dropdown capture — exact menu items)

- Create Change Event → `/change_events/events/new`
- Create Prime Contract CO → `/prime_contracts/{id}/change_orders/change_order_packages/new`
- Create Invoice → `/prime_contracts/{id}/payment_applications/new`
- Create Payment → `/prime_contracts/{id}/payments?create`

### List View Features

- Grand totals row for all currency columns
- Expandable rows (click blue arrow to show associated change orders)
- Bulk actions (select multiple rows)
- Column show/hide, pin, auto-size, resize
- Grouping by any column (e.g., group by Status)

---

## 2. Create Form

### Form Sections

1. General Information
2. Schedule of Values (SOV grid)
3. Inclusions & Exclusions
4. Contract Dates
5. Contract Privacy (shown as "Make This Visible Only to Administrators...")

### General Information Fields (exact labels from live DOM)

| Label | Type | Notes |
|-------|------|-------|
| Sign with DocuSign | Checkbox | Default ON if DocuSign enabled |
| Contract # | Text | Placeholder: "Enter contract number"; auto-increments |
| Title | Text | Placeholder: "Enter title" |
| Owner/Client | Dropdown | Select from project Directory |
| Architect/Engineer | Dropdown | Select from project Directory |
| Contractor | Text/Dropdown | Company managing construction |
| Status | Dropdown | See status values below |
| Executed | Checkbox | Indicates full execution |
| Default Retainage | Percentage | e.g., 10% |
| Description | Rich text | Full formatting toolbar |
| Attachments | File upload | PDF, Word, Excel, CSV, DWG, MP4 accepted |

### Status Dropdown Values (confirmed from support docs)

- **Draft** (default — no COs or invoices can be created)
- **Out for Bid**
- **Out for Signature**
- **Approved** (required to create change orders and invoices)
- **Complete** (also allows change orders/invoices)
- **Terminated**

### Contract Dates Fields (exact labels from live DOM)

| Label | Notes |
|-------|-------|
| Start Date | Calendar picker |
| Estimated Completion Date | Calendar picker |
| Substantial Completion Date | Auto-updates from approved PCCO if configured |
| Actual Completion Date | Calendar picker |
| Signed Contract Received Date | Calendar picker |
| Contract Termination Date | Calendar picker |

Additional configurable date fields (admin can enable):

| Label | Notes |
|-------|-------|
| Contract Date | Effective date contract goes into force |
| Execution Date | Date signed by all parties |
| Issued On Date | Date issued to both parties |
| Returned Date | Calendar picker |
| Letter of Intent Date | LOI date |
| Approval Letter Date | LOA date |
| Date Created | Read-only, auto-populated |

### SOV Section

SOV line item fields:

| Field | Type | Notes |
|-------|------|-------|
| Budget Code | Dropdown | Select existing or create new |
| Description | Text | Work item description |
| Qty | Number | Quantity |
| UOM | Dropdown | Unit of Measure |
| Unit Cost | Currency | 4 decimal precision |
| Amount | Currency | Auto-calculated: Qty × Unit Cost |

SOV actions: Add Line, Add Group (by Cost Code/Cost Type/Sub Job), Import CSV

### Privacy Fields

| Label | Notes |
|-------|-------|
| Make This Visible Only to Administrators... | Checkbox (Private toggle) |
| Allow These Users to See SOV Items | Multi-select users with Read Only or Standard permissions |

### Form Actions

- **Create** — saves contract
- **Create & Email** — saves and sends notifications

---

## 3. Detail View — Tabs

### General Tab

- All create form fields in read/edit mode
- **Contract Summary** section showing:
  - Original Contract Amount
  - Approved Change Orders
  - Revised Contract Amount
  - Pending Change Orders
  - Pending Revised Contract Amount
  - Draft Change Orders
  - Owner Invoices
  - Payments Received
  - Percent Paid
  - Remaining Balance Outstanding

### Schedule of Values Tab

- Itemized SOV grid (Budget Code, Description, Qty, UOM, Unit Cost, Amount)
- Add/Edit/Delete line items
- Add Group menu (Cost Code, Cost Type, Sub Job)
- SOV locking (locked once Approved unless "Always Editable" setting enabled)

### Change Orders Tab

- List of all PCCOs, PCOs, CORs (depending on tier setting)
- Shows: Status, Number, Title, Amount, Due Date
- Export change order log to CSV or PDF
- Download individual change orders

### Invoices Tab

- List of all owner invoices (payment applications)
- Shows: Invoice #, Amount, Payment Due, Percentage Complete, Status
- Create new invoice button
- Export to DOCX or PDF

### Payments Received Tab

- List of payments received against invoices
- Shows payment details
- "New Payment" section to add payments
- Edit button to record payments

### Related Items Tab

- Links to items from any other Procore tool (RFIs, Submittals, Change Events, Direct Costs, etc.)
- Add/remove related items

### Emails Tab

- Log of all emails sent/received re: this contract
- Inbound Procore email address (blue banner)
- "New Email" button

### Change History Tab

- Complete audit trail
- Date/time of every action
- User who made the change
- What field/value changed

### Financial Markup Tab

- Horizontal markup settings
- Vertical markup settings (if configured at company level)
- Applied to change order line items

### Advanced Settings Tab

Fields:

| Setting | Type | Notes |
|---------|------|-------|
| Enable Financials Markup | Checkbox | Default ON |
| Enable Owner Invoices | Checkbox | Default ON |
| Enable Completed Work Retainage | Checkbox | Default ON |
| Enable Stored Material Retainage | Checkbox | Default ON |
| Level of Detail to Display Change Orders | Dropdown | Options: Line items in each PCO / PCCO / PCO |
| Approve Subcontractor Invoices when Owner Approves | Checkbox | |
| Show Cost Code on PDF | Checkbox | |
| Enable Payments Received | Checkbox | Default ON |
| Accounting Method | Radio | Amount Based or Unit/Quantity Based |

---

## 4. Change Order Status Values

Change order status is DIFFERENT from contract status:

- **Draft**
- **Out for Bid**
- **Out for Signature**
- **Pending - In Review** (awaiting Designated Reviewer)
- **Pending - Revised** (awaiting reviewer after revisions)
- **Approved**
- **Rejected**
- **Complete**
- **Terminated**

---

## 5. Configure Tab (Project-Level Settings)

### Contract Configuration

- **Number of Prime Contract Change Order Tiers** — 1-Tier, 2-Tier, or 3-Tier
  - Cannot change after first CO created
- **Allow standard level users to create PCCOs and approve their own workflows** — Checkbox
- **Allow Standard Level Users to Create PCOs** — Checkbox
- **Allow the schedule of values to be always editable, no matter the contract status** — Checkbox

### Contract Invoice Settings

- **Show Financial Markup Application Criteria on Change Order PDF exports** — Checkbox
- **Show financial markups on invoice PDF and CSV exports** — Checkbox

### Default Distributions

- **Prime Contract** — default distribution setup
- **Prime Contract Change Order** — default distribution
- **Prime Contract Potential Change Order** — default distribution

---

## 6. Permissions Model

### Admin

- Full create/edit/delete/export
- Configure tool settings
- View all contracts (including Private)
- Approve/reject change orders as Designated Reviewer
- Export to DOCX or PDF

### Standard (with conditions)

- View non-private contracts
- View private if on access list
- Create PCOs if enabled in tool settings
- Approve/reject COs if assigned as Designated Reviewer
- Export PDF only (not DOCX)

### Read Only (with conditions)

- View non-private contracts, view private if on access list
- View change orders, invoices, payments
- Export PDF only
- No create/edit/delete

---

## 7. Workflows

### Create Contract

1. Navigate to Prime Contracts → click **Create**
2. Fill fields (none required — saves as Draft if empty)
3. Click **Create** or **Create & Email**

### Approve Contract

1. Open contract → click **Edit**
2. Change Status to **Approved**
3. Click **Save**

### Create Change Order (2-Tier)

1. Open Approved contract
2. Click **Create** → "Create Prime PCO"
3. Fill fields, add SOV line items
4. Submit for review → Designated Reviewer approves/rejects

### Change Order Review

1. Reviewer receives email / sees in My Open Items
2. Opens CO → enters comment
3. Clicks **Approve this PCCO** or **Reject this PCCO**
4. Status auto-updates, email sent to creator

### Create Invoice

1. Open Approved/Complete contract
2. Click **Create** → "Create Invoice"
3. OR from Invoices tab
4. Fill payment application fields

### Record Payment

1. Open contract → Payments Received tab
2. Click **Edit** → New Payment section
3. Enter payment amount and date

---

## 8. Export Options

| Export | Format | Who |
|--------|--------|-----|
| Individual contract | DOCX or PDF | Admin (DOCX), All (PDF) |
| Contracts list | DOCX or PDF | All with Read access |
| Change order log | CSV or PDF | Admin/Standard |
| Individual change order | CSV or PDF | Admin/Standard |
| Invoice list | CSV or PDF | Admin/Standard |

---

## 9. ERP Integration Notes

- Contracts must be **Approved** status to sync to ERP
- Sage 300 CRE: Title max 30 chars, Number max 5 chars, Associated Line Item required
- CMiC: Date required, horizontal markups only (no vertical)
- QuickBooks Desktop: PCCO exports NOT supported
- Sage 100: PCCO exports NOT supported
- ERP Status column in list reflects sync status (system-managed)

---

## 10. Key Limitations

- Accounting method cannot be changed after SOV line items are created
- Change order tiers cannot be changed after first CO created
- Cannot create COs or invoices until contract is Approved or Complete
- Private contracts require explicit user access grant
- Standard users cannot create PCOs unless setting is enabled
