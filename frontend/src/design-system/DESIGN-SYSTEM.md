# Alleato PM Design System

> **This is the single source of truth.** Every agent, skill, and human reads this before writing UI code. No exceptions.

## Philosophy: Subtract, Don't Add

Alleato PM looks like **Linear meets Vercel Dashboard** — clean, minimal, confident. The #1 rule: **if you're about to add a visual element, ask whether removing something else would accomplish the same goal.** Borders, shadows, cards, icons, badges — every one must earn its place. When in doubt, leave it out.

**The visual noise test:** After building a screen, mentally remove every border, card wrapper, and decorative element one at a time. If the layout still communicates the same information without it — delete it permanently.

---

## 1. Page Archetypes

Every page is one of these four types. No hybrid layouts. No improvising.

### Type A: Table Page (full width)

For lists of entities: commitments, contracts, RFIs, submittals, daily logs.

```tsx
import { UnifiedTablePage } from "@/components/tables/unified/unified-table-page";

<UnifiedTablePage
  header={{ title: "Commitments", actions: <Button size="sm">+ New</Button> }}
  tabs={tabs}
  toolbar={{ /* search, filters, export — all go here */ }}
  data={{ items, isLoading, isFetching }}
  table={{ columns, getRowId, onRowClick }}
  sorting={{ sortBy, sortDirection, onSortChange }}
  emptyState={{ title: "No commitments", description: "...", filteredDescription: "...", isFiltered }}
/>
```

**Rules:**
- Header actions = ONE primary button only (the create/add action)
- Export, import, bulk actions, column toggles = toolbar, never header
- Use `topContent` for KPI rows above the table
- Full bleed — no maxWidth constraint

### Type B: Form Page (narrow, max-w-5xl)

For creating/editing entities: new contract, edit RFI, project settings.

```tsx
import { ProjectFormPageLayout } from "@/components/layout";
import { FormSection } from "@/components/forms";

<ProjectFormPageLayout
  title="Create Prime Contract"
  description="Enter the contract details below"
  onBack={() => router.back()}
  maxWidth="lg"
>
  <form onSubmit={handleSubmit} className="space-y-8">
    <FormSection title="General Information">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* fields */}
      </div>
    </FormSection>

    <FormSection title="Financial Details">
      {/* fields */}
    </FormSection>

    <div className="flex justify-end gap-3 border-t border-border pt-6">
      <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      <Button type="submit">Create Contract</Button>
    </div>
  </form>
</ProjectFormPageLayout>
```

**Rules:**
- Always include back navigation
- Group fields into `FormSection` blocks with clear titles
- Submit/cancel buttons at the bottom, right-aligned, separated by `border-t`
- Never wrap individual fields in cards

### Type C: Detail Page (content, max-w-7xl)

For viewing a single entity with sections: contract detail, RFI detail.

```tsx
import { PageHeader, PageContainer } from "@/components/layout";
import { SectionHeader } from "@/components/ds";

<>
  <PageHeader title="Contract #1042" actions={<Button size="sm" variant="outline">Edit</Button>} />
  <PageContainer maxWidth="xl">
    <div className="space-y-10">
      <section>
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* key-value pairs or KPI blocks */}
        </div>
      </section>

      <section>
        <SectionHeader title="Line Items" count={12} />
        <DataTable columns={columns} rows={items} />
      </section>
    </div>
  </PageContainer>
</>
```

**Rules:**
- Sections separated by `space-y-10` (whitespace, not borders)
- Use `SectionHeader` for each section — never raw `<h2>` tags
- Detail grids: 1 col on mobile, 2 on sm, 3 on lg

### Type D: Dashboard Page (mixed content, full width)

For overview/summary pages: project home, budget overview.

```tsx
<>
  <PageHeader title="Project Dashboard" />
  <PageContainer>
    <div className="space-y-8">
      <KpiRow metrics={[...]} />

      <section>
        <SectionHeader title="Recent Activity" action={{ label: "View All", href: "/activity" }} />
        {/* content */}
      </section>
    </div>
  </PageContainer>
</>
```

**Rules:**
- KPI row at top, no card wrapper
- Sections use `SectionHeader`, separated by `space-y-8`
- Charts and tables are full width within their sections

---

## 2. Component Imports — Use These, Nothing Else

### Layout

```tsx
import { PageHeader, ProjectPageHeader, PageContainer, FormContainer,
         ProjectFormPageLayout, PageToolbar, PageTabs } from "@/components/layout";
```

### Design System

```tsx
import { StatusBadge, StatusDot, StatusText, KpiBlock, KpiRow,
         EmptyState, DataTable, SectionHeader, Eyebrow, AvatarStack } from "@/components/ds";
```

### Forms

```tsx
import { FormField, FormSection } from "@/components/forms";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { RichTextField } from "@/components/forms/RichTextField";
```

### Tables

```tsx
import { UnifiedTablePage } from "@/components/tables/unified/unified-table-page";
```

### Base Primitives (shadcn)

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

**NEVER create one-off components that duplicate any of the above.**

---

## 3. Color Tokens — Semantic Only

| Purpose | Token | NEVER use |
|---------|-------|-----------|
| Primary text | `text-foreground` | `text-gray-900`, `text-neutral-900`, `text-black` |
| Secondary text | `text-muted-foreground` | `text-gray-500`, `text-neutral-500` |
| Page background | `bg-background` | `bg-white`, `bg-gray-50` |
| Card/raised surface | `bg-card` | `bg-white` |
| Muted surface | `bg-muted` | `bg-gray-50`, `bg-gray-100`, `bg-neutral-50` |
| Borders | `border-border` | `border-gray-200`, `border-neutral-200` |
| Primary accent | `text-primary` / `bg-primary` | `text-orange-500`, `text-blue-500` |
| Destructive | `text-destructive` | `text-red-500`, `text-red-600` |

**Status colors (ONLY for status display via `StatusBadge`):**
- Success: `bg-green-50 text-green-600`
- Warning: `bg-yellow-50 text-yellow-600`
- Error: `bg-red-50 text-red-600`
- Info: `bg-blue-50 text-blue-600`

**NEVER use status colors for decoration, backgrounds, or non-status purposes.**

---

## 4. Spacing — 8px Grid Only

```
4px  (p-1, gap-1)     — icon-to-label, badge padding
8px  (p-2, gap-2)     — tight inline spacing
12px (p-3, gap-3)     — form field internal
16px (p-4, gap-4)     — standard component padding, field gaps in forms
24px (p-6, gap-6)     — card internal padding, section internal gap
32px (space-y-8)      — between related groups
40px (space-y-10)     — between major sections
```

**NEVER:** `p-5`, `p-7`, `gap-5`, `gap-7`, `gap-[14px]`, `p-[18px]`, or any arbitrary value.

---

## 5. Typography

| Element | Classes | When to use |
|---------|---------|-------------|
| Page title | `text-2xl font-semibold tracking-tight` | PageHeader handles this |
| Section title | `text-lg font-semibold tracking-tight text-foreground` | SectionHeader handles this |
| Eyebrow label | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` | Eyebrow component |
| Body text | `text-sm text-muted-foreground` | Descriptions, paragraphs |
| Table header | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | DataTable handles this |
| Table cell | `text-sm text-muted-foreground` | DataTable handles this |
| Form label | `text-sm font-medium text-foreground` | FormField handles this |
| Hint/helper | `text-sm text-muted-foreground` | Below form fields |
| KPI value | `text-2xl font-semibold tracking-tight text-foreground` | KpiBlock handles this |
| KPI label | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` | KpiBlock handles this |

**Font weights allowed:** 400 (normal), 500 (medium), 600 (semibold). Use 700 (bold) ONLY for hero KPI numbers.
**NEVER bold body text, descriptions, or table cells.**

---

## 6. Shadows

| Allowed | Use for |
|---------|---------|
| `shadow-xs` | Subtle lift on inputs |
| `shadow-sm` | Dropdowns, popovers, floating elements |

**BANNED:** `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`. These look heavy and amateur.

---

## 7. Border Radius

