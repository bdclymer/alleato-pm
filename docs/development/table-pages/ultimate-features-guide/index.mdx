# Ultimate Table Features - Implementation Guide

This guide shows how to implement all the advanced features for the generic table component.

## ✅ Already Implemented (Base + Enhanced)

1. ✅ Search & filtering
2. ✅ Column visibility
3. ✅ CSV export
4. ✅ Inline editing (dialog-based)
5. ✅ Row navigation
6. ✅ Flexible rendering (badges, currency, etc.)
7. ✅ Virtual scrolling (10,000+ rows)
8. ✅ Multi-column sorting
9. ✅ Advanced filters (date range, number range, multi-select)
10. ✅ Persistent state (localStorage)
11. ✅ Loading states
12. ✅ View modes (table, card, list) - in base version
13. ✅ Row selection - in base version
14. ✅ Three-dot menu - in base version

## 🚧 Advanced Features to Implement

### 1. Saved Views & Presets

**Purpose:** Save custom table configurations (columns, filters, sorts) for quick access.

**Implementation:**

```tsx
interface SavedView {
  id: string
  name: string
  description?: string
  isDefault?: boolean
  config: {
    visibleColumns: string[]
    sortConfigs: SortConfig[]
    filters: Record<string, unknown>
    columnWidths: Record<string, number>
  }
  createdAt: string
  updatedAt: string
}

// Usage
config={{
  savedViews: {
    enabled: true,
    views: [
      {
        id: '1',
        name: 'High Priority Tasks',
        description: 'Show only high priority, due this week',
        isDefault: true,
        config: {
          visibleColumns: ['title', 'priority', 'due_date'],
          sortConfigs: [{ columnId: 'priority', direction: 'desc' }],
          filters: { priority: 'high' },
          columnWidths: {}
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ],
    onSave: async (view) => {
      await fetch('/api/views', {
        method: 'POST',
        body: JSON.stringify(view)
      })
    },
    onDelete: async (viewId) => {
      await fetch(`/api/views/${viewId}`, { method: 'DELETE' })
    }
  }
}}
```yaml
**UI Components:**
- Dropdown menu for views (next to filters)
- "Save Current View" button
- "Manage Views" dialog
- Star icon for default view

**Storage:**
- Option 1: localStorage (client-only)
- Option 2: API/Database (shared across devices)

---

### 2. Bulk Actions & Selection

**Purpose:** Perform actions on multiple selected rows at once.

**Implementation:**

```tsx
interface BulkAction {
  id: string
  label: string
  icon: React.ReactNode
  variant?: 'default' | 'destructive'
  onClick: (selectedIds: (string | number)[]) => Promise<void>
  disabled?: (selectedIds: (string | number)[]) => boolean
}

// Usage
config={{
  bulkActions: [
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: async (ids) => {
        await deleteItems(ids)
        toast.success(`Deleted ${ids.length} items`)
      },
      disabled: (ids) => ids.length === 0
    },
    {
      id: 'export',
      label: 'Export Selected',
      icon: <Download className="h-4 w-4" />,
      onClick: async (ids) => {
        exportItems(ids)
      }
    },
    {
      id: 'assign',
      label: 'Assign to...',
      icon: <User className="h-4 w-4" />,
      onClick: async (ids) => {
        // Open assign dialog
      }
    }
  ]
}}
```yaml
**UI Components:**

- Checkbox in first column
- "Select all" checkbox in header
- Floating action toolbar when items selected
- Shows count: "5 items selected"

**Already Partially Implemented in Base Version** ✅

---

### 3. Inline Cell Editing

**Purpose:** Double-click cells to edit directly without opening dialog.

**Implementation:**

```tsx
config={{
  inlineEdit: {
    enabled: true,
    onCellEdit: async (rowId, field, value) => {
      await fetch('/api/items/' + rowId, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value })
      })
    }
  },
  columns: [
    {
      id: 'title',
      label: 'Title',
      editable: true, // Can be edited inline
      editComponent: 'input'
    },
    {
      id: 'description',
      label: 'Description',
      editable: true,
      editComponent: 'textarea'
    },
    {
      id: 'due_date',
      label: 'Due Date',
      editable: true,
      editComponent: 'date'
    },
    {
      id: 'status',
      label: 'Status',
      editable: true,
      editComponent: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' }
      ]
    }
  ]
}}
```yaml
**Interactions:**
- Double-click cell → Enter edit mode
- Tab → Move to next editable cell
- Shift+Tab → Move to previous editable cell
- Enter → Save and exit edit mode
- Escape → Cancel and exit edit mode

