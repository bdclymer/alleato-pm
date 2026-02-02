# PUNCH LIST APPLICATION - Development Instructions for AI Coding Agent

Procore App URL: https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/punchlist/list?p=1&s=&so%5Battribute%5D=number&so%5Bdirection%5D=desc

## Core Overview & Purpose

The Punch List tool is used at the end of construction/project phases to track remaining work items, assign responsibilities, set due dates, and maintain a real-time history of all actions. It should support both web and mobile (iOS/Android) platforms.

This specification provides a comprehensive blueprint for developing a Procore-like punch list system with all documented features and workflows.

## Key Features & Functionality to Implement

A. Item Management

Create punch list items with customizable fields (title, description, location, trade, priority, status)
Edit existing punch list items (assignee, due dates, descriptions, custom fields)
Delete punch list items with recycle bin recovery option
Bulk actions on multiple items simultaneously
Quick Capture feature for rapid mobile item creation
Import punch items from CSV/Excel files

B. Item Details & Metadata

Configurable fieldsets (which fields are visible/required/optional/hidden)
Custom fields support (multi-tiered locations, custom data types)
Status tracking: Open, Closed, In Dispute, Draft, Ready to Close, Pending
Color-coded items on drawings based on status
Item assignment to specific users/contractors/subcontractors
Default Punch Item Manager assignment

C. Communication & Notifications

Comment system on punch list items
Email notifications for assignees with attachment links (with expiration)
Overdue email notifications for responsible parties
Notification preference controls (which emails are sent)
Response functionality for assignees to provide updates
Notify assignees button/action

D. Attachment & Photo Management

Attach photos to punch list items from mobile devices
Photos auto-populate in the Photos Tool
Attach multiple document types (PDFs, Excel, images, etc.)
Photo viewer and management interface
Support for drawing attachments

E. Workflow & Status Management

Multi-stage workflow: Draft → Sent → In Progress → Ready to Close → Closed
Dispute resolution workflow
Acceptance/rejection workflows
Status filtering and dashboard tracking
Change history with full audit trail (timestamps, user actions, modifications)
Real-time action history display

F. Filtering & Search

Advanced search with keyword matching
Filter by status (open, closed, pending)
Filter by assignee
Filter by due date ranges
Filter by custom fields and multi-tiered locations
Filter by contractor/trade type
Filter by private items (user-specific access)

G. Templates

Project-level punch item templates
Template categories and hierarchies
Template activation/deactivation per project
Bulk template creation for consistency
Template editing and deletion with category management

H. Reporting & Export

Export punch list items as PDFs
Export punch list log as CSV
Export punch list log as PDF
Custom punch list report generation
Dashboard view with summary metrics
Real-time status tracking dashboard

I. Access Control & Permissions

Role-based permissions:

```
Admin: Full access to all features
Standard: Create/edit items they own, respond if assigned
Read Only: View items with limited response capability
Special roles: Superintendent, Owner, Specialty Contractor
```

Granular permissions for specific actions (e.g., "Respond to Punch Items Assigned to Users within Same Company")
Private punch list items (visible only to creator/assignees)
Permission templates for quick role assignment

J. Distribution & Notification

```
Distribution groups and distribution lists
Send items to multiple assignees
Track item delivery status ("Date Notified" field)
Email batch operations
```

3. Technical Data Model
Core Entities:

PunchListItem (id, title, description, status, priority, assignee, created_by, date_created, due_date, date_notified, final_approver, punch_manager)
PunchListTemplate (id, name, category_id, active, fields, default_values)
PunchListComment (id, item_id, user_id, text, timestamp)
PunchListAttachment (id, item_id, file_path, file_type, upload_date)
PunchListHistory (id, item_id, change_type, changed_by, timestamp, old_value, new_value)
User (id, name, email, role, permissions)
Project (id, name, punch_list_settings)

Key Fields in Item Model:

title (string)
description (text)
status (enum: Draft, Open, In Progress, Ready to Close, Closed, In Dispute, Pending)
priority (enum: Low, Medium, High)
assignee (user_id)
punch_item_manager (user_id)
final_approver (user_id)
due_date (datetime)
date_notified (datetime)
location (multi-tiered location reference)
trade (enum of standard construction trades)
is_private (boolean)
created_by (user_id)
created_at (timestamp)
updated_at (timestamp)
attachments (array of attachment_ids)
custom_fields (JSON for flexibility)

4. Platform-Specific Features
Web Platform:

Full CRUD operations on all items
Advanced filtering and search UI
Dashboard with status summaries
Drag-and-drop template management
Bulk import interface
Report generation and export
Settings/configuration panel
Column customization for list view

Mobile Platforms (iOS/Android):

Quick Capture feature (camera-to-punch-list)
Create punch list items offline (sync when online)
View assigned items with photo galleries
Respond to items in the field
Close items with final approval
Download items for offline access
GPS-based location tagging (optional)
Push notifications for updates
Simplified UI optimized for touch

5. Integration Points

Drawing Tool integration (mark punch items on drawings, color-coded by status)
Photos Tool integration (auto-populate photos attached to items)
Maps integration (optional - visualize items by location)
Directory Tool integration (user/contractor lookup)
Reports Tool integration (custom punch list reports)
Email system (notifications, batch delivery, link expiration)
Import system (CSV/Excel parsing and validation)

6. Key Workflows to Implement
Create & Assign Workflow:

User creates item (Draft status)
System validates required fields based on fieldset configuration
User assigns to team member
System sends notification email
Date Notified field auto-populates

### Response & Resolution Workflow:

Assignee receives notification
Assignee views item details, attachments, comments
Assignee provides response/update via comment
Punch Manager reviews
Item moves to "Ready to Close"
Final Approver accepts/rejects
Status changes to Closed or In Dispute

### Bulk Import Workflow:

Admin uploads CSV/Excel file
System validates data format
Preview import before committing
Create items in batch
Auto-assign based on template rules

7. Security & Compliance

Audit trail for all actions (who, what, when)
Recycle bin for deleted items (configurable retention)
Email link expiration (default 30 days)
Private item visibility restrictions
Role-based access control enforcement
Data validation on all inputs
CSRF protection
SQL injection prevention

#### 8. UI/UX Components Needed

Punch list item form (create/edit)
Item detail view with expandable sections
List/grid view with sorting and filtering
Status timeline/workflow visualization
Comment thread component
File upload/gallery component
Template builder interface
Settings panel for configuration
Dashboard with KPI cards
Search bar with advanced options
Mobile-optimized navigation
Notification center

#### 9. API Endpoints (RESTful)

POST /api/punch-items (create)
GET /api/punch-items (list with filters)
GET /api/punch-items/{id} (detail)
PATCH /api/punch-items/{id} (update)
DELETE /api/punch-items/{id} (delete)
POST /api/punch-items/{id}/comments (add comment)
POST /api/punch-items/{id}/attachments (add file)
GET /api/punch-items/{id}/history (change log)
POST /api/punch-items/import (batch import)
GET /api/punch-items/export (export to CSV/PDF)
POST /api/templates (create template)
GET /api/templates (list templates)
PATCH /api/templates/{id} (update template)

#### 10. Testing Checklist

CRUD operations on all user roles
Permission enforcement by role
Email notification delivery and formatting
File attachment upload/download
Search and filter accuracy
Import validation and error handling
Mobile responsiveness
Offline functionality (mobile)
Status workflow transitions
Recycle bin recovery
Template application to new items
Bulk operations
Performance with large datasets (1000+ items)


# PUNCH LIST APPLICATION - Updated Development Specification

This specification provides a comprehensive blueprint for developing a Procore-like punch list system with all documented features and workflows.

Based on Live Procore Implementation Analysis

## 1. Core Overview & Purpose
The Punch List tool tracks remaining work items at the end of construction projects, manages assigned responsibilities, maintains due dates, and preserves a complete audit trail of all actions. Supports web and mobile (iOS/Android) platforms.

## 2. Verified Key Features & Functionality

### A. Item Management (Core CRUD)

Create Punch List Items with auto-generated sequential numbers (starting from 1)
Edit Punch List Items - modify any field after creation
Delete Punch List Items with recovery via Recycle Bin
Bulk Actions on multiple items (select via checkboxes)
Status Transitions: Draft → Work Required → Initiated → Closed
Reopen Items - change closed items back to open status
Quick Capture (mobile) - rapid field-based item creation with photo

### B. Complete Field Structure (Verified)
General Information Section:

Title (required) - full text field
Number (auto-generated) - read-only sequential integer
Punch Item Manager (required) - single user assignment with clear button
Type (dropdown) - configurable item types
Assignee(s) (optional) - multi-select user assignment with company affiliation display
Due Date (date picker) - with clear button
Location (dropdown/hierarchical) - multi-tiered location support
Priority (dropdown) - High, Medium, Low, etc.
Final Approver (required) - single user assignment with clear button
Distribution List (dropdown) - pre-configured distribution groups

#### Additional Fields:

Trade (dropdown) - standard construction trades
Schedule Impact (dropdown)
Cost Impact (dropdown)
Cost Codes (dropdown/searchable)
Reference (text) - free-form reference number/identifier
Description (rich text editor) - with formatting toolbar (Bold, Italic, Underline, Strikethrough, Lists, etc.)
Private (checkbox) - boolean flag for visibility control

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

Workflow Tracking Fields:

Assignees Table with columns:

Name
Date Notified
Date Ready for Review
Date Work Not Accepted
Date Resolved
Response (status display)
Comments

C. Dashboard & Analytics
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

D. List View & Columns
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
E. Search & Filtering
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

F. Activity Feed & Comments
Right-Side Activity Column:

Add Comment text area (expandable)
Add Attachment button with file size limit display (0/2000)
Timeline of activities with:

User avatar and name
Timestamp (e.g., "8:34 AM")
Action type ("Status Update:")
Status badge (color-coded: Closed=green, Work Required=orange, Initiated=blue)
Activity date separator

G. Change History (Audit Trail)
Change History Tab Contents:

Sortable table with columns:

Date (sortable)
Action By (user name)
Changed (field name that was modified)
From (previous value)
To (new value)

Examples tracked:

Status changes
Date Closed assignments
Ball In Court transitions
Email Sent flag changes
Assignment changes
Item creation events


Timestamp format: "Mon Apr 14, 2025 at 08:34 am EDT"
Pagination support for large histories

H. Related Items Tab

Shows count of related items (0) in tab
Used for linking punch items to other items

I. Emails Tab

Shows count of email notifications sent
Tracks email distribution history

J. Export Functionality
Export Options (from Export button):

PDF - Basic punch list as PDF
PDF w/ descriptions - Includes full descriptions
PDF w/ photos & drawings - Rich media export
CSV - Spreadsheet format for Excel/analysis

Per-Item Export:

PDF icon next to each item in list view

K. Bulk Operations
Bulk Actions Dropdown:

Multi-select items via checkboxes
Common operations:

Mass status updates
Mass assign
Mass delete
Export selected items



L. Item Detail View Tabs

General Tab (primary content)
Related Items - Link to other punch items
Emails - Track email notifications and delivery
Change History - Complete audit trail with 9+ entries shown

M. View Modes
Tab Navigation:

My Items (0) - Personal/assigned items
All Items (75) - Complete list
Recycle Bin (0) - Deleted items for recovery


3. Technical Data Model - Updated
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

4. UI/UX Component Library Needed
Layout Components:

Responsive grid layout (2-column for desktop)
Left panel for Item Information (60%)
Right panel for Activity Feed (40%)
Mobile responsive stacking

Form Components:

Text input with clear button
Rich text editor with toolbar
Dropdown/Select with search
Multi-select dropdown
Date picker (with clear button)
Checkbox with label
User picker/selector
File upload with drag & drop
Notification badges (colored status indicators)

List Components:

Data table with sortable columns
Bulk select checkboxes
Pagination controls
Filter chip display
Status indicators with color coding
Avatar images for users

Widget Components:

Donut/pie chart (Status distribution)
Horizontal bar chart (Company distribution)
Metric cards (response time, overdue count)
Activity feed timeline
Tabs interface

Navigation Components:

Breadcrumb trail (Punch List > Item #1 > Title)
Tab switcher (General, Related Items, Emails, Change History)
Filter dropdown menu

Buttons & Actions:

Primary action button (Create, Save)
Secondary buttons (Cancel, Edit, View)
Dropdown menus (Bulk Actions, More Options)
Icon buttons (PDF, Link)


5. API Endpoints (RESTful)
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

6. Key Workflows to Implement
Workflow 1: Create & Distribute

User clicks "+ Create" button
Form opens with required fields: Title, Punch Item Manager, Final Approver
User completes all fields
Click "Save & Create New" or "Save"
System auto-generates sequential number
System sends notification email to Distribution List
Date Notified field auto-populates
Email Sent flag set to True
Status remains "Draft" until first response

Workflow 2: Respond to Assignment

Assignee receives notification email
Clicks link to item detail view
Views item information and attachments
Adds comment with response
Clicks "Work Required" status button
System records status change in Change History
Updates Assignee Tracker with Date Ready for Review
Original creator notified of response

Workflow 3: Close Item

Final Approver views item
Reviews responses and completion status
Clicks "Closed" status button (only if Final Approver)
System auto-populates "Date Closed" with current timestamp
Sets "Closed By" field to current user
Sends closure notification
Item moved to "Closed" section on dashboard

Workflow 4: Reopen Item

User clicks "Reopen" button on closed item
Status returns to previous state (Work Required/Initiated)
"Date Closed" field cleared
"Closed By" field cleared
Change log entry created
Notification sent to stakeholders

Workflow 5: Bulk Operations

User selects multiple items via checkboxes
Clicks "Bulk Actions" dropdown
Selects operation (e.g., "Change Status")
Confirms action on selection
System updates all selected items
Change log created for each item
Summary notification sent to user

Workflow 6: Export

User clicks "Export" button
Selects format (PDF, PDF w/ descriptions, PDF w/ photos, CSV)
System generates document with applied filters
Triggers browser download
File named with timestamp: punch-list-2025-01-06.pdf


7. Mobile-Specific Features

Quick Capture: Take photo → auto-creates punch item with location
Offline Mode: Items saved locally, sync when reconnected
Push Notifications: Real-time alerts for status changes
GPS Integration: Auto-tag location on creation
Simplified UI: Touch-optimized forms
Field Photos: Attach photos directly from camera
Bulk Download: Download items for offline access


8. Security & Compliance

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


9. Performance & Data Considerations

Pagination: Default 75 items per page (as observed in UI: "1-75 of 75")
Lazy Loading: Comments and attachments load on demand
Search Debouncing: 300-500ms delay on search input
Column Customization: Save user preferences
Sort Support: By number (default), title, status, due date
Bulk Operations: Support operations on 100+ items
Change History: Paginate history beyond 9 entries


10. Testing Checklist

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


This updated specification reflects the actual Procore implementation and provides a comprehensive blueprint for developing a production-grade Punch List system.