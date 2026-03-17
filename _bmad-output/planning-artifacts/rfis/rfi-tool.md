---
title: rfi tool
description: rfi tool documentation
---

<!-- allow-outside-documentation -->
| description: |
| -- |
| PRP to implement the Procore-style RFI tool (list + create + detail scaffolding) in the Alleato Next.js app, with Supabase-backed data, table filters, and Playwright coverage. |

## Goal

**Feature Goal**: Deliver a Procore-inspired RFI (Request for Information) tool for project-scoped use that lists RFIs from Supabase, supports common filters/columns, and provides a create form aligned with Procore’s required fields.

**Deliverable**: RFI list page, data-fetch layer, client table UI, create RFI form page, and Playwright E2E coverage (plus verification report once implemented).

**Success Definition**: Project-scoped `/[projectId]/rfis` renders real RFI data with status counts, table filters, and action menu; `/[projectId]/rfis/new` provides a form with Procore-required fields and draft/open save actions; Playwright tests cover core table rendering and navigation.

## Why

* RFIs are a core Procore workflow and a primary coordination artifact for field questions.
* Aligns with existing project tooling patterns (Submittals, Commitments, Invoices) to complete the RFI pillar.
* Enables downstream automations (ball-in-court, change event linking) already present in schema.

## What

Implement a Procore-style RFI tool (Items list + create form) using existing Supabase `rfis` data. The UI should mimic Procore behavior (status buckets, required fields for Open, configurable columns) and reuse existing Alleato table/layout patterns.

### Success Criteria

* [ ] `/[projectId]/rfis` loads real RFI rows from Supabase and renders a table with search, filters, and status badges.
* [ ] Status summary cards show counts for Draft/Open/Answered/Closed (or aligned statuses from data).
* [ ] Action menu (View/Edit/Delete) exists per row, matching Submittals table behavior.
* [ ] `/[projectId]/rfis/new` provides a form with Procore-required fields and “Create Draft / Create Open” actions.
* [ ] Playwright coverage validates core RFI list behavior and create page navigation.

## All Needed Context

### Context Completeness Check

*Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"*

This PRP includes:

* Procore RFI behavior and required fields.
* Existing Supabase schema + TypeScript types.
* Proven UI patterns (Submittals, Forms, Table layout).
* Playwright test patterns and routing conventions.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials
  why: RFI domain overview and tutorial links for required fields + workflow
  critical: Procore required fields for Open status and RFI status flow
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/create-an-rfi/
  why: Required fields and create-flow behavior
  critical: Required fields for Open status + full field list
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/respond-to-an-rfi/
  why: Ball-in-court shift and response paths (web/email/mobile)
  critical: Response sets ball-in-court back to RFI manager; email rules
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/close-an-rfi/
  why: Close flow and statuses allowed to close
  critical: Draft/Open can be closed from Items tab
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/configure-advanced-settings-rfis/
  why: Settings for RFI manager, private RFIs, responses, numbering
  critical: Prefix by project stage and settings surface areas
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/customize-the-column-display-in-the-rfis-tools/
  why: Column customization behavior in list table
  critical: Show/hide/reorder columns and row height controls
- url: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
  why: API route patterns if RFI endpoints are added
  critical: Named exports (GET/POST) required in App Router
- url: https://nextjs.org/docs/app/building-your-application/rendering/server-components
  why: Server vs client component boundaries for data fetching
  critical: Server components for data fetch, client components for interactivity
- url: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching
  why: Data fetching rules and caching behavior
  critical: Avoid client-only hooks in server components
- url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces
  why: Type modeling for RFI rows and form data
  critical: Ensure strict typing and avoid `any`
- url: https://playwright.dev/docs/locators
  why: Playwright locator best practices for new RFI tests
  critical: Prefer role selectors and `waitForLoadState('networkidle')`

- file: frontend/src/app/(tables)/(procore)/submittals/submittals-data.ts
  why: Supabase service-client data fetching pattern
  pattern: Server-side fetch with projectId fallback
  gotcha: Returns empty array on error; uses DEFAULT_PROJECT_ID
- file: frontend/src/app/(tables)/(procore)/submittals/submittals-client.tsx
  why: Table UI pattern for Procore tools
  pattern: GenericDataTable config, status badges, filters, summary cards
  gotcha: Uses memoized mapping to table rows
- file: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  why: Project-scoped server component pattern
  pattern: Resolve projectId -> fetch -> render client component
  gotcha: params is Promise<{projectId}> in server component
- file: frontend/src/app/(tables)/(procore)/rfis/page.tsx
  why: Existing mock RFIs list page to replace/upgrade
  pattern: DataTable + summary cards; client component
  gotcha: Currently mock data only
- file: frontend/src/app/(main)/[projectId]/rfis/page.tsx
  why: Project-scoped RFI page placeholder
  pattern: ProjectToolPage usage
  gotcha: Replace "coming soon" with real implementation
- file: frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  why: Create form placeholder
  pattern: PageHeader + FormContainer layout
  gotcha: No form fields yet
- file: frontend/src/lib/supabase/queries.ts
  why: Existing RFI query helper
  pattern: getProjectRfis(supabase, projectId, options)
  gotcha: Accepts status/limit options
- file: frontend/src/types/database-extensions.ts
  why: RFI type aliases and RfiStatus union
  pattern: export type RFI + RfiStatus union
  gotcha: Use RfiStatus to align status handling
- file: frontend/drizzle/schema.ts
  why: Full RFI table schema
  pattern: rfis table fields (number, subject, question, assignees, etc.)
  gotcha: Schema differs from older SCHEMA.md doc
- file: frontend/src/lib/supabase/SCHEMA.md
  why: Legacy schema documentation
  pattern: rfis table minimal field list
  gotcha: Out-of-date vs drizzle/schema.ts
- file: tests/e2e/submittals.spec.ts
  why: Playwright pattern for tool list validation
  pattern: table visibility, status badges, action menu
  gotcha: Update selectors to use role-based patterns + networkidle
- file: frontend/src/app/api/procore-docs/ask/route.ts
  why: RAG endpoint for Procore docs (if needed for in-app help or QA)
  pattern: POST /api/procore-docs/ask with query, topK, conversationHistory
  gotcha: Requires SUPABASE_SERVICE_ROLE_KEY + OPENAI_API_KEY env vars
- docfile: PRPs/ai_docs/procore-rfi-tool.md
  why: Extracted Procore RFI requirements and list/create behaviors
  section: All
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
# tree command is not installed in this environment; output below is a focused tree for relevant paths
frontend/src/app/(main)/[projectId]/rfis
├── new
│   └── page.tsx
└── page.tsx
frontend/src/app/(tables)/(procore)/rfis
└── page.tsx
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
frontend/src/app/(tables)/(procore)/rfis
├── rfis-client.tsx        # client UI (table, filters, summary cards)
├── rfis-data.ts           # Supabase fetch + projectId resolution
└── page.tsx               # server wrapper or upgraded client page
frontend/src/app/(main)/[projectId]/rfis
├── page.tsx               # server component using rfis-data + rfis-client
└── new
    └── page.tsx           # create RFI form UI + submit actions
frontend/src/types/rfi.ts  # shared RFI types + form data shape
tests/e2e/rfis.spec.ts     # Playwright coverage for RFI list + create
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Next.js App Router requires named exports for route handlers.
// CRITICAL: 'use client' is required for components using useState/useMemo/handlers.
// CRITICAL: projectId params are strings; convert to number for Supabase queries.
// GOTCHA: RFI schema in frontend/drizzle/schema.ts includes fields not listed in frontend/src/lib/supabase/SCHEMA.md.
// GOTCHA: Use RfiStatus from database-extensions.ts to avoid mismatched status strings.
// GOTCHA: getProjectRfis expects a Supabase client and returns a query; handle errors explicitly.
```

## Implementation Blueprint

### Data models and structure

```typescript
// Example types to define in frontend/src/types/rfi.ts
import type { Database } from "@/types/database.types";

export type RfiRow = Database["public"]["Tables"]["rfis"]["Row"];
export type RfiInsert = Database["public"]["Tables"]["rfis"]["Insert"];

export type RfiStatus = "draft" | "open" | "answered" | "closed" | "pending" | "void";

export type RfiTableRow = {
  id: string;
  number: string;
  subject: string;
  status: RfiStatus;
  assignees: string[];
  dueDate: string | null;
  createdBy: string | null;
  ballInCourt?: string | null;
};

export type RfiFormValues = {
  number: string;
  subject: string;
  question: string;
  dueDate: string | null;
  assignees: string[];
  rfiManager?: string | null;
  distributionList?: string[];
  receivedFrom?: string | null;
  responsibleContractor?: string | null;
  location?: string | null;
  specSection?: string | null;
  costCode?: string | null;
  projectStage?: string | null;
  costImpact?: string | null;
  scheduleImpact?: string | null;
  isPrivate?: boolean;
  reference?: string | null;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE frontend/src/types/rfi.ts
  - IMPLEMENT: RfiRow, RfiInsert, RfiTableRow, RfiFormValues
  - FOLLOW pattern: frontend/src/types/database-extensions.ts
  - NAMING: PascalCase types; camelCase props
  - PLACEMENT: types/ for shared usage

Task 2: CREATE frontend/src/app/(tables)/(procore)/rfis/rfis-data.ts
  - IMPLEMENT: fetchRfis(projectId?: number) using createServiceClient + getProjectRfis
  - FOLLOW pattern: submittals-data.ts (DEFAULT_PROJECT_ID, numeric conversion)
  - DEPENDENCIES: RfiRow/RfiStatus types from Task 1
  - PLACEMENT: rfis/ data module

Task 3: CREATE frontend/src/app/(tables)/(procore)/rfis/rfis-client.tsx
  - IMPLEMENT: table UI using GenericDataTable, summary cards, filters, action menu
  - FOLLOW pattern: submittals-client.tsx
  - NAMING: RfisClient component; useMemo for row mapping
  - DEPENDENCIES: RfiTableRow from Task 1, data from Task 2
  - PLACEMENT: rfis client UI

Task 4: UPDATE frontend/src/app/(tables)/(procore)/rfis/page.tsx
  - IMPLEMENT: server wrapper or client page to render RfisClient
  - FOLLOW pattern: submittals/page.tsx
  - DEPENDENCIES: rfis-data + rfis-client

Task 5: UPDATE frontend/src/app/(main)/[projectId]/rfis/page.tsx
  - IMPLEMENT: server component that resolves projectId -> fetchRfis -> render RfisClient
  - FOLLOW pattern: submittals page pattern
  - GOTCHA: params is Promise in server components

Task 6: UPDATE frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  - IMPLEMENT: create RFI form using FormContainer + PageHeader
  - FOLLOW pattern: invoices/new/page.tsx for form layout and inputs
  - REQUIRE: fields for Number, Subject, Assignees, Due Date, Question
  - ADD: Create Draft / Create Open buttons; validation for required fields

Task 7: CREATE tests/e2e/rfis.spec.ts
  - IMPLEMENT: Playwright tests for list page and create page navigation
  - FOLLOW pattern: tests/e2e/submittals.spec.ts but add waitForLoadState('networkidle')
  - SELECTORS: role-based and stable text selectors
  - ASSERT: table visible, status badges present, action menu works
```

### Implementation Patterns & Key Details

```typescript
// RFI table row mapping pattern (client component)
const tableRows = useMemo<RfiTableRow[]>(() =>
  (rfis ?? []).map((rfi) => ({
    id: rfi.id ?? crypto.randomUUID(),
    number: String(rfi.number ?? ""),
    subject: rfi.subject ?? "Untitled RFI",
    status: (rfi.status ?? "open").toLowerCase() as RfiStatus,
    assignees: rfi.assignees ?? [],
    dueDate: rfi.due_date ?? null,
    createdBy: rfi.created_by ?? null,
    ballInCourt: rfi.ball_in_court ?? null,
  })),
  [rfis],
);

// Create form pattern
<FormContainer maxWidth="xl">
  <div className="grid gap-6">
    <Input label="Number" required />
    <Input label="Subject" required />
    <Textarea label="Question" required />
    <DatePicker label="Due Date" required />
    <Select label="Assignees" required />
  </div>
</FormContainer>
```

### Integration Points

```yaml
DATABASE:
  - table: rfis (see frontend/drizzle/schema.ts)
  - queries: frontend/src/lib/supabase/queries.ts#getProjectRfis
  - client: createServiceClient() for server-side fetch
CONFIG:
  - project tool route: frontend/src/config/project-home.ts -> /projects/[projectId]/rfis
ROUTES:
  - project list: frontend/src/app/(main)/[projectId]/rfis/page.tsx
  - create: frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  - tools table page: frontend/src/app/(tables)/(procore)/rfis/page.tsx
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
npm run quality --prefix frontend
```

### Level 2: Unit Tests (Component Validation)

```bash
# If unit tests are added for RFI components
npm test -- rfis
```

### Level 3: Integration Testing (System Validation)

```bash
cd frontend
npx playwright test --reporter=html
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Generate verification report for RFI tool
npx tsx .agents/tools/generate-verification-report.ts rfi-tool
```

## Final Validation Checklist

### Technical Validation

* [ ] npm run quality --prefix frontend
* [ ] Playwright tests pass
* [ ] HTML verification report generated

### Feature Validation

* [ ] RFI list renders data with filters + status badges
* [ ] RFI create page includes required fields + draft/open actions
* [ ] Project-scoped routing works for `[projectId]/rfis`

### Code Quality Validation

* [ ] Server/client component boundaries respected
* [ ] No `any`, `@ts-ignore`, or console.log usage

---

## Anti-Patterns to Avoid

* ❌ Don’t keep mock RFI data after wiring Supabase.
* ❌ Don’t introduce new table patterns when GenericDataTable works.
* ❌ Don’t use client hooks in server components.
* ❌ Don’t ignore mismatch between legacy SCHEMA.md and actual drizzle schema.

---

## Confidence Score

**8.5 / 10** — The PRP includes Procore-required fields, existing code patterns, and testing guidance. The only gap is lack of Procore crawl screenshots for RFIs in this repo.
