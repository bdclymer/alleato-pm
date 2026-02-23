---
title: prp scheduling
description: prp scheduling documentation
---

# Scheduling Module - Product Requirement Prompt

| Tool | Score | Created | Source |
| ------- | ------- | ------- | ------- |
| Scheduling | 8/10 | 2026-01-27 | Procore Crawl |

## Goal

**Feature Goal**: Implement a fully functional scheduling module that allows project managers to create, edit, and manage project tasks with dependencies, milestones, and deadlines.

**Deliverable**: A complete scheduling page with Gantt chart visualization, task CRUD operations, dependency management, and bulk editing capabilities.

**Success Definition**: Users can create tasks, set dependencies between them, track progress, and view the schedule in a Gantt chart format matching Procore's scheduling tool functionality.

---

## Related Links

- Frontend:
- Procore App:
- Procore Documentation:
- Screenshots:  

## Why

**Business Value**: Project scheduling is a core construction management feature that enables teams to plan work sequences, track progress, and identify delays before they impact the project timeline.

**Integration**: Integrates with project context, potentially links to daily logs, RFIs, and other project tools.

**Problems Solved**:

- Provides visual timeline for project activities
- Enables dependency tracking to identify critical path
- Allows progress tracking with percent complete
- Supports milestone tracking for key deliverables

---

## What

### Functionality

- Parent tasks
- Dependencies
- Project Milestones
- Lead Time
-

### Pages

- `/[projectId]/scheduling` - Main scheduling page with Gantt chart and task list

#### Page Elements

1. View
2. Filters
3. Search
4. Toggle Dependencies
5. Critical Paths
6. Collapse/Expand Parent Tasks
7. Latest Details
8. Zoom in/Zoom Out
9. Go to today
10. Callendar
11. Action Button: Import
12. Action Button: Export
13. Gnatt View
14. Table View
15. Split Screen View
16. Board/Kanaban View

### Forms

- Create Tasks
- Automatically create new row when you hit enter.

#### Form Field Additioins (Not in Procore)

- Assigned

### DB Tables

- schedule_tasks
- schedule_dependencies
- schedule_deadlines

### Database Schema

Based on `schema.sql`:

```sql
-- Tasks table
create table app_schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  parent_task_id uuid references app_schedule_tasks(id),
  name text not null,
  start_date date,
  finish_date date,
  duration_days int,
  percent_complete int default 0,
  status text default 'not_started',
  is_milestone boolean default false,
  constraint_type text,
  constraint_date date,
  wbs_code text,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Dependencies table
create table app_schedule_dependencies (
  id uuid primary key default gen_random_uuid(),
  predecessor_task_id uuid references app_schedule_tasks(id),
  successor_task_id uuid references app_schedule_tasks(id),
  dependency_type text not null default 'FS', -- FS, SS, FF, SF
  lag_days int default 0,
  created_at timestamptz default now()
);

-- Deadlines table
create table schedule_deadlines (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references app_schedule_tasks(id),
  deadline_date date not null,
  created_at timestamptz default now()
);
```yaml
### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/[projectId]/scheduling/tasks` | GET | List all tasks |
| `/api/projects/[projectId]/scheduling/tasks` | POST | Create task |
| `/api/projects/[projectId]/scheduling/tasks/[taskId]` | GET | Get single task |
| `/api/projects/[projectId]/scheduling/tasks/[taskId]` | PUT | Update task |
| `/api/projects/[projectId]/scheduling/tasks/[taskId]` | DELETE | Delete task |
| `/api/projects/[projectId]/scheduling/tasks/bulk` | PUT | Bulk update tasks |
| `/api/projects/[projectId]/scheduling/dependencies` | POST | Create dependency |
| `/api/projects/[projectId]/scheduling/dependencies/[depId]` | DELETE | Remove dependency |
| `/api/projects/[projectId]/scheduling/import` | POST | Import schedule |
| `/api/projects/[projectId]/scheduling/export` | GET | Export schedule |

### Components

| Component | Purpose |
|-----------|---------|
| `SchedulingPage` | Main page layout with toolbar and content |
| `TaskTable` | Table/grid view of tasks |
| `GanttChart` | Gantt visualization component |
| `TaskEditModal` | Modal for editing task details |
| `BulkEditPanel` | Panel for bulk editing selected tasks |
| `DependencyEditor` | UI for managing task dependencies |
| `TaskContextMenu` | Right-click context menu for task actions |

### Domain Commands (from COMMANDS.md)

