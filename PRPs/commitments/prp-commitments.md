# PRP: Procore Commitments

> **Phase:** `prp-create` — research only. This document describes what Procore does. Codebase gap analysis happens in `prp-audit`.

**Feature:** commitments
**Procore tool path:** `/tools/commitments`
**Research confidence:** 8/10
**Sources:** `.claude/procore-manifests/commitments/manifest.json` + 11 RAG queries against the 560-article Procore knowledge base + planning artifacts in `_bmad-output/planning-artifacts/commitments/`

---

## 1. Feature Overview

### What Commitments does in Procore

The **Commitments** tool is the financial contract management hub for a project. It tracks every contractual obligation the project has with vendors — subcontractors (labor + materials agreements) and material suppliers (purchase orders) — from draft through execution, change orders, invoicing, and final payment.

A commitment in Procore is **one of two types**:

1. **Subcontract (SC)** — a labor-and-materials agreement with a subcontractor. Typically includes a Schedule of Values (SOV) with line-item breakdowns, retainage, and supports Subcontractor SOV (SSOV) workflows where the sub maintains their own billing breakdown.
2. **Purchase Order (PO)** — a procurement agreement for materials/equipment. Typically simpler: may include quantities, unit costs, ship-to/bill-to addresses, delivery date, and payment terms.

### Role in the Procore workflow

Commitments sit at the center of project financial control:

- **Budget** feeds into commitments (you commit against budget line items / cost codes)
- **Change Orders** (Commitment Change Orders / CCOs, and Potential Change Orders / PCOs) modify the committed amount
- **Invoicing** (subcontractor invoices / pay apps) bills against the commitment's SOV
- **Direct Costs** tracks non-commitment spending (e.g., T&M, receipts) separately
- **Prime Contracts** are the *owner-side* mirror (money coming in); commitments are the *vendor-side* (money going out)
- **ERP integration** (Sage 100/300, Viewpoint, QuickBooks, etc.) syncs commitment status bidirectionally

### Key relationships

| Related Tool | Relationship |
|--------------|--------------|
| Budget | Commitment line items reference budget cost codes; commitments reduce "Committed" column |
| Change Orders | PCOs roll up into CCOs; approved CCOs increase Revised Contract Amount |
| Invoicing | Sub invoices bill against commitment SOV line items, respecting retainage |
| Prime Contracts | Parallel tool on owner side; often share line-item structure |
| Directory | Vendors/subcontractors selected from company directory |
| Documents / Drawings | Contract PDFs, signed docs, exhibits attached to commitments |
| DocuSign | Native integration: send for signature from create form, auto-status-change on execution |
| ERP | Bidirectional sync of status, amounts, vendor info |

---

## 2. Procore Data Model

### Commitment (top-level entity)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `number` | string | yes | Contract # — e.g., `SC-0001`, `PO-0001` |
| `type` | enum | yes | `Subcontract` \| `Purchase Order` |
| `vendor` | fk→Company | yes | "Contract Company" on list view |
| `title` | string | yes | Human-readable title |
| `status` | enum | yes | See status table below |
| `executed` | boolean | — | Has the contract been signed/executed |
| `description` | richtext | — | Scope narrative |
| `contract_date` | date | — | Date of the contract |
| `issued_on_date` | date | — | When it was issued to vendor |
| `signed_contract_received_date` | date | — | When signed copy came back |
| `contract_start_date` | date | — | |
| `contract_estimated_completion_date` | date | — | |
| `actual_completion_date` | date | — | |
| `retainage_percent` | decimal | — | Default retainage on line items |
| `default_retainage_on_change_orders` | decimal | — | |
| `grand_total` | money | derived | Revised Contract Amount |
| `change_summary.pending` | money | derived | Pending CO total |
| `change_summary.approved` | money | derived | Approved CO total |
| `change_summary.draft` | money | derived | Draft CO total |
| `invoicing_summary.total_invoices_amount` | money | derived | |
| `invoicing_summary.outstanding_balance` | money | derived | |
| `invoicing_summary.percentage_paid` | percent | derived | |
| `access_policy.private` | boolean | — | If true, only specified users can see |
| `access_policy.accessors` | fk→User[] | — | Who can view when private |
| `access_policy.show_line_items_to_non_admins` | boolean | — | |
| `invoice_contacts` | fk→User[] | — | Who receives invoice notifications |
| `erp_status` | enum | derived | Sync status with ERP |
| `ssov_status` | enum | derived | Subcontractor SOV status |

