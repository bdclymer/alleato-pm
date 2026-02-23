---
title: Submittals Module — TypeScript PRP
description: Aligns the Submittals feature with Procore list/detail workflows, Supabase schema, API routes, and rich UI interactions.
---

# Submittals Module — Product Requirements Prompt (PRP)

## Goal

**Feature Goal:** Deliver a Procore-parity Submittals module that tracks every submission, workflow step, and distribution event while covering list/list-views, exports, create/edit dialogs, detail tabs, and data governance.

**Deliverable:**

- Supabase schema (tables + views) that persist submittal metadata, workflows, distributions, attachments, and linked drawings.
- An API service + Next.js route pair for list/create and detail/update/delete operations with server-side authorization.
- Client pieces: an enriched `SubmittalsClient` list, `SubmittalFormDialog`, `SubmittalDetailClient` with tabs, workflow response and distribution summaries, attachments, and history.
- Type-safe hooks/schemas/validations that wire Supabase data into GenericDataTable configurations and form dialogs.

**Success Definition:** Product teams can create, view, edit, redistribute, and soft-delete submittals through the new UI while the API layer enforces FK integrity, RLS policies, and TypeScript typing; the list view mirrors Procore’s 12 columns, filters, tabs, and export actions, and the detail view exposes general info, related items, emails, and change history.

## Why

**Business value:** Submittals represent the heartbeat of coordination between contractors and owners—missing approvals delay schedules. A production-grade module keeps classic Procore reports (status cards, distribution summaries, attachments, workflow responses) available within Alleato PM without toggling tools.

**Integration:** Reuses Directory (contacts/companies) + Drawings references, leverages the existing `active_submittals` view, and plugs into our pattern stack: `GenericDataTable`, `TableLayout`, `createServiceClient()`, and Next.js App Router APIs.

**Problems solved:** The current implementation renders placeholder rows from `active_submittals`, lacks creation/edit UIs, has minimal filters, and ignores Procore’s export/Redistribution commands. This PRP wires real Supabase tables, migrations, APIs, and components to close the gap.

## What

### Pages

| Page | Route | Type | Notes |
|------|-------|------|-------|
| Submittals List | `/(tables)/submittals/page.tsx` | Server Component (existing) | Upgrade to fetch typed suppliable data, show 12 columns, filters, status cards, exports, tabbed groupings, and modals for create/edit.|
| Submittal Detail | `/(main)/[projectId]/submittals/[submittalId]/page.tsx` | Server Component (new) | Loads submittal + relations (attachments, responses, distributions, history) and renders `SubmittalDetailClient` with General, Related Items, Emails, Change History tabs.|
| Submittal Form Dialog | Modal over list/detail | Client Component (new) | Handles create + edit flows and submission of Zod-validated payloads (General/Distribution/Content/Workflow sections).|

### Database Schema

**Existing tables from `frontend/src/types/database.types.ts`:**

- `submittals` (PK: `id` string/UUID, `project_id` integer not null referencing `projects(id)`, `submittal_number` text, `submittal_type_id` string ❯ `submittal_types(id)`, `specification_id` string, plus `priority`, `status`, `ball_in_court`, `submission_date`, `required_approval_date`, `submitted_by` string, `submitter_company`, `description`, `total_versions`, `current_version`, `metadata`, `title`, `created_at`, `updated_at`). `project_id` must stay `integer` to match `projects.id` (avoid the FK mismatch from the 2026-01-28 incident).
- `submittal_types` (PK `id` string) holds human-readable names, categories, and review criteria for dropdowns.
- `submittal_documents` stores files per submittal (attachments) with `submittal_id` → `submittals.id`, `document_name`, `file_url`, `mime_type`, `version`, `uploaded_at`, `uploaded_by`.
- `submittal_history` captures audit actions (`submittal_id`, `action`, `actor_id`, `new_status`, `changes`, `occurred_at`).
- `submittal_notifications` backs email statuses per person and project, with `submittal_id`, `project_id`, `user_id`, `notification_type`, `message`.
- `submittal_analytics_events`, `submittal_performance_metrics`, and `submittal_project_dashboard` supply dashboards/telemetry—keep them intact for status cards and analytics.

