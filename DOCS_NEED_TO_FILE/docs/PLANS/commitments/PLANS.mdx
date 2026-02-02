# Commitments Feature - Implementation Plan

**Feature:** Procore Commitments (Subcontracts + Purchase Orders)
**Status:** In Progress
**Created:** 2026-01-10
**Reference:** Procore crawl data in `procore-crawl-output/`

---

## Executive Summary

This plan details the implementation of the Commitments tool to achieve feature parity with Procore. Commitments encompass both **Subcontracts** (work performed by subcontractors) and **Purchase Orders** (materials/equipment purchases).

### Current State
- Basic list page exists at `/[projectId]/commitments`
- Database tables exist: `subcontracts`, `purchase_orders`, `commitments_unified`
- Partial form implementations exist for creating subcontracts and purchase orders
- Hooks and config files are in place

### Target State
- Full CRUD operations for subcontracts and purchase orders
- Detail pages with tabbed interface
- Complete form implementations with all Procore fields
- Configuration page for project-level settings
- Recycle bin functionality
- Integration with Budget, Change Orders, and Invoices

---

## Phase 1: Complete List Page (Procore Parity)

### 1.1 Objective
Bring the commitments list page to full Procore feature parity.

### 1.2 Reference Screenshots
- `procore-crawl-output/pages/commitments/screenshot.png` - Main list view
- `procore-crawl-output/pages/commitments_dropdown_1/screenshot.png` - Export menu
- `procore-crawl-output/pages/commitments_dropdown_2/screenshot.png` - Create menu

### 1.3 Implementation Details

#### Missing Table Columns
Add the following columns to match Procore exactly:

| Column | Source | Calculation |
|--------|--------|-------------|
| ERP Status | `erp_status` field | Direct |
| Executed | `executed` boolean | Yes/No badge |
| SSOV Status | `ssov_status` field | Direct |
| Approved Change Orders | Sum of approved COs | Aggregation |
| Pending Change Orders | Sum of pending COs | Aggregation |
| Draft Change Orders | Sum of draft COs | Aggregation |
| Invoiced | Sum of approved invoices | Aggregation |
| Payments Issued | Sum of payments | Aggregation |
| % Paid | `payments / revised_amount * 100` | Calculated |
| Remaining Balance | `revised_amount - payments` | Calculated |
| Private | `is_private` boolean | Yes/No badge |

#### Grand Totals Footer
Procore shows a "Grand Totals" row at the bottom with aggregated values:
- Sum of Original Contract Amount
- Sum of Approved Change Orders
- Sum of Revised Contract Amount
- Sum of Invoiced
- Sum of Payments Issued
- Calculated % Paid (Total Payments / Total Revised)
- Sum of Remaining Balance

#### Row Grouping Feature
Procore has "Select a column to group" dropdown. Implementation:
- Use TanStack Table's grouping feature
- Allow grouping by: Status, Type, Contract Company, ERP Status
- Display grouped totals per group

#### Column Configuration
Implement column visibility toggle:
- "Configure" button opens column selection panel
- Persist column preferences to localStorage or user settings
- Drag-to-reorder columns

### 1.4 Files to Modify
- `frontend/src/app/[projectId]/commitments/page.tsx`
- `frontend/src/config/tables/commitments.config.tsx`
- `frontend/src/hooks/use-commitments.ts`

### 1.5 Testing Checkpoints
- [ ] All columns render correctly with sample data
- [ ] Grand totals calculate correctly
- [ ] Row grouping works
- [ ] Column configuration persists
- [ ] Mobile responsiveness maintained

---

## Phase 2: Commitment Detail Page

### 2.1 Objective
Create a comprehensive detail page with tabbed interface matching Procore.

### 2.2 Reference Screenshots
- `procore-crawl-output/pages/562949957166626/screenshot.png` - Subcontract detail
- `procore-crawl-output/pages/562949957274109/screenshot.png` - Purchase order detail
- Various `_dropdown_X` folders for action menus

### 2.3 Page Structure