| Token | Use for |
|-------|---------|
| `rounded-md` (6px) | Default for everything: buttons, inputs, cards, badges |
| `rounded-lg` (8px) | Modals, sheets, large containers |
| `rounded-full` | Avatar circles, pills |

**NEVER mix radius values randomly.** Default to `rounded-md` unless there's a specific reason.

---

## 8. Visual Noise Rules

### Cards Must Earn Their Place

**Cards are justified for:**
- Individual entities in a grid (project cards, team member cards)
- Floating UI elements (popovers, dialogs)
- KPI row container (`KpiRow` already handles this)
- Form containers where the card differentiates form from page background

**Cards are NEVER justified for:**
- Wrapping a toolbar or filter bar
- Wrapping a single paragraph or "coming soon" text (use `EmptyState`)
- Wrapping each section of a detail page (use whitespace)
- Nesting inside another card
- Wrapping a table (tables are their own visual container)

### Borders Must Earn Their Place

**Borders are for:**
- Input fields, selects, textareas (interactive boundaries)
- Table row separators (horizontal dividers inside tables)
- Bottom of form sections (`FormSection` handles this)
- Separator between form content and submit buttons (`border-t`)

**Borders are NOT for:**
- Separating major page sections (use `space-y-8` or `space-y-10`)
- Wrapping content groups that could use whitespace instead
- Adding visual weight to things that don't need it

### The Reduction Checklist

Before shipping any screen, go through each visual element:
1. Can this border be replaced with whitespace? → Remove it
2. Is this card wrapper adding information or just noise? → Remove it
3. Are there two adjacent elements with the same visual treatment? → Differentiate or merge
4. Is there an icon that's purely decorative with no semantic meaning? → Remove it
5. Is there a badge/label that repeats information already visible? → Remove it

---

## 9. Forms — Complete Pattern

### Field Layout

```tsx
{/* Two-column grid for related fields */}
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
  <FormField label="First Name" required>
    <Input placeholder="Enter first name" />
  </FormField>
  <FormField label="Last Name" required>
    <Input placeholder="Enter last name" />
  </FormField>
</div>

{/* Full-width field */}
<FormField label="Description" fullWidth>
  <RichTextField placeholder="Enter description..." />
</FormField>
```

### Form Section Organization

```tsx
<form className="space-y-8">
  <FormSection title="General Information" description="Basic details about the entity">
    {/* 2-col grid of fields */}
  </FormSection>

  <FormSection title="Financial Details" description="Cost and budget information">
    {/* fields */}
  </FormSection>

  <FormSection title="Attachments">
    <FileUploadField label="Documents" accept=".pdf,.doc,.docx" />
  </FormSection>

  {/* Submit row — always at the bottom, right-aligned */}
  <div className="flex justify-end gap-3 border-t border-border pt-6">
    <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : "Save"}
    </Button>
  </div>
</form>
```

### Form Rules

1. **Labels above inputs** — never beside them on narrow screens
2. **Required fields** marked with red asterisk (FormField handles this)
3. **Error messages** below the field in red (FormField handles this)
4. **Hint text** below the field in muted (FormField handles this)
5. **Placeholder text** should be example values, not instructions ("$10,000" not "Enter amount")
6. **Select defaults** — use a placeholder like "Select type..." not a pre-selected value
7. **Never wrap individual form fields in cards** — let FormSection provide grouping
8. **Date fields** use native date input or a date picker component, never a text input

---

## 10. Tables — Complete Pattern

### Column Types

| Column Type | Render Pattern |
|-------------|----------------|
| Primary identifier | `primary: true` — renders in `font-medium text-foreground` |
| Status | `<StatusBadge status={item.status} />` or `<StatusDot status={item.status} />` |
| Currency | `align: "right"` with `tabular-nums` — format: `$1,234.56` |
| Date | `text-muted-foreground` — format: `Mar 9, 2026` (use `date-fns` format) |
| Actions | Row action menu via `rowActions` prop |
| Avatar/user | `<AvatarStack>` or single initial circle |

### Empty States

Every table MUST have a meaningful empty state:

```tsx
emptyState={{
  title: "No commitments yet",
  description: "Create your first commitment to track project costs",
  filteredDescription: "No commitments match your current filters",
  isFiltered: searchValue !== "" || hasActiveFilters,
  action: <Button size="sm" onClick={onCreate}>+ New Commitment</Button>,
}}
```

---

## 11. Mobile Responsiveness

### Breakpoint Strategy

```
Mobile:  < 640px  (default styles, no prefix)
Tablet:  640px+   (sm:)
Desktop: 1024px+  (lg:)
Wide:    1280px+  (xl:)
```

**Every component must work on mobile. This is not optional.**

### Tables on Mobile

Tables MUST switch to a card layout on mobile. The `UnifiedTablePage` handles this via the `views.card` prop:

```tsx
<UnifiedTablePage
  toolbar={{
    currentView: isMobile ? "card" : "table",
    enabledViews: ["table", "card"],
    // ...
  }}
  views={{
    card: (item) => (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{item.name}</span>
          <StatusBadge status={item.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Amount</span>
            <span className="block font-medium">{formatCurrency(item.amount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date</span>
            <span className="block">{formatDate(item.date)}</span>
          </div>
        </div>
      </div>
    ),
  }}
/>
```

### Mobile Card Pattern for Tables

When a table row becomes a card on mobile:

```tsx
{/* Mobile card structure */}
<div className="rounded-lg border border-border bg-card p-4 space-y-3">
  {/* Row 1: Primary identifier + status */}
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
    <StatusBadge status={item.status} />
  </div>

  {/* Row 2: Key fields in a 2-col grid */}
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
    <div>
      <span className="text-xs text-muted-foreground">Amount</span>
      <span className="block text-foreground">{formatCurrency(item.amount)}</span>
    </div>
    <div>
      <span className="text-xs text-muted-foreground">Due Date</span>
      <span className="block text-foreground">{formatDate(item.dueDate)}</span>
    </div>
  </div>

  {/* Row 3 (optional): Secondary info or actions */}
  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
    <span>{item.vendor}</span>
    <Button variant="ghost" size="sm">View</Button>
  </div>
</div>
```

**Mobile card rules:**
- Max 4-6 fields visible (show only the most important data)
- Primary identifier and status always on the first row
- Currency/numbers right-aligned within their grid cell
- Truncate long text with `truncate` class
- Cards separated by `space-y-3` (not borders between cards)
- No hover states on mobile cards (tap targets only)

### Responsive Layout Rules

```tsx
{/* Grid columns collapse on mobile */}
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

{/* Form fields stack on mobile */}
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

{/* KPI row wraps on mobile */}
{/* KpiRow handles this automatically with grid-cols responsive */}

{/* Side-by-side becomes stacked */}
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

{/* Page padding reduces on mobile */}
{/* PageContainer handles this: px-4 sm:px-6 lg:px-8 */}
```

### Mobile-Specific Rules

1. **Touch targets:** Minimum 44x44px for all interactive elements on mobile
2. **No hover-dependent UI:** Anything revealed on hover must also be accessible via tap/menu
3. **No horizontal scroll:** Content must fit within viewport width. If a table can't fit, switch to card view
4. **Bottom-anchored actions:** Primary action buttons should be easily reachable (near bottom of viewport)
5. **Collapsible sections:** Long detail pages should use collapsible sections on mobile
6. **Font sizes:** Never smaller than 12px on mobile. Body text should be 14px minimum
7. **Padding:** Use `px-4` on mobile (not `px-2` — too cramped; not `px-6` — wastes space)
8. **Modals on mobile:** Use full-screen sheets (`Sheet`) instead of centered dialogs on small screens
9. **Toolbars:** Search and filters should collapse into a filter sheet/dropdown on mobile

### Mobile Detection Pattern

```tsx
import { useMediaQuery } from "@/hooks/use-media-query";

function MyPage() {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");

  return (
    <UnifiedTablePage
      toolbar={{
        currentView: isMobile ? "card" : "table",
        // ...
      }}
      views={{
        card: isMobile ? (item) => <MobileCard item={item} /> : undefined,
      }}
    />
  );
}
```

