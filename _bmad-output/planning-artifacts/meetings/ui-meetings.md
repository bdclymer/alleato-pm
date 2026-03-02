---
title: UI Meetings
description: UI Meetings documentation
---

# Meetings UI Components Specification

## Component Specifications

### 1. MeetingsListPage

**File**: `/frontend/src/app/(main)/[projectId]/meetings/page.tsx` ✅ **Implemented**
**Purpose**: Main meetings list view with statistics and table
**Screenshot**: Refer to crawl data `/pages/list/screenshot.png`

#### Props Interface

```typescript
interface PageProps {
  params: Promise<{ projectId: string }>;
}
```markdown
#### Layout Structure
```typescript
┌─────────────────────────────────────────────────────────────────┐
│ Project Meetings                                      [+ Create] │
├─────────────────────────────────────────────────────────────────┤
│ 📅 25 Total Meetings    ⏰ 5 This Month                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Meetings Table ──────────────────────────────────────────┐   │
│ │ [Search] [Filter▼] [Export]                     [View▼]  │   │
│ │ ✓ Title              Date      Duration   Participants  │   │
│ │ ├ Weekly Standup     01/15     60 min     John, Jane    │   │
│ │ ├ Planning Meeting   01/12     90 min     John, Mike    │   │
│ │ ├ Client Review      01/10     45 min     All Team      │   │
│ │ └ Budget Review      01/08     30 min     Jane, Sarah   │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

```typescript
#### Current Implementation Status
- ✅ Basic page structure with header
- ✅ Meeting statistics display
- ✅ Empty state handling
- ✅ MeetingsTableWrapper integration
- ❌ Create meeting button (links to non-existent create page)
- ❌ Search and filter functionality

### 2. MeetingsTableWrapper
**File**: `/frontend/src/app/(main)/[projectId]/meetings/meetings-table-wrapper.tsx` ✅ **Implemented**
**Purpose**: Wrapper component for meetings data table
**Screenshot**: Based on Procore list view structure

#### Props Interface
```typescript
interface MeetingsTableWrapperProps {
  meetings: Database["public"]["Tables"]["document_metadata"]["Row"][];
  projectId: string;
}
```

#### Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ [Search meetings...]                            [Columns ▼]     │
├─────────────────────────────────────────────────────────────────┤
│ Title ▲             Date         Duration    Status    Actions  │
│ ├ Weekly Standup    01/15/2024   60 min      Complete    •••    │
│ ├ Sprint Planning   01/12/2024   90 min      Complete    •••    │
│ ├ Daily Standup     01/11/2024   15 min      Complete    •••    │
│ └ Project Review    01/10/2024   45 min      Complete    •••    │
│                                                                 │
│ Showing 1-10 of 25 meetings          [← Previous] [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```typescript
### 3. MeetingsDataTable

**File**: `/frontend/src/components/meetings/meetings-table.tsx` ✅ **Implemented**
**Purpose**: Core data table component for meetings display

#### Props Interface

```typescript
interface MeetingsDataTableProps {
  data: Meeting[];
  columns: ColumnDef<Meeting>[];
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
}
```typescript
### 4. EditMeetingModal
**File**: `/frontend/src/components/meetings/edit-meeting-modal.tsx` ✅ **Implemented**
**Purpose**: Modal for editing meeting details with full form
**Screenshot**: Modal form with all meeting fields

#### Props Interface
```typescript
interface EditMeetingModalProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

#### Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ Edit Meeting                                            [✕]     │
├─────────────────────────────────────────────────────────────────┤
│ Title: [Weekly Project Standup                            ]     │
│                                                                 │
│ Project: [Project Alpha                              ▼]         │
│                                                                 │
│ Date: [01/15/2024]  Time: [10:00 AM]                           │
│                                                                 │
│ Duration: [60] minutes                                          │
│                                                                 │
│ Participants: [John Doe, Jane Smith, Mike Johnson     ]        │
│                                                                 │
│ Status: [Complete ▼]  Access: [Public ▼]                      │
│                                                                 │
│ Summary:                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Weekly team sync to discuss progress and blockers.          │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                  [Cancel]  [Save changes]      │
└─────────────────────────────────────────────────────────────────┘
```markdown
### 5. MeetingDetailPage

**File**: `/frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx` ✅ **Implemented**
**Purpose**: Detailed view of a single meeting with transcript and analysis

#### Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ Weekly Project Standup                      [Edit] [Delete] [•••]│
├─────────────────────────────────────────────────────────────────┤
│ 📅 January 15, 2024 at 10:00 AM   ⏱️ 60 minutes   👥 3 people  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Meeting Summary ─────────────────────────────────────────┐   │
│ │ Weekly team sync to discuss project progress, review      │   │
│ │ current sprint status, and identify any blockers.        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Participants ───────────────────────────────────────────┐   │
│ │ • John Doe (Project Manager)                             │   │
│ │ • Jane Smith (Lead Developer)                            │   │
│ │ • Mike Johnson (Designer)                                │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Meeting Content ───────── [Transcript][Decisions][Actions] ┐  │
│ │                                                             │  │
│ │ [Active tab content shows here]                            │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6. CreateMeetingForm (❌ **Not Implemented** - Priority 1)

**File**: `/frontend/src/components/meetings/create-meeting-form.tsx`
**Purpose**: Comprehensive form for creating new meetings
**Screenshot**: Based on crawl data `/pages/meeting_create/screenshot.png`

#### Proposed Props Interface

```typescript
interface CreateMeetingFormProps {
  projectId: string;
  onSuccess: (meeting: Meeting) => void;
  onCancel: () => void;
  defaultTemplate?: MeetingTemplate;
}
```markdown
#### Proposed Layout Structure
```sql
┌─────────────────────────────────────────────────────────────────┐
│ Create New Meeting                                              │
├─────────────────────────────────────────────────────────────────┤
│ Title: [                                         ] *Required    │
│                                                                 │
│ Template: [Select template ▼] or [Start from scratch]          │
│                                                                 │
│ ┌─ Meeting Details ─────────────────────────────────────────┐   │
│ │ Date: [MM/DD/YYYY ▼]  Time: [HH:MM AM ▼]*Required      │   │
│ │ Duration: [  ] minutes (15-480) *Required                 │   │
│ │ Location: [                              ]                │   │
│ │ Type: [Select type ▼]*Required                           │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Participants ───────────────────────────────────────────┐   │
│ │ [Search and add participants...]                          │   │
│ │ • John Doe (<john@company.com>)              [Remove]      │   │
│ │ • Jane Smith (<jane@company.com>)            [Remove]      │   │
│ │ [+ Add participant]                                       │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Agenda ─────────────────────────────────────────────────┐   │
│ │ 1. [Opening remarks              ] (5 min)  [Remove]     │   │
│ │ 2. [Status updates               ] (20 min) [Remove]     │   │
│ │ 3. [Next steps discussion        ] (15 min) [Remove]     │   │
│ │ [+ Add agenda item]                                       │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Access Level: [○ Public ○ Private ○ Restricted]               │
│                                                                 │
│                                  [Cancel]    [Create Meeting]  │
└─────────────────────────────────────────────────────────────────┘

```typescript
### 7. MeetingAgendaManager (❌ **Not Implemented** - Priority 2)
**File**: `/frontend/src/components/meetings/meeting-agenda-manager.tsx`
**Purpose**: Component for managing meeting agenda items during meeting creation/editing

#### Proposed Props Interface
```typescript
interface MeetingAgendaManagerProps {
  agendaItems: AgendaItem[];
  onChange: (items: AgendaItem[]) => void;
  editable?: boolean;
  showTimings?: boolean;
}

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  type: 'discussion' | 'decision' | 'action' | 'presentation';
  assigned_to?: string;
  completed?: boolean;
}
```

### 8. MeetingTemplateManager (❌ **Not Implemented** - Priority 3)

**File**: `/frontend/src/components/meetings/meeting-template-manager.tsx`
**Purpose**: Manage meeting templates for quick meeting creation

#### Proposed Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ Meeting Templates                            [+ Create Template]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Weekly Standup Template ─────────────────────────────────┐   │
│ │ • Opening (5 min)                             [Edit][Del] │   │
│ │ • Round-robin updates (20 min)                           │   │
│ │ • Blockers discussion (10 min)                           │   │
│ │ • Next steps (5 min)                                     │   │
│ │                                    [Use Template] [Edit]  │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Sprint Planning Template ───────────────────────────────┐   │
│ │ • Sprint goal definition (15 min)             [Edit][Del] │   │
│ │ • Story review and estimation (45 min)                   │   │
│ │ • Capacity planning (15 min)                             │   │
│ │ • Sprint commitment (15 min)                             │   │
│ │                                    [Use Template] [Edit]  │   │
│ └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```tsx
### 9. MeetingCategoryManager (❌ **Not Implemented** - Priority 3)

**File**: `/frontend/src/components/meetings/meeting-category-manager.tsx`
**Purpose**: Manage meeting categories and types

### 10. MeetingDistributionModal (❌ **Not Implemented** - Priority 4)

**File**: `/frontend/src/components/meetings/meeting-distribution-modal.tsx`
**Purpose**: Modal for sending meeting invitations and distributing minutes

## State Management Patterns

### Meeting List State

```typescript
// Using React Query for server state management
const {
  data: meetings,
  isLoading,
  error,
  refetch
} = useQuery({
  queryKey: ['meetings', projectId, filters],
  queryFn: () => fetchMeetings(projectId, filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Local state for UI interactions
const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
const [filters, setFilters] = useState<MeetingFilters>({});
const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
```tsx
### Form State Management
```typescript
// Using react-hook-form for form state
const form = useForm<CreateMeetingFormData>({
  resolver: zodResolver(createMeetingSchema),
  defaultValues: {
    title: "",
    project_id: projectId,
    date: new Date(),
    duration_minutes: 60,
    access_level: "public",
    agenda_items: []
  }
});

// Real-time validation and auto-save
const { watch, setValue, trigger } = form;
const watchedValues = watch();

useEffect(() => {
  const autoSave = debounce(() => {
    saveDraft(watchedValues);
  }, 2000);

  autoSave();
}, [watchedValues]);
```

## Responsive Design Details

### Mobile Breakpoints

- **Mobile**: < 768px - Stacked layout, simplified tables
- **Tablet**: 768px - 1024px - Adapted two-column layout
- **Desktop**: > 1024px - Full multi-column layout

### Mobile Optimizations

```css
/* Meetings list on mobile */
@media (max-width: 768px) {
  .meetings-table {
    /* Convert to card layout */
    display: block;
  }

  .meeting-row {
    display: block;
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .meeting-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
}
```typescript
### Touch Interactions
- Minimum 44px touch targets for mobile
- Swipe actions for quick meeting operations
- Pull-to-refresh on meeting lists
- Long-press context menus

## Performance Considerations

### Virtual Scrolling
For large meeting lists (>100 items):
```typescript
import { FixedSizeList as List } from 'react-window';

const VirtualMeetingsList = ({ meetings }: { meetings: Meeting[] }) => {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <MeetingListItem meeting={meetings[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={meetings.length}
      itemSize={80}
      overscanCount={5}
    >
      {Row}
    </List>
  );
};
```tsx
### Lazy Loading

```typescript
const MeetingDetailPage = lazy(() => import('./meeting-detail-page'));

const MeetingDetailWithSuspense = () => (
  <Suspense fallback={<MeetingDetailSkeleton />}>
    <MeetingDetailPage />
  </Suspense>
);
```javascript
### Image Optimization
- Use Next.js Image component for screenshots
- Implement progressive loading for meeting attachments
- Compress meeting video thumbnails

## Accessibility Features

### Keyboard Navigation
```typescript
// Keyboard shortcuts for meeting list
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            openCreateMeetingModal();
            break;
          case 'f':
            e.preventDefault();
            focusSearchInput();
            break;
          case 'e':
            e.preventDefault();
            if (selectedMeeting) editMeeting(selectedMeeting);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMeeting]);
};
```

### ARIA Labels and Roles

```jsx
<table role="table" aria-label="Project meetings">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">
        Meeting Title
      </th>
      <th role="columnheader">Date</th>
      <th role="columnheader">Duration</th>
    </tr>
  </thead>
  <tbody role="rowgroup">
    {meetings.map((meeting) => (
      <tr key={meeting.id} role="row" aria-selected={selectedMeetings.includes(meeting.id)}>
        <td role="gridcell">{meeting.title}</td>
        <td role="gridcell">{formatDate(meeting.date)}</td>
        <td role="gridcell">{meeting.duration_minutes} min</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Screen Reader Support

- Descriptive button labels
- Status announcements for actions
- Form validation error announcements
- Progress indicators for loading states

This comprehensive UI specification provides a complete foundation for implementing the meetings feature with proper component architecture, responsive design, and accessibility considerations.
