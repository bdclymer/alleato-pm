# Design System Guide

> Canonical design rules for the Alleato-Procore UI. All code must follow these standards.

## Table of Contents

- [Core Principles](#core-principles)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing System](#spacing-system)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Components](#components)
- [Layout](#layout)
- [Common Patterns](#common-patterns)
- [Dark Mode](#dark-mode)
- [Accessibility](#accessibility)
- [ESLint Rules](#eslint-rules)
- [Naming Conventions](#naming-conventions)
- [Migration Checklist](#migration-checklist)

---

## Core Principles

### 1. Use Design-System Primitives, Not Raw `<div>`s

**Don't** hand-roll containers with ad-hoc borders/padding/radius:

```tsx
<div className="rounded-md border border-neutral-200 bg-white p-6">
  <h2 className="text-xl font-semibold">Title</h2>
</div>
```

**Do** pick the right primitive:

```tsx
<Card>
  <CardHeader>
    <Heading level={2}>Title</Heading>
  </CardHeader>
  <CardContent>
    <Text>Content</Text>
  </CardContent>
</Card>

// Light grouping without heavy borders
<Panel variant="plain" padding="md">
  <Stack gap="sm">
    <Heading level={3}>Section</Heading>
    <Text tone="muted">Supporting copy</Text>
  </Stack>
</Panel>

// Simple layout with no surface styling
<Stack gap="md">
  <Inline gap="sm" align="center">
    <Input />
    <Button>Save</Button>
  </Inline>
</Stack>
```

**Decision guide:**
- **Card** - Discrete blocks needing header/body/footer or defined surface
- **Panel** - Lightweight grouping without Card chrome
- **Stack/Inline/Grid** - Spacing and layout (no surface styling)

### 2. Use Semantic Tokens, Not Direct Colors

```tsx
// Bad
<p className="text-gray-600 bg-gray-100">Muted text</p>

// Good
<Text className="text-muted-foreground bg-muted">Muted text</Text>
```

### 3. Follow the 8px Grid System

```tsx
// Bad
<div className="p-[10px] mb-[15px] gap-[7px]">

// Good
<div className="p-4 mb-6 gap-2">  {/* 16px, 24px, 8px */}
```

---

## Color System

### Brand Colors

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `text-brand` | `hsl(var(--brand))` | #DB802D | Primary brand |
| `bg-brand-hover` | `hsl(var(--brand-hover))` | - | Brand hover |
| `bg-brand-light` | `hsl(var(--brand-light))` | - | Brand tint |

**Violations:**
- Using raw hex colors instead of CSS variables
- Using Tailwind default orange/amber instead of brand

### Semantic Text Colors

| Purpose | Correct Class | Avoid |
|---------|--------------|-------|
| Primary text | `text-foreground` | `text-black`, `text-gray-900` |
| Secondary text | `text-muted-foreground` | `text-gray-500` |
| Disabled text | `text-gray-300` | `text-gray-400` |

### Background Colors

| Purpose | Correct Class |
|---------|--------------|
| Page background | `bg-background` |
| Card background | `bg-card`, `bg-white` |
| Secondary surface | `bg-secondary`, `bg-neutral-50` |
| Hover states | `bg-accent` |
| Muted areas | `bg-muted` |

### Status Colors

| Status | Badge Variant | Text Class | Background |
|--------|---------------|------------|------------|
| Success | `variant="success"` | `text-status-success` | `bg-green-100` |
| Warning | `variant="warning"` | `text-status-warning` | `bg-yellow-100` |
| Error | `variant="destructive"` | `text-status-error` | `bg-red-100` |
| Info | `variant="default"` | `text-status-info` | `bg-blue-100` |

---

## Typography

### Font Family

- **Sans:** `font-sans` (Inter)
- **Mono:** `font-mono` (system monospace)

### Font Sizes

| Class | Pixels | Use Case |
|-------|--------|----------|
| `text-xs` | 12px | Labels, metadata |
| `text-sm` | 14px | Body text, table cells |
| `text-base` | 16px | Standard body |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles (mobile) |
| `text-3xl` | 30px | Page titles (tablet) |
| `text-4xl` | 36px+ | Hero text |

**Violations:**
- Using pixel values directly: `style={{ fontSize: '14px' }}`
- Arbitrary values: `text-[15px]`

### Font Weights

| Weight | Class | Use Case |
|--------|-------|----------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Buttons, links |
| 600 | `font-semibold` | Headings, labels |
| 700 | `font-bold` | Emphasis |

### Typography Components

```tsx
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

<Heading level={1}>Page Title</Heading>
<Heading level={2}>Section Title</Heading>
<Text size="lg" weight="medium">Large text</Text>
<Text tone="muted">Secondary text</Text>
```

### Typography Utility Classes

```css
.text-page-title      /* Page headings */
.text-section-title   /* Section headings */
.text-card-title      /* Card headings */
.text-label-uppercase /* Eyebrow/category labels */
.text-body            /* Body paragraphs */
.text-body-sm         /* Smaller body text */
.text-metric-lg/md/sm /* Numeric displays */
```

---

## Spacing System

### Spacing Scale (8px Grid)

| Token | Value | Tailwind |
|-------|-------|----------|
| xs | 4px | `p-1`, `gap-1` |
| sm | 8px | `p-2`, `gap-2` |
| md | 16px | `p-4`, `gap-4` |
| lg | 24px | `p-6`, `gap-6` |
| xl | 32px | `p-8`, `gap-8` |
| 2xl | 48px | `p-12`, `gap-12` |

**Violations:**
- Non-standard: `p-[10px]`, `gap-[15px]`
- Off-grid: `p-7`, `p-9`

### Component Spacing Standards

| Component | Internal Padding | Gap |
|-----------|-----------------|-----|
| Card | `p-6` (desktop), `p-4` (mobile) | `gap-4` |
| Modal | `p-6` | `gap-4` |
| Form fields | - | `gap-4` |
| Button groups | - | `gap-2` |
| Table cells | `px-4 py-3` or `px-6 py-4` | - |

### CSS Variables

```tsx
<Card className="p-[var(--card-padding)]">
<div className="mb-[var(--section-gap)]">
<div className="gap-[var(--group-gap)]">
```

---

## Border Radius

| Size | CSS Variable | Tailwind | Use Case |
|------|-------------|----------|----------|
| sm | `--radius-sm` (6px) | `rounded-sm` | Badges |
| md | `--radius-md` (8px) | `rounded-md` | Buttons, inputs |
| lg | `--radius-lg` (12px) | `rounded-lg` | Cards, modals |
| xl | `--radius-xl` (16px) | `rounded-xl` | Large cards |
| full | - | `rounded-full` | Avatars, pills |

**Violations:**
- Arbitrary values: `rounded-[10px]`
- Using `rounded` (4px) when `rounded-md` is standard

---

## Shadows

| Level | Tailwind | Use Case |
|-------|----------|----------|
| sm | `shadow-sm` | Subtle elevation |
| DEFAULT | `shadow` | Cards at rest |
| md | `shadow-md` | Hover states |
| lg | `shadow-lg` | Modals, dropdowns |
| xl | `shadow-xl` | Popovers |

---

## Components

### Core UI Components

| Component | Import | Usage |
|-----------|--------|-------|
| `Button` | `@/components/ui/button` | All clickable actions |
| `Card` | `@/components/ui/card` | Content containers |
| `Badge` | `@/components/ui/badge` | Status indicators |
| `Heading` | `@/components/ui/heading` | All headings (h1-h6) |
| `Text` | `@/components/ui/text` | All body text |
| `Input` | `@/components/ui/input` | Form inputs |
| `Table` | `@/components/ui/table` | Data tables |

### Layout Components

| Component | Import | Usage |
|-----------|--------|-------|
| `Stack` | `@/components/ui/stack` | Vertical layouts |
| `Inline` | `@/components/ui/inline` | Horizontal layouts |
| `Grid` | `@/components/ui/grid` | Grid layouts |
| `Container` | `@/components/ui/container` | Max-width containers |
| `Panel` | `@/components/ui/panel` | Light grouping |
| `PageHeader` | `@/components/layout` | Page headers |

### Button Variants

```tsx
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
```

### Badge Variants

```tsx
<Badge variant="default">Info</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Rejected</Badge>
```

### Surfaces Decision Guide

| Primitive | When to Use |
|-----------|-------------|
| `Card` | Discrete block needing header/body/footer or selectable surface |
| `Panel` | Grouping content without Card chrome |
| `Stack`/`Inline` | Spacing without surface styling |
| `Container` | Constrain content width |

---

## Layout

### Page Container

```tsx
<div className="page-container">...</div>

// Or manually
<div className="min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[1800px] mx-auto">
```

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

**Violations:**
- Non-standard breakpoints: `@media (min-width: 800px)`
- Missing mobile-first responsive styles

### Grid Patterns

```tsx
// Two-column content grid
<div className="content-grid">...</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Common Patterns

### Table with Hover

```tsx
<TableRow className="hover:bg-accent">
  <TableCell>Content</TableCell>
</TableRow>
```

### Status Badge Mapping

```tsx
const getStatusVariant = (status: string) => {
  const variants = {
    'approved': 'success',
    'pending': 'warning',
    'rejected': 'destructive',
    'draft': 'secondary',
  };
  return variants[status] || 'outline';
};

<Badge variant={getStatusVariant(item.status)}>
  {item.status}
</Badge>
```

### Empty State

```tsx
<div className="text-center py-12">
  <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
  <Heading level={3} className="mb-2">No items found</Heading>
  <Text className="text-muted-foreground mb-4">
    Get started by creating your first item.
  </Text>
  <Button>Create Item</Button>
</div>
```

### Card with Header

```tsx
<Card>
  <CardHeader className="border-b">
    <Heading level={3}>Section Title</Heading>
  </CardHeader>
  <CardContent>
    <Text>Content goes here</Text>
  </CardContent>
</Card>
```

---

## Dark Mode

### Rules

- All colors must support dark mode via CSS variables
- Use `dark:` prefix for overrides
- Never use raw color values that don't adapt

**Violations:**
- Hardcoded `bg-white` without `dark:bg-gray-900`
- Colors without dark mode equivalents

---

## Accessibility

### Color Contrast

- Text: 4.5:1 contrast ratio (AA)
- Large text (18px+): 3:1 ratio
- Interactive elements: 3:1 ratio

### Touch Targets

- Minimum 44x44px for mobile
- Use `.touch-target` utility class

### Focus States

All interactive elements must have visible focus:

```tsx
className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
```

---

## ESLint Rules

### `design-system/no-hardcoded-colors` (ERROR)

```tsx
// ERROR
<div className="text-#ff0000">

// CORRECT
<div className="text-destructive">
```

### `design-system/no-arbitrary-spacing` (ERROR)

```tsx
// ERROR
<div className="p-[10px]">

// CORRECT
<div className="p-4">
```

### `design-system/require-semantic-colors` (WARN)

```tsx
// WARNING
<div className="text-gray-600">

// PREFERRED
<div className="text-muted-foreground">
```

---

## Naming Conventions

### CSS Classes

- Lowercase with hyphens: `card-header`, not `cardHeader`
- Prefix with component: `btn-primary`, `card-padded`
- Use semantic names: `text-muted-foreground`, not `text-gray-500`

### Component Files

- PascalCase for components: `Button.tsx`, `CardHeader.tsx`
- kebab-case for utilities: `use-toast.ts`

---

## Migration Checklist

When migrating a component:

- [ ] Replace manual card divs with `<Card>` component
- [ ] Replace `<h1>`-`<h6>` with `<Heading level={n}>`
- [ ] Replace `<p>` with `<Text>`
- [ ] Replace `text-gray-*` with semantic tokens
- [ ] Replace `bg-gray-*` with `bg-muted` or `bg-accent`
- [ ] Replace hardcoded status colors with Badge variants
- [ ] Replace arbitrary spacing with Tailwind scale
- [ ] Replace `hover:bg-gray-50` with `hover:bg-accent`
- [ ] Replace link colors with `text-primary hover:text-primary/80`

### Quick Reference: Common Violations

| What You See | What It Should Be |
|-------------|-------------------|
| `text-gray-900` | `text-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `bg-orange-500` | `bg-brand` |
| `border-gray-300` | `border-border` |
| `rounded-[8px]` | `rounded-md` |
| `p-[10px]` | `p-2.5` |
| `text-[14px]` | `text-sm` |
| Raw `<button>` | `<Button>` component |
| Raw `<input>` | `<Input>` component |

---

## Resources

- **Component Catalog**: `src/components/ui/README.md`
- **Design Tokens**: `src/app/globals.css`
- **ESLint Plugin**: `eslint-plugin-design-system/`

Run design check: `npm run lint`
