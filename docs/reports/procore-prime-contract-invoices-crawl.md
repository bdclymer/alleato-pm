# Procore Prime Contract Invoices - Detailed Crawl Report

**Date:** 2026-04-01
**Source:** Live Procore instance (us02.procore.com)
**Project:** Alleato Group / 24-104 - Goodwill Bart
**Prime Contract:** Prime Contract #1 (Goodwill Bart - Goodwill Industries of Central Indiana, Llc)
**Contract ID:** 562949957345977
**URL:** `https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/contracts/prime_contracts/562949957345977/invoices`

---

## 1. Overview

Prime Contract Invoices in Procore are called **"Payment Applications"** (following AIA G702/G703 standards). They are accessed from the **Invoices tab** on a Prime Contract detail page.

The term "Invoice" and "Payment Application" are used interchangeably throughout the Procore UI.

---

## 2. Invoices List View (Payment Applications Tab)

### 2.1 Page Structure

- **Breadcrumb:** Prime Contracts > Prime Contract #1 > Invoices
- **Title:** "Invoices (Payment Applications)"
- **Navigation Tabs** (on the prime contract): General | Change Orders (N) | Invoices (N) | Payments Received (N) | Emails | Change History | Financial Markup | Advanced Settings

### 2.2 Table Columns

The invoices list table has these columns:

| Column | Description |
|--------|-------------|
| Invoice Position | Sequential position number |
| Invoice # | Invoice number (matches position in this case) |
| Billing Period | Date range (e.g., "02/01/26 - 02/28/26") |
| Commitment Billing Period | Date range for commitment billing |
| Billing Date | Specific billing date (may be blank) |
| Status | "Approved", "Draft", "Under Review", "Revise and Resubmit" |
| Original Contract Sum | Original contract amount |
| Net Change By Change Orders | Total change order amounts |
| Revised Contract Sum | Original + change orders |
| Total Completed and Stored To Date | Cumulative work completed |
| Total Retainage | Amount retained |
| Total Earned Less Retainage | Earned minus retainage |
| Payment Due | Current amount due |
| Balance To Finish | Remaining contract balance |
| % Complete | Percentage of contract completed |

### 2.3 Table Features

- **Search** - searchbox for filtering invoices
- **Export** button (top-level export for the list)
- **Group By** - "Select a column to group" dropdown
- **Configure** button - column configuration/visibility
- **Filters** - filter bar with "Clear All Filters"
- **More Options** - per-row context menu (three-dot menu)

### 2.4 Create Button (Top-Level Dropdown)

The "Create" button in the header is a dropdown with 4 options:

1. **Create Change Event**
2. **Create Prime Contract CO**
3. **Create Invoice**
4. **Create Payment**

---

## 3. Create Invoice Form

**URL pattern:** `/{projectId}/project/prime_contracts/{contractId}/payment_applications/new`

### 3.1 Form Fields

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| Commitment Billing Period | Select (dropdown) | Yes | Pre-populated list of monthly periods (e.g., "04/01/26 - 04/30/26"). Options go back ~18 months. |
| Invoice # | Text input | Auto | Auto-incremented (e.g., next is #8) |
| Period Start | Text input (date) | Yes | Auto-populated from billing period selection |
| Period End | Text input (date) | Yes | Auto-populated from billing period selection |
| Billing Date | Text input (date) | No | Separate from period dates |
| Status | Select (dropdown) | Yes | **Draft** (default), Under Review, Revise and Resubmit, Approved |
| Percent Complete | Read-only | N/A | Displays "100.00%" (calculated) |
| Attachments | File upload | No | "Attach File(s)" link + drag-and-drop area |

### 3.2 Form Layout

- Two-column layout for the top fields
- Left column: Commitment Billing Period, Period Start, Billing Date, Percent Complete
- Right column: Invoice #, Period End, Status
- Attachments section spans full width at the bottom
- **Cancel** and **Create** buttons at the bottom

### 3.3 Sidebar Actions (Right Side)

When creating/viewing an invoice, a right sidebar shows:

- Create Change Event
- Create Prime Contract CO
- Create Invoice
- Create Payment
- Delete
- Email Contract

**PRIME CONTRACT REPORTS** section:
- Overdue Prime Contract COs
- Unexecuted Prime Contract COs
- Prime Potential Change Orders By Change Reason

---

## 4. Invoice Detail View (Summary Tab)

**URL pattern:** `/{projectId}/project/prime_contracts/{contractId}/payment_applications/{invoiceId}`

### 4.1 Detail Page Tabs

