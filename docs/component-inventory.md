# Alleato-Procore Frontend Component Inventory

## Overview

The Alleato-Procore frontend comprises **470+ component files** spread across **78 directories**, forming a comprehensive construction project management UI. The component architecture is built on top of:

- **shadcn/ui** -- 95 primitive components
- **Radix UI** -- Accessible, unstyled primitives underlying shadcn/ui
- **Tailwind CSS** -- Utility-first styling
- **74+ React Query hooks** for server state management
- **2 Zustand stores** for client-side state
- **3 React contexts** (project, favorites, sheet navigation)
- **18 Zod validation schemas** for form and data validation
- **15 service classes** for business logic encapsulation

---

## UI Primitives (`frontend/src/components/ui/`) -- 95 files

The foundational layer of reusable, unstyled or lightly styled components. These are the building blocks consumed by all higher-level components.

### Form Elements
- `input` -- Text input fields
- `button` -- Action buttons with variants
- `select` -- Single-value selection dropdowns
- `checkbox` -- Boolean toggle checkboxes
- `textarea` -- Multi-line text input
- `radio-group` -- Radio button groups
- `switch` -- Toggle switches

### Layout
- `card` -- Content container cards
- `dialog` -- Modal dialog windows
- `sheet` -- Slide-out panel overlays
- `drawer` -- Bottom/side drawer panels
- `modal` -- Generic modal wrapper
- `accordion` -- Collapsible content sections
- `tabs` -- Tabbed content panels

### Data Display
- `table` -- Data table primitives
- `badge` -- Status and label badges
- `avatar` -- User/entity avatars
- `skeleton` -- Loading placeholder skeletons
- `separator` -- Visual dividers

### Feedback
- `alert` -- Inline alert messages
- `alert-dialog` -- Confirmation dialog with actions
- `toast` (sonner) -- Transient notification toasts
- `progress` -- Progress bars and indicators

### Navigation
- `breadcrumb` -- Breadcrumb trail navigation
- `dropdown-menu` -- Context and action menus
- `pagination` -- Page navigation controls
- `sidebar` -- Collapsible sidebar navigation

### Advanced
- `calendar` -- Date picker calendar
- `carousel` -- Content carousel/slider
- `chart` -- Data visualization charts
- `file-upload` -- File upload dropzone and controls
- `popover` -- Popover content panels
- `hover-card` -- Hover-activated detail cards

### AI-Specific
- `chain-of-thought` -- AI reasoning chain display
- `reasoning` -- AI reasoning step visualization
- `response-stream` -- Streaming AI response renderer
- `prompt-input` -- AI prompt input field
- `code-block` -- Syntax-highlighted code display

### Animation
- `animated-modal` -- Motion-enhanced modal
- `animated-tooltip` -- Animated tooltip overlay
- `hero-parallax` -- Parallax scrolling hero section
- `sparkles` -- Sparkle animation effect
- `dock` -- macOS-style dock component

### Custom
- `unified-modal` -- Standardized modal wrapper
- `unified-slideover` -- Standardized slide-over panel
- `transition-panel` -- Animated panel transitions
- `scroll-area` -- Custom scrollable container

---

## Domain Components (`frontend/src/components/domain/`) -- 40 files

Business-domain-specific components organized by entity type. These encapsulate the UI logic for core construction management entities.

### change-events/ (11 files)
- Forms for creating and editing change events
- RFQ (Request for Quotation) management components
- Line item editors for change event cost breakdowns
- Approval workflow UI with status transitions

### change-orders/ (9 files)
- Change order detail views and summary panels
- Approval chain management and status display
- Export functionality (PDF, CSV)
- File upload components for supporting documents
- Line item tables with cost code association

### contracts/ (9 files)
- Contract creation and editing forms
- Purchase order (PO) forms
- Subcontract management forms
- Schedule of Values (SOV) grid editors
- Cost code selector components for line item categorization

### users/ (4 files)
- User creation and editing forms
- User detail slide-over sheets
- Bulk user add functionality
- Permissions manager for role-based access control

### contacts/ (2 files)
- Contact creation and editing forms
- Project contact assignment forms

### companies/ (2 files)
- Company creation and editing forms
- Company detail views with associated data

