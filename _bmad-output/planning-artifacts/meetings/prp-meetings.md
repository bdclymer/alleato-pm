# PRP: Meetings Tool

**Feature:** Project-level Meeting Management
**Deliverable:** Complete meetings tool for scheduling, agendas, minutes, and action items
**Confidence Score:** 9/10

---

## Goal

### Feature Goal

Implement a comprehensive project-level meetings tool that enables teams to schedule meetings, manage agendas, record minutes, track action items, and distribute meeting documentation—matching Procore's Meetings tool functionality.

### Deliverable

A full-featured meetings management system including:

- Meeting scheduling with calendar integration
- Agenda creation and management with categories
- Minutes recording with rich text editing
- Action item tracking and assignments
- Attendee management and distribution
- PDF export and email distribution
- Meeting templates for recurring meeting types
- Follow-up meeting creation

### Success Definition

- Users can create, schedule, and manage meetings within projects
- Agendas can be created with categories and items
- Minutes can be recorded with attendee tracking
- Action items can be assigned with due dates and carry over to follow-up meetings
- Meeting minutes can be distributed via email and exported as PDF
- Templates can be created and reused for common meeting types
- All operations maintain proper TypeScript type safety
- Full test coverage with E2E tests for critical workflows

---

## Why

### Business Value

- **Centralized communication**: Single source of truth for all project meetings
- **Accountability**: Track action items and assignments with due dates
- **Documentation**: Maintain complete meeting history and decisions
- **Efficiency**: Templates and follow-up meetings reduce setup time
- **Compliance**: PDF exports provide audit trail for regulatory requirements

### User Impact

- Project managers can schedule and track all project meetings
- Team members receive automatic notifications for assignments
- Meeting minutes provide clear record of decisions and next steps
- Action items don't get lost between meetings (auto carry-over)
- Templates standardize meeting formats (OAC, safety, progress meetings)

### Integration with Existing Features

- **Directory**: Meeting attendees from project directory/people
- **Schedule**: Meetings appear on project calendar/timeline
- **Documents**: Attach relevant documents to meetings and items
- **Notifications**: Email alerts for assignments and distributions

### Problems This Solves

1. **Scattered meeting notes**: Currently no centralized meeting management
2. **Lost action items**: Manual tracking in separate tools
3. **Inconsistent formats**: Each meeting structured differently
4. **Distribution challenges**: No built-in way to share minutes
5. **Follow-up overhead**: Recreating meeting structures repeatedly

---

## What

### Pages

```typescript
// Meeting list view
/[projectId]/meetings
  - List all meetings with filters (upcoming, past, by attendee)
  - Quick actions: Create, View, Edit, Delete
  - Status badges: Draft, Agenda, Minutes, Distributed

// Meeting detail/editor
/[projectId]/meetings/[meetingId]
  - Agenda mode: Edit agenda items and categories
  - Minutes mode: Record minutes and track attendance
  - Tabbed interface: Details, Agenda/Minutes, Attendees, Attachments

// Calendar view
/[projectId]/meetings/calendar
  - Month/week/day views
  - Create meetings by clicking date/time
  - Drag-and-drop reschedule
```
### Database Schema

#### Core Tables
```sql
-- Main meetings table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  template_id UUID REFERENCES meeting_templates(id),
  parent_meeting_id UUID REFERENCES meetings(id),  -- For follow-up meetings

  -- Basic details
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  description TEXT,

  -- State
  mode TEXT NOT NULL DEFAULT 'agenda' CHECK (mode IN ('agenda', 'minutes')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'agenda', 'minutes', 'distributed')),
  is_private BOOLEAN DEFAULT false,

  -- Meeting links
  video_conference_url TEXT,

  -- Distribution
  distributed_at TIMESTAMP WITH TIME ZONE,
  distributed_by UUID REFERENCES users(id),
  approval_enabled BOOLEAN DEFAULT false,
  comments_enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_times CHECK (start_time < end_time)
);

CREATE INDEX idx_meetings_project_date ON meetings(project_id, meeting_date DESC);
CREATE INDEX idx_meetings_parent ON meetings(parent_meeting_id);
CREATE INDEX idx_meetings_template ON meetings(template_id);

-- Meeting attendees (many-to-many)
CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id),

  -- Attendance tracking
  attendance_status TEXT CHECK (attendance_status IN ('present', 'absent', 'not_marked')),
  marked_at TIMESTAMP WITH TIME ZONE,

  -- Distribution
  included_in_distribution BOOLEAN DEFAULT true,
  distributed BOOLEAN DEFAULT false,

  -- Approval workflow
  approval_requested BOOLEAN DEFAULT false,
  approved BOOLEAN,
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,

  -- Notifications
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(meeting_id, person_id)
);

CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_person ON meeting_attendees(person_id);

-- Meeting categories
CREATE TABLE meeting_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES meeting_templates(id),

  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_categories_meeting ON meeting_categories(meeting_id, sort_order);
CREATE INDEX idx_meeting_categories_template ON meeting_categories(template_id, sort_order);

-- Meeting items (agenda/action items)
CREATE TABLE meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  category_id UUID REFERENCES meeting_categories(id) ON DELETE SET NULL,
  source_item_id UUID REFERENCES meeting_items(id),  -- For carried-over items

  -- Item details
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,  -- Meeting minutes for this item

  -- Status and priority
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'on_hold', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Assignment
  assignee_id UUID REFERENCES people(id),
  due_date DATE,
  cost_code_id UUID,  -- Link to cost codes if needed

  -- Organization
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_items_meeting ON meeting_items(meeting_id, sort_order);
CREATE INDEX idx_meeting_items_category ON meeting_items(category_id, sort_order);
CREATE INDEX idx_meeting_items_assignee ON meeting_items(assignee_id);
CREATE INDEX idx_meeting_items_status ON meeting_items(status);
CREATE INDEX idx_meeting_items_source ON meeting_items(source_item_id);

-- Meeting templates (company-level)
CREATE TABLE meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(id),

  name TEXT NOT NULL,
  description TEXT,

  -- Default meeting settings
  default_duration_minutes INTEGER DEFAULT 60,
  default_location TEXT,
  video_conference_enabled BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_templates_company ON meeting_templates(company_id);

-- Meeting attachments
CREATE TABLE meeting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  meeting_item_id UUID REFERENCES meeting_items(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,  -- Supabase storage path

  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT attachment_belongs_to_meeting_or_item
    CHECK ((meeting_id IS NOT NULL AND meeting_item_id IS NULL) OR
           (meeting_id IS NULL AND meeting_item_id IS NOT NULL))
);

CREATE INDEX idx_meeting_attachments_meeting ON meeting_attachments(meeting_id);
CREATE INDEX idx_meeting_attachments_item ON meeting_attachments(meeting_item_id);

-- RLS Policies (Row Level Security)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attachments ENABLE ROW LEVEL SECURITY;

-- View meetings in projects you're a member of
CREATE POLICY "Users can view meetings in their projects"
  ON meetings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_directory_memberships
      WHERE person_id = (SELECT id FROM people WHERE user_id = auth.uid())
    )
  );

-- Create/update meetings if you have permission
CREATE POLICY "Users can create meetings in their projects"
  ON meetings FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_directory_memberships
      WHERE person_id = (SELECT id FROM people WHERE user_id = auth.uid())
        AND (role IN ('Admin', 'Standard') OR can_create_meetings = true)
    )
  );

-- Similar policies for attendees, items, etc.
```
### API Endpoints

```typescript
// Meetings CRUD
GET    /api/projects/[projectId]/meetings
  - Query params: status, attendee_id, date_from, date_to, view (list|calendar)
POST   /api/projects/[projectId]/meetings
PUT    /api/projects/[projectId]/meetings/[meetingId]
DELETE /api/projects/[projectId]/meetings/[meetingId]

// Meeting modes and actions
POST   /api/projects/[projectId]/meetings/[meetingId]/convert-to-minutes
POST   /api/projects/[projectId]/meetings/[meetingId]/distribute
POST   /api/projects/[projectId]/meetings/[meetingId]/create-followup
POST   /api/projects/[projectId]/meetings/[meetingId]/export-pdf

// Attendees
GET    /api/projects/[projectId]/meetings/[meetingId]/attendees
POST   /api/projects/[projectId]/meetings/[meetingId]/attendees
PUT    /api/projects/[projectId]/meetings/[meetingId]/attendees/[attendeeId]
DELETE /api/projects/[projectId]/meetings/[meetingId]/attendees/[attendeeId]

// Meeting items (agenda/minutes)
GET    /api/projects/[projectId]/meetings/[meetingId]/items
POST   /api/projects/[projectId]/meetings/[meetingId]/items
PUT    /api/projects/[projectId]/meetings/[meetingId]/items/[itemId]
DELETE /api/projects/[projectId]/meetings/[meetingId]/items/[itemId]

// Categories
GET    /api/projects/[projectId]/meetings/[meetingId]/categories
POST   /api/projects/[projectId]/meetings/[meetingId]/categories
PUT    /api/projects/[projectId]/meetings/[meetingId]/categories/[categoryId]
DELETE /api/projects/[projectId]/meetings/[meetingId]/categories/[categoryId]

// Templates (company-level)
GET    /api/companies/[companyId]/meeting-templates
POST   /api/companies/[companyId]/meeting-templates
PUT    /api/companies/[companyId]/meeting-templates/[templateId]
DELETE /api/companies/[companyId]/meeting-templates/[templateId]

// Attachments
POST   /api/projects/[projectId]/meetings/[meetingId]/attachments
DELETE /api/projects/[projectId]/meetings/[meetingId]/attachments/[attachmentId]
```
### Components

