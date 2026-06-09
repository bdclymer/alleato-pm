# Teams Thread-First Intelligence Implementation Plan

## Goal

Make Teams conversations easier to read and materially better for RAG, task extraction, project intelligence, progress reports, and executive briefing by treating a compiled conversation thread as the primary intelligence unit while preserving raw messages as source-of-truth evidence.

## Executive Summary

Recommended architecture:

1. Keep raw Teams messages and raw DM exports unchanged.
2. Make canonical Teams thread/conversation artifacts the primary retrieval and intelligence unit.
3. Continue using deterministic code for grouping, canonicalization, ordering, and stable thread identity.
4. Use a stronger model only after grouping for high-value enrichment:
   - thread overview
   - tasks
   - risks
   - decisions
   - frustration / sentiment / process breakdown
   - strategic signals for project intelligence and executive briefing
5. Reuse the existing project attribution system and low-confidence review path instead of creating a parallel project-linking flow.

This preserves performance and traceability while improving readability and downstream signal quality.

## Current State Audit

### 1. Teams DM conversations already exist as compiled conversation documents

- `backend/src/services/integrations/microsoft_graph/teams.py`
  - DM exports are written as:
    - `category = "teams_message"`
    - `type = "teams_dm_conversation"`
- This is already a canonical conversation-level record, not one row per message.
- The raw conversation text stores ordered message lines in one document blob.

Implication:

- The ingestion side already moved part of the way toward thread-first handling for Teams DMs.
- This is a strong base to keep and extend.

### 2. Teams compiler already enriches canonical DM conversation docs

- `backend/src/services/intelligence/teams_compiler.py`
  - Parses conversation messages out of the canonical DM document
  - Runs project attribution
  - Extracts overview, risks, decisions, tasks, sentiment
  - Writes:
    - `document_metadata` overview/status
    - `tasks`
    - `document_attribution_candidates`
    - `source_signal_candidates`
    - packet refresh / packet compile outputs

Implication:

- The repo already has the correct general pattern:
  - deterministic grouping first
  - AI enrichment second
  - packet-first downstream propagation third

### 3. Email already has the stronger canonical-thread model

- `backend/src/services/intelligence/email_compiler.py`
  - Groups Outlook rows by `conversation_id`
  - Compiles the thread head
  - Marks the rest of the messages compiled against that head

Implication:

- Email is the clearest reference implementation for the Teams target state.
- Teams should converge toward the same canonical-thread retrieval semantics.

### 4. Project attribution already exists and should be reused

- `backend/src/services/integrations/microsoft_graph/project_inference.py`
- `backend/src/services/intelligence/teams_compiler.py`
- `backend/src/services/intelligence/email_compiler.py`

The current system already supports:

- title override / project-name matching
- content-based inference
- confidence thresholds
- review candidates in `document_attribution_candidates`

Actual current review surfaces exist in code:

- `frontend/src/features/assignment-inbox/load-inbox-items.ts`
- `frontend/src/app/api/admin/project-attribution-candidates/route.ts`
- `frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx`

Implication:

- Do not build a new attribution subsystem.
- Reuse existing confidence thresholds, candidate writing, and review actions.

### 5. Task creation is currently duplicated across compilers and scheduled extraction

Compiler-based task writing:

- `backend/src/services/intelligence/teams_compiler.py`
- `backend/src/services/intelligence/email_compiler.py`

Scheduled extraction:

- `backend/src/services/task_extraction.py`

Observed behavior:

- `task_extraction.py` also processes `teams_dm_conversation`, `teams_message`, and `email`
- It dedupes mainly by:
  - `metadata_id`
  - existing task descriptions
  - current-window extraction state

Implication:

- If Teams thread compilation becomes the canonical action-extraction path, task ownership between compiler and scheduled extraction needs to be clarified.
- Otherwise the system risks duplicate or inconsistent task generation logic.

### 6. Project intelligence is already the best downstream insertion point

