# Schedule — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 20 | HIGH |
| Views & Navigation | 14 | HIGH |
| Fields & Data | 16 | HIGH |
| Statuses & Workflows | 8 | HIGH |
| Dependencies & Predecessors | 7 | MEDIUM |
| Permissions | 3 | MEDIUM |
| Integrations | 5 | MEDIUM |
| Reporting & Export | 5 | MEDIUM |
| Advanced Features | 15 | MEDIUM |
| **TOTAL** | **93** | |

---

## 1. Core Actions

> Source: Codebase — `page.tsx`, `task-edit-modal.tsx`, `route.ts` (POST/PUT/DELETE), `task-context-menu.tsx`

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a task with name only | 1. Navigate to `/767/schedule`<br>2. Click "Add Task"<br>3. Type name "Foundation Work"<br>4. Click Save | Task appears in list with status "Not Started", 0% complete, no dates | HIGH | 🔲 | |
| 1.1.2 | Create a task with all fields | Fill name, start date, finish date, duration, % complete, status, WBS code, constraint type, constraint date, parent task | All fields persisted; detail/edit shows correct pre-filled values | HIGH | 🔲 | |
| 1.1.3 | Create fails when name is blank | Leave Name empty, fill other fields, click Save | Validation error on Name field; form not submitted; toast not shown | HIGH | 🔲 | |
| 1.1.4 | Create fails when start date is after finish date | Set start_date = 2026-06-15, finish_date = 2026-06-01 | Error: "Start date cannot be after finish date"; task not created | HIGH | 🔲 | |
| 1.1.5 | Create a milestone | Check "Is Milestone", set date, click Save | Task created with diamond icon; duration shows 0 | MEDIUM | 🔲 | |
| 1.1.6 | Milestone rejects non-zero duration | Check "Is Milestone", set duration_days = 5, click Save | Error: "Milestones must have zero duration" | MEDIUM | 🔲 | |
| 1.1.7 | Quick-add task inline (Gantt view) | In Gantt view, type in the inline add-row input, press Enter | Task created immediately; row appears without opening modal | HIGH | 🔲 | |
| 1.1.8 | Quick-add task in Board view column | Click "+" in a Board column (e.g. Not Started), type task name, confirm | Task created with that status; appears in the correct column | MEDIUM | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit task name | Click a task row → modal opens → change name → Save | Updated name shows in list immediately; toast "Task updated successfully" | HIGH | 🔲 | |
| 1.2.2 | Edit task dates | Open edit modal → change start and finish dates → Save | New dates persist after page refresh | HIGH | 🔲 | |
| 1.2.3 | Edit % complete via slider | Open edit modal → drag % complete slider → Save | Slider value saved; progress bar on task reflects new value | HIGH | 🔲 | |
| 1.2.4 | Edit task from context menu | Right-click a task row → "Edit Task" | Edit modal opens pre-filled with existing task data | MEDIUM | 🔲 | |
| 1.2.5 | Cancel edit discards changes | Open edit modal → change name → click Cancel / close dialog | Original name unchanged; no API call made | HIGH | 🔲 | |
| 1.2.6 | Edit pre-fills all saved values | Create task with all fields filled, then click to edit | All fields (name, dates, duration, status, WBS, constraint) show previously saved values | HIGH | 🔲 | |
| 1.2.7 | Convert task to milestone via context menu | Right-click → "Convert to Milestone" | Task becomes milestone (is_milestone toggled); duration set to 0 | MEDIUM | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete single task via context menu | Right-click task → "Delete Task" → confirm | Task removed from list; toast "Task deleted successfully" | HIGH | 🔲 | |
| 1.3.2 | Delete single task via row action | Row action menu (⋮) → Delete → confirm | Task removed; list refreshes; count decrements | HIGH | 🔲 | |
| 1.3.3 | Cancel delete leaves task intact | Click Delete → dismiss confirm dialog | Task remains in list unchanged | HIGH | 🔲 | |
| 1.3.4 | Bulk delete selected tasks | Select 2+ tasks → Bulk Action Bar → Delete → confirm | All selected tasks removed; toast shows count; selection cleared | HIGH | 🔲 | |
| 1.3.5 | Deleting parent also removes children | Create parent with child tasks; delete parent; confirm | Parent and all children removed from list | HIGH | 🔲 | |

