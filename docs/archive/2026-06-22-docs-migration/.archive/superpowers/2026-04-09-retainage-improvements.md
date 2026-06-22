# Retainage Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four highest-priority gaps between our retainage implementation and Procore's, identified in `docs/reports/procore-retainage-gap-analysis.md`.

**Architecture:** Five focused tasks, each independently deployable. Tasks 1–2 are UI/API changes to existing files. Tasks 3–5 expand `InvoiceG703Detail` with new input modes and bulk actions. No DB migrations required — all columns we write to already exist.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (via existing route handlers), shadcn/ui, React Hook Form, Zod, Tailwind (semantic tokens only).

---

## File Map

| File | Task(s) | What changes |
|------|---------|--------------|
| `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx` | 1 | Remove read-only toast from Create > Invoice |
| `frontend/src/components/commitments/tabs/InvoicesTab.tsx` | 1 | Remove "Read-only view" label |
| `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx` | 2, 5 | Add $ input for retainage; "Release All Retainage" button |
| `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts` | 2 | Add `retainage_amount` to ALLOWED_UPDATE_FIELDS |
| `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx` | 3, 4 | $ inputs for retainage; Set/Release bulk buttons |

---

## Task 1: Remove Commitment Invoices Read-Only Gate

**Files:**
- Modify: `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:741-750`
- Modify: `frontend/src/components/commitments/tabs/InvoicesTab.tsx` (the `<Text size="sm" tone="muted">Read-only view</Text>` in CardHeader)

### Context
The Create > Invoice dropdown item shows a dismissive toast saying retainage billing is read-only. The `InvoicesTab` component also shows a "Read-only view" label. Both are vestigial — the tab already shows useful retainage summary data. Remove the gate without changing any underlying behavior.

- [ ] **Step 1: Remove the toast from the Create > Invoice dropdown**

In `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx`, find lines 741–750 and replace:

```tsx
<DropdownMenuItem
  onClick={() => {
    setActiveTab("invoices");
    toast.info(
      "Commitment retainage billing is available as a read-only summary right now.",
    );
  }}
>
  <Receipt className="mr-2 h-4 w-4" />
  Invoice
</DropdownMenuItem>
```

with:

```tsx
<DropdownMenuItem
  onClick={() => {
    setActiveTab("invoices");
  }}
>
  <Receipt className="mr-2 h-4 w-4" />
  Invoice
</DropdownMenuItem>
```

- [ ] **Step 2: Remove "Read-only view" label from InvoicesTab**

In `frontend/src/components/commitments/tabs/InvoicesTab.tsx`, find the `<CardHeader>` section that renders the "Read-only view" text and remove that element:

```tsx
// REMOVE this element entirely:
<Text size="sm" tone="muted">
  Read-only view
</Text>
```

The `<div className="flex items-start justify-between gap-4">` wrapper can revert to a non-flex div or just lose the child, depending on what remains. If only the `<div className="space-y-1">` with CardTitle/CardDescription remains, simplify:

```tsx
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    <Receipt className="h-5 w-5" />
    Retainage Billing Summary
  </CardTitle>
  <CardDescription>
    Gross billing, retainage held, and the remaining balance for this commitment
  </CardDescription>
</CardHeader>
```

- [ ] **Step 3: Verify in browser**

