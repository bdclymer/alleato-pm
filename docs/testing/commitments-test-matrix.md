# Commitments — Procore Feature Test Matrix

**Generated:** 2026-04-07
**Source:** Procore documentation (Supabase RAG — 40 docs retrieved)
**Tool:** commitments
**Purpose:** Comprehensive testing checklist to verify all Procore Commitments features are
             implemented and working in Alleato PM.

---

## How to Use This Document

- Work through each section systematically
- Mark each test: ✅ Pass | ❌ Fail | ⏭️ Skip (not applicable) | 🔲 Not tested
- For failures, note the issue in the "Notes" column
- Priority: HIGH items block release; MEDIUM reduce quality; LOW are polish

---

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 16 | HIGH |
| Views & Navigation | 12 | HIGH/MEDIUM |
| Fields & Data | 15 | HIGH/MEDIUM |
| Statuses & Workflows | 7 | HIGH |
| Schedule of Values | 6 | HIGH |
| Subcontractor SOV | 4 | HIGH |
| Change Orders | 6 | HIGH/MEDIUM |
| Invoices | 3 | HIGH |
| Payments Issued | 3 | HIGH |
| RFQs | 1 | MEDIUM |
| Collaboration | 4 | MEDIUM |
| Change History | 1 | MEDIUM |
| Privacy | 2 | MEDIUM |
| Settings & Config | 2 | LOW/MEDIUM |
| ERP Integration | 2 | HIGH/MEDIUM |
| Financial KPIs | 2 | HIGH |
| Pagination | 2 | MEDIUM/LOW |
| **TOTAL** | **89** | |

---

## 1. Core Actions

> Source: Procore Commitments documentation — Create, Edit, Delete, Export

### 1.1 Create Subcontract

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a new Subcontract with required fields only | 1. Navigate to /67/commitments<br>2. Click Create → Subcontract<br>3. Fill Contract Number, Title, Contract Company<br>4. Click Create | Subcontract appears in list with correct number and status Draft | HIGH | 🔲 | |
| 1.1.2 | Create a Subcontract with all optional fields | Fill all fields including dates, retention %, accounting method, assignee, inclusions, exclusions | All fields saved correctly and visible on detail page | MEDIUM | 🔲 | |
| 1.1.3 | Create Subcontract fails with missing required fields | Leave required fields blank → Click Create | Validation errors shown, form not submitted | HIGH | 🔲 | |

### 1.2 Create Purchase Order

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.4 | Create a new Purchase Order with required fields | 1. Click Create → Purchase Order<br>2. Fill Contract Number, Title, Contract Company<br>3. Click Create | PO appears in list with type Purchase Order and status Draft | HIGH | 🔲 | |
| 1.1.5 | Create a Purchase Order with all optional fields | Fill all fields including Delivery Date, retention, accounting method | All fields saved and visible on PO detail page | MEDIUM | 🔲 | |
| 1.1.6 | Create Purchase Order fails with missing required fields | Leave required fields blank → Submit | Validation errors shown, form not submitted | HIGH | 🔲 | |

### 1.3 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit an existing commitment — change title | 1. Open commitment<br>2. Click Edit<br>3. Change Title<br>4. Save | Title updated on detail page and list after refresh | HIGH | 🔲 | |
| 1.2.2 | Edit commitment — change status | Open Draft commitment → Edit → Change status to Approved → Save | Status badge updates to Approved | HIGH | 🔲 | |
| 1.2.3 | Edit — cancel discards changes | Open commitment → Edit → Change field → Cancel | Changes not saved, original data shown | HIGH | 🔲 | |
| 1.2.4 | Edit advanced settings | Advanced Settings tab → modify accounting method or retention → Save | Advanced settings saved correctly | MEDIUM | 🔲 | |

### 1.4 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a single commitment | Row action menu → Delete → Confirm | Commitment removed from list (or moved to Recycle Bin) | HIGH | 🔲 | |
| 1.3.2 | Bulk delete selected commitments | Select 2+ commitments → Bulk Delete → Confirm | All selected commitments deleted, success toast shown | HIGH | 🔲 | |
| 1.3.3 | Cancel delete — commitment preserved | Click Delete → Click Cancel in dialog | Commitment still in list, no change | HIGH | 🔲 | |

