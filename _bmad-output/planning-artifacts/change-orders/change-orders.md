---
title: change orders
description: change orders documentation
---

## Goal

**Feature Goal**: Deliver a Procore-aligned Change Orders tool for prime contracts that supports listing, creating, viewing, approving/rejecting, and converting change events into change orders with correct permissions and status transitions.

**Deliverable**: New/updated Next.js App Router pages, supporting components, and API integrations for prime contract change orders; updated tests and validation coverage.

**Success Definition**: Users can create and manage prime contract change orders end-to-end (create → review → approve/reject) with correct status handling, reviewer workflow, and data integrity; Playwright tests and quality checks pass; verification report generated.

## Why

* Change orders are a critical financial workflow; without a complete tool, users cannot track approved and pending contract modifications.
* Aligns with Procore workflows (designated reviewer, approval status rules, tiered change orders), enabling future parity.
* Unblocks change-event-to-change-order conversion flow and prevents dead links in UI.

## What

The Change Orders tool should:

* Provide a list view for prime contract change orders scoped to a project with filters and status badges.
* Offer a detail view for a single change order (summary, reviewer response, approval actions, history).
* Provide a creation flow consistent with Procore fields (change order number, description, amount, status, requested date, reviewer, etc.).
* Support approval and rejection flows with reviewer comments, updating status and audit fields.
* Integrate change events conversion, routing to the correct change order detail page.
* Ensure table usage consistency (contract_change_orders vs change_orders) and correct API usage.

### Success Criteria

* [ ] List page uses the prime contract change orders dataset and links to detail page.
* [ ] Detail page displays change order metadata, reviewer response, and approval/rejection actions.
* [ ] New change order form writes to contract_change_orders via existing API route.
* [ ] Approval and rejection update status + approved_by/approved_date/rejection_reason appropriately.
* [ ] Change event conversion routes to the change order detail page without 404.
* [ ] Playwright tests for change order API and UI pass; new tests added for UI flows.

## All Needed Context

### Context Completeness Check

*Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"*

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order#steps
  why: Procore PCCO creation workflow, required permissions, and field-level behavior.
  critical: Explains required fields (status, designated reviewer, due date, schedule impact) and submit actions.
- url: https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-or-reject-prime-contract-change-orders#steps
  why: Reviewer approval/rejection flow and status transition rules.
  critical: Status prerequisites (Pending - In Review/Revised) and reviewer response requirements.
- url: https://v2.support.procore.com/es-419/product-manuals/change-orders-project/tutorials
  why: Index of Change Orders tutorials for related flows (view/edit/export/tiers).
  critical: Use as a roadmap for parity and future enhancements.
- url: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
  why: App Router route handler conventions used in existing API routes.
  critical: Named exports (GET/POST/etc.) and request/response semantics.
- url: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
  why: Dynamic route naming and parameter usage for /[projectId]/change-orders/[changeOrderId].
  critical: Use consistent param names (projectId, changeOrderId) to avoid routing issues.
- url: https://react-hook-form.com/get-started#SchemaValidation
  why: Change order form uses react-hook-form with zodResolver.
  critical: Ensure form default values align with zod schema and type inference.
- url: https://zod.dev/?id=basic-usage
  why: Validation schemas for change orders are zod-based.
  critical: Align server-side schema with UI form data and payloads.

- file: frontend/src/app/(main)/[projectId]/change-orders/page.tsx
  why: Current Change Orders list page uses GenericDataTable.
  pattern: Table configuration (columns/filters) + Supabase data loading.
  gotcha: Uses change_orders table and field names (co_number) that diverge from contract_change_orders.
- file: frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx
  why: Current Change Order creation UI.
  pattern: react-hook-form + zodResolver + UI components.
  gotcha: Posts to contract_change_orders API; ensure list/detail use same table.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts
  why: Contract change orders API for list/create.
  pattern: Supabase auth, permission checks, zod validation.
  gotcha: Requires projectId + contractId; UI must carry both to use this route.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/route.ts
  why: Single change order CRUD route.
  pattern: GET/PUT/DELETE handling and status validation.
  gotcha: Requires contractId; detail page must know contractId or use alternate endpoint.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/route.ts
  why: Approve change order endpoint.
  pattern: Status update + contract value update.
  gotcha: Must supply correct changeOrderId + contractId and handle reviewer permissions.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject/route.ts
  why: Reject change order endpoint with rejection_reason.
  pattern: Updates status + rejection metadata.
  gotcha: Requires rejection_reason and reviewer permission validation.
