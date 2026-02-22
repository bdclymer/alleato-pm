# Commitments Feature - Workflow Summary

**Generated:** 2026-02-21

---

## Quick Reference

### URLs

| Page | URL Pattern | Purpose |
|------|-------------|---------|
| **List Page** | `/67/commitments` | View all commitments |
| **Subcontracts Tab** | `/67/commitments?tab=subcontracts` | Filter to subcontracts only |
| **Purchase Orders Tab** | `/67/commitments?tab=purchase_orders` | Filter to purchase orders only |
| **New Subcontract** | `/67/commitments/new?type=subcontract` | Create subcontract form |
| **New Purchase Order** | `/67/commitments/new?type=purchase_order` | Create purchase order form |
| **Detail Page** | `/67/commitments/{id}` | View commitment details |
| **Edit Page** | `/67/commitments/{id}/edit` | Edit commitment |
| **Recycle Bin** | `/67/commitments/recycled` | View deleted commitments |

---

## User Workflows

### Workflow 1: Create New Subcontract

```
1. Navigate to /67/commitments
2. Click "Create" dropdown
3. Select "Subcontract"
4. Fill required fields:
   - Contract Number
   - Title
5. Fill optional fields:
   - Contract Company (vendor)
   - Original Amount
   - Status (default: Draft)
   - Accounting Method
   - Dates (Executed, Start, Completion)
   - Description
6. Click "Create"
7. Redirected to detail page or list
8. Success toast appears
```

**Test Coverage:** ✅ Covered in `commitments-crud-flows.spec.ts`

---

### Workflow 2: Create New Purchase Order

```
1. Navigate to /67/commitments
2. Click "Create" dropdown
3. Select "Purchase Order"
4. Fill required fields:
   - Contract Number
   - Title
5. Fill optional PO-specific fields:
   - Bill To (address)
   - Ship To (address)
6. Click "Create Purchase Order"
7. Redirected to detail page or list
8. Success toast appears
```

**Test Coverage:** ✅ Covered in `commitments-crud-flows.spec.ts`

---

### Workflow 3: Edit Existing Commitment

**Option A: From List Page**
```
1. Navigate to /67/commitments
2. Find commitment row
3. Click action button (⋮)
4. Click "Edit"
5. Update fields
6. Click "Save"
7. Redirected to detail page
8. Success toast appears
```

**Option B: From Detail Page**
```
1. Navigate to /67/commitments/{id}
2. Click "Edit" button
3. Update fields
4. Click "Save"
5. Redirected to detail page
6. Success toast appears
```

**Test Coverage:** ✅ Covered in `commitments-crud-flows.spec.ts` and `commitments-edit.spec.ts`

---

### Workflow 4: Delete Commitment

```
1. Navigate to /67/commitments
2. Find commitment row
3. Click action button (⋮)
4. Click "Delete" (red option)
5. Confirm in dialog
6. Row disappears from list
7. Success toast appears
8. Record soft-deleted (deleted_at set)
```

**Test Coverage:** ✅ Covered in `commitments-crud-flows.spec.ts` and `commitments-soft-delete.spec.ts`

---

### Workflow 5: Restore Deleted Commitment

```
1. Navigate to /67/commitments
2. Click "Recycle Bin" link
3. Navigate to /67/commitments/recycled
4. Find deleted commitment
5. Click "Restore" button
6. Row disappears from recycle bin
7. Navigate back to main list
8. Commitment visible again
```

**Test Coverage:** ✅ Covered in `commitments-recycle-bin.spec.ts`

---

### Workflow 6: Add SOV Line Items

```
1. Navigate to /67/commitments/{id}
2. Click "SOV" or "Schedule of Values" tab
3. Click "Add Line Item" button
4. Fill fields:
   - Line Number (auto-incremented)
   - Description
   - Budget Code
   - Amount
5. Click "Save" or auto-save
6. Line item appears in table
7. Totals recalculate automatically
```

**Test Coverage:** ✅ Covered in `commitments-sov-line-items.spec.ts`

---

### Workflow 7: Import SOV from CSV

```
1. Navigate to /67/commitments/{id}
2. Click "SOV" tab
3. Click "Import" button
4. Upload CSV file
5. Preview shows parsed line items
6. Click "Confirm Import"
7. Line items added to table
8. Success toast appears
```

**Test Coverage:** ✅ Covered in `commitment-sov-import.spec.ts`

---

### Workflow 8: Search and Filter

**Search by Text:**
```
1. Navigate to /67/commitments
2. Type in search box (debounced)
3. Table filters to matching records
```

**Filter by Status:**
```
1. Click "Status" filter button
2. Select status (Draft, Pending, Approved, etc.)
3. Table shows only selected status
4. Click "Clear" to reset
```