### 1.5 Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Export commitment list (CSV/PDF) | Toolbar export icon → Select format → Confirm | File downloads with commitment data | MEDIUM | 🔲 | |
| 1.4.2 | Export single commitment document | Detail page → Download icon → Select format | Document downloaded with commitment details | MEDIUM | 🔲 | |
| 1.4.3 | Email a commitment document | Detail page → Mail icon → Fill recipient → Send | Email sent confirmation shown | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: Procore documentation — Commitments Tool overview, tabs, filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1 | Commitments list view loads with correct columns | Navigate to /67/commitments | Table renders with columns: Number, Contract Company, Title, Status, Executed, Original Contract Amount, Approved COs, Revised Contract Amount, Pending COs, Invoiced, Payments Issued, % Paid, Remaining Balance | HIGH | 🔲 | |
| 2.2 | Commitment detail view loads | Click any commitment row | Detail page renders with KPI strip and tabbed sections | HIGH | 🔲 | |
| 2.3 | Filter by Subcontracts tab | Click Subcontracts tab | Only subcontract-type commitments shown | HIGH | 🔲 | |
| 2.4 | Filter by Purchase Orders tab | Click Purchase Orders tab | Only POs shown | HIGH | 🔲 | |
| 2.5 | Recycle Bin tab shows deleted commitments | Click Recycle Bin tab | Lists soft-deleted commitments | MEDIUM | 🔲 | |
| 2.6 | Search by title or number | Type commitment number in search box | Results filter to matching commitments | HIGH | 🔲 | |
| 2.7 | Filter by Status | Open filters → Select Draft | Only Draft commitments shown | MEDIUM | 🔲 | |
| 2.8 | Filter by Type | Open filters → Select Purchase Order | Only POs shown | MEDIUM | 🔲 | |
| 2.9 | Sort by column header | Click Number column header then again | Rows reorder ascending then descending | MEDIUM | 🔲 | |
| 2.10 | Switch to card view | Click card view toggle | Commitments displayed as cards | LOW | 🔲 | |
| 2.11 | Switch to list view | Click list view toggle | Commitments displayed as compact list | LOW | 🔲 | |
| 2.12 | Toggle column visibility | Column visibility menu → Hide/show a column | Column appears/disappears from table | LOW | 🔲 | |

---

## 3. Fields & Data

> Source: Procore commitment form field documentation, manifest.json

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Contract Number | Text | Yes | Saves and displays in list | — | HIGH | 🔲 |
| 3.1.2 | Title | Text | Yes | Visible in list and detail | Blank → validation error | HIGH | 🔲 |
| 3.1.3 | Contract Company | Select/Dropdown | Yes | Company name saved to detail | — | HIGH | 🔲 |
| 3.1.4 | Description | Textarea | No | Saves multi-line text | — | MEDIUM | 🔲 |
| 3.1.5 | Start Date | Date (subcontract only) | No | Saves and shown under Key Dates | — | MEDIUM | 🔲 |
| 3.1.6 | Estimated Completion / Delivery Date | Date | No | Saves and shown under Key Dates | — | MEDIUM | 🔲 |
| 3.1.7 | Contract Date (Executed Date) | Date | No | Saves and shown under Key Dates | — | MEDIUM | 🔲 |
| 3.1.8 | Retention % | Number | No | Shows 10% on detail | — | MEDIUM | 🔲 |
| 3.1.9 | Accounting Method | Select | No | Saves selection (Amount/Unit/Percent) | — | MEDIUM | 🔲 |
| 3.1.10 | Assignee | User Select | No | Assignee name shown in Contract Settings | — | MEDIUM | 🔲 |
| 3.1.11 | Inclusions | Textarea | No | Collapsible section appears on detail | — | LOW | 🔲 |
| 3.1.12 | Exclusions | Textarea | No | Collapsible section appears on detail | — | LOW | 🔲 |
| 3.1.13 | Private | Toggle | No | Visibility shows "Private" | — | MEDIUM | 🔲 |

### 3.2 List Table Columns

| # | Column | Test: Renders | Test: Data Accurate | Priority | Result |
|---|--------|--------------|-------------------|---------|--------|
| 3.2.1 | Original Contract Amount | Renders in table | Matches value entered at creation | HIGH | 🔲 |
| 3.2.2 | Revised Contract Amount | Renders in table | Equals Original + Approved COs | HIGH | 🔲 |
| 3.2.3 | Footer totals row | Renders at bottom | Shows column sums | HIGH | 🔲 |

---

## 4. Statuses & Workflows

> Source: Procore commitment status documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1 | Create commitment defaults to Draft | Create any commitment | Status badge shows Draft | HIGH | 🔲 | |
| 4.2 | Set status to Out for Bid | Edit → Change status to Out for Bid → Save | Status badge updates | HIGH | 🔲 | |
| 4.3 | Set status to Approved | Edit → Change status to Approved → Save | Status badge updates | HIGH | 🔲 | |
| 4.4 | Set status to Complete | Edit → Change status to Complete → Save | Status badge updates | HIGH | 🔲 | |
| 4.5 | Set status to Void | Edit → Change status to Void → Save | Status badge updates | MEDIUM | 🔲 | |
| 4.6 | Executed flag marks contract as executed | Edit → Set Executed to Yes → Save | Executed column shows Yes in list | MEDIUM | 🔲 | |
| 4.7 | ERP Status column reflects sync state | Sync with ERP → View list | ERP Status column shows synced state | MEDIUM | 🔲 | |

---

## 5. Schedule of Values (SOV)

> Source: "Add a Line Item to a Commitment's Schedule of Values", import documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1 | Add a line item to SOV in Draft status | SOV tab → Add line item with description and amount → Save | Line item in SOV table with correct amount | HIGH | 🔲 | |
| 5.2 | SOV total equals sum of line items | Add multiple line items → View SOV Total | SOV Total matches sum of all line items | HIGH | 🔲 | |
| 5.3 | Edit an existing SOV line item | SOV tab → Edit line item → Change amount → Save | Changes reflected in SOV table | HIGH | 🔲 | |
| 5.4 | Delete a SOV line item | SOV tab → Delete line item | Line item removed, total recalculated | HIGH | 🔲 | |
| 5.5 | Import SOV line items from file | SOV tab → Click Import → Upload CSV/Excel | Line items appear in SOV after import | MEDIUM | 🔲 | |
| 5.6 | Unit/Quantity accounting method shows qty and unit cost columns | Create commitment with Unit/Quantity → Open SOV | Quantity, UOM, and Unit Cost columns visible | MEDIUM | 🔲 | |

---

## 6. Subcontractor SOV

> Source: "Add a Subcontractor SOV to a Commitment"

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.1 | Subcontractor SOV tab only on Subcontracts | Open Subcontract vs Purchase Order | SSOV tab on Subcontract only — NOT on PO | HIGH | 🔲 | |
| 6.2 | Add line items to Subcontractor SOV and submit | Open Subcontract → SSOV tab → Add line items allocating full amount → Submit | SSOV status changes to Under Review | HIGH | 🔲 | |
| 6.3 | SSOV submit button disabled until Remaining to Allocate = $0 | Add SSOV items that do not fully allocate → Try to submit | Submit button disabled until all amounts reach $0 | HIGH | 🔲 | |
| 6.4 | SSOV tab count shown in tab label | Add SSOV line items → View detail tabs | Tab label shows count in parentheses | LOW | 🔲 | |

---

## 7. Change Orders

