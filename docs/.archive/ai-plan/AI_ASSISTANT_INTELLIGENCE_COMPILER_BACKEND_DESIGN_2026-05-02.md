# AI Assistant Intelligence Compiler Backend Design - 2026-05-02

## Verdict

Alleato already has the start of the intelligence layer:

- `intelligence_targets`
- `insight_cards`
- `insight_card_targets`
- `insight_card_evidence`
- `intelligence_packets`
- `intelligence_packet_cards`
- `intelligence_reviews`

So the next move is not to create another packet system. The missing backend layer is the compiler that turns raw `document_metadata` / `document_chunks` rows into reviewed, project-scoped intelligence cards and packet refreshes.

## Two-Layer Model

### Knowledge Layer

Purpose: store raw retrievable evidence.

Existing tables:

- `document_metadata`
- `document_chunks`
- source-specific ingestion state tables
- RAG RPCs such as `search_document_chunks` and `search_document_chunks_by_category`

Responsibilities:

- normalize Teams/email/doc/transcript metadata
- store raw text and source fields
- chunk/vectorize
- preserve source identity, participants, dates, thread/message IDs
- keep project attribution if known

This layer answers: "Can I find the source?"

### Intelligence Layer

Purpose: turn raw evidence into current project understanding.

Existing tables:

- `intelligence_targets`
- `insight_cards`
- `insight_card_targets`
- `insight_card_evidence`
- `intelligence_packets`
- `intelligence_packet_cards`
- `intelligence_reviews`

Missing tables/jobs:

- source compiler job ledger
- attribution candidates
- signal extraction candidates
- packet refresh job ledger

This layer answers: "What does this mean for the project?"

## Proposed Pipeline

### Stage 1 - Source Ingested

Trigger condition:

- a new or updated source lands in `document_metadata`
- source category is one of: `email`, `teams_message`, `meeting`, `document`
- source has enough text to analyze directly or has chunks in `document_chunks`

Do not compile every row blindly. Skip:

- duplicate source hash
- empty/boilerplate-only content
- system/test messages
- source rows already compiled with the same `compiler_version` and content hash

Output:

- enqueue one `source_intelligence_jobs` row

### Stage 2 - Project Attribution

Goal: decide which project or intelligence target the source belongs to.

Signals to score:

- explicit `document_metadata.project_id`
- project number
- project name
- project aliases
- client name
- address/site references
- Teams channel/thread title
- email subject
- participants mapped to known project team members
- attachment or OneDrive path
- nearby thread/document context

Output:

- high confidence: update/confirm `document_metadata.project_id` and create/approve attribution candidate
- medium confidence: create candidate and compile signals as `needs_review`
- low confidence: store candidate only; do not update packet

### Stage 3 - Signal Extraction

Goal: extract structured meaning from the source.

Signal types map directly to existing `insight_cards.card_type` values:

- `risk`
- `decision`
- `blocker`
- `task`
- `project_update`
- `open_question`
- `financial_exposure`
- `change_management`
- `schedule_risk`
- `process_issue`

Fields to extract:

- title
- summary
- why it matters
- current status
- confidence
- suggested owner label/person
- next action
- first seen / last seen
- stale-after date
- cost signal
- schedule signal
- affected trade/vendor/person
- evidence excerpt
- source occurred at

Output:

- one or more `source_signal_candidates`
- promote eligible candidates to `insight_cards`
- write `insight_card_evidence` for every promoted card

### Stage 4 - Card Upsert / Merge

Do not create a new card for every source item.

Merge into an existing card when:

- same target
- same card type
- same normalized issue/decision/task key
- source is within the same active window
- existing card is not resolved/rejected

Create a new card when:

- no matching active card exists
- signal is materially new
- card type or project differs
- previous card is resolved and the new signal is a recurrence

Output:

- inserted or updated `insight_cards`
- appended `insight_card_evidence`
- `source_count` incremented
- `last_seen_at` refreshed
- `current_status` updated if evidence shows movement

### Stage 5 - Review Gate

Send to `intelligence_reviews` when:

- attribution confidence is medium or low
- extraction confidence is medium or low
- financial amount is material
- source contains contradictory signal against existing packet
- owner/person mapping is uncertain
- source is from admin-only communications and packet visibility needs care
- the compiler proposes changing a resolved card back to open

Auto-approve when:

- project attribution is high
- signal extraction is high
- source is recent
- no conflicting card exists
- evidence excerpt is present
- source category is allowed for the target visibility

### Stage 6 - Packet Refresh

Refresh the current packet when:

- a high-confidence card is created
- a high-confidence active card is materially updated
- an approved review changes a card/target/evidence
- a stale card crosses its `stale_after`
- source coverage changes significantly
- daily scheduled refresh runs