**Filter by Type (Tabs):**
```
1. Click "All Commitments" tab (default)
2. Click "Subcontracts" tab
3. Click "Purchase Orders" tab
4. URL updates with tab parameter
```

**Test Coverage:** ✅ Covered in `commitments-list-page.spec.ts` and `commitments-comprehensive.spec.ts`

---

## Status Workflow

```
Draft → Pending → Approved → Executed → Closed
  ↓                                      ↓
Void ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### Status Transitions

| From | To | Allowed? | Notes |
|------|-----|----------|-------|
| Draft | Pending | ✅ Yes | Submit for review |
| Draft | Void | ✅ Yes | Cancel draft |
| Pending | Approved | ✅ Yes | Approve commitment |
| Pending | Void | ✅ Yes | Reject commitment |
| Approved | Executed | ✅ Yes | Execute contract |
| Approved | Void | ✅ Yes | Cancel before execution |
| Executed | Closed | ✅ Yes | Complete work |
| Executed | Void | ❌ No | Cannot void executed |
| Closed | Void | ❌ No | Cannot void closed |

### Edit Permissions by Status

| Status | Can Edit? | Can Delete? | Notes |
|--------|-----------|-------------|-------|
| Draft | ✅ Yes | ✅ Yes | Full access |
| Pending | ✅ Yes | ✅ Yes | Can edit during review |
| Approved | ⚠️ Limited | ⚠️ Admin only | Some fields locked |
| Executed | ❌ No | ❌ No | Read-only |
| Closed | ❌ No | ❌ No | Read-only |
| Void | ❌ No | ✅ Yes | Read-only, can delete |

---

## Data Relationships

```
Project (id: integer)
  ↓
  ├─ Subcontracts (project_id: integer FK)
  │    ├─ commitment_line_items (commitment_id: uuid FK)
  │    ├─ change_orders (subcontract_id: uuid FK)
  │    ├─ invoices (commitment_id: uuid FK)
  │    └─ attachments (commitment_id: uuid FK)
  │
  └─ Purchase Orders (project_id: integer FK)
       ├─ commitment_line_items (commitment_id: uuid FK)
       ├─ invoices (commitment_id: uuid FK)
       └─ attachments (commitment_id: uuid FK)
```

---

## Form Fields Reference

### Subcontract Form Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Contract Number | Text | ✅ Yes | Auto-generated | Unique within project |
| Title | Text | ✅ Yes | - | - |
| Contract Company | Select | No | - | Dropdown of vendors |
| Status | Select | Yes | Draft | Enum values |
| Original Amount | Number | No | 0 | Currency formatted |
| Accounting Method | Select | No | Amount-based | Amount-based or Unit Price |
| Executed Date | Date | No | - | Date picker |
| Start Date | Date | No | - | Date picker |
| Substantial Completion Date | Date | No | - | Date picker |
| Description | Textarea | No | - | Multi-line text |
| Private | Checkbox | No | false | Hide from subcontractors |

### Purchase Order Form Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Contract Number | Text | ✅ Yes | Auto-generated | Unique within project |
| Title | Text | ✅ Yes | - | - |
| Contract Company | Select | No | - | Dropdown of vendors |
| Status | Select | Yes | Draft | Enum values |
| Original Amount | Number | No | 0 | Currency formatted |
| **Bill To** | Textarea | No | - | **PO-specific** |
| **Ship To** | Textarea | No | - | **PO-specific** |
| Description | Textarea | No | - | Multi-line text |
| Private | Checkbox | No | false | Hide from subcontractors |

---

## SOV Line Items

### Fields

| Field | Type | Required | Calculated? | Notes |
|-------|------|----------|-------------|-------|
| Line Number | Integer | Yes | Auto | Sequential |
| Description | Text | Yes | No | Work item description |
| Budget Code | Text | No | No | Reference to budget line |
| Amount | Numeric | Yes | No | Line item original amount |
| Billed to Date | Numeric | No | No | Amount invoiced so far |
| Balance to Finish | Numeric | No | ✅ Yes | `amount - billed_to_date` |

### Totals Calculations

```javascript
// Total Original Amount
const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

// Total Billed to Date
const totalBilled = lineItems.reduce((sum, item) => sum + item.billed_to_date, 0);

// Total Balance to Finish
const totalBalance = lineItems.reduce((sum, item) => sum + item.balance_to_finish, 0);