---

## 12. Loading & Error States

### Loading

```tsx
{/* Table loading — UnifiedTablePage handles this automatically */}
<UnifiedTablePage data={{ items: [], isLoading: true }} />

{/* Page-level loading */}
<PageContainer>
  <div className="space-y-4">
    <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
    <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
  </div>
</PageContainer>

{/* Inline loading */}
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Loader2 className="h-4 w-4 animate-spin" />
  Loading...
</div>
```

### Error

```tsx
{/* Page-level error */}
<PageContainer>
  <EmptyState
    icon={<AlertCircle className="h-6 w-6 text-destructive" />}
    title="Something went wrong"
    description="We couldn't load this data. Please try again."
    action={{ label: "Retry", onClick: refetch }}
  />
</PageContainer>
```

### Empty

Always use `EmptyState` component. NEVER show just "No data" text.

---

## 13. Interactions & Animations

### Transitions

```
hover states:     transition-colors (150ms default)
panel open/close: duration-200 ease-out
toast appearance:  duration-300 ease-out
loading skeleton: animate-pulse
spinner:          animate-spin
```

### Hover States

```tsx
{/* Row hover */}
className="transition-colors hover:bg-muted"

{/* Link hover */}
className="text-muted-foreground transition-colors hover:text-foreground"

{/* Button hover — handled by Button component variants */}
```

### Focus States

Every interactive element needs `focus-visible` styling. The shadcn components handle this. If building custom interactive elements:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

---

## 14. Anti-Patterns — NEVER Do These

| Anti-Pattern | What To Do Instead |
|--------------|-------------------|
| Card wrapping every section | Use whitespace (`space-y-8`) between sections |
| Card inside a card | Flatten the hierarchy — one level of containment max |
| Borders between page sections | `space-y-8` or `space-y-10` |
| `shadow-md` or larger | `shadow-sm` max, or no shadow |
| `font-bold` on body text | `font-medium` or `font-semibold` only where needed |
| Decorative icons with no meaning | Remove them |
| "Coming soon" text in a card | `EmptyState` component |
| Generic `[id]` route params | Specific: `[projectId]`, `[contractId]` |
| Hardcoded hex colors | Semantic tokens only |
| `bg-gray-*`, `text-gray-*` | `bg-muted`, `text-muted-foreground` |
| Arbitrary spacing (`p-5`, `gap-7`) | 8px grid only |
| Tables on mobile without card view | Always provide `views.card` |
| Hover-only actions | Must also work via tap/menu on mobile |
| Horizontal scroll on mobile | Restructure content to fit |
| Status colors for decoration | Status colors for status only |
| Multiple action buttons in header | ONE primary action; rest in toolbar |
| Raw `<button>` elements | `<Button>` component always |
| Raw `<h2>`, `<h3>` tags | `SectionHeader` or appropriate component |
| `text-xs` for body content | `text-sm` minimum for readable text |
| Non-functional buttons/controls | Remove them entirely |

---

## 15. Decision Flowchart

**"What component should I use?"**

```
Need to display a list of entities?
  → UnifiedTablePage (Type A)

Need a create/edit form?
  → ProjectFormPageLayout + FormSection (Type B)

Need to show details of one entity?
  → PageHeader + PageContainer + SectionHeader sections (Type C)

Need a dashboard/overview?
  → PageHeader + PageContainer + KpiRow + sections (Type D)

Need to show status?
  → StatusBadge (in badges/tags)
  → StatusDot (in table cells, minimal)
  → StatusText (plain text, no color)

Need metrics/KPIs?
  → KpiRow (row of metrics)
  → KpiBlock (single metric)

Need an empty state?
  → EmptyState component (with icon, title, description, action)

Need a section title?
  → SectionHeader (with optional count and action)

Need a label above grouped content?
  → Eyebrow component

Need to wrap form content?
  → FormSection (with title + description, handles borders)

Need a modal?
  → Dialog (small confirmations)
  → Sheet (large forms, detail panels)
```

---

*This is the standard. Every pixel follows these rules. No exceptions.*
