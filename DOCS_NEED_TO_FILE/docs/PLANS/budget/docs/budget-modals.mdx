# Budget Modals


Original Budget Amount
Modal with original budget amountand is editable

Budget Modifications
Modal	Displays budget modifications associated

Approved COs
(Prime Contract)Source Column
Change Orders with Status: Approved	Source Column	
Modal with approved change orders that link to change order. Ex: 007 - CE #019 - Permit Fees

Job to Date Cost Detail
(Direct Costs)
Source Column
Direct CostsType: Invoice, Expense, Payroll, Subcontractor InvoiceStatus: Approved	Source Column
Modal showing Approved direct costs

Direct Costs
Direct Costs Type: Invoice, Expense, PayrollStatus: Pending, Revise and Resubmit, Approved	Source Column	
Modal with direct costs that toggle to show all payments tied to the direct cost

Pending Budget Changes
	(Prime Contract)
Source Column
Change Orders
Status: Pending - In Review; Pending - Not Pricing; Pending - Not Proceeding; Pending - Pricing; Pending - Proceeding; Pending - Revised	Source Column	Yes	
Projected Budget	Calculated Column 

Committed Costs
	(Commitment)Source Column
Subcontracts — Status: Approved, CompletePurchase Order Contracts — Status: ApprovedChange Orders — Status: Approved
	Source Column	Yes	

Pending Cost Changes
	Commitment)Source Column

Subcontracts — Status: Out For SignaturePurchase Order Contracts — Status: Processing, Submitted, Partially Received, ReceivedChange Orders — Status: Pending - In Review; Pending - Not Pricing; Pending - Not Proceeding; Pending - Pricing; Pending - Proceeding; Pending - Revised
	Source Column	Yes	

Forecast To Complete
	Standard Column
Projected Budget - Projected Costs = Forecast To CompleteIf negative, column will show 0.	Standard Column	Yes	

## Original budget

Review screenshot: /Users/meganharrison/Documents/github/alleato-procore/scripts/screenshot-capture/procore-budget-crawl/budget-modals/original-budget.png

## MODAL #1: APPROVED COS

### Trigger

- **When:** User clicks on a hyperlinked value in the "Approved COs" column (blue text)
- **Where:** In the main budget table
- **Data Parameter:** Cost Code (e.g., "01-3120.L")

### Modal Title

`"Approved COs for [COST_CODE]"` (e.g., "Approved COs for 01-3120.L")

### Header Bar

- Dark grey background
- Contains title and close button (X)
- Close button dismisses modal without saving (no changes possible)

### Content Structure

A table with 3 columns:

```
Column Width
Data 
TypeSortableEditableNotesNo.30%TextNoNoChange Order number with prefix (e.g., "002 - CE #0008 - Phase 1 & 2 Changes")Description45%TextNoNoDetailed description of what the CO addressesAmount25%CurrencyNoNoDollar amount of the line item
```

### Data Rows

- **Header row:** Column titles with grey background
- **CO parent row:** Shows CO number and total amount
    - May be expandable (indicated by ">" arrow) to show line items
    - Example: "002 - CE #008 - Phase 1 & 2 Changes" | $18,053.80
- **Line item rows (nested under CO):** Show individual items
    - Example: "1" | "Added Time Phase 1 & 2" | "$18,053.80"
- **Total row:** Always at bottom, bold text
    - Shows sum of all COs
    - Example: "Total:" (blank) | $18,053.80

### Data Source

- Pulls from Change Order system filtered by:
    - Status = "Approved"
    - Cost Code = [selected cost code]
    - Contract Type = Prime Contract (shown in tooltip)

### Buttons

- **Close button (X):** Top right corner, white
    - Action: Dismiss modal
    - No saving required

### Closing Behavior

- User can close by clicking X
- No save/cancel buttons needed (read-only)

### Empty State

- If no approved COs exist: "No Approved COs for this cost code" message
- Still show table headers

---

## BUDGET MODIFICATIONS

