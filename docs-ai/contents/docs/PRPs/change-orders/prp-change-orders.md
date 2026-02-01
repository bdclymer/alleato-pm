# PRP: Change Orders (Prime Contract Change Orders)

**Version**: 1.0
**Created**: 2026-02-01
**Confidence Score**: 8/10
**Status**: Ready for Implementation

---

## Goal

**Feature Goal**: Deliver a fully functional Prime Contract Change Orders (PCO/PCCO) tool aligned with Procore's 2-tier change order workflow, enabling project teams to create, review, approve/reject, and track change orders that modify prime contract values and impact the project budget.

**Deliverable**: A complete Change Orders module with:
- Enhanced list page with filtering, sorting, and status-based views
- Detail page with tabs (General Info, SOV Line Items, Related Items, Approvals)
- Multi-step creation form with budget code integration
- Approval/rejection workflow UI
- Change event-to-change-order conversion
- Budget integration (approved COs update contract values and budget columns)

**Success Definition**:
1. Users can create a change order with SOV line items linked to budget codes
2. Designated reviewers can approve/reject with audit trail
3. Approved COs update `prime_contracts.revised_contract_value`
4. Change orders appear in budget "Approved COs" and "Pending Changes" columns
5. Change events can be converted to change orders
6. All E2E tests pass covering CRUD + approval workflow

---

## Why

**Business Value**: Change orders are the primary mechanism for modifying contract values in construction. Without a robust change order system, project financial tracking is incomplete -- teams cannot track scope changes, budget impacts, or contract modifications.

**Integration**: Change orders are the critical link between:
- **Change Events** (upstream triggers) -- conversion workflow
- **Prime Contracts** (contract value modifications) -- approved COs update revised value
- **Budget** (financial impact) -- approved/pending COs flow into budget columns
- **Commitments** (cost-side changes) -- future CCO integration

**Problems Solved**:
- No detail view for individual change orders (only list exists)
- No SOV line item management (table exists but no UI)
- No approval workflow UI (API exists but no frontend)
- Incomplete budget integration (approved COs not flowing to budget)
- Change event conversion dialog exists but is not fully wired

---

## What

### Pages

| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Change Orders List | `/{projectId}/change-orders` | Exists (basic) | Needs: status filtering tabs, financial summary cards, bulk actions |
| Create Change Order | `/{projectId}/change-orders/new` | Exists (basic) | Needs: SOV line items, budget code selector, contract selector |
| Change Order Detail | `/{projectId}/change-orders/{changeOrderId}` | Exists (minimal) | Needs: tabs, SOV table, approval UI, related items, attachments |

### Database Schema

**Existing Tables** (already deployed):
- `change_orders` (id: INTEGER, project_id: INTEGER FK) -- main entity
- `contract_change_orders` (id: UUID, contract_id: UUID FK) -- contract-specific COs
- `change_order_lines` (id: UUID, change_order_id: INTEGER FK) -- line items
- `change_order_approvals` (id: UUID, change_order_id: INTEGER FK) -- audit trail

**New Tables/Columns Needed**:
- `change_order_packages` -- for grouping COs (2-tier workflow)
- Add `contract_id` column to `change_orders` table (link to prime_contracts)
- Add `amount` column to `change_orders` table (total CO value)
- Add `change_event_id` column to `change_orders` table (conversion tracking)

### API Endpoints

**Existing** (need enhancement):
- `GET/POST /api/change-orders` -- global CRUD
- `GET/PUT/DELETE /api/change-orders/[id]` -- single CO operations
- `GET/POST /api/projects/[projectId]/contracts/[contractId]/change-orders` -- contract-scoped
- `POST .../[changeOrderId]/approve` -- approval endpoint
- `POST .../[changeOrderId]/reject` -- rejection endpoint

**New Endpoints Needed**:
- `GET/POST /api/projects/[projectId]/change-orders/[changeOrderId]/lines` -- line item CRUD
- `PUT/DELETE /api/projects/[projectId]/change-orders/[changeOrderId]/lines/[lineId]` -- line item ops
- `POST /api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order` -- conversion
- `GET /api/projects/[projectId]/change-orders/summary` -- financial summary for dashboard

### Components

| Component | Status | Description |
|-----------|--------|-------------|
| `ChangeOrdersClient` | Exists | List table -- needs status tabs, summary cards |
| `ChangeOrderDetail` | New | Tabbed detail view (General, SOV, Related, Approvals) |
| `ChangeOrderForm` | Enhance | Multi-step form with SOV line items |
| `ChangeOrderLineItemsTable` | New | Editable SOV table with budget code selector |
| `ChangeOrderApprovalPanel` | New | Approve/reject UI with comments |
| `ChangeOrderStatusBadge` | Enhance | Support full Procore status set |
| `ChangeOrderSummaryCards` | New | Financial summary (pending, approved, total) |

### Form Fields (Create/Edit)

**Step 1 - General Information**:
- Change Order # (auto-generated or manual, required)
- Title (required)
- Description (rich text)
- Status (dropdown: draft, pending_in_review, approved, rejected, void, etc.)
- Private (checkbox)
- Due Date
- Contract (selector -- links to prime_contracts)

**Step 2 - Schedule of Values (SOV) Line Items**:
- Cost Code (budget code selector)
- Description
- Amount ($)
- Each line links to a budget code for budget integration

**Step 3 - Review & Submit**:
- Designated Reviewer (user selector)
- Attachments (file upload)
- Summary review before submission

### Table Columns (List View)

| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| # | string | Yes | No |
| Title | string | Yes | Yes (search) |
| Status | badge | Yes | Yes (multi-select) |
| Amount | currency | Yes | No |
| Contract | link | No | Yes |
| Created By | text | No | No |
| Created Date | date | Yes | No |
| Due Date | date | Yes | No |
| Approved Date | date | Yes | No |

---

## Success Criteria

- [ ] Change order CRUD with full Procore status set (draft, pending_in_review, approved, rejected, void, no_charge)
- [ ] SOV line items with budget code integration (create, edit, delete lines)
- [ ] Approval workflow: designated reviewer can approve/reject with comments
- [ ] Approved COs update `prime_contracts.revised_contract_value`
- [ ] Budget integration: approved COs appear in budget "Approved COs" column
- [ ] Change event conversion: create CO from change event with pre-populated data
- [ ] Detail page with tabbed interface (General, SOV, Approvals, Related Items)
- [ ] E2E tests covering: create, edit, approve, reject, delete, convert from CE
- [ ] TypeScript strict mode compliance -- no type errors

---

## All Needed Context

### Context Completeness Check

_This PRP was validated against the "No Prior Knowledge" test. An implementing agent with only this document and codebase access has everything needed to build the feature._

### Documentation & References