### 1.4 Copy, Cut & Paste

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Copy a task | Right-click → "Copy Task" | Toast "Task copied to clipboard"; copiedTask state set | MEDIUM | 🔲 | |
| 1.4.2 | Paste a copied task | Copy task → right-click elsewhere → "Paste Task" | New task created with name "{original} (Copy)"; status reset to not_started; percent_complete = 0 | MEDIUM | 🔲 | |
| 1.4.3 | Cut a task | Right-click → "Cut Task" | Toast "Task cut to clipboard" | LOW | 🔲 | |

---

## 2. Views & Navigation

> Source: `page.tsx` view mode tabs, `schedule-views.tsx`, `gantt-chart.tsx`

### 2.1 Page Load & Error States

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Page loads with tasks | Navigate to `/767/schedule` | Page renders with PageShell title "Schedule"; task list or Gantt visible; no errors | HIGH | 🔲 | |
| 2.1.2 | Empty state shown when no tasks | Navigate to a project with no schedule tasks | Empty state with Calendar icon, heading "No tasks scheduled", Add Task + Import Schedule buttons | HIGH | 🔲 | |
| 2.1.3 | Loading skeleton shown during fetch | Navigate to `/767/schedule` on slow network | Animated skeleton rows visible during loading; disappears when data arrives | MEDIUM | 🔲 | |
| 2.1.4 | Error state shown on fetch failure | Simulate API error (e.g. disconnect network) | Error panel with AlertCircle icon; "Unable to Load Schedule" heading; "Try Again" button | MEDIUM | 🔲 | |
| 2.1.5 | Auth error prompts refresh | Token expires; navigate to schedule | "Session Expired" message with "Refresh Page" button (not "Try Again") | MEDIUM | 🔲 | |

### 2.2 View Mode Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Default view is Gantt | Navigate to `/767/schedule` | "Gantt" tab is active by default; Gantt chart SVG rendered | HIGH | 🔲 | |
| 2.2.2 | Switch to Table view | Click "Table" tab | ScheduleGridView renders; tasks shown in tabular rows with columns | HIGH | 🔲 | |
| 2.2.3 | Switch to Board view | Click "Board" tab | ScheduleBoardView renders; columns for Not Started, In Progress, Complete | HIGH | 🔲 | |
| 2.2.4 | Switch to Timeline view | Click "Timeline" tab | ScheduleTimelineView renders; tasks shown on scrollable timeline | HIGH | 🔲 | |
| 2.2.5 | Switch to Calendar view | Click "Calendar" tab | ScheduleCalendarView renders; monthly calendar with tasks on dates | HIGH | 🔲 | |
| 2.2.6 | Active tab is visually highlighted | Click each tab in turn | Selected tab text uses schedule-view-active color; others use muted | MEDIUM | 🔲 | |
| 2.2.7 | Mobile falls back to Board view | Open page on viewport ≤767px wide | Gantt tab is not shown; Board view is automatically active on mobile | MEDIUM | 🔲 | |

### 2.3 Gantt Chart Navigation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Zoom level: day/week/month | Click zoom controls in Gantt header | Timeline column width changes; day labels visible at Day zoom, month bars at Month zoom | MEDIUM | 🔲 | |
| 2.3.2 | Toggle left panel (task list) | Click PanelLeftOpen/Close button in Gantt | Task name panel collapses / expands; chart fills available space | MEDIUM | 🔲 | |

---

## 3. Fields & Data

> Source: `task-edit-modal.tsx` form, `types/scheduling.ts` interfaces, `route.ts` validation

### 3.1 Task Name

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.1.1 | Name is required | Submit modal with empty name | Inline error shown on Name field; API not called | HIGH | 🔲 | |
| 3.1.2 | Name is trimmed | Enter "  Framing  " (leading/trailing spaces), save | Saved as "Framing" (trimmed); spaces not stored | MEDIUM | 🔲 | |
| 3.1.3 | Name accepts Unicode/special characters | Enter "Phase 2 — Façade & Glazing", save | Saved exactly as typed | MEDIUM | 🔲 | |

### 3.2 Dates & Duration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Start date field accepts ISO date | Enter 2026-05-01 | Date stored as "2026-05-01"; shown formatted in list | HIGH | 🔲 | |
| 3.2.2 | Finish date must be ≥ start date | Set start = 2026-06-10, finish = 2026-06-01 | API returns 400 "Start date cannot be after finish date" | HIGH | 🔲 | |
| 3.2.3 | Duration auto-calculated from dates | Set start 2026-05-01, finish 2026-05-11 | duration_days = 10; displayed in Duration column | MEDIUM | 🔲 | |
| 3.2.4 | Null dates are allowed | Leave start and finish blank, save task | Task saved with null dates; no validation error | HIGH | 🔲 | |

