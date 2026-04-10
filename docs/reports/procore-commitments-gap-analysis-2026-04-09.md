# Procore Research: Commitments Tool — Updated Gap Analysis

**Date:** 2026-04-09
**Question:** Where do we stand with the Commitments tool compared to Procore?
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (WebFetch)

---

## Executive Summary

Our Commitments tool has strong structural parity with Procore for the core list-view columns, create-form fields, and detail-page tabs. The primary gaps are:
1. **PCO/CCO tier architecture** — we have 1-tier only (flat CCOs); Procore supports 1, 2, and 3 tiers
2. **SSOV→SOV parent association** — our SSOV items are flat, not linked to parent SOV line items
3. **Unit/Quantity SOV columns** — we only support Amount-Based line items in the form
4. **Status values for PO** — our status list includes values that are subcontract-only
5. **DocuSign integration** — not implemented
6. **"Pending" status missing from subcontract statuses** — listed in our schema but not in Procore's
7. **Label "Revised Amount"** → should match Procore's exact "Revised Contract Amount"

Overall score: **8/10** — strong foundation with specific functional gaps documented below.

---

## 1. List View

### Tabs

| Tab | Procore | Ours | Status |
|-----|---------|------|--------|
| Contracts | ✅ (primary) | ✅ | ✅ Match |
| Change Orders | ✅ | ✅ | ✅ Match |
| Recycle Bin | ✅ | ✅ | ✅ Match |

### Columns (17 total in Procore)

| Column | Procore Label | Our Label | Status |
|--------|--------------|-----------|--------|
| Number | Number | Number | ✅ |
| Contract Company | Contract Company | Contract Company | ✅ |
| Title | Title | Title | ✅ |
| ERP Status | ERP Status | *(hidden, not shown by default)* | ⚠️ Have it but not visible |
| Status | Status | Status | ✅ |
| Executed | Executed | Executed | ✅ |
| SSOV Status | SSOV Status | SSOV Status | ✅ |
| Original Contract Amount | Original Contract Amount | Original Contract Amount | ✅ |
| Approved Change Orders | Approved Change Orders | Approved CO's | ⚠️ Label mismatch |
| Revised Contract Amount | Revised Contract Amount | Revised Amount | ⚠️ Label mismatch |
| Pending Change Orders | Pending Change Orders | Pending CO's | ⚠️ Label mismatch |
| Draft Change Orders | Draft Change Orders | Draft CO's | ⚠️ Label mismatch |
| Invoiced | Invoiced | Invoiced | ✅ |
| Payments Issued | Payments Issued | Pymts Issued | ⚠️ Label mismatch |
| % Paid | % Paid | % Paid | ✅ |
| Remaining Balance Outstanding | Remaining Balance Outstanding | Remaining Balance | ⚠️ Label mismatch |
| Private | Private | Private | ✅ |

**Extra columns we have (not in Procore):**
- Balance to Finish (hidden by default) — may be useful, keep hidden
- Created (date) — not in Procore list; keep hidden

### Filters

| Filter | Procore | Ours | Status |
|--------|---------|------|--------|
| Contract Company | ✅ (multi-select) | ✅ (text search) | ⚠️ Ours is text, Procore is dropdown |
| Status | ✅ | ✅ | ✅ |
| Executed | ✅ (Yes/No/All) | ✅ (Yes/No) | ✅ |
| Contract Type | ✅ (PO/Subcontract) | ✅ (Type filter) | ✅ |
| ERP Status | not mentioned | ✅ | ➕ Extra |
| SSOV Status | not mentioned | ✅ | ➕ Extra |

### Toolbar Actions

| Action | Procore | Ours | Status |
|--------|---------|------|--------|
| Create Subcontract | ✅ | ✅ | ✅ |
| Create Purchase Order | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ✅ |
| Export PDF | ✅ | ❌ | ❌ Missing |
| Search | ✅ | ✅ | ✅ |
| Column toggles | ✅ | ✅ | ✅ |

### Row Actions

| Action | Procore | Ours | Status |
|--------|---------|------|--------|
| Edit | ✅ | ✅ | ✅ |
| Delete (soft) | ✅ | ✅ | ✅ |
| Inline status edit | ✅ (status bubble) | ❌ | ❌ Missing |

---

## 2. Create Form

### Subcontract Fields

