# Form Page Audit

Date: 2026-05-02

## Objective

Identify the best existing form-page implementation in the repo, explain why several form surfaces keep drifting, and define the baseline that all form pages should converge to.

## Gold Standard

Use the `PageShell variant="form"` + `@/components/forms` stack as the single baseline.

Best current exemplar:

- `frontend/src/app/(main)/create-project/page.tsx`

Why this is the best baseline:

- Uses `PageShell variant="form"` for the outer page contract.
- Uses shared form primitives from `@/components/forms` instead of page-local input styling.
- Uses `FormSection`, `FormGrid`, and `FormActions` instead of ad hoc wrappers.
- Keeps layout decisions in shared components instead of each page inventing its own spacing rules.
- Already proves file upload can live inside the shared form system via `FileUploadField`.

Secondary clean exemplar:

- `frontend/src/app/(main)/[projectId]/estimates/new/page.tsx`

Why it matters:

- It is a small, production form that follows the same shell/section/field pattern without legacy layout noise.

## Shared Primitives That Should Be Mandatory

- `PageShell variant="form"`
- `@/components/forms/Form`
- `@/components/forms/FormSection`
- `@/components/forms/FormGrid`
- `@/components/forms/FormActions`
- shared field primitives from `@/components/forms`
- shared table primitives for line items
- shared attachment primitives for upload and file rows

## Current Form Families

Project-scoped `new` / `edit` pages in `frontend/src/app/(main)` currently break down into these buckets:

- `forms-package+pageshell`: 5 pages
- `forms-package-mixed`: 1 page
- `contracts-family`: 3 pages
- `raw-rhf-or-custom`: 4 pages
- `other`: 16 pages

### Near Standard

These are already close to the target pattern:

- `frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/estimates/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/invoices/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/rfis/new/page.tsx`

### Legacy Contract Family

These are the biggest source of repeated drift:

- `frontend/src/app/(main)/[projectId]/commitments/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx`
- `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx`
- `frontend/src/components/domain/contracts/ContractForm.tsx`
- `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`
- `frontend/src/components/domain/contracts/CreateSubcontractForm.tsx`

Why this family is unstable:

- It contains multiple separate implementations for the same concepts.
- Budget code creation appears in multiple duplicated modals.
- Attachments are handled differently across sibling forms.
- Section shells are inconsistent: some use `FormSection`, some use manual `<section>` markup, some use custom dialogs and inline layout logic.
- Prime contracts still depend on `ContractForm.tsx`, which is a custom stateful form stack outside the standard form system.

## Immediate Regression Root Cause

The screenshoted cost-code modal belongs to the old contract-form family, not the shared `@/components/forms` system.

Repo evidence:

- `frontend/src/components/domain/contracts/ContractForm.tsx`
- `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`
- `frontend/src/components/domain/contracts/subcontract-form/CreateBudgetCodeModal.tsx`
- `frontend/src/components/budget/budget-line-item-form.tsx`

This means the same cost-code selection experience has already forked into multiple code paths. That is exactly why one form can regress while another stays correct.

## Specific Findings

### 1. Prime Contract Forms Are Not on the Standard Stack

Files:

- `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx`
- `frontend/src/components/domain/contracts/ContractForm.tsx`

Problems:

- Missing shared attachment section.
- Uses a custom form state model instead of the shared field system.
- Uses duplicated budget-code modal logic.
- Section structure is page-local and manually assembled.

### 2. Commitment Forms Are Split Across Two Different Systems

Files:

- `frontend/src/components/domain/contracts/CreateSubcontractForm.tsx`
- `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`
- `frontend/src/components/domain/contracts/ContractForm.tsx`

Problems:

- Subcontracts partially use the shared form system.
- Purchase orders mix shared form primitives with custom layout and custom attachments UI.
- Prime contracts use the older custom contract form entirely.

Result:

- The commitment/contract family cannot update globally from one place today.

### 3. Change Event and Change Order Forms Still Drift

Files:

- `frontend/src/app/(main)/[projectId]/change-events/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx`
- `frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx`

Problems:

- They are not all using `PageShell variant="form"`.
- Some still rely on raw RHF fields and page-local section structure.
- They should be migrated after the contract family because they show the same anti-patterns.

## Required Standard Going Forward

Every form page should follow this contract:

1. Outer shell: `PageShell variant="form"`
2. Section wrapper: `FormSection`
3. Field layout: `FormGrid`
4. Actions: `FormActions`
5. Inputs: shared `@/components/forms` field primitives only
6. Attachments: shared attachment upload/list primitives only
7. Line items: shared table primitive only
8. No custom section wrappers unless the exception is documented inline and in the migration tracker

## Recommendation

Adopt `frontend/src/app/(main)/create-project/page.tsx` as the baseline architecture and migrate every other form family toward it.

For complex forms, the baseline should be:

- shell and field system from `create-project/page.tsx`
- section primitive from `@/components/forms/FormSection`
- actions from `@/components/forms/FormActions`
- attachments from the shared DS attachment primitives
- line-items from the shared inline table / canonical line-item manager pattern

## Migration Order

### Phase 1: Build the Shared Form Contract

- Extract any remaining missing primitives needed by contract-style forms.
- Define one shared cost-code picker and one shared budget-code creation modal.
- Define one shared attachments section.

### Phase 2: Migrate the Highest-Risk Legacy Family

- `frontend/src/components/domain/contracts/ContractForm.tsx`
- `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`
- `frontend/src/components/domain/contracts/CreateSubcontractForm.tsx`

This family should be rebuilt against the shared form contract first.

### Phase 3: Migrate Change Forms

- change events
- change orders
- PCO forms

### Phase 4: Sweep Remaining Mixed Pages

- any form page still outside `PageShell variant="form"`
- any page using raw RHF layout instead of shared form primitives

## Practical Definition Of Done

The standardization effort is not done when pages merely look similar.

It is done when:

- form pages share the same shell and section primitives
- attachments come from one shared section
- cost-code selection comes from one shared component
- line-item sections come from one shared pattern
- page titles, descriptions, and actions are controlled by the same shell contract
- changes to shared form layout update all migrated pages automatically
