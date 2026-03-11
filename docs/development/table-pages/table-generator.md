# Table Page Generator (Development Tool)

## Overview

A development-only tool for rapidly generating table pages using the **UnifiedTablePage** pattern. It generates two files:

1. **Feature table config** — column definitions, filters, renderers
2. **Page component** — wired to `UnifiedTablePage` + `useUnifiedTableState`

**Location:** `/dev/table-generator`

**Access:** Only available in development/local environments (blocked in production)

## How to Use

1. **Start your dev server:**

   ```bash
   cd frontend && npm run dev
   ```

2. **Navigate to the tool:**

   ```
   http://localhost:3000/dev/table-generator
   ```

3. **Follow the step-by-step wizard:**

   - **Step 1:** Select a Supabase table from the searchable dropdown
   - **Step 2:** Set the page title and entity key (used for file names, URLs, localStorage)
   - **Step 3:** Choose which columns to display and mark "always visible" columns
   - **Step 4:** Select searchable text fields
   - **Step 5:** (Optional) Add dropdown filters for badge/enum fields

4. **Generate the code:**
   - Click "Generate Code"
   - Two tabs appear: **Table Config** and **Page Component**
   - Copy or download each file

5. **Create the files:**

   ```bash
   # Create the feature config directory
   mkdir -p frontend/src/features/<entity-key>

   # Save the Table Config as:
   frontend/src/features/<entity-key>/<entity-key>-table-config.tsx

   # Create the page directory
   mkdir -p frontend/src/app/(tables)/<entity-key>

   # Save the Page Component as:
   frontend/src/app/(tables)/<entity-key>/page.tsx
   ```

6. **Update the API endpoint:**
   - The generated page fetches from `/api/<entity-key>` — create or update this route
   - Alternatively, modify the `refresh()` function in the page to fetch from your existing API

7. **Test your new table page:**

   ```
   http://localhost:3000/<entity-key>
   ```

## Example Workflow

For a Supabase table called `vendors`:

1. Go to `/dev/table-generator`
2. Select "vendors" from the dropdown
3. Columns auto-detected: id, name, contact_email, status, created_at
4. Configure:
   - Title: "Vendors"
   - Entity Key: "vendors"
   - Visible columns: name, contact_email, status, created_at
   - Search fields: name, contact_email
   - Add filter for "status" with options: active, inactive
5. Click "Generate Code"
6. Copy Table Config → save as `frontend/src/features/vendors/vendors-table-config.tsx`
7. Copy Page Component → save as `frontend/src/app/(tables)/vendors/page.tsx`
8. Visit `http://localhost:3000/vendors`

## Generated Architecture

The generator outputs code following the **UnifiedTablePage** pattern:

### File 1: Feature Table Config

```
frontend/src/features/<entity>/<entity>-table-config.tsx
```

Exports:
- `EntityRow` — TypeScript type for row data
- `entityColumns` — `ColumnConfig[]` for column picker
- `entityFilters` — `FilterConfig[]` for filter dropdowns
- `entityDefaultVisibleColumns` — `string[]` derived from columns
- `buildEntityTableColumns()` — `TableColumn<EntityRow>[]` with render/sort
- `renderEntityCard()` — Card view renderer
- `renderEntityList()` — List view renderer
- `renderEntityRowActions()` — Row action dropdown

### File 2: Page Component

```
frontend/src/app/(tables)/<entity>/page.tsx
```

Uses:
- `useUnifiedTableState()` for URL-synced state management
- `UnifiedTablePage` component with all standard props
- Client-side filtering, sorting, and search
- CSV export
- Table, card, and list views

## What You Get Out of the Box

- Search with debounce
- Column visibility toggle (persisted to localStorage)
- Filter popovers with badge count
- Sorting (click column headers or right-click context menu)
- Table / Card / List view switching
- CSV export
- Empty states (filtered vs. unfiltered)
- Responsive design

## Security Note

This tool is **automatically blocked in production** via `NODE_ENV` check. The API endpoints (`/api/dev/schema`) return 403 in production.

## Troubleshooting

**Table list is empty?**
- Check your Supabase connection
- Ensure tables exist and RLS allows read access

**Column detection wrong types?**
- Ensure the table has at least one row (helps with type inference)
- Manually adjust types in the generated config

**Generated code has import errors?**
- Run `npm run typecheck` to identify issues
- Ensure `@/components/tables/unified` and `@/components/ds` are available

## Related Files

- [`frontend/src/components/tables/unified/unified-table-page.tsx`](../../../frontend/src/components/tables/unified/unified-table-page.tsx) — UnifiedTablePage component
- [`frontend/src/components/tables/unified/use-unified-table-state.ts`](../../../frontend/src/components/tables/unified/use-unified-table-state.ts) — State hook
- [`frontend/src/components/tables/unified/table-primitives.tsx`](../../../frontend/src/components/tables/unified/table-primitives.tsx) — Shared table cell and menu primitives
- [`docs/development/table-pages/table-component-catalog.md`](./table-component-catalog.md) — Standardized component usage guide
- [`frontend/src/features/documents/documents-table-config.tsx`](../../../frontend/src/features/documents/documents-table-config.tsx) — Reference config
- [`frontend/src/app/(tables)/documents/page.tsx`](../../../frontend/src/app/(tables)/documents/page.tsx) — Reference page
