---
title: FORMS Meetings
description: FORMS Meetings documentation
---

# Meetings Forms Specification

## Form List

1. **CreateMeetingForm** - Create new meetings with full agenda
2. **EditMeetingModal** - Edit existing meeting details (✅ Implemented)
3. **MeetingItemForm** - Add/edit meeting agenda items
4. **MeetingTemplateForm** - Create and manage meeting templates
5. **MeetingCategoryForm** - Manage meeting categories
6. **MeetingDistributionForm** - Send meeting invitations and minutes
7. **MeetingSearchForm** - Advanced meeting search and filtering

## Form Specifications

### 1. CreateMeetingForm (Priority 1 - Not Implemented)

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| title | text | Yes | min: 3, max: 200 | Meeting title |
| project_id | select | Yes | valid project ID | Associated project |
| date | datetime | Yes | future date preferred | Meeting date/time |
| duration_minutes | number | Yes | 15-480 minutes | Expected duration |
| location | text | No | max: 100 | Meeting location/room |
| meeting_type | select | Yes | predefined types | Type/category |
| description | textarea | No | max: 1000 | Meeting description |
| participants | multi-select | No | valid contacts | Meeting attendees |
| template_id | select | No | valid template | Pre-fill from template |
| agenda_items | array | No | agenda item objects | Meeting agenda |
| access_level | select | Yes | public/private/restricted | Access permissions |
| recurring | checkbox | No | boolean | Is recurring meeting |
| recurring_pattern | select | No | daily/weekly/monthly | Recurrence pattern |

#### Form Layout

```text
┌─────────────────────────────────────────────────────────┐
│                  Create New Meeting                     │
├─────────────────────────────────────────────────────────┤
│ Title: [________________________________] *Required     │
│ Project: [Select Project ▼] *Required                   │
│                                                         │
│ Date & Time: [MM/DD/YYYY] [HH:MM AM/PM] *Required      │
│ Duration: [___] minutes (15-480) *Required              │
│ Location: [________________________________]            │
│ Type: [Select Type ▼] *Required                         │
│                                                         │
│ Description:                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Participants: [Search and add... ▼]                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • John Doe (john@company.com)           [Remove]    │ │
│ │ • Jane Smith (jane@company.com)         [Remove]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Template: [None ▼] or [Create from template ▼]         │
│                                                         │
│ ┌─ Meeting Agenda ─────────────────────────────────────┐ │
│ │ 1. [Agenda Item 1                        ] [Remove] │ │
│ │ 2. [Agenda Item 2                        ] [Remove] │ │
│ │ [+ Add Agenda Item]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Access Level: [○ Public ○ Private ○ Restricted]        │
│                                                         │
│ □ Recurring Meeting                                     │
│ Pattern: [Weekly ▼] (if recurring checked)             │
│                                                         │
│ [Cancel]                            [Create Meeting]    │
└─────────────────────────────────────────────────────────┘
```sql
#### Validation Rules

```typescript
const createMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  project_id: z.number().positive("Project is required"),
  date: z.date().min(new Date(), "Date cannot be in the past"),
  duration_minutes: z.number().min(15).max(480, "Duration must be between 15-480 minutes"),
  location: z.string().max(100).optional(),
  meeting_type: z.string().min(1, "Meeting type is required"),
  description: z.string().max(1000).optional(),
  participants: z.array(z.string()).optional(),
  template_id: z.string().uuid().optional(),
  agenda_items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    duration: z.number().optional()
  })).optional(),
  access_level: z.enum(["public", "private", "restricted"]),
  recurring: z.boolean().default(false),
  recurring_pattern: z.enum(["daily", "weekly", "monthly"]).optional()
});
```markdown
### 2. EditMeetingModal (✅ Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| title | text | Yes | min: 3, max: 200 | Meeting title |
| project_id | autocomplete | No | valid project | Change project |
| date | date | No | valid date | Meeting date |
| duration_minutes | number | No | 15-480 | Meeting duration |
| participants | text | No | comma-separated | Participant names |
| status | select | No | predefined statuses | Meeting status |
| access_level | select | No | access levels | Permission level |
| summary | textarea | No | max: 2000 | Meeting summary |

#### Implementation Status
✅ **Complete** - Located at `/frontend/src/components/meetings/edit-meeting-modal.tsx`

### 3. MeetingItemForm (Priority 2 - Not Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| title | text | Yes | min: 3, max: 200 | Agenda item title |
| description | textarea | No | max: 500 | Item description |
| item_type | select | Yes | discussion/decision/action | Item type |
| assigned_to | select | No | valid contact | Responsible person |
| duration_minutes | number | No | 1-120 | Estimated time |
| priority | select | No | high/medium/low | Item priority |
| dependencies | multi-select | No | other items | Item dependencies |
| notes | textarea | No | max: 1000 | Additional notes |

