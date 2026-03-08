# Alleato-Procore Design System Rules

> **Purpose**: This document defines the canonical design rules that all UI code must follow.
> Violations of these rules should be flagged and corrected.

---

## 1. Color Rules

### 1.1 Brand Colors

- **Primary Brand**: Use `brand` / `hsl(var(--brand))` / `#DB802D`
- **Brand Hover**: Use `brand-hover` / `hsl(var(--brand-hover))`
- **Brand Light**: Use `brand-light` / `hsl(var(--brand-light))`

**Violations**:

- Using raw hex colors instead of CSS variables (e.g., `#DB802D` instead of `text-brand`)
- Using Tailwind default orange/amber instead of brand colors
- Hardcoded colors that should use semantic tokens

### 1.2 Semantic Status Colors

| Status | Tailwind Class | CSS Variable |
|--------|---------------|--------------|
| Success | `text-status-success`, `bg-green-100` | `--status-success` |
| Warning | `text-status-warning`, `bg-yellow-100` | `--status-warning` |
| Error | `text-status-error`, `bg-red-100` | `--status-error` |
| Info | `text-status-info`, `bg-blue-100` | `--status-info` |

**Violations**:

- Using `text-green-500` instead of `text-status-success`
- Using `text-red-600` instead of `text-destructive` or `text-status-error`
- Inconsistent status color usage across components

### 1.3 Text Colors

| Purpose | Correct Class | Incorrect Examples |
|---------|--------------|-------------------|
| Primary text | `text-foreground`, `text-gray-800` | `text-black`, `text-gray-900` |
| Secondary text | `text-muted-foreground`, `text-gray-600` | `text-gray-500` (inconsistent) |
| Tertiary text | `text-gray-500`, `text-neutral-400` | Mixing neutral/gray scales |
| Disabled text | `text-gray-300`, `text-neutral-300` | `text-gray-400` |

### 1.4 Background Colors

| Purpose | Correct Class |
|---------|--------------|
| Page background | `bg-background` |
| Card background | `bg-card`, `bg-white` |
| Secondary surface | `bg-secondary`, `bg-neutral-50` |
| Elevated surface | `bg-surface-elevated` |

---

## 2. Typography Rules

### 2.1 Font Family

- **Sans**: Use `font-sans` (Inter)
- **Mono**: Use `font-mono` (system monospace)

**Violations**:

- Inline font-family declarations
- Using other font families without justification

### 2.2 Font Sizes (Tailwind Scale)

| Size | Class | Pixels | Use Case |
|------|-------|--------|----------|
| xs | `text-xs` | 12px | Labels, metadata |
| sm | `text-sm` | 14px | Body text, table cells |
| base | `text-base` | 16px | Standard body |
| lg | `text-lg` | 18px | Subheadings |
| xl | `text-xl` | 20px | Section titles |
| 2xl | `text-2xl` | 24px | Page titles (mobile) |
| 3xl | `text-3xl` | 30px | Page titles (tablet) |
| 4xl+ | `text-4xl` | 36px+ | Hero text |

**Violations**:

- Using pixel values directly: `style={{ fontSize: '14px' }}`
- Skipping the scale: Using `text-[15px]` arbitrary values
- Inconsistent heading sizes across pages

### 2.3 Font Weights

| Weight | Class | Use Case |
|--------|-------|----------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Buttons, links |
| 600 | `font-semibold` | Headings, labels |
| 700 | `font-bold` | Emphasis |

**Violations**:

- Using `font-black` (900) - not in design system
- Inconsistent weight usage for similar elements

### 2.4 Typography Components (Use These!)

```text
.text-page-title      - Page headings
.text-section-title   - Section headings
.text-card-title      - Card headings
.text-label-uppercase - Eyebrow/category labels
.text-body            - Body paragraphs
.text-body-sm         - Smaller body text
.text-metric-lg/md/sm - Numeric displays
```html
---

## 3. Spacing Rules

### 3.1 Spacing Scale (8px Grid)

| Token | Value | Tailwind |
|-------|-------|----------|
| xs | 4px | `p-1`, `m-1`, `gap-1` |
| sm | 8px | `p-2`, `m-2`, `gap-2` |
| md | 16px | `p-4`, `m-4`, `gap-4` |
| lg | 24px | `p-6`, `m-6`, `gap-6` |
| xl | 32px | `p-8`, `m-8`, `gap-8` |
| 2xl | 48px | `p-12`, `m-12`, `gap-12` |

**Violations**:

- Non-standard spacing: `p-[10px]`, `gap-[15px]`
- Using `p-7` or `p-9` (not on 8px grid)
- Mixing `px` and `rem` units inline

### 3.2 Component Spacing Standards

| Component | Internal Padding | Gap Between Elements |
|-----------|-----------------|---------------------|
| Card | `p-6` (desktop), `p-4` (mobile) | `gap-4` |
| Modal | `p-6` | `gap-4` or `space-y-4` |
| Form fields | - | `gap-4` or `space-y-4` |
| Button groups | - | `gap-2` or `gap-3` |
| Table cells | `px-4 py-3` or `px-6 py-4` | - |

