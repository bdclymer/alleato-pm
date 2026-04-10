# Gap Analysis Report: Full Commitments Chain
**Date:** 2026-04-10
**Scope:** Prime Contracts → Commitments → Sub Invoicing → Owner Invoicing
**Focus Areas:** Retainage, Approval Workflows, SOV Approval, Permissions

---

## Executive Summary
- Total gaps found: ~23
- Critical: 5 | High: 7 | Medium: 11 | Low: ~6
- **#1 priority:** Owner Invoice Detail page is fundamentally broken (no tabs, design violations, missing features)
- **#2 priority:** Missing React Query hooks prevent proper workflow transitions on both invoice types
- **#3 priority:** DB schema gaps on owner invoice line items block retainage tracking

## Critical Gaps (Must Fix)

### GAP-001: Owner Invoice Detail Page — No Tab Structure
- **Severity:** CRITICAL
- **File:** `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`
- **Problem:** Monolithic page with no tabs. Missing Summary, Related Items, Change History tabs. Uses Card wrappers (design violation), raw `<input>` instead of `<Input>`, wrong StatusBadge import path.
- **Procore Reference:** Detail view should have tabs: Summary, Detail (G703), Related Items, Emails, Change History
- **Fix:** Rebuild page using PageShell variant="detail" with proper tab structure matching SubcontractorInvoiceDetail pattern.

### GAP-002: Owner Invoice Line Items — Missing Retainage Fields
- **Severity:** CRITICAL
- **Table:** `owner_invoice_line_items`
- **Problem:** Missing `materials_retainage_pct`, `materials_retainage_amount`, `previous_work_retainage`, `previous_materials_retainage` columns. These exist on `subcontractor_invoice_line_items` but not owner.
- **Procore Reference:** Owner invoices use identical retainage columns as sub invoices (AIA G702/G703)
- **Fix:** DB migration to add 4 columns. Update API routes and types.

### GAP-003: Owner Invoices Status — Plain String, Not Enum
- **Severity:** CRITICAL
- **Table:** `owner_invoices.status`
- **Problem:** Status is `string | null` instead of `invoice_status` enum. No DB-level validation.
- **Procore Reference:** Statuses are: Draft, Under Review, Approved, Approved as Noted, Revise & Resubmit, Paid
- **Fix:** DB migration to change column to use `invoice_status` enum (same as subcontractor_invoices).

### GAP-004: Missing Sub Invoice Workflow Hooks
- **Severity:** CRITICAL
- **File:** `frontend/src/hooks/use-subcontractor-invoices.ts`
- **Problem:** No mutation hooks for: useUpdateSubcontractorInvoice, useSubmitSubcontractorInvoice, useApproveSubcontractorInvoice, useReviseSubcontractorInvoice, useVoidSubcontractorInvoice
- **API routes exist** — just no hooks wrapping them
- **Fix:** Add 5 mutation hooks to the existing file.

### GAP-005: Missing Owner Invoice Workflow Hooks
- **Severity:** CRITICAL
- **File:** `frontend/src/hooks/use-invoicing.ts`
- **Problem:** No hooks for: useCreateOwnerInvoice, useUpdateOwnerInvoice, useOwnerInvoiceDetail, useSubmitOwnerInvoice, useApproveOwnerInvoice, useReviseOwnerInvoice
- **Some API routes exist** — hooks are missing
- **Fix:** Add 6 mutation/query hooks to the existing file.

## High Gaps

### GAP-006: Owner Invoice Detail — Missing Related Items Tab
- **Severity:** HIGH
- **Fix:** Add RelatedItemsTab component (pattern exists on SubcontractorInvoiceDetail)

### GAP-007: Owner Invoice Detail — Missing Change History Tab
- **Severity:** HIGH
- **Fix:** Add ChangeHistoryTab (pattern exists on SubcontractorInvoiceDetail)

### GAP-008: Sub Invoice Detail — Missing Lien Rights Tab
- **Severity:** HIGH
- **Fix:** Add LienRightsTab placeholder (legally important in construction)

### GAP-009: Sub Invoice Detail — Missing Requirements Tab
- **Severity:** HIGH
- **Fix:** Add RequirementsTab placeholder (compliance tracking)

### GAP-010: Prime Contract Detail — Missing Related Items Tab
- **Severity:** HIGH
- **Fix:** Add RelatedItemsTab to prime contract detail page

### GAP-011: No Prime Contract Approve/Status-Change API Endpoints
- **Severity:** HIGH
- **File:** Missing `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/approve/route.ts`
- **Fix:** Add approve and change-status endpoints with proper validation

### GAP-012: Owner Invoice Create — No SOV Line Item Entry
- **Severity:** HIGH
- **Problem:** Creates empty invoices. Procore allows SOV entry at creation.
- **Fix:** Add SOV line items section to create form (match sub invoice create pattern)

## Medium Gaps

### GAP-013: Missing ERP Status Column — Prime Contracts List
- **Severity:** MEDIUM
- **Problem:** Prime contracts list does not show ERP integration status column
- **Procore Reference:** Procore shows ERP status for synced contracts
- **Fix:** Add ERP status column to prime contracts table definition

