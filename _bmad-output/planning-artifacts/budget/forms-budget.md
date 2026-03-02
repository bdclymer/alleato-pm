---
title: FORMS Budget
description: FORMS Budget documentation
---

# Budget Forms Specification

## Form List

1. **BudgetLineItemForm** - Create/edit individual budget line items
2. **BudgetViewsModal** - Configure custom budget views with column management
3. **BudgetModificationForm** - Create budget modifications/transfers
4. **BudgetSnapshotForm** - Create point-in-time budget snapshots
5. **ForecastSettingsForm** - Configure forecasting parameters
6. **OriginalBudgetEditForm** - Edit original budget amounts with calculation methods
7. **CreateBudgetLineItemsModal** - Wizard for adding multiple budget lines
8. **UnlockBudgetConfirmationModal** - Confirm budget unlock action
9. **ApprovedCOsModal** - Display approved change orders (read-only)
10. **BudgetModificationsModal** - Display budget modifications history (read-only)

## Form Specifications

### 1. BudgetLineItemForm

**Purpose**: Create or edit individual budget line items

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| costCodeId | Combobox | Yes | Must exist in cost_codes | Cost code selection |
| description | Text | Yes | 1-500 chars | Line item description |
| calculationMethod | Radio | No | 'unit', 'lump_sum' | Calculation method |
| unitQty | Number | If unit method | > 0, max 3 decimals | Quantity |
| uom | Combobox | If unit method | Valid UOM code | Unit of measure |
| unitCost | Currency | If unit method | >= 0, 2 decimals | Cost per unit |
| originalAmount | Currency | If lump sum | >= 0, 2 decimals | Total amount |

#### Form Layout

```bash
┌─────────────────────────────────────────┐
│ Cost Code*        [Dropdown ▼]         │
├─────────────────────────────────────────┤
│ Description*      [Text Input         ] │
├─────────────────────────────────────────┤
│ Calculation Method:                     │
│ ○ Unit Price   ○ Lump Sum              │
├─────────────────────────────────────────┤
│ [IF UNIT PRICE SELECTED]                │
│ Qty*    UOM*         Unit Cost*        │
│ [___] [Dropdown ▼] [Currency    ]      │
│                                         │
│ [IF LUMP SUM SELECTED]                  │
│ Original Amount*                        │
│ [Currency                    ]          │
├─────────────────────────────────────────┤
│ Calculated Total: $X,XXX.XX             │
├─────────────────────────────────────────┤
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘
```sql
#### Conditional Logic

- If "Unit Price" selected: Show Qty, UOM, Unit Cost fields
- If "Lump Sum" selected: Show Original Amount field only
- Calculated Total = Qty × Unit Cost (unit method) OR Original Amount (lump sum)
- Real-time calculation updates on field changes

#### Validation Rules

```typescript
const validationSchema = {
  costCodeId: {
    required: "Cost code is required",
    validate: async (value) => {
      const exists = await checkCostCodeExists(value);
      return exists || "Invalid cost code";
    }
  },
  description: {
    required: "Description is required",
    maxLength: { value: 500, message: "Max 500 characters" }
  },
  unitQty: {
    when: "calculationMethod === 'unit'",
    required: "Quantity required for unit pricing",
    min: { value: 0.001, message: "Must be greater than 0" },
    pattern: { value: /^\d+(\.\d{1,3})?$/, message: "Max 3 decimal places" }
  },
  unitCost: {
    when: "calculationMethod === 'unit'",
    required: "Unit cost required for unit pricing",
    min: { value: 0, message: "Must be >= 0" },
    pattern: { value: /^\d+(\.\d{1,2})?$/, message: "Max 2 decimal places" }
  }
};
```markdown
### 2. BudgetViewsModal
**Purpose**: Configure custom budget views with drag-drop column management

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | Text | Yes | 3-100 chars, unique | View name |
| description | Textarea | No | Max 500 chars | View description |
| isDefault | Checkbox | No | Only one default per project | Set as default view |
| columns | Drag-Drop List | Yes | Min 1 column | Configurable columns |
| columnVisibility | Checkbox per column | No | Boolean per column | Show/hide columns |
| columnOrder | Number per column | Auto | 1-N sequence | Display order |

