# Advanced Teams Conversation Compiler — Implementation Tasks

Date: 2026-04-30
PRP: `docs/PRPs/teams-conversation-compiler/prp-teams-conversation-compiler.md`
Status: Partial — batch gate still open

## Progress Summary

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| Phase 0: Database Migration | 2 | 2 | ✅ Done |
| Phase 1: Core Compiler Module | 7 | 7 | ✅ Done |
| Phase 2: API Endpoints | 2 | 2 | ✅ Done |
| Phase 3: Attribution Correction | 2 | 2 | ✅ Done |
| Phase 4: LLM Prompt Engineering | 2 | 2 | ✅ Done |
| Phase 5: OpenAI Client Setup | 2 | 2 | ✅ Done |
| Phase 6: Integration and Testing | 5 | 4 | 🟨 Batch gate open |
| **Total** | **22** | **21** | 🟨 |

---

## Pre-Flight Checklist (Do Before Writing Any Code)

- [x] Read `prp-teams-conversation-compiler.md` in full
- [x] Read `backend/src/services/integrations/microsoft_graph/teams.py` — understand `_process_chat_message()` and conversation format
- [x] Read `backend/src/services/integrations/microsoft_graph/embed.py` — understand status query and AI Gateway pattern
- [x] Read `backend/src/services/integrations/microsoft_graph/project_inference.py` — understand `ProjectAssigner`
- [x] Verify backend structure: `ls backend/src/services/` and `ls backend/src/api/`
- [x] Verify FastAPI router: `rg -n "@app\\.(post|get)|graph_sync|intelligence" backend/src/api/main.py`
- [x] Run schema queries to verify table exists/not yet:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'document_attribution_candidates';
  ```

---

## Phase 0: Database Migration

- [x] **0.1** Create migration `supabase/migrations/{timestamp}_add_document_attribution_candidates.sql`
  - Table: `document_attribution_candidates` with all fields from PRP schema section
  - Include indexes on `source_document_id`, `candidate_project_id`, `status`
  - Enable RLS
  - Add migration comment explaining purpose
- [x] **0.2** Apply migration and verify table exists
  ```bash
  cd frontend && npx supabase db push
  ```
  Confirm with SQL query: `SELECT table_name FROM information_schema.tables WHERE table_name = 'document_attribution_candidates'`

---

## Phase 1: Core Compiler Module

- [x] **1.0** Create `backend/src/services/intelligence/__init__.py` (empty or with package docstring)
- [x] **1.1** Implement `parse_conversation_messages(content: str) -> list[dict]`
  - Parse `[message:<id>] [YYYY-MM-DD HH:MM:SS] Person Name: text` format
  - Handle multi-line messages
  - Strip `[message:...]` markers from text
  - Return empty list if malformed (never raise)
- [x] **1.2** Implement `normalize_conversation(doc, messages) -> dict`
  - Extract chat name from content header or doc title
  - Build unique participants list from sender names
  - Build clean `conversation_text` for LLM (no `[message:...]` markers)
  - Extract `title_signals` for project attribution
- [x] **1.3** Implement `attribute_project(supabase, doc_id, normalized, existing_project_id) -> dict`
  - Title alias match strategy (confidence 0.90–0.95, overrides stale existing_project_id)
  - Delegate to existing `infer_project_id()` from `project_inference.py`
  - Return `is_correction=True` when overriding existing project_id
  - Auto-assign only when `confidence >= 0.85` AND `is_correction=False`
- [x] **1.4** Implement `extract_intelligence(conversation_text, normalized, attribution, model) -> dict`
  - Single LLM call using `response_format={"type": "json_object"}`
  - Use `get_openai_client()` (to be created in Phase 5)
  - Use system prompt from `prompts.py` (to be created in Phase 4)
  - Call `extract_with_retry()` wrapper (to be created in Phase 5)
  - Return structured dict with all 8 output types
- [x] **1.5** Implement all 5 output writer functions:
  - `write_overview(supabase, doc_id, overview, attribution)` — updates `document_metadata`
  - `write_attribution_candidates(supabase, doc_id, candidates)` — inserts to new table
  - `write_insight_cards(supabase, doc_id, insights, project_id)` — inserts to `project_insights`
  - `write_structured_insights(supabase, doc_id, risks_and_decisions, project_id)` — inserts to `insights`
  - `write_tasks(supabase, doc_id, tasks, project_id)` — inserts to `tasks`, `source_system='microsoft_teams'`
- [x] **1.6** Implement `compile_conversation(supabase, doc_id) -> dict`
  - Full flow: fetch → parse → normalize → attribute → extract → write all outputs → update status
  - Returns result dict with counts for each output type
  - Updates `document_metadata.status = 'compiled'` on success
  - Updates `document_metadata.status = 'error'` on failure (never raises)
  - Logs failures with doc_id, stage, and error message
- [x] **1.7** Implement `run_compiler_batch(supabase, batch_size, max_retries, target_status) -> dict`
  - Queries `document_metadata` for `type='teams_dm_conversation'` AND missing `overview`
  - Processes with `max_retries` per row
  - Never lets one failure stop the batch
  - Returns aggregate stats dict

---

## Phase 2: API Endpoints

- [x] **2.1** Create `POST /api/intelligence/teams-compiler/run` endpoint
  - Request: `{"batch_size": 25, "dry_run": false}`
  - Response: `{"job_id": ..., "status": "completed", "results": {...}}`
  - Register with FastAPI router
- [x] **2.2** Create `GET /api/intelligence/teams-compiler/status` endpoint
  - Returns all 9 monitoring metrics from requirements doc
  - Uses Supabase function `get_teams_compiler_status()` or direct queries
  - Create the Supabase SQL function if using RPC approach

---

## Phase 3: Attribution Correction

- [x] **3.1** Create `scripts/fix-teams-attribution.py`
  - Query: `SELECT id, name FROM projects WHERE name ILIKE '%ulta%'` to verify project IDs
  - Find rows: `document_metadata WHERE title ILIKE '%Ulta Fresno%'`
  - Update `project_id` to correct Ulta Fresno project
  - Write correction records to `document_attribution_candidates`
  - Log all changes with before/after values
- [x] **3.2** Add `title_override` method to `attribute_project()`
  - Check `doc.title` against all `projects.aliases` arrays
  - Flag `is_correction=True` if match differs from `existing_project_id`
  - Always write correction candidate even if `confidence >= 0.90`

---

## Phase 4: LLM Prompt Engineering

- [x] **4.1** Create `backend/src/services/intelligence/prompts.py`
  - System prompt: construction company intelligence compiler, not a summarizer
  - Include the good/bad quality bar examples from requirements doc verbatim
  - Full JSON schema documentation in prompt
  - Instructions: no tasks from vague chatter, preserve source_message_ids, use confidence 0 + needs_review when uncertain
  - Known Alleato initiatives list for initiative signal detection
- [x] **4.2** Design JSON schema (see PRP Task 4.1 for full schema)
  - All 8 output types with all required fields
  - Enum values for severity, decision_status, risk_category, insight_type, sentiment
  - Include in prompt as JSON schema or example object

---

## Phase 5: OpenAI Client Setup

- [x] **5.1** Add provider-loop OpenAI client factory to compiler client module
  - Uses AI Gateway when `AI_GATEWAY_API_KEY` is set (matching embed.py pattern)
  - Falls back to direct `OPENAI_API_KEY`
  - **Never initialize at module level** (lazy factory only — CLAUDE.md Gate 17)
- [x] **5.2** Implement `extract_with_retry(messages, model, max_retries=2) -> dict`
  - JSON parse retry on failure
  - Returns minimal valid dict with `_extraction_failed=True` on final failure
  - **Never raises** — always returns a dict
  - Logs JSON parse failures with attempt number

---

## Phase 6: Integration and Testing

- [x] **6.1** Single-row smoke test
  - Run against one real `teams_dm_conversation` row
  - Verify: no exception, `overview_written=True`, `status='compiled'`, overview is not template text
- [ ] **6.2** Batch test (25 rows)
  - `POST /api/intelligence/teams-compiler/run` with `{"batch_size": 25}`
  - Verify: completes within 3 minutes, `succeeded >= 20`, `failed == 0`
- [x] **6.3** Attribution verification
  - Query `document_metadata WHERE type='teams_dm_conversation' AND status='compiled'`
  - Check `document_attribution_candidates` for pending review items
  - Verify `tasks.source_system = 'microsoft_teams'` for extracted tasks
- [x] **6.4** Quality bar check
  - Read 5 generated `overview` values
  - Verify none start with "This document is a Teams..."
  - Verify they describe operational content with project context
- [x] **6.5** Update `embed.py` to include `"compiled"` status
  - Add `"compiled"` to status query in `embed_pending_graph_documents()`
  - Test that re-embedding picks up a compiled row correctly

---

## Session Log

### 2026-04-30

- PRP created based on requirements document analysis
- Database schema fully researched (document_metadata, project_insights, insights, tasks, projects)
- Existing pipeline code architecture documented
- Known failure mode (LLM JSON non-return, stale attribution) documented with prevention rules
- `document_attribution_candidates` table identified as new migration requirement
- Attribution correction case (Ulta Fresno → Ulta Dallas) documented as concrete test case
- S29 implementation created Linear issue AAI-283, added compiler/client/prompts/API/migrations/script, applied and ledger-verified migrations through `20260430133500`, and passed single-row smoke for `teamsdm_7f3a5302296abb94_2025-11-12`.
- S29 added batch guardrails after delegated verification showed the 25-row run could outlive the PRP's 3-minute window: LLM calls now have a 30-second request timeout, long Teams conversations are capped to 6,000 LLM-input characters, and the batch runner returns `timed_out=True` after `TEAMS_COMPILER_BATCH_MAX_MS` instead of hanging silently.
- Main-thread 25-row batch run returned cleanly with a partial result: `total_processed=10`, `succeeded=10`, `failed=0`, `skipped=0`, `overview_written=10`, `structured_insights_written=18`, `tasks_written=12`, `processing_time_ms=181864`, `timed_out=True`. This proves no hard failures on processed rows, but the PRP gate remains open because it did not process 25 rows or finish under 3 minutes.