### Trigger

- **When:** User clicks on a hyperlinked value in the "Budget Modifications" column (blue text)
- **Where:** In the main budget table
- **Data Parameter:** Cost Code (e.g., "01-3120.L")

### Modal Title

`"Budget Modifications for [COST_CODE]"` (e.g., "Budget Modifications for 01-3120.L")

### Content Structure

A table with 5 columns. Example:

| Date | From | To | Notes | Amount |
|--------|----------|-------|------|-------|
| 09/24/ | 55-0099.R-Unallocated Costs.Contract Revenue | 01-3120.L-Vice President.Labor | | $128 |

### Data Rows

- **Header row:** Column titles with grey background
- **Modification rows:** Each row shows one budget transfer transaction
    - Example Row 1: "09/24/25" | "55-0099.R-Unallocated Costs.Contract Revenue" | "01-3120.L-Vice President.Labor" | "(empty)" | "+$128.02"
    - Example Row 2: "07/01/25" | "01-3120.L-Vice President.Labor" | "55-0099.R-Unallocated Costs.Contract Revenue" | "(empty)" | "($728.73)"
- **Total row:** Always at bottom, bold text
    - Shows net change
    - Example: "Total:" (blank) | (blank) | (blank) | (blank) | "($600.71)"

### Data Source

- Pulls from Budget Modification system
- Filtered by:
    - Cost Code = [selected cost code]
    - Status = All (shows all modifications)
    - Date range = All

### Sorting/Filtering

- No built-in sort/filter (may add in future)
- Rows typically show in reverse chronological order (newest first)

### Buttons

- **Close button (X):** Top right corner, white
    - Action: Dismiss modal

### Closing Behavior

- User can close by clicking X
- No save/cancel buttons needed (read-only)

### Empty State

- If no modifications exist: "No Budget Modifications for this cost code" message
- Still show table headers

### Special Rules

- Amounts shown in parentheses indicate negative numbers (e.g., "($728.73)")
- Positive amounts shown without parentheses (e.g., "$128.02")

---

## MODAL #3: JOB TO DATE COST DETAIL

### Trigger

- **When:** User clicks on a hyperlinked value in the "Job to Date Cost Detail" column (blue text)
- **Where:** In the main budget table
- **Data Parameter:** Cost Code (e.g., "01-3120.L")

### Modal Title

`"Job to Date Cost Detail for [COST_CODE]"` (e.g., "Job to Date Cost Detail for 01-3120.L")

### Header Bar

- Dark grey background
- Contains title and close button (X)
- Close button dismisses modal without saving

### Content Structure

A table with 10 columns, with expandable row groups:

```
ColumnWidthData TypeSortableEditableNotesItem12%TextNoNoCost category (e.g., "Expense (4)", "Labor", "Payroll") with expand arrow (">")Date12%DateNoNoDate cost was incurred (MM/DD/YYYY format)Received Date12%DateNoNoDate cost was received/invoicedNo.8%TextNoNoInvoice or reference numberDescription20%TextNoNoDetailed description of cost itemVendor12%TextNoNoVendor/contractor nameQTY6%NumberNoNoQuantity (often 1.00 or 4.00 for payroll)UOM6%TextNoNoUnit of Measure (blank for most items)Unit Cost8%CurrencyNoNoCost per unit (often $0.00 for labor)Amount12%CurrencyNoNoTotal line amount
```

### Data Rows Structure

**Row Group (Collapsed/Expandable):**

`▸ Expense (4)     [collapsed, can expand]`

**When Expanded Becomes:**

`▼ Expense (4)     [expanded, shows sub-rows]
  5/23/2025  5/23/2025  [no]  Pay Date 05/23/2025...  [vendor]  4.00  [blank]  $0.00  $352.74
  5/09/2025  5/09/2025  [no]  Pay Date 05/09/2025...  [vendor]  4.00  [blank]  $0.00  $881.83
  5/09/2025  5/09/2025  [no]  Pay Date 05/09/2025...  [vendor]  1.00  [blank]  $0.00  $8.75
  4/25/2025  4/25/2025  [no]  Pay Date 04/25/2025...  [vendor]  4.00  [blank]  $0.00  $1,587.31`

