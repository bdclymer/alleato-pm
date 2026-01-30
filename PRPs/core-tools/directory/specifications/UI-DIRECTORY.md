# Directory UI Components Specification

## Overview (Last Verified: 2026-01-19)

The Directory UI consists of multiple interconnected components that provide a comprehensive interface for managing project participants. The design follows Procore's patterns with modern shadcn/ui components and responsive layouts.

**Implementation Status:** 75% Complete - Core components implemented, 3 dialog components missing.

## Page Layout Structure

### Main Directory Page
**File**: `app/[projectId]/directory/page.tsx`
**Layout**: ProjectToolPage with tabbed interface

```
┌─────────────────────────────────────────┐
│ Project Header (Breadcrumb + Title)    │
├─────────────────────────────────────────┤
│ [Users] [Contacts] [Companies] [Groups] │ <- Tabs
│ [Inactive Users] [Inactive Contacts]... │
├─────────────────────────────────────────┤
│ Search + Filters + Add Person Button    │
├─────────────────────────────────────────┤
│                                         │
│         Directory Table                 │
│         (with grouping)                 │
│                                         │
└─────────────────────────────────────────┘
```

## Component Specifications

### 1. DirectoryTable Component

**File**: `components/directory/DirectoryTable.tsx`
**Purpose**: Main data table with company grouping and advanced features
**Screenshot**: `frontend/tests/screenshots/directory-companies-full.png`

#### Features
- Company-based grouping with expand/collapse
- Real-time search functionality
- Multi-column sorting
- Row selection with bulk operations
- Responsive design for all screen sizes
- Infinite scroll or pagination

#### Props Interface
```typescript
interface DirectoryTableProps {
  projectId: string;
  type: 'users' | 'contacts' | 'companies' | 'groups';
  defaultGroupBy?: 'company' | 'none';
  searchValue?: string;
  filters?: DirectoryFilters;
}
```

#### Column Configuration
```typescript
interface ColumnConfig {
  users: [
    'select', 'name', 'email', 'company', 'role',
    'permission', 'invite_status', 'last_login', 'actions'
  ];
  contacts: [
    'select', 'name', 'email', 'phone', 'company',
    'job_title', 'status', 'actions'
  ];
  companies: [
    'select', 'name', 'type', 'people_count',
    'primary_contact', 'status', 'actions'
  ];
}
```

#### Layout Structure
```
┌─────────────────────────────────────────────┐
│ Search [__________] Filters [▼] Group By [▼] │
├─────────────────────────────────────────────┤
│ ▼ Acme Corporation (15 people)             │
│   □ John Doe        john@acme.com    PM     │
│   □ Jane Smith      jane@acme.com    Arch   │
├─────────────────────────────────────────────┤
│ ▼ Vendor Inc (8 people)                    │
│   □ Bob Wilson      bob@vendor.com   Super  │
├─────────────────────────────────────────────┤
│ Pagination/Load More                       │
└─────────────────────────────────────────────┘
```

### 2. DirectoryFilters Component

**File**: `components/directory/DirectoryFilters.tsx`
**Purpose**: Advanced filtering controls in a collapsible panel

#### Filter Categories
```typescript
interface FilterOptions {
  type: Array<{
    label: 'Users' | 'Contacts';
    value: 'user' | 'contact';
    count: number;
  }>;
  status: Array<{
    label: 'Active' | 'Inactive';
    value: 'active' | 'inactive';
    count: number;
  }>;
  companies: Array<{
    label: string;
    value: string; // company ID
    count: number;
  }>;
  permissions: Array<{
    label: string;
    value: string; // template ID
    count: number;
  }>;
  inviteStatus: Array<{
    label: 'Not Invited' | 'Invited' | 'Accepted';
    value: string;
    count: number;
  }>;
}
```

#### Layout
```
┌─────────────────────────────┐
│ ▼ Filters (3 active)        │
├─────────────────────────────┤
│ Type:                       │
│ ☑ Users (127)               │
│ ☐ Contacts (43)             │
│                             │
│ Status:                     │
│ ☑ Active (164)              │
│ ☐ Inactive (6)              │
│                             │
│ Companies:                  │
│ ☐ Acme Corp (15)            │
│ ☐ Vendor Inc (8)            │
│ ☐ Sub Co LLC (12)           │
│                             │
│ [Clear All] [Apply Filters] │
└─────────────────────────────┘
```

