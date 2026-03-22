# Alleato Design System

> **The single source of truth.** Read this before building any page or component.
> Style: Superhuman meets Linear — minimal, high information density, premium feel.
>
> **Sub-references (read when linked):**
> - [tokens.md](./tokens.md) — full token tables with dark mode hex values, animation tokens
> - [UI_GUIDE.md](./UI_GUIDE.md) — exact copy-paste Tailwind class combos, Card Trap JSX
> - [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md) — philosophy in depth, tonal elevation diagram
> - [patterns.md](./patterns.md) — loading, error, empty state code patterns
> - [premium-patterns.md](./premium-patterns.md) — 6 hierarchy techniques with CSS/JSX
> - [forms/form-page-archetype.md](./forms/form-page-archetype.md) — three-tier form system (READ BEFORE ANY FORM)
> - [forms/FORM-SYSTEM.md](./forms/FORM-SYSTEM.md) — RHF + Zod 4-layer implementation
> - [tables/table-system.md](./tables/table-system.md) — UnifiedTablePage full spec, cell types, checklist

---

## 1. START HERE: Building a New Page

Every page in the app uses `PageShell`. There are no exceptions.

```tsx
import { PageShell } from "@/components/layout";

// Dashboard / overview pages with KPI cards
<PageShell variant="dashboard" title="Project Dashboard" actions={<Button>+ Add</Button>}>
  <KpiRow metrics={[...]} />
  <SectionCard title="Recent Activity">...</SectionCard>
</PageShell>

// Data table pages
<PageShell variant="table" title="Commitments" actions={<Button>+ New</Button>}>
  <UnifiedTablePage ... />
</PageShell>

// Create / edit forms
<PageShell variant="form" title="Create Contract" onBack={() => router.back()}>
  <Card><CardContent>...</CardContent></Card>
</PageShell>

// Record detail pages (tabs, line items)
<PageShell variant="detail" title="Contract #1042" statusBadge={<StatusBadge status="Draft" />}>
  <Tabs>...</Tabs>
</PageShell>

// Read-heavy / settings / document pages
<PageShell variant="content" title="Settings">
  <p>...</p>
</PageShell>
```

### PageShell variant reference

| Variant | Max width | Padding | Use for |
|---------|-----------|---------|---------|
| `dashboard` | full | standard | Home/overview — KPI cards, charts, summaries |
| `table` | full | tight | Data tables — UnifiedTablePage goes inside |
| `form` | max-w-5xl | standard | Create/edit forms |
| `detail` | max-w-6xl | standard | Record detail pages with tabs |
| `content` | max-w-4xl | standard | Settings, documents, read-heavy pages |

### PageShell props

```ts
variant:           PageShellVariant   // Required
title:             string             // Required
titleContent?:     ReactNode          // Override title with custom element
actions?:          ReactNode          // Buttons in header right side — PRIMARY ACTION ONLY
statusBadge?:      ReactNode          // Status pill next to title (detail variant)
onBack?:           () => void         // Adds back arrow
backLabel?:        string             // Default: "Back"
showExportButton?: boolean
onExportCSV?:      () => void
onExportPDF?:      () => void
className?:        string
contentClassName?: string
```

**`actions` rule — critical:** The `actions` prop holds ONE thing only: the primary create/add button. Export, import, settings, column toggles, and bulk actions NEVER go in `actions`. They belong in the `UnifiedTablePage` toolbar.

---

## 2. Color Tokens

**Never use hex codes or raw Tailwind palette colors (`gray-200`, `blue-500`). Always use semantic tokens.**

```css
/* Backgrounds */
bg-background        /* Page background (#F6F6F8 light / #151518 dark) */
bg-card              /* Card/surface (#FFFFFF light / #1F1F24 dark) */
bg-muted             /* Subtle section background (#F1F1F4 light / #272730 dark) */
bg-muted/50          /* Very subtle tint */
bg-accent            /* Hover/interactive (#EDEDFA light / #2C2C35 dark) */

/* Text */
text-foreground       /* Primary text */
text-muted-foreground /* Secondary/caption text */
text-primary          /* Brand color — actions and links only */

/* Borders */
border-border         /* Standard border */
border-border/50      /* Subtle border */

/* Primary / Brand */
bg-primary            /* Primary button background (#5856D6 light / #7B79E5 dark) */
text-primary-foreground /* Text on primary buttons */

/* Status — ONLY for status display, never decoration */
bg-green-50 text-green-600    /* Active / Approved */
bg-yellow-50 text-yellow-600  /* Pending / Draft */
bg-red-50 text-red-600        /* Error / Rejected / Overdue */
bg-blue-50 text-blue-600      /* Info / In Progress */
bg-gray-100 text-gray-600     /* Inactive / Archived */
```

**ESLint ERRORS (blocks build):** `design-system/no-hardcoded-colors`, `design-system/no-arbitrary-spacing`, `design-system/require-semantic-colors`

### Color substitution table

| Instead of | Use |
|---|---|
| `text-neutral-500`, `text-gray-500` | `text-muted-foreground` |
| `text-neutral-900`, `text-gray-900` | `text-foreground` |
| `border-neutral-200`, `border-gray-200` | `border-border` |
| `bg-white` | `bg-card` or `bg-background` |
| `bg-gray-50`, `bg-neutral-50` | `bg-muted` |
| `text-orange-500`, `text-brand` | `text-primary` |
| `bg-blue-500` | `bg-primary` |
| `ring-blue-500` | `ring-primary` |
| `bg-emerald-50 border-emerald-200` | `bg-green-50 text-green-600` via `StatusBadge` |

### Dynamic class construction is BANNED

```tsx
// WRONG — Tailwind tree-shakes dynamic classes in production
className={`text-${color}-600`}

// CORRECT — static mapping
const colorMap = { approved: "text-green-600", draft: "text-yellow-600" };
className={colorMap[status]}
```

> Full dark mode token values with HSL: [tokens.md](./tokens.md)

---

## 3. Typography

```css
/* Headings — always font-semibold, tracking-tight */
text-2xl font-semibold tracking-tight   /* Page title (via PageShell) */
text-xl font-semibold tracking-tight    /* Section title */
text-base font-semibold                 /* Card title */
text-sm font-medium                     /* Label, table header */

/* Body */
text-sm                                 /* Default body text */
text-xs text-muted-foreground           /* Caption, metadata */

/* Eyebrow / category labels */
text-[11px] font-semibold uppercase tracking-wider text-muted-foreground
/* Or use: <Eyebrow>SECTION NAME</Eyebrow> */
```

### The 4-Tier Text Hierarchy (mandatory)

Every section on screen must use at least 3 of these 4 tiers. If your component uses only 1–2 text styles, the hierarchy is broken.

| Tier | Classes | Use for |
|------|---------|---------|
| 1 — Eyebrow | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` | Section labels, KPI labels, table column headers |
| 2 — Heading | `text-lg font-semibold tracking-tight text-foreground` | Section titles, primary data values |
| 3 — Body | `text-sm text-muted-foreground` | Descriptions, supporting text, table cells |
| 4 — Meta | `text-xs text-muted-foreground/60` | Timestamps, "last updated", footnotes |

### Context-specific sizes

| Context | Classes |
|---------|---------|
| KPI value (hero) | `text-3xl font-semibold tracking-tight tabular-nums` |
| KPI value (compact) | `text-lg font-semibold tracking-tight tabular-nums` |
| Table header | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` |
| Monospace data (IDs, codes) | `font-mono text-sm tabular-nums` |
| Page title (in header) | `text-xl font-semibold tracking-tight` |

### OpenType features

Inter must be rendered with OpenType features enabled (set in `globals.css`):
```css
body {
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { letter-spacing: -0.01em; }
```

### Banned

```
text-[14px], text-[1.2rem]   → use text-sm, text-base
font-bold in page content    → use font-semibold max
text-gray-*, text-neutral-*  → use semantic tokens
```

---

## 4. Spacing

Use Tailwind defaults on the 8px grid. No arbitrary values. Prefer multiples of 8; use 4px (gap-1) only for micro gaps.

### Named levels

| Level | Token | px | Use for |
|-------|-------|----|---------|
| micro | `gap-1` | 4px | Icon-to-text gap, badge internal padding |
| tight | `gap-2` | 8px | Related items (label + input, badge + text) |
| compact | `gap-3` | 12px | Compact lists, table cell padding |
| base | `gap-4` | 16px | Items within a section, standard group spacing |
| comfortable | `gap-6` | 24px | Form fields, related subsections, card internal padding |
| section | `gap-8` | 32px | Between related page sections |
| break | `gap-12` | 48px | Between major page sections |
| page | `px-8` | 32px | Page horizontal padding (desktop, via PageContainer) |

### Spacing by page type

