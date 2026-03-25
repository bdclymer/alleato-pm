# Acumatica ERP Sync — Full Implementation Plan

**Status:** Planning
**Created:** 2026-03-06
**Reference:** Procore-Acumatica Edge Connector (data model mirror)

---

## Overview

This plan implements a bidirectional sync between Alleato PM and Acumatica ERP, modeled exactly on how Procore's Edge Connector for Acumatica works. The integration has two directions:

- **Acumatica → App (Import):** Pull accounting data into Alleato PM (read-only in Acumatica, safe immediately)
- **App → Acumatica (Export):** Push project/financial records to Acumatica (requires write permissions, Phase 2+)

---

## Sync Direction Matrix

Mirroring the Procore-Acumatica data flow exactly:

| Entity | Direction | Acumatica Record | Our App Record | Notes |
|--------|-----------|-----------------|----------------|-------|
| Vendors | Acumatica → App | Vendor | vendors | Pull vendor list, enrich with ERP IDs |
| Vendors | App → Acumatica | Vendor | vendors | Export new vendors; Acumatica ID entered by accounting approver |
| Projects | App → Acumatica | Project/Job | projects | Uses `acumatica_project_id` column (already exists) |
| Cost Codes | App → Acumatica | Cost Code | cost_codes | Auto-refresh on export (Procore pattern) |
| Budget | App → Acumatica | Cost Budget | budget_lines | Export original + modifications |
| Budget Actuals | Acumatica → App | Job Cost Transactions | direct_costs | **Primary import — replaces manual process** |
| Subcontracts | App → Acumatica | Subcontract | subcontracts | Status: Open in Acumatica |
| Purchase Orders | App → Acumatica | Purchase Order | purchase_orders | |
| Commitment Change Orders | App → Acumatica | Commitment CO | change_orders | |
| Subcontractor Invoices | App → Acumatica | AP Bill | direct_costs (Subcontractor Invoice type) | Creates Bill On Hold in Acumatica |
| AP Bill Payments | Acumatica → App | Check/Payment | direct_costs (paid_date, status=Paid) | Payment flows back automatically |
| Prime Contract COs (PCCOs) | App → Acumatica | Revenue Budget Change | change_orders (prime contract) | |
| Credit Card Transactions | Acumatica → App | AP Bill / Journal Entry | credit_card_transactions (new table) | **The main new feature** |

---

## Source of Truth (matching Procore model)

| Data | Source of Truth |
|------|----------------|
| Project setup, team, scope | Alleato PM |
| Budget (original + modifications) | Alleato PM → pushed to Acumatica |
| Commitments (subcontracts, POs) | Alleato PM → pushed to Acumatica |
| Job cost actuals, AP transactions | Acumatica → pulled into Alleato PM |
| Payment status on invoices | Acumatica → pulled into Alleato PM |
| Vendor master list | Acumatica (source), synced into Alleato PM |
| Credit card transactions | Acumatica (via bank feed or Capital One import) |

---

## Phase 1: Import Only — Acumatica → App (Safe, No Write Permissions Needed)

### 1A. Vendor Sync (Pull)

**What:** Pull all active vendors from Acumatica into `vendors` table
**Why:** Ensures dropdown lists in the app show real Acumatica vendor IDs
**Acumatica endpoint:** `GET /entity/Default/24.200.001/Vendor?$top=500`
**Already implemented:** `client.getVendors()` exists

**Schema change needed — add to `vendors`:**
```sql
ALTER TABLE vendors ADD COLUMN acumatica_vendor_id TEXT;
ALTER TABLE vendors ADD COLUMN acumatica_sync_at TIMESTAMPTZ;
CREATE UNIQUE INDEX ON vendors (acumatica_vendor_id) WHERE acumatica_vendor_id IS NOT NULL;
```

**Sync logic:**
- Match by `VendorName` (fuzzy) or exact `VendorID`
- On match: update `acumatica_vendor_id` + enrich contact fields
- On no match: create new vendor record
- Run nightly + on-demand button in admin UI

---

### 1B. Job Cost Transaction Import (Pull) — **Highest Priority**

**What:** Pull AP Bills and Journal Transactions from Acumatica and import them as Direct Costs
**Why:** Replaces the manual "export from Acumatica, import to app" workflow
**Acumatica endpoints:** `GET /entity/Default/24.200.001/Bill` (with `$expand=Details`)

**How Procore does it:** Acumatica cost transactions import nightly AND on-demand, creating records in the Direct Cost tool per project per cost code.

**Schema change needed — add to `direct_costs`:**
```sql
ALTER TABLE direct_costs ADD COLUMN acumatica_ref_nbr TEXT; -- Bill ReferenceNbr
ALTER TABLE direct_costs ADD COLUMN acumatica_sync_at TIMESTAMPTZ;
ALTER TABLE direct_costs ADD COLUMN acumatica_financial_period TEXT;
CREATE UNIQUE INDEX ON direct_costs (acumatica_ref_nbr) WHERE acumatica_ref_nbr IS NOT NULL;
```

