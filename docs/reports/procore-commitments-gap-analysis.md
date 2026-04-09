# Procore Research: Commitments Gap Analysis

**Date:** 2026-04-09
**Question:** How does our commitments implementation compare to Procore?
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (WebFetch)

---

## Summary

Our commitments implementation covers the core structure well — list view, detail tabs, SOV, SSOV, change orders, invoices, payments. The main gaps are in the KPI/financial summary panel, a handful of missing date fields, and the absence of Procore's configurable change order tier system (PCO → CCO workflow).

---

## List View

### Columns

| Procore Column | Our Column | Status |
|---|---|---|
| Number | Number | ✅ Match |
| Contract Company | Contract Company | ✅ Match |
| Title | Title | ✅ Match |
| ERP Status | ERP Status | ✅ Match (hidden by default) |
| Status | Status | ✅ Match |
| Executed | Executed | ✅ Match (hidden by default) |
| SSOV Status | SSOV Status | ✅ Match (hidden by default) |
| Original Contract Amount | Original Amount | ⚠️ Minor label diff |
| Approved Change Orders | Approved COs | ⚠️ Minor label diff |
| Revised Contract Amount | Revised Amount | ⚠️ Minor label diff |
| Pending Change Orders | Pending COs | ⚠️ Minor label diff |
| Draft Change Orders | Draft COs | ⚠️ Minor label diff |
| Invoiced | Invoiced | ✅ Match |
| Payments Issued | Payments Issued | ✅ Match |
| % Paid | % Paid | ✅ Match |
| Remaining Balance Outstanding | Remaining Balance | ⚠️ Minor label diff |
| Private | Private | ✅ Match (hidden by default) |
| — | Type | ➕ We add this (useful, not in Procore default) |
| — | Billed to Date | ➕ We add this |
| — | Balance to Finish | ➕ We add this |

**Verdict:** Column parity is excellent. Label differences are cosmetic — consider renaming to match Procore exactly for user familiarity.

### List Tabs

| Procore Tab | Our Tab | Status |
|---|---|---|
| Commitments (all) | Commitments | ✅ |
| (filter by type) | Subcontracts | ✅ |
| (filter by type) | Purchase Orders | ✅ |
| Purchase Order Change Orders | ❌ Missing | ❌ Gap |
| — | Recycle Bin | ➕ We add this |

**Gap:** Procore has a dedicated "Purchase Order Change Orders" tab at the list level showing all CCOs across all POs. We only surface change orders inside each commitment's detail view.

### Expandable Change Order Sub-Table (Per Row)

**This is a significant missing feature.** In Procore's list view, each commitment row has an expand toggle (chevron). Clicking it reveals an inline sub-table of that commitment's change orders without leaving the list. The sub-table columns are:

| Sub-table Column | In Our List? |
|---|---|
| Change Order Status | ❌ |
| ERP Status | ❌ |
| Executed | ❌ |
| Approved Change Orders | ❌ |
| Pending Change Orders | ❌ |
| Draft Change Orders | ❌ |

**Gap:** We have no inline expandable change order rows in our list view. Users must navigate into each commitment's detail page → Change Orders tab to see this data. Procore lets users scan all COs across all commitments without leaving the list.

### List Filters

| Procore Filter | Our Filter | Status |
|---|---|---|
| Contract Company | ❌ Missing | ❌ Gap |
| Contract Type | Type | ✅ |
| ERP Status | ❌ Missing | ❌ Gap |
| Status | Status | ✅ |
| Executed | ❌ Missing | ❌ Gap |
| SSOV Status | ❌ Missing | ❌ Gap |

**Gap:** We only filter by Status and Type. Procore has 6 filter dimensions.

---

## Create Form

### Sections