| Page type | Internal card padding | Section gap | Usage |
|-----------|----------------------|-------------|-------|
| Dashboard | `p-6` (24px) | `gap-8` | KPI widgets, summary cards |
| Table | `p-4` (16px) | `gap-4` | Toolbar + table — tight to maximize data |
| Form | `p-6` (24px) | `gap-6` | Between form fields; `gap-8` between sections |
| Content | `p-8` (32px) | `gap-8` | Documents, settings — generous rhythm |

### Table row density options

| Density | Row height | Cell padding | When |
|---------|-----------|--------------|------|
| standard | 53px | `px-3 py-3` | Default — most pages |
| compact | 40px | `px-3 py-2` | High-density tables, log views |
| comfortable | 64px | `px-3 py-4` | Detail-heavy rows |

### CSS spacing variables (set by PageContainer)

```css
--page-padding    /* Container horizontal padding */
--section-gap     /* Gap between major sections */
--card-padding    /* Card internal padding */
--group-gap       /* Related items */
--field-gap       /* Form field spacing */
--row-height      /* Table row height */
--cell-padding    /* Table cell horizontal padding */
--cell-padding-y  /* Table cell vertical padding */
```

### Banned

```
p-[10px], gap-[15px], m-[20px]   → use token values
p-5, p-7, p-9, p-10, p-11        → not on 8px grid
```

---

## 5. Shadows

Only two allowed values. Most elements have NO shadow — tonal elevation does the work.

```
shadow-xs   /* Form inputs, select triggers — very subtle lift */
shadow-sm   /* Dropdowns, popovers, floating modals */
(none)      /* 90% of elements — the default */
```

**Never:** `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, glow effects.

---

## 6. Border Radius

```
rounded-md    /* Default — form inputs, buttons, small cards */
rounded-lg    /* Larger cards, modals, panels */
rounded-xl    /* Command palette, major overlays */
rounded-full  /* Avatars, status dots, pills, tags */
rounded-none  /* Tables, full-bleed elements */
```

**Never:** bare `rounded`, `rounded-sm`, arbitrary `rounded-[10px]`. Pick one scale and don't mix.

---

## 7. Borders

Borders create visual noise. **Every border must earn its place.**

### Use borders for:
- Form inputs (accessibility requirement)
- Table row dividers (`divide-y divide-border`)
- Table header bottom (`border-b border-border`)
- Explicit structural separators between distinct content zones
- The chat message input field (and nothing else in chat UI)

### Do NOT use borders for:
- Cards (use tonal elevation: `bg-card` on `bg-background` — the 3% lightness difference IS the separator)
- Page sections (use spacing instead)
- Decorative containers
- Hover states (use `hover:bg-muted` instead)
- The sidebar nav (use background color shift)

### Tonal elevation system

```
bg-background  →  Page surface (base layer)
  └── bg-card  →  Card content (elevated)
       └── bg-muted  →  Hover / active state
            └── bg-accent  →  Selected / interactive highlight
```

In dark mode, closer surfaces are lighter (mimics light from above):
```
#151518 (background) → #1F1F24 (card) → #272730 (muted) → #2C2C35 (popover/float)
```

### Border width

1px borders only (`border`, `border-t`, `border-b`, etc.). Never `border-2` or `border-4`.

---

## 8. Animation

### Timing tokens

| Token | Duration | Easing | Use for |
|-------|----------|--------|---------|
| instant | 0ms | — | Keyboard nav highlights, active states |
| fast | 100ms | `ease-out` | Hover states, focus rings, micro-interactions |
| normal | 150ms | `ease-out` | Panel open/close, row slide, most transitions |
| spring | 200ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Command palette, modal entrance, toasts |

### Performance targets

| Interaction | Target |
|-------------|--------|
| Page navigation | < 100ms |
| Filter application | < 50ms |
| Row focus change | < 16ms (one frame) |
| Modal/panel open | < 100ms |
| Status update (optimistic) | < 50ms |
| Search results | < 100ms |

### Optimistic UI pattern

Every mutation follows this pattern — no spinners for common actions:

```typescript
async function updateStatus(id: string, newStatus: string) {
  // 1. Update UI immediately (optimistic)
  queryClient.setQueryData(['records', id], (old) => ({ ...old, status: newStatus }));

  // 2. Show undo toast
  showUndoToast(`Status changed to ${newStatus}`);

  // 3. Sync with server in background
  try {
    await supabase.from('records').update({ status: newStatus }).eq('id', id);
  } catch {
    // 4. Revert on failure
    queryClient.invalidateQueries(['records', id]);
    showErrorToast('Failed to update status');
  }
}
```

### Undo Toast

After every reversible action (status change, archive, delete):

```tsx
// Design: fixed bottom-center, inverted colors, 5s auto-dismiss, no close button
// bg-foreground text-background rounded-lg
// Shows keyboard shortcut: "Press Z to undo"
// Replaces confirmation dialogs for reversible actions
toast("Change order marked as approved", {
  action: { label: "Undo (Z)", onClick: handleUndo },
  duration: 5000,
});
```

---

## 9. Component Reference

### Status Display

```tsx
import { StatusBadge, StatusDot, StatusText } from "@/components/ds";