Do not refresh packet when:

- only low-confidence candidates were created
- only raw chunks changed but no intelligence signal changed
- duplicate evidence was attached to an existing card with no status change

Output:

- new `intelligence_packets` row for the target
- update current packet unique record behavior as existing migration defines
- refreshed `intelligence_packet_cards`
- updated `source_coverage`, `confidence_summary`, `review_queue_count`, `stale_item_count`

## Proposed New Tables

### `source_intelligence_jobs`

Purpose: durable compiler ledger.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `source_document_id text not null references document_metadata(id) on delete cascade`
- `source_hash text`
- `job_type text not null` check: `attribution`, `signal_extract`, `card_upsert`, `packet_refresh`
- `status text not null default 'queued'` check: `queued`, `running`, `succeeded`, `failed`, `skipped`, `needs_review`
- `priority integer not null default 0`
- `target_id uuid null references intelligence_targets(id)`
- `project_id integer null references projects(id)`
- `compiler_version text not null`
- `attempt_count integer not null default 0`
- `last_error text`
- `input_snapshot jsonb not null default '{}'::jsonb`
- `output_summary jsonb not null default '{}'::jsonb`
- `queued_at timestamptz not null default now()`
- `started_at timestamptz`
- `finished_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(status, priority desc, queued_at)`
- `(source_document_id, compiler_version)`
- unique partial on `(source_document_id, source_hash, job_type, compiler_version)` where `status in ('queued','running','succeeded')`

### `document_attribution_candidates`

Purpose: reviewable project/target attribution.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `source_document_id text not null references document_metadata(id) on delete cascade`
- `candidate_project_id integer null references projects(id)`
- `candidate_target_id uuid null references intelligence_targets(id)`
- `confidence_score numeric not null`
- `confidence text not null` check: `high`, `medium`, `low`
- `status text not null default 'candidate'` check: `candidate`, `auto_applied`, `approved`, `rejected`, `needs_review`
- `matched_terms text[] not null default '{}'`
- `matched_fields text[] not null default '{}'`
- `reason text not null`
- `evidence jsonb not null default '{}'::jsonb`
- `compiler_version text not null`
- `reviewed_by uuid null references auth.users(id)`
- `reviewed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(source_document_id)`
- `(candidate_project_id, confidence, status)`
- `(candidate_target_id, confidence, status)`
- `(status, created_at)`

### `source_signal_candidates`

Purpose: staging table between raw source and promoted `insight_cards`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `source_document_id text not null references document_metadata(id) on delete cascade`
- `source_chunk_id text null`
- `target_id uuid null references intelligence_targets(id)`
- `project_id integer null references projects(id)`
- `signal_type text not null`
- `title text not null`
- `summary text not null`
- `why_it_matters text`
- `current_status text not null default 'open'`
- `confidence_score numeric not null`
- `confidence text not null` check: `high`, `medium`, `low`
- `status text not null default 'candidate'` check: `candidate`, `promoted`, `needs_review`, `rejected`, `duplicate`, `skipped`
- `suggested_owner_person_id uuid null references people(id)`
- `suggested_owner_label text`
- `next_action text`
- `stale_after timestamptz`
- `source_occurred_at timestamptz`
- `excerpt text`
- `normalized_signal_key text not null`
- `promoted_insight_card_id uuid null references insight_cards(id)`
- `extraction_json jsonb not null default '{}'::jsonb`
- `compiler_version text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(source_document_id)`
- `(target_id, signal_type, status)`
- `(project_id, signal_type, status)`
- `(normalized_signal_key, target_id)`
- `(status, created_at)`

### `packet_refresh_jobs`

Purpose: dedupe and audit packet regeneration.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `target_id uuid not null references intelligence_targets(id) on delete cascade`
- `reason text not null`
- `trigger_source_document_id text null references document_metadata(id) on delete set null`
- `trigger_insight_card_id uuid null references insight_cards(id) on delete set null`
- `status text not null default 'queued'` check: `queued`, `running`, `succeeded`, `failed`, `skipped`
- `priority integer not null default 0`
- `compiler_version text not null`
- `attempt_count integer not null default 0`
- `last_error text`
- `output_packet_id uuid null references intelligence_packets(id) on delete set null`
- `queued_at timestamptz not null default now()`
- `started_at timestamptz`
- `finished_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(status, priority desc, queued_at)`
- `(target_id, status)`
- unique partial on `(target_id, compiler_version)` where `status in ('queued','running')`

## Confidence Thresholds

### Attribution

High confidence, auto-apply:

- explicit project ID already present, or
- project number match plus project name/alias/client match, or
- project name/alias match plus participant/team membership match

Suggested numeric threshold: `>= 0.85`

Medium confidence, review:

- project name/alias match only
- participant/team match plus weak title/content match
- channel/path match but source text is generic

Suggested numeric threshold: `0.60 - 0.84`

Low confidence, candidate only:

- fuzzy name only
- generic location/client text
- source mentions several projects equally

Suggested numeric threshold: `< 0.60`

### Signal Extraction

High confidence:

- explicit decision/risk/task language
- clear owner/date/action/amount or schedule impact
- source excerpt supports the claim directly

Medium confidence:

- implied concern or commitment
- missing owner or date
- source supports claim, but wording is ambiguous

Low confidence:

- weak sentiment only
- no clear project consequence
- model inference not directly supported by source excerpt

## Packet Structure

Keep using `intelligence_packets.packet_json`, but standardize its shape:

```json
{
  "current_status": {
    "summary": "",
    "confidence": "high|medium|low",
    "evidence_card_ids": []
  },
  "recent_changes": [],
  "open_risks": [],
  "financial_signals": [],
  "schedule_signals": [],
  "decisions_needed": [],
  "commitments_and_owners": [],
  "source_coverage": {
    "covered_start_at": "",
    "covered_end_at": "",
    "meetings": {"status": "", "count": 0, "latest_at": null},
    "teams": {"status": "", "count": 0, "latest_at": null},
    "emails": {"status": "", "count": 0, "latest_at": null},
    "documents": {"status": "", "count": 0, "latest_at": null},
    "structured_project_controls": {"status": "", "count": 0, "latest_at": null}
  },
  "confidence_summary": {
    "overall": "high|medium|low",
    "reason": "",
    "weakest_source": "",
    "stale_sources": []
  }
}
```

## Assistant Routing Contract

### Source Lookup Path

Use when the user asks:

- "show me the Teams message"
- "what did Brandon say"
- "find the email"
- "what source says that"
- "quote the transcript"

Primary data:

- source-specific RAG
- exact `document_metadata` / `document_chunks`
- source date window if user asks current/recent

Do not lead with packet summary.

### Strategic Advisor Path

Use when the user asks:

- "what's going on"
- "what should I worry about"
- "catch me up"
- "where is the confusion"
- "what is the project status"
- "what should we do next"

Primary data:

- current `intelligence_packets`
- active `insight_cards`
- packet source coverage
- structured project tools
- raw RAG only for evidence/support/gaps

Do not answer strategically from raw semantic search alone unless the packet is missing and the answer explicitly says it is using fallback retrieval.

## Minimal Implementation Order

### Slice 1 - Migration

Create:

- `source_intelligence_jobs`
- `document_attribution_candidates`
- `source_signal_candidates`
- `packet_refresh_jobs`

Add RLS:

- service role writes
- admins read all
- project members read rows tied to their client project targets

### Slice 2 - Compiler Service

Add backend service:

- `backend/src/services/intelligence/compiler.py`

Functions:

- `enqueue_source_intelligence_job(document_id)`
- `score_project_attribution(document_id)`
- `extract_source_signals(document_id, target_id)`
- `promote_signal_candidate(candidate_id)`
- `enqueue_packet_refresh(target_id, reason)`
- `refresh_current_packet(target_id)`

### Slice 3 - Route / Cron Entry Points

Add API or backend job entry:

- process queued source jobs
- process queued packet refreshes
- retry failed jobs with bounded attempts

### Slice 4 - Assistant Contract

Add frontend/lib contract:

- `frontend/src/lib/ai/assistant-retrieval-contract.ts`

It should return:

- intent
- response mode
- required source families
- packet policy
- freshness window
- fallback policy
- source coverage requirements

### Slice 5 - Eval Gates

Update evals so green means:

- packet-first strategic prompts used packet or explicitly reported missing packet
- source lookup prompts used source-specific retrieval
- stale evidence does not lead a current answer
- no-tool retry fails tool-required cases unless server evidence packet exists

## Key Guardrails

- Do not create a durable card for every source item.
- Do not update a packet from low-confidence attribution.
- Do not let broad semantic search override a recent source window.
- Do not hide blocked admin-only Teams/email access.
- Do not let the packet become source-less summary. Every packet claim needs card/evidence lineage.
- Do not treat eval pass as success if tool loop failed and recovered invisibly.

## Success Definition

The system is working when:

1. A new relevant Teams/email/meeting/document row can be traced through job, attribution, extraction, card, evidence, packet refresh, and assistant answer.
2. Project attribution is explicit and reviewable.
3. The assistant distinguishes source lookup from strategic advice.
4. The packet can answer "what's going on?" without scanning the whole RAG corpus every time.
5. The assistant can still fetch exact quotes/sources on demand.
6. Every current answer knows its source freshness and confidence.

