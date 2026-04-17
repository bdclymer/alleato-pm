# PUNCH LIST APPLICATION - Development Instructions for AI Coding Agent

**File Path:** `frontend/src/app/(main)/[projectId]/punch-list/`

**URL:** http://localhost:3000/767/punch-list

**Procore URL:** <https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/punchlist/list?p=1&s=&so%5Battribute%5D=number&so%5Bdirection%5D=desc>

## 1. Core Overview & Purpose

The Punch List tool is used at the end of construction/project phases to track remaining work items, assign responsibilities, set due dates, and maintain a real-time history of all actions. It should support both web and mobile (iOS/Android) platforms.

This specification provides a comprehensive blueprint for developing a Procore-like punch list system with all documented features and workflows.

## 2. Verified Key Features & Functionality

### A. Item Management (Core CRUD)

- Create Punch List Items with auto-generated sequential numbers (starting from 1)
- Edit Punch List Items - modify any field after creation
- Delete Punch List Items with recovery via Recycle Bin
- Bulk Actions on multiple items (select via checkboxes)
- Status Transitions: Draft → Work Required → Initiated → Closed
- Reopen Items - change closed items back to open status
- Quick Capture (mobile) - rapid field-based item creation with photo

### B. Complete Field Structure (Verified)

#### General Information Section:

- Title (required) - full text field
- Number (auto-generated) - read-only sequential integer
- Punch Item Manager (required) - single user assignment with clear button
- Type (dropdown) - configurable item types
Assignee(s) (optional) - multi-select user assignment with company affiliation display
Due Date (date picker) - with clear button
Location (dropdown/hierarchical) - multi-tiered location support
Priority (dropdown) - High, Medium, Low, etc.
Final Approver (required) - single user assignment with clear button
Distribution List (dropdown) - pre-configured distribution groups

#### Additional Fields:

- Trade (dropdown) - standard construction trades
- Schedule Impact (dropdown)
- Cost Impact (dropdown)
- Cost Codes (dropdown/searchable)
- Reference (text) - free-form reference number/identifier
- Description (rich text editor) - with formatting toolbar (Bold, Italic, Underline, Strikethrough, Lists, etc.)
- Private (checkbox) - boolean flag for visibility control

#### Auto-Managed Fields:

Status (badge display) - shows current workflow state with user and timestamp
Date Created (timestamp) - auto-populated on creation
Date Closed (timestamp) - auto-populated when status changes to Closed
Date Notified (timestamp) - tracks when item was first distributed/notified
Closed By (user reference) - who closed the item
Email Sent? (boolean) - tracks if notification email was sent

#### Attachment Fields:

Attachments (drag & drop or file upload) - supports PDF, images, Excel, etc.
Linked Drawings (reference to drawings in Drawings tool)

#### Workflow Tracking Fields:

**Assignees Table with columns:**

Name
Date Notified
Date Ready for Review
Date Work Not Accepted
Date Resolved
Response (status display)
Comments

### C. Dashboard & Analytics
Status Widget (Pie Chart):

Work Required (percentage)
Initiated (percentage)
Closed (percentage)

Company Distribution (Horizontal Bar Chart):

Shows items breakdown by Assignee Company
Visual indicators for Overdue (red), Open (black), Closed (gray)
Total count per company

Average Response Time Card:

Displays average days to response
Links to "Total Overdue Punch List Items"

Total Overdue Items Card:

Count of items past due date

### D. List View & Columns

Visible Columns:

Checkbox (for bulk selection)

(item number) - clickable to detail view

Title (clickable to detail view)
Status (with color-coded badge)
Ball In Court (shows who has responsibility)
Assignee Name
Assignee Company
Assignee Response (status indicator)
More Options (three-dot menu)
Edit button (secondary action)
View button (redirect to detail)
PDF export icon (per item)
Link icon (copy-to-clipboard)

Customizable Columns - Users can adjust which columns display

### E. Search & Filtering
Search Bar:

Full-text search across Title, Description, and other fields
Real-time as-you-type filtering

#### Advanced Filters (Add Filter dropdown):

Assignee
Assignee Company
Assignee Response
Ball In Court
Closed By
Creator
Date Closed
Date Created
Date Notified
Due Date
Final Approver
Location
Priority
Punch Item Manager
Status
Trade
Type

