# TASKS: Commitments

- Procore Commitments (Subcontracts + Purchase Orders)prime-contracts
- Status: In Progress
- PM Session: 2026-01-10

## Implementation Summary

| Phase | Status | Progress |
| ------- | -------- | ---------- |
| Phase 1: Database & Schema | . | . |
| Phase 2: API Routes | IN PROGRESS | - |
| Phase 3: Core UI Pages | IN PROGRESS | - |
| Phase 4: Components & Features | IN PROGRESS | - |
| Phase 5: Testing & Verification | IN PROGRESS | Commitments detail tabs verified |

### Pages

| Page | Status | Priority |
| ------- | -------- | ---------- |
| Commitments List | ✅ Done | - |
| Commitment Detail | ✅ Done (6 tabs: Overview, Financial, Schedule, Change Orders, Invoices, Attachments) | - |
| Create Subcontract | ✅ Done | - |
| Create Purchase Order | ✅ Done | - |
| Edit Subcontract | [ ] | MEDIUM |
| Edit Purchase Order | [ ] | MEDIUM |
| Recycle Bin | ✅ VERIFIED 2026-01-10 | - |
| Configure Settings | [ ] | LOW |

### Database Tables

| Table | Status |
| ------- | -------- |
| subcontracts | [x] Done |
| purchase_orders | [x] Done |
| commitments_unified | [x] Done |
| subcontract_sov_items | [x] Done |
| purchase_order_sov_items | [x] Done |
| subcontract_attachments | [ ] |
| commitment_change_order_lines | [ ] |

### API Routes (11 endpoints)

| Endpoint | Status |
| ------- | -------- |
| GET /api/commitments | [x] Done (pagination, filters, search) |
| GET /api/commitments/[id] | [x] Done (detail with related data) |
| POST /api/commitments | [x] Done (create with validation) |
| PUT /api/commitments/[id] | [x] Done (update with authorization) |
| DELETE /api/commitments/[id] | [x] Done (soft delete with deleted_at) |
| GET /api/commitments/[id]/change-orders | [x] Done |
| GET /api/commitments/[id]/invoices | [x] Done |
| GET /api/commitments/[id]/attachments | [x] Done |
| POST /api/commitments/[id]/attachments | [x] Done |
| DELETE /api/commitments/[id]/attachments/[id] | [x] Done |
| POST /api/commitments/[id]/restore | [x] Done VERIFIED 2026-01-10 |

---

## Current Blockers

None identified.

## Master Task List

### SECTION 1: List Page Enhancement

#### Reference

- Screenshot: `procore-crawl-output/pages/commitments/screenshot.png`
- Metadata: `procore-crawl-output/pages/commitments/metadata.json`

### 1.1 Table Columns (Procore Parity)

- [x] Number (clickable link)
- [x] Title
- [x] Contract Company
- [x] Status
- [x] Type (Subcontract/PO)
- [x] Original Contract Amount
- [x] Revised Contract Amount
- [x] ERP Status IMPLEMENTED (needs DB data)
- [x] Executed (Yes/No) IMPLEMENTED
- [x] SSOV Status IMPLEMENTED (needs DB data)
- [x] Approved Change Orders IMPLEMENTED (needs DB aggregation)
- [x] Pending Change Orders IMPLEMENTED (needs DB aggregation)
- [x] Draft Change Orders IMPLEMENTED (needs DB aggregation)
- [x] Invoiced Amount IMPLEMENTED (needs DB aggregation)
- [x] Payments Issued IMPLEMENTED (needs DB aggregation)
- [x] % Paid IMPLEMENTED (needs calculation)
- [x] Remaining Balance Outstanding IMPLEMENTED (needs calculation)
- [x] Private (Yes/No) IMPLEMENTED

### 1.2 Table Features

- [x] Row selection (checkboxes)
- [x] Sorting
- [x] Search
- [x] Pagination
- [x] Row grouping ("Select a column to group") IMPLEMENTED 2026-01-10
- [x] Column configuration (show/hide columns) IMPLEMENTED 2026-01-10
- [ ] Column reordering (drag & drop)
- [x] Grand totals footer row IMPLEMENTED 2026-01-10

### 1.3 Filters Panel

- [x] Status filter
- [x] Type filter (Subcontract/PO)
- [ ] Contract Company filter
- [ ] ERP Status filter
- [ ] Executed filter
- [ ] SSOV Status filter
- [ ] Clear All Filters button
- [ ] Individual filter clear buttons

### 1.4 Header Actions

- [x] Create dropdown (Subcontract/PO options)
- [ ] Export dropdown (CSV, PDF, Excel)
- [ ] Recycle Bin link
- [ ] More menu
- [ ] Help link

### 1.5 Row Actions

- [x] View action
- [x] Edit action
- [x] Delete action
- [ ] Download PDF action
- [ ] Duplicate action

### Test Requirements (Section 1)

Test file: frontend/tests/e2e/commitments-list.spec.ts
Coverage:

- [ ] All columns render with data
- [ ] Grand totals calculate correctly
- [ ] Row grouping works
- [ ] Column show/hide works
- [ ] Export buttons functional
- [ ] Filters work correctly

---

### SECTION 2: Commitment Detail Page

### Reference

- Screenshot: `procore-crawl-output/pages/562949957166626/screenshot.png`
- Tabs visible in Procore: General, SOV, Change Orders, Invoices, Attachments

### 2.1 Header Section

- [x] Commitment number display
- [x] Title display
- [x] Status badge with workflow actions
- [x] Contract company display
- [x] Created/Updated timestamps
- [ ] Private indicator

### 2.2 Tabs Implementation

- [x] General Info tab (labeled "Overview")
- [x] Schedule of Values (SOV) tab (labeled "Schedule")
- [x] Change Orders tab VERIFIED (commitments-detail-tabs report)
- [x] Invoices tab VERIFIED (commitments-detail-tabs report)
- [x] Attachments tab VERIFIED (commitments-detail-tabs report)
- [ ] Advanced Settings tab
- [x] Financial tab (exists, not in Procore)

### 2.3 General Info Section

- [x] Contract information display
- [x] Dates section (Start, Estimated Completion, Actual Completion)
- [x] Financial summary (Original, Approved COs, Revised, Invoiced, Payments)
- [x] Inclusions/Exclusions (rich text display)
- [x] Description (rich text display)

### 2.4 Schedule of Values (SOV) Section

- [x] Line items table
- [x] Add line item functionality (inline editor)
- [x] Edit line item inline
- [x] Delete line item
- [x] Budget code display
- [x] Amount calculations
- [x] Billed to Date (read-only)
- [x] Amount Remaining (calculated)
- [ ] Drag to reorder lines

### 2.5 Action Buttons

- [x] Edit button
- [ ] Email button
- [ ] Download PDF button
- [ ] More actions dropdown
- [x] Delete button (hard delete - needs soft delete)

### Files to Create

- [x] frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx
- [x] frontend/src/components/commitments/CommitmentDetailHeader.tsx
- [x] frontend/src/components/commitments/CommitmentTabs.tsx
- [x] frontend/src/components/commitments/tabs/GeneralInfoTab.tsx
- [x] frontend/src/components/commitments/tabs/ScheduleOfValuesTab.tsx
- [x] frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx
- [x] frontend/src/components/commitments/tabs/InvoicesTab.tsx
- [x] frontend/src/components/commitments/tabs/AttachmentsTab.tsx

### Test Requirements (Section 2)

Test file: frontend/tests/e2e/commitments-detail-tabs.spec.ts
Coverage:

- [x] Page loads with commitment data
- [x] All tabs render and switch
- [x] SOV line items display
- [ ] Financial calculations correct
- [ ] Action buttons work

---

### SECTION 3: Create/Edit Forms

#### Reference

- Form fields: `forms/Create Subcontract Commitment Form...csv`
- Screenshot: `procore-crawl-output/pages/edit-subcontract/screenshot.png`

### 3.1 Subcontract Form Fields

**Basic Information**

- [x] Title (text)
- [x] Status (select - Draft default)
- [x] Contract Company (select with search)
- [x] Contract Number (auto-generated, editable)
- [ ] Description (rich text editor)

**Flags**

- [x] Executed (checkbox)
- [ ] Private (checkbox, default checked)
- [ ] Default Retainage (percentage input)

**Accounting**

- [x] Accounting Method toggle (Amount-based vs Unit/Qty)

**Dates**

- [x] Start Date
- [x] Estimated Completion Date
- [ ] Actual Completion Date
- [ ] Contract Date
- [ ] Signed Contract Received Date
- [ ] Issued On Date

**Scope**

- [ ] Inclusions (rich text)
- [ ] Exclusions (rich text)

**Access Control**

- [ ] Access for Non-Admin Users (multi-select, conditional)
- [ ] Allow Non-Admins to View SOV (checkbox, conditional)

**Contacts**

- [ ] Invoice Contacts (multi-select, requires company selected first)

**Attachments**

- [x] File upload with drag & drop
- [x] Attachment list management

**Line Items (SOV)**

- [x] Add line item button
- [x] Line item row:
  - [x] # (auto-increment)
  - [x] Change Event Line Item (optional FK)
  - [x] Budget Code (select)
  - [x] Description (text)
  - [x] Amount (currency)
  - [x] Actions (edit/delete)

### 3.2 Purchase Order Form Fields

- [ ] Ship To (text)
- [ ] Ship Via (text)
- [ ] Bill To (text)
- [ ] Delivery Date
- [ ] Payment Terms
- [ ] Assigned To (user select)

### Files to Create/Modify

- frontend/src/app/[projectId]/commitments/new/page.tsx
- frontend/src/components/commitments/SubcontractForm.tsx
- frontend/src/components/commitments/PurchaseOrderForm.tsx
- frontend/src/components/commitments/SOVLineItemsEditor.tsx
- frontend/src/components/commitments/AttachmentsManager.tsx
- frontend/src/lib/schemas/subcontract-schema.ts (update)
- frontend/src/lib/schemas/purchase-order-schema.ts (update)

### Test Requirements (Section 3)

Test file: frontend/tests/e2e/commitments-create.spec.ts
Coverage:

- [ ] Subcontract form renders all fields
- [ ] Purchase order form renders all fields
- [ ] Validation works correctly
- [ ] Conditional fields show/hide
- [ ] Line items CRUD works
- [ ] Form submits successfully

---

## SECTION 4: Configuration Page

#### Reference

- Screenshot: `procore-crawl-output/pages/configure_tab/screenshot.png`
- Metadata: `procore-crawl-output/pages/configure_tab/metadata.json` (81 form fields!)

### 4.1 General Settings

- [ ] Contracts Private By Default (checkbox)
- [ ] Enable Purchase Orders (checkbox)
- [ ] Enable Subcontracts (checkbox)
- [ ] Number of Commitment Change Order Tiers (select)
- [ ] Allow Standard Level Users to Create CCOs (checkbox)
- [ ] Allow Standard Level Users to Create CORs (checkbox)
- [ ] Allow Standard Level Users to Create PCOs (checkbox)
- [ ] Enable Always Editable Schedule of Values (checkbox)
- [ ] Enable Field Initiated Change Orders (checkbox)
- [ ] Show Financial Markup on CO PDFs (checkbox)

### 4.2 Distribution Settings

- [ ] Include Primary Contact in Default Distribution (checkbox)
- [ ] Commitment Distribution (multi-select users)
- [ ] Commitment Change Order Distribution
- [ ] Commitment Change Order Request Distribution
- [ ] Commitment Potential Change Order Distribution
- [ ] Request For Quote Distribution
- [ ] Invoice Distribution

### 4.3 Defaults

- [ ] Default Accounting Method for Purchase Orders (select)
- [ ] Default Accounting Method For Subcontracts (select)
- [ ] Default Purchase Order Retainage Percent (number)
- [ ] Default Subcontract Retainage Percent (number)
- [ ] Enable Comments By Default (checkbox)
- [ ] Enable Completed Work Retainage By Default
- [ ] Enable Financial Markup By Default
- [ ] Enable Payments By Default
- [ ] Enable Invoices by Default
- [ ] Show Cost Codes on Invoice PDF by Default
- [ ] Enable Stored Material Retainage By Default
- [ ] Enable Subcontractor SOV By Default

### 4.4 Billing Period Settings

- [ ] Enable Prefilled Billing Periods (checkbox)
- [ ] Monthly Billing Period (start day select)
- [ ] Monthly Billing Period (end day select)
- [ ] Monthly Due Date (day select)
- [ ] Enable Reminder Emails (checkbox)
- [ ] Reminder Interval (select)
- [ ] Allow Over Billing (checkbox)
- [ ] Custom Email Text (textarea)
- [ ] Receive Email Digest of Unapproved Invoices (checkbox)
- [ ] Invoice PDF Footer Text (textarea)
- [ ] Send Notification Emails when Invoices Approved (checkbox)
- [ ] Enable Subcontractor Proposed Amount (checkbox)

### Files to Create

- frontend/src/app/[projectId]/commitments/configure/page.tsx
- frontend/src/components/commitments/settings/GeneralSettingsSection.tsx
- frontend/src/components/commitments/settings/DistributionSettingsSection.tsx
- frontend/src/components/commitments/settings/DefaultsSection.tsx
- frontend/src/components/commitments/settings/BillingSettingsSection.tsx

### Test Requirements (Section 4)

Test file: frontend/tests/e2e/commitments-config.spec.ts
Coverage:

- [ ] All settings render
- [ ] Changes save correctly
- [ ] Multi-select user fields work
- [ ] Settings persist after refresh

---

### SECTION 5: Recycle Bin

#### Reference

- Screenshot: `procore-crawl-output/pages/recycled/screenshot.png`

### Tasks