> Source: "Create a Commitment Change Order", "Approve or Reject Commitment Change Orders", "Add Financial Markup to Commitment Change Orders"

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1 | Change Orders tab shows COs linked to commitment | Open commitment → Change Orders tab | List of COs shown | HIGH | 🔲 | |
| 7.2 | Create a Commitment Change Order | Open commitment → Create → Change Event → Create CCO | CCO appears in Change Orders tab with Draft status | HIGH | 🔲 | |
| 7.3 | Approved COs add to Revised Contract Amount | Approve a CCO → View KPI strip | Revised = Original + Approved CO total | HIGH | 🔲 | |
| 7.4 | Approve or Reject a CCO | Open CCO in Pending - In Review → Approve or Reject | CCO status changes, notification sent to creator | HIGH | 🔲 | |
| 7.5 | Delete a Commitment Change Order | Open CCO → Delete | CCO removed, totals recalculated | MEDIUM | 🔲 | |
| 7.6 | Add financial markup to a CCO | Open CCO → Add financial markup → Save | Markup distributed proportionally on line items | MEDIUM | 🔲 | |

---

## 8. Invoices

> Source: Invoicing documentation, commitment detail page tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1 | Invoices tab shows linked invoices | Open commitment detail → Invoices tab | List of invoices shown | HIGH | 🔲 | |
| 8.2 | Create invoice from commitment | Create → Invoice on commitment detail | Navigates to invoice form pre-filled with commitment data | HIGH | 🔲 | |
| 8.3 | Invoiced amount shown in list | View list after invoice created and approved | Invoiced column shows total invoiced amount | HIGH | 🔲 | |

---

## 9. Payments Issued

> Source: "Add a New Payment to the Payments Issued Tab of a Commitment"

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1 | Payments Issued tab shows linked payments | Open commitment detail → Payments Issued tab | List of payments shown | HIGH | 🔲 | |
| 9.2 | Add a payment to commitment | Create → Payment on detail → Fill details → Save | Payment appears in Payments Issued tab | HIGH | 🔲 | |
| 9.3 | % Paid column reflects payments issued | View list after payment recorded | % Paid column shows correct percentage | HIGH | 🔲 | |

---

## 10. RFQs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1 | RFQs tab shows request for quotes | Open commitment detail → RFQs tab | List of RFQs shown or empty state message | MEDIUM | 🔲 | |

---

## 11. Collaboration

> Source: Email and attachment documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.1 | Emails tab shows sent emails | Open commitment detail → Emails tab | List of emails shown | MEDIUM | 🔲 | |
| 11.2 | Send commitment document via email | Mail icon → Fill recipient → Send | Email dialog opens, send succeeds | MEDIUM | 🔲 | |
| 11.3 | Attachments tab shows attached files | Open commitment detail → Attachments tab | Attached files listed | MEDIUM | 🔲 | |
| 11.4 | Attach file at commitment creation | New commitment → Attach file → Submit | Attachment visible in Attachments tab | MEDIUM | 🔲 | |

---

## 12. Change History

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 12.1 | Change History tab records edits | Edit a commitment field → Open Change History tab | Entry showing field, old value, new value, user, timestamp | MEDIUM | 🔲 | |

---

## 13. Privacy

> Source: "Change the Privacy Settings for a Commitment", "Configure the Default Privacy Settings for New Commitments"

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 13.1 | Mark commitment as Private | Edit → Set Private to on → Save | Visibility shows Private on detail page | MEDIUM | 🔲 | |
| 13.2 | Non-Admin Can View SOV Items toggle | Edit → Toggle Allow Non-Admin View SOV Items → Save | Setting saved and reflected in Advanced Settings | LOW | 🔲 | |

---

## 14. Settings & Configuration

> Source: "Configure Advanced Settings: Commitments"

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 14.1 | Advanced Settings tab loads for both commitment types | Open Subcontract → Advanced Settings; Open PO → Advanced Settings | Tab loads for both | MEDIUM | 🔲 | |
| 14.2 | Configure page loads | Navigate to /67/commitments/configure | Configure page loads with tool-level settings | LOW | 🔲 | |

---

## 15. ERP Integration (Acumatica)

> Source: Codebase sync feature, ERP integration documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 15.1 | Sync commitments from Acumatica | Click Sync (refresh icon) in toolbar | Toast shows created/updated counts, list refreshes | HIGH | 🔲 | |
| 15.2 | ERP Status column shows correct sync state | View list after sync | ERP Status shows synced status for Acumatica-sourced commitments | MEDIUM | 🔲 | |