**UI:**
- Editable cells have subtle indicator (e.g., light border on hover)
- Edit mode shows input field replacing cell content
- Auto-focus on input when entering edit mode

---

### 4. Advanced Search with Operators

**Purpose:** Power users can use field-specific search operators.

**Implementation:**

```tsx
import Fuse from 'fuse.js'

config={{
  fuzzySearch: {
    enabled: true,
    threshold: 0.3 // 0 = exact match, 1 = match anything
  },
  searchHistory: {
    enabled: true,
    maxItems: 10
  }
}}

// Search operators:
// "status:open priority:high" → Field-specific
// "created:>2024-01-01" → Date comparison
// "cost:>10000" → Number comparison
// "title:~foundation" → Fuzzy match on field
```

**UI:**

- Search input with autocomplete
- Recent searches dropdown (click clock icon)
- Operator hints on hover
- Clear search history button

**Search History:**

- Stored in localStorage
- Max 10 recent searches
- Click to re-apply search

---

### 5. Column Resizing

**Purpose:** Drag column edges to resize width.

**Implementation:**

```tsx
config={{
  columns: [
    {
      id: 'description',
      label: 'Description',
      resizable: true,
      minWidth: 100,
      maxWidth: 500,
      defaultWidth: 250
    }
  ]
}}
```yaml
**Interaction:**
- Hover over column border → Cursor changes to resize cursor
- Click and drag → Resize column
- Double-click border → Auto-fit to content
- Widths saved to localStorage

---

### 6. Row Expansion

**Purpose:** Click row to expand and show nested details.

**Implementation:**

```tsx
config={{
  rowExpansion: {
    enabled: true,
    render: (row) => (
      <div className="p-4 border-t bg-muted/30">
        <h4 className="font-semibold mb-2">Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Created By</label>
            <p>{row.created_by}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Last Modified</label>
            <p>{formatDate(row.updated_at)}</p>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-muted-foreground">Notes</label>
            <p>{row.notes}</p>
          </div>
        </div>
      </div>
    ),
    defaultExpanded: false
  }
}}
```yaml
**UI:**

- Chevron icon in first column (or add expand column)
- Click row → Expand/collapse
- Animated height transition
- Expanded rows highlighted

---

### 7. Column Grouping

**Purpose:** Group related columns visually with collapsible headers.

**Implementation:**

```tsx
config={{
  columnGroups: [
    {
      id: 'financial',
      label: 'Financial',
      columnIds: ['budget', 'actual', 'variance'],
      collapsible: true,
      defaultCollapsed: false
    },
    {
      id: 'dates',
      label: 'Dates',
      columnIds: ['start_date', 'end_date', 'created_at']
    }
  ]
}}
```yaml
**UI:**
- Two-row header: Group row + Column row
- Group headers span multiple columns
- Click group header to collapse/expand
- Collapsed groups show icon

---

### 8. Export Enhancements

**Purpose:** Export in multiple formats with options.

**Implementation:**

```tsx
config={{
  exportFormats: ['csv', 'json', 'xlsx'],
  exportOptions: {
    includeHiddenColumns: false,
    includeFiltered: true, // Export filtered data only
    filename: 'budget-export'
  }
}}

// Export selected rows only
<Button onClick={() => exportData('csv', { selectedOnly: true })}>
  Export Selected (CSV)
</Button>

// Export all with hidden columns
<Button onClick={() => exportData('json', { includeHidden: true })}>
  Export All (JSON)
</Button>
```

**Export Formats:**

1. **CSV** - Compatible with Excel
2. **JSON** - For APIs/developers
3. **XLSX** - Native Excel format (requires library: xlsx.js)
4. **PDF** - Formatted report (requires library: jsPDF)

