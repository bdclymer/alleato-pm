# SPEC: Deep, real-time meeting intelligence extraction

**Audience:** a Claude Code session implementing this. Read this whole file first.
Follow the repo `CLAUDE.md` and the gates in `.claude/rules/`.

**One-line goal:** When a meeting ends, read the *whole* transcript against the
project's *real* state, and write rich, evidence-linked **risks / decisions /
insights / tasks** into the typed layer in real time — so the daily brief, the
project intelligence page, AND the chat agent all get deeper at once. They all
read the same typed layer (`insight_cards` + `tasks`); make that layer deep and
everything downstream improves with zero changes to the consumers.

---

## 0. Why (context — do not skip)

The brief/insights read shallow because of **compression drift**: the meeting is
chunked, a light pass normalizes the chunks, and downstream consumers summarize
summaries. The fix (already partly built) routes extraction output into the typed
layer and makes the brief read it. **What's still missing is depth**: the
extraction itself never reads the full transcript and never compares it to ground
truth. This spec builds that. Background: `docs/PRPs/intelligence/daily-briefs-extraction-strategy.md`.

The architecture is a hub-and-spoke. Make the hub deep:

```
Transcript ─► [DEEP EXTRACTION] ─► insight_cards + tasks (typed layer)
                                          │
                  ┌───────────────────────┼────────────────────────┐
                  ▼                        ▼                        ▼
            Daily Brief          Project Intelligence Page       Chat Agent
   (brandon-daily-update.ts)   (intelligence_packets)    (intelligence-tools.ts,
                                                          structured-queries.ts,
                                                          project-tools.ts)
```

---

## 1. Current state (verified — start here, don't re-derive)

**Trigger (polling, ~15 min):**
- `backend/src/services/scheduler.py` — APScheduler runs `run_fireflies_sync_job`
  every `FIREFLIES_SYNC_INTERVAL_MINUTES` (default 15) and a backlog drain job.
- There is **no Fireflies webhook**. "Real time" today means ≤15 min after the
  transcript is available in Fireflies.

**Per-meeting pipeline:**
- `backend/src/services/pipeline/orchestrator.py: run_full_pipeline(metadata_id)`
  runs: parser → embedder (segments + embeddings = the RAG/recall layer) →
  `run_extractor` (Stage 3) → `process_source_document_to_packet` (compiles the
  project intelligence packet from cards).

**Extraction (Stage 3) — the shallow part to replace:**
- `backend/src/services/pipeline/extractor.py: run_extractor(metadata_id)`:
  - Builds `notes_context` from parsed notes/action-item sections.
  - Calls `backend/src/services/pipeline/llm.py: extract_structured_data(...)`,
    which is fed **segment-derived `raw_decisions/raw_risks/raw_tasks` + `notes_context[:6000]` + summary** at `temperature=0.3`. **It does NOT read the
    full transcript and does NOT see project state.** This is the depth gap.
  - Writes **tasks** via `_upsert_task` → `tasks` table (UNIQUE(metadata_id,
    description); assignee resolution via `TaskAssigneeResolver`; Fireflies action
    items rewritten by `ingestion/fireflies_task_rewriter`).
  - Promotes risks/decisions/opportunities via `_promote_meeting_signals` →
    `source_signal_candidates` → `promote_signal_candidate` → `insight_cards`
    (compiler_version `meeting_extractor_compiler_v0_1`). Per-item confidence is a
    **heuristic** placeholder right now.

**Two databases (do not mix):**
- PM APP `lgveqfnpkxvzbnnwuled`: `insight_cards`, `intelligence_packets`,
  `intelligence_targets`, `insight_card_evidence`, `tasks`, `document_metadata`.
- RAG DB `fqcvmfqldlewvbsuxdvz`: `source_signal_candidates`, `document_chunks`,
  `rag_document_metadata` (full transcript text lives here too).

---

## 2. What to build

### Part A — Real-time trigger (Fireflies webhook)
Make "meeting over" actually trigger processing instead of waiting for the poll.

1. Add a webhook endpoint, e.g. `POST /api/ingest/fireflies/webhook` in
   `backend/src/api/main.py` (mirror the existing Graph webhook handlers around
   `/api/graph/webhooks/notifications`: validate, ACK fast, process in background).