### GAP-014: Missing ERP Status Column — Commitments List
- **Severity:** MEDIUM
- **Problem:** Commitments list does not show ERP integration status column
- **Procore Reference:** Procore shows ERP status for synced commitments
- **Fix:** Add ERP status column to commitments table definition

### GAP-015: Missing Owner/Client Filter — Prime Contracts List
- **Severity:** MEDIUM
- **Problem:** No filter for owner/client on prime contracts list
- **Fix:** Add owner/client faceted filter to toolbar

### GAP-016: Missing ERP Status Filter — Prime Contracts List
- **Severity:** MEDIUM
- **Problem:** No filter for ERP sync status
- **Fix:** Add ERP status faceted filter to toolbar

### GAP-017: Missing Invoice Status Filter — Owner Invoicing
- **Severity:** MEDIUM
- **Problem:** Owner invoicing list has no status filter
- **Fix:** Add status faceted filter to toolbar

### GAP-018: Missing Contract Company Filter — Owner Invoicing
- **Severity:** MEDIUM
- **Problem:** No filter by contract/company on owner invoicing list
- **Fix:** Add contract company faceted filter to toolbar

### GAP-019: Missing Payment Status Filter — Owner + Sub Invoicing
- **Severity:** MEDIUM
- **Problem:** Neither invoicing list supports filtering by payment status
- **Fix:** Add payment status filter to both invoice list toolbars

### GAP-020: Missing ssov_status on purchase_orders/subcontracts tables
- **Severity:** MEDIUM
- **Problem:** No SSOV (Subcontractor Schedule of Values) status tracking column
- **Fix:** DB migration to add `ssov_status` enum column

### GAP-021: No Line-Item-Level Approve/Reject Endpoints
- **Severity:** MEDIUM
- **Problem:** Cannot approve or reject individual SOV line items — only whole invoices
- **Procore Reference:** Procore supports line-item-level approval on invoices
- **Fix:** Add API endpoints for line-item approve/reject

### GAP-022: No Automatic Billing Period Generation
- **Severity:** MEDIUM
- **Problem:** Billing periods must be created manually. No auto-generation based on contract terms.
- **Fix:** Add billing period auto-generation logic based on contract start/end dates

### GAP-023: Missing project_id on owner_invoices table
- **Severity:** MEDIUM
- **Problem:** `owner_invoices` lacks a direct `project_id` FK — must join through contracts
- **Fix:** DB migration to add `project_id` column with FK to projects table

## Low Gaps

### GAP-024: Missing Attachments Column — Prime Contracts List
- **Severity:** LOW
- **Problem:** No paperclip/attachment indicator column on prime contracts list
- **Fix:** Add attachments count column

### GAP-025: Missing Configure Button — Commitments List
- **Severity:** LOW
- **Problem:** No "Configure Columns" button in commitments list toolbar
- **Fix:** Already handled by UnifiedTablePage column visibility — verify it works

### GAP-026: Missing Contract Type Filter — Sub + Owner Invoicing
- **Severity:** LOW
- **Problem:** No filter by contract type (subcontract vs purchase order)
- **Fix:** Add contract type faceted filter

### GAP-027: Billing Periods as Primary Tab vs Settings
- **Severity:** LOW
- **Problem:** Billing periods are accessed via Settings; Procore makes them a primary tab
- **Fix:** Consider promoting billing periods to a top-level tab on invoicing

### GAP-028: Missing currently_retained computed column
- **Severity:** LOW
- **Problem:** No computed/virtual column for total currently retained amount
- **Fix:** Add computed column or API-level calculation

### GAP-029: Missing sov_line_item_id FK on invoice line items
- **Severity:** LOW
- **Problem:** Invoice line items don't reference back to the SOV line item they derive from
- **Fix:** DB migration to add `sov_line_item_id` FK column

## Key File Paths

### Owner Invoicing
- `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx` — Owner invoice detail (GAP-001)
- `frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx` — Owner invoice create (GAP-012)
- `frontend/src/hooks/use-invoicing.ts` — Owner invoice hooks (GAP-005)
- `frontend/src/app/api/projects/[projectId]/invoices/` — Owner invoice API routes

### Subcontractor Invoicing
- `frontend/src/app/(main)/[projectId]/invoicing/subcontractor/[invoiceId]/page.tsx` — Sub invoice detail
- `frontend/src/hooks/use-subcontractor-invoices.ts` — Sub invoice hooks (GAP-004)
- `frontend/src/app/api/projects/[projectId]/subcontractor-invoices/` — Sub invoice API routes

### Prime Contracts
- `frontend/src/app/(main)/[projectId]/prime-contracts/` — Prime contracts pages
- `frontend/src/app/api/projects/[projectId]/contracts/` — Prime contract API routes (GAP-011)

### Commitments
- `frontend/src/app/(main)/[projectId]/commitments/` — Commitments pages
- `frontend/src/app/api/projects/[projectId]/commitments/` — Commitment API routes

### Database
- `frontend/src/types/database.types.ts` — Generated Supabase types
- `supabase/migrations/` — Migration files (GAP-002, GAP-003, GAP-020, GAP-023, GAP-029)

## Source
All gaps verified against Procore RAG (Tier 1), Deep Crawl Manifests (Tier 2), and Procore Support Articles (Tier 3). See 02-procore-reference.md for authoritative source URLs.
