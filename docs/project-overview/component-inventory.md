# Component Inventory — Alleato-PM

> Generated: 2026-03-22 (merged with earlier inventory) | Source: `frontend/src/components/`, `frontend/src/hooks/`, `frontend/src/services/`, `frontend/src/lib/stores/`

---

## Overview

| Category | Count |
|----------|-------|
| Component directories | 100+ |
| React Query hooks | ~80 |
| Service files | 14 |
| Zustand stores | 1 (`financial-store.ts`) |
| Design system (ds/) components | 8 |
| UI primitives (ui/) | 55+ |
| React contexts | 3 (project, favorites, sheet navigation) |
| Zod validation schemas | 18 |

**Tech stack:**
- **shadcn/ui** -- base primitive components
- **Radix UI** -- Accessible, unstyled primitives underlying shadcn/ui
- **Tailwind CSS** -- Utility-first styling
- **React Query v5** -- Server state management
- **Zustand** -- Client-side state (financial store)
- **Zod** -- Form and data validation

---

## UI Primitives (`@/components/ui/`)

Base shadcn/ui components -- source-copied Radix UI primitives styled with Tailwind CSS. **Only shadcn primitives live here; do not add custom components.**

| Component | File | Description |
|-----------|------|-------------|
| `Accordion` | `accordion.tsx` | Collapsible panel |
| `AlertDialog` | `alert-dialog.tsx` | Destructive action confirmation modal |
| `Alert` | `alert.tsx` | Contextual notification |
| `Avatar` | `avatar.tsx` | User avatar with fallback initials |
| `Badge` | `badge.tsx` | Status pill / label |
| `Breadcrumb` | `breadcrumb.tsx` | Navigation trail |
| `ButtonGroup` | `button-group.tsx` | Grouped action buttons |
| `Button` | `button.tsx` | Primary action button with variants |
| `Calendar` | `calendar.tsx` | Date picker calendar |
| `Card` | `card.tsx` | Content container |
| `Carousel` | `carousel.tsx` | Scrolling item carousel |
| `Chart` | `chart.tsx` | Chart wrapper (Recharts) |
| `Checkbox` | `checkbox.tsx` | Boolean input |
| `Collapsible` | `collapsible.tsx` | Toggle show/hide |
| `Command` | `command.tsx` | Command palette / combobox |
| `Container` | `container.tsx` | Max-width content wrapper |
| `Dialog` | `dialog.tsx` | Modal overlay |
| `Drawer` | `drawer.tsx` | Bottom/side drawer (Vaul) |
| `DropdownMenu` | `dropdown-menu.tsx` | Context / action menu |
| `EmptyState` | `empty-state.tsx` | Zero-result placeholder |
| `Form` | `form.tsx` | React Hook Form wrapper with validation |
| `Heading` | `heading.tsx` | Semantic heading levels |
| `HoverCard` | `hover-card.tsx` | Floating hover tooltip |
| `InlineEdit` | `inline.tsx` | Inline editable cell |
| `InputGroup` | `input-group.tsx` | Input with prefix/suffix |
| `Input` | `input.tsx` | Text input |
| `Label` | `label.tsx` | Form field label |
| `MetricCard` | `metric-card.tsx` | Single KPI card |
| `Modal` | `modal.tsx` / `modal/` | Generic modal |
| `NumberInput` | `number-input.tsx` | Numeric input with constraints |
| `Pagination` | `pagination.tsx` | Page navigation |
| `Popover` | `popover.tsx` | Floating content panel |
| `Progress` | `progress.tsx` | Progress bar |
| `RadioGroup` | `radio-group.tsx` | Radio button group |
| `ScrollArea` | `scroll-area.tsx` | Custom scrollbar wrapper |
| `SectionCard` | `section-card.tsx` | Section with card border |
| `SectionHeader` | `section-header.tsx` | Title + count + action row |
| `Select` | `select.tsx` | Select dropdown |
| `Separator` | `separator.tsx` | Horizontal/vertical divider |
| `Sheet` | `sheet.tsx` | Side panel |
| `Sidebar` | `sidebar.tsx` | App sidebar shell |
| `Skeleton` | `skeleton.tsx` | Loading placeholder shimmer |
| `Slider` | `slider.tsx` | Range input |
| `Sonner` | `sonner.tsx` | Toast notifications |
| `Spinner` | `spinner.tsx` | Loading spinner |
| `Stack` | `stack.tsx` | Flex stack layout helper |
| `SummaryCardGrid` | `summary-card-grid.tsx` | Grid of summary cards |
| `Switch` | `switch.tsx` | Toggle switch |
| `Table` | `table.tsx` | HTML table primitives |
| `Tabs` | `tabs.tsx` | Tab navigation |
| `Text` | `text.tsx` | Semantic text with variants |
| `Textarea` | `textarea.tsx` | Multi-line text input |
| `ToggleGroup` | `toggle-group.tsx` | Button toggle group |
| `Toggle` | `toggle.tsx` | Single toggle button |
| `Tool` | `tool.tsx` | AI tool call display |
| `Tooltip` | `tooltip.tsx` | Hover tooltip |
| `TransitionPanel` | `transition-panel.tsx` | Animated panel switch |
| `UnifiedModal` | `unified-modal.tsx` | Standardized modal dialog |
| `UnifiedSlideover` | `unified-slideover.tsx` | Standardized side panel |

