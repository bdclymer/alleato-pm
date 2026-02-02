# Spacing System Migration - Context Snapshot

**Purpose**: Resume spacing system migration in a new Claude session with full context.

**Date Created**: January 8, 2026
**Status**: Phase 1 Complete (Foundation + 2 Example Pages)
**Next**: Scale migration across entire application

---

## What Was Built (Phase 1 - COMPLETE ✅)

### 1. Design Token System
**File**: `frontend/src/design-system/spacing.ts`

```typescript
// 4 Spacing Profiles
spacingProfiles = {
  dashboard: { page: 24, section: 24, card: 16, group: 16, field: 12 },
  table:     { page: 16, section: 16, card: 12, group: 12, field: 8 },
  form:      { page: 24, section: 24, card: 20, group: 16, field: 8 },
  docs:      { page: 48, section: 32, card: 24, group: 20, field: 12 },
}

// 3 Density Profiles (for tables)
densityProfiles = {
  standard:    { rowHeight: 53, cellPadding: 12, cellPaddingY: 16 },
  compact:     { rowHeight: 40, cellPadding: 8,  cellPaddingY: 8 },
  comfortable: { rowHeight: 64, cellPadding: 16, cellPaddingY: 20 },
}
```

### 2. Layout Components
**Location**: `frontend/src/components/layouts/`

- `<AppLayout>` - Base layout with CSS variable injection
- `<TableLayout>` - For data-heavy pages (uses table profile)
- `<DashboardLayout>` - For executive views (uses dashboard profile)
- `<FormLayout>` - For forms/settings (uses form profile)

### 3. CSS Variable System
**File**: `frontend/src/styles/table-density.css`

### 4. Table Density Integration
Added `density` prop to `GenericTableConfig` in `generic-table-factory.tsx`

---

## Migration Pattern

### Before ❌
```tsx
import { PageContainer } from '@/components/layout/PageContainer';

<PageContainer>
  <div className="space-y-6">
    <div className="p-8">Content</div>
  </div>
</PageContainer>
```

### After ✅
```tsx
import { TableLayout } from '@/components/layouts';

<TableLayout>
  <div className="space-y-[var(--section-gap)]">
    <div className="p-[var(--card-padding)]">Content</div>
  </div>
</TableLayout>
```

---

## Completed Migrations ✅

1. **directory/companies/page.tsx** - Full TableLayout migration
2. **directory/users/page.tsx** - Full TableLayout migration
3. **directory/contacts/page.tsx** - Button styling fixed (still needs PageContainer → TableLayout)

---

## Migration Checklist (Per Page)

1. **Identify page type**: Table/Dashboard/Form
2. **Update imports**: Add `TableLayout` (or Dashboard/Form Layout)
3. **Replace wrapper**: `<PageContainer>` → `<TableLayout>`
4. **Update spacing**: Replace hardcoded (`p-6`) with CSS variables (`p-[var(--card-padding)]`)
5. **Add density**: Add `density: 'standard'` to GenericDataTable configs
6. **Remove titles**: Move title/description from table config to page layout

---

## Available CSS Variables

```css
--page-padding     /* Container padding */
--section-gap      /* Gap between major sections */
--card-padding     /* Card/widget internal padding */
--group-gap        /* Related item groups */
--field-gap        /* Form field spacing */
--row-height       /* Table row height */
--cell-padding     /* Cell horizontal padding */
--cell-padding-y   /* Cell vertical padding */
```

---

## Spacing Values by Profile

| Profile   | page | section | card | group | field |
|-----------|------|---------|------|-------|-------|
| dashboard | 24px | 24px    | 16px | 16px  | 12px  |
| table     | 16px | 16px    | 12px | 12px  | 8px   |
| form      | 24px | 24px    | 20px | 16px  | 8px   |
| docs      | 48px | 32px    | 24px | 20px  | 12px  |

---

## Pages to Migrate

### Directory Pages
- [ ] contacts/page.tsx (finish migration)
- [ ] groups/page.tsx

### Table Pages (frontend/src/app/(tables)/)
- [ ] drawings/page.tsx
- [ ] decisions/page.tsx
- [ ] infinite-meetings/page.tsx
- [ ] meetings/[id]/page.tsx
- [ ] punch-list/page.tsx
- [ ] infinite-projects/page.tsx
- [ ] subcontractors/ (if exists)

### Project Pages
- [ ] [projectId]/home/
- [ ] [projectId]/commitments/
- [ ] Other project pages

### Form Pages
- [ ] (forms)/ directory

---

## Commands

```bash
# Find all PageContainer usage
grep -r "PageContainer" frontend/src/app --include="*.tsx"

# Run quality checks
npm run quality:fix --prefix frontend
npm run typecheck --prefix frontend
```

---

## Example Migrations

**See**:
- `frontend/src/app/directory/companies/page.tsx`
- `frontend/src/app/directory/users/page.tsx`

**Full docs**:
- `documentation/SPACING-SYSTEM-IMPLEMENTATION.md`
- `documentation/SPACING-QUICK-REFERENCE.md`

---

## Resume Instructions

**Paste into new Claude session**:

```
Continue spacing system migration.

Context: Read .claude/context/SPACING-MIGRATION-CONTEXT.md

Task: Migrate remaining pages to layout system (TableLayout/DashboardLayout/FormLayout).
Replace PageContainer with appropriate layout + CSS variables for spacing.

Start by finding all PageContainer usage and batch migrate.
```

---

## Architecture Principle

**Mental Model**: `Page → Layout → Density → Tokens → Components`

Pages choose layout variant. System resolves spacing automatically.