<StatusBadge status="Draft" />      // Colored pill — tables, detail pages
<StatusDot status="Approved" />     // Dot + label — compact table cells
<StatusText status="Not synced" />  // Plain muted text — low emphasis
```

Pass the status string. Colors are automatic. **Never manually map statuses to color classes.**

### Metrics / KPIs

```tsx
import { KpiBlock, KpiRow } from "@/components/ds";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";

// Compact inline row (top of table pages)
<KpiRow metrics={[
  { label: "Total Budget", value: "$2.4M" },
  { label: "Committed", value: "$1.8M", trend: "+12%" },
]} />

// Rich cards (dashboard pages)
<MetricGrid>
  <MetricCard title="Revenue" value="$2.4M" change={{ value: 12, direction: "up" }} />
</MetricGrid>
```

Use `KpiRow` for table pages. Use `MetricCard` for dashboard pages.

### Data Tables

```tsx
import { DataTable } from "@/components/ds";

<DataTable
  columns={[
    { key: "name",   header: "Name",   render: (row) => row.name },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ]}
  rows={data}
  loading={isLoading}
  emptyState={<EmptyState title="No items" description="Create one to get started" />}
/>
```

For full-featured pages with search/filter/bulk actions, use `UnifiedTablePage` — see [tables/table-system.md](./tables/table-system.md).

### Table Row States

```
Focused row (keyboard):  2px left accent border (--primary) + bg-accent/5
Hovered row:             bg-muted (2–3% shift — subtle)
Selected row:            bg-accent/10 + left checkmark visible
Default:                 bg-card, text-foreground / text-muted-foreground
```

### Empty States

```tsx
import { EmptyState } from "@/components/ds";

<EmptyState
  icon={FileIcon}
  title="No contracts yet"
  description="Create your first contract to get started"
  action={<Button onClick={onCreate}>+ New Contract</Button>}
/>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";

<Card>
  <CardHeader><CardTitle>Section Title</CardTitle></CardHeader>
  <CardContent>...</CardContent>
</Card>
```

Shadow: `shadow-xs` only on card. `shadow-sm` only when floating. **No border on card** — use `bg-card` on `bg-background` for separation.

### Section Headers

```tsx
import { SectionHeader } from "@/components/ds";
<SectionHeader title="Line Items" count={12} action={<Button size="sm">Add</Button>} />
```

### Buttons

```tsx
import { Button } from "@/components/ds";

<Button>Primary action</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="icon"><PlusIcon /></Button>
```

**Never write `<button className="...">`.** Always use `<Button>`.

### Form Inputs

```tsx
import { Input, Textarea, Select, Checkbox, Label } from "@/components/ds";

// Always pair with Label:
<div className="space-y-2">
  <Label htmlFor="name">Contract Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>
```

**Radix Select gotcha:** `<Select>` does NOT allow empty string values. For optional selects, use `placeholder` on `SelectValue` — do NOT add a "None" `SelectItem`.

### Overlays

```tsx
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Slideover } from "@/components/ui/unified-slideover";

// Create/edit forms → UnifiedModal
<UnifiedModal open={open} onClose={() => setOpen(false)} title="Create Contract" size="md">
  <form>...</form>
</UnifiedModal>

// Detail panels, context views → Slideover
<Slideover open={open} onClose={() => setOpen(false)} title="Contract Details" size="lg">
  ...
</Slideover>
```

- **UnifiedModal** — create/edit, confirmations, focused tasks
- **Slideover** — detail preview, side-by-side context panels
- **AlertDialog** — destructive confirmations ONLY

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ds";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="line-items">Line Items</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>
```

### Feedback / States