**New tables derived from `scripts/playwright-crawl/procore-crawls/submittals/spec/schema.sql` (must be added via Supabase migrations + RLS + indexes):**

- `submittal_packages` (UUID PK) groups submittals per project.
- `submittal_workflow_steps` (UUID, references `submittals(id)`) lists approval steps and order; the UI needs to show the chain in the workflow tab.
- `submittal_responses` (UUID, references `submittal_workflow_steps`) tracks per-approver status (`Submitted`, `Pending`, `Approved`, `Approved as Noted`) plus comments/`responded_at` for the workflow response cards.
- `submittal_distributions` and `submittal_distribution_recipients` outline distribution events, sender (`from_id`), message, distributed timestamp, and recipient contacts; this drives the Distribution Summary section and filter by distribution list.
- `submittal_attachments` stores files shared with each distribution/response (use `CHECK` so at least one parent FK is non-null) and surfaces the “CURRENT” badge.
- `submittal_linked_drawings` maps submittals to drawings (supports the Related Items tab).

All new tables must enable RLS policies that restrict access to `project_directory_memberships.person_id`—mirror the policy examples in the schema file. Re-run `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public` after each migration to keep `frontend/src/types/database.types.ts` synchronized. Verify `project_id` is `INTEGER`, `users.id` is `UUID`, and `people.id` is `string` before declaring the schema complete (per the 2026-01-28 incident and the direct costs query bug).

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `app/api/projects/[projectId]/submittals/route.ts` | `GET` lists submittals filtered by project, statuses, ball-in-court, exports; `POST` validates with Zod and inserts into `submittals`, distributions, workflow steps, attachments. Use `createServiceClient()` and admin keys for multi-table updates.
| GET/PUT/DELETE | `app/api/projects/[projectId]/submittals/[submittalId]/route.ts` | `GET` returns detail (+ distributions, responses, documents, history). `PUT` updates submittal and optionally redistributes (triggers `submittal_distributions` + recipients). `DELETE` soft-deletes (sets `deleted_at`). Always `await params` (Next.js 15 requires it) and keep slug names explicit (`[projectId]`, `[submittalId]`) to avoid the dynamic-route conflict in `api-routing-errors.md`.

Each handler must verify the authenticated user via `supabase.auth.getSession()` before querying. Wrap database calls in try/catch and surface 4xx/5xx statuses, matching patterns from `frontend/src/app/api/projects/[projectId]/route.ts`.

### Components

- `SubmittalsClient` (`frontend/src/app/(tables)/submittals/submittals-client.tsx`): keep the TableLayout + GenericDataTable wrapper, but shift from placeholder `SubmittalRow` → a typed `SubmittalSummaryRow` (12 columns + status metadata). Add filters for Approver, Ball In Court, Created By, Revision, Division, Location, Number, Private, Received From, Response, Responsible Contractor, and add toggles for Ball In Court, status cards (Draft/Open/Distributed/Closed), tabs for Items/Packages/Spec Sections/Ball In Court/Recycle Bin, and row navigation to the detail route.
- `SubmittalFormDialog`: new client component (React Hook Form + `zodResolver`) with the General/Distribution/Content/Workflow sections from `FORMS.md`. Use searchable selects for contact/company fields (reusing Directory query patterns).
- `SubmittalDetailClient`: new client component with tabs (General, Related Items, Emails, Change History). Each tab is composed of smaller pieces: `DistributionSummary`, `WorkflowResponses`, `DocumentList`, `EmailTimeline`, `HistoryFeed`, and `LinkedDrawings` (reuse existing UI cards/lists).
- Supporting (new) components: `SubmittalWorkflowResponses` (cards with avatar, company, response badge, comments, attachments), `SubmittalDistributionSummary` (from/to/message + attachments), `SubmittalHistoryList`, `SubmittalDocumentsGrid`, `SubmittalEmailHistory`, `SubmittalTabs` for navigation, `SubmittalActionMenu` (Edit, Delete, Redistribute, Duplicate, Create Revision). Mirror styling of existing domain components (e.g., `components/domain/rfIs` etc.).

