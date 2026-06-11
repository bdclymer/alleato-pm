# Table Page Upgrade Inventory

Last updated: 2026-06-11

This inventory is the rollout map for moving table pages to the current shared table-page standard. The target for index/list pages is `UnifiedTablePage` with `useUnifiedTableState`, explicit data contracts, URL-synced state where the table is a primary navigation surface, and no row selection unless a working bulk action exists.

Embedded line-item grids, detail-page subtables, and review panels are not automatic `UnifiedTablePage` candidates. Those should use the domain-specific shared pattern that fits the workflow, such as the Direct Costs line-item table shell for editable cost/SOV/invoice rows.

## Current Reference Surfaces

| Route or surface | Current state | Data/query shape | Selection state | Remaining work |
| --- | --- | --- | --- | --- |
| `/directory/companies` | `UnifiedTablePage` reference for directory company/client views | `/api/directory/project-companies`; server paging/filter/sort/search; explicit API mapping; data-quality flags | No dead selection | Keep derived count filters out of active UI unless backed by deliberate indexes/materialized counters. |
| `/directory/clients` | Shares the companies implementation in client mode | `/api/directory/project-companies?type=client`; server paging/filter/sort/search | No dead selection | Keep parity with companies when adding any table behavior. |
| `/directory/vendors` | `UnifiedTablePage` with URL-synced server state and data-quality flags | `/api/directory/vendors`; explicit select; vendor partial/composite indexes added | Bulk delete enabled | Move remaining direct Supabase mutations in the client behind API calls for consistent auth, cache, and error handling. |
| `docs/development/table-pages/table-component-catalog.md` | Shared primitive catalog | N/A | N/A | Keep this as the component-level source of truth for date, badge, status, avatar, count, link, and row action primitives. |

## Directory Rollout

| Priority | Route or surface | Current table surface | Data/API source | Pagination/search mode | Selection/bulk action state | Recommended upgrade |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | `/directory/contacts` | `UnifiedTablePage` | Mixed API plus direct Supabase client usage | Client-side state with table toolbar controls | Bulk delete enabled | Replace remaining direct Supabase reads/mutations with API-backed list and mutation routes; add explicit select contracts to detail reads. |
| P0 | `/directory/employees` | `UnifiedTablePage` | API-backed delete; list shape should be confirmed before changing | Table-page state present | Selection configured while bulk delete is disabled | Remove visible selection or add real bulk action; do not leave checkbox affordances without a working operation. |
| P0 | `/directory/groups` | `UnifiedTablePage` with `useUnifiedTableState` | API/list implementation should be confirmed before changing | URL/table state present | Selection configured while bulk delete is disabled | Remove visible selection or implement meaningful bulk archive/delete, then add a regression guard for no dead selection. |
| P0 | `/directory/prospects` | `UnifiedTablePage` with `useUnifiedTableState` | Direct Supabase `select("*")` on prospects | Table-page state present | Bulk delete enabled | Move list and mutations to API, replace `select("*")` with explicit fields, and align error envelopes with the companies/vendors APIs. |
| P0 | `/[projectId]/directory` | Custom project-directory page with manual `Table` blocks | Mixed direct Supabase reads plus `/api/projects/:projectId/directory/*` mutations | Page-local state and custom lists | Not a unified selection model | Split the project-scoped company/person membership lists into table configs and API-backed data loaders; preserve the specialized add-to-project flows as explicit row/detail actions. |
| P1 | `/directory/contacts/[contactId]` | Detail page, not primary table page | Direct Supabase `select("*")` | N/A | N/A | Replace detail `select("*")` calls with explicit select lists; keep detail layout out of table-page migration unless recurring subtables emerge. |
| P1 | `/directory/vendors/[vendorId]` | Detail page with operational subtables | Several direct Supabase `select("*")` detail queries | N/A | N/A | Replace detail `select("*")` calls; use shared table primitives for commitments, invoices, contacts, and project lists if they remain visible subtables. |

## Core Operational Tables

| Priority | Route or surface | Current table surface | Data/API source | Recommended upgrade |
| --- | --- | --- | --- | --- |
| P1 | `/` project portfolio | `UnifiedTablePage` | Main project list data in app route | Audit for explicit server-side query contracts, URL state parity, and no page-local badge/date primitives. |
| P1 | `/[projectId]/direct-costs` | `UnifiedTablePage` | Project-scoped direct cost data | Keep table page on unified primitives; keep editable line items on the Direct Costs line-item shell, not `UnifiedTablePage`. |
| P1 | `/[projectId]/invoices` | Multiple `UnifiedTablePage` instances | Project invoice and subcontractor invoice data | Confirm each table has independent state keys, no competing selection state, and consistent money/date primitives. |
| P1 | `/[projectId]/documents` | `UnifiedTablePage` | Project document data | Verify server-side paging/search behavior if document volume is large. |
| P1 | `/tables/files` | `UnifiedTablePage` | Files client data | Audit because this is a high-volume surface; confirm explicit API shape, saved/URL state, and no large client-side full-load path. |
| P2 | `/tables/progress-reports`, `/tables/project-documents`, `/tables/assignment-inbox`, `/tables/outlook-intake`, `/tables/change-events`, `/tables/prime-contracts` | Mostly `UnifiedTablePage` | Mixed route/client loaders | Standardize config files, row action menus, table primitives, and server paging where data can exceed one page. |
| P2 | `/tables/daily-reports`, `/tables/daily-logs`, `/tables/meeting-segments`, `/tables/insights` | Legacy `GenericDataTable` | Direct Supabase/page loaders, including `select("*")` on several pages | Replace `GenericDataTable` with `UnifiedTablePage`; move repeated config to feature config files; use explicit selects and server paging when row counts justify it. |
| P2 | `/[projectId]/meetings` and `/tables/meetings` | Legacy table wrapper/detail route pattern | Direct Supabase `select("*")` on meeting list/detail routes | Migrate list pages to `UnifiedTablePage`; replace detail `select("*")` calls with explicit fields. |

## Admin And Internal Tables

| Priority | Route or surface | Current table surface | Data/API source | Recommended upgrade |
| --- | --- | --- | --- | --- |
| P1 | `/admin/(procore)/procore-tracker` | Legacy `GenericDataTable` | Direct Supabase `select("*")` | Migrate to `UnifiedTablePage`, add explicit select, and preserve feature/page drilldown as row actions. |
| P1 | `/admin/(procore)/procore-tracker/[featureId]` | Legacy `GenericDataTable` | Direct Supabase `select("*")` on feature/pages | Migrate to `UnifiedTablePage`; avoid duplicating the parent table config. |
| P1 | `/admin/site-map` | `UnifiedTablePage` | Inventory client data | Keep as reference but fix or park the unrelated site-map guardrail issue before using `codex:finish` on table work. |
| P1 | `/admin/database-inventory`, `/admin/database/*`, `/admin/document-metadata`, `/admin/test-cases`, `/admin/accounting/*`, `/admin/(procore)/support-articles`, `/admin/(procore)/procore-tools` | `UnifiedTablePage` | Mixed API/client loaders | Audit selection behavior, explicit API fields, and shared primitive usage; no immediate primitive migration needed. |
| P2 | `/admin/tables-directory` | Manual `Table` | `/api/table-metadata` | Migrate only if this becomes an operational index page; otherwise keep manual table but use shared table primitives and consistent empty/error states. |
| P2 | `/admin/rag-eval`, `/admin/project-attribution`, `/admin/ai-learning-promotions`, `/main/pipeline`, `/main/stats` | Manual `Table` diagnostic/review surfaces | Mixed local/API/Supabase data, including some `select("*")` | Do not blindly migrate. First decide whether the surface is a primary index table or a specialized review grid; then either adopt `UnifiedTablePage` or extract a shared review-table primitive. |

## Upgrade Rules

1. Use `UnifiedTablePage` for primary index/list pages.
2. Use `useUnifiedTableState` for search, sort, filters, pagination, and view state that should survive reloads or deep links.
3. Keep selection off unless the toolbar exposes a working bulk action for the selected rows.
4. Use API-backed list/mutation routes for directory and high-value operational tables instead of direct Supabase mutations in client components.
5. Replace `select("*")` with explicit select lists on table list routes and detail routes touched by the migration.
6. Keep table cell styling in shared primitives from `@/components/tables/unified`.
7. Do not add helper panels, duplicate search boxes, decorative badges, or secondary widgets unless they improve findability, decision quality, task speed, error prevention, source confidence, or recovery.

## Implementation Batches

| Batch | Scope | Definition of done |
| --- | --- | --- |
| A | Directory cleanup: contacts, employees, groups, prospects, project-scoped directory | No dead selection, no `select("*")` in touched list/detail queries, API-backed mutations, targeted table-page regression tests updated. |
| B | Legacy `GenericDataTable` pages: daily reports, daily logs, meeting segments, insights, Procore tracker | Pages use `UnifiedTablePage`, configs are reusable, data contracts are explicit, search/sort/pagination behavior is documented per page. |
| C | Admin/manual operational tables | Each manual table is classified as primary index, embedded review grid, or detail subtable; only primary index pages migrate to `UnifiedTablePage`. |
| D | Performance hardening | High-volume APIs get explicit sort allowlists, pagination clamping, partial/composite indexes where query plans need them, and tests for query parameter validation. |

## Guardrails To Add

| Guardrail | Purpose |
| --- | --- |
| Directory table page contract test | Assert `/directory/*` index pages use `UnifiedTablePage` and do not import deprecated `GenericDataTable`. |
| No dead selection test | Fail when a `selection` prop is configured without a real bulk action or with `enableBulkDelete: false` while checkboxes are visible. |
| Table select-star scanner | Fail for `select("*")` in table list pages and touched detail pages unless an inline exception explains why all columns are required. |
| API query-shape tests | Cover sort allowlists, pagination clamps, search/filter mapping, and structured error envelopes for table APIs. |
| Browser smoke for upgraded pages | Use `agent-browser` for one happy-path load/search/filter/open-row flow per upgraded route and store screenshots plus summary artifacts. |
