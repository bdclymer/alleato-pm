# PRP: Estimates & Quantity Takeoff System

**Status:** Ready for Implementation
**Priority:** High — AI quick win, owner demo
**Author:** Megan / Claude
**Date:** 2026-03-10

## Overview

Digitize Alleato's Excel-based estimate and quantity takeoff (QTO) system into the PM platform. This replaces a 3-sheet Excel workbook (Estimate summary, General Conditions, QuantityTakeoff) with a collaborative, versioned, database-backed tool that connects to the rest of the PM data.

**Reference:** `procore-templates/Estimate New RTUs R6 .xlsx`

## Why This Matters

1. Replaces antiquated Excel workflow — immediate credibility
2. Connects estimates to directory (vendors), cost codes, and projects
3. Foundation for AI features (historical cost comparison, smart suggestions, bid parsing)
4. Visible, demo-able — owner can see and touch it immediately

## Data Model

### Table: `estimates`

The estimate document itself. One per project revision.

| Column | Type | Notes |
|--------|------|-------|
| `estimate_id` | `SERIAL PRIMARY KEY` | |
| `project_id` | `INTEGER REFERENCES projects(project_id)` | Required |
| `title` | `TEXT NOT NULL` | e.g., "Ulta Beauty Fresno DC New RTUs R6" |
| `estimate_number` | `TEXT` | Optional reference number |
| `revision` | `INTEGER DEFAULT 1` | Revision tracking |
| `status` | `TEXT DEFAULT 'draft'` | draft, pending_review, approved, rejected |
| `estimate_date` | `DATE` | |
| `location` | `TEXT` | Project location |
| `estimator` | `TEXT` | Person who prepared |
| `project_duration_weeks` | `INTEGER` | Drives GC calculations |
| `contingency_amount` | `NUMERIC(15,2) DEFAULT 0` | |
| `insurance_rate` | `NUMERIC(6,4) DEFAULT 0.0125` | 1.25% |
| `fee_rate` | `NUMERIC(6,4) DEFAULT 0.10` | 10% |
| `notes` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | |
| `created_by` | `UUID REFERENCES auth.users(id)` | |
| `is_deleted` | `BOOLEAN DEFAULT false` | Soft delete |

### Table: `estimate_line_items`

The core QTO line items. Each row represents one scope item with 4 cost categories.

| Column | Type | Notes |
|--------|------|-------|
| `line_item_id` | `SERIAL PRIMARY KEY` | |
| `estimate_id` | `INTEGER REFERENCES estimates(estimate_id) ON DELETE CASCADE` | |
| `line_number` | `INTEGER` | Display order within division |
| `division_code` | `TEXT NOT NULL` | CSI code: "01", "03", "05", etc. |
| `description` | `TEXT` | Line item name |
| `length` | `NUMERIC(15,4)` | Dimension |
| `width` | `NUMERIC(15,4)` | Dimension |
| `depth` | `NUMERIC(15,4)` | Dimension |
| `number_of_each` | `NUMERIC(15,4)` | Multiplier |
| `quantity` | `NUMERIC(15,4)` | Computed or manual |
| `unit` | `TEXT` | EA, SF, LF, LOT, LS, CY, TONS, etc. |
| `material_unit_price` | `NUMERIC(15,2) DEFAULT 0` | |
| `material_cost` | `NUMERIC(15,2) DEFAULT 0` | = unit_price * quantity |
| `labor_crew_size` | `NUMERIC(8,2)` | |
| `labor_hours` | `NUMERIC(8,2)` | Hours per unit |
| `labor_man_hours` | `NUMERIC(10,2) DEFAULT 0` | = crew * hours * quantity |
| `labor_rate` | `NUMERIC(10,2)` | $/hour |
| `labor_cost` | `NUMERIC(15,2) DEFAULT 0` | = rate * man_hours |
| `equipment_duration` | `NUMERIC(10,2)` | |
| `equipment_unit` | `TEXT` | Duration unit (days, weeks, months) |
| `equipment_rate` | `NUMERIC(10,2)` | |
| `equipment_cost` | `NUMERIC(15,2) DEFAULT 0` | = rate * duration |
| `subcontract_unit_price` | `NUMERIC(15,2) DEFAULT 0` | |
| `subcontract_cost` | `NUMERIC(15,2) DEFAULT 0` | = unit_price * quantity |
| `total_cost` | `NUMERIC(15,2) DEFAULT 0` | Sum of 4 categories |
| `comments` | `TEXT` | Free text |
| `comment_type` | `TEXT` | plug_number, vendor, included_in, internal, allowance, swag, excluded |
| `vendor_name` | `TEXT` | Extracted vendor reference |
| `gc_cost_code` | `TEXT` | For Div 01 items only (e.g., "3128") |
| `sort_order` | `INTEGER` | Global sort within estimate |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | |

### Table: `estimate_alternates`

Add/deduct alternates that modify the base estimate.

| Column | Type | Notes |
|--------|------|-------|
| `alternate_id` | `SERIAL PRIMARY KEY` | |
| `estimate_id` | `INTEGER REFERENCES estimates(estimate_id) ON DELETE CASCADE` | |
| `alternate_number` | `INTEGER` | |
| `description` | `TEXT NOT NULL` | |
| `amount` | `NUMERIC(15,2) DEFAULT 0` | Positive = add, negative = deduct |
| `alternate_type` | `TEXT DEFAULT 'add'` | add, deduct |
| `sort_order` | `INTEGER` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### Table: `estimate_allowances`

Allowance schedule items.

| Column | Type | Notes |
|--------|------|-------|
| `allowance_id` | `SERIAL PRIMARY KEY` | |
| `estimate_id` | `INTEGER REFERENCES estimates(estimate_id) ON DELETE CASCADE` | |
| `allowance_number` | `INTEGER` | |
| `description` | `TEXT NOT NULL` | |
| `amount` | `NUMERIC(15,2) DEFAULT 0` | |
| `scope_type` | `TEXT` | material_and_labor, material_only, labor_only |
| `sort_order` | `INTEGER` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### View: `v_estimate_division_totals`

Aggregated totals by CSI division for summary display.

```sql
SELECT
  eli.estimate_id,
  eli.division_code,
  ccd.title AS division_name,
  SUM(eli.material_cost) AS material_total,
  SUM(eli.labor_cost) AS labor_total,
  SUM(eli.equipment_cost) AS equipment_total,
  SUM(eli.subcontract_cost) AS subcontract_total,
  SUM(eli.total_cost) AS division_total,
  COUNT(*) AS line_count
FROM estimate_line_items eli
LEFT JOIN cost_code_divisions ccd ON ccd.code = eli.division_code
GROUP BY eli.estimate_id, eli.division_code, ccd.title
ORDER BY eli.division_code;
```

## Pages & Routes

### 1. Estimate List Page: `/[projectId]/estimates`
- **Type:** Type A (Table Page) using `UnifiedTablePage`
- **Columns:** Title, Estimate #, Revision, Status, Estimator, Date, Total Cost
- **Actions:** New Estimate, Import from Excel
- **Filters:** Status, Estimator
- **Mobile:** Card view with title, status badge, total

### 2. Estimate Detail Page: `/[projectId]/estimates/[estimateId]`
- **Type:** Type C (Detail Page)
- **Tabs:**
  - **Quantity Takeoff** — Main QTO table grouped by CSI division, inline editable
  - **Summary** — Division totals + markups (mirrors Estimate sheet)
  - **General Conditions** — Division 01 detail (filtered view of QTO)
  - **Alternates & Allowances** — Alternate/allowance management

