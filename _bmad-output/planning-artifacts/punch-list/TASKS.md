# Punch List — Implementation Tasks

_Last updated: 2026-04-17_

---

## Phase 1: Data Model & Backend

- [x] **Database migration** — `supabase/migrations/20260413000000_create_punch_items.sql`
- [x] **Seed test data** — `supabase/migrations/20260408000008_seed_punch-list_test_scenarios.sql`
- [x] **PunchItemService** — `frontend/src/services/PunchItemService.ts`
- [x] **React Query hooks** — `frontend/src/hooks/use-punch-items.ts` (usePunchItems, useCreatePunchItem, useUpdatePunchItem, useDeletePunchItem, useRestorePunchItem)
- [ ] **API route handlers** — `frontend/src/app/api/projects/[projectId]/punch-items/` (list, create, update, delete, restore, bulk)
- [ ] **Status transition endpoint** — `PATCH /api/.../punch-items/[id]/status`
- [ ] **Change history / audit log table + API**
- [ ] **Comments table + API**
- [ ] **Attachments table + API**
- [ ] **AssigneeTracker table** (date_notified, date_ready_for_review, date_resolved, response_status)
- [ ] **Stats / analytics endpoint** (by status, by company, overdue count, avg response time)
- [ ] **Recycle bin restore endpoint**
- [ ] **Soft delete with 30-day retention enforcement**

---

## Phase 2: List View Page

- [x] **List page shell** — `frontend/src/app/(main)/[projectId]/punch-list/page.tsx`
- [x] **PunchListClient component** — `punch-list-client.tsx` (UnifiedTablePage wrapper)
- [x] **Column definitions** — #, Title, Status, Priority, Assignee, Location, Trade, Due Date
- [x] **StatusBadge + PriorityBadge components** — `punch-item-status-badge.tsx`
- [x] **Tabs: All Items / My Items / Recycle Bin** (URL-driven via `?tab=`)
- [x] **Search** — debounced client-side across title, number, assignee, location, trade
- [x] **Filter: Status + Priority** — multi-select dropdowns persisted in URL
- [x] **Column visibility toggle** — per-user column chooser wired to UnifiedTablePage
- [x] **Sort** — click-to-sort on all columns, asc/desc, URL-persisted
- [x] **Card view + List view** — toggle wired to UnifiedTablePage
- [x] **Row actions** — View/Edit (router.push to detail), Quick Edit (dialog), Delete
- [x] **Recycle Bin restore action** per row
- [x] **CSV export** — filtered items exported with all visible fields
- [x] **Create Punch Item button** → opens PunchItemFormDialog
- [x] **Empty states** — per-tab messages
- [ ] **Bulk actions** — checkboxes + bulk delete / close / reopen / assign
- [ ] **PDF export** (basic + with descriptions + with photos)
- [ ] **Pagination controls** — page numbers, next/prev, page size selector, total count
- [ ] **Advanced filters** — Assignee, Ball In Court, Closed By, Creator, Date ranges, Final Approver, Location, Trade, Type, Punch Item Manager
- [ ] **Missing columns** — Ball In Court, Assignee Name, Assignee Company, Assignee Response, Date Notified, Date Resolved, Creator, Date Created, Punch Item Manager, Final Approver, Closed By, Date Closed, Type, Trade, Location, Reference, Description
- [ ] **Customizable column order** (drag & drop)
- [ ] **Per-user column preference persistence** (server-side or localStorage)
- [ ] **"My Items" tab** — server-side filter by current user's assignments

---

## Phase 3: Create / Edit Form

- [x] **PunchItemFormDialog** — `frontend/src/components/domain/punch-items/punch-item-form-dialog.tsx`
- [x] **Mode: create / edit** with defaultValues support
- [x] **Core fields wired**: Title, Status, Priority, Location, Trade, Due Date, Description, Reference, Assignee Company
- [ ] **Punch Item Manager** field (required, user picker)
- [ ] **Final Approver** field (required, user picker)
- [ ] **Assignees** multi-select with company affiliation display
- [ ] **Type** dropdown (configurable item types)
- [ ] **Distribution List** dropdown
- [ ] **Schedule Impact** dropdown
- [ ] **Cost Impact** dropdown
- [ ] **Cost Codes** searchable dropdown
- [ ] **Private** checkbox
- [ ] **Attachments** file upload with drag & drop
- [ ] **Linked Drawings** reference field
- [ ] **Auto-generated sequential number** on create (server-side)
- [ ] **"Save & Create New"** button (create form)
- [ ] **Email notification trigger** on save (sets Date Notified + Email Sent)

---

## Phase 4: Detail View

- [x] **Detail page** — `frontend/src/app/(main)/[projectId]/punch-list/[punchItemId]/page.tsx`
- [x] **PunchItemDetail component** — `punch-item-detail.tsx`
- [x] **Field display** — renders all available DB columns
- [x] **Edit dialog launch** from detail view
- [x] **Back navigation** to list
- [ ] **Tabs: General / Related Items / Emails / Change History**
- [ ] **Activity feed** (right panel) — comments, attachments, status timeline
- [ ] **Add Comment** with expandable textarea + attachment button
- [ ] **Change History tab** — sortable table (Date, Action By, Changed, From, To)
- [ ] **Assignee Tracker table** in General tab (Date Notified, Date Ready for Review, Date Work Not Accepted, Date Resolved, Response, Comments)
- [ ] **Status action buttons** (Work Required / Initiated / Closed / Reopen) with role-permission guard
- [ ] **"Closed" status auto-populates** Date Closed + Closed By
- [ ] **Reopen clears** Date Closed + Closed By
- [ ] **Ball In Court** computed field display
- [ ] **Per-item PDF export** button
- [ ] **Copy link** icon button
- [ ] **Related Items tab** (count badge, link to other punch items)
- [ ] **Emails tab** (count badge, email delivery history)
- [ ] **Breadcrumb** — Punch List > #N > Title

---

## Phase 5: Dashboard / Analytics

- [ ] **Dashboard widget page or section** embedded in punch list
- [ ] **Status donut chart** — Work Required / Initiated / Closed percentages
- [ ] **Company bar chart** — items by Assignee Company (Overdue/Open/Closed counts)
- [ ] **KPI: Average Response Time** (days to response, link to overdue list)
- [ ] **KPI: Total Overdue Items** count card

---

## Phase 6: Workflows & Automation

- [ ] **Email notification** on create/assign (Date Notified auto-populated, Email Sent → true)
- [ ] **Email notification** on status change
- [ ] **Email notification** on due date change
- [ ] **In-app notifications** for assignments and status updates
- [ ] **Ball-in-court auto-calculation** (derives current responsible party from status + roles)
- [ ] **Overdue calculation** (due_date < today AND status != closed)

---

## Phase 7: Permissions & Security

- [ ] **RBAC enforcement** — Admin / Standard / Read Only / Custom roles
- [ ] **Field-level editability by role** (e.g., only Final Approver can close)
- [ ] **Private item visibility** (only creator + assignees)
- [ ] **30-day recycle bin retention** (cron or trigger to hard-delete)
- [ ] **Audit trail** — every field change logged to change_history

---

## Phase 8: Testing

- [ ] Create item with all field combinations
- [ ] Edit each field individually
- [ ] Status workflow: Draft → Work Required → Initiated → Closed
- [ ] Reopen closed items
- [ ] Bulk select + bulk operations
- [ ] Search with various keywords
- [ ] Apply each filter individually and combined
- [ ] CSV export
- [ ] PDF export (basic, with descriptions, with photos)
- [ ] Verify change history entries per action
- [ ] Comment + attachment functionality
- [ ] Email notification triggers
- [ ] Permission enforcement by role
- [ ] Recycle bin recovery
- [ ] Private item visibility
- [ ] Mobile responsiveness
- [ ] Rich text editor formatting
- [ ] File upload / drag-drop
- [ ] Pagination navigation
- [ ] Dashboard widget calculations
