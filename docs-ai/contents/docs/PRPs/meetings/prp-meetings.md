# Meetings Module — Product Requirements Prompt (PRP)

**Version**: 1.0
**Created**: 2026-02-01
**Confidence Score**: 7/10 (blocked on Procore crawl data)

---

## Goal

**Feature Goal**: Create a complete Meetings module PRP for a single-agent TypeScript implementation that matches Procore UI/behavior and aligns with existing meetings list/detail patterns in this repo.

**Deliverable**: A Meetings PRP that enables:
- Full list views (global + project-scoped) using the existing table system
- Detail pages with transcript, outcomes, and metadata
- Edit flow via dialog + server actions
- Supabase-backed data access (document_metadata + meeting_segments)

**Success Definition**: An agent can implement Meetings UI + data flow end-to-end using only this PRP and repo access, with correct Next.js App Router boundaries and type safety.

---

## Why

- Meetings are a core project management feature with existing data in `document_metadata` and `meeting_segments`.
- The repo already has multiple meetings UIs (custom + GenericDataTable); this PRP unifies implementation guidance and patterns.
- Implementations must align with app router constraints, supabase types, and existing design system components.

---

## What

### Pages

| Page | Route | Type | Description |
|------|-------|------|-------------|
| Meetings List (Global) | `/(tables)/meetings/page.tsx` | Server | Fetches `document_metadata` meetings and renders custom client table |
| Meetings List (Generic) | `/(tables)/meetings2/page.tsx` | Server | GenericDataTable config-based list view |
| Meetings Detail (Global) | `/(tables)/meetings/[meetingId]/page.tsx` | Server | Detail view with transcript and outcomes |
| Project Meetings List | `/(main)/[projectId]/meetings/page.tsx` | Server | Project-scoped list with stats |
| Project Meeting Detail | `/(main)/[projectId]/meetings/[meetingId]/page.tsx` | Server | Project-scoped detail view |

### Database Schema

Meetings are **not** stored in a `meetings` table.

| Table | Purpose |
|-------|---------|
| `document_metadata` | Meeting metadata + transcript content (filter by `type='meeting'`) |
| `meeting_segments` | Chunked transcript/AI outcomes for RAG and UI outcomes |

Key fields and notes are in schema docs and types. (See `plans-schema-modeling.mdx` + `database.types.ts`.)【F:docs/development/plans-schema-modeling.mdx†L270-L296】【F:frontend/src/types/database.types.ts†L1-L200】

### Components

| Component | Type | Description |
|-----------|------|-------------|
| `MeetingsDataTable` | Client | Custom table UI for global meetings list |
| `GenericDataTable` config | Client | Config-driven list view used in `meetings2` |
| `MeetingsTable` | Client | TanStack-based table for project-scoped meetings |
| `EditMeetingModal` | Client | Dialog form to edit meeting metadata |

### Table Columns (Current)

From existing tables:
- Title, Date, Type, Category, Source, URL, Project

(Should be validated against Procore crawl data once available.)

---

## Success Criteria

- [ ] Meetings data uses `document_metadata` with `type='meeting'` filter where relevant.
- [ ] Global list uses TablePageWrapper + MeetingsDataTable (or GenericDataTable config).
- [ ] Project list uses `getProjectInfo` and `MeetingsTableWrapper` pattern.
- [ ] Detail views render transcript content with outcomes (tasks/risks/decisions/opportunities).
- [ ] Edit flow uses `EditMeetingModal` or server actions in `table-actions.ts`.
- [ ] Types come from `Database` (Supabase generated).
- [ ] Validation commands pass.

---

## Procore Crawl Data Reference

Base Path: `playwright-procore-crawl/procore-crawls/meetings/`

> **Status**: No crawl data exists in this repo. Run `/feature-crawl meetings <procore-url>` and generate `crawl-summary.json` before implementation.

### Sitemap

| Page | URL | Screenshot |
|------|-----|------------|
| Meetings List | TBD | `pages/meetings-list/screenshot.png` |
| Meeting Detail | TBD | `pages/meeting-detail/screenshot.png` |

### Crawl Data Files

| Category | File | Path | Description |
|--------|------|------|-------------|
| Summary | Crawl Summary | `crawl-summary.json` | Structured crawl overview (missing) |
| Reports | Sitemap | `reports/sitemap-table.md` | URL structure (missing) |
| Reports | Detailed | `reports/detailed-report.json` | Full analysis (missing) |
| Spec | Commands | `spec/COMMANDS.md` | Domain commands (missing) |
| Spec | Mutations | `spec/MUTATIONS.md` | Behavioral rules (missing) |
| Spec | Schema | `spec/schema.sql` | Database schema (missing) |
| Spec | Forms | `spec/FORMS.md` | Form definitions (missing) |
| Pages | Screenshot | `pages/{page}/screenshot.png` | UI reference (missing) |
| Pages | DOM | `pages/{page}/dom.html` | HTML structure (missing) |
| Pages | Metadata | `pages/{page}/metadata.json` | UI actions (missing) |

### Key UI Elements to Replicate

- Toolbars
- Tables and columns
- Filters and bulk actions
- Modals and dialogs
- Empty / loading / error states

### UI Components Detected

| Label | Command Key |
|------|-------------|
| TBD | `TBD` |

---

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_ **Mostly** — codebase patterns are documented, but Procore crawl data is missing and must be generated before UI parity work begins.

### Documentation & References

```yaml
# External docs (snapshotted)
- docfile: docs-ai/contents/docs/PRPs/docs/nextjs-app-router.md
  why: App Router server/client boundaries, route handler rules
  section: Route handlers, server vs client components

- docfile: docs-ai/contents/docs/PRPs/docs/react-hydration.md
  why: Avoid hydration mismatches in client components
  section: Hydration, useEffect

- docfile: docs-ai/contents/docs/PRPs/docs/typescript-handbook.md
  why: Type guards for JSONB/unknown fields
  section: Narrowing, utility types

- docfile: docs-ai/contents/docs/PRPs/docs/supabase-js.md
  why: Supabase JS select/filters/single patterns
  section: Select, filters, single

# Codebase MUST-READ
- file: frontend/src/app/(tables)/meetings/page.tsx
  why: Server list page for meetings, Supabase query + wrapper
  pattern: createClient() + TablePageWrapper + MeetingsDataTable
  gotcha: filter by type='meeting' and order by date

- file: frontend/src/app/(tables)/meetings/components/meetings-data-table.tsx
  why: Custom client table for meetings (filters, edit dialog, CSV export)
  pattern: client state + column visibility + edit dialog patterns
  gotcha: uses useProjects() and client supabase updates

- file: frontend/src/app/(tables)/meetings/[meetingId]/page.tsx
  why: Global meeting detail page pattern
  pattern: fetch meeting + meeting_segments, aggregate outcomes
  gotcha: transcript fetching uses storage URL fallback

- file: frontend/src/app/(tables)/meetings2/page.tsx
  why: GenericDataTable config for meetings (simpler pattern)
  pattern: GenericTableConfig + rowClickPath
  gotcha: uses `document_metadata` without type filter

- file: frontend/src/components/tables/generic-table-factory.tsx
  why: Config-driven table system used across project
  pattern: serializable config, optional editConfig, view modes
  gotcha: no function renderers in config

- file: frontend/src/components/tables/table-page-wrapper.tsx
  why: Standard page wrapper with PageHeader + PageContainer
  pattern: consistent layout for table pages

- file: frontend/src/app/(main)/[projectId]/meetings/page.tsx
  why: Project-scoped meetings list with stats
  pattern: getProjectInfo + projectId numeric filtering
  gotcha: still filters type='meeting'

- file: frontend/src/app/(main)/[projectId]/meetings/meetings-table-wrapper.tsx
  why: Wrapper combines table + edit modal and refreshes
  pattern: client state + router.refresh() on success

- file: frontend/src/components/meetings/meetings-table.tsx
  why: TanStack table pattern for project meetings
  pattern: column defs, link to project meeting detail

- file: frontend/src/components/meetings/edit-meeting-modal.tsx
  why: Dialog edit form for meeting updates
  pattern: client supabase update + form state
  gotcha: uses inline project search (min 2 chars)

- file: frontend/src/app/(other)/actions/table-actions.ts
  why: Server actions for update/delete
  pattern: updateTableRow/deleteTableRow + revalidatePath
  gotcha: use server-only client

- file: frontend/src/app/(other)/actions/table-actions.types.ts
  why: Table action types and MeetingData shape
  pattern: Database-derived table update types

- file: frontend/src/hooks/use-projects.ts
  why: Project dropdown options for meetings
  pattern: client fetch + options mapping
  gotcha: filters archived projects by default

- file: frontend/src/lib/supabase/server.ts
  why: Server-side supabase client pattern
  pattern: cookies-based createServerClient

- file: frontend/src/lib/supabase/client.ts
  why: Browser supabase client singleton
  pattern: createBrowserClient singleton

- file: frontend/src/lib/supabase/project-fetcher.ts
  why: projectId parsing + service client usage
  pattern: getProjectInfo / getProjectById

- file: frontend/src/types/database.types.ts
  why: Canonical DB types for meetings
  pattern: Database public Tables row types

- file: docs/development/plans-schema-modeling.mdx
  why: Meetings are stored in document_metadata + meeting_segments
  pattern: schema fields to include in UI

- file: docs/development/plans-typescript-types.mdx
  why: Meeting types derived from Database types
  pattern: Meeting type from document_metadata

- file: docs/development/table-pages/table-generator.mdx
  why: GenericDataTable configuration guidance
  pattern: config structure for table pages
```

### Current Codebase tree (snapshot)

```bash
# tree command unavailable; using find -maxdepth 2
.
./frontend/src
./frontend/src/app
./frontend/src/components
./frontend/src/lib
./frontend/src/hooks
./frontend/src/types
./docs/development
./scripts/screenshot-capture
./scripts/playwright-crawl
./supabase
```

### Desired Codebase tree with files to be added

```bash
docs-ai/contents/docs/PRPs/meetings/
├── prp-meetings.md
├── TASKS.md
└── prp-meetings.html

docs-ai/contents/docs/PRPs/docs/
├── nextjs-app-router.md
├── react-hydration.md
├── supabase-js.md
└── typescript-handbook.md
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// Meetings are stored in document_metadata; always filter type='meeting' when needed.
// Server components: use createClient() from '@/lib/supabase/server'.
// Client components: use createClient() from '@/lib/supabase/client' and add "use client".
// Meeting segments include JSONB fields (tasks/risks/decisions/opportunities); guard with Array.isArray.
// GenericDataTable config must be serializable (no functions in config).
```

---

## Codebase References (10–25 files)

| File | Why it matters | Copy/avoid |
|------|---------------|------------|
| frontend/src/app/(tables)/meetings/page.tsx | Base meetings list server component | Copy data fetching + TablePageWrapper usage |
| frontend/src/app/(tables)/meetings/components/meetings-data-table.tsx | Custom client table, edit dialog, CSV | Copy filters/sort/edit patterns |
| frontend/src/app/(tables)/meetings/[meetingId]/page.tsx | Global detail view pattern | Copy meeting_segments aggregation |
| frontend/src/app/(tables)/meetings2/page.tsx | GenericDataTable config example | Copy config structure |
| frontend/src/components/tables/generic-table-factory.tsx | Core GenericDataTable implementation | Avoid function renderers in config |
| frontend/src/components/tables/table-page-wrapper.tsx | Table page layout wrapper | Copy for list pages |
| frontend/src/app/(main)/[projectId]/meetings/page.tsx | Project list pattern | Copy getProjectInfo + stats |
| frontend/src/app/(main)/[projectId]/meetings/meetings-table-wrapper.tsx | Client wrapper + refresh | Copy modal integration pattern |
| frontend/src/components/meetings/meetings-table.tsx | TanStack table pattern | Copy column defs and link usage |
| frontend/src/components/meetings/edit-meeting-modal.tsx | Edit dialog + supabase update | Copy dialog structure |
| frontend/src/app/(other)/actions/table-actions.ts | Server actions for update/delete | Copy updateTableRow/deleteTableRow |
| frontend/src/app/(other)/actions/table-actions.types.ts | Meeting data types | Copy MeetingData + TableUpdate types |
| frontend/src/hooks/use-projects.ts | Project dropdown data | Copy options/filters pattern |
| frontend/src/lib/supabase/server.ts | Server client creation | Use for server components |
| frontend/src/lib/supabase/client.ts | Client supabase singleton | Use for client components |
| frontend/src/lib/supabase/project-fetcher.ts | ProjectId parsing + service client | Use in project scoped routes |
| frontend/src/types/database.types.ts | Supabase types | Must use for type safety |
| docs/development/plans-schema-modeling.mdx | Meeting storage notes | Copy constraints on data model |
| docs/development/plans-typescript-types.mdx | Meeting type guidance | Copy meeting type mapping |
| docs/development/table-pages/table-generator.mdx | Generic table config generator | Copy config conventions |

---

## Implementation Blueprint

### Data models and structure

```typescript
// Meetings are derived from document_metadata
import type { Database } from '@/types/database.types'

export type Meeting = Database['public']['Tables']['document_metadata']['Row']

export type MeetingSegment = Database['public']['Tables']['meeting_segments']['Row'] & {
  opportunities?: unknown[]
}

export interface MeetingOutcomes {
  tasks: string[]
  risks: string[]
  decisions: string[]
  opportunities: string[]
}

// Meeting update payloads
export type MeetingUpdate = Partial<Meeting>
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: Generate Procore crawl data (BLOCKER)
  - RUN: /feature-crawl meetings <procore-url>
  - THEN: if crawl exists but no summary, run:
      cd playwright-procore-crawl
      PROCORE_MODULE=meetings node scripts/generate-crawl-summary.js
  - READ: crawl-summary.json, spec/COMMANDS.md, spec/MUTATIONS.md, spec/schema.sql, spec/FORMS.md
  - OUTPUT: UI columns, form fields, and behavior rules

Task 1: Validate data model alignment
  - READ: docs/development/plans-schema-modeling.mdx
  - READ: frontend/src/types/database.types.ts
  - CONFIRM: meetings stored in document_metadata, segments in meeting_segments

Task 2: Confirm list view implementation choice
  - OPTION A: Maintain custom MeetingsDataTable (current in /meetings)
  - OPTION B: Migrate to GenericDataTable config (meetings2 pattern)
  - DOCUMENT: decision and update paths accordingly

Task 3: Enhance Meetings list (global)
  - FILE: frontend/src/app/(tables)/meetings/page.tsx
  - FOLLOW: meetings2 page config + table-page-wrapper
  - ACTION: ensure type='meeting' filter + sort by date

Task 4: Update MeetingsDataTable
  - FILE: frontend/src/app/(tables)/meetings/components/meetings-data-table.tsx
  - FOLLOW: existing patterns in file
  - ADD: columns, filters, and actions per crawl COMMANDS/MUTATIONS/FORMS
  - NOTE: keep "use client" and client Supabase updates

Task 5: Project-scoped meetings list + detail
  - FILES: frontend/src/app/(main)/[projectId]/meetings/page.tsx
  - FILES: frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx
  - FOLLOW: existing getProjectInfo + transcript parsing patterns
  - ADD: UI parity per crawl screenshots

Task 6: Edit flow + server actions
  - FILES: frontend/src/components/meetings/edit-meeting-modal.tsx
  - FILES: frontend/src/app/(other)/actions/table-actions.ts
  - FOLLOW: updateTableRow pattern + revalidatePath
  - NOTE: consider aligning MeetingData fields with actual document_metadata columns

Task 7: Validation
  - RUN: cd frontend && npm run typecheck
  - RUN: cd frontend && npm run lint
  - RUN: cd frontend && npm run test (optional, time permitting)
```

### Implementation Patterns & Key Details

```typescript
// Server component pattern
export default async function MeetingsPage() {
  const supabase = await createClient(); // server client
  const { data, error } = await supabase
    .from('document_metadata')
    .select('*')
    .eq('type', 'meeting')
    .order('date', { ascending: false });
}

// Client component pattern
"use client";
const supabase = createClient(); // browser client

// Meeting segments outcome aggregation pattern
if (segment.tasks && Array.isArray(segment.tasks)) {
  // guard unknown
}
```

### Integration Points

```yaml
DATABASE:
  - tables: document_metadata, meeting_segments
  - pattern: Database types from frontend/src/types/database.types.ts
  - filters: type='meeting' for document_metadata

ROUTES:
  - Global list: /meetings (/(tables)/meetings/page.tsx)
  - Project list: /[projectId]/meetings
  - Detail: /meetings/[meetingId] and /[projectId]/meetings/[meetingId]

CONFIG:
  - No new env vars expected
```

---

## Common Pitfalls

- **TypeScript traps**: JSONB fields (tasks/risks/decisions/opportunities) are `unknown`; use type guards before reading. (See TypeScript narrowing doc.)
- **Next.js App Router**: Don’t use server-only APIs in client components; keep `createClient()` source aligned to file type.
- **Hydration mismatch**: Avoid using non-deterministic values in client render paths.
- **Schema drift**: Meeting fields may exist in Supabase but not in generated types; use intersection types cautiously and avoid `any`.

---

## Validation Gates

```bash
# Type check
cd frontend && npm run typecheck

# Lint
cd frontend && npm run lint

# Unit + E2E
cd frontend && npm run test
```

---

## Open Questions / Clarifications

**Blocked on crawl data**: Please provide a Procore URL for meetings so `/feature-crawl meetings <procore-url>` can be executed.