---

## 16. Financial KPIs

> Source: Commitment detail page codebase — FinancialKpiStrip component

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 16.1 | KPI strip shows 5 financial metrics | Open any commitment detail | 5 KPI blocks visible: Original Contract, Approved COs, Revised Contract, Billed to Date, Balance to Finish | HIGH | 🔲 | |
| 16.2 | Billed to Date KPI shows percentage context | Open commitment with invoices | Billed to Date KPI shows amount plus % of revised contract | MEDIUM | 🔲 | |

---

## 17. Pagination

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 17.1 | Pagination works on large lists | View project with 25+ commitments → Navigate to page 2 | Page 2 loads with next set of commitments | MEDIUM | 🔲 | |
| 17.2 | Per-page selector changes row count | Change per-page selector from 25 to 50 | Table updates to show 50 rows per page | LOW | 🔲 | |

---

## Sources

The following Procore documentation pages were used to generate this test matrix:

| # | Title | Category |
|---|-------|---------|
| 1 | About the Commitments Tool | Commitments |
| 2 | Add a Line Item to a Commitment's Schedule of Values | Commitments |
| 3 | Add a Subcontractor SOV to a Commitment | Commitments |
| 4 | Add Financial Markup to Commitment Change Orders | Commitments |
| 5 | Approve and Sign a Subcontract | Commitments |
| 6 | Approve or Reject Commitment Change Orders | Change Orders |
| 7 | Bulk Create Commitment Change Orders from a Change Event | Change Orders |
| 8 | Change the Privacy Settings for a Commitment | Commitments |
| 9 | Commitments Tool (Reference) | Commitments |
| 10 | Complete a Commitment Change Order with DocuSign® | Commitments |
| 11 | Complete a Commitment Contract with DocuSign® | Commitments |
| 12 | Configure Advanced Settings: Commitments | Commitments |
| 13 | Configure the Default Privacy Settings for New Commitments | Commitments |
| 14 | Configure the Number of Commitment Change Order Tiers | Commitments |
| 15 | Create a Commitment Change Order | Commitments |
| 16 | Create a Commitment Potential Change Order | Commitments |
| 17 | Delete a Commitment Change Order | Commitments |
| 18 | Delete a Commitment Synced with an Integrated ERP System | Commitments |
| 19 | Add a New Payment to the Payments Issued Tab of a Commitment | Payments |
| 20 | Automated Commitment Invoice Numbering | Invoices |
| 21 | Commitment Payments Issued (Reference) | Payments |
| 22 | Commitment Purchase Order Contracts (Reference) | General |
| 23 | Commitment Work Order Contracts (Reference) | General |
| 24 | (Beta) Create a Custom Workflow Template for Commitments | Commitments |
| 25 | Accept or Reject a Commitment for Export to ERP | ERP Integration |
| 26 | Add a Related Item to a Commitment Change Order | Change Orders |
| 27 | Add a Related Item to a Purchase Order or Subcontract (Legacy) | Commitments |
| 28 | Create a Commitment Change Order from a Change Event | Change Events |
| 29 | Add a Change Event Line Item to an Unapproved Commitment | Change Events |
| 30 | Commitment Change Events Report | Change Events |
| 31 | Commitment Purchase Order Change Orders | Change Orders |
| 32 | Commitment Work Order Change Orders | Change Orders |
| 33 | Delete a Commitment Synced with ERP | ERP Integration |
| 34 | Complete Subcontractor Invoices with DocuSign® | Invoices |
| 35 | Add Sub-Tier Subcontractor Information to Commitments | Procore Pay |
| 36 | About the Compliance Tab on a Commitment with Procore Pay | Procore Pay |
| 37 | About the Lien Rights Tab on a Commitment with Procore Pay | Procore Pay |
| 38 | Create Contract Compliance Documents for Commitments | Procore Pay |
| 39 | Create a Commitment Change Order from a Prime Contract CO | Prime Contracts |
| 40 | Add Cost ROM, RFQ & Non-Commitment Cost Source Columns | Change Events |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