### Special Features/functionality

- Export menu (PDF/CSV/Excel) attached to the table toolbar, using GenericDataTable’s built-in exporters and the crawl commands (`export_pdf`, `export_csv`, `export_excel`).
- Status cards that count Draft, Open, Distributed, Closed, plus filters for statuses and ball-in-court.
- Ball In Court toggle and dedicated tab (filters rows by `ball_in_court` or `responsible_contractor`).
- Recycle Bin tab shows soft-deleted rows (`deleted_at` not null) with restore action.
- Distribution & workflow data surfaced in detail view alongside attachments (current and previous versions), history log, and email timeline (from `submittal_notifications`).
- Crowd-sourced filters (Approver, Received From, Responsible Contractor, Revision, Division, Location, Private, Response) from the filter panel spec.

### Table Columns

| Column | SQL field | Type | Notes |
|--------|-----------|------|-------|
| Spec | `specification_section` | text | CSI spec reference sourced from the submittal or `specifications` view. |
| # | `number` | text | Combined with revision to render `Number & Rev.` |
| Rev. | `revision` | integer | Sync with spec changes; default 0 for new submissions. |
| Title | `title` | text | Primary submittal title, displayed with tooltip when truncated. |
| Type | `submittal_type_name` / `submittal_type` | text | Drawn from `submittal_types`. |
| Status | `status` | text/badge | Uses badges mapped to Draft/Open/Distributed/Closed. |
| Responsible C. | `responsible_contractor_name` | text | Derived from the contact/company join. |
| Received From | `received_from_name` | text | Person+company join. |
| Ball In Court | `ball_in_court` | text | Current responsible party (from workflow). |
| Approvers | `approver_names` | text[] | Aggregated from workflows/responses. |
| Response | `latest_response_status` | text | Latest workflow approver response. |
| Sent Date | `sent_date` | date | Date of the most recent distribution. |

### Frontend Form & Form Fields

**General Information** (required fields marked with `*`): Title*, Specification Section, Number*, Revision*, Submittal Type, Submittal Package, Responsible Contractor, Received From, Submittal Manager*, Status, Final Due Date, Cost Code, Location, Linked Drawings.

**Distribution & Scheduling**: Distribution List (contact[]), Ball In Court (display), Lead Time (days), Required On-Site Date.

**Content Section**: Private checkbox, Description* (rich text), Attachments with drag-and-drop + “CURRENT” badging.

**Workflow Section**: Workflow template selector + dynamic steps builder (Add Step button) that reflects `submittal_workflow_steps` / `submittal_responses`.

## Success Criteria

- [ ] Supabase migrations cover the Procore schema (submittals + packages/workflow/responses/distributions/distribution recipients/attachments/linked drawings) with indexes, RLS, and triggers shown in `spec/schema.sql`.
- [ ] `active_submittals` (Drizzle source: `frontend/drizzle/0000_familiar_clea.sql`) includes the new columns needed for the 12-table columns, status calculations, and distribution counts; Supabase query returns rows when tested with `node -e` per the direct costs incident.
- [ ] API routes at `/api/projects/[projectId]/submittals` and `/api/projects/[projectId]/submittals/[submittalId]` handle GET/POST/PUT/DELETE and await `params` to avoid App Router async errors.
- [ ] `SubmittalsClient` renders all 12 Procore columns, status cards, tabbed views (Items/Packages/Spec Sections/Ball In Court/Recycle Bin), exports, and filters for Approver/Ball In Court/Created By/Revision/Division/Location/Number/Private/Received From/Response/Responsible Contractor.
- [ ] Create/Edit dialog mirrors the FORMS.md sections (General, Distribution & Scheduling, Content, Workflow) with Zod schema validation, searchable dropdowns, rich text description, file uploads, and workflow step management; form buttons match the commands (Update, Update & Send Emails, Delete).
- [ ] Detail view includes Distribution Summary, Workflow Responses, Related Items, Emails, and Change History tabs, plus history entries from `submittal_history` and attachments from `submittal_documents`/`submittal_attachments`.
- [ ] Status cards, workflow response badges, distribution timeline, attachments, and email log are styled consistently with existing domain components.
- [ ] Type checks: `npx tsc --noEmit`; lint: `npm run lint`; build: `npm run build`; Supabase query verification: `node -e "const { createServiceClient } = require('@/lib/supabase/service'); createServiceClient().from('submittals').select('id').limit(1).then(({ error }) => { if (error) throw error; console.log('ok'); });"`

