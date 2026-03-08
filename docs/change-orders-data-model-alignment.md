# Change Orders Data Model Alignment Decision

**Date**: 2026-02-04
**Epic**: Audit & Align Data Access Layer
**Status**: DECISION MADE

## Executive Summary

The codebase currently has **THREE separate change order tables** serving different purposes:
1. `change_orders` - General project-level change orders (legacy/current main table)
2. `contract_change_orders` - Simple prime contract change orders (UUID-based, minimal fields)
3. `prime_contract_change_orders` - Full-featured prime contract change orders (BIGINT-based, comprehensive)

**RECOMMENDATION**: Align on `change_orders` as the unified table for ALL change order types, deprecating `contract_change_orders`.

---

## Table Comparison Analysis

### 1. `change_orders` Table
**Schema**: Enhanced project-level change orders
**Primary Key**: `id BIGINT` (auto-increment)
**Foreign Keys**:
- `project_id` (BIGINT, REQUIRED)
- `contract_id` (INTEGER, OPTIONAL) - links to `contracts` table
- `change_event_id` (UUID, OPTIONAL)

**Key Columns**:
```typescript
- id: number (BIGINT auto-increment)
- project_id: number (required)
- contract_id: number | null
- change_event_id: string | null (UUID)
- co_number: string | null
- title: string | null
- description: string | null
- amount: number | null
- status: string | null
- is_private: boolean | null
- designated_reviewer_id: string | null (UUID)
- due_date: string | null
- submitted_at: string | null
- submitted_by: string | null
- approved_at: string | null
- approved_by: string | null
- rejection_reason: string | null
- apply_vertical_markup: boolean | null
```

**RLS Policies**: ✅ Enabled with comprehensive project-based policies
**Migrations**: Enhanced via `20260201100000_change_orders_enhance.sql`

**Current Usage**:
- ✅ Hook: `use-change-orders.ts` (queries this table)
- ✅ Page: `/[projectId]/change-orders/*` (uses this via hook)

---

### 2. `contract_change_orders` Table
**Schema**: Simple prime contract change orders
**Primary Key**: `id UUID`
**Foreign Keys**:
- `contract_id` (UUID, REQUIRED) - links to `prime_contracts` table

**Key Columns**:
```typescript
- id: string (UUID)
- contract_id: string (UUID, required)
- change_order_number: string (required)
- description: string (required)
- amount: number (required)
- status: string ("pending" | "approved" | "rejected")
- requested_by: string | null (UUID)
- requested_date: string (required)
- approved_by: string | null (UUID)
- approved_date: string | null
- rejection_reason: string | null
```

**RLS Policies**: ❌ Not visible in current schema
**Status Constraint**: CHECK ((status = ANY (ARRAY['pending', 'approved', 'rejected'])))

**Current Usage**:
- ✅ API Route: `/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts`
- ✅ Types: `contract-change-orders.ts`
- ⚠️ **Issue**: `prime_contracts.id` is BIGINT, but `contract_id` expects UUID

---

### 3. `prime_contract_change_orders` Table
**Schema**: Full-featured prime contract change orders
**Primary Key**: `id BIGINT` (auto-increment)
**Foreign Keys**:
- `contract_id` (BIGINT, REQUIRED) - links to prime contracts

**Key Columns**:
```typescript
- id: bigint (auto-increment)
- contract_id: bigint (required)
- pcco_number: text
- title: text (required)
- status: text
- executed: boolean (default false)
- submitted_at: timestamp
- approved_at: timestamp
- total_amount: numeric(14,2)
```

**Current Usage**:
- ✅ Drizzle Schema: `primeContractChangeOrders` definition exists
- ✅ Schema: `prime-contract-change-order-schema.ts`
- ✅ Referenced in financial views for approved change order totals

---

## Key Findings

### 1. Type Incompatibility in `contract_change_orders`
**Critical Issue**: The `contract_change_orders` table has a **data type mismatch**:
- Table expects: `contract_id UUID`
- Actual FK target: `prime_contracts.id` is **BIGINT** (not UUID)

**Evidence**:
```sql
-- From database.types.ts:
contract_change_orders.contract_id: string (UUID)

-- But prime_contracts uses:
prime_contracts.id: bigint (from schema.sql line 7531)
```

This means `contract_change_orders` **cannot work** with the existing `prime_contracts` table without schema changes.

