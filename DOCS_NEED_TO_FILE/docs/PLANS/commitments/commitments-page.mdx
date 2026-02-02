Here’s everything that’s on this **Procore → Project Tools → Commitments** list page (for project **“24-104 - Goodwill Bart”**), based on the page content you have open.

## Page purpose

A **grid/list view** of all project **Commitments** (Subcontracts + Purchase Orders), with **filters**, **search**, **grouping**, **export**, and **row actions** (view PDF, edit, etc.), plus **grand totals** across key money columns.

---

## Components + functionality on this page

### 1) Global / project navigation

* **Back to Company** link
* **Project Home** link (logo + project name)
* **Project tools navigation** with active tool: **Commitments**
* **Help** link (Procore help article)
* Top-right utility icons (e.g., conversations/messages/avatar)

### 2) Page header actions

* **Export** button

  * Exports the grid data (commonly CSV; sometimes additional export options depending on permissions/settings)
* **Create** button

  * Starts a new commitment (typically prompts for Subcontract vs Purchase Order)
* **Recycle Bin** link (view deleted/recycled commitments)
* **More** menu (page-level additional actions)

### 3) Search + filter system

* **Search field** (free text search across the grid)
* **Filters** button to open the filters panel
* **Filters panel** includes:

  * Contract Company
  * Contract Type
  * ERP Status
  * Status
  * Executed
  * SSOV Status
  * **Clear All Filters**
  * Ability to clear each individual filter field (trash/delete icon)

### 4) Grid/table controls

* **“Select a column to group”** (row grouping feature)
* **Configure** button (table layout/columns configuration)
* Grid supports:

  * **Row selection** (checkboxes)
  * **Column menu** per header (“More Options”)
  * **Row grouping drop zones** (“Drag here to set row groups / column labels”)
  * **Horizontal/vertical scrolling** (implied by many columns)

### 5) Data grid rows (each commitment)

Each row includes:

* **Commitment Number** (clickable link to detail page, e.g., SC-001, PO-001)
* **Contract Company**
* **Title**
* **ERP Status**
* **Status**
* **Executed** flag
* **SSOV Status**
* **Financial columns** (original, COs, revised, invoiced, etc.)
* **Private** flag
* **Row actions**

  * **PDF** link/button (downloads/opens commitment PDF)
  * **Edit** link/icon (opens edit screen)

### 6) Grand totals footer

At bottom: **Grand Totals** across major money fields and a rolled-up % paid + remaining balance.

---

## Table columns (with meaning + formulas)

Below is the column set that appears in the grid header and matches the values shown in rows + grand totals.

| Column                            | What it is                          | Formula / Value logic                                 | Notes / edge cases / usefulness                                                            |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Number**                        | Commitment identifier               | Display value (e.g., **SC-001**, **PO-001**)          | Click opens the commitment detail page. Prefix usually indicates type (SC vs PO).          |
| **Contract Company**              | Vendor/subcontractor/supplier       | Display value                                         | Primary party on the commitment. Useful for filtering + rollups.                           |
| **Title**                         | Commitment title/summary            | Display value                                         | Often the scope shorthand (e.g., “Electrical Contract”, “Door, Frame, & hardware PO”).     |
| **ERP Status**                    | Sync state with ERP                 | Enum (e.g., **Synced**)                               | Indicates ERP integration status. Often used for accounting workflow.                      |
| **Status**                        | Commitment workflow status          | Enum (e.g., **Approved**)                             | This is typically separate from “Executed”.                                                |
| **Executed**                      | Whether fully executed              | Yes/No                                                | Often used for compliance/legal tracking.                                                  |
| **SSOV Status**                   | Schedule of Values status           | Enum (commonly **Approved**)                          | Tied to billing/payment workflows; may block invoicing until approved.                     |
| **Original Contract Amount**      | Base committed amount               | Currency                                              | Initial contract value before change orders.                                               |
| **Approved Change Orders**        | Sum of approved COs                 | Currency                                              | Rolls into revised contract.                                                               |
| **Revised Contract Amount**       | Total commitment after approved COs | **Original Contract Amount + Approved Change Orders** | Key “current commitment” number.                                                           |
| **Pending Change Orders**         | COs in pending state                | Currency                                              | Useful to forecast where the commitment is heading.                                        |
| **Draft Change Orders**           | COs in draft state                  | Currency                                              | Early pipeline. Often ignored in forecasting until submitted/pending.                      |
| **Invoiced**                      | Total invoiced amount               | Currency                                              | Usually sum of approved invoices tied to this commitment. Can exceed paid if not yet paid. |
| **Payments Issued**               | Total paid out                      | Currency                                              | Money actually paid (often from AP/payment records).                                       |
| **% Paid**                        | Paid progress indicator             | **Payments Issued ÷ Revised Contract Amount**         | If Revised is 0, expect 0% or blank depending on system rules.                             |
| **Remaining Balance Outstanding** | Remaining unpaid committed value    | **Revised Contract Amount − Payments Issued**         | This is the “still owed” number. If invoices exist but unpaid, this remains > 0.           |
| **Private**                       | Visibility restriction flag         | Yes/No                                                | Useful for permissioning/internal-only commitments.                                        |

---

## Extra “valuable” implementation notes (if you’re mirroring this UX)

* **Two separate commitment types** are visible and linked:

  * **Work Order Contracts** (subcontracts) → `/work_order_contracts/{id}`
  * **Purchase Order Contracts** → `/purchase_order_contracts/{id}`
* **Row-level actions** you should replicate:

  * **Open PDF** endpoint per record: `.../{commitment_id}.pdf`
  * **Edit** per record: `.../{commitment_id}/edit`
* **Grand Totals** implies server-side aggregation across the current filtered dataset:

  * totals for Original, Approved COs, Revised, Invoiced, Payments Issued, Remaining
  * rolled-up % paid likely computed as **(Total Payments Issued ÷ Total Revised)** (not average of row %’s)

If you want, I can also extract a **“linked pages map”** (every unique URL pattern on this page) so your ExecPlan can show the relationships cleanly.
