# Feature: Commitments (Subcontracts + Purchase Orders)

> Minimal context file for the commitments feature.
> Shared workflow: `.agents/workflows/feature-implementation.md`

## Quick Reference

| Item | Value |
|------|-------|
| Feature | commitments |
| Feature Directory | `documentation/*project-mgmt/in-progress/commitments/` |
| Crawl Data | `procore-crawl-output/` |
| Frontend Pages | `frontend/src/app/[projectId]/commitments/` |
| Components | `frontend/src/components/domain/contracts/` |
| Tests | `frontend/tests/e2e/commitment*.spec.ts` |

---

## Database Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `subcontracts` | id, project_id, vendor_id, title, contract_value, status, ... | Subcontract records |
| `purchase_orders` | id, project_id, vendor_id, title, order_value, status, ... | Purchase order records |
| `commitments_unified` | id, type, project_id, ... | Unified view |
| `subcontract_sov_items` | id, subcontract_id, description, amount, ... | Subcontract SOV |
| `purchase_order_sov_items` | id, purchase_order_id, description, amount, ... | PO SOV |

---

## What Are Commitments?

Commitments in Procore are contractual agreements with vendors:
- **Subcontracts** - Contracts with subcontractors for labor/materials
- **Purchase Orders** - Orders for materials/equipment from suppliers

Both types share similar workflows: creation, SOV management, change orders, invoicing.

---

## Procore Reference Pages

| Page | Screenshot | Description |
|------|------------|-------------|
| Main list | `procore-crawl-output/pages/commitments/screenshot.png` | All commitments list |
| Subcontract detail | `procore-crawl-output/pages/*/screenshot.png` | Detail with tabs |
| Create subcontract | `procore-crawl-output/pages/*/screenshot.png` | Creation form |
| SOV tab | `procore-crawl-output/pages/*/screenshot.png` | Schedule of values |
| Change orders | `procore-crawl-output/pages/*/screenshot.png` | Commitment COs |

---

## Key Procore Features

1. **List View**
   - Combined view of subcontracts and POs
   - Filtering by type, status, vendor
   - Summary totals

2. **Detail View with Tabs**
   - General info
   - Schedule of Values (SOV)
   - Change Orders
   - Invoices
   - Attachments

3. **SOV Management**
   - Line items with cost codes
   - Progress tracking
   - Invoice linking

4. **Change Orders**
   - Commitment-level change orders
   - Approval workflow

---

## Existing Code

### Pages
- [x] `frontend/src/app/[projectId]/commitments/page.tsx` - List
- [x] `frontend/src/app/[projectId]/commitments/new/page.tsx` - Create
- [x] `frontend/src/app/[projectId]/commitments/[commitmentId]/page.tsx` - Detail

### Components
- [x] `frontend/src/components/domain/contracts/CreateSubcontractForm.tsx`
- [x] `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`

### Config
- [x] `frontend/src/config/tables/commitments.config.tsx`

---

## Supabase Configuration

```
Project ID: lgveqfnpkxvzbnnwuled
```

---

## Test Credentials

```
Email: test1@mail.com
Password: test12026!!!
Auth file: frontend/tests/.auth/user.json
```

---

## Current Progress

- **Estimated:** ~22% complete
- See: `TASKS.md`, `PLANS.md`, `VERIFICATION-detail-tabs.md`
- Crawl status: `COMMITMENTS-CRAWL-STATUS.md`

---

## Custom Notes

- Forms are in `forms/` subdirectory with screenshots
- Has separate `procore-crawl-output/` (not `crawl-commitments/`)
- SOV management is a significant feature