```
/[projectId]/commitments/[id]
├── Header Section
│   ├── Back button
│   ├── Commitment number + title
│   ├── Status badge with actions
│   ├── Action buttons (Edit, Email, PDF, More)
│   └── Contract company
├── Summary Cards
│   ├── Original Contract Amount
│   ├── Approved Change Orders
│   ├── Revised Contract Amount
│   ├── Invoiced
│   ├── Payments Issued
│   └── Remaining Balance
└── Tabbed Content
    ├── General Tab
    │   ├── Contract Information
    │   ├── Dates
    │   ├── Inclusions/Exclusions
    │   └── Description
    ├── Schedule of Values Tab
    │   └── Line items table with edit capabilities
    ├── Change Orders Tab
    │   └── List of linked change orders
    ├── Invoices Tab
    │   └── List of invoices for this commitment
    ├── Attachments Tab
    │   └── File list with upload
    └── Advanced Settings Tab
        └── Privacy, permissions, defaults
```

### 2.4 Component Architecture

```typescript
// Page component structure
CommitmentDetailPage
├── CommitmentDetailHeader
│   ├── BackButton
│   ├── TitleSection
│   ├── StatusBadge
│   └── ActionButtons
├── CommitmentSummaryCards
└── CommitmentTabs
    ├── GeneralInfoTab
    ├── ScheduleOfValuesTab
    │   └── SOVLineItemsTable
    │       └── SOVLineItemRow (editable)
    ├── ChangeOrdersTab
    ├── InvoicesTab
    ├── AttachmentsTab
    └── AdvancedSettingsTab
```

### 2.5 API Requirements

```typescript
// GET /api/commitments/[id]
interface CommitmentDetailResponse {
  commitment: Commitment
  lineItems: SOVLineItem[]
  changeOrders: ChangeOrder[]
  invoices: Invoice[]
  attachments: Attachment[]
  permissions: UserPermissions
}
```

### 2.6 Files to Create
- `frontend/src/app/[projectId]/commitments/[id]/page.tsx`
- `frontend/src/components/commitments/CommitmentDetailHeader.tsx`
- `frontend/src/components/commitments/CommitmentSummaryCards.tsx`
- `frontend/src/components/commitments/CommitmentTabs.tsx`
- `frontend/src/components/commitments/tabs/GeneralInfoTab.tsx`
- `frontend/src/components/commitments/tabs/ScheduleOfValuesTab.tsx`
- `frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx`
- `frontend/src/components/commitments/tabs/InvoicesTab.tsx`
- `frontend/src/components/commitments/tabs/AttachmentsTab.tsx`
- `frontend/src/components/commitments/tabs/AdvancedSettingsTab.tsx`
- `frontend/src/app/api/commitments/[id]/route.ts`

### 2.7 Testing Checkpoints
- [ ] Page loads with correct commitment data
- [ ] All tabs render and switch correctly
- [ ] Summary cards display accurate calculations
- [ ] Actions work (Edit, Email, PDF)
- [ ] Mobile responsive

---

## Phase 3: Create/Edit Forms

### 3.1 Objective
Implement complete create and edit forms for both subcontracts and purchase orders.

### 3.2 Reference Data
- `forms/Create Subcontract Commitment Form...csv` - Complete field list
- `procore-crawl-output/pages/edit/screenshot.png` - Edit form UI

### 3.3 Form Field Implementation

#### Form Sections (Matching Procore Order)

**Section 1: Basic Information**
```typescript
interface BasicInfoFields {
  title: string                    // Required
  status: CommitmentStatus         // Default: 'draft'
  contract_company_id: string      // Required, searchable select
  contract_number: string          // Auto-generated, editable
  description: string              // Rich text editor
}
```

**Section 2: Dates**
```typescript
interface DateFields {
  start_date: Date | null
  estimated_completion_date: Date | null
  actual_completion_date: Date | null
  contract_date: Date | null
  signed_contract_received_date: Date | null
  issued_on_date: Date | null
}
```

**Section 3: Accounting**
```typescript
interface AccountingFields {
  accounting_method: 'amount_based' | 'unit_quantity'
  default_retainage_percent: number     // 0-100
}
```

**Section 4: Scope (Subcontracts only)**
```typescript
interface ScopeFields {
  inclusions: string    // Rich text
  exclusions: string    // Rich text
}
```

**Section 5: Shipping (Purchase Orders only)**
```typescript
interface ShippingFields {
  ship_to: string
  ship_via: string
  bill_to: string
  delivery_date: Date | null
  payment_terms: string
  assigned_to: string     // User select
}
```