### 3.3 Status Field

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.3.1 | Status dropdown shows all options | Open task modal → Status select | Options: Not Started, In Progress, Complete | HIGH | 🔲 | |
| 3.3.2 | Status persists after save | Select "In Progress", save | List and Board view show task under "In Progress" | HIGH | 🔲 | |

### 3.4 Milestone Flag

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.4.1 | Is Milestone checkbox | Check the checkbox, save | Task displayed with milestone diamond (◆) in Gantt; filter by Type=Milestones shows it | MEDIUM | 🔲 | |

### 3.5 Constraint Fields

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.5.1 | Constraint Type dropdown | Open modal → select "Start No Earlier Than" | Constraint Date field becomes required/shown | MEDIUM | 🔲 | |
| 3.5.2 | No Constraint option | Select "No Constraint", save | constraint_type = null stored; no constraint date required | MEDIUM | 🔲 | |

### 3.6 WBS Code & Percent Complete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.6.1 | WBS Code stored and displayed | Enter "1.2.3" in WBS Code field, save | WBS Code column shows "1.2.3" when column is visible | LOW | 🔲 | |
| 3.6.2 | % Complete slider range 0–100 | Drag slider to 75, save | percent_complete = 75; progress bar on Gantt bar shows 75% fill | HIGH | 🔲 | |

---

## 4. Statuses & Workflows

> Source: `types/scheduling.ts` TaskStatus, `page.tsx` BulkActionBar, context menu

### 4.1 Individual Status Transitions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Default status on creation | Create task without setting status | Status = "Not Started"; Badge/dot in list shows correct color | HIGH | 🔲 | |
| 4.1.2 | Transition to In Progress | Edit task → Status = "In Progress" → Save | Task moves to In Progress column on Board view; progress auto-set to 50 on quick-add | HIGH | 🔲 | |
| 4.1.3 | Transition to Complete | Edit task → Status = "Complete" → Save | Task shows Complete badge; progress bar full | HIGH | 🔲 | |
| 4.1.4 | Transition back to Not Started | Edit a Complete task → Status = "Not Started" → Save | Status reverts correctly; no error | MEDIUM | 🔲 | |

### 4.2 Bulk Status Update

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Bulk update status to In Progress | Select 3 tasks → Bulk Action Bar → "Update Status" → In Progress | All 3 tasks updated; toast "Updated 3 tasks to 'in progress'"; selection cleared | HIGH | 🔲 | |
| 4.2.2 | Bulk update status to Complete | Select 2 tasks → Update Status → Complete | All selected show Complete; percent_complete set to 100 | HIGH | 🔲 | |
| 4.2.3 | Bulk update status to Not Started | Select tasks in progress → Update Status → Not Started | Status reverts; percent_complete set to 0 | MEDIUM | 🔲 | |

### 4.3 Board View Status Columns

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.3.1 | Drag task between Board columns | Switch to Board view → drag a "Not Started" task to "In Progress" column | Task's status updated to in_progress; API PUT called; task stays in new column | HIGH | 🔲 | |

---

## 5. Dependencies & Predecessors

> Source: `types/scheduling.ts` ScheduleDependency, DependencyType, `gantt-chart.tsx` dependency arrows

### 5.1 Dependency Types

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Finish-to-Start dependency shown in Gantt | Create two tasks A and B; set B depends on A (FS) | Arrow drawn from end of A to start of B in Gantt | HIGH | 🔲 | |
| 5.1.2 | Start-to-Start dependency | Set dependency type SS between two tasks | Arrow drawn from start of A to start of B | MEDIUM | 🔲 | |
| 5.1.3 | Finish-to-Finish dependency | Set dependency type FF between two tasks | Arrow drawn from end of A to end of B | MEDIUM | 🔲 | |
| 5.1.4 | Lag days on dependency | Set lag_days = 3 on a dependency | Successor start is 3 days after predecessor finish; lag shown in tooltip | MEDIUM | 🔲 | |

### 5.2 Hierarchy (Indent/Outdent)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Indent a task (make sub-task) | Right-click a task that has a sibling above it → "Indent Task" | Task becomes a child of the previous sibling; shown indented in list | MEDIUM | 🔲 | |
| 5.2.2 | Indent fails with no sibling | Right-click first task → "Indent Task" | Toast error "Cannot indent - no previous sibling to become parent" | MEDIUM | 🔲 | |
| 5.2.3 | Outdent a task (promote to parent level) | Right-click a child task → "Outdent Task" | Task promoted; parent_task_id set to grandparent or null | MEDIUM | 🔲 | |
| 5.2.4 | Outdent fails at root | Right-click root-level task → "Outdent Task" | Toast error "Cannot outdent - task is already at root level" | MEDIUM | 🔲 | |

### 5.3 Critical Path

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.3.1 | Critical path tasks flagged in Gantt | Tasks marked is_critical_path in data | Critical path tasks rendered with distinct bar style (e.g. different color) | MEDIUM | 🔲 | |

---

## 6. Permissions

> Source: `route.ts` RLS error handling, `page.tsx` error state rendering

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Authenticated user can view list | Logged-in user | Navigate to `/767/schedule` | Schedule loads; no 401 or 403 | HIGH | 🔲 | |
| 6.1.2 | Unauthenticated user gets error state | Logged-out / expired session | Navigate to `/767/schedule` | "Session Expired" error state shown with Refresh Page button | HIGH | 🔲 | |
| 6.1.3 | User without project membership cannot create | User not in project team | Click Add Task, fill form, save | API returns 403 "You don't have permission to create tasks in project 767"; toast "Permission Denied" displayed | HIGH | 🔲 | |

---

## 7. Integrations

> Source: `page.tsx` empty state cross-links, schedule-scenarios.md, Procore integration patterns

### 7.1 Cross-Tool Links

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Schedule links from sidebar | Click "Schedule" in project left sidebar | Navigates to `/[projectId]/schedule`; page loads without error | HIGH | 🔲 | |
| 7.1.2 | Task deadline indicator shown | Task has a deadline set (ScheduleDeadline) | Deadline marker shown in Gantt at correct date; overdue flag shown if past | MEDIUM | 🔲 | |
| 7.1.3 | Overdue tasks flagged | Task with finish_date in the past and status not Complete | is_overdue = true; task visually flagged in Gantt (e.g. alert icon) | MEDIUM | 🔲 | |
| 7.1.4 | Scroll to task from context menu | Right-click task → "Scroll to Task" | Page scrolls so the Gantt bar for that task is centered in view | LOW | 🔲 | |
| 7.1.5 | Schedule summary statistics | Navigate to schedule with tasks in various states | Summary bar (or header KPIs) shows: total tasks, completed, in progress, not started, milestones, overdue count, overall % complete | MEDIUM | 🔲 | |

---

## 8. Reporting & Export

> Source: `import-export-modal.tsx` — CSV and JSON export; import flow

### 8.1 Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export tasks as CSV | Click export icon (toolbar) → Import/Export modal opens → Export tab → select CSV → Download | CSV file downloads with columns: Task Name, WBS Code, Start Date, Finish Date, Duration (Days), % Complete, Status, Is Milestone, Constraint Type, Constraint Date | HIGH | 🔲 | |
| 8.1.2 | Export tasks as JSON | Import/Export modal → Export tab → select JSON → Download | JSON file downloads with all task data as array of objects | MEDIUM | 🔲 | |
| 8.1.3 | CSV includes all visible tasks | Export after filtering to "In Progress" tasks only | Exported CSV contains only in-progress tasks if filter active, OR all tasks if not filtered (verify behavior) | MEDIUM | 🔲 | |

### 8.2 Import

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.2.1 | Import tasks from CSV | Import/Export modal → Import tab → upload a valid CSV file → map columns → Import | Tasks created from CSV rows; toast shows count; list refreshes | HIGH | 🔲 | |
| 8.2.2 | Import fails on invalid CSV | Upload CSV with missing required columns | Error shown; no partial tasks created | MEDIUM | 🔲 | |

---

## 9. Advanced Features

> Source: `page.tsx` TableToolbar, SCHEDULE_FILTERS, SCHEDULE_COLUMNS, Gantt zoom, `schedule-views.tsx`

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by task name (partial match) | Type "drywall" in search box | List filters to tasks whose name contains "drywall" (case-insensitive) | HIGH | 🔲 | |
| 9.1.2 | Clear search restores full list | Type in search box, then clear the field | All tasks shown again | HIGH | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by status = In Progress | Apply Status filter → In Progress | Only in-progress tasks shown | HIGH | 🔲 | |
| 9.2.2 | Filter by status = Complete | Apply Status filter → Complete | Only complete tasks shown | HIGH | 🔲 | |
| 9.2.3 | Filter by status = Not Started | Apply Status filter → Not Started | Only not-started tasks shown | HIGH | 🔲 | |
| 9.2.4 | Filter by type = Milestones | Apply Type filter → Milestones | Only tasks with is_milestone = true shown | MEDIUM | 🔲 | |
| 9.2.5 | Filter by type = Tasks | Apply Type filter → Tasks | Only tasks with is_milestone = false shown | MEDIUM | 🔲 | |
| 9.2.6 | Clear filters restores full list | Apply a filter → click Clear Filters | All tasks shown again; filter badge cleared | MEDIUM | 🔲 | |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle optional columns on | Open column picker → enable "Assigned To" | Assigned To column appears in Table/Grid view | LOW | 🔲 | |
| 9.3.2 | Toggle optional columns off | Open column picker → hide "Duration" | Duration column disappears from view | LOW | 🔲 | |
| 9.3.3 | Task Name column always visible | Attempt to hide "Task Name" in column picker | Task Name toggle is disabled (alwaysVisible); column cannot be hidden | MEDIUM | 🔲 | |
| 9.3.4 | Default visible columns correct | Load fresh schedule page | Status, Start Date, Finish Date, Duration, % Complete columns visible by default; Assigned To and WBS Code hidden by default | MEDIUM | 🔲 | |

### 9.4 Selection & Bulk Actions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Select individual tasks via checkbox | Click checkbox on 2 task rows | Both rows highlighted; Bulk Action Bar appears with "2 selected" | HIGH | 🔲 | |
| 9.4.2 | Clear selection via X button | Select tasks → click X in Bulk Action Bar | Selection cleared; Bulk Action Bar disappears | HIGH | 🔲 | |
| 9.4.3 | Bulk Action Bar shows count | Select N tasks | Bar reads "N selected" where N matches actual count | HIGH | 🔲 | |

### 9.5 Gantt Chart Visualization

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.5.1 | Task bar width reflects duration | Task with 10-day duration | Bar spans 10 columns at day zoom | HIGH | 🔲 | |
| 9.5.2 | Progress fill within bar | Task at 60% complete | Bar fill is 60% of total bar length | HIGH | 🔲 | |
| 9.5.3 | Weekend columns shaded | Day zoom active | Saturday and Sunday columns have distinct background shade | LOW | 🔲 | |
| 9.5.4 | Task tooltip on hover | Hover over a Gantt bar | Tooltip shows task name, dates, status, % complete | MEDIUM | 🔲 | |
| 9.5.5 | Milestone rendered as diamond | Task with is_milestone = true | Diamond (◆) shape rendered instead of a bar | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | Schedule page component | `frontend/src/app/(main)/[projectId]/schedule/page.tsx` | Schedule |
| 2 | Scheduling types | `frontend/src/types/scheduling.ts` | Schedule |
| 3 | Task edit modal | `frontend/src/components/scheduling/task-edit-modal.tsx` | Schedule |
| 4 | Tasks API route (GET/POST) | `frontend/src/app/api/projects/[projectId]/scheduling/tasks/route.ts` | Schedule |
| 5 | Task [taskId] API route (PUT/DELETE) | `frontend/src/app/api/projects/[projectId]/scheduling/tasks/[taskId]/route.ts` | Schedule |
| 6 | Bulk update API route | `frontend/src/app/api/projects/[projectId]/scheduling/tasks/bulk/route.ts` | Schedule |
| 7 | Import API route | `frontend/src/app/api/projects/[projectId]/scheduling/tasks/import/route.ts` | Schedule |
| 8 | Gantt chart component | `frontend/src/components/scheduling/gantt-chart.tsx` | Schedule |
| 9 | Schedule views (Grid/Board/Calendar/Timeline) | `frontend/src/components/scheduling/schedule-views.tsx` | Schedule |
| 10 | Import/Export modal | `frontend/src/components/scheduling/import-export-modal.tsx` | Schedule |
| 11 | Task context menu | `frontend/src/components/scheduling/task-context-menu.tsx` | Schedule |
| 12 | Schedule guided scenarios | `docs/testing/schedule-scenarios.md` | Schedule |
| 13 | Procore Schedule tool | https://v2.support.procore.com/product-manuals/schedule-project | Schedule |
| 14 | Permissions Matrix — Schedule | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-schedule-permissions | Schedule |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
