# Procore Reference: Full Commitments Chain
**Date:** 2026-04-10
**Scope:** Prime Contracts -> Commitments (+ SOV) -> Subcontractor Invoicing -> Owner Invoicing
**Sources:** Tier 1 RAG (560 embedded articles), Tier 2 Deep Crawl Manifests, Tier 3 WebFetch

---

## 1. Prime Contracts

### Overview
Prime Contracts represent the agreement between the General Contractor (GC) and the Owner/Client. They are the top-level financial instrument from which all downstream financial activity flows: change orders, owner invoicing, and payment tracking.

### Statuses and Transitions
| Status | Description | Transitions To |
|--------|-------------|---------------|
| **Draft** | Initial state. Editable. Not yet sent for review. | Out for Bid, Out for Signature, Approved, Void |
| **Out for Bid** | Implied status when soliciting bids. | Draft, Out for Signature, Approved |
| **Out for Signature** | Sent via DocuSign for electronic signature. | Approved (Executed), Draft |
| **Approved** | Approved by Admin. Required before change orders or owner invoicing. | Complete/Executed, Void |
| **Complete/Executed** | Fully signed and executed. | Void |
| **Void** | Cancelled/voided. Terminal state. | (none) |

**Key Rule:** A prime contract MUST be in "Approved" status before any change orders can be created against it or any owner invoices can be generated.

### Executed Field
- Separate from Status -- a Yes/No boolean field
- Indicates whether the physical/digital contract document has been fully executed
- A contract can be "Approved" but not yet "Executed" (waiting on signatures)

### Create Form Fields

#### General Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contract # | Select/Text | Yes | Auto-generated or manual entry |
| Owner/Client | Company Select | Yes | From project directory |
| Title | Text | Yes | Descriptive name |
| Status | Select | Yes | Default: Draft |
| Executed | Select | Yes | Yes/No boolean |
| Default Retainage | Percentage (%) | No | Applied to all SOV line items. Common: 5-10% |
| Contractor | Company Select | No | GC company |
| Architect/Engineer | Company Select | No | A/E firm on the project |
| Description | Rich Text | No | Free-form description |
| Attachments | File Upload | No | Multiple files supported |

#### Inclusions & Exclusions
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Inclusions | Rich Text | No | What is included in contract scope |
| Exclusions | Rich Text | No | What is excluded from contract scope |

#### Contract Dates
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Start Date | Date | No | Contract start |
| Estimated Completion | Date | No | Projected completion |
| Substantial Completion | Date | No | Substantial completion milestone |
| Actual Completion | Date | No | Filled when work completes |
| Signed Contract Received | Date | No | Date physical/digital signed copy received |
| Contract Termination | Date | No | If contract is terminated |

#### Privacy Settings
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Private | Checkbox | No | Restricts visibility to Admins + selected users |
| Access for Non-Admin Users | Multi-select | No | Users who can view when Private is checked |
| Allow SOV View | Checkbox | No | Allow non-admin users to see Schedule of Values |

### Save Actions
- **Create** -- saves as Draft
- **Create & Email** -- saves and sends email notification
- **Complete with DocuSign** -- initiates DocuSign workflow for electronic signatures

### List View Columns (17)
| # | Column | Description |
|---|--------|-------------|
| 1 | Number | Contract number |
| 2 | Owner/Client | Company name |
| 3 | Title | Contract title |
| 4 | ERP Status | Sync status with external ERP |
| 5 | Status | Draft, Approved, etc. |
| 6 | Executed | Yes/No |
| 7 | Original Contract Amount | Initial contract value |
| 8 | Approved COs | Sum of approved change orders |
| 9 | Revised Contract Amount | Original + Approved COs |
| 10 | Pending COs | Sum of pending change orders |
| 11 | Draft COs | Sum of draft change orders |
| 12 | Invoiced | Total invoiced amount |
| 13 | Payments Received | Total payments from owner |
| 14 | % Paid | Payments / Revised Contract Amount |
| 15 | Remaining Balance | Revised - Invoiced |
| 16 | Private | Yes/No indicator |
| 17 | Attachments | Attachment count/indicator |

### List View Filters
- Owner/Client (company)
- ERP Status
- Status (Draft, Approved, etc.)
- Executed (Yes/No)

