# Alleato Design System Standards

**Version:** 1.0
**Last Updated:** January 31, 2026

## Purpose

This document defines the standard design patterns and components to be used across all Alleato features. Following these standards ensures visual consistency, accessibility, and maintainability.

## Spacing System

### CSS Variables

All spacing must use the following CSS variables:

```css
/* Spacing Scale */
--spacing-section: 1.5rem;   /* 24px - between major sections */
--spacing-group: 1rem;       /* 16px - between related fields or groups */
--spacing-field: 0.5rem;     /* 8px - within a field (label to input) */
--spacing-card: 2rem;        /* 32px - card padding */
--spacing-card-gap: 1.5rem;  /* 24px - gap between cards */
```
### Usage Examples

```tsx
// Section spacing (between major page sections)
<div className="space-y-[var(--spacing-section)]">
  <Section1 />
  <Section2 />
</div>

// Group spacing (between related form fields)
<div className="space-y-[var(--spacing-group)]">
  <FieldGroup1 />
  <FieldGroup2 />
</div>

// Card padding
<CardContent className="p-[var(--spacing-card)]">
  {children}
</CardContent>

// Card grid gaps
<div className="grid gap-[var(--spacing-card-gap)] lg:grid-cols-3">
  <Card />
  <Card />
</div>
```
### Migration from Hardcoded Values

| Old (Hardcoded) | New (Variable) |
|----------------|----------------|
| `space-y-6` | `space-y-[var(--spacing-section)]` |
| `gap-4` | `gap-[var(--spacing-group)]` |
| `space-y-4` | `space-y-[var(--spacing-group)]` |
| `p-8` | `p-[var(--spacing-card)]` |

## Typography Hierarchy

### Page Structure

```tsx
// Page Title (handled by ProjectPageHeader)
<ProjectPageHeader title="Page Title" />

// Section Headers
<SectionHeader>Section Title</SectionHeader>
// Renders as: <h2 className="text-lg font-semibold text-foreground">

// Subsection Headers
<SubsectionHeader>Subsection Title</SubsectionHeader>
// Renders as: <h3 className="text-base font-medium text-foreground">

// Card Titles (when using cards)
<CardTitle>Card Title</CardTitle>
// Handled by Card component
```
### Field Labels

```tsx
// Standard field label
<FieldLabel required={true}>Label Text</FieldLabel>
// Renders as: <label className="text-sm font-medium text-foreground">

// Detail view labels (read-only data)
<DetailLabel>Label Text</DetailLabel>
// Renders as: <p className="text-xs text-muted-foreground">
```

### Body Text

```tsx
// Standard text
<Text>Body text content</Text>
// Renders as: <p className="text-sm text-foreground">

// Muted text (descriptions, help text)
<Text tone="muted">Secondary information</Text>
// Renders as: <p className="text-sm text-muted-foreground">

// Small text (captions, metadata)
<Text size="xs">Caption text</Text>
// Renders as: <p className="text-xs text-foreground">
```
## Layout Patterns

### List Page Layout

**Standard pattern for entity list pages:**

