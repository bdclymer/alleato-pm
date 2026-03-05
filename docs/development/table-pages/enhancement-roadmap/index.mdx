# Generic Table Factory - Enhancement Roadmap

This document outlines potential enhancements to make the GenericDataTable component more powerful and user-friendly.

## Priority 1: Essential UX Improvements (Implement First)

### 1.1 Column Sorting

**Impact:** High | **Effort:** Low

```tsx
interface ColumnConfig {
  sortable?: boolean
  sortType?: 'string' | 'number' | 'date'
}

// Click header to sort
// Shift+Click for multi-column sort
// Visual indicators (↑↓) in headers
```sql
**Why:** Basic table expectation. Users will try to click headers immediately.

### 1.2 Bulk Row Selection
**Impact:** High | **Effort:** Medium

```tsx
// Checkboxes in first column
// "Select All" checkbox in header
// Bulk actions toolbar appears when rows selected
// "Delete 5 items", "Export 12 rows", etc.
```text
**Why:** Critical for productivity when managing multiple items.

### 1.3 Persistent Table State

**Impact:** Medium | **Effort:** Low

```tsx
// Save to localStorage:
// - Column visibility
// - Column order
// - Sort state
// - Filter state
// Restore on page load
```text
**Why:** Frustrating to reconfigure table on every visit.

### 1.4 Loading & Empty States
**Impact:** Medium | **Effort:** Low

```tsx
// Skeleton rows while loading
// Better empty state with actions
// "No results found" vs "No data yet - Create your first item"
// Error states with retry button
```

**Why:** Current empty state is too basic.

---

## Priority 2: Power User Features

### 2.1 Advanced Filtering

**Impact:** High | **Effort:** High

```tsx
interface AdvancedFilter {
  // Date ranges
  { type: 'dateRange', field: 'created_at', from: '2024-01-01', to: '2024-12-31' }

  // Number ranges
  { type: 'numberRange', field: 'budget', min: 10000, max: 50000 }

  // Multi-select
  { type: 'multiSelect', field: 'status', values: ['open', 'in_progress'] }

  // Text operators
  { type: 'text', field: 'title', operator: 'contains' | 'startsWith' | 'equals' }
}

// Filter builder UI
// Save filter combinations as "Views"
```text
**Example:**
```yaml
Show me:

- Created in last 30 days
- Budget between $10k-$50k
- Status is Open OR In Progress
- Title contains "electrical"

```yaml
### 2.2 Saved Views
**Impact:** High | **Effort:** Medium

```tsx
interface SavedView {
  id: string
  name: string
  isDefault: boolean
  config: {
    visibleColumns: string[]
    filters: AdvancedFilter[]
    sortBy: SortConfig[]
  }
}

// Tabs or dropdown: "All Items" | "My Tasks" | "This Week" | "High Priority"
// Star to mark default view
// Share views with team (stored in DB)
```

**Why:** Construction teams have recurring queries ("Show me this week's inspections")

### 2.3 Column Resizing & Reordering

**Impact:** Medium | **Effort:** Medium

```tsx
// Drag column headers to reorder
// Drag column edge to resize
// Double-click edge to auto-fit content
// Save preferences per user
```diff
**Why:** Different users need different column layouts.

---

## Priority 3: Performance & Scale

### 3.1 Virtual Scrolling
**Impact:** High (for large datasets) | **Effort:** Medium

```tsx
// Use @tanstack/react-virtual
// Only render ~20 visible rows
// Smooth scrolling for 10,000+ rows
// Maintain performance
```yaml
**When to implement:** When tables exceed 500 rows regularly.

### 3.2 Server-Side Filtering/Sorting

**Impact:** High (for large datasets) | **Effort:** High

```tsx
interface GenericTableConfig {
  mode: 'client' | 'server'
  onFilterChange?: (filters: Filter[]) => Promise<Data[]>
  onSortChange?: (sort: SortConfig[]) => Promise<Data[]>
  totalCount?: number // For pagination
}

// Pass filter/sort to API
// API returns filtered/sorted data
// Client doesn't load full dataset
```yaml
**When to implement:** When datasets exceed 1,000 rows.

### 3.3 Pagination
**Impact:** Medium | **Effort:** Low

```tsx
interface PaginationConfig {
  pageSize: number
  pageSizeOptions: number[] // [10, 25, 50, 100]
  showPageInfo: boolean // "Showing 1-25 of 247"
}
```

**Alternative:** Infinite scroll (load more on scroll)

---

## Priority 4: Rich Editing Experience

### 4.1 Inline Cell Editing

**Impact:** High | **Effort:** High

```tsx
// Double-click cell to edit in place
// No dialog needed for simple edits
// Tab to move to next cell
// Enter to save, ESC to cancel
// Show validation errors inline
```text
**Why:** Much faster than opening dialog for every edit.

### 4.2 Rich Input Types
**Impact:** Medium | **Effort:** Medium

```tsx
// Date picker popover
// User/assignee autocomplete with search
// Tag input with autocomplete
// Rich text editor for notes
// File upload for attachments
// Color picker for categories
```markdown
### 4.3 Optimistic Updates with Rollback

**Impact:** Medium | **Effort:** Medium