```tsx
import { Skeleton, Spinner, Progress, Alert, AlertTitle, AlertDescription } from "@/components/ds";

// Loading
<Skeleton className="h-4 w-48" />
<Spinner size="sm" />

// Alerts (informational content only — no card/border wrappers around alerts in chat UI)
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

---

## 10. Table System

See [tables/table-system.md](./tables/table-system.md) for the full spec including toolbar API, cell types, and accessibility checklist.

### Quick reference

```tsx
import { UnifiedTablePage } from "@/components/tables/unified";

<UnifiedTablePage
  header={{
    title: "Commitments",
    actions: <Button size="sm">+ New Commitment</Button>,  // ONE action only
  }}
  tabs={tabs}               // Optional tab navigation
  toolbar={{
    onSearch: ...,
    onExport: ...,          // Export belongs HERE, not in header.actions
    features: { enableExport: true, enableBulkDelete: true },
  }}
  data={{ items, isLoading, isFetching }}
  table={{ columns, getRowId, onRowClick }}
  sorting={{ ... }}
  emptyState={{ title, description, filteredDescription, isFiltered }}
/>
```

**Header `actions` rule — critical:** ONE thing only — the primary create/add button. Export, import, column toggles, and secondary actions NEVER go in header `actions`. They belong in `toolbar`.

### Reference implementations

- `commitments/page.tsx` — tabs, footer totals, row selection
- `change-events/page.tsx` — tabs, bulk delete, export
- `invoicing/page.tsx` — KpiRow as topContent
- `rfis/rfis-client.tsx` — standard implementation
- `direct-costs/cost-code-hierarchy-view.tsx` — hierarchical rows

---

## 11. Form System

See [forms/form-page-archetype.md](./forms/form-page-archetype.md) for the complete three-tier system with wireframes and full code templates. **Read it before writing any form.**

### Three-tier decision tree

```
How many fields?
  < 8 fields              → Tier 1: Simple Form
  8–20 fields, 2–4 sections → Tier 2: Standard Form
  20+ fields, 5+ sections → Tier 3: Complex Form

Has embedded tables (line items, SOV)?
  YES → Move up one tier minimum
  Line items on CREATE form? → Remove them. Tables belong on the detail/edit page.

Creation vs. edit?
  Creation: essential fields only. Defer optional fields to detail page.
  Edit: full field set for the tier.
```

### Tier quick reference

| Tier | Fields | Width | Layout | Action bar |
|------|--------|-------|--------|------------|
| 1 — Simple | < 8 | 672px (`FormContainer maxWidth="md"`) | Single column | `border-t` at bottom |
| 2 — Standard | 8–20 | 896px (`FormContainer maxWidth="lg"`) | 1–2 columns | Sticky bottom bar |
| 3 — Complex | 20+ | 896px content + 192px sidebar TOC | 2–3 columns | Sticky top bar |

### Line items pattern

For editable line-item tables in forms (SOV, cost tables, invoice line items):
- Container: subtle bordered shell with muted table backdrop
- Header: `text-[11px] font-normal text-muted-foreground` — compact label typography
- Rows: compact vertical rhythm, consistent input heights
- Totals: dedicated footer row, right-aligned currency values
- Actions: "Add Line Item" button BELOW the table
- **Never use accordion for the primary line-items block in a form.** Accordion hides data. Keep line items always visible.

See [forms/FORM-SYSTEM.md](./forms/FORM-SYSTEM.md) for RHF + Zod implementation.

---

## 12. Interaction Patterns (Keyboard-First)

Every table page supports keyboard navigation:

| Key | Action | Context |
|-----|--------|---------|
| `J` / `↓` | Focus next row | Table/list |
| `K` / `↑` | Focus previous row | Table/list |
| `Enter` | Open focused record in detail panel | Table/list |
| `Escape` | Close detail panel / close modal | Everywhere |
| `E` | Primary action (approve, mark done) | When row focused |
| `N` | Create new record | Table/list |
| `/` | Focus search input | Table/list |
| `Z` | Undo last action | After any reversible action |
| `Cmd+K` | Open command palette | Global |
| `G then B` | Go to Budget | Global |
| `G then C` | Go to Commitments | Global |
| `G then D` | Go to Directory | Global |
| `G then S` | Go to Schedule | Global |
| `G then H` | Go to Home | Global |

---

## 13. Loading / Error / Empty States

**Always handle all three states. Never skip error or empty.**

```tsx
const { data, isLoading, error } = useItems(projectId);

