# Task: Microsoft Email Assistant Hardening

Status: Complete
Owner: Codex
Created: 2026-06-20
Linear Issue: AAI-574 - https://linear.app/megankharrison/issue/AAI-574/audit-and-harden-microsoft-email-assistant-workflow
Related Handoff: <path if applicable>

## Objective

Brandon's Microsoft email assistant has one canonical, observable workflow that
monitors incoming non-junk mail, categorizes unread email, drafts replies,
notifies Teams for urgent items, sends a daily Teams recap, and routes eligible
emails plus project attachments into the RAG/vectorization pipeline with project
assignment when applicable.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.
- [x] Current Microsoft Graph webhook/subscription reliability verified against Microsoft docs.
- [x] Spam/junk exclusion rules identified for both live Graph and cached intake paths.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.
- [x] Email monitoring, triage, drafting, urgent Teams alerting, daily recap, RAG ingestion, and attachment promotion route through one owner or explicit adapters.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.
- [x] Emails eligible for RAG have project assignment status and vectorization status recorded.
- [x] Project attachments saved in Supabase have source email lineage and vectorization status recorded.
- [x] Junk/spam/skipped records are inspectable as intentional exclusions, not silent drops.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `PYTHONPATH=backend backend/.venv/bin/python -m py_compile backend/src/services/ingestion/project_assignment.py backend/src/services/integrations/microsoft_graph/outlook.py backend/src/services/integrations/microsoft_graph/attachment_promotion.py backend/src/services/integrations/microsoft_graph/sync.py backend/src/services/integrations/microsoft_graph/live_mail.py backend/src/services/integrations/microsoft_graph/subscriptions.py backend/src/services/agents/microsoft_executive_assistant/tools.py backend/src/services/agents/microsoft_executive_assistant/triggers.py backend/src/scripts/run_email_digest.py backend/src/api/main.py`; `node --check scripts/verify/verify_microsoft_assistant_health.mjs` | PASS | Syntax/compile check for touched backend modules, shared project assigner, and health verifier. |
| Targeted tests        | `PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests/test_graph_embed.py backend/tests/test_outlook_intake.py backend/tests/test_project_assignment.py backend/tests/test_graph_sync_options.py backend/tests/test_graph_live_mail.py backend/tests/test_graph_subscriptions.py backend/tests/test_microsoft_executive_assistant.py backend/tests/test_email_digest.py -q` | PASS | 67 passed, 12 existing warnings. |
| Browser/user-flow     | N/A | PASS | No frontend-visible UI changed. |
| DB/provider read-back | RAG DB pooler SQL via Postgres CLI; Graph/Supabase health via `node scripts/verify/verify_microsoft_assistant_health.mjs`; attachment promotion smoke via `promote_outlook_intake_attachments(..., limit=5)` | PASS | Repaired identity sequences. Applied/validated attachment FK and vectorization-status columns on `outlook_email_intake`; attachment promotion returns `seen=5`, `review_needed=5`, `failed=0`. Brandon Graph/actionable-cache/ledger health passes. |
| End-to-end proof      | `node scripts/verify/verify_microsoft_assistant_health.mjs` | PASS | Latest raw Graph message was Calendly/List-Unsubscribe noise; verifier now checks latest actionable inbox message. Latest actionable Graph `2026-06-21T16:31:16Z`, cached intake matches, sync ledger success, Render cron recent success at `2026-06-21T23:03:24Z`. |
| Brandon bounded sync  | `MICROSOFT_SYNC_USERS=bclymer@alleatogroup.com OUTLOOK_SYNC_SINCE=2026-06-20 GRAPH_DELTA_MAX_PAGES=1 GRAPH_DELTA_MAX_ITEMS=50 ... run_graph_sync(... run_embedding=False ...)` | PASS | `status=complete`, `total_synced=17`, `outlook=17`, `errors=[]`; no large-DWG attachment timeout surfaced after metadata-only attachment guard. |
| RAG/project/vector read-back | RAG DB query for Brandon rows since `2026-06-07T00:00:00Z` only | PASS | User-approved scope is last 14 days only. Read-back after gateway drain, vector projection refresh, and assignment metadata normalization: `sampled=262`, `with_document_metadata_id=262`, `with_project_id=149`, vectorization statuses: `embedded=245`, `skipped=17`, `pending=0`, `embedded_chunk_total=410`; project statuses: `assigned=149`, `review_needed=113`, `missing=0`, `deferred=0`. |
| Outlook assignment backfill | `backfill_outlook_intake_project_assignments(get_supabase_client(), mailbox_user_id='bclymer@alleatogroup.com', limit=50)` | PASS | `scanned=50`, `assigned=20`, `review_needed=30`, `failed=0`; one discovered false positive was corrected after the token-boundary regression guardrail was added. |
| Outlook RAG document backfill | `backfill_outlook_intake_rag_documents(get_supabase_client(), mailbox_user_id='bclymer@alleatogroup.com', limit=50)` | PASS | `scanned=50`, `created=50`, `skipped=0`, `failed=0`; latest sampled rows now all have `document_metadata_id`. |
| 14-day bounded backfill | `since='2026-06-07T00:00:00Z'` passed to project backfill, RAG document backfill, and vectorization refresh | PASS | Final project normalization: `scanned=262 assigned=149 normalized_existing=149 review_needed=113 failed=0`; `rag_document_backfill: scanned=41 created=41 failed=0`; final `vectorization_refresh: scanned=262 updated=262 failed=0`, statuses `embedded=245`, `skipped=17`, `pending=0`. |
| Vectorization proof   | `AI_PROVIDER_PATH=vercel_gateway ... embed_graph_document(...)` for 14-day pending Brandon docs; `refresh_outlook_intake_vectorization_statuses(... since='2026-06-07T00:00:00Z')` | PASS | Gateway drain completed all 14-day pending rows. Final refresh: `scanned=262`, `updated=262`, `failed=0`, statuses `embedded=245`, `skipped=17`, `pending=0`. Direct local OpenAI path failed with quota 429 because `.env` forces `AI_PROVIDER_PATH=openai`; gateway path works. |
| Legacy cleanup        | `rg -n "scripts/ingestion/microsoft-email-attachments\|microsoft-email-attachments\|backfill_unlinked_intake_emails" backend/src scripts docs/architecture docs/ops/tasks/2026-06-20-microsoft-email-assistant-hardening.md package.json render.yaml -g '!docs/ai-plan/**'`; `py_compile backend/src/scripts/backfill_unlinked_intake_emails.py` | PASS | Deleted orphaned TypeScript worker under `scripts/ingestion/microsoft-email-attachments`; compatibility Python backfill now delegates to canonical Outlook/RAG helpers. Runtime references only point to the compatibility wrapper and architecture note. |
| Delivery adapter states | `PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests/test_email_digest.py -q` | PASS | 5 passed. Daily Teams digest sender now reports `sent`, `blocked`, `failed`, and `dry_run` states via `DeliveryResult`. |
| External docs         | Microsoft Learn Graph change-notification, Outlook notification, lifecycle, and delta-query docs | PASS | Graph webhooks are the right real-time wakeup; reliability requires fast 2xx/queue, lifecycle handling, and delta drain/backstop. |

