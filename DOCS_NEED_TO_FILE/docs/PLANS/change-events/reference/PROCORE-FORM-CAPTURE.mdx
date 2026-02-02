# Create Change Event - Field Mapping

**Form Type:** Create
**Module:** Change Events
**URL Pattern:** `/projects/{project_id}/project/change_events/events/new`
**Primary Table:** `change_events`

## Form Fields

| Field Label | Field Name | Type | Required | Validation | Default | Options | DB Column | Related Table | Description | Help Text | Conditional |
|------------|------------|------|----------|------------|---------|---------|-----------|---------------|-------------|-----------|-------------|
| Number | number | text | No | Max 10 chars, auto-increment | Auto-generated (e.g., "035") | - | change_events.number | - | Unique identifier for change event within project | Auto-increments from last change event | - |
| Title | title | text | Yes | Max 255 chars | - | - | change_events.title | - | Descriptive title for the change event | Required field, describes the change | - |
| Status | status | select | Yes | Must be valid enum | Open | Open, Pending Approval, Approved, Rejected, Closed | change_events.status | - | Current workflow status | Status determines workflow state | - |
| Origin | origin | select | No | - | - | [Project-specific list] | change_events.origin | - | Source/origin of the change | Where did this change request originate | - |
| Type | type | select | Yes | Must be valid enum | Allowance | Owner Change, Design Change, Allowance, Scope Gap, Unforeseen Condition, Value Engineering, Owner Requested, Constructability Issue | change_events.type | - | Category/type of change | Classifies the nature of the change | - |
| Change Reason | reason | select | Yes | - | Allowance | [Customizable list per type] | change_events.reason | - | Specific reason for the change | Sub-categorization of change type | Populated based on Type selection |
| Scope | scope | select | Yes | Must be valid enum | TBD | TBD, In Scope, Out of Scope | change_events.scope | - | Scope classification | Whether change is within original scope | - |
| Expecting Revenue | expectingRevenue | radio | Yes | - | Yes | Yes, No | change_events.expecting_revenue | - | Whether revenue is expected from this change | Determines if revenue fields are shown | - |
| Line Item Revenue Source | lineItemRevenueSource | select | Conditional | - | Match Revenue to Latest Cost | Match Revenue to Latest Cost, Manual Entry, Percentage Markup, Fixed Amount | change_events.line_item_revenue_source | - | How revenue is calculated for line items | Method for calculating revenue estimates | Only shown if Expecting Revenue = Yes |
| Prime Contract for Markup Estimates | primeContractId | select | Conditional | Must exist in contracts | - | [List of prime contracts] | change_events.prime_contract_id | contracts.id | Prime contract used for markup calculations | Used when revenue source involves markup | Only shown if Expecting Revenue = Yes |
| Description | description | rich-text | No | - | - | - | change_events.description | - | Detailed description of change event | Supports rich text formatting (bold, italic, lists, etc.) | - |
| Attachments | attachments | file-upload | No | Max 10MB per file, multiple files | - | - | change_event_attachments.file_path | - | Supporting documents | Drag & drop or click to attach files | - |

## Field Groups

### General Information
Contains basic identifying information about the change event.

**Fields:**
- Number
- Title
- Status
- Origin

**Layout:** 2x2 grid (Number/Title on first row, Status/Origin on second row)

### Change Classification
Categorizes the nature and scope of the change.

**Fields:**
- Type
- Change Reason
- Scope

**Layout:** 3 columns side-by-side

### Revenue Configuration
Determines whether and how revenue is tracked.

**Fields:**
- Expecting Revenue (radio buttons)
- Line Item Revenue Source
- Prime Contract for Markup Estimates

**Layout:** Radio buttons horizontal, dropdowns appear conditionally below

### Description
Rich text editor for detailed description.

**Fields:**
- Description (TinyMCE editor)

**Layout:** Full width editor with formatting toolbar

### Attachments
File upload area.

**Fields:**
- Attachments (drag & drop zone)

**Layout:** Full width dashed border area with "Attach Files or Drag & Drop" text

### Line Items
Data grid for adding revenue and cost line items.

**Columns:**
- Budget Code (select)
- Description (text)
- Vendor (select)
- Contract (select)
- Unit of Measure (text)
- Quantity (number)
- Unit Cost (money)
- Revenue ROM (money)
- Cost ROM (money)
- Non-Committed Cost (money)

