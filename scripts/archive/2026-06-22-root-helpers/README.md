# Archived Root Script Helpers - 2026-06-22

Status: Archived
Owner: Ops/dev tooling
Archived from: `scripts/`

These files were moved out of the root `scripts/` folder because they were
one-off helper scripts without root `package.json` ownership and without active
references in current docs or task control files at the time of archival.

They are preserved for historical lookup only. Do not run them directly from
this archive path against production data without first reviewing:

1. current database schema/types,
2. current environment/provider ownership,
3. current runbooks and task ledgers,
4. whether a maintained `scripts/verify/`, `scripts/ops/`, `scripts/db/`, or
   `scripts/ingestion/` replacement exists.

## Archived Files

| File | Former classification | Reason archived |
| --- | --- | --- |
| `backfill-fireflies-meeting-durations.mjs` | backfill-helper | One-off Fireflies duration repair helper. |
| `backfill-insights-embeddings.mjs` | backfill-helper | Replaced in active runbook by maintained RAG verify/backfill package scripts. |
| `backfill-meeting-summary-embeddings.mjs` | backfill-helper | Replaced in active runbook by maintained RAG verify/backfill package scripts. |
| `backfill-summary-embeddings.mjs` | backfill-helper | Replaced in active runbook by maintained RAG verify/backfill package scripts. |
| `backfill-task-assignees.mjs` | backfill-helper | One-off task assignee backfill helper. |
| `backfill-task-project-ids.js` | backfill-helper | One-off task project ID backfill helper. |
| `backfill_outlook_document_metadata.py` | backfill-helper | One-off Outlook document metadata backfill. |
| `backfill_outlook_intake_from_metadata.py` | backfill-helper | One-off Outlook intake backfill. |
| `delete-noblesville-commitments.mjs` | import-helper | Historical Noblesville cleanup helper. |
| `import-allisonville-commitments.cjs` | import-helper | Historical Allisonville import helper. |
| `import-noblesville-change-workflow.mjs` | import-helper | Historical Noblesville change workflow import. |
| `import-noblesville-submittals.cjs` | import-helper | Historical Noblesville submittal import. |
| `import_legacy_budget.py` | import-helper | Legacy budget import helper. |
| `patch-noblesville-sov.py` | import-helper | Historical Noblesville SOV patch helper. |
| `update-noblesville-company-ids.py` | import-helper | Historical Noblesville company ID patch helper. |
| `frontend-test-rag-terminal.mjs` | test-helper | Former `frontend/test-rag-terminal.mjs`; duplicate ad hoc RAG terminal helper with stale root-script usage comments. |
| `send-owner-brief-test.mts` | test-helper | Ad hoc owner brief delivery test helper. |
| `test-ai-tool-queries.mjs` | test-helper | Replaced in active runbook by `npm run rag:verify:assistant-tool-registry` and eval/contract checks. |
| `test-ai-tools.mjs` | test-helper | Replaced in active runbook by `npm run rag:verify:assistant-tool-registry` and eval/contract checks. |
| `test-pipeline-sections.py` | test-helper | Ad hoc pipeline sections smoke helper. |
| `test-rag-terminal.mjs` | test-helper | Replaced in active runbook by maintained `npm run rag:verify:*` checks and `scripts/cli/query-rag.sh`. |
| `test_csv_export.sh` | test-helper | Ad hoc CSV export smoke helper. |
| `test_direct_costs.py` | test-helper | Ad hoc direct-costs smoke helper. |