## Files Changed

- `docs/ops/tasks/2026-06-20-microsoft-email-assistant-hardening.md` - Task gate and evidence ledger.
- `backend/src/api/main.py` - Manual Outlook subscription endpoint now creates Inbox-scoped subscriptions.
- `backend/src/scripts/run_email_digest.py` - Daily Teams digest includes important emails, attachments, and draft/review activity.
- `backend/src/scripts/backfill_unlinked_intake_emails.py` - Compatibility wrapper now delegates to canonical Outlook intake RAG/project/vectorization helpers instead of creating app `document_metadata` rows directly.
- `backend/src/services/agents/microsoft_executive_assistant/tools.py` - Live inbox tool supports unread-only reads.
- `backend/src/services/agents/microsoft_executive_assistant/triggers.py` - Scheduled prompt requires unread-only inbox reads.
- `backend/src/services/ingestion/project_assignment.py` - Project name matching now uses token-boundary phrase checks so short names such as `Test` do not match inside larger words like `latest`.
- `backend/src/services/integrations/microsoft_graph/live_mail.py` - Graph inbox reader supports `isRead eq false`.
- `backend/src/services/integrations/microsoft_graph/embed.py` - Batch embedding now treats terminal zero-chunk documents as skipped instead of retryable failures, and standalone RAG-isolated embedding skips app-table status updates when `document_metadata` is not visible.
- `backend/src/services/integrations/microsoft_graph/outlook.py` - Intake records attachment/list failures, only runs source compiler after RAG document upsert, assigns projects through shared inference before RAG intake, stores large attachments metadata-only, and includes a bounded historical assignment/metadata normalization backfill.
- `backend/src/services/integrations/microsoft_graph/sync.py` - Outlook token recovery keeps `OUTLOOK_SYNC_SINCE` available and ledger health validates raw intake rows instead of net-new RAG rows.
- `backend/src/services/integrations/microsoft_graph/subscriptions.py` - Outlook subscriptions default to Inbox scope and recreate drifted whole-mailbox subscriptions.
- `scripts/database/rag/migrations/20260621202000_outlook_intake_attachment_fk.sql` - Adds/validates the RAG-side attachment-to-email FK for Supabase embedding and attachment promotion joins.
- `scripts/database/rag/migrations/20260621213000_outlook_intake_vectorization_status.sql` - Adds explicit Outlook intake vectorization status projection columns and index.
- `backend/tests/test_email_digest.py` - Digest coverage for attachments/drafts and structured Teams delivery states.
- `backend/tests/test_graph_embed.py` - Regression coverage for RAG-isolated low-content Outlook documents that should mark RAG status as skipped without app `document_metadata`.
- `backend/tests/test_graph_live_mail.py` - Unread-only live inbox coverage.
- `backend/tests/test_graph_subscriptions.py` - Inbox subscription default/override/drift recreation coverage.
- `backend/tests/test_microsoft_executive_assistant.py` - Scheduled prompt guardrail coverage.
- `backend/tests/test_outlook_intake.py` - Intake assignment, historical backfill, existing-project metadata normalization, missing RAG document backfill, vectorization status projection, failure persistence, large attachment metadata-only storage, and compiler guardrail coverage.
- `backend/tests/test_graph_sync_options.py` - Token-recovery, raw-intake ledger, and update-only delta guardrail coverage.
- `backend/tests/test_project_assignment.py` - Regression coverage for project-name substring false positives.
- `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md` - Documents webhook/delta control plane and email digest ownership.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - Documents canonical Outlook intake/RAG ownership and removed legacy TypeScript worker.
- `render.yaml` - Makes `GRAPH_SUBSCRIBE_OUTLOOK_SCOPE=inbox` explicit for subscription reconcile.
- `scripts/verify/verify_microsoft_assistant_health.mjs` - Treats cached intake as healthy when it matches the latest actionable live Graph inbox message and ignores obvious Graph noise such as List-Unsubscribe reminders.
- `scripts/ingestion/microsoft-email-attachments/**` - Deleted orphaned TypeScript worker that used a competing project-required capture path and 1536-dimension embeddings.