### punch-items/ (2 files)
- Punch item creation and editing forms
- Status badge components for punch item lifecycle

### clients/ (1 file)
- Client form dialog for client entity management

### distribution-groups/ (1 file)
- Distribution group creation and management forms

---

## Budget Components (`frontend/src/components/budget/`) -- 51 files

The largest single-feature component directory, reflecting the complexity of construction budget management.

### Tables
- `BudgetLineItemTable` -- Primary budget line item data table
- `budget-table` -- Base budget table component
- `enhanced-budget-table` -- Extended budget table with advanced features
- `budget-details-table` -- Detailed budget breakdown view

### Forms
- `budget-line-item-form` -- Budget line item creation/editing form
- `BudgetLineItemCreatorModal` -- Modal-based line item creation
- `InlineBudgetLineItemCreator` -- Inline row-based line item creation

### Modals (14 files in `modals/`)
- `ApprovedCOsModal` -- Approved change orders detail modal
- `BudgetModificationsModal` -- Budget modification history modal
- `CommittedCostsModal` -- Committed costs breakdown modal
- `DirectCostsModal` -- Direct costs detail modal
- `ForecastToCompleteModal` -- Forecast to complete analysis modal
- `ImportBudgetModal` -- Budget import from external sources
- `UnlockBudgetModal` -- Budget unlock confirmation modal

### Row and Card Views
- `BudgetLineItemRow` -- Individual budget line item row component
- `BudgetLineItemCard` -- Card-based budget line item display

### Tabs
- `cost-codes-tab` -- Cost code management tab
- `change-history-tab` -- Budget change history timeline
- `forecasting-tab` -- Budget forecasting analysis
- `snapshots-tab` -- Budget snapshot comparison
- `budget-modifications-tab` -- Budget modification tracking

### Selectors
- `budget-code-selector` -- Budget code lookup and selection
- `UomSelect` -- Unit of measure selection dropdown

### UI
- `budget-page-header` -- Budget page header with actions
- `budget-status-banner` -- Budget lock/unlock status banner
- `budget-filters` -- Budget filtering controls
- `BudgetViewsManager` -- Budget view configuration manager

### Settings
- `vertical-markup-settings` -- Vertical markup configuration panel

---

## Table Components (`frontend/src/components/tables/`) -- 33 files

A comprehensive data table system providing reusable table infrastructure across all features.

### Core
- `DataTable` -- Primary data table component with sorting, filtering, pagination
- `DataTableResponsive` -- Mobile-responsive data table variant
- `DataTableGroupable` -- Data table with row grouping support

### Toolbar
- `DataTableToolbar` -- Table toolbar with search, filters, and actions
- `DataTableToolbarResponsive` -- Mobile-responsive toolbar variant

### Features
- `DataTablePagination` -- Pagination controls for data tables
- `DataTableFilters` -- Advanced filtering panel
- `DataTableColumnToggle` -- Column visibility toggle
- `DataTableBulkActions` -- Multi-row bulk action toolbar

### States
- `DataTableEmptyState` -- Empty state display for tables with no data
- `DataTableSkeleton` -- Loading skeleton for table content

### Domain-Specific Tables
- `companies-data-table` -- Pre-configured table for company listings
- `contacts-data-table` -- Pre-configured table for contact listings
- `documents-data-table` -- Pre-configured table for document listings
- `employees-data-table` -- Pre-configured table for employee listings

### Unified Table System
- `unified-table-page` -- Standardized table page layout
- `table-toolbar` -- Unified toolbar component
- `detail-panel` -- Slide-out detail panel for row inspection
- `use-unified-table-state` -- Shared table state management hook

### Generic/Reusable
- `GenericTableWithDelete` -- Table with built-in delete functionality
- `generic-editable-table` -- Inline-editable table rows
- `generic-table-factory` -- Factory for generating typed table components

### Mobile
- `MobileFilterModal` -- Mobile-optimized filter modal
- `ResponsiveTableExample` -- Reference implementation for responsive tables

---

## Chat/AI Components (`frontend/src/components/chat/`) -- 29 files

AI-powered chat interface components for the integrated AI assistant.