Navigate to any commitment detail page → click Create → Invoice. Confirm no toast appears and the Invoices tab renders correctly with no "Read-only view" text.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/\(main\)/\[projectId\]/commitments/\[commitmentId\]/page.tsx src/components/commitments/tabs/InvoicesTab.tsx
git commit -m "fix(retainage): remove read-only gate from commitment invoices tab"
```

---

## Task 2: Dollar-Amount Input for Retainage on Owner Invoice SOV

**Files:**
- Modify: `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`
- Modify: `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts`

### Context
The owner invoice SOV currently has "Retainage %" as editable and "Retainage $" as a read-only computed display. Procore lets users enter either a dollar amount or a percentage — entering one auto-calculates the other. We also need to persist the dollar amount to the DB (`retainage_amount` column already exists but is never written).

### Sub-task A: Persist `retainage_amount` via the API

- [ ] **Step 1: Add `retainage_amount` to ALLOWED_UPDATE_FIELDS**

In `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts`, find the `ALLOWED_UPDATE_FIELDS` constant at line ~177 and add `retainage_amount`:

```ts
const ALLOWED_UPDATE_FIELDS = [
  "work_completed_period",
  "materials_stored",
  "retainage_pct",
  "retainage_amount",
  "retainage_released",
] as const;
```

- [ ] **Step 2: Run the existing test to confirm it still passes**

```bash
cd frontend && npx jest --testPathPattern="line-items" --passWithNoTests
```

Expected: PASS (or no tests found — acceptable, no new tests needed for this trivial whitelist addition)

### Sub-task B: Add dual $ / % input in the SOV table

- [ ] **Step 3: Add `retainage_amount` to `SovDraft` type**

In `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`, update the `SovDraft` interface:

```ts
interface SovDraft {
  work_completed_period: number;
  materials_stored: number;
  retainage_pct: number;
  retainage_amount: number;   // ← add this
  retainage_released: number;
}
```

- [ ] **Step 4: Update `calcRetainageAmount` to use draft override**

The function currently computes `wcp * (pct / 100)`. Update it to prefer an explicit `retainage_amount` override when present:

```ts
function calcRetainageAmount(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  // If a dollar amount override exists, use it directly
  if (overrides.retainage_amount !== undefined) return overrides.retainage_amount;
  const wcp = overrides.work_completed_period ?? item.work_completed_period;
  const pct = overrides.retainage_pct ?? item.retainage_pct;
  return wcp * (pct / 100);
}
```

- [ ] **Step 5: Add dual-input handling to `SovTable`**

The SOV table renders the retainage cells in two columns: "Retainage %" (editable) and "Retainage $" (read-only). Replace the "Retainage $" read-only cell with an editable `EditableCell`. When the user changes `retainage_amount`, back-calculate and also update `retainage_pct`. When the user changes `retainage_pct`, also update `retainage_amount`.

This requires `onDraftChange` to be able to set two fields at once. Change `SovTableProps` and add a `onDraftChanges` (plural) helper, or pass two callbacks. The simplest approach: accept the `draftMap` setter directly by adding a `setDraftMap` prop.

Instead of changing the prop interface, add a local callback wrapper in `SovTable` that fires two changes when either field changes:

In `SovTable`, change the Retainage % cell so it also fires an `retainage_amount` update:

```tsx
{/* Editable: Retainage % */}
<TableCell className="text-right">
  {editable ? (
    <EditableCell
      value={overrides.retainage_pct ?? item.retainage_pct}
      onChange={(pct) => {
        const wcp = overrides.work_completed_period ?? item.work_completed_period;
        onDraftChange(item.id, "retainage_pct", pct);
        onDraftChange(item.id, "retainage_amount", wcp * (pct / 100));
      }}
      suffix="%"
      max={100}
      step={0.1}
    />
  ) : (
    <span className="tabular-nums text-sm">
      {(item.retainage_pct ?? 0).toFixed(2)}%
    </span>
  )}
</TableCell>

{/* Editable: Retainage $ */}
<TableCell className="text-right">
  {editable ? (
    <EditableCell
      value={overrides.retainage_amount ?? retainageAmt}
      onChange={(amt) => {
        const wcp = overrides.work_completed_period ?? item.work_completed_period;
        onDraftChange(item.id, "retainage_amount", amt);
        onDraftChange(item.id, "retainage_pct", wcp > 0 ? (amt / wcp) * 100 : 0);
      }}
      prefix="$"
    />
  ) : (
    <span className="tabular-nums text-sm">{formatCurrency(retainageAmt)}</span>
  )}
