# PRP: Change Events

**Feature:** Change Events  
**Phase:** Procore Research (prp-create) — Procore functionality reference  
**Created:** 2026-04-17  
**Confidence Score:** 9/10

> **This PRP answers: "What does Procore do and what do we need to replicate?"**  
> It does NOT analyze the current codebase or map to our DB schema — that is `prp-audit`'s job.

---

## 1. Feature Overview

### What Change Events Are

A **Change Event** in Procore is any change that affects a construction project's original scope, schedule, or cost. Change Events allow a project team to document and track potential cost changes *before* they become actual costs — bridging the gap between an initial scope change and the formal change order process.

Change Events replaced Procore's legacy "budget modifications" feature. They provide a centralized staging area where:
- An event is identified (RFI, field condition, owner request, etc.)
- Rough Order of Magnitude (ROM) cost estimates are built
- Subcontractors are solicited via Request for Quote (RFQ)
- Downstream financial documents (Prime PCOs, Commitment PCOs, Budget Changes) are created

**Key Procore definition:** *"A change event is a record that tracks any change that may affect a construction project's scope, schedule, or cost."*

### How It Fits Into the Procore Workflow

Change Events sit between identifying a change and formalizing it in a contract. The full flow:

```
Trigger (RFI, Observation, Field Condition, Owner Request)
    ↓
Change Event (documenting the potential change with ROM estimates)
    ↓
RFQ (Request for Quote sent to subcontractors for cost quotes)
    ↓
RFQ Responses (subcontractors submit pricing)
    ↓
ADD TO → Prime PCO, Commitment PCO, or Budget Changes
    ↓
Change Order (formalized contract amendment)
```

### Key Relationships to Other Tools

| Related Tool | Relationship |
|---|---|
| **Budget** | Change Events add Cost ROM and Revenue ROM columns to budget views; "Out of Scope" events impact the budget |
| **Prime Contracts** | Change Events → "Add to" → Prime PCO or Prime Contract Change Order |
| **Commitments** | Change Events → "Add to" → New PO, New Subcontract, or link to existing Commitment PCO |
| **Change Orders** | Change Events are the originating source for Prime Contract Change Orders |
| **RFIs** | An RFI can trigger the creation of a Change Event |
| **Observations** | Observations can be converted to Change Events |
| **Meetings** | Meeting action items can generate Change Events |
| **Budget Changes** | Change Events can be converted to Budget Changes (new Budget Changes feature) |

---

## 2. Procore Data Model

### 2.1 Change Event (Header)

| Field | Label in Procore | Type | Required | Notes |
|---|---|---|---|---|
| `number` | Number | Auto-incremented text | No (auto) | Sequential per project (e.g., "001", "002") |
| `title` | Title | Text | Yes | Short description |
| `status` | Status | Select | No | Defaults to "Open" |
| `origin` | Origin | Select | No | Where the event came from |
| `type` | Type | Select | No | Change category; "Allowance" is default |
| `change_reason` | Change Reason | Select | No | Subcategory of type |
| `scope` | Scope | Select | No | Defaults to "TBD" |
| `expecting_revenue` | (implicit toggle) | Boolean | No | Controls Revenue section visibility |
| `line_item_revenue_source` | Line Item Revenue Source | Select | No | How revenue ROM is calculated; default: "Match Revenue to Latest Cost" |
| `prime_contract_for_markup` | Prime Contract for Markup Estimates | Select | No | Which prime contract to use for markup estimates |
| `description` | Description | Rich Text | No | Multi-paragraph formatted text |
| `attachments` | Attachments | File(s) | No | Drag-and-drop or browse |

### 2.2 Status Values

| Status | Meaning |
|---|---|
| **Open** | Default status; event is being documented, estimates in progress |
| **Closed** | Event resolved without creating a change order (no financial impact) |

> **Note from RAG research:** Change Events do NOT have an approval workflow of their own — status transitions are manual (Open → Closed). The approval workflow exists at the Change Order level (PCO → PCCO). Some configurations may surface additional statuses but Open/Closed are the canonical Procore statuses for Change Events.