```tsx
export default function EntityListPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  return (
    <>
      <ProjectPageHeader
        title="Entity Name (Plural)"
        description="Brief description of what this page manages"
        showExportButton={false}
        actions={
          <Button size="sm" onClick={() => router.push(`/${projectId}/entity/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entity
          </Button>
        }
      />

      <PageTabs
        tabs={[
          { label: "All Items", href: `/${projectId}/entity`, count: total },
          { label: "Active", href: `/${projectId}/entity?status=active` },
          { label: "Completed", href: `/${projectId}/entity?status=completed` },
        ]}
      />

      <PageContainer className="space-y-[var(--spacing-section)]">
        {loading ? (
          <LoadingState />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No items found"
            description="Get started by creating your first item"
            action={
              <Button onClick={() => router.push(`/${projectId}/entity/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Item
              </Button>
            }
          />
        ) : (
          <GenericDataTable data={data} config={tableConfig} />
        )}
      </PageContainer>
    </>
  );
}
```
### Create/Edit Form Layout

**Standard pattern for forms:**

```tsx
export default function EntityFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader
        title={mode === 'create' ? 'New Entity' : 'Edit Entity'}
        breadcrumbs={[
          { label: 'Entities', href: `/${projectId}/entity` },
          { label: mode === 'create' ? 'New' : 'Edit' },
        ]}
        actions={
          mode === 'edit' && (
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )
        }
      />

      <PageContainer className="bg-muted/30">
        <FormContainer maxWidth="xl" className="max-w-[1400px]">
          <Card>
            <CardContent className="p-[var(--spacing-card)]">
              <EntityForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSaving}
                mode={mode}
              />
            </CardContent>
          </Card>
        </FormContainer>
      </PageContainer>
    </>
  );
}
```
### Detail Page Layout

**Standard pattern for detail views:**

```tsx
export default function EntityDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const entityId = params.entityId as string;

  return (
    <>
      <ProjectPageHeader
        title={entity?.title || 'Entity Details'}
        description={entity?.description || ''}
        breadcrumbs={[
          { label: 'Entities', href: `/${projectId}/entity` },
          { label: `Entity #${entity?.number}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="default" size="sm" onClick={handleEdit}>
              Edit Entity
            </Button>
          </div>
        }
      />

      <TableLayout>
        <Tabs defaultValue="overview">
          <TabsList className="mb-[var(--spacing-section)]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-[var(--spacing-section)]">
            {/* Primary content grid */}
            <div className="grid gap-[var(--spacing-card-gap)] lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>Entity details</CardDescription>
                </CardHeader>
                <CardContent className="p-[var(--spacing-card)]">
                  {/* Content */}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-[var(--spacing-card)]">
                  {/* Summary metrics */}
                </CardContent>
              </Card>
            </div>

            {/* Secondary content grid */}
            <div className="grid gap-[var(--spacing-card-gap)] lg:grid-cols-3">
              <Card className="lg:col-span-2">
                {/* Related data table */}
              </Card>
              <Card>
                {/* Additional info */}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </TableLayout>
    </>
  );
}
```

## Form Patterns

### Field Layout Grid

**3-Column Grid (Primary Fields):**

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-group)]">
  <TextField label="Field 1" {...field1Props} />
  <TextField label="Field 2" {...field2Props} />
  <TextField label="Field 3" {...field3Props} />
</div>
```
**2-Column Grid (Secondary Fields):**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-group)]">
  <TextField label="Field 1" {...field1Props} />
  <TextField label="Field 2" {...field2Props} />
</div>
```
**Full-Width Fields (Rich Text, File Uploads):**

```tsx
<RichTextField
  label="Description"
  value={description}
  onChange={handleChange}
  placeholder="Enter description..."
  fullWidth
/>

<FileUploadField
  label="Attachments"
  value={files}
  onChange={handleFilesChange}
  multiple
  maxFiles={20}
  maxSize={10 * 1024 * 1024}
  accept=".pdf,.doc,.docx"
  hint="Attach relevant documents"
/>
```
### Form Sections

**Section with Header:**

```tsx
<FormSection title="General Information" description="Primary entity details">
  <div className="space-y-[var(--spacing-group)]">
    {/* Field rows */}
  </div>
</FormSection>

<FormSection title="Additional Settings">
  <div className="space-y-[var(--spacing-group)]">
    {/* Field rows */}
  </div>
</FormSection>
```

### Form Actions

**Standard action layout:**

```tsx
<FormActions>
  <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
    Cancel
  </Button>
  <Button variant="default" type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
  </Button>
</FormActions>
```
**With additional actions:**

```tsx
<FormActions>
  <div className="flex-1">
    <Button variant="ghost" onClick={handleReset}>
      Reset Form
    </Button>
  </div>
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="default" type="submit">
    Save Changes
  </Button>
</FormActions>
```
## Button Standards

### Size Guidelines

| Context | Size | Example |
|---------|------|---------|
| Page header actions | `sm` | New/Create buttons |
| Form primary actions | `default` | Submit, Save, Cancel |
| Form secondary actions | `default` | Reset, Clear |
| Inline actions | `sm` | Edit, Delete icons |
| Empty state CTA | `default` | Create first item |

### Variant Guidelines

| Purpose | Variant | Usage |
|---------|---------|-------|
| Primary action | `default` | Create, Save, Submit |
| Secondary action | `outline` | Cancel, Back |
| Tertiary action | `ghost` | Reset, Clear |
| Destructive action | `destructive` | Delete, Remove |
| Link-style action | `link` | Learn more, View details |

### Icon Placement

**Icons BEFORE text:**

```tsx
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Create Item
</Button>

<Button size="sm">
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back
</Button>
```
**Icons ONLY (with aria-label):**

```tsx
<Button variant="ghost" size="sm" aria-label="Delete item">
  <Trash className="h-4 w-4" />
</Button>
```

### Button Groups

```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm">
    <ArrowLeft className="h-4 w-4 mr-2" />
    Back
  </Button>
  <Button variant="default" size="sm">
    Edit
  </Button>
</div>
```
## Data Display Components

### Currency Display

```tsx
import { Currency } from '@/components/ui/currency';

// Standard usage
<Currency value={1000.50} />
// Output: $1,000.50 (text-base font-medium)

// Large emphasis (for summary cards)
<Currency value={1000.50} size="lg" weight="semibold" />
// Output: $1,000.50 (text-lg font-semibold)

// Small (for table cells)
<Currency value={1000.50} size="sm" />
// Output: $1,000.50 (text-sm font-normal)

// With custom color for negative values
<Currency value={-500} negative="destructive" />
// Output: -$500.00 (text-destructive)
```
### Date Display

```tsx
import { DateDisplay } from '@/components/ui/date-display';

// Short format (for tables)
<DateDisplay value={date} variant="short" />
// Output: 1/15/2026

// Medium format (for detail views)
<DateDisplay value={date} variant="medium" />
// Output: Jan 15, 2026

// Long format (for timestamps)
<DateDisplay value={date} variant="long" />
// Output: January 15, 2026, 2:30 PM PST

// With fallback
<DateDisplay value={null} fallback="Not set" />
// Output: Not set
```
### Status Badges

```tsx
import { StatusBadge } from '@/components/ui/status-badge';

// Auto-mapped variants based on status
<StatusBadge status="approved" />   // success variant (green)
<StatusBadge status="pending" />    // warning variant (yellow)
<StatusBadge status="rejected" />   // destructive variant (red)
<StatusBadge status="draft" />      // secondary variant (gray)
<StatusBadge status="complete" />   // default variant (blue)
```

**Status Variant Mapping:**

```ts
const statusVariants = {
  draft: 'secondary',      // Gray
  pending: 'warning',      // Yellow
  approved: 'success',     // Green
  rejected: 'destructive', // Red
  complete: 'default',     // Blue
  cancelled: 'destructive',// Red
  active: 'success',       // Green
  inactive: 'secondary',   // Gray
};
```
### Detail Fields

**Read-only field display:**

```tsx
<DetailField
  label="Contract Number"
  value={contract.number || '--'}
/>

<DetailField
  label="Amount"
  value={<Currency value={amount} />}
/>

<DetailField
  label="Client"
  value={
    <Link href={`/companies/${clientId}`} className="text-blue-600 hover:underline">
      {clientName}
    </Link>
  }
/>
```
**Renders as:**

```tsx
<div className="space-y-[var(--spacing-field)]">
  <DetailLabel>{label}</DetailLabel>
  <div className="font-medium text-foreground">{value}</div>
</div>
```
## Card Patterns

### Basic Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Brief description of card content</CardDescription>
  </CardHeader>
  <CardContent className="p-[var(--spacing-card)]">
    {/* Card content */}
  </CardContent>
</Card>
```

### Collapsible Card

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Collapsible Section</CardTitle>
      <CardDescription>Additional details</CardDescription>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-controls="section-content"
    >
      {open ? 'Hide' : 'Show'}
      <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
    </Button>
  </CardHeader>
  <CardContent id="section-content">
    <Collapsible open={open}>
      <CollapsibleContent>
        {/* Content */}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```
### Card with Actions

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Items</CardTitle>
      <CardDescription>{items.length} total items</CardDescription>
    </div>
    <Button variant="outline" size="sm" onClick={handleAddItem}>
      <Plus className="h-4 w-4 mr-2" />
      Add Item
    </Button>
  </CardHeader>
  <CardContent className="p-[var(--spacing-card)]">
    {/* Content */}
  </CardContent>
</Card>
```
## Empty State Pattern

### Standard Empty State

```tsx
<EmptyState
  icon={FileText}
  title="No items found"
  description="Get started by creating your first item"
  action={
    <Button variant="default" onClick={handleCreate}>
      <Plus className="mr-2 h-4 w-4" />
      Create Item
    </Button>
  }
/>
```
**Renders as:**

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
  <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
  {action}
