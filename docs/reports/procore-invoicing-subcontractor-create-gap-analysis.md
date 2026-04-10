# Procore Research: Subcontractor Invoice Create — Gap Analysis

**Date:** 2026-04-09
**Question:** What are the variances between our Create Subcontractor Invoice page and Procore's implementation?
**URL audited:** `http://localhost:3001/767/invoicing/subcontractor/new?commitmentType=subcontract&commitmentId=218cdb4f-4cf1-483b-bf23-6454d8e00229`
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest + Screenshots) | Tier 3 (WebFetch)

---

## How Procore Actually Creates Subcontractor Invoices

This is the critical context. Procore's modern invoice creation is **NOT a full-page form**. It is a two-step flow:

1. From **Invoicing → Subcontractor** list, user clicks **"Create Invoice"**
2. A **"Set Up Billing Period" dialog** appears (modal) with: From (date), To (date), Due Date
3. Once billing period is confirmed, Procore redirects to the **invoice detail page** pre-filled with the commitment's SOV
4. The admin fills in the **"General Information Card"** on the detail page and edits SOV amounts inline

Our current implementation: a standalone **full-page form** at `/invoicing/subcontractor/new`. This is closer to Procore's **legacy** experience, not the modern experience. The legacy path is acceptable, but the form content is missing fields and has UX problems.

---

## Gap Analysis

### 1. Create Form — UX Flow Issues

#### 1a. Contract pre-selection is non-functional when coming from a commitment

**Procore:** You navigate from a commitment context — the contract is already known and shown read-only as "Contract Company".

**Ours:** The URL carries `?commitmentType=subcontract&commitmentId=218cdb4f...`, and the code does pre-fill the form values (`form.setValue(...)`) — BUT the radio group and contract dropdown are still fully interactive. A user who arrived from a commitment link still sees "Subcontract / Purchase Order" radio options and a full dropdown picker. This is confusing and error-prone.

**Fix:** When `commitmentId` is present in the URL, render the commitment as a read-only display (contract number + title), hide the radio toggle, and hide the dropdown.

#### 1b. No Schedule of Values shown on the invoice create/detail

**Procore:** After creating an invoice, the user immediately sees the SOV line items to enter work completion amounts. The G703 tab is the primary editing surface.

**Ours:** The create form has no SOV. After creating, the user is redirected to the invoice detail page where the G703 *is* editable — but there's no guidance pointing the user to that tab. Users may not know they need to go to the "Detail" tab to enter amounts.

**Fix:** After successful creation, redirect to the invoice detail page and default to the "Detail" (G703) tab: `router.push(\`/\${projectId}/invoicing/subcontractor/\${newId}?tab=detail\`)`.

---

### 2. Create Form — Missing Fields

**Procore's "General Information Card" fields (authoritative from support article + manifest):**

| Field | Required | Our Form |
|-------|----------|----------|
| Contract Company | Read-only | ✅ (shown via dropdown) |
| Status | Dropdown (defaults to Draft) | ❌ MISSING |
| Invoice # | Optional (auto-assigned) | ✅ (but no auto-generation) |
| Billing Period | Required | ✅ (but marked optional) |
| Billing Date | Required | ✅ |
| Period Start | Required | ✅ |
| Period End | Required | ✅ |
| **Submitted Date** | Optional | ❌ MISSING |
| **Billing Type** | Optional (Progress / Final) | ❌ MISSING |

**Issues:**
- **Missing "Submitted Date"**: Procore has a field for the date the subcontractor submitted their physical invoice. Maps to `submitted_at` on our model (shown in SummaryTab but not settable on create).
- **Missing "Status"**: Procore shows a Status dropdown even on the create form (defaults "Draft"). Without this, our invoices are created with no visible status context.
- **Missing "Billing Type"**: When lien waivers are enabled, Procore shows Progress vs Final billing options. Low priority unless lien waivers are in scope.
- **Billing Period not marked required**: Should have a `required` indicator. In Procore, you cannot create an invoice without a billing period.

---

### 3. Create Form — Wrong/Unnecessary Fields

| Our Field | Issue |
|-----------|-------|
| **Commitment Type (radio)** | Only needed when not coming from a commitment URL. Should be hidden/read-only when `commitmentId` is pre-set. |
| **Notes** | Procore does NOT have Notes on the create form — it's only on the detail/edit view. Clutters the create form. |
| **Invoice #** | Procore auto-generates this. Our field implies it's required to enter one. Add placeholder text like "Auto-assigned if left blank" or generate one automatically. |

---

### 4. Invoice Detail — G703 (Detail Tab)

Our `DetailTab.tsx` is quite complete. Columns match Procore's G703 well. Key gaps:

**Procore G703 columns (from manifest — authoritative):**

| Procore Column | Group | Our Column | Status |
|---------------|-------|------------|--------|
| Item No | A | # (sort_order) | ✅ |
| Budget Code | — | **Not shown in table** | ❌ MISSING |
| Description Of Work | B | Description Of Work | ✅ |
| Scheduled Value | C | Scheduled Value | ✅ |
| Work Completed (From Previous App) | D | From Previous | ✅ |
| Work Completed (This Period) | D | This Period (editable) | ✅ |
| Materials Presently Stored | E | Materials Stored (editable) | ✅ |
| Total Completed And Stored To Date | F | Total Completed | ✅ |
| % | G | % | ✅ |
| Balance To Finish | G | Balance To Finish | ✅ |
| Retainage: Released This Period | — | Work Retainage $ | ⚠️ Different label |
| Retainage: Currently Retained | — | Materials Retainage $ | ⚠️ Different semantics |

**Gap:** The `Budget Code` column exists in the data model (`li.cost_code` / `li.budget_code`) but is **not rendered in the G703 table**. Procore shows it between Item No and Description Of Work. This is a real gap — subcontractors reference budget codes for billing.

**Label issue:** Our "Work Retainage $" and "Materials Retainage $" don't map cleanly to Procore's "Released This Period" / "Currently Retained" semantics. These are different concepts — we're showing retainage amount this period, not cumulatively retained.

---

### 5. Invoice Detail — Summary Tab

Our `SummaryTab.tsx` is largely correct (has the AIA G702-style Application for Payment rollup). Minor issues:

| Our Label | Procore Label | Issue |
|-----------|---------------|-------|
| "Submitted" | "Submitted Date" | Label should match |
| "Payment Date" | Not directly shown — approval date | Naming is ambiguous |
| "Commitment #" | "Contract" | Procore uses "Contract" not "Commitment" |
| "Overall Comments" | "Notes" | Minor label mismatch |

**Missing from Summary tab:** Procore shows a "Billing Period" prominently in the invoice header (name + date range). Our Summary shows period start/end dates but not the billing period name.

---

### 6. Invoice List — Status Tabs

**Procore status tabs (from `list-subcontractor.png`):**
```
NOT INVITED | INVITED | UNDER REVIEW (20) | APPROVED | REVISE AND RESUBMIT
```

**Our status values in use:** `draft`, `under_review`, `approved`, `revise_and_resubmit`, `approved_as_noted`, `paid`

**Gap:** Procore's "NOT INVITED" and "INVITED" tabs relate to the **Invoice Contact** workflow (subcontractors who haven't received or accepted a billing invite). If we don't implement invoice contacts/invites, these tabs should be excluded — but the Invoicing list needs to have at minimum: Draft | Under Review | Approved | Revise & Resubmit.

---

## Step-by-Step Fix Guide

### Fix 1 — Create Form: Lock commitment context when pre-filled (HIGH)

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`

When `commitmentId` AND `commitmentType` are in URL params:
1. After loading commitments, find the pre-selected commitment's details
2. Replace the radio group + dropdown with a read-only `LabelValueRow` showing contract number + title
3. Keep the hidden form values (`subcontract_id` / `purchase_order_id`) set correctly

```tsx
// When commitmentId is pre-filled, show this instead of the radio + dropdown:
const isPrefilled = !!searchParams.get("commitmentId");
const selectedCommitment = subcontracts.find(c => c.id === values.subcontract_id)
  ?? purchaseOrders.find(c => c.id === values.purchase_order_id);

{isPrefilled && selectedCommitment ? (
  <div className="space-y-1">
    <Label>Contract</Label>
    <p className="text-sm font-medium">
      {selectedCommitment.contract_number} — {selectedCommitment.title}
    </p>
  </div>
) : (
  // existing radio + dropdown
)}
```

---

### Fix 2 — Create Form: Add missing fields (HIGH)

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`

Add to the Zod schema:
```ts
submitted_date: z.string().optional(),
status: z.enum(["draft", "under_review"]).default("draft"),
```

Add to the form default values:
```ts
submitted_date: "",
status: "draft",
```

Add to the "Invoice Details" FormSection (after Billing Date):
```tsx
<DateField
  label="Submitted Date"
  value={toDateValue(values.submitted_date)}
  onChange={(val) => form.setValue("submitted_date", toDateString(val), { shouldValidate: true })}
/>

<SelectField
  label="Status"
  fullWidth
  value={values.status}
  onValueChange={(val) => form.setValue("status", val as FormValues["status"], { shouldValidate: true })}
  options={[
    { value: "draft", label: "Draft" },
    { value: "under_review", label: "Under Review" },
  ]}
/>
```

