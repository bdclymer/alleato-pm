# Unified Table System Design

## Overview

A standardized, config-driven table system for all data pages. Every table gets consistent CRUD operations, filtering, search, views, and export out of the box.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Page Title                                          [+ Add Entity]  │
│ Optional description text                                           │
├─────────────────────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3]                              (if applicable)│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TOOLBAR ROW (unified component)                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔍 ──────────  [≡][▦][▤]  [Filter]  [⋮⋮]  [↓]  [🗑]  47/47 │   │
│  │ search input   views     filter   cols  export del  count   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  TABLE/CARD/LIST VIEW                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☐  Name          Status      Type         Created    ⋮      │   │
│  │ ☐  Acme Corp     ● Active    Vendor       Jan 15     ⋮      │   │
│  │ ☐  BuildCo       ● Active    Subcon       Jan 12     ⋮      │   │
│  │ ☐  SupplyMax     ○ Inactive  Supplier     Jan 10     ⋮      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  PAGINATION (if needed)                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    [<] Page 1 of 5 [>]                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
<UnifiedTablePage>
  ├── <PageHeader />           # Title + primary action (Add)
  ├── <PageTabs />             # Optional navigation tabs
  ├── <TableToolbar />         # Search, views, filters, actions
  ├── <TableView />            # Table | Card | List (switchable)
  │   ├── <TableViewTable />   # Traditional rows
  │   ├── <TableViewCard />    # Card grid
  │   └── <TableViewList />    # Compact list
  ├── <TablePagination />      # Page controls
  └── <FilterPanel />          # Slide-out or popover for filters
```

---

## Toolbar Component API

### `<TableToolbar />`

```tsx
interface TableToolbarProps {
  // Data
  totalItems: number;
  filteredItems: number;
  selectedItems: string[];

  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Views
  currentView: "table" | "card" | "list";
  onViewChange: (view: "table" | "card" | "list") => void;
  enabledViews?: ("table" | "card" | "list")[]; // Default: all three

  // Filters
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;

  // Columns (table view only)
  columns: ColumnConfig[];
  visibleColumns: string[];
  onColumnVisibilityChange: (columns: string[]) => void;

  // Export
  onExport?: () => void;
  exportFormats?: ("csv" | "xlsx" | "pdf")[];

  // Bulk actions
  onBulkDelete?: (ids: string[]) => void;
  bulkActions?: BulkAction[]; // Additional bulk actions

  // Feature flags (all default to true)
  enableSearch?: boolean;
  enableViews?: boolean;
  enableFilters?: boolean;
  enableColumnToggle?: boolean;
  enableExport?: boolean;
  enableBulkDelete?: boolean;
}
```

### Usage Example

```tsx
<TableToolbar
  totalItems={47}
  filteredItems={47}
  selectedItems={selectedIds}
  searchValue={search}
  onSearchChange={setSearch}
  currentView={view}
  onViewChange={setView}
  filters={[
    { id: "status", label: "Status", type: "select", options: [...] },
    { id: "type", label: "Type", type: "select", options: [...] },
    { id: "dateRange", label: "Date", type: "dateRange" },
  ]}
  activeFilters={filters}
  onFilterChange={setFilters}
  columns={columnConfig}
  visibleColumns={visibleCols}
  onColumnVisibilityChange={setVisibleCols}
  onExport={handleExport}
  onBulkDelete={handleBulkDelete}
/>
```

---

## Filter Panel Component API

### `<FilterPanel />`

```tsx
interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onClear: () => void;
  onApply: () => void;
}

interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiSelect" | "dateRange" | "text" | "number" | "boolean";
  options?: { value: string; label: string }[]; // For select types
  placeholder?: string;
}
```

### Filter Panel UI

Opens as a popover below the Filter button:

```
┌─────────────────────────────────┐
│ Filters                    [×]  │
├─────────────────────────────────┤
│ Status                          │
│ [All statuses          ▾]       │
│                                 │
│ Type                            │
│ [All types             ▾]       │
│                                 │
│ Date Range                      │
│ [Start date] → [End date]       │
│                                 │
├─────────────────────────────────┤
│ [Clear All]        [Apply (3)]  │
└─────────────────────────────────┘
```

---

## Unified Table Config

### `<UnifiedDataTable />`

```tsx
interface UnifiedTableConfig {
  // Identity
  entityName: string;           // "Company", "Meeting", "Contract"
  entityNamePlural: string;     // "Companies", "Meetings", "Contracts"
  tableName: string;            // Supabase table name

  // Columns
  columns: ColumnConfig[];

  // Filters
  filters?: FilterConfig[];

  // Search
  searchFields: string[];       // Fields to search across

  // CRUD - all enabled by default
  crud: {
    create?: boolean | { label?: string; icon?: ReactNode };
    edit?: boolean;
    delete?: boolean;
    bulkDelete?: boolean;
  };

  // Views
  views?: {
    table?: boolean;
    card?: boolean | { render: (item: T) => ReactNode };
    list?: boolean | { render: (item: T) => ReactNode };
  };

  // Export
  export?: {
    enabled?: boolean;
    filename?: string;
    formats?: ("csv" | "xlsx" | "pdf")[];
  };

  // Row actions (beyond edit/delete)
  rowActions?: RowAction[];

  // Events
  onRowClick?: (item: T) => void;
}

interface ColumnConfig {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "datetime" | "currency" | "badge" | "avatar" | "boolean";

  // Visibility
  defaultVisible?: boolean;     // Default: true
  alwaysVisible?: boolean;      // Cannot be hidden (e.g., name column)

  // Sorting
  sortable?: boolean;           // Default: true
  defaultSort?: "asc" | "desc";

  // Rendering
  render?: (value: any, row: T) => ReactNode;  // Custom render
  badgeConfig?: {               // For type: "badge"
    variantMap: Record<string, "default" | "secondary" | "destructive" | "outline">;
  };

  // Width
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
}
```

---

## Complete Page Example

```tsx
// frontend/src/app/(main)/[projectId]/directory/companies/page.tsx

"use client";

import { useParams } from "next/navigation";
import { UnifiedDataTable, type UnifiedTableConfig } from "@/components/tables/unified-data-table";
import { useProjectCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/use-project-companies";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { CompanyFormDialog } from "@/components/domain/companies/CompanyFormDialog";

const tableConfig: UnifiedTableConfig = {
  entityName: "Company",
  entityNamePlural: "Companies",
  tableName: "project_companies",

  searchFields: ["company.name", "business_phone", "email_address"],

  columns: [
    {
      id: "company.name",
      label: "Company Name",
      type: "text",
      alwaysVisible: true,
      defaultSort: "asc",
    },
    {
      id: "company_type",
      label: "Type",
      type: "badge",
      badgeConfig: {
        variantMap: {
          "YOUR_COMPANY": "default",
          "VENDOR": "outline",
          "SUBCONTRACTOR": "secondary",
        },
      },
    },
    {
      id: "status",
      label: "Status",
      type: "badge",
      badgeConfig: {
        variantMap: {
          "ACTIVE": "default",
          "INACTIVE": "destructive",
        },
      },
    },
    { id: "business_phone", label: "Phone", type: "text" },
    { id: "email_address", label: "Email", type: "text" },
    { id: "company.city", label: "City", type: "text", defaultVisible: false },
    { id: "company.state", label: "State", type: "text", defaultVisible: false },
    { id: "user_count", label: "Users", type: "number" },
    { id: "created_at", label: "Added", type: "date", defaultVisible: false },
  ],

  filters: [
    {
      id: "company_type",
      label: "Type",
      type: "select",
      options: [
        { value: "YOUR_COMPANY", label: "Your Company" },
        { value: "VENDOR", label: "Vendor" },
        { value: "SUBCONTRACTOR", label: "Subcontractor" },
        { value: "SUPPLIER", label: "Supplier" },
      ],
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ],
    },
  ],

  crud: {
    create: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },

  views: {
    table: true,
    card: true,
    list: true,
  },

  export: {
    enabled: true,
    filename: "companies-export",
    formats: ["csv", "xlsx"],
  },
};

export default function ProjectDirectoryCompaniesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const tabs = getProjectDirectoryTabs(projectId);

  // Data fetching
  const { data, isLoading, error, refetch } = useProjectCompanies(projectId);

  // Mutations
  const createMutation = useCreateCompany(projectId);
  const updateMutation = useUpdateCompany(projectId);
  const deleteMutation = useDeleteCompany(projectId);

  return (
    <>
      <PageHeader
        title="Project Directory"
        description="Manage companies and team members for this project"
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <UnifiedDataTable
          config={tableConfig}
          data={data?.companies || []}
          isLoading={isLoading}
          error={error}
          onCreate={createMutation.mutateAsync}
          onUpdate={updateMutation.mutateAsync}
          onDelete={deleteMutation.mutateAsync}
          onBulkDelete={(ids) => Promise.all(ids.map(id => deleteMutation.mutateAsync(id)))}
          FormDialog={CompanyFormDialog}
        />
      </PageContainer>
    </>
  );
}
```

---

## Toolbar Icon Reference

| Action | Icon | Tooltip | State |
|--------|------|---------|-------|
| Search | `Search` (magnifying glass) | "Search" | Expands input on click |
| Table view | `LayoutList` | "Table view" | Active when selected |
| Card view | `LayoutGrid` | "Card view" | Active when selected |
| List view | `List` | "List view" | Active when selected |
| Filter | `Filter` | "Filter" | Badge shows count when active |
| Columns | `Columns3` | "Show/hide columns" | - |
| Export | `Download` | "Export" | Dropdown for format selection |
| Delete | `Trash2` | "Delete selected" | Disabled until selection |

---

## Responsive Behavior

### Desktop (≥1024px)
- Full toolbar with all icons visible
- Search input expanded by default (optional)

### Tablet (768px - 1023px)
- Search collapses to icon
- View switcher uses icons only
- All actions visible

### Mobile (<768px)
- Search icon → full-width input overlay
- Views hidden (default to list)
- Filter, columns, export in overflow menu (⋮)
- Bulk delete in overflow menu

---

## Accessibility

- All icon buttons have `aria-label`
- Keyboard navigation: Tab through toolbar items
- Filter panel: Focus trap when open
- Screen reader announces: "Displaying 47 of 47 items"
- Selection: "3 items selected"

---

## Implementation Priority

### Phase 1: Core Components
1. `<TableToolbar />` - toolbar with search, views, filter trigger
2. `<FilterPanel />` - popover filter UI
3. `<UnifiedDataTable />` - main table component

### Phase 2: View Modes
4. Card view rendering
5. List view rendering
6. View persistence (localStorage)

### Phase 3: Polish
7. Responsive behavior
8. Keyboard shortcuts
9. Bulk actions beyond delete

---

## Detail View Pattern

### Two Modes

| Mode | When to Use | Example |
|------|-------------|---------|
| **Slide-out panel** | Simple entities, quick edits | Companies, Contacts, Cost Codes |
| **Full detail page** | Complex entities, lots of nested data | Meetings, Budget Line Items, Contracts |

### Slide-out Panel (Default)

Row click opens a right-side panel (400-500px wide):

```
┌─────────────────────────────────────┬──────────────────────┐
│ Table remains visible               │ ← Detail Panel       │
│ (slightly dimmed or narrowed)       │                      │
│                                     │ Company Name    [×]  │
│ ☐  Acme Corp     ● Active   ...    │ ──────────────────── │
│ ☑  BuildCo  ←── selected           │                      │
│ ☐  SupplyMax     ○ Inactive ...    │ Name                 │
│                                     │ [BuildCo         ]   │
│                                     │                      │
│                                     │ Type                 │
│                                     │ [Subcontractor  ▾]   │
│                                     │                      │
│                                     │ Status               │
│                                     │ [Active         ▾]   │
│                                     │                      │
│                                     │ Phone                │
│                                     │ [(555) 123-4567  ]   │
│                                     │                      │
│                                     │ Email                │
│                                     │ [info@buildco.com]   │
│                                     │                      │
│                                     │ ─── Related ──────── │
│                                     │ Notes (3)        [+] │
│                                     │ RFIs (2)          →  │
│                                     │ Submittals (5)    →  │
│                                     │                      │
│                                     │ [Delete]    [Save]   │
└─────────────────────────────────────┴──────────────────────┘
```

### Panel Behavior

- **Open**: Row click or Edit action
- **Close**: × button, Escape key, click outside
- **Save**: Auto-save on blur OR explicit Save button (configurable)
- **Navigation**: Arrow keys move to prev/next row while panel open
- **URL**: Updates to include `?detail=<id>` for shareable links

### Config

```tsx
interface UnifiedTableConfig {
  // ... existing config

  // Detail view configuration
  detailView: {
    mode: "panel" | "page" | "none";

    // Panel-specific
    panelWidth?: number;              // Default: 480
    panelPosition?: "right" | "bottom"; // Default: "right"

    // Page-specific (when mode: "page")
    detailPath?: string;              // e.g., "/meetings/[id]"

    // Fields to show in panel (auto-generated from columns if not specified)
    fields?: DetailFieldConfig[];

    // Related sections (collapsed by default)
    relatedSections?: {
      id: string;
      label: string;
      count?: (item: T) => number;
      onClick?: (item: T) => void;    // Navigate or expand
    }[];
  };
}

interface DetailFieldConfig {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number" | "readonly";
  options?: { value: string; label: string }[]; // For select
  editable?: boolean;                 // Default: true
  fullWidth?: boolean;                // Span both columns
}
```

### Example: Companies (Panel Mode)

```tsx
const tableConfig: UnifiedTableConfig = {
  entityName: "Company",
  // ...columns, filters...

  detailView: {
    mode: "panel",
    panelWidth: 480,
    fields: [
      { id: "company.name", label: "Company Name", type: "text" },
      { id: "company_type", label: "Type", type: "select", options: [...] },
      { id: "status", label: "Status", type: "select", options: [...] },
      { id: "business_phone", label: "Phone", type: "text" },
      { id: "email_address", label: "Email", type: "text" },
      { id: "company.address", label: "Address", type: "text" },
      { id: "company.city", label: "City", type: "text" },
      { id: "company.state", label: "State", type: "text" },
      { id: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    relatedSections: [
      { id: "notes", label: "Notes", count: (item) => item.note_count },
      { id: "rfis", label: "RFIs", count: (item) => item.rfi_count },
      { id: "submittals", label: "Submittals", count: (item) => item.submittal_count },
    ],
  },
};
```

### Example: Meetings (Full Page Mode)

```tsx
const tableConfig: UnifiedTableConfig = {
  entityName: "Meeting",
  // ...columns, filters...

  detailView: {
    mode: "page",
    detailPath: "/[projectId]/meetings/[id]",
  },
};
```

### Keyboard Shortcuts (Panel Mode)

| Key | Action |
|-----|--------|
| `Escape` | Close panel |
| `↑` / `↓` | Navigate to prev/next row (keeps panel open) |
| `Cmd+S` | Save changes |
| `Cmd+Delete` | Delete item (with confirmation) |

---

## Migration Path

Existing tables using `GenericDataTable` can migrate incrementally:

1. Keep existing config structure
2. Wrap with `<UnifiedDataTable />`
3. Add new features (views, filter panel) as needed
4. Remove legacy filter dropdowns

No breaking changes to existing pages.