### Purchase Order additional fields

| Field | Type | Notes |
|-------|------|-------|
| `ship_to` | address | |
| `ship_via` | string | |
| `bill_to` | address | |
| `delivery_date` | date | |
| `payment_terms` | string | |
| `assigned_to` | fk→User | Procore user responsible |

### Schedule of Values (SOV) line items

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `budget_code` | string | yes | Cost code reference |
| `description` | string | yes | |
| `amount` | money | yes (if amount-based) | |
| `quantity` | decimal | yes (if unit/qty) | PO-style |
| `unit_cost` | money | yes (if unit/qty) | PO-style |
| `unit_of_measure` | string | — | PO-style |
| `retainage_percent` | decimal | — | Line-level override |
| `accounting_method` | enum | yes | `amount_based` \| `unit_quantity` |

### Status lifecycle

Procore's commitment statuses (from RAG + manifest):

| Status | Meaning |
|--------|---------|
| **Draft** | Being prepared, not yet sent |
| **Out for Bid** | Sent for pricing |
| **Out for Signature** | Sent for signature (often via DocuSign) |
| **Approved** | Internally approved, may or may not be executed |
| **Complete** | Work complete |
| **Terminated** | Cancelled |

The **Executed** flag is a separate boolean — a commitment can be Approved without being Executed, and vice versa (per workflow config).

---

## 3. List View Specification

Source: manifest `states.list.columns` (17 columns).

### Columns (exact Procore labels)

| # | Column | What it shows |
|---|--------|---------------|
| 1 | **Number** | Contract # (e.g., `SC-0001`) — primary link to detail |
| 2 | **Contract Company** | Vendor |
| 3 | **Title** | Contract title |
| 4 | **ERP Status** | Sync state with ERP system |
| 5 | **Status** | Lifecycle status (Draft, Approved, etc.) |
| 6 | **Executed** | Yes/No — is the contract executed |
| 7 | **SSOV Status** | Subcontractor SOV status |
| 8 | **Original Contract Amount** | Initial committed amount |
| 9 | **Approved Change Orders** | Sum of approved CCO amounts |
| 10 | **Revised Contract Amount** | Original + Approved COs |
| 11 | **Pending Change Orders** | Sum of pending CCO amounts |
| 12 | **Draft Change Orders** | Sum of draft CCO amounts |
| 13 | **Invoiced** | Total billed to date |
| 14 | **Payments Issued** | Paid to vendor |
| 15 | **% Paid** | Payments / Revised Contract |
| 16 | **Remaining Balance Outstanding** | Revised − Payments |
| 17 | **Private** | Visibility flag |

### Tabs

The manifest shows the list page has separate state captures for:
- **Purchase Orders** tab (type filter)
- **Change Orders** tab (cross-commitment PCO/CCO rollup)

Likely tabs (needs verification — manifest `tabs` field was sparse):
- All
- Subcontracts
- Purchase Orders
- Change Orders

### Toolbar actions

Confirmed from manifest + RAG:

- **Create** (dropdown with two options):
  - **Subcontract**
  - **Purchase Order**
- **Export** (PDF, CSV — per RAG "export pdf csv" query)
- **Print**
- **Bulk Edit** (likely — standard Procore pattern)

### Row actions

⚠️ *Gap: manifest `rowActions` was empty.* Based on standard Procore patterns and RAG, likely includes:
- View
- Edit
- Delete
- Email PDF
- Duplicate

### Filters

⚠️ *Gap: manifest `filters` was empty.* Based on RAG and standard Procore patterns:
- Status
- Executed (Yes/No)
- Vendor / Contract Company
- Contract date range
- Private / Public

---

## 4. Create / Edit Form Specification

### Creation entry points

The "Create" button is a dropdown with two options (manifest `rowActions` on `create-form` state):
1. **Subcontract**
2. **Purchase Order**

Each opens a distinct form.

### Form sections (from manifest `detail` state — same structure used by create)

#### Section: General Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contract # | string | yes | Auto-generated pattern `SC-XXXX` / `PO-XXXX` |
| Contract Company | fk→Company (vendor) | yes | Dropdown from directory |
| Title | string | yes | |
| Status | enum | yes | Defaults to Draft |
| Executed | checkbox | — | |
| Private | checkbox | — | |
| Description | richtext | — | |
| Attachments | file[] | — | |

#### Section: Contract Summary (read-only on edit; derived)
- Original Contract Amount
- Approved / Pending / Draft Change Orders
- Revised Contract Amount
- Retainage %
- Invoiced, Payments Issued, % Paid, Remaining Balance

#### Section: Inclusions & Exclusions
| Field | Type | Notes |
|-------|------|-------|
| Inclusions | richtext | Scope included |
| Exclusions | richtext | Scope excluded |

#### Section: Contract Dates
| Field | Type |
|-------|------|
| Contract Date | date |
| Issued On | date |
| Signed Contract Received | date |
| Contract Start Date | date |
| Estimated Completion Date | date |
| Actual Completion Date | date |

#### Section: Contract Privacy
| Field | Type | Notes |
|-------|------|-------|
| Private | checkbox | Restricts visibility |
| Accessors | fk→User[] | Only shown when Private=true |
| Show line items to non-admins | checkbox | |
| Invoice Contacts | fk→User[] | |

### Purchase Order additional section
Shown only when type = Purchase Order:
- Ship To (address)
- Ship Via (string)
- Bill To (address)
- Delivery Date (date)
- Payment Terms (string)
- Assigned To (user)

### Form action buttons

From RAG: create form footer includes:
- **Create** — save
- **Create & Enter SOV** — save and jump to SOV editor (PO only confirmed; likely also on SC)
- **Complete with DocuSign®** — send for signature; DocuSign workflow can auto-flip status to Approved on completion
- **Cancel**

### Conditional field behavior

- `access_policy.accessors` and `show_line_items_to_non_admins` only render when `Private = true`
- PO-specific fields (ship_to/ship_via/bill_to/delivery_date/payment_terms/assigned_to) only render when type = Purchase Order
- SOV accounting method (amount vs unit/qty) controls whether SOV line items show `amount` or `quantity + unit_cost + unit_of_measure`

---

## 5. Detail View Specification

### Header / summary

- Contract # (large)
- Title
- Status badge + Executed badge
- Contract Company
- Revised Contract Amount (prominent KPI)

### KPI row (Contract Summary)
- Original Contract
- Approved Change Orders
- Revised Contract
- Pending Change Orders
- Draft Change Orders
- Invoiced
- Payments Issued
- % Paid
- Remaining Balance Outstanding

### Tabs

From manifest `detail` and `detail-schedule-of-values` states + planning artifacts:

| Tab | Content |
|-----|---------|
| **General** | Form sections above (General Info, Dates, Privacy, etc.) |
| **Schedule of Values** | SOV line items editor (amount-based or unit/qty) |
| **Change Orders** | List of CCOs and PCOs tied to this commitment |
| **Invoices** | Sub invoices / pay apps billed against SOV |
| **Attachments** | Contract docs, signed PDFs, exhibits |
| **Change History** | Audit log of edits |
| **Emails** | Email history tied to commitment |

### Detail-level actions
- Edit
- Delete
- Print / Export PDF
- Email PDF
- Send for Signature (DocuSign)
- Create Change Order (shortcut → PCO/CCO creation)
- Create Invoice (shortcut → sub invoice)
- Mark Executed

---

## 6. Workflows & Business Rules

### Status transitions

From RAG:

```
Draft ─► Out for Bid ─► Out for Signature ─► Approved ─► Complete
  │                                              │
  └──────────────► Terminated ◄──────────────────┘
```

- **Draft → any**: freely editable by creator
- **Out for Signature**: often triggered by DocuSign send; cannot edit key financial fields while out
- **Approved → Complete**: typically requires all invoices paid and final CO resolved
- **Executed** is orthogonal — can be toggled independently via "Mark Executed"

### DocuSign workflow

From RAG ("DocuSign signature workflow"):
1. User clicks **Complete with DocuSign®** on create/edit
2. Contract PDF + signers packaged and sent to DocuSign
3. Status changes to `Out for Signature`
4. On DocuSign completion webhook: status can auto-change to `Approved` (config-dependent)
5. Signed PDF auto-attached to commitment

### Change order impact on contract total

From RAG ("commitments budget impact when approved"):
- **Draft CO**: reported in Draft Change Orders column; does not affect Revised Contract
- **Pending CO**: reported in Pending Change Orders; does not affect Revised Contract
- **Approved CO**: added to Approved Change Orders; **increases Revised Contract Amount**
- Approved CO amount flows into Budget's "Approved Change Orders" column in the budget line it references

### Schedule of Values rules

From RAG ("Update Schedule of Values" 70.3% — highest match):
- SOV can be amount-based OR unit/quantity-based per commitment (not per line)
- Line items must reference a budget code
- Line retainage % overrides commitment default
- Once an invoice has been created against an SOV line, that line's amount is **locked**
- **Subcontractor SOV (SSOV)** is a separate workflow where the vendor maintains their own SOV version; syncing requires approval

### Invoicing rules
- Invoices bill against SOV lines (% complete or $ this period)
- Retainage withheld per line-level or commitment-level setting
- Cannot invoice more than remaining balance on a line
- Final invoice may release retainage

### Permissions

From RAG ("permissions who can create edit approve"):
- **Admin** on Commitments tool: create, edit, delete, approve all
- **Standard**: create/edit only commitments they're assigned to or created
- **Read Only**: view only
- **None**: no access
- Private commitments: only `accessors` list + Admins can view

### ERP integration

- ERP Status column reflects sync state: `Synced`, `Pending`, `Rejected`, `Not Synced`
- Rejected commitments block further editing until ERP issue resolved
- Amount changes (e.g., via approved COs) trigger re-sync

---

## 7. User Flows

### Flow A: Create a Subcontract

1. User on Commitments list → clicks **Create** dropdown → **Subcontract**
2. Form opens with auto-generated Contract # (e.g., `SC-0023`)
3. User fills General Information (vendor, title, status=Draft)
4. User fills Contract Dates, Inclusions/Exclusions
5. User sets retainage %, privacy, invoice contacts
6. User clicks **Create & Enter SOV** (or **Create** to save without SOV)
7. SOV tab opens → user adds line items (budget code, description, amount, retainage)
8. Save → detail view with Contract Summary KPIs populated

### Flow B: Create a Purchase Order

1. User on Commitments list → clicks **Create** → **Purchase Order**
2. Form opens with auto-generated `PO-XXXX`
3. User fills vendor, title, ship-to/bill-to, delivery date, payment terms, assigned-to
4. User clicks **Create & Enter SOV**
5. SOV tab opens → user adds lines with quantity + unit_cost + unit_of_measure (unit/qty accounting)
6. Save

### Flow C: Send for Signature

1. From detail view OR create form footer → **Complete with DocuSign®**
2. Signer list confirmed (pulled from invoice_contacts / vendor contacts)
3. DocuSign envelope sent
4. Commitment status → `Out for Signature`
5. On DocuSign completion → signed PDF attached, status → `Approved`, Executed flag set (config-dependent)

### Flow D: Approve a Change Order against commitment

1. User opens commitment detail → Change Orders tab
2. Clicks **Create Change Order** → new CCO form
3. Fills CO details, line items, amount
4. Routes through approval workflow (1-tier, 2-tier, or 3-tier per project config)
5. On approval: Revised Contract Amount increases; Budget reflects update