Filter UI Pattern:

Multi-select dropdowns for most filters
Date range pickers for date filters
Clearable selections with X button
Active filters display as applied chips
Pagination: "1-75 of 75", with page controls

### F. Activity Feed & Comments

Right-Side Activity Column:

Add Comment text area (expandable)
Add Attachment button with file size limit display (0/2000)
Timeline of activities with:

User avatar and name
Timestamp (e.g., "8:34 AM")
Action type ("Status Update:")
Status badge (color-coded: Closed=green, Work Required=orange, Initiated=blue)
Activity date separator

### G. Change History (Audit Trail)
Change History Tab Contents:

Sortable table with columns:

Date (sortable)
Action By (user name)
Changed (field name that was modified)
From (previous value)
To (new value)

**Examples tracked:**
- Status changes
- Date Closed assignments
- Ball In Court transitions
- Email Sent flag changes
- Assignment changes
- Item creation events

Timestamp format: "Mon Apr 14, 2025 at 08:34 am EDT"

Pagination support for large histories

### H. Related Items Tab

Shows count of related items (0) in tab
Used for linking punch items to other items

### I. Emails Tab

Shows count of email notifications sent
Tracks email distribution history

### J. Export Functionality
Export Options (from Export button):

PDF - Basic punch list as PDF
PDF w/ descriptions - Includes full descriptions
PDF w/ photos & drawings - Rich media export
CSV - Spreadsheet format for Excel/analysis

Per-Item Export:

PDF icon next to each item in list view

### K. Bulk Operations

**Bulk Actions Dropdown:**
- Multi-select items via checkboxes
- Common operations:

Mass status updates
Mass assign
Mass delete
Export selected items

### L. Item Detail View Tabs

General Tab (primary content)
Related Items - Link to other punch items
Emails - Track email notifications and delivery
Change History - Complete audit trail with 9+ entries shown

### M. View Modes

**Tab Navigation:**

- My Items (0) - Personal/assigned items
- All Items (75) - Complete list
- Recycle Bin (0) - Deleted items for recovery

## 3. Technical Data Model - Updated

PunchListItem {
  id: UUID
  project_id: UUID
  number: Integer (auto-incrementing)
  title: String (required)
  description: RichText (optional)
  status: Enum[Draft, WorkRequired, Initiated, Closed]
  
  // User Assignments
  punch_item_manager_id: UUID (required)
  final_approver_id: UUID (required)
  assignee_ids: UUID[] (multi-select)
  distribution_list_id: UUID (optional)
  created_by_id: UUID
  closed_by_id: UUID (nullable)
  
  // Dates
  date_created: Timestamp (auto)
  date_closed: Timestamp (nullable, auto-populated)
  date_notified: Timestamp (nullable)
  due_date: Date (optional)
  
  // Categorization & Impact
  type_id: UUID (dropdown)
  location_id: UUID (hierarchical, optional)
  trade_id: UUID (dropdown)
  priority: Enum[Low, Medium, High] (optional)
  schedule_impact_id: UUID (optional)
  cost_impact_id: UUID (optional)
  cost_codes: String[] (optional)
  
  // Metadata
  reference: String (optional)
  private: Boolean (default: false)
  ball_in_court: String (computed - shows current responsibility)
  email_sent: Boolean (auto)
  
  // Relationships
  attachments: Attachment[]
  comments: Comment[]
  history: ChangeLog[]
  assignee_tracking: AssigneeTracker[]
}

AssigneeTracker {
  id: UUID
  punch_item_id: UUID
  assignee_id: UUID
  date_notified: Timestamp
  date_ready_for_review: Timestamp (nullable)
  date_work_not_accepted: Timestamp (nullable)
  date_resolved: Timestamp (nullable)
  response_status: String
  comments: String
}

ChangeLogEntry {
  id: UUID
  punch_item_id: UUID
  timestamp: Timestamp
  action_by_id: UUID
  field_changed: String
  previous_value: Any
  new_value: Any
  action_type: String (e.g., "field_update", "creation", "status_change")
}

Comment {
  id: UUID
  punch_item_id: UUID
  user_id: UUID
  text: String
  timestamp: Timestamp
  attachments: Attachment[]
}

Attachment {
  id: UUID
  punch_item_id: UUID
  file_path: String
  file_name: String
  file_type: String
  file_size: Integer (bytes)
  uploaded_by_id: UUID
  uploaded_at: Timestamp
  url: String (time-limited, expires in ~30 days)
}

## 4.UI/UX Component Library Needed

### Layout Components:

Responsive grid layout (2-column for desktop)
Left panel for Item Information (60%)
Right panel for Activity Feed (40%)
Mobile responsive stacking

### Form Components:

Text input with clear button
Rich text editor with toolbar
Dropdown/Select with search
Multi-select dropdown
Date picker (with clear button)
Checkbox with label
User picker/selector
File upload with drag & drop
Notification badges (colored status indicators)

### List Components:

Data table with sortable columns
Bulk select checkboxes
Pagination controls
Filter chip display
Status indicators with color coding
Avatar images for users

### Widget Components:

Donut/pie chart (Status distribution)
Horizontal bar chart (Company distribution)
Metric cards (response time, overdue count)
Activity feed timeline
Tabs interface

### Navigation Components:

Breadcrumb trail (Punch List > Item #1 > Title)
Tab switcher (General, Related Items, Emails, Change History)
Filter dropdown menu

### Buttons & Actions:

Primary action button (Create, Save)
Secondary buttons (Cancel, Edit, View)
Dropdown menus (Bulk Actions, More Options)
Icon buttons (PDF, Link)

## 5. API Endpoints (RESTful)
// CRUD Operations
POST   /api/v1/projects/{projectId}/punch-items
GET    /api/v1/projects/{projectId}/punch-items (paginated, filterable)
GET    /api/v1/projects/{projectId}/punch-items/{itemId}
PATCH  /api/v1/projects/{projectId}/punch-items/{itemId}
DELETE /api/v1/projects/{projectId}/punch-items/{itemId}

// Item Status Management
PATCH  /api/v1/projects/{projectId}/punch-items/{itemId}/status
POST   /api/v1/projects/{projectId}/punch-items/{itemId}/reopen

// Comments & Activity
POST   /api/v1/projects/{projectId}/punch-items/{itemId}/comments
GET    /api/v1/projects/{projectId}/punch-items/{itemId}/comments
GET    /api/v1/projects/{projectId}/punch-items/{itemId}/change-history

// Attachments
POST   /api/v1/projects/{projectId}/punch-items/{itemId}/attachments
DELETE /api/v1/projects/{projectId}/punch-items/{itemId}/attachments/{attachmentId}

// Bulk Operations
POST   /api/v1/projects/{projectId}/punch-items/bulk-update
POST   /api/v1/projects/{projectId}/punch-items/bulk-delete

// Export
GET    /api/v1/projects/{projectId}/punch-items/export?format=pdf|csv
GET    /api/v1/projects/{projectId}/punch-items/{itemId}/export?format=pdf

// Search & Filter
GET    /api/v1/projects/{projectId}/punch-items/search?q={query}
GET    /api/v1/projects/{projectId}/punch-items/filters?status=open&assignee={userId}

// Statistics & Dashboard
GET    /api/v1/projects/{projectId}/punch-items/stats
GET    /api/v1/projects/{projectId}/punch-items/stats/by-company
GET    /api/v1/projects/{projectId}/punch-items/stats/overdue

// Recycle Bin
GET    /api/v1/projects/{projectId}/punch-items/deleted
POST   /api/v1/projects/{projectId}/punch-items/{itemId}/restore

// Email Notifications
POST   /api/v1/projects/{projectId}/punch-items/{itemId}/send-notification
GET    /api/v1/projects/{projectId}/punch-items/{itemId}/email-history

## 6. Key Workflows to Implement

### Workflow 1: Create & Distribute

User clicks "+ Create" button
Form opens with required fields: Title, Punch Item Manager, Final Approver
User completes all fields
Click "Save & Create New" or "Save"
System auto-generates sequential number
System sends notification email to Distribution List
Date Notified field auto-populates
Email Sent flag set to True
Status remains "Draft" until first response

### Workflow 2: Respond to Assignment

Assignee receives notification email
Clicks link to item detail view
Views item information and attachments
Adds comment with response
Clicks "Work Required" status button
System records status change in Change History
Updates Assignee Tracker with Date Ready for Review
Original creator notified of response

### Workflow 3: Close Item

Final Approver views item
Reviews responses and completion status
Clicks "Closed" status button (only if Final Approver)
System auto-populates "Date Closed" with current timestamp
Sets "Closed By" field to current user
Sends closure notification
Item moved to "Closed" section on dashboard

### Workflow 4: Reopen Item

User clicks "Reopen" button on closed item
Status returns to previous state (Work Required/Initiated)
"Date Closed" field cleared
"Closed By" field cleared
Change log entry created
Notification sent to stakeholders

### Workflow 5: Bulk Operations

User selects multiple items via checkboxes
Clicks "Bulk Actions" dropdown
Selects operation (e.g., "Change Status")
Confirms action on selection
System updates all selected items
Change log created for each item
Summary notification sent to user

### Workflow 6: Export

- User clicks "Export" button
- Selects format (PDF, PDF w/ descriptions, PDF w/ photos, CSV)
- System generates document with applied filters
- Triggers browser download
- File named with timestamp: punch-list-2025-01-06.pdf

## 7. Mobile-Specific Features

Quick Capture: Take photo → auto-creates punch item with location
Offline Mode: Items saved locally, sync when reconnected
Push Notifications: Real-time alerts for status changes
GPS Integration: Auto-tag location on creation
Simplified UI: Touch-optimized forms
Field Photos: Attach photos directly from camera
Bulk Download: Download items for offline access

## 8. Security & Compliance

Role-Based Access Control:

Admin: Full access
Standard: Create/edit own items, respond if assigned
Read Only: View only (with granular permission option)
Custom: Superintendent, Owner, Specialty Contractor roles

Audit Trail: Every change logged with user, timestamp, field, old value, new value
Recycle Bin: 30-day retention for deleted items
Private Items: Only visible to creator and assignees
Email Security: Links expire after 30 days
File Size Limit: Display "0/2000" indicating max attachment size
CSRF Protection: On all state-changing operations
SQL Injection Prevention: Parameterized queries

## 9. Performance & Data Considerations

Pagination: Default 75 items per page (as observed in UI: "1-75 of 75")
Lazy Loading: Comments and attachments load on demand
Search Debouncing: 300-500ms delay on search input
Column Customization: Save user preferences
Sort Support: By number (default), title, status, due date
Bulk Operations: Support operations on 100+ items
Change History: Paginate history beyond 9 entries

## 10. Testing Checklist

 Create item with all field combinations
 Edit each field individually
 Status workflow transitions (Draft → Work Required → Initiated → Closed)
 Reopen closed items
 Bulk select and operations
 Search with various keywords
 Apply each filter individually and in combination
 Export in all 4 formats
 Verify change history entries for each action
 Comment and attachment functionality
 Email notification triggers
 Permission enforcement by role
 Recycle bin recovery
 Private item visibility
 Mobile responsiveness
 Offline functionality (mobile)
 Rich text editor formatting
 File upload/drag-drop
 Pagination navigation
 Dashboard widget calculations
 Multi-user concurrent editing


## Merged punch-list.md

## 1. Top Action Bar (Global Controls)

### Primary Actions

- **Create Punch Item -** Opens create form (modal or new page)
- **Export -** PDF / CSV export. Export scope options (all items / filtered / selected)

### Tabbed Views

- My Items
- All Items
- Recycle Bin

Each tab maps to a different filtered dataset

## 2. Search & Filtering System

### Global Search

- Keyword search across:
  - Title
  - Description
  - Reference
  - Assignee
- Debounced input
- Server-side or indexed search

### Filters (Multi-select, combinable)

Each filter requires:

- UI selector
- Backend query support
- Persistent state (URL or local state)

Filter capability for all columns

---

## 3. Column Management System

### Column Chooser

- Show / hide columns
- Reorder columns (drag & drop)
- “Reset to default”
- “Select all”

### Column State

- Per-user saved preferences
- Persisted across sessions

---

## 4. Data Table (Core System)

**Bulk Actions -** Enabled only when rows are selected

- Close
- Edit
- Delete / move to recycle bin
- Reopen

### Row Structure

Each row represents **one punch list item** and supports:

- Checkbox selection
- Row-level actions:
  - View
  - Edit
- Clickable title (detail view)

### Columns (Data Binding Required)

| Column Name          | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `#`                  | Punch list item number (system-generated identifier)                |
| `Title`              | Short description of the punch list item                            |
| `Status`             | Current status of the item (e.g., Initiated, Work Required, Closed) |
| `Ball In Court`      | Person or company currently responsible for next action             |
| `Assignee Name`      | Individual assigned to complete the punch item                      |
| `Assignee Company`   | Company responsible for completing the item                         |
| `Assignee Response`  | Latest response or acknowledgment from the assignee                 |
| `Date Notified`      | Date the assignee was notified                                      |
| `Date Resolved`      | Date the item was marked as resolved                                |
| `Due Date`           | Deadline for completing the item                                    |
| `Creator`            | User who created the punch list item                                |
| `Date Created`       | Date the punch list item was created                                |
| `Punch Item Manager` | Person managing or overseeing the punch item                        |
| `Final Approver`     | Person responsible for final approval                               |
| `Closed By`          | User who closed the punch list item                                 |
| `Date Closed`        | Date the item was officially closed                                 |
| `Type`               | Classification/type of punch item                                   |
| `Trade`              | Trade responsible (e.g., Painting, Electrical, Mechanical)          |
| `Location`           | Physical location within the project                                |
| `Reference`          | Reference info (drawings, specs, or related IDs)                    |
| `Priority`           | Priority level (e.g., High, Medium, Low)                            |
| `Description`        | Detailed description of the issue or required work                  |

Each column needs:

- Sorting logic
- Null/empty state handling
- Formatting rules (dates, badges, truncation)

---

## 6. Sorting & Pagination

### Sorting

- Click-to-sort on most columns
- Asc / Desc state
- Server-side sorting for scale

### Pagination

- Page numbers
- Next / previous
- Page size selector
- Total count display (“1–75 of 75”)

---

## 7. Status & Workflow Engine (Critical)

### Status Lifecycle

**Statuses observed:**

- Initiated
- Work Required
- Ready for Review
- Closed

**Each status requires:**

- Allowed transitions
- Role permissions
- Auto-updates to:
  - Ball in Court
  - Date Resolved
  - Date Closed
  - Closed By

---

## 8. Assignment & Responsibility Logic

### Assignment Model

- One or more assignees
- Assignee company linkage
- Ball-in-court calculation logic

### Notifications

- Triggered on:
  - Assignment
  - Status change
  - Due date changes
- Delivery:
  - Email
  - In-app notifications

---

## 9. Charts & Analytics Widgets

### Items by Assignee Company

- Bar chart
- Grouping logic
- Status-based counts

### Status Breakdown

- Percentage-based visualization
- Real-time reflection of filters

### KPIs

- Average response time
- Total overdue items

All require:

- Aggregation queries
- Filter-aware recalculation

---

## 10. PDF & Document Generation

### Punch Item PDFs

- Per-item printable PDF
- Batch PDF export
- Must include:
  - Item details
  - Metadata
  - Images (if supported)

---

## 11. Permissions & Roles

### Role-Based Access Control

Controls:

- Who can:
  - Create
  - Edit
  - Close
  - Assign
  - Bulk edit
- Field-level editability by role

---

## 12. Performance & UX Considerations

- Virtualized table rows (large datasets)
- Optimistic UI updates
- Loading & empty states
- Error handling
- Autosave for edits
- Mobile responsiveness (at least read-only)

---

## 13. Backend Systems Required

### Core Tables

- Punch Items
- Users
- Companies
- Trades
- Locations
- Status History (audit log)
- Attachments (optional)
- Notifications

### APIs

- List / filter / search
- Bulk update
- Status transitions
- Export endpoints
- Analytics endpoints

---

## 14. Non-Obvious but Critical Features

- Audit trail (who changed what, when)
- Time-based SLA logic (overdue calculation)
- Soft delete (Recycle Bin)
- Data permissions across companies
- Project-scoped isolation