1. **Summary** - AIA G702-style application summary
2. **Detail** - AIA G703-style Schedule of Values with line items
3. **Configurable PDF** - Customizable PDF generation view
4. **Related Items (N)** - Related records
5. **Emails (N)** - Email history
6. **Change History (N)** - Audit trail

### 4.2 Summary Tab - General Settings Section

| Field | Value Example |
|-------|---------------|
| Commitment Billing Period | 02/01/26 - 02/28/26 |
| Invoice # | 7 |
| Period Start | 02/01/26 |
| Period End | 02/28/26 |
| Billing Date | (may be blank) |
| Status | Approved |
| Percent Complete | 100.00% |

**Edit** button available to modify these settings.

### 4.3 Summary Tab - Summary Preview (AIA G702 Format)

This section renders the standard AIA G702 Application and Certificate for Payment format:

**Header Information:**
| Field | Description |
|-------|-------------|
| TO OWNER/CLIENT | Owner name and address |
| PROJECT | Project name |
| APPLICATION NO | Invoice number |
| PERIOD | Billing period date range |
| PROJECT NOs | Project number |
| FROM CONTRACTOR | Contractor company name |
| VIA ARCHITECT/ENGINEER | Architect info (may be blank) |
| CONTRACT DATE | Contract date |
| CONTRACT FOR | Contract description |

**Contractor's Application for Payment (9 Lines):**

| Line | Description | Example |
|------|-------------|---------|
| 1 | Original Contract Sum | $157,706.00 |
| 2 | Net change by change orders | $1,437,486.89 |
| 3 | Contract sum to date (line 1 +/- 2) | $1,595,192.89 |
| 4 | Total completed and stored to date (Column G on detail sheet) | $1,595,192.89 |
| 5a | Retainage: X% of completed work | $0.00 |
| 5b | Retainage: X% of stored material | $0.00 |
| 5 (total) | Total retainage (Line 5a + 5b or total in column I of detail sheet) | $0.00 |
| 6 | Total earned less retainage (Line 4 less Line 5 Total) | $1,595,192.89 |
| 7 | Less previous certificates for payment (Line 6 from prior certificate) | $1,591,188.79 |
| 8 | Current payment due | $4,004.10 |
| 9 | Balance to finish, including retainage | $0.00 |

**Change Order Summary:**

| Column | Description |
|--------|-------------|
| ADDITIONS | Total addition amounts |
| DEDUCTIONS | Total deduction amounts |

Rows:
- Total changes approved in previous months by Owner/Client
- Total approved this Month
- Totals
- Net changes by change order

### 4.4 Summary Tab - Actions

- **Edit** - Edit general settings (opens inline form)
- **Export** dropdown:
  - PDF
  - PDF with Attachments
  - CSV

**Sidebar Actions:**
- Create Invoice
- Email Contract
- Email Invoice
- Delete

---

## 5. Invoice Detail View (Detail Tab) - Schedule of Values

### 5.1 SOV Column Structure (AIA G703 Format)

The Detail tab shows the Schedule of Values in a table format following AIA G703 standards:

| Column ID | Column Name | Description |
|-----------|-------------|-------------|
| A | Item No | Line item number (e.g., 1, 2, 15.1, 15.1.1) |
| - | Budget Code | Cost code reference (e.g., 01.R, 02.R, PCCO#001) |
| B | Description Of Work | Line item description |
| C | Scheduled Value | Original scheduled value amount |
| D | Work Completed - From Previous Application | Work completed in prior periods |
| E | Work Completed - This Period | Work completed this billing period |
| F | Materials Presently Stored (Not in D OR E) | Materials stored but not in D or E |
| G | Total Completed And Stored To Date (D + E + F) | Cumulative total |
| % | G/C (Percent) | Percentage complete |
| H | Balance To Finish (C - G) | Remaining balance |
| - | **Retainage** (sub-columns): | |
| - | From Previous Application - Work Retainage ($) | |
| - | From Previous Application - Materials Retainage ($) | |
| - | From Previous Application - Total ($) | |
| - | Retained This Period - Work Retainage (% and $) | |
| - | Retained This Period - Materials Retainage (% and $) | |
| - | Released This Period - Work Retainage ($) | |
| - | Released This Period - Materials Retainage ($) | |
| - | Currently Retained - Work Retainage ($) | |
| - | Currently Retained - Materials Retainage ($) | |
| - | Currently Retained - Total ($) | |

### 5.2 SOV Line Item Types

Line items come from two sources:

1. **SOV Line Items** (from the prime contract's Schedule of Values)
   - Numbered sequentially (1, 2, 3, ...)
   - Have budget codes like "01.R", "02.R", "06.R"
   - Examples: General Conditions, Existing Conditions, Woods & Plastics, Finishes, HVAC, etc.

2. **Change Order Line Items** (from approved Prime Contract Change Orders)
   - Numbered with parent.child format (15, 15.1, 15.1.1, 15.1.2, etc.)
   - Referenced by PCCO number (e.g., "PCCO#001", "PCCO#002")
   - Include sub-line items from PCOs (e.g., "PCO#001")
   - Include financial markup items (Fee, Insurance)
   - Have their own budget codes (e.g., "02-4113.S", "09-2116.S")

### 5.3 SOV Edit Mode

When clicking **Edit** on the Detail tab:

- All "This Period" and "Materials Presently Stored" columns become **editable text inputs**
- Each line item row gets editable fields for:
  - Work Completed This Period ($)
  - Materials Presently Stored ($)
  - Retainage percentages and amounts
- A **Save** button appears at the top
- Read-only columns remain non-editable (Previous Application values, Scheduled Value, etc.)

### 5.4 Retainage Controls (Detail Tab - View Mode)

At the top-right of the Detail tab:

**SET RETAINAGE ON ALL LINE ITEMS:**
- Materials Stored: text input + "Set" button
- Work Completed: text input + "Set" button

**RELEASE RETAINAGE ON ALL ITEMS:**
- Text input + "Release" button

### 5.5 Approved PCCOs Section (Detail Tab - Edit Mode)

At the bottom of the Detail tab in edit mode:

**"APPROVED PRIME CONTRACT CHANGE ORDERS TO ADD TO THIS OWNER INVOICE"**

Table columns:
| Column | Description |
|--------|-------------|
| # | Change order number |
| Title | Change order title |
| Amount | Change order amount |
| Add to Owner Invoice as.. | Action/selection to add the CO to this invoice |

---

## 6. Configurable PDF Tab

### 6.1 Structure

The Configurable PDF tab allows customization of the PDF export:

- **Add Group** button - allows grouping line items
- **Export Configurable PDF** button
- Checkboxes next to each line item (for inclusion/exclusion)
- Editable text fields for each line item (for overrides)

### 6.2 Configurable PDF Columns

| Column | Description |
|--------|-------------|
| Budget Code | Cost code |
| Item Type | "SOV" or "PCCO #NNN" |
| B - Description of Work | Description |
| C - Scheduled Value ($) | Scheduled value |
| Approved Changes ($) | Change order amounts |
| Revised Scheduled Value ($) | Scheduled + changes |
| D - Work Completed From Previous Application | Prior period work |
| (D+E) | Combined current + previous |
| E - This Period | Current period work |
| F - Materials Presently Stored (Not in D OR E) | Stored materials |
| G - Total Completed and Stored to Date (D + E + F) | Cumulative total |
| % G/C | Percentage complete |
| H - Balance to Finish (C-G) | Remaining balance |
| Retainage - From Previous Application (Work $, Materials $, Total $) | |
| Retainage - Retained This Period (Work % and $, Materials % and $) | |
| Retainage - Released This Period (Work $, Materials $) | |
| Retainage - Currently Retained (Work $, Materials $, Total $) | |

---

## 7. Other Tabs

### 7.1 Related Items Tab
- Shows count in tab label (e.g., "Related Items (0)")
- Links to related records in the project

### 7.2 Emails Tab
- Shows count in tab label (e.g., "Emails (0)")
- Email history and the ability to email invoices

### 7.3 Change History Tab
- Shows count in tab label (e.g., "Change History (9)")
- Audit trail of all changes to the invoice

---

## 8. Invoice Edit Mode (Summary)

**URL pattern:** `/{projectId}/project/prime_contracts/{contractId}/payment_applications/{invoiceId}/edit?subtab=general_settings`

### 8.1 Editable Fields

Same fields as the Create form:

| Field | Type | Options |
|-------|------|---------|
| Commitment Billing Period | Select dropdown | Monthly periods going back ~18 months |
| Invoice # | Text input | Number |
| Period Start | Text input (date) | MM/DD/YY |
| Period End | Text input (date) | MM/DD/YY |
| Billing Date | Text input (date) | MM/DD/YY |
| Status | Select dropdown | Draft, Under Review, Revise and Resubmit, Approved |
| Percent Complete | Read-only | Calculated |
| Attachments | File upload | Attach File(s) + drag and drop |

### 8.2 Edit Actions

- **Cancel** link
- **Update** button

---

## 9. Status Workflow

The invoice status options are:

| Status | Description |
|--------|-------------|
| **Draft** | Initial state when created. Invoice is being prepared. |
| **Under Review** | Submitted for review by the owner/architect. |
| **Revise and Resubmit** | Returned with requested changes. |
| **Approved** | Approved for payment. |

---

## 10. Export Options

From the individual invoice detail page:

1. **PDF** - Standard PDF export
2. **PDF with Attachments** - PDF including attached files
3. **CSV** - Spreadsheet export

From the Configurable PDF tab:
- **Export Configurable PDF** - Customized PDF with selected groupings and line items

From the invoices list:
- **Export** button (list-level export)

---

## 11. Invoice Numbering

- Invoices are numbered sequentially: 1, 2, 3, ..., 7, 8
- The "Invoice Position" and "Invoice #" are typically the same
- When creating a new invoice, the next number is auto-assigned (e.g., Invoice #8)

---

## 12. Key Relationships

- **Prime Contract** (1) -> **Invoices/Payment Applications** (many)
- **Invoice** references a **Commitment Billing Period** (monthly)
- **Invoice Detail (SOV)** pulls line items from:
  - Prime Contract SOV line items
  - Approved Prime Contract Change Orders (PCCOs)
  - Each PCCO can have sub-items from PCOs
  - Financial markup items (Fee, Insurance) are auto-calculated
- **Invoice** links to **Payments Received**
- **Invoice** can have **Attachments**
- **Invoice** can be **Emailed**

---

## 13. Sample Data (Invoice #7)

### General Settings
- Billing Period: 02/01/26 - 02/28/26
- Status: Approved
- Percent Complete: 100.00%

### Financial Summary
- Original Contract Sum: $157,706.00
- Net Change by Change Orders: $1,437,486.89
- Revised Contract Sum: $1,595,192.89
- Total Completed and Stored: $1,595,192.89
- Total Retainage: $0.00
- Current Payment Due: $4,004.10
- Balance to Finish: $0.00

### SOV Line Items (14 original + change order items)
1. 01.R General Conditions - $27,605.00
2. 02.R Existing Conditions - $6,000.00
3. 06.R Woods & Plastics - $1,000.00
4. 07.R Thermal & Moisture - $1,000.00
5. 08.R Openings - $9,870.00
6. 09.R Finishes - $64,374.00
7. 10.R Specialties - $3,750.00
8. 21.R Fire Suppression - $4,000.00
9. 22.R Plumbing - $2,500.00
10. 23.R HVAC - $7,500.00
11. 26.R Electrical - $10,000.00
12. 28.R Electronic Safety - $4,000.00
13. 55-0050.R Insurance.Contract Revenue - $1,770.00
14. 55-0500.R Contractor Fee.Contract Revenue - $14,337.00
15. PCCO#001 Phase 1 Changes & Permit Requirements - $31,843.45
    - 15.1 PCO#001 CE #002 - 157K to 187K - $31,843.45
      - 15.1.1 02-4113.S Demolition - $15,092.00
      - 15.1.2 09-2116.S Gypsum Board Assemblies - $5,126.00
      - 15.1.3 22-1000.S Plumbing - $1,883.00
      - 15.1.4 01-4126.X Permit Requirements.Expense - $1,236.00
      - 15.1.5 01-4126.X Permit Requirements.Expense - $5,254.20
      - (markup) 55-0500.R Contractor Fee - Fee (10.0)% - $2,894.86
      - (markup) 55-0050.R Insurance - Insurance (1.25)% - $357.39
16. PCCO#002 Phase 1 & 2 Changes Full Scope - $1,390,835.96

---

## 14. Screenshots Reference

| Screenshot | Description |
|------------|-------------|
| procore-invoices-tab.png | Invoices list view with all 7 invoices |
| procore-create-invoice-form.png | New Invoice form |
| procore-invoice-detail-7.png | Invoice #7 Summary tab (full page) |
| procore-invoice-detail-tab.png | Invoice #7 Detail tab (SOV view) |
| procore-invoice-detail-edit.png | Detail tab in edit mode (SOV editing) |
| procore-invoice-detail-edit-bottom.png | Bottom of edit mode showing PCCO add section |
| procore-invoice-edit-mode.png | Edit mode for general settings |
| procore-invoice-configurable-pdf.png | Configurable PDF tab |
| procore-invoice-export-dropdown.png | Export options (PDF, PDF with Attachments, CSV) |

All screenshots saved to `/tmp/procore-invoice-*.png`.