- `backend/src/services/intelligence/compiler.py`
- `frontend/src/lib/ai/intelligence/packet-service.ts`

The Teams compiler already writes packet-first signal candidates and refreshes packets.

Implication:

- Project intelligence integration is not a greenfield feature.
- The main work is improving the quality and retrieval priority of the Teams source unit feeding packet compilation.

### 7. Executive briefing likely underuses compiled Teams conversation artifacts

- `frontend/src/lib/executive/brandon-daily-update.ts`

Current bias:

- Teams source grouping uses Teams-like source types, but much of the retrieval and metadata logic still conceptually targets `teams_message`.
- Several source-loading paths query `document_metadata` with `category = "teams_message"`.

Important nuance:

- Because DM conversation docs use `category = "teams_message"` and `type = "teams_dm_conversation"`, some current queries already include them.
- But the retrieval semantics are still message-centric rather than explicitly canonical-thread-centric.

Implication:

- Executive briefing should be updated to prefer compiled thread artifacts and their promoted packet signals rather than treating Teams as a flat pile of messages.

### 8. Progress reports do not currently consume project intelligence packets

- `frontend/src/app/api/projects/[projectId]/psr/route.ts`
  - deterministic operational data only
- `frontend/src/lib/progress-reports/report-builder.ts`
  - deterministic draft builder
- `frontend/src/lib/progress-reports/ai-generate.ts`
  - AI rewrite pass based on meetings, emails, photos, RFIs, submittals, change data

Implication:

- Progress reports are not currently packet-first.
- If Teams thread intelligence should influence progress reports, that must be added deliberately.
- This should be additive and bounded, not a replacement for deterministic project status data.

## Problems To Solve

### Problem 1: Retrieval fragmentation

Raw message-level retrieval produces:

- too many tiny vectors
- weak ranking for strategic questions
- duplicate near-identical hits
- poor readability for humans

### Problem 2: Inconsistent canonical unit across sources

- Email has thread-head compilation.
- Teams DMs have conversation docs plus compiler enrichment.
- Teams channel messages still behave more like discrete messages.

### Problem 3: Downstream consumers are not uniformly thread-first

- project intelligence is closest
- executive briefing is mixed
- progress reports are mostly source-row driven
- source-specific retrieval is still document/message oriented

### Problem 4: Task ownership is split

- compiler-generated tasks
- scheduled extraction tasks

This creates risk of:

- duplicates
- different quality bars
- different assignee resolution behavior
- inconsistent provenance

## Target Architecture

### Primary principle

For Teams-related knowledge, the primary unit should be:

- canonical thread / conversation document for retrieval and intelligence

Not:

- individual raw messages as the first-class ranking unit

### Source-of-truth model

Keep all three layers:

1. Raw messages
   - exact evidence
   - traceability
   - citations

2. Canonical thread document
   - stable retrieval unit
   - easier reading
   - better chunking target

3. Enriched thread intelligence
   - overview
   - tasks
   - risks
   - decisions
   - sentiment / frustration / process issues
   - packet signals

### Model policy

Use no model for:

- grouping
- ordering
- thread identity
- dedupe
- metadata rollup

Use a stronger model for:

- summarization
- signal extraction
- sentiment/frustration diagnosis
- task extraction
- strategic synthesis for project intelligence / executive brief

This matches the user goal:

- deterministic structure for optimization/performance
- stronger model only where judgment materially improves results

## Recommended Implementation

### Phase 1: Standardize Teams canonical thread ownership

#### Objective

Make canonical thread documents the explicit first-class contract for Teams retrieval and intelligence.

#### Work

1. Formalize the Teams canonical artifact contract.
   - Primary current artifact: `document_metadata` row with:
     - `category = "teams_message"`
     - `type = "teams_dm_conversation"`
   - Add/confirm explicit metadata fields for:
     - stable conversation id
     - source chat id
     - participant set
     - thread/conversation date range
     - ordered source message ids
     - message count
     - last message at