> **Conflict with planning artifacts:** The planning artifacts spec listed statuses: Open, Pending Approval, Approved, Rejected, Closed, Converted. RAG research indicates Procore Change Events use Open/Closed; the approval workflow operates on downstream PCOs. Planning artifacts likely conflated Change Event status with PCO/PCCO status. **Manifest + RAG win here: Open and Closed.**

### 2.3 Scope Values

| Value | Meaning |
|---|---|
| **TBD** | Scope not yet determined (default) |
| **In Scope** | Change is within the contracted scope of work |
| **Out of Scope** | Change is outside the contracted scope; likely requires a change order |
| **Allowance** | Change is against an allowance budget |

> Scope directly controls Budget ROM behavior (configurable per project settings).

### 2.4 Type Values (from manifest observation)

The manifest captured "Allowance" as the default. Common types include:
- Owner Change
- Design Change
- Allowance
- Scope Gap
- Unforeseen Condition
- Value Engineering
- Owner Requested
- Constructability Issue

> **Note:** Type options are configurable per company in Procore Admin settings. The exact values depend on company-level configuration.

### 2.5 Change Reason Values

Change Reason options depend on the selected Type. Common examples:
- Scope Addition
- Design Development
- Owner Request
- Constructability
- Code Compliance
- Coordination
- Allowance Buyout
- Unit Price Adjustment

> **Note:** Change Reasons are configurable. They may be project-specific or company-wide.

### 2.6 Origin Values

Common values (not exhaustive — configurable):
- Owner
- Design Team
- Field
- Subcontractor
- Unforeseen Condition

### 2.7 Line Item Revenue Source Options

The field `Line Item Revenue Source` controls how the Revenue ROM is auto-calculated:

| Option | Behavior |
|---|---|
| **Match Revenue to Latest Cost** | Revenue ROM = latest cost amount (default) |
| **Match Revenue to Latest Price** | Revenue ROM = latest price amount |
| **Manual Entry** | User enters Revenue ROM manually per line item |

> From RAG: "Latest Cost" and "Latest Price" are distinct — Latest Price includes markups from linked Prime PCOs.

### 2.8 Change Event Line Item

| Field | Label | Type | Notes |
|---|---|---|---|
| `budget_code` | Budget Code | Select | Links to project budget codes |
| `description` | Description | Text | Line item description |
| `vendor` | Vendor | Select | Company/subcontractor |
| `contract` | Contract | Select | Linked commitment/subcontract |
| `unit_of_measure` | Unit of Measure | Select | e.g., EA, LF, SF, CY |
| `quantity` | Quantity | Number | For unit-based financials |
| `unit_cost` | Unit Cost | Currency | Per unit cost |
| `revenue_rom` | Revenue ROM | Currency | Rough Order of Magnitude — revenue impact |
| `cost_rom` | Cost ROM | Currency | Rough Order of Magnitude — cost impact |
| `non_committed_cost` | Non-Committed Cost | Currency | Cost not tied to a commitment |
| `prime_pco` | Prime PCO | Link | Linked Prime Potential Change Order number |
| `prime_pco_title` | Prime PCO Title | Text | Title of linked Prime PCO |
| `latest_price` | Latest Price | Currency | Price from linked Prime PCO |
| `rfq_title` | RFQ Title | Text | Linked RFQ (for cost column group) |
| `commitment` | Commitment | Link | Linked commitment number |
| `commitment_title` | Commitment Title | Text | Title of linked commitment |

---

## 3. List View Specification

### 3.1 Column Groups

The list view uses **grouped column headers**:

| Group | Columns |
|---|---|
| **Change Event** | Status, Scope, Type, Change Reason, Origin |
| **Revenue** | Prime PCO, Prime PCO Title |
| **Cost** | Cost ROM, RFQ Title, Commitment, Commitment Title |

### 3.2 Full Column List (from manifest)