| Procore Section | Our Section | Status |
|---|---|---|
| General Info (title, company, number, description) | GeneralInfoSection | ✅ |
| Schedule of Values | SovSection | ✅ |
| Inclusions & Exclusions | InclusionsExclusionsSection | ✅ |
| Contract Dates | ContractDatesSection | ✅ |
| Privacy | PrivacySection | ✅ |
| Invoice Contacts | InvoiceContactsSection | ✅ |
| Attachments | FileUploadField | ✅ |

**Verdict:** Create form section coverage is complete.

---

## Detail View

### Tabs

| Procore Tab | Our Tab | Status |
|---|---|---|
| General (overview) | General | ✅ |
| Schedule of Values | SC SOV / PO SOV | ✅ |
| Subcontractor SOV | Subcontractor SOV | ✅ (subcontracts only) |
| Change Orders | Change Orders | ✅ |
| Invoices | Invoices | ✅ |
| Payments | Payments Issued | ✅ |
| Emails | Emails | ✅ |
| Change History | Change History | ✅ |
| Attachments | Attachments | ✅ |
| Advanced Settings | Advanced Settings | ✅ |
| — | RFQs | ➕ We add this |

**Verdict:** Tab parity is excellent.

### General Tab — Field Coverage

| Procore Field | Our Field | Status |
|---|---|---|
| Contract # | PO # / Subcontract # | ✅ |
| Contract Company | Invoice Contact (linked) | ⚠️ Label mismatch — we call it "Invoice Contact" but it's the contract company |
| Title | Title | ✅ |
| Status | Status | ✅ |
| Executed (boolean) | — | ❌ Gap — Procore treats Executed as a separate boolean; we have it as a column/status option |
| Default Retainage | Retention | ✅ |
| Description | Description | ✅ |
| Inclusions | Inclusions | ✅ |
| Exclusions | Exclusions | ✅ |
| Start Date | Start Date | ✅ |
| Estimated Completion Date | Estimated Completion | ✅ |
| **Actual Completion Date** | ❌ Missing | ❌ Gap |
| Contract Date | Contract Date | ✅ |
| Signed Contract Received Date | Signed Contract Received | ✅ |
| **Issued On Date** | ❌ Missing | ❌ Gap |
| Private | Visibility (Public/Private) | ✅ |
| Access for Non-Admin Users | — | ❌ Gap — Procore lets you specify which non-admin users can access; we show a toggle only |
| View SOV Items | Non-Admin Can View SOV Items | ✅ |
| Invoice Contacts | — | ❌ Gap — not surfaced in our General tab |
| Accounting Method | Accounting Method | ✅ |

### Financial KPI Strip / Contract Summary

Procore shows a **10-metric Contract Summary** panel. We show **5 KPIs**.

| Procore Metric | Ours | Status |
|---|---|---|
| Original Contract Amount | Original Contract | ✅ |
| Approved Change Orders | Approved COs | ✅ |
| Revised Contract Amount | Revised Contract | ✅ |
| **Pending Change Orders** | ❌ Missing | ❌ Gap |
| **Draft Change Orders** | ❌ Missing | ❌ Gap |
| **Pending Revised Contract Amount** | ❌ Missing | ❌ Gap |
| Invoices | Billed to Date | ⚠️ Close but different label |
| **Payments Issued** | ❌ Missing | ❌ Gap |
| **Remaining Balance** | ❌ Missing | ❌ Gap |
| **Percent Paid** | ❌ Missing | ❌ Gap |
| — | Balance to Finish | ➕ We add this |

**Gap:** Our KPI strip is missing 6 of Procore's 10 financial summary metrics.

---

## Change Order Workflow (CCO Tiers)

Procore supports configurable change order tiers at the project level:

| Tier | Workflow |
|---|---|
| **1-tier** | Create CCO directly on the commitment |
| **2-tier** | Create PCO (Potential Change Order) → promote to CCO |
| **3-tier** | Create PCO → group into batch → promote to final CCO |

