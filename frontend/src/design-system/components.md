# Component Usage Guide

This document tells you which component to use for every situation. No guessing.

## Decision Trees

### "I need a page layout"

```
→ Use ProjectPageHeader + PageContainer
  → What type of page? See page-archetypes.md
  → NEVER build a custom layout
```

### "I need a button"

```
→ Import { Button } from "@/components/ui/button"
  → Primary action?     → variant="default"
  → Secondary action?   → variant="outline"
  → Danger action?      → variant="destructive"
  → Subtle/text action? → variant="ghost"
  → Navigation link?    → variant="link"
  → Small context?      → size="sm"
  → Icon only?          → size="icon"
```

### "I need a form input"

```
→ Text input:     { Input } from "@/components/ui/input"
→ Long text:      { Textarea } from "@/components/ui/textarea"
→ Dropdown:       { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"
→ Checkbox:       { Checkbox } from "@/components/ui/checkbox"
→ Toggle:         { Switch } from "@/components/ui/switch"
→ Date picker:    Native date input via Input type="date"
→ Number:         { Input } with type="number" or { NumberInput }
```

### "I need a form"

```
→ Always use react-hook-form + zod
→ Wrap in: { Form, FormField, FormItem, FormLabel, FormControl, FormMessage }
→ Container: { FormContainer } from "@/components/layout"
→ See page-archetypes.md for the full form template
```

### "I need a modal/dialog"

```
→ Confirmation dialog?  → { Modal, ModalContent } from "@/components/ui/unified-modal"
→ Side panel/detail?    → { Slideover, SlideoverContent } from "@/components/ui/unified-slideover"
→ DO NOT use raw Dialog or Sheet — use the unified versions
```

### "I need a table"

```
→ Simple static data?   → { Table, TableHeader, TableBody, TableRow, TableCell }
→ Sortable/filterable?  → Use DataTable pattern with TanStack Table
→ Complex grid?         → Use the established DataGrid pattern
→ NEVER use raw <table> HTML
```

### "I need navigation"

```
→ Page-level tabs?      → { PageTabs } from "@/components/layout"
→ Content tabs?         → { Tabs, TabsList, TabsTrigger, TabsContent }
→ Dropdown menu?        → { DropdownMenu } from "@/components/ui/dropdown-menu"
→ Command palette?      → { Command } from "@/components/ui/command"
```

### "I need feedback/status"

```
→ Toast notification?   → toast() from "sonner"
→ Inline alert?         → { Alert } from "@/components/ui/alert"
→ Loading spinner?      → { Loader2 } from "lucide-react" with animate-spin
→ Skeleton loading?     → { Skeleton } from "@/components/ui/skeleton"
→ Badge/status?         → { Badge } from "@/components/ui/badge"
→ Progress?             → { Progress } from "@/components/ui/progress"
```

### "I need an overlay"

```
→ Modal dialog?         → Use unified-modal (see above)
→ Side panel?           → Use unified-slideover (see above)
→ Tooltip?              → { Tooltip } from "@/components/ui/tooltip"
→ Hover card?           → { HoverCard } from "@/components/ui/hover-card"
→ Popover?              → { Popover } from "@/components/ui/popover"
```

## Layout Components

| Component | Import | Purpose |
|-----------|--------|---------|
| `ProjectPageHeader` | `@/components/layout` | Page header with title, description, actions |
| `PageContainer` | `@/components/layout` | Page content wrapper with responsive padding |
| `FormContainer` | `@/components/layout` | Centered form wrapper with max-width |
| `PageToolbar` | `@/components/layout` | Toolbar row for filters and actions |
| `PageTabs` | `@/components/layout` | Tab navigation for page sections |

## Modal Sizes (unified-modal)

| Size | Width | Use Case |
|------|-------|----------|
| `xs` | 320px | Simple confirmation |
| `sm` | 425px | Small form, alert |
| `md` | 500px | Standard form (default) |
| `lg` | 640px | Larger form |
| `xl` | 780px | Complex content |
| `2xl`+ | 900px+ | Rare, very complex |

## Slideover Sizes (unified-slideover)

| Size | Width | Use Case |
|------|-------|----------|
| `sm` | 320px | Narrow detail panel |
| `md` | 448px | Standard detail (default) |
| `lg` | 576px | Form in side panel |
| `xl` | 700px | Complex edit panel |

## Banned Patterns

| Instead of... | Use... |
|---------------|--------|
| Raw `<button>` | `Button` from ui |
| Raw `<input>` | `Input` from ui |
| Raw `<select>` | `Select` from ui |
| Raw `<table>` | `Table` from ui |
| `Dialog` (raw shadcn) | `Modal` from unified-modal |
| `Sheet` (raw shadcn) | `Slideover` from unified-slideover |
| Custom page wrapper divs | `PageContainer` |
| Custom header components | `ProjectPageHeader` |
| `ProjectToolPage` | Deprecated — use `ProjectPageHeader` + `PageContainer` |
| `BudgetPageHeader` or similar | Remove — use `ProjectPageHeader` |

## Icons

All icons come from `lucide-react`. Standard sizes:

| Context | Size |
|---------|------|
| Inline with text | `h-4 w-4` |
| Button with text | `h-4 w-4` |
| Standalone icon button | `h-5 w-5` |
| Empty state illustration | `h-12 w-12` or larger |