### 3. PersonEditDialog Component

**File**: `components/directory/PersonEditDialog.tsx`
**Purpose**: Create and edit person information
**Screenshots**:
- Desktop: `frontend/tests/screenshots/UserFormDialog-modal-desktop.png`
- Mobile: `frontend/tests/screenshots/UserFormDialog-modal-mobile.png`
- Tablet: `frontend/tests/screenshots/UserFormDialog-modal-tablet.png`

#### Form Layout (Desktop)
```
┌─────────────────────────────────────────┐
│ Add Person                          [×] │
├─────────────────────────────────────────┤
│ Type: ○ User ○ Contact                  │
│                                         │
│ Personal Information                    │
│ First Name: [____________]              │
│ Last Name:  [____________]              │
│ Email:      [____________] *            │
│ Mobile:     [____________]              │
│ Business:   [____________]              │
│ Job Title:  [____________]              │
│                                         │
│ Company & Access                        │
│ Company:    [Select Company ▼]         │
│ Permission: [Select Template ▼] *      │
│ Role:       [____________]              │
│                                         │
│ ▼ Address (Optional)                    │
│ Street:     [____________]              │
│             [____________]              │
│ City:       [______] State: [__]       │
│ ZIP:        [_____] Country: [US ▼]    │
│                                         │
│ Notes:      [________________]          │
│             [________________]          │
│                                         │
│ [Cancel]              [Save Person]    │
└─────────────────────────────────────────┘
```

#### Responsive Breakpoints
- **Desktop (1024px+)**: Two-column layout with sections
- **Tablet (768px-1023px)**: Single column, larger touch targets
- **Mobile (<768px)**: Stacked fields, full-width inputs

### 4. CompanyEditDialog Component ⚠️ PARTIALLY AVAILABLE

**File**: `components/directory/CompanyEditDialog.tsx` (MISSING)
**Alternative**: `components/domain/companies/CompanyFormDialog.tsx` (EXISTS)
**Purpose**: Create and edit company information
**Status**: General company form exists but not integrated into directory workflow
**Screenshots**:
- Desktop: `frontend/tests/screenshots/CompanyFormDialog-modal-desktop.png`
- Mobile: `frontend/tests/screenshots/CompanyFormDialog-modal-mobile.png`
- Tablet: `frontend/tests/screenshots/CompanyFormDialog-modal-tablet.png`

#### Form Sections
```
┌─────────────────────────────────────────┐
│ Add Company                         [×] │
├─────────────────────────────────────────┤
│ Basic Information                       │
│ Company Name: [___________________] *   │
│ Type:         [Select Type ▼]          │
│ Website:      [___________________]     │
│ Phone:        [___________________]     │
│ Email:        [___________________]     │
│                                         │
│ ▼ Address                              │
│ Street:       [___________________]     │
│               [___________________]     │
│ City:         [_______] State: [__]    │
│ ZIP:          [_____] Country: [US ▼]  │
│                                         │
│ ▼ Business Details                     │
│ Tax ID:       [___________________]     │
│ License:      [___________________]     │
│ Insurance:    [___________________]     │
│ Expires:      [MM/DD/YYYY]             │
│                                         │
│ Notes:        [___________________]     │
│                                         │
│ [Cancel]              [Save Company]   │
└─────────────────────────────────────────┘
```

### 5. InviteDialog Component

**File**: `components/directory/InviteDialog.tsx`
**Purpose**: Send invitations to users

#### Simple Layout
```
┌─────────────────────────────────────┐
│ Invite John Doe                 [×] │
├─────────────────────────────────────┤
│ Email: john.doe@company.com         │
│ Permission: Project Manager         │
│                                     │
│ ☑ Send email invitation            │
│ Expires in: [7 ▼] days             │
│                                     │
│ Custom message (optional):          │
│ ┌─────────────────────────────────┐ │
│ │ Welcome to the project! We look │ │
│ │ forward to working with you.    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]         [Send Invite]      │
└─────────────────────────────────────┘
```

### 6. DistributionGroupDialog Component ❌ NOT IMPLEMENTED

**File**: `components/directory/DistributionGroupDialog.tsx` (MISSING)
**Purpose**: Create and manage distribution groups
**Status**: Planned but not implemented

#### Layout with Conditional Rules
```
┌─────────────────────────────────────────┐
│ Create Distribution Group           [×] │
├─────────────────────────────────────────┤
│ Group Name: [_____________________] *   │
│ Description:[_____________________]     │
│                                         │
│ Type: ○ Manual ○ Automatic ○ Role-Based│
│                                         │
│ [If Automatic/Role-Based]               │
│ ┌─────────────────────────────────────┐ │
│ │ Include people with roles:          │ │
│ │ ☐ Project Manager ☐ Architect      │ │
│ │ ☐ Superintendent  ☐ Subcontractor   │ │
│ │                                     │ │
│ │ Include companies:                  │ │
│ │ ☐ Acme Corp       ☐ Vendor Inc     │ │
│ │                                     │ │
│ │ ☑ Exclude inactive users           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Initial Members:                        │
│ [Multi-select dropdown]                 │
│                                         │
│ [Cancel]            [Create Group]      │
└─────────────────────────────────────────┘
```

### 7. ColumnManager Component

**File**: `components/directory/ColumnManager.tsx`
**Purpose**: Drag-and-drop column management

#### Popover Interface
```
┌─────────────────────────┐
│ Manage Columns      [×] │
├─────────────────────────┤
│ Drag to reorder:        │
│ ≡ ☑ Name                │
│ ≡ ☑ Email               │
│ ≡ ☐ Phone               │
│ ≡ ☑ Company             │
│ ≡ ☑ Role                │
│ ≡ ☐ Last Login          │
│ ≡ ☑ Status              │
│ ≡ ☑ Actions             │
│                         │
│ [Reset to Default]      │
│ [Apply Changes]         │
└─────────────────────────┘
```

### 8. BulkActionDialog Component

**File**: `components/directory/BulkActionDialog.tsx`
**Purpose**: Perform bulk operations on selected people

#### Action Selection Interface
```
┌─────────────────────────────────────────┐
│ Bulk Actions (5 people selected)   [×] │
├─────────────────────────────────────────┤
│ Action: [Change Permission Template ▼] │
│                                         │
│ [Conditional Fields Based on Action]   │
│ New Permission: [Select Template ▼]    │
│                                         │
│ Selected People:                        │
│ • John Doe (john@acme.com)              │
│ • Jane Smith (jane@acme.com)            │
│ • Bob Wilson (bob@vendor.com)           │
│ • ... (2 more)                          │
│                                         │
│ ☐ I understand this action will affect │
│   all selected people                   │
│                                         │
│ [Cancel]              [Apply Changes]   │
└─────────────────────────────────────────┘
```

### 9. ImportDialog Component

**File**: `components/directory/ImportDialog.tsx`
**Purpose**: CSV import interface

#### File Upload and Configuration
```
┌─────────────────────────────────────────┐
│ Import People                       [×] │
├─────────────────────────────────────────┤
│ Import Type: ○ Users ○ Contacts         │
│                                         │
│ Upload File:                            │
│ ┌─────────────────────────────────────┐ │
│ │ Drag CSV file here or click to      │ │
│ │ browse                              │ │
│ │ [Choose File]                       │ │
│ └─────────────────────────────────────┘ │
│ file-name.csv (2.5KB)                  │
│                                         │
│ Options:                                │
│ ☑ File has headers                      │
│ ☐ Skip duplicate emails                 │
│ ☐ Update existing records               │
│                                         │
│ Default Company: [Select Company ▼]    │
│ Default Permission: [Select Template ▼] │
│                                         │
│ [Download Template] [Cancel] [Import]   │
└─────────────────────────────────────────┘
```

### 10. DirectoryErrorBoundary Component

**File**: `components/directory/DirectoryErrorBoundary.tsx`
**Purpose**: Graceful error handling for directory components

#### Error State Display
```
┌─────────────────────────────────────────┐
│             Directory Error             │
├─────────────────────────────────────────┤
│    ⚠️  Something went wrong              │
│                                         │
│    We're having trouble loading the     │
│    directory. Please try refreshing     │
│    the page or contact support if       │
│    the problem persists.                │
│                                         │
│    [Refresh Page] [Contact Support]     │
│                                         │
│    Error details (for developers):      │
│    [Show Details ▼]                     │
└─────────────────────────────────────────┘
```

## Responsive Design Breakpoints

### Mobile-First Approach

#### Mobile (320px - 767px)
- Single column layouts in modals
- Stack form fields vertically
- Drawer-style filters
- Simplified table view
- Touch-optimized buttons (44px minimum)
- Swipe gestures for table actions

