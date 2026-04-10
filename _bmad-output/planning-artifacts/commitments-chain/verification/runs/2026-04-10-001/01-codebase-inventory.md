# Codebase Inventory: Full Commitments Chain
**Date:** 2026-04-10
**Scope:** Prime Contracts → Commitments (+ SOV) → Subcontractor Invoicing → Owner Invoicing

---

## 1. PRIME CONTRACTS

### Pages
- **List:** `page.tsx`
- **Create:** `new/page.tsx`
- **Detail:** `[contractId]/page.tsx`
- **Edit:** `[contractId]/edit/page.tsx`
- **Invoice Detail (from contract):** `[contractId]/invoices/[invoiceId]/page.tsx`
- **Configure**
- **Change Orders List**
- **Create Prime CO**
- **Prime CO Detail**

### API Routes (28+)
Full CRUD on contracts, line items (with import), change orders (with approve/reject), payment applications (with populate-sov), payments, attachments (with download), settings, validation schemas. Also project-wide prime CO routes with approve/reject/attachments/export.

### Hooks
- **`use-prime-contracts.ts`** — Full CRUD via React Query:
  - `usePrimeContracts`
  - `usePrimeContract`
  - `useCreatePrimeContract`
  - `useUpdatePrimeContract`
  - `useDeletePrimeContract`

### Components
- `PrimeContractChangeOrdersTab`
- `PrimeContractPaymentsTab`
- `PrimeContractFinancialMarkupTab`
- `PrimeContractInvoicesTab`
- `PrimeContractAdvancedSettingsTab`
- `useSovEditing` hook

### Schemas
- `primeContractSchema` (Zod)
- `primeContractListResponseSchema` (Zod)
- `prime-contract-change-order-schema`
- API-level validation
- Table config

### DB Tables
- `prime_contracts` (UUID PK)
- `schedule_of_values` (FK to prime_contracts and commitments)
- `sov_line_items`
- `contract_change_orders`
- `prime_contract_payment_applications`
- `prime_contract_payments`

### Assessment
**COMPLETE** — Full CRUD, change orders, payments, payment applications, attachments, SOV editing.

---

## 2. COMMITMENTS

### Pages
- **List**
- **Create:** `new`
- **Detail:** `[commitmentId]`
- **Edit**
- **Invoice Detail (from commitment)**
- **Configure**
- **Settings**
- **Recycle Bin**
- **Create Commitment CO**
- **Commitment CO Detail**

### API Routes (30+)
Full CRUD on commitments (with inline PATCH), change orders (with approve), invoices, attachments, emails, email send, export, RFQs, related items, advanced settings, restore, permanent delete. Also project-level line items (with import), subcontractor SOV, PCOs, commitment change orders (project-wide), Acumatica sync.

### Hooks
- **`use-commitments-query.ts`:**
  - `useCommitmentsList`
  - `useCommitmentDetail`
  - `useCommitmentChangeOrdersQuery`
  - `useCommitmentInvoicesQuery`
  - `useDeleteCommitment`
  - `useUpdateCommitmentInline`
  - `useApproveChangeOrder`
  - `useCommitments` (dropdown)
- **Legacy `use-commitment-change-orders.ts`** — useState-based, not React Query

### Components (12 tab components)
- `ScheduleOfValuesTab`
- `SubcontractorSovTab`
- `ChangeOrdersTab`
- `PotentialChangeOrdersTab`
- `InvoicesTab`
- `PaymentsIssuedTab`
- `AttachmentsTab`
- `EmailsTab`
- `RfqsTab`
- `RelatedItemsTab`
- `AdvancedSettingsTab`
- `ChangeHistoryTab`
- Also: `ExportDialog`, `ExportCommitmentDialog`, `EmailCommitmentDialog`

### Schemas
- `commitmentListItemSchema`
- `commitmentListResponseSchema`
- `commitment-export-schema`
- `create-purchase-order-schema`
- `create-subcontract-schema`
- Table config

### DB Tables
- `purchase_orders` (UUID PK)
- `subcontracts` (UUID PK)
- **NO single "commitments" table** — API unifies both
- `commitment_change_order_lines`
- `commitment_pcos`