## Known Pitfalls & Prevention

### From Incident Log & Pattern Files

#### Direct Costs — Claimed “Fixed” Without Query Validation (INCIDENT-LOG.md 🟡)

**Error:** Supabase query returned empty data despite claiming success.
**Prevention:** Run the actual query against Supabase before declaring completion (use the `node -e` pattern from `.claude/rules/SUPABASE-GATE.md`).
**Validation:** `node -e "const supabase = require('@/lib/supabase/service').createServiceClient(); supabase.from('submittals').select('id').limit(1).then(({ error }) => { if (error) throw error; console.log('ok'); });"`

#### Scheduling — Project FK Was UUID Instead of INTEGER (database-issues.md 🔴)

**Error:** Queries silently returned no rows when `project_id` type mismatched the `projects` PK.
**Prevention:** Always re-run `npm run db:types` and confirm `project_id` columns are `integer` whenever referencing `projects`; double-check `users.id` remains `uuid` for audit fields.
**Validation:** `rg "project_id" supabase/migrations/...` + `npm run db:types` after migrations.

#### API Routing Parameter Conflict (api-routing-errors.md 🔴)

**Error:** Next.js rejects route when multiple dynamic segments at the same level use different names.
**Prevention:** Use `[projectId]` everywhere at that route depth. Create separate `[submittalId]` child folder for detail API and adjust imports accordingly.
**Validation:** `npm run check:routes` (if available) or rebuild dev server after adding routes.

#### Async Params Must Be Awaited (api-routing-errors.md 🟡)

**Error:** Accessing `params.projectId` directly causes runtime errors in Next.js 15.
**Prevention:** Always `const { projectId } = await params;` inside API handlers and server components.
**Validation:** TypeScript should compile without errors once `await` is added.

#### Radix Select Empty String Crash (INCIDENT-LOG.md 🟡)

**Error:** `<Select.Item value="" />` throws runtime error.
**Prevention:** Use sentinel values (e.g., `value="none"`) and sanitize before submitting, especially for searchable dropdowns (Responsible Contractor, Received From, Workflow Template).
**Validation:** `npm run dev` and interactively open each select to confirm no console error.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have enough to implement this?_ **Yes — schema, API patterns, components, and form rules are documented below.**

### Documentation & References - Must Read

```yaml
- file: frontend/src/app/(tables)/submittals/submittals-client.tsx
  why: Existing list view; follow the TableLayout + GenericDataTable patterns.
  pattern: Configure `columns`, `filters`, `rowClickPath`, and `enableViewSwitcher` via `GenericTableConfig`.
  gotcha: Currently uses placeholder `SubmittalRow`; replace with typed data and switch from local filtering to server-driven filters when feasible.

- file: frontend/src/app/(tables)/submittals/submittals-data.ts
  why: Lists data, fetches from the `active_submittals` view via `createServiceClient()`.
  pattern: Services should accept `projectId`, default to env var, and gracefully handle Supabase errors.
  gotcha: The view currently excludes workflows/distributions, so extend or join new tables as needed.

- file: frontend/drizzle/0000_familiar_clea.sql
  why: Defines the `active_submittals` view consumed by the list.
  pattern: Update the view definition to surface required columns (`specification_section`, `sent_date`, `responsible_contractor`, etc.).
  gotcha: Re-running `frontend/drizzle/schema.ts` rebuilds the view; keep it in sync with Supabase migrations.

- file: frontend/src/lib/supabase/service.ts
  why: Pattern for creating a Supabase admin client with service role keys.
  pattern: Always guard on missing env vars, disable auto-refresh, and reuse this client inside API routes.
  gotcha: Never export it to client bundles.

- file: frontend/src/app/api/projects/[projectId]/route.ts
  why: Template for async App Router route handlers with parameter parsing and auth checks.
  pattern: `const { projectId } = await params; const supabase = await createClient();` + error handling.
  gotcha: Do not use generic `[id]` segments at conflicting path depth.

- file: frontend/src/components/tables/generic-table-factory.tsx
  why: Defines the table factory used by Submittals list.
  pattern: Configure `columns`, `searchFields`, `filters`, `exportFilename`, and render badges via `renderConfig`.
  gotcha: Keep the table config serializable; avoid inline functions outside renderConfig if they require closures.

- url: https://nextjs.org/docs/app/api-reference/functions/route-handlers#dynamic-route-segments
  why: Explains how to declare dynamic App Router route segments and why parameter names must match.
  critical: Ensures `[projectId]` & `[submittalId]` are consistent across client, server, and API folders.

- url: https://nextjs.org/docs/app/building-your-application/directives
  why: Reminds that `'use client'` must appear at the top of client components (SubmittalFormDialog, SubmittalDetailClient, etc.).
  critical: Mixing server/client code causes hydration runtime failures.

- url: https://react-hook-form.com/get-started#SchemaValidation
  why: Shows how to integrate `zodResolver` with React Hook Form.
  critical: Use this pattern for the Submittal form dialog to enforce the field types listed in `FORMS.md`.

- url: https://zod.dev/?id=schemas-definitions
  why: Use Zod to describe the submittal payload (title, specification_section, distribution list, attachments, workflow steps).
  critical: Ensures schema-driven validation and compile-time inference for submission/update handlers.

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/COMMANDS.md
  why: Shares Procore domain commands (create, edit, exports, filters).
  pattern: Align action menu buttons, form footer buttons, and export menu with these command keys.
  gotcha: Use this as the authoritative list when labeling UI controls/buttons.

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/MUTATIONS.md
  why: Describes workflows, status state machine, distribution behavior, and response table inference.
  pattern: Use the described mutations as test scenarios for the API (create/update, redistribute, delete).
  gotcha: Workflows include response statuses (`Submitted`, `Pending`, `Approved`, `Approved as Noted`) that must map to badges.

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/schema.sql
  why: Provides Procore-derived table definitions and RLS policies for workflow/distribution tables.
  pattern: Mirror the PKs/FKs/indexes/constraints when writing Supabase migrations.
  gotcha: Each new table expects `project_directory_memberships` filtering; replicate the provided policies.

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/FORMS.md
  why: Enumerates every form field (general/distribution/content/workflow) required for Submittal create/edit.
  pattern: Implement the same fields, validation requirements, and widget types (searchable select, rich text, attachments).
  gotcha: `Number` + `Revision` act as a combined identity (store separately but render as a pair).

- file: scripts/playwright-crawl/procore-crawls/submittals/crawl-summary.json
  why: Lists crawled Procore pages (list, detail, tabs) and captures the commands/forms tied to each view.
  critical: Use this to prioritize which screenshot/DOM files to reference and to confirm tab names.
```

## Implementation Blueprint

- Use the shape below for the list rows, exports, and filtering payloads, and keep related `SubmittalDetail` types aligned with the API contract.

```typescript
interface SubmittalSummaryRow {
  id: string;
  projectId: number;
  submittalNumber: string;
  revision: number;
  title: string;
  specificationSection: string | null;
  submittalTypeName: string | null;
  status: "Draft" | "Open" | "Distributed" | "Closed" | string;
  responsibleContractor: string | null;
  receivedFrom: string | null;
  ballInCourt: string | null;
  approvers: string[];
  latestResponse: "Submitted" | "Pending" | "Approved" | "Approved as Noted" | string | null;
  sentDate: string | null;
  isPrivate: boolean;
}
```

Compose `SubmittalDetail` types that include `distributions`, `responses`, `history`, `documents`, and `linked_drawings`. Build Zod schemas (`createSubmittalSchema`, `updateSubmittalSchema`, `filtersSchema`) that mirror the `FORMS.md` definitions, plug them into `zodResolver`, and reuse the inferred TypeScript types across the UI and API layers.

## Implementation Tasks (ordered by dependencies)