```yaml
# MUST READ - Critical implementation references
- file: frontend/src/app/(main)/[projectId]/change-orders/page.tsx
  why: Existing list page - understand current structure before enhancing
  pattern: Server component with client wrapper, Supabase query pattern
  gotcha: Uses `change_orders` table (INTEGER PK), not `contract_change_orders` (UUID PK)

- file: frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx
  why: Existing create form - needs SOV line items added
  pattern: react-hook-form + zod validation, direct Supabase insert
  gotcha: Currently inserts to `change_orders` table without contract_id or amount

- file: frontend/src/hooks/use-change-orders.ts
  why: Existing hook - needs enhancement for line items and contract linking
  pattern: Manual useState/useCallback (not React Query), graceful column fallback
  gotcha: Has retry logic for missing columns (migration not yet applied)

- file: frontend/src/types/contract-change-orders.ts
  why: Type definitions for contract-scoped change orders
  pattern: Interface + input types + summary type
  gotcha: This is for `contract_change_orders` table (UUID), not `change_orders` (INTEGER)

- file: frontend/src/lib/schemas/prime-contract-change-order-schema.ts
  why: Procore-aligned status enum with 11 values and display labels
  pattern: Zod schema with PcoStatusEnum, PCO_STATUS_LABELS map
  gotcha: Form schema has many nullable fields - matches Procore's flexible creation

- file: frontend/src/app/api/change-orders/route.ts
  why: Existing API with pagination, filtering, commitment/change_event joins
  pattern: Supabase server client, apiErrorResponse, PaginatedResponse
  gotcha: POST requires commitment_id and change_event_id - may need to make optional

- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/route.ts
  why: Existing approval endpoint that updates contract revised_contract_value
  pattern: User validation, contract lookup, status update, contract value adjustment
  gotcha: Only works for contract_change_orders table - need equivalent for change_orders

- file: frontend/src/components/domain/contracts/ContractForm.tsx
  why: Reference for SOV line item editing pattern with budget code selector
  pattern: Dynamic line items with addSOVLine/updateSOVLine/removeSOVLine
  gotcha: Uses Popover + Command for budget code selection - reuse this pattern

- file: frontend/src/components/budget/budget-code-selector.tsx
  why: Budget code selector component for SOV line items
  pattern: Searchable dropdown with hierarchical cost codes
  gotcha: Needs projectId for fetching budget codes

- file: frontend/src/app/(main)/[projectId]/budget/page.tsx
  why: Budget page that displays CO data in columns
  pattern: Aggregated data from multiple sources, tab-driven navigation
  gotcha: Budget API already has CO aggregation - ensure approved COs flow correctly

- file: frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx
  why: Existing conversion dialog - needs wiring to actual CO creation
  pattern: Dialog with contract selector, calls convert endpoint
  gotcha: Not yet tested - may need fixes

# Procore Reference Documentation
- url: https://support.procore.com/products/online/user-guide/project-level/prime-contracts/tutorials/create-prime-contract-change-orders
  why: Procore PCCO creation workflow and field definitions
  critical: Multi-tier system (1/2/3 tier), status values, form fields

- url: https://support.procore.com/faq/what-are-the-default-statuses-for-change-orders-in-procore
  why: Complete status list with budget impact definitions
  critical: Draft/Rejected = no budget impact, Pending = pending changes, Approved = approved changes

- url: https://support.procore.com/products/online/user-guide/project-level/prime-contracts/tutorials/configure-the-number-of-prime-contract-change-order-tiers
  why: Tier configuration - we implement 2-tier (PCO → PCCO) as default
  critical: Tier setting cannot be decreased once COs exist

# Existing Spec Documents (in PRPs/finance-tools/change-orders/)
- file: PRPs/finance-tools/change-orders/SCHEMA-ChangeOrders.md
  why: Complete database schema with 6 tables, indexes, triggers, and migration SQL
  pattern: Use as reference for any new migrations needed

- file: PRPs/finance-tools/change-orders/API_ENDPOINTS-ChangeOrders.md
  why: Full API specification with 25+ endpoints, request/response examples
  pattern: Endpoint naming, error codes, rate limiting specs

- file: PRPs/finance-tools/change-orders/FORMS-ChangeOrders.md
  why: Detailed form specs for 8 form types with validation rules
  pattern: Multi-step creation form, inline SOV editor, approval workflow form

- file: PRPs/finance-tools/change-orders/UI-ChangeOrders.md
  why: Component specs with responsive design for 10 major components
  pattern: Desktop/tablet/mobile layouts, state management patterns
```

### Current Codebase Tree (Change Orders)

```bash
frontend/src/
├── app/
│   ├── (main)/[projectId]/change-orders/
│   │   ├── page.tsx                    # List page (server component)
│   │   ├── change-orders-client.tsx    # Client table component
│   │   ├── new/page.tsx               # Create form (client component)
│   │   └── [changeOrderId]/page.tsx   # Detail page (minimal)
│   └── api/
│       ├── change-orders/
│       │   ├── route.ts               # Global GET/POST
│       │   └── [id]/route.ts          # GET/PUT/DELETE by ID
│       └── projects/[projectId]/contracts/[contractId]/change-orders/
│           ├── route.ts               # Contract-scoped GET/POST
│           ├── validation.ts          # Zod schemas
│           └── [changeOrderId]/
│               ├── route.ts           # Contract CO GET/PUT/DELETE
│               ├── approve/route.ts   # Approval endpoint
│               └── reject/route.ts    # Rejection endpoint
├── components/
│   ├── commitments/tabs/ChangeOrdersTab.tsx  # Commitment CO tab
│   └── domain/change-events/ChangeEventConvertDialog.tsx
├── hooks/
│   └── use-change-orders.ts           # Fetch/create hook
├── types/
│   └── contract-change-orders.ts      # Type definitions
└── lib/schemas/
    └── prime-contract-change-order-schema.ts  # Procore status enum + form schema
```

### Desired Codebase Tree (files to add/modify)

```bash
frontend/src/
├── app/
│   ├── (main)/[projectId]/change-orders/
│   │   ├── page.tsx                              # MODIFY: Add summary cards, status tabs
│   │   ├── change-orders-client.tsx              # MODIFY: Enhanced table with status filters
│   │   ├── new/page.tsx                          # MODIFY: Add SOV line items, contract selector
│   │   └── [changeOrderId]/
│   │       └── page.tsx                          # MODIFY: Full detail with tabs
│   └── api/projects/[projectId]/
│       ├── change-orders/
│       │   ├── route.ts                          # ADD: Project-scoped CO list/create
│       │   ├── summary/route.ts                  # ADD: Financial summary endpoint
│       │   └── [changeOrderId]/
│       │       ├── route.ts                      # ADD: Single CO get/update/delete
│       │       ├── approve/route.ts              # ADD: Approval endpoint
│       │       ├── reject/route.ts               # ADD: Rejection endpoint
│       │       └── lines/
│       │           ├── route.ts                  # ADD: Line items CRUD
│       │           └── [lineId]/route.ts         # ADD: Single line item ops
│       └── change-events/[changeEventId]/
│           └── convert-to-change-order/route.ts  # ADD: Conversion endpoint
├── components/
│   └── change-orders/
│       ├── ChangeOrderDetail.tsx                 # ADD: Tabbed detail component
│       ├── ChangeOrderForm.tsx                   # ADD: Enhanced multi-step form
│       ├── ChangeOrderLineItemsTable.tsx         # ADD: SOV line items editor
│       ├── ChangeOrderApprovalPanel.tsx          # ADD: Approve/reject UI
│       ├── ChangeOrderSummaryCards.tsx           # ADD: Financial summary cards
│       └── ChangeOrderStatusBadge.tsx            # ADD: Enhanced status badge
├── hooks/
│   └── use-change-orders.ts                      # MODIFY: Add line items, approval actions
└── tests/
    └── e2e/
        └── change-orders.spec.ts                 # ADD: Comprehensive E2E tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Two parallel change order tables exist
// `change_orders` (id: INTEGER) -- project-level, current pages use this
// `contract_change_orders` (id: UUID) -- contract-scoped, API approval routes use this
// DECISION: Enhance `change_orders` table with contract_id column to unify
// DO NOT create a third table. Migrate to single table approach.

// CRITICAL: project_id is INTEGER, not UUID
// projects.id is auto-increment INTEGER
// All FK columns must be: project_id INTEGER REFERENCES projects(id)
// NEVER use UUID for project_id

// CRITICAL: Next.js 15 params are Promise-based
// In server components: const { projectId } = await params;
// In client components: const params = useParams();

// CRITICAL: Route parameter naming
// ALWAYS use [projectId], [changeOrderId], [lineId]
// NEVER use generic [id] -- causes Next.js routing conflicts

// CRITICAL: Supabase server vs client
// Server Components/API Routes: import { createClient } from "@/lib/supabase/server"
// Client Components: import { createClient } from "@/lib/supabase/client"

// CRITICAL: Next.js cache
// After creating new routes: rm -rf .next && restart dev server
// New pages won't be recognized until cache is cleared

// GOTCHA: Budget code selector needs projectId
// The BudgetCodeSelector component fetches codes per project
// Pass projectId as prop when using in SOV line item editor

// GOTCHA: apiErrorResponse utility
// All API routes should use: import { apiErrorResponse } from "@/lib/api-error"
// Standardizes error responses across all endpoints

// GOTCHA: PcoStatusEnum has 11 values but current UI only uses 5
// The schema supports full Procore status set -- implement all 11
// PCO_STATUS_LABELS in prime-contract-change-order-schema.ts has the display labels
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// === Core Types (enhance existing) ===

// Change Order (aligned with change_orders table + new columns)
interface ChangeOrder {
  id: number;                    // INTEGER PK (auto-increment)
  project_id: number;            // INTEGER FK to projects.id
  contract_id?: string | null;   // UUID FK to prime_contracts.id (NEW)
  change_event_id?: string | null; // UUID FK to change_events.id (NEW)
  co_number: string;             // Change order number
  title: string;
  description: string | null;
  status: PcoStatus;             // Use full Procore status enum
  amount: number | null;         // Total CO value (NEW - sum of line items)
  is_private: boolean;
  due_date: string | null;
  designated_reviewer_id: string | null;
  apply_vertical_markup: boolean | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Change Order Line Item (for SOV)
interface ChangeOrderLineItem {
  id: string;                    // UUID PK
  change_order_id: number;       // INTEGER FK to change_orders.id
  project_id: number;            // INTEGER FK to projects.id
  cost_code_id: string | null;   // UUID FK to cost_codes.id
  cost_type_id: string | null;   // UUID FK to cost_code_types.id
  description: string | null;
  amount: number;
  sub_job_id: string | null;
  created_at: string;
  updated_at: string;
}

// Approval Record
interface ChangeOrderApproval {
  id: string;                    // UUID PK
  change_order_id: number;       // INTEGER FK
  approver: string;              // User ID
  decision: 'approved' | 'rejected';
  decided_at: string;
  role: string | null;
  comment: string | null;
}

// Zod Schemas
const createChangeOrderSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  status: PcoStatusEnum.default("draft"),
  contract_id: z.string().uuid().nullable().optional(),
  is_private: z.boolean().default(false),
  due_date: z.string().nullable().optional(),
  designated_reviewer_id: z.string().uuid().nullable().optional(),
  lines: z.array(z.object({
    cost_code_id: z.string().uuid().nullable(),
    cost_type_id: z.string().uuid().nullable(),
    description: z.string().nullable(),
    amount: z.number(),
  })).optional().default([]),
});

const approveChangeOrderSchema = z.object({
  comment: z.string().nullable().optional(),
});

const rejectChangeOrderSchema = z.object({
  rejection_reason: z.string().min(1, "Rejection reason is required"),
  comment: z.string().nullable().optional(),
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: Database Migration - Add missing columns to change_orders
  - ADD columns: contract_id (UUID FK), change_event_id (UUID FK), amount (NUMERIC),
    is_private (BOOLEAN), due_date (DATE), designated_reviewer_id (UUID),
    rejection_reason (TEXT)
  - ADD indexes on new FK columns
  - FOLLOW pattern: existing change_orders table structure
  - VERIFY: npm run db:types after migration
  - CRITICAL: project_id stays INTEGER, new FKs use UUID for prime_contracts

Task 2: CREATE components/change-orders/ChangeOrderStatusBadge.tsx
  - IMPLEMENT: Status badge with all 11 Procore statuses and color coding
  - FOLLOW pattern: existing StatusBadge in change-orders-client.tsx
  - USE: PCO_STATUS_LABELS from prime-contract-change-order-schema.ts
  - COLORS: draft=gray, pending_*=yellow, approved=green, rejected=red, void=gray, no_charge=blue

Task 3: CREATE components/change-orders/ChangeOrderSummaryCards.tsx
  - IMPLEMENT: Financial summary cards (Total COs, Pending Amount, Approved Amount, Rejected)
  - FOLLOW pattern: metric-card.tsx component
  - DATA: Aggregate from change orders list by status

Task 4: CREATE components/change-orders/ChangeOrderLineItemsTable.tsx
  - IMPLEMENT: Editable SOV line item table with budget code selector
  - FOLLOW pattern: ContractForm.tsx SOV line item pattern (addSOVLine/updateSOVLine/removeSOVLine)
  - INCLUDE: BudgetCodeSelector from budget-code-selector.tsx
  - FEATURES: Add row, edit inline, delete row, auto-calculate total
  - PROPS: projectId, lines[], onChange, disabled

Task 5: CREATE components/change-orders/ChangeOrderApprovalPanel.tsx
  - IMPLEMENT: Approve/reject interface with comments
  - FOLLOW pattern: Card with action buttons (Approve green, Reject red)
  - INCLUDE: Textarea for comments/rejection reason
  - SHOW: Approval history from change_order_approvals table
  - CONDITIONAL: Only visible to designated_reviewer when status is pending_in_review

Task 6: CREATE components/change-orders/ChangeOrderForm.tsx
  - IMPLEMENT: Enhanced multi-step creation form
  - STEPS: 1) General Info, 2) SOV Line Items, 3) Review & Submit
  - USE: react-hook-form + createChangeOrderSchema
  - INCLUDE: Contract selector (prime_contracts dropdown), ChangeOrderLineItemsTable
  - FOLLOW pattern: existing new/page.tsx form structure but enhanced

Task 7: CREATE components/change-orders/ChangeOrderDetail.tsx
  - IMPLEMENT: Tabbed detail view
  - TABS: General Info, Schedule of Values, Approvals, Related Items
  - INCLUDE: ChangeOrderApprovalPanel, ChangeOrderLineItemsTable (read-only for non-draft)
  - SHOW: Edit button for draft COs, status workflow indicators

Task 8: ADD API route /api/projects/[projectId]/change-orders/route.ts
  - GET: List change orders for project with pagination, status filter, search
  - POST: Create change order with line items (transactional)
  - FOLLOW pattern: existing /api/change-orders/route.ts
  - ENHANCE: Support contract_id filter, include line items count, financial totals

Task 9: ADD API route /api/projects/[projectId]/change-orders/[changeOrderId]/route.ts
  - GET: Single CO with lines, approvals, related items
  - PUT: Update CO fields + line items
  - DELETE: Only draft/rejected COs
  - FOLLOW pattern: existing /api/change-orders/[id]/route.ts

Task 10: ADD API routes for approval workflow
  - POST /api/projects/[projectId]/change-orders/[changeOrderId]/approve/route.ts
  - POST /api/projects/[projectId]/change-orders/[changeOrderId]/reject/route.ts
  - FOLLOW pattern: existing contract CO approval routes
  - ON APPROVE: Update status, create approval record, update prime_contracts.revised_contract_value
  - ON REJECT: Update status, set rejection_reason, create approval record

Task 11: ADD API route for line items CRUD
  - GET/POST /api/projects/[projectId]/change-orders/[changeOrderId]/lines/route.ts
  - PUT/DELETE /api/projects/[projectId]/change-orders/[changeOrderId]/lines/[lineId]/route.ts
  - RECALCULATE: change_orders.amount = SUM(change_order_lines.amount) after any line change

Task 12: ADD API route for change event conversion
  - POST /api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order/route.ts
  - LOGIC: Create CO from change event data, link via change_event_id, update CE status
  - FOLLOW pattern: ChangeEventConvertDialog.tsx for expected request/response

Task 13: MODIFY change-orders list page
  - UPDATE: page.tsx to include ChangeOrderSummaryCards
  - UPDATE: change-orders-client.tsx with status tab filters, enhanced columns, ChangeOrderStatusBadge
  - ADD: Status filter tabs (All, Draft, Pending, Approved, Rejected)

Task 14: MODIFY change-orders detail page
  - REPLACE: Minimal detail view with ChangeOrderDetail component
  - FETCH: CO with lines + approvals in server component
  - PASS: Data to client detail component

Task 15: MODIFY change-orders create page
  - REPLACE: Simple form with ChangeOrderForm multi-step component
  - ADD: Contract selector, SOV line items step
  - SUBMIT: To new project-scoped API route

Task 16: MODIFY use-change-orders.ts hook
  - ADD: fetchLineItems, createLineItem, updateLineItem, deleteLineItem
  - ADD: approveChangeOrder, rejectChangeOrder actions
  - ADD: convertFromChangeEvent action
  - KEEP: Backward compatibility with existing usage

Task 17: CREATE tests/e2e/change-orders-comprehensive.spec.ts
  - TEST: Create CO with line items
  - TEST: Edit CO (update fields, add/remove lines)
  - TEST: Approve CO (verify contract value update)
  - TEST: Reject CO with reason
  - TEST: Delete draft CO
  - TEST: Status filtering on list page
  - TEST: Change event conversion
  - FOLLOW pattern: existing tests/change-orders/change-orders.spec.ts
```