**Section 6: Privacy & Access**
```typescript
interface AccessFields {
  is_private: boolean           // Default: true
  executed: boolean             // Default: false
  non_admin_user_ids: string[]  // Conditional on is_private
  allow_non_admin_view_sov: boolean
  invoice_contact_ids: string[] // Conditional on company selected
}
```

**Section 7: Line Items (SOV)**
```typescript
interface SOVLineItem {
  id: string
  line_number: number           // Auto-increment
  change_event_line_item_id?: string
  budget_code_id: string        // Select from project cost codes
  description: string
  amount: number
  // Read-only calculated fields:
  billed_to_date: number
  amount_remaining: number
}
```

**Section 8: Attachments**
```typescript
interface Attachment {
  id: string
  filename: string
  file_size: number
  file_type: string
  uploaded_at: Date
  uploaded_by: string
}
```

### 3.4 Form Validation Rules

```typescript
const subcontractSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contract_company_id: z.string().min(1, 'Company is required'),
  contract_number: z.string().min(1, 'Contract number is required'),
  status: z.enum(['draft', 'sent', 'pending', 'approved', 'executed', 'closed', 'void']),
  executed: z.boolean(),
  default_retainage_percent: z.number().min(0).max(100).optional(),
  // ... other fields
})
```

### 3.5 Conditional Logic

1. **Invoice Contacts**: Only enabled after `contract_company_id` is selected
2. **Non-Admin Access**: Only shown when `is_private = true`
3. **Allow Non-Admin View SOV**: Only shown when `is_private = true`
4. **Shipping fields**: Only shown for Purchase Orders

### 3.6 Files to Create/Modify
- `frontend/src/app/[projectId]/commitments/new/page.tsx`
- `frontend/src/app/[projectId]/commitments/[id]/edit/page.tsx`
- `frontend/src/components/commitments/SubcontractForm.tsx`
- `frontend/src/components/commitments/PurchaseOrderForm.tsx`
- `frontend/src/components/commitments/SOVLineItemsEditor.tsx`
- `frontend/src/components/commitments/AttachmentsManager.tsx`
- `frontend/src/lib/schemas/subcontract-schema.ts`
- `frontend/src/lib/schemas/purchase-order-schema.ts`
- `frontend/src/app/api/commitments/route.ts` (POST)
- `frontend/src/app/api/commitments/[id]/route.ts` (PATCH)

### 3.7 Testing Checkpoints
- [ ] All form fields render correctly
- [ ] Validation messages display properly
- [ ] Conditional fields show/hide correctly
- [ ] Line items can be added/edited/deleted
- [ ] Attachments can be uploaded/removed
- [ ] Form submission creates/updates correctly
- [ ] Mobile responsive

---

## Phase 4: Configuration Page

### 4.1 Objective
Implement project-level commitment settings matching Procore.

### 4.2 Reference
- `procore-crawl-output/pages/configure_tab/metadata.json` - Complete settings list
- `procore-crawl-output/pages/configure_tab/screenshot.png` - UI reference

### 4.3 Settings Structure

```typescript
interface CommitmentSettings {
  // General
  contracts_private_by_default: boolean
  enable_purchase_orders: boolean
  enable_subcontracts: boolean
  cco_tier_count: 1 | 2 | 3
  allow_standard_create_cco: boolean
  allow_standard_create_cor: boolean
  allow_standard_create_pco: boolean
  enable_editable_sov: boolean
  enable_field_initiated_co: boolean
  show_markup_on_co_pdf: boolean

  // Distribution
  include_primary_contact: boolean
  commitment_distribution: string[]
  cco_distribution: string[]
  cor_distribution: string[]
  pco_distribution: string[]
  rfq_distribution: string[]
  invoice_distribution: string[]

  // Defaults
  default_po_accounting_method: 'amount_based' | 'unit_quantity'
  default_sc_accounting_method: 'amount_based' | 'unit_quantity'
  default_po_retainage_percent: number
  default_sc_retainage_percent: number
  enable_comments_default: boolean
  enable_work_retainage_default: boolean
  enable_markups_default: boolean
  enable_payments_default: boolean
  enable_invoices_default: boolean
  show_cost_codes_on_pdf_default: boolean
  enable_materials_retainage_default: boolean
  enable_ssov_default: boolean

  // Billing
  prefilled_periods_enabled: boolean
  billing_period_start: number
  billing_period_end: number
  billing_date: number
  send_reminders: boolean
  reminder_interval: 1 | 2 | 3
  allow_overbilling: boolean
  custom_email_text: string
  requisition_digest_frequency: 'never' | 'daily' | 'weekly'
  requisition_pdf_footer: string
  send_approved_invoice_emails: boolean
  enable_subcontractor_proposed_amount: boolean
}
```

### 4.4 Files to Create
- `frontend/src/app/[projectId]/commitments/configure/page.tsx`
- `frontend/src/components/commitments/settings/GeneralSettingsSection.tsx`
- `frontend/src/components/commitments/settings/DistributionSettingsSection.tsx`
- `frontend/src/components/commitments/settings/DefaultsSection.tsx`
- `frontend/src/components/commitments/settings/BillingSettingsSection.tsx`
- `frontend/src/app/api/projects/[id]/commitment-settings/route.ts`

### 4.5 Testing Checkpoints
- [ ] All settings render with current values
- [ ] Changes save correctly
- [ ] Validation works for numeric fields
- [ ] Multi-select user fields work
- [ ] Settings apply to new commitments

---

## Phase 5: Recycle Bin

### 5.1 Objective
Implement soft delete with recycle bin functionality.

### 5.2 Reference
- `procore-crawl-output/pages/recycled/screenshot.png`
- `procore-crawl-output/pages/recycled/metadata.json`

### 5.3 Implementation

**Database Changes:**
- Add `deleted_at` timestamp column to `subcontracts` and `purchase_orders`
- Modify queries to exclude deleted records by default

**UI Components:**
- Recycle bin page listing deleted commitments
- "Restore" button to undelete
- "Delete Permanently" button (with confirmation)
- Filter by type (subcontract/purchase order)
- Sort by deleted date

### 5.4 Files to Create
- `frontend/src/app/[projectId]/commitments/recycled/page.tsx`
- `frontend/src/app/api/commitments/[id]/restore/route.ts`
- Database migration for `deleted_at` columns

### 5.5 Testing Checkpoints
- [ ] Deleted commitments appear in recycle bin
- [ ] Restore works correctly
- [ ] Permanent delete works
- [ ] Deleted items hidden from main list

---

## Phase 6: Integration

### 6.1 Budget Integration
- Line items link to budget codes
- Commitment amounts sync to budget "Committed" column
- Budget views show commitment totals

### 6.2 Change Order Integration
- Link change orders to specific commitments
- Calculate CO totals (approved, pending, draft)
- Display COs in commitment detail page

### 6.3 Invoice Integration
- Link invoices to commitments
- Calculate invoiced amounts
- Track payment status

---

## Testing Strategy

### Unit Tests
- Schema validation tests
- Hook logic tests
- Utility function tests

### E2E Tests (Playwright)
| Test Suite | Description |
|------------|-------------|
| `commitments-list.spec.ts` | List page functionality |
| `commitment-detail.spec.ts` | Detail page rendering |
| `commitment-create-subcontract.spec.ts` | Create subcontract flow |
| `commitment-create-po.spec.ts` | Create purchase order flow |
| `commitment-edit.spec.ts` | Edit flow |
| `commitment-delete.spec.ts` | Delete and recycle bin |
| `commitment-sov.spec.ts` | Line items CRUD |
| `commitment-config.spec.ts` | Settings page |

### Testing Gates
Every phase completion requires:
1. All relevant e2e tests passing
2. Visual comparison with Procore screenshots
3. Verifier agent confirmation

---

## Verification Protocol

### Per-Phase Verification
After each phase:
1. Worker agent implements features
2. Test-automator agent writes and runs tests
3. Verifier agent independently confirms:
   - Features match Procore behavior
   - All tests pass
   - No TypeScript/lint errors
   - UI matches screenshots

### Skeptical Verifier Checklist
- [ ] Did I run the tests myself? (not trust worker claims)
- [ ] Did I compare against Procore screenshots?
- [ ] Did I test edge cases?
- [ ] Did I verify on mobile viewport?
- [ ] Did I check the database state?

---

## Workflow Enforcement

### Phase Transitions
```
Phase N Incomplete → Cannot start Phase N+1

Phase Completion Criteria:
1. All TASKS.md items for phase are checked
2. E2E tests exist and pass
3. Verifier report shows VERIFIED
4. No open TypeScript errors
```

