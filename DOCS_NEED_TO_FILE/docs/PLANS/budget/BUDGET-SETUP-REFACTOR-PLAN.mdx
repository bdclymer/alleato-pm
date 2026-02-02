# BUDGET SETUP PAGE REFACTOR PLAN

**File**: `frontend/src/app/[projectId]/budget/setup/page.tsx`

**Status**: CRITICAL VIOLATIONS - Requires Complete Refactor

**Started**: 2026-01-05

**Estimated Time**: 4-5 hours

---

## CURRENT VIOLATIONS

### Design System Violations Found

1. **❌ 100+ inline Tailwind classes** throughout the page
2. **❌ No layout primitives** (Stack, Inline, Container)
3. **❌ No typography components** (Heading, Text)
4. **❌ Hardcoded colors** (bg-white, bg-gray-50, text-gray-600, etc.)
5. **❌ Manual spacing** (mb-2, mb-4, py-3, px-4, gap-3, space-y-3)
6. **❌ Component logic in page file** (UomSelect, MobileLineItemCards)
7. **❌ Raw HTML elements** (h1, p, span) instead of components

### Specific Examples

```tsx
// ❌ WRONG - Lines 253-271
<div className="min-h-screen">
  <div className="border-b bg-white">
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold mb-2">Add Budget Line Items</h1>
      <p className="text-sm text-gray-600">Add new line items to your project budget</p>
    </div>
  </div>
</div>

// ✅ RIGHT - Should be:
<Container size="lg">
  <Stack gap="lg">
    <PageHeader
      title="Add Budget Line Items"
      description="Add new line items to your project budget"
      backTo={`/${projectId}/budget`}
      actions={<ActionButtons />}
    />
    <BudgetLineItemTable ... />
  </Stack>
</Container>
```

---

## REFACTOR STRATEGY

### Phase 1: Create Missing Components
Create these new components in proper locations:

1. **PageHeader** - Reusable page header with title, description, back button, actions
2. **BudgetLineItemTable** - Desktop table view
3. **BudgetLineItemCard** - Mobile card view
4. **BudgetLineItemRow** - Individual row component
5. **UomSelect** - Unit of measure selector

### Phase 2: Refactor Page File
Replace all inline styling with component composition.

### Phase 3: Testing & Validation
Ensure functionality is preserved and quality checks pass.

---

## DETAILED IMPLEMENTATION PLAN

## Step 1: Create PageHeader Component

**File**: `frontend/src/components/layout/PageHeader.tsx`

**Purpose**: Reusable header for all pages with back button, title, description, and actions.

**API**:
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}
```

**Design**:
- Uses Container, Stack, Inline primitives
- Uses Heading, Text components
- No hardcoded spacing/colors
- Responsive layout (actions hidden on mobile if needed)

**Replaces**: Lines 254-288 in page.tsx

**Estimated**: 45 minutes

---

## Step 2: Create UomSelect Component

**File**: `frontend/src/components/budget/UomSelect.tsx`

**Purpose**: Unit of measure selector (extracted from page.tsx)

**API**:
```tsx
interface UomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}
```

**Design**:
- Wraps existing Select component
- No inline styling
- Maps over UNITS_OF_MEASURE constant

**Replaces**: Lines 451-475 in page.tsx

**Estimated**: 15 minutes

---

## Step 3: Create BudgetLineItemRow Component

**File**: `frontend/src/components/budget/BudgetLineItemRow.tsx`

**Purpose**: Single row in budget line item table (desktop view)

**API**:
```tsx
interface BudgetLineItemRowProps {
  item: BudgetLineItem;
  projectCostCodes: ProjectCostCode[];
  isPopoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
  onBudgetCodeSelect: (costCode: ProjectCostCode) => void;
  onFieldChange: (field: keyof BudgetLineItem, value: string) => void;
  onRemove: () => void;
  onCreateNew: () => void;
  canRemove: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
```

**Design**:
- Uses Inline for horizontal layout
- No manual spacing classes
- Clean, focused component

**Replaces**: Lines 345-412 in page.tsx

**Estimated**: 60 minutes

---

## Step 4: Create BudgetLineItemCard Component

**File**: `frontend/src/components/budget/BudgetLineItemCard.tsx`

**Purpose**: Single card in mobile view

**API**:
```tsx
interface BudgetLineItemCardProps {
  item: BudgetLineItem;
  index: number;
  projectCostCodes: ProjectCostCode[];
  isPopoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
  onBudgetCodeSelect: (costCode: ProjectCostCode) => void;
  onFieldChange: (field: keyof BudgetLineItem, value: string) => void;
  onRemove: () => void;
  onCreateNew: () => void;
  canRemove: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
```

**Design**:
- Uses Stack for vertical layout
- Uses Inline for button groups
- Uses Heading, Text components
- No hardcoded spacing

**Replaces**: Lines 529-613 in page.tsx (MobileLineItemCards)

**Estimated**: 60 minutes

---

## Step 5: Create BudgetLineItemTable Component

**File**: `frontend/src/components/budget/BudgetLineItemTable.tsx`

**Purpose**: Main table component that renders desktop table and mobile cards

**API**:
```tsx
interface BudgetLineItemTableProps {
  lineItems: BudgetLineItem[];
  projectCostCodes: ProjectCostCode[];
  loadingData: boolean;
  openPopoverId: string | null;
  onPopoverOpenChange: (id: string, open: boolean) => void;
  onBudgetCodeSelect: (rowId: string, costCode: ProjectCostCode) => void;
  onFieldChange: (id: string, field: keyof BudgetLineItem, value: string) => void;
  onRemoveRow: (id: string) => void;
  onCreateNew: (rowId: string) => void;
  onAddRow: () => void;
  onSubmit: () => void;
  loading: boolean;
}
```

**Design**:
- Uses Card component
- Uses Stack for vertical layout
- Renders BudgetLineItemRow for desktop
- Renders BudgetLineItemCard for mobile
- Summary bar uses Inline with justify="between"
- No inline Tailwind classes

**Replaces**: Lines 292-438 in page.tsx

**Estimated**: 90 minutes

---

## Step 6: Refactor Page File

**File**: `frontend/src/app/[projectId]/budget/setup/page.tsx`

**Changes**:
1. Remove all inline component definitions (UomSelect, MobileLineItemCards)
2. Replace layout divs with Container, Stack, Inline
3. Replace header with PageHeader component
4. Replace table markup with BudgetLineItemTable component
5. Keep only business logic (state, handlers, API calls)

**After Refactor**:
```tsx
export default function BudgetSetupPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  // ... all state and logic remains ...