Pass through to `createInvoice.mutateAsync`:
```ts
submitted_date: v.submitted_date || undefined,
status: v.status,
```

---

### Fix 3 — Create Form: Mark Billing Period required (HIGH)

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`

In the schema:
```ts
billing_period_id: z.string().min(1, "Billing period is required"),
```

On the `SelectField`:
```tsx
<SelectField
  label="Billing Period"
  required  // add this
  ...
/>
```

---

### Fix 4 — Create Form: Remove Notes, fix Invoice # label (MEDIUM)

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`

1. Remove the `Notes` textarea entirely from the create form (it's on the detail edit view)
2. Remove `notes` from the schema and default values
3. Update Invoice # placeholder: `"Auto-assigned if blank"`

---

### Fix 5 — Create Form: Redirect to Detail tab after creation (MEDIUM)

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx`

```ts
// In onSubmit, after getting newId:
if (newId) {
  router.push(`/${projectId}/invoicing/subcontractor/${newId}?tab=detail`);
}
```

**File:** `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/[invoiceId]/page.tsx`

Read `?tab=detail` from `useSearchParams()` and pass as `defaultValue` to the Tabs component:
```tsx
const searchParams = useSearchParams();
const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "summary");
```

---

### Fix 6 — G703 Table: Add Budget Code column (MEDIUM)

**File:** `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx`

In the `<TableHeader>`:
```tsx
<TableHead>Budget Code</TableHead>  // add after # column
```

In the `<TableRow>` data cells:
```tsx
<TableCell className="text-muted-foreground text-sm">
  {li.budget_code ?? li.cost_code ?? "—"}
</TableCell>
```

In the totals row, add an empty `<TableCell />` for the Budget Code column.

---

### Fix 7 — G703 Table: Fix retainage column labels (LOW)

**File:** `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx`

Rename column headers to match Procore's G703 standard:
- "Work Retainage %" → "Work Retainage %"  (keep)
- "Work Retainage $" → "Work Retainage Held"
- "Materials Retainage %" → "Mat. Retainage %"  (keep)
- "Materials Retainage $" → "Mat. Retainage Held"

---

### Fix 8 — Summary Tab: Fix field labels (LOW)

**File:** `frontend/src/components/invoicing/subcontractor-detail-tabs/SummaryTab.tsx`

```tsx
// Change:
<Field label="Commitment #">  →  <Field label="Contract">
<Field label="Submitted">     →  <Field label="Submitted Date">
<Field label="Payment Date">  →  <Field label="Approved Date">
<dt>Overall Comments</dt>     →  <dt>Notes</dt>
```

Add billing period display:
```tsx
<Field label="Billing Period">
  {invoice.billing_period_name ?? "—"}
</Field>
```

---

## API Note

`POST /api/commitments/[commitmentId]/invoices` is currently disabled (returns 405). Invoice creation correctly routes through `POST /api/projects/${projectId}/invoicing/subcontractor/invoices`. The disabled endpoint is intentional — no action needed.

The `submitted_date` and `status` fields need to be accepted by the POST handler at:
`frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts`

---

## Fix Priority Summary

| # | Fix | Priority | File(s) |
|---|-----|----------|---------|
| 1 | Lock contract context when pre-filled via URL | HIGH | `new/page.tsx` |
| 2 | Add Submitted Date + Status fields to create form | HIGH | `new/page.tsx` |
| 3 | Mark Billing Period required | HIGH | `new/page.tsx` |
| 4 | Remove Notes, fix Invoice # label | MEDIUM | `new/page.tsx` |
| 5 | Redirect to G703 tab after creation | MEDIUM | `new/page.tsx` + `[invoiceId]/page.tsx` |
| 6 | Add Budget Code column to G703 table | MEDIUM | `DetailTab.tsx` |
| 7 | Fix retainage column labels in G703 | LOW | `DetailTab.tsx` |
| 8 | Fix Summary tab field labels | LOW | `SummaryTab.tsx` |

## Sources

- Procore support article: https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-an-invoice-on-behalf-of-an-invoice-contact
- Procore support article: https://v2.support.procore.com/process-guides/payee-user-guide/update-the-general-information
- Deep crawl manifest: `.claude/procore-manifests/invoicing/manifest.json`
- Screenshots: `.claude/procore-manifests/invoicing/screenshots/`
