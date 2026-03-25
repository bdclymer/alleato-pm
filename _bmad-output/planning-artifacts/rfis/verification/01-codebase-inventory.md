# RFIs — Codebase Inventory

**Generated:** 2026-03-17
**Tool:** rfis

## Existing Planning Artifacts

Located in `_bmad-output/planning-artifacts/rfis/`:

| File | Content |
|------|---------|
| `procore-rfi-tool.md` | Procore support doc extraction — 20 form fields, status flow, ball-in-court behavior |
| `rfi-tool.md` | Full PRP — list page, data-fetch layer, table UI, create form, E2E tests. Confidence: 8.5/10 |
| `crawl/pages/` | ~80+ crawled pages from live Procore with screenshots, DOM, metadata |

## Procore Reference Docs

| File | Relevant Content |
|------|-----------------|
| `docs/procore-reference/PROCORE-TOOLS.md` | RFIs listed as "Implementation" status |
| `docs/procore-reference/INDEX_FEATURES.md` | RFIs: "Partial" implementation, 182 crawled files, MEDIUM priority |
| No `rfis-reference.md` exists | — |
| No `docs/PRPs/rfis/` exists | Referenced in PROCORE-TOOLS.md but never created |

## Implementation Files

### Pages

| File | Route | Description |
|------|-------|-------------|
| `frontend/src/app/(main)/[projectId]/rfis/page.tsx` | `/[projectId]/rfis` | Server component. Fetches via `getProjectRfis()`, renders `<RfisClient>` |
| `frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx` | (client within list) | `UnifiedTablePage` with table/card/list views, client-side filtering, search, delete |
| `frontend/src/app/(main)/[projectId]/rfis/new/page.tsx` | `/[projectId]/rfis/new` | Create form with dual submit: "Save as Draft" / "Create Open". Uses `ProjectFormPageLayout` |
| `frontend/src/app/(main)/[projectId]/rfis/[rfiId]/page.tsx` | `/[projectId]/rfis/[rfiId]` | Server component. Single RFI fetch, renders `ProjectPageHeader` + `<RfiDetail>` |
| `frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx` | (client within detail) | View/edit modes, status actions (Open/Close), 3-column layout, inline edit |
| `frontend/src/app/(tables)/rfis/page.tsx` | `/rfis` | **LEGACY STUB** — mock data, not connected to Supabase. Uses old `DataTable` |

### Components

| File | Exports | Description |
|------|---------|-------------|
| `frontend/src/features/rfis/rfis-table-config.tsx` | `rfiColumns`, `rfiDefaultVisibleColumns`, `rfiFilters`, `buildRfiTableColumns()`, `renderRfiRowActions()`, `renderRfiCard()`, `renderRfiList()` | 10 columns, 1 filter (status), card/list renderers |

No `frontend/src/components/domain/rfis/` directory exists.

### Hooks

| File | Hook Name | Description |
|------|-----------|-------------|
| `frontend/src/hooks/use-rfis.ts` | `useRfis(projectId)` | GET list via API |
| | `useRfi(projectId, rfiId)` | GET single via API |
| | `useCreateRfi(projectId)` | POST mutation |
| | `useUpdateRfi(projectId)` | PATCH mutation |
| | `useDeleteRfi(projectId)` | DELETE mutation |

### API Routes

| File | Method | Endpoint | Description |
|------|--------|----------|-------------|
| `rfis/route.ts` | GET | `/api/projects/[projectId]/rfis` | List with status/search/page/limit filters |
| `rfis/route.ts` | POST | `/api/projects/[projectId]/rfis` | Create. Auto-generates number. Schema-based validation (draft vs open) |
| `rfis/[rfiId]/route.ts` | GET | `/api/projects/[projectId]/rfis/[rfiId]` | Single fetch |
| `rfis/[rfiId]/route.ts` | PATCH | `/api/projects/[projectId]/rfis/[rfiId]` | Update. Handles status transitions, sets closed_date |
| `rfis/[rfiId]/route.ts` | DELETE | `/api/projects/[projectId]/rfis/[rfiId]` | Hard delete |

### Database

#### `rfis` table (30 columns)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| number | integer | Auto-incremented in API |
| project_id | integer | FK to projects |
| subject | text | Required |
| question | text | Required on insert |
| status | text | Default: "draft" |
| is_private | boolean | Default: false |
| assignees | text[] | Denormalized array |
| distribution_list | text[] | Denormalized array |
| ball_in_court | text | |
| ball_in_court_employee_id | integer | |
| rfi_manager | text | |
| rfi_manager_employee_id | integer | |
| created_by | text | |
| created_by_employee_id | integer | |
| closed_date | text | |
| date_initiated | text | |
| due_date | text | |
| received_from | text | |
| responsible_contractor | text | |
| location | text | |
| specification | text | |
| cost_code | text | |
| cost_impact | text | |
| schedule_impact | text | |
| reference | text | |
| rfi_stage | text | |
| sub_job | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `rfi_assignees` table (junction)

| Column | Type | Notes |
|--------|------|-------|
| rfi_id | UUID | FK to rfis.id |
| employee_id | integer | |
| is_primary | boolean | |

### Schemas

| File | Exports |
|------|---------|
| `frontend/src/lib/schemas/rfi-schema.ts` | `rfiBaseSchema`, `rfiDraftSchema`, `rfiOpenSchema`, `rfiEditSchema`, `RFI_STATUS_OPTIONS` (5: draft, open, pending, closed, void), `RFI_STATUS_VARIANT_MAP`, `RFI_IMPACT_OPTIONS` (yes, no, tbd, n/a), `RfiFormValues`, `RfiEditValues` |

### Types

| File | Export |
|------|--------|
| `frontend/src/types/database-extensions.ts:41` | `RFI = Database["public"]["Tables"]["rfis"]["Row"]` |

### Migrations

No migration files matching `*rfi*` exist in `supabase/migrations/`.

### Tests

| File | Coverage |
|------|----------|
| `frontend/tests/financial/rfis.spec.ts` | 10 E2E tests: empty state, list rendering, status cards, create draft, create open, validation, detail navigation, edit, close, delete |

## Prior Investigation Findings

No `.claude/investigations/rfis/` directory exists. No prior investigation report.
