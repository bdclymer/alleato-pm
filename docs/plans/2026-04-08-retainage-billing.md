# Retainage Billing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete retainage billing across prime contracts / owner invoices and commitment-side subcontractor billing, including retainage setup, billing-period rules, retainage release, and permission-aware editing.

**Architecture:** Use `prime_contract_payment_applications` plus `payment_application_line_items` as the canonical retainage engine for prime contracts and owner billing because that path already models AIA G702/G703 line-item retainage. Align the legacy owner-invoicing surface to that canonical model instead of maintaining a second retainage implementation in `owner_invoices`. Extend commitment/subcontractor billing from read-only billed-to-date summaries into explicit retainage-aware invoice / pay-app records so retainage works the same way at both tiers.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase Postgres, React Query, shadcn/ui, Zod, agent-browser, Playwright

---

## Scope Decisions

- Canonical prime/owner retainage workflow: `prime_contract_payment_applications` + `payment_application_line_items`
- Legacy compatibility layer: `/api/projects/[projectId]/invoicing/owner/*` and `frontend/src/app/(main)/[projectId]/invoicing/*`
- Commitment/subcontractor retainage workflow: commitment invoices + subcontractor SOV / pay-app path
- Out of scope for phase 1: fully custom sliding-scale rules engine; add schema hooks so a future sliding-scale calculator can be plugged in

### Task 1: Lock the canonical retainage model and document the migration path

**Files:**
- Create: `docs/architecture/retainage-billing-architecture.md`
- Modify: `docs/plans/2026-04-08-retainage-billing.md`
- Review: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`
- Review: `frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts`
- Review: `frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts`

**Step 1: Write the failing architecture acceptance checklist**

Add a checklist to `docs/architecture/retainage-billing-architecture.md` that must be true when the work is done:

```md
- Prime contract billing uses one source of truth for retainage.
- Owner invoice pages do not calculate retainage independently from a second data model.
- Commitment-side billing stores retainage amounts explicitly, not just billed_to_date summaries.
- Retainage release is allowed only on the latest editable invoice in a billing period.
- Permission checks gate retainage setup, retainage edits, and retainage release.
```

**Step 2: Capture the current breakpoints**

Document these facts:

```md
- `useUpdateLineItems` posts `{ line_items }` but the API expects `{ items }`.
- `InvoiceG703Detail` only edits work and materials, not retainage fields.
- `populate-sov` hardcodes 10% retainage instead of using contract defaults.
- `PrimeContractAdvancedSettingsTab` labels `sov_always_editable` as a retainage toggle.
- `commitments/[commitmentId]/invoices` is a billing summary endpoint, not a retainage invoice engine.
- `commitments/[commitmentId]/invoices` POST writes to `owner_invoices`, which is the wrong model.
```

**Step 3: Record the canonical mapping**

Add a small table:

```md
| Business concept | Canonical table / route |
| --- | --- |
| Prime / owner pay application | `prime_contract_payment_applications` |
| Prime / owner retainage line item state | `payment_application_line_items` |
| Contract retainage default | `prime_contracts.retention_percentage` |
| Commitment retainage default | `subcontracts.default_retainage_percent`, `purchase_orders.default_retainage_percent` |
```

**Step 4: Review with the product owner before code**

Run: `open docs/architecture/retainage-billing-architecture.md`

Expected: The architecture doc clearly states that owner retainage will not be built twice.

**Step 5: Commit**

```bash
git add docs/architecture/retainage-billing-architecture.md docs/plans/2026-04-08-retainage-billing.md
git commit -m "docs: define canonical retainage billing architecture"
```

### Task 2: Add the missing retainage data model for settings, release rules, and commitment-side billing

**Files:**
- Create: `supabase/migrations/20260408xxxxxx_retainage_billing_foundation.sql`
- Modify: `frontend/src/types/database.types.ts`
- Review: `supabase/migrations/20260401100000_payment_application_line_items.sql`
- Review: `supabase/migrations/schema_dump.sql`
- Review: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts`

**Step 1: Write the failing schema checklist**

Add comments in the migration for these requirements:

```sql
-- Required:
-- 1. Project-level prime contract settings need explicit retainage toggles.
-- 2. Commitment-side billing needs explicit retainage columns / tables.
-- 3. Release eligibility needs enough fields to enforce "latest invoice in billing period only".
```

**Step 2: Add explicit prime retainage settings**

Extend `prime_contract_project_settings` with fields like:

```sql
ALTER TABLE prime_contract_project_settings
  ADD COLUMN IF NOT EXISTS enable_work_retainage_this_period boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_material_retainage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sync_material_retainage boolean NOT NULL DEFAULT true;
```

**Step 3: Add commitment invoice / line-item retainage storage**

Create canonical commitment billing tables instead of reusing `owner_invoices`:

```sql
CREATE TABLE commitment_payment_applications (...);
CREATE TABLE commitment_payment_application_line_items (... retainage_previous_*, retainage_this_period_*, retainage_released_* ...);
```

Match the prime-contract line-item schema closely so both tiers share business rules.

**Step 4: Regenerate types**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run db:types
```

Expected: `frontend/src/types/database.types.ts` contains the new settings columns and commitment retainage tables.

**Step 5: Commit**

```bash
git add supabase/migrations/20260408xxxxxx_retainage_billing_foundation.sql frontend/src/types/database.types.ts
git commit -m "feat: add retainage billing foundation schema"
```

### Task 3: Fix the broken prime payment-application save path before adding features

**Files:**
- Modify: `frontend/src/hooks/use-payment-applications.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts`
- Test: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/line-items-route.test.ts`

**Step 1: Write the failing API contract test**

Add a test that proves the route accepts the payload produced by the hook:

```ts
it("accepts the client batch update payload for payment-application line items", async () => {
  const body = { items: [{ id: crypto.randomUUID(), work_completed_this_period: 1000 }] };
  expect(schema.parse(body)).toEqual(body);
});
```

Also add a regression test for the hook request body:

```ts
expect(fetch).toHaveBeenCalledWith(
  expect.stringContaining("/line-items"),
  expect.objectContaining({
    body: JSON.stringify({ items: updates }),
  }),
);
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand line-items-route
```

Expected: FAIL because the hook currently sends `line_items`.

**Step 3: Implement the minimal fix**

Change the hook request body to:

```ts
body: JSON.stringify({ items: lineItems })
```

Optionally support both payload shapes in the route for one release window:

```ts
const parsed = legacyAwareSchema.parse(body);
const items = parsed.items ?? parsed.line_items;
```

**Step 4: Run the test to verify pass**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand line-items-route
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/hooks/use-payment-applications.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/line-items-route.test.ts
git commit -m "fix: restore prime payment application line item saves"
```

### Task 4: Make prime retainage defaults and calculations correct

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts`
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`
- Test: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/populate-sov-route.test.ts`

**Step 1: Write the failing populate test**

```ts
it("seeds retainage percentages from the prime contract default", async () => {
  expect(insertedLineItem.retainage_this_period_work_pct).toBe(7.5);
  expect(insertedLineItem.retainage_this_period_materials_pct).toBe(7.5);
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand populate-sov-route
```

Expected: FAIL because the route seeds `10`.

**Step 3: Implement the minimal fix**

Fetch contract defaults before building the line items:

```ts
const { data: contract } = await supabase
  .from("prime_contracts")
  .select("retention_percentage")
  .eq("id", contractId)
  .single();

const defaultRetainagePct = Number(contract?.retention_percentage ?? 0);
```

Use `defaultRetainagePct` instead of hardcoded `10`.

**Step 4: Recalculate summary values from retained + released amounts**

Keep the parent rollup authoritative in:

- `payment-applications/[applicationId]/line-items/route.ts`
- `InvoiceG702Summary.tsx`
- `InvoiceSummaryPreview.tsx`

Make sure total retainage always means:

```ts
previous + this_period - released
```

for both work and materials.

**Step 5: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/populate-sov-route.test.ts frontend/src/components/domain/invoices/InvoiceG702Summary.tsx frontend/src/components/domain/invoices/InvoiceSummaryPreview.tsx
git commit -m "feat: apply contract retainage defaults to prime billing"
```

### Task 5: Build the prime-contract retainage editor and release workflow

**Files:**
- Modify: `frontend/src/components/domain/invoices/InvoiceG703Detail.tsx`
- Modify: `frontend/src/components/domain/invoices/InvoiceGeneralSettings.tsx`
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts`
- Test: `frontend/src/components/domain/invoices/__tests__/InvoiceG703Detail.test.tsx`

