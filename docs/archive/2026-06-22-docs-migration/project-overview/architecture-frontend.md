# Alleato-Procore Frontend Architecture

## Overview

Alleato-Procore is a construction project management platform built as a Next.js 15 frontend with a Supabase backend. It mirrors Procore's functionality, providing 31 project-scoped tools for budgets, contracts, change orders, directory management, scheduling, daily logs, drawings, specifications, and more. The frontend is deployed on Vercel and communicates with a Python FastAPI backend for AI/RAG features.

---

## Architectural Principles

1. **Server Components by default** -- Add `'use client'` only for interactivity
2. **Layered data access** -- `app/` pages -> `hooks/` (React Query) -> `lib/supabase/` -> Supabase
3. **Design system enforced** -- ESLint errors block builds on design violations
4. **Typed from the database** -- `database.types.ts` (20,790 lines) is the source of truth
5. **Proxy handles auth** -- Every request passes through `proxy.ts` for session refresh

---

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.12 |
| UI Library | React | 19.2.4 |
| Language | TypeScript (strict mode) | - |
| Styling | Tailwind CSS | 4.1.7 |
| Component Library | shadcn/ui + Radix UI | 95 primitives |
| Server State | TanStack React Query | 5.90 |
| Client State | Zustand | 5.0 |
| Forms | React Hook Form + Zod | 7.71 / 4.3.6 |
| Database Client | Supabase SSR | 0.8.0 |
| AI SDK | Vercel AI SDK | v6 |
| Real-time | Supabase Realtime / Velt | Current app integrations |
| Animations | Framer Motion | 12.15 |
| E2E Testing | Playwright | 1.58.1 |
| Unit Testing | Jest | 30.2 |
| Deployment | Vercel | - |

---

## Layer Architecture

```
+-------------------------------------------------------------+
|                   Browser / Client                          |
+---------------------------+---------------------------------+
                            | HTTP
+---------------------------v---------------------------------+
|              proxy.ts (Supabase session refresh)            |
+---------------------------+---------------------------------+
                            |
+---------------------------v---------------------------------+
|                   app/ (Next.js App Router)                  |
|  +-- (admin)/   Admin pages                                 |
|  +-- (auth)/    Authentication                              |
|  +-- (chat)/    AI chat pages                               |
|  +-- (main)/    Main app + [projectId]/* tool pages         |
|  +-- (other)/   Miscellaneous                               |
|  +-- api/       Route handlers (196 files, 326+ handlers)   |
+---------------------------+---------------------------------+
                            |
+---------------------------v---------------------------------+
|          components/ (React component library)              |
|  +-- ui/       shadcn/ui primitives (95+)                   |
|  +-- ds/       Design system components (8)                 |
|  +-- layout/   Page structure                               |
|  +-- tables/   Data table infrastructure                    |
|  +-- domain/   Feature-specific components                  |
+---------------------------+---------------------------------+
                            |
+---------------------------v---------------------------------+
|          hooks/ (React Query data layer ~80 hooks)          |
|  use-{resource}.ts -> wraps Supabase calls with caching     |
+---------------------------+---------------------------------+
                            |
+---------------------------v---------------------------------+
|          services/ (Business logic layer, 15 files)         |
+---------------------------+---------------------------------+
                            |
+---------------------------v---------------------------------+
|    lib/supabase/ (Data access - createClient client/server) |
|    lib/ai/ (AI orchestration, tools, system prompt)         |
+---------------------------+---------------------------------+
                            |
                      Supabase / External APIs
```

---

## Directory Structure

```
frontend/
+-- src/
|   +-- app/                          # Next.js App Router
|   |   +-- (main)/                   # Main app routes (sidebar layout)
|   |   |   +-- [projectId]/          # Project-scoped pages (31 tools)
|   |   +-- (tables)/                 # Table view pages
|   |   +-- (other)/                  # Miscellaneous pages
|   |   +-- api/                      # API route handlers (196 files, 326+ handlers)
|   |   |   +-- projects/[projectId]/ # Project-scoped API endpoints
|   |   +-- auth/                     # Authentication pages
|   +-- components/                   # 470+ components across 78 directories
|   |   +-- ui/                       # shadcn/ui primitives (95 files)
|   |   +-- ds/                       # Design system components
|   |   +-- domain/                   # Business logic components (40 files)
|   |   +-- budget/                   # Budget management (51 files)
|   |   +-- chat/                     # AI chat interface (29 files)
|   |   +-- tables/                   # Data tables (33 files)
|   |   +-- forms/                    # Form field components (18 files)
|   |   +-- layout/                   # Layout components (14 files)
|   |   +-- ai-elements/             # AI UI elements (30 files)
|   |   +-- directory/               # Directory components (13 files)
|   |   +-- direct-costs/            # Direct costs (10 files)
|   |   +-- scheduling/              # Scheduling (7 files)
|   |   +-- drawings/                # Drawings (5 files)
|   |   +-- specifications/          # Specifications (5 files)
|   |   +-- project-home/            # Project home (20 files)
|   |   +-- misc/                    # Miscellaneous (58 files)
|   |   +-- motion/                  # Animation components (17 files)
|   |   +-- nav/                     # Navigation (11 files)
|   |   +-- header/                  # Header components (10 files)
|   +-- hooks/                       # 74+ React Query hooks (use-*.ts)
|   +-- lib/
|   |   +-- supabase/                # Supabase client setup (client, server, middleware)
|   |   +-- ai/                      # AI orchestration, tools, system prompt
|   |   +-- schemas/                 # 18 Zod validation schemas
|   +-- services/                    # 15 service classes
|   +-- types/                       # TypeScript types + generated database types
|   +-- stores/                      # Zustand stores
+-- tests/                           # Playwright E2E tests
|   +-- .auth/                       # Pre-saved authentication state
+-- config/
|   +-- playwright/                  # Playwright configuration
+-- public/                          # Static assets
```

---

## App Router Architecture

### Route Groups

The application uses Next.js route groups to apply different layouts based on page context:

| Route Group | Path | Purpose | Layout |
|-------------|------|---------|--------|
| `(admin)` | `/design-system`, `/style-guide`, etc. | Admin-only internal tools | Minimal |
| `(auth)` | `/login`, `/signup` | Public auth pages | Public |
| `(chat)` | `/ai-assistant`, `/rag`, etc. | AI chat interfaces | Chat layout |
| `(main)` | `/`, `/[projectId]/*`, `/directory/*` | Primary app pages (requires auth) | Sidebar navigation + header |
| `(tables)` | Various | Full-width table views | Minimal chrome, maximized table area |
| `(other)` | `/access-denied` | Miscellaneous pages | Varies by page |

### Dynamic Route Conventions

All dynamic route segments use specific, descriptive parameter names. Generic `[id]` is never used.

| Resource | Parameter | Example Path |
|----------|-----------|-------------|
| Project | `[projectId]` | `/[projectId]/budget` |
| Company | `[companyId]` | `/companies/[companyId]` |
| Contract | `[contractId]` | `/api/projects/[projectId]/contracts/[contractId]` |
| User | `[userId]` | `/users/[userId]` |
| Record | `[recordId]` | `/admin/tables/[table]/[recordId]` |
| Line Item | `[lineItemId]` | `/line-items/[lineItemId]` |

This convention is enforced to prevent Next.js slug name conflicts, which cause the dev server to fail to start.

### Project-Scoped Tools (31 Total)

Each tool lives under `(main)/[projectId]/` and represents a construction management domain:

```
/[projectId]/home          -> Project dashboard
/[projectId]/budget        -> Budget management (SOV)
/[projectId]/prime-contracts -> Prime contracts
/[projectId]/commitments   -> Subcontracts + POs
/[projectId]/change-events -> Change events
/[projectId]/change-orders -> Change orders
/[projectId]/direct-costs  -> Direct cost records
/[projectId]/invoicing     -> Owner invoicing
/[projectId]/sov           -> Schedule of values
/[projectId]/drawings      -> Drawing management
/[projectId]/specifications -> Specification sections
/[projectId]/submittals    -> Submittals
/[projectId]/rfis          -> RFIs
/[projectId]/schedule      -> Schedule tasks
/[projectId]/punch-list    -> Punch items
/[projectId]/meetings      -> Meeting records
/[projectId]/daily-log     -> Daily logs
/[projectId]/photos        -> Photos
/[projectId]/tasks         -> Tasks
/[projectId]/emails        -> Emails
/[projectId]/transmittals  -> Transmittals
/[projectId]/documents     -> Document center
/[projectId]/directory     -> Project directory
/[projectId]/reporting     -> 360 reporting
/[projectId]/setup         -> Project setup
```

**Categories:**
- **Financial**: budget, change-events, change-orders, commitments, direct-costs, invoicing, prime-contracts, sov
- **Field**: daily-log, drawings, meetings, photos, punch-list, tasks
- **Communication**: emails, rfis, submittals, transmittals
- **Planning**: schedule, specifications
- **Management**: directory, reporting, setup, home

---

## Provider Stack and Application Bootstrapping

The root layout wraps the application in a layered provider stack:

```
<html>
  <body>
    <QueryProvider>              // TanStack React Query client
      <ThemeProvider>            // Dark/light mode theming
        <ProjectProvider>        // Current project context
          <FavoritesProvider>    // User favorites state
            <HeaderProvider>     // Header configuration
              {children}
            </HeaderProvider>
          </FavoritesProvider>
        </ProjectProvider>
      </ThemeProvider>
    </QueryProvider>
  </body>
</html>
```

### Provider Responsibilities

| Provider | Purpose |
|----------|---------|
| `QueryProvider` | Configures TanStack Query client with default stale times, retry logic, and devtools |
| `ThemeProvider` | CSS variable-based theme switching (light/dark) |
| `ProjectProvider` | Exposes current project ID, metadata, and project-level permissions |
| `FavoritesProvider` | Manages user-favorited items with optimistic updates |
| `HeaderProvider` | Controls header title, breadcrumbs, and action buttons per page |

---

## Data Flow Architecture

### Primary Data Flow

```
User Action
    |
    v
React Component (event handler)
    |
    v
React Query Hook (use-*.ts)
    |
    v
Supabase Client Query / API Route Call
    |
    v
Supabase PostgreSQL (with RLS)
    |
    v
React Query Cache (automatic)
    |
    v
UI Re-render (reactive)
```

### Read Operations

1. Component calls a hook such as `useBudgetData(projectId)`.
2. The hook uses `useQuery` with a query key like `['budget', projectId]`.
3. Inside the query function, the Supabase browser client executes a query against the database.
4. React Query caches the result and provides loading, error, and data states.
5. The component renders based on the returned state.

### Write Operations

1. Component calls a mutation from a hook, such as `useCreateContract()`.
2. The hook uses `useMutation` with an `onSuccess` handler that invalidates related query keys.
3. The mutation function calls a Supabase insert, update, or delete, or calls an API route for complex logic.
4. On success, React Query invalidates the cache, triggering automatic refetch of affected queries.
5. Toast notifications confirm the operation to the user.

### Complex Operations via Service Classes

For operations that require multi-step logic, service classes encapsulate the workflow:

```
Component
    |
    v
Hook (useMutation)
    |
    v
Service Class (e.g., DrawingService.uploadAndCreate())
    |
    v
Multiple Supabase operations (transaction-like)
    |
    v
Cache invalidation + UI update
```

---

## State Management

### Server State: TanStack React Query

React Query manages all server-derived state. The application has 74+ custom hooks organized by domain:

| Domain | Example Hooks |
|--------|--------------|
| Budget | `use-budget-data`, `use-budget-line-items`, `use-budget-modifications` |
| Change Events | `use-change-events`, `use-change-event-detail` |
| Contracts | `use-contracts`, `use-contract-detail`, `use-contract-sov` |
| Directory | `use-directory-users`, `use-people`, `use-vendors` |
| Drawings | `use-drawings`, `use-drawing-areas` |
| Schedule | `use-schedule-tasks`, `use-schedule-resources` |
| Specifications | `use-specifications`, `use-specification-sections` |
| Commitments | `use-commitments`, `use-commitment-line-items` |
| General | `use-projects`, `use-companies`, `use-cost-codes` |

**Conventions:**
- Hook files are named `use-<domain>.ts` in the `hooks/` directory.
- Query keys follow the pattern `['domain', entityId, ...filters]`.
- Mutations invalidate all related queries on success.
- Optimistic updates are used for high-frequency operations (favorites, status changes).

### Client State: Zustand

Two Zustand stores handle client-only state:

**1. Financial Store (`financial-store`)**

Manages cross-cutting financial data used by multiple components simultaneously:
- Commitments
- Change events
- Contracts
- Invoices
- Budget items
- Companies

This store is used when multiple components on the same page need to share financial state that does not originate from a single React Query hook.

**2. Sidebar Store (`use-sidebar`)**

Manages sidebar UI state with localStorage persistence:
- Open/closed state
- Hover state
- User preference persistence across sessions

### URL State

Filters, active tabs, and pagination are stored in URL search params where possible (bookmarkable state).

### React Contexts (3 Total)

| Context | Purpose |
|---------|---------|
| `ProjectProvider` | Current project ID and metadata, available to all project-scoped pages |
| `FavoritesProvider` | User favorites with optimistic add/remove |
| `SheetNavigationContext` | Controls sheet/slideover panel navigation for detail views |

---

## Component Architecture

### Component Hierarchy

```
Layout Components (PageShell, PageContainer, ProjectPageHeader)
    |
    v
Domain Components (BudgetOverview, ContractList, DirectoryTable)
    |
    v
Table Components (DataTable, DataTableResponsive, columns)
    |
    v
Form Components (FormField, FormSelect, FormDatePicker)
    |
    v
UI Primitives (Button, Dialog, Input, Select, etc.)
```

### Component Categories

**UI Primitives (95 files)**

shadcn/ui components built on Radix UI. These are the atomic building blocks: Button, Input, Dialog, Select, Popover, Sheet, Table, Tabs, Toast, Tooltip, and more. They are unstyled by default and themed via CSS variables and Tailwind.

**Design System Components (`@/components/ds/`)**

Custom design system components that enforce consistent patterns:
- `StatusBadge` -- pass status string, correct colors automatically
- `StatusDot` -- minimal inline dot + label for tables
- `StatusText` -- plain muted text for non-emphasized statuses
- `KpiBlock` / `KpiRow` -- metric display with 3-tier text hierarchy
- `DataTable` -- premium table with correct header/row/hover styling
- `SectionHeader` -- title + count + action link
- `AvatarStack` -- overlapping avatar initials
- `EmptyState` -- icon + title + description + action
- `Eyebrow` -- 11px uppercase tracking-wider label

**Domain Components (40 files)**

Business-logic-aware components scoped to specific features: change event forms, contract detail panels, user cards, vendor selectors. These compose UI primitives with domain-specific data and behavior.

**Budget Components (51 files)**

The largest single domain, reflecting the complexity of construction budgeting. Includes budget overview dashboards, line item editors, cost code selectors, modification workflows, and financial summary cards.

**Table Components (33 files)**

Built on TanStack Table (via shadcn/ui DataTable). Includes:
- `DataTable` for standard desktop views
- `DataTableResponsive` for mobile-adaptive layouts
- Column definitions per domain
- Sorting, filtering, pagination, and row selection
- Inline editing for specific columns

**Form Components (18 files)**

