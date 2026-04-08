# Schedule — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** schedule
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Schedule")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **schedule** is a list of work tasks arranged by date. Each task has a name, a start date, and a finish date. Some tasks are **milestones** — important target dates (like "Framing complete by May 15") that mark the end of a phase rather than a duration. The Schedule tool shows all tasks as a Gantt chart (horizontal bar timeline), a table, a kanban board, a timeline, or a calendar — all showing the same data in different ways.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Schedule page | HIGH |
| 1.2 | Navigation | Switch between all five view modes | HIGH |
| 2.1 | Create | Create a new task with a name and dates | HIGH |
| 2.2 | Create | Try to create a task without a name | HIGH |
| 2.3 | Create | Create a milestone | MEDIUM |
| 3.1 | Edit | Change a task start and finish date | HIGH |
| 3.2 | Edit | Rename an existing task | HIGH |
| 3.3 | Edit | Change a task status to In Progress | HIGH |
| 4.1 | Delete | Delete a task and confirm it is removed | HIGH |
| 4.2 | Delete | Select multiple tasks and delete them all at once | HIGH |
| 5.1 | Hierarchy | Create a sub-task under a parent task | MEDIUM |
| 6.1 | Filters & Search | Search for a task by its name | HIGH |
| 6.2 | Filters & Search | Filter the task list to show only In Progress tasks | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Schedule page
**What this checks:** The Schedule page loads without errors and shows the task list.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. In the left sidebar, click **"Schedule"** under project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A list of tasks is visible, or an empty state message appears. The page title says "Schedule". No error messages appear.

---

### 1.2 — Switch between all five view modes
**What this checks:** The five views — Gantt, Table, Board, Timeline, Calendar — each load without errors. Each view shows the same tasks in a different layout.

**Steps:**
1. Open the Schedule page at `/767/schedule`
2. Click the **"Table"** tab at the top
3. Wait for the view to load
4. Click the **"Board"** tab
5. Wait for the view to load
6. Click the **"Timeline"** tab
7. Wait for the view to load
8. Click the **"Calendar"** tab
9. Wait for the view to load
10. Click the **"Gantt"** tab to return to the default

**Expected result:** Each view loads without errors. Tasks appear in all views. The active tab is visually highlighted. No error messages appear in any view.

---

## 2. Create

### 2.1 — Create a new task with a name and dates
**What this checks:** A user can create a new schedule task — a unit of work with a start date and end date — and it appears in the task list after saving.

**Steps:**
1. Open the Schedule page
2. Click the **"Add Task"** button (top right)
3. In the **Name** field, type: **Install Drywall**
4. In the **Start Date** field, type or select: **2026-05-01**
5. In the **Finish Date** field, type or select: **2026-05-15**
6. Click the **Save** button
7. Wait for the page to stop loading

**Expected result:** The task "Install Drywall" appears in the list. Its start date shows 2026-05-01 and finish date shows 2026-05-15. A success message (toast) briefly appears. No error messages are shown.

---

### 2.2 — Try to create a task without a name
**What this checks:** The form prevents saving when the required Name field is left blank, so unnamed tasks cannot be accidentally created.

**Steps:**
1. Open the Schedule page
2. Click **"Add Task"**
3. Leave the **Name** field completely blank
4. Click the **Save** button

**Expected result:** An error message appears near the Name field saying the name is required. The task is NOT created. The form stays open.

---

### 2.3 — Create a milestone
**What this checks:** A milestone — a zero-duration target date (like "Foundation complete by June 1") — can be created and is visually distinct from regular tasks.

**Steps:**
1. Open the Schedule page
2. Click **"Add Task"**
3. In the **Name** field, type: **Foundation Complete**
4. Check the **"Milestone"** checkbox or toggle (if visible in the form)
5. Set **Date** to: **2026-06-01**
6. Click **Save**

**Expected result:** The milestone "Foundation Complete" appears in the task list. It is visually different from regular tasks (e.g. a diamond icon, or labeled as milestone). No error appears.

---

## 3. Edit

### 3.1 — Change a task start and finish date
**What this checks:** Editing a task and changing its dates saves correctly and the new dates appear after refreshing.

**Setup:** There must be at least one task in the schedule.

**Steps:**
1. Open the Schedule page
2. Click on any task name to open the edit modal
3. Change the **Start Date** to: **2026-06-10**
4. Change the **Finish Date** to: **2026-06-20**
5. Click **Save**
6. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page