### Item Category Types

- Expense (with count in parentheses, e.g., "Expense (4)")
- Labor
- Payroll
- Subcontractor Invoice
- Other cost types as defined in system

### Data Source

- Pulls from Project Actuals/Costs system
- Filtered by:
    - Cost Code = [selected cost code]
    - Status = "Approved"
    - Date Range = "Job to Date" (all historical costs)

### Special Indicators

- **Warning Icon (⚠️):** Appears in certain rows to flag issues
    - May indicate disputed costs, timing issues, or other flags
    - Hover or click for details (future enhancement)

### Buttons

- **Close button (X):** Top right corner, white
    - Action: Dismiss modal

### Closing Behavior

- User can close by clicking X
- Expanded/collapsed state not saved (resets on reopen)

### Empty State

- If no costs exist: "No Job to Date costs recorded for this cost code" message
- Still show table headers

### Interaction

- Click ">" arrow to expand/collapse item groups
- No other inline interactions
- All data is read-only

---

## MODAL #4: DIRECT COSTS

### Trigger

- **When:** User clicks on a hyperlinked value in the "Direct Costs" column (blue text)
- **Where:** In the main budget table
- **Data Parameter:** Cost Code (e.g., "01-3120.L")

### Modal Title

`"Direct Costs for [COST_CODE]"` (e.g., "Direct Costs for 01-3120.L")

### Header Bar

- Dark grey background
- Contains title and close button (X)
- Close button dismisses modal without saving

### Content Structure

**IDENTICAL to Modal #3 (Job to Date Cost Detail)**

```
ColumnWidthData TypeNotesItem12%TextExpandable cost categoriesDate12%DateDate cost incurredReceived Date12%DateDate cost receivedNo.8%TextReference numberDescription20%TextCost descriptionVendor12%TextVendor nameQTY6%NumberQuantityUOM6%TextUnit of MeasureUnit Cost8%CurrencyPer-unit costAmount12%CurrencyTotal amount
```

### Data Source

- Pulls from Direct Costs system (different source from Job to Date)
- Filtered by:
    - Cost Code = [selected cost code]
    - Status = All statuses included
    - Type = Invoice, Expense, Payroll

### Differences from Modal #3

- May include different cost types
- May have different approval statuses
- Scope is "Direct Costs" only (not all costs)
- Often shows different totals than Job to Date

### Buttons

- **Close button (X):** Top right corner, white

### Closing Behavior

- User can close by clicking X
- No save needed (read-only)

### Empty State

- If no direct costs exist: "No Direct Costs recorded" message

### Interaction

- Click ">" to expand/collapse
- All data is read-only

---

## MODAL #5: ORIGINAL BUDGET AMOUNT - EDIT TAB

### Trigger

- **When:** User clicks on "..." (ellipsis) icon next to a value in "Original Budget Amount" column
- **Where:** In the main budget table
- **Data Parameter:** Cost Code (e.g., "01-3128.L")

### Modal Title

`"Original Budget Amount for [COST_CODE]"` (e.g., "Original Budget Amount for 01-3128.L")

### Header Bar

- Dark grey background
- Contains title and close button (X)

### Tab Navigation

Two tabs at top of content area:

1. **Original Budget** (currently active, underlined)
2. **History** (clickable, switches to history view)

### Content Structure (Original Budget Tab)

A form with 5 fields arranged in a single row:

```
FieldTypeEditableDefaultValidationNotesCalculation MethodRadio buttons (2 options)Yes[varies]Must select oneOption 1: Grid icon; Option 2: Warning/Alert iconUnit QtyText Input (numeric)YesEmptyNumber onlyAccepts decimal values (e.g., 4.00, 1.50)UOMDropdown/ComboboxYes"Select"Valid UOM from listClick to see available units of measureUnit CostText Input (currency)YesEmptyCurrency formatAccepts $X.XX formatOriginal BudgetDisplay FieldNoCalculatedRead-onlyAuto-calculated as: Unit Qty × Unit Cost
```

