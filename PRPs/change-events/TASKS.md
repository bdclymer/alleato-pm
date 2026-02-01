# Change Events - Fix & Complete Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: 2026-02-01

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 24 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 24 |

---

## Tasks

### Phase 1: API Layer Fixes (Critical - Unblocks Everything)

- [ ] **Task 1a:** Fix `[changeEventId]/route.ts` - Remove `parseInt` on UUID, use `await params`
- [ ] **Task 1b:** Fix `[changeEventId]/line-items/route.ts` - Remove `parseInt` on UUID changeEventId
- [ ] **Task 1c:** Fix `[changeEventId]/line-items/[lineItemId]/route.ts` - Remove `parseInt` on UUID
- [ ] **Task 1d:** Fix `[changeEventId]/attachments/route.ts` - Remove `parseInt` + fix payload key (`files` not `file`)
- [ ] **Task 1e:** Fix `[changeEventId]/attachments/[attachmentId]/route.ts` - Remove `parseInt`
- [ ] **Task 1f:** Fix `[changeEventId]/attachments/[attachmentId]/download/route.ts` - Remove `parseInt`
- [ ] **Task 1g:** Fix `[changeEventId]/history/route.ts` - Remove `parseInt` on UUID
- [ ] **Task 1h:** Verify: `curl GET /api/projects/31/change-events/{uuid}` returns real data

### Phase 2: Frontend Page Fixes

- [ ] **Task 2a:** Fix `change-events/[id]/page.tsx` - Stop `parseInt` on UUID param, use string
- [ ] **Task 2b:** Fix `change-events/[id]/edit/page.tsx` - Stop `parseInt` on UUID param
- [ ] **Task 2c:** Fix `change-events/new/page.tsx` - Switch from direct Supabase insert to API POST
- [ ] **Task 2d:** Fix `ChangeEventForm.tsx` - Submit via `fetch('/api/...')` not `supabase.from().insert()`
- [ ] **Task 2e:** Verify: Navigate from list → detail page loads real data

### Phase 3: Component Fixes

- [ ] **Task 3a:** Fix `ChangeEventRevenueSection.tsx` - Map slug values to API enum values
- [ ] **Task 3b:** Fix `ChangeEventAttachmentsSection.tsx` - Align FormData field name with API
- [ ] **Task 3c:** Fix `ChangeEventApprovalWorkflow.tsx` - Replace hardcoded IDs, point to real API
- [ ] **Task 3d:** Wire `ChangeEventRfqForm.tsx` - Connect to POST /rfqs endpoint
- [ ] **Task 3e:** Wire `ChangeEventRfqResponseForm.tsx` - Connect to POST /rfqs/{id}/responses

### Phase 4: New Endpoints & Hook Fixes

- [ ] **Task 4a:** CREATE `approvals/route.ts` - GET/POST/PATCH for approval workflow
- [ ] **Task 4b:** Fix `use-change-events.ts` - Ensure UUID consistency in all API calls
- [ ] **Task 4c:** Fix `use-change-event-rfqs.ts` - Ensure UUID consistency
- [ ] **Task 4d:** Update `validation.ts` - Add approval schema, verify all enum values match DB

### Phase 5: Testing & Validation

- [ ] Run type check: `npx tsc --noEmit`
- [ ] Run linting: `npm run lint`
- [ ] Run E2E tests: `npx playwright test tests/e2e/change-events-comprehensive.spec.ts`
- [ ] Production build: `npm run build`

---

## Session Log

### 2026-02-01
- Started: PRP creation and implementation planning
- PRP: `PRPs/change-events/prp-change-events.md`
- Next: Begin Phase 1 - Fix API routes (parseInt removal)
- Notes: 5 blocking bugs identified. Phase 1 unblocks all other phases.

---

## Quick Reference

**PRP Document**: `PRPs/change-events/prp-change-events.md`
**Existing Docs**: `PRPs/finance-tools/change-events/`
**Database Types**: `frontend/src/types/database.types.ts`

### The 5 Blocking Bugs

| # | Bug | Root Cause | Files Affected |
|---|-----|-----------|----------------|
| 1 | Detail/edit pages show no data | `parseInt(uuid)` → NaN | `[id]/page.tsx`, `[id]/edit/page.tsx` |
| 2 | Line items/attachments/history empty | `parseInt(changeEventId)` → NaN | All `[changeEventId]/*` API routes |
| 3 | Create form bypasses API | Direct Supabase insert | `ChangeEventForm.tsx`, `new/page.tsx` |
| 4 | Revenue source values rejected | Slug vs enum mismatch | `ChangeEventRevenueSection.tsx` |
| 5 | Attachments always fail | Wrong FormData field name | `ChangeEventAttachmentsSection.tsx`, attachments API |

### Key Commands

```bash
# Validate types
cd frontend && npx tsc --noEmit

# Run linting
npm run lint

# Run E2E tests
npx playwright test tests/e2e/change-events-comprehensive.spec.ts --headed

# Build production
npm run build

# Start dev server
npm run dev

# Test API endpoint
curl -s http://localhost:3000/api/projects/31/change-events | jq '.data | length'
```

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