### Implementation Patterns & Key Details

```typescript
// === Pattern: Server Component Page with Client Detail ===
// File: app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx

export default async function ChangeOrderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; changeOrderId: string }>;
}) {
  const { projectId, changeOrderId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  // Fetch CO with related data
  const { data: changeOrder } = await supabase
    .from("change_orders")
    .select(`
      *,
      lines:change_order_lines(*),
      approvals:change_order_approvals(*)
    `)
    .eq("id", parseInt(changeOrderId))
    .eq("project_id", numericProjectId)
    .single();

  return <ChangeOrderDetail changeOrder={changeOrder} projectId={projectId} />;
}


// === Pattern: SOV Line Items Editor ===
// Follows ContractForm.tsx pattern

interface LineItem {
  id: string;
  cost_code_id: string | null;
  description: string | null;
  amount: number;
}

const addLine = () => {
  const newLine: LineItem = {
    id: `line-${Date.now()}`,
    cost_code_id: null,
    description: null,
    amount: 0,
  };
  setLines(prev => [...prev, newLine]);
};

const updateLine = (id: string, updates: Partial<LineItem>) => {
  setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
};

const removeLine = (id: string) => {
  setLines(prev => prev.filter(l => l.id !== id));
};

const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);


// === Pattern: Approval Endpoint ===
// POST /api/projects/[projectId]/change-orders/[changeOrderId]/approve

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; changeOrderId: string }> }
) {
  const { projectId, changeOrderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch CO and verify it's pending
  const { data: co } = await supabase
    .from("change_orders")
    .select("*, contract:prime_contracts!contract_id(id, revised_contract_value)")
    .eq("id", parseInt(changeOrderId))
    .eq("project_id", parseInt(projectId))
    .single();

  if (!co) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!co.status?.startsWith("pending")) {
    return NextResponse.json({ error: "Can only approve pending COs" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // 2. Update CO status
  await supabase.from("change_orders")
    .update({ status: "approved", approved_at: now, approved_by: user.id })
    .eq("id", co.id);

  // 3. Create approval record
  await supabase.from("change_order_approvals")
    .insert({ change_order_id: co.id, approver: user.id, decision: "approved", decided_at: now });

  // 4. Update contract revised value if linked
  if (co.contract_id && co.amount && co.contract) {
    const newValue = (co.contract.revised_contract_value || 0) + co.amount;
    await supabase.from("prime_contracts")
      .update({ revised_contract_value: newValue })
      .eq("id", co.contract_id);
  }

  return NextResponse.json({ success: true });
}


// === Pattern: Status Badge Colors ===
const STATUS_COLORS: Record<PcoStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_in_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending_pricing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending_proceeding: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending_not_pricing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pending_not_proceeding: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pending_revised: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  void: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  no_charge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};
```