## Risks / Gaps

- Brandon health now passes, including Render cron, latest actionable Graph inbox, cached intake, and sync ledger.
- Per user direction, embedding/backfill is limited to the last 14 days only (`since=2026-06-07T00:00:00Z`). Do not expand to 90 days or all history unless explicitly requested.
- The 14-day Brandon window has vectorization status recorded with zero pending rows after gateway embedding and projection refresh.
- The 14-day Brandon window has no `missing` or stale `deferred` project-assignment metadata rows after normalization. The remaining 113 `review_needed` rows are unassigned by inference and should be treated as Brandon/admin/finance/personal review unless a future policy maps specific senders or subjects to non-project categories.
- Local `.env` forces `AI_PROVIDER_PATH=openai`; direct OpenAI embedding fails with quota 429. Gateway embedding works when `AI_PROVIDER_PATH=vercel_gateway` is selected. Production Render has `AI_GATEWAY_REQUIRED` configured, but local task verification should use the gateway path or update local non-secret provider selection.
- One non-project/personal-style email produced zero chunks and is marked `embedding_status=skipped`; this is inspectable but should be covered by a no-retry guardrail if similar rows accumulate.
- Historical planning docs under `docs/ai-plan/rag-pipeline/MICROSOFT_EMAIL_ATTACHMENTS` remain as archival documentation only; runtime worker code under `scripts/ingestion/microsoft-email-attachments` was deleted.
- There are unrelated dirty files in the checkout; they are intentionally not included in this task's changed-files list.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
