# DESIGN SYSTEM RULES (NON-NEGOTIABLE)

## PURPOSE

This document defines the **mandatory** design system rules for Alleato-Procore.
All UI code **MUST** follow these rules. No exceptions.

---

## CORE PRINCIPLES

1. **Component-First**: Pages compose components. Components own styling.
2. **Single Source of Truth**: One place for colors, spacing, typography, interactions.
3. **No Raw Styling in Pages**: Pages only use layout components and composition.
4. **Consistency Over Speed**: Better to wait and do it right than ship inconsistent UI.

---

## STYLING STACK

### ✅ Allowed

- **Tailwind CSS** for all styling
- **CSS Variables** for design tokens
- **Component classes** via `cn()` utility
- **Global CSS** for resets, animations, 3rd-party overrides only

### ❌ Forbidden

- Raw CSS files for layout or spacing
- Inline Tailwind in pages (except container/spacing wrappers)
- Direct style props (use Tailwind classes)
- One-off styled divs that should be components

---

## DESIGN TOKENS

All design tokens **MUST** be defined as CSS variables in `globals.css`.

### Required Token Categories

```css
:root {
  /* Colors */
  --color-bg: 0 0% 100%;
  --color-fg: 222 47% 11%;
  --color-primary: 262 83% 58%;
  --color-secondary: 220 70% 50%;
  --color-accent: 340 82% 52%;
  --color-destructive: 0 84% 60%;
  --color-muted: 220 14% 96%;
  --color-border: 220 13% 91%;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Typography */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

Map tokens to Tailwind in `tailwind.config.ts`.

---

## REQUIRED CORE COMPONENTS

These components **MUST** exist before building features.

### Layout Primitives (Priority 1)

- [ ] `Container` - page width constraint
- [ ] `Stack` - vertical spacing
- [ ] `Inline` - horizontal spacing
- [ ] `Grid` - grid layouts
- [ ] `Spacer` - explicit spacing

### Typography (Priority 1)

- [ ] `Heading` - h1-h6 with consistent sizing
- [ ] `Text` - body text with tone variants
- [ ] `Label` - form labels
- [ ] `Code` - inline/block code

### Buttons (Priority 1)

- [x] `Button` - with variants (primary, secondary, ghost, destructive)
  - Must have: variants, sizes, loading state, icon support

### Forms (Priority 2)

- [x] `Input`
- [x] `Textarea`
- [x] `Select`
- [x] `Checkbox`
- [x] `Switch`
- [ ] `FormField` - wrapper with label, error, hint

### Surfaces (Priority 2)

- [x] `Card`
- [x] `Modal/Dialog`
- [ ] `Drawer`
- [x] `Panel`

### Feedback (Priority 2)

- [x] `Alert`
- [x] `Toast`
- [x] `Badge`
- [x] `Tooltip`
- [x] `Skeleton`
- [ ] `EmptyState`

### Navigation (Priority 3)

- [ ] `Tabs` (currently exists but needs audit)
- [ ] `Breadcrumbs`
- [ ] `Pagination`
- [ ] `NavMenu`

---

## COMPONENT RULES

### 1. No Page-Level Styling

**❌ WRONG:**
```tsx
export default function DirectoryPage() {
  return (
    <div className="rounded-xl border bg-white p-6 shadow">
      <h1 className="text-2xl font-bold mb-4">Directory</h1>
      <p className="text-gray-600">Manage your team</p>
    </div>
  );
}
```

**✅ RIGHT:**
```tsx
export default function DirectoryPage() {
  return (
    <Card>
      <Stack gap="md">
        <Heading level={1}>Directory</Heading>
        <Text tone="muted">Manage your team</Text>
      </Stack>
    </Card>
  );
}
```

### 2. Component Variants, Not Conditionals

**❌ WRONG:**
```tsx
<button className={isPrimary ? "bg-blue-600" : "bg-gray-200"}>
```

**✅ RIGHT:**
```tsx
<Button variant={isPrimary ? "primary" : "secondary"}>
```

### 3. Consistent Spacing

Use Stack/Inline, not manual margins.

**❌ WRONG:**
```tsx
<div className="mb-4">
  <h2 className="mt-6 mb-2">Title</h2>
  <p className="mb-4">Text</p>
</div>
```

**✅ RIGHT:**
```tsx
<Stack gap="lg">
  <Heading level={2}>Title</Heading>
  <Text>Text</Text>
</Stack>
```

---

## IMPLEMENTATION STRATEGY

### Phase 1: Foundation (IMMEDIATE)

1. Audit existing `components/ui/` against required list
2. Create missing primitives (Stack, Inline, Container)
3. Define complete token system in `globals.css`
4. Update `tailwind.config.ts` to use tokens

### Phase 2: Component Audit (NEXT)

1. Review every existing component for token usage
2. Ensure all components use design tokens, not hardcoded values
3. Document component APIs

### Phase 3: Page Refactor (ONGOING)

1. Refactor pages to use components only
2. Remove all inline Tailwind from pages
3. Ensure consistent spacing via Stack/Inline

### Phase 4: Polish (CONTINUOUS)

1. Dark mode support
2. Animation system
3. Responsive utilities
4. Accessibility audit

---

## ENFORCEMENT

### Pre-Commit Checks

- ESLint rules to prevent:
  - `className` in page files (except layout wrappers)
  - Hardcoded colors/spacing
  - Direct DOM elements where components exist

### Code Review Checklist

- [ ] Uses components, not raw HTML
- [ ] Uses tokens, not hardcoded values
- [ ] Follows spacing system (Stack/Inline)
- [ ] Typography uses Heading/Text
- [ ] Buttons use Button component

### Automatic Rejection Criteria

Pull requests will be **automatically rejected** if:
- Raw Tailwind styling in page files
- New components created without using tokens
- Hardcoded colors/spacing instead of tokens
- Inline styles used

---

## CURRENT STATE ASSESSMENT

**Status: FOUNDATION MISSING**

The app currently violates these rules extensively:
- Pages contain raw Tailwind styling
- Inconsistent spacing (manual margins everywhere)
- No Stack/Inline components
- Incomplete token system
- Components don't consistently use tokens

**Action Required: STOP FEATURE WORK**

Until foundation components exist, all new features will inherit the broken system.

Priority:
1. Create missing layout primitives (Stack, Inline, Container)
2. Complete token system
3. Refactor directory page as exemplar
4. Use directory as template for other pages

---

## TECH STACK

- **Tailwind CSS** - styling foundation
- **shadcn/ui** - component starter (we own the code)
- **Radix UI** - headless primitives (accessibility)
- **next-themes** - dark mode
- **tailwind-merge** + **clsx** - className utilities

---

## REFERENCES

- Design Tokens: `/app/globals.css`
- Tailwind Config: `/tailwind.config.ts`
- UI Components: `/components/ui/`
- Layout Components: `/components/layout/`

---

## VIOLATION LOGGING

All violations of this document must be logged in:

```
DESIGN-SYSTEM-VIOLATIONS.md
```

No exceptions.
