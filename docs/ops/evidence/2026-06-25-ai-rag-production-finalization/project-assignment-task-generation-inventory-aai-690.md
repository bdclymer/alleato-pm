# AAI-690 Project Assignment And Task Generation Inventory

Date: 2026-06-25
Issue: AAI-690

## Active Production Paths

### Shared Project Assignment

- `backend/src/services/ingestion/project_assignment.py`
  - Shared project inference and deterministic attribution helper for meetings, Outlook/Teams communications, and document backfills.
- `backend/src/services/ingestion/communication_project_backfill.py`
  - Bounded communications project assignment backfill after ingestion jobs.
- `backend/src/services/integrations/microsoft_graph/onedrive_project_assignment_backfill.py`
  - OneDrive/SharePoint project assignment backfill using the shared assigner.
- `backend/src/services/integrations/microsoft_graph/project_document_backfill.py`
  - Promotion of assigned SharePoint/OneDrive metadata rows into project document surfaces.
- `backend/src/services/integrations/microsoft_graph/attachment_promotion.py`
  - Attachment promotion routing; returns review-needed results when project assignment is missing.

### Fireflies Meetings And Generated Tasks

- `backend/src/services/ingestion/fireflies_pipeline.py`
  - Fireflies transcript ingestion, project assignment, rewriter task rows, and task scalar/array project projection for direct rewriter path.
- `backend/src/services/pipeline/extractor.py`
  - Canonical Stage 3 extraction for meeting decisions/risks/tasks/opportunities.
  - Deletes/replaces Fireflies generated tasks per meeting and writes `tasks` via `_upsert_task`.
  - Current writer sets both scalar and array task project fields.
- `backend/src/services/ingestion/fireflies_task_rewriter.py`
  - Rewrites Fireflies action items into imperative task rows and preserves internal owner resolution.

### Source Lifecycle, Manual Review, And Attribution Evidence

- `scripts/verify/verify_source_lifecycle_health.mjs`
  - Read-only source-family health verifier for Fireflies, Teams, Outlook, and SharePoint/OneDrive.
  - Verifies project disposition, embeddings, generated task project assignment, lifecycle rows, and Project Intelligence freshness.
- `scripts/verify/source_lifecycle_project_applicability.mjs`
  - Classifies source records as single-project, not project-applicable, internal, multi-project review, or project-assignment review.
- `frontend/src/app/api/admin/project-attribution-candidates/route.ts`
  - Admin review surface for project attribution candidates.
- `frontend/src/app/api/assignment-inbox/assign/route.ts`
  - Manual assignment inbox write path for unmatched/ambiguous records.
- `frontend/src/app/api/documents/[docId]/assign-project/route.ts`
  - Manual document/meeting project assignment route.

### Task Creation Surfaces

- `frontend/src/app/api/documents/[docId]/tasks/route.ts`
  - Manual task creation from a source document, including assignee resolution and project linkage.
- `frontend/src/app/api/projects/[projectId]/emails/[emailId]/tasks/route.ts`
  - Manual/project-scoped task creation from emails with task project arrays populated.
- `frontend/src/lib/ai/tools/action-tools.ts`
  - AI assistant write-back path for generated task creation through `create_ai_generated_task`.
- `backend/src/services/intelligence/compiler.py`
  - Source intelligence compiler and action/task signal routing for communications/document analysis.

## Active Verifiers And Repair Tools

- `npm run rag:verify:source-lifecycle`
- `npm run verify:project-attribution`
- `PYTHONPATH=backend backend/.venv/bin/python scripts/verify/verify_fireflies_task_integrity.py`
- `node scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs`
- `node scripts/verify/backfill_project_assignments_from_attribution_rules.mjs`
- `node scripts/verify/backfill_task_project_assignments_from_rules.mjs`
- `node scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs`

## Baseline Findings

- `npm run rag:verify:source-lifecycle -- --days 7` passed after using the correct argument shape.
- `PROJECT_ATTRIBUTION_AUDIT_DAYS=7 npm run verify:project-attribution` passed.
- Fireflies task integrity initially failed over the 60-day operational window:
  - 50 sampled link violations in the first 1,000 checked tasks.
  - Root pattern: stale tasks had a source document project, but task project arrays were empty or mismatched.
- Current Fireflies task writers already set task project arrays; the failure was stale data.

## Repair Applied

- Added `--source-system` and `--tasks-only` filters to `scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs`.
- Applied deterministic Fireflies task-only repair:
  - Command: `node scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs --days 60 --limit 5000 --source-system fireflies --tasks-only`
  - Result: 76 Fireflies task links updated, 0 document rows updated.
- Added Python guardrail test proving `_upsert_task` persists the task project array with the scalar project.
- Added `--source-system` and `--sync-existing-project-ids` controls to `scripts/verify/backfill_task_project_assignments_from_rules.mjs`.
- Updated task text attribution repair so future scalar project assignments also populate task project arrays.
- Applied deterministic Fireflies task-attribution sync:
  - Command: `node scripts/verify/backfill_task_project_assignments_from_rules.mjs --apply --days 60 --limit 5000 --source-system fireflies --sync-existing-project-ids`
  - Result: 5 Fireflies tasks assigned from deterministic task text and 48 existing Fireflies task project arrays synced from scalar project values.
- Updated document-attribution backfill so task rows linked to newly assigned documents also populate task project arrays.

## Post-Repair Evidence

- Fireflies task integrity passed over the 60-day operational window.
- Fireflies task-only postcheck found 0 remaining eligible stale links.
- Fireflies task-attribution sync postcheck found 0 remaining Fireflies scalar/array task project mismatches.
- Generated task duplicate check found 0 duplicate groups.
- Source lifecycle still passed over the 7-day Outlook/Teams concern window.

## Typecheck Delegation Evidence

- Delegated typecheck checkpoint after first JS edit:
  - Command: `npm --prefix frontend run typecheck`
  - Status: failed by 300s timeout, with no task-specific type errors reported.
  - Sub-agent conclusion: unrelated repo-wide typecheck timeout/config burden.
- Delegated typecheck checkpoint after second JS edit:
  - Command: `npm --prefix frontend run typecheck`
  - Status: failed by 300s timeout, with no task-specific type errors reported.
  - Sub-agent conclusion: unrelated repo-wide typecheck timeout/config burden.
- No-timeout delegated retry:
  - Command: `TYPECHECK_NO_TIMEOUT=1 npm --prefix frontend run typecheck`
  - Status: passed with no TypeScript errors.
- Delegated typecheck checkpoints after later JS edits:
  - Commands: `npm --prefix frontend run typecheck`
  - Status: one later checkpoint terminated with `EXIT:143` and no TypeScript diagnostics; the no-timeout delegated retry passed.