| Section | Field | Procore | Ours | Status |
|---------|-------|---------|------|--------|
| General | Contract Number | Optional | ✅ | ✅ |
| General | Contract Company | Optional | ✅ | ✅ |
| General | Title | Optional | ✅ | ✅ |
| General | Sign with DocuSign® | Optional | ❌ | ❌ Missing |
| General | Status | Optional | ✅ | ✅ |
| General | Executed | Optional (checkbox) | ✅ | ✅ |
| General | Default Retainage % | Optional | ✅ | ✅ |
| General | Description | Optional (rich text) | ✅ (plain text) | ⚠️ No rich text |
| Access | Private | Optional | ✅ | ✅ |
| Access | Invoice Contact | Optional | ✅ | ✅ |
| Dates | Start Date | Configurable | ✅ | ✅ |
| Dates | Estimated Completion | Configurable | ✅ | ✅ |
| Dates | Actual Completion | Configurable | ✅ | ✅ |
| Dates | Signed Contract Received | Configurable | ✅ | ✅ |
| Scope | Inclusions | Optional (rich text) | ✅ (plain text) | ⚠️ No rich text |
| Scope | Exclusions | Optional (rich text) | ✅ (plain text) | ⚠️ No rich text |
| SOV | Accounting Method toggle | Required | ✅ | ✅ |
| SOV | Budget Code (Amount-Based) | Required | ✅ | ✅ |
| SOV | Description (Amount-Based) | Required | ✅ | ✅ |
| SOV | Amount (Amount-Based) | Required | ✅ | ✅ |
| SOV | Qty (Unit/Quantity-Based) | Required | ❌ | ❌ Missing |
| SOV | UOM (Unit/Quantity-Based) | Required | ❌ | ❌ Missing |
| SOV | Unit Cost (Unit/Quantity-Based) | Required | ❌ | ❌ Missing |
| Attachments | File upload | Optional | ✅ | ✅ |

### Subcontract Statuses

| Status | Procore | Ours | Status |
|--------|---------|------|--------|
| Draft | ✅ | ✅ | ✅ |
| Out for Signature | ✅ | ✅ | ✅ |
| Out for Bid | ✅ | ✅ | ✅ |
| Approved | ✅ | ✅ | ✅ |
| Complete | ✅ | ✅ | ✅ |
| Terminated | ✅ | ✅ | ✅ |
| Void | ✅ | ✅ | ✅ |
| Pending | ❌ not listed | ✅ (in our schema) | ⚠️ Remove or hide |

---

## 3. Detail Page

### Tabs

| Tab | Procore | Ours | Status |
|-----|---------|------|--------|
| General | ✅ | ✅ | ✅ |
| Schedule of Values | ✅ | ✅ | ✅ |
| Subcontractor SOV | ✅ (subcontracts only) | ✅ (subcontracts only) | ✅ |
| Change Orders | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ |
| Payments Issued | ✅ | ✅ | ✅ |
| Emails | ✅ | ✅ | ✅ |
| Change History | ✅ | ✅ | ✅ |
| Attachments | ✅ | ✅ | ✅ |
| Advanced Settings | ✅ | ✅ | ✅ |
| RFQs | ❌ | ✅ | ➕ Extra |
| Related Items | ❌ | ✅ | ➕ Extra |

### General Tab — Contract Settings Column

| Field | Procore | Ours | Status |
|-------|---------|------|--------|
| Status | ✅ | ✅ | ✅ |
| Executed | ✅ | ✅ | ✅ |
| Contract Date | ✅ | ✅ | ✅ |
| Start Date | ✅ | ✅ | ✅ |
| Estimated Completion | ✅ | ✅ | ✅ |
| Actual Completion | ✅ | ✅ | ✅ |
| Signed Contract Received | ✅ | ✅ | ✅ |
| Issued On Date | ✅ | ✅ | ✅ |
| Default Retainage % | ✅ | ✅ (labeled correctly now) | ✅ |
| Created By | ✅ | ✅ (now resolves name, not UUID) | ✅ |
| Invoice Contact | ✅ | ✅ | ✅ |
| Private | ✅ | ✅ | ✅ |

### Contract Summary Report

| Row | Procore | Ours | Status |
|-----|---------|------|--------|
| Original Contract Amount | ✅ | ✅ | ✅ |
| Approved Change Orders | ✅ | ✅ | ✅ |
| Revised Contract Amount | ✅ | ✅ | ✅ |
| Pending Change Orders | ✅ | ✅ | ✅ |
| Pending Revised Contract Amount | ✅ | ✅ | ✅ |
| Total Invoiced Amount | ✅ | ✅ | ✅ |
| Retainage Released Amount | ✅ | ❌ | ❌ Missing |
| Total Payments Issued Amount | ✅ | ✅ | ✅ |
| Amount Due this Invoice | ✅ | ❌ | ❌ Not applicable (live calc) |
| Remaining Balance Outstanding | ✅ | ✅ | ✅ |

---

## 4. Change Order Architecture (Critical Gap)

Procore supports 3 configurable tiers for commitment change orders:

| Tier | Procore Flow | Ours | Status |
|------|-------------|------|--------|
| 1-Tier (default) | CCO → Approve | ✅ CCOs work | ✅ |
| 2-Tier | PCO → CCO → Approve | ❌ No PCO concept | ❌ Missing |
| 3-Tier | PCO → COR → CCO → Approve | ❌ | ❌ Missing |

**Our implementation:** 1-tier only. We create CCOs directly against commitments with no PCO intermediate step.

**Impact:** Clients using 2-tier workflows (very common) cannot track potential changes before formal commitment. This is a significant workflow gap.

**PCO fields** (when 2-tier is enabled in Procore):
- Number, Title, Status (Open/Pending/Approved/Rejected/Closed/In Review/In Dispute/Void)
- Contract Company, Amount, Description, Inclusions, Exclusions, Attachments

---

## 5. SSOV Architecture (Ongoing Gap)

From previous analysis (2026-04-09):

| Aspect | Procore | Ours | Status |
|--------|---------|------|--------|
| SSOV items linked to parent SOV line | ✅ Per-parent breakdown | ❌ Flat list | ❌ |
| Remaining to Allocate (per parent) | ✅ Computed per SOV line | ❌ Global only | ❌ |
| SSOV disabled for Unit/Quantity type | ✅ | ❌ | ❌ |
| Email notification to invoice contact | ✅ | ❌ | ❌ |
| Invoice contact submits SSOV themselves | ✅ | ❌ | ❌ |

---

## 6. Missing Features (Not Yet Implemented)

| Feature | Priority | Notes |
|---------|----------|-------|
| Inline status editing from list | Medium | Click status cell → change status inline |
| PDF export from list | Low | CSV works; PDF is secondary |
| DocuSign integration | Low | "Complete with DocuSign®" button on create/edit |
| PCO (Potential Change Order) concept | High | Required for 2-tier CO workflows |
| Unit/Quantity SOV line items | Medium | Qty, UOM, Unit Cost columns in SOV |
| Rich text for Description/Inclusions/Exclusions | Low | Currently plain textarea |
| SSOV parent link (source_sov_item_id) | High | Core SSOV workflow integrity |
| Retainage Released Amount in Contract Summary | Medium | Row missing from summary table |
| Email notification to invoice contact on SSOV add | Medium | Procore sends email when SSOV is added |
| Column label fixes | Low | "Approved CO's" → "Approved Change Orders", etc. |

---

## 7. What We Have That Procore Doesn't

| Feature | Notes |
|---------|-------|
| RFQs tab | Our custom feature |
| Related Items tab | Our custom feature |
| ERP Status filter | Useful, non-standard |
| SSOV Status filter | Useful, non-standard |
| Balance to Finish column | Useful analytical column |
| Card + List view modes | Procore table-only |

---

## Gap Priority Ranking

### High Priority (workflow blockers)
1. **PCO support** — 2-tier CO workflow is standard for GCs
2. **SSOV→SOV parent FK** — SSOV accuracy depends on this
3. **Unit/Quantity SOV line items** — some contracts use this accounting method

### Medium Priority (polish and completeness)
4. **Retainage Released Amount** in Contract Summary
5. **Email notification** to invoice contact when SSOV is added
6. **Inline status editing** in list view
7. **Column label precision** (full Procore label names)

### Low Priority (nice-to-have)
8. **PDF export**
9. **DocuSign integration**
10. **Rich text editors** for Description/Inclusions/Exclusions
11. **Remove "Pending" status** from subcontract (not a Procore status)

---

## Sources

- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/about-the-commitments-tool
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/search-for-and-apply-filters-to-the-commitments-tool
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-subcontracts
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/configure-the-number-of-commitment-change-order-tiers
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-change-order-cco
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-potential-change-order
- https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-a-subcontractor-schedule-of-values-ssov
- https://v2.support.procore.com/product-manuals/commitments-project/tutorials/add-a-subcontractor-sov-to-a-commitment
- Tier 2: `.claude/procore-manifests/commitments/manifest.json`
