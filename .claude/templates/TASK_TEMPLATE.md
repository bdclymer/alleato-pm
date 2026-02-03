# TASKS: [PROJECT NAME]

**Project ID:** INI-YYYY-MM-DD-###
**Status:** Not Started | In Progress | Blocked | Complete
**Last Verified:** Never
**Owner Agent:** [agent-type]

---

## Project Summary

[Brief 2-3 sentence description of what this project aims to achieve]

---

## Quick Status

| Metric | Value |
|--------|-------|
| Total Tasks | 0 |
| Completed | 0 |
| In Progress | 0 |
| Blocked | 0 |
| Gates Passed | 0/7 |

---

## Key Files & Resources

### Core Implementation

- `frontend/src/app/[projectId]/[resource]/page.tsx` - List view
- `frontend/src/app/api/[resource]/route.ts` - API endpoints
- `frontend/src/components/[resource]/` - Components

### Database

- `supabase/migrations/YYYYMMDDHHMMSS_create_[table].sql` - Migration
- `frontend/src/types/database.types.ts` - Generated types

### Tests

- `frontend/tests/e2e/[resource].spec.ts` - E2E tests

### Reference

- `documentation/[project]/` - Specifications
- `crawl/screenshots/` - Procore reference screenshots

---

## Deliverables

### Pages

- [ ] [Resource] List (Table view)
- [ ] [Resource] Detail view
- [ ] Create [Resource] form
- [ ] Edit [Resource] form

### Database Tables

- `[resource]`
- `[resource]_line_items` (if applicable)
- `[resource]_attachments` (if applicable)

---

## Phase 1: Database & Schema

### 1.1 Migration

- [ ] Create migration file
- [ ] Define table structure with all columns
- [ ] Add foreign key relationships
- [ ] Apply migration

### 1.2 RLS Policies

- [ ] Read policy (project members)
- [ ] Insert policy (authorized users)
- [ ] Update policy (owner/admin)
- [ ] Delete policy (admin only)

### 1.3 TypeScript Types

- [ ] Generate types from Supabase
- [ ] Verify new tables included

**GATE: Database**

```bash
npx supabase db push && npm run typecheck --prefix frontend
```sql
- [ ] PASSED  |  [ ] FAILED  |  [ ] NOT RUN
- Last Run:
- Evidence:

---

## Phase 2: API Endpoints

### 2.1 List Endpoint (GET)

- [ ] Create route handler
- [ ] Implement pagination
- [ ] Add filtering support
- [ ] Add sorting support

### 2.2 Detail Endpoint (GET /[id])

- [ ] Create route handler
- [ ] Handle not found (404)

### 2.3 Create Endpoint (POST)

- [ ] Implement handler
- [ ] Add validation (Zod schema)
- [ ] Handle errors gracefully

### 2.4 Update Endpoint (PUT /[id])

- [ ] Implement handler
- [ ] Add validation
- [ ] Verify ownership/permissions

### 2.5 Delete Endpoint (DELETE /[id])

- [ ] Implement handler
- [ ] Soft delete if required
- [ ] Handle cascade rules

**GATE: API**

```bash
curl http://localhost:3000/api/[resource]
```markdown
- [ ] PASSED  |  [ ] FAILED  |  [ ] NOT RUN
- Last Run:
- Evidence:

---

## Phase 3: Frontend - List View

### 3.1 Page Setup

- [ ] Create page component
- [ ] Add to navigation/sidebar
- [ ] Implement breadcrumbs
- [ ] Add page title

### 3.2 Data Table

- [ ] Fetch data with loading state
- [ ] Display columns
- [ ] Add sorting
- [ ] Add filtering
- [ ] Add pagination

### 3.3 Actions

- [ ] "Create New" button
- [ ] Row actions (view, edit, delete)
- [ ] Bulk actions (if needed)

**GATE: List View**

```bash
npm run dev --prefix frontend
# Navigate to /[projectId]/[resource]
```markdown
- [ ] PASSED  |  [ ] FAILED  |  [ ] NOT RUN
- Last Run:
- Evidence:

---

## Phase 4: Frontend - Forms

### 4.1 Create Form

- [ ] Form component with all fields
- [ ] Validation (required, formats)
- [ ] Submit to POST endpoint
- [ ] Success/error handling
- [ ] Redirect after success

### 4.2 Edit Form

- [ ] Pre-populate existing data
- [ ] Submit to PUT endpoint
- [ ] Handle optimistic updates

### 4.3 Delete Confirmation

- [ ] Confirmation dialog
- [ ] Submit to DELETE endpoint
- [ ] Handle success/error

**GATE: Forms**

```bash
# Create, edit, delete cycle works in browser
```

- [ ] PASSED  |  [ ] FAILED  |  [ ] NOT RUN
- Last Run:
- Evidence:

---

## Phase 5: Integration

### 5.1 Related Modules

- [ ] Link to related records
- [ ] Back-links from related modules
- [ ] Budget integration (if applicable)

### 5.2 Audit Trail

- [ ] Log create actions
- [ ] Log update actions
- [ ] Log delete actions

---

## Phase 6: Testing & Verification

### 6.1 E2E Test Suite

- [ ] Create test file
- [ ] Test: List view loads
- [ ] Test: Create new record
- [ ] Test: Edit existing record
- [ ] Test: Delete record
- [ ] Test: Validation errors

### 6.2 Visual Verification

- [ ] Compare to Procore screenshots
- [ ] Verify responsive design
- [ ] No console errors

**GATE: E2E Tests**

```bash
npx playwright test frontend/tests/e2e/[resource].spec.ts
```

- [ ] PASSED  |  [ ] FAILED  |  [ ] NOT RUN
- Last Run:
- Evidence:

---

## Verification Summary

| Gate | Command | Status | Last Run |
|------|---------|--------|----------|
| TypeScript | `npm run typecheck` | | |
| ESLint | `npm run lint` | | |
| Migration | `npx supabase db push` | | |
| API Tests | `curl` / Postman | | |
| E2E Tests | `npx playwright test` | | |
| Visual Match | Manual | | |
| Build | `npm run build` | | |

---

## Blockers

| Issue | Impact | Waiting On | Created |
|-------|--------|------------|---------|
| | | | |

---

## Questions for User

- [ ] Q1:
- [ ] Q2:

---

## Session Log

| Date | Agent | Tasks Done | Tests Run | Notes |
|------|-------|------------|-----------|-------|
| | | | | |

---

## Handoff Notes

### Current State

-

### Next Steps

1.
2.
3.

### Known Issues

-

---

*Last Updated: [Date] by [Agent]*
