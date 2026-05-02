# Teams Conversation Intelligence Compiler

**System:** `backend/src/services/intelligence/`
**Trigger:** Manual (`/run-teams-compiler` skill) or cron
**Model:** `gpt-5.5` (as of May 2026)

---

## What it does

Reads raw Microsoft Teams DM conversations from the database, sends them to an LLM, and writes structured intelligence back — overviews, tasks, risks, decisions, and sentiment signals. Think of it as the "digestion layer" between raw message ingestion and anything the AI assistant or dashboard can actually use.

Before this compiler runs, a conversation exists in `document_metadata` as unprocessed text. After it runs, the conversation has:
- A plain-English overview of what actually happened (not a generic summary)
- Tasks with owners and due dates written to the `tasks` table
- Risks, decisions, sentiment written to the `insights` table
- A project attribution (which project this conversation is about)
- A `status` of `"compiled"` so it won't be processed again

---

## Pipeline stages (per document)

```
fetch → parse → normalize → attribute → extract (LLM) → write → mark compiled
```

| Stage | What happens |
|-------|-------------|
| **fetch** | Load the full `document_metadata` row (content, title, project_id, etc.) |
| **parse** | Break raw content into individual message objects via regex (`[message:id] [timestamp] sender: text`) |
| **normalize** | Extract chat name, date, participants list, compute substantive text length |
| **attribute** | Figure out which project this conversation belongs to (see Project Attribution below) |
| **extract** | Send the conversation to gpt-5.5 and get back structured JSON (see What the LLM extracts) |
| **write** | Write overview, tasks, insights, attribution candidates to their respective tables |
| **mark compiled** | Set `status = "compiled"` and record timestamp in `source_metadata.teams_compiler` |

If any stage fails, the document is marked `status = "error"` and the stage name + error message are stored so you know exactly where it broke.

---

## What the LLM extracts

The system prompt instructs the model to behave as an "intelligence compiler, not a summarizer." Quality bar enforced in the prompt:

> **Good:** "This conversation suggests the project is not blocked yet, but the risk is forming around material delivery and installer sequencing."
> **Bad:** "This document is a Teams direct message conversation discussing project-related topics."

The JSON the LLM returns:

| Field | What it is |
|-------|-----------|
| `overview` | Plain-English paragraph: what actually happened, who was involved, what the outcome was |
| `conversation_topic` | One-sentence label |
| `insights[]` | High-level intelligence cards (schedule risk, financial risk, change order risk, client relationship, etc.) with severity and strategic read |
| `tasks[]` | Explicit action items with owner, due date, confidence, `needs_review` flag |
| `risks[]` | Categorized risks (schedule, cost, cash_flow, subcontractor, owner_client, etc.) with evidence and recommended action |
| `decisions[]` | Decisions made or proposed, with status (proposed/decided/blocked/reversed/needs_approval) |
| `sentiment` | Overall tone of the conversation (positive/neutral/concerned/frustrated/urgent/conflict) with business implication |
| `initiative_signals[]` | Signals about Alleato internal initiatives (Alleato AI, JobPlanner, Financial workflow) |

**Confidence gating:** Items with `confidence < 0.7` are discarded. Items with `needs_review: true` are written but flagged. The LLM is explicitly told to use `confidence: 0` + `needs_review: true` rather than hallucinate.

---

## Project attribution

One of the hardest problems: figuring out *which project* a conversation is about.

The compiler uses a two-method cascade:

**Method 1 — Title override (fast, high-confidence)**
Scans the conversation title/chat name for project names, client names, aliases, and project numbers from the `projects` table. If it finds a match ≥ 0.85 confidence, it auto-assigns. If it finds multiple candidates or a correction to an existing assignment, it writes them to `document_attribution_candidates` for human review.

**Method 2 — Content inference (fallback)**
Uses `infer_project_id()` from the Microsoft Graph project inference module, which searches the full conversation text and participant list. Lower confidence; anything below `AUTO_ASSIGN_CONFIDENCE = 0.85` goes to `document_attribution_candidates` rather than being auto-assigned.

**What "auto-assign" means:**
- Updates `document_metadata.project_id` and `project`
- Appends `project_auto:{method}` to the document's tags
- Only happens when confidence ≥ 0.85, no correction conflict, and no competing candidates

