# Spacing System - Quick Reference

## TL;DR
**Don't use hardcoded spacing in pages. Use layout components + CSS variables.**

---

## Choose Your Layout

```tsx
import { TableLayout, DashboardLayout, FormLayout } from '@/components/layouts';

// Data-heavy pages (tables, lists, grids)
<TableLayout density="standard">
  {children}
</TableLayout>

// Executive views (dashboards, widgets, KPIs)
<DashboardLayout>
  {children}
</DashboardLayout>

// Forms, settings, wizards
<FormLayout>
  {children}
</FormLayout>
```

---

## Available CSS Variables

### Spacing
```css
--page-padding     /* Container padding */
--section-gap      /* Major sections */
--card-padding     /* Cards/widgets */
--group-gap        /* Related items */
--field-gap        /* Form fields */
```

### Table Density
```css
--row-height       /* Table row height */
--cell-padding     /* Cell horizontal padding */
--cell-padding-y   /* Cell vertical padding */
```

---

## Usage Examples

### Sections
```tsx
<div className="space-y-[var(--section-gap)]">
  <Section1 />
  <Section2 />
</div>
```

### Cards
```tsx
<div className="p-[var(--card-padding)] rounded-lg">
  Card content
</div>
```

### Groups
```tsx
<div className="flex gap-[var(--group-gap)]">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>
```

### Grids
```tsx
<div className="grid grid-cols-4 gap-[var(--group-gap)]">
  <StatCard />
</div>
```

---

## Table Density

```tsx
const config: GenericTableConfig = {
  // ... columns, etc
  density: 'standard',  // or 'compact' | 'comfortable'
}
```

- **standard** (default): Balanced
- **compact**: More rows visible
- **comfortable**: More breathing room

---

## Spacing Values by Profile

| Profile   | Page | Section | Card | Group | Field |
|-----------|------|---------|------|-------|-------|
| Dashboard | 24px | 24px    | 16px | 16px  | 12px  |
| Table     | 16px | 16px    | 12px | 12px  | 8px   |
| Form      | 24px | 24px    | 20px | 16px  | 8px   |
| Docs      | 48px | 32px    | 24px | 20px  | 12px  |

---

## Migration Pattern

### Before
```tsx
<PageContainer>
  <div className="space-y-6">
    <div className="p-8">
      Content
    </div>
  </div>
</PageContainer>
```

### After
```tsx
<TableLayout>
  <div className="space-y-[var(--section-gap)]">
    <div className="p-[var(--card-padding)]">
      Content
    </div>
  </div>
</TableLayout>
```

---

## Don't

❌ Hardcoded values
```tsx
<div className="p-6">...</div>
<div className="mt-8">...</div>
<div className="space-y-4">...</div>
```

❌ Random spacing
```tsx
<div className="p-7">...</div>  // Why 7?
```

❌ Deciding spacing in pages
```tsx
// Pages shouldn't know about spacing
```

---

## Do

✅ Use CSS variables
```tsx
<div className="p-[var(--card-padding)]">...</div>
```

✅ Use layout components
```tsx
<TableLayout>
  {children}
</TableLayout>
```

✅ Let the system decide
```tsx
// System knows the right spacing
```

---

## Need Help?

1. Read: [SPACING-SYSTEM-IMPLEMENTATION.md](./SPACING-SYSTEM-IMPLEMENTATION.md)
2. Check: [spacing.ts](../frontend/src/design-system/spacing.ts)
3. Example: [directory/companies/page.tsx](../frontend/src/app/directory/companies/page.tsx)