### 3. New/Edit Estimate Form: `/[projectId]/estimates/new`
- **Type:** Type B (Form Page) using `ProjectFormPageLayout`
- **Sections:** Basic Info (title, date, estimator, location), Project Duration, Markup Rates

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects/[projectId]/estimates` | List estimates |
| POST | `/api/projects/[projectId]/estimates` | Create estimate |
| GET | `/api/projects/[projectId]/estimates/[estimateId]` | Get estimate with line items |
| PUT | `/api/projects/[projectId]/estimates/[estimateId]` | Update estimate |
| DELETE | `/api/projects/[projectId]/estimates/[estimateId]` | Soft delete |
| POST | `/api/projects/[projectId]/estimates/[estimateId]/line-items` | Add line items |
| PUT | `/api/projects/[projectId]/estimates/[estimateId]/line-items/[lineItemId]` | Update line item |
| DELETE | `/api/projects/[projectId]/estimates/[estimateId]/line-items/[lineItemId]` | Delete line item |
| POST | `/api/projects/[projectId]/estimates/import` | Import from Excel |

## File Structure

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/estimates/
│   │   ├── page.tsx                    # List page (server)
│   │   ├── estimates-client.tsx        # List page (client, UnifiedTablePage)
│   │   ├── estimates-table-utils.ts    # Column defs, filters, formatters
│   │   ├── new/page.tsx               # Create form
│   │   └── [estimateId]/
│   │       ├── page.tsx               # Detail page (server)
│   │       ├── estimate-detail-client.tsx
│   │       ├── tabs/
│   │       │   ├── quantity-takeoff-tab.tsx
│   │       │   ├── summary-tab.tsx
│   │       │   ├── general-conditions-tab.tsx
│   │       │   └── alternates-tab.tsx
│   │       └── edit/page.tsx          # Edit form
│   └── api/projects/[projectId]/estimates/
│       ├── route.ts                   # GET list, POST create
│       ├── [estimateId]/
│       │   ├── route.ts              # GET, PUT, DELETE
│       │   └── line-items/
│       │       ├── route.ts          # POST add lines
│       │       └── [lineItemId]/route.ts  # PUT, DELETE
│       └── import/route.ts           # POST Excel import
├── hooks/
│   └── use-estimates.ts              # React Query hooks
├── lib/
│   ├── services/estimate-service.ts  # Business logic
│   └── schemas/estimates.ts          # Zod schemas
```

## Implementation Order

1. **Migration** — Create tables, view, RLS policies
2. **Types** — Generate Supabase types, create Zod schemas
3. **Service** — `EstimateService` class following `DirectCostService` pattern
4. **API Routes** — Collection + individual endpoints
5. **Hooks** — React Query wrappers
6. **List Page** — UnifiedTablePage with estimates
7. **Create/Edit Form** — ProjectFormPageLayout
8. **Detail Page** — Tabbed view with QTO table
9. **Excel Import** — Parse XLSX and populate
10. **Navigation** — Register in sidebar under Financial Management

## Computed Values (Frontend Logic)

These are computed on save, not as DB generated columns:

```typescript
// Line item calculations
material_cost = (material_unit_price || 0) * (quantity || 0)
labor_man_hours = (labor_crew_size || 0) * (labor_hours || 0) * (quantity || 0)
labor_cost = (labor_rate || 0) * (labor_man_hours || 0)
equipment_cost = (equipment_rate || 0) * (equipment_duration || 0)
subcontract_cost = (subcontract_unit_price || 0) * (quantity || 0)
total_cost = material_cost + labor_cost + equipment_cost + subcontract_cost

// Estimate summary
subtotal = SUM(all line items total_cost)
insurance = subtotal * insurance_rate
fee = (subtotal + insurance) * fee_rate
grand_total = subtotal + contingency_amount + insurance + fee
```

## Units Normalization

Standardize on uppercase abbreviations:

| Input variants | Normalized |
|---------------|-----------|
| ea, EA, each | EA |
| lot, Lot, LOT | LOT |
| ls, LS, lump sum | LS |
| sf, SF, sq ft | SF |
| lf, LF, lin ft | LF |
| cy, CY, cu yd | CY |
| Tons, tons | TON |
| Weeks, weeks, wk | WK |
| Months, months, mo | MO |

## Success Criteria

- [ ] Can create a new estimate for a project
- [ ] Can add/edit/delete line items grouped by CSI division
- [ ] Computed costs auto-calculate on input
- [ ] Division totals and grand total display correctly
- [ ] Can import the existing Excel format
- [ ] Estimate appears in project sidebar navigation
- [ ] Mobile-responsive (cards on mobile)
- [ ] Matches existing design system patterns
