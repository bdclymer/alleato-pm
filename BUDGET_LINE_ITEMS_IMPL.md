# Implementation Brief: Add Budget Line Items Modal
## For Claude Code — Read Before Writing Any Code

---

## 1. DISCOVERY FIRST — NO EXCEPTIONS

Before writing a single line, run these commands and read the output:

```bash
# Find all UI primitives
ls src/components/ui/

# Confirm which form components exist
grep -rl "export" src/components/ui/ | xargs grep -l "Input\|Select\|Checkbox\|Dialog\|Button"

# Find existing modal/dialog patterns in the codebase
grep -rl "Dialog\|Modal\|Sheet" src/components/ --include="*.tsx" | head -20

# Find existing line-item or table-row patterns (invoices, budgets, cost codes)
grep -rl "line.item\|lineItem\|LineItem\|budget" src/ --include="*.tsx" | head -20

# Find how currency/number inputs are currently handled
grep -rl "currency\|unitCost\|unit_cost\|formatCurrency" src/ --include="*.tsx" | head -10
```

**You are not allowed to create a custom Input, Select, Button, Checkbox, or Dialog component if one already exists in `src/components/ui/`. Use what is there.**

---

## 2. COMPONENT MAPPING

The reference design (`BudgetLineItems.jsx`) contains hand-rolled versions of primitives that must be replaced with the project's actual components. Map them as follows before implementing:

| Reference Design Element | Replace With |
|---|---|
| `.code-select` / `.uom-select` (custom dropdown) | `<Select>` + `<SelectTrigger>` + `<SelectContent>` from `components/ui/select` |
| `.field-input` (custom styled input) | `<Input>` from `components/ui/input` |
| `.custom-checkbox` (hand-rolled checkbox) | `<Checkbox>` from `components/ui/checkbox` |
| `.btn-create` / `.btn-cancel` (custom buttons) | `<Button>` with correct `variant=` prop from `components/ui/button` |
| Modal wrapper + backdrop | `<Dialog>` + `<DialogContent>` from `components/ui/dialog` (or `<Sheet>` if side-panel) |
| Currency input wrapper | Check for existing `CurrencyInput` or `<Input>` with `type="text"` + formatting |

**If you cannot find the component:** use the shadcn/ui primitive directly. Do not write a custom version.

---

## 3. RESPONSIVE LAYOUT PATTERN

The design uses **two parallel render paths** — one for desktop (table row), one for mobile (card). This is intentional and must be preserved exactly.

```tsx
{/* Desktop: hidden on mobile */}
<div className="hidden sm:grid ...">
  {/* 6-column grid row */}
</div>

{/* Mobile: hidden on desktop */}
<div className="sm:hidden ...">
  {/* Card layout */}
</div>
```

**Breakpoint:** `sm` (640px) is the switch point — below this, show cards; above, show the table row.

**Mobile card field layout (two-column grid):**
```
[ Budget Code — full width        ]
[ Qty          ] [ UOM            ]
[ Unit Cost    ] [ Amount (read)  ]
```

Amount is **read-only computed** (`qty × unitCost`). Render it as a styled div, not an `<Input>`.

---

## 4. STYLING RULES

### Use Tailwind utilities. No custom CSS classes. No inline `style={}` objects.

```tsx
// ✅ Correct
<div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/40">

// ❌ Wrong — custom class
<div className="line-item-card">

// ❌ Wrong — inline style
<div style={{ background: "#fafafa", borderRadius: 12 }}>
```

### Color tokens — use CSS variables, not hardcoded hex:
```tsx
// ✅
className="text-muted-foreground border-border bg-background"

// ❌
className="text-gray-400" // or style={{ color: "#888" }}
```

### Spacing — use the project's existing scale. Check `tailwind.config.ts` for custom values before using arbitrary `[]` values.

---

## 5. FORM STATE MANAGEMENT

Use `react-hook-form` if it's already in the project (check `package.json`). If yes:

```tsx
const form = useForm<BudgetLineItemsFormValues>({
  defaultValues: { items: [{ budgetCode: "", qty: 1, uom: "", unitCost: 0 }] }
})
const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
```

If `react-hook-form` is **not** in the project, use local `useState` with a typed items array. Do not introduce a new form library just for this component.

**Types to define:**
```ts
interface LineItem {
  id: string
  budgetCode: string
  qty: number
  uom: string
  unitCost: number
}

interface AddBudgetLineItemsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (items: LineItem[]) => void
  projectId: string
}
```

---

## 6. BUDGET CODE SELECTOR

The budget code field is a **searchable combobox**, not a plain `<Select>`. Check for:

```bash
grep -rl "Combobox\|combobox\|CommandInput\|cmdk" src/components/ --include="*.tsx"
```

If a `Combobox` component exists → use it.  
If not → use shadcn's `<Command>` + `<CommandInput>` + `<Popover>` pattern. Do not build a custom dropdown from scratch.

Budget codes should come from a prop or a data-fetching hook — **do not hardcode** the list. Check for an existing `useBudgetCodes()` hook or similar before creating one.

---

## 7. CURRENCY INPUT

Check for an existing currency formatting utility:

```bash
grep -rl "formatCurrency\|Intl.NumberFormat\|toCurrency" src/lib/ src/utils/ --include="*.ts"
```

If found → import and use it.  
If not → use this pattern and add it to the shared utils file:

```ts
// src/lib/format.ts (add to existing file or create)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export function parseCurrencyInput(str: string): number {
  const n = parseFloat(str.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? 0 : n
}
```

---

## 8. WHAT NOT TO DO

```
❌ Do not write a custom <Modal> component — use the existing <Dialog>
❌ Do not use arbitrary Tailwind values like w-[372px] — use semantic tokens
❌ Do not create a new CSS file for this component
❌ Do not use shadow-lg / shadow-xl on inner elements
❌ Do not nest cards inside cards (the mobile card is the card — no inner cards)
❌ Do not use z-index values above 50 without checking the existing z-index scale
❌ Do not claim the task is complete without verifying in the browser at both mobile (375px) and desktop (1280px) viewport widths
```

---

## 9. VERIFICATION CHECKLIST

Before marking complete:

- [ ] Opens and closes correctly via Dialog open/onOpenChange
- [ ] Desktop layout: 6-column grid at ≥640px — all columns visible, no overflow
- [ ] Mobile layout: card-per-item at <640px — no horizontal scroll
- [ ] "Add Line Item" appends a new row/card
- [ ] Remove button hides when only 1 item remains
- [ ] Amount column auto-calculates (qty × unitCost) on input change
- [ ] Total reflects sum of all line item amounts
- [ ] "Copy UOM to new rows" checkbox propagates UOM when adding new items
- [ ] Budget code combobox is searchable and keyboard navigable
- [ ] "Create N Line Items" button label reflects current item count
- [ ] All inputs accessible via keyboard tab order
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors

---

## 10. FILE PLACEMENT

```
src/
  components/
    budget/
      AddBudgetLineItemsModal.tsx   ← main component
      AddBudgetLineItemsModal.test.tsx (if tests exist in project)
  lib/
    format.ts                        ← add formatCurrency here if not already present
```

Check where similar feature-specific modals live in the project before placing the file.