</div>
```

### Empty State Variants

**No Results (with search/filter active):**

```tsx
<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your search or filter criteria"
  action={
    <Button variant="outline" onClick={handleClearFilters}>
      Clear Filters
    </Button>
  }
/>
```
**Permission Denied:**

```tsx
<EmptyState
  icon={AlertCircle}
  title="Access Denied"
  description="You don't have permission to view this content"
  variant="error"
/>
```
**Loading State:**

```tsx
<EmptyState
  icon={Loader}
  title="Loading items..."
  description="Please wait while we fetch your data"
  variant="loading"
/>
```
## Info Banner Pattern

### Standard Info Banner

```tsx
<InfoBanner variant="info">
  <Info className="h-5 w-5 shrink-0" />
  <div className="flex-1">
    <p className="text-sm">
      This is an informational message with context and guidance.
    </p>
  </div>
  <Button variant="outline" size="sm" onClick={handleAction}>
    Action
  </Button>
</InfoBanner>
```

### Banner Variants

```tsx
// Info (blue)
<InfoBanner variant="info">
  <Info className="h-5 w-5" />
  <p>Informational message</p>
</InfoBanner>

// Warning (yellow)
<InfoBanner variant="warning">
  <AlertTriangle className="h-5 w-5" />
  <p>Warning message</p>
</InfoBanner>

// Error (red)
<InfoBanner variant="error">
  <AlertCircle className="h-5 w-5" />
  <p>Error message</p>
</InfoBanner>

// Success (green)
<InfoBanner variant="success">
  <CheckCircle className="h-5 w-5" />
  <p>Success message</p>
</InfoBanner>
```
**Styling by variant:**

| Variant | Background | Border | Text | Icon |
|---------|-----------|--------|------|------|
| info | `bg-blue-50` | `border-blue-200` | `text-blue-900` | `text-blue-600` |
| warning | `bg-yellow-50` | `border-yellow-200` | `text-yellow-900` | `text-yellow-600` |
| error | `bg-red-50` | `border-red-200` | `text-red-900` | `text-red-600` |
| success | `bg-green-50` | `border-green-200` | `text-green-900` | `text-green-600` |

## Table Patterns

### Standard Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.description}</TableCell>
        <TableCell className="text-right">
          <Currency value={item.amount} />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```
### Table with Footer

```tsx
<Table>
  {/* Header and Body */}
  <tfoot>
    <TableRow className="bg-muted font-medium">
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell className="text-right">
        <Currency value={total} />
      </TableCell>
    </TableRow>
  </tfoot>
</Table>
```
### Generic Data Table

**For complex tables with sorting, filtering, search:**

```tsx
<GenericDataTable
  data={items}
  config={tableConfig}
  onRowClick={(row) => router.push(`/detail/${row.id}`)}
  onDeleteRow={handleDelete}
/>
```

**Config structure:**

```ts
export const tableConfig: GenericTableConfig = {
  title: "Items",
  description: "Manage items",
  searchFields: ["name", "description"],
  exportFilename: "items.csv",
  enableSorting: true,
  defaultSortColumn: "name",
  defaultSortDirection: "asc",
  columns: [
    {
      id: "name",
      label: "Name",
      type: "text",
      defaultVisible: true,
      sortable: true,
      isPrimary: true,
    },
    {
      id: "amount",
      label: "Amount",
      type: "number",
      defaultVisible: true,
      sortable: true,
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    // ... more columns
  ],
  filters: [
    {
      id: "status-filter",
      label: "Status",
      field: "status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ],
};
```
## Accessibility Standards

### Form Accessibility

**All form inputs must have labels:**

```tsx
// ✅ Good - label associated
<div>
  <Label htmlFor="email">Email Address</Label>
  <Input id="email" type="email" />
</div>

// ✅ Good - using field components
<TextField label="Email Address" {...props} />

// ❌ Bad - no label
<Input type="email" placeholder="Email" />
```
**Error messages must be announced:**

```tsx
{error && (
  <p
    className="text-sm text-destructive"
    role="alert"
    aria-live="polite"
  >
    {error}
  </p>
)}
```
**Required fields must be indicated:**

```tsx
<Label htmlFor="name">
  Name <span className="text-destructive">*</span>
</Label>
<Input id="name" required aria-required="true" />
```

### Interactive Element Accessibility

**Buttons must have accessible labels:**

