# PRP: Procore Prime Contracts

> **Phase:** `prp-create` — research only. This document describes what Procore does. Codebase gap analysis happens in `prp-audit`.

**Feature:** prime-contracts
**Procore tool path:** `/tools/contracts/prime_contracts`
**Research confidence:** 9/10
**Sources:** `.claude/procore-manifests/prime-contracts/manifest.json` + 10 RAG queries + planning artifacts in `_bmad-output/planning-artifacts/prime-contracts/`

---

## 1. Feature Overview

### What Prime Contracts does in Procore

The **Prime Contracts** tool is the owner-side financial management hub for a project. It tracks the contractual agreement between the project owner and the general contractor — covering everything from the initial contract amount through change orders, invoicing, and payments received.

A prime contract in Procore represents the **money flowing in** from the project owner:
- The original contract value agreed upon with the owner/client
- Changes to that value via Prime Contract Change Orders (PCCOs)
- Owner invoices billed against the contract's Schedule of Values (SOV)
- Payments received from the owner

### Role in the Procore financial workflow

Prime Contracts is the mirror image of Commitments (which tracks money going out to subcontractors). Together, they form the complete picture of project financials:

- **Budget** establishes the project cost structure; SOV line items on the prime contract can be imported from the locked budget
- **Change Orders / Change Events** generate Prime Contract Change Orders (PCCOs) when the owner agrees to a change in scope
- **Invoicing** (Owner Invoices) bills the owner against the prime contract's SOV; the contract must be Approved before invoices can be created
- **Commitments** track money flowing out (to subs); Prime Contracts tracks money flowing in (from owner)
- **ERP integration** syncs contract status, amounts, and payment data bidirectionally with accounting systems

### Key relationships

| Related Tool | Relationship |
|--------------|--------------|
| Budget | SOV line items can be imported from locked budget; prime contract value tracked as revenue |
| Change Orders | Prime Contract Change Orders (PCCOs) and Potential Change Orders (PCOs) modify Revised Contract Amount |
| Change Events | Change events become PCOs/PCCOs; enable the 3-tier change order workflow |
| Invoicing | Owner invoices originate from the Prime Contracts tool; requires Approved status |
| Commitments | Parallel tool for owner-facing (incoming) vs. vendor-facing (outgoing) money |
| Directory | Owner/Client, Contractor, and Architect/Engineer selected from company directory |
| Documents | Contract PDFs and attachments stored on the contract record |
| ERP | Bidirectional sync of ERP Status with accounting system |

---

## 2. Procore Data Model

### Prime Contract entity

| Field | Procore Label | Type | Required | Notes |
|-------|--------------|------|----------|-------|
| `number` | Contract # | text | No | Auto-generated or manually entered |
| `vendor` | Owner/Client | select (company) | No | The owner/client paying the GC |
| `title` | Title | text | No | Human-readable contract name |
| `status` | Status | select | No | See status lifecycle below; default: Draft |
| `executed` | Executed | boolean | Yes | Whether contract has been physically signed |
| `retainage_percent` | Default Retainage | percentage | No | Default % withheld on owner invoices (e.g., 5-10%) |
| `contractor` | Contractor | select (company) | No | GC / contracting party |
| `architect` | Architect/Engineer | select (company) | No | Design professional on the project |
| `description` | Description | rich text | No | Full-text contract description with formatting |
| `attachments` | Attachments | file upload | No | Contract documents, exhibits, signed pages |
| `inclusions` | Inclusions | rich text | No | What is explicitly included in scope |
| `exclusions` | Exclusions | rich text | No | What is explicitly excluded from scope |
| `contract_start_date` | Start Date | date | No | Contract commencement date |
| `contract_estimated_completion_date` | Estimated Completion Date | date | No | Target completion date |
| `substantial_completion_date` | Substantial Completion Date | date | No | Date of substantial completion |
| `actual_completion_date` | Actual Completion Date | date | No | Actual project completion date |
| `signed_contract_received_date` | Signed Contract Received Date | date | No | When signed contract was received |
| `contract_termination_date` | Contract Termination Date | date | No | If contract was terminated early |
| `access_policy.private` | Private | checkbox | No | Restricts visibility to admins and named users |
| `access_policy.accessors` | Access for Non-Admin Users | multi-select (users) | No | Named users who can view a private contract |
| `access_policy.show_line_items_to_non_admins` | Allow SOV View | checkbox | No | Non-admin users can view Schedule of Values line items |

### Contract Summary (calculated fields — read-only)

These appear in the detail view's Contract Summary panel. They are **computed**, not stored directly on the contract:

| Field | Procore Label | Calculation |
|-------|--------------|-------------|
| `grand_total` | Original Contract Amount | Sum of original SOV line item amounts |
| `change_summary.approved_change_orders_amount` | Approved Change Orders | Sum of all Approved PCCOs |
| `change_summary.revised_contract_amount` | Revised Contract Amount | Original Amount + Approved Change Orders |
| `change_summary.pending_change_orders_amount` | Pending Change Orders | Sum of PCCOs in review/pending status |
| `change_summary.pending_revised_contract_amount` | Pending Revised Contract Amount | Revised Amount + Pending Change Orders |
| `change_summary.draft_change_orders_amount` | Draft Change Orders | Sum of PCCOs in draft status |
| `invoicing_summary.total_invoices_amount` | Invoices | Total of all owner invoices |
| `total_payments` | Payments Received | Total payments logged against the contract |
| `invoicing_summary.percentage_paid` | Percent Paid | (Payments Received / Revised Contract Amount) × 100 |
| `invoicing_summary.outstanding_balance` | Remaining Balance | Revised Contract Amount − Payments Received |

### Status values

| Status | Description |
|--------|-------------|
| `Draft` | Contract created but not yet complete; default on creation |
| `Out for Signature` | Contract sent for execution; change orders typically disabled |
| `Approved` | Contract fully executed and approved; unlocks owner invoices and change orders |
| `Complete` | Project work is finished |
| `Terminated` | Contract was terminated early |

### ERP Status values

Controlled by the accounting integration; common values:

| ERP Status | Meaning |
|------------|---------|
| `Unsynced` | Not yet exported to ERP |
| `Synced` | Successfully exported and matched in accounting system |
| `Error` | Export attempted but failed; requires admin review |

### Schedule of Values (SOV) line items

SOV is a separate child entity. Each line item represents a billable deliverable or cost category:

| Field | Type | Notes |
|-------|------|-------|
| Description / Title | text | Line item name |
| Cost Code | select | Budget cost code reference |
| Scheduled Value | currency | The billable amount for this line item |
| Unit of Measure | select | For unit/quantity-based accounting |
| Quantity | number | For unit/quantity-based accounting |
| Unit Cost | currency | For unit/quantity-based accounting |

**Accounting methods (set once, cannot change after line items created):**
- **Amount-based** — lump sum per line item
- **Unit/Quantity-based** — quantity × unit price

### Prime Contract Change Orders (PCCOs)

Columns on the Change Orders tab:

| Column | Notes |
|--------|-------|
| Number | Sequential CO number |
| Revision | Revision number (0 = original, 1+ = revised) |
| Title | Change order description |
| Status | Draft → Pending → Approved / Rejected |
| Executed | Whether CO has been signed |
| Amount | Dollar value of the change |
| Date Initiated | When the CO was created |
| Due Date | Review deadline |
| Review Date | Date reviewed |
| Designated Reviewer | Person responsible for approval |
| PCO | Linked Potential Change Order |

### Payments Received

Columns on the Payments tab:

| Column | Notes |
|--------|-------|
| Invoice | Linked owner invoice |
| ERP Status | Sync status with accounting |
| Amount | Payment amount |
| Date Paid | When payment was received |
| Payment Number | Reference number |
| Invoice Number | Invoice reference |
| Check Number | Check or wire reference |
| Notes | Free-text notes |
| Attachments | Supporting documents |

---

## 3. List View Specification

### Columns (exact labels from manifest)

| Column | Data Shown | Notes |
|--------|-----------|-------|
| Number | Contract # | Clickable link to detail view |
| Owner/Client | Owner/client company name | From company directory |
| Title | Contract title text | |
| ERP Status | Accounting sync status | Badge |
| Status | Contract status | Colored badge |
| Executed | Yes / No | Whether contract is signed |
| Original Contract Amount | Sum of SOV original values | Currency |
| Approved Change Orders | Sum of approved PCCOs | Currency, calculated |
| Revised Contract Amount | Original + Approved COs | Currency, calculated |
| Pending Change Orders | Sum of pending PCCOs | Currency, calculated |
| Draft Change Orders | Sum of draft PCCOs | Currency, calculated |
| Invoiced | Total owner invoices | Currency, calculated |
| Payments Received | Total payments logged | Currency, calculated |
| % Paid | Payments / Revised Amount | Percentage |
| Remaining Balance Outstanding | Revised Amount − Payments | Currency |
| Private | Yes / No | Privacy flag |
| Attachments | Attachment count / icons | |

### Filters