### Detail View Tabs (10)
| Tab | Description |
|-----|-------------|
| **General** | All create-form fields (read/edit mode) |
| **Schedule of Values** | Line items with budget codes, descriptions, amounts |
| **Change Orders** | PCCOs, PCOs, Change Events linked to this contract |
| **Invoices** | Owner invoices created against this contract |
| **Payments Received** | Payment records from the owner |
| **Related Items** | Linked RFIs, submittals, drawings, etc. |
| **Emails** | Email correspondence history |
| **Change History** | Audit log of all modifications |
| **Financial Markup** | Markup rules for change orders |
| **Advanced Settings** | Accounting method, CO tier config, retainage settings |

### Schedule of Values (SOV)

#### Accounting Methods
Set in **Advanced Settings** tab. Locked after first line item is added.

| Method | Description |
|--------|-------------|
| **Amount Based** | Each line item has a fixed dollar amount |
| **Unit/Quantity Based** | Each line item has unit price x quantity |

#### SOV Structure
| Column | Description |
|--------|-------------|
| Budget Code | Links to project cost code |
| Description | Line item description |
| Amount | Dollar amount (amount-based) or Unit Price x Qty (unit-based) |

#### SOV Import
SOV can be imported directly from the project Budget, pre-populating line items with budget codes and amounts.

### Change Order Tiers
Configurable per-project in Advanced Settings:

| Tier | Flow |
|------|------|
| **1-Tier** | PCCO (Prime Contract Change Order) only |
| **2-Tier** | PCO (Potential Change Order) -> PCCO |
| **3-Tier** | Change Event -> PCO -> PCCO |

### Retainage
- **Default Retainage %** field on the contract header
- Applied automatically to all SOV line items
- Can be overridden per line item on invoices
- Industry standard: 5-10%
- Released via owner invoices (line-by-line or bulk release)

### Permissions
| Level | Capabilities |
|-------|-------------|
| **Read Only** | View contract details, export list |
| **Standard** | View, respond to workflows (if not private) |
| **Admin** | Full CRUD, approve contracts, export DOCX/PDF, manage retainage, configure CO tiers |

---

## 2. Commitments (Subcontracts + Purchase Orders)

### Overview
Commitments represent agreements between the GC and subcontractors/vendors. Two distinct types are unified under one "Commitments" tool in the UI:
- **Subcontract** -- labor/service agreements with subcontractors
- **Purchase Order** -- material/equipment purchase agreements with vendors

### Statuses and Transitions
| Status | Description | Transitions To |
|--------|-------------|---------------|
| **Draft** | Initial state. Fully editable. | Pending, Approved, Void |
| **Pending** | Under review. Limited editing. | Draft, Approved, Void |
| **Approved** | Approved by Admin. Required before invoicing. | Complete, Void |
| **Complete / Completed with DocuSign** | Fully executed. | Void |
| **Void** | Cancelled. Terminal state. | (none) |

**Key Rule:** A commitment MUST be in "Approved" status before subcontractor invoices can be created against it.

### Executed Field
- Separate Yes/No boolean (same pattern as Prime Contracts)
- Tracks whether the physical/digital document has been signed

### SSOV Status
- Separate status field tracking the Subcontractor SOV submission
- Values include: "Approved", "Pending", "Submitted", "Rejected"
- Distinct from the commitment's own Status field

### List View

#### List Tabs
| Tab | Description |
|-----|-------------|
| **Contracts** | Primary list of all active commitments |
| **Recycle Bin** | Deleted/voided commitments |

#### Toolbar Actions
- **+ Create** (dropdown): Subcontract, Purchase Order
- **Export** (list export)
- **Configure** (column visibility/order)
- **Search** (text search)
- **Filters** (multi-field filtering)

#### List Columns (17)
| # | Column | Description |
|---|--------|-------------|
| 1 | Number | Commitment number |
| 2 | Contract Company | Subcontractor/vendor company |
| 3 | Title | Commitment title |
| 4 | ERP Status | Sync status with external ERP |
| 5 | Status | Draft, Pending, Approved, etc. |
| 6 | Executed | Yes/No |
| 7 | SSOV Status | Subcontractor SOV submission status |
| 8 | Original Contract Amount | Initial commitment value |
| 9 | Approved COs | Sum of approved change orders |
| 10 | Revised Contract Amount | Original + Approved COs |
| 11 | Pending COs | Sum of pending change orders |
| 12 | Draft COs | Sum of draft change orders |
| 13 | Invoiced | Total invoiced to date |
| 14 | Payments Issued | Total payments made to sub/vendor |
| 15 | % Paid | Payments / Revised Contract Amount |
| 16 | Remaining Balance | Revised - Invoiced |
| 17 | Private | Yes/No indicator |

#### List Filters
- Contract Company
- Contract Type (Subcontract / Purchase Order)
- ERP Status
- Status (Draft, Pending, Approved, etc.)
- Executed (Yes/No)
- SSOV Status

### Create/Edit Form Fields

#### General Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contract # | Text/Auto | Yes | Auto-generated or manual |
| Contract Company | Company Select | Yes | From project directory |
| Title | Text | Yes | Descriptive name |
| Status | Select | Yes | Default: Draft |
| Executed | Select | Yes | Yes/No |
| Default Retainage | Percentage (%) | No | Applied to SOV line items |
| Description | Rich Text | No | Free-form |
| Attachments | File Upload | No | Multiple files |

#### Contract Dates
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Start Date | Date | No | Work start date |
| Estimated Completion | Date | No | Projected completion |
| Actual Completion | Date | No | Filled when work completes |
| Contract Date | Date | No | Date of contract agreement |
| Signed Contract Received | Date | No | Date signed copy received |
| Issued On | Date | No | Date commitment was issued |

#### Privacy Settings
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Private | Checkbox | No | Restricts to Admins + selected users |
| Access for Non-Admin Users | Multi-select | No | Users who can view when private |
| View SOV Items | Checkbox/Select | No | Controls SOV visibility |
| Invoice Contacts | Multi-select | No | Sub-facing users for SSOV and invoicing |

### Detail View Tabs (8)
| Tab | Description |
|-----|-------------|
| **General** | All form fields in read/edit mode |
| **Subcontractor SOV** | Dual SOV system (see below) |
| **Change Orders** | CCOs linked to this commitment |
| **RFQs** | Requests for Quotation |
| **Invoices** | Sub invoices against this commitment |
| **Payments Issued** | Payment records to sub/vendor |
| **Change History** | Audit log |
| **Advanced Settings** | SOV config, retainage, CO tiers |

### Dual SOV System

Commitments have TWO separate SOV structures:

#### 1. General SOV (GC-Managed)
| Aspect | Detail |
|--------|--------|
| **Purpose** | GC's view of the contract breakdown. Syncs to ERP. |
| **Managed By** | GC Admin |
| **Columns** | Budget Code, Description, Amount |
| **Features** | "Add Group" button for grouping line items |
| **Editability** | Only in Draft status, UNLESS "Always Editable SOV" is enabled in Advanced Settings |
| **ERP Sync** | YES -- syncs to external accounting systems |

#### 2. Subcontractor SOV (SSOV)
| Aspect | Detail |
|--------|--------|
| **Purpose** | Sub's detailed breakdown. Used for invoice line items. |
| **Managed By** | Subcontractor (via Invoice Contact role) or GC Admin |
| **Columns** | More granular than General SOV |
| **Constraint** | Total SSOV amount MUST equal the parent General SOV amount |
| **Own Status** | Has its own approval workflow (Submitted -> Approved/Rejected) |
| **ERP Sync** | NO -- does NOT sync to ERP |

### Change Order Tiers
| Tier | Flow |
|------|------|
| **1-Tier** | CCO (Commitment Change Order) only |
| **2-Tier** | PCO (Potential Change Order) -> CCO |
| **3-Tier** | Configurable multi-step |

### Retainage
- **Default Retainage %** on commitment header
- Applied automatically to SOV line items
- Per-line override available on invoices
- **Sliding Scale Retention** supported (e.g., 10% until 50% complete, then 5%)
- Enabled/configured in **Advanced Settings** tab
- Admin permission required to configure

### Permissions
| Level | Capabilities |
|-------|-------------|
| **Read Only** | View commitment details (if not private) |
| **Standard** | View, respond to workflows (if not private) |
| **Admin** | Full CRUD, approve, configure retainage, manage SSOV, manage CO tiers |
| **Invoice Contact** | Sub-facing role: submit SSOV, create/submit invoices |

---

## 3. Subcontractor Invoicing

### Overview
Subcontractor invoicing is the process by which subcontractors bill the GC for work completed. Follows AIA G702/G703 format. Invoices are always tied to a specific commitment and billing period.

### Creation Paths
| Path | Description |
|------|-------------|
| **Invite to Bill** | GC sends invitation; sub creates their own invoice (self-service) |
| **Admin Creates** | GC Admin creates invoice on behalf of subcontractor |

### Statuses and Transitions
| Status | Description | Transitions To |
|--------|-------------|---------------|
| **Draft** | Initial state. Editable by creator. | Under Review |
| **Under Review** | Submitted for GC review. | Approved, Approved as Noted, Revise & Resubmit |
| **Approved** | Fully approved by GC Admin. | Paid |
| **Approved as Noted** | Approved with comments/adjustments. | Paid |
| **Revise & Resubmit** | Rejected; sub must revise and resubmit. | Draft (sub edits), Under Review (resubmit) |
| **Paid** | Payment issued. Terminal state for invoicing workflow. | (none) |

### Invoicing Tool Navigation
The Invoicing tool has three top-level tabs:
| Tab | Description |
|-----|-------------|
| **Owner** | Owner invoices (GC -> Owner) |
| **Subcontractor** | Sub invoices (Sub -> GC) -- THIS SECTION |
| **Billing Periods** | Manage billing period dates |

### List View Columns
| Column | Description |
|--------|-------------|
| Invoice # | Sequential number |
| Invoice Status | Draft, Under Review, Approved, etc. |
| Contract Company | Subcontractor company name |
| Billing Period | Which billing period this invoice covers |
| Gross Amount | Total before retainage |
| Net Amount | After retainage deduction |
| Paid Amount | Amount actually paid |
| Invoice Dates | Created, submitted, approved dates |
| Contract | Parent commitment reference |
| Total Contract Amount | Revised contract value |
| % Complete | Cumulative completion percentage |
| ERP Status | Sync status with external ERP |

### List View Filters
- Billing Period
- Contract Company
- Payment Status
- Invoice Status
- Contract Type (Subcontract / Purchase Order)

### Detail View Tabs
| Tab | Description |
|-----|-------------|
| **Summary** | Overview with key financial figures, dates, status |
| **Detail (G703)** | AIA G703 format line-by-line billing detail |
| **Related Items** | Linked documents, drawings, change orders |
| **Emails** | Email correspondence |
| **Change History** | Audit log |
| **Lien Rights** | Lien waiver tracking and management |
| **Requirements** | Insurance, bonds, compliance requirements |

### G703 Detail Columns (AIA Format)
| Column ID | Column Name | Description |
|-----------|-------------|-------------|
| A | Item No | Line item number |
| -- | Budget Code | Cost code reference |
| B | Description | Description of work |
| C | Scheduled Value | Original SOV amount for this line |
| D | Work Completed (This Period) | Dollar amount of work done this billing period |
| E | Materials Stored (This Period) | Value of materials stored on-site |
| F | Total Completed & Stored (To Date) | Cumulative D + E across all periods |
| G (%) | Percentage | F / C as percentage |
| G ($) | Balance to Finish | C - F |
| H | From Previous Application | Amount billed in prior periods |

### Retainage Columns
| Column | Description |
|--------|-------------|
| Work Retainage This Period ($) | Dollar amount of retainage withheld on work this period |
| Work Retainage This Period (%) | Percentage rate applied |
| Total Materials Retainage ($) | Retainage withheld on stored materials |
| Total Materials Retainage (%) | Percentage rate for materials |
| Total Retainage | Cumulative retainage withheld |
| Released This Period | Retainage released in this billing period |
| Currently Retained | Net retainage still held |

### Line Item Review
- **Green Checkmark** = Line item approved
- **Red X** = Line item rejected
- Optional **Comment** per line item
- Admin reviews each line individually, then sets overall invoice status

### Retainage Release
Two methods:
1. **Via Existing Invoice** -- release retainage on specific line items within a regular invoice
2. **Dedicated Release Invoice** -- create an "Invoice for Release of Retainage" specifically to release withheld amounts

### Bulk Operations
- **Bulk Status Editing** -- change status of multiple invoices at once
- **Only available from Invoicing tool** -- NOT accessible from the Commitments detail view
- Admin permission required

### Permissions
| Level | Capabilities |
|-------|-------------|
| **Invoice Administrator** | Full control: create, edit, review, approve, delete invoices |
| **Invoice Contact** | Submit own invoices, edit only in Draft or Revise & Resubmit status |
| **Standard (on Commitments)** | View invoices if not private |
| **Read Only (on Commitments)** | View invoices if not private |