| Column | Group | Data |
|---|---|---|
| Status | Change Event | Current status badge |
| Scope | Change Event | TBD / In Scope / Out of Scope / Allowance |
| Type | Change Event | Owner Change / Design Change / etc. |
| Change Reason | Change Event | Subcategory |
| Origin | Change Event | Where it originated |
| Prime PCO | Revenue | Linked Prime PCO number |
| Prime PCO Title | Revenue | Prime PCO title |
| Cost ROM | Cost | Rough order of magnitude cost total |
| RFQ Title | Cost | Linked RFQ title |
| Commitment | Cost | Linked commitment number |
| Commitment Title | Cost | Linked commitment title |

> **Additional columns available (from RAG "View Change Events" article):**

**Change Event General Information:**
- Number, Title, CE Number - Title, Status, Scope, Type, Change Reason, Origin, Date Created, Created By

**Change Event Detail (line item level):**
- Item Type, Budget Codes, Description, Vendor, Contract, Unit of Measure

**Production:**
- Unit of Measure, Quantity

**Revenue:**
- Quantity, Unit Cost, Revenue ROM, Prime/Prime PCO, Prime PCO Title, Latest Price

**Cost:**
- Quantity, Unit Cost, Cost ROM, Non-Committed Cost, RFQ Title, Commitment, Commitment Title

**Over/Under and Budget columns** are also available in the configurable view.

### 3.3 Filters (from manifest — filter groups)

- **Change Event** filter group (Status, Scope, Type, Change Reason)
- **Detail** filter group
- **Revenue** filter group
- **Cost** filter group
- **Over/Under** filter group
- **Budget** filter group
- **Budget Code Segments** filter group

### 3.4 Toolbar Actions

The list view has **two primary toolbar modes**:

**Standard mode** (no rows selected):
- Create New Change Event (primary button)
- Export (CSV/PDF)
- Print
- Configurable Views selector

**Row-selected mode** (one or more rows checked):
- **"Add to" dropdown** with these options:
  - **Commitment:**
    - New Purchase Order
    - New Subcontract
    - Link to existing Commitment
  - **Commitment Change Order/Potential Change Order:**
    - New Commitment Change Order/Potential Change Order
    - Link to existing Commitment Change Order/Potential Change Order
  - **Prime Contract Change Order/Potential Change Order:**
    - New Prime Change Order/Potential Change Order
    - Link to existing Prime Change Order/Potential Change Order
  - **Budget Changes:**
    - New Budget Change
    - Link to existing Budget Change

### 3.5 Row Actions

Each row has an actions menu (ellipsis/kebab) with:
- **Edit** — open edit form
- **Delete** — delete change event (with confirmation)
- **Send RFQs** — trigger RFQ creation modal for this change event

### 3.6 Predefined Views

From RAG results, the Change Events tool supports configurable/predefined views:

| View Name | Description |
|---|---|
| **Classic Detail** | Line item detail columns (description, vendor, contract, UOM) |
| **Classic Summary** | Summary columns (status, title, scope, type, reason, origin) |

Users can also create custom views with column configuration, grouping, and sorting.

### 3.7 Grouping

The list view supports grouping by columns (e.g., group by Status, Type, Scope).

---

## 4. Create / Edit Form Specification

### 4.1 General Information Section

| Field | Name | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| Number | `number` | Text | No | Auto-generated | Sequential; editable |
| Title | `title` | Text | No | Empty | Placeholder: "Enter Title" |
| Status | `status` | Select | No | Open | |
| Origin | `eventOrigin` | Select | No | — | Placeholder: "Select Origin" |
| Type | `changeType` | Select | No | Allowance | |
| Change Reason | `changeReason` | Select | No | — | Placeholder: "Select Reason" |
| Scope | `scope` | Select | No | TBD | |
| Line Item Revenue Source | `sourceOfRevenueRom` | Select | No | Match Revenue to Latest Cost | Controls revenue ROM auto-calculation |
| Prime Contract for Markup Estimates | `primeContractForEstimates` | Select | No | (first prime contract) | Used for markup % calculation |
| Description | `description` | Rich Text | No | Empty | Full rich text editor |
| Attachments | `attachments` | File | No | — | Drag-and-drop |

> **From manifest:** The form uses a rich text editor with toolbar (bold, italic, underline, strikethrough, alignment, indent, cut, paste, undo, redo).

### 4.2 Line Items Section (Table Grid)

The create form includes a **Line Items** grid (a spreadsheet-style table) with these columns:

**Detail column group:**
| Field | Type | Notes |
|---|---|---|
| Budget Code | Select | Links to project budget codes |
| Description | Text | Line description |
| Vendor | Select | Company/subcontractor |
| Contract | Select | Linked commitment |
| Unit of Measure | Select | UOM options |

**Revenue column group:**
| Field | Type | Notes |
|---|---|---|
| Quantity | Number | For unit-based financials |
| Unit Cost | Currency | Revenue unit cost |
| Revenue ROM | Currency | Auto-calculated or manual |

**Cost column group:**
| Field | Type | Notes |
|---|---|---|
| Quantity | Number | Cost quantity |
| Unit Cost | Currency | Cost unit cost |
| Cost ROM | Currency | Auto-calculated or manual |
| Non-Committed Cost | Currency | Cost not tied to a commitment |

**Grid interactions:**
- Add new line item row (+ button)
- Edit inline by clicking cells
- Delete row
- Totals row at the bottom (sum of each column)
- Unit-based columns (Quantity, Unit Cost) can be enabled/disabled via settings

### 4.3 Create Flow Steps

Per RAG "Create Change Events" tutorial:

1. Navigate to Change Events tool
2. Click **+ Create** or **New Change Event**
3. Fill in General Information fields
4. Click **Save** — Procore saves the change event and opens the detail view
5. **Add Line Items** (step 2): In detail view, add line items to the table
6. *(Optional)* **Send RFQs** to subcontractors for pricing
7. *(Optional)* Use **Add to** menu to create downstream documents

---

## 5. Detail View Specification

### 5.1 Header Fields

The detail view shows the change event header with:
- CE Number
- Title
- Status
- Scope
- Type
- Change Reason
- Origin
- Line Item Revenue Source
- Prime Contract for Markup
- Description
- Attachments

### 5.2 Detail View Tabs

Based on existing implementation research and RAG:

| Tab | Content |
|---|---|
| **Summary** | Overview of the change event with totals |
| **Line Items** | The editable line items grid (Detail view of the list) |
| **RFQs** | List of Requests for Quote sent to subcontractors |
| **History** | Audit trail of all changes |

> **Recycle Bin tab** — Procore has a Recycle Bin tab on some tools; unclear if Change Events specifically has this. **Marked as uncertain.**

### 5.3 Detail View Actions

**Primary action bar:**
- **Edit** — opens the edit form
- **Delete** — delete the change event
- **Send RFQs** — opens the Send Requests for Quote modal

**"Add to" dropdown** (for selected line items in the detail view):
Same options as list view "Add to" menu:
- New Purchase Order
- New Subcontract
- Link to existing Commitment
- New Commitment Change Order/Potential Change Order
- Link to existing Commitment Change Order/Potential Change Order
- New Prime Change Order/Potential Change Order
- Link to existing Prime Change Order/Potential Change Order
- New Budget Change
- Link to existing Budget Change

### 5.4 Line Items View in Detail

The detail view shows line items in a more expanded layout with additional columns compared to the list view summary. Column groups visible:

**Detail columns:** Budget Code, Description, Vendor, Contract, Unit of Measure  
**Revenue columns:** Quantity, Unit Cost, Revenue ROM, Prime PCO, Latest Price  
**Cost columns:** (same as create form)

---

## 6. RFQ (Request for Quote) Workflow

### 6.1 What an RFQ Is

An RFQ in Procore is a formal request to a subcontractor or vendor to submit a price quote for the goods, services, and tasks associated with a Change Event.

### 6.2 Send RFQ Flow

1. Change Event is created
2. User clicks **Send RFQs** on the change event
3. **Send RFQs modal** opens — user selects:
   - Which line items to include
   - Which commitments/subcontractors to send to
   - Due date for response
   - Message/notes
4. Procore sends email notification to collaborators
5. Collaborators submit quotes via the Procore portal OR the GC enters quotes on their behalf

### 6.3 RFQ Statuses

| Status | Meaning |
|---|---|
| **Draft** | Created but not sent |
| **Open** | Sent and awaiting response |
| **Revise and Resubmit** | Reviewer needs more information |
| **Pending Final Approval** | Quote submitted, under review |
| **Accepted** | Quote accepted |
| **Rejected** | Quote rejected |

### 6.4 RFQ Prerequisites

- A Commitment must exist on the project (enables the RFQ feature)
- The subcontractor must be listed as an employee of the "Contract Company" on the commitment
- The subcontractor must be in the commitment's "Private" list

### 6.5 RFQ → PCO Flow

After reviewing RFQ responses:
- Select line items
- Use "Add to" → New Prime PCO or New Commitment PCO
- Procore auto-populates the SOV with the selected change event line item values

---

## 7. Workflows & Business Rules

### 7.1 Status Lifecycle

```
Open ←→ Closed
```

Change Events have a simple status model:
- **Open** is the default and working state
- **Closed** means the event is resolved (either actioned via PCOs or determined to have no impact)
- Status can be manually changed; no approval workflow on Change Events themselves

### 7.2 Scope → Budget ROM Rules

The **Configure Settings** for Change Events lets admins define how Budget ROM is applied based on scope:

| Scope Value | Budget ROM Behavior (configurable) |
|---|---|
| **In Scope** | Configurable: include or exclude from Budget ROM |
| **Out of Scope** | Configurable: include or exclude from Budget ROM |
| **TBD** | Configurable: include or exclude from Budget ROM |

**Budget ROM options per scope** (from RAG "Configure Settings: Change Events"):
- Do not show in Budget
- Show Cost ROM
- Show Revenue ROM
- Show both

### 7.3 Revenue ROM Calculation Logic

The `Line Item Revenue Source` field controls how Revenue ROM is auto-calculated:

| Setting | Behavior |
|---|---|
| **Match Revenue to Latest Cost** | Revenue ROM auto-updates to match Cost ROM |
| **Match Revenue to Latest Price** | Revenue ROM auto-updates to match Latest Price (includes Prime PCO markups) |
| **Manual Entry** | User enters Revenue ROM directly on each line item |

### 7.4 "Add to" Business Rules

When using the "Add to" menu:
- **Creating a Prime PCO**: The prime contract must be in "Approved" status; project must use 2-tier or 3-tier change order configuration
- **Creating a Commitment PCO**: Must have an existing commitment; 2-tier configuration creates PCO, 1-tier skips PCO and creates CCO directly
- **Adding to existing PCO**: Can only add to Prime PCOs that are NOT in "Approved" status

### 7.5 Budget Impact Rules

- Change Event Cost ROM and Revenue ROM columns can be **added to Budget Views**
- When a Budget Change is created from a Change Event, the budget is updated
- **Important Procore setting:** "Prevent Budget Changes and Prime Change Orders on the Same Change Event Line Item" — if enabled, a line item cannot be used to create both a Budget Change AND a Prime Contract PCO

### 7.6 Commitment Change Order Line Item Behavior

From RAG:
> "Change Event line items by default will pass the **latest cost amount** to the Commitment Change Order Schedule of Values. If a **Prime Contract Change Order** was associated with that Change Event Line item *before* the creation of the Commitment Change Order, the Change Event line item will then **pass the Latest Price amount** to the Commitment Change Order Schedule of Values."

### 7.7 Scope's Effect on Prime PCO SOV Auto-Population

When hidden Revenue ROM mode is used:
- **In Scope or TBD**: SOV on Client Contract Change Order auto-updated with **$0 value**
- **Out of Scope**: SOV on Client Contract Change Order auto-updated using **RFQ data** when RFQ status is "Pending Final Approval"

### 7.8 Sources for Creating Change Events

Change Events can be created from:
- Change Events tool directly (primary)
- From an **RFI** (via the RFI tool)
- From an **Observation** (via the Observations tool)
- From a **Meeting** action item (via the Meetings tool)
- Auto-created from a **Budget Change** (if configured)

---

## 8. User Flows

### 8.1 Create a Change Event