#### Form Layout
```

┌─────────────────────────────────────────┐
│ View Name*       [Text Input          ] │
├─────────────────────────────────────────┤
│ Description                             │
│ [Textarea                             ] │
├─────────────────────────────────────────┤
│ ☐ Set as Default View                   │
├─────────────────────────────────────────┤
│ Columns Configuration                   │
│ ┌─────────────────┬─────────────────┐   │
│ │ Available       │ Selected        │   │
│ │                 │                 │   │
│ │ ☐ Cost Type     │ ☑ Cost Code ↕   │   │
│ │ ☐ Unit Cost     │ ☑ Description ↕ │   │
│ │ ☐ Direct Costs  │ ☑ Orig Budget ↕ │   │
│ │ ...             │ ☑ Revised ↕     │   │
│ │                 │ ...             │   │
│ └─────────────────┴─────────────────┘   │
├─────────────────────────────────────────┤
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘

```markdown
#### Available Columns (19 total)
```typescript
const AVAILABLE_BUDGET_COLUMNS = [
  { key: 'costCode', name: 'Cost Code', required: true },
  { key: 'description', name: 'Description', required: true },
  { key: 'originalBudget', name: 'Original Budget' },
  { key: 'budgetModifications', name: 'Budget Modifications' },
  { key: 'approvedCOs', name: 'Approved COs' },
  { key: 'revisedBudget', name: 'Revised Budget' },
  { key: 'pendingBudgetChanges', name: 'Pending Budget Changes' },
  { key: 'projectedBudget', name: 'Projected Budget' },
  { key: 'committedCosts', name: 'Committed Costs' },
  { key: 'pendingCostChanges', name: 'Pending Cost Changes' },
  { key: 'projectedCosts', name: 'Projected Costs' },
  { key: 'jtdCostDetail', name: 'Job to Date Cost Detail' },
  { key: 'directCosts', name: 'Direct Costs' },
  { key: 'forecastToComplete', name: 'Forecast to Complete' },
  { key: 'projectedOverUnder', name: 'Projected Over/Under' },
  { key: 'costType', name: 'Cost Type' },
  { key: 'unitQty', name: 'Unit Qty' },
  { key: 'uom', name: 'UOM' },
  { key: 'unitCost', name: 'Unit Cost' }
];
```bash
### 3. BudgetModificationForm

**Purpose**: Create budget modifications/transfers between cost codes

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| fromCostCode | Combobox | Yes | Must exist, have balance | Source cost code |
| toCostCode | Combobox | Yes | Must exist, != from | Destination cost code |
| amount | Currency | Yes | > 0, <= available | Transfer amount |
| description | Textarea | Yes | 10-500 chars | Transfer reason |
| effectiveDate | Date | Yes | <= today | When modification takes effect |

#### Form Layout

```bash
┌─────────────────────────────────────────┐
│ Transfer From*   [Cost Code Dropdown ▼] │
│ Available: $X,XXX.XX                    │
├─────────────────────────────────────────┤
│ Transfer To*     [Cost Code Dropdown ▼] │
├─────────────────────────────────────────┤
│ Amount*          [Currency            ] │
├─────────────────────────────────────────┤
│ Effective Date*  [Date Picker        ] │
├─────────────────────────────────────────┤
│ Description*                            │
│ [Textarea                             ] │
├─────────────────────────────────────────┤
│ Summary:                                │
│ Move $XXX from Cost Code A to Cost Code B │
├─────────────────────────────────────────┤
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```

### 4. BudgetSnapshotForm

**Purpose**: Create point-in-time budget snapshots

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | Text | Yes | 3-100 chars | Snapshot name |
| snapshotType | Radio | Yes | 'manual', 'milestone', 'baseline' | Snapshot type |
| description | Textarea | No | Max 500 chars | Snapshot description |
| setAsBaseline | Checkbox | No | Only if milestone/baseline | Set as baseline |

#### Form Layout

```text
┌─────────────────────────────────────────┐
│ Snapshot Name*   [Text Input          ] │
├─────────────────────────────────────────┤
│ Type*                                   │
│ ○ Manual       ○ Milestone             │
│ ○ Baseline                              │
├─────────────────────────────────────────┤
│ Description                             │
│ [Textarea                             ] │
├─────────────────────────────────────────┤
│ ☐ Set as Project Baseline               │
├─────────────────────────────────────────┤
│ This will capture the current budget    │
│ state including all line items and      │
│ calculations as of today.               │
├─────────────────────────────────────────┤
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```markdown
### 5. ForecastSettingsForm

**Purpose**: Configure forecasting parameters for budget lines

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| defaultFtcMethod | Radio | Yes | Valid method enum | Default FTC calculation method |
| defaultCurveId | Combobox | If automatic | Valid curve ID | Default forecasting curve |
| forecastingEnabled | Checkbox | No | Boolean | Enable forecasting for project |
| burnRateWindow | Number | No | 1-52 weeks | Window for burn rate calculation |

#### Form Layout

```text
┌─────────────────────────────────────────┐
│ Default FTC Method*                     │
│ ○ Manual Entry                          │
│ ○ Automatic (burn rate + curve)         │
│ ○ Lump Sum Distribution                 │
│ ○ Monitored Resources                   │
├─────────────────────────────────────────┤
│ [IF AUTOMATIC SELECTED]                 │
│ Default Curve*   [Curve Dropdown ▼]    │
├─────────────────────────────────────────┤
│ ☑ Enable Forecasting for Project       │
├─────────────────────────────────────────┤
│ Burn Rate Window  [4] weeks             │
├─────────────────────────────────────────┤
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘
```

### 6. OriginalBudgetEditForm

**Purpose**: Edit original budget amounts with calculation methods

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| calculationMethod | Radio | Yes | 'unit', 'lump_sum' | How budget is calculated |
| unitQty | Number | If unit | > 0, 3 decimals | Quantity |
| uom | Combobox | If unit | Valid UOM | Unit of measure |
| unitCost | Currency | If unit | >= 0, 2 decimals | Cost per unit |
| originalBudget | Currency | Read-only | Calculated | Total budget amount |

#### Form Layout (Horizontal)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Calculation Method*                                             │
│ ○ [📊] Unit Price    ○ [💰] Lump Sum                           │
├─────────────────────────────────────────────────────────────────┤
│ Unit Qty*    UOM*         Unit Cost*         Original Budget   │
│ [   100  ] [SF      ▼] [$ 500.00   ] = [$ 50,000.00        ] │
├─────────────────────────────────────────────────────────────────┤
│                                              [Cancel] [Done]   │
└─────────────────────────────────────────────────────────────────┘
```javascript
#### Real-time Calculation

```typescript
const calculateTotal = (method, qty, unitCost, lumpSum) => {
  if (method === 'unit') {
    return (parseFloat(qty) || 0) * (parseFloat(unitCost) || 0);
  }
  return parseFloat(lumpSum) || 0;
};
```markdown
### 7. CreateBudgetLineItemsModal
**Purpose**: Wizard for adding multiple budget line items

#### Form Fields (Table Format)
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| budgetCode | Combobox per row | Yes | Must exist | Budget code selection |
| qty | Number per row | Yes | > 0 | Quantity |
| uom | Combobox per row | No | Valid UOM | Unit of measure |
| unitCost | Currency per row | No | >= 0 | Cost per unit |
| amount | Currency per row | Auto-calculated | Read-only | Total per line |

#### Form Layout
```