**Sync logic:**
- Pull bills filtered by `acumatica_project_id` on each project
- Match bill line items to `cost_codes` by `CostCodeID`
- Upsert into `direct_costs` (insert new, update status/paid_date on existing)
- Set `status = 'Paid'` when Acumatica bill `Balance = 0`
- Run nightly + on-demand per project

---

### 1C. Credit Card Transaction Import (CSV Upload) — **New Feature**

**CONFIRMED:** Capital One transactions are NOT in Acumatica. They exist only in Capital One
and are manually imported into Acumatica as **cash transactions** (not AP Bills).
The current process: Capital One CSV → Notion (manual coding) → CSV export → Acumatica import.

**What we replace:** The entire middle section. CSV still comes from Capital One, but instead
of Notion + manual coding, we use AI to code them and export a ready-to-import Acumatica CSV.

**Acumatica import format:** Cash Purchase / GL Journal Entry CSV
Required columns (matching Acumatica's Cash Purchases import scenario):
- `ReferenceNbr` — unique per transaction (we generate: CC-{date}-{seq})
- `Date` — transaction date
- `Description` — merchant name + original description
- `Amount` — transaction amount
- `CashAccount` — the credit card GL account in Acumatica (e.g., "CAPONE-VISA")
- `AccountID` — GL expense account (from cost code mapping)
- `ProjectID` — Acumatica project ID (from `acumatica_project_id` on projects table)
- `ProjectTaskID` / `CostCodeID` — cost code
- `VendorID` — optional, merchant as vendor if exists in Acumatica

**CONFIRMED: No Acumatica read needed for this workflow.** Pure CSV in, CSV out.

**New table:**
```sql
CREATE TABLE credit_card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch_id UUID REFERENCES cc_upload_batches(id),
  capital_one_ref TEXT,                      -- Original Capital One transaction ID if present
  transaction_date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  cardholder_name TEXT,
  card_last_four TEXT,
  raw_category TEXT,                          -- Capital One spending category

  -- AI coding fields
  status TEXT DEFAULT 'pending',              -- pending / coded / approved / exported
  suggested_job_id BIGINT REFERENCES projects(id),
  suggested_cost_code_id TEXT REFERENCES cost_codes(id),
  ai_confidence TEXT,                         -- high / medium / low
  ai_reasoning TEXT,
  ai_coded_at TIMESTAMPTZ,

  -- Human override
  final_job_id BIGINT REFERENCES projects(id),
  final_cost_code_id TEXT REFERENCES cost_codes(id),
  coded_by UUID REFERENCES auth.users(id),
  coded_at TIMESTAMPTZ,

  -- Export tracking
  exported_at TIMESTAMPTZ,
  acumatica_cash_purchase_ref TEXT,           -- ReferenceNbr used in the Acumatica import CSV
  export_batch_id UUID,                       -- groups transactions exported together

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cc_upload_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,                       -- 'capital_one_csv' | 'plaid' (future)
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  filename TEXT,
  row_count INTEGER,
  status TEXT DEFAULT 'processing'            -- processing / complete / failed
);

CREATE TABLE cc_coding_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  rule_type TEXT NOT NULL,                    -- 'merchant_name' | 'merchant_category' | 'cardholder' | 'card_number'
  match_value TEXT NOT NULL,
  job_id BIGINT REFERENCES projects(id),
  cost_code_id TEXT REFERENCES cost_codes(id),
  priority INTEGER DEFAULT 0,
  active_from DATE,
  active_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 1D. Invoice Payment Status Sync (Pull)

**What:** When Acumatica pays an AP Bill, sync the payment back
**Why:** Keeps subcontractor invoice status accurate without manual updates
**How Procore does it:** Payments flow back automatically from Acumatica Checks & Payments

**Sync logic:**
- Pull Bills where `Balance = 0` and `Status = 'Closed'`
- Find matching `direct_costs` record by `acumatica_ref_nbr`
- Update `status = 'Paid'`, `paid_date = payment date`
- Pull Check records for payment details

---

## Phase 2: Export — App → Acumatica (Requires Write Permissions)

### 2A. Vendor Export

**What:** Create new vendors in Acumatica when added in the app
**Acumatica endpoint:** `PUT /entity/Default/24.200.001/Vendor`
**Procore pattern:** Accounting Approver manually enters the ERP Vendor ID after review

**Flow:**
1. App creates vendor → status = `Pending ERP Export`
2. Accounting Approver reviews → clicks "Export to Acumatica"
3. App calls Acumatica PUT → gets back VendorID
4. Stores `acumatica_vendor_id` on vendor record

---

### 2B. Subcontract / Purchase Order Export

**What:** When a commitment is approved in the app, create it in Acumatica
**Acumatica endpoint:** `PUT /entity/Default/24.200.001/PurchaseOrder` or `Subcontract`
**Procore pattern:** Commitment exports from Procore only; status = Open in Acumatica

**Schema change needed:**
```sql
ALTER TABLE subcontracts ADD COLUMN acumatica_order_nbr TEXT;
ALTER TABLE subcontracts ADD COLUMN acumatica_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE purchase_orders ADD COLUMN acumatica_order_nbr TEXT;
ALTER TABLE purchase_orders ADD COLUMN acumatica_sync_status TEXT DEFAULT 'not_synced';
```

**Flow:**
1. Commitment reaches `Approved` / `Executed` status
2. "Export to Acumatica" button appears (or auto-trigger on approval)
3. Accounting Approver confirms → app pushes to Acumatica
4. Stores `acumatica_order_nbr` back on the record

---

### 2C. Subcontractor Invoice Export (AP Bill Creation)

**What:** Export approved subcontractor invoices to Acumatica as AP Bills
**Acumatica endpoint:** `PUT /entity/Default/24.200.001/Bill`
**Procore pattern:** Creates AP Bill in Acumatica with status = On Hold for accounting review

**Flow:**
1. Invoice approved in app → `status = 'Approved'`
2. Accounting Approver exports → AP Bill created in Acumatica (On Hold)
3. Accounting reviews/releases in Acumatica
4. Payment syncs back to app (Phase 1D handles this automatically)

---

### 2D. Budget Export

**What:** Push original budget and budget modifications to Acumatica
**Acumatica endpoint:** `PUT /entity/Default/24.200.001/ProjectBudget` (or Cost Budget API)
**Procore pattern:** Budget Modifications in Procore create Cost Budget Change Orders in Acumatica (On Hold)

---

## Phase 3: Credit Card Workflow (Full Automation)

**Source:** Capital One CSV export only (transactions not in Acumatica until we import them)
**Destination:** Acumatica Cash Purchase import CSV (same format the team manually creates today)

### Full Flow

```
Capital One CSV upload (drag-and-drop)
        ↓
Parse into credit_card_transactions table
        ↓
Apply cc_coding_rules (Brennan's criteria — deterministic, runs first)
        ↓
AI codes remaining transactions (OpenAI via AI SDK — merchant analysis + history)
        ↓
Review UI — traffic light table
  Green  (high confidence)  → bulk approve with 1 click
  Yellow (medium confidence) → confirm or override per row
  Red    (low confidence)    → manual job + cost code selection
        ↓
Generate Acumatica Cash Purchase import CSV
  Columns: ReferenceNbr, Date, Description, Amount, CashAccount,
           AccountID, ProjectID, CostCodeID, VendorID
        ↓
Download CSV → upload to Acumatica (same as today, but file is already coded)
```

### What This Eliminates
- Notion entirely (gone)
- Manual coding by each team member (90% gone — only flagged items remain)
- CSV formatting/reformatting step (gone — we generate the right format)

### What Stays Manual (for now)
- Capital One CSV export (until Phase 4/Plaid)
- Final upload to Acumatica (until Phase 5 when we have write permissions)

### Key Details

1. **Rules Session UI** — Brennan sets weekly coding criteria via natural language
2. **AI Auto-Coder** — Applies rules → then OpenAI analysis → confidence scoring
3. **Review UI** — Traffic light system (green/yellow/red) with bulk approve
4. **Export** — Generates Acumatica-formatted Cash Purchase CSV for download

### One Thing to Confirm Before Building
We need a sample of the **Acumatica Cash Purchase import CSV** that the team currently
uploads — this tells us exactly which columns and format to generate.
Ask Brennan or accounting to export a completed one from Acumatica.

### CashAccount value
Need to know: what is the GL Cash Account name in Acumatica for the Capital One credit card?
(e.g., "CAPONE", "CC-VISA", "2000-AMEX") — this goes on every row of the export.

---

## Technical Architecture

### Sync Service

New file: `frontend/src/lib/acumatica/sync.ts`

```
AcumaticaSyncService
  ├── syncVendors(companyId)           — Phase 1A
  ├── syncJobCosts(projectId)          — Phase 1B
  ├── parseCreditCardCSV(file)         — Phase 3 (Capital One CSV → DB)
  ├── syncPaymentStatus(projectId)     — Phase 1D
  ├── exportVendor(vendorId)           — Phase 2A
  ├── exportCommitment(commitmentId)   — Phase 2B
  ├── exportInvoice(invoiceId)         — Phase 2C
  └── exportBudget(projectId)          — Phase 2D
```

### Sync Scheduler (nightly)

New API route: `frontend/src/app/api/sync/acumatica/route.ts`
- Triggered by Vercel Cron (daily at 2am)
- Loops all projects with `acumatica_project_id` set
- Runs Phase 1 imports for each

### Admin UI

New page: `frontend/src/app/(main)/admin/acumatica-sync/page.tsx`
- Project mapping table (link projects to Acumatica project IDs)
- Manual sync trigger buttons
- Last sync timestamps + status
- Error log

### Acumatica Client Extensions

Add to `frontend/src/lib/acumatica/client.ts`:
- `getBillsForProject(acumaticaProjectId)` — expanded with Details
- `getJournalTransactionsForProject(acumaticaProjectId)`
- `putVendor(vendor)` — Phase 2
- `putBill(bill)` — Phase 2
- `putPurchaseOrder(po)` — Phase 2

---

## Known Acumatica API Constraints (from MEMORY)

- **NEVER use OData `$filter`** — causes HTTP 500 "Type conversions not supported"
- Safe params: `$select`, `$top`, `$expand` only
- Filter in-memory after fetching
- Company name: `"Alleato Group LLC"` (exact casing)
- API version: `24.200.001`
- Auth: Cookie-based (POST /entity/auth/login → 204 + cookies)

This means for job cost imports, we fetch all bills and filter by project in-memory using the `ProjectID` field on bill line items.

---

## Build Order (Recommended)

### Sprint 1 — Foundation (1 week)
1. DB migrations (add acumatica columns to vendors, direct_costs, subcontracts, purchase_orders)
2. New tables: credit_card_transactions, cc_upload_batches, cc_coding_rules
3. Extend Acumatica client with `getBillsForProject`, `getVendors` (already done)
4. Admin project mapping UI (link projects to acumatica_project_id)

### Sprint 2 — Job Cost Import (1 week)
5. `syncJobCosts(projectId)` service method
6. Nightly Vercel cron job
7. Manual "Sync Now" button in project settings
8. Direct Costs page shows `acumatica_ref_nbr` + sync status badge

### Sprint 3 — Credit Card Coding (2 weeks)
9. Capital One CSV upload + parser
10. `cc_coding_rules` UI (Brennan's rules session)
11. AI coding engine (apply rules → Claude analysis → confidence scoring)
12. Review UI (green/yellow/red traffic light table)
13. CSV export in Acumatica import format

### Sprint 4 — Vendor Sync (0.5 week)
14. `syncVendors()` service — enrich vendor records with Acumatica IDs
15. Vendor dropdown in app shows Acumatica-linked vendors with ERP ID badge

### Sprint 5 — Export to Acumatica (2 weeks, requires write permissions)
16. `exportCommitment()` — subcontracts + POs → Acumatica
17. `exportInvoice()` — subcontractor invoices → AP Bills
18. Accounting Approver workflow (review queue before any Acumatica write)
19. Payment sync-back (Phase 1D)

---

## Open Questions Before Building

### Already Answered
- **Credit card source:** Capital One CSV only — NOT in Acumatica yet. Imported as cash transactions.

### Still Need
1. **Capital One CSV columns** — Need a sample export. What columns does it have?
   (Typical: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit)
2. **Acumatica Cash Purchase import format** — Need a completed example CSV that the team
   currently uploads. This defines the exact output format we generate.
3. **Acumatica GL CashAccount name** — What is the GL account for the Capital One card?
4. **Cost code mapping** — Do Acumatica `CostCodeID` values match our `cost_codes.id` format,
   or is there a translation needed?
5. **Who codes today?** — Does each cardholder code their own, or does one person do all?
   This affects whether we need per-cardholder views in the review UI.
6. **Write permissions (for Phase 2+ only)** — Does `ACCOUNTING_USER` have write access?

---

## References

- [Procore Edge Connector for Acumatica — Detailed Data Mapping](https://support.procore.com/products/online/user-guide/company-level/erp-integrations/acumatica-construction/detailed-data-mapping)
- [About the Procore-Acumatica Integration](https://support.procore.com/products/online/user-guide/company-level/erp-integrations/acumatica-construction/about)
- [Export Subcontractor Invoices from Procore to Acumatica](https://support.procore.com/integrations/acumatica-construction/tutorials/export-subcontractor-invoices-from-procore-to-acumatica)
- [Import Direct Costs and Invoice Payments](https://support.procore.com/integrations/acumatica-construction/tutorials/import-direct-costs-and-invoice-payments-across-all-projects-using-these-integrations)
- [Import a Budget from Acumatica](https://support.procore.com/integrations/acumatica-construction/tutorials/import-a-budget-from-acumatica)
- [SWK Complete Guide to Acumatica & Procore](https://www.swktech.com/the-complete-guide-to-acumatica-procore-for-construction/)