**Expected result:** After refreshing, the task shows Start Date 2026-06-10 and Finish Date 2026-06-20. The updated dates are persisted — they do not revert to the old values.

---

### 3.2 — Rename an existing task
**What this checks:** A task name can be updated and the new name appears everywhere in the schedule.

**Setup:** There must be at least one task in the schedule.

**Steps:**
1. Open the Schedule page
2. Click on any task to open its edit modal
3. Clear the **Name** field and type: **Renamed Task Test**
4. Click **Save**

**Expected result:** The task list shows "Renamed Task Test" in place of the old name. A success toast appears. The old name is no longer visible.

---

### 3.3 — Change a task status to In Progress
**What this checks:** A task status can be updated. Status tracks whether a task has not started yet, is currently being worked on, or is finished.

**Setup:** There must be at least one task with status Not Started.

**Steps:**
1. Open the Schedule page
2. Click on a task with status **"Not Started"**
3. In the edit modal, find the **Status** dropdown and select **"In Progress"**
4. Click **Save**

**Expected result:** The task now shows status "In Progress" in the list. If there is a Board view, the task card has moved to the "In Progress" column.

---

## 4. Delete

### 4.1 — Delete a task and confirm it is removed
**What this checks:** A task can be permanently deleted and disappears from the schedule.

**Setup:** Create a task named **"Delete Me Task"** before running this test.

**Steps:**
1. Open the Schedule page
2. Find the task named **Delete Me Task** in the list
3. Right-click the task row (or click the three-dot context menu on the row)
4. Click **"Delete"**
5. Confirm the deletion if a dialog appears
6. Wait for the page to update

**Expected result:** The task "Delete Me Task" is no longer visible in any view. A success toast briefly appears. No error messages are shown.

---

### 4.2 — Select multiple tasks and delete them all at once
**What this checks:** The bulk delete feature works — useful when you need to remove several tasks in one action.

**Setup:** Create at least two tasks named **"Bulk Delete A"** and **"Bulk Delete B"** before running this test.

**Steps:**
1. Open the Schedule page
2. Check the checkbox on the row for **"Bulk Delete A"**
3. Check the checkbox on the row for **"Bulk Delete B"**
4. A bulk action bar should appear — click **"Delete"**
5. Confirm the deletion

**Expected result:** Both tasks disappear from the list. The success message mentions 2 tasks deleted. No error messages appear.

---

## 5. Hierarchy

### 5.1 — Create a sub-task under a parent task
**What this checks:** Tasks can be nested — for example, "Frame Walls" and "Hang Drywall" could be sub-tasks under a parent task called "Framing Phase". Nesting helps organize work into phases.

**Setup:** There must be at least one parent task in the schedule.

**Steps:**
1. Open the Schedule page (Gantt or Table view)
2. Right-click on any task to open the context menu
3. Click **"Add Sub-task"** or **"Indent"**
4. If a sub-task is added, click on it and name it: **Sub-Task Test**
5. Click **Save**

**Expected result:** The new task "Sub-Task Test" appears indented below the parent task in the list. The parent task shows an expand/collapse arrow.

---

## 6. Filters & Search

### 6.1 — Search for a task by its name
**What this checks:** The search box filters the task list to show only matching tasks.

**Setup:** There must be at least two tasks with different names in the schedule.

**Steps:**
1. Open the Schedule page
2. Click the search box in the toolbar (shows a magnifying glass icon or says **"Search tasks..."**)
3. Type: **Install**
4. Wait for the list to filter

**Expected result:** Only tasks whose name contains "Install" are shown. Tasks with unrelated names disappear. Clearing the search box brings all tasks back.

---

### 6.2 — Filter the task list to show only In Progress tasks
**What this checks:** The status filter narrows the list to tasks in a specific stage of work.

**Setup:** There must be at least one task with status "In Progress" and one with a different status.

**Steps:**
1. Open the Schedule page
2. Click the **Filters** button in the toolbar
3. Find the **Status** filter and select **"In Progress"**
4. Apply the filter

**Expected result:** Only tasks with status "In Progress" are shown. Tasks with other statuses are hidden. Clearing the filter brings all tasks back.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Task dependencies (predecessor/successor links) | Complex multi-step setup required |
| Drag-to-reschedule on Gantt chart | Requires browser interaction testing |
| Import schedule from CSV/file | Multi-step upload flow |
| Export schedule to PDF/CSV | Needs file download verification |
| % Complete slider on Gantt | Gantt chart interaction not covered |
| Column visibility toggle | Low priority, toolbar feature |
