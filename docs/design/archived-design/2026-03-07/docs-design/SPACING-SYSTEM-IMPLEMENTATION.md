# Spacing System Implementation - Complete

## Overview

Successfully implemented a **scalable, systematic spacing architecture** based on design tokens and CSS variables. This system eliminates spacing chaos by encoding spacing intent at the system level.

## Implementation Date

January 8, 2026

## Mental Model

```bash
Page → Layout → Density → Tokens → Components
```
**Key Principle**: Pages never decide spacing directly. They choose a layout variant, and spacing is resolved automatically by the system.

---

## What Was Built

### 1. Design Token System

**File**: `frontend/src/design-system/spacing.ts`

#### Spacing Profiles (4 types)

- **dashboard**: Executive views, widgets, KPIs (spacious - 24px page padding)
- **table**: Data-heavy lists, logs, grids (compact - 16px page padding)
- **form**: Inputs, wizards, settings (balanced - 24px page padding)
- **docs**: Long-form reading, documentation (generous - 48px page padding)

Each profile defines:

- `page`: Page container padding
- `section`: Gap between major sections
- `card`: Card/widget internal padding
- `group`: Related item groups
- `field`: Individual form fields

#### Density Profiles (3 types)

For tables specifically:

- **standard**: Balanced (53px rows, 12px cell padding) - DEFAULT
- **compact**: More rows visible (40px rows, 8px cell padding)
- **comfortable**: More breathing room (64px rows, 16px cell padding)

#### Vertical Rhythm

Form-specific and content-specific vertical spacing for clear hierarchy.

---

### 2. Layout Components

**Location**: `frontend/src/components/layouts/`

Created 4 layout wrappers:

#### `<AppLayout>` - Base Layout

```tsx
<AppLayout variant="table" density="standard" maxWidth="full">
  <YourContent />
</AppLayout>
```
#### `<TableLayout>` - For Data Pages

```tsx
<TableLayout density="standard">
  <ProjectsTable />
</TableLayout>
```

#### `<DashboardLayout>` - For Executive Views

```tsx
<DashboardLayout>
  <KPIWidgets />
</DashboardLayout>
```
#### `<FormLayout>` - For Forms/Settings

```tsx
<FormLayout>
  <UserSettingsForm />
</FormLayout>
```
**What they do**:

- Apply `data-layout` and `data-density` attributes
- Inject CSS variables via inline styles
- Set max-width constraints
- Provide automatic section spacing

---

### 3. CSS Variable System

**File**: `frontend/src/styles/table-density.css`

Automatically imported in root layout. Applies density-aware spacing to table cells:

```css
[data-density="standard"] td {
  padding: var(--cell-padding, 12px);
  height: var(--row-height, 53px);
}
```
**Available CSS Variables**:

- `--page-padding`: Page container padding
- `--section-gap`: Gap between sections
- `--card-padding`: Card internal padding
- `--group-gap`: Related item group gap
- `--field-gap`: Individual field gap
- `--row-height`: Table row height
- `--cell-padding`: Table cell horizontal padding
- `--cell-padding-y`: Table cell vertical padding

---

### 4. Table Density Integration

**File**: `frontend/src/components/tables/generic-table-factory.tsx`

Added `density` prop to `GenericTableConfig`:

```tsx
const tableConfig: GenericTableConfig = {
  // ... other config
  density: 'standard', // or 'compact' or 'comfortable'
}
```

**Features**:

- Defaults to 'standard' (backward compatible)
- Can be overridden per table page
- Automatically adjusts row height for virtual scrolling
- Injects density CSS variables
- Applies `data-density` attribute for CSS targeting

---

### 5. Migration Examples

#### Before (Companies Page)

```tsx
<PageContainer>
  <div className="space-y-6">
    <div className="p-8">...</div>
  </div>
</PageContainer>
```
#### After (Companies Page)

```tsx
<TableLayout>
  <div className="space-y-[var(--section-gap)]">
    <div className="p-[var(--card-padding)]">...</div>
  </div>
</TableLayout>
```
**What changed**:

- Replaced `PageContainer` with `TableLayout`
- Replaced hardcoded spacing (`space-y-6`, `p-8`) with CSS variables
- Added title/description directly in layout
- System now controls all spacing

---

## Files Modified

### Created

- `frontend/src/design-system/spacing.ts`
- `frontend/src/components/layouts/AppLayout.tsx`
- `frontend/src/components/layouts/TableLayout.tsx`
- `frontend/src/components/layouts/DashboardLayout.tsx`
- `frontend/src/components/layouts/FormLayout.tsx`
- `frontend/src/components/layouts/index.ts`
- `frontend/src/styles/table-density.css`
- `documentation/SPACING-SYSTEM-IMPLEMENTATION.md`

### Modified

- `frontend/src/app/layout.tsx` - Added table-density.css import
- `frontend/src/components/tables/generic-table-factory.tsx` - Added density prop
- `frontend/src/app/directory/companies/page.tsx` - Migrated to TableLayout
- `frontend/src/app/directory/users/page.tsx` - Migrated to TableLayout

---

## Usage Guidelines

### For Table Pages

```tsx
import { TableLayout } from '@/components/layouts';

export default function MyTablePage() {
  const tableConfig: GenericTableConfig = {
    columns: [...],
    searchFields: [...],
    density: 'standard', // Optional: override default
  };

  return (
    <TableLayout density="standard">
      <h1 className="text-3xl mb-6">My Table</h1>
      <div className="space-y-[var(--section-gap)]">
        <GenericDataTable data={data} config={tableConfig} />
      </div>
    </TableLayout>
  );
}
```
### For Dashboard Pages

```tsx
import { DashboardLayout } from '@/components/layouts';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-4 gap-[var(--group-gap)]">
        <StatCard />
        <StatCard />
      </div>
    </DashboardLayout>
  );
}
```

### For Form Pages

```tsx
import { FormLayout } from '@/components/layouts';

export default function SettingsForm() {
  return (
    <FormLayout>
      <div className="space-y-[var(--section-gap)]">
        <FormSection />
        <FormSection />
      </div>
    </FormLayout>
  );
}
```
### Component-Level Spacing

**DO**:

```tsx
<div className="p-[var(--card-padding)]">...</div>
<div className="space-y-[var(--section-gap)]">...</div>
<div className="gap-[var(--group-gap)]">...</div>
```
**DON'T**:

```tsx
<div className="p-6">...</div>  ❌ Hardcoded
<div className="space-y-4">...</div>  ❌ Hardcoded
<div className="mt-8">...</div>  ❌ Hardcoded
```

---

## Enforcement Strategy

### Linting (Future)

Ban raw spacing utilities in page files:

- Disallow: `p-6`, `mt-8`, `space-y-10`
- Allow: `p-[var(--card-padding)]`, `space-y-[var(--section-gap)]`

### Code Review Checklist

- [ ] Page uses appropriate layout component (Table/Dashboard/Form)
- [ ] No hardcoded spacing values in page files
- [ ] Components consume semantic tokens via CSS variables
- [ ] Table has explicit density setting (or uses default)

---

## Benefits

### 1. Consistency at Scale

- Spacing is encoded in the system, not remembered per-page
- One change to a token updates all pages using that profile
- No more "is this 16px or 20px?" debates

### 2. Zero Drift

- Pages cannot accidentally introduce custom spacing
- Design system is enforced at compile time (with proper linting)
- Spacing intent is explicit: `--section-gap` vs `--field-gap`

### 3. Easy Overrides

- Individual tables can override density: `density="compact"`
- Layouts can specify max-width: `maxWidth="narrow"`
- System remains flexible while maintaining consistency

### 4. Developer Experience

- Clear mental model: Page → Layout → Density → Tokens
- Autocomplete for CSS variables in editors
- Self-documenting code: `--card-padding` vs `p-6`

### 5. Future-Proof

- Theme switching: just update token values
- Responsive spacing: CSS variables can use media queries
- A11y: can increase spacing for accessibility mode

---

## Next Steps (Optional)

### Immediate Wins

1. **Migrate more pages** - Start with high-traffic pages
2. **Add density toggle** - Let users choose compact/standard/comfortable
3. **Document patterns** - Add to style guide

### Medium Term

1. **Extend to other page types** - Marketing pages, docs pages
2. **Add animation tokens** - Duration, easing for consistent motion
3. **Create Storybook** - Visualize all layout variants

### Long Term

1. **Theme system** - Light/dark mode with spacing adjustments
2. **Responsive tokens** - Different spacing on mobile vs desktop
3. **Design tokens CLI** - Generate tokens from Figma/design tools

---

## Technical Notes

### Performance

- CSS variables have zero runtime cost
- Inline styles are minimal (only for variable injection)
- No JavaScript calculation of spacing

### Browser Support

- CSS variables supported in all modern browsers
- Fallback values provided: `var(--card-padding, 12px)`

### TypeScript Safety

- All layout props are strongly typed
- Invalid density values caught at compile time
- Autocomplete for layout variants

### Testing

- No visual regressions detected
- Quality checks pass (existing TS errors unrelated)
- Lint warnings are non-blocking (style prop usage is intentional)

---

## Lessons Learned

1. **Pages choosing spacing = chaos** - System-level resolution is the only scalable approach
2. **CSS variables are underrated** - They solve this problem elegantly
3. **Layout components are power tools** - Wrap once, apply everywhere
4. **Semantic naming matters** - `--section-gap` is clearer than `--spacing-lg`
5. **Gradual migration works** - Started with 2 pages, system is extensible

---

## Success Criteria ✅

All completed:

- [x] Design token system with 4 spacing profiles
- [x] Layout wrapper components (Table, Dashboard, Form)
- [x] Density prop on generic-table-factory
- [x] CSS variable injection system
- [x] Migration of 2 example pages
- [x] Quality checks pass (no new errors)
- [x] Documentation created

---

## References

**Key Files**:

- Token definitions: [spacing.ts](../frontend/src/design-system/spacing.ts)
- Layout components: [components/layouts/](../frontend/src/components/layouts/)
- CSS variables: [table-density.css](../frontend/src/styles/table-density.css)
- Example migration: [directory/companies/page.tsx](../frontend/src/app/directory/companies/page.tsx)

**Implementation Philosophy**:
Based on best practices from high-scale design systems (Shopify Polaris, GitHub Primer, Atlassian Design System).
