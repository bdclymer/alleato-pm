# Procore Direct Costs - Form Fields Reference (Source of Truth)

**Source:** Procore crawl data (2026-01-05)
**Location:** `crawl-direct-costs/pages/`
**Purpose:** Authoritative source for implementation comparison

---

## 📋 Main Form Fields

| Field Label | Internal Name | Type | Required | Validation | Notes |
|-------------|---------------|------|----------|------------|-------|
| **Type** | `direct_cost_type` | Dropdown | ✅ Yes | One of: Expense, Invoice, Payroll, Other | Cost category |
| **Date** | `item_date` | Date Picker | ✅ Yes | Valid date | Item submission date |
| **Status** | `status` | Dropdown | ✅ Yes | Draft, Pending, Approved, Paid | Workflow state |
| **Vendor** | `vendor_id` | Dropdown | ⚠️ Conditional | Must exist if no Employee | Searchable in Procore |
| **Employee** | `employee_id` | Dropdown | ⚠️ Conditional | Must exist if no Vendor | Searchable in Procore |
| **Invoice #** | `invoice_number` | Text Input | ❌ No | Text string | Invoice identifier |
| **Terms** | `terms` | Text Input | ❌ No | Text string | Payment terms (e.g., "Net 30") |
| **Description** | `description` | Textarea | ❌ No | Text | Item notes/description |
| **Received Date** | `received_date` | Date Picker | ❌ No | Valid date | Date cost received |
| **Paid Date** | `payment_date` | Date Picker | ❌ No | Valid date | Date payment made |
| **Attachments** | `attachments` | File Upload | ❌ No | Multiple files | Supporting documents |

**Key Validation:**
- Vendor OR Employee must be filled (XOR logic)
- Type, Date, Status are mandatory
- All other fields optional

---

## 📊 Line Items Fields

**From Procore detail page (27 inputs detected, 5-6 line item rows):**

| Field Label | Internal Name | Type | Required | Notes |
|-------------|---------------|------|----------|-------|
| **Budget Code** | `wbs_code` | Dropdown/Search | ✅ Yes | Cost code (e.g., "01-3144.LSuperintendent") |
| **Description** | `description` | Text Input | ❌ No | Line item description |
| **Quantity** | `quantity` | Number Input | ✅ Yes | Decimal values |
| **UOM** | `uom` | Dropdown | ❌ No | Unit of Measure (read-only in detail view) |
| **Unit Cost** | `unit_cost` | Currency Input | ✅ Yes | Decimal currency |
| **Calculation Strategy** | `calculation_strategy` | Button/Toggle | ❌ No | Method for amount calculation |
| **Total** | `total` | Calculated | N/A | quantity × unit_cost |

**Line Item Rules:**
- At least 1 line item required
- Grand Total = sum of all line item totals
- Budget code is mandatory per line

---

## 🗂️ List Table Columns

**From main Direct Costs list view (sortable table with 150 rows):**

| Column | Internal Name | Sortable | Notes |
|--------|---------------|----------|-------|
| Date | `item_date` | ✅ Yes | Item date |
| Vendor | `last_name` | ✅ Yes | Vendor name |
| Type | `direct_cost_type` | ✅ Yes | Cost type |
| Invoice # | `invoice_number` | ✅ Yes | Invoice identifier |
| Status | `status` | ✅ Yes | Workflow status |
| Amount | `grand_total` | ✅ Yes | Total cost |
| Received Date | `received_date` | ✅ Yes | Date received |
| Paid Date | `payment_date` | ✅ Yes | Date paid |
| Actions | (menu) | ❌ No | Row actions |

**Table Details:**
- ID: `direct_costs_summary`
- Class: `sortable item_list`
- 150 rows per page
- 8 sortable columns

---

## 🎯 Database Schema (Inferred from Procore)

### direct_costs Table

```sql
CREATE TABLE direct_costs (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  item_date DATE NOT NULL,
  vendor_id BIGINT,  -- FK to vendors
  employee_id BIGINT,  -- FK to employees
  direct_cost_type VARCHAR NOT NULL,  -- Expense/Invoice/Payroll/Other
  invoice_number VARCHAR,
  status VARCHAR NOT NULL,  -- Draft/Pending/Approved/Paid
  grand_total DECIMAL(12,2) NOT NULL,
  received_date DATE,
  payment_date DATE,
  terms VARCHAR,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Constraint: vendor_id OR employee_id must be filled
ALTER TABLE direct_costs ADD CONSTRAINT chk_vendor_or_employee
  CHECK (vendor_id IS NOT NULL OR employee_id IS NOT NULL);
```

### direct_cost_line_items Table