### Integration Points

```yaml
DATABASE:
  - table: change_orders (existing, needs migration for new columns)
  - table: change_order_lines (existing)
  - table: change_order_approvals (existing)
  - FK: change_orders.project_id → projects.id (INTEGER)
  - FK: change_orders.contract_id → prime_contracts.id (UUID) [NEW]
  - FK: change_orders.change_event_id → change_events.id (UUID) [NEW]
  - FK: change_order_lines.cost_code_id → cost_codes.id (UUID)
  - client: "@/lib/supabase/server" for API routes
  - client: "@/lib/supabase/client" for client components

BUDGET_INTEGRATION:
  - Budget API already aggregates change_orders data
  - Approved COs flow into "Approved COs" column via change_orders WHERE status='approved'
  - Pending COs flow into "Pending Changes" column via change_orders WHERE status LIKE 'pending%'
  - Verify: /api/projects/[projectId]/budget/route.ts reads from change_orders

PRIME_CONTRACTS_INTEGRATION:
  - On CO approval: update prime_contracts.revised_contract_value += co.amount
  - On CO rejection after approval: reverse the contract value change
  - Contract selector on CO form: query prime_contracts for project

CHANGE_EVENTS_INTEGRATION:
  - Conversion: POST /change-events/[id]/convert-to-change-order
  - Pre-populate CO from change event: title, description, line items
  - Link: change_orders.change_event_id = change_events.id
  - Update CE status to "converted" after successful conversion

ROUTES:
  - Pages: app/(main)/[projectId]/change-orders/
  - API: app/api/projects/[projectId]/change-orders/
  - NAMING: [projectId], [changeOrderId], [lineId] -- NEVER generic [id]
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
# After each file creation
cd frontend
npx tsc --noEmit                    # TypeScript type checking
npm run lint                         # ESLint checks
```