| Filter Label | Type | Notes |
|-------------|------|-------|
| Owner/Client | Multi-select | Filter by company |
| ERP Status | Multi-select | Filter by sync status |
| Status | Multi-select | Filter by contract status |
| Executed | Multi-select | Yes / No |

### Toolbar actions

| Action | Type | Notes |
|--------|------|-------|
| Create | Button | Opens create prime contract form |
| Export | Dropdown | Export list to CSV or PDF; requires Read Only+ permissions |
| Configure | Button/link | Configure visible columns and settings |

### Row actions

Row actions were empty in the manifest (captured at list level). Based on RAG and planning artifact research, per-row actions typically include:
- Click row / Number link → navigate to detail view
- Edit → open edit form
- Delete → remove contract (Admin only)

---

## 4. Create / Edit Form Specification

### Section: General Information

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contract # | text | No | Auto-generated or manual entry; placeholder "Enter contract number" |
| Owner/Client | company select | No | Select from company directory; placeholder "Select company" |
| Title | text | No | Free-text contract title; placeholder "Enter title" |
| Status | select | No | Default: Draft; options: Draft, Out for Signature, Approved, Complete, Terminated |
| Executed | select/boolean | Yes | Required field; whether contract has been signed |
| Default Retainage | percentage input | No | Default % to withhold on invoices (e.g., 5%, 10%) |
| Contractor | company select | No | GC performing the work |
| Architect/Engineer | company select | No | Design professional |
| Description | rich text editor | No | Full-featured WYSIWYG with Bold, Italic, Underline, Strikethrough, Align, Indent, Link controls |
| Attachments | file upload | No | Support for contract documents, PDFs, exhibits |

### Section: Inclusions & Exclusions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Inclusions | rich text | No | Explicit scope inclusions |
| Exclusions | rich text | No | Explicit scope exclusions |

### Section: Contract Dates

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Start Date | date picker | No | Contract commencement |
| Estimated Completion Date | date picker | No | Projected completion |
| Substantial Completion Date | date picker | No | Date of substantial completion |
| Actual Completion Date | date picker | No | When work was actually finished |
| Signed Contract Received Date | date picker | No | When GC received signed copy |
| Contract Termination Date | date picker | No | If contract was terminated |

### Section: Contract Privacy

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Private | checkbox | No | When checked, only admins and named users can view |
| Access for Non-Admin Users | multi-select (users) | No | Conditionally visible when Private is checked |
| Allow these non-admin users to view the SOV items | checkbox | No | Granular SOV visibility control |

---

## 5. Detail View Specification

### Header / Summary

The detail view shows a **General Information** panel (with all create-form fields in read mode + Edit button) and a **Contract Summary** financial panel.

**Contract Summary** (calculated, read-only):
- Original Contract Amount
- Approved Change Orders
- Revised Contract Amount
- Pending Change Orders
- Pending Revised Contract Amount
- Draft Change Orders
- Invoices (total invoiced)
- Payments Received
- Percent Paid
- Remaining Balance

### Tabs (from RAG: `view-prime-contracts` article)

| Tab | Content |
|-----|---------|
| General | Contract header fields: Owner/Client, Title, Status, Executed, Retainage, Contractor, Architect/Engineer, Description, Attachments; plus Contract Summary financial panel |
| Schedule of Values | SOV line items table; accounting method; ability to add/edit line items; can be imported from locked Budget |
| Change Orders | PCCO list with columns: Number, Revision, Title, Status, Executed, Amount, Date Initiated, Due Date, Review Date, Designated Reviewer, PCO; Export to DOCX/PDF |
| Invoices | Owner invoices created against this contract; shows Invoice #, Period, Status, Amount, Payment Due |
| Payments Received | Log of payments received from owner; columns: Invoice, ERP Status, Amount, Date Paid, Payment Number, Invoice Number, Check Number, Notes, Attachments |
| Related Items | Links to related Procore items (RFIs, Submittals, etc.) |
| Emails | Email correspondence tied to this contract |
| Change History | Audit log of all changes to the contract record |
| Financial Markup | Markup configuration for change orders |
| Advanced Settings | Change order tier configuration and other administrative settings |

### Actions on detail view

- **Edit** — open edit form for contract details
- **Create** → submenu:
  - Create a Prime Contract Change Order (when Approved)
  - Create Owner Invoice (when Approved)
  - Add Payment
- **Export** — export contract to PDF, DOCX, or CSV
- **Delete** — Admin only

---

## 6. Workflows & Business Rules

### Status lifecycle

```
Draft ──→ Out for Signature ──→ Approved ──→ Complete
    │                                │
    └──────────────────────────→ Terminated
```

**Allowed transitions:**
- Draft → Out for Signature (when ready to send for execution)
- Out for Signature → Approved (once fully executed)
- Draft → Approved (shortcut — skip Out for Signature)
- Approved → Complete (when project is finished)
- Any → Terminated (contract ended early)

**Business rules on status:**
- **Draft**: All fields editable; no owner invoices; no change orders
- **Approved**: SOV should be finalized before approval; unlocks owner invoice creation and change order creation
- Approving a contract signals to Procore that the SOV is complete and binding

### Change order tier configuration

The prime contract supports **1, 2, or 3-tier** change order workflows. This is configured in Advanced Settings and **cannot be changed after the first change order is created**:

| Tiers | Workflow |
|-------|---------|
| 1-tier | PCO → directly creates PCCO |
| 2-tier | PCO → PCCOR (Change Order Request) → PCCO |
| 3-tier | PCO → PCCOR → PCO Grouping → PCCO |

### Schedule of Values rules

1. SOV is an itemized list of all work items on the project; each line shows cost/value
2. **Accounting method** is set when first line items are added and **cannot be changed**:
   - Amount-based: lump sums per line
   - Unit/Quantity-based: quantity × unit price
3. SOV can be imported from the project's locked Budget (one budget line → one SOV line)
4. SOV should be finalized before contract status is moved to Approved

### Retainage rules

- Default Retainage % set on the contract applies to all owner invoices by default
- Common practice: withhold 5–10% until substantial completion
- Retainage can be released as a separate invoice item once work is substantially complete
- Retainage release requires Admin permission on Prime Contracts tool

### Owner invoicing rules

1. Contract must be in **Approved** status before owner invoices can be created
2. Owner invoices are managed in the Invoicing tool but **originate from Prime Contracts**
3. Billing periods are established before invoices are issued
4. Invoices bill against SOV line items (amount-based or unit/quantity-based)
5. Non-admin users can be granted access to view SOV items via the Contract Privacy settings

### Privacy rules

- When `Private` is checked, only Admin-level users and named users in the accessor list can view the contract
- Non-admin users explicitly named in Access for Non-Admin Users gain Read Only access
- SOV item visibility for non-admin users controlled separately by the "Allow SOV view" checkbox

### Financial calculation rules

| Metric | Formula |
|--------|---------|
| Original Contract Amount | Sum of all SOV line item scheduled values |
| Approved Change Orders | Sum of amounts of all PCCOs with Approved status |
| Revised Contract Amount | Original Contract Amount + Approved Change Orders |
| Pending Change Orders | Sum of amounts of PCCOs in Pending/Review status |
| Pending Revised Contract Amount | Revised Contract Amount + Pending Change Orders |
| Draft Change Orders | Sum of amounts of PCCOs in Draft status |
| % Paid | (Payments Received ÷ Revised Contract Amount) × 100 |
| Remaining Balance Outstanding | Revised Contract Amount − Payments Received |

### Permission rules

| Permission Level | Capabilities |
|-----------------|-------------|
| None | No access |
| Read Only | View contracts; export list (CSV/PDF) |
| Standard | View contracts; create/edit owner invoices |
| Admin | Full CRUD; approve contracts; configure change order tiers; manage privacy; delete |

---

## 7. User Flows

### Create a Prime Contract

1. Navigate to project → Prime Contracts tool
2. Click **Create** button in toolbar
3. Fill General Information:
   - Enter or accept auto-generated Contract #
   - Select Owner/Client from directory
   - Enter Title
   - Set Status (defaults to Draft)
   - Mark Executed if contract is already signed
   - Set Default Retainage %
   - Optionally select Contractor and Architect/Engineer
4. Write Description (rich text)
5. Upload Attachments (contract documents)
6. Fill Inclusions & Exclusions (rich text)
7. Set Contract Dates (Start Date, Estimated Completion, Substantial Completion, etc.)
8. Configure Contract Privacy (Public or Private with named user access)
9. Click **Create** / Save — contract saved in Draft status

### Add SOV line items

1. Open prime contract → Schedule of Values tab
2. Click **Add Line Item**
3. Enter Description, Cost Code, Scheduled Value (amount-based) or Qty + Unit Cost (unit-based)
4. Repeat for each billable item
5. Alternatively: click **Import from Budget** to auto-create SOV lines from locked budget

### Approve a Prime Contract

1. Ensure SOV is complete and agreed upon
2. Open contract → click **Edit** (or use status dropdown)
3. Change Status from Draft to **Approved**
4. Click Save — contract is now locked for invoicing and change orders

### Create a Prime Contract Change Order

1. Contract must be in Approved status
2. Open contract → Change Orders tab
3. Click **Create** → **Prime Contract Change Order**
4. Fill: Title, Amount, Date Initiated, Due Date, Designated Reviewer
5. Link to source PCO if applicable
6. Submit — PCCO enters pending review workflow
7. Admin approves → Approved Change Orders amount increases → Revised Contract Amount updates

### Log a Payment Received

1. Open contract → Payments Received tab
2. Click **Add Payment**
3. Fill: Amount, Date Paid, Invoice link, Payment Number, Check Number, Notes
4. Attach payment documentation
5. Save — Payments Received total updates; Remaining Balance recalculates

### Export Prime Contracts List

1. On the list view, optionally filter by Status, Owner/Client, etc.
2. Click **Export** dropdown
3. Select **CSV** or **PDF**
4. File downloads — requires Read Only or higher permissions

---

## 8. Integration Points

### Budget integration
- SOV line items can be created by importing from the locked project Budget
- Each budget line becomes one SOV line item
- Budget must be locked before import is available
- After import, changes are independent (modifying SOV does not modify budget)

### Change Events integration
- When the Change Events tool is enabled, PCOs flow from Change Events into Prime Contracts
- Change Events → PCOs → PCCORs (if 2/3-tier) → PCCOs
- The tier setting in Prime Contracts Advanced Settings controls this flow

### Invoicing integration
- Owner invoices created from Invoicing tool but tied to prime contract
- Invoice amounts draw from SOV line items
- Retainage is withheld per invoice at the default % set on the contract

### ERP integration
- ERP Status column shows sync state with connected accounting system (Sage, Viewpoint, etc.)
- Admin users can trigger re-sync
- Synced contracts prevent certain edits from being made outside of ERP

---

## 9. Procore Research Sources

### RAG queries run

| Query | Top Score | Quality |
|-------|-----------|---------|
| "prime contracts status workflow approved draft out for signature" | 52.5% | Partial — found approval article |
| "prime contracts create edit fields required permissions" | 53.9% | Partial — found permissions matrix |
| "prime contracts schedule of values SOV line items" | 70.5% | **Strong** — detailed SOV article |
| "prime contracts change orders PCO financial impact" | 61.6% | Good — PCO creation article |
| "prime contracts invoicing owner invoice billing" | 61.8% | Good — owner invoice article |
| "prime contracts budget integration cost codes" | 55.9% | Partial — budget setup articles |
| "prime contracts retainage default percentage" | 55.3% | Partial — retainage definition |
| "prime contract permissions admin standard read only" | 58.8% | Partial — 360 reports permissions |
| "prime contracts approved status change order tier configuration" | 59.6% | Good — tier diagrams found |
| "prime contracts detail view tabs schedule values payments invoices" | 58.9% | **Strong** — tabs enumerated |
| "prime contracts export PDF CSV print list" | 57.1% | Good — export article found |

### Manifest sections used

- `states.list.columns` — all 17 list columns documented ✅
- `states.list.formSections` — all 4 filters documented ✅
- `states.create-form.formSections` — all 4 sections, all fields documented ✅
- `states.detail-schedule-of-values.formSections` — detail view + Contract Summary fields ✅
- `states.detail-change-orders.columns` — PCCO tab columns documented ✅
- `states.detail-payments.columns` — Payments tab columns documented ✅

### Planning artifact notes

- `_bmad-output/planning-artifacts/prime-contracts/research/comparison-report-corrected.md` — Jan 2026 comparison showing 90% Procore match; confirmed corrected schema with `client_id` vs old `vendor_id`
- `_bmad-output/planning-artifacts/prime-contracts/summary.md` — Dec 2025 crawl summary

### Gaps / uncertainties

1. **Row actions on list view** — manifest captured empty `rowActions` array; actual row actions (Edit, Delete, Duplicate) not directly captured. Based on RAG and comparison report, Edit and Delete exist. Marked as "unclear" — verify in browser.
2. **SOV import from Budget** — confirmed by RAG (67% match) but button/action label on UI not confirmed in manifest
3. **Financial Markup tab** — RAG confirms it exists; content not captured in manifest
4. **Advanced Settings tab** — RAG confirms change order tier setting lives here; exact UI not in manifest
5. **Related Items and Emails tabs** — confirmed by RAG `view-prime-contracts` article; not captured in manifest detail states
6. **Status dropdown options on form** — manifest shows status defaulting to "Draft" but exact options not enumerated in manifest; derived from RAG and planning artifacts as: Draft, Out for Signature, Approved, Complete, Terminated
7. **ERP Status options** — specific values not enumerated in manifest; common values from RAG: Unsynced, Synced, Error

---

*Ready for `/prp:prp-audit`*