### Core
- `ChatKit` -- Full-featured chat kit component
- `ChatKitWidget` -- Embeddable chat widget
- `ai-chat-widget` -- AI-specific chat widget wrapper

### Layout
- `chat-layout` -- Overall chat interface layout
- `chat-header` -- Chat panel header with controls
- `chat-sidebar` -- Conversation list sidebar
- `chat-main` -- Main chat message area
- `chat-right-panel` -- Context and details right panel

### Messages
- `message` -- Individual message component
- `chat-message` -- Chat-specific message with metadata
- `message-group` -- Grouped messages by sender/time
- `message-list` -- Scrollable message list container

### Input
- `composer` -- Message composition input area
- `prompt-input` -- AI prompt input with suggestions
- `prompt-suggestion` -- Suggested prompt chips

### Agents
- `agent-panel` -- AI agent selection and control panel
- `agent-panel-rag` -- RAG-enabled agent panel
- `agents-list` -- Available agents listing
- `agents-list-alleato` -- Alleato-specific agent listing

### RAG (Retrieval-Augmented Generation)
- `rag-chatkit-panel` -- RAG-integrated chat panel
- `simple-rag-chat` -- Simplified RAG chat interface

### Rendering
- `markdown` -- Markdown content renderer
- `code-block` -- Syntax-highlighted code block
- `reasoning` -- AI reasoning step display
- `response-stream` -- Streaming response renderer

---

## AI Elements (`frontend/src/components/ai-elements/`) -- 30 files

Visual components for AI workflow visualization and interaction.

### Core
- `artifact` -- AI-generated artifact display
- `canvas` -- Freeform AI workspace canvas
- `message` -- AI message component
- `conversation` -- Conversation thread display

### Workflow
- `chain-of-thought` -- Step-by-step reasoning chain
- `checkpoint` -- Workflow checkpoint marker
- `plan` -- AI plan visualization
- `task` -- Individual task card
- `queue` -- Task queue display

### Connections
- `edge` -- Connection edge between nodes
- `node` -- Workflow node component
- `connection` -- Node connection manager

### UI
- `panel` -- AI element panel container
- `toolbar` -- AI workspace toolbar
- `controls` -- AI interaction controls
- `loader` -- AI processing loader
- `shimmer` -- Loading shimmer effect

### Input
- `prompt-input` -- AI prompt input field
- `suggestion` -- AI suggestion chip
- `model-selector` -- AI model selection dropdown

### Output
- `reasoning` -- AI reasoning display
- `code-block` -- Generated code display
- `image` -- AI-generated image display
- `web-preview` -- Web content preview

---

## Forms Components (`frontend/src/components/forms/`) -- 18 files

A standardized form field library providing consistent form UX across the application.

### Core
- `Form` -- Form wrapper with validation context
- `FormField` -- Individual form field with label and error display
- `FormSection` -- Grouped form section with heading

### Text
- `TextField` -- Standard text input field
- `TextareaField` -- Multi-line text field
- `RichTextField` -- Rich text editor field

### Numbers
- `NumberField` -- Numeric input field
- `MoneyField` -- Currency-formatted input field

### Dates
- `DateField` -- Date picker field

### Selection
- `SelectField` -- Dropdown select field
- `MultiSelectField` -- Multi-value select field
- `SearchableSelect` -- Select with search/filter capability
- `EntitySelect` -- Entity lookup and selection field
- `AutocompleteField` -- Autocomplete input with suggestions

### Boolean
- `CheckboxField` -- Checkbox toggle field
- `ToggleField` -- Switch toggle field

### Files
- `FileUploadField` -- File upload with drag-and-drop

---

## Layout Components (`frontend/src/components/layout/`) -- 14 files

Application-wide layout and structural components.

### Headers
- `AppHeader` -- Top-level application header
- `global-header` -- Global navigation header
- `company-header` -- Company-scoped page header
- `page-header-unified` -- Unified page header component

### Containers
- `PageContainer` -- Standard page content container
- `FormContainer` -- Form-specific content container

### Navigation
- `PageTabs` -- Page-level tab navigation
- `PageTabsV2` -- Updated tab navigation variant
- `PageToolbar` -- Page-level action toolbar

### Context
- `header-context` -- Header state context provider

