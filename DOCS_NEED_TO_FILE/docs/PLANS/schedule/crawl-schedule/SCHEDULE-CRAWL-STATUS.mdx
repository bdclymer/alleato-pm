# Procore Schedule Crawl - Status Report

**Generated:** 2026-01-11T08:45:00.000Z
**App URL:** https://us02.procore.com/562949954728542/project/calendar
**Project ID:** 562949954728542

## Summary

Successfully crawled the Procore Schedule feature:
- **App Pages:** 7 core pages captured (includes view variations)
- **View Variations:** Day, Month, Year calendar views
- **Dropdown States:** Export, New menus captured
- **Documentation Pages:** 5 support/community pages

## App Crawl Results

### Core Pages Captured

1. **Main Gantt View** (`/project/calendar`)
   - Default schedule landing page
   - Gantt chart timeline with 633 timeline elements
   - Lookahead selector (date range picker)
   - Grid columns: ID, Task Name, Resource, Notes, Company, Assignees
   - Create Lookahead, Export, Activity Feed buttons
   - Configure and Add Filter controls

2. **Lookaheads View** (`/project/calendar/lookaheads`)
   - Dedicated lookahead schedule management
   - Similar UI to main Gantt view
   - 9 calendar interactions detected

3. **Calendar View** (`/project/calendar/month`)
   - Monthly calendar display
   - Full FullCalendar.js integration (fc-scrollgrid)
   - Day headers: Sun, Mon, Tue, Wed, Thu, Fri, Sat
   - 42 event indicators detected
   - Calendar legend component
   - View switcher: Day, Month, Year
   - Today button, prev/next navigation

4. **List View** (`/project/calendar/all`)
   - Tabular list of all schedule items
   - AG Grid implementation (ag-button, ag-paging-button)
   - 48 clickable task items detected
   - Pagination controls
   - Filter panel with Clear All Filters
   - Configure column visibility

5. **Settings** (`/project/calendar/settings/general`)
   - Schedule configuration page (link detected)

### Calendar View Variations Captured

- `calendar_month_day-view` - Day view
- `calendar_month_month-view` - Month view
- `calendar_month_year-view` - Year view

### Dropdown States Captured

- `calendar_month_dropdown_2` - Export dropdown
- `calendar_month_dropdown_3` - New dropdown
- `calendar_all_dropdown_2` - Export dropdown
- `calendar_all_dropdown_3` - New dropdown

### Sample Task Data Detected

From List View, sample tasks include:
- Demo/Make-safe MEP
- Demo walls
- Demo flooring
- Framing new walls
- Complete underground plumbing
- Receive permit
- Underground plumbing Inspection
- HVAC Rough-In
- Sprinkler Rough-In
- Hang Drywall
- And many more...

## Structure Analysis

### Navigation Tabs

| Tab | Link ID | URL Path |
|-----|---------|----------|
| List | `all-link` | `/project/calendar/all` |
| Calendar | `month-link` | `/project/calendar/month` |
| Gantt | `gantt_chart-link` | `/project/calendar` |
| Lookaheads | `lookaheads-link` | `/project/calendar/lookaheads` |
| Settings | `configure_tab-link` | `/project/calendar/settings/general` |

### Tables Detected (Calendar Month View)

| Table | Headers | Rows | Classes |
|-------|---------|------|---------|
| 1 | Sun, Mon, Tue, Wed, Thu, Fri, Sat | 7 | fc-scrollgrid fc-scrollgrid-liquid |
| 2 | Sun, Mon, Tue, Wed, Thu, Fri, Sat | 0 | fc-col-header |
| 3 | (none) | 6 | fc-scrollgrid-sync-table |

### UI Components Inventory

**Main Gantt View:**
- Buttons: 9
- Inputs: 3
- Tables: 0 (Gantt uses canvas/SVG)
- Navigation: 2
- Icons: 25
- Calendar components: 1
- Timeline elements: 633
- Task elements: 7

**Calendar Month View:**
- Buttons: 15
- Inputs: 8
- Tables: 3 (FullCalendar structure)
- Navigation: 2
- Icons: 38
- Calendar components: 3
- Event elements: 42

**List View:**
- Buttons: 16
- Inputs: 23
- Lists: 1
- Navigation: 2
- Icons: 45
- Calendar components: 3
- Task elements: 48

### Key Actions Identified

| Action | Location | Type |
|--------|----------|------|
| Create Lookahead | Gantt view | Primary button |
| Export | All views | Dropdown button |
| New | List/Calendar | Dropdown button |
| Activity Feed | Gantt view | Button |
| Configure | All views | Button |
| Add Filter | Gantt view | Button |
| Clear All Filters | List view | Button |
| Today | Calendar view | Button |
| Prev/Next | Calendar view | Navigation buttons |
| View Switcher | Calendar view | Dropdown (Day/Month/Year) |

## Key Features Identified

1. **Multiple Views**
   - Gantt Chart (default)
   - Calendar (month/day/year)
   - List (tabular)
   - Lookaheads

2. **Task Management**
   - Create tasks
   - Edit task details
   - Assign resources/companies
   - Set dates and durations

3. **Lookahead Scheduling**
   - Date range selection
   - 2-week lookahead windows
   - Create lookahead functionality

4. **Export Capabilities**
   - Export dropdown (format options TBD)

5. **Filtering & Configuration**
   - Filter panel
   - Column configuration
   - Clear all filters

6. **Calendar Integration**
   - FullCalendar.js implementation
   - Day/Month/Year views
   - Today navigation
   - Event display

## Implementation Insights

### Data Model Considerations

```sql
-- Core Schedule Tables (suggested)
CREATE TABLE schedule_tasks (
  id BIGINT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  resource_name TEXT,
  company_id BIGINT REFERENCES companies(id),
  notes TEXT,
  status TEXT,
  parent_task_id BIGINT REFERENCES schedule_tasks(id),
  sequence_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_task_assignees (
  id BIGINT PRIMARY KEY,
  task_id BIGINT REFERENCES schedule_tasks(id),
  user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_lookaheads (
  id BIGINT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_events (
  id BIGINT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  task_id BIGINT REFERENCES schedule_tasks(id),
  event_date DATE NOT NULL,
  event_type TEXT,
  title TEXT,
  description TEXT
);
```

### API Endpoints Needed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/[projectId]/schedule/tasks` | GET | List all tasks |
| `/api/projects/[projectId]/schedule/tasks` | POST | Create task |
| `/api/projects/[projectId]/schedule/tasks/[taskId]` | GET | Get task details |
| `/api/projects/[projectId]/schedule/tasks/[taskId]` | PUT | Update task |
| `/api/projects/[projectId]/schedule/tasks/[taskId]` | DELETE | Delete task |
| `/api/projects/[projectId]/schedule/lookaheads` | GET | List lookaheads |
| `/api/projects/[projectId]/schedule/lookaheads` | POST | Create lookahead |
| `/api/projects/[projectId]/schedule/export` | GET | Export schedule |
| `/api/projects/[projectId]/schedule/calendar` | GET | Calendar events |

### Frontend Components Needed

| Component | Description |
|-----------|-------------|
| `ScheduleGanttView` | Main Gantt chart with timeline grid |
| `ScheduleListView` | AG Grid based task list |
| `ScheduleCalendarView` | FullCalendar integration |
| `ScheduleLookaheadSelector` | Date range picker for lookaheads |
| `ScheduleTaskRow` | Individual task row in Gantt |
| `ScheduleTaskDetail` | Task detail panel/modal |
| `ScheduleExportMenu` | Export format dropdown |
| `ScheduleNewMenu` | New task/event dropdown |
| `ScheduleFilterPanel` | Filter sidebar |
| `ScheduleConfigurePanel` | Column/view configuration |
| `CalendarLegend` | Calendar event type legend |

### Third-Party Libraries

- **FullCalendar** - Calendar view implementation
- **AG Grid** - List view table
- **Custom Gantt** - Procore uses custom Gantt implementation

## Statistics

| Metric | Value |
|--------|-------|
| App Pages Captured | 7 |
| View Variations | 3 |
| Dropdown States | 4 |
| Documentation Pages | 5 |
| Total Links Extracted | ~180 |
| Total Clickables | ~150 |
| Timeline Elements | 633 |
| Task Items | 48+ |

## Output Locations

- **Pages:** `documentation/*project-mgmt/in-progress/schedule/crawl-schedule/pages/`
- **Reports:** `documentation/*project-mgmt/in-progress/schedule/crawl-schedule/reports/`
- **Sitemap:** `documentation/*project-mgmt/in-progress/schedule/crawl-schedule/reports/sitemap-table.md`

## Next Steps for Implementation

1. **Review Screenshots**
   - Compare captured UI with implementation requirements
   - Identify any missing views or interactions

2. **Database Schema**
   - Create schedule_tasks table with proper relationships
   - Add lookaheads and calendar events tables
   - Design RLS policies for project-level access

3. **API Development**
   - Implement CRUD endpoints for tasks
   - Add export functionality
   - Build calendar event aggregation

4. **Frontend Components**
   - Choose Gantt library (or build custom)
   - Integrate FullCalendar for calendar view
   - Implement AG Grid for list view

5. **Testing**
   - E2E tests for each view
   - API integration tests
   - Calendar event display tests