1. **Data Layer – Schema & Types**
   - Write Supabase migrations for `submittal_packages`, `submittal_workflow_steps`, `submittal_responses`, `submittal_distributions`, `submittal_distribution_recipients`, `submittal_attachments`, `submittal_linked_drawings`, plus the revised `submittals` view/table changes (indexes, triggers, RLS). Follow the field descriptions in `spec/schema.sql`, ensure `project_id` is `INTEGER`, add the `update_updated_at_column` trigger, and apply RLS patterns from the schema file.
   - Run `npm run db:types` / `npx supabase gen types typescript --project-id lgveqfnpkxvzbnnwuled --schema public` to refresh `frontend/src/types/database.types.ts`, then define TypeScript interfaces + Zod schemas that mirror the new columns (use `PascalCase` for interfaces, `camelCase` for props, arrays typed as `string[]`).

2. **API Layer – Services & Routes**
   - Implement a `submittalService` (e.g., `frontend/src/services/submittalService.ts`) with `list`, `getById`, `create`, `update`, `softDelete`, `redistribute` methods. Each method should use `createServiceClient()` and accept typed DTOs; test queries via `node -e` to satisfy `.claude/rules/SUPABASE-GATE.md`.
   - Create `app/api/projects/[projectId]/submittals/route.ts` (GET + POST) and `app/api/projects/[projectId]/submittals/[submittalId]/route.ts` (GET + PUT + DELETE). Always `await params`, guard on authenticated users, and map errors to JSON responses.

3. **UI Layer – List + Forms + Detail**
   - Update `SubmittalsClient` to accept typed `SubmittalSummaryRow[]`, configure all 12 Procore columns, search fields, filters from `COMMANDS.md`, export menu, status cards, tabs (Items/Packages/Spec Sections/Ball In Court/Recycle Bin), and the Ball In Court toggle; ensure row clicks navigate to `/[projectId]/submittals/[submittalId]`.
   - Build `SubmittalFormDialog` (client component with `'use client'`): integrate React Hook Form + zodResolver, break the form into the four sections from `FORMS.md`, support file uploads for attachments, workflow step builder, and the required buttons (Update, Update & Send Emails, Delete). Use sentinel values instead of empty strings in `<Select.Item>` to avoid the Radix bug.
   - Build `SubmittalDetailClient` (client component) that renders tabs (General, Related Items, Emails, Change History) plus supporting components: `SubmittalDistributionSummary`, `SubmittalWorkflowResponses`, `SubmittalDocumentsGrid`, `SubmittalHistoryList`, and `SubmittalEmailHistory`. Format badges and cards to match the Procore screenshot.

4. **Integration Layer**
   - Add the detail server page `/[projectId]/submittals/[submittalId]/page.tsx` that calls the service, passes typed data to the client, and wraps navigation/metadata. Ensure rerouting uses the same `[projectId]` parameter as the API to avoid Next.js slug conflicts.
   - Wire the list view, detail view, form dialog, and API together via a shared hook (e.g., `useSubmittals` in `frontend/src/hooks/use-submittals.ts`). Include refetching after mutations and optimistic updates for the status cards, ball-in-court toggle, and Recycle Bin filters.

5. **Testing & Validation**
   - Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the `node -e` Supabase query (see Known Pitfalls section) after migrations and UI changes.
   - Manually verify: the list page shows 12 columns and tabs, a row opens the detail page, the dialog covers required fields, attachments upload, workflow steps render, distribution/responses appear, and the Recycle Bin tab shows soft-deleted rows.

```

## Integration Points

- **Key surfaces:** Ensure schema, env config, and route files stay aligned so exports, filters, and APIs can safely share the same `[projectId]`/`[submittalId]` naming conventions.

```
DATABASE:
  - migration: "Add submittal_* tables + re-run active_submittals view"
  - client: "frontend/src/lib/supabase/service.ts"
  - pattern: "use `createServiceClient` for batch inserts/updates and ensure RLS policies mirror project_directory_memberships."

CONFIG:
  - env: "NEXT_PUBLIC_SUBMITTALS_PROJECT_ID / SUBMITTALS_PROJECT_ID"
  - pattern: "List page falls back to env-defined project if `params` are missing."

