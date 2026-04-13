# Procore Research: Retainage Invoicing

**Date:** 2026-04-13
**Question:** How does Procore set up retainage invoicing for subcontractors/commitments?
**Sources used:** Tier 1 (RAG) | Tier 3 (WebFetch)

---

## Procore Model

### How Retainage is Enabled (Commitment Level)

Procore's retainage model is **opt-in per commitment**, configured in the **Advanced Settings** tab of a subcontract or purchase order:

- **Enable Completed Work Retainage** — checkbox (off by default)
- **Enable Stored Material Retainage** — checkbox (off by default, only available on amount-based accounting method)
- **Retainage Percentage** — user-entered; no system default applied

> "To enable these settings on all of a project's new commitments, see Configure Settings: Commitments."

Default percentages come from **project-level configuration**, not hardcoded values. Users explicitly set them.

### Retainage Release — Two Paths

**Path 1: Modify retainage on an existing invoice**
1. Navigate to Commitments → Invoicing tab → Subcontractor tab
2. Open a Draft invoice
3. In the Schedule of Values, enter values in:
   - **Work Retainage this Period ($)** or **Work Retainage (%)**
   - **Total Retainage Released** — dollar amount to release
4. Save

**Path 2: Create a dedicated retainage release invoice**
1. Navigate to Invoicing tool (not Commitments)
2. Create a new invoice from the commitment
3. Set `$0` on all regular billing line items
4. Enter the release amount in **Total Retainage Released** column
5. Save and submit for approval

This is a **separate invoice** — not a field on an existing progress invoice. Procore treats retainage release as its own billing event.

### Key Field Names (Procore exact labels)

| Label | Purpose |
|-------|---------|
| Work Retainage this Period ($) | Dollar amount withheld on work this period |
| Work Retainage (%) | Percentage withheld on work this period |
| Total Retainage | Cumulative withheld to date |
| Total Retainage Released | Dollar amount being released on this invoice |
| Materials Retainage (%) | Percentage withheld on stored materials |

### Billing Period Rule

> "If there are multiple invoices for a single billing period, you can only edit the billed amounts on the most recent invoice."

This applies to retainage edits and retainage release — only the most recent invoice in a billing period is editable.

### Owner Invoice Retainage (Prime Contract)

Retainage must first be **enabled on the Prime Contract** before creating owner invoices. Fields:
- **Work Retainage this Period ($)**
- **Work Retainage this Period (%)**
- **Work Retainage Released This Period**
- **Materials Retainage (%)**
- **Work Retainage Released (%)**

Both dollar-amount and percentage entry are supported; entering one auto-calculates the other.

---

## Gaps Found in Our Implementation

### 1. Hardcoded 10% defaults (FIXED 2026-04-13)

**Files fixed:**
- `frontend/src/app/api/commitments/[commitmentId]/advanced-settings/route.ts` — `DEFAULT_SETTINGS.default_retainage_percent: 10 → 0`
- `frontend/src/components/commitments/tabs/AdvancedSettingsTab.tsx` — same local default
- `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractAdvancedSettingsTab.tsx` — `?? 10 → ?? 0`

**Why it was wrong:** Procore has NO system-defaulted retainage percentage. Retainage must be explicitly configured. Hardcoding 10 meant every new commitment silently got 10% retainage on invoices without the user knowingly setting it — violating the "fail loudly" rule.

### 2. Silent error swallowing (FIXED 2026-04-13)

`advanced-settings/route.ts` was returning `DEFAULT_SETTINGS` on DB errors instead of a 500. Changed to fail with `{ error: "Failed to load settings" }` so the UI surfaces the failure.

### 3. No dedicated retainage release invoice flow

Procore has a specific "Create Invoice for Release of Retainage" workflow in the **Invoicing tool** — a purpose-built invoice type with $0 progress billing and a retainage release amount. Our implementation handles retainage release inline on existing invoices but does not support creating a standalone retainage release invoice.

**Status:** Not yet implemented. The plan at `docs/plans/2026-04-08-retainage-billing.md` Task 9 covers this.

### 4. Commitment invoice path is write-disabled

Our `/api/commitments/[commitmentId]/invoices` POST still writes to `owner_invoices` (wrong table per the plan). Commitment invoices should write to `commitment_payment_applications`.

**Status:** Not yet implemented. Plan Task 9.

### 5. `enable_completed_work_retainage: true` in defaults

Procore's default is retainage **disabled** until the user enables it. Our `DEFAULT_SETTINGS` object has it enabled (`true`). This means new commitments without saved settings appear to have retainage enabled.

**Status:** Should be changed to `false` to match Procore behavior.

---

## Sources

- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-an-invoice-for-release-of-retainage
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/enable-retainage-on-a-purchase-order-or-subcontract
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/set-or-release-retainage-on-a-subcontractor-invoice
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/Set_and_Release_Retainage_on_an_Owner_Invoice
