# Change Orders Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: 2026-02-01

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 42 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 42 |

---

## Tasks

### Phase 1: Data Layer

- [ ] **1.1** Run database migration: Add `contract_id` (UUID FK to prime_contracts), `change_event_id` (UUID FK to change_events), `amount` (NUMERIC), `is_private` (BOOLEAN), `due_date` (DATE), `designated_reviewer_id` (UUID), `rejection_reason` (TEXT) columns to `change_orders` table
- [ ] **1.2** Add indexes on new FK columns (contract_id, change_event_id, designated_reviewer_id)
- [ ] **1.3** Regenerate Supabase types: `npm run db:types`
- [ ] **1.4** Verify generated types include new columns in `database.types.ts`
- [ ] **1.5** Create/update TypeScript interfaces for ChangeOrder, ChangeOrderLineItem, ChangeOrderApproval
- [ ] **1.6** Create Zod schemas: createChangeOrderSchema, updateChangeOrderSchema, approveChangeOrderSchema, rejectChangeOrderSchema

### Phase 2: API Layer

- [ ] **2.1** CREATE `api/projects/[projectId]/change-orders/route.ts` - GET (list with pagination, filters) + POST (create with line items)
- [ ] **2.2** CREATE `api/projects/[projectId]/change-orders/[changeOrderId]/route.ts` - GET (single with lines + approvals) + PUT + DELETE
- [ ] **2.3** CREATE `api/projects/[projectId]/change-orders/[changeOrderId]/approve/route.ts` - POST (approve + update contract value)
- [ ] **2.4** CREATE `api/projects/[projectId]/change-orders/[changeOrderId]/reject/route.ts` - POST (reject with reason)
- [ ] **2.5** CREATE `api/projects/[projectId]/change-orders/[changeOrderId]/lines/route.ts` - GET + POST for line items
- [ ] **2.6** CREATE `api/projects/[projectId]/change-orders/[changeOrderId]/lines/[lineId]/route.ts` - PUT + DELETE for single line
- [ ] **2.7** CREATE `api/projects/[projectId]/change-orders/summary/route.ts` - GET financial summary
- [ ] **2.8** CREATE `api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order/route.ts` - POST conversion
- [ ] **2.9** Verify all new routes use `apiErrorResponse` for error handling
- [ ] **2.10** Verify all routes use `[projectId]`, `[changeOrderId]`, `[lineId]` naming (no generic `[id]`)
- [ ] **2.11** Run route conflict check: `npm run check:routes`

### Phase 3: UI Layer

- [ ] **3.1** CREATE `components/change-orders/ChangeOrderStatusBadge.tsx` - All 11 Procore statuses with colors
- [ ] **3.2** CREATE `components/change-orders/ChangeOrderSummaryCards.tsx` - Financial summary cards (Total, Pending, Approved, Rejected amounts)
- [ ] **3.3** CREATE `components/change-orders/ChangeOrderLineItemsTable.tsx` - Editable SOV table with budget code selector
- [ ] **3.4** CREATE `components/change-orders/ChangeOrderApprovalPanel.tsx` - Approve/reject UI with comments and history
- [ ] **3.5** CREATE `components/change-orders/ChangeOrderForm.tsx` - Multi-step form (General Info → SOV Lines → Review)
- [ ] **3.6** CREATE `components/change-orders/ChangeOrderDetail.tsx` - Tabbed detail view (General, SOV, Approvals, Related)
- [ ] **3.7** MODIFY `app/(main)/[projectId]/change-orders/page.tsx` - Add summary cards, status tab filters
- [ ] **3.8** MODIFY `app/(main)/[projectId]/change-orders/change-orders-client.tsx` - Enhanced table with ChangeOrderStatusBadge, status filters
- [ ] **3.9** MODIFY `app/(main)/[projectId]/change-orders/new/page.tsx` - Replace with ChangeOrderForm component
- [ ] **3.10** MODIFY `app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx` - Full detail with ChangeOrderDetail component

### Phase 4: Integration

- [ ] **4.1** MODIFY `hooks/use-change-orders.ts` - Add line item CRUD, approve/reject, convert actions
- [ ] **4.2** Wire ChangeEventConvertDialog to new conversion API endpoint
- [ ] **4.3** Verify budget integration: approved COs appear in budget "Approved COs" column
- [ ] **4.4** Verify contract integration: approval updates prime_contracts.revised_contract_value
- [ ] **4.5** Verify pending COs appear in budget "Pending Changes" column
- [ ] **4.6** Test change event conversion: CE → CO with pre-populated data

### Phase 5: Testing & Validation

- [ ] **5.1** CREATE `tests/e2e/change-orders-comprehensive.spec.ts` - Full E2E test suite
- [ ] **5.2** Test: Create change order with SOV line items
- [ ] **5.3** Test: Edit change order (update fields, add/remove lines)
- [ ] **5.4** Test: Approve change order (verify contract value update)
- [ ] **5.5** Test: Reject change order with reason
- [ ] **5.6** Test: Delete draft change order
- [ ] **5.7** Test: Status filtering on list page
- [ ] **5.8** Test: Change event conversion
- [ ] **5.9** Run type check: `npx tsc --noEmit`
- [ ] **5.10** Run linting: `npm run lint`
- [ ] **5.11** Clear cache and verify: `rm -rf .next && npm run dev`
- [ ] **5.12** Production build: `npm run build`

---

## Session Log

<!--
AI agents: Append your progress updates here in reverse chronological order.
Format: ### YYYY-MM-DD HH:MM
        - Completed: {task description}
        - Next: {what you're working on next}
        - Notes: {any blockers or observations}
-->

### 2026-02-01
- Started: PRP creation and research
- PRP: `docs-ai/contents/docs/PRPs/change-orders/prp-change-orders.md`
- Next: Begin Phase 1 tasks (database migration)
- Notes: Two parallel CO tables exist (change_orders INTEGER PK vs contract_change_orders UUID PK). Decision: enhance change_orders table, do not create third table.

---

## Quick Reference

**PRP Document**: `docs-ai/contents/docs/PRPs/change-orders/prp-change-orders.md`
**Existing Specs**: `PRPs/finance-tools/change-orders/`
**Procore Screenshots**: `scripts/screenshot-capture/outputs/procore-support-docs/pages/`

### Key Commands

```bash
# Validate types
cd frontend && npx tsc --noEmit

# Run linting
cd frontend && npm run lint

# Regenerate DB types
npm run db:types

# Run E2E tests
cd frontend && npx playwright test tests/e2e/change-orders-comprehensive.spec.ts --headed

# Build production
cd frontend && npm run build

# Clear Next.js cache (REQUIRED after new routes)
cd frontend && rm -rf .next && npm run dev

# Check route conflicts
npm run check:routes
```

### Critical Reminders

- `projects.id` is **INTEGER** -- all `project_id` FKs must be INTEGER
- `prime_contracts.id` is **UUID** -- `contract_id` FK must be UUID
- Route params: `[projectId]`, `[changeOrderId]`, `[lineId]` -- NEVER `[id]`
- Use `PcoStatusEnum` from `prime-contract-change-order-schema.ts` for all status values
- After migration, ALWAYS run `npm run db:types` and verify types

---

## How to Update This File

When completing a task:
1. Change `- [ ]` to `- [x]`
2. Update the Progress Summary counts
3. Add an entry to Session Log
4. Update the Status badge if changing phases

**Status Badges**:
- ⚪ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked
