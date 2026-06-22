# FM Global 8-34 ASRS Actual Brief

Verified: 2026-05-21
Repo: `/Users/meganharrison/Documents/alleato-pm`

## Source Of Truth

The downloaded `FM_Global_834_Project_Brief.md` is not source of truth. It is only an intent signal for the business outcome: turn FM Global 8-34 ASRS sprinkler knowledge into a practical tool that helps Alleato qualify projects, select the right protection path, expose cost levers, and produce traceable outputs faster than manual lookup.

This brief reflects only what was verified in this repository and the connected Supabase database on 2026-05-21.

## What We Are Building And Why

Build an FM Global 8-34 ASRS decision-support workflow inside Alleato PM.

The near-term product is not a fully autonomous, inspection-grade design engine yet. The useful first version is a verified lead/intake and internal review system that:

1. Captures the ASRS project parameters that drive sprinkler requirements.
2. Maps those inputs to FM Global 8-34 tables, figures, and source-backed documentation.
3. Flags high-value cost and design levers before a quote/design basis is locked.
4. Gives Alleato an internal review surface for submitted opportunities.
5. Fails loudly when the data cannot support a deterministic answer.

The reason to build this is practical: ASRS sprinkler design cost and schedule risk comes from choosing the wrong design basis, missing container/commodity implications, and revising after layout or FM/NFPA interpretation changes. The system should reduce that ambiguity before engineering time is spent.

## Verified Implemented Surfaces

### Public Intake

Implemented:

- Public form route: `frontend/src/app/(public)/fm-global/form/page.tsx`
- Form UI: `frontend/src/app/(public)/fm-global/form/fm-global-form.tsx`
- Client submission wrapper: `frontend/src/app/(public)/fm-global/form/fm-global-client.tsx`
- Public submission confirmation: `frontend/src/app/(public)/fm-global/form/submitted/[submissionId]/page.tsx`
- Server action: `frontend/src/app/(public)/fm-global/form/actions.ts`

The form captures:

- Contact name and email
- Project name and location
- ASRS type
- Container type
- Ceiling height
- Storage height
- Rack row depth
- Commodity class as free text
- Existing ceiling sprinkler K-factor

Important limitation:

- `system_type` is hard-coded to `wet`.
- `building_heated` is hard-coded to `true`.
- Commodity class is a free-text field, not a controlled FM classification.
- ASRS type values use display labels like `Mini-Load`, while live DB table rows use snake-case values like `mini_load`.

### Internal Review

Implemented:

- Internal dashboard: `frontend/src/app/(main)/fm-global/page.tsx`
- FM Global tables directory: `frontend/src/app/(main)/fm-global/fm_global_tables/page.tsx`
- Submissions list: `frontend/src/app/(main)/fm-global/submissions/page.tsx`
- Submission detail: `frontend/src/app/(main)/fm-global/submissions/[submissionId]/page.tsx`
- Submissions API: `frontend/src/app/api/fm-global/submissions/route.ts`
- Submission delete API: `frontend/src/app/api/fm-global/submissions/[submissionId]/route.ts`
- React Query hook: `frontend/src/hooks/use-fm-global-submissions.ts`

### Validation And Types

Implemented:

- Input/result schemas: `frontend/src/lib/schemas/fm-global-schemas.ts`
- Minimal schema tests: `frontend/src/lib/schemas/fm-global-schemas.test.ts`
- UI types: `frontend/src/types/fm-global.ts`
- Generated database types include FM/ASRS tables and functions.

## Verified Supabase State

Live row counts checked on 2026-05-21:

| Object | Count / Status | Notes |
| --- | ---: | --- |
| `fm_global_tables` | 46 | All have `extraction_status = vectorized`. |
| `fm_global_figures` | 31 | 31 have `machine_readable_claims`; 28 have commodities. |
| `fm_table_vectors` | 45 | Present. |
| `fm_text_chunks` | 43 | Present; not the 2-row state described in the downloaded brief. |
| `fm_cost_factors` | 7 | Present. |
| `fm_form_submissions` | 19 | Public form has been used. |
| `fm_sprinkler_configs` | 0 | Critical blocker for sprinkler requirement matching. |
| `fm_optimization_rules` | 3 | Present. |
| `fm_optimization_suggestions` | 0 | No generated/persisted suggestions found. |
| `fm_documents` | 1 | Present. |
| `fm_sections` | 66 | Present. |
| `fm_blocks` | 629 | Present. |
| `asrs_sections` | 70 | Present. |
| `asrs_blocks` | 476 | Present. |
| `asrs_configurations` | 4 | Present. |
| `asrs_decision_matrix` | 0 | Empty. |
| `asrs_logic_cards` | 0 | Empty. |
| `asrs_protection_rules` | 0 | Empty. |
| `asrs_figures` | Missing | Function `get_asrs_figure_options` references this missing table. |
| `fmglobal_figures` | Missing | Mentioned by the downloaded brief, not present live. |

Data quality snapshot:

- `fm_global_tables`: 46/46 have `raw_data`; 36/46 have `sprinkler_specifications`; 36/46 have `design_parameters`; 20/46 have `commodity_types`; 27/46 have `container_type`; 0/46 have `storage_height_max_ft`; only 2/46 have ceiling height bounds.
- `fm_global_figures`: 31/31 have machine-readable claims; 28/31 have applicable commodities; 28/31 have container type; 22/31 have max depth; 23/31 have max spacing; 27/31 have related tables and page numbers; only 1/31 has an image.