#### Form Layout
```

┌─────────────────────────────────────────────────────────┐
│                   Meeting Agenda Item                   │
├─────────────────────────────────────────────────────────┤
│ Title: [______________________________**] *Required     │
│ Type: [○ Discussion ○ Decision ○ Action Item]          │
│                                                         │
│ Description:                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Assigned to: [Search contacts... ▼]                    │
│ Duration: [**_] minutes                                 │
│ Priority: [Medium ▼]                                    │
│                                                         │
│ Dependencies:                                           │
│ □ Previous agenda item completion                       │
│ □ Document review                                       │
│                                                         │
│ [Cancel]                              [Save Item]       │
└─────────────────────────────────────────────────────────┘

```sql
### 4. MeetingTemplateForm (Priority 3 - Not Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | text | Yes | min: 3, max: 100 | Template name |
| description | textarea | No | max: 500 | Template description |
| meeting_type | select | Yes | predefined types | Meeting category |
| default_duration | number | Yes | 15-480 | Default duration |
| template_items | array | No | agenda items | Pre-defined agenda |
| is_public | checkbox | No | boolean | Share with team |
| tags | text | No | comma-separated | Template tags |

#### Form Layout
```sql
┌─────────────────────────────────────────────────────────┐
│                  Meeting Template                       │
├─────────────────────────────────────────────────────────┤
│ Template Name: [************************] *Required     │
│ Description: [************************_______**]        │
│ Meeting Type: [Select Type ▼] *Required                │
│ Default Duration: [**_] minutes *Required               │
│                                                         │
│ ┌─ Template Agenda Items ─────────────────────────────┐ │
│ │ 1. [Opening & Introductions        ] [Edit][Remove] │ │
│ │ 2. [Review Previous Action Items   ] [Edit][Remove] │ │
│ │ 3. [Project Status Update          ] [Edit][Remove] │ │
│ │ 4. [New Business                   ] [Edit][Remove] │ │
│ │ 5. [Action Items & Next Steps      ] [Edit][Remove] │ │
│ │ [+ Add Template Item]                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ □ Make template public (share with team)                │
│ Tags: [status, weekly, standup]                         │
│                                                         │
│ [Cancel]                            [Save Template]     │
└─────────────────────────────────────────────────────────┘

```sql
### 5. MeetingCategoryForm (Priority 3 - Not Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | text | Yes | min: 2, max: 50 | Category name |
| description | textarea | No | max: 200 | Category description |
| color | color-picker | Yes | hex color | Category color |
| icon | icon-select | No | icon name | Category icon |
| is_default | checkbox | No | boolean | Default category |

### 6. MeetingDistributionForm (Priority 4 - Not Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| distribution_type | select | Yes | agenda/minutes/summary | What to send |
| recipients | multi-select | Yes | valid emails | Who to send to |
| subject | text | No | max: 200 | Email subject |
| message | textarea | No | max: 1000 | Custom message |
| include_attachments | checkbox | No | boolean | Include files |
| send_immediately | checkbox | Yes | boolean | Send timing |
| schedule_date | datetime | No | future date | Scheduled send |

### 7. MeetingSearchForm (Priority 5 - Not Implemented)

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| search_text | text | No | max: 100 | Text search |
| project_filter | multi-select | No | valid projects | Project filter |
| date_range | date-range | No | valid range | Date range |
| meeting_type | multi-select | No | types | Category filter |
| participants | multi-select | No | contacts | Participant filter |
| status_filter | multi-select | No | statuses | Status filter |

## Conditional Logic

### Create Meeting Form
1. **Template Selection**: When template is selected, auto-populate agenda items
2. **Recurring Meetings**: Show recurrence pattern only when recurring is checked
3. **Participant Search**: Real-time search in contacts database
4. **Project Selection**: Filter templates and categories by project

### Meeting Item Form
1. **Item Type**: Change form fields based on type (discussion vs decision vs action)
2. **Assignment**: Show assignee field only for action items
3. **Dependencies**: Show dependency options based on existing agenda items

### Template Form
1. **Public Templates**: Show sharing options based on user permissions
2. **Template Items**: Dynamic add/remove of agenda items
3. **Type Selection**: Filter default items by meeting type

## Error Handling Patterns

### Validation Errors
```typescript
// Field-level validation
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

// Form submission error handling
const handleSubmit = async (data: CreateMeetingData) => {
  try {
    setFieldErrors({});
    await createMeeting(data);
    onSuccess();
  } catch (error) {
    if (error instanceof ValidationError) {
      setFieldErrors(error.fieldErrors);
    } else {
      toast.error("Failed to create meeting. Please try again.");
    }
  }
};
```

### Network Errors

```typescript
const [submitError, setSubmitError] = useState<string | null>(null);

// Retry logic for failed submissions
const handleRetry = () => {
  setSubmitError(null);
  handleSubmit(formData);
};
```

## Accessibility Requirements

### Keyboard Navigation

- All form fields must be keyboard accessible
- Logical tab order through form elements
- Escape key closes modals
- Enter key submits forms

### Screen Reader Support

- Proper ARIA labels for all form controls
- Error messages announced to screen readers
- Form validation status clearly communicated
- Required field indicators properly marked

### Visual Requirements

- Minimum 4.5:1 color contrast for text
- Focus indicators clearly visible
- Error states visually distinct
- Loading states properly indicated

## Integration Points

### API Connections

- **Create Meeting**: `POST /api/projects/[projectId]/meetings`
- **Update Meeting**: `PUT /api/projects/[projectId]/meetings/[meetingId]`
- **Search Contacts**: `GET /api/projects/[projectId]/contacts`
- **Template CRUD**: `POST/GET/PUT/DELETE /api/projects/[projectId]/meeting-templates`

### Real-time Features

- Auto-save draft meetings
- Real-time participant availability
- Live agenda item updates during meetings
- Instant meeting notifications

This form specification provides the complete foundation for implementing all meeting-related forms with proper validation, accessibility, and user experience considerations.