</TableCell>
```

Note: `retainageAmt` is already computed above the cell render via `calcRetainageAmount`. Both columns update each other on change.

- [ ] **Step 6: Add `retainage_amount` to the SOV save payload**

Find `handleSaveSOV` (around line 830–890). The payload passed to the PATCH API already iterates `sovDraft`. Confirm `retainage_amount` flows through because the draft stores it:

```ts
// In the save handler, the update array includes all SovDraft fields present in the draft.
// Since retainage_amount is now part of SovDraft, it will be included automatically.
// Verify the fetch body construction includes it.
```

If the save handler manually picks fields, add `retainage_amount`:

```ts
const update: Record<string, number> = { id: item.id };
if (draft.work_completed_period !== undefined) update.work_completed_period = draft.work_completed_period;
if (draft.materials_stored !== undefined) update.materials_stored = draft.materials_stored;
if (draft.retainage_pct !== undefined) update.retainage_pct = draft.retainage_pct;
if (draft.retainage_amount !== undefined) update.retainage_amount = draft.retainage_amount;
if (draft.retainage_released !== undefined) update.retainage_released = draft.retainage_released;
```

- [ ] **Step 7: Verify in browser**

Navigate to an owner invoice in draft status. Confirm:
1. "Retainage %" field is editable and typing a % updates the $ field in real time.
2. "Retainage $" field is now editable and typing a $ updates the % field in real time.
3. Save — reload the page — both values persist correctly.

- [ ] **Step 8: Commit**

```bash
cd frontend && git add \
  src/app/\(main\)/\[projectId\]/invoicing/\[invoiceId\]/page.tsx \
  src/app/api/projects/\[projectId\]/invoicing/owner/\[invoiceId\]/line-items/route.ts
git commit -m "feat(retainage): add dollar-amount input for owner invoice SOV retainage with % auto-calc"
```

---

## Task 3: Dollar-Amount Inputs for Retainage in InvoiceG703Detail

**Files:**
- Modify: `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx`

### Context
`InvoiceG703Detail` (prime contract payment applications / AIA G703) currently shows `retainage_this_period_work_pct` and `retainage_this_period_materials_pct` as editable percentages. The dollar amounts (`retainage_this_period_work` and `retainage_this_period_materials`) are computed and not editable. Procore allows entering either $ or %. Add $ inputs that auto-calc % and vice versa.

- [ ] **Step 1: Add dollar fields to `EditableValues`**

```ts
interface EditableValues {
  [id: string]: {
    work_completed_this_period: number;
    materials_stored: number;
    retainage_this_period_work_pct: number;
    retainage_this_period_work: number;        // ← add
    retainage_this_period_materials_pct: number;
    retainage_this_period_materials: number;   // ← add
    retainage_released_work: number;
    retainage_released_materials: number;
  };
}
```

- [ ] **Step 2: Seed dollar values in `handleEdit`**

```ts
const handleEdit = useCallback(() => {
  const values: EditableValues = {};
  for (const li of lineItems) {
    values[li.id] = {
      work_completed_this_period: li.work_completed_this_period,
      materials_stored: li.materials_stored,
      retainage_this_period_work_pct: li.retainage_this_period_work_pct,
      retainage_this_period_work: li.retainage_this_period_work,        // ← add
      retainage_this_period_materials_pct: li.retainage_this_period_materials_pct,
      retainage_this_period_materials: li.retainage_this_period_materials, // ← add
      retainage_released_work: li.retainage_released_work,
      retainage_released_materials: li.retainage_released_materials,
    };
  }
  setEditValues(values);
  setIsEditing(true);
}, [lineItems]);
```

- [ ] **Step 3: Update `handleValueChange` to sync $ ↔ %**

Replace the single-field setter with one that also syncs the paired field:

```ts
const handleValueChange = useCallback(
  (id: string, field: keyof EditableValues[string], rawValue: string) => {
    const numValue = Number.parseFloat(rawValue);
    const val = Number.isNaN(numValue) ? 0 : numValue;

    setEditValues((prev) => {
      const current = prev[id] ?? {};
      const updated: EditableValues[string] = { ...current, [field]: val };

      // Work retainage $ ↔ %
      if (field === "retainage_this_period_work_pct") {
        const work = current.work_completed_this_period ?? 0;
        updated.retainage_this_period_work = roundCurrency(work * (val / 100));
      } else if (field === "retainage_this_period_work") {
        const work = current.work_completed_this_period ?? 0;
        updated.retainage_this_period_work_pct = work > 0 ? (val / work) * 100 : 0;
      }

      // Materials retainage $ ↔ %
      if (field === "retainage_this_period_materials_pct") {
        const mats = current.materials_stored ?? 0;
        updated.retainage_this_period_materials = roundCurrency(mats * (val / 100));
      } else if (field === "retainage_this_period_materials") {
        const mats = current.materials_stored ?? 0;
        updated.retainage_this_period_materials_pct = mats > 0 ? (val / mats) * 100 : 0;
      }

      return { ...prev, [id]: updated };
    });
  },
  [],
);
```

- [ ] **Step 4: Add $ inputs alongside % inputs in the edit cell**

In the `isEditing` retainage cell (around line 354–433), add a `$` input beneath each `%` input:

```tsx
{/* Work Retainage */}
<div className="grid grid-cols-[56px_1fr] items-center gap-2">
  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Work %</span>
  <Input
    type="number"
    className="h-7 text-right text-sm"
    disabled={!canEditRetainage}
    value={editValues[li.id]?.retainage_this_period_work_pct ?? 0}
    onChange={(e) => handleValueChange(li.id, "retainage_this_period_work_pct", e.target.value)}
  />
</div>
<div className="grid grid-cols-[56px_1fr] items-center gap-2">
  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Work $</span>
  <Input
    type="number"
    className="h-7 text-right text-sm"
    disabled={!canEditRetainage}
    value={editValues[li.id]?.retainage_this_period_work ?? 0}
    onChange={(e) => handleValueChange(li.id, "retainage_this_period_work", e.target.value)}
  />
</div>

{/* Materials Retainage */}
<div className="grid grid-cols-[56px_1fr] items-center gap-2">
  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Mat %</span>
  <Input
    type="number"
    className="h-7 text-right text-sm"
    disabled={!canEditRetainage}
    value={editValues[li.id]?.retainage_this_period_materials_pct ?? 0}
    onChange={(e) => handleValueChange(li.id, "retainage_this_period_materials_pct", e.target.value)}
  />
</div>
<div className="grid grid-cols-[56px_1fr] items-center gap-2">
  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Mat $</span>
  <Input
    type="number"
    className="h-7 text-right text-sm"
    disabled={!canEditRetainage}
    value={editValues[li.id]?.retainage_this_period_materials ?? 0}
    onChange={(e) => handleValueChange(li.id, "retainage_this_period_materials", e.target.value)}
  />
</div>
```

- [ ] **Step 5: Verify in browser**

Navigate to a prime contract → Invoices → open a payment application → Detail tab → Edit. Confirm:
1. Entering a Work % auto-updates the Work $ field.
2. Entering a Work $ auto-updates the Work % field.
3. Same for Materials fields.
4. "Current Retained" total updates correctly as you type.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/domain/invoices/InvoiceG703Detail.tsx
git commit -m "feat(retainage): add dollar-amount inputs for G703 retainage with % auto-calculation"
```

---

## Task 4: Set/Release Bulk Action Buttons in InvoiceG703Detail

**Files:**
- Modify: `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx`

### Context
Procore's Prime Contracts invoice has explicit "Set" (apply a % to all line items at once) and "Release" (fill in release amounts) buttons. We need both as distinct bulk actions, visible when the form is not yet in line-item edit mode.

- [ ] **Step 1: Add `SetRetainageDialog` inside the component file**

Add a self-contained dialog component above `InvoiceG703Detail`. It accepts a `onApply(pct: number)` callback:

```tsx
interface SetRetainageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (workPct: number, materialsPct: number) => void;
}

function SetRetainageDialog({ open, onOpenChange, onApply }: SetRetainageDialogProps) {
  const [workPct, setWorkPct] = useState("10");
  const [materialsPct, setMaterialsPct] = useState("10");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Retainage on All Line Items</DialogTitle>
          <DialogDescription>
            Enter percentages to apply to every line item's work completed and materials stored amounts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-work-pct">Work Completed Retainage (%)</Label>
            <Input
              id="set-work-pct"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={workPct}
              onChange={(e) => setWorkPct(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-mat-pct">Materials Stored Retainage (%)</Label>
            <Input
              id="set-mat-pct"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={materialsPct}
              onChange={(e) => setMaterialsPct(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            onApply(parseFloat(workPct) || 0, parseFloat(materialsPct) || 0);
            onOpenChange(false);
          }}>
            Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Add the missing imports at the top of `InvoiceG703Detail.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
```

- [ ] **Step 2: Add dialog state and handlers to `InvoiceG703Detail`**

Inside `InvoiceG703Detail`, add:

```tsx
const [setRetainageOpen, setSetRetainageOpen] = useState(false);

const handleSetRetainage = useCallback((workPct: number, materialsPct: number) => {
  // Enter edit mode and apply the percentage to all line items
  const values: EditableValues = {};
  for (const li of lineItems) {
    const work = li.work_completed_this_period;
    const mats = li.materials_stored;
    values[li.id] = {
      work_completed_this_period: work,
      materials_stored: mats,
      retainage_this_period_work_pct: workPct,
      retainage_this_period_work: roundCurrency(work * (workPct / 100)),
      retainage_this_period_materials_pct: materialsPct,
      retainage_this_period_materials: roundCurrency(mats * (materialsPct / 100)),
      retainage_released_work: li.retainage_released_work,
      retainage_released_materials: li.retainage_released_materials,
    };
  }
  setEditValues(values);
  setIsEditing(true);
}, [lineItems]);