Reusable form fields that integrate with React Hook Form:
- `FormField` wrappers with label, error, and description
- Domain-specific selectors (cost code picker, user picker, date range)
- Consistent validation display using Zod schemas

**Layout Components (14 files)**

Structural components that enforce consistent page layout:
- `PageShell`: Standard page wrapper with variant-based rendering (dashboard, table, form, detail, content)
- `PageContainer`: Standard page wrapper with padding and max-width
- `ProjectPageHeader`: Consistent header with title, description, and action buttons
- Sidebar navigation container
- Breadcrumb trail

**AI/Chat Components (59 files total)**

Two groups supporting AI features:
- `chat/` (29 files): AI chat interface with message rendering, streaming, and tool display
- `ai-elements/` (30 files): AI-specific UI elements for inline AI features

**Motion Components (17 files)**

Framer Motion wrappers providing consistent animation patterns: fade-in, slide-up, stagger children, page transitions.

### Page Header Standard

All project pages follow a mandatory header pattern:

```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";

<>
  <ProjectPageHeader
    title="Feature Name"
    description="Feature description"
    actions={<div>{/* action buttons */}</div>}
  />
  <PageContainer>
    {/* page content */}
  </PageContainer>
</>
```

---

## API Route Architecture

### Structure

All API routes are located under `frontend/src/app/api/`. The application has 196 route files exposing 326+ HTTP handlers.

Project-scoped endpoints follow the pattern:
```
/api/projects/[projectId]/<resource>/route.ts
```

### Key API Domains

| Domain | Approximate Endpoints | Description |
|--------|----------------------|-------------|
| Budget | 50+ | Line items, modifications, snapshots, codes, forecasting |
| Directory | 45+ | People, vendors, company directory, memberships |
| Change Events | 30+ | Change event CRUD, line items, status workflow |
| Contracts | 30+ | Commitment and prime contracts, SOV, billing |
| Change Orders | 25+ | PCO, CCO, owner change orders, approval workflow |
| Commitments | 25+ | Subcontracts, purchase orders, line items |
| Drawings | 15+ | Drawing sets, revisions, areas, uploads |
| Schedule | 15+ | Tasks, dependencies, resources, calendars |
| Specifications | 10+ | Spec sections, divisions, revisions |

### API Route Patterns

**Authentication:**