**AI-Specific UI Primitives:**
- `chain-of-thought` -- AI reasoning chain display
- `reasoning` -- AI reasoning step visualization
- `response-stream` -- Streaming AI response renderer
- `prompt-input` -- AI prompt input field
- `code-block` -- Syntax-highlighted code display

**Animation Primitives:**
- `animated-modal` -- Motion-enhanced modal
- `animated-tooltip` -- Animated tooltip overlay
- `hero-parallax` -- Parallax scrolling hero section
- `sparkles` -- Sparkle animation effect
- `dock` -- macOS-style dock component

---

## Design System Components (`@/components/ds/`)

Custom design system components. Import these for consistent status display, metrics, tables, and empty states.

| Component | File | Usage |
|-----------|------|-------|
| `AvatarStack` | `avatar-stack.tsx` | Overlapping avatar initials group |
| `DataTable` | `data-table.tsx` | Premium data table with correct header/row/hover styling |
| `EmptyState` | `empty-state.tsx` | Icon + title + description + action button |
| `Eyebrow` | `eyebrow.tsx` | 11px uppercase tracking-wider label |
| `KpiBlock` / `KpiRow` | `kpi.tsx` | 3-tier metric display (value, label, delta) |
| `SectionHeader` | `section-header.tsx` | Section title + count + action link |
| `StatusBadge` | `status-badge.tsx` | Pass status string -> correct pill color automatically |
| `StatusDot` | `status-badge.tsx` | Minimal inline dot for table rows |
| `StatusText` | `status-badge.tsx` | Plain muted status text |

---

## Layout Components (`@/components/layout/`)

Page structure components. Every page must use an archetype from here.

| Component | File | Description |
|-----------|------|-------------|
| `AppHeader` | `AppHeader.tsx` | Top navigation bar |
| `Footer` | `Footer.tsx` | Page footer |
| `FormContainer` | `FormContainer.tsx` | Padded form content area |
| `PageContainer` | `PageContainer.tsx` | Standard page content wrapper |
| `PageLayout` | `PageLayout.tsx` | Full-page layout shell |
| `PageTabs` | `PageTabs.tsx` | Tabbed page navigation |
| `PageTabsV2` | `PageTabsV2.tsx` | Improved tab navigation |
| `ProjectFormPageLayout` | `ProjectFormPageLayout.tsx` | Layout for project-scoped forms |
| `ProjectPageHeader` | `page-header-unified.tsx` | Standard project page header (title, description, actions) |
| `PageShell` | `page-shell.tsx` | Full-height page shell |

**MANDATORY pattern for project pages:**
```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";
<>
  <ProjectPageHeader title="..." description="..." actions={...} />
  <PageContainer>{/* content */}</PageContainer>
</>
```

---

## Table System (`@/components/tables/`)

Shared data table infrastructure used by all financial tool pages.

### Core
| Component | Description |
|-----------|-------------|
| `DataTable` | Core headless table (TanStack Table) with sorting, filtering, pagination |
| `DataTableResponsive` | Mobile-responsive data table variant |
| `DataTableGroupable` | Data table with row grouping support |

### Toolbar
| Component | Description |
|-----------|-------------|
| `DataTableToolbar` | Search + filters + export toolbar |
| `DataTableToolbarResponsive` | Mobile-responsive toolbar variant |

### Features
| Component | Description |
|-----------|-------------|
| `DataTableBulkActions` | Multi-row selection action bar |
| `DataTableColumnToggle` | Column visibility dropdown |
| `DataTableFilters` | Advanced filter panel |
| `DataTablePagination` | Page controls |

### States
| Component | Description |
|-----------|-------------|
| `DataTableEmptyState` | No results placeholder |
| `DataTableSkeleton` | Loading shimmer |

### Unified Table System
| Component | Description |
|-----------|-------------|
| `unified/` | `UnifiedTablePage` -- standard full-page table used by Budget, Prime Contracts, Commitments, Change Events, Direct Costs (5 of 7 financial tools) |
| `table-toolbar` | Unified toolbar component |
| `detail-panel` | Slide-out detail panel for row inspection |
| `use-unified-table-state` | Shared table state management hook |

### Domain-Specific Tables
- `companies-data-table` -- Pre-configured table for company listings
- `contacts-data-table` -- Pre-configured table for contact listings
- `documents-data-table` -- Pre-configured table for document listings
- `employees-data-table` -- Pre-configured table for employee listings

### Generic/Reusable
- `GenericTableWithDelete` -- Table with built-in delete functionality
- `generic-editable-table` -- Inline-editable table rows
- `generic-table-factory` -- Factory for generating typed table components

### Mobile
- `MobileFilterModal` -- Mobile-optimized filter modal
- `ResponsiveTableExample` -- Reference implementation for responsive tables

---

## Domain Components

### Budget (`@/components/budget/`) -- 51 files

The largest single-feature component directory, reflecting the complexity of construction budget management.

**Tables:**
- `BudgetLineItemTable` -- Primary budget line item data table
- `budget-table` -- Base budget table component
- `enhanced-budget-table` -- Extended budget table with advanced features
- `budget-details-table` -- Detailed budget breakdown view

**Forms:**
- `budget-line-item-form` -- Budget line item creation/editing form
- `BudgetLineItemCreatorModal` -- Modal-based line item creation
- `InlineBudgetLineItemCreator` -- Inline row-based line item creation

**Modals (14 files in `modals/`):**
- `ApprovedCOsModal` -- Approved change orders detail modal
- `BudgetModificationsModal` -- Budget modification history modal
- `CommittedCostsModal` -- Committed costs breakdown modal
- `DirectCostsModal` -- Direct costs detail modal
- `ForecastToCompleteModal` -- Forecast to complete analysis modal
- `ImportBudgetModal` -- Budget import from external sources
- `UnlockBudgetModal` -- Budget unlock confirmation modal

**Row and Card Views:**
- `BudgetLineItemRow` -- Individual budget line item row component
- `BudgetLineItemCard` -- Card-based budget line item display

**Tabs:**
- `cost-codes-tab` -- Cost code management tab
- `change-history-tab` -- Budget change history timeline
- `forecasting-tab` -- Budget forecasting analysis
- `snapshots-tab` -- Budget snapshot comparison
- `budget-modifications-tab` -- Budget modification tracking

**Selectors:**
- `budget-code-selector` -- Budget code lookup and selection
- `UomSelect` -- Unit of measure selection dropdown

**UI:**
- `budget-page-header` -- Budget page header with actions
- `budget-status-banner` -- Budget lock/unlock status banner
- `budget-filters` -- Budget filtering controls
- `BudgetViewsManager` -- Budget view configuration manager

**Settings:**
- `vertical-markup-settings` -- Vertical markup configuration panel

### Commitments (`@/components/commitments/`)
Subcontract / PO forms, commitment change orders, invoice management, line item tables.

### Change Events (`@/components/change-events/` or `@/components/domain/change-events/`) -- 11 files
- Forms for creating and editing change events
- RFQ (Request for Quotation) management components
- Line item editors for change event cost breakdowns
- Approval workflow UI with status transitions

### Change Orders (`@/components/domain/change-orders/`) -- 9 files
- Change order detail views and summary panels
- Approval chain management and status display
- Export functionality (PDF, CSV)
- File upload components for supporting documents
- Line item tables with cost code association

### Contracts (`@/components/domain/contracts/`) -- 9 files
- Contract creation and editing forms
- Purchase order (PO) forms
- Subcontract management forms
- Schedule of Values (SOV) grid editors
- Cost code selector components for line item categorization

### Direct Costs (`@/components/direct-costs/`) -- 10 files
`DirectCostForm.tsx` -- creation/edit form (known issue: hangs on submission as of last audit).

### Drawings (`@/components/drawings/`) -- 5 files
Drawing viewer, drawing set management, revision tracking, annotation pins.

### Invoicing (`@/components/invoicing/`) -- 3 files
Owner SOV-based invoice creation, billing period management. Uses legacy `DataTablePage` (needs migration to `UnifiedTablePage`).

### Meetings (`@/components/meetings/`) -- 3 files
Meeting list, transcript viewer, AI digest display, meeting prep.

### Scheduling (`@/components/scheduling/`) -- 7 files
Gantt/list view for schedule tasks, bulk operations, dependency management.

### Specifications (`@/components/specifications/`) -- 5 files
Specification sections, revisions, file downloads.

### RFIs (`@/components/rfis/`)
RFI list and detail views.

### Directory (`@/components/directory/`) -- 13 files
Company and contact directory views, people management, company assignments.

### Users (`@/components/domain/users/`) -- 4 files
- User creation and editing forms
- User detail slide-over sheets
- Bulk user add functionality
- Permissions manager for role-based access control

### Contacts (`@/components/domain/contacts/`) -- 2 files
- Contact creation and editing forms
- Project contact assignment forms

### Companies (`@/components/domain/companies/`) -- 2 files
- Company creation and editing forms
- Company detail views with associated data

### Punch Items (`@/components/domain/punch-items/`) -- 2 files
- Punch item creation and editing forms
- Status badge components for punch item lifecycle

### Clients (`@/components/domain/clients/`) -- 1 file
- Client form dialog for client entity management

### Distribution Groups (`@/components/domain/distribution-groups/`) -- 1 file
- Distribution group creation and management forms

### Project (`@/components/project/`)
Project home, project setup wizard, project-level configuration.

---

## AI & Chat Components

### AI Assistant (`@/components/ai-assistant/`)
Project-scoped AI chat interface using Vercel AI SDK v6 + `useChat` hook.

### AI Elements (`@/components/ai-elements/`) -- 30 files

Production chat UI components:

**Core:**
- `Message` -- Full chat message with UIMessage parts (text, tool calls, reasoning)
- `MessageResponse` -- Universal AI markdown renderer (Streamdown + code/math/mermaid plugins)
- `Conversation` -- Full conversation thread display
- `Tool` -- AI tool call result display
- `artifact` -- AI-generated artifact display
- `canvas` -- Freeform AI workspace canvas

**Workflow:**
- `chain-of-thought` -- Step-by-step reasoning chain
- `checkpoint` -- Workflow checkpoint marker
- `plan` -- AI plan visualization
- `task` -- Individual task card
- `queue` -- Task queue display

**Connections:**
- `edge` -- Connection edge between nodes
- `node` -- Workflow node component
- `connection` -- Node connection manager

**UI:**
- `panel` -- AI element panel container
- `toolbar` -- AI workspace toolbar
- `controls` -- AI interaction controls
- `loader` -- AI processing loader
- `shimmer` -- Loading shimmer effect

**Input:**
- `prompt-input` -- AI prompt input field
- `suggestion` -- AI suggestion chip
- `model-selector` -- AI model selection dropdown

**Output:**
- `reasoning` -- AI reasoning display
- `code-block` -- Generated code display
- `image` -- AI-generated image display
- `web-preview` -- Web content preview

### Chat (`@/components/chat/`) -- 29 files

General-purpose chat container components:

**Layout:**
- `chat-layout` -- Overall chat interface layout
- `chat-header` -- Chat panel header with controls
- `chat-sidebar` -- Conversation list sidebar
- `chat-main` -- Main chat message area
- `chat-right-panel` -- Context and details right panel

**Messages:**
- `message` -- Individual message component
- `chat-message` -- Chat-specific message with metadata
- `message-group` -- Grouped messages by sender/time
- `message-list` -- Scrollable message list container

**Input:**
- `composer` -- Message composition input area
- `prompt-input` -- AI prompt input with suggestions
- `prompt-suggestion` -- Suggested prompt chips

**Agents:**
- `agent-panel` -- AI agent selection and control panel
- `agent-panel-rag` -- RAG-enabled agent panel
- `agents-list` -- Available agents listing
- `agents-list-alleato` -- Alleato-specific agent listing

**RAG:**
- `rag-chatkit-panel` -- RAG-integrated chat panel
- `simple-rag-chat` -- Simplified RAG chat interface

**Rendering:**
- `markdown` -- Markdown content renderer
- `code-block` -- Syntax-highlighted code block
- `reasoning` -- AI reasoning step display
- `response-stream` -- Streaming response renderer

### RAG (`@/components/rag/`)
RAG-enhanced chat components, procore-docs search interface.

### Procore Docs (`@/components/procore-docs/`)
Procore documentation search UI using RAG.

---

## Collaboration & Real-time Components

### Liveblocks (`@/components/liveblock/`)
Real-time collaboration infrastructure using Liveblocks v3.

### Live Cursors (`@/components/live-cursors/`)
Multi-user cursor presence display.

### Canvas Comments (`@/components/canvas-comments/`)
Annotation/comment layer for collaborative canvases.

### Realtime (`@/components/realtime/`)
Shared real-time state utilities.

---

## Auth & Guards (`@/components/auth/`, `@/components/guards/`)

| Component | Description |
|-----------|-------------|
| `AuthForm` | Login / signup form |
| `PermissionGuard` | Wraps content requiring specific permissions |
| `ProjectAccessGuard` | Ensures user has access to current project |
| `AdminGuard` | Restricts to admin users |

---

## Notifications & Monitoring

### Notifications (`@/components/notifications/`)
User notification bell, notification list.

### Monitoring (`@/components/monitoring/`)
Dev/ops monitoring dashboard components.

### Financial Insights (`@/components/financial-insights/`)
AI-generated financial alerts and cross-reference displays.

---

## Forms Components (`@/components/forms/`) -- 18 files

A standardized form field library providing consistent form UX across the application.

| Component | Description |
|-----------|-------------|
| `Form` | Form wrapper with validation context |
| `FormField` | Individual form field with label and error display |
| `FormSection` | Grouped form section with heading |
| `TextField` | Standard text input field |
| `TextareaField` | Multi-line text field |
| `RichTextField` | Rich text editor field |
| `NumberField` | Numeric input field |
| `MoneyField` | Currency-formatted input field |
| `DateField` | Date picker field |
| `SelectField` | Dropdown select field |
| `MultiSelectField` | Multi-value select field |
| `SearchableSelect` | Select with search/filter capability |
| `EntitySelect` | Entity lookup and selection field |
| `AutocompleteField` | Autocomplete input with suggestions |
| `CheckboxField` | Checkbox toggle field |
| `ToggleField` | Switch toggle field |
| `FileUploadField` | File upload with drag-and-drop |

---

## Feature-Specific Components

Components scoped to individual application features, organized by feature directory.

| Directory | Files | Description |
|-----------|-------|-------------|
| `project-home/` | 20 | Project dashboard, widgets, activity feeds, quick actions |
| `project-setup-wizard/` | 9 | Multi-step project creation wizard |
| `portfolio/` | 7 | Multi-project portfolio views and analytics |
| `prompt-kit/` | 8 | AI prompt templates and management |
| `misc/` | 58 | Shared utility components, icons, helpers |
| `motion/` | 17 | Framer Motion animation components |
| `nav/` | 11 | Navigation menus, breadcrumbs, sidebar items |
| `header/` | 10 | Header variants and sub-components |
| `layouts/` | 9 | Page layout templates and wrappers |
| `tutorial/` | 5 | Tutorial/onboarding components |
| `daily-log/` | 1 | Daily log entries |

---

## React Query Hooks (`@/hooks/`)

All hooks follow the pattern `use-{resource}.ts` and wrap Supabase/API calls with React Query.

### Auth & User
| Hook | Description |
|------|-------------|
| `use-auth-users` | Supabase auth users list |
| `use-current-user-profile` | Authenticated user profile |
| `use-current-user-name` | User display name |
| `use-current-user-image` | User avatar URL |
| `use-user-mutations` | Create/update/delete users |
| `use-user-permissions` | Current user permission level |
| `use-permissions` | Permission management |
| `use-project-permissions` | Project-level permissions |
| `use-project-roles` | Role definitions |
| `use-directory-permissions` | Directory access control |
| `use-permission-templates` | Permission template CRUD |

### Projects
| Hook | Description |
|------|-------------|
| `use-projects` | Project list + mutations |
| `use-project-companies` | Companies on a project |
| `use-project-users` | Users on a project |
| `use-project-vendors` | Vendors on a project |
| `use-project-checklist` | Project setup checklist |
| `use-global-project-companies` | Cross-project company lookup |

### Financial Tools
| Hook | Description |
|------|-------------|
| `use-budget-data` | Budget line items + summary |
| `use-prime-contracts` | Prime contract CRUD |
| `use-contracts` | Contract CRUD |
| `use-contract-change-orders` | Contract change order CRUD |
| `use-commitments` | Commitment list + mutations |
| `use-commitments-query` | Filtered commitment queries |
| `use-create-subcontract` | Create subcontract shorthand |
| `use-commitment-change-orders` | CCO CRUD |
| `use-change-events` | Change event CRUD |
| `use-change-event-rfqs` | RFQ management |
| `use-direct-costs` | Direct cost CRUD |
| `use-invoicing` | Invoice management |
| `use-cost-codes` | Cost code hierarchy |
| `use-financial-insights` | AI financial alert data |

### Drawings & Documents
| Hook | Description |
|------|-------------|
| `use-drawings` | Drawing CRUD |
| `use-drawing-sets` | Drawing set management |
| `use-drawing-areas` | Drawing area management |
| `use-drawing-revisions` | Revision tracking |
| `use-drawing-pins` | Annotation pin CRUD |
| `use-drawing-upload` | File upload for drawings |
| `use-supabase-upload` | Generic Supabase Storage upload |

### Specifications, RFIs, Submittals
| Hook | Description |
|------|-------------|
| `use-specifications` | Specification CRUD |
| `use-specification-revisions` | Revision tracking |
| `use-specification-areas` | Area grouping |
| `use-rfis` | RFI CRUD |
| `use-submittals` | Submittal CRUD |
| `use-punch-items` | Punch list CRUD |

### Scheduling
| Hook | Description |
|------|-------------|
| `use-schedule-tasks` | Schedule task CRUD |

### Meetings
| Hook | Description |
|------|-------------|
| `use-meetings` | Meeting list + CRUD |
| `use-meeting-digest` | AI-generated meeting summaries |
| `use-meeting-prep` | Meeting prep documents |

### Directory & Companies
| Hook | Description |
|------|-------------|
| `use-companies` | Company CRUD |
| `use-all-companies` | Global company list |
| `use-company-contacts` | Contacts per company |
| `use-contacts` | Contact CRUD |
| `use-clients` | Client company list |
| `use-distribution-groups` | Email distribution groups |

### AI & Chat
| Hook | Description |
|------|-------------|
| `use-rag-conversations` | RAG chat conversation history |
| `use-messages` | Chat message management |
| `use-company-knowledge` | Company knowledge base |
| `use-realtime-chat` | Liveblocks real-time chat |
| `use-realtime-cursors` | Multi-user cursor presence |
| `use-realtime-presence-room` | Presence room management |
| `useChatKit` | OpenAI ChatKit integration |
| `useThreadCitations` | Citation tracking in AI threads |
| `useKnowledgeDocuments` | Knowledge base document queries |

### Utilities
| Hook | Description |
|------|-------------|
| `use-estimates` | Estimate data |
| `use-format-currency` | Currency formatting helper |
| `use-infinite-query` | Generic infinite scroll helper |
| `use-mobile` | Mobile viewport detection |
| `use-outside-click` | Click outside detection |
| `use-chat-scroll` | Chat auto-scroll |
| `use-scroll-to-bottom` | Scroll-to-bottom helper |
| `use-sidebar` | Sidebar open/close state |
| `use-is-client` | Client-side rendering guard |
| `use-auto-resume` | Auto-resume incomplete ops |
| `use-store` | Zustand store access |
| `use-toast` | Toast notification trigger |
| `useResponsiveTable` | Responsive table breakpoint management |

### Data subdirectory (`@/hooks/data/`)
Additional data-fetching hooks organized by domain.

---

## Services (`@/services/`)

Business logic layer between hooks and data access.

| Service | File | Responsibility |
|---------|------|----------------|
| `CompanyService` | `companyService.ts` | Company CRUD + business rules |
| `DirectoryAdminService` | `directoryAdminService.ts` | Admin directory operations |
| `DirectoryPreferencesService` | `directoryPreferencesService.ts` | Directory view preferences |
| `DirectoryService` | `directoryService.ts` | Main directory operations |
| `DistributionGroupService` | `distributionGroupService.ts` | Email distribution group management |
| `DrawingAreaService` | `DrawingAreaService.ts` | Drawing area CRUD |
| `DrawingService` | `DrawingService.ts` | Drawing CRUD + file ops |
| `DrawingSetService` | `DrawingSetService.ts` | Drawing set management |
| `InviteService` | `inviteService.ts` | User invitation workflow |
| `NotificationService` | `notificationService.ts` | User notification delivery |
| `PermissionService` | `permissionService.ts` | Permission evaluation + assignment |
| `PunchItemService` | `PunchItemService.ts` | Punch list CRUD |
| `SpecificationAreaService` | `SpecificationAreaService.ts` | Spec area management |
| `SpecificationRevisionService` | `SpecificationRevisionService.ts` | Spec revision tracking |
| `SpecificationService` | `SpecificationService.ts` | Specification CRUD |

---

## Zod Schemas (`@/lib/schemas/`) -- 18 files

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

## State Management

### Zustand Stores (`@/lib/stores/`)

| Store | File | State |
|-------|------|-------|
| `financialStore` | `financial-store.ts` | Financial UI state: active filters, selected rows, grouping config for financial tool pages. Uses `devtools` middleware for debugging. |

### React Query Cache
The primary server state manager. All hooks use React Query v5 with:
- `queryClient` for cache management
- `useQuery` for reads
- `useMutation` for writes with optimistic updates
- Automatic stale-while-revalidate caching

### Auth State
Managed by Supabase SSR via `proxy.ts` -> `updateSession()`. Session tokens refreshed on every request. No client-side auth store needed.

### Sidebar Store (`hooks/use-sidebar.ts`)
Manages sidebar UI state: open/close toggle, hover state for auto-expand, user settings. Uses `persist` middleware with `localStorage`.

---

## React Contexts

### 1. Project Context
Provides the current project ID and project data to all child components within a project scope. Used by hooks and components to scope queries to the active project.

### 2. Favorites Context
Manages the user's favorited projects and entities, providing quick access and starred indicators throughout the UI.

### 3. Sheet Navigation Context
Coordinates slide-over sheet navigation state, enabling deep-linking into detail views and managing the sheet navigation stack.

---

## Security Patterns

### `proxy.ts` (`frontend/src/proxy.ts`)
Runs on every request via Next.js middleware. Calls `updateSession()` from `@/lib/supabase/proxy` to refresh Supabase JWT tokens. Excludes static assets, `_next`, images, and favicon.

### Permission Guards (`@/components/guards/`)
Client-side route protection for admin and project-scoped pages. Wraps page content; redirects or hides if user lacks required permission.

### RLS (Row Level Security)
All Supabase tables have RLS enabled. Policies enforce project membership and role-based access at the database level. Client code does not need to manually filter by user -- Supabase JWT is validated per-request.

---

## Component Import Rules (Summary)

```typescript
// Base shadcn primitives
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"

// Design system components (custom)
import { StatusBadge, KpiRow, DataTable, EmptyState } from "@/components/ds"

// Layout
import { ProjectPageHeader, PageContainer } from "@/components/layout"

// Tables
import { UnifiedTablePage } from "@/components/tables/unified"
```

**Never:**
- Create one-off components that duplicate `ui/` or `ds/` primitives
- Import from `@/components/ui/` as a barrel (import specific files)
- Add custom components to `@/components/ui/` (shadcn-only)
- Use hardcoded colors, arbitrary spacing, or shadow levels beyond `shadow-sm`