| Command | Label | Description |
|---------|-------|-------------|
| `add_task` | Add Activity Below | Add a new task to the schedule |
| `edit_task` | Edit | Edit a single scheduling task |
| `delete_task` | Delete | Delete one or more tasks |
| `bulk_edit_tasks` | Bulk edit | Edit multiple scheduling tasks at once |
| `copy_task` | Copy | Copy task to clipboard |
| `cut_task` | Cut | Cut task to clipboard |
| `paste_task` | Paste | Paste task from clipboard |
| `indent_task` | Indent Activity | Make task a child of previous task |
| `outdent_task` | Outdent Activity | Promote task to higher hierarchy |
| `convert_to_milestone` | Convert to milestone | Convert a task into a milestone |
| `set_deadline` | Set deadline to finish date | Lock task finish date as deadline |
| `scroll_to_task` | Scroll to activity | Scroll viewport to selected task |
| `import_schedule` | Import | Import scheduling data |
| `export_schedule` | Export | Export scheduling data |

---

## Success Criteria

- [ ] Tasks can be created with name, dates, and duration
- [ ] Tasks display in both table and Gantt chart views
- [ ] Dependencies can be created between tasks
- [ ] Task hierarchy (parent/child) works correctly
- [ ] Bulk editing updates multiple tasks at once
- [ ] Milestones display correctly (zero duration)
- [ ] Deadlines show visual indicator when approaching/passed
- [ ] Import/Export functionality works
- [ ] Progress tracking with percent complete
- [ ] Context menu actions work correctly

---

## All Needed Context

### Documentation & References

```yaml
# Crawl Data
- file: playwright-procore-crawl/procore-crawls/scheduling/crawl-summary.json
  why: Structured summary of all crawl data
  pattern: Contains commands, UI components, screenshot paths

- file: playwright-procore-crawl/procore-crawls/scheduling/spec/COMMANDS.md
  why: Canonical list of domain commands
  pattern: Command key, label, description

- file: playwright-procore-crawl/procore-crawls/scheduling/spec/MUTATIONS.md
  why: Detailed behavior specifications for edit_task
  critical: Validation rules, dependency handling, hierarchy rules

- file: playwright-procore-crawl/procore-crawls/scheduling/spec/schema.sql
  why: Database schema for scheduling tables
  pattern: Tasks, dependencies, deadlines tables

- file: playwright-procore-crawl/procore-crawls/scheduling/pages/scheduling/screenshot.png
  why: Visual reference for UI implementation
  critical: Layout, toolbar, Gantt chart appearance

# Codebase Patterns
- file: frontend/src/app/(main)/[projectId]/budget/page.tsx
  why: Similar project-scoped page pattern
  pattern: Page layout, data fetching, project context

- file: frontend/src/lib/services/direct-cost-service.ts
  why: Service layer pattern for Supabase operations
  pattern: CRUD operations, error handling, TypeScript types

- file: frontend/src/components/ui/table.tsx
  why: Existing table component to extend
  pattern: Column definitions, sorting, selection
```markdown
### Current Codebase Structure

```text
frontend/src/
├── app/
│   └── (main)/
│       └── [projectId]/
│           ├── budget/           # Similar page pattern
│           └── scheduling/       # NEW - to create
│               └── page.tsx
├── components/
│   ├── ui/                   # Shared UI components
│   └── scheduling/           # NEW - to create
│       ├── task-table.tsx
│       ├── gantt-chart.tsx
│       ├── task-edit-modal.tsx
│       └── task-context-menu.tsx
├── lib/
│   └── services/
│       └── scheduling-service.ts  # NEW - to create
└── types/
    └── scheduling.types.ts    # NEW - to create
```

### Known Gotchas

```typescript
// CRITICAL: Dependency recalculation must happen server-side
// Don't try to calculate successor dates in the client

// CRITICAL: Hierarchy (parent/child) dates are derived
// Parent dates = min(children.start_date) to max(children.finish_date)
// Never allow direct edit of parent dates when children exist

// CRITICAL: Circular dependency detection required
// Before creating a dependency, verify it won't create a cycle

// GOTCHA: Milestones must have duration_days = 0
// If converting to milestone, set duration to 0 and start_date = finish_date
```typescript
---

## Implementation Blueprint

### Data Models

```typescript
// lib/types/scheduling.types.ts

export interface ScheduleTask {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  name: string;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  percent_complete: number;
  status: 'not_started' | 'in_progress' | 'complete';
  is_milestone: boolean;
  constraint_type: 'none' | 'start_no_earlier_than' | 'finish_no_later_than' | null;
  constraint_date: string | null;
  wbs_code: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Derived fields
  children?: ScheduleTask[];
  dependencies?: ScheduleDependency[];
  deadline?: ScheduleDeadline;
}

export interface ScheduleDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF';
  lag_days: number;
}

export interface ScheduleDeadline {
  id: string;
  task_id: string;
  deadline_date: string;
}

export interface TaskPatch {
  name?: string;
  start_date?: string;
  finish_date?: string;
  duration_days?: number;
  percent_complete?: number;
  status?: ScheduleTask['status'];
  is_milestone?: boolean;
  constraint_type?: ScheduleTask['constraint_type'];
  constraint_date?: string;
}
```markdown
### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE types/scheduling.types.ts
  - IMPLEMENT: TypeScript interfaces for ScheduleTask, ScheduleDependency, ScheduleDeadline
  - FOLLOW pattern: frontend/src/types/budget.ts
  - NAMING: PascalCase interfaces, camelCase properties
  - PLACEMENT: frontend/src/types/

Task 2: CREATE Supabase migration for scheduling tables
  - IMPLEMENT: Tables from schema.sql with proper indexes
  - FOLLOW pattern: existing migrations
  - INCLUDE: RLS policies for project-scoped access
  - PLACEMENT: supabase/migrations/

Task 3: CREATE lib/services/scheduling-service.ts
  - IMPLEMENT: CRUD operations for tasks, dependencies, deadlines
  - FOLLOW pattern: lib/services/direct-cost-service.ts
  - INCLUDE: Dependency recalculation logic
  - DEPENDENCIES: Task 1 types

Task 4: CREATE app/api/projects/[projectId]/scheduling/tasks/route.ts
  - IMPLEMENT: GET (list tasks), POST (create task)
  - FOLLOW pattern: existing API routes
  - INCLUDE: Project authorization check
  - DEPENDENCIES: Task 3 service

Task 5: CREATE app/api/projects/[projectId]/scheduling/tasks/[taskId]/route.ts
  - IMPLEMENT: GET, PUT, DELETE for single task
  - FOLLOW pattern: existing API routes
  - DEPENDENCIES: Task 3 service

Task 6: CREATE components/scheduling/task-table.tsx
  - IMPLEMENT: Table view of tasks with columns
  - FOLLOW pattern: components/ui/data-table.tsx
  - INCLUDE: Selection, sorting, inline editing
  - DEPENDENCIES: Task 1 types

Task 7: CREATE components/scheduling/gantt-chart.tsx
  - IMPLEMENT: Gantt chart visualization
  - CONSIDER: Use existing library (e.g., @ant-design/plots or custom SVG)
  - INCLUDE: Task bars, dependencies lines, today marker
  - DEPENDENCIES: Task 1 types

Task 8: CREATE components/scheduling/task-edit-modal.tsx
  - IMPLEMENT: Modal form for editing task details
  - FOLLOW pattern: existing modal components
  - INCLUDE: All editable fields from MUTATIONS.md
  - DEPENDENCIES: Task 1 types

Task 9: CREATE components/scheduling/task-context-menu.tsx
  - IMPLEMENT: Right-click context menu with all commands
  - FOLLOW pattern: existing dropdown menus
  - INCLUDE: All commands from COMMANDS.md
  - DEPENDENCIES: Task 1 types

Task 10: CREATE app/(main)/[projectId]/scheduling/page.tsx
  - IMPLEMENT: Main scheduling page
  - FOLLOW pattern: app/(main)/[projectId]/budget/page.tsx
  - INCLUDE: Toolbar, table/Gantt toggle, task list
  - DEPENDENCIES: Tasks 6, 7, 8, 9

Task 11: CREATE bulk edit functionality
  - IMPLEMENT: Bulk edit panel for multiple task selection
  - INCLUDE: Common fields that can be bulk edited
  - DEPENDENCIES: Task 3 service, Task 10 page

Task 12: CREATE import/export functionality
  - IMPLEMENT: Import from CSV/MS Project, Export to CSV
  - INCLUDE: File upload, parsing, validation
  - DEPENDENCIES: Task 3 service

Task 13: ADD tests for scheduling module
  - IMPLEMENT: Unit tests for service layer
  - IMPLEMENT: Component tests for UI
  - FOLLOW pattern: existing test files
  - DEPENDENCIES: All previous tasks
```diff
---

## Validation Loop

### Level 1: Syntax & Style (Immediate)

```bash
npm run lint
npx tsc --noEmit
npm run format
```

### Level 2: Unit Tests

```bash
npm test -- frontend/src/lib/services/scheduling-service.test.ts
npm test -- frontend/src/components/scheduling/
```markdown
### Level 3: Integration Testing

```bash
# Start dev server
npm run dev