---

## Tables written to

| Table | What's written |
|-------|---------------|
| `document_metadata` | `overview`, `project_id`, `project`, `tags`, `status`, `source_metadata.teams_compiler` |
| `tasks` | One row per extracted task (upsert on `metadata_id, description`) |
| `insights` | Risks, decisions, sentiment, initiative signals (DELETE + INSERT on `metadata_id`) |
| `project_insights` | High-confidence insight cards linked to the project (INSERT only, confidence ≥ 0.8) |
| `document_attribution_candidates` | Uncertain/competing project matches for human review (DELETE + INSERT on `source_document_id`) |

---

## Batch behavior

`run_compiler_batch()` is the entry point for cron and manual runs.

- **Batch size:** 25 by default, max 50
- **Ordering:** Most recent conversations first (`date DESC`) — so if you run a partial batch, you always get the freshest data
- **Skipped docs:** Conversations under `MIN_COMPILER_CHARS = 200` chars of substantive content (filler words like "ok", "thanks", "sent" don't count) are marked `skipped_low_content` and don't consume an LLM call
- **Time limit:** 170 seconds (`TEAMS_COMPILER_BATCH_MAX_MS`). If the batch hits the limit mid-run, it stops cleanly and reports `timed_out: true`. Run again to continue.
- **Retries:** Each document gets up to 2 retries on error before being counted as failed
- **Projects cache:** Projects are fetched once for the entire batch (not per-document) to avoid N+1 queries
- **Target status:** Default processes `raw_ingested` and `embedded` rows. Pass `target_status=["error"]` to retry failures.

---

## How to run it

```
/run-teams-compiler          # default batch of 25
/run-teams-compiler 50       # larger batch
```

Or directly in Python:
```python
from services.intelligence.teams_compiler import run_compiler_batch
stats = run_compiler_batch(supabase, batch_size=25)
```

To retry errors specifically:
```python
stats = run_compiler_batch(supabase, batch_size=25, target_status=["error"])
```

---

## Key files

| File | Purpose |
|------|---------|
| `backend/src/services/intelligence/teams_compiler.py` | Main pipeline logic |
| `backend/src/services/intelligence/client.py` | LLM client (provider routing, JSON parsing, retry logic) |
| `backend/src/services/intelligence/prompts.py` | System prompt and JSON schema sent to the LLM |
| `backend/src/services/integrations/microsoft_graph/project_inference.py` | Content-based project attribution fallback |
| `supabase/migrations/20260430180000_teams_compiler_batch_partial_index.sql` | Partial index keeping batch queries fast as compiled rows accumulate |

---

## What can go wrong

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `succeeded=0, failed=0, skipped=0` | Queue is empty — nothing left to compile | Normal state; check if new conversations are ingesting |
| `_extraction_failed: true` in errors | LLM returned unparseable JSON or quota exceeded | Check OpenAI quota; re-run with `target_status=["error"]` |
| Documents stuck in `raw_ingested` for days | Ingestion running but compiler not scheduled | Run `/run-teams-compiler` manually; add to cron |
| Overview written but no project assigned | Conversation didn't match any project name/alias | Check `document_attribution_candidates` table for pending review items |
| `timed_out: true` | Batch hit 170s limit (normal for large runs) | Just re-run; it will pick up where it left off |

---

## History of bugs fixed (for future debugging context)

- **Upsert crash on `insights` table** (April 2026): `on_conflict` upsert failed because no unique constraint exists on `(metadata_id, type, description)`. Fixed by switching to DELETE+INSERT. The description column can exceed btree key limits, making a unique index impractical.
- **N+1 projects query** (April 2026): `_fetch_projects()` was called per document = 25 SELECT queries per batch. Fixed by pre-fetching once in `run_compiler_batch`.
- **JSON parse failures on AI Gateway** (April 2026): Gateway doesn't support `response_format=json_object`, so the LLM was wrapping output in markdown fences. Fixed by stripping ` ```json ` fences before `json.loads`.
- **Wrong batch order** (April 2026): Batch was ordering by `created_at` (ingestion timestamp — all the same day for backfill) instead of `date` (actual conversation date). Fixed by ordering on `date DESC`.