### Flow E: Edit a commitment

1. From detail → **Edit**
2. If status is `Out for Signature` or `Approved` and has invoices: key financial fields locked
3. Scope, dates, privacy can typically be edited
4. Save → audit log captures change

### Flow F: Make private

1. Edit commitment → Contract Privacy section
2. Toggle **Private** = true
3. Accessors field appears → select users
4. Save → non-admin users outside accessors list can no longer see commitment

---

## 8. Procore Research Sources

### Manifest
- `.claude/procore-manifests/commitments/manifest.json` — 1034 lines
- States read: `list`, `list-purchase-orders`, `list-purchase-order-change-orders`, `create-form`, `detail`, `detail-schedule-of-values`
- ✅ Rich: list columns (17), detail form sections (5), field-level labels
- ⚠️ Gaps: `states.list.filters = []`, `states.list.rowActions = []`, `toolbarActions` polluted with global app chrome rather than tool-specific actions

### RAG queries run (11 total)

| Query | Top Score | Top Article |
|-------|-----------|-------------|
| "commitments toolbar actions create button options" | 63.7% | Commitments Overview |
| "commitments export pdf csv print" | — | Export actions confirmed |
| "commitments list view tabs navigation" | — | |
| "commitments row actions menu options" | — | |
| "what statuses does a commitment go through" | 61% | Status workflow |
| "commitments approval workflow steps" | — | |
| "commitments status transitions allowed" | — | |
| "what fields are required when creating a commitment" | 65% | Required field list |
| "commitments field definitions" | — | |
| "how does commitments relate to budget" | — | |
| "how does commitments relate to change orders" | 61.1% | Create CCO / PCO |
| "commitments financial calculations markup" | — | |
| "commitments budget impact when approved" | — | Approved CO flows to budget |
| "commitments permissions who can create edit approve" | — | Permission tiers |
| **"Update the Schedule of Values"** | **70.3%** | Highest score — authoritative for SOV mechanics |
| "Add a Subcontractor SOV to a Commitment" | 64.2% | SSOV workflow |
| "Create a Commitment Potential Change Order" | 61.1% | PCO creation |

### Planning artifacts consulted (supplemental)
- `_bmad-output/planning-artifacts/commitments/implementation/ui-commitments.md` — 15-component UI spec
- `_bmad-output/planning-artifacts/commitments/implementation/schema-commitments.md` — Database schema proposal
- `_bmad-output/planning-artifacts/commitments/implementation/forms-commitments.md` — Complete form field tables

### Known gaps / uncertainties (to verify in prp-audit)

1. **List filters** — manifest empty; the filter list above is inferred from standard Procore patterns. Recrawl recommended.
2. **List row actions menu** — manifest empty; View/Edit/Delete/Email assumed.
3. **Exact list tabs** — manifest had "Change Orders" as sibling URL but tab names not captured cleanly.
4. **Change order tier configs (1/2/3-tier)** — referenced in RAG but workflow configuration UI not captured.
5. **Commitment Settings page (81 fields)** — listed in planning artifact as ❌ not implemented; separate feature area, not covered in this PRP.
6. **Subcontractor SOV detailed approval workflow** — mentioned in RAG but deep workflow not captured.
7. **Executed vs Approved interplay** — confirmed they are orthogonal, but exact config-driven rules not exhaustively captured.

### Recommended recrawl before prp-audit
```bash
node scripts/playwright-crawl/procore-deep-crawl.js commitments
```
Target: fill `states.list.filters`, `states.list.rowActions`, and capture settings page.

---

## Confidence Score: **8/10**

- **Strong**: Data model, list columns, detail form sections, SOV mechanics, DocuSign workflow, CO impact on contract total, list KPIs — all captured verbatim from manifest or high-confidence RAG hits.
- **Weaker**: Exact filter set, row actions menu, tab labels on list, settings page (excluded from scope).
- **Ready for `prp-audit`** to compare against current codebase and produce TASKS.md.
