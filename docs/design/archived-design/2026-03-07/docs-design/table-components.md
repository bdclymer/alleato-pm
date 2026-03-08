# Table UI Components Inventory

This inventory lists the scalable component set for table-heavy pages (data lists, issues, clients, etc.).

### Page Shell

- App layout: grid, background, content bounds
- Sidebar navigation: icon + label variants, collapsed state
- Top bar: global search, notifications, quick actions, user menu

### Page Header

- Page title
- Subtitle/description
- Primary action button
- Secondary actions group (export, import, create)

### View Controls

- Tabs or segmented control
- Saved views dropdown
- Column preset selector
- Density toggle (comfortable, compact)

### Filter Bar

- Search input
- Filter pills (applied filters)
- Date range picker
- Advanced filters button
- Clear all filters button

### Table Container

- Card/surface wrapper
- Sticky header container
- Scroll region
- Loading skeleton
- Empty/zero state

### Table Header Row

- Column labels
- Sort control (asc/desc)
- Select-all checkbox
- Column resize handles
- Column menu (pin, hide, format)

### Table Row

- Row wrapper
- Hover/active state
- Selection checkbox
- Row actions menu
- Expand/collapse control (optional)

### Cell Types

- Text cell
- Meta text cell (secondary info)
- Avatar + name cell
- Badge/tag cell
- Status pill cell
- Date cell
- Money/number cell
- Icon-only cell
- Progress cell
- Empty/null cell

## Grouping

- Group header row
- Group summary
- Group collapse/expand

### Bulk Actions

- Selection count
- Bulk action bar
- Undo snackbar/toast

### Pagination

- Pager (prev/next)
- Page number list
- Page size selector
- Total results count

### States and Feedback

- No data state
- No results state
- Error state
- Permissions/locked state
- Inline validation
- Toast notifications

## Utility Components

- Tooltip
- Popover
- Dropdown menu
- Modal dialog
- Confirmation dialog
- Inline help or hint text


## Table UI Component Tree

This outlines how the components compose into a scalable table page.

```txt
AppLayout
  SidebarNav
  TopBar
    GlobalSearch
    QuickActions
    UserMenu
  PageContent
    PageHeader
      PageTitle
      PageSubtitle
      HeaderActions
        PrimaryActionButton
        SecondaryActionGroup
    ViewControls
      ViewTabs
      SavedViewsMenu
      ColumnPresetSelector
      DensityToggle
    FilterBar
      SearchInput
      FilterPills
      DateRangePicker
      AdvancedFiltersButton
      ClearAllButton
    TableCard
      TableToolbar
        BulkActionsBar
      TableContainer
        TableHeaderRow
          SelectAllCheckbox
          ColumnHeaderCell (xN)
            SortControl
            ColumnMenu
            ResizeHandle
        TableBody
          TableRow (xN)
            RowSelectCheckbox
            DataCell (xN)
              CellRenderer (text, meta, avatar, badge, status, date, money, icon, progress)
            RowActionsMenu
          GroupHeaderRow (optional)
    Pagination
      Pager
      PageSizeSelector
      TotalCount
    States
      LoadingSkeleton
      EmptyState
      ErrorState
```

## Notes
- `CellRenderer` is the primary extension point for new column types.
- `TableHeaderRow` owns sort and column config behavior.
- `TableToolbar` conditionally renders `BulkActionsBar` when selections exist.

