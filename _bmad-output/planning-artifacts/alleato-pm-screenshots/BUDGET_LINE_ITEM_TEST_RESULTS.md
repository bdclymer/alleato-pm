# Budget Line Item Improvements - Test Results

**Date:** 2026-02-01
**Status:** ❌ ALL TESTS FAILING - Features Not Implemented

## Test Execution Summary

- **Total Tests:** 4
- **Passed:** 0
- **Failed:** 4
- **Dev Server:** Running on port 3000 ✓
- **Modal Opens:** ✓ Working correctly

## Current State of Implementation

### What EXISTS (Working):

1. ✓ "Add Line Item" button opens modal dialog
2. ✓ Modal shows "Add Budget Line Items" heading
3. ✓ Basic form fields present:
   - Budget Code (combobox with "Select budget code..." placeholder)
   - Qty (input with "Quantity" placeholder)
   - UOM (dropdown with "Select" button)
   - Unit Cost (input with "Unit cost" placeholder)
   - Amount (calculated field showing "0.00")
4. ✓ "Add Another Line Item" button
5. ✓ Running total at bottom showing "1 line item • Total: $0.00"

### What DOESN'T EXIST (Missing Features):

#### 1. Smart Copy UOM Toggle ❌

**Expected:** Checkbox labeled "Copy UOM to new rows" (checked by default)
**Actual:** No checkbox present anywhere in the modal
**Impact:** Test 1 fails immediately looking for this checkbox

#### 2. Auto-Focus First Field ❌

**Expected:** When "Add Another Line Item" is clicked, focus should move to the Qty field of the new row
**Actual:** Unknown - can't test without implementing feature
**Impact:** Test 2 times out trying to click budget code input (selector issues)

#### 3. Running Total Display ❌

**Status:** Partially exists - shows "1 line item • Total: $0.00"
**Missing:**

- Real-time updates as values are entered
- Currency formatting with commas ($1,000.00, $3,000.00, etc.)
- Plural "line items" vs singular "line item"
**Impact:** Test 3 times out on budget code selector

#### 4. Previous Improvements ❌

**Currency Formatting:** Unknown if Amount field formats with commas
**Enter Key:** Unknown if Enter key creates new row
**Impact:** Test 4 times out on budget code selector

## Test Selector Issues

All tests are failing on selectors like:

- `modal.getByPlaceholder(/select budget code/i)` - The input doesn't have a placeholder attribute
- `modal.getByPlaceholder(/quantity/i)` - Works (placeholder="Quantity")
- `modal.getByPlaceholder(/unit cost/i)` - Works (placeholder="Unit cost")

**The Budget Code field is a combobox/autocomplete, not a simple input with placeholder.**

## Actual Modal Structure (Based on Screenshot)

```html
<div class="modal">
  <h2>Add Budget Line Items</h2>
  <p>Add one or more budget line items to this project</p>

  <div class="row">
    <!-- Budget Code: Combobox (no placeholder attribute visible) -->
    <div>
      <label>Budget Code *</label>
      <input value="Select budget code..." /> <!-- or similar -->
    </div>

    <!-- Qty: Number input -->
    <div>
      <label>Qty</label>
      <input placeholder="Quantity" />
    </div>

    <!-- UOM: Dropdown button -->
    <div>
      <label>UOM</label>
      <button>Select ▼</button>
    </div>

    <!-- Unit Cost: Number input -->
    <div>
      <label>Unit Cost</label>
      <input placeholder="Unit cost" />
    </div>

    <!-- Amount: Calculated field -->
    <div>
      <label>Amount *</label>
      <input value="0.00" readonly />
    </div>
  </div>

  <button>+ Add Another Line Item</button>

  <div class="footer">
    <span>1 line item • Total: $0.00</span>
    <button>Cancel</button>
    <button>Create 1 Line Item</button>
  </div>
</div>
```

## Required Implementation Work

To make these tests pass, the following features must be implemented:

### 1. Smart Copy UOM Toggle

**Location:** `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx`

- Add a checkbox above the form rows
- Label: "Copy UOM to new rows"
- Default: checked
- Behavior: When checked, new rows should copy the UOM from the previous row

### 2. Auto-Focus First Field

**Location:** Same component, "Add Another Line Item" handler

- When new row is added, focus should move to the Qty input of that row
- Use React ref or `input.focus()` after state update

### 3. Running Total Improvements

**Location:** Modal footer component

- Update total in real-time as Amount fields change
- Format currency with commas: `$1,000.00` not `$1000.00`
- Show "1 line item" vs "2 line items" (singular/plural)

### 4. Currency Formatting in Amount Field

**Location:** Amount input component

- Format displayed value with commas
- Store actual number value for calculations
- Example: Display `50,000.00` when value is 50000

## Next Steps

1. **Implement the 3 critical improvements** in the modal component
2. **Fix test selectors** to match actual DOM structure:
   - Budget Code: Use label-based selector or data-testid
   - Other fields: Current selectors should work
3. **Re-run tests** to verify implementation

## Test File Location

`frontend/tests/e2e/budget-line-item-improvements.spec.ts`

## Screenshots

- Test failure screenshots saved in `test-results/` directories
- Modal UI screenshot: Shows current state without improvements

---

**Conclusion:** Tests are correctly written for the DESIRED features, but those features don't exist in the code yet. This is test-driven development - we wrote tests first, now we need to implement the features to make them pass.
