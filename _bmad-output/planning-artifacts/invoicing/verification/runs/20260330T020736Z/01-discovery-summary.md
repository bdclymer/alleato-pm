# Procore Invoicing - Discovery Summary

**Generated:** 2026-03-30T02:07:36Z  
**Worker:** discover_procore_worker  
**Feature:** invoicing  
**Status:** COMPLETE

---

## Discovery Scope

Gathered comprehensive reference material about Procore's invoicing feature from:

1. **Existing Project Documentation**
   - `/invoicing/research.md` - Codebase research (35% implementation)
   - `/invoicing/api-reference.md` - API endpoint specifications
   - `/invoicing/invoicing-crawl-status.md` - Comprehensive crawl analysis
   - `/invoicing/database-schema-summary.md` - Schema implementation details
   - `/invoicing/readme.md` - Feature overview
   - `/invoicing/status.md` - Implementation status and blockers
   - `/invoicing/verification-summary.md` - Quality assurance findings

2. **Procore Crawl Data**
   - 47 application pages captured with screenshots
   - 34+ support documentation pages analyzed
   - Invoice detail pages for multiple commitment types (PO, Subcontract, Work Order)
   - UI element extraction and navigation analysis

3. **Implementation Artifacts**
   - Database migration (created, not applied)
   - API routes (11 endpoints for owner invoices, billing periods)
   - Frontend pages (main list view, detail view)
   - Components (status badge, line items table)
   - Test suite (24 e2e tests, execution blocked)

---

## What Was Discovered

### Invoicing Tool Architecture

Procore's Invoicing is a **dual-purpose financial management system** within Commitments:

- **Owner Invoices:** Bill project owners based on Schedule of Values
- **Subcontractor Invoices:** Receive and approve invoices from subcontractors (PO/Subcontract/Work Order)
- **Billing Periods:** Organize invoices chronologically
- **Payment Tracking:** "Payments Issued" tab for disbursement tracking

### Key Features Identified

1. **Invoice Statuses & Workflow**
   - Owner: DRAFT → SUBMITTED → APPROVED
   - Subcontractor: PENDING → APPROVED → PAID (or REJECTED)
   - Multi-level approval workflows
   - Status transition rules and permissions

2. **List Page Expectations**
   - Owner invoices: Number, Period, Due Date, Amount, Status
   - Subcontractor invoices: Number, Vendor, Commitment, Period, Amount, Status
   - Filtering and sorting capabilities
   - Bulk actions and individual row menus

3. **Create Form Fields**
   - Owner: Invoice #, Billing Period, Date, SOV line items, Retention
   - Subcontractor: Commitment selector, Invoice date, Period covering, Line items
   - Auto-calculated totals (subtotal, retention, tax)
   - Save vs. Submit distinction

4. **Detail View Tabs**
   - Invoice Details (header + summary)
   - Line Items (itemized breakdown)
   - Commitment Details (for subcontractor)
   - Approvals (workflow history)
   - Payments (if enabled)
   - Activity (change log)

5. **Line Item Structure**
   - Owner: SOV-linked with completion tracking and retention
   - Subcontractor: Progressive billing with previous + this-period amounts
   - Computed columns (totals, percent complete)
   - Scheduled value and unit pricing

6. **Retention System**
   - Percentage-based hold-back
   - Per-invoice and per-item granularity
   - Tracked separately for reporting
   - Release workflows

7. **Export Capabilities**
   - PDF (formatted for sending/filing)
   - Excel (structured with formulas)
   - CSV (for ERP integration)

8. **Integration Points**
   - Commitments (PO, Subcontracts, Work Orders)
   - Schedule of Values (SOV)
   - Budget and variance analysis
   - Payment system
   - ERP systems
   - Change orders
   - Financial reporting

---

## Document Generated

**File:** `02-procore-reference.md` (27 KB, 956 lines)

**Contents:**
- Executive summary of invoicing tool
- Detailed explanation of what invoicing is
- Complete invoice status workflows
- Expected list page columns with filters/sorts
- Comprehensive form fields for creation
- Detail view tab structure and contents
- Line item structure with examples
- Workflow and approval processes
- Permission and role definitions
- Export format specifications
- Integration point documentation
- Data field reference tables
- Billing period configuration
- Retention tracking mechanics
- Reference implementation patterns
- Edge cases and common issues
- Summary characteristics

---

## Quality Assurance

**Sources Verified:**
- ✅ Research documentation (codebase analysis)
- ✅ API reference (endpoint specifications)
- ✅ Crawl status report (47 captured pages)
- ✅ Database schema (table and field specifications)
- ✅ README (feature overview)
- ✅ Status documentation (implementation state)
- ✅ Verification summary (quality findings)

**Cross-References:**
- ✅ Consistent naming conventions across sources
- ✅ Database schema aligns with API specifications
- ✅ Frontend implementation matches crawled UI patterns
- ✅ Workflow states documented in multiple sources
- ✅ Field definitions consistent across documents

---

## Implementation Status Context

Current project state:
- **Overall Completion:** ~35%
- **Owner Invoices:** ~67% complete (viewing/approval works)
- **Subcontractor Invoices:** ~0% complete (API stubs only)
- **Forms:** 0% (not yet implemented)
- **Critical Blockers:**
  - Database migration not applied
  - 47 TypeScript errors in codebase
  - Auth setup broken for tests

**This Reference Document:** Provides complete specifications for implementing remaining features.

---

## Recommended Usage

Use `02-procore-reference.md` as the authoritative source for:

1. **Feature Specification** - Understanding what invoicing should do
2. **UI/UX Design** - Expected columns, tabs, buttons, workflows
3. **Database Design** - Field requirements and relationships
4. **API Specification** - Request/response structures
5. **Approval Workflows** - Permission and status rules
6. **Integration Points** - How invoicing connects to other systems
7. **Data Validation** - Business rules and constraints
8. **User Permissions** - Role-based access control

---

**Reference Document Location:**  
`/Users/meganharrison/Documents/alleato-pm/_bmad-output/planning-artifacts/invoicing/verification/runs/20260330T020736Z/02-procore-reference.md`

**Verification Status:** COMPLETE ✓