---

## 4. Border Radius Rules

### 4.1 Standard Radii

| Size | CSS Variable | Tailwind | Use Case |
|------|-------------|----------|----------|
| sm | `--radius-sm` (6px) | `rounded-sm` | Small elements, badges |
| md | `--radius-md` (8px) | `rounded-md` | Buttons, inputs |
| lg | `--radius-lg` (12px) | `rounded-lg` | Cards, modals |
| xl | `--radius-xl` (16px) | `rounded-xl` | Large cards |
| full | - | `rounded-full` | Avatars, pills |

**Violations**:

- Arbitrary values: `rounded-[10px]`
- Inconsistent radii on similar components
- Using `rounded` (4px) when `rounded-md` is standard

---

## 5. Shadow Rules

### 5.1 Shadow Scale

| Level | Tailwind | Use Case |
|-------|----------|----------|
| sm | `shadow-sm` | Subtle elevation |
| DEFAULT | `shadow` | Cards at rest |
| md | `shadow-md` | Hover states |
| lg | `shadow-lg` | Modals, dropdowns |
| xl | `shadow-xl` | Popovers |

**Violations**:

- Custom shadow values inline
- Using shadows inconsistently for same elevation level

---

## 6. Component Usage Rules

### 6.1 Buttons

**Correct Usage**:

```tsx
// ShadCN Button component
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>

// CSS classes (for non-component contexts)
.btn-primary
.btn-secondary
.btn-ghost
```typescript
**Violations**:
- Creating custom button styles instead of using variants
- Inconsistent button sizing across pages
- Missing hover/active states

### 6.2 Cards
**Correct Usage**:
```tsx
// ShadCN Card
<Card><CardHeader>...</CardHeader><CardContent>...</CardContent></Card>

// CSS classes
.card-base
.card-padded
.card-interactive
```

**Violations**:

- Raw `<div>` with ad-hoc card styling
- Inconsistent card padding
- Missing hover states on interactive cards

### 6.3 Form Inputs

**Correct Usage**:

```tsx
// ShadCN Input
<Input placeholder="..." />

// With label
<div className="field-group">
  <Label>...</Label>
  <Input />
</div>
```typescript
**Violations**:
- Raw `<input>` without proper styling
- Missing focus states
- Inconsistent input heights

### 6.4 Badges/Status Indicators
**Correct Usage**:
```tsx
<Badge variant="default">...</Badge>
<Badge variant="secondary">...</Badge>
<Badge variant="destructive">...</Badge>

// CSS classes
.badge-success
.badge-warning
.badge-error
.badge-info
.badge-neutral
```html
---

## 7. Layout Rules

### 7.1 Page Container

```tsx
// Correct
<div className="page-container">...</div>

// Or
<div className="min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[1800px] mx-auto">
```html
### 7.2 Responsive Breakpoints
| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

**Violations**:
- Non-standard breakpoints: `@media (min-width: 800px)`
- Missing mobile-first responsive styles

### 7.3 Grid Patterns
```tsx
// Two-column content grid
<div className="content-grid">...</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 8. Dark Mode Rules

### 8.1 Color Handling

- All colors must support dark mode via CSS variables
- Use `dark:` prefix for dark mode overrides
- Never use raw color values that don't adapt

**Violations**:

- Hardcoded `bg-white` without `dark:bg-gray-900`
- Using colors that don't have dark mode equivalents

---

## 9. Accessibility Rules

### 9.1 Color Contrast

- Text must have 4.5:1 contrast ratio (AA)
- Large text (18px+) must have 3:1 ratio
- Interactive elements must have 3:1 ratio

### 9.2 Touch Targets

- Minimum 44x44px for mobile touch targets
- Use `.touch-target` utility class

### 9.3 Focus States

- All interactive elements must have visible focus states
- Use `focus:ring-2 focus:ring-ring focus:ring-offset-2`

---

## 10. Naming Conventions

### 10.1 CSS Class Naming

- Use lowercase with hyphens: `card-header`, not `cardHeader`
- Prefix with component: `btn-primary`, `card-padded`
- Use semantic names: `text-muted-foreground`, not `text-gray-500`

### 10.2 Component File Naming

- PascalCase for components: `Button.tsx`, `CardHeader.tsx`
- kebab-case for utilities: `use-toast.ts`

---

## Quick Reference: Common Violations

| What You See | What It Should Be |
|-------------|-------------------|
| `text-gray-900` | `text-foreground` or `text-gray-800` |
| `text-gray-400` | `text-muted-foreground` or `text-gray-500` |
| `bg-orange-500` | `bg-brand` |
| `border-gray-300` | `border-border` or `border-neutral-200` |
| `rounded-[8px]` | `rounded-md` or `rounded-lg` |
| `p-[10px]` | `p-2.5` (nearest on scale) |
| `text-[14px]` | `text-sm` |
| `gap-[15px]` | `gap-4` |
| Raw `<button>` | `<Button>` component |
| Raw `<input>` | `<Input>` component |
