---
title: UI DailyLogs
description: UI DailyLogs documentation
---

# Daily Logs UI Components Specification

## Component Specifications

Based on Procore Daily Logs analysis and existing implementation, this specification defines the complete UI component architecture for comprehensive daily log management.

### Current Implementation Status

- ✅ Basic table view at `/frontend/src/app/(main)/[projectId]/daily-log/page.tsx`
- ⚠️ Uses GenericDataTable - needs specialized components
- ❌ Missing calendar view, detail view, and section components

## Core Page Components

### 1. DailyLogPage (Main Container)

**File**: `/frontend/src/app/(main)/[projectId]/daily-log/page.tsx` ✅ BASIC IMPLEMENTATION
**Purpose**: Main daily log page with navigation and view switching
**Screenshot**: `/PLANS/daily-logs/crawl-daily-logs/pages/dailylog/screenshot.png`

#### Current Implementation

```typescript
// Existing basic table implementation
export default async function ProjectDailyLogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // Uses GenericDataTable - needs enhancement
}
```typescript
#### Enhanced Props Interface
```typescript
interface DailyLogPageProps {
  projectId: string;
  initialView?: 'table' | 'calendar' | 'detail';
  initialDate?: string;
}
```markdown
#### Enhanced Layout Structure

```text
┌─────────────────────────────────────────────────┐
│ Daily Logs Header                               │
│ [Today] [Calendar] [Table] [Export] [Settings] │
├─────────────────────────────────────────────────┤
│                                                 │
│         [Selected View Component]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. DailyLogCalendarView

**File**: `/frontend/src/components/daily-logs/DailyLogCalendarView.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Calendar interface for navigating daily logs
**Screenshot**: N/A - Calendar view not captured in crawl

#### Props Interface

```typescript
interface DailyLogCalendarViewProps {
  projectId: string;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onCreateLog: (date: Date) => void;
  logData: CalendarLogData[];
  isLoading?: boolean;
}

interface CalendarLogData {
  date: string;
  hasLog: boolean;
  weatherDelay: boolean;
  safetyIncidents: number;
  totalWorkers: number;
  entryCount: number;
}
```markdown
#### Layout Structure
```typescript
┌─────────────────────────────────────────────────┐
│ ← January 2024 →                     [Filters] │
├─────────────────────────────────────────────────┤
│ SUN  MON  TUE  WED  THU  FRI  SAT               │
│  1    2    3    4    5    6    7                │
│ [8]   9   [10]  11   12   13   14               │
│ 15   16   17   18   19   20   21                │
│ 22   23   24   25   26   27   28                │
│ 29   30   31                                    │
├─────────────────────────────────────────────────┤
│ Legend: ■ Has Log ⚠ Weather Delay 🛡 Safety    │
└─────────────────────────────────────────────────┘

```typescript
### 3. DailyLogDetailView
**File**: `/frontend/src/components/daily-logs/DailyLogDetailView.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Comprehensive single-day log view with all sections
**Screenshot**: `/PLANS/daily-logs/crawl-daily-logs/pages/dailylog/screenshot.png`

#### Props Interface
```typescript
interface DailyLogDetailViewProps {
  projectId: string;
  logDate: string;
  dailyLog: DailyLogDetail | null;
  isEditable?: boolean;
  onSave?: (data: any) => void;
  onAddSection?: (sectionType: string) => void;
}
```

#### Layout Structure (Based on Procore Analysis)

```text
┌─────────────────────────────────────────────────┐
│ Daily Log - January 15, 2024                   │
│ [← Prev] [Calendar] [Today] [Next →] [Export]  │
├─────────────────────────────────────────────────┤
│ Weather Observations                    [+ Add] │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Weather Table Component]                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Manpower                                [+ Add] │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Manpower Table Component]                  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Equipment                               [+ Add] │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Equipment Table Component]                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Additional Sections...]                        │
└─────────────────────────────────────────────────┘
```typescript
## Section Components

### 4. WeatherSection

**File**: `/frontend/src/components/daily-logs/sections/WeatherSection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Weather observations with inline editing
**Screenshot**: `/PLANS/daily-logs/crawl-daily-logs/pages/weather/screenshot.png`

#### Props Interface

```typescript
interface WeatherSectionProps {
  dailyLogId: string;
  weatherEntries: WeatherEntry[];
  isEditable: boolean;
  onAddEntry: () => void;
  onUpdateEntry: (id: string, data: Partial<WeatherEntry>) => void;
  onDeleteEntry: (id: string) => void;
}
```markdown
#### Layout Structure (From Procore Analysis)
```

┌─────────────────────────────────────────────────────────────────────────────┐
│ Weather Observations                                             [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Time* │ Delay │ Sky    │ Temp │ Calamity │ Avg │ Precip │ Wind │ Ground │ ... │
├─────────────────────────────────────────────────────────────────────────────┤
│ 08:00 │   ☐   │ Clear  │  75° │    -     │ 60° │  None  │ 5mph │  Dry   │ ... │
│ 12:00 │   ☐   │ Cloudy │  82° │    -     │ 68° │  None  │ 8mph │  Dry   │ ... │
│ [+]   │       │        │      │          │     │        │      │        │     │
└─────────────────────────────────────────────────────────────────────────────┘

```typescript
### 5. ManpowerSection ✅ PARTIAL DATA STRUCTURE
**File**: `/frontend/src/components/daily-logs/sections/ManpowerSection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Labor tracking with company and trade management
**Screenshot**: Part of main dailylog screenshot

#### Props Interface
```typescript
interface ManpowerSectionProps {
  dailyLogId: string;
  manpowerEntries: ManpowerEntry[];
  companies: Company[];
  isEditable: boolean;
  onAddEntry: () => void;
  onUpdateEntry: (id: string, data: Partial<ManpowerEntry>) => void;
  onDeleteEntry: (id: string) => void;
}
```markdown
#### Layout Structure (From Procore Analysis)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Manpower                                                         [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Company     │ Workers* │ Hours* │ Total Hours │ Location │ Comments │ ... │   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ABC Electric│    4     │  8.0   │    32.0     │ Building │ Rough-in │ ... │ ✏ │
│ XYZ Plumb   │    2     │  7.5   │    15.0     │ Floor 2  │ Install  │ ... │ ✏ │
│ [+]         │          │        │             │          │          │     │   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6. EquipmentSection ✅ PARTIAL DATA STRUCTURE

**File**: `/frontend/src/components/daily-logs/sections/EquipmentSection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Equipment usage tracking with operator information

#### Props Interface

```typescript
interface EquipmentSectionProps {
  dailyLogId: string;
  equipmentEntries: EquipmentEntry[];
  equipment: Equipment[];
  operators: User[];
  isEditable: boolean;
  onAddEntry: () => void;
  onUpdateEntry: (id: string, data: Partial<EquipmentEntry>) => void;
  onDeleteEntry: (id: string) => void;
}
```markdown
#### Layout Structure (From Procore Analysis)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Equipment                                                        [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Equipment   │ Hours Op │ Hours Idle │ Inspected │ Insp Time │ Comments │ ... │
├─────────────────────────────────────────────────────────────────────────────┤
│ Excavator #1│   6.5    │    1.5     │    Yes    │   07:00   │ Good     │ ... │
│ Crane #3    │   8.0    │    0.0     │    Yes    │   06:30   │ Perfect  │ ... │
│ [+]         │          │            │           │           │          │     │
└─────────────────────────────────────────────────────────────────────────────┘

```markdown
### 7. VisitorSection
**File**: `/frontend/src/components/daily-logs/sections/VisitorSection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Site visitor tracking and management

#### Layout Structure (From Procore Analysis)
```

┌─────────────────────────────────────────────────────────────────────────────┐
│ Visitors                                                         [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Visitor      │ Company    │ Start*│ End*   │ Location │ Comments │ Attach │   │
├─────────────────────────────────────────────────────────────────────────────┤
│ John Smith   │ ABC Inspect│ 09:00  │ 11:30  │ Floor 3  │ Safety   │   📎   │ ✏ │
│ Mary Johnson │ City Permit│ 14:00  │ 15:15  │ Site     │ Permit   │        │ ✏ │
│ [+]          │            │        │        │          │          │        │   │
└─────────────────────────────────────────────────────────────────────────────┘

```markdown
### 8. SafetySection
**File**: `/frontend/src/components/daily-logs/sections/SafetySection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Safety incident tracking and notices

#### Layout Structure (From Procore Analysis)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Safety Notices                                                   [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Safety Notice │ Issued To │ Due Date │ Party    │ Company  │ Comments │ ... │
├─────────────────────────────────────────────────────────────────────────────┤
│ PPE Required  │ All Crews │ 1/20/24  │ Workers  │ All Subs │ Hard hat │ ... │
│ Crane Safety  │ Operators │ 1/18/24  │ Crane Op │ ABC Crane│ Training │ ... │
│ [+]           │           │          │          │          │          │     │
└─────────────────────────────────────────────────────────────────────────────┘

```markdown
### 9. NotesSection ✅ PARTIAL DATA STRUCTURE
**File**: `/frontend/src/components/daily-logs/sections/NotesSection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: General daily notes and observations

#### Layout Structure (From Procore Analysis)
```

┌─────────────────────────────────────────────────────────────────────────────┐
│ Notes                                                            [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Subject          │ Comments                          │ Attachments │ Related │
├─────────────────────────────────────────────────────────────────────────────┤
│ Foundation Pour  │ Concrete delivery delayed 2 hrs  │     📎      │   RFI   │
│ Weather Impact   │ Rain stopped work at 2pm         │             │  Delay  │
│ [+]              │                                   │             │         │
└─────────────────────────────────────────────────────────────────────────────┘

```markdown
### 10. ProductivitySection
**File**: `/frontend/src/components/daily-logs/sections/ProductivitySection.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Work progress and productivity tracking

#### Layout Structure (From Procore Analysis)
```typescript
┌─────────────────────────────────────────────────────────────────────────────┐
│ Productivity                                                     [+ Add Row] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Resource  │ Scheduled │ Showed │ Reimburse │ Rate  │ Comments              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Carpenter │    Yes    │  Yes   │    Yes    │ $45/hr│ Framing progress good │
│ Electrician│   Yes    │  No    │    No     │ $50/hr│ Called in sick        │
│ [+]       │           │        │           │       │                       │
└─────────────────────────────────────────────────────────────────────────────┘

```typescript
## Utility Components

### 11. DailyLogHeader
**File**: `/frontend/src/components/daily-logs/DailyLogHeader.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Navigation and action header for daily log pages

#### Props Interface
```typescript
interface DailyLogHeaderProps {
  currentDate: Date;
  viewMode: 'table' | 'calendar' | 'detail';
  onViewModeChange: (mode: string) => void;
  onDateChange: (date: Date) => void;
  onExport: () => void;
  onSettings: () => void;
  hasUnsavedChanges?: boolean;
}
```

### 12. SectionContainer

**File**: `/frontend/src/components/daily-logs/SectionContainer.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Wrapper component for collapsible log sections

#### Props Interface

```typescript
interface SectionContainerProps {
  title: string;
  icon?: React.ReactNode;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddEntry?: () => void;
  showAddButton?: boolean;
  entryCount?: number;
  children: React.ReactNode;
}
```markdown
#### Layout Structure
```sql
┌─────────────────────────────────────────────────┐
│ 📊 Section Title (3 entries)    [▼] [+ Add]   │
├─────────────────────────────────────────────────┤
│                                                 │
│         [Section Content]                       │
│                                                 │
└─────────────────────────────────────────────────┘

```sql
### 13. InlineEditTable
**File**: `/frontend/src/components/daily-logs/InlineEditTable.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Reusable table with inline editing capabilities

#### Props Interface
```typescript
interface InlineEditTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onAddRow: () => void;
  onUpdateRow: (index: number, data: Partial<T>) => void;
  onDeleteRow: (index: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

interface TableColumn<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'time' | 'date';
  required?: boolean;
  options?: { value: any; label: string; }[]; // For select type
  validation?: (value: any) => string | null;
  render?: (value: any, row: T) => React.ReactNode;
}
```

### 14. PhotoGallery

**File**: `/frontend/src/components/daily-logs/PhotoGallery.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Photo attachment display and management

#### Props Interface

```typescript
interface PhotoGalleryProps {
  photos: Photo[];
  onUpload: (files: FileList) => void;
  onDelete: (photoId: string) => void;
  onView: (photo: Photo) => void;
  maxPhotos?: number;
  allowUpload?: boolean;
}

interface Photo {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_path?: string;
  description?: string;
  photo_location?: string;
  photo_timestamp?: string;
  tags?: string[];
}
```typescript
## Form Components

### 15. WeatherForm
**File**: `/frontend/src/components/daily-logs/forms/WeatherForm.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Weather observation entry form (see FORMS-DailyLogs.md)

### 16. ManpowerForm
**File**: `/frontend/src/components/daily-logs/forms/ManpowerForm.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Manpower entry form (see FORMS-DailyLogs.md)

### 17. SafetyIncidentForm
**File**: `/frontend/src/components/daily-logs/forms/SafetyIncidentForm.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Safety incident reporting form (see FORMS-DailyLogs.md)

## Modal Components

### 18. CreateDailyLogModal
**File**: `/frontend/src/components/daily-logs/modals/CreateDailyLogModal.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Create new daily log for selected date

### 19. ExportModal
**File**: `/frontend/src/components/daily-logs/modals/ExportModal.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Export options and configuration

### 20. SettingsModal
**File**: `/frontend/src/components/daily-logs/modals/SettingsModal.tsx` ❌ NEEDS IMPLEMENTATION
**Purpose**: Daily log configuration and preferences

## Responsive Design Details

### Mobile Layout (< 768px)
- Stack sections vertically
- Collapse tables to card format
- Hide non-essential columns
- Touch-friendly buttons and inputs
- Swipe navigation for dates

### Tablet Layout (768px - 1024px)
- 2-column section layout
- Horizontal scrolling for wide tables
- Collapsible sidebar navigation
- Medium-density touch targets

### Desktop Layout (> 1024px)
- Full table layouts with all columns
- Side-by-side section arrangement
- Hover states and tooltips
- Keyboard shortcuts

## State Management Patterns

### Component State Architecture
```typescript
// Main daily log context
interface DailyLogContextType {
  currentDate: Date;
  currentLog: DailyLogDetail | null;
  viewMode: 'table' | 'calendar' | 'detail';
  isLoading: boolean;
  hasUnsavedChanges: boolean;

  // Actions
  setCurrentDate: (date: Date) => void;
  loadDailyLog: (date: Date) => Promise<void>;
  saveDailyLog: () => Promise<void>;
  addSectionEntry: (section: string, data: any) => void;
  updateSectionEntry: (section: string, id: string, data: any) => void;
  deleteSectionEntry: (section: string, id: string) => void;
}
```sql
### Optimistic Updates

```typescript
// Example optimistic update pattern
const handleUpdateEntry = useCallback((id: string, data: any) => {
  // Immediately update UI
  setEntries(prev => prev.map(entry =>
    entry.id === id ? { ...entry, ...data } : entry
  ));

  // Background API call
  updateEntry(id, data).catch(() => {
    // Revert on failure
    setEntries(prev => prev.map(entry =>
      entry.id === id ? originalEntry : entry
    ));
    toast.error('Update failed');
  });
}, []);
```markdown
## Accessibility Features

### Keyboard Navigation
- Tab order follows logical flow
- Arrow key navigation in tables
- Escape key to cancel editing
- Enter key to confirm actions

### Screen Reader Support
- Proper ARIA labels and descriptions
- Table headers associated with cells
- Form field labels and error descriptions
- Live region announcements for updates

### Visual Accessibility
- High contrast color schemes
- Scalable typography
- Clear focus indicators
- Color-blind friendly indicators

## Performance Considerations

### Optimization Strategies
- Virtual scrolling for large tables
- Lazy loading of section components
- Image optimization for photos
- Debounced auto-save functionality
- Memoized heavy calculations

### Bundle Splitting
```typescript
// Code splitting for daily log components
const DailyLogCalendarView = lazy(() =>
  import('./components/daily-logs/DailyLogCalendarView')
);
const DailyLogDetailView = lazy(() =>
  import('./components/daily-logs/DailyLogDetailView')
);
```

### Caching Strategy

- React Query for API state management
- Local storage for user preferences
- Service worker for offline capability
- Image caching for photo attachments