### Mandatory Pattern

All project pages MUST use the standard `ProjectPageHeader` + `PageContainer` pattern:

```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";

<>
  <ProjectPageHeader
    title="Feature Name"
    description="Feature description"
    actions={<div>...</div>}
  />
  <PageContainer>
    {/* page content */}
  </PageContainer>
</>
```

---

## Feature-Specific Components

Components scoped to individual application features, organized by feature directory.

| Directory | Files | Description |
|-----------|-------|-------------|
| `admin-panel/` | 11 | Admin dashboard, user management, system settings |
| `directory/` | 13 | Project directory, people management, company assignments |
| `direct-costs/` | 10 | Direct cost entry, invoices, cost tracking |
| `project-home/` | 20 | Project dashboard, widgets, activity feeds, quick actions |
| `project-setup-wizard/` | 9 | Multi-step project creation wizard |
| `project/` | 4 | Project-level shared components |
| `scheduling/` | 7 | Gantt chart, task management, dependencies |
| `specifications/` | 5 | Specification sections, revisions, uploads |
| `drawings/` | 5 | Drawing sets, revisions, area management |
| `commitments/` | 4 | Commitment tracking, SOV management |
| `invoicing/` | 3 | Invoice creation, approval, payment tracking |
| `meetings/` | 3 | Meeting minutes, attendees, action items |
| `daily-log/` | 1 | Daily log entries |
| `portfolio/` | 7 | Multi-project portfolio views and analytics |
| `prompt-kit/` | 8 | AI prompt templates and management |
| `misc/` | 58 | Shared utility components, icons, helpers |
| `motion/` | 17 | Framer Motion animation components |
| `nav/` | 11 | Navigation menus, breadcrumbs, sidebar items |
| `header/` | 10 | Header variants and sub-components |
| `layouts/` | 9 | Page layout templates and wrappers |

---

## React Hooks (`frontend/src/hooks/`) -- 74+ files

Custom React hooks organized by domain, primarily wrapping React Query for server state management.

### Auth
- `use-auth-users` -- Authenticated user list queries
- `use-users` -- User CRUD operations
- `use-current-user-profile` -- Current user profile data
- `use-current-user-name` -- Current user display name
- `use-current-user-image` -- Current user avatar image

### Projects
- `use-projects` -- Project CRUD and listing
- `use-companies` -- Company CRUD and listing
- `use-all-companies` -- All companies (unscoped)
- `use-project-companies` -- Companies assigned to a project
- `use-clients` -- Client entity management

### Directory
- `useDirectory` -- Directory listing and search
- `useDirectoryPreferences` -- User directory display preferences
- `useDirectoryRealtime` -- Realtime directory updates via Supabase
- `use-directory-permissions` -- Directory-level permission checks

### Financial
- `use-budget-data` -- Budget line items and summaries
- `use-commitments` -- Commitment tracking
- `use-contracts` -- Contract CRUD operations
- `use-change-events` -- Change event management
- `use-change-orders` -- Change order CRUD
- `use-contract-change-orders` -- Change orders scoped to a contract
- `use-commitment-change-orders` -- Change orders scoped to commitments
- `use-change-event-rfqs` -- RFQs associated with change events
- `use-create-subcontract` -- Subcontract creation mutation
- `use-cost-codes` -- Cost code listing and lookup

### Documents
- `use-drawings` -- Drawing CRUD operations
- `use-drawing-areas` -- Drawing area management
- `use-drawing-sets` -- Drawing set management
- `use-drawing-revisions` -- Drawing revision tracking
- `use-drawing-upload` -- Drawing file upload handling
- `use-specifications` -- Specification CRUD operations
- `use-specification-areas` -- Specification area management
- `use-specification-revisions` -- Specification revision tracking

### Field
- `use-schedule-tasks` -- Schedule task CRUD and dependencies
- `use-rfis` -- RFI (Request for Information) management
- `use-punch-items` -- Punch item CRUD and status tracking
- `use-meetings` -- Meeting CRUD and minutes

### Permissions
- `use-permissions` -- Base permission queries
- `use-permission-templates` -- Permission template management
- `use-project-permissions` -- Project-scoped permission checks
- `use-user-permissions` -- User-scoped permission queries
- `use-project-roles` -- Project role definitions and assignments

### Chat/AI
- `useChatKit` -- Chat kit state and operations
- `use-chat-scroll` -- Auto-scroll behavior for chat
- `use-realtime-chat` -- Realtime chat message subscriptions
- `useThreadCitations` -- Citation tracking in AI threads
- `useKnowledgeDocuments` -- Knowledge base document queries

### Realtime
- `use-realtime-cursors` -- Multi-user cursor position tracking
- `use-realtime-presence-room` -- Presence room for collaborative features

### Utility
- `use-format-currency` -- Currency formatting hook
- `use-infinite-query` -- Infinite scroll query wrapper
- `use-supabase-upload` -- Supabase storage file upload
- `use-toast` -- Toast notification trigger
- `use-mobile` -- Mobile viewport detection
- `use-is-client` -- Client-side rendering check
- `useResponsiveTable` -- Responsive table breakpoint management

---

## Services (`frontend/src/services/`) -- 15 files

Service classes encapsulating business logic and Supabase query patterns.

| Service | Description |
|---------|-------------|
| `DrawingService` | Drawing CRUD, search, and filtering |
| `DrawingSetService` | Drawing set management and ordering |
| `DrawingAreaService` | Drawing area CRUD and assignment |
| `SpecificationService` | Specification CRUD and versioning |
| `SpecificationAreaService` | Specification area management |
| `SpecificationRevisionService` | Specification revision tracking |
| `PunchItemService` | Punch item lifecycle management |
| `directoryService` | Directory listing, search, and filtering |
| `directoryAdminService` | Admin-level directory operations |
| `directoryPreferencesService` | User directory preference persistence |
| `companyService` | Company CRUD and project association |
| `inviteService` | User invitation management |
| `permissionService` | Permission checking and assignment |
| `distributionGroupService` | Distribution group CRUD |

---

## Zod Schemas (`frontend/src/lib/schemas/`) -- 18 files

Validation schemas used with React Hook Form for type-safe form validation.

| Schema | Purpose |
|--------|---------|
| `auth` | Authentication form validation (login, signup) |
| `budget` | Budget line item form validation |
| `budget-db` | Budget database record validation |
| `common` | Shared validation patterns (email, phone, dates) |
| `contact-schema` | Contact creation/editing validation |
| `commitment-export-schema` | Commitment export configuration validation |
| `create-purchase-order-schema` | Purchase order form validation |
| `create-subcontract-schema` | Subcontract form validation |
| `direct-costs` | Direct cost entry validation |
| `drawing-schemas` | Drawing entity validation |
| `financial-schemas` | Financial data validation (amounts, percentages) |
| `fm-global-schemas` | FM Global integration schemas |
| `prime-contract-change-order-schema` | Prime contract CO validation |
| `rfi-schema` | RFI form validation |
| `secrets` | Secret/credential validation |
| `specification-schemas` | Specification entity validation |
| `user-schemas` | User creation/editing validation |

---

## Zustand Stores

### 1. Financial Store (`lib/stores/financial-store.ts`)

Manages global financial state across the application:

- **Commitments** -- Active commitment tracking
- **Change events** -- Change event state and transitions
- **Prime contracts** -- Prime contract data
- **Invoices** -- Invoice tracking and status
- **Budget items** -- Budget line item state
- **Companies** -- Company reference data
- Loading and error states for each domain
- CRUD operation dispatchers
- Uses `devtools` middleware for debugging

### 2. Sidebar Store (`hooks/use-sidebar.ts`)

Manages sidebar UI state:

- Open/close toggle state
- Hover state for auto-expand behavior
- User settings and preferences
- Uses `persist` middleware with `localStorage` for state persistence across sessions

---

## React Contexts

### 1. Project Context
Provides the current project ID and project data to all child components within a project scope. Used by hooks and components to scope queries to the active project.

### 2. Favorites Context
Manages the user's favorited projects and entities, providing quick access and starred indicators throughout the UI.

### 3. Sheet Navigation Context
Coordinates slide-over sheet navigation state, enabling deep-linking into detail views and managing the sheet navigation stack.

---

_Generated using BMAD Method document-project workflow_