### Sub-Agent Usage

| Task | Agent | Mandatory |
|------|-------|-----------|
| Research existing code | Explore | Yes |
| Implement features | frontend-developer or backend-architect | No |
| Write/run tests | test-automator | YES (mandatory) |
| Verify completion | debugger (verifier mode) | Yes |
| Database work | supabase-architect | Recommended |

### Testing Enforcement
**MANDATORY:** Every feature must have tests BEFORE claiming completion.

```
Implementation Complete? → Run tests
Tests exist? → NO → Write tests first
Tests pass? → NO → Fix issues
Tests pass? → YES → Spawn verifier
Verifier confirms? → NO → Fix issues
Verifier confirms? → YES → Mark complete
```

---

## File Organization

```
frontend/src/
├── app/[projectId]/commitments/
│   ├── page.tsx                    # List page
│   ├── [id]/
│   │   ├── page.tsx                # Detail page
│   │   └── edit/page.tsx           # Edit page
│   ├── new/page.tsx                # Create page
│   ├── recycled/page.tsx           # Recycle bin
│   └── configure/page.tsx          # Settings
├── components/commitments/
│   ├── SubcontractForm.tsx
│   ├── PurchaseOrderForm.tsx
│   ├── SOVLineItemsEditor.tsx
│   ├── AttachmentsManager.tsx
│   ├── CommitmentDetailHeader.tsx
│   ├── CommitmentSummaryCards.tsx
│   ├── CommitmentTabs.tsx
│   ├── tabs/
│   │   ├── GeneralInfoTab.tsx
│   │   ├── ScheduleOfValuesTab.tsx
│   │   ├── ChangeOrdersTab.tsx
│   │   ├── InvoicesTab.tsx
│   │   ├── AttachmentsTab.tsx
│   │   └── AdvancedSettingsTab.tsx
│   └── settings/
│       ├── GeneralSettingsSection.tsx
│       ├── DistributionSettingsSection.tsx
│       ├── DefaultsSection.tsx
│       └── BillingSettingsSection.tsx
├── hooks/
│   └── use-commitments.ts          # Already exists
├── config/tables/
│   └── commitments.config.tsx      # Already exists
└── lib/schemas/
    ├── subcontract-schema.ts
    └── purchase-order-schema.ts

frontend/tests/e2e/
├── commitments-list.spec.ts
├── commitment-detail.spec.ts
├── commitment-create-subcontract.spec.ts
├── commitment-create-po.spec.ts
├── commitment-edit.spec.ts
├── commitment-delete.spec.ts
├── commitment-sov.spec.ts
└── commitment-config.spec.ts
```

---

## Appendix: Procore Field Mapping

### Subcontract Fields (from crawl CSV)

| Procore Field | Database Column | Form Field Type |
|---------------|-----------------|-----------------|
| Title | `title` | text |
| Status | `status` | select |
| Contract Company | `contract_company_id` | select (searchable) |
| Contract # | `contract_number` | text (auto-gen) |
| Description | `description` | rich text |
| Executed | `executed` | checkbox |
| Default Retainage | `default_retainage_percent` | number (%) |
| Accounting Method | `accounting_method` | toggle |
| Start Date | `start_date` | date |
| Est. Completion | `estimated_completion_date` | date |
| Actual Completion | `actual_completion_date` | date |
| Contract Date | `contract_date` | date |
| Signed Received | `signed_contract_received_date` | date |
| Issued On | `issued_on_date` | date |
| Inclusions | `inclusions` | rich text |
| Exclusions | `exclusions` | rich text |
| Private | `is_private` | checkbox |
| Non-Admin Access | `non_admin_user_ids` | multi-select |
| Allow View SOV | `allow_non_admin_view_sov_items` | checkbox |
| Invoice Contacts | `invoice_contact_ids` | multi-select |

### Purchase Order Additional Fields

| Procore Field | Database Column | Form Field Type |
|---------------|-----------------|-----------------|
| Ship To | `ship_to` | text |
| Ship Via | `ship_via` | text |
| Bill To | `bill_to` | text |
| Delivery Date | `delivery_date` | date |
| Payment Terms | `payment_terms` | text |
| Assigned To | `assigned_to` | user select |