**Layout:** Scrollable data grid with Add Line button below

**Initial State:** Empty with "No line items for Change Event" message and "Add Line" button

## Validation Rules

1. **Title is required** - Cannot submit without a title
2. **Type must be selected** - Required field
3. **Change Reason must match Type** - Reason options are filtered based on selected Type
4. **Scope must be selected** - Required field
5. **Expecting Revenue determines conditional fields** - If Yes, shows revenue-related fields
6. **Line Item Revenue Source required if Expecting Revenue = Yes**
7. **Prime Contract required if Revenue Source involves markup**
8. **Number is auto-generated** - User can edit but must be unique within project
9. **At least one line item recommended** - System allows submission without line items but typically requires them for approval
10. **File uploads limited to 10MB per file**

## Conditional Logic

### Revenue Fields Visibility
```
IF expectingRevenue === "Yes" THEN
  SHOW Line Item Revenue Source
  SHOW Prime Contract for Markup Estimates
  SHOW Revenue ROM column in line items grid
ELSE
  HIDE all revenue-related fields
END IF
```

### Change Reason Options
```
WHEN Type changes:
  Filter Change Reason options to match selected Type
  Reset Change Reason value
  Update dropdown options dynamically
```

### Line Items Grid
```
IF line items exist THEN
  SHOW data grid with rows
  SHOW totals at bottom (sum of Revenue ROM, Cost ROM, Non-Committed Cost)
ELSE
  SHOW "No line items for Change Event" message
  SHOW "Add Line" button
END IF
```

## Database Operations

### On Submit (Create)

```sql
BEGIN TRANSACTION;

-- 1. Insert main change event record
INSERT INTO change_events (
  id,
  project_id,
  number,
  title,
  type,
  reason,
  scope,
  status,
  origin,
  expecting_revenue,
  line_item_revenue_source,
  prime_contract_id,
  description,
  created_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  $project_id,
  $number, -- auto-generated if empty
  $title,
  $type,
  $reason,
  $scope,
  COALESCE($status, 'Open'),
  $origin,
  $expecting_revenue,
  CASE WHEN $expecting_revenue THEN $line_item_revenue_source ELSE NULL END,
  CASE WHEN $expecting_revenue THEN $prime_contract_id ELSE NULL END,
  $description,
  $current_user_id,
  NOW(),
  NOW()
) RETURNING id;

-- 2. Insert line items
INSERT INTO change_event_line_items (
  id,
  change_event_id,
  budget_code_id,
  description,
  vendor_id,
  contract_id,
  unit_of_measure,
  quantity,
  unit_cost,
  revenue_rom,
  cost_rom,
  non_committed_cost,
  sort_order,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  $change_event_id,
  budget_code_id,
  description,
  vendor_id,
  contract_id,
  unit_of_measure,
  quantity,
  unit_cost,
  revenue_rom,
  cost_rom,
  non_committed_cost,
  ROW_NUMBER() OVER () as sort_order,
  NOW(),
  NOW()
FROM unnest($line_items);

-- 3. Upload attachments to storage and insert records
INSERT INTO change_event_attachments (
  id,
  change_event_id,
  file_name,
  file_path,
  file_size,
  mime_type,
  uploaded_by,
  uploaded_at
)
SELECT
  gen_random_uuid(),
  $change_event_id,
  file_name,
  file_path, -- from storage service
  file_size,
  mime_type,
  $current_user_id,
  NOW()
FROM unnest($attachments);

-- 4. Create audit trail entry
INSERT INTO change_event_history (
  id,
  change_event_id,
  field_name,
  old_value,
  new_value,
  changed_by,
  changed_at,
  change_type
) VALUES (
  gen_random_uuid(),
  $change_event_id,
  'status',
  NULL,
  'Open',
  $current_user_id,
  NOW(),
  'create'
);

COMMIT;
```

### On Submit (Validation)

