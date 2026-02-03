# Page Layout Migration Template

## Your Task

Migrate pages to use the correct layout components from `@/components/layouts`.

## Migration Pattern

### For Table Pages (list views, data tables)

**Before:**

```tsx
export default function SomePage() {
  return (
    <div className="container mx-auto py-6">
      <h1>Page Title</h1>
      <DataTable ... />
    </div>
  );
}
```sql
**After:**
```tsx
import { TableLayout } from '@/components/layouts';
import { PageHeader } from '@/components/layout';

export default function SomePage() {
  return (
    <>
      <PageHeader
        title="Page Title"
        description="Brief description"
        breadcrumbs={[
          { label: 'Parent', href: '/parent' },
          { label: 'Current Page' },
        ]}
      />

      <TableLayout>
        <DataTable ... />
      </TableLayout>
    </>
  );
}
```sql
### For Form Pages (create/edit forms)

**Before:**

```tsx
export default function CreatePage() {
  return (
    <div className="container mx-auto py-6">
      <h1>Create Item</h1>
      <form>...</form>
    </div>
  );
}
```sql
**After:**
```tsx
import { FormLayout } from '@/components/layouts';
import { PageHeader } from '@/components/layout';

export default function CreatePage() {
  return (
    <>
      <PageHeader
        title="Create Item"
        description="Create a new item"
        breadcrumbs={[
          { label: 'Items', href: '/items' },
          { label: 'New Item' },
        ]}
      />

      <FormLayout>
        <form>...</form>
      </FormLayout>
    </>
  );
}
```

## Steps for Each Page

1. **Read the page file first**
2. **Identify the page type:**
   - Table page → use `TableLayout`
   - Form page (new/edit) → use `FormLayout`
   - Dashboard → use `DashboardLayout`

3. **Add imports at top:**

   ```tsx
   import { TableLayout } from '@/components/layouts'; // or FormLayout
   import { PageHeader } from '@/components/layout';
   ```

4. **Extract page title and create PageHeader:**
   - Look for existing h1, title, or heading
   - Create appropriate breadcrumbs based on URL structure
   - Move any "Back" or action buttons to PageHeader actions prop

5. **Wrap content in layout:**
   - Remove manual container divs (`<div className="container mx-auto py-6">`)
   - Remove manual padding/margins
   - Wrap actual content (table, form, etc.) in layout component

6. **Clean up:**
   - Remove unused className for spacing
   - Remove manual h1/h2 if replaced by PageHeader
   - Ensure no duplicate wrapper divs

7. **Save the file**

## Important Rules

- **ALWAYS read the file first** before editing
- **Don't remove functionality** - only change layout structure
- **Preserve all hooks, state, handlers** - these don't change
- **Keep all imports** except those being replaced
- **Don't change the actual content** (tables, forms, etc.) - only the wrapper structure

## Common Breadcrumb Patterns

```tsx
// For table pages under (tables)
breadcrumbs={[
  { label: 'Dashboard', href: '/' },
  { label: 'Page Name' },
]}

// For project tool pages
breadcrumbs={[
  { label: 'Projects', href: '/' },
  { label: 'Project Name', href: `/${projectId}` },
  { label: 'Tool Name' },
]}

// For create/edit pages
breadcrumbs={[
  { label: 'Parent List', href: '/parent' },
  { label: 'New Item' },
]}
```

## Completion Criteria

For each page you migrate:

- ✅ Correct layout component imported and used
- ✅ PageHeader added with title, description, breadcrumbs
- ✅ Manual containers removed
- ✅ No TypeScript errors
- ✅ Functionality preserved
