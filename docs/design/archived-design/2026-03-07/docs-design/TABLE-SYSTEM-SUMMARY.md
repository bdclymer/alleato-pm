# Unified Table System: Design Summary

## The Problem

The application has 20+ table pages, each built inconsistently:
- Different patterns (inline tables, GenericDataTable, separate wrapper components)
- Inconsistent UI (some have filter dropdowns on page, some don't)
- Cluttered toolbars taking up a third of the page before data appears
- No standardized CRUD operations
- Every new table takes 10x longer than it should due to repeated mistakes

**Goal:** A scalable, config-driven table system that makes creating new table pages fast, consistent, and maintainable.

---

## Design Principles

### 1. Clean & Minimal
- **Icons over labels** - Search, filter, export, delete, views all represented by icons with tooltips
- **Progressive disclosure** - Search expands on click, filters open in popover, columns in dropdown
- **Data first** - Minimize chrome so users see their data immediately

### 2. Consistent
- Every table page looks and behaves the same
- Same toolbar, same interactions, same keyboard shortcuts
- Users learn once, applies everywhere

### 3. Config-Driven
- New table = config object + hook
- No custom JSX for standard tables
- Customization through config, not code duplication

### 4. CRUD by Default
- Every table supports Create, Read, Update, Delete unless explicitly disabled
- Add button in header, edit/delete in row actions and detail panel

---

## Toolbar Design

```
🔍 ──────────  [≡][▦][▤]  [Filter(2)]  [⋮⋮]  [↓]  [🗑]    47 items
   search       views      filter     cols  export del   count
```

| Element | Behavior |
|---------|----------|
| **Search** | Icon by default, expands to input on click, collapses on blur if empty |
| **Views** | 3 icon toggle (table/card/list), no labels |
| **Filter** | Icon opens popover with all filters, badge shows active count |
| **Columns** | Icon opens dropdown to show/hide columns |
| **Export** | Icon triggers CSV/Excel export |
| **Delete** | Icon disabled until rows selected, turns red when active |
| **Count** | Right-aligned, shows "X items" or "X of Y" when filtered |

---

## Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Page Title                              [+ Add Entity]  │  ← Header with primary action
├─────────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3]                                 │  ← Optional tabs (like Directory)
├─────────────────────────────────────────────────────────┤
│ 🔍  [≡][▦][▤]  [Filter]  [⋮⋮]  [↓]  [🗑]      47 items │  ← Unified toolbar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Table / Card / List view                               │  ← Data (maximum space)
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    [<] Page 1 of 5 [>]                  │  ← Pagination
└─────────────────────────────────────────────────────────┘
```

**Key decisions:**
- Add button stays in **header** (page-level action)
- Table controls stay in **toolbar** (data-level actions)
- Filters in **popover**, not inline dropdowns cluttering the page

---

## Detail View: Slide-out Panel

For simple entities (Companies, Contacts, Cost Codes), clicking a row opens a **slide-out panel** instead of navigating to a new page.

```
┌──────────────────────────────┬────────────────────┐
│ Table (stays visible)        │ Detail Panel       │
│                              │                    │
│ ☐ Acme Corp    Active        │ BuildCo       [×]  │
│ ☑ BuildCo ←── selected       │ ──────────────────│
│ ☐ SupplyMax    Inactive      │ Name: [........]  │
│                              │ Type: [........]  │
│                              │ Status: [......]  │
│                              │                    │
│                              │ ─── Related ───── │
│                              │ Contacts (5)      │
│                              │ Projects (3)      │
│                              │                    │
│                              │ [Delete]   [Save] │
└──────────────────────────────┴────────────────────┘
```

**Benefits:**
- User doesn't lose context (table stays visible)
- Quick edits without page navigation
- Arrow keys navigate between rows while panel stays open
- URL updates for shareable links (`?detail=123`)

**When to use full page instead:**
- Complex entities with lots of nested data (Meetings, Budget Line Items, Contracts)
- Configurable per entity: `detailView: { mode: "panel" | "page" }`

---

## Three View Modes

Every table supports three views, switchable via icons:

| View | Icon | Use Case |
|------|------|----------|
| **Table** | `LayoutList` | Default, dense data, sortable columns |
| **Card** | `LayoutGrid` | Visual items, more info per item |
| **List** | `List` | Compact, scan quickly |

---

## Implementation Architecture

### Components Created

```
frontend/src/components/tables/unified/
├── table-toolbar.tsx      # Search, views, filters, columns, export, delete
├── detail-panel.tsx       # Slide-out edit panel
└── index.ts               # Exports
```

### Usage Pattern

```tsx
// Config defines everything
const tableConfig = {
  columns: [...],
  filters: [...],
  detailFields: [...],
};

// Page is minimal
export default function CompaniesPage() {
  const { data } = useCompanies();

  return (
    <>
      <PageHeader title="Companies" actions={<AddButton />} />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <TableToolbar {...toolbarProps} />
        <Table data={data} />
      </PageContainer>
      <DetailPanel {...panelProps} />
    </>
  );
}
```

---

## Benefits

| Before | After |
|--------|-------|
| 3 different table patterns | 1 unified pattern |
| Filter dropdowns on page | Filter popover (clean) |
| Inconsistent toolbars | Standardized icon toolbar |
| Full page for all edits | Slide-out panel for simple entities |
| Custom code per table | Config-driven |
| Labels everywhere | Icons with tooltips |
| 276 lines per page | ~100 lines (mostly config) |

---

## Next Steps

1. **Apply to all table pages** - Migrate existing pages to unified system
2. **Create scaffold** - `/create-table-page` generates config + page
3. **Add keyboard shortcuts** - Cmd+K for search, Cmd+E for export, etc.
4. **Persist preferences** - Save view mode, visible columns to localStorage
5. **Add bulk actions** - Beyond delete (export selected, change status, etc.)

---

## Reference Implementation

See: `frontend/src/app/(main)/[projectId]/directory/companies/page.tsx`

This page demonstrates:
- Unified toolbar with all features
- Three view modes (table/card/list)
- Slide-out detail panel with edit form
- Row selection and bulk delete
- Filter popover
- Column visibility toggle