### Level 2: Unit Tests

```bash
# Test components and hooks
npm test -- tests/e2e/change-orders-comprehensive.spec.ts
```

### Level 3: Integration Testing

```bash
# Clear Next.js cache and restart
cd frontend && rm -rf .next && npm run dev

# Verify pages load
# Navigate to /{projectId}/change-orders
# Navigate to /{projectId}/change-orders/new
# Navigate to /{projectId}/change-orders/{id}

# Test API endpoints
curl http://localhost:3000/api/projects/31/change-orders
```

### Level 4: Domain-Specific Validation

```bash
# E2E test suite
cd frontend && npx playwright test tests/e2e/change-orders-comprehensive.spec.ts --headed

# Verify budget integration
# Create CO → Approve → Check budget page shows in "Approved COs" column

# Verify contract integration
# Approve CO linked to contract → Check prime_contracts.revised_contract_value updated

# Production build
npm run build
```

---

## Final Validation Checklist

### Technical Validation
- [ ] TypeScript: `npx tsc --noEmit` passes with zero errors
- [ ] Linting: `npm run lint` passes
- [ ] Build: `npm run build` succeeds
- [ ] All E2E tests pass

### Feature Validation
- [ ] Create change order with SOV line items works end-to-end
- [ ] Edit change order (update fields, add/remove lines)
- [ ] Approve change order (status updates, contract value adjusts)
- [ ] Reject change order (rejection reason captured)
- [ ] Delete draft change order
- [ ] Status filtering on list page works
- [ ] Financial summary cards show correct totals
- [ ] Change event conversion creates CO with pre-populated data