// Or calculated:
const totalBalance = totalAmount - totalBilled;
```

---

## Summary Cards

The list page displays 4 summary cards with project-wide totals:

### Card 1: Original Contract Amount
```
Sum of all commitments' original_amount
```

### Card 2: Approved Change Orders
```
Sum of all approved change orders across all commitments
```

### Card 3: Revised Contract Amount
```
Original Contract Amount + Approved Change Orders
```

### Card 4: Balance to Finish
```
Revised Contract Amount - Total Billed to Date
```

---

## Responsive Design

### Desktop (≥1024px)
- Table layout with all columns
- Full filters and search toolbar
- Side-by-side summary cards

### Tablet (768px - 1023px)
- Table with fewer columns
- Filters collapse to dropdowns
- Stacked summary cards (2x2 grid)

### Mobile (<768px)
- Card layout instead of table
- Search and filters in drawer
- Stacked summary cards (vertical)
- Touch-friendly action buttons

**Test Coverage:** ✅ Covered in `commitments-comprehensive.spec.ts`

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/67/commitments` | GET | List all commitments |
| `/api/projects/67/commitments` | POST | Create new commitment |
| `/api/projects/67/commitments/{id}` | GET | Get commitment details |
| `/api/projects/67/commitments/{id}` | PUT/PATCH | Update commitment |
| `/api/projects/67/commitments/{id}` | DELETE | Soft delete commitment |
| `/api/projects/67/commitments/{id}/line-items` | GET | List SOV line items |
| `/api/projects/67/commitments/{id}/line-items` | POST | Create line item |
| `/api/projects/67/commitments/{id}/line-items/{lineId}` | PUT/PATCH | Update line item |
| `/api/projects/67/commitments/{id}/line-items/{lineId}` | DELETE | Delete line item |
| `/api/projects/67/commitments/{id}/change-orders` | GET | List related change orders |
| `/api/projects/67/commitments/{id}/invoices` | GET | List related invoices |
| `/api/projects/67/commitments/{id}/attachments` | GET | List attachments |
| `/api/projects/67/commitments/{id}/attachments` | POST | Upload attachment |

---

## Test Execution Quick Commands

### Run All Tests
```bash
cd frontend
npx playwright test tests/e2e/commitments/
```

### Run Specific Workflows
```bash
# Create flows
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create"

# Edit flows
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Edit"

# Delete flows
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Delete"

# SOV workflows
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts

# List page workflows
npx playwright test tests/e2e/commitments/commitments-list-page.spec.ts
```

### Debug Mode
```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --debug
```

### UI Mode (Best for Development)
```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --ui
```

---

## Common Selectors Cheat Sheet

### Navigation
```typescript
// Go to list
await page.goto('/67/commitments');

// Go to detail
await page.goto('/67/commitments/{id}');

// Go to edit
await page.goto('/67/commitments/{id}/edit');
```

### Create Commitment
```typescript
// Open create dropdown
await page.getByRole('button', { name: /Create/i }).first().click();

// Select subcontract
await page.getByRole('menuitem', { name: /Subcontract/i }).click();

// Select purchase order
await page.getByRole('menuitem', { name: /Purchase Order/i }).click();
```

### Fill Form
```typescript
// Contract number
await page.locator('#contractNumber').fill('SC-001');

// Title
await page.locator('#title').fill('Test Subcontract');

// Submit
await page.getByRole('button', { name: 'Create', exact: true }).click();
```

### Search & Filter
```typescript
// Search
await page.getByPlaceholder(/Search commitments/i).fill('search term');

// Status filter
await page.locator('button:has-text("Status")').first().click();

// Type filter
await page.locator('button:has-text("Type")').first().click();
```

### Row Actions
```typescript
// Find row
const row = page.locator('tr', { hasText: /SC-001/ }).first();

// Click action button
await row.locator('button').last().click();

// Click Edit
await page.getByRole('menuitem', { name: /Edit/i }).first().click();

// Click Delete
await page.getByRole('menuitem', { name: /Delete/i }).first().click();
```

---

## Tips for Test Development

### 1. Always Use Test Prefixes
```typescript
const contractNumber = `SC-E2E-${Date.now()}`;
const title = `Test Subcontract ${Date.now()}`;
```

### 2. Wait for Form to Load
```typescript
await page.waitForLoadState('domcontentloaded');
await expect(page.getByRole('heading', { name: /new subcontract/i }))
  .toBeVisible({ timeout: 30000 });
```

### 3. Verify Navigation
```typescript
// Wait for URL change
await page.waitForURL('**/edit**', { timeout: 15000 });

// Or check current URL
expect(page.url()).toContain('/edit');
```

### 4. Database Verification
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Query database
const { data, error } = await supabase
  .from('subcontracts')
  .select('*')
  .eq('id', commitmentId)
  .single();

// Verify data
expect(data?.title).toBe(expectedTitle);
```

### 5. Cleanup Test Data
```typescript
test.afterAll(async () => {
  // Hard delete test records
  for (const id of createdIds) {
    await supabase.from('subcontracts').delete().eq('id', id);
  }
});
```

---

**End of Workflow Summary**

**For full test scenarios, see:** `test-plan.md`
**For existing tests, see:** `frontend/tests/e2e/commitments/`
