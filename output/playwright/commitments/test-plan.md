# Commitments E2E Test Plan

**Generated:** 2026-02-21
**Project ID:** 67 (Vermillion Rise Warehouse)
**Base URL:** http://localhost:3000

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Description](#feature-description)
3. [Test Data Conventions](#test-data-conventions)
4. [Test Coverage Summary](#test-coverage-summary)
5. [Detailed Test Scenarios](#detailed-test-scenarios)
6. [UI Elements & Selectors](#ui-elements--selectors)
7. [Validation Rules](#validation-rules)
8. [Existing Test Files](#existing-test-files)
9. [Database Schema](#database-schema)
10. [Running Tests](#running-tests)

---

## Overview

The Commitments feature allows project managers to create, track, and manage **Subcontracts** and **Purchase Orders** within a construction project. This comprehensive test plan covers all user workflows, UI interactions, validations, and data persistence.

### Key Capabilities

- **Two commitment types:** Subcontracts and Purchase Orders
- **Full CRUD operations:** Create, Read, Update, Delete (soft delete)
- **Schedule of Values (SOV):** Line item tracking with totals
- **Status workflow:** Draft → Pending → Approved → Executed
- **Import/Export:** CSV import for SOV line items
- **Filtering & Search:** By status, type, vendor, amount
- **Recycle Bin:** Restore soft-deleted commitments

---

## Feature Description

### Subcontracts

A subcontract is a contract with a subcontractor for work on the project.

**Key Fields:**
- Contract Number (required)
- Title (required)
- Contract Company (vendor)
- Status (Draft, Pending, Approved, Executed, Closed, Void)
- Original Amount
- Accounting Method (Amount-based, Unit Price)
- Dates (Executed, Start, Substantial Completion)
- Description
- Private (boolean)
- SOV Line Items

### Purchase Orders

A purchase order is a commitment to purchase materials or services.

**Key Fields:**
- Contract Number (required)
- Title (required)
- Contract Company (vendor)
- Status (Draft, Pending, Approved, Executed, Closed, Void)
- Original Amount
- Bill To (address)
- Ship To (address)
- Description
- Private (boolean)

---

## Test Data Conventions

| Convention | Value | Purpose |
|-----------|-------|---------|
| **Test Project ID** | 67 | Vermillion Rise Warehouse |
| **Subcontract Prefix** | `SC-E2E-*` | Identifies test subcontracts |
| **Purchase Order Prefix** | `PO-E2E-*` | Identifies test purchase orders |
| **Timestamp Pattern** | `E2E-{Date.now()}-{random}` | Ensures unique test IDs |
| **Test Title Pattern** | `Test Subcontract {testId}` | Searchable test records |
| **Authentication** | Automatic via `tests/.auth/user.json` | No manual login required |

### Test Isolation

- Each test creates its own data
- Cleanup in `beforeEach` / `afterAll` hooks
- Database verification after UI actions
- Soft deletes tested separately from hard deletes

---

## Test Coverage Summary

### Core Workflows (✅ Covered)

| Workflow | Test Files | Test Count |
|----------|-----------|------------|
| **Create Subcontract** | `commitments-crud-flows.spec.ts` | 2 tests |
| **Create Purchase Order** | `commitments-crud-flows.spec.ts` | 2 tests |
| **Edit Commitment** | `commitments-crud-flows.spec.ts`, `commitments-edit.spec.ts` | 6 tests |
| **Delete & Restore** | `commitments-crud-flows.spec.ts`, `commitments-soft-delete.spec.ts` | 8 tests |
| **SOV Line Items** | `commitments-sov-line-items.spec.ts` | 15+ tests |
| **Form Validation** | `commitment-validation.spec.ts`, `commitment-forms.spec.ts` | 10+ tests |
| **List & Filtering** | `commitments-list-page.spec.ts`, `commitments-comprehensive.spec.ts` | 12 tests |
| **Detail Tabs** | `commitments-detail-tabs.spec.ts` | 8 tests |
| **SOV Import** | `commitment-sov-import.spec.ts` | 5 tests |
| **Configuration** | `commitments-configure.spec.ts` | 3 tests |
| **Recycle Bin** | `commitments-recycle-bin.spec.ts` | 4 tests |

### UI Coverage (✅ Covered)

- Page layout and headers
- Summary cards with totals
- Status overview badges
- Search toolbar
- Create dropdown menu
- Table with columns
- Row action menus
- Form fields and dropdowns
- Tab navigation
- Mobile responsive design

---

## Detailed Test Scenarios

### 1. Create Subcontract Flow

**Test File:** `commitments-crud-flows.spec.ts`

#### Scenario 1.1: Create with Required Fields

**Steps:**
1. Navigate to commitments list page: `/67/commitments`
2. Click "Create" dropdown button
3. Select "Subcontract" option from menu
4. Verify navigation to: `/67/commitments/new?type=subcontract`
5. Wait for form heading "New Subcontract" to be visible
6. Fill required fields:
   - Contract Number: `SC-E2E-{timestamp}`
   - Title: `Test Subcontract {timestamp}`
7. Click "Create" button
8. Wait for API POST response
9. Verify navigation away from `/new` URL
10. Verify success toast appears
11. Navigate back to list page
12. Search for created commitment by contract number
13. Verify commitment appears in table

**Expected Results:**
- ✅ Form loads without errors
- ✅ Required fields accept input
- ✅ Submit triggers API POST to `/api/projects/67/commitments`
- ✅ Response status 200 or 201
- ✅ Navigation to detail or list page
- ✅ Record persists in database
- ✅ Record visible in list table

**Selectors:**
```typescript
page.getByRole('button', { name: /Create/i }).first()
page.getByRole('menuitem', { name: /Subcontract/i })
page.getByRole('heading', { name: /new subcontract/i })
page.locator('#contractNumber')
page.locator('#title')
page.getByRole('button', { name: 'Create', exact: true })
page.getByPlaceholder(/Search commitments/i)
```

#### Scenario 1.2: Validate Required Fields

**Steps:**
1. Navigate directly to: `/67/commitments/new?type=subcontract`
2. Wait for form to load
3. Clear the pre-filled contract number field
4. Click "Create" button without filling fields
5. Wait 500ms for validation messages

**Expected Results:**
- ✅ Validation errors appear
- ✅ Error messages contain "required" text
- ✅ Form does not submit (stays on `/new` URL)
- ✅ Error styling visible (`.text-red-600`, `.text-destructive`)

**Selectors:**
```typescript
page.locator('.text-red-600, .text-destructive, [role="alert"]')
page.getByText(/required/i)
```

---

### 2. Create Purchase Order Flow

**Test File:** `commitments-crud-flows.spec.ts`

#### Scenario 2.1: Create with All Fields

**Steps:**
1. Navigate to commitments list
2. Click "Create" → "Purchase Order"
3. Verify navigation to: `/67/commitments/new?type=purchase_order`
4. Fill required fields:
   - Contract Number: `PO-E2E-{timestamp}`
   - Title: `Test Purchase Order {timestamp}`
5. Fill optional PO-specific fields:
   - Bill To: `123 Test Street\nTest City, ST 12345`
   - Ship To: `456 Ship Street\nShip City, ST 67890`
6. Click "Create Purchase Order" button
7. Verify API POST response
8. Verify record in list

**Expected Results:**
- ✅ PO form has same required fields as subcontract
- ✅ PO form has additional Bill To / Ship To fields
- ✅ Submit button text is "Create Purchase Order"
- ✅ API creates purchase order record
- ✅ Record type is `purchase_order`

**Selectors:**
```typescript
page.getByRole('menuitem', { name: /Purchase Order/i })
page.getByRole('heading', { name: /new purchase order/i })
page.locator('#billTo')
page.locator('#shipTo')
page.getByRole('button', { name: /create purchase order/i })
```

---

### 3. Edit Commitment Flow

**Test File:** `commitments-crud-flows.spec.ts`, `commitments-edit.spec.ts`

#### Scenario 3.1: Edit from List Action Menu

**Steps:**
1. Create test subcontract via database
2. Navigate to commitments list
3. Find row with test commitment
4. Click row action button (three dots)
5. Click "Edit" menu item
6. Verify navigation to: `/67/commitments/{id}/edit`
7. Verify form loads with existing data

**Expected Results:**
- ✅ Action menu opens on click
- ✅ "Edit" option visible
- ✅ Navigation to edit URL
- ✅ Form pre-filled with existing values

**Selectors:**
```typescript
page.locator('tr', { hasText: /TEST-PATTERN/ }).first()
testRow.locator('button').last()
page.getByRole('menuitem', { name: /Edit/i }).first()
```

#### Scenario 3.2: Update Title and Save

**Steps:**
1. Navigate directly to edit page: `/67/commitments/{id}/edit`
2. Wait for form to load
3. Clear title field
4. Fill new title: `Updated Title {timestamp}`
5. Click "Save" or "Update" button
6. Wait for API PUT/PATCH response
7. Verify navigation away from edit page
8. Query database to verify title updated

**Expected Results:**
- ✅ API PUT/PATCH to `/api/projects/67/commitments/{id}`
- ✅ Response status 200
- ✅ Database record updated
- ✅ Success toast appears

**Selectors:**
```typescript
page.getByLabel(/title/i).first()
page.getByRole('button', { name: /save|update/i })
```

#### Scenario 3.3: Edit from Detail Page

**Steps:**
1. Navigate to detail page: `/67/commitments/{id}`
2. Click "Edit" button in page header
3. Verify navigation to edit page
4. Verify form loads

**Expected Results:**
- ✅ Edit button visible on detail page
- ✅ Navigation to `/edit` URL
- ✅ Form pre-filled

**Selectors:**
```typescript
page.getByRole('button', { name: /Edit/i }).first()
```

---

### 4. Delete & Restore Flow

**Test File:** `commitments-crud-flows.spec.ts`, `commitments-soft-delete.spec.ts`, `commitments-recycle-bin.spec.ts`

#### Scenario 4.1: Soft Delete via Action Menu

**Steps:**
1. Create test commitment
2. Navigate to list page
3. Find test row
4. Click action button
5. Click "Delete" menu item
6. Confirm deletion in dialog
7. Wait for API response
8. Verify row disappears from list
9. Query database - verify `deleted_at` is set

**Expected Results:**
- ✅ Delete option has destructive styling (red)
- ✅ Confirmation dialog appears
- ✅ API updates `deleted_at` timestamp
- ✅ Record NOT visible in main list
- ✅ Record still exists in database

**Selectors:**
```typescript
page.getByRole('menuitem', { name: /Delete/i }).first()
page.getByRole('button', { name: /confirm|delete|yes/i }).first()
```

#### Scenario 4.2: Verify Not in Main List

**Steps:**
1. Soft delete a commitment
2. Navigate to commitments list
3. Search for deleted commitment by contract number
4. Verify no results or "no commitments" message

**Expected Results:**
- ✅ Deleted commitment NOT visible
- ✅ Empty state or "no results" message shown

**Selectors:**
```typescript
page.locator('text=/no commitments|no results|nothing found/i')
```

#### Scenario 4.3: Navigate to Recycle Bin

**Steps:**
1. Navigate to commitments list
2. Look for "Recycle" / "Deleted" / "Trash" link
3. Click link to navigate to recycle bin
4. Verify URL: `/67/commitments/recycled`

**Expected Results:**
- ✅ Recycle bin link visible
- ✅ Navigation to recycle bin page
- ✅ Deleted commitments visible in table

**Selectors:**
```typescript
page.locator('a:has-text("Recycle"), a:has-text("Deleted"), a:has-text("Trash")').first()
```

#### Scenario 4.4: Restore from Recycle Bin

**Steps:**
1. Soft delete a commitment
2. Navigate to recycle bin
3. Find deleted commitment row
4. Click "Restore" button
5. Wait for API response
6. Verify row disappears from recycle bin
7. Query database - verify `deleted_at` is null
8. Navigate to main list
9. Verify commitment visible again

**Expected Results:**
- ✅ Restore button visible
- ✅ API updates `deleted_at` to null
- ✅ Record restored in database
- ✅ Record visible in main list again

**Selectors:**
```typescript
page.getByRole('button', { name: /restore/i }).first()
```

---

### 5. Schedule of Values (SOV) Line Items

**Test File:** `commitments-sov-line-items.spec.ts`

#### Scenario 5.1: Display Line Items

**Steps:**
1. Navigate to commitment detail page
2. Click "SOV" or "Schedule of Values" tab
3. Verify table with line items visible
4. Verify columns: Description, Budget Code, Amount, Billed to Date, Balance to Finish

**Expected Results:**
- ✅ Tab navigation works
- ✅ Line items table visible
- ✅ Columns display correctly
- ✅ Data loads from API

**Selectors:**
```typescript
page.locator('[role="tab"]').filter({ hasText: /SOV|Schedule/i })
page.locator('input[aria-label*="Description"], input[name*="description"]').first()
```

#### Scenario 5.2: Calculate Totals

**Steps:**
1. Navigate to SOV tab
2. Verify totals row at bottom of table
3. Verify total amount = sum of all line items
4. Verify billed to date = sum of billed amounts
5. Verify balance to finish = sum of balances

**Expected Results:**
- ✅ Totals row visible
- ✅ Total Amount = Line Item 1 Amount + Line Item 2 Amount
- ✅ Calculations update when line items change

**Selectors:**
```typescript
page.locator('tfoot, [class*="total"], text=Total').first()
page.locator('tfoot >> text=$100,000, text=100,000').first()
```

#### Scenario 5.3: Add Line Item

**Steps:**
1. Navigate to SOV tab
2. Click "Add Line Item" button
3. Fill fields:
   - Line Number: auto-incremented
   - Description: "New line item"
   - Budget Code: "01-100"
   - Amount: $5,000
4. Click "Save" or auto-save
5. Verify line item appears in table
6. Verify total amount updated

**Expected Results:**
- ✅ New row appears
- ✅ Form fields accept input
- ✅ Totals recalculate automatically
- ✅ Record persists in database

#### Scenario 5.4: Edit Line Item

**Steps:**
1. Navigate to SOV tab
2. Click on existing line item row
3. Update amount: $50,000 → $55,000
4. Click outside field or press Enter
5. Verify amount updated
6. Verify totals recalculated

**Expected Results:**
- ✅ Inline editing works
- ✅ Totals update automatically
- ✅ Database record updated

#### Scenario 5.5: Delete Line Item

**Steps:**
1. Navigate to SOV tab
2. Find line item row
3. Click delete/remove button
4. Confirm deletion
5. Verify row removed from table
6. Verify totals recalculated

**Expected Results:**
- ✅ Delete button visible
- ✅ Confirmation dialog appears
- ✅ Row removed from UI
- ✅ Totals updated
- ✅ Database record deleted

---

### 6. List Page & Filtering

**Test File:** `commitments-list-page.spec.ts`, `commitments-comprehensive.spec.ts`

#### Scenario 6.1: Display Commitments Table

**Steps:**
1. Navigate to: `/67/commitments`
2. Verify page header "Commitments"
3. Verify description "Manage purchase orders and subcontracts"
4. Verify table with columns:
   - Number
   - Title
   - Company
   - Status
   - Type
   - Original Amount

**Expected Results:**
- ✅ Page loads without errors
- ✅ Header and description visible
- ✅ Table displays commitments
- ✅ Columns render correctly

**Selectors:**
```typescript
page.locator('h1:has-text("Commitments")')
page.locator('text=Manage purchase orders and subcontracts')
page.locator('th:has-text("Number"), [role="columnheader"]:has-text("Number")')
```

#### Scenario 6.2: Display Summary Cards

**Steps:**
1. Navigate to commitments list
2. Wait for summary cards to load
3. Verify cards:
   - Original Contract Amount
   - Approved Change Orders
   - Revised Contract Amount
   - Balance to Finish

**Expected Results:**
- ✅ 4 summary cards visible
- ✅ Currency values formatted with $
- ✅ Totals calculated from all commitments

**Selectors:**
```typescript
page.waitForSelector('text=Original Contract Amount', { timeout: 10000 })
page.locator('text=Approved Change Orders')
```

#### Scenario 6.3: Search by Title/Number

**Steps:**
1. Navigate to commitments list
2. Type search query in search box: "test"
3. Wait 500ms for debounce
4. Verify table filters to matching records

**Expected Results:**
- ✅ Search input visible
- ✅ Table filters in real-time
- ✅ Only matching records shown

**Selectors:**
```typescript
page.getByPlaceholder(/Search commitments/i)
```

#### Scenario 6.4: Filter by Status

**Steps:**
1. Click "Status" filter button
2. Select "Approved" status
3. Verify table shows only approved commitments
4. Clear filter
5. Verify all commitments shown again

**Expected Results:**
- ✅ Status filter dropdown opens
- ✅ Options: Draft, Pending, Approved, Executed, Closed, Void
- ✅ Table filters correctly
- ✅ Clear filter restores all records

**Selectors:**
```typescript
page.locator('button:has-text("Status"), [data-testid="status-filter"]').first()
```

#### Scenario 6.5: Filter by Type

**Steps:**
1. Click "Type" filter button
2. Select "Subcontract"
3. Verify only subcontracts shown
4. Select "Purchase Order"
5. Verify only purchase orders shown

**Expected Results:**
- ✅ Type filter works
- ✅ Options: Subcontract, Purchase Order
- ✅ Table filters correctly

**Selectors:**
```typescript
page.locator('button:has-text("Type"), [data-testid="type-filter"]').first()
```

#### Scenario 6.6: Tab Navigation

**Steps:**
1. Click "All Commitments" tab
2. Verify all types shown
3. Click "Subcontracts" tab
4. Verify only subcontracts shown
5. Click "Purchase Orders" tab
6. Verify only purchase orders shown

**Expected Results:**
- ✅ Tabs filter table correctly
- ✅ URL updates with tab parameter
- ✅ Tab state persists on refresh

**Selectors:**
```typescript
page.locator('a:has-text("All Commitments"), button:has-text("All Commitments")').first()
page.locator('a:has-text("Subcontracts"), button:has-text("Subcontracts")').first()
page.locator('a:has-text("Purchase Orders"), button:has-text("Purchase Orders")').first()
```

---

### 7. Detail Page & Tabs

**Test File:** `commitments-detail-tabs.spec.ts`

#### Scenario 7.1: Navigate to Detail Page

**Steps:**
1. Navigate to commitments list
2. Click on commitment row (contract number link)
3. Verify navigation to: `/67/commitments/{id}`
4. Verify commitment details display

**Expected Results:**
- ✅ Row click navigates to detail page
- ✅ Contract number displayed
- ✅ Title, status, amount visible
- ✅ Tabs visible: General, SOV, Change Orders, Invoices, Attachments

**Selectors:**
```typescript
page.locator('tbody tr td:first-child, [role="row"] [class*="blue"]').first()
```

#### Scenario 7.2: Tab Navigation

**Steps:**
1. Navigate to detail page
2. Click "SOV" tab
3. Verify SOV content loads
4. Click "Change Orders" tab
5. Verify change orders list loads
6. Click "Invoices" tab
7. Verify invoices list loads
8. Click "Attachments" tab
9. Verify attachments list loads
10. Click "General" tab
11. Verify general info displays

**Expected Results:**
- ✅ All tabs clickable
- ✅ Content loads for each tab
- ✅ Tab state visible (active styling)

**Selectors:**
```typescript
page.locator('[role="tab"]').filter({ hasText: /General/i })
page.locator('[role="tab"]').filter({ hasText: /SOV/i })
page.locator('[role="tab"]').filter({ hasText: /Change Orders/i })
```

---

### 8. Form Validation

**Test File:** `commitment-validation.spec.ts`, `commitment-forms.spec.ts`

#### Scenario 8.1: Required Field Validation

**Fields:**
- Contract Number (required)
- Title (required)

**Steps:**
1. Navigate to new commitment form
2. Leave required fields empty
3. Click submit
4. Verify validation errors

**Expected Results:**
- ✅ "Contract Number is required" error
- ✅ "Title is required" error
- ✅ Form does not submit

#### Scenario 8.2: Number Format Validation

**Steps:**
1. Enter non-numeric value in "Original Amount" field
2. Blur field
3. Verify validation error

**Expected Results:**
- ✅ "Must be a valid number" error

#### Scenario 8.3: Date Validation

**Steps:**
1. Enter invalid date format
2. Blur field
3. Verify validation error

**Expected Results:**
- ✅ "Invalid date" error

---

### 9. SOV Import

**Test File:** `commitment-sov-import.spec.ts`

#### Scenario 9.1: Import from CSV

**Steps:**
1. Navigate to SOV tab
2. Click "Import" button
3. Upload CSV file with line items
4. Verify preview shows line items
5. Click "Confirm Import"
6. Verify line items added to table

**Expected Results:**
- ✅ File upload works
- ✅ CSV parsed correctly
- ✅ Preview shows data
- ✅ Import creates line item records

---

### 10. Configuration

**Test File:** `commitments-configure.spec.ts`

#### Scenario 10.1: Configure Number Format

**Steps:**
1. Navigate to commitment settings
2. Change number format prefix
3. Save settings
4. Create new commitment
5. Verify number uses new prefix

**Expected Results:**
- ✅ Settings page accessible
- ✅ Prefix configurable
- ✅ New commitments use prefix

---

### 11. Responsive Design

**Test File:** `commitments-comprehensive.spec.ts`

#### Scenario 11.1: Mobile View

**Steps:**
1. Set viewport to mobile size (375x667)
2. Navigate to commitments list
3. Verify mobile card layout displays
4. Verify search and filters work
5. Verify create button visible

**Expected Results:**
- ✅ Cards instead of table on mobile
- ✅ All functionality accessible
- ✅ Touch-friendly buttons

**Selectors:**
```typescript
page.setViewportSize({ width: 375, height: 667 })
page.locator('[class*="card"], [class*="Card"]')
```

---

## UI Elements & Selectors

### Page Header

```typescript
// Page title
page.locator('h1:has-text("Commitments")')

// Page description
page.locator('text=Manage purchase orders and subcontracts')

// Create dropdown button
page.getByRole('button', { name: /Create/i }).first()
```

### Create Dropdown Menu

```typescript
// Subcontract option
page.getByRole('menuitem', { name: /Subcontract/i })

// Purchase Order option
page.getByRole('menuitem', { name: /Purchase Order/i })
```

### Search & Filters

```typescript
// Search input
page.getByPlaceholder(/Search commitments/i)

// Status filter button
page.locator('button:has-text("Status"), [data-testid="status-filter"]').first()

// Type filter button
page.locator('button:has-text("Type"), [data-testid="type-filter"]').first()
```

### Tabs

```typescript
// All Commitments tab
page.locator('text=All Commitments')

// Subcontracts tab
page.locator('text=Subcontracts')

// Purchase Orders tab
page.locator('text=Purchase Orders')
```

### Summary Cards

```typescript
// Card labels
page.locator('text=Original Contract Amount')
page.locator('text=Approved Change Orders')
page.locator('text=Revised Contract Amount')
page.locator('text=Balance to Finish')
```

### Table

```typescript
// Table headers
page.locator('th:has-text("Number")')
page.locator('th:has-text("Title")')
page.locator('th:has-text("Company")')
page.locator('th:has-text("Status")')
page.locator('th:has-text("Type")')
page.locator('th:has-text("Original Amount")')

// Row action button
page.locator('tbody button, [role="row"] button').first()

// Action menu items
page.getByRole('menuitem', { name: /View/i })
page.getByRole('menuitem', { name: /Edit/i })
page.getByRole('menuitem', { name: /Delete/i })

// Contract number link (first cell)
page.locator('tbody tr td:first-child, [role="row"] [class*="blue"]').first()
```

### Commitment Form (Subcontract)

```typescript
// Form heading
page.getByRole('heading', { name: /new subcontract/i })

// Contract Number field
page.locator('#contractNumber')

// Title field
page.locator('#title')

// Contract Company select
page.locator('#contract_company_id, [name="contract_company_id"]').first()

// Status dropdown
page.locator('button:has-text("Draft")').first()
page.getByRole('option', { name: 'Draft' })
page.getByRole('option', { name: 'Pending' })
page.getByRole('option', { name: 'Approved' })

// Original Amount
page.locator('#original_amount, [name="original_amount"]')

// Accounting Method
page.locator('label:has-text("Accounting Method")')

// Date fields
page.locator('label:has-text("Executed Date")')
page.locator('label:has-text("Start Date")')
page.locator('label:has-text("Substantial Completion Date")')

// Description textarea
page.locator('textarea#description, textarea[name="description"]')

// Private checkbox
page.locator('input[type="checkbox"], [role="checkbox"]').first()

// Submit button
page.getByRole('button', { name: 'Create', exact: true })

// Cancel button
page.getByRole('button', { name: /Cancel/i })
```

### Commitment Form (Purchase Order)

```typescript
// Form heading
page.getByRole('heading', { name: /new purchase order/i })

// All same fields as subcontract plus:

// Bill To field
page.locator('#billTo')

// Ship To field
page.locator('#shipTo')

// Submit button
page.getByRole('button', { name: /create purchase order/i })
```

### Edit Form

```typescript
// Title field (using label)
page.getByLabel(/title/i).first()

// Save button
page.getByRole('button', { name: /save|update/i })
```

### Detail Page

```typescript
// Edit button
page.getByRole('button', { name: /Edit/i }).first()

// Delete button
page.getByRole('button', { name: /Delete/i })

// Tabs
page.locator('[role="tab"]').filter({ hasText: /General/i })
page.locator('[role="tab"]').filter({ hasText: /SOV|Schedule/i })
page.locator('[role="tab"]').filter({ hasText: /Change Orders/i })
page.locator('[role="tab"]').filter({ hasText: /Invoices/i })
page.locator('[role="tab"]').filter({ hasText: /Attachments/i })
```

### SOV Line Items

```typescript
// SOV tab
page.locator('[role="tab"]').filter({ hasText: /SOV|Schedule/i })

// Line item fields
page.locator('input[aria-label*="Description"]').first()
page.locator('input[name*="description"]').first()

// Totals row
page.locator('tfoot, [class*="total"], text=Total').first()

// Total amount
page.locator('tfoot >> text=$100,000, text=100,000').first()
```

### Recycle Bin

```typescript
// Recycle bin link
page.locator('a:has-text("Recycle"), a:has-text("Deleted"), a:has-text("Trash")').first()

// Restore button
page.getByRole('button', { name: /restore/i }).first()
```

### Validation Errors

```typescript
// Error messages
page.locator('.text-red-600, .text-destructive, [role="alert"]')

// "Required" text
page.getByText(/required/i)
```

---

## Validation Rules

### Required Fields

| Field | Subcontract | Purchase Order | Validation Message |
|-------|------------|----------------|-------------------|
| Contract Number | ✅ Required | ✅ Required | "Contract number is required" |
| Title | ✅ Required | ✅ Required | "Title is required" |
| Contract Company | Optional | Optional | - |
| Status | Default: Draft | Default: Draft | - |
| Original Amount | Optional | Optional | - |
| Bill To | N/A | Optional | - |
| Ship To | N/A | Optional | - |

### Field Formats

| Field | Format | Validation |
|-------|--------|------------|
| Contract Number | Text, max 50 chars | Alphanumeric, hyphens allowed |
| Original Amount | Numeric | Must be >= 0, max 2 decimal places |
| Executed Date | Date | Valid date format |
| Start Date | Date | Valid date format |
| Completion Date | Date | Must be >= Start Date |

### Business Rules

1. **Contract Number Uniqueness:** Must be unique within project (enforced by database)
2. **Status Workflow:** Can only transition forward: Draft → Pending → Approved → Executed
3. **Executed Commitments:** Cannot be edited once status is "Executed"
4. **Soft Delete:** Deleted commitments have `deleted_at` timestamp, not removed from database
5. **SOV Totals:** Sum of line items must not exceed original amount (warning, not blocker)

---

## Existing Test Files

### Core CRUD Tests

| File | Purpose | Test Count |
|------|---------|------------|
| `commitments-crud-flows.spec.ts` | Create, Edit, Delete flows for both types | 12 tests |
| `commitment-create.spec.ts` | Detailed create scenarios | 8 tests |
| `commitment-creation-flow.spec.ts` | Step-by-step creation validation | 6 tests |
| `commitments-edit.spec.ts` | Edit form validation and updates | 10 tests |
| `commitments-soft-delete.spec.ts` | Soft delete functionality | 5 tests |
| `commitments-recycle-bin.spec.ts` | Restore from recycle bin | 4 tests |

### UI & Display Tests

| File | Purpose | Test Count |
|------|---------|------------|
| `commitments-comprehensive.spec.ts` | Full page display and interactions | 40+ tests |
| `commitments-list-page.spec.ts` | List table, filtering, search | 15 tests |
| `commitments-detail-tabs.spec.ts` | Detail page tab navigation | 8 tests |
| `commitment-forms.spec.ts` | Form field rendering and behavior | 12 tests |

### Validation Tests

| File | Purpose | Test Count |
|------|---------|------------|
| `commitment-validation.spec.ts` | Field validation rules | 10 tests |
| `ui/form-commitments-company-dropdown.spec.ts` | Company dropdown behavior | 5 tests |

### SOV Tests

| File | Purpose | Test Count |
|------|---------|------------|
| `commitments-sov-line-items.spec.ts` | SOV CRUD, totals, calculations | 15+ tests |
| `commitment-sov-import.spec.ts` | CSV import functionality | 5 tests |

### Configuration & Settings

| File | Purpose | Test Count |
|------|---------|------------|
| `commitments-configure.spec.ts` | Commitment configuration settings | 3 tests |

### Debug & Development

| File | Purpose | Notes |
|------|---------|-------|
| `commitment-debug.spec.ts` | Debugging specific issues | Ad-hoc tests |
| `commitment-creation-debug.spec.ts` | Debug creation flow issues | Ad-hoc tests |
| `commitment-submit.spec.ts` | Isolated submit testing | 2 tests |
| `commitment-full-submit.spec.ts` | Full end-to-end submit flow | 3 tests |
| `commitment-api.spec.ts` | API integration tests | 4 tests |

---

## Database Schema

### Tables

#### `subcontracts`

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | Yes | gen_random_uuid() | Primary key |
| `project_id` | INTEGER | Yes | - | FK to projects |
| `contract_number` | TEXT | Yes | - | Unique within project |
| `title` | TEXT | Yes | - | - |
| `contract_company_id` | UUID | No | NULL | FK to companies |
| `status` | TEXT | Yes | 'Draft' | Enum values |
| `original_amount` | NUMERIC | No | 0 | - |
| `accounting_method` | TEXT | No | 'amount_based' | - |
| `executed_date` | DATE | No | NULL | - |
| `start_date` | DATE | No | NULL | - |
| `substantial_completion_date` | DATE | No | NULL | - |
| `description` | TEXT | No | NULL | - |
| `private` | BOOLEAN | No | false | - |
| `executed` | BOOLEAN | No | false | - |
| `deleted_at` | TIMESTAMPTZ | No | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMPTZ | Yes | now() | - |
| `updated_at` | TIMESTAMPTZ | Yes | now() | - |

#### `purchase_orders`

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | Yes | gen_random_uuid() | Primary key |
| `project_id` | INTEGER | Yes | - | FK to projects |
| `contract_number` | TEXT | Yes | - | Unique within project |
| `title` | TEXT | Yes | - | - |
| `contract_company_id` | UUID | No | NULL | FK to companies |
| `status` | TEXT | Yes | 'Draft' | Enum values |
| `original_amount` | NUMERIC | No | 0 | - |
| `bill_to` | TEXT | No | NULL | Address |
| `ship_to` | TEXT | No | NULL | Address |
| `description` | TEXT | No | NULL | - |
| `private` | BOOLEAN | No | false | - |
| `deleted_at` | TIMESTAMPTZ | No | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMPTZ | Yes | now() | - |
| `updated_at` | TIMESTAMPTZ | Yes | now() | - |

#### `commitment_line_items` (SOV)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | Yes | gen_random_uuid() | Primary key |
| `commitment_id` | UUID | Yes | - | FK to subcontracts or purchase_orders |
| `line_number` | INTEGER | Yes | - | Display order |
| `description` | TEXT | Yes | - | - |
| `budget_code` | TEXT | No | NULL | Reference to budget line |
| `amount` | NUMERIC | Yes | 0 | Line item amount |
| `billed_to_date` | NUMERIC | No | 0 | Amount billed so far |
| `balance_to_finish` | NUMERIC | No | 0 | Calculated: amount - billed |
| `created_at` | TIMESTAMPTZ | Yes | now() | - |
| `updated_at` | TIMESTAMPTZ | Yes | now() | - |

### Status Enum Values

```typescript
type CommitmentStatus =
  | 'Draft'
  | 'Sent'
  | 'Pending'
  | 'Approved'
  | 'Executed'
  | 'Closed'
  | 'Void';
```

### Accounting Method Values

```typescript
type AccountingMethod =
  | 'amount_based'
  | 'unit_price';
```

---

## Running Tests

### Run All Commitment Tests

```bash
cd frontend
npx playwright test tests/e2e/commitments/
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts
```

### Run with UI Mode (Recommended for Development)

```bash
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts --ui
```

### Run Specific Test Suite

```bash
# Create flows only
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create Subcontract"

# Edit flows only
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Edit Commitment"

# Delete flows only
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Delete and Restore"

# SOV tests only
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts

# List page tests only
npx playwright test tests/e2e/commitments/commitments-list-page.spec.ts
```

### Run with Headed Browser (See Browser Actions)

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --headed
```

### Run with Debug Mode

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --debug
```

### Generate Test Report

```bash
npx playwright test tests/e2e/commitments/
npx playwright show-report
```

---

## Test Execution Notes

### Authentication

- **All tests use automatic authentication**
- Auth state saved in `tests/.auth/user.json`
- No manual login required in tests
- Run `npx playwright test tests/auth.setup.ts` ONCE if auth expires

### Test Data Cleanup

- Tests create data with predictable patterns (E2E prefix)
- Cleanup in `beforeEach` / `afterAll` hooks
- Database cleanup uses Supabase client
- Soft deletes tested separately from hard deletes

### CI/CD Considerations

- Tests run in headless mode by default
- Videos recorded on failure (if enabled in config)
- Screenshots on test failure (automatic)
- Parallel execution safe (test isolation)

### Performance

- Most tests complete in < 10 seconds
- Form submission tests: ~5 seconds
- SOV import tests: ~8 seconds
- Full suite: ~5 minutes

---

## Coverage Gaps & Future Enhancements

### Not Yet Covered

1. **Permissions & Roles:** Verify different user roles have correct access
2. **Bulk Operations:** Multi-select and bulk delete/update
3. **Export Functionality:** Export commitments to CSV/PDF
4. **Attachments:** Upload/download/delete file attachments (partially covered)
5. **Change Order Integration:** Create change orders from commitments
6. **Invoice Integration:** Link invoices to commitments
7. **Audit Trail:** Verify status change history
8. **Email Notifications:** Send commitment to vendor
9. **Print Layout:** Print-friendly commitment view
10. **Advanced Filtering:** Multiple filters combined, saved filters

### Recommended Additions

1. **Performance Tests:** Load 1000+ commitments, measure render time
2. **Concurrent Editing:** Two users editing same commitment
3. **Browser Compatibility:** Test on Safari, Firefox, Edge
4. **Accessibility (a11y):** Keyboard navigation, screen reader support
5. **Mobile App Tests:** Test on iOS/Android browsers
6. **Stress Tests:** Rapid create/delete cycles
7. **Integration Tests:** Test with real Supabase (not mocked)

---

## Appendix: Example Test Code

### Minimal Create Test

```typescript
test('should create subcontract with required fields only', async ({ page }) => {
  const contractNumber = `SC-E2E-${Date.now()}`;
  const title = `Test Subcontract ${Date.now()}`;

  // Navigate
  await page.goto('/67/commitments');
  await page.getByRole('button', { name: /Create/i }).first().click();
  await page.getByRole('menuitem', { name: /Subcontract/i }).click();

  // Fill form
  await page.locator('#contractNumber').fill(contractNumber);
  await page.locator('#title').fill(title);

  // Submit
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  // Verify
  await page.waitForTimeout(2000);
  expect(page.url()).not.toContain('/new');
});
```

### Minimal Edit Test

```typescript
test('should edit commitment title', async ({ page }) => {
  const newTitle = `Updated Title ${Date.now()}`;

  // Navigate to edit page
  await page.goto('/67/commitments/some-commitment-id/edit');

  // Edit title
  await page.getByLabel(/title/i).first().clear();
  await page.getByLabel(/title/i).first().fill(newTitle);

  // Save
  await page.getByRole('button', { name: /save/i }).click();

  // Verify
  await page.waitForTimeout(2000);
  expect(page.url()).not.toContain('/edit');
});
```

### Minimal Delete Test

```typescript
test('should soft delete commitment', async ({ page }) => {
  await page.goto('/67/commitments');

  // Find test row
  const testRow = page.locator('tr', { hasText: /DELETE-TEST/ }).first();
  const actionButton = testRow.locator('button').last();
  await actionButton.click();

  // Delete
  await page.getByRole('menuitem', { name: /Delete/i }).first().click();
  await page.getByRole('button', { name: /confirm/i }).first().click();

  // Verify removed from list
  await page.waitForTimeout(2000);
  await expect(testRow).not.toBeVisible();
});
```

---

**End of Test Plan**

**Last Updated:** 2026-02-21
**Maintainer:** Alleato PM Testing Team
**Version:** 1.0
