# Design System Gate

**Trigger:** Any time you are creating or editing a page or UI component.

## Before writing ANY UI code

### Building a page?

```tsx
import { PageShell } from "@/components/layout";
```

| Page type | Variant |
|-----------|---------|
| Home / overview with KPI cards | `dashboard` |
| Data table (UnifiedTablePage inside) | `table` |
| Create / edit form | `form` |
| Record detail with tabs | `detail` |
| Settings / docs / read-heavy | `content` |

**Never:**
- `<PageContainer>` + manual `<h1>` on a new page (creates double header)
- `<PageLayout>` (deprecated)
- Full-width layout for form/detail/content pages

### Building a component?

1. Check `@/components/ds` first — most components already exist
2. Check `@/components/ui` for shadcn primitives
3. Only build something new if it doesn't exist anywhere

### Using colors?

Only semantic tokens:
```
bg-background  bg-card  bg-muted
text-foreground  text-muted-foreground
border-border
bg-primary  text-primary-foreground
```

Zero hex codes. Zero `gray-*`, `blue-*`, `white` classes. Zero arbitrary values like `p-[10px]`.

### Using shadows?

Only `shadow-xs` (cards) or `shadow-sm` (dropdowns). Never `shadow-md` or larger.

## The design system docs

Full reference: `frontend/src/design-system/DESIGN.md`

## Why this gate exists

Every time an agent skips this gate, it produces:
- Double headers (PageContainer + h1 inside, plus the layout's own header)
- Full-width pages that should be constrained
- Articles and list items wrapped in cards
- Hardcoded colors that break dark mode
- Custom buttons instead of `<Button>`
- One-off components that duplicate existing ones