### Field Layout

- Fields displayed in a horizontal row
- Each field has a label above it
- All fields except Original Budget are editable
- Original Budget field shows result of calculation in light grey/disabled state

### Data Population

- Fields pre-populate with current values when modal opens
- If no current budget: fields start empty
- Original Budget always shows current amount or $0.00

### Calculation Logic

`Original Budget = Unit Qty × Unit Cost`

- Calculation updates in real-time as user types
- Displayed in Original Budget field (read-only)

### Buttons

- **Done** button (grey/dark): Bottom right
    - Action: Save changes and close modal
    - Only enabled if changes made
    - Validates form before saving
- **Close button (X):** Top right corner
    - Action: Dismiss without saving
    - Shows confirmation if unsaved changes exist

### Form Behavior

- Changes are NOT auto-saved
- User must click "Done" to save
- Clicking X without saving shows: "Are you sure? Your changes will be lost."

### Empty State

- If cost code has no original budget data: all fields start empty
- Original Budget field shows "$0.00"

### Validation Rules

- Unit Qty: Must be numeric (positive)
- Unit Cost: Must be currency format
- At least one of Qty/Cost must be entered
- Both fields required if either is filled

### Success Feedback

- After clicking "Done": Modal closes
- Original Budget Amount column in table updates
- Success toast notification (optional): "Budget Amount Updated"

---

## MODAL #6: ORIGINAL BUDGET AMOUNT - HISTORY TAB

### Trigger