Every API route creates a Supabase server client from the request cookies. The client inherits the user's session and respects Row Level Security (RLS) policies.

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  // Queries execute with the user's RLS context
}
```

For operations that need to bypass RLS (admin operations, system-level queries), a service client is used.

**Validation:**

Request bodies are validated using Zod schemas defined in `lib/schemas/`. The schemas are shared between API routes (server-side validation) and form components (client-side validation).

**Error Handling:**

A shared `apiErrorResponse()` utility standardizes error responses across all endpoints with consistent status codes and error message formatting.

### Backend Proxy

AI and RAG features are served by a Python FastAPI backend running on port 8051. Next.js rewrites proxy these requests:

| Frontend Path | Backend Target |
|---------------|---------------|
| `/rag-chatkit/*` | `http://localhost:8051/rag-chatkit/*` |
| `/chatkit/*` | `http://localhost:8051/chatkit/*` |

---

## AI Architecture (Frontend)

### Vercel AI SDK v6 Integration

```typescript
// Route handler (app/api/ai-assistant/chat/route.ts)
import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: 'openai/gpt-5.4',  // Routes through AI Gateway
    system: ragSystemPrompt,
    messages: convertToModelMessages(messages),
    tools: { ... }
  });
  return result.toUIMessageStreamResponse();
}
```

```typescript
// Chat UI (Client Component)
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/ai-assistant/chat' })
});
```

### AI Context Sources (Orchestrator)

`lib/ai/orchestrator.ts` routes queries to:
- `match_meeting_chunks_with_project` -- Meeting transcript RAG
- `match_documents` -- Document content RAG
- `full_text_search_meetings` -- Meeting full-text search
- `match_crawled_pages` -- Procore docs RAG
- `match_memories` -- AI memory retrieval
- `get_project_matching_context` -- Project-specific context

### AI Tools (Frontend)

Located in `lib/ai/tools/`:
- Financial data queries
- Acumatica ERP queries
- Meeting insights
- Document lookup
- Web search (Tavily)

---

## Authentication Architecture

### Supabase Auth with SSR

Authentication is handled by Supabase Auth using the `@supabase/ssr` package (not the deprecated `@supabase/auth-helpers-nextjs`). Key characteristics:

- **Session Management**: HTTP-only cookies managed via Supabase SSR cookie handlers.
- **Server Components**: Async cookie access (`await cookies()`) compatible with Next.js 15.
- **Middleware**: Refreshes the session token on every request to prevent expiration.
- **Client Components**: Browser client created via `createBrowserClient` from `@supabase/ssr`.

### Client Creation

| Context | Import | Behavior |
|---------|--------|----------|
| Browser (client components) | `@/lib/supabase/client` | Singleton, reused across renders |
| Server components / API routes | `@/lib/supabase/server` | New instance per request, reads cookies |
| Middleware | `@/lib/supabase/middleware` | Refreshes session, sets updated cookies |

### Testing Authentication

Playwright tests use pre-saved authentication state stored in `tests/.auth/user.json`. Tests do not log in individually; the saved session is loaded automatically via the Playwright configuration.

---

## Security Architecture

### Middleware (`proxy.ts`)

Runs on every request. Calls `updateSession()` to refresh Supabase JWT. Excludes:
- `/_next/*` -- Next.js static files
- `/images/*`, `/favicon.ico` -- Static assets

### Permission System

1. **Database RLS** -- Enforced at Postgres level (cannot be bypassed)
2. **API route checks** -- `supabase.auth.getUser()` per request
3. **Client guards** -- `PermissionGuard`, `ProjectAccessGuard` components hide UI

### Security Headers (next.config.ts)

- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`

---

## Form and Validation Architecture

### Stack

- **React Hook Form** (7.71): Manages form state, field registration, submission, and error tracking.
- **Zod** (4.3.6): Defines validation schemas with TypeScript type inference.
- **18 shared schemas** in `lib/schemas/`: Reused between client-side forms and server-side API validation.

### Pattern

```typescript
// Schema definition (shared)
const contractSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().positive("Amount must be positive"),
  vendor_id: z.number().int(),
  // ...
});

// Form component
const form = useForm<z.infer<typeof contractSchema>>({
  resolver: zodResolver(contractSchema),
  defaultValues: { title: "", amount: 0, vendor_id: 0 },
});

// API route validation
const body = contractSchema.parse(await request.json());
```

This ensures that validation rules are defined once and enforced consistently on both client and server.

---

## Design System

### Foundation

The design system is built on shadcn/ui with Procore-aligned brand colors. It uses a CSS variable-based theming approach that supports light and dark modes.

### Theming

- CSS custom properties define all colors, radii, and shadows.
- Theme switching toggles a class on the `<html>` element.
- Components consume CSS variables via Tailwind utility classes.
- Dark mode is fully supported across all components.

### Design Tokens

- **Spacing**: Defined in `design-system/spacing.ts` with a consistent scale.
- **Colors**: Procore brand palette mapped to semantic tokens (primary, destructive, muted, accent, etc.).
- **Typography**: Tailwind's default type scale with project-specific overrides.
- **Border Radius**: Configurable via CSS variable `--radius`.

### Design System Enforcement (ESLint)

Three ESLint rules **fail the build** on violations:

| Rule | Violation | Example |
|------|-----------|---------|
| `no-hardcoded-colors` | Raw color classes | `bg-gray-200`, `text-gray-600` |
| `no-arbitrary-spacing` | Arbitrary CSS | `p-[10px]`, `gap-[14px]` |
| `require-semantic-colors` | Non-token colors | `bg-blue-500` (use `bg-primary`) |

**Allowed shadows:** `shadow-xs`, `shadow-sm` only.

### Responsive Design

- Tables use `DataTableResponsive` for mobile-adaptive layouts with card-based views on small screens.
- Layout components adjust sidebar behavior (collapsible, hover-expand) based on viewport.
- Form dialogs adapt from modals on desktop to full-screen sheets on mobile.

### Animation

Framer Motion provides consistent animation patterns through wrapper components in `components/motion/`:
- Page transitions
- List stagger effects
- Dialog/sheet enter/exit animations
- Loading skeleton animations

---

## Performance Patterns

| Pattern | Implementation |
|---------|---------------|
| Virtual scrolling | TanStack Virtual for large tables/lists |
| Image optimization | `next/image` (auto WebP + responsive) |
| Font optimization | `next/font` (zero layout shift) |
| Code splitting | Automatic via Next.js App Router |
| Lazy loading | `React.lazy()` + Suspense for heavy components |
| Query caching | React Query stale-while-revalidate (5 min default) |
| Memo | `useMemo`, `useCallback` for expensive computations |
| Streaming | `streamText` + Suspense boundaries for AI responses |

---

## Service Layer

### Service Classes (15 Total)

Service classes encapsulate complex, multi-step business logic that goes beyond simple CRUD operations. They are used by React Query hooks as the mutation or query function.

Examples include:
- `DrawingService` - Drawing upload, revision management, area assignment
- `SpecificationService` - Specification parsing, section management, revision tracking
- `PunchItemService` - Punch item workflow with status transitions and assignee management
- `BudgetService` - Budget calculations, forecasting, modification workflows
- `ContractService` - Contract lifecycle management, SOV generation, billing

### Service Pattern

```typescript
class DrawingService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async uploadAndCreate(projectId: number, file: File, metadata: DrawingMetadata) {
    // 1. Upload file to Supabase Storage
    // 2. Create drawing record in database
    // 3. Create initial revision
    // 4. Assign to drawing area
    // Returns complete drawing with relations
  }
}
```

---

## Testing Architecture

### E2E Testing (Playwright)

- **Config**: `frontend/config/playwright/playwright.config.ts`
- **Tests**: `frontend/tests/`
- **Auth State**: `frontend/tests/.auth/user.json` (pre-saved, auto-loaded)
- **Dev Server Port**: 3002 (tests run against a separate instance)

E2E tests follow a strict standard: they must simulate real user actions (navigate, click, fill forms, submit, verify results) rather than simply checking page load status.

### Unit Testing (Jest)

- Located alongside source files or in dedicated test directories
- Covers service logic, utility functions, and component rendering
- Run via `npm run test:unit` from the frontend directory

---

## Build and Deployment

### Development

```bash
npm run dev              # Frontend (Next.js) + Backend (FastAPI) concurrently
npm run dev:frontend     # Frontend only on localhost:3000
npm run dev:backend      # Backend only on localhost:8051
```

### Quality Checks

```bash
npm run quality          # TypeScript type checking + ESLint
npm run quality:fix      # Same with auto-fix
npm run build            # Production build
```

### Database Workflow

```bash
npm run db:types         # Regenerate Supabase TypeScript types
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run Drizzle migrations
npm run db:push          # Push schema changes via Drizzle
```

### Deployment

The frontend is deployed on Vercel. Production builds are triggered via Git push to the main branch. Vercel handles:
- Automatic builds on push
- Edge network distribution
- Serverless function deployment for API routes
- Environment variable management

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Components | 470+ across 78 directories |
| React Query Hooks | 74+ |
| Service Classes | 15 |
| Zod Schemas | 18 |
| API Route Files | 196 |
| HTTP Handlers | 326+ |
| Project Tools | 31 |
| React Contexts | 3 |
| Zustand Stores | 2 |
| UI Primitives | 95 (shadcn/ui) |

---

_Generated using BMAD Method document-project workflow. Last merged: 2026-03-24._