if (isLoading) return <PageSkeleton />;
if (error) return <ErrorState error={error.message} />;
if (!data?.length) return <EmptyState title="No items" description="..." />;
return <ItemsTable data={data} />;
```

### Loading skeleton

```tsx
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-2 mt-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
```

### Error state

```tsx
function ErrorState({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
```

### Toast

```tsx
import { toast } from "sonner";
toast.success("Changes saved");
toast.error("Failed to save changes");
```

Full patterns: [patterns.md](./patterns.md)

---

## 14. Visual Noise Rules

### Cards must earn their place

A `<Card>` is justified when it:
- Groups multiple related actions (a form section with 3+ fields)
- Represents a distinct interactive object (Kanban card)
- Contains content the user repeatedly references

A `<Card>` is NOT justified for:
- Wrapping a filter toolbar (use inline flex layout)
- A single paragraph of "coming soon" placeholder text (use `<EmptyState>`)
- Developer-internal metadata (bucket names, folder paths, internal IDs)
- A legend explaining the UI (if the UI needs a legend, simplify the UI)
- Repeating data already visible elsewhere on the page

**Replace 3-column stat card grids with `<KpiRow>` from `@/components/ds`.** Lighter weight, no border noise.

### Non-functional UI

**Never ship UI that does nothing:**
- A button with no `onClick` is worse than no button
- A dropdown with empty items must be removed or implemented
- Placeholder tabs showing no content must be hidden or implemented

---

## 15. Anti-Patterns (rejected in review)

| Never do this | Do this instead |
|---|---|
| `<div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">` | `<Card>` |
| `<button className="bg-blue-500 text-white px-4 py-2 rounded">` | `<Button>` |
| `<h1 className="text-2xl font-bold text-gray-900">` | `<PageShell title="...">` |
| `import { PageContainer, ProjectPageHeader }` on a new page | `import { PageShell }` |
| `bg-gray-200`, `text-gray-600`, `border-gray-200` | `bg-muted`, `text-muted-foreground`, `border-border` |
| `shadow-md`, `shadow-lg` | `shadow-xs`, `shadow-sm` |
| `rounded`, `rounded-sm` | `rounded-md` |
| `p-[10px]`, `gap-[14px]` | `p-2.5`, `gap-3` |
| Manually mapping status → color | `<StatusBadge status={row.status} />` |
| Creating custom `MyButton.tsx` | Use `<Button>` from ds |
| `bg-orange-500` for brand | `bg-primary` |
| Dynamic class construction `className={\`text-${color}-600\`}` | Static color map object |
| `import { DataTablePage }` | Deprecated — use `UnifiedTablePage` |
| `import { GenericDataTable }` | Deprecated |
| `import { TableLayout }` | Deprecated |
| `import { AppShell }` from `@/components/layouts` | Deprecated |
| Accordion for primary line-items table | Always-visible table |
| Bot icon (`Bot` from lucide) in chat UI | Brand initial "A" in a circle |
| `<User>` icon for user messages | Styled bubble or initials |
| Borders around chat content sections | No border — render text directly |

---

## 16. Import Rules

```ts
// Correct
import { PageShell } from "@/components/layout";
import { StatusBadge, KpiRow, DataTable, Button, Card, EmptyState } from "@/components/ds";
import { Input, Textarea } from "@/components/ds";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Slideover } from "@/components/ui/unified-slideover";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { UnifiedTablePage } from "@/components/tables/unified";

// Also correct for component files (not page files)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Never — these are deleted
import { GlobalHeader } from "@/components/layout";
import { CompanyHeader } from "@/components/layout";
import { PageToolbar } from "@/components/layout";
import { DataTablePage } from "...";
import { GenericDataTable } from "...";
```

---

## 17. Enforcement

**ESLint errors that block the build:**
- `design-system/no-hardcoded-colors`
- `design-system/no-arbitrary-spacing`
- `design-system/require-semantic-colors`

**Claude Code design commands:**
- `/design:design-check` — validate a single file
- `/design:design-audit` — audit the full codebase
- `/design:design-fix-loop` — autonomous fix loop
- `/design:design-verify` — verify fixes still hold
- `/design:design-report` — generate compliance report

**Before merging any PR that touches UI:**
1. Run `cd frontend && npm run quality`
2. Run `npm run check:routes` if routes changed
3. Run `/design:design-check` on changed files
4. No new violations in `.claude/design-audit/violations.json`