## Verified Database Logic

### `find_sprinkler_requirements`

The primary overload joins `fm_global_tables` to `fm_sprinkler_configs`.

Because `fm_sprinkler_configs` has 0 rows, sample calls for Shuttle, Mini-Load, Top-Loading, Vertically-Enclosed, wet, and dry returned 0 rows.

This means the public form currently persists a submission but cannot return real sprinkler configuration matches.

### K-Factor Overload

The k-factor overload references old columns on `fm_global_tables`, including `ceiling_height_ft`, `k_type`, `sprinkler_count`, `sprinkler_orientation`, and `commodity_classes`.

The server action already treats this overload as best effort because it can fail against the current schema.

### `generate_optimization_recommendations`

This function exists and returns at least the height-threshold recommendation for a sample project with storage height above 20 ft.

Limitations:

- It expects values such as `open_top_combustible` and `mini-load`.
- The current public form sends values like `Open-Top` and `Mini-Load`.
- Because of that mismatch, some intended optimization rules will not fire from public form data.

### `get_asrs_figure_options`

This function is broken in live Supabase because it references `asrs_figures`, which does not exist.

## What Is Not Implemented In This Repo

Not found in `alleato-pm`:

- `lib/asrs-decision-engine-db.ts`
- `app/api/asrs/design-requirements/route.ts`
- `app/(asrs)/` route group
- `/asrs-form-3`
- Requirements calculator page separate from the public form
- Lead generator page separate from submissions
- Interactive flowchart page
- Table 14, 15, or 17 interactive pages
- Detailed ASRS cost calculator
- Quick estimate contractor field tool
- FM-specific chat route such as `app/api/fm-global-rag/route.ts`
- FM-specific chat UI page
- Railway-hosted FM Global Python RAG service in repo code
- Cloudflare Worker implementation for `fm-global-asrs-api`
- CRM integration
- Slack hot-lead notification
- Quote/report PDF generation
- Exhaustive decision-engine test suite

## Current Functional Assessment

### Working

- The app can collect FM Global ASRS intake information.
- The app can store submissions in `fm_form_submissions`.
- Internal users can list and inspect submissions.
- Internal users can browse FM Global table and figure reference data.
- FM Global document/section/block/vector/text data exists in Supabase.
- Optimization RPC exists and can produce at least one recommendation.

### Partial

- Table/figure data is present, but not complete enough for deterministic compliance.
- RAG-ready data exists, but no FM-specific chat UI/API was found.
- Public form has commodity input, but it is not normalized to FM table classifications.
- Cost factors exist, but no calculator experience was found.
- Figures have machine-readable claims, but only one figure image is populated.

### Broken Or Misleading

- Sprinkler matching returns 0 rows because `fm_sprinkler_configs` is empty.
- `get_asrs_figure_options` references missing `asrs_figures`.
- The k-factor sprinkler RPC references stale columns.
- Current UI values do not match DB enum/string conventions.
- Existing docs under `docs/asrs/` include aspirational implementation language and should not be treated as current-state proof.

## Recommended Build Scope

### Phase 0: Truth And Guardrails

Goal: make the current system fail loudly and stop producing false confidence.

Deliverables:

1. Add a current-state banner or internal docs note that the form is intake-only until `fm_sprinkler_configs` is populated.
2. Add a guardrail in the server action: if no matches are returned, persist the submission but mark the result as requiring manual review.
3. Normalize public form values to DB values before calling RPCs.
4. Replace free-text commodity class with controlled FM categories.
5. Repair or remove `get_asrs_figure_options`.
6. Add a small test suite that proves known inputs either return matches or clearly return `manual_review_required`.

### Phase 1: Deterministic Requirements Foundation

Goal: create a verified deterministic lookup path before building more UI.

Deliverables:

1. Choose canonical tables: use `fm_global_tables` and `fm_global_figures` unless a better migration plan is explicitly approved.
2. Populate `fm_sprinkler_configs` or replace it with a better canonical decision table.
3. Add source references to every deterministic output: table, figure, section, page, and extracted source row.
4. Build fixture-based tests from known FM 8-34 examples.
5. Add no-match/error telemetry so missing coverage is visible.

### Phase 2: Practical User Workflow

Goal: turn intake into a usable internal ASRS review flow.

Deliverables:

1. Public form returns a clear result state: matched, no deterministic match, or manual review required.
2. Internal submission detail shows inputs, matched source tables, figures, warnings, and recommendations.
3. Add reviewer workflow fields: status, assigned reviewer, notes, follow-up date, and qualified/not-qualified outcome.
4. Add cost-lever summary based on normalized input and verified rule coverage.

### Phase 3: Advanced Product

Only after deterministic matching is verified:

1. Cost calculator.
2. PDF/report generation.
3. FM-specific chat for explanations only, not authoritative requirement selection.
4. CRM/Slack handoff.
5. Interactive documentation and flowcharts.

## Definition Of Done For The Next Meaningful Milestone

The next milestone should not be "build the ASRS platform." It should be:

> A user can submit a real ASRS project, and the system either returns a source-backed FM Global table/figure match or explicitly marks the submission for manual review with enough context for an Alleato reviewer to continue.

Acceptance checks:

- At least five known fixture inputs return deterministic matches.
- At least three intentionally unsupported inputs return manual-review states.
- No submission silently succeeds with zero matches.
- Public and internal pages show the same normalized input values.
- Every displayed requirement includes source evidence.
- Tests cover schema validation, value normalization, match/no-match behavior, and recommendation triggering.