- [ ] List deleted commitments
- [ ] Restore functionality
- [ ] Permanent delete functionality
- [ ] Filter by type
- [ ] Sort by deleted date

### Files to Create

- frontend/src/app/[projectId]/commitments/recycled/page.tsx

### Test Requirements (Section 5)

Test file: frontend/tests/e2e/commitments-recycle.spec.ts
Coverage:

- [ ] Deleted items appear in bin
- [ ] Restore works
- [ ] Permanent delete works
- [ ] Filtering works

---

### SECTION 6: API Implementation

### 6.1 List Endpoint

- [ ] Pagination support
- [ ] Filtering by status, type, company
- [ ] Sorting
- [ ] Search
- [ ] Include related data (company, totals)

### 6.2 Detail Endpoint

- [ ] Return full commitment data
- [ ] Include SOV line items
- [ ] Include change orders
- [ ] Include invoices
- [ ] Include attachments

### 6.3 Create Endpoint

- [ ] Validate required fields
- [ ] Generate contract number
- [ ] Create SOV line items
- [ ] Handle attachments
- [ ] Return created commitment

### 6.4 Update Endpoint

- [ ] Partial updates
- [ ] Validate status transitions
- [ ] Update SOV line items
- [ ] Manage attachments
- [ ] Audit logging

### 6.5 Delete Endpoint

- [ ] Soft delete (move to recycle bin)
- [ ] Set deleted_at timestamp
- [ ] Preserve relationships

### 6.6 Restore Endpoint

- [ ] Clear deleted_at timestamp
- [ ] Restore relationships

### Files to Create/Modify

```
frontend/src/app/api/commitments/route.ts
frontend/src/app/api/commitments/[id]/route.ts
frontend/src/app/api/commitments/[id]/restore/route.ts
```

### Database Changes (spawn supabase-architect)

```
- Add deleted_at column to subcontracts
- Add deleted_at column to purchase_orders
- Update commitments_unified view
```

### Test Requirements (Section 6)

Test file: frontend/tests/e2e/commitments-api.spec.ts
Coverage:

- [ ] List endpoint returns correct data
- [ ] Detail endpoint includes all relations
- [ ] Create returns new commitment
- [ ] Update modifies correctly
- [ ] Delete soft-deletes
- [ ] Restore works

---

## SECTION 7: Testing & Verification

### 7.1 Unit Tests

- [ ] Hook tests (use-commitments.ts)
- [ ] Utility function tests
- [ ] Schema validation tests

### 7.2 E2E Tests

- [x] Commitments page loads (partial - existing specs)
- [ ] Create subcontract flow
- [ ] Create purchase order flow
- [ ] Edit commitment flow
- [ ] Delete commitment flow
- [ ] Filter functionality
- [ ] Search functionality
- [ ] Export functionality
- [ ] Recycle bin operations

### 7.3 Visual Regression Tests

- [ ] List page screenshot comparison with Procore
- [ ] Detail page screenshot comparison
- [ ] Form states screenshot comparison

---

## SECTION 8: Integration

### 8.1 Budget Integration

- [ ] Budget code selection in line items
- [ ] Sync commitment amounts to budget
- [ ] Budget impact calculations

### 8.2 Change Order Integration

- [ ] Link change orders to commitments
- [ ] Calculate approved CO totals
- [ ] Display pending/draft COs

### 8.3 Invoice Integration

- [ ] Link invoices to commitments
- [ ] Calculate invoiced amounts
- [ ] Calculate payment amounts

---

## Execution Order (Recommended)

Work through sections in this order for best results:

| Order | Section | Why |
|-------|---------|-----|
| 1 | Section 6: API | Backend must exist before frontend can consume it |
| 2 | Section 2: Detail Page | Core feature, high value |
| 3 | Section 3: Forms | Depends on API and patterns from detail page |
| 4 | Section 1: List Enhancement | Lower priority enhancements |
| 5 | Section 5: Recycle Bin | Depends on delete API |
| 6 | Section 4: Config | Nice to have, lower priority |
| 7 | Section 8: Integration | Last, depends on other features |
| 8 | Section 7: Testing | Ongoing throughout, final verification |

---

## Progress Summary

| Category | Complete | Total | Percentage |
|----------|----------|-------|------------|
| Pages | 1 | 8 | 12.5% |
| Forms | 2 | 6 | 33% |
| Database | 5 | 7 | 71% |
| API Routes | 0 | 6 | 0% |
| List Features | 8 | 28 | 29% |
| Detail Page | 0 | 20 | 0% |
| Create/Edit Forms | 8 | 35 | 23% |
| Config Page | 0 | 30 | 0% |
| Testing | 1 | 12 | 8% |

**Overall Estimated Completion: ~22%**