  return (
    <Container size="lg" as="main" className="min-h-screen">
      <Stack gap="lg">
        <PageHeader
          title="Add Budget Line Items"
          description="Add new line items to your project budget"
          backTo={`/${projectId}/budget`}
          backLabel="Back to Budget"
          actions={
            <Inline gap="sm" className="hidden sm:flex">
              <Button variant="outline" onClick={handleAddRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
              <Button onClick={handleSubmit} disabled={loading || lineItems.length === 0}>
                {loading
                  ? 'Creating...'
                  : `Create ${lineItems.length} Line Item${lineItems.length !== 1 ? 's' : ''}`}
              </Button>
            </Inline>
          }
        />

        <BudgetLineItemTable
          lineItems={lineItems}
          projectCostCodes={projectCostCodes}
          loadingData={loadingData}
          openPopoverId={openPopoverId}
          onPopoverOpenChange={(id, open) => setOpenPopoverId(open ? id : null)}
          onBudgetCodeSelect={handleBudgetCodeSelect}
          onFieldChange={handleFieldChange}
          onRemoveRow={handleRemoveRow}
          onCreateNew={(rowId) => {
            setPendingRowId(rowId);
            setOpenPopoverId(null);
            setShowCreateCodeModal(true);
          }}
          onAddRow={handleAddRow}
          onSubmit={handleSubmit}
          loading={loading}
        />

        <CreateBudgetCodeModal
          open={showCreateCodeModal}
          onOpenChange={setShowCreateCodeModal}
          projectId={projectId}
          onSuccess={handleCreateBudgetCodeSuccess}
        />
      </Stack>
    </Container>
  );
}
```

**Estimated**: 30 minutes

---

## Step 7: Quality Checks

**Required**:
```bash
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run quality --prefix frontend
```

**Manual Testing**:
1. Test desktop table view
2. Test mobile card view
3. Test adding rows
4. Test removing rows
5. Test budget code selection
6. Test creating new budget codes
7. Test form submission
8. Test validation errors

**Estimated**: 45 minutes

---

## TOTAL ESTIMATED TIME

| Phase | Time |
|-------|------|
| PageHeader component | 45 min |
| UomSelect component | 15 min |
| BudgetLineItemRow component | 60 min |
| BudgetLineItemCard component | 60 min |
| BudgetLineItemTable component | 90 min |
| Refactor page file | 30 min |
| Quality checks & testing | 45 min |
| **TOTAL** | **5.75 hours** |

---

## SUCCESS CRITERIA

### ✅ Design System Compliance

- [ ] Zero inline Tailwind classes in page.tsx (except single `min-h-screen` on Container)
- [ ] All spacing uses Stack, Inline, or component gaps
- [ ] All typography uses Heading, Text components
- [ ] All colors use design tokens (via ShadCN components)
- [ ] All layouts use Container, Card, Stack, Inline

### ✅ Code Quality

- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] All components have proper TypeScript types
- [ ] No `console.log` statements
- [ ] No `@ts-ignore` or `any` types

### ✅ Functionality Preserved

- [ ] Desktop table view works identically
- [ ] Mobile card view works identically
- [ ] All user interactions preserved
- [ ] Form validation works
- [ ] API submission works
- [ ] Navigation works

### ✅ Component Organization

- [ ] Components in correct directories
- [ ] No logic in page file beyond state/handlers
- [ ] Each component has single responsibility
- [ ] Components are reusable

---

## RISK MITIGATION

**Risk**: Breaking existing functionality during refactor

**Mitigation**:
- Refactor one component at a time
- Test after each component creation
- Keep page.tsx working until all components ready
- Use feature branch with thorough testing

**Risk**: Mobile vs desktop views behave differently

**Mitigation**:
- Test both views thoroughly
- Use responsive design testing tools
- Verify touch targets on mobile

**Risk**: Type errors during extraction

**Mitigation**:
- Run typecheck after each component
- Use proper imports from types file
- Don't proceed if types are broken

---

## FILE STRUCTURE AFTER REFACTOR

```
frontend/src/
├── app/[projectId]/budget/setup/
│   ├── page.tsx                    (✅ Clean, design-system compliant)
│   ├── types.ts                    (existing, unchanged)
│   └── components/
│       ├── index.ts                (existing, unchanged)
│       ├── BudgetCodeSelector.tsx  (existing, unchanged)
│       └── CreateBudgetCodeModal.tsx (existing, unchanged)
│
└── components/
    ├── layout/
    │   └── PageHeader.tsx          (🆕 NEW)
    │
    └── budget/
        ├── UomSelect.tsx           (🆕 NEW, extracted from page)
        ├── BudgetLineItemTable.tsx (🆕 NEW, extracted from page)
        ├── BudgetLineItemRow.tsx   (🆕 NEW, extracted from page)
        └── BudgetLineItemCard.tsx  (🆕 NEW, extracted from page)
```

---

## NEXT STEPS

1. **Start with PageHeader** (most reusable, easiest)
2. **Then UomSelect** (simple extraction)
3. **Then Row/Card components** (isolated, testable)
4. **Then Table component** (orchestrates Row/Card)
5. **Finally refactor page** (composition)
6. **Test thoroughly**
7. **Run quality checks**

---

## BEFORE STARTING

- [ ] Read this entire plan
- [ ] Understand current page behavior
- [ ] Have design system docs open (DESIGN-SYSTEM.md)
- [ ] Be ready to test frequently
- [ ] Commit current work to feature branch

---

**Last Updated**: 2026-01-05
**Status**: Ready to implement
**Priority**: HIGH (exemplar for other pages)