**Step 1: Write the failing component test**

```tsx
it("lets a user edit work retainage, material retainage, and released retainage", async () => {
  render(<InvoiceG703Detail ... />);
  expect(screen.getByLabelText(/work retainage %/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/material retainage %/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/released work retainage/i)).toBeInTheDocument();
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand InvoiceG703Detail
```

Expected: FAIL because those fields do not exist.

**Step 3: Add editable retainage columns**

Update `InvoiceG703Detail.tsx` so edit mode includes:

- `retainage_this_period_work_pct`
- `retainage_this_period_work`
- `retainage_this_period_materials_pct`
- `retainage_this_period_materials`
- `retainage_released_work`
- `retainage_released_materials`

Use a clear rule:

```ts
retainage_this_period_work = roundCurrency(work_completed_this_period * retainage_this_period_work_pct / 100)
retainage_this_period_materials = roundCurrency(materials_stored * retainage_this_period_materials_pct / 100)
```

Allow manual override only if product explicitly wants it; otherwise percentages drive amounts.

**Step 4: Add release-eligibility gating**

Disable retainage-release inputs unless:

- invoice status is editable
- invoice is the latest invoice in its billing period
- prior invoices in that billing period are not newer than this one

Expose that server-calculated flag on the invoice detail payload.

**Step 5: Commit**

```bash
git add frontend/src/components/domain/invoices/InvoiceG703Detail.tsx frontend/src/components/domain/invoices/__tests__/InvoiceG703Detail.test.tsx frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts
git commit -m "feat: add prime retainage editing and release controls"
```

### Task 6: Enforce billing-period and latest-invoice retainage rules on the server

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`
- Test: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/retainage-rules.test.ts`

**Step 1: Write failing rules tests**

```ts
it("rejects retainage edits on a non-latest invoice in the same billing period", async () => {
  expect(response.status).toBe(409);
});

it("rejects retainage release when invoice status is approved", async () => {
  expect(response.status).toBe(400);
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand retainage-rules
```

Expected: FAIL

**Step 3: Implement the rules**

Add helpers:

```ts
async function getLatestEditableApplicationInBillingPeriod(...) { ... }
function hasRetainageMutation(payload) { ... }
```

Server rules:

- retainage edits only on latest payment application in billing period
- release only on editable statuses (`draft`, `revise_and_resubmit`, optionally `under_review` if product approves)
- release cannot exceed currently retained amount

**Step 4: Return explicit capability flags**

Return booleans such as:

```ts
can_edit_retainage
can_release_retainage
retainage_edit_block_reason
```

so the UI does not guess.