- file: frontend/src/hooks/use-change-orders.ts
  why: Existing change order data hook pattern.
  pattern: supabase client query + create helper.
  gotcha: Still uses change_orders table and legacy fields (co_number).
- file: frontend/src/types/contract-change-orders.ts
  why: Prime contract change order types.
  pattern: TypeScript interface patterns for API responses.
  gotcha: Ensure UI uses this type instead of legacy ChangeOrder type.
- file: frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx
  why: Detail page layout + actions pattern.
  pattern: Tabs, cards, action buttons, data fetch patterns.
  gotcha: Uses client component and local state for fetch/error handling.
- file: frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx
  why: Change event → change order conversion UI.
  pattern: Dialog + fetch POST + route to change order detail.
  gotcha: Target contract options are hardcoded and route expects /change-orders/[id] which doesn’t exist yet.
- file: frontend/drizzle/schema.ts
  why: Source of truth for contract_change_orders table and constraints.
  pattern: Status checks + approval/rejection validation.
  gotcha: valid_approval_date check enforces approved_by/approved_date/rejection_reason rules.
- file: frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts
  why: API-level tests for change orders.
  pattern: Playwright APIRequestContext + supabase setup.
  gotcha: Use as baseline when updating API usage or contracts.
- file: frontend/tests/e2e/prime-contracts/change-orders-schema.spec.ts
  why: Schema-driven tests for status rules and constraints.
  pattern: direct supabase interactions for validation.
  gotcha: Must keep UI/API consistent with schema rules.

- docfile: PRPs/ai_docs/procore-change-orders.md
  why: Consolidated summary of Procore change order workflows and fields.
  section: All sections
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
.
├── backend
├── frontend
│   ├── src
│   │   ├── app
│   │   │   ├── (main)
│   │   │   │   ├── [projectId]
│   │   │   │   │   ├── change-orders
│   │   │   │   │   ├── prime-contracts
│   │   │   │   │   └── commitments
│   │   │   ├── api
│   │   │   │   ├── change-orders
│   │   │   │   └── projects
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   └── types
│   └── tests
└── scripts
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
PRPs/
└── change-orders.md                           # This PRP
frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  # Change order detail page (summary + reviewer response + actions)
frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx
  # Edit form for change order (optional if edit in detail)
frontend/src/components/change-orders/ChangeOrderDetail.tsx
  # Reusable detail UI (summary, status, history)
frontend/src/components/change-orders/ChangeOrderReviewerResponse.tsx
  # Reviewer response + approve/reject controls
frontend/src/components/change-orders/ChangeOrderSummaryCards.tsx
  # Metrics header for CO amount/status
frontend/src/hooks/use-contract-change-orders.ts
  # Hook tailored to contract_change_orders (avoid legacy change_orders)
frontend/tests/e2e/change-orders/change-order-ui.spec.ts
  # UI flow tests (list → detail → approve/reject)
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Next.js App Router dynamic routes require consistent param names.
// Use [projectId] and [changeOrderId] everywhere for change orders.
// CRITICAL: contract_change_orders table has a check constraint:
//   approved_by + approved_date required for approved/rejected statuses.
//   rejected also requires rejection_reason.
// Avoid mixing change_orders (legacy) with contract_change_orders (prime contracts).
// 'use client' is required for forms and interactive components (react-hook-form, useState).
// Avoid console.log, @ts-ignore, and any (explicitly banned).
```

## Implementation Blueprint

### Data models and structure

```typescript
// Prefer existing types in frontend/src/types/contract-change-orders.ts
// Add any missing types to align with schema constraints.

export type ChangeOrderStatus = "pending" | "approved" | "rejected";

export interface ContractChangeOrder {
  id: string;
  contract_id: string;
  change_order_number: string;
  description: string;
  amount: number;
  status: ChangeOrderStatus;
  requested_by: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
```

### Implementation Tasks (ordered by dependencies)

Task 1: ALIGN DATA ACCESS TO contract_change_orders
  - UPDATE: frontend/src/hooks/use-change-orders.ts OR create new hook in frontend/src/hooks/use-contract-change-orders.ts
  - IMPLEMENT: supabase queries against contract_change_orders table
  - FOLLOW pattern: frontend/src/hooks/use-change-orders.ts
  - NAMING: PascalCase interfaces, camelCase fields
  - GOTCHA: Avoid legacy change_orders table / co_number field

Task 2: UPDATE CHANGE ORDERS LIST PAGE
  - UPDATE: frontend/src/app/(main)/[projectId]/change-orders/page.tsx
  - IMPLEMENT: fetch contract_change_orders (requires joining contracts to project)
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx
  - ADD: rowClickPath to /{projectId}/change-orders/{id}
  - DEPENDENCIES: Task 1 hook/type alignment

Task 3: CREATE CHANGE ORDER DETAIL PAGE
  - CREATE: frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  - IMPLEMENT: fetch change order + related contract + reviewer state
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx
  - GOTCHA: Existing API routes require contractId; detail page must resolve contractId
    (e.g., fetch by changeOrderId using a new route or join via contract_change_orders)
  - DEPENDENCIES: Task 1 types + data access

Task 4: IMPLEMENT APPROVE/REJECT UI
  - CREATE: ChangeOrderReviewerResponse component
  - IMPLEMENT: call approve/reject API routes, require reviewer comments on reject
  - FOLLOW pattern: frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx
  - GOTCHA: contract_change_orders schema enforces approved_by/approved_date/rejection_reason

Task 5: UPDATE CHANGE ORDER CREATION FLOW
  - UPDATE: frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx
  - IMPLEMENT: include additional Procore fields as needed (reviewer, due date, schedule impact)
  - FOLLOW pattern: existing form + validation schema in API route
  - DEPENDENCIES: Task 1 types + Task 4 UI conventions

Task 6: UPDATE CHANGE EVENT CONVERSION ROUTE + UI
  - UPDATE: ChangeEventConvertDialog to pull real contracts and route to detail page
  - IMPLEMENT: API route to convert change event to contract_change_orders if missing
  - FOLLOW pattern: other project change-events API routes
  - GOTCHA: Avoid hardcoded options and ensure change order detail route exists

Task 7: TESTS
  - ADD: Playwright UI tests for list → detail → approve/reject
  - UPDATE: API tests if contractId resolution changes
  - FOLLOW pattern: frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts

### Implementation Patterns & Key Details

```typescript
// Detail page data fetch: resolve contractId
// Option A: add a /api/projects/[projectId]/change-orders/[changeOrderId] route
// that joins contract_change_orders + prime_contracts to ensure project scoping.
// Option B: fetch contractId via contract_change_orders in the page, then call
// existing /contracts/[contractId]/change-orders/[changeOrderId].

// Reviewer response pattern
interface ChangeOrderReviewerResponseProps {
  changeOrderId: string;
  contractId: string;
  projectId: string;
  status: ChangeOrderStatus;
}

export function ChangeOrderReviewerResponse({ changeOrderId, contractId, projectId }: ChangeOrderReviewerResponseProps) {
  // use client: uses state + fetch
  // must send rejection_reason on reject; approved_by/approved_date handled server-side
}
```

### Integration Points

DATABASE:
  - table: contract_change_orders (frontend/drizzle/schema.ts)
  - constraint: valid_approval_date check for approved/rejected status
  - policy: Users can view change orders in their projects; editors can create/update

ROUTES:
  - ui: app/(main)/[projectId]/change-orders/page.tsx
  - ui: app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  - api: app/api/projects/[projectId]/contracts/[contractId]/change-orders/*

CONFIG:
  - no new env vars expected

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
npm run quality --prefix frontend
```

### Level 2: Unit Tests (Component Validation)

```bash
cd frontend
npx playwright test tests/e2e/prime-contracts/api-change-orders.spec.ts
```

### Level 3: Integration Testing (System Validation)

```bash
cd frontend
npx playwright test tests/e2e/change-orders/change-order-ui.spec.ts
```

### Level 4: Creative & Domain-Specific Validation

```bash
cd frontend
npx playwright test --reporter=html
```

## Final Validation Checklist

### Technical Validation

* [ ] npm run quality --prefix frontend
* [ ] Playwright API tests pass
* [ ] Playwright UI tests pass

### Feature Validation

* [ ] List, create, detail, approve/reject flows work end-to-end
* [ ] Designated reviewer flow matches Procore
* [ ] Change event conversion leads to detail page

### Code Quality Validation

* [ ] No banned patterns (any, @ts-ignore, console.log)
* [ ] Server/client component boundaries correct

### TypeScript/Next.js Specific

* [ ] Dynamic route params match naming conventions
* [ ] Route handlers use named exports only

---

## Anti-Patterns to Avoid

* ❌ Mixing change_orders (legacy) and contract_change_orders in the same flow
* ❌ Creating new routing params that conflict with existing conventions
* ❌ Ignoring schema constraints (valid_approval_date)
* ❌ Hardcoding change order options or reviewer lists

---

## Confidence Score

**Confidence Score**: 8/10

## Notes on RAG Usage

* Attempted RAG query via `./query-rag-raw.sh "Change orders status workflow in Procore"`.
* Request failed (local API not running). If possible, re-run after starting the app server.