#### Tablet (768px - 1023px)
- Two-column modal layouts where appropriate
- Larger form inputs and buttons
- Side panel filters
- Full table with horizontal scroll
- Touch and mouse support

#### Desktop (1024px+)
- Multi-column layouts
- Inline editing capabilities
- Hover states and tooltips
- Keyboard shortcuts
- Full feature set

## State Management

### Component State Patterns

```typescript
// Directory page state
interface DirectoryPageState {
  activeTab: 'users' | 'contacts' | 'companies' | 'groups' | 'inactive-users' | 'inactive-contacts';
  searchValue: string;
  filters: DirectoryFilters;
  selectedPeople: string[];
  groupBy: 'company' | 'none';
  sortConfig: {
    column: string;
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Modal states
interface ModalStates {
  personEditOpen: boolean;
  inviteDialogOpen: boolean;
  companyEditOpen: boolean;
  groupDialogOpen: boolean;
  bulkActionOpen: boolean;
  importDialogOpen: boolean;
}
```

### React Query Cache Keys

```typescript
const queryKeys = {
  people: (projectId: string, filters: DirectoryFilters) =>
    ['directory', 'people', projectId, filters],
  companies: (projectId: string) =>
    ['directory', 'companies', projectId],
  groups: (projectId: string) =>
    ['directory', 'groups', projectId],
  permissions: (projectId: string) =>
    ['directory', 'permissions', projectId],
};
```

## Loading States

### Skeleton Components

```typescript
// Table loading skeleton
<TableSkeleton
  rows={10}
  columns={['name', 'email', 'company', 'role', 'actions']}
/>

// Form loading skeleton
<FormSkeleton
  sections={['personal', 'company', 'address']}
  fields={12}
/>

// Card loading skeleton
<CardSkeleton
  type="person"
  count={6}
/>
```

## Accessibility Features

### ARIA Labels and Roles
- Proper table headers and cell associations
- Form label associations
- Button and link descriptions
- Live region announcements for updates
- Focus management in modals

### Keyboard Navigation
- Tab order through all interactive elements
- Escape key closes modals
- Enter/Space activates buttons
- Arrow keys navigate table cells
- Shortcuts for common actions

### Screen Reader Support
- Descriptive text for complex interactions
- Status announcements for form submissions
- Error message associations
- Progress indicators for loading states

## Animation and Transitions

### Framer Motion Animations
```typescript
// Modal entrance/exit
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

// Table row hover
const rowHover = {
  whileHover: { backgroundColor: 'var(--muted)' },
  transition: { duration: 0.2 }
};

// Group expand/collapse
const groupVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 }
};
```

## Testing Screenshots Reference

### Available Screenshots
1. **Company Form Dialog**:
   - `CompanyFormDialog-modal-desktop.png`
   - `CompanyFormDialog-modal-mobile.png`
   - `CompanyFormDialog-modal-tablet.png`
   - `CompanyFormDialog-modal-close-tests.png`

2. **User Form Dialog**:
   - `UserFormDialog-modal-desktop.png`
   - `UserFormDialog-modal-mobile.png`
   - `UserFormDialog-modal-tablet.png`
   - `UserFormDialog-modal-close-tests.png`

3. **Directory Main View**:
   - `directory-companies-full.png`

4. **Setup Flow**:
   - `budget-direct-03-after-directory.png`
   - `complete-flow-6-directory-skipped.png`

### Screenshot Analysis
The existing screenshots show:
- Modal forms are properly styled with shadcn/ui components
- Responsive design is implemented across device sizes
- Form validation and error states are handled
- Close button functionality is tested
- Directory table shows company grouping

## Performance Considerations

### Optimization Strategies
1. **Virtual scrolling** for large datasets (1000+ people)
2. **Debounced search** to reduce API calls
3. **Memoized table rows** to prevent unnecessary re-renders
4. **Lazy loading** of modal components
5. **React Query caching** for repeated requests
6. **Image optimization** for profile pictures

### Bundle Size Management
- Code splitting for modal components
- Tree shaking of unused utilities
- Dynamic imports for heavy features
- Compressed image assets

## Future Enhancements

### Phase 2 Features
- Advanced search with saved filters
- Kanban view for user statuses
- Profile picture uploads
- Integration with calendar for availability
- Mobile app support
- Offline capability with sync