```tsx
// Update UI immediately on save
// Show subtle loading indicator
// Rollback on error with toast
// Retry mechanism
```diff
---

## Priority 5: Data Insights

### 5.1 Column Aggregations
**Impact:** Medium | **Effort:** Low

```tsx
// Footer row with aggregations
// Sum of budget column
// Average of scores
// Count of items
// Toggle on/off per column
```

### 5.2 Quick Filters

**Impact:** Medium | **Effort:** Low

```tsx
// Click value in cell to filter by that value
// "Show only items with Status: Open"
// Right-click cell for context menu
// Quick actions based on cell type
```markdown
### 5.3 Data Quality Indicators
**Impact:** Low | **Effort:** Low

```tsx
// Show warning icons for:
// - Missing required fields
// - Overdue dates
// - Budget exceeded
// - Validation errors
// Click icon for details
```diff
---

## Priority 6: Collaboration Features

### 6.1 Real-time Updates

**Impact:** High | **Effort:** Medium

```tsx
// Supabase real-time subscriptions
// Show "3 new items" banner at top
// Highlight changed rows briefly
// Show who's currently editing
```markdown
### 6.2 Comments & Activity
**Impact:** Medium | **Effort:** High

```tsx
// Click row to expand
// Show comment thread
// Show activity history
// @mention team members
```

### 6.3 Row-Level Permissions

**Impact:** Medium | **Effort:** High

```tsx
// Show/hide edit button based on permissions
// Disable certain fields for certain roles
// Visual indicators for read-only rows
```diff
---

## Priority 7: Mobile & Accessibility

### 7.1 Mobile Card View
**Impact:** High | **Effort:** Medium

```tsx
// Automatically switch to card view on mobile
// Swipe gestures for actions
// Bottom sheet for filters
// Tap to expand full details
```markdown
### 7.2 Keyboard Navigation

**Impact:** Medium | **Effort:** Medium

```tsx
// Arrow keys to navigate cells
// Space to select row
// Ctrl+A to select all
// / to focus search
// ? to show keyboard shortcuts
```markdown
### 7.3 Accessibility Improvements
**Impact:** Medium | **Effort:** Low

```tsx
// ARIA labels for all interactive elements
// Screen reader announcements for changes
// Focus management
// High contrast mode
// Reduced motion mode
```

---

## Implementation Priority Summary

### Phase 1 (Next 2 weeks)

1. Column sorting ✅
2. Bulk selection ✅
3. Loading states ✅
4. Persistent state (localStorage) ✅

### Phase 2 (Next month)

1. Saved views/presets
2. Advanced filtering (date range, number range)
3. Column resizing
4. Inline editing

### Phase 3 (Next quarter)

1. Virtual scrolling (if needed)
2. Server-side mode (if needed)
3. Real-time updates
4. Mobile optimizations

### Phase 4 (Future)

1. Rich editing features
2. Collaboration features
3. Advanced analytics

---

## Quick Wins (Easy to implement, high impact)

1. **Column sorting** - 2 hours, immediate value
2. **Persistent localStorage state** - 1 hour, huge UX improvement
3. **Better empty states** - 30 minutes, more polished
4. **Loading skeletons** - 1 hour, professional feel
5. **Quick filters (click value to filter)** - 2 hours, power user feature
6. **Column aggregation footer** - 2 hours, useful for budgets/costs

---

## Example: Enhanced Risk Table

```tsx
<GenericDataTable
  data={risks}
  config={{
    title: "Project Risks",
    columns: [
      { id: 'title', label: 'Risk', sortable: true, pinned: 'left' },
      { id: 'status', label: 'Status', sortable: true, type: 'badge' },
      { id: 'probability', label: 'Probability', sortable: true,
        renderConfig: { type: 'progress', showPercentage: true } },
      { id: 'impact', label: 'Cost Impact', sortable: true,
        renderConfig: { type: 'currency' }, aggregate: 'sum' },
      { id: 'owner', label: 'Owner',
        renderConfig: { type: 'user', showAvatar: true } },
      { id: 'created_at', label: 'Created', sortable: true,
        renderConfig: { type: 'relativeDate' } }
    ],
    filters: [
      { id: 'status', type: 'multiSelect', field: 'status',
        options: [/* ... */] },
      { id: 'impact', type: 'numberRange', field: 'impact_amount',
        min: 0, max: 100000 },
      { id: 'created', type: 'dateRange', field: 'created_at' }
    ],
    bulkActions: [
      { id: 'delete', label: 'Delete', icon: <Trash />, variant: 'destructive' },
      { id: 'export', label: 'Export', icon: <Download /> },
      { id: 'assign', label: 'Assign to...', icon: <User /> }
    ],
    savedViews: [
      { id: 'all', name: 'All Risks', isDefault: true },
      { id: 'high', name: 'High Impact', filters: [/* ... */] },
      { id: 'my', name: 'Assigned to Me', filters: [/* ... */] }
    ],
    virtualScroll: true, // Enable for 1000+ items
    mode: 'server', // Server-side filtering/sorting
    realtime: true, // Supabase subscriptions
    rowExpansion: {
      enabled: true,
      render: (row) => <RiskDetailsPanel risk={row} />
    }
  }}
/>
```

This configuration creates a production-grade, enterprise-level data table with all the features users expect.
