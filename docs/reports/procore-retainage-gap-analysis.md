# Procore Research: Retainage Gap Analysis

**Date:** 2026-04-09
**Question:** Compare retainage functionality to Procore
**Sources used:** Tier 1 (RAG) | Tier 2 (DB types + code) | Tier 3 (WebFetch)

---

## How Procore Handles Retainage

Procore retainage spans three areas: **Commitments (subcontractor side)**, **Invoicing tool (subcontractor invoices)**, and **Prime Contracts (owner invoices)**. There is also an advanced **Sliding Scale Retention** feature.

### 1. Commitment-Level Enablement (Advanced Settings tab)

Set once per subcontract/PO in the **Advanced Settings** tab:

| Setting | Description |
|---------|-------------|
| Enable Completed Work Retainage | Toggle — withholds % from work-billed line items |
| Enable Stored Materials Retainage | Toggle — withholds % from materials-billed line items |
| Default Retainage % | Pre-fills percentage on all invoices; editable per invoice/line item |

**Constraint:** Stored Materials retainage is **not available** for Unit/Quantity-based contracts — only Amount-based contracts support both types.

---

### 2. Subcontractor Invoice Retainage (Invoicing Tool — per line item)

Retainage is applied and released at the **SOV line-item level**, not the invoice header.

**Columns on every SOV line item:**

| Column | Description |
|--------|-------------|
| Work Retainage this Period ($) | Dollar amount withheld this billing period |
| Work Retainage (%) | Percentage withheld — entering either $ or % auto-calculates the other |
| Total Retainage | Running cumulative amount withheld across all periods |
| Total Retainage Released | Amount to release this period — reduces Total Retainage balance |

**Retainage Release workflow:**
- Enter amount in **Total Retainage Released** on each line item
- Procore reduces the **Total Retainage** balance by that entry
- On Save, Procore shows a confirmation banner: "total amount of retainage being released on this invoice"
- Partial releases are supported (e.g., release 50% of held amount)

**Dedicated Retainage Release Invoice:**
- Procore has a separate **"Create Invoice for Release of Retainage"** workflow
- This creates a standalone invoice specifically to release previously accumulated retainage
- Steps: navigate to Commitment → Invoicing tab → Subcontractor tab → Create > Create Invoice → fill Total Retainage Released per line item → Save

---

### 3. Prime Contract (Owner Invoice) Retainage

Applied at the invoice level across two sections: **Work Completed** and **Materials Stored**.

**Workflow:**

- Navigate to Prime Contracts → Invoices tab → open invoice → Detail tab → Edit
- Enter a % in Work Completed → click **Set** (applies to all line items)
- Enter a % in Materials Stored → click **Set**
- To release: enter release % → click **Release**

**Two release modes:**
- **Partial release** (e.g., 50%): Retention continues; used for progress payments
- **Final release** (100%): No more retainage withheld after this invoice

**Permission flags:** `can_edit_retainage`, `can_release_retainage` control access per invoice state.

---

### 4. Sliding Scale Retention (Advanced — Commitments)

Available in Commitments tool. Primarily designed for Australia/NZ markets but available globally.

**How it works:** Automatically reduces the withheld retention percentage as contract milestones are reached.

**Up to 5 configurable rules, each using one of three calculation methods:**

| Method | Example |
|--------|---------|
| % until X% of original commitment held | "Withhold 10% until $40K (10% of $400K) is held" |
| % until X% of revised commitment held | Same but accounts for change orders |
| % until a dollar amount is held | "Withhold 10% until $40,000 is held" |

**Important:** Sliding scale rules **do not automatically release** previously accrued retention. Users still manually enter release amounts on invoices — the rules only change the ongoing withholding percentage going forward.

---

## Our Implementation

### What We Have ✓

| Feature | Location | Status |
|---------|----------|--------|
| `enable_completed_work_retainage` toggle | `advanced-settings/route.ts` (default: `true`) | ✓ Present |
| `enable_stored_materials_retainage` toggle | `advanced-settings/route.ts` (default: `false`) | ✓ Present |
| `default_retainage_percent` (default 10%) | `advanced-settings/route.ts` | ✓ Present |
| `retainage_pct` per SOV line item on invoices | `invoicing/[invoiceId]/page.tsx` | ✓ Present |
| `retainage_released` per SOV line item | `invoicing/[invoiceId]/page.tsx` | ✓ Present |
| `retainage_amount` (calculated) | `invoicing/[invoiceId]/page.tsx` | ✓ Present |
| `retainage_this_period_work` / `_materials` | `database.types.ts` (payment_application_line_items) | ✓ In DB |
| `retainage_previous_work` / `_materials` | `database.types.ts` | ✓ In DB |
| `retainage_released_work` / `_materials` | `database.types.ts` | ✓ In DB |
| `retainage_this_period_work_pct` / `_materials_pct` | `database.types.ts` | ✓ In DB |
| `retention_percentage` on prime contracts | `prime-contracts/[contractId]/page.tsx` | ✓ Present |
| `retention_amount` on prime contract invoices | `prime-contracts/[contractId]/types.ts` | ✓ Present |
| `can_edit_retainage` / `can_release_retainage` flags | `prime-contracts/[contractId]/types.ts` | ✓ Present |
| `retainage_edit_block_reason` | `prime-contracts/[contractId]/types.ts` | ✓ Present |
| `retainageReleaseThreshold` setting | `commitments/settings/page.tsx` | ✓ Present |

---

## Gap Analysis

### GAP 1 — No $ ↔ % Auto-Calculation on Invoice SOV (HIGH)

**Procore:** Users can enter *either* dollar amount (`Work Retainage this Period $`) or percentage (`Work Retainage %`) and Procore auto-calculates the other field.

**Ours:** Only `retainage_pct` is editable on the SOV. The dollar amount is calculated (`calcRetainageAmount`) but users cannot enter a dollar amount directly.

**Impact:** Users expect to be able to enter a fixed dollar amount (e.g., "withhold exactly $5,000" regardless of percentage).

---

### GAP 2 — No Total Retainage Running Balance Column (HIGH)

**Procore:** Every SOV line item shows a **Total Retainage** column — the cumulative withheld amount across *all* prior billing periods, not just this period.

**Ours:** `retainage_amount` is calculated only for the current invoice. We have `retainage_previous_work` in the DB schema but it's unclear if the UI surfaces a true running "Total Retainage" balance per line item in the invoice SOV.

**Impact:** Users cannot see how much retainage has been withheld cumulatively — critical for knowing when/how much to release.

---

### GAP 3 — No Dedicated Retainage Release Invoice Type (HIGH)

**Procore:** Has a **"Create Invoice for Release of Retainage"** flow — a distinct invoice type specifically for releasing accumulated retainage. This is a first-class workflow, not just editing existing invoices.

**Ours:** No dedicated retainage release invoice. Users would need to find the right existing invoice and manually enter release amounts. No guided workflow.

**Impact:** The release-of-retainage workflow (typically at substantial completion) is a major construction billing milestone. Without a dedicated flow, it's error-prone and non-obvious.

---

### GAP 4 — Sliding Scale Retention Not Implemented (MEDIUM)

**Procore:** Supports up to 5 configurable rules (3 calculation methods) that automatically adjust the withholding percentage as milestones are reached.

**Ours:** Has `retainageReleaseThreshold` (a single "% complete before retainage can be released" setting on the commitments settings page) — this is a much simpler concept and doesn't match Procore's sliding scale model.

**Impact:** Primarily affects projects with tiered retainage agreements (e.g., "hold 10% until 50% complete, then hold 5%"). Less common in US markets but expected by sophisticated clients.

---

### GAP 5 — Commitment Retainage Billing is Read-Only Summary (HIGH)

**Found in code** (`commitments/[commitmentId]/page.tsx:745`):
> "Commitment retainage billing is available as a read-only summary right now."

**Procore:** Full retainage management is available within the commitment's invoicing tab — setting %, releasing per line item, etc.

**Impact:** Users cannot manage retainage from the commitment detail page — they must navigate elsewhere (or it's simply not editable).

---

### GAP 6 — Accounting Method Restriction for Stored Materials (LOW)

**Procore:** Stored Materials retainage is disabled for Unit/Quantity-based contracts — only Amount-based contracts support both retainage types.

**Ours:** `enable_stored_materials_retainage` is a simple boolean with no check against the contract's accounting method.

**Impact:** Could allow enabling stored materials retainage on unit-based contracts where it shouldn't be available. Lower priority unless unit-qty contracts are in use.

---

### GAP 7 — Prime Contract Set/Release Button Workflow (MEDIUM)

**Procore:** Explicit **Set** button (applies % to all line items at once) and **Release** button (moves to "Released this Period"). Two distinct actions with different semantics.

**Ours:** Has `can_edit_retainage` / `can_release_retainage` flags (correct concept), but unclear from code whether the Set vs. Release distinction is surfaced as separate button actions in the UI, or whether it's just a generic "edit" flow.

---

## Summary Table

| Feature | Procore | Ours | Gap Level |
|---------|---------|------|-----------|
| Enable/disable retainage per commitment | ✓ Completed work + Materials | ✓ Both toggles | None |
| Default retainage % on commitment | ✓ | ✓ Default 10% | None |
| Retainage % per SOV line item | ✓ | ✓ | None |
| Retainage $ input (not just %) | ✓ Dollar OR percent entry | ✗ % only | **HIGH** |
| Total Retainage running balance per line item | ✓ Cumulative column | Partial (DB has it, UI unclear) | **HIGH** |
| Retainage release per line item | ✓ | ✓ `retainage_released` | None |
| Dedicated Retainage Release Invoice | ✓ Separate workflow | ✗ Missing | **HIGH** |
| Release confirmation banner | ✓ | Unknown | Medium |
| Sliding scale retention rules | ✓ Up to 5 rules, 3 methods | ✗ Single threshold only | Medium |
| Prime contract retainage Set/Release | ✓ Explicit Set/Release buttons | Partial (flags present) | Medium |
| Accounting method restriction | ✓ Unit-qty blocks materials | ✗ No check | Low |
| Commitment retainage editable | ✓ Full edit in invoicing tab | ✗ Read-only summary | **HIGH** |

---

## Recommended Priority

1. **Make commitment retainage billing editable** (remove read-only gate) — removes existing blocker
2. **Add Total Retainage running balance column** to SOV table on invoices
3. **Add dollar-amount entry** for retainage this period (alongside %)
4. **Build Retainage Release Invoice flow** — dedicated "Create Invoice for Release of Retainage"
5. **Prime Contract Set/Release button UX** — ensure both are distinct actions
6. **Sliding Scale Retention** — lower priority unless client requests

---

## Sources

- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/enable-retainage-on-a-purchase-order-or-subcontract
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/set-or-release-retainage-on-a-subcontractor-invoice
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-an-invoice-for-release-of-retainage
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/enable-sliding-scale-retention-rules-on-subcontractor-invoices
- https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/set-or-release-retainage-on-an-owner-invoice-legacy