┌─────────────────────────────────────────────────────────────────┐
│ Create Budget Line Items                                        │
├─────────────────────────────────────────────────────────────────┤
│ You Have No Line Items Yet                                      │
│                    [+ Add Line]                                 │
├─────────────────────────────────────────────────────────────────┤
│ Budget Code       │ Qty     │ UOM    │ Unit Cost │ Amount     │ │
├───────────────────┼─────────┼────────┼───────────┼─────────────┤ │
│ [01-1000 ▼]      │ [100  ] │ [SF ▼] │ [$500.00] │ $50,000.00 │ │
│ [01-2000 ▼]      │ [50   ] │ [EA ▼] │ [$200.00] │ $10,000.00 │ │
├─────────────────────────────────────────────────────────────────┤
│                           [+ Add Line]                         │
├─────────────────────────────────────────────────────────────────┤
│ Total: $60,000.00                                               │
├─────────────────────────────────────────────────────────────────┤
│                                              [Close] [Create]   │
└─────────────────────────────────────────────────────────────────┘

```markdown
### 8. UnlockBudgetConfirmationModal
**Purpose**: Confirm budget unlock action with warning

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| confirmation | Boolean | Yes | Must be true | User acknowledgment |

#### Form Layout
```typescript
┌─────────────────────────────────────────┐
│ ⚠️ Unlock Budget Confirmation          │
├─────────────────────────────────────────┤
│ Unlocking the Budget will preserve      │
│ your Budget Modifications.              │
│                                         │
│ Once unlocked:                          │
│ • Original Budget amounts can be edited │
│ • Budget line items can be added/edited │
│ • All changes will be tracked           │
├─────────────────────────────────────────┤
│  [Cancel]      [Preserve and Unlock]   │
└─────────────────────────────────────────┘

```typescript
## Global Form Behavior

### Standard Form Elements
All forms include these standard components:

#### Header
- Dark grey background (#374151)
- White title text
- White close button (X) in top right

#### Footer
- Light grey background
- Cancel button (left, secondary style)
- Primary action button (right, orange/blue)

#### Validation
- Real-time validation on field blur
- Error messages below invalid fields
- Submit button disabled until valid
- Red border on invalid fields

#### Keyboard Shortcuts
- ESC: Close modal/cancel
- TAB: Navigate between fields
- ENTER: Submit (if applicable)
- Arrow keys: Navigate radio buttons/checkboxes

### Error Handling Patterns

#### Field Validation
```typescript
interface FieldError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'custom';
}

const displayError = (field: string, error: FieldError) => {
  // Red border on field
  // Error message below field
  // Icon indicator
};
```

#### Form Submission

```typescript
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    const result = await submitForm(formData);
    showSuccessToast(result.message);
    closeModal();
  } catch (error) {
    if (error.type === 'validation') {
      setFieldErrors(error.errors);
    } else {
      showErrorToast(error.message);
    }
  } finally {
    setLoading(false);
  }
};
```javascript
### Accessibility Requirements

#### ARIA Labels
- All form fields have proper labels
- Required fields marked with aria-required="true"
- Error messages linked with aria-describedby
- Form sections have appropriate headings

#### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements focusable
- Visual focus indicators
- Skip links for long forms

#### Screen Reader Support
- Form purpose announced
- Field types and requirements announced
- Error messages read aloud
- Success/failure feedback provided

#### Color Contrast
- WCAG AA compliance (4.5:1 minimum)
- Error states not color-only
- High contrast mode support

### Mobile Responsiveness

#### Breakpoint Behavior
- **Desktop** (>1024px): Standard layouts as shown
- **Tablet** (768-1024px): Adjusted spacing, larger touch targets
- **Mobile** (<768px): Single column, full-width inputs

#### Touch Targets
- Minimum 44x44px for all buttons
- Adequate spacing between elements
- Swipe gestures for table scrolling

### Loading States

#### Form Submission
```typescript
const LoadingButton = ({ loading, children, ...props }) => (
  <button disabled={loading} {...props}>
    {loading ? <Spinner /> : children}
  </button>
);
```

#### Data Loading

- Skeleton screens while loading options
- Progressive enhancement
- Graceful fallbacks for failed loads