2. Decide channel strategy.
   - Option A: keep channel messages as message-level rows initially
   - Option B: build a channel-thread canonicalizer similar to DM conversation docs

Recommendation:

- Ship DM-thread-first completion first.
- Add channel-thread canonicalization as Phase 2 if channel message volume is materially valuable.

3. Align Teams semantics with email compiler semantics.
   - Email already has:
     - canonical thread head
     - non-head rows marked compiled to head
   - Teams should expose equivalent retrieval identity even if the storage pattern differs.

#### Acceptance criteria

- Every Teams DM conversation has one stable canonical conversation artifact.
- Canonical artifact contains the metadata needed for retrieval, attribution, and drilldown.
- Raw message fidelity is preserved.

### Phase 2: Make Teams thread artifacts the preferred retrieval unit

#### Objective

Thread-first retrieval for RAG and executive/source lookup.

#### Work

1. Update Teams-specific retrieval paths to prefer canonical conversation docs.
   - `frontend/src/lib/ai/retrieval/source-specific-rag.ts`
   - `frontend/src/lib/executive/brandon-daily-update.ts`
   - `frontend/src/lib/ai/services/project-operating-summary-sources.ts`
   - relevant `project-tools.ts` / `operational.ts` retrieval helpers

2. Add explicit thread-preference logic.
   - Prefer `type = "teams_dm_conversation"` over raw flat Teams message rows when both exist.
   - For strategic queries, load packet evidence first, then canonical thread docs, then raw messages.
   - For exact evidence queries, allow raw-message drilldown after a canonical thread hit is chosen.

3. Adjust chunking/embedding strategy.
   - Keep canonical thread embeddings as the main Teams retrieval layer.
   - Bound chunk size inside large threads rather than embedding one giant mega-thread.
   - Use raw-message embeddings only when needed for exact quote retrieval or highly granular ranking.

#### Acceptance criteria

- Strategic Teams questions return thread/coherent conversation evidence before isolated lines.
- Source citations still point back to exact underlying evidence.
- Retrieval latency stays acceptable or improves due to reduced fragmentation.

### Phase 3: Reuse existing project attribution end-to-end

#### Objective

Ensure thread artifacts are project-linked through the existing attribution path.

#### Work

1. Reuse current attribution cascade.
   - title override
   - `infer_project_id(...)`
   - review candidates

2. Ensure canonical thread artifacts are the attribution target of record.
   - attribution should attach to the thread doc
   - downstream tasks/signals/packet evidence should inherit from that thread doc

3. Normalize review handling.
   - Use existing candidate tables and review routes
   - Remove stale documentation that claims there is no review UI

4. Verify admin and assignment review flows for Teams threads specifically.

#### Acceptance criteria

- High-confidence Teams threads auto-assign to projects.
- Low-confidence threads route to existing review surfaces.
- Downstream packet/task/report consumers read the approved project link from the canonical thread doc.

### Phase 4: Make compiler enrichment the primary Teams intelligence path

#### Objective

Use the stronger model after grouping to extract high-value signals.

#### Work

1. Keep or strengthen the current Teams compiler enrichment pass:
   - overview
   - tasks
   - risks
   - decisions
   - frustration / urgency / process issues
   - strategic read / recommended action

2. Explicitly elevate frustration and sentiment patterns.
   - recurring confusion
   - internal misalignment
   - dropped follow-through
   - vendor/client frustration
   - repeated operational friction

3. Review confidence thresholds.
   - maintain fail-loudly behavior
   - preserve `needs_review` for weak extractions

4. Decide whether the Teams compiler becomes the primary task writer for Teams threads.

Recommendation:

- Yes, make the Teams compiler the primary task writer for `teams_dm_conversation`.
- Narrow the scheduled task extractor so it does not re-extract tasks from already-compiled Teams conversation docs.

#### Acceptance criteria