1. Navigate to project → **Change Events** tool
2. Click **+ Create New Change Event**
3. Fill in: Title, Origin, Type, Change Reason, Scope
4. Optionally set: Line Item Revenue Source, Prime Contract for Markup, Description
5. Click **Save**
6. On the detail view, add **Line Items**:
   - Click **+ Add Line Item**
   - Fill in: Budget Code, Description, Vendor, Contract, UOM, Quantity, Unit Cost
   - Cost ROM and Revenue ROM auto-calculate based on settings
   - Click **Update** to save
7. Optionally **Send RFQs** to subcontractors

### 8.2 Edit a Change Event

1. Navigate to Change Events list
2. Click the change event row to open detail view
3. Click **Edit** button
4. Modify any General Information fields
5. Click **Save**
6. Line items are edited directly in the line items grid (inline editing)

### 8.3 Send RFQs

1. Open a Change Event detail view
2. Click **Send RFQs**
3. Modal opens: select line items and commitment/vendor to send to
4. Set due date
5. Click **Send** — email sent to vendor/subcontractor
6. Track response in the **RFQs tab**

### 8.4 Create Prime PCO from Change Event

1. In Change Events list or detail view
2. Check the line items to include (or select the change event)
3. Click **Add to** → **New Prime Change Order/Potential Change Order**
4. Prime PCO form opens pre-populated with the change event data
5. Fill in any remaining required fields
6. Save → creates the Prime PCO linked to the Change Event

### 8.5 Create Commitment PCO from Change Event

1. In Change Events list or detail view
2. Check the line items to include
3. Click **Add to** → **New Commitment Change Order/Potential Change Order**
4. Select the commitment to associate with
5. Commitment PCO is created with line items from the Change Event

### 8.6 Create Budget Change from Change Event

1. In Change Events list or detail view
2. Select the change event line items
3. Click **Add to** → **New Budget Change**
4. Budget Change is created linked to the Change Event; budget view updates

### 8.7 Close a Change Event

1. Open the Change Event
2. Click **Edit**
3. Change **Status** from "Open" to "Closed"
4. Save

---

## 9. Permissions

From RAG "Change Events Permissions" article (partial — full details unclear):

| Permission Level | Typical Access |
|---|---|
| **None** | No access |
| **Read Only** | View change events, read-only |
| **Standard** | Create and edit change events; send RFQs |
| **Admin** | Full access including delete, add to PCOs, configure settings |

> Creating Prime PCOs from Change Events requires **Admin** on both Change Events AND Prime Contracts tools.  
> Adding line items to existing Prime PCOs requires **Admin** on both tools.

---

## 10. Configure Settings (Admin)

The Change Events tool has a **Configure Settings** page (Admin-only) with:

### 10.1 General Settings
- **Auto-include RFQ attachments in Commitment Change Orders** — when enabled, attachments from linked RFQ responses are automatically included in new commitment change orders

### 10.2 Budget ROM Settings

Three configurable settings (one per scope value):
- **Budget ROM for In Scope** — choose: Do not show / Show Cost ROM / Show Revenue ROM / Show Both
- **Budget ROM for Out of Scope** — same options
- **Budget ROM for TBD Scope** — same options

### 10.3 Prevention Setting
- **Prevent Budget Changes and Prime Change Orders on the Same Change Event Line Item** — if enabled, a line item cannot generate both a Budget Change and a Prime PCO

---

## 11. Financial Columns Summary

The Change Events tool provides these key financial columns (some visible in budget views):

| Column | Description |
|---|---|
| **Cost ROM** | Rough Order of Magnitude cost estimate |
| **Revenue ROM** | Rough Order of Magnitude revenue estimate |
| **Non-Committed Cost** | Cost impact not yet tied to a commitment |
| **Latest Price** | Cost after Prime PCO markup applied |
| **Prime PCO** | Number of linked Prime Potential Change Order |
| **RFQ** | Linked Request for Quote |

These columns can be **added to Budget Views** to show ROM impact alongside the budget.

---

## 12. Procore Research Sources

### RAG Queries Run

