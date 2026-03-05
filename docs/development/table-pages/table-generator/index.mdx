# Table Page Generator (Development Tool)

## Overview

A development-only tool for rapidly generating table page configurations from Supabase tables.

**Location:** `/dev/table-generator`

**Access:** Only available in development/local environments (blocked in production)

## Features

- **Auto-detect** all Supabase tables
- **Introspect** column names and infer types
- **Configure** visible columns, search fields, filters
- **Enable** inline editing and row navigation
- **Generate** complete page.tsx code
- **Copy** to clipboard or download as file

## How to Use

1. **Start your dev server:**

   ```bash
   npm run dev
   ```bash
2. **Navigate to the tool:**

   ```text
   http://localhost:3000/dev/table-generator
   ```text
3. **Follow the step-by-step wizard:**

   - **Step 1:** Select a Supabase table from the dropdown
   - **Step 2:** Configure table title and description
   - **Step 3:** Choose visible columns and set primary/secondary columns
   - **Step 4:** Select searchable text fields
   - **Step 5:** (Optional) Add dropdown filters for badge/enum fields
   - **Step 6:** Enable editing and row click navigation

4. **Generate the code:**
   - Click "Generate Code"
   - Review the generated page.tsx code
   - Copy to clipboard or download

5. **Create the table page:**

   ```bash
   # Create directory if it doesn't exist
   mkdir -p frontend/src/app/(tables)/<table-name>

   # Paste or save the generated code
   # Save as: frontend/src/app/(tables)/<table-name>/page.tsx
   ```

6. **Test your new table page:**

   ```text
   http://localhost:3000/<table-name>
   ```

## Example Workflow

Let's say you have a Supabase table called `vendors`:

1. Go to `/dev/table-generator`
2. Select "vendors" from the dropdown
3. The tool auto-detects columns like: id, name, contact_email, status, created_at
4. Configure:
   - Title: "Vendors"
   - Description: "Manage vendor directory"
   - Visible columns: name, contact_email, status
   - Search fields: name, contact_email
   - Add filter for "status" field with options: active, inactive
   - Enable editing
   - Enable row navigation to `/vendors/{id}`
5. Click "Generate Code"
6. Copy the generated code
7. Create `frontend/src/app/(tables)/vendors/page.tsx`
8. Paste the code
9. Visit `http://localhost:3000/vendors`

## Generated Code Structure

The tool generates a complete Next.js page with:

```tsx
import { createClient } from '@/lib/supabase/server'
import { GenericDataTable, type GenericTableConfig } from '@/components/tables/generic-table-factory'

const config: GenericTableConfig = {
  title: 'Your Table Name',
  description: 'Your description',
  searchFields: ['field1', 'field2'],
  exportFilename: 'export.csv',
  editConfig: {
    tableName: 'your_table',
    editableFields: ['field1', 'field2']
  },
  columns: [
    // Column definitions
  ],
  filters: [
    // Filter definitions
  ],
  rowClickPath: '/your-table/{id}'
}

export default async function YourTablePage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error loading data</div>
  }

  return <GenericDataTable data={data || []} config={config} />
}
```

## Benefits

- **Rapid prototyping** - Generate table pages in seconds instead of minutes
- **Consistency** - All table pages use the same pattern and component
- **Type safety** - Auto-detects column types from sample data
- **Customizable** - Easy to modify generated code for specific needs

## Security Note

This tool is **automatically blocked in production** via:

- `NODE_ENV` check
- `VERCEL_ENV` check

The API endpoints (`/api/dev/schema`) return 403 Forbidden in production.

## Tips

- For best results, have at least one row of data in your table (helps with type inference)
- Start with default settings, generate code, then customize as needed
- Use primary/secondary columns for card and list views
- Add filters for fields that have a limited set of values (status, category, priority, etc.)
- The generated code is a starting point - feel free to enhance it!

## Troubleshooting

**Table list is empty?**

- Check your Supabase connection
- Ensure tables exist in your database
- Grant information_schema read access (or use fallback list)

**Column detection fails?**

- Ensure the table has at least one row
- Check Supabase RLS policies allow read access
- Manually edit generated code if needed

**Generated code has errors?**

- Run `npm run typecheck` to identify type issues
- Verify imported types match your database.types.ts
- Adjust column types manually in the config

## Related Documentation

- [Generic Table Factory](./frontend/src/components/tables/generic-table-factory.tsx)
- [Table Documentation](./TABLE_DOCS.md)
- [Supabase Schema](./frontend/src/types/database.types.ts)