**Export Dialog:**

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Export Data</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Format</Label>
        <Select>
          <SelectItem value="csv">CSV</SelectItem>
          <SelectItem value="json">JSON</SelectItem>
          <SelectItem value="xlsx">Excel</SelectItem>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="filtered" />
        <Label htmlFor="filtered">Export filtered data only</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="selected" />
        <Label htmlFor="selected">Export selected rows only ({selectedCount})</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="hidden" />
        <Label htmlFor="hidden">Include hidden columns</Label>
      </div>
    </div>
    <DialogFooter>
      <Button onClick={handleExport}>Export</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```yaml
---

### 9. Keyboard Navigation

**Purpose:** Full keyboard control without mouse.

**Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `/` | Focus search |
| `Ctrl+A` | Select all rows |
| `Ctrl+C` | Copy selected rows (JSON) |
| `Delete` | Delete selected rows |
| `Escape` | Clear selection / Close dialogs |
| `?` | Show keyboard shortcuts |
| `Tab` | Navigate between editable cells |
| `Enter` | Save inline edit |
| `↑↓←→` | Navigate cells (when editing) |
| `Space` | Toggle row selection |
| `Shift+Click` | Range select |

**Implementation:**

```tsx
config={{
  keyboardNav: {
    enabled: true,
    shortcuts: {
      search: '/',
      selectAll: 'Ctrl+A',
      copy: 'Ctrl+C',
      delete: 'Delete',
      escape: 'Escape'
    }
  }
}}
```yaml
**Keyboard Shortcuts Dialog:**

```tsx
<Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span>Focus search</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">/</kbd>
      </div>
      <div className="flex justify-between">
        <span>Select all</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+A</kbd>
      </div>
      {/* ... more shortcuts */}
    </div>
  </DialogContent>
</Dialog>
```yaml
---

### 10. Mobile Responsiveness

**Purpose:** Adapt table layout for mobile devices.

**Breakpoints:**
- Desktop (>768px): Table view
- Tablet (>480px): Card view
- Mobile (<480px): List view

**Implementation:**

```tsx
config={{
  mobileBreakpoint: 768,
  mobileLayout: 'card', // 'card' | 'list'
  swipeActions: {
    enabled: true,
    left: {
      label: 'Delete',
      icon: <Trash2 />,
      color: 'destructive',
      onSwipe: (row) => deleteRow(row.id)
    },
    right: {
      label: 'Edit',
      icon: <Pencil />,
      onSwipe: (row) => editRow(row.id)
    }
  }
}}
```

**Mobile Features:**

- Bottom sheet for filters (instead of popovers)
- Sticky search bar
- Swipe actions (iOS style)
- Collapsible columns
- Touch-friendly tap targets (48x48px minimum)

---

### 11. Accessibility (A11y)

**Requirements:**

- WCAG 2.1 Level AA compliance
- Screen reader support
- Keyboard-only navigation
- Focus indicators

**Implementation:**

```tsx
// ARIA labels
<Table aria-label="Project budget items">
  <TableHeader>
    <TableRow>
      <TableHead scope="col" aria-sort={sortDirection}>
        {column.label}
      </TableHead>
    </TableRow>
  </TableHeader>
</Table>

// Keyboard navigation
<TableRow
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleRowClick(row)
  }}
  role="button"
  aria-label={`Budget item: ${row.title}`}
>

// Screen reader announcements
<div role="status" aria-live="polite" className="sr-only">
  {`${filteredData.length} items found. ${selectedIds.size} selected.`}
</div>
```yaml
**Focus Management:**
- Visible focus rings (2px blue outline)
- Skip to content link
- Focus trap in modals
- Announce changes to screen readers

---

### 12. Column Statistics Footer

**Purpose:** Show aggregate statistics at bottom of table.

**Implementation:**

```tsx
config={{
  columnStats: {
    enabled: true,
    columns: [
      { id: 'budget', type: 'sum', label: 'Total Budget' },
      { id: 'actual', type: 'sum', label: 'Total Actual' },
      { id: 'variance', type: 'sum', label: 'Total Variance' },
      { id: 'items', type: 'count', label: 'Item Count' },
      { id: 'completion', type: 'avg', label: 'Avg Completion' }
    ]
  }
}}
```yaml
**Statistics Types:**

- `sum` - Total of all values
- `avg` - Average value
- `count` - Number of non-null values
- `min` - Minimum value
- `max` - Maximum value

**UI:**

```tsx
<TableFooter>
  <TableRow className="font-semibold bg-muted/50">
    <TableCell colSpan={2}>Totals</TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span>$2,450,000</span>
      </div>
    </TableCell>
    <TableCell>$2,385,500</TableCell>
    <TableCell className="text-green-600">-$64,500</TableCell>
  </TableRow>
</TableFooter>
```yaml
---

### 13. Quick Filters (Click to Filter)

**Purpose:** Click any cell value to filter by that value.

**Implementation:**

```tsx
config={{
  quickFilter: {
    enabled: true,
    onFilter: (field, value) => {
      // Add to active filters
      const filter = config.filters?.find(f => f.field === field)
      if (filter) {
        setFilters(prev => ({ ...prev, [filter.id]: value }))
        toast.success(`Filtered by ${field}: ${value}`)
      }
    }
  }
}}

// Right-click context menu on cells
<ContextMenu>
  <ContextMenuTrigger>
    <TableCell>{value}</TableCell>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={() => quickFilter(column.id, value)}>
      <Filter className="h-4 w-4 mr-2" />
      Filter by "{value}"
    </ContextMenuItem>
    <ContextMenuItem onClick={() => copyValue(value)}>
      <Copy className="h-4 w-4 mr-2" />
      Copy value
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

### 14. Row Styling (Conditional Highlighting)

**Purpose:** Highlight rows based on conditions.

**Implementation:**

```tsx
config={{
  rowStyles: [
    {
      condition: (row) => row.status === 'overdue',
      className: 'bg-red-50 border-l-4 border-red-500',
      description: 'Overdue items'
    },
    {
      condition: (row) => row.priority === 'high',
      className: 'bg-yellow-50',
      description: 'High priority'
    },
    {
      condition: (row) => row.variance < 0,
      className: 'bg-green-50',
      description: 'Under budget'
    }
  ]
}}

// Applied in render
<TableRow
  className={cn(
    'hover:bg-muted/50',
    ...config.rowStyles
      ?.filter(style => style.condition(row))
      .map(style => style.className)
  )}
>
```tsx
---

### 15. Search History

**Purpose:** Save and recall recent searches.

**Implementation:**

```tsx
const [searchHistory, setSearchHistory] = useState<string[]>(
  loadFromStorage('search-history', [])
)

const addToHistory = (term: string) => {
  if (!term) return
  const updated = [term, ...searchHistory.filter(t => t !== term)].slice(0, 10)
  setSearchHistory(updated)
  saveToStorage('search-history', updated)
}

// UI
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon">
      <History className="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Recent Searches</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchHistory([])}
        >
          Clear
        </Button>
      </div>
      {searchHistory.map((term, i) => (
        <Button
          key={i}
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            setSearchTerm(term)
            addToHistory(term)
          }}
        >
          <History className="h-4 w-4 mr-2" />
          {term}
        </Button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

---

## Implementation Priority

### Phase 1 (Essential - 1 week)

1. ✅ Bulk selection & actions (already in base)
2. ✅ Column statistics footer
3. ✅ Export enhancements (JSON, selected rows)
4. ✅ Quick filters (right-click to filter)

### Phase 2 (Important - 2 weeks)

1. ✅ Saved views & presets
2. ✅ Inline cell editing
3. ✅ Search history
4. ✅ Row styling (conditional)

### Phase 3 (Nice to Have - 3 weeks)

1. ✅ Keyboard navigation
2. ✅ Column resizing
3. ✅ Row expansion
4. ✅ Advanced search operators

### Phase 4 (Polish - 4 weeks)

1. ✅ Column grouping
2. ✅ Mobile optimizations
3. ✅ Full accessibility
4. ✅ Fuzzy search

---

## Summary

**Total Features:** 15 advanced features
**Already Implemented:** 14 base features
**Total Capabilities:** 29 features in ultimate version

**Estimated Effort:**

- Phase 1: 40 hours (1 week)
- Phase 2: 80 hours (2 weeks)
- Phase 3: 120 hours (3 weeks)
- Phase 4: 160 hours (4 weeks)
- **Total: ~400 hours (10 weeks)**

**Most Impactful Features (implement first):**

1. Bulk actions
2. Column stats
3. Saved views
4. Inline editing
5. Export enhancements

These provide the biggest productivity boost with reasonable implementation effort.