| Query | Top Score | Quality |
|---|---|---|
| "change events toolbar actions create button options" | 47.7% | Low — generic results |
| "change events Add To menu create prime PCO commitment" | 54.5% | Good — strong "Add to" detail |
| "what statuses does a change event go through" | 57.5% | Good — confirmed Open/Closed |
| "how does change events relate to budget prime contracts" | 61.0% | Strong — budget relationships |
| "change events RFQ request for quote send subcontractors" | 61.1% | Strong — RFQ workflow |
| "change events configure settings budget ROM scope" | 66.2% | Strong — Budget ROM config |
| "change events revenue ROM cost ROM line item revenue source" | 56.1% | Good — financial calculations |
| "change events scope types TBD in scope out of scope" | 47.7% | Low — generic results |
| "change events view columns list all available data fields" | 53.9% | Good — column lists |

### Manifest Sections Used

- `states.list` — Column groups, columns, filter groups (strong)
- `states.create-form` — All form fields and sections (strong)
- `states.detail-add-to-dropdown` — Revenue and Cost columns in detail view (strong)
- `states.detail-send-rfqs` — RFQ send context (moderate)
- `manifest-add-to-workflow.json` — Add to dropdown workflow options (partial)
- `prime-pco-form-fields.json` — Prime PCO form (sparse — only "Search" field captured)

### Key Articles Referenced

- "About Change Events" — https://v2.support.procore.com/process-guides/about-change-events
- "Create Change Events" — https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events
- "View the Change Events Line Items View" — https://v2.support.procore.com/product-manuals/change-events-project/tutorials/view-the-change-events-line-items-view
- "Configure Settings: Change Events" — https://v2.support.procore.com/product-manuals/change-events-project/tutorials/configure-advanced-settings-change-events
- "Create a Prime PCO from a Change Event" — https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-prime-potential-change-order-from-a-change-event
- "Create RFQs from a Change Event" — https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-rfqs-from-a-change-event
- "Owner Financial Management User Guide: Change Events" — strong context for overall workflow

---

## 13. Gaps & Uncertainties

The following items are **unclear or require verification** beyond what manifest + RAG provided:

| Gap | Where to Verify |
|---|---|
| **Exact Type and Change Reason options** | Company-configurable; run `node scripts/playwright-crawl/procore-deep-crawl.js change-events` with form open and dropdowns expanded |
| **Exact Origin options** | Same — configurable per company |
| **Recycle Bin tab** | Check DOM of detail view — unclear if Change Events has it |
| **Row-level actions in list view** | Manifest `rowActions` was empty; likely Edit/Delete/Send RFQs but needs live verification |
| **Whether status has more values** | Some project configurations may add more statuses; planning artifacts listed more but RAG research confirms Open/Closed |
| **Detail view tabs exact order/names** | Manifest detail state was not captured; tabs (Summary, Line Items, RFQs, History) inferred from implementation research |
| **Print/Export options** | List view toolbar didn't capture these; confirm via DOM or live crawl |
| **Unit-based columns (Quantity/Unit Cost) enabled by default?** | Setting exists to enable/disable; default state unclear |

---

## 14. Quality Gate Checklist

- [x] Manifest read and all key sections verified
- [x] Mandatory 4 RAG queries run
- [x] Feature-specific RAG queries run (9 total)
- [x] Every list column documented with exact label
- [x] Every form field documented: label, type, required, default
- [x] Line items grid columns fully documented
- [x] All "Add to" menu options documented from RAG
- [x] RFQ workflow fully documented
- [x] Status values documented (with conflict resolution vs. planning artifacts)
- [x] Scope values and their Budget ROM implications documented
- [x] Revenue ROM calculation logic documented
- [x] Financial calculation rules documented
- [x] Relationships to Budget, Prime Contracts, Commitments, RFIs documented
- [x] Configure Settings section documented
- [x] User flows for Create, Edit, Send RFQ, Add to PCO, Close documented
- [x] Gaps and uncertainties explicitly noted
- [x] Procore's exact terminology used throughout
- [x] `TASKS.md` placeholder created

**Confidence Score: 9/10**

Missing 1 point for: exact Type/Change Reason/Origin dropdown values (company-configurable, not captured in manifest dropdown options), and the detail view tabs were not directly captured in the manifest (inferred from implementation research).

---

*Ready for `/prp:prp-audit` — next step is gap analysis against current codebase and DB schema.*