### Assessment
**COMPLETE** — Most comprehensive tool. Full CRUD, multiple sub-resources, recycle bin, Acumatica sync, inline editing.

---

## 3. SUBCONTRACTOR INVOICING

### Pages
- **Subcontractor List:** Redirects to `invoicing?tab=subcontractor`
- **Create:** `new`
- **Detail:** `[invoiceId]`
- **Main Invoicing Page:** Tabbed

### API Routes (20+)
Full CRUD on invoices. Workflow actions: submit, approve, approve-as-noted, revise, void, pending-owner-approval. Line items, related items, emails, change history, ERP resend. Billing periods (shared). Settings. Payments.

### Hooks
- **`use-subcontractor-invoices.ts`:**
  - `useSubcontractorInvoicesList`
  - `useSubcontractorInvoiceDetail`
  - `useCreateSubcontractorInvoice`
  - `useDeleteSubcontractorInvoice`
- **Shared:** `use-billing-periods`, `use-invoicing-settings`, `use-invoice-payments`

### Components
- `SubcontractorInvoiceDetail` (main)
- `InvoiceLineItemsTable`
- `InvoiceStatusBadge`
- Detail tabs:
  - `DetailTab`
  - `SummaryTab`
  - `EmailsTab`
  - `ChangeHistoryTab`
  - `RelatedItemsTab`

### DB Tables
- `subcontractor_invoices` (integer PK)
- `subcontractor_invoice_line_items`

### Assessment
**COMPLETE but with gap** — Missing `useUpdateSubcontractorInvoice` mutation hook (updates done inline via PATCH). No dedicated edit page.

---

## 4. OWNER INVOICING

### Pages
- **Main Invoicing Page:** Tabbed
- **Create:** `new`
- **Detail:** `[invoiceId]`
- **Legacy `/invoices/` routes**
- **Invoice from Prime Contract context**

### API Routes (15+)
Full CRUD. Workflow: submit, approve, approve-as-noted, revise, void. Line items (with single item route). PDF generation. Email with PDF. Also legacy `/api/invoices/` endpoint, commitment invoices endpoint.

### Hooks
- **`use-invoicing.ts`:**
  - `useOwnerInvoicesList`
  - `useSendInvoiceEmail`
  - `useDeleteOwnerInvoice`
  - `useApproveOwnerInvoiceAsNoted`
  - `useVoidOwnerInvoice`
- **Shared:** billing periods, settings, payments

### Components
- `InvoiceGeneralInfo`
- `InvoiceG702Summary`
- `InvoiceG703Detail`
- `InvoiceScheduleOfValues`
- `InvoiceAttachments`
- `InvoiceGeneralSettings`
- `InvoiceSummaryPreview`
- `CreateInvoiceDialog`
- Features:
  - `invoicing-table-config`
  - `invoicing-settings-tab`
  - `payments-tab`

### DB Tables
- `owner_invoices` (integer PK)
- `owner_invoice_line_items` (includes retainage fields)

### Assessment
**MOSTLY COMPLETE but with gaps:**
1. Missing `useCreateOwnerInvoice` and `useUpdateOwnerInvoice` hooks — create/update likely via direct fetch
2. No dedicated edit page — editing inline on detail
3. Legacy `/invoices/` routes coexist with `/invoicing/` routes

---

## 5. SHARED / CROSS-CUTTING

| Category | Items |
|----------|-------|
| **Shared DB Tables** | `billing_periods`, `schedule_of_values`, `sov_line_items` |
| **Shared Hooks** | `use-billing-periods`, `use-invoicing-settings`, `use-invoice-payments` |
| **Service Layer** | None — all logic lives in API route handlers |

---

## 6. CRITICAL GAPS SUMMARY

| Tool | Gap | Severity |
|------|-----|----------|
| Owner Invoicing | Missing `useCreateOwnerInvoice` and `useUpdateOwnerInvoice` hooks | Medium |
| Subcontractor Invoicing | Missing `useUpdateSubcontractorInvoice` hook | Low |
| Owner Invoicing | Legacy `/invoices/` routes coexist with `/invoicing/` | Low |
| Commitments | `use-commitment-change-orders.ts` is legacy useState, not React Query | Low |
| All tools | No service layer — all logic in API routes | Informational |