```typescript
// Frontend validation before submission
interface ChangeEventFormData {
  number?: string;
  title: string;
  type: string;
  reason?: string;
  scope: string;
  status: string;
  origin?: string;
  expecting_revenue: boolean;
  line_item_revenue_source?: string;
  prime_contract_id?: string;
  description?: string;
  line_items: LineItem[];
  attachments: File[];
}

function validateChangeEventForm(data: ChangeEventFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Required fields
  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!data.type) {
    errors.type = 'Type is required';
  }

  if (!data.scope) {
    errors.scope = 'Scope is required';
  }

  // Conditional validation
  if (data.expecting_revenue) {
    if (!data.line_item_revenue_source) {
      errors.line_item_revenue_source = 'Revenue source is required when expecting revenue';
    }

    if (data.line_item_revenue_source?.includes('Markup') && !data.prime_contract_id) {
      errors.prime_contract_id = 'Prime contract is required for markup calculations';
    }
  }

  // Title length
  if (data.title && data.title.length > 255) {
    errors.title = 'Title must be 255 characters or less';
  }

  // Number length and format
  if (data.number && data.number.length > 10) {
    errors.number = 'Number must be 10 characters or less';
  }

  // Line items validation
  data.line_items.forEach((item, index) => {
    if (item.quantity && item.quantity < 0) {
      errors[`line_items[${index}].quantity`] = 'Quantity cannot be negative';
    }

    if (item.unit_cost && item.unit_cost < 0) {
      errors[`line_items[${index}].unit_cost`] = 'Unit cost cannot be negative';
    }
  });

  // File validation
  data.attachments.forEach((file, index) => {
    if (file.size > 10 * 1024 * 1024) {
      errors[`attachments[${index}]`] = 'File size must be less than 10MB';
    }
  });

  return errors;
}
```

## Form Behavior

### Auto-numbering
- When form loads, system fetches the last change event number for the project
- Increments by 1 (with leading zeros to maintain format, e.g., 034 → 035)
- User can override the auto-generated number
- System validates uniqueness before submission

### Type/Reason Cascading
- Change Reason dropdown is populated based on selected Type
- When Type changes, Reason resets and shows filtered options
- Each Type has 5-10 associated Reason values

### Revenue Calculation
- When "Expecting Revenue" is Yes, revenue fields appear in line items grid
- Revenue can be calculated automatically or entered manually
- "Match Revenue to Latest Cost" automatically populates revenue based on cost + markup
- Markup percentages come from selected Prime Contract

### Line Items Grid
- Starts empty with "Add Line" button
- Clicking "Add Line" adds a new row to grid
- Budget Code dropdown shows project's budget structure
- Vendor and Contract dropdowns filtered to project's directory
- Unit of Measure is free text (common values: SF, LF, EA, LS)
- Totals calculated automatically at bottom of grid

### Attachments
- Drag & drop or click to browse
- Multiple files can be uploaded
- Shows upload progress
- Files are uploaded to storage before form submission
- Can remove attachments before saving

## Field Dependencies

```
Type → Change Reason (filters options)
Expecting Revenue → Line Item Revenue Source (shows/hides)
Expecting Revenue → Prime Contract (shows/hides)
Expecting Revenue → Revenue ROM column (shows/hides)
Line Item Revenue Source → Prime Contract (required if markup-based)
Budget Code → Unit of Measure (suggests common UOM for code)
```

## Default Values on Load

```javascript
{
  number: "035", // auto-generated
  status: "Open",
  type: "Allowance",
  scope: "TBD",
  expecting_revenue: true,
  line_item_revenue_source: "Match Revenue to Latest Cost",
  line_items: [],
  attachments: []
}
```

## Success Response

After successful submission:
1. Redirect to change event detail view
2. Show success toast: "Change Event {number} created successfully"
3. Change event appears in main list
4. Audit trail entry created

## Error Handling

| Error Type | User Message | Technical Handling |
|------------|--------------|-------------------|
| Missing Title | "Title is required" | Highlight title field in red, focus input |
| Duplicate Number | "Change event number {number} already exists" | Suggest next available number |
| Invalid Type | "Please select a valid change type" | Reset dropdown, show error |
| File Too Large | "File {name} exceeds 10MB limit" | Remove file from upload queue |
| Network Error | "Unable to save change event. Please try again." | Retry with exponential backoff |
| Permission Error | "You don't have permission to create change events" | Disable submit button, show message |

## Related Documentation

- [Change Events Schema](../schema.md)
- [Change Events Workflow](../workflow.md)
- [Edit Change Event Form](./form-edit-change-event.md)
- [Change Event Line Items](./form-line-items.md)
