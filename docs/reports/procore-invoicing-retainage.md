# Procore Research: Retainage on Subcontractor Invoices

**Date:** 2026-04-14  
**Question:** How does Procore handle setting and releasing retainage on subcontractor invoices? What needs to be implemented?  
**Sources used:** Tier 1 (RAG — 12 chunks), Tier 2 (Manifest), Tier 3 (WebFetch — full support article)

---

## Findings

### What Retainage Is

Retainage = withholding a portion of a contract amount (typically 5–10%) until work is deemed satisfactorily complete. Two types:

| Type | Definition | DB Column |
|------|-----------|-----------|
| Completed Work Retainage | % withheld on labor/work billed this period | `retainage_pct` / `retainage_amount` |
| Stored Materials Retainage | % withheld on materials stored on-site | `materials_retainage_pct` / `materials_retainage_amount` |

### Step 1 — Enable Retainage on the Commitment (Prerequisite)

Before retainage can appear on invoices, the GC must enable it on the subcontract/PO:

- Navigate to Commitments → contract → **Advanced Settings** tab → Edit
- Check **Enable Completed Work Retainage** and/or **Enable Stored Material Retainage**
- Set **Default Retainage %** (auto-fills all future invoice line items)
- Click Save

### Step 2 — Set Retainage on a Line Item (Invoice in Draft)

In the invoice detail (Schedule of Values), click Edit:

- **Work Retainage this Period (%)** — enter % → system calculates `$`  
- **Work Retainage this Period ($)** — enter `$` → system calculates `%`  
- Retainage applies **only to work completed this period** (Column E / "This Period"), NOT cumulative
- Click Save

### Step 3 — Release Retainage on Line Items

In the same SOV table, still in Edit mode:

- Locate the **Total Retainage Released** column per line item
- Enter the dollar amount to release (partial or full)
- `Total Retainage` is reduced by the released amount
- Click Save — confirmation banner shows total released

### Step 4 — Create a Dedicated Retainage Release Invoice

A separate invoice type where all billing is $0 and only retainage is released:

1. Create a new invoice (from the commitment's Invoicing tab)
2. Select the "Release of Retainage" invoice type
3. All Work Completed and Materials Stored remain $0
4. Fill in `Total Retainage Released` per line item
5. Submit for approval

### Exact SOV Columns (Procore's G703)

| Column Group | Sub-columns |
|-------------|-------------|
| From Previous Application | Work $, Materials $, Total |
| Retained This Period | Work %, Work $, Materials %, Materials $ |
| Released This Period | Work $, Materials $ |
| Currently Retained | Work $, Materials $, Total |

### Calculation Rules (CRITICAL)

- **Work Retainage This Period ($)** = `work_completed_period × retainage_pct / 100`  
  ⚠️ NOT `(work_completed_previous + work_completed_period) × retainage_pct / 100`
- **Materials Retainage This Period ($)** = `materials_stored × materials_retainage_pct / 100`
- **Currently Retained** = `previous_work_retainage + retainage_amount - work_retainage_released`
- **Net Amount This Period** = `(work_completed_period + materials_stored) - (retainage_amount + materials_retainage_amount)`

### Permission Requirements

- Edit retainage (before/after due date): **Invoice Administrator**
- Edit retainage (during billing period): **Standard** permissions on Commitments

---

## Gap Summary (Procore vs Our Implementation)

| Feature | Procore | Ours | Gap |
|---------|---------|------|-----|
| DB columns for work/materials retainage split | ✅ | ✅ | None |
| Retainage enabled setting on commitment | ✅ | ✅ | None |
| Default retainage % on commitment | ✅ | ✅ | None |
| G703 SOV display with all retainage columns | ✅ | ✅ | None |
| Retainage % editable per line item | ✅ | ✅ | None |
| "Set Retainage on All Line Items" bulk action | ✅ | ✅ | None |
| **Retainage calculation (this period only)** | ✅ | ❌ BUG | Applies to cumulative, not this period |
| **Retainage release inputs editable** | ✅ | ❌ | UI shows read-only; no PATCH support |
| **Dedicated retainage release invoice UI** | ✅ | PARTIAL | Flag exists; no dedicated entry UI |
| **Default retainage auto-populated on create** | ✅ | ❌ | Not implemented |
| Retainage columns conditioned on commitment | ✅ | ❌ | Always shown |
| Total Retainage in invoice list | ✅ | PARTIAL | Column in type but verify in UI |

---

## Sources

- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/set-or-release-retainage-on-a-subcontractor-invoice
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-an-invoice-for-release-of-retainage
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/enable-retainage-on-a-purchase-order-or-subcontract
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/enable-sliding-scale-retention-rules-on-subcontractor-invoices
- `.claude/procore-manifests/invoicing/manifest.json` (po-invoices-list state)