**Our implementation:**
- We support direct CCO creation via the Change Orders tab ✓ (1-tier)
- We have an RFQs tab (Request for Quote) which is adjacent to but not the same as PCOs
- We do **not** support 2-tier or 3-tier CCO workflows
- Procore's PCO is a different concept from our RFQ — PCOs track pending scope changes before they become approved CCOs; RFQs are solicitations for pricing

**Gap:** No PCO (Potential Change Order) concept. No configurable tier setting. Missing the 2-tier PCO → CCO promotion workflow that many GCs use.

---

## Status Values

| Procore Status | Ours | Status |
|---|---|---|
| Draft | Draft | ✅ |
| Pending Signature | Pending | ⚠️ Slight naming diff |
| Approved | Approved | ✅ |
| Out for Signature | Out for Signature | ✅ |
| Executed | Executed | ✅ |

Note: In Procore, "Executed" is also tracked separately as a boolean field (is the contract fully executed/signed) independent of the status workflow.

---

## Features Present in Procore — Not in Our App

| Feature | Priority |
|---|---|
| Actual Completion Date field | Medium |
| Issued On Date field | Low |
| Invoice Contacts surfaced in General tab | Medium |
| "Contract Company" label (we say "Invoice Contact") | Low |
| Executed as a boolean field separate from status | Medium |
| Access for Non-Admin Users — user list | Low |
| Purchase Order Change Orders tab at list level | Medium |
| List filters: Contract Company, ERP Status, Executed, SSOV Status | Medium |
| PCO (Potential Change Order) — 2-tier CO workflow | High |
| Pending Revised Contract Amount KPI | Medium |
| Pending COs + Draft COs in KPI strip | Medium |
| Payments Issued + Remaining Balance + % Paid in KPI strip | Medium |
| DocuSign integration for contract signing | Low |
| Configurable CCO tier setting (1/2/3 tier) | High |

---

## Features We Have That Procore Doesn't

| Feature | Note |
|---|---|
| RFQs tab | Request for Quote — related but different from Procore's PCO |
| Acumatica ERP Sync button | Our ERP, not Procore Pay |
| Recycle Bin tab | Soft delete + restore |
| Balance to Finish KPI | Useful financial metric |
| Type column in list | Makes Subcontract vs PO visible at a glance |

---

## Top Recommended Fixes (Priority Order)

1. **Add PCO concept** — 2-tier CO workflow is heavily used; currently our "Change Orders" tab only does 1-tier CCOs
2. **Expandable CO sub-table in list** — Each row should expand to show its change orders inline (Status, ERP Status, Executed, Approved COs, Pending COs, Draft COs) without navigating away
3. **Expand KPI strip** — Add Pending COs, Draft COs, Payments Issued, Remaining Balance, % Paid, and Pending Revised Contract Amount (show 8–10 metrics, collapsible)
4. **Add list filters** — Contract Company, ERP Status, Executed boolean, SSOV Status
5. **Add missing date fields** — Actual Completion Date, Issued On Date to General tab
6. **Label fix** — "Invoice Contact" in General tab should be "Contract Company"; it is the vendor, not the invoice contact
7. **Add Purchase Order Change Orders** tab at list level
8. **Invoice Contacts** — show the configured invoice contacts in the General tab read view

---

## Sources

- Tier 1 RAG: `https://v2.support.procore.com/product-manuals/commitments-project/`
- Tier 1 RAG: `https://v2.support.procore.com/product-manuals/commitments-project/tutorials/add-a-line-item-to-a-schedule-of-values`
- Tier 1 RAG: `https://v2.support.procore.com/product-manuals/commitments-project/tutorials/configure-the-number-of-commitment-change-order-tiers`
- Tier 1 RAG: `https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-change-order-cco`
- Tier 2 Manifest: `.claude/procore-manifests/commitments/manifest.json` (captured 2026-04-07)
- Tier 2 Code: `frontend/src/app/(main)/[projectId]/commitments/page.tsx`
- Tier 2 Code: `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx`
- Tier 2 Code: `frontend/src/features/commitments/commitments-table-config.tsx`