2. Fireflies fires a **"Transcription completed"** event with a `meetingId`.
   On receipt: fetch that transcript via the Fireflies API and run the existing
   ingest → `run_full_pipeline(metadata_id)` for just that meeting.
3. **Keep the 15-min poll and the backlog drain as a backstop** (webhooks can be
   missed). Idempotency (below) makes double-processing safe.
4. Verify the webhook secret/signature. Register the webhook in the Fireflies
   dashboard/API (the implementer should do this via API if a token exists; else
   state the exact missing credential).

If a webhook is out of scope for now, the fallback is lowering
`FIREFLIES_SYNC_INTERVAL_MINUTES` — but the webhook is the correct "real-time" fix.

### Part B — Deep extraction pass (the core)
Replace the shallow `extract_structured_data` input with a full-document,
ground-truth-aware pass. Three inputs, sourced differently:

1. **Full transcript (read whole).** Load `rag_document_metadata.content` /
   `raw_text` for the meeting and pass it **uncapped** (remove the `[:6000]`).
   Use a large-context model (the repo already uses `gpt-5.5` as the compiler
   model — see `intelligence/client.py: COMPILER_MODEL`; do NOT use the small
   `CHAT_MODEL`). Add a safety cap only at the model's real context limit.
2. **Deterministic project state (direct DB, NOT vector search).** Given the
   meeting's `project_id`, fetch from PM APP and pass as structured context:
   - open `tasks` for the project,
   - open `insight_cards` (risks/decisions/blockers) for the project's
     `intelligence_target` (so the model knows what's already tracked → enables
     supersede vs. new),
   - schedule milestones/dates and budget summary if available
     (`schedule_tasks`, budget tables — check `database.types.ts`; the
     `project-operating-summary-sources.ts` loader already assembles much of this
     and can be mirrored server-side).
3. **Targeted semantic prior context (bounded RAG).** One scoped lookup —
   "has this issue/risk surfaced before on this project?" — via the existing
   search RPCs, project-filtered, top-k small. This is a *supporting* input, not
   the source.

**The model's job (single structured-output call):** *Given this full transcript,
this current project state, and this related history — produce the new/changed
risks, decisions, opportunities, insights, and tasks, each with an evidence quote
from the transcript and a calibrated confidence, and for each indicate whether it
is NEW, an UPDATE to an existing tracked item, or RESOLVED.*

Output schema (extend `pipeline/models.py`): each item carries
`title`, `description`, `evidence_quote`, `confidence` (0–1), `status_hint`
(new/update/resolved), plus type-specific fields (risk: category/likelihood/
impact/mitigation/severity; decision: rationale/impact; task: owner/due_date/
priority/source_quote). Optionally a short `whatChanged` narrative for the
project intelligence page.

### Part C — Tasks generated by the deep read, in the same real-time pass
Tasks must come from the deep reasoning (catching implied/owner-assigned actions
Fireflies missed), not only Fireflies' action-item list.

1. Have the deep pass emit `tasks[]` with `evidence_quote`, `owner`, `due_date`,
   `priority`, `confidence`.
2. Feed them through the **existing** `_upsert_task` path (keep assignee
   resolution via `TaskAssigneeResolver`, the UNIQUE(metadata_id, description)
   dedup, and the per-meeting delete-then-reinsert idempotency). Merge with the
   Fireflies-rewriter tasks (dedupe by normalized description; prefer the
   higher-confidence / owner-resolved version).
3. **Confidence gate (owner decision = "review queue for actions"):** tasks at or
   above a threshold are created `open`; below it, write them with
   `status='needs_review'` (or `extraction_metadata.needs_review=true`) so a
   human promotes them. Never silently create a low-confidence task that pages
   someone.

### Part D — Writes feed the existing typed layer (no consumer changes)
- Risks/decisions/opportunities/insights → the existing
  `_promote_meeting_signals` candidate→promote path → `insight_cards`. Replace the
  heuristic confidence with the model's calibrated confidence. Use `status_hint`
  to drive supersede/resolve via the existing `normalized_signal_key` dedup +
  `current_status`.
- Tasks → `tasks` (Part C).
- `process_source_document_to_packet` (already in `run_full_pipeline`) then
  refreshes the project intelligence packet from the now-deeper cards — the
  project intelligence page improves automatically.
- The chat agent already reads `insight_cards`/`tasks` via
  `frontend/src/lib/ai/tools/intelligence-tools.ts`, `structured-queries.ts`,
  `project-tools.ts` — it gets deeper context for free. (Optionally add a chat
  tool that returns a project's open risks/decisions/tasks with evidence quotes,
  if one doesn't already exist.)

---

## 3. Guardrails (mandatory — per CLAUDE.md "never ship silent failures")
- **Evidence required:** every written risk/decision/task carries an
  `evidence_quote` (and the candidate path already writes `insight_card_evidence`
  with the source document). No evidence → don't write, or write as needs_review.
- **Confidence gating** for anything that creates a task or notifies (above).
- **Idempotency:** reprocessing the same meeting must not duplicate. Cards already
  clear prior candidates per `(source_document_id, compiler_version)`; tasks
  delete-then-reinsert per meeting. Keep both. The webhook + poll backstop relies
  on this.
- **Supersede/living state:** use `status_hint` + `normalized_signal_key` so an
  updated risk updates the existing card (preserving `first_seen_at`,
  incrementing `source_count`) instead of creating a duplicate. (The
  `operating_summary._persist_operating_cards` pattern is the reference.)
- **Cost/latency:** one large-context call per meeting. At ~5–15 meetings/day this
  is fine. Each meeting is processed independently — no daily batch; the brief
  aggregates across meetings by reading `insight_cards`.

---

## 4. Files to change (concrete)
- `backend/src/services/pipeline/llm.py` — new deep extraction function (full
  transcript + project state + semantic context; large model; structured output).
- `backend/src/services/pipeline/extractor.py` — `run_extractor`: load full
  transcript + fetch project state, call the new function, route tasks + signals
  (most wiring already exists in `_promote_meeting_signals` / `_upsert_task`).
- `backend/src/services/pipeline/models.py` — richer item schema (evidence,
  confidence, status_hint).
- `backend/src/api/main.py` — Fireflies webhook endpoint (Part A).
- `backend/src/services/scheduler.py` — keep poll as backstop; optionally lower
  default interval.
- (Optional) `frontend/src/lib/ai/tools/intelligence-tools.ts` — a chat tool
  exposing per-project open risks/decisions/tasks with evidence, if missing.

---

## 5. Verification
- Pick one real meeting `metadata_id`; run `run_extractor(metadata_id)` (or
  `POST /api/pipeline/process`) and confirm: tasks written with evidence; risks/
  decisions promoted to `insight_cards` with real confidence + evidence; re-run
  produces **zero** duplicate rows; an updated risk supersedes rather than dupes.
- Compare the new cards against the raw transcript by hand — depth should visibly
  exceed the old normalization pass (the whole point).
- Confirm the project's `intelligence_packets` row refreshes and the chat agent,
  asked "what are the open risks on project X," returns the new evidence-backed
  items.
- Backend tests: extend `backend/tests/test_meeting_signal_promotion.py`; add a
  fixture-transcript test for the deep pass (mock the LLM call, assert routing +
  idempotency + confidence gating).
- Run `cd backend && python -m pytest tests/test_meeting_signal_promotion.py tests/test_project_operating_summary.py -q`.

## 6. Sequencing
1. **Part B + C + D first** (deep extraction + tasks + writes) — this is the value;
   it works on the existing 15-min trigger.
2. **Part A (webhook)** second — upgrades ≤15-min to instant.
3. Tune confidence thresholds against real meetings with the user before defaulting
   tasks to auto-create.

## 7. Hard rules
- RAG-docs gate: changing `pipeline/**` requires updating
  `docs/architecture/AI-RAG-ARCHITECTURE.md` (and `tables.yaml` + `npm run
  db:inventory` if tables/columns change) in the same commit.
- Two Supabase projects — `insight_cards`/`tasks` in PM APP; transcript text +
  `source_signal_candidates` in RAG DB. Use the right client.
- Don't ask the user to do external-service work you can do with a CLI/token/MCP;
  if blocked, name the exact missing credential.
- Never claim it works without running it on a real meeting and reading the output.