# Verify page loads
curl -I http://localhost:3000/[projectId]/scheduling

# Verify API endpoints
curl http://localhost:3000/api/projects/[projectId]/scheduling/tasks
```markdown
### Level 4: E2E Testing

```bash
# Run Playwright tests
npx playwright test tests/scheduling.spec.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Production build succeeds: `npm run build`

### Feature Validation

- [ ] Tasks can be created, edited, deleted
- [ ] Dependencies work correctly
- [ ] Gantt chart renders properly
- [ ] Context menu actions work
- [ ] Bulk editing functions correctly
- [ ] Import/export works

### Code Quality

- [ ] Follows existing codebase patterns
- [ ] TypeScript types are comprehensive
- [ ] Error handling is robust
- [ ] Loading states are handled

---

## Anti-Patterns to Avoid

- ❌ Don't calculate dependency chains client-side - do it server-side
- ❌ Don't allow editing parent task dates directly when children exist
- ❌ Don't create circular dependencies
- ❌ Don't skip validation on task date logic (start ≤ finish)
- ❌ Don't hardcode project IDs - always use context

---

## Procore Crawl Data Reference

This section contains all crawl data files, sitemap, and screenshots from the Procore feature analysis.

### Sitemap

| Page | URL | Screenshot |
|------|-----|------------|
| Scheduling | [Procore Scheduling Tool](https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/schedulemgmt) | [View](#main-scheduling-view) |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | Crawl Summary | `crawl-summary.json` | Structured JSON with all crawl data |
| Summary | README | `README.md` | Module overview |
| Reports | Sitemap | `reports/sitemap-table.md` | Page URLs and structure |
| Reports | Detailed Report | `reports/detailed-report.json` | Full crawl analysis |
| Spec | Commands | `spec/COMMANDS.md` | 14 domain commands (add_task, edit_task, etc.) |
| Spec | Mutations | `spec/MUTATIONS.md` | Behavior specifications for edit_task |
| Spec | Schema | `spec/schema.sql` | Database tables (tasks, dependencies, deadlines) |
| Spec | Forms | `spec/FORMS.md` | UI form field definitions |
| Pages | Screenshot | `pages/scheduling/screenshot.png` | Main scheduling view (76 KB) |
| Pages | DOM | `pages/scheduling/dom.html` | Full DOM snapshot (387 KB) |
| Pages | Metadata | `pages/scheduling/metadata.json` | Links, dropdowns, system actions |

**Base Path**: `playwright-procore-crawl/procore-crawls/scheduling/`

### Screenshots

#### Main Scheduling View

The main Procore scheduling interface showing the Gantt chart with task list:

![Procore Scheduling Screenshot](../../playwright-procore-crawl/procore-crawls/scheduling/pages/scheduling/screenshot.png)

**Key UI Elements to Replicate:**

- Left panel: Task table with columns (Name, Start, Finish, Duration, % Complete)
- Right panel: Gantt chart with task bars and dependency lines
- Toolbar: Import, Export, view toggles, zoom controls
- Context menu: Right-click actions for task operations
- Task hierarchy: Indent/outdent for parent-child relationships

### UI Components Detected

From crawl metadata analysis:

#### Context Menu Items

| Label | Command Key |
|-------|-------------|
| Scroll to activity | `scroll_to_task` |
| Bulk edit | `bulk_edit_tasks` |
| Edit | `edit_task` |
| Copy | `copy_task` |
| Cut | `cut_task` |
| Paste | `paste_task` |
| Set deadline to finish date | `set_deadline` |
| Add... | `add_task` |
| Convert to milestone | `convert_to_milestone` |
| Indent Activity | `indent_task` |
| Outdent Activity | `outdent_task` |
| Delete | `delete_task` |

#### Modals Detected

- SearchCmdK (Cmd+K search)
- More options menu
- Learn More help
- Feedback dialog

---

## Confidence Assessment

| Factor | Score | Notes |
|--------|-------|-------|
| Requirements clarity | 9/10 | Clear from crawl data and commands |
| Codebase patterns | 8/10 | Similar patterns exist (budget, etc.) |
| Technical complexity | 7/10 | Gantt chart and dependencies are complex |
| Data model | 9/10 | Schema provided from analysis |
| UI/UX reference | 8/10 | Screenshot available |

**Overall Confidence: 8/10** - Ready for implementation with clear requirements and patterns to follow.
