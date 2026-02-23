---
description: "Generate a (tables) page for a Supabase table using GenericDataTable"
allowed-tools: "Read, Write, Bash, Glob, Grep, Edit"
---

# Create Table Page

Generate a complete `(tables)` route page for a Supabase table using the `GenericDataTable` factory component.

## Input

The user provides: `$ARGUMENTS`

This should be either:
1. A table name (e.g., `procore_tools`)
2. A table name + SQL schema (CREATE TABLE statement)

## Instructions

**DO NOT explore patterns. DO NOT search for examples. The template is below.**

### Step 1: Resolve the Schema

If the user provided a CREATE TABLE statement, parse columns from it directly. Skip to Step 2.

If only a table name was given, query Supabase for the schema:

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
node -e '
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from("TABLE_NAME").select("*").limit(1);
  if (error) { console.error("ERROR:", JSON.stringify(error)); process.exit(1); }
  if (data && data[0]) { console.log("COLUMNS:", Object.keys(data[0]).join(", ")); console.log("SAMPLE:", JSON.stringify(data[0], null, 2)); }
  else { console.log("TABLE EXISTS BUT EMPTY - need schema from user"); }
})();
'
```

Replace `TABLE_NAME` with the actual table name. Use the sample row to determine column types and values.

### Step 2: Derive Names

From the table name (e.g., `procore_tools`):
- **Route slug**: `procore-tools` (replace underscores with hyphens)
- **Page title**: `Procore Tools` (title case, spaces)
- **Variable name**: `tools` (last word, plural)
- **Function name**: `ProcoreToolsPage` (PascalCase + Page)
- **Export filename**: `procore-tools-export.csv`

### Step 3: Generate the Page

Create the file at: `frontend/src/app/(tables)/{route-slug}/page.tsx`

Use this exact template structure:

```tsx
import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";

const config: GenericTableConfig = {
  title: "__TITLE__",
  description: "__DESCRIPTION__",
  searchFields: [/* text columns good for search: name, description, slug, etc. */],
  exportFilename: "__EXPORT_FILENAME__",
  editConfig: {
    tableName: "__TABLE_NAME__",
    editableFields: [/* all columns EXCEPT id, created_at, updated_at */],
  },
  columns: [
    // RULES:
    // - First column: isPrimary: true, defaultVisible: true (the "name" field)
    // - Status/category columns: use renderConfig type "badge" with variantMap
    // - Long text columns: use renderConfig type "truncate" with maxLength 80
    // - URL columns: use renderConfig type "truncate" with maxLength 40
    // - Date columns: type "date"
    // - Number columns: type "number"
    // - Boolean columns: use renderConfig type "boolean"
    // - id column: SKIP (never show)
    // - created_at, updated_at: defaultVisible false, type "date"
    // - Show 3-5 most useful columns by default (defaultVisible: true)
    // - Hide the rest (defaultVisible: false)
  ],
  filters: [
    // Add filter for each column that has a known set of distinct values
    // (status, category, type, priority, etc.)
    // Format: { id: "field", label: "Label", field: "field", options: [{ value: "x", label: "X" }] }
  ],
  enableSorting: true,
  enableRowSelection: true,
  enableViewSwitcher: true,
};

export default async function __FUNCTION_NAME__() {
  const supabase = await createClient();

  const { data: __VARIABLE__, error } = await supabase
    .from("__TABLE_NAME__")
    .select("*")
    .order("__SORT_COLUMN__", { ascending: true });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading __TITLE_LOWER__. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={__VARIABLE__ || []} config={config} />;
}
```

### Step 4: Badge Variant Map Reference

When creating badge columns, use these variant assignments:

**Status-like columns:**
- Not started / inactive / draft → `"outline"`
- In progress / active / implementation → `"default"`
- Testing / review / pending → `"secondary"`
- Complete / done / approved → `"success"`
- Critical / error / blocked → `"destructive"`

**Category-like columns (cycle through):**
- Category 1 → `"secondary"`
- Category 2 → `"default"`
- Category 3 → `"destructive"`
- Category 4 → `"outline"`

### Step 5: Verify

After creating the file, run a quick TypeScript check:

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npx tsc --noEmit src/app/\(tables\)/{route-slug}/page.tsx 2>&1 | head -20
```

If there are errors, fix them. If `tsc` can't resolve the file alone, just verify the imports are correct by checking the factory component exists:

```bash
ls src/components/tables/generic-table-factory.tsx
```

### What NOT To Do

- DO NOT read other table pages for "patterns" — the template above IS the pattern
- DO NOT attempt to generate Supabase types (`supabase gen types` often fails on auth)
- DO NOT import `Database` type — `GenericDataTable` accepts `Record<string, unknown>[]`
- DO NOT explore the `GenericDataTable` component — the config interface is documented above
- DO NOT add navigation/sidebar entries — `(tables)` pages are standalone
- DO NOT create hooks or services — this is a server component that queries directly

### Output

Tell the user:
1. File path created
2. Route URL (e.g., `/procore-tools`)
3. Columns visible by default
4. Available filters
