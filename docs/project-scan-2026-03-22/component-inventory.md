# Component Inventory — Alleato-PM

> Generated: 2026-03-22 | Source: `frontend/src/components/`, `frontend/src/hooks/`, `frontend/src/services/`, `frontend/src/lib/stores/`

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

---

## UI Primitives (`@/components/ui/`)

Base shadcn/ui components — source-copied Radix UI primitives styled with Tailwind CSS. **Only shadcn primitives live here; do not add custom components.**

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
| `StatusBadge` | `status-badge.tsx` | Pass status string → correct pill color automatically |
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

| Component | Description |
|-----------|-------------|
| `DataTable` | Core headless table (TanStack Table) |
| `DataTableBulkActions` | Multi-row selection action bar |
| `DataTableColumnToggle` | Column visibility dropdown |
| `DataTableEmptyState` | No results placeholder |
| `DataTableFilters` | Filter panel |
| `DataTableGroupable` | Grouped rows support |
| `DataTablePagination` | Page controls |
| `DataTableSkeleton` | Loading shimmer |
| `DataTableToolbar` | Search + filters + export toolbar |
| `GenericTableWithDelete` | Table with delete row action |
| `unified/` | `UnifiedTablePage` — standard full-page table used by Budget, Prime Contracts, Commitments, Change Events, Direct Costs (5 of 7 financial tools) |

---

## Domain Components

### Budget (`@/components/budget/`)
Budget line items, SOV management, modification dialogs, budget history, snapshots.

### Commitments (`@/components/commitments/`)
Subcontract / PO forms, commitment change orders, invoice management, line item tables.

### Change Events (`@/components/change-events/` or inline)
Change event creation, RFQ management, approval workflows.

### Direct Costs (`@/components/direct-costs/`)
`DirectCostForm.tsx` — creation/edit form (known issue: hangs on submission as of last audit).

### Drawings (`@/components/drawings/`)
Drawing viewer, drawing set management, revision tracking, annotation pins.

### Invoicing (`@/components/invoicing/`)
Owner SOV-based invoice creation, billing period management. Uses legacy `DataTablePage` (needs migration to `UnifiedTablePage`).

### Meetings (`@/components/meetings/`)
Meeting list, transcript viewer, AI digest display, meeting prep.

### Scheduling (`@/components/scheduling/`)
Gantt/list view for schedule tasks, bulk operations, dependency management.

### Specifications (`@/components/specifications/`)
Specification sections, revisions, file downloads.

### Drawings (`@/components/drawings/`)
Drawing viewer, revision tracking.

### RFIs (`@/components/rfis/`)
RFI list and detail views.

### Directory (`@/components/directory/`)
Company and contact directory views.

### Project (`@/components/project/`)
Project home, project setup wizard, project-level configuration.

---

## AI & Chat Components

### AI Assistant (`@/components/ai-assistant/`)
Project-scoped AI chat interface using Vercel AI SDK v6 + `useChat` hook.

### AI Elements (`@/components/ai-elements/`)
Production chat UI components:
- `Message` — full chat message with UIMessage parts (text, tool calls, reasoning)
- `MessageResponse` — universal AI markdown renderer (Streamdown + code/math/mermaid plugins)
- `Conversation` — full conversation thread
- `Tool` — AI tool call result display

### Chat (`@/components/chat/`)
General-purpose chat container components, chat header, chat sessions.

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

## State Management

### Zustand Stores (`@/lib/stores/`)

| Store | File | State |
|-------|------|-------|
| `financialStore` | `financial-store.ts` | Financial UI state: active filters, selected rows, grouping config for financial tool pages |

### React Query Cache
The primary server state manager. All hooks use React Query v5 with:
- `queryClient` for cache management
- `useQuery` for reads
- `useMutation` for writes with optimistic updates
- Automatic stale-while-revalidate caching

### Auth State
Managed by Supabase SSR via `proxy.ts` → `updateSession()`. Session tokens refreshed on every request. No client-side auth store needed.

---

## Security Patterns

### `proxy.ts` (`frontend/src/proxy.ts`)
Runs on every request via Next.js middleware. Calls `updateSession()` from `@/lib/supabase/proxy` to refresh Supabase JWT tokens. Excludes static assets, `_next`, images, and favicon.

### Permission Guards (`@/components/guards/`)
Client-side route protection for admin and project-scoped pages. Wraps page content; redirects or hides if user lacks required permission.

### RLS (Row Level Security)
All Supabase tables have RLS enabled. Policies enforce project membership and role-based access at the database level. Client code does not need to manually filter by user — Supabase JWT is validated per-request.

---

## Component Import Rules (Summary)

```typescript
// Base shadcn primitives
import { Button, Input, Dialog } from "@/components/ui/button"
import { Button } from "@/components/ui/button"

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
