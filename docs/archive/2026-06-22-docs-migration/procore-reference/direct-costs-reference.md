# Procore Direct Costs Tool - Complete Reference Specification

> Crawled from Procore v2 Support Documentation on 2026-03-02.
> Source: https://v2.support.procore.com/product-manuals/direct-costs-project/

---

## Table of Contents

1. [Tool Overview](#1-tool-overview)
2. [Direct Cost Types](#2-direct-cost-types)
3. [Statuses](#3-statuses)
4. [General Information Fields (Header)](#4-general-information-fields-header)
5. [Line Item Fields](#5-line-item-fields)
6. [List View Columns](#6-list-view-columns)
7. [Views and Tabs](#7-views-and-tabs)
8. [Search and Filtering](#8-search-and-filtering)
9. [Business Rules and Constraints](#9-business-rules-and-constraints)
10. [Budget Integration](#10-budget-integration)
11. [Invoicing / Prime Contract Integration](#11-invoicing--prime-contract-integration)
12. [Permissions Matrix](#12-permissions-matrix)
13. [Granular Permissions](#13-granular-permissions)
14. [Import Specification](#14-import-specification)
15. [Export Specification](#15-export-specification)
16. [Email Capability](#16-email-capability)
17. [Advanced Settings](#17-advanced-settings)
18. [Enabling the Tool](#18-enabling-the-tool)
19. [Deletion Rules](#19-deletion-rules)
20. [ERP Integration Notes](#20-erp-integration-notes)
21. [Audit Checklist](#21-audit-checklist)

---

## 1. Tool Overview

**Purpose:** Track all direct costs incurred (expenses and invoices) that are NOT associated with commitments (purchase orders or subcontracts). This includes general conditions and self-performed work, giving a complete picture of project expenses impacting the budget.

**Key Capabilities:**
- Create, edit, and delete direct costs
- Import direct costs from CSV files
- Export data to CSV or PDF formats
- Search and filter direct costs
- Switch between summary views (by vendor, by cost code)
- Email direct costs to stakeholders
- Automatic budget integration when status changes from Draft

**Critical Warning:** Do NOT disable the Direct Costs tool after it has been enabled and used on a project. This causes **unrecoverable loss** of any direct costs that have been created.

---

## 2. Direct Cost Types

| Type | Description | Special Requirements |
|------|-------------|---------------------|
| **Invoice** | Vendor invoices for non-contract costs (e.g., printer ink, postage) | Requires Vendor and Invoice # fields |
| **Expense** | Internal expenses (e.g., computer equipment, telephones, internal equipment rentals) | No special requirements |
| **Payroll** | Monthly payroll costs classified by cost code | No special requirements |

**Immutable Rule:** The Type field **cannot be changed** after a direct cost is created.

---

## 3. Statuses

| Status | Meaning | Budget Impact |
|--------|---------|--------------|
| **Draft** | Initial state; not yet submitted. Cost is NOT visible in budget. | None - not reflected in budget |
| **Pending** | Submitted for review/approval. Cost IS visible in budget. | Populates 'Direct Cost' column in Budget |
| **Revise and Resubmit** | Returned for corrections. Cost IS visible in budget. | Populates 'Direct Cost' column in Budget |
| **Approved** | Fully approved. Cost IS visible in budget AND populates owner invoice SOV. | Populates 'Direct Cost' column in Budget + adds to owner invoice SOV |

**Key Rule:** Any status other than Draft causes the direct cost's line item amount to appear in the "Direct Cost" column of the project's budget.

**Status Transition:** When a direct cost moves from Draft to any other status, Procore automatically:
1. Matches the division, cost code, and cost type to the budget code
2. Adds the direct cost as a line item on the project's budget
3. Displays the amount in the "Direct Costs" column
4. Highlights RED if the cost code/type combination is not budgeted

---

## 4. General Information Fields (Header)

| Field | Type | Required | Constraints / Notes |
|-------|------|----------|-------------------|
| **#** (Number) | Auto-generated | Auto | System-assigned direct cost number |
| **Type** | Dropdown | Yes | Options: Invoice, Expense, Payroll. **Cannot be changed after creation.** |
| **Date** | Date (calendar) | Yes | Date of the direct cost |
| **Status** | Dropdown | Yes | Options: Draft, Pending, Revise and Resubmit, Approved. Default: Draft |
| **Vendor** | Dropdown | Conditional | **Required when Type = Invoice.** Populated from Company Directory (NOT Project Directory). |
| **Invoice #** | Text | Conditional | **Required when Type = Invoice.** Free-text invoice number. |
| **Employee** | Dropdown | No | Person reporting the cost. Must exist in directory. |
| **Terms** | Text/Dropdown | No | Payment terms (predefined options or custom entry). Case-sensitive for import. |
| **Description** | Text | No | Up to 255 alphanumeric characters. General description of the cost. |
| **Received Date** | Date (calendar) | No | **Must fall within the billing period start and end dates.** |
| **Paid Date** | Date (calendar) | No | Date the cost was paid. |
| **Attachments** | File upload | No | Digital copies of invoices, bills, receipts. Multiple files allowed. |

---

## 5. Line Item Fields

Each direct cost contains one or more line items. Line items are added via the "Add Line" button or the vertical ellipsis menu ("Add Above" / "Add Below").

| Field | Type | Required | Constraints / Notes |
|-------|------|----------|-------------------|
| **Budget Code** | Dropdown | Yes | Select existing or create new. Drives cost code + cost type matching for budget. |
| **Description** | Text | No | Line-specific description. Up to 255 characters. |
| **Qty** (Quantity) | Numeric | No | Number of units. |
| **UOM** (Unit of Measure) | Dropdown | No | Must match a "Display Name" from the company's master UOM list. |
| **Unit Cost** | Currency (numeric) | No | Cost per unit. |
| **Amount** | Currency (numeric) | Yes (auto or manual) | Two modes: (1) **Auto-calculated** (calculator icon) = Qty x Unit Cost; (2) **Manual override** (exclamation icon) = user enters amount directly. |

**Line Item Amount Calculation:**
- Default: `Amount = Qty * Unit Cost` (auto-calculated)
- Override: User can manually enter an amount, which overrides the calculation
- Visual indicator: Calculator icon = auto; Exclamation icon = manual override

---

## 6. List View Columns

### Summary Tab Columns

| Column | Description |
|--------|-------------|
| Date | Date of the direct cost |
| Vendor | Vendor name (from Company Directory) |
| Type | Invoice, Expense, or Payroll |
| Invoice # | Invoice number (if applicable) |
| Status | Draft, Pending, Revise and Resubmit, Approved |
| Amount | Total amount of all line items |
| Received Date | Date received |
| Paid Date | Date paid |

### Summary by Cost Code Tab Columns

| Column | Description |
|--------|-------------|
| Date | Date of the direct cost |
| Employee | Employee who reported the cost |
| Vendor | Vendor name |
| Type | Invoice, Expense, or Payroll |
| Invoice # | Invoice number (if applicable) |
| Status | Current status |
| Description | Direct cost description |
| Amount | Line item amount |
| Received Date | Date received |
| Paid Date | Date paid |

**Sorting:** All columns in both tabs are sortable by clicking column headers.

---

## 7. Views and Tabs

| Tab | Description | Grouping | Extra Columns vs Summary |
|-----|-------------|----------|-------------------------|
| **Summary** | Tabular list of direct costs by date, vendor, type, invoice #, status, amount, received/paid dates | None (flat list) | -- |
| **Summary by Cost Code** | Groups direct costs by cost code division, then lists line items | By cost code division | Employee, Description |

---

## 8. Search and Filtering

### Search

- **Only the Vendor field is searchable** via the "Search for Direct Costs" search box
- Press ENTER or click Search to execute
- Search respects any active filter parameters

### Filters by Tab

**Summary Tab Filters:**

| Filter | Type | Options |
|--------|------|---------|
| Type | Checkbox multi-select | All, Invoice, Expense, Payroll |
| Vendor | Checkbox multi-select | List of vendors |
| Date | Calendar control | Single day OR date range (start + end) |

**Summary by Cost Code Tab Filters:**

| Filter | Type | Options |
|--------|------|---------|
| Cost Code | Checkbox multi-select | List of project cost codes |
| Cost Type | Checkbox multi-select | List of cost types |
| Type | Checkbox multi-select | All, Invoice, Expense, Payroll |
| Vendor | Checkbox multi-select | List of vendors |
| Date | Calendar control | Single day OR date range (start + end) |

---

## 9. Business Rules and Constraints

### Creation Rules
1. Direct Costs tool must be enabled on the project before use
2. Vendor must exist in the **Company Directory** (not just Project Directory)
3. Employee must exist in the Company or Project Directory
4. Budget codes must exist in the project's Work Breakdown Structure
5. UOM entries must match the company's master UOM list exactly

### Editing Rules
1. **Type field is immutable** -- cannot be changed after creation
2. All other header fields can be edited
3. Line items can be added, edited, or deleted after creation
4. Received Date must fall within the billing period start and end dates

### Status Transition Rules
1. Draft -> Pending: Triggers budget integration
2. Draft -> Revise and Resubmit: Triggers budget integration
3. Draft -> Approved: Triggers budget integration + owner invoice SOV population
4. Any non-Draft status: Cost visible in budget's "Direct Cost" column
5. Approved status: Additionally populates owner invoice Schedule of Values

### Budget Code Rules
1. Budget code selection drives cost code and cost type matching
2. If the cost code/type combination is NOT budgeted, Procore highlights the line RED in the budget with a "?" marker
3. For imported costs, non-budgeted combinations are added directly to the budget with a "?" indicator

### Vendor Rules
1. Vendor field is only available/required when Type = Invoice
2. Vendor is sourced from Company Directory
3. Vendor cannot be modified after import (for imported costs)

---

## 10. Budget Integration

**Trigger:** When status changes from Draft to any other status.

**Mechanism:**
1. Procore matches the division, cost code, and cost type from the direct cost's budget code
2. Adds the direct cost amount as a line item in the project's budget
3. Amount appears in the **"Direct Costs" column** of the budget view
4. If the cost code/type is not in the budget, it is added with a RED highlight and "?" marker

**Budget Column:** "Direct Costs" -- shows sum of all non-Draft direct costs matching each budget line's cost code/type.

**Calculation:** Direct cost amounts roll up to the budget by matching:
- Division
- Cost Code
- Cost Type

---

## 11. Invoicing / Prime Contract Integration

**Trigger:** When status is set to **Approved** AND Received Date falls within a billing period.

**Mechanism:**
1. Procore automatically adds approved direct cost line items to the owner invoice's Schedule of Values (SOV)
2. Matching is based on budget code (division + cost code + cost type)
3. Only line items with a Received Date within the billing period's start/end dates are included

**Constraint:** Received Date **must fall within** the billing period start and end dates for the line item to appear on the owner invoice SOV.

---

## 12. Permissions Matrix

| Action | None | Read Only | Standard | Admin |
|--------|------|-----------|----------|-------|
| View direct costs | No | Yes | Yes | Yes |
| Search and filter | No | Yes | Yes | Yes |
| Switch between views | No | Yes | Yes | Yes |
| Export to CSV/PDF | No | Yes | Yes | Yes |
| Email a direct cost | No | No | Yes | Yes |
| Create a direct cost | No | No | Yes* | Yes |
| Edit a direct cost | No | No | Yes* | Yes |
| Delete a direct cost | No | No | Yes* | Yes |
| Import direct costs | No | No | Yes* | Yes |
| Configure advanced settings | No | No | No | Yes |
| Enable the tool | No | No | No | Yes** |

\* Requires granular permission enabled on permissions template
\** Requires Admin on Project-level Admin tool

---

## 13. Granular Permissions

Available granular permissions for Standard and Read Only users:

| Granular Permission | Enables |
|-------------------|---------|
| **Create Direct Cost** | Create new direct costs and import direct costs |
| **Update Direct Cost** | Edit existing direct costs |
| **Delete Direct Cost** | Delete direct costs |

These are configured on the user's permission template by a Company or Project Admin.

---

## 14. Import Specification

### File Format
- **CSV only** (Comma Separated Values)
- Comma delimiter (not semicolon)
- Download template from Procore's Direct Costs tool
- No row limit

### Template Columns (in order)

| # | Column | Required | Type | Notes |
|---|--------|----------|------|-------|
| 1 | Type | Yes | Text | "Invoice", "Expense", or "Payroll" (case-sensitive, first letter capitalized) |
| 2 | Invoice # | Conditional | Text | Required if Type = "Invoice" |
| 3 | Description | No | Text | Up to 255 characters |
| 4 | Employee Email | No | Email | Must match exactly as stored in directory |
| 5 | Status | Yes | Text | "Draft", "Pending", "Revise and Resubmit", or "Approved" (case-sensitive) |
| 6 | Terms | No | Text | Payment terms (case-sensitive) |
| 7 | Date | No | Date | Supported date formats per Procore docs |
| 8 | Received Date | No | Date | Must fall within billing period |
| 9 | Paid Date | No | Date | -- |
| 10 | Vendor | Conditional | Text | Required if Type = "Invoice". Must match Company Directory exactly. |
| 11 | Sub Job | No | Text | Only appears if sub job feature is enabled. Must match project Admin tool exactly. |
| 12 | Cost Code | Yes | Text | Must exist in project's Work Breakdown Structure |
| 13 | Cost Type | Yes | Text | Abbreviation, case-sensitive: L (Labor), E (Equipment), M (Materials), S (Commitment/Subcontract), OC (Owner Cost), SVC (Professional Services), O (Other) |
| 14 | Line Item Description | No | Text | Up to 255 characters |
| 15 | Quantity | No | Numeric | -- |
| 16 | Units | No | Text | Must match company master UOM list "Display Name" exactly |
| 17 | Unit Cost | No | Currency | -- |
| 18 | Amount | No | Currency | -- |

### Cost Type Abbreviations

| Abbreviation | Full Name |
|-------------|-----------|
| L | Labor |
| E | Equipment |
| M | Materials |
| S | Commitment / Subcontract |
| OC | Owner Cost |
| SVC | Professional Services |
| O | Other |

### Import Validation Rules

1. Do NOT add empty rows
2. Do NOT add blank columns
3. Do NOT add new data columns
4. Do NOT delete the header row
5. Do NOT modify column order
6. Type field is case-sensitive ("Invoice" not "invoice")
7. Status field is case-sensitive
8. Cost Type abbreviations are case-sensitive
9. Employee email must match directory exactly
10. Vendor name must match Company Directory exactly
11. UOM must match master list "Display Name" exactly

### Import Error Handling

- System validates all data before processing
- Errors displayed in an "Error column" on the import preview
- Import button remains grayed out until all errors are resolved
- User must fix errors in the template file and re-upload

### Import Budget Impact

- If status is anything other than "Draft", the cost immediately appears in the budget's "Direct Cost" column
- If the cost code/type/sub job combination is non-budgeted, the line item is added to the budget with a "?" marker

---

## 15. Export Specification

### Formats
- **CSV** -- tabular data export
- **PDF** -- formatted document export

### Behavior
- Export reflects **currently visible/filtered data only**
- Apply filters before exporting to control what is included
- Export respects the active tab (Summary or Summary by Cost Code)

### Permissions
- Requires Read Only or higher on the Direct Costs tool

---

## 16. Email Capability

### Permissions
- Requires Standard or Admin level on the Direct Costs tool

### Email Fields

| Field | Description |
|-------|-------------|
| To | Primary recipients (type to search names) |
| CC | Copy recipients (sender auto-included) |
| BCC | Blind carbon copy recipients |
| Subject | Auto-populated as "FW: Invoice # [number]" -- editable |
| Message | Free-text body |
| Attachments | Upload from computer or select from Procore file storage |
| Private | Checkbox: if checked, only recipients can view. If unchecked, any Standard/Admin user can view in Email tab. |

### Audit Trail
- All emails are logged in the direct cost's **Change History** tab

---

## 17. Advanced Settings

### Configuration Access
- Requires Admin level on the Direct Costs tool

### Available Settings
- **User Permissions:** Set user permission levels (Read Only, Standard, Admin) for the Direct Costs tool
- Permission levels displayed with visual indicators:
  - Green checkmark: Access granted
  - Red X: Access not granted
  - Grey X: Procore Administrator or template-based permissions

---

## 18. Enabling the Tool

### Prerequisites
1. Admin level permissions on the Project-level Admin tool
2. Procore Administrator must submit a backend request to Procore point of contact
3. After backend enablement, Admin must update permissions template

### Steps
1. Navigate to Project-level Admin tool
2. Select "Active Tools"
3. Scroll to "Financial Management"
4. Check "Direct Costs" checkbox
5. Click "Update"

### Recommended Permission Defaults

| Role | Recommended Level |
|------|------------------|
| Project Manager | Admin |
| Architect/Engineer | None |
| Owner/CM | None |
| Subcontractor | None |
| Superintendent | None |

### Critical Warning
**Do NOT disable the tool after it has been enabled and used.** Disabling causes **unrecoverable loss** of all direct cost data.

---

## 19. Deletion Rules

- Deletion is **permanent and irreversible**
- Deleted direct costs do **NOT** go to a Recycle Bin
- A confirmation dialog is shown before deletion
- Requires Admin level OR Standard/Read Only with "Delete Direct Costs" granular permission

---

## 20. ERP Integration Notes

- If using Sage 300 CRE and/or Vista, enable Direct Costs on projects where you want to import job cost transactions
- Add an "ERP Direct Costs" column to budget views for ERP-integrated projects
- Synced direct cost transactions can be edited through the ERP Integrations tool
- Job cost transactions can be synced from an integrated ERP into Procore

---

## 21. Audit Checklist

Use this checklist to audit the Alleato implementation against Procore's specification.

### Direct Cost Types
- [ ] Supports Invoice type with required Vendor and Invoice # fields
- [ ] Supports Expense type
- [ ] Supports Payroll type
- [ ] Type is immutable after creation

### Statuses
- [ ] Draft status (default, no budget impact)
- [ ] Pending status (triggers budget integration)
- [ ] Revise and Resubmit status (triggers budget integration)
- [ ] Approved status (triggers budget integration + owner invoice SOV)
- [ ] Status transition from Draft triggers budget column population

### Header Fields
- [ ] # (auto-generated number)
- [ ] Type dropdown (Invoice, Expense, Payroll)
- [ ] Date (calendar picker, required)
- [ ] Status dropdown (required, default Draft)
- [ ] Vendor (conditional, required for Invoice, from Company Directory)
- [ ] Invoice # (conditional, required for Invoice)
- [ ] Employee dropdown (optional)
- [ ] Terms (optional)
- [ ] Description (optional, 255 char max)
- [ ] Received Date (must fall within billing period)
- [ ] Paid Date (optional)
- [ ] Attachments (file upload, multiple allowed)

### Line Items
- [ ] Budget Code dropdown (required, drives cost code/type)
- [ ] Description (optional, 255 char max)
- [ ] Qty (numeric)
- [ ] UOM dropdown (from company master list)
- [ ] Unit Cost (currency)
- [ ] Amount (auto-calc Qty x Unit Cost, with manual override option)
- [ ] Add Line, Add Above, Add Below functionality
- [ ] Delete line item functionality
- [ ] Visual indicator for auto-calc vs manual override

### List Views
- [ ] Summary tab with correct columns (Date, Vendor, Type, Invoice #, Status, Amount, Received Date, Paid Date)
- [ ] Summary by Cost Code tab with correct columns (+ Employee, Description; grouped by division)
- [ ] Column sorting on all columns
- [ ] Correct filter options per tab

### Search and Filtering
- [ ] Vendor-only search
- [ ] Type filter (Invoice, Expense, Payroll)
- [ ] Vendor filter
- [ ] Date filter (single day and date range)
- [ ] Cost Code filter (Summary by Cost Code tab only)
- [ ] Cost Type filter (Summary by Cost Code tab only)

### Budget Integration
- [ ] Non-Draft costs appear in budget "Direct Costs" column
- [ ] Matching by division + cost code + cost type
- [ ] Non-budgeted combinations highlighted RED with "?" marker
- [ ] Approved costs populate owner invoice SOV

### CRUD Operations
- [ ] Create direct cost
- [ ] Edit direct cost (all fields except Type)
- [ ] Delete direct cost (permanent, with confirmation)
- [ ] Import from CSV
- [ ] Export to CSV and PDF

### Permissions
- [ ] Read Only: view, search, filter, switch views, export
- [ ] Standard: email + CRUD with granular permissions
- [ ] Admin: all actions + advanced settings
- [ ] Granular permissions: Create, Update, Delete

---

## Sources

- [Direct Costs Tool Overview](https://v2.support.procore.com/product-manuals/direct-costs-project)
- [Create a Direct Cost](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/create-a-direct-cost)
- [Edit a Direct Cost](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/edit-a-direct-cost)
- [Delete a Direct Cost](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/delete-a-direct-cost)
- [Search and Filter Direct Costs](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/search-for-and-apply-filters-to-direct-costs)
- [Switch Between Views](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/switch-between-views-in-the-direct-costs-tool)
- [Import Direct Costs](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/import-direct-costs)
- [Export Direct Costs](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/export-direct-costs-to-csv-or-pdf)
- [Email a Direct Cost](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/email-a-direct-cost)
- [Configure Advanced Settings](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/configure-advanced-settings-direct-costs)
- [Enable the Direct Costs Tool](https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials/enable-the-direct-costs-tool)
- [Permissions](https://v2.support.procore.com/product-manuals/direct-costs-project/permissions)