- Teams thread intelligence quality is materially better than raw-message-only retrieval.
- Sentiment/frustration issues surface into project intelligence when confidence is high.
- Task generation has one clear primary owner for Teams conversations.

### Phase 5: Clean up task-generation ownership

#### Objective

Prevent duplicated or conflicting task creation.

#### Work

1. Define source ownership:
   - `teams_dm_conversation` -> Teams compiler owns task extraction
   - email thread head -> Email compiler owns task extraction
   - meetings -> scheduled task extraction continues
   - channel-message-only rows -> either scheduled extraction or future channel compiler

2. Update `backend/src/services/task_extraction.py`
   - skip sources already owned by a compiler when compiler status is successful
   - preserve fallback behavior for failed/uncompiled sources if needed

3. Standardize provenance metadata.
   - clear `extraction_source`
   - stable prompt version fields
   - source document id / source message ids

#### Acceptance criteria

- One primary writer per source type
- No duplicate task generation for the same conversation
- Task provenance is audit-friendly

### Phase 6: Strengthen packet-first project intelligence

#### Objective

Make Teams thread intelligence reliably affect project intelligence packets.

#### Work

1. Keep current `source_signal_candidates -> promotion -> packet refresh` path.
2. Expand high-value signal coverage for:
   - owner/client tension
   - field coordination breakdown
   - subcontractor follow-through issues
   - financial stress signals
   - repeated internal confusion

3. Ensure signal dedupe works at the thread/signal level so repeated recompile runs do not create noisy duplicate cards.

#### Acceptance criteria

- High-confidence Teams thread signals show up in project intelligence packets with good evidence.
- Packet cards cite the canonical conversation thread and preserve evidence traceability.

### Phase 7: Integrate with executive daily brief

#### Objective

Make the daily brief consume Teams thread intelligence as a first-class signal source.

#### Work

1. Update executive retrieval preference:
   - packet signals first
   - canonical Teams thread artifacts second
   - raw Teams/live Graph fallback third

2. Expand source selection logic to explicitly treat compiled Teams threads as preferred evidence for:
   - confusion
   - frustration
   - accountability gaps
   - waiting-on-someone bottlenecks
   - owner/vendor tension

3. Keep live Graph fallback for freshest uncompiled activity.

#### Acceptance criteria

- Executive brief includes meaningful Teams-derived risk and sentiment signals.
- Fresh live data still works when compiled coverage lags.
- Brief output becomes more coherent than message-level excerpts.

### Phase 8: Integrate with progress reports carefully

#### Objective

Allow progress reports to benefit from Teams thread intelligence without making them soft or overly subjective.

#### Work

1. Keep deterministic report draft generation as the base.
2. Add optional packet/intelligence context into AI enrichment only.
   - good fits:
     - open coordination blockers
     - client-visible risks
     - unresolved waiting items
     - meaningful field communication issues
   - bad fits:
     - speculative internal frustration with no client-facing consequence

3. Add an inclusion rule:
   - only include Teams-derived signals in progress reports when they are:
     - project-attributed
     - high confidence
     - relevant to owner-facing or client-facing weekly status

#### Acceptance criteria

- Progress reports remain grounded and client-safe.
- Teams-derived issues improve report honesty where applicable.
- Deterministic operational sections remain authoritative.

## Recommended Data/Contract Changes

### Minimal schema additions if missing

Prefer metadata-first additions unless query performance requires explicit columns.

Potential additions for canonical thread docs:

- `source_metadata.teams_thread.chat_id`
- `source_metadata.teams_thread.conversation_id`
- `source_metadata.teams_thread.message_ids`
- `source_metadata.teams_thread.message_count`
- `source_metadata.teams_thread.participants`
- `source_metadata.teams_thread.first_message_at`
- `source_metadata.teams_thread.last_message_at`
- `source_metadata.teams_thread.canonical_version`

Potential explicit retrieval hint:

- `source_metadata.teams_thread.is_canonical = true`

Only add physical columns if:

- they are needed for frequent filtering/sorting
- metadata JSON becomes too slow or too ambiguous

## Model Guidance

### Deterministic stages

No model:

- thread grouping
- canonical doc selection
- message ordering
- dedupe
- metadata rollup
- attribution routing into existing system

### Higher-model stages

Use stronger model:

- strategic overview
- risk framing
- frustration/process diagnosis
- owner/accountability signals
- project-intelligence-quality tasks/decisions

Reason:

- this is where model quality actually matters and where cheap-model shortcuts are more likely to miss subtle but valuable operational signals.

## Verification Plan

### Functional verification

1. Canonical Teams DM doc generation
   - DM export writes one stable conversation artifact
   - metadata contains message ids/count/participants/date span

2. Attribution
   - high-confidence auto-assign works
   - low-confidence candidate review works in current UI/API surfaces

3. Task generation
   - Teams compiler writes tasks
   - scheduled extractor skips already-owned Teams thread docs
   - no duplicate tasks

4. Project intelligence
   - Teams compiler writes signal candidates
   - signal promotion refreshes packet
   - packet cards contain Teams thread evidence

5. Executive brief
   - thread-derived signals appear when relevant
   - live Teams fallback still covers very fresh uncompiled messages

6. Progress reports
   - deterministic draft unchanged
   - AI enrichment can use packet/thread context when applicable
   - no speculative or non-client-safe leakage

### Quality verification

Use focused evaluation prompts:

- “What is the biggest source of confusion or frustration across employee Teams discussions?”
- “What are the most important open loops the team is waiting on from others?”
- “What project risk is forming in Teams before it shows up in RFIs/submittals?”
- “Give me the latest operational read for Project X using Teams threads first.”

Expected result:

- coherent thread-based evidence
- fewer fragmented citations
- stronger sentiment and escalation detection

## Rollout Order

Recommended sequence:

1. Teams canonical-thread contract audit + metadata standardization
2. Retrieval preference update for Teams thread artifacts
3. Task ownership cleanup between compiler and scheduled extractor
4. Project intelligence packet quality improvements
5. Executive brief integration
6. Progress report enrichment integration
7. Optional channel-thread canonicalization

## Key Risks

### Risk 1: Duplicate tasks

Cause:

- compiler and scheduled extractor both create tasks for the same Teams source

Prevention:

- explicit source ownership by type

### Risk 2: Over-large threads hurting retrieval

Cause:

- very large conversation docs embedded as single blobs

Prevention:

- bounded subthread chunking inside canonical conversation docs

### Risk 3: Soft or speculative reporting

Cause:

- piping low-confidence internal sentiment directly into client-facing reports

Prevention:

- only allow high-confidence, project-relevant, owner-safe thread signals into progress-report AI enrichment

### Risk 4: Attribution drift

Cause:

- thread-level project inference differs from existing message/project assumptions

Prevention:

- reuse current attribution logic and review surfaces; do not fork the attribution system

## Recommended First Slice

Build this first:

1. Declare `teams_dm_conversation` the canonical Teams DM retrieval unit.
2. Update source-specific Teams retrieval and executive briefing retrieval to prefer those docs.
3. Make Teams compiler the primary task writer for `teams_dm_conversation`.
4. Skip those docs in scheduled task extraction once compiler status is `compiled`.
5. Add verification prompts/tests proving thread-first answers are more coherent than raw-message retrieval.

This delivers the highest value with the lowest architectural risk.

## Definition Of Done

This effort is done when:

1. Teams thread artifacts are the preferred retrieval unit for strategic Teams questions.
2. Project attribution is applied to those thread artifacts through the existing system.
3. Teams compiler outputs reliably feed tasks and project intelligence packets.
4. Executive briefing surfaces thread-derived issues, frustration, and waiting-on signals coherently.
5. Progress reports can optionally use approved high-confidence thread intelligence where relevant.
6. Raw messages remain available for traceability and exact evidence drilldown.
