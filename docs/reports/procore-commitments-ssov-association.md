# Procore Research: SSOV Line Item → SOV Parent Association

**Date:** 2026-04-09
**Question:** How are subcontractor SOV (SSOV) line items associated with parent SOV line items in Procore commitments?
**Sources used:** Tier 1 (RAG) + Tier 3 (WebFetch)

## Findings

From the official Procore article [Create a Subcontractor Schedule of Values (SSOV)](https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-a-subcontractor-schedule-of-values-ssov):

1. **SSOV is a detailed breakdown of one specific SOV line.**
   > "On the general 'Schedule of Values' tab for a commitment, each line item is assigned to a specific cost code and cost type. On the 'Subcontractor SOV' tab on a commitment, you may be asked to provide a more detailed breakdown of **a line item** on the 'Schedule of Values' tab."

2. **Association key is budget code + description** (not just budget code).
   > "Continue this step until the 'Remaining to Allocate' amount **for that budget code and description** reads $0.00."

3. **"Remaining to Allocate" is per-parent-line**, not global across the commitment.
   The Procore screenshot `sub-sov-remaining-to-allocate.png` shows the value rendered per parent SOV row, with SSOV child rows nested beneath.

4. **SSOV only applies to Amount-based commitments.**
   > "If a commitment is using the Unit/Quantity Based accounting method, adding the Subcontractor SOV is not supported."

5. **SSOV child fields:** `description`, `amount`. Budget code is inherited from the parent SOV line.

6. **ERP sync:** SSOV line items do NOT sync to the integrated ERP.

## Gap vs. Alleato Implementation

| Aspect | Procore | Alleato current | Action |
|---|---|---|---|
| Parent SOV ↔ SSOV association | Per-line (budget code + description) | None — SSOV is a flat list | Add FK `source_sov_item_id` on `subcontractor_sov_items` |
| Remaining to Allocate | Per parent SOV line | Global across commitment | Compute per parent line |
| Display layout | SSOV children nested under each SOV parent | Two separate tables (source SOV list + SSOV list) | Interleave rows: SOV parent → its SSOV children |
| Accounting method guard | Blocks SSOV for Unit/Qty | Not enforced | Add guard |
| ERP sync flag | SSOV excluded | Not tracked | Confirm excluded in commitments sync |

## Recommended Implementation

1. **Migration:** add `source_sov_item_id uuid REFERENCES subcontract_sov_items(id) ON DELETE CASCADE` to `subcontractor_sov_items`. Nullable during backfill, then NOT NULL.
2. **Backfill:** for each existing SSOV item, match to the SOV line with same `budget_code` on the same commitment; if ambiguous, leave null and flag for manual cleanup.
3. **API:** update PUT/POST handlers in `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts` to accept/return `source_sov_item_id`, and compute `remainingToAllocate` per parent.
4. **UI (`SubcontractorSovTab`):** render one row per source SOV line, with its children beneath indented. Each parent row shows its own "Remaining To Allocate". Add "Add line item" button per parent.
5. **Guard:** disable the SSOV tab (or show a notice) when commitment `accounting_method === 'unit_quantity'`.

## Sources

- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-a-subcontractor-schedule-of-values-ssov
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/update-a-subcontractor-schedule-of-values-as-an-invoice-contact-from-the-commitments-tool