- **When:** User clicks on the "History" tab in Modal #5
- **Where:** Inside the Original Budget Amount modal
- **Data Parameter:** Cost Code (carries over from Modal #5)

### Modal Title

`"Original Budget Amount for [COST_CODE]"` (same as Modal #5)

### Header Bar

- Dark grey background
- Contains title and close button (X)

### Tab Navigation

Two tabs at top:

1. **Original Budget** (clickable, switches back to edit view)
2. **History** (currently active, underlined)

### Content Structure (History Tab)

A read-only table with 5 columns showing audit trail:

```
ColumnWidthData TypeSortableNotesSnapshot Name40%Text (with timestamp)NoFormat: "Current - MM/DD/YY at HH:MM am/pm" or "MM-DD-YY - MM/DD/YY at HH:MM am/pm"Unit Qty15%NumberNoShows quantity from that snapshotUOM10%TextNoShows unit of measure from that snapshotUnit Cost15%CurrencyNoShows cost per unit from that snapshotOriginal Budget20%CurrencyNoShows calculated budget amount from that snapshot
```

### Data Rows Structure

**Header row:** Column titles with light grey background

**History rows:** One row per snapshot/change

- Row 1: "Current - 12/29/25 at 07:31 pm" | [qty] | [uom] | [cost] | $3,893.00
- Row 2: "7-02-25 - 07/02/25 at 08:50 am" | [qty] | [uom] | [cost] | $3,893.00
- Additional rows: Previous snapshots in reverse chronological order (newest first)

### Data Source

- Pulls from Budget History/Audit system
- Shows one row per snapshot date
- Current snapshot always listed first
- Previous snapshots sorted by date (newest first)

### Special Indicators

- **Warning Icon (⚠️):** May appear in rows to flag issues
    - Indicates the amount was disputed or flagged
    - Orange/amber color

### Buttons

- **Done** button (grey): Bottom right
    - Action: Close modal (returns to Original Budget tab)
    - No changes possible on History tab
- **Close button (X):** Top right corner
    - Action: Dismiss modal completely

### Closing Behavior

- User can click "Done" to return to edit tab
- Clicking X closes entire modal
- No unsaved changes to worry about (read-only)

### Empty State

- Will always have at least "Current" row
- If brand new cost code: Only "Current" row shown

### Purpose

- Users can see when the budget was last changed
- Users can see what the budget was in past snapshots
- Useful for auditing and change tracking

---

## MODAL #7: UNLOCK BUDGET CONFIRMATION

### Trigger

- **When:** User clicks "Unlock Budget" button in main toolbar
- **Where:** Top toolbar of Budget page
- **Data Parameter:** None (project-level)

### Modal Title

`"Unlock the Budget"` (no cost code specified)

### Header Bar

- Dark grey background
- Contains title and close button (X)
- Title may include warning icon

### Content Structure

Simple confirmation message with 2 buttons:

**Message:**

`"Unlocking the Budget will preserve your Budget Modifications."`

### Message Styling

- Warning icon (⚠️) before title or message
- Orange/amber color scheme
- Clear, bold text
- Explains consequence of action

### Buttons

**Button 1: Cancel**

- Style: Grey, left-aligned
- Action: Dismiss modal without making changes
- Text: "Cancel"

**Button 2: Preserve and Unlock**

- Style: Orange/coral (primary action), right-aligned
- Action: Proceed with unlocking
- Text: "Preserve and Unlock"
- Shows what will happen: "Preserve and Unlock"

### Closing Behavior

- Clicking "Cancel": Modal closes, nothing changes
- Clicking "Preserve and Unlock":
    - Modal closes
    - Budget transitions to "Unlocked" state
    - "Unlock Budget" button changes to "Lock Budget"
    - Original Budget Amount fields become editable
    - Toast notification: "Budget Unlocked Successfully"
- Clicking X: Same as "Cancel" (no changes)

### Data Model

- This is a confirmation modal, not a data input modal
- No form fields to fill
- No validation needed
- Simple yes/no decision

### Edge Cases

- If budget already unlocked: Button may be disabled or hidden
- If user has insufficient permissions: Modal not shown
- If there are uncommitted changes: Show additional warning

## MODAL #8: CREATE BUDGET LINE ITEMS

### Trigger

- **When:** User clicks "Create" button in toolbar → Selects "Budget Line Item" from dropdown
- **Where:** Top toolbar of Budget page
- **Data Parameter:** None (project-level, applies to whole budget)

### Modal Title

`"Create Budget Line Items"` (singular form in title, plural in header)

### Header Bar

- Dark grey background
- Contains title and close button (X)

### Content Structure

A wizard-style form for adding new budget line items.

**Section 1: Budget Code Table**

Table with 3 columns for inputting line items:

```
ColumnWidthTypeRequiredNotesBudget Code50%Dropdown/ComboboxYesSelect from existing cost codes or create newQty25%Number InputYesQuantity (decimal acceptable)UOM25%DropdownNoUnit of Measure (optional)
```

### Table Behavior

- Starts empty (no pre-loaded rows)
- User must click "Add Line" to add rows
- Each row is independently editable
- Can add multiple rows in one session

### Empty State Message

- Shows: "You Have No Line Items Yet" (centered)
- Shows loading animation/help icon
- Encourages user to click "Add Line"

### Buttons (Inside Form Area)

**Add Line Button #1 (Primary)**

- Style: Orange/coral, prominent
- Location: Center of empty state
- Text: "Add Line"
- Action: Adds new empty row to table, removes empty state message

**Add Line Button #2 (Secondary)**

- Style: Grey
- Location: Below table area
- Text: "Add Line"
- Action: Adds another row (appears after first row added)

### Buttons (Bottom of Modal)

**Close**

- Style: Grey, left-aligned
- Text: "Close"
- Action: Dismiss without saving
- Shows confirmation if items added but not created: "You have unsaved items. Close anyway?"

**Create**

- Style: Grey/disabled OR Orange (if enabled)
- Right-aligned
- Text: "Create"
- Action: Submit all line items and create them
- Validation: Must have at least one complete row
- Disabled state: Until at least one valid row exists

### Form Validation

**For each row:**

- Budget Code: Required, must be valid
- Qty: Required, must be numeric, must be > 0
- UOM: Optional, but if filled must be valid

**Before submission:**

- At least one row must be complete
- All filled rows must have valid data
- Show error message if validation fails

### Workflow

1. User clicks "Create" → "Budget Line Item"
2. Modal opens showing empty state
3. User clicks "Add Line"
4. New row appears with empty fields
5. User fills in Budget Code, Qty, UOM
6. User can click "Add Line" again to add more rows
7. User repeats steps 4-6 for additional items
8. User clicks "Create" to submit all items
9. Modal processes, shows loading state
10. Modal closes on success
11. Toast notification: "Budget Line Items Created Successfully"
12. Main budget table refreshes with new items

### Loading States

**When opening modal:**

- Show loading animation briefly
- Fetch available budget codes
- Load UOM list

**When clicking Create:**

- Show loading indicator on "Create" button
- Disable all inputs
- Show progress message: "Creating Budget Items..."
- Wait for server response

### Error Handling

**If validation fails:**

- Highlight invalid field with red border
- Show error message below field: "Budget Code is required"
- Keep modal open, allow fixes

**If submission fails:**

- Show error toast: "Failed to create budget items. Please try again."
- Keep modal open
- Keep all data intact
- Allow user to retry

### Close Behavior

**Clicking Close (no items added):**

- Modal closes immediately

**Clicking Close (items added but not created):**

- Show confirmation: "You have unsaved Budget Line Items. Are you sure you want to close?"
- Two options: "Discard" or "Keep Editing"

**Clicking X (close icon):**

- Same behavior as "Close" button

### Success Behavior

**After clicking "Create":**

1. Form validates
2. Submission occurs
3. Modal shows loading state
4. On success:
    - Modal closes automatically
    - Toast notification appears
    - Main budget table refreshes
    - New items visible in table
5. User can view new items by expanding sections

---

## NAVIGATION & LINKING MAP

### Column to Modal Mapping

```
Table ColumnLinked?Modal OpensTriggerData PassedOriginal Budget AmountYesModal #5Click "..." iconCost CodeBudget ModificationsYesModal #2Click blue valueCost CodeApproved COsYesModal #1Click blue valueCost CodeRevised BudgetNoNoneN/AN/AJob to Date Cost DetailYesModal #3Click blue valueCost CodeDirect CostsYesModal #4Click blue valueCost CodePending Budget ChangesYesModal #2 (alt)Click valueCost CodeAll calculated columnsNoNoneN/AN/A
```

### Button to Modal Mapping

```
ButtonLocationModal OpensData PassedCreate → Budget Line ItemToolbar dropdownModal #8NoneCreate → Budget ModificationToolbar dropdownFuture modalNoneCreate → SnapshotToolbar dropdownFuture modalNoneUnlock BudgetToolbarModal #7NoneLock Budget (appears after unlock)ToolbarConfirmation modalNone
```

### Modal Navigation Flow

`Budget Page
├── Column Click (Approved COs) → Modal #1
├── Column Click (Budget Mods) → Modal #2
├── Column Click (Job to Date Cost) → Modal #3
├── Column Click (Direct Costs) → Modal #4
├── Column Click (Ellipsis) → Modal #5
│   ├── Click "History" tab → Modal #6
│   └── Click "Done" → Save & Close to Budget Page
├── Unlock Budget button → Modal #7
│   ├── Click "Preserve and Unlock" → Unlock & Close
│   └── Click "Cancel" → Close to Budget Page
└── Create button → Modal #8
    ├── Click "Create" → Create items & Close
    └── Click "Close" → Close to Budget Page`

### Inter-Modal Navigation

- Modal #5 (Original Budget - Edit) ↔ Modal #6 (Original Budget - History)
    - Click "History" tab to go to Modal #6
    - Click "Original Budget" tab to return to Modal #5
    - Both modals share title and same cost code
- All other modals are independent
    - No cross-modal navigation
    - Close modal to return to budget page

---

## GLOBAL MODAL BEHAVIOR

### Standard Modal Properties

**All Modals Share:**

- Dark grey header bar with white title text
- White close button (X) in top right
- Modal overlay with semi-transparent background
- Centered on screen
- Modal content on white background
- Keyboard shortcuts:
    - ESC key closes modal (equivalent to clicking X)
    - TAB navigates through fields
    - ENTER submits form (if applicable)

### Closing Behavior

**Read-Only Modals (1, 2, 3, 4, 6, 7):**

- Click X → Close immediately
- Click Done/Cancel → Close immediately
- No unsaved changes warning needed

**Editable Modals (5, 8):**

- Click X with unsaved changes → Show confirmation
- Click Done → Validate & save, then close
- Click Close → Warn if unsaved changes

### Data Refresh

**After any modal closes with changes:**

1. Return to main budget page
2. Main table automatically refreshes
3. Updated values visible immediately
4. No need to reload page

**If data changes in background:**

- Show notification: "Data updated by another user"
- Offer to reload

### Error Handling

**If API call fails:**

1. Show error toast message
2. "Failed to [action]. Please try again."
3. Keep modal open if still editing
4. Allow user to retry

**If user loses connection:**

1. Show error: "Connection lost. Check your internet."
2. Show "Retry" button
3. Allow offline detection

### Accessibility

**All modals must support:**

- Keyboard navigation (Tab, Shift+Tab)
- Screen readers (proper ARIA labels)
- Focus indicators (visible outline)
- Color contrast (WCAG AA compliant)
- Text alternatives for icons

### Mobile Behavior

**On small screens:**

- Modals take full height
- Horizontal scrolling for wide tables
- Touch-friendly button sizes (min 44x44px)
- Large close button for easy tapping

---

## DATA FIELD SPECIFICATIONS

### Currency Fields

- Format: USD ($X,XXX.XX)
- Display: Right-aligned
- Precision: 2 decimal places
- Negative: Shown in parentheses (e.g., "($128.02)")

### Date Fields

- Format: MM/DD/YYYY or MM/DD/YY
- Sortable: Yes (where applicable)
- Range: Any valid date
- Null: Empty string

### Number Fields

- Qty: Decimal (4.00, 1.50)
- Precision: 2 decimal places
- Validation: Must be positive
- Null: Empty or 0

### Text Fields

- Cost Code: Format "XX-XXXX.X" (e.g., "01-3120.L")
- Description: Free text, up to 255 characters
- Notes: Free text, up to 500 characters
- Null: Empty string

### Status Indicators

- Warning Icon (⚠️): Orange/amber color
- Meaning: Review needed or flag noted
- Clickable: No (may add later)
- Hover: Shows tooltip (future)

---

## PERFORMANCE REQUIREMENTS

### Modal Load Times

- Modal should open within 500ms
- Data should load within 2 seconds
- Lazy-load long tables (show first 50 rows, load more on scroll)

### Table Rendering

- Handle 1000+ rows efficiently
- Virtualize rows outside viewport
- Expandable rows must load on demand

### API Calls

- Batch requests where possible
- Cache lookup data (UOM, cost codes)
- Pagination for large result sets

---

## SECURITY & PERMISSIONS

### Row-Level Access

- User can only view data for cost codes they have access to
- Editable fields only if user has "Edit Budget" permission
- Admin/Manager role: Full access
- Viewer role: Read-only

### Data Validation

- All user input validated server-side
- No sensitive data in URLs
- All API calls authenticated
- CSRF tokens for POST requests

---

## REVISION HISTORY

```
DateVersionChangesAuthor12/29/20251.0Initial specification documentClaude
```

---

**End of Document**

This specification is designed to be the definitive reference for implementing all budget page modals in Claude Code. Each modal has detailed specifications for content, layout, behavior, and integration with the main page.