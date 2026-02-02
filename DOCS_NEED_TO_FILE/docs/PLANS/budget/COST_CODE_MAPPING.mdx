# Cost Code Mapping Reference

This document describes how cost codes are mapped across different tables in the Alleato-Procore budget system.

## Budget Code Fields by Table

### direct_cost_line_items
- **Field:** `cost_code_id`
- **Type:** UUID
- **Maps to:** `cost_codes.id` (direct foreign key)
- **Notes:** Direct foreign key relationship to cost_codes table

### subcontract_sov_items
- **Field:** `budget_code`
- **Type:** `string | null`
- **Maps to:** `cost_codes.code` or `cost_codes.id` (see mapping logic)
- **Notes:** SOV items from subcontracts. The budget_code field stores the cost code identifier.

### purchase_order_sov_items
- **Field:** `budget_code`
- **Type:** `string | null`
- **Maps to:** `cost_codes.code` or `cost_codes.id` (see mapping logic)
- **Notes:** SOV items from purchase orders. The budget_code field stores the cost code identifier.

### change_order_lines
- **Field:** `cost_code_id`
- **Type:** UUID
- **Maps to:** `cost_codes.id` (direct foreign key)
- **Notes:** Direct foreign key relationship to cost_codes table

## Materialized View: v_budget_lines

The `v_budget_lines` materialized view aggregates budget data with calculated columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Budget line ID (from budget_lines) |
| `project_id` | number | Project ID |
| `cost_code_id` | uuid | Cost code reference |
| `cost_type_id` | uuid | Cost type reference |
| `sub_job_id` | uuid | Sub-job reference (optional) |
| `original_amount` | number | Original budget amount |
| `budget_mod_total` | number | **Computed:** Sum of approved budget modifications |
| `approved_co_total` | number | **Computed:** Sum of approved change orders |
| `revised_budget` | number | **Computed:** original_amount + budget_mod_total + approved_co_total |

## RPC Function: refresh_budget_rollup

**Function:** `refresh_budget_rollup(p_project_id: number)`

**Purpose:** Refreshes the materialized view `v_budget_lines` for a specific project.

**Called when:**
- Budget modification is approved
- Budget modification is voided (reverts approved status)
- Manual refresh requested

**Parameters:**
- `p_project_id` (optional): Project ID to refresh. If not provided, refreshes all projects.

**Usage in code:**
```typescript
await supabase.rpc('refresh_budget_rollup', { p_project_id: projectId });
```

## Mapping Logic

### Primary Mapping (Used in Implementation)

The budget API uses the following mapping logic:

```typescript
// For direct_cost_line_items: Direct cost_code_id match
costsByCode[cost.cost_code_id].jobToDateCostDetail += amount;

// For SOV items: budget_code matches cost_code_id
// (budget_code stores the UUID of the cost code)
costsByCode[item.budget_code].pendingCostChanges += amount;

// For change_order_lines: Direct cost_code_id match
costsByCode[item.cost_code_id].pendingCostChanges += amount;
```

### Budget Code Format

The `budget_code` field in SOV items can contain:
1. **UUID format:** Matches `cost_codes.id` directly
2. **String code format:** May match `cost_codes.code` (e.g., "01-3120", "01.R")

**Current implementation assumes:** `budget_code` is a UUID matching `cost_codes.id`

## Cost Aggregation Rules (Procore)

### Job to Date Cost Detail
- **Source:** `direct_cost_line_items`
- **Filter:** `approved = true`
- **Types included:** Invoice, Expense, Payroll, Subcontractor Invoice
- **Formula:** SUM(amount) WHERE cost_type IN ['Invoice', 'Expense', 'Payroll', 'Subcontractor Invoice']

### Direct Costs
- **Source:** `direct_cost_line_items`
- **Filter:** `approved = true`
- **Types included:** Invoice, Expense, Payroll (EXCLUDES Subcontractor Invoice)
- **Formula:** SUM(amount) WHERE cost_type IN ['Invoice', 'Expense', 'Payroll']

### Pending Cost Changes
- **Sources:**
  1. `subcontract_sov_items` → subcontracts with status 'Out For Signature'
  2. `purchase_order_sov_items` → POs with status 'Processing', 'Submitted', 'Partially Received', 'Received'
  3. `change_order_lines` → change orders with status LIKE 'Pending%'
- **Formula:** SUM of all pending items from all three sources

## Verification Queries

### Check if refresh_budget_rollup exists
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'refresh_budget_rollup';
```

### Verify v_budget_lines has calculated columns
```sql
SELECT id, cost_code_id, original_amount, budget_mod_total, approved_co_total, revised_budget
FROM v_budget_lines
WHERE project_id = [YOUR_PROJECT_ID]
LIMIT 10;
```

### Verify budget_code mapping in SOV items
```sql
-- Check if budget_code values match cost_codes.id
SELECT DISTINCT s.budget_code, c.id as cost_code_id, c.code as cost_code
FROM subcontract_sov_items s
LEFT JOIN cost_codes c ON c.id::text = s.budget_code
WHERE s.budget_code IS NOT NULL
LIMIT 20;
```

## Document Information

- **Created:** 2025-01-06
- **Phase:** 1A & 1B Implementation
- **Last Updated:** 2025-01-06