```tsx
// ✅ Good - text label
<Button>Save Changes</Button>

// ✅ Good - icon with aria-label
<Button variant="ghost" aria-label="Delete item">
  <Trash className="h-4 w-4" />
</Button>

// ❌ Bad - icon without label
<Button>
  <Trash className="h-4 w-4" />
</Button>
```
**Links must have descriptive text:**

```tsx
// ✅ Good
<Link href="/contracts/123">View Contract #123</Link>

// ❌ Bad
<Link href="/contracts/123">Click here</Link>
```
### Keyboard Navigation

**All interactive elements must be keyboard accessible:**

- Buttons: Enter/Space to activate
- Links: Enter to follow
- Dropdowns: Arrow keys to navigate, Enter to select
- Modals: Escape to close, Tab to cycle focus

**Focus indicators must be visible:**

```css
/* Ensure focus ring is visible */
.focus-visible:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```
### Color Contrast

**Minimum contrast ratios (WCAG AA):**

- Normal text (< 18px): 4.5:1
- Large text (≥ 18px): 3:1
- UI components: 3:1

**Test all text/background combinations:**

```tsx
// ✅ Good - sufficient contrast
<p className="text-foreground">Normal text</p>
<p className="text-muted-foreground">Muted text (check contrast)</p>

// ⚠️ Check - verify contrast ratio
<p className="text-gray-400">Very light text</p>
```

## Performance Standards

### Component Memoization

**Memoize expensive components:**

```tsx
const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Expensive rendering logic
  return <div>{/* ... */}</div>;
});
```
**Memoize expensive calculations:**

```tsx
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.amount, 0);
}, [items]);
```
**Memoize event handlers:**

```tsx
const handleSubmit = useCallback(() => {
  // Handler logic
}, [dependencies]);
```
### Data Fetching

**Use caching with React Query:**

```tsx
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['contracts', projectId],
  queryFn: () => fetchContracts(projectId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Parallel data fetching:**

```tsx
useEffect(() => {
  const fetchData = async () => {
    const [contracts, lineItems, changeOrders] = await Promise.all([
      fetchContracts(projectId),
      fetchLineItems(contractId),
      fetchChangeOrders(contractId),
    ]);
    // Process results
  };
  fetchData();
}, [projectId, contractId]);
```
## Testing Standards

### Visual Regression Tests

**Capture screenshots at standard breakpoints:**

```ts
test.describe('Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`matches snapshot at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/contracts');
      await expect(page).toHaveScreenshot(`contracts-${viewport.name}.png`);
    });
  }
});
```
### Accessibility Tests

**Run axe-core automated tests:**

```ts
import { injectAxe, checkA11y } from 'axe-playwright';

test('page is accessible', async ({ page }) => {
  await page.goto('/contracts');
  await injectAxe(page);
  await checkA11y(page);
});
```
### Component Tests

**Test all interactive states:**

```ts
test.describe('Button states', () => {
  test('renders default state', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('shows loading state when submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saving...' })).toBeVisible();
  });

  test('disables when submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});
```

## Migration Checklist

### When Updating Existing Pages

- [ ] Replace hardcoded spacing with CSS variables
- [ ] Use standard layout components (PageContainer, FormContainer, etc.)
- [ ] Replace custom section headers with SectionHeader component
- [ ] Update button sizes to match standards (sm for headers, default for forms)
- [ ] Ensure all icons are from Lucide React (not emojis)
- [ ] Replace custom empty states with EmptyState component
- [ ] Use Currency component for all monetary values
- [ ] Use DateDisplay component for all dates
- [ ] Use StatusBadge for status indicators
- [ ] Add proper aria-labels to icon-only buttons
- [ ] Ensure error messages have role="alert"
- [ ] Test keyboard navigation
- [ ] Run accessibility audit
- [ ] Capture visual regression tests

### When Creating New Pages

- [ ] Choose correct layout pattern (list/form/detail)
- [ ] Use CSS variables for all spacing
- [ ] Use standard typography components
- [ ] Follow button size/variant guidelines
- [ ] Use standard data display components
- [ ] Implement proper loading/empty/error states
- [ ] Add accessibility attributes
- [ ] Write visual regression tests
- [ ] Write accessibility tests
- [ ] Document any new patterns

---

**Questions or Clarifications?**

For questions about these standards or to propose new patterns, please consult with the design system team or create a discussion in the project repository.