```sql
CREATE TABLE direct_cost_line_items (
  id BIGINT PRIMARY KEY,
  direct_cost_id BIGINT NOT NULL,  -- FK to direct_costs
  cost_code_id BIGINT,  -- FK to cost_codes (wbs_code)
  description TEXT,
  quantity DECIMAL(12,4) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  uom VARCHAR,  -- Unit of Measure
  calculation_strategy VARCHAR,
  total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 Status Workflow

**Procore Status Values (from crawl):**
1. **Draft** - Initial state
2. **Pending** - Submitted for review
3. **Approved** - Approved for payment
4. **Paid** - Payment completed

**Status Transitions:**
- Draft → Pending → Approved → Paid
- Can also go: Draft → Approved (skip Pending)

---

## 📤 Export Options (from crawl)

**Export Dropdown:**
- CSV export
- PDF export

**Bulk Actions:**
- Select multiple items
- Bulk approve
- Bulk export

---

## 🗂️ View Options

**From crawl (50 pages captured):**
1. **List View** - Main view with 150+ items
2. **Summary by Cost Code** - Grouped view by cost codes
3. **Configure Tab** - Field customization

**Detail Page Tabs:**
- Main Information
- Related Items (0 in example)
- Emails (0 in example)
- Change History (1 in example)

---

## ✅ Implementation Comparison Checklist

Use this to verify Alleato-Procore implementation matches Procore:

### Main Form Fields
- [ ] Type dropdown (Expense, Invoice, Payroll, Other)
- [ ] Date picker (required)
- [ ] Status dropdown (Draft, Pending, Approved, Paid)
- [ ] Vendor dropdown (conditional required)
- [ ] Employee dropdown (conditional required)
- [ ] Invoice # text input
- [ ] Terms text input
- [ ] Description textarea
- [ ] Received Date picker
- [ ] Paid Date picker
- [ ] Attachments file upload

### Line Items
- [ ] Budget Code dropdown/search (required)
- [ ] Description text input
- [ ] Quantity number input (required)
- [ ] UOM dropdown
- [ ] Unit Cost currency input (required)
- [ ] Calculation strategy toggle
- [ ] Total (calculated field)
- [ ] Add/remove line item buttons

### List Table
- [ ] All 8 columns present
- [ ] Sortable by each column
- [ ] 150 rows per page (or pagination)
- [ ] Export options (CSV, PDF)
- [ ] Filters available

### Validation
- [ ] Type required
- [ ] Date required
- [ ] Status required
- [ ] Vendor OR Employee required (XOR logic)
- [ ] At least 1 line item required
- [ ] Line item: Budget code required
- [ ] Line item: Quantity required
- [ ] Line item: Unit cost required

---

## 📊 Procore UI Components (from metadata)

**Page 562950023020592 (detail view):**
- **Buttons:** 17
- **Inputs:** 27
- **Tables:** 1 (line items)
- **Icons:** 42
- **Navigation sections:** 2

**Component Breakdown:**
- Main form inputs: 9 fields
- Line item rows: ~18 inputs (6 rows × 3 fields each)
- Action buttons: 17
- Clear/select controls: Multiple

---

## 🎨 Field Types Reference

| Procore Component | HTML Equivalent | Implementation Notes |
|-------------------|-----------------|----------------------|
| Dropdown | `<select>` or custom | Searchable in Procore |
| Date Picker | `<input type="date">` or custom | Calendar widget |
| Currency Input | `<input type="number">` | Decimal with $ prefix |
| Number Input | `<input type="number">` | Decimal allowed |
| Text Input | `<input type="text">` | Standard text |
| Textarea | `<textarea>` | Multi-line text |
| File Upload | `<input type="file">` | Multiple allowed |
| Calculated Field | Read-only display | Auto-computed |

---

## 🔗 Related Tables

**Dependencies (from Procore structure):**
- `vendors` - Vendor/supplier records
- `employees` - Employee records
- `cost_codes` (wbs_code) - Budget codes
- `projects` - Project context
- `attachments` - File storage

---

## 📸 Visual Reference

**Screenshots available in:**
- `crawl-direct-costs/pages/562950023020592/screenshot.png` - Detail view
- `crawl-direct-costs/pages/direct_costs/screenshot.png` - List view
- `crawl-direct-costs/pages/summary_by_cost_code_settle_true/screenshot.png` - Summary view

---

## ⚙️ Sort Options (URL parameters)

**From crawl analysis:**
```
?sort[attribute]=item_date&sort[direction]=asc
?sort[attribute]=last_name&sort[direction]=asc
?sort[attribute]=direct_cost_type&sort[direction]=asc
?sort[attribute]=invoice_number&sort[direction]=asc
?sort[attribute]=status&sort[direction]=asc
?sort[attribute]=grand_total&sort[direction]=asc
?sort[attribute]=received_date&sort[direction]=asc
?sort[attribute]=payment_date&sort[direction]=asc
```

---

**This document is the authoritative source of truth for Direct Costs implementation.**

**Last Updated:** 2026-01-10
**Crawl Date:** 2026-01-05
**Pages Analyzed:** 50 pages, 84 total captures