const handleReleaseAllRetainage = useCallback(() => {
  // Enter edit mode and fill release amounts equal to all currently-held retainage
  const values: EditableValues = {};
  for (const li of lineItems) {
    const effective = getEffectiveValues(li);
    values[li.id] = {
      work_completed_this_period: li.work_completed_this_period,
      materials_stored: li.materials_stored,
      retainage_this_period_work_pct: li.retainage_this_period_work_pct,
      retainage_this_period_work: li.retainage_this_period_work,
      retainage_this_period_materials_pct: li.retainage_this_period_materials_pct,
      retainage_this_period_materials: li.retainage_this_period_materials,
      // Release the full currently-retained amount
      retainage_released_work: li.retainage_previous_work + li.retainage_this_period_work,
      retainage_released_materials: li.retainage_previous_materials + li.retainage_this_period_materials,
    };
  }
  setEditValues(values);
  setIsEditing(true);
}, [lineItems, getEffectiveValues]);
```

- [ ] **Step 3: Render Set/Release buttons in the toolbar**

In the component's toolbar (the `<div className="flex items-center justify-between gap-4">` at the top of the returned JSX), add Set and Release buttons shown when not read-only and not already editing:

```tsx
{!isReadOnly ? (
  <div className="flex items-center gap-1.5">
    {isEditing ? (
      <>
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Check className="mr-1 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </>
    ) : (
      <>
        <Button variant="outline" size="sm" onClick={() => setSetRetainageOpen(true)}>
          Set Retainage
        </Button>
        <Button variant="outline" size="sm" onClick={handleReleaseAllRetainage}>
          Release All
        </Button>
        <Button variant="ghost" size="sm" onClick={handleEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      </>
    )}
  </div>
) : null}

<SetRetainageDialog
  open={setRetainageOpen}
  onOpenChange={setSetRetainageOpen}
  onApply={handleSetRetainage}
/>
```

- [ ] **Step 4: Verify in browser**

Navigate to a prime contract → Invoices → open a payment application → Detail tab. Confirm:
1. "Set Retainage" button opens a dialog with Work % and Materials % inputs; clicking Set pre-fills all line items in edit mode.
2. "Release All" button enters edit mode with all `retainage_released_work`/`_materials` pre-filled to the full currently-retained amount.
3. Save works correctly after both operations.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/domain/invoices/InvoiceG703Detail.tsx
git commit -m "feat(retainage): add Set Retainage and Release All bulk action buttons to G703 detail"
```

---

## Task 5: "Release All Retainage" Shortcut on Owner Invoice SOV

**Files:**
- Modify: `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`

### Context
The owner invoice SOV (used for subcontractor-submitted invoices) needs a "Release All Retainage" button matching Procore's retainage release invoice flow. This button pre-fills `retainage_released` for every line item to equal the stored `retainage_amount`, enabling a one-click release of all withheld retainage on a draft invoice.

- [ ] **Step 1: Add `handleReleaseAllRetainage` to the page**

In `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`, add this handler alongside the other draft SOV handlers (near `handleDraftChange`, `handleSaveSOV`, `handleDiscardSOV`):

```ts
const handleReleaseAllRetainage = useCallback(() => {
  setSovDraft((prev) => {
    const next: SovDraftMap = { ...prev };
    for (const item of lineItems) {
      const existingOverrides = prev[item.id] ?? {};
      const retainageHeld = existingOverrides.retainage_amount ?? item.retainage_amount ?? 0;
      next[item.id] = {
        ...existingOverrides,
        retainage_released: retainageHeld,
      };
    }
    return next;
  });
}, [lineItems]);
```

- [ ] **Step 2: Add the button to the SOV CardHeader**

In the SOV card header (around line 1228–1270 in the page), add the "Release All Retainage" button alongside the existing Save/Discard/Add buttons, visible only when the invoice is editable:

```tsx
{invoiceEditable && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleReleaseAllRetainage}
    title="Pre-fills retainage released = retainage held for all line items"
  >
    Release All Retainage
  </Button>
)}
```

Place this before the "Add Line Item" button so the order reads: Discard | Save | Release All Retainage | Add Line Item.

- [ ] **Step 3: Verify in browser**

On a draft owner invoice with SOV line items that have non-zero retainage amounts:
1. Click "Release All Retainage".
2. Confirm every line item's "Retainage Released" field is pre-filled with its retainage amount.
3. Save the invoice.
4. Reload and confirm the values persisted.

- [ ] **Step 4: Confirm total summary reflects the release**

The Invoice Totals card at the bottom of the page shows `retainageAmount`. After releasing all retainage, this should show $0 net retainage (or the released amount is reflected in Net This Period).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/app/\(main\)/\[projectId\]/invoicing/\[invoiceId\]/page.tsx
git commit -m "feat(retainage): add Release All Retainage button to owner invoice SOV"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Gap 1 (commitment read-only gate) → Task 1
- [x] Gap 3 ($ entry for retainage) → Tasks 2 and 3
- [x] Gap 5 (prime contract Set/Release buttons) → Task 4
- [x] Gap 4 (retainage release invoice flow) → Task 5 (simplified: bulk release on existing invoice)

**Intentionally deferred:**
- Gap 2 (Total Retainage running balance column) — requires cross-invoice aggregation; no DB column stores cumulative retainage across all periods. Deferred to a future migration + API change.
- Gap 6 (sliding scale retention) — medium priority, not in scope.

**Placeholder scan:** No TBDs, no "implement later". All steps have concrete code.

**Type consistency:**
- `retainage_amount` added to `SovDraft` in Task 2 is the same field added to `ALLOWED_UPDATE_FIELDS` in Task 2 API change.
- `retainage_this_period_work` and `retainage_this_period_materials` added to `EditableValues` in Task 3 are already on `PaymentApplicationLineItem` type (confirmed in `types.ts`).
- `handleReleaseAllRetainage` in Task 5 reads `item.retainage_amount` — confirmed present in `database.types.ts` `owner_invoice_line_items`.