### 2. Functional Overlap
- `change_orders` can link to contracts via `contract_id` (INTEGER FK to `contracts` table)
- `prime_contract_change_orders` is specifically for prime contracts with comprehensive fields
- `contract_change_orders` appears to be a **partially implemented alternative** that conflicts with both

### 3. Current Data Access Patterns

**Frontend Hook**: `use-change-orders.ts`
```typescript
// Queries change_orders table
const { data } = await supabase
  .from("change_orders")
  .select("*")
  .eq("contract_id", contractId);
```

**API Route**: `/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts`
```typescript
// Queries contract_change_orders table (BROKEN due to UUID mismatch)
const { data } = await supabase
  .from("contract_change_orders")
  .select("*")
  .eq("contract_id", contractId);  // contractId is string, expects UUID
```

---

## Decision: Alignment Strategy

### ✅ RECOMMENDED APPROACH

**Use `change_orders` as the unified table** for ALL change order types:

1. **Prime Contract Change Orders**: Store in `change_orders` with `contract_id` populated
2. **Commitment Change Orders**: Use existing `commitment_change_orders` table (already working)
3. **Standalone/Legacy Change Orders**: Store in `change_orders` with `contract_id = NULL`

### Migration Plan

#### Phase 1: Fix API Routes
- **Update** `/api/projects/[projectId]/contracts/[contractId]/change-orders/*` routes to query `change_orders` instead of `contract_change_orders`
- **Filter** by `contract_id` and ensure proper type handling (BIGINT vs UUID)
- **Add** validation to ensure `contract_id` links to valid `prime_contracts`

#### Phase 2: Deprecate `contract_change_orders`
- **Do NOT use** `contract_change_orders` for new features
- **Document** the table as deprecated
- **Plan migration** (future epic) to copy any existing data to `change_orders`
- **Drop table** once confirmed no data exists

#### Phase 3: Schema Enhancements
- **Ensure** `change_orders` has all necessary columns for prime contract use cases:
  - ✅ contract_id (already exists)
  - ✅ amount (already exists)
  - ✅ status (already exists)
  - ✅ designated_reviewer_id (already exists)
  - ✅ approved_by, approved_at (already exists)
  - ✅ rejection_reason (already exists)
- **Add** any missing Procore-aligned fields (revision number, date initiated, etc.) as needed

#### Phase 4: Update Types
- **Extend** `use-change-orders.ts` hook to support contract-specific queries
- **Update** types in `contract-change-orders.ts` to match `change_orders` schema
- **Ensure** type safety for contract_id (number vs string)

---

## Alternative Considered & Rejected

### ❌ Use `contract_change_orders` as primary table
**Rejected because**:
- UUID type mismatch with existing `prime_contracts.id` (BIGINT)
- Missing important fields (change_event_id, is_private, designated_reviewer, etc.)
- No RLS policies configured
- Would require breaking changes to existing working hook

### ❌ Use `prime_contract_change_orders` as primary table
**Rejected because**:
- Limited to prime contracts only (no support for standalone change orders)
- Missing `change_event_id` linkage needed for conversion workflow
- Less comprehensive than enhanced `change_orders` table

---

## Implementation Checklist for Epic 47

- [x] Audit table schemas
- [x] Identify type mismatches
- [x] Document current usage
- [ ] Create unified hook: `use-contract-change-orders.ts` that wraps `use-change-orders.ts`
- [ ] Update API routes to use `change_orders` table
- [ ] Update type definitions to align with `change_orders` schema
- [ ] Reconcile `contract_id` type handling (BIGINT in contracts, INTEGER in change_orders)
- [ ] Add tests for contract-specific change order queries

---

## Data Model Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     change_orders (UNIFIED)                 │
│  - Handles ALL types of change orders                      │
│  - id: BIGINT (auto-increment)                             │
│  - project_id: BIGINT (required)                           │
│  - contract_id: INTEGER (optional, links to contracts)     │
│  - change_event_id: UUID (optional, for conversions)       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├── When contract_id IS NULL → Standalone Change Order
              │
              ├── When contract_id IS NOT NULL → Contract Change Order
              │   └── Links to contracts.id (INTEGER)
              │       └── contracts may link to prime_contracts
              │
              └── When change_event_id IS NOT NULL → Converted from Change Event
```

---

## Conclusion

**Status**: ✅ **DECISION APPROVED**

**Action**: Proceed with using `change_orders` as the unified table. Update all API routes and hooks to align with this decision. Deprecate `contract_change_orders` and plan for eventual removal.

**Next Steps**: Implement Epic 47 tasks to create/update hooks and reconcile type definitions.