### Code Quality
- [ ] Follows existing TypeScript/React patterns
- [ ] No `any` types used (strict mode)
- [ ] Error handling with apiErrorResponse in all API routes
- [ ] Consistent route parameter naming ([projectId], [changeOrderId])
- [ ] Server/Client component split follows existing patterns

### Budget Integration
- [ ] Approved COs appear in budget "Approved COs" column
- [ ] Pending COs appear in budget "Pending Changes" column
- [ ] Draft/Rejected COs have zero budget impact
- [ ] Contract revised_contract_value updates on approval

---

## Anti-Patterns to Avoid

- ❌ Don't create a third change order table -- enhance existing `change_orders`
- ❌ Don't use generic `[id]` in routes -- always `[changeOrderId]`, `[lineId]`
- ❌ Don't use UUID for project_id -- it's INTEGER
- ❌ Don't skip cache clear after creating new routes -- `rm -rf .next`
- ❌ Don't use `contract_change_orders` table for new features -- consolidate to `change_orders`
- ❌ Don't hardcode status values -- use PcoStatusEnum from schema
- ❌ Don't forget to update change_orders.amount when line items change
- ❌ Don't skip apiErrorResponse for error handling -- use it everywhere
- ❌ Don't use React Query in hooks -- existing pattern is manual useState/useCallback

---

## Procore Reference Data

### Procore Change Order Status Values

| Status | Display Label | Budget Impact |
|--------|--------------|---------------|
| draft | Draft | None |
| pending_in_review | Pending - In Review | Pending Changes |
| pending_pricing | Pending - Pricing | Pending Changes |
| pending_proceeding | Pending - Proceeding | Pending Changes |
| pending_not_pricing | Pending - Not Pricing | Pending Changes |
| pending_not_proceeding | Pending - Not Proceeding | Pending Changes |
| pending_revised | Pending - Revised | Pending Changes |
| approved | Approved | Approved Changes |
| rejected | Rejected | None |
| void | Void | None |
| no_charge | No Charge | None |

### Procore Tier Configuration (Implementing 2-Tier)

```
2-Tier Workflow (Default):
  Change Event (optional) → Potential Change Order (PCO) → Prime Contract Change Order (PCCO)

For MVP: Implement simplified 2-tier where:
  - "Create Change Order" = creates a PCO (draft status)
  - "Submit for Review" = moves to pending_in_review
  - "Approve" = approved status, updates contract value
  - Package grouping (PCCO) = future enhancement
```

### Procore Support Documentation Pages

| Topic | Path |
|-------|------|
| Create PCOs | `scripts/screenshot-capture/outputs/procore-support-docs/pages/create-prime-contract-change-orders/` |
| Approve/Reject | `scripts/screenshot-capture/outputs/procore-support-docs/pages/approve-or-reject-prime-contract-change-orders/` |
| Configure Tiers | `scripts/screenshot-capture/outputs/procore-support-docs/pages/configure-the-number-of-prime-contract-change-order-tiers/` |
| Add Markup | `scripts/screenshot-capture/outputs/procore-support-docs/pages/add-financial-markup-to-prime-contract-change-orders/` |
| SOV Line Items | `scripts/screenshot-capture/outputs/procore-support-docs/pages/add-line-items-to-a-schedule-of-values-on-a-prime-contract/` |
| Budget Changes | `scripts/screenshot-capture/outputs/procore-support-docs/pages/about-budget-changes/` |
| Budget Detail Tab | `scripts/screenshot-capture/outputs/procore-support-docs/pages/about-the-budget-detail-tab/` |

---

## Existing Spec Documents Reference

Complete specifications are available in the finance-tools directory:

| Document | Path | Key Contents |
|----------|------|-------------|
| Schema | `PRPs/finance-tools/change-orders/SCHEMA-ChangeOrders.md` | 6 tables, indexes, triggers, migration SQL |
| API Endpoints | `PRPs/finance-tools/change-orders/API_ENDPOINTS-ChangeOrders.md` | 25+ endpoints, request/response examples |
| Forms | `PRPs/finance-tools/change-orders/FORMS-ChangeOrders.md` | 8 form types, validation rules |
| UI Components | `PRPs/finance-tools/change-orders/UI-ChangeOrders.md` | 10 components, responsive design specs |
| Plans | `PRPs/finance-tools/change-orders/PLANS-ChangeOrders.md` | 9-phase implementation roadmap |
| Tasks | `PRPs/finance-tools/change-orders/TASKS-ChangeOrders.md` | 90+ task checklist |