ROUTES:
  - file: "frontend/src/app/(tables)/submittals/page.tsx"
  - api: "frontend/src/app/api/projects/[projectId]/submittals/route.ts" and "frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts"
  - pattern: "Use `[projectId]` at this level and `[submittalId]` for nested detail routes. Always `await params`."
```

## Validation Loop

Use this checklist to verify TypeScript, schema, routes, and runtime stability after any change:

- **Type & lint:** `npx tsc --noEmit`, `npm run lint`
- **Supabase schema:** `npm run db:types` (re-author after migrations) + `node -e "const { createServiceClient } = require('@/lib/supabase/service'); createServiceClient().from('submittals').select('id').limit(1).then(({ error }) => { if (error) throw error; console.log('ok'); });"`
- **Routes:** `rm -rf .next && npm run dev` after adding new pages or API routes to prevent stale cache.
- **Build:** `npm run build`
- **Manual:** Open `/[projectId]/submittals`, toggle tabs/filters, open detail, run create/edit flow, and run req/rescribed exports.

## Procore Crawl Data Reference

**Base Path:** `scripts/playwright-crawl/procore-crawls/submittals`

### Sitemap

- **Submittals List:** `https://us02.procore.com/.../tools/submittals?view=list` (screenshot `screenshots/submittals-list.png`)
- **Submittal Detail:** `https://us02.procore.com/.../tools/submittals/562949956843326` (screenshot `screenshots/submittals-detail.png`)
- **Ball In Court Tab:** `view=ball_in_court` (screenshot `screenshots/submittals-tab-ball-in-court.png`)
- **Packages Tab:** `view=packages` (screenshot `screenshots/submittals-tab-packages.png`)
- **Spec Sections Tab:** `view=spec_sections` (screenshot `screenshots/submittals-tab-spec-sections.png`)
- **Recycle Bin Tab:** `view=recycle_bin` (screenshot `screenshots/submittals-tab-recycle-bin.png`)

### Crawl Data Files

- **Summary – Crawl Summary:** Captures list/detail URLs, timestamps, DOM flags, and forms/tables per page (`crawl-summary.json`).
- **Reports – Sitemap Table:** Lists every page encountered during the crawl (`reports/sitemap-table.md`).
- **Reports – Detailed Report:** JSON metrics about actions and elements on each page (`reports/detailed-report.json`).
- **Spec – Commands:** Canonical command keys (create, edit, exports, filters) backed by Procore UI triggers (`spec/COMMANDS.md`).
- **Spec – Mutations:** Create/update/delete behavior, state machine, workflow responses, distribution payloads (`spec/MUTATIONS.md`).
- **Spec – Schema:** Proposed tables, indexes, RLS policies, and constraints for submittals data (`spec/schema.sql`).
- **Spec – Forms:** Field list for create/edit form (general/distribution/content/workflow) plus filter panel definitions (`spec/FORMS.md`).
- **Screenshots – List View:** Captures table layout, status cards, toolbars, and column structure (`screenshots/submittals-list.png`).
- **Screenshots – Detail View:** Shows tabs (General/Related/Emails/Change History), toolbar, workflow panel (`screenshots/submittals-detail.png`).
- **Screenshots – Dialogs & Tabs:** Visual references for form sections, filter panel, and export menu (`screenshots/submittals-detail-open_edit_submittal_form.png`, `screenshots/submittals-list-open_filter_panel.png`, `screenshots/submittals-list-open_export_menu.png`).

### UI Components Detected

- **Create Submittal:** `create_submittal`
- **Create Submittal Package:** `create_submittal_package`
- **Edit (toolbar):** `edit_submittal`
- **Update & Send Emails:** `update_and_send_emails`
- **Delete:** `delete_submittal`
- **Workflow Add Step:** `add_workflow_step`
- **Redistribute:** `redistribute`
- **Export PDF:** `export_pdf`
- **Filters (Approver, Response, Division, etc.):** `add_filter`

## Confidence Score

**Score:** 8/10 — Schema, API, and UI patterns are documented; data tables exist but still need migrations and testing before marking the feature ready.