---

## 4. Owner Invoicing

### Overview
Owner invoicing is the process by which the GC bills the Owner/Client for work completed. This is accounts receivable from the GC's perspective. Follows the same AIA G702/G703 format as subcontractor invoicing but flows in the opposite financial direction. Owner invoices originate from the Prime Contracts tool.

### Prerequisites (Strict Order)
1. **Create** a Prime Contract
2. **Approve** the Prime Contract (status must be "Approved")
3. **Create** a Billing Period (manual or automatic)
4. **Create** an Owner Invoice within that billing period

All four steps are required. An owner invoice cannot exist without an approved prime contract and a valid billing period.

### Statuses and Transitions
| Status | Description | Transitions To |
|--------|-------------|---------------|
| **Draft** | Initial state. Editable. | Under Review |
| **Under Review** | Submitted to owner for review. | Approved, Approved as Noted, Revise & Resubmit |
| **Revise & Resubmit** | Owner requests changes. | Draft (edit), Under Review (resubmit) |
| **Approved** | Owner approves the invoice. | (Payment tracking separate) |
| **Approved as Noted** | Approved with owner comments/adjustments. | (Payment tracking separate) |

### List View Columns
| Column | Description |
|--------|-------------|
| Invoice # | Sequential number |
| Invoice Status | Draft, Under Review, Approved, etc. |
| Contract Company | Owner/Client company |
| Billing Period | Which billing period this invoice covers |
| Gross Amount | Total before retainage |
| Net Amount | After retainage deduction |
| Paid Amount | Amount received from owner |
| Invoice Dates | Created, submitted, approved dates |
| Contract | Parent prime contract reference |
| Total Contract Amount | Revised prime contract value |
| % Complete | Cumulative completion percentage |
| ERP Status | Sync status with external ERP |

### List View Filters
- Billing Period
- Contract Company
- Payment Status
- Invoice Status
- Contract Type

### Detail View Tabs
| Tab | Description |
|-----|-------------|
| **Summary** | Overview with key financial figures, dates, status |
| **Detail (G703)** | AIA G703 format line-by-line billing detail |
| **Related Items** | Linked documents, sub invoices, direct costs |
| **Emails** | Email correspondence |
| **Change History** | Audit log |

### G703 Detail Columns
Same AIA format as subcontractor invoicing:

| Column | Description |
|--------|-------------|
| A (Item No) | Line item number |
| Budget Code | Cost code reference |
| B (Description) | Description of work |
| C (Scheduled Value) | Original SOV amount |
| D (Work Completed) | Work done this period |
| E (Materials Stored) | Materials stored this period |
| F (Total Completed & Stored) | Cumulative to date |
| G (%) | Percentage complete |
| G (Balance to Finish) | Remaining amount |
| H (From Previous Application) | Prior period billing |
| Retainage Released This Period | Released this period |
| Retainage Currently Retained | Net retained amount |

### Pre-fill Feature
Owner invoices can be **auto-populated** from:
- Eligible subcontractor invoices in the same billing period
- Direct costs incurred in the same billing period
- Commitment change orders approved in the same billing period

This significantly reduces manual data entry by pulling in costs already captured downstream.

### Group Row Billing (Beta)
- Bill a fixed dollar amount or percentage at the group level
- System automatically distributes among child line items
- Useful for simplified owner billing when detailed sub-level tracking is maintained separately

### Approval Workflows
| Mode | Description |
|------|-------------|
| **Standard** | Admin manually changes invoice status |
| **Custom Workflows (Beta)** | Multi-step approval with specific assignees, conditions, and routing |

### Permissions
- **Inherits from Prime Contracts tool** -- no separate invoicing permission set
- **Admin on Prime Contracts** = full owner invoice control (create, edit, approve, delete)
- Standard/Read Only on Prime Contracts = view-only on owner invoices

---

## 5. Cross-Tool: Retainage

### Overview
Retainage (also called "retention") is a percentage of payment withheld from each invoice until project completion or milestone achievement. It serves as financial security for the owner/GC.

### Retainage Configuration Points

| Tool | Where Set | Scope |
|------|-----------|-------|
| **Prime Contracts** | "Default Retainage %" field on contract | All owner invoice line items inherit this default |
| **Commitments** | "Default Retainage %" field on commitment | All sub invoice line items inherit this default |
| **Sub Invoices** | Per-line override on G703 detail | Override commitment default for specific line items |
| **Owner Invoices** | Per-line override on G703 detail | Override prime contract default for specific line items |

### Retainage Columns on Invoices (Both Sub and Owner)
| Column | Description |
|--------|-------------|
| Work Retainage This Period ($) | Retainage withheld on work completed this period |
| Work Retainage This Period (%) | Rate applied to work |
| Materials Retainage ($) | Retainage withheld on stored materials |
| Materials Retainage (%) | Rate applied to materials |
| Total Retainage | Cumulative retainage across all periods |
| Released This Period | Amount of retainage released this period |
| Currently Retained | Total still being held |

### Retainage Release Methods
1. **Line-by-line release** on a regular invoice -- set "Released This Period" per line item
2. **Dedicated Release Invoice** -- create a special invoice specifically for retainage release (sub invoicing only)
3. **Bulk release** at project completion

### Sliding Scale Retention (Commitments Only)
- Configure in commitment Advanced Settings
- Example: 10% retainage until 50% complete, then 5% retainage
- Admin permission required to configure
- Threshold and rates are customizable

### Business Rules
- Retainage percentage defaults flow: Contract header -> SOV line items -> Invoice line items
- Per-line overrides on invoices do NOT change the contract-level default
- Retainage amounts are tracked separately from work/materials billing
- Released retainage reduces the "Currently Retained" balance
- Total retainage released can never exceed total retainage withheld
- Industry standard rates: 5-10% (varies by jurisdiction and contract terms)

---

## 6. Cross-Tool: Approval Workflows

### Standard Approval by Tool

| Tool | Who Approves | Required Status | What It Unlocks |
|------|-------------|----------------|-----------------|
| **Prime Contracts** | Admin | Must be "Approved" | Change orders, owner invoicing |
| **Commitments** | Admin | Must be "Approved" | Subcontractor invoicing |
| **Sub Invoices** | Invoice Administrator | "Under Review" -> "Approved" / "Approved as Noted" | Payment processing |
| **Owner Invoices** | Admin (on Prime Contracts) | "Under Review" -> "Approved" / "Approved as Noted" | Payment receipt tracking |

### Approval Actions Available

#### Prime Contracts
- Approve (Draft/Pending -> Approved)
- Complete with DocuSign (sends for e-signature)
- Void (any status -> Void)

#### Commitments
- Approve (Draft/Pending -> Approved)
- Void (any status -> Void)

#### Subcontractor Invoices
- Line-item review (green check / red X per line)
- Status change: Under Review -> Approved | Approved as Noted | Revise & Resubmit
- Bulk status editing (multiple invoices at once, from Invoicing tool only)

#### Owner Invoices
- Standard: Admin manually sets status
- Custom Workflows (Beta): Multi-step with assignees, conditions, auto-routing

### SSOV Approval (Commitments-Specific)
The Subcontractor SOV has its own separate approval flow:
- Sub submits SSOV -> GC reviews -> Approved / Rejected
- SSOV status is tracked independently from commitment status
- SSOV must be approved before sub can create invoices against it

---

## 7. Cross-Tool: Permissions

### Permission Matrix

| Tool | Read Only | Standard | Admin | Invoice Contact |
|------|-----------|----------|-------|-----------------|
| **Prime Contracts** | View, export list | View, respond to workflows | Full CRUD, approve, export DOCX/PDF | N/A |
| **Commitments** | View (if not private) | View, respond to workflows (if not private) | Full CRUD, approve, retainage config, SSOV mgmt | Submit SSOV, create/submit invoices |
| **Sub Invoicing** | View (via Commitments perm) | View (via Commitments perm) | Full control (Invoice Administrator) | Submit own, edit in Draft/R&R only |
| **Owner Invoicing** | View (via Prime Contracts perm) | View (via Prime Contracts perm) | Full control (inherits from Prime Contracts Admin) | N/A |

### Key Permission Rules
1. **Privacy overrides**: If a contract/commitment is marked Private, only Admins and explicitly granted users can see it
2. **Invoicing permissions inherit** from the parent tool (Prime Contracts for owner invoicing, Commitments for sub invoicing)
3. **Invoice Contact** is a special sub-facing role that exists only on Commitments -- it grants limited access for subcontractors to manage their own SOV and invoices
4. **Admin on the parent tool** is required to:
   - Approve contracts/commitments
   - Configure retainage
   - Configure change order tiers
   - Manage privacy settings
   - Perform bulk status changes on invoices

### Export Permissions
| Action | Required Permission |
|--------|-------------------|
| Export list (CSV) | Read Only or higher |
| Export DOCX/PDF (individual contract) | Admin only (Prime Contracts) |
| Export invoice PDF | Invoice Administrator or Admin |

---

## 8. Cross-Tool: Billing Periods

### Overview
Billing periods define the date ranges for invoicing. They are shared between subcontractor invoicing and owner invoicing. A billing period must exist before any invoice (sub or owner) can be created.

### Creation Modes
| Mode | Description |
|------|-------------|
| **Manual** | Admin creates individual billing periods with custom start/end dates |
| **Automatic** | System generates billing periods based on a day-of-month rule (e.g., "1st of every month") |

### Automatic Mode Configuration
- Set a **day-of-month** (1-28, or "Last Day")
- System auto-generates billing periods on that recurring schedule
- Each period runs from the configured day to the day before the next period starts
- Example: Day 1 -> periods are Jan 1-31, Feb 1-28, Mar 1-31, etc.

### Billing Period Fields
| Field | Description |
|-------|-------------|
| Period Name/Number | Identifier (often auto-generated: "Period 1", "Period 2") |
| Start Date | First day of the billing period |
| End Date | Last day of the billing period |
| Status | Open / Closed |

### Business Rules
- An invoice is always associated with exactly ONE billing period
- Multiple invoices (from different subs/contracts) can exist in the same billing period
- Billing periods can be closed to prevent new invoices from being created
- The pre-fill feature on owner invoices pulls from sub invoices in the SAME billing period
- Billing periods are project-level (shared across all contracts/commitments in a project)

### Access
- Managed from the **Billing Periods** tab within the Invoicing tool
- Admin permission required to create/edit/close billing periods

---

## 9. Dependency Chain

### Prerequisite Flow (Strict Order)

```
PROJECT (must exist)
  |
  +-- PRIME CONTRACT (Create -> Approve)
  |     |
  |     +-- BILLING PERIOD (Create manual or auto-generate)
  |     |     |
  |     |     +-- OWNER INVOICE (Create within billing period)
  |     |
  |     +-- CHANGE ORDERS (PCCOs, after contract approved)
  |
  +-- COMMITMENT (Create -> Approve)
        |
        +-- SUBCONTRACTOR SOV (Create -> Submit -> Approve)
        |     |
        |     +-- BILLING PERIOD (same shared periods)
        |           |
        |           +-- SUB INVOICE (Create within billing period)
        |
        +-- CHANGE ORDERS (CCOs, after commitment approved)
```

### Dependency Rules

| Step | Prerequisite | What It Enables |
|------|-------------|-----------------|
| 1. Create Project | -- | Everything |
| 2. Create Prime Contract | Project exists | Owner-side financial tracking |
| 3. Approve Prime Contract | Prime Contract in Draft/Pending | Change orders against prime contract, owner invoicing |
| 4. Create Commitment | Project exists | Sub-side financial tracking |
| 5. Approve Commitment | Commitment in Draft/Pending | Sub invoicing, RFQs |
| 6. Submit & Approve SSOV | Commitment approved | Sub can create invoices against SSOV lines |
| 7. Create Billing Period | Project exists | Invoicing for both owner and sub |
| 8. Create Sub Invoice | Commitment approved + SSOV approved + Billing period exists | Sub bills GC |
| 9. Approve Sub Invoice | Sub invoice in "Under Review" | Payment processing, pre-fill for owner invoice |
| 10. Create Owner Invoice | Prime contract approved + Billing period exists | GC bills owner |
| 11. Pre-fill Owner Invoice | Approved sub invoices in same billing period | Auto-populate owner invoice from sub data |

### Cross-Tool Data Flow

```
Sub Invoice (approved) -----> Pre-fills -----> Owner Invoice
     ^                                              ^
     |                                              |
Commitment SOV line items              Prime Contract SOV line items
     ^                                              ^
     |                                              |
Commitment (approved)                  Prime Contract (approved)
```

### Financial Roll-Up Chain
1. **Commitment SOV** defines what the GC owes the sub
2. **Sub Invoice** records what the sub has billed (against commitment SOV)
3. **Prime Contract SOV** defines what the owner owes the GC
4. **Owner Invoice** records what the GC has billed the owner (against prime contract SOV, informed by sub invoices)
5. **Retainage** is tracked independently at each level (sub and owner)
6. **Change Orders** modify the SOV at each level (CCOs for commitments, PCCOs for prime contracts)

---

## 10. Source URLs

### Prime Contracts
- https://support.procore.com/products/online/user-guide/project-level/prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/create-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/edit-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/delete-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/add-line-items-to-a-prime-contract-sov
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/import-line-items-to-a-prime-contract-sov-from-the-budget
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/configure-advanced-settings-on-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/set-the-accounting-method-on-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/approve-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/void-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/export-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/add-related-items-to-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/send-a-prime-contract-for-docusign-signature
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/view-change-history-on-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/configure-financial-markup-on-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/set-the-retainage-on-a-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/search-and-filter-the-prime-contracts-list
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/configure-columns-on-the-prime-contracts-list
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/create-a-prime-contract-change-order
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/manage-prime-contract-change-order-tiers
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/permissions
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/faq

### Commitments
- https://support.procore.com/products/online/user-guide/project-level/commitments
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/create-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/create-a-subcontract
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/create-a-purchase-order
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/edit-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/delete-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/approve-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/void-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/add-line-items-to-a-commitment-sov
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/configure-advanced-settings-on-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/manage-the-subcontractor-sov
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/set-retainage-on-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/configure-sliding-scale-retention
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/enable-always-editable-sov
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/search-and-filter-the-commitments-list
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/configure-columns-on-the-commitments-list
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/send-a-commitment-for-docusign-signature
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/view-the-recycle-bin
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/create-a-commitment-change-order
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/manage-commitment-change-order-tiers
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/add-invoice-contacts
- https://support.procore.com/products/online/user-guide/project-level/commitments/tutorials/view-change-history-on-a-commitment
- https://support.procore.com/products/online/user-guide/project-level/commitments/permissions
- https://support.procore.com/products/online/user-guide/project-level/commitments/faq

### Subcontractor Invoicing
- https://support.procore.com/products/online/user-guide/project-level/invoicing
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/create-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/edit-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/delete-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/review-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/approve-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/invite-a-subcontractor-to-bill
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/submit-a-subcontractor-invoice-as-invoice-contact
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/revise-and-resubmit-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/bulk-edit-subcontractor-invoice-statuses
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/release-retainage-on-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/create-an-invoice-for-release-of-retainage
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/configure-subcontractor-invoice-settings
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/search-and-filter-subcontractor-invoices
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/export-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/view-subcontractor-invoice-emails
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/view-subcontractor-invoice-change-history
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/manage-lien-rights-on-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/manage-requirements-on-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/add-related-items-to-a-subcontractor-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/permissions
- https://support.procore.com/products/online/user-guide/project-level/invoicing/faq
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/create-billing-periods
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/configure-automatic-billing-periods
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/close-a-billing-period

### Owner Invoicing
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/create-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/edit-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/delete-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/approve-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/pre-fill-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/use-group-row-billing-on-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/release-retainage-on-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/configure-owner-invoice-settings
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/search-and-filter-owner-invoices
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/export-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/view-owner-invoice-emails
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/view-owner-invoice-change-history
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/add-related-items-to-an-owner-invoice
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/configure-custom-approval-workflows-for-owner-invoices
- https://support.procore.com/products/online/user-guide/project-level/prime-contract/tutorials/create-an-owner-invoice-from-prime-contract
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/manage-payments-received-on-owner-invoices

### General / Cross-Tool
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/create-billing-periods
- https://support.procore.com/products/online/user-guide/project-level/invoicing/tutorials/configure-automatic-billing-periods
- https://support.procore.com/products/online/user-guide/company-level/admin/tutorials/configure-change-order-tiers
- https://support.procore.com/products/online/user-guide/project-level/admin/tutorials/configure-project-settings-for-financial-tools
- https://support.procore.com/products/online/user-guide/project-level/admin/tutorials/configure-retainage-settings
- https://support.procore.com/products/online/user-guide/project-level/directory
- https://support.procore.com/products/online/user-guide/project-level/budget