```typescript
// List views
<MeetingsListPage />               // Main meetings list with filters
<MeetingCalendarView />            // Calendar visualization
<MeetingCard />                    // Meeting summary card

// Detail/editor views
<MeetingDetailPage />              // Tabbed interface for meeting
<MeetingDetailsTab />              // Basic info, date, time, location
<MeetingAgendaTab />               // Agenda items editor
<MeetingMinutesTab />              // Minutes recording interface
<MeetingAttendeesTab />            // Attendee management
<MeetingAttachmentsTab />          // File attachments

// Agenda/Minutes components
<MeetingItemList />                // List of agenda/action items
<MeetingItemCard />                // Individual item card
<MeetingItemEditor />              // Edit item dialog
<MeetingCategoryList />            // Category organizer
<AttendeeAttendanceMarker />       // Mark present/absent

// Forms and dialogs
<CreateMeetingDialog />            // New meeting form
<SelectTemplateDialog />           // Template picker
<MeetingItemFormDialog />          // Add/edit agenda item
<AddAttendeeDialog />              // Add attendee from directory
<DistributeMeetingDialog />        // Distribution settings
<ExportPDFDialog />                // PDF export options

// Shared components
<PriorityBadge />                  // Low/Medium/High indicator
<StatusBadge />                    // Open/OnHold/Closed indicator
<AttendanceStatusBadge />          // Present/Absent/NotMarked
<MeetingModeBadge />               // Agenda/Minutes indicator
```

### Special Features/Functionality

#### 1. **Agenda ↔ Minutes Mode Toggle**

- Meetings start in "Agenda" mode for planning
- Convert to "Minutes" mode during/after meeting
- Minutes mode adds:
  - Attendance marking for attendees
  - Notes field for each agenda item
  - Status tracking (Open/OnHold/Closed)
  - Assignee and due date for action items

#### 2. **Auto-Carryover of Open Items**

- When creating follow-up meeting
- Open and On-Hold items automatically copy to new meeting
- Link to source item maintained (source_item_id)
- Status resets to Open in new meeting

#### 3. **Category-Based Organization**

- Agenda items grouped by categories
- Drag-and-drop reordering within categories
- Categories defined per meeting or from template
- Optional linear view (no categories)

#### 4. **Meeting Templates**

- Company-level reusable templates
- Include predefined:
  - Categories
  - Agenda items
  - Default duration
  - Default location
- Examples: OAC Meeting, Safety Meeting, Weekly Progress

#### 5. **PDF Export**

- Generate PDF with:
  - Meeting details
  - Attendee list with attendance
  - All agenda/action items
  - Attachments list
  - Company branding (optional)
  - Custom footer text
- Filter items by status (e.g., only open items)

#### 6. **Email Distribution**

- Send minutes to attendees
- Include PDF attachment or Procore link
- Track distribution history
- Redistribution capability

#### 7. **Approval Workflow**

- Enable per-meeting approval requests
- Attendees can approve minutes
- Attendees can add comments
- Track approval status

#### 8. **Rich Text Editing**

- Meeting descriptions
- Agenda item descriptions
- Meeting minutes/notes
- Table support
- List formatting
- Auto-save

#### 9. **File Attachments**

- Attach to entire meeting
- Attach to specific agenda items
- Link to Document Management files
- Export all attachments as zip

#### 10. **Calendar Integration**

- Export to ICS format
- Add to personal calendars (Outlook, Google, Apple)
- Video conference links (Teams, Zoom)
- One-way sync (Procore → personal calendar)

### Table Columns

**Meetings List:**

- Meeting Title
- Date & Time
- Location
- Status (Draft, Agenda, Minutes, Distributed)
- Attendees Count
- Open Items Count
- Last Updated
- Actions (View, Edit, Delete, Duplicate, Create Followup)

**Agenda Items Table:**

- Priority (Icon)
- Title
- Description
- Category
- Status (Open, On Hold, Closed)
- Assignee
- Due Date
- Actions (Edit, Delete, Move)

**Attendees Table:**

- Name
- Company
- Role
- Attendance (Present/Absent/Not Marked)
- Include in Distribution (Checkbox)
- Approval Status (if enabled)
- Actions (Remove, Email)

### Frontend Form & Form Fields

#### Create/Edit Meeting Form

```typescript
interface MeetingFormData {
  // Basic details
  title: string;                     // Required, max 255 chars
  meeting_date: Date;                // Required, date picker
  start_time: string;                // Required, time picker (HH:MM)
  end_time: string;                  // Optional, time picker
  duration_minutes: number;          // Auto-calculated or manual
  location: string;                  // Optional, text input
  description: string;               // Optional, rich text editor

  // Template
  template_id: string | null;        // Template selector dropdown

  // Settings
  is_private: boolean;               // Checkbox
  approval_enabled: boolean;         // Checkbox
  comments_enabled: boolean;         // Checkbox
  video_conference_url: string;      // Optional, URL input

  // Attendees
  attendee_ids: string[];            // Multi-select from directory
}
```
**Validation Rules:**
- title: Required, 1-255 characters
- meeting_date: Required, cannot be in distant past
- start_time: Required, format HH:MM
- end_time: If provided, must be after start_time
- duration_minutes: If manual, must be positive integer
- video_conference_url: If provided, must be valid URL

#### Meeting Item Form
```typescript
interface MeetingItemFormData {
  title: string;                     // Required, max 255 chars
  description: string;               // Optional, rich text
  category_id: string | null;        // Dropdown, nullable
  priority: 'low' | 'medium' | 'high'; // Required, radio buttons
  status: 'open' | 'on_hold' | 'closed'; // Required, dropdown

  // Assignment (for action items)
  assignee_id: string | null;        // Person selector
  due_date: Date | null;             // Date picker
  cost_code_id: string | null;       // Cost code selector

  // Attachments
  attachments: File[];               // File upload
}
```
#### Attendee Attendance Form (Minutes Mode)

```typescript
interface AttendanceFormData {
  attendee_id: string;
  attendance_status: 'present' | 'absent' | 'not_marked';
  marked_at: Date;
}
```
#### Distribution Form
```typescript
interface DistributionFormData {
  include_pdf: boolean;              // Checkbox
  recipient_ids: string[];           // Auto-populated from attendees
  request_approval: boolean;         // Checkbox
  custom_message: string;            // Optional, textarea
  pdf_options: {
    include_attachments_list: boolean;
    filter_by_status: 'all' | 'open' | 'closed';
    include_previous_minutes: boolean;
  };
}
```

---

## All Needed Context

### Context Completeness Check

**Validation Question:** _"If someone knew nothing about this TypeScript/Next.js codebase, would they have everything needed to implement meetings successfully?"_

**Answer:** ✅ Yes. This PRP provides:

- Complete database schema with indexes and RLS
- All API endpoint specifications with types
- Component hierarchy and responsibilities
- Form structures with validation rules
- Integration points with existing features (directory, schedule, documents)
- Procore feature documentation for behavior reference
- Existing scheduling patterns to follow
- Calendar library recommendations

---

### Documentation & References

```yaml
# MUST READ - TypeScript/React Patterns

- file: frontend/src/lib/services/scheduling-service.ts
  why: Service class pattern for time-based entities (tasks → meetings)
  pattern: CRUD methods, hierarchy validation, bulk operations, analytics
  gotcha: Use timestamptz (not date) for meetings, timezone handling critical

- file: frontend/src/hooks/use-schedule-tasks.ts
  why: React Query pattern with race condition prevention
  pattern: Parallel data fetching, multiple view modes, cancellation handling
  gotcha: Must use cancelledRef to prevent state updates on unmounted components

- file: frontend/src/components/scheduling/schedule-views.tsx
  why: Multi-view pattern (list, board, calendar, timeline)
  pattern: View switching, drag-and-drop, status badges, context menus
  gotcha: Calendar view uses date-fns for calculations, not moment/dayjs

- file: frontend/src/app/api/projects/[projectId]/scheduling/tasks/route.ts
  why: REST API pattern with view modes
  pattern: Query parameters (?view=list|calendar), pagination, validation
  gotcha: Use [projectId] NOT [id] in route names (Next.js routing rule)

- file: frontend/src/types/scheduling.ts
  why: TypeScript interface patterns for time-based entities
  pattern: Status enums, create/update payloads, paginated responses
  gotcha: All date fields are string (ISO format), parse with new Date()

- file: frontend/src/components/ui/calendar.tsx
  why: Existing shadcn/ui calendar component (react-day-picker)
  pattern: Date picker, range selection, month navigation
  gotcha: Uses date-fns for all date operations

- file: supabase/migrations/20260131_000001_schema.sql
  why: Database schema patterns for schedule_tasks, dependencies, deadlines
  pattern: UUID PKs, INTEGER project_id FK, CHECK constraints, RLS policies
  gotcha: schedule_tasks uses DATE (not timestamptz), meetings MUST use timestamptz

# CRITICAL External Documentation

- url: https://schedule-x.dev/docs/frameworks/react
  why: Schedule-X React component for calendar views
  critical: Use useNextCalendarApp hook for Next.js 15, shadcn/ui theme available
  section: Getting started, Next.js integration, Event handling

- url: https://date-fns.org/v4.1.0/docs/Getting-Started
  why: Date manipulation library (already in project at v4.1.0)
  critical: All date operations use date-fns (format, add/sub, diff, compare)
  section: format, addDays, differenceInMinutes, isBefore, parseISO

- url: https://react-day-picker.js.org/
  why: Calendar picker component (already in project at v9.13.0)
  critical: Used by shadcn/ui calendar, month/day/range selection
  section: Selecting Days, Custom Components

- url: https://supabase.com/docs/guides/database/postgres/row-level-security
  why: RLS policy patterns for Supabase
  critical: Meetings must check project membership via joins
  section: Policy examples, Using auth.uid()

- url: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
  why: Next.js 15 App Router API route patterns
  critical: Named exports (GET, POST), Request/Response objects, revalidation
  section: Supported HTTP Methods, Dynamic Route Segments

- url: https://react-hook-form.com/docs
  why: Form handling library (check if already in project)
  critical: If not using, implement controlled forms with useState
  section: useForm, register, handleSubmit, validation

# Procore Feature Documentation (Behavior Reference)

- url: https://support.procore.com/products/online/user-guide/project-level/meetings
  why: Complete Procore meetings feature specification
  critical: Defines expected behavior for all features
  section: Create a Meeting, Record Minutes, Distribute Minutes

- url: https://support.procore.com/products/online/user-guide/project-level/meetings/tutorials/create-a-follow-up-meeting
  why: Follow-up meeting behavior (auto-carryover logic)
  critical: Open/OnHold items copy to new meeting, status resets to Open
  section: Creating follow-up meetings

- url: https://support.procore.com/products/online/user-guide/company-level/admin/tutorials/create-a-meeting-template
  why: Template system behavior
  critical: Templates are company-level, include categories and default items
  section: Creating templates

# Custom Documentation for Complex Patterns

- docfile: PRPs/meetings/docs/calendar-integration.md
  why: ICS file generation for calendar export
  section: ics-generator library usage, timezone handling

- docfile: PRPs/meetings/docs/pdf-export.md
  why: PDF generation with company branding
  section: react-pdf or puppeteer approach, template structure

- docfile: PRPs/meetings/docs/email-distribution.md
  why: Email sending with Resend/SendGrid integration
  section: Template structure, attachment handling
```
### Current Codebase Tree

```bash
frontend/src/
├── app/
│   ├── (main)/
│   │   └── [projectId]/
│   │       ├── schedule/page.tsx          # Similar pattern for meetings
│   │       ├── directory/
│   │       │   └── people/                # Source for attendees
│   │       └── documents/                 # Attachment linking
│   └── api/
│       └── projects/
│           └── [projectId]/
│               ├── scheduling/
│               │   └── tasks/route.ts     # Pattern to follow
│               └── directory/
│                   └── people/route.ts    # For attendee lookup
├── components/
│   ├── scheduling/
│   │   ├── schedule-views.tsx            # Multi-view pattern
│   │   ├── task-table.tsx                # List pattern
│   │   ├── gantt-chart.tsx               # Timeline visualization
│   │   └── task-edit-modal.tsx           # CRUD modal pattern
│   ├── ui/
│   │   ├── calendar.tsx                  # Date picker (reuse)
│   │   ├── button.tsx, badge.tsx         # shadcn/ui primitives
│   │   ├── dialog.tsx, form.tsx          # Modal and form patterns
│   │   └── select.tsx, checkbox.tsx      # Form inputs
│   └── directory/
│       └── person-selector.tsx           # For attendee selection
├── hooks/
│   ├── use-schedule-tasks.ts             # Pattern for use-meetings.ts
│   └── use-companies.ts                  # Pattern for company-level templates
├── lib/
│   ├── services/
│   │   └── scheduling-service.ts         # Pattern for meetings-service.ts
│   └── supabase/
│       ├── client.ts                     # Browser client
│       └── server.ts                     # Server/SSR client
└── types/
    ├── scheduling.ts                     # Pattern for meetings.ts
    └── database.types.ts                 # Generated Supabase types

supabase/
└── migrations/
    └── 20260131_000001_schema.sql        # Existing schema (schedule_tasks reference)
```
### Desired Codebase Tree

```bash
frontend/src/
├── app/
│   ├── (main)/
│   │   └── [projectId]/
│   │       ├── meetings/
│   │       │   ├── page.tsx                           # List view (with calendar toggle)
│   │       │   ├── [meetingId]/
│   │       │   │   └── page.tsx                       # Detail/editor view
│   │       │   └── calendar/
│   │       │       └── page.tsx                       # Full calendar view
│   │       └── directory/
│   │           └── people/
│   │               └── [personId]/
│   │                   └── meetings/page.tsx          # Person's meetings
│   └── api/
│       ├── projects/
│       │   └── [projectId]/
│       │       └── meetings/
│       │           ├── route.ts                       # GET list, POST create
│       │           ├── [meetingId]/
│       │           │   ├── route.ts                   # GET, PUT, DELETE
│       │           │   ├── convert-to-minutes/route.ts
│       │           │   ├── distribute/route.ts
│       │           │   ├── create-followup/route.ts
│       │           │   ├── export-pdf/route.ts
│       │           │   ├── attendees/
│       │           │   │   ├── route.ts               # GET list, POST add
│       │           │   │   └── [attendeeId]/route.ts  # PUT, DELETE
│       │           │   ├── items/
│       │           │   │   ├── route.ts               # GET list, POST create
│       │           │   │   └── [itemId]/route.ts      # PUT, DELETE
│       │           │   ├── categories/
│       │           │   │   ├── route.ts
│       │           │   │   └── [categoryId]/route.ts
│       │           │   └── attachments/
│       │           │       ├── route.ts
│       │           │       └── [attachmentId]/route.ts
│       │           └── calendar/route.ts              # Calendar view data
│       └── companies/
│           └── [companyId]/
│               └── meeting-templates/
│                   ├── route.ts
│                   └── [templateId]/route.ts
├── components/
│   └── meetings/
│       ├── meetings-list.tsx                          # Main list component
│       ├── meeting-card.tsx                           # Summary card
│       ├── meeting-calendar-view.tsx                  # Calendar visualization
│       ├── meeting-detail-page.tsx                    # Tabbed detail view
│       ├── meeting-details-tab.tsx                    # Basic info tab
│       ├── meeting-agenda-tab.tsx                     # Agenda editor
│       ├── meeting-minutes-tab.tsx                    # Minutes recorder
│       ├── meeting-attendees-tab.tsx                  # Attendee management
│       ├── meeting-attachments-tab.tsx                # File attachments
│       ├── meeting-item-list.tsx                      # Agenda/action items list
│       ├── meeting-item-card.tsx                      # Individual item
│       ├── meeting-item-editor.tsx                    # Add/edit item dialog
│       ├── meeting-category-list.tsx                  # Category organizer
│       ├── attendee-attendance-marker.tsx             # Mark attendance
│       ├── create-meeting-dialog.tsx                  # New meeting form
│       ├── select-template-dialog.tsx                 # Template picker
│       ├── add-attendee-dialog.tsx                    # Add attendee
│       ├── distribute-meeting-dialog.tsx              # Distribution form
│       ├── export-pdf-dialog.tsx                      # PDF options
│       ├── priority-badge.tsx                         # Low/Medium/High
│       ├── status-badge.tsx                           # Open/OnHold/Closed
│       ├── attendance-status-badge.tsx                # Present/Absent
│       └── meeting-mode-badge.tsx                     # Agenda/Minutes
├── hooks/
│   ├── use-meetings.ts                                # Main data fetching
│   ├── use-meeting-items.ts                           # Items CRUD
│   ├── use-meeting-attendees.ts                       # Attendees CRUD
│   ├── use-meeting-templates.ts                       # Templates
│   └── use-meeting-actions.ts                         # Convert, distribute, etc.
├── lib/
│   └── services/
│       ├── meetings-service.ts                        # Business logic
│       ├── meeting-templates-service.ts               # Template management
│       ├── meeting-pdf-service.ts                     # PDF generation
│       └── meeting-email-service.ts                   # Email distribution
└── types/
    └── meetings.ts                                    # All meeting interfaces

supabase/
└── migrations/
    ├── 202602XX_create_meetings_tables.sql
    ├── 202602XX_create_meeting_templates.sql
    └── 202602XX_add_meeting_attachments.sql
```
### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Timezone Handling
// Meetings MUST use timestamptz (not date like schedule_tasks)
// Always store in UTC, convert to user timezone for display
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Store
const utcTime = zonedTimeToUtc(localTime, userTimezone);
await supabase.from('meetings').insert({ start_time: utcTime.toISOString() });

// Display
const localTime = utcToZonedTime(meeting.start_time, userTimezone);
const formatted = format(localTime, 'MMM dd, yyyy hh:mm a zzz');

// CRITICAL: Next.js 15 App Router - Route naming
// Use specific parameter names, NOT generic [id]
// ✅ [projectId], [meetingId], [attendeeId]
// ❌ [id] - causes routing conflicts

// CRITICAL: RLS Policies
// Must join through project_directory_memberships to verify access
CREATE POLICY "Users can view meetings in their projects"
  ON meetings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_directory_memberships
      WHERE person_id = (SELECT id FROM people WHERE user_id = auth.uid())
    )
  );

// CRITICAL: Schedule-X Calendar Integration
// Must use 'use client' directive
'use client'
import { useNextCalendarApp } from '@schedule-x/react'
import 'temporal-polyfill/global'  // Required polyfill
import '@schedule-x/theme-shadcn/dist/index.css'

// CRITICAL: date-fns v4 Import Pattern
// Tree-shakeable - import only what you need
import { format, addDays, differenceInMinutes, parseISO } from 'date-fns';
// NOT: import * as dateFns from 'date-fns';

// GOTCHA: Meeting Mode Transition
// Converting to minutes mode is ONE-WAY
// Cannot revert from minutes back to agenda
// Add confirmation dialog before conversion

// GOTCHA: Follow-up Meeting Item Carryover
// Only items with status 'open' or 'on_hold' carry over
// source_item_id links to original item
// Status resets to 'open' in new meeting

// GOTCHA: Attendee Approval Workflow
// approval_enabled must be set BEFORE distribution
// Cannot enable approval after distributing
// Redistributing does NOT reset approval status

// GOTCHA: File Attachments Storage
// Use Supabase Storage (not filesystem)
// Store path in database, actual file in storage bucket
// Generate presigned URLs for download links
const { data } = await supabase.storage
  .from('meeting-attachments')
  .createSignedUrl(storage_path, 3600);  // 1 hour expiry

// GOTCHA: Rich Text Editor
// Use existing TipTap or Quill if in project
// Store as HTML string in database
// Sanitize on render to prevent XSS
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(meeting.description);

// GOTCHA: PDF Export
// react-pdf has SSR issues with Next.js
// Use dynamic import with ssr: false
const PDFGenerator = dynamic(() => import('@/components/meetings/pdf-generator'), {
  ssr: false,
});

// CRITICAL: Email Sending
// Use Resend (already in project?) or Supabase Edge Functions
// Never expose API keys in client-side code
// Rate limit distribution endpoints

// GOTCHA: Calendar ICS Export
// Use 'ics' library for ICS file generation
// Include VTIMEZONE component for timezone support
// Add VALARM for reminders
import { createEvent } from 'ics';
const event = createEvent({
  start: [2024, 2, 15, 14, 30],  // [year, month, day, hour, minute]
  duration: { hours: 1, minutes: 30 },
  title: meeting.title,
  location: meeting.location,
  url: meeting.video_conference_url,
  alarms: [{ action: 'display', trigger: { hours: 1, before: true } }],
});
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// ===== Core Types =====

export type MeetingMode = 'agenda' | 'minutes';
export type MeetingStatus = 'draft' | 'agenda' | 'minutes' | 'distributed';
export type ItemStatus = 'open' | 'on_hold' | 'closed';
export type ItemPriority = 'low' | 'medium' | 'high';
export type AttendanceStatus = 'present' | 'absent' | 'not_marked';

// ===== Main Entities =====

export interface Meeting {
  id: string;
  project_id: number;
  template_id: string | null;
  parent_meeting_id: string | null;

  // Basic details
  title: string;
  meeting_date: string;              // ISO date
  start_time: string;                // HH:MM format
  end_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  description: string | null;

  // State
  mode: MeetingMode;
  status: MeetingStatus;
  is_private: boolean;

  // Links
  video_conference_url: string | null;

  // Distribution
  distributed_at: string | null;
  distributed_by: string | null;
  approval_enabled: boolean;
  comments_enabled: boolean;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;

  // Derived fields (joins)
  attendees?: MeetingAttendee[];
  items?: MeetingItem[];
  categories?: MeetingCategory[];
  attachments?: MeetingAttachment[];
  template?: MeetingTemplate;
  statistics?: MeetingStatistics;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  person_id: string;

  // Attendance
  attendance_status: AttendanceStatus | null;
  marked_at: string | null;

  // Distribution
  included_in_distribution: boolean;
  distributed: boolean;

  // Approval
  approval_requested: boolean;
  approved: boolean | null;
  approved_at: string | null;
  comments: string | null;

  // Notifications
  notified: boolean;
  notified_at: string | null;

  created_at: string;

  // Derived
  person?: Person;
}

export interface MeetingItem {
  id: string;
  meeting_id: string;
  category_id: string | null;
  source_item_id: string | null;

  // Content
  title: string;
  description: string | null;
  notes: string | null;

  // Status
  status: ItemStatus;
  priority: ItemPriority;

  // Assignment
  assignee_id: string | null;
  due_date: string | null;
  cost_code_id: string | null;

  // Organization
  sort_order: number;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;

  // Derived
  assignee?: Person;
  category?: MeetingCategory;
  source_item?: MeetingItem;
  attachments?: MeetingAttachment[];
}

export interface MeetingCategory {
  id: string;
  meeting_id: string | null;
  template_id: string | null;

  name: string;
  description: string | null;
  sort_order: number;

  created_at: string;
  updated_at: string;

  // Derived
  items?: MeetingItem[];
}

export interface MeetingTemplate {
  id: string;
  company_id: number;

  name: string;
  description: string | null;

  // Defaults
  default_duration_minutes: number;
  default_location: string | null;
  video_conference_enabled: boolean;

  is_active: boolean;

  created_by: string;
  created_at: string;
  updated_at: string;

  // Derived
  categories?: MeetingCategory[];
}

export interface MeetingAttachment {
  id: string;
  meeting_id: string | null;
  meeting_item_id: string | null;

  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;

  uploaded_by: string;
  uploaded_at: string;

  // Derived
  download_url?: string;  // Presigned URL
}

// ===== Statistics =====

export interface MeetingStatistics {
  total_items: number;
  open_items: number;
  on_hold_items: number;
  closed_items: number;
  total_attendees: number;
  present_count: number;
  absent_count: number;
  not_marked_count: number;
}

// ===== Create/Update Payloads =====

export interface MeetingCreate {
  project_id: number;
  template_id?: string | null;

  title: string;
  meeting_date: string;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  description?: string | null;

  is_private?: boolean;
  approval_enabled?: boolean;
  comments_enabled?: boolean;
  video_conference_url?: string | null;

  // Initial attendees
  attendee_ids?: string[];
}

export interface MeetingUpdate {
  title?: string;
  meeting_date?: string;
  start_time?: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  description?: string | null;

  mode?: MeetingMode;
  status?: MeetingStatus;
  is_private?: boolean;
  approval_enabled?: boolean;
  comments_enabled?: boolean;
  video_conference_url?: string | null;
}

export interface MeetingItemCreate {
  meeting_id: string;
  category_id?: string | null;

  title: string;
  description?: string | null;
  priority?: ItemPriority;
  status?: ItemStatus;

  assignee_id?: string | null;
  due_date?: string | null;
  cost_code_id?: string | null;
}

export interface MeetingItemUpdate {
  title?: string;
  description?: string | null;
  notes?: string | null;
  category_id?: string | null;

  status?: ItemStatus;
  priority?: ItemPriority;

  assignee_id?: string | null;
  due_date?: string | null;
  cost_code_id?: string | null;
  sort_order?: number;
}

export interface MeetingAttendeeCreate {
  meeting_id: string;
  person_id: string;
  included_in_distribution?: boolean;
}

export interface MeetingAttendeeUpdate {
  attendance_status?: AttendanceStatus;
  included_in_distribution?: boolean;
  approved?: boolean;
  comments?: string | null;
}

// ===== List Parameters =====

export interface MeetingListParams {
  page?: number;
  limit?: number;
  sort?: 'meeting_date' | 'title' | 'updated_at';
  order?: 'asc' | 'desc';

  // Filters
  status?: MeetingStatus | 'all';
  attendee_id?: string;
  date_from?: string;
  date_to?: string;

  // View mode
  view?: 'list' | 'calendar';
}

export interface MeetingItemListParams {
  status?: ItemStatus | 'all';
  category_id?: string | null;
  assignee_id?: string;
}

// ===== Calendar View =====

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource?: Meeting;
}

export interface CalendarRange {
  start: Date;
  end: Date;
}

// ===== PDF Export =====

export interface PDFExportOptions {
  include_attachments_list: boolean;
  filter_by_status: 'all' | 'open' | 'closed';
  include_previous_minutes: boolean;
  custom_footer?: string;
}

// ===== Distribution =====

export interface DistributionRequest {
  include_pdf: boolean;
  recipient_ids: string[];
  request_approval: boolean;
  custom_message?: string;
  pdf_options?: PDFExportOptions;
}

// ===== Response Wrappers =====

export interface MeetingsPaginatedResponse {
  data: Meeting[];
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

export interface MeetingDetailResponse {
  meeting: Meeting;
  statistics: MeetingStatistics;
}
```
### Implementation Tasks (Ordered by Dependencies)

```yaml
# ========== PHASE 1: Database Foundation ==========

Task 1: CREATE supabase/migrations/202602XX_create_meetings_tables.sql
  - IMPLEMENT: meetings, meeting_attendees, meeting_items, meeting_categories tables
  - FOLLOW pattern: supabase/migrations/20260131_000001_schema.sql (schedule_tasks reference)
  - NAMING: Use timestamptz for start_time/end_time (NOT date like schedule_tasks)
  - PLACEMENT: supabase/migrations/
  - VERIFY: Run migration locally, check with \d meetings in psql

Task 2: CREATE supabase/migrations/202602XX_create_meeting_templates.sql
  - IMPLEMENT: meeting_templates table (company-level)
  - DEPENDENCIES: Task 1 (meetings tables)
  - NAMING: Company-scoped, not project-scoped
  - PLACEMENT: supabase/migrations/

Task 3: CREATE supabase/migrations/202602XX_add_meeting_attachments.sql
  - IMPLEMENT: meeting_attachments table with dual FK (meeting OR item)
  - DEPENDENCIES: Task 1
  - NAMING: storage_path column for Supabase Storage reference
  - PLACEMENT: supabase/migrations/

Task 4: GENERATE Supabase types
  - RUN: npm run db:types (from frontend dir)
  - VERIFY: Check frontend/src/types/database.types.ts for new tables
  - DEPENDENCIES: Tasks 1-3

# ========== PHASE 2: TypeScript Types ==========

Task 5: CREATE frontend/src/types/meetings.ts
  - IMPLEMENT: All TypeScript interfaces from "Data Models and Structure" section
  - FOLLOW pattern: frontend/src/types/scheduling.ts
  - NAMING: PascalCase for interfaces, camelCase for properties
  - PLACEMENT: frontend/src/types/
  - DEPENDENCIES: Task 4 (generated types)

# ========== PHASE 3: Service Layer ==========

Task 6: CREATE frontend/src/lib/services/meetings-service.ts
  - IMPLEMENT: MeetingsService class with CRUD methods
  - FOLLOW pattern: frontend/src/lib/services/scheduling-service.ts
  - METHODS: listMeetings, getMeetingById, createMeeting, updateMeeting, deleteMeeting
  - ADDITIONAL: convertToMinutes, createFollowup, getMeetingStatistics
  - DEPENDENCIES: Task 5 (types)
  - PLACEMENT: frontend/src/lib/services/

Task 7: CREATE frontend/src/lib/services/meeting-items-service.ts
  - IMPLEMENT: MeetingItemsService class
  - METHODS: listItems, createItem, updateItem, deleteItem, bulkUpdateStatus
  - FOLLOW pattern: Task 6
  - DEPENDENCIES: Task 5 (types)
  - PLACEMENT: frontend/src/lib/services/

Task 8: CREATE frontend/src/lib/services/meeting-templates-service.ts
  - IMPLEMENT: MeetingTemplatesService class (company-level)
  - METHODS: listTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate
  - DEPENDENCIES: Task 5 (types)
  - PLACEMENT: frontend/src/lib/services/

# ========== PHASE 4: API Routes ==========

Task 9: CREATE frontend/src/app/api/projects/[projectId]/meetings/route.ts
  - IMPLEMENT: GET (list), POST (create)
  - FOLLOW pattern: frontend/src/app/api/projects/[projectId]/scheduling/tasks/route.ts
  - NAMING: Use [projectId] NOT [id]
  - DEPENDENCIES: Task 6 (service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/
  - VALIDATION: title required, meeting_date required, start_time < end_time

Task 10: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts
  - IMPLEMENT: GET, PUT, DELETE
  - DEPENDENCIES: Task 6 (service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/

Task 11: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/items/route.ts
  - IMPLEMENT: GET (list), POST (create)
  - DEPENDENCIES: Task 7 (items service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/items/

Task 12: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/items/[itemId]/route.ts
  - IMPLEMENT: PUT, DELETE
  - DEPENDENCIES: Task 7 (items service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/items/[itemId]/

Task 13: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/attendees/route.ts
  - IMPLEMENT: GET (list), POST (add attendee)
  - DEPENDENCIES: Task 6 (service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/attendees/

Task 14: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/attendees/[attendeeId]/route.ts
  - IMPLEMENT: PUT (update attendance), DELETE (remove)
  - DEPENDENCIES: Task 6 (service)

Task 15: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/convert-to-minutes/route.ts
  - IMPLEMENT: POST - convert agenda to minutes mode (one-way operation)
  - DEPENDENCIES: Task 6 (service)
  - VALIDATION: Add confirmation in frontend before calling

Task 16: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/create-followup/route.ts
  - IMPLEMENT: POST - create follow-up meeting with auto-carryover
  - DEPENDENCIES: Task 6 (service)
  - LOGIC: Copy open/on_hold items, reset status to open, link via source_item_id

Task 17: CREATE frontend/src/app/api/companies/[companyId]/meeting-templates/route.ts
  - IMPLEMENT: GET (list), POST (create)
  - DEPENDENCIES: Task 8 (templates service)
  - PLACEMENT: frontend/src/app/api/companies/[companyId]/meeting-templates/

# ========== PHASE 5: React Hooks ==========

Task 18: CREATE frontend/src/hooks/use-meetings.ts
  - IMPLEMENT: useMeetings hook with race condition prevention
  - FOLLOW pattern: frontend/src/hooks/use-schedule-tasks.ts
  - DEPENDENCIES: Task 9-10 (API routes)
  - PLACEMENT: frontend/src/hooks/
  - FEATURES: Parallel fetching, multiple views (list|calendar), cancelledRef

Task 19: CREATE frontend/src/hooks/use-meeting-items.ts
  - IMPLEMENT: useMeetingItems hook for agenda/action items
  - DEPENDENCIES: Task 11-12 (items API)
  - PLACEMENT: frontend/src/hooks/

Task 20: CREATE frontend/src/hooks/use-meeting-attendees.ts
  - IMPLEMENT: useMeetingAttendees hook
  - DEPENDENCIES: Task 13-14 (attendees API)
  - PLACEMENT: frontend/src/hooks/

Task 21: CREATE frontend/src/hooks/use-meeting-templates.ts
  - IMPLEMENT: useMeetingTemplates hook (company-level)
  - DEPENDENCIES: Task 17 (templates API)
  - PLACEMENT: frontend/src/hooks/

Task 22: CREATE frontend/src/hooks/use-meeting-actions.ts
  - IMPLEMENT: Mutation hooks for convert, distribute, export, followup
  - DEPENDENCIES: Tasks 15-16 (action API routes)
  - PLACEMENT: frontend/src/hooks/

# ========== PHASE 6: Shared UI Components ==========

Task 23: CREATE frontend/src/components/meetings/priority-badge.tsx
  - IMPLEMENT: Low/Medium/High priority indicator
  - FOLLOW pattern: frontend/src/components/scheduling/* (status badges)
  - DEPENDENCIES: None (uses shadcn/ui Badge)
  - PLACEMENT: frontend/src/components/meetings/

Task 24: CREATE frontend/src/components/meetings/status-badge.tsx
  - IMPLEMENT: Open/OnHold/Closed status badge
  - DEPENDENCIES: None
  - PLACEMENT: frontend/src/components/meetings/

Task 25: CREATE frontend/src/components/meetings/attendance-status-badge.tsx
  - IMPLEMENT: Present/Absent/NotMarked badge
  - DEPENDENCIES: None
  - PLACEMENT: frontend/src/components/meetings/

Task 26: CREATE frontend/src/components/meetings/meeting-mode-badge.tsx
  - IMPLEMENT: Agenda/Minutes mode indicator
  - DEPENDENCIES: None
  - PLACEMENT: frontend/src/components/meetings/

# ========== PHASE 7: Form Components ==========

Task 27: CREATE frontend/src/components/meetings/create-meeting-dialog.tsx
  - IMPLEMENT: New meeting form with validation
  - FOLLOW pattern: frontend/src/components/scheduling/task-edit-modal.tsx
  - DEPENDENCIES: Task 18 (useMeetings), Task 21 (useTemplates)
  - PLACEMENT: frontend/src/components/meetings/
  - FIELDS: title*, meeting_date*, start_time*, end_time, location, template_id
  - VALIDATION: Zod schema, start < end, date not in distant past

Task 28: CREATE frontend/src/components/meetings/meeting-item-editor.tsx
  - IMPLEMENT: Add/edit agenda/action item dialog
  - DEPENDENCIES: Task 19 (useItems)
  - PLACEMENT: frontend/src/components/meetings/
  - FIELDS: title*, description, category, priority, status, assignee, due_date

Task 29: CREATE frontend/src/components/meetings/add-attendee-dialog.tsx
  - IMPLEMENT: Person selector for adding attendees
  - FOLLOW pattern: existing person selector components
  - DEPENDENCIES: Task 20 (useAttendees)
  - PLACEMENT: frontend/src/components/meetings/

# ========== PHASE 8: Agenda/Minutes Components ==========

Task 30: CREATE frontend/src/components/meetings/meeting-item-card.tsx
  - IMPLEMENT: Individual agenda/action item card
  - DEPENDENCIES: Tasks 23-24 (badges), Task 28 (editor)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Inline edit on double-click, drag handle, context menu

Task 31: CREATE frontend/src/components/meetings/meeting-item-list.tsx
  - IMPLEMENT: List of agenda/action items with sorting
  - DEPENDENCIES: Task 30 (item card)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Category grouping, drag-and-drop reorder, filter by status

Task 32: CREATE frontend/src/components/meetings/meeting-category-list.tsx
  - IMPLEMENT: Category organizer with add/edit/delete
  - DEPENDENCIES: None
  - PLACEMENT: frontend/src/components/meetings/

Task 33: CREATE frontend/src/components/meetings/attendee-attendance-marker.tsx
  - IMPLEMENT: Mark attendance (present/absent) for minutes mode
  - DEPENDENCIES: Task 20 (useAttendees), Task 25 (attendance badge)
  - PLACEMENT: frontend/src/components/meetings/

# ========== PHASE 9: Tab Components ==========

Task 34: CREATE frontend/src/components/meetings/meeting-details-tab.tsx
  - IMPLEMENT: Basic info tab (title, date, time, location, description)
  - DEPENDENCIES: Task 27 (form validation patterns)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Inline editing, rich text description

Task 35: CREATE frontend/src/components/meetings/meeting-agenda-tab.tsx
  - IMPLEMENT: Agenda editor with categories and items
  - DEPENDENCIES: Tasks 31-32 (items + categories)
  - PLACEMENT: frontend/src/components/meetings/

Task 36: CREATE frontend/src/components/meetings/meeting-minutes-tab.tsx
  - IMPLEMENT: Minutes recorder with attendance marking
  - DEPENDENCIES: Tasks 31, 33 (items + attendance)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Convert button, attendance marker, notes fields

Task 37: CREATE frontend/src/components/meetings/meeting-attendees-tab.tsx
  - IMPLEMENT: Attendee list with add/remove
  - DEPENDENCIES: Task 29 (add dialog), Task 20 (useAttendees)
  - PLACEMENT: frontend/src/components/meetings/

Task 38: CREATE frontend/src/components/meetings/meeting-attachments-tab.tsx
  - IMPLEMENT: File upload and list
  - DEPENDENCIES: Supabase Storage setup
  - PLACEMENT: frontend/src/components/meetings/

# ========== PHASE 10: Main Pages ==========

Task 39: CREATE frontend/src/components/meetings/meeting-card.tsx
  - IMPLEMENT: Summary card for list view
  - DEPENDENCIES: Tasks 23-26 (badges)
  - PLACEMENT: frontend/src/components/meetings/
  - DISPLAY: Title, date, attendee count, item count, status

Task 40: CREATE frontend/src/components/meetings/meetings-list.tsx
  - IMPLEMENT: Main meetings list with filters
  - DEPENDENCIES: Task 39 (card), Task 18 (useMeetings)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Search, status filter, date range filter, attendee filter

Task 41: CREATE frontend/src/app/(main)/[projectId]/meetings/page.tsx
  - IMPLEMENT: Meetings list page
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/schedule/page.tsx
  - DEPENDENCIES: Task 40 (list component), Task 27 (create dialog)
  - PLACEMENT: frontend/src/app/(main)/[projectId]/meetings/

Task 42: CREATE frontend/src/components/meetings/meeting-detail-page.tsx
  - IMPLEMENT: Tabbed interface for meeting detail
  - DEPENDENCIES: Tasks 34-38 (all tabs)
  - PLACEMENT: frontend/src/components/meetings/
  - TABS: Details, Agenda/Minutes, Attendees, Attachments

Task 43: CREATE frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx
  - IMPLEMENT: Meeting detail page route
  - DEPENDENCIES: Task 42 (detail component)
  - PLACEMENT: frontend/src/app/(main)/[projectId]/meetings/[meetingId]/

# ========== PHASE 11: Calendar View ==========

Task 44: INSTALL Schedule-X packages
  - RUN: npm install @schedule-x/react @schedule-x/calendar @schedule-x/theme-shadcn @schedule-x/events-service temporal-polyfill
  - VERIFY: Check package.json for versions
  - DEPENDENCIES: None

Task 45: CREATE frontend/src/components/meetings/meeting-calendar-view.tsx
  - IMPLEMENT: Calendar visualization with Schedule-X
  - FOLLOW pattern: Schedule-X Next.js docs (use 'use client', useNextCalendarApp)
  - DEPENDENCIES: Task 44 (packages), Task 18 (useMeetings)
  - PLACEMENT: frontend/src/components/meetings/
  - FEATURES: Month/week/day views, click to create, drag to reschedule

Task 46: CREATE frontend/src/app/(main)/[projectId]/meetings/calendar/page.tsx
  - IMPLEMENT: Full calendar view page
  - DEPENDENCIES: Task 45 (calendar component)
  - PLACEMENT: frontend/src/app/(main)/[projectId]/meetings/calendar/

# ========== PHASE 12: Advanced Features ==========

Task 47: CREATE frontend/src/components/meetings/distribute-meeting-dialog.tsx
  - IMPLEMENT: Distribution form with PDF options
  - DEPENDENCIES: Task 22 (useActions)
  - PLACEMENT: frontend/src/components/meetings/
  - FIELDS: recipients, include_pdf, request_approval, custom_message

Task 48: CREATE frontend/src/components/meetings/export-pdf-dialog.tsx
  - IMPLEMENT: PDF export options form
  - DEPENDENCIES: Task 22 (useActions)
  - PLACEMENT: frontend/src/components/meetings/

Task 49: CREATE frontend/src/components/meetings/select-template-dialog.tsx
  - IMPLEMENT: Template picker for meeting creation
  - DEPENDENCIES: Task 21 (useTemplates)
  - PLACEMENT: frontend/src/components/meetings/

Task 50: CREATE frontend/src/lib/services/meeting-pdf-service.ts
  - IMPLEMENT: PDF generation logic
  - RESEARCH: Use react-pdf or puppeteer (check existing project dependencies)
  - DEPENDENCIES: Custom doc (PRPs/meetings/docs/pdf-export.md)
  - PLACEMENT: frontend/src/lib/services/

Task 51: CREATE frontend/src/lib/services/meeting-email-service.ts
  - IMPLEMENT: Email distribution logic
  - RESEARCH: Use Resend, SendGrid, or Supabase Edge Functions
  - DEPENDENCIES: Custom doc (PRPs/meetings/docs/email-distribution.md)
  - PLACEMENT: frontend/src/lib/services/

Task 52: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/distribute/route.ts
  - IMPLEMENT: POST - distribute meeting minutes via email
  - DEPENDENCIES: Task 51 (email service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/distribute/

Task 53: CREATE frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/export-pdf/route.ts
  - IMPLEMENT: POST - generate and download PDF
  - DEPENDENCIES: Task 50 (PDF service)
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/export-pdf/

# ========== PHASE 13: Testing ==========

Task 54: CREATE frontend/src/components/meetings/__tests__/meeting-item-card.test.tsx
  - IMPLEMENT: Unit tests for item card component
  - FOLLOW pattern: Existing test files in components/
  - DEPENDENCIES: Task 30 (component)
  - PLACEMENT: frontend/src/components/meetings/__tests__/
  - COVERAGE: Render, edit mode, status changes, priority display

Task 55: CREATE frontend/src/hooks/__tests__/use-meetings.test.ts
  - IMPLEMENT: Unit tests for useMeetings hook
  - DEPENDENCIES: Task 18 (hook)
  - PLACEMENT: frontend/src/hooks/__tests__/
  - COVERAGE: Fetching, race conditions, error handling

Task 56: CREATE frontend/tests/e2e/meetings-create-and-edit.spec.ts
  - IMPLEMENT: E2E test for meeting creation and editing
  - FOLLOW pattern: frontend/tests/e2e/*.spec.ts
  - DEPENDENCIES: Tasks 41, 43 (pages)
  - PLACEMENT: frontend/tests/e2e/
  - COVERAGE: Create meeting, add attendees, add agenda items, convert to minutes

Task 57: CREATE frontend/tests/e2e/meetings-distribution.spec.ts
  - IMPLEMENT: E2E test for distribution workflow
  - DEPENDENCIES: Task 52 (distribute API)
  - PLACEMENT: frontend/tests/e2e/
  - COVERAGE: Distribute minutes, check email sent, verify PDF attached

Task 58: CREATE frontend/tests/e2e/meetings-followup.spec.ts
  - IMPLEMENT: E2E test for follow-up meeting creation
  - DEPENDENCIES: Task 16 (followup API)
  - PLACEMENT: frontend/tests/e2e/
  - COVERAGE: Create followup, verify item carryover, check status reset
```
### Implementation Patterns & Key Details

```typescript
// ===== Service Layer Pattern =====

export class MeetingsService {
  constructor(private supabase: SupabaseClient) {}

  // List meetings with filters
  async listMeetings(
    projectId: string,
    params: MeetingListParams
  ): Promise<MeetingsPaginatedResponse> {
    const {
      page = 1,
      limit = 50,
      sort = 'meeting_date',
      order = 'desc',
      status,
      attendee_id,
      date_from,
      date_to,
    } = params;

    let query = this.supabase
      .from('meetings')
      .select('*, attendees:meeting_attendees(count)', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (attendee_id) {
      query = query.in(
        'id',
        this.supabase
          .from('meeting_attendees')
          .select('meeting_id')
          .eq('person_id', attendee_id)
      );
    }

    if (date_from) {
      query = query.gte('meeting_date', date_from);
    }

    if (date_to) {
      query = query.lte('meeting_date', date_to);
    }

    // Sorting and pagination
    const offset = (page - 1) * limit;
    query = query.order(sort, { ascending: order === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to list meetings: ${error.message}`);

    return {
      data: data || [],
      pagination: {
        current_page: page,
        per_page: limit,
        total_records: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_prev_page: page > 1,
      },
    };
  }

  // Convert agenda to minutes (one-way operation)
  async convertToMinutes(meetingId: string): Promise<Meeting> {
    const { data, error } = await this.supabase
      .from('meetings')
      .update({ mode: 'minutes', status: 'minutes' })
      .eq('id', meetingId)
      .select()
      .single();

    if (error) throw new Error(`Failed to convert: ${error.message}`);
    return data;
  }

  // Create follow-up meeting with item carryover
  async createFollowup(sourceId: string, newDate: string): Promise<Meeting> {
    // Get source meeting
    const { data: source } = await this.supabase
      .from('meetings')
      .select('*, items:meeting_items(*), categories:meeting_categories(*)')
      .eq('id', sourceId)
      .single();

    if (!source) throw new Error('Source meeting not found');

    // Create new meeting
    const { data: newMeeting, error } = await this.supabase
      .from('meetings')
      .insert({
        project_id: source.project_id,
        parent_meeting_id: source.id,
        title: source.title,
        meeting_date: newDate,
        start_time: source.start_time,
        end_time: source.end_time,
        duration_minutes: source.duration_minutes,
        location: source.location,
        description: source.description,
        created_by: (await this.supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create followup: ${error.message}`);

    // Copy categories
    if (source.categories) {
      const categoryMap = new Map<string, string>();
      for (const cat of source.categories) {
        const { data: newCat } = await this.supabase
          .from('meeting_categories')
          .insert({
            meeting_id: newMeeting.id,
            name: cat.name,
            description: cat.description,
            sort_order: cat.sort_order,
          })
          .select()
          .single();

        if (newCat) categoryMap.set(cat.id, newCat.id);
      }

      // Copy open/on_hold items
      const itemsToCopy = source.items.filter(
        (item) => item.status === 'open' || item.status === 'on_hold'
      );

      for (const item of itemsToCopy) {
        await this.supabase.from('meeting_items').insert({
          meeting_id: newMeeting.id,
          category_id: item.category_id ? categoryMap.get(item.category_id) : null,
          source_item_id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          status: 'open',  // Reset to open
          assignee_id: item.assignee_id,
          due_date: item.due_date,
          created_by: (await this.supabase.auth.getUser()).data.user?.id,
        });
      }
    }

    return newMeeting;
  }

  // Get statistics
  async getStatistics(meetingId: string): Promise<MeetingStatistics> {
    const { data: items } = await this.supabase
      .from('meeting_items')
      .select('status')
      .eq('meeting_id', meetingId);

    const { data: attendees } = await this.supabase
      .from('meeting_attendees')
      .select('attendance_status')
      .eq('meeting_id', meetingId);

    return {
      total_items: items?.length || 0,
      open_items: items?.filter((i) => i.status === 'open').length || 0,
      on_hold_items: items?.filter((i) => i.status === 'on_hold').length || 0,
      closed_items: items?.filter((i) => i.status === 'closed').length || 0,
      total_attendees: attendees?.length || 0,
      present_count: attendees?.filter((a) => a.attendance_status === 'present').length || 0,
      absent_count: attendees?.filter((a) => a.attendance_status === 'absent').length || 0,
      not_marked_count: attendees?.filter((a) => !a.attendance_status).length || 0,
    };
  }
}

// ===== React Hook Pattern =====

export function useMeetings(
  options: UseMeetingsOptions
): UseMeetingsReturn {
  const { projectId, enabled = true, view = 'list' } = options;
  const [data, setData] = useState<MeetingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const fetchMeetings = useCallback(async () => {
    if (!enabled || !projectId) return;

    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `/api/projects/${projectId}/meetings?view=${view}`;

      const res = await fetch(apiUrl, { credentials: 'include' });

      if (cancelledRef.current) return;

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        }
        if (res.status === 403) {
          throw new Error("You don't have access to this project.");
        }
        throw new Error(`Failed to fetch meetings (status: ${res.status})`);
      }

      const result = await res.json();

      if (cancelledRef.current) return;

      setData(result);
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, enabled, view]);

  useEffect(() => {
    fetchMeetings();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchMeetings]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMeetings,
  };
}

// ===== Form Validation Pattern =====

import { z } from 'zod';

export const meetingFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  meeting_date: z.date({
    required_error: 'Meeting date is required',
  }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').optional(),
  location: z.string().max(500).optional(),
  description: z.string().optional(),
  video_conference_url: z.string().url('Invalid URL').optional().or(z.literal('')),
}).refine(
  (data) => {
    if (!data.end_time) return true;
    return data.end_time > data.start_time;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

// ===== API Route Pattern =====

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MeetingsService } from '@/lib/services/meetings-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const service = new MeetingsService(supabase);
    const searchParams = request.nextUrl.searchParams;

    const params: MeetingListParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      status: searchParams.get('status') as MeetingStatus | 'all',
      view: searchParams.get('view') as 'list' | 'calendar',
    };

    const data = await service.listMeetings(params.projectId, params);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Validate
    const validatedData = meetingFormSchema.parse(body);

    const service = new MeetingsService(supabase);
    const meeting = await service.createMeeting(params.projectId, validatedData);

    return NextResponse.json({ data: meeting }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ===== Component Pattern =====

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useMeetings } from '@/hooks/use-meetings';

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  projectId,
}: CreateMeetingDialogProps) {
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    meeting_date: new Date(),
    start_time: '09:00',
    end_time: '10:00',
  });

  const { refetch } = useMeetings({ projectId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/projects/${projectId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create meeting');

      await refetch();
      onOpenChange(false);
      toast.success('Meeting created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields... */}
          <Button type="submit">Create Meeting</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```
### Integration Points

```yaml
DATABASE:
  - migration: "Add meetings, meeting_attendees, meeting_items, meeting_categories, meeting_templates, meeting_attachments tables"
  - client: "@/lib/supabase/client (browser), @/lib/supabase/server (SSR)"
  - pattern: "createClient() for client, createClient() from 'server' for SSR"
  - RLS: "Policy checks project membership via project_directory_memberships join"

STORAGE:
  - bucket: "meeting-attachments"
  - pattern: "Upload to Supabase Storage, store path in meeting_attachments table"
  - presigned: "Generate presigned URLs for download (1 hour expiry)"

DIRECTORY:
  - link: "Attendees from people table via person_id FK"
  - pattern: "Person selector component from directory"

SCHEDULE:
  - link: "Meetings appear on project calendar (optional integration)"
  - pattern: "Include meetings in calendar view alongside schedule_tasks"

EMAIL:
  - service: "Resend, SendGrid, or Supabase Edge Functions"
  - pattern: "Send distribution emails with PDF attachment"
  - template: "HTML email template with meeting details and link to Procore"

PDF:
  - library: "react-pdf OR puppeteer (check existing dependencies)"
  - pattern: "Generate PDF server-side, stream to client"
  - template: "Meeting header, attendees table, agenda items table"

CALENDAR (ICS):
  - library: "ics (npm package)"
  - pattern: "Generate ICS file, download link"
  - timezone: "Include VTIMEZONE component for proper timezone support"

CONFIG:
  - add to: .env.local
  - pattern: "EMAIL_API_KEY, PDF_TEMPLATE_PATH, STORAGE_BUCKET_NAME"
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation
npm run lint                    # ESLint checks
npx tsc --noEmit               # TypeScript type checking
npm run format                 # Prettier formatting

# Project-wide validation
npm run lint:fix               # Auto-fix linting issues
npm run type-check             # Full TypeScript validation

# Expected: Zero errors
```
### Level 2: Database Validation

```bash
# After creating migrations
cd /path/to/project
npm run db:types               # Generate Supabase types

# Verify migration applied
npx supabase status           # Check local Supabase running
npx supabase migration list   # See applied migrations

# Test RLS policies
psql -h localhost -p 54322 -U postgres -d postgres
\d meetings                   # Verify table structure
SELECT * FROM meetings WHERE project_id = 31;  # Test query

# Expected: All tables created, types generated, RLS policies active
```
### Level 3: Unit Tests (Component Validation)

```bash
# Test service layer
npm test -- frontend/src/lib/services/meetings-service.test.ts

# Test hooks
npm test -- frontend/src/hooks/__tests__/use-meetings.test.ts

# Test components
npm test -- frontend/src/components/meetings/__tests__/

# Coverage
npm test -- --coverage --watchAll=false

# Expected: All tests pass, coverage >80%
```
### Level 4: Integration Testing (API Validation)

```bash
# Start dev server
npm run dev:frontend &
sleep 5

# Test API endpoints
curl -X GET http://localhost:3000/api/projects/31/meetings \
  -H "Cookie: <auth-cookie>" | jq .

curl -X POST http://localhost:3000/api/projects/31/meetings \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{
    "title": "Test Meeting",
    "meeting_date": "2024-02-15",
    "start_time": "14:00",
    "end_time": "15:00"
  }' | jq .

# Production build
npm run build

# Expected: All endpoints respond correctly, build succeeds
```

### Level 5: E2E Testing (User Workflow Validation)

```bash
# Run Playwright tests
npm run test:e2e -- frontend/tests/e2e/meetings-create-and-edit.spec.ts
npm run test:e2e -- frontend/tests/e2e/meetings-distribution.spec.ts
npm run test:e2e -- frontend/tests/e2e/meetings-followup.spec.ts

# Headed mode (watch browser)
npm run test:e2e -- --headed

# UI mode (interactive)
npm run test:ui

# Expected: All E2E tests pass, workflows complete successfully
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] No formatting issues: `npm run format --check`
- [ ] Production build succeeds: `npm run build`
- [ ] Database migrations applied: `npm run db:types` runs without errors
- [ ] All API routes respond correctly (curl tests)

### Feature Validation

- [ ] Can create meetings with all required fields
- [ ] Can add attendees from project directory
- [ ] Can create agenda items with categories
- [ ] Can convert agenda to minutes (one-way)
- [ ] Can mark attendance in minutes mode
- [ ] Can create follow-up meetings with item carryover
- [ ] Open/OnHold items carry over correctly
- [ ] Can use meeting templates
- [ ] Can distribute minutes via email
- [ ] Can export meetings as PDF
- [ ] Calendar view shows meetings correctly
- [ ] Can attach files to meetings and items

### Code Quality Validation

- [ ] Follows scheduling feature patterns (service, hooks, components)
- [ ] File placement matches desired codebase tree
- [ ] TypeScript interfaces match database schema
- [ ] RLS policies prevent unauthorized access
- [ ] All forms have proper validation (Zod schemas)
- [ ] Error handling with specific error codes
- [ ] Race conditions prevented in hooks (cancelledRef)

### TypeScript/Next.js Specific

- [ ] Proper TypeScript interfaces for all entities
- [ ] Server/Client component patterns followed ('use client' where needed)
- [ ] API routes use [projectId] NOT [id]
- [ ] Timezone handling with timestamptz (not date)
- [ ] date-fns v4 used for all date operations
- [ ] Schedule-X calendar integration working
- [ ] No hydration mismatches

### Documentation & Deployment

- [ ] API endpoints documented (Swagger/OpenAPI if available)
- [ ] Component props documented with TypeScript interfaces
- [ ] README updated with meetings feature
- [ ] Environment variables documented

---

## Anti-Patterns to Avoid

- ❌ Don't use generic `[id]` in route names - use `[projectId]`, `[meetingId]`, etc.
- ❌ Don't use `date` type for meeting times - use `timestamptz` with timezone awareness
- ❌ Don't allow reverting from minutes mode back to agenda mode
- ❌ Don't forget cancelledRef in hooks (causes state updates on unmounted components)
- ❌ Don't bypass RLS policies - always use authenticated Supabase client
- ❌ Don't hardcode company/project IDs - always get from context
- ❌ Don't skip validation in API routes - use Zod schemas
- ❌ Don't expose sensitive data in client-side code (API keys, secrets)
- ❌ Don't use moment.js - use date-fns v4 (already in project)
- ❌ Don't skip E2E tests - critical workflows must be tested in browser

---

## Procore Documentation Reference

### Key Documentation Links

- **Main Guide**: [Meetings - Procore](https://support.procore.com/products/online/user-guide/project-level/meetings)
- **Create Meeting**: [Tutorial](https://support.procore.com/products/online/user-guide/project-level/meetings/tutorials/create-a-meeting)
- **Templates**: [Create Template](https://support.procore.com/products/online/user-guide/company-level/admin/tutorials/create-a-meeting-template)
- **Follow-up**: [Create Follow-up](https://support.procore.com/products/online/user-guide/project-level/meetings/tutorials/create-a-follow-up-meeting)
- **Distribution**: [Distribute Minutes](https://support.procore.com/products/online/user-guide/project-level/meetings/tutorials/distribute-and-redistribute-meeting-minutes)
- **Export**: [Export PDF](https://support.procore.com/products/online/user-guide/project-level/meetings/tutorials/export-a-meeting-as-a-pdf)

### Feature Summary from Procore

**Core Features:**

1. Meeting scheduling with date, time, location, video conference links
2. Attendee management from project directory
3. Agenda creation with categories and items
4. Minutes recording with attendance marking
5. Action item tracking with assignments and due dates
6. Follow-up meeting creation with auto-carryover of open items
7. Meeting templates (company-level) for recurring meeting types
8. Email distribution of minutes
9. PDF export with customization options
10. Calendar integration (ICS export)
11. File attachments to meetings and items
12. Approval workflow for meeting minutes

**User Workflows:**

- Create Meeting → Add Attendees → Build Agenda → Distribute Agenda
- Record Minutes → Mark Attendance → Add Notes → Assign Actions → Distribute Minutes
- Create Follow-up → Review Carried Items → Update Agenda → Repeat

---

**End of PRP Document**

_Confidence Score: 9/10_
_Ready for implementation with comprehensive context and validated patterns._