**Step 5: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/__tests__/retainage-rules.test.ts
git commit -m "feat: enforce retainage billing period rules"
```

### Task 7: Wire prime contract advanced settings to real retainage settings

**Files:**
- Modify: `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractAdvancedSettingsTab.tsx`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/settings/route.ts`
- Modify: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`
- Test: `frontend/src/components/domain/contracts/prime-contract-detail/__tests__/PrimeContractAdvancedSettingsTab.test.tsx`

**Step 1: Write the failing UI test**

```tsx
it("saves explicit retainage settings instead of reusing sov_always_editable", async () => {
  expect(payload.enable_work_retainage_this_period).toBe(true);
  expect(payload.sov_always_editable).not.toBe(true);
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand PrimeContractAdvancedSettingsTab
```

Expected: FAIL

**Step 3: Replace mislabeled wiring**

Add real fields:

```ts
enable_work_retainage_this_period
enable_material_retainage
auto_sync_material_retainage
```

and stop using `sov_always_editable` for retainage.

**Step 4: Add default retainage editing to detail settings**

Expose contract-level `retention_percentage` on the detail edit path so the user can change the default after contract creation.

**Step 5: Commit**

```bash
git add frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractAdvancedSettingsTab.tsx frontend/src/app/api/projects/[projectId]/contracts/settings/route.ts frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx frontend/src/components/domain/contracts/prime-contract-detail/__tests__/PrimeContractAdvancedSettingsTab.test.tsx
git commit -m "feat: wire real prime retainage settings"
```

### Task 8: Align the owner-invoicing surface to the canonical prime retainage engine

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts`
- Modify: `frontend/src/hooks/use-invoicing.ts`
- Modify: `frontend/src/app/(main)/[projectId]/invoicing/page.tsx`
- Modify: `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`
- Review: `frontend/src/components/domain/invoices/InvoiceG702Summary.tsx`

**Step 1: Write the failing compatibility test**

```ts
it("returns retainage-aware owner invoice totals from the canonical pay-application model", async () => {
  expect(invoice.net_amount).toBe(invoice.amount - invoice.retention_amount);
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand owner-invoicing
```

Expected: FAIL or reveal that the route is still reading raw `owner_invoices`.

**Step 3: Implement the adapter**

Either:

- make `/invoicing/owner/*` read from `prime_contract_payment_applications`, or
- keep `owner_invoices` as a thin compatibility projection that is derived from pay applications

Required outcome:

```ts
gross_amount
retention_amount
net_amount
percent_complete
billing_period
retainage_release_state
```

all come from the same canonical retainage calculations as the prime-contract invoice detail page.

**Step 4: Remove status drift**

Normalize owner invoice statuses to the same values used by payment applications:

```ts
"draft" | "under_review" | "revise_and_resubmit" | "approved"
```

and update the older `submitted` / `paid` surface only if a separate payment record exists.

**Step 5: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts frontend/src/hooks/use-invoicing.ts frontend/src/app/(main)/[projectId]/invoicing/page.tsx frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx
git commit -m "refactor: align owner invoicing with prime retainage engine"
```

### Task 9: Replace the fake commitment invoice path with real retainage-aware commitment billing

**Files:**
- Modify: `frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts`
- Modify: `frontend/src/components/commitments/tabs/InvoicesTab.tsx`
- Modify: `frontend/src/components/commitments/tabs/AdvancedSettingsTab.tsx`
- Modify: `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts`
- Review: `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts`
- Test: `frontend/src/app/api/commitments/[commitmentId]/__tests__/invoices-route.test.ts`

**Step 1: Write the failing route test**

```ts
it("does not write commitment invoices into owner_invoices", async () => {
  expect(insertTableName).toBe("commitment_payment_applications");
});
```

and:

```ts
it("returns commitment retainage totals, released retainage, and net due", async () => {
  expect(response.summary.total_retainage).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand commitment-invoices
```

Expected: FAIL

**Step 3: Implement a real commitment pay-app model**

Update the route so:

- GET reads from `commitment_payment_applications` and `commitment_payment_application_line_items`
- POST creates commitment pay applications, not owner invoices
- summary returns contract amount, billed to date, retainage held, retainage released, net due

**Step 4: Update the commitment UI**

Turn `InvoicesTab.tsx` into a real billing screen with:

- invoice list
- current retainage held
- current payment due
- per-line-item retainage status

Use the same visual pattern as the direct-cost line-items shell where line items are editable.

**Step 5: Commit**

```bash
git add frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts frontend/src/components/commitments/tabs/InvoicesTab.tsx frontend/src/components/commitments/tabs/AdvancedSettingsTab.tsx frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts frontend/src/app/api/commitments/[commitmentId]/__tests__/invoices-route.test.ts
git commit -m "feat: add retainage-aware commitment billing"
```

### Task 10: Add permission checks for retainage setup, edits, approval, and release

**Files:**
- Modify: `frontend/src/services/permissionService.ts`
- Modify: `frontend/src/hooks/use-project-permissions.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts`
- Modify: `frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts`
- Review: `docs/directory-auth-permissions.md`
- Test: `frontend/src/services/__tests__/permissionService.test.ts`

**Step 1: Write the failing permission test**

```ts
it("requires contracts write/admin permission for retainage edits", async () => {
  await expect(service.hasPermission(userId, projectId, "contracts", "write")).resolves.toBe(true);
});
```

Add route tests that reject unauthorized retainage mutation calls with `403`.

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run test:unit -- --runInBand permissionService
```

Expected: FAIL or missing retainage-specific call sites.

**Step 3: Implement permission enforcement**

Server-side:

- require authenticated user
- require `contracts:write` or `contracts:admin` for prime retainage setup/edit/release
- require `commitments:write` or `commitments:admin` for commitment retainage setup/edit/release
- require stronger permission for approval / final retainage release if product wants invoice-admin semantics

**Step 4: Expose capability flags to the client**

Add client helpers that return:

```ts
canEditRetainage
canReleaseRetainage
canApproveRetainageRelease
```

so controls hide correctly.

**Step 5: Commit**

```bash
git add frontend/src/services/permissionService.ts frontend/src/hooks/use-project-permissions.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts frontend/src/services/__tests__/permissionService.test.ts
git commit -m "feat: add retainage billing permission checks"
```

### Task 11: Add end-to-end coverage for retainage billing and release

**Files:**
- Create: `frontend/tests/e2e/prime-retainage-billing.spec.ts`
- Create: `frontend/tests/e2e/commitment-retainage-billing.spec.ts`
- Create: `frontend/tests/agent-browser-runs/retainage-billing-actions.txt` (or current scripted action file location used by browser verification)
- Review: `frontend/tests/.auth/user.json`

**Step 1: Write the failing prime retainage flow test**

```ts
test("prime retainage billing and release workflow", async ({ page }) => {
  // create payment application
  // populate SOV
  // set retainage
  // verify G702 totals
  // create next invoice in same billing period
  // verify only latest invoice can release retainage
});
```

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npx playwright test tests/e2e/prime-retainage-billing.spec.ts --headed
```

Expected: FAIL until UI and server rules are complete.

**Step 3: Add the commitment test**

```ts
test("subcontract retainage billing mirrors the commitment workflow", async ({ page }) => {
  // create commitment pay app
  // verify default retainage seeded from subcontract
  // release retainage on latest invoice only
});
```

**Step 4: Run browser verification with evidence**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm
npm run verify:browser
```

Expected: artifacts under `frontend/tests/agent-browser-runs/<timestamp>-retainage-billing/` with screenshots, video, and `VERIFICATION_SUMMARY.md`.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/prime-retainage-billing.spec.ts frontend/tests/e2e/commitment-retainage-billing.spec.ts
git commit -m "test: add retainage billing end-to-end coverage"
```

### Task 12: Update docs and operator guidance

**Files:**
- Modify: `docs/FINANCIAL-TOOLS-STATUS.md`
- Modify: `docs/reports/procore-gap-audit-2026-04-07.md`
- Modify: `docs/design/DESIGN.md`
- Create: `docs/features/retainage-billing.md`

**Step 1: Write the missing documentation outline**

Create:

```md
## Retainage Setup
## Prime Contract Billing
## Commitment Billing
## Billing Period Restrictions
## Retainage Release Rules
## Permissions
## Known Non-Goals
```

**Step 2: Document the workflow with screenshots after verification**

Reference:

- where defaults are configured
- how retainage is billed each period
- how release works
- why only the latest invoice in a billing period is editable

**Step 3: Update the gap audit**

Mark resolved items for:

- prime retainage detail editing
- subcontractor / commitment invoicing gap
- billing-period / owner-invoice alignment

**Step 4: Run a final quality pass**

Run:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run quality
```

Expected: no TypeScript or lint failures.

**Step 5: Commit**

```bash
git add docs/FINANCIAL-TOOLS-STATUS.md docs/reports/procore-gap-audit-2026-04-07.md docs/features/retainage-billing.md
git commit -m "docs: publish retainage billing workflow"
```

## Final Verification Checklist

- `prime_contract_payment_applications` is the only source of truth for prime / owner retainage billing
- Prime contract SOV population uses contract retainage defaults instead of `10`
- Prime invoice detail supports editing retainage percentages, retained amounts, and released retainage
- Retainage release is blocked unless the invoice is the latest editable invoice in its billing period
- Commitment billing no longer writes to `owner_invoices`
- Commitment invoice summaries show retainage held, retainage released, and net due
- Permission checks exist on every retainage mutation route
- Playwright and browser-verification artifacts prove the flow

Plan complete and saved to `docs/plans/2026-04-08-retainage-billing.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
