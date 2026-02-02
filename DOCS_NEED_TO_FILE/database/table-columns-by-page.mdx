# Table Columns by Page

This document inventories all table columns, their properties, and behaviors based on implemented DataTable components.

## Portfolio Page (Projects Table)
Location: `/app/page.tsx`

| Column | Field Name | Sortable | Filterable | Data Type | Display Format | Notes |
|--------|------------|----------|------------|-----------|----------------|-------|
| Project Name | name | Yes | Yes (search) | String | Blue link (clickable) | Primary action navigates to project |
| Project # | projectNumber | Yes | Yes | String | Plain text | Unique identifier |
| Address | address | Yes | Yes | String | Plain text | Full address |
| City | city | Yes | Yes | String | Plain text | - |
| State | state | Yes | Yes | String | Plain text | 2-letter abbrev |
| Status | status | Yes | Yes | Enum | Colored badge | Active (green), Inactive (gray) |
| Stage | stage | Yes | Yes (dropdown) | String | Plain text | Current, Planning, etc. |
| Type | type | Yes | Yes (dropdown) | String | Plain text | General, Commercial, etc. |

### Table Features
- **Row Click Action**: Navigate to project detail (`/{projectId}/home`)
- **Bulk Actions**: Not implemented
- **Export**: CSV export available
- **Search**: Global search across all text fields
- **Pagination**: Default 10/20/30/40/50 rows per page
- **Empty State**: "No results" message

## Commitments Page
Location: `/app/(procore)/(financial)/commitments/page.tsx`

| Column | Field Name | Sortable | Filterable | Data Type | Display Format | Notes |
|--------|------------|----------|------------|-----------|----------------|-------|
| Number | number | Yes | Yes | String | Blue link | Primary identifier |
| Title | title | Yes | Yes | String | Plain text | - |
| Company | contract_company_name | Yes | Yes | String | Plain text | Vendor/Subcontractor |
| Status | status | Yes | Yes | Enum | Status badge | Uses StatusBadge component |
| Type | type | Yes | Yes | Enum | Capitalized text | subcontract, purchase_order |
| Original Amount | original_amount | Yes | No | Number | Currency ($) | Right-aligned |
| Revised Amount | revised_contract_amount | Yes | No | Number | Currency ($) | Right-aligned |
| Balance to Finish | balance_to_finish | Yes | No | Number | Currency ($) | Right-aligned |
| Actions | - | No | No | - | Dropdown menu | View, Edit, Delete |

### Table Features
- **Row Click Action**: View commitment details
- **Actions Menu**: 
  - View: Navigate to detail page
  - Edit: Navigate to edit page
  - Delete: Confirmation dialog → API call
- **Status Summary**: Shows count by status above table
- **Financial Summary Cards**: 
  - Original Contract Amount (total)
  - Approved Change Orders (total)
  - Revised Contract Amount (total)
  - Balance to Finish (total)
- **Tabs**: All Commitments, Subcontracts, Purchase Orders

## Common Table Patterns

### Sorting
- All columns sortable by default unless explicitly disabled
- Default sort: Usually by number/name ascending
- Multi-column sort not implemented

### Filtering
- Text fields: Contains search
- Enum fields: Exact match dropdown
- Number fields: Not typically filterable
- Date fields: Range filters (when implemented)

### Column Toggle
- All columns toggleable via "View" dropdown
- Preferences not persisted (could be localStorage)

### Pagination
- Options: 10, 20, 30, 40, 50 rows
- Shows: "X of Y row(s) selected" 
- Navigation: First, Previous, Next, Last buttons
- Current page indicator: "Page X of Y"

### Actions Column Pattern
- Always rightmost column
- Dropdown with ChevronDown icon
- Common actions:
  - View (Eye icon)
  - Edit (Edit icon)
  - Delete (Trash2 icon, red text)
- Delete requires confirmation

### Status Badge Patterns
- Draft: Gray
- Sent: Blue
- Pending: Yellow/Orange
- Approved: Green
- Executed: Dark Green
- Closed: Dark Gray
- Void: Red

### Empty States
- Simple message: "No results"
- Could be enhanced with:
  - Icon
  - Descriptive text
  - Action button (e.g., "Create new")

### Loading States
- Currently: Simple text "Loading..."
- DataTableSkeleton component available for better UX

## Responsive Behavior
- Tables scroll horizontally on mobile
- Some columns hidden on smaller screens
- Actions remain accessible

## Export Functionality
- CSV export implemented
- Exports visible columns only
- Respects current filters/search

## Performance Considerations
- Virtual scrolling not implemented (could be for large datasets)
- All data loaded client-side currently
- Pagination happens client-side

## Future Enhancements
1. Server-side pagination/sorting/filtering
2. Column width adjustment
3. Row selection with bulk actions
4. Saved views/filters
5. Column ordering (drag & drop)
6. Inline editing
7. Advanced filters (date ranges, numeric ranges)
8. Export to Excel/PDF
9. Print view