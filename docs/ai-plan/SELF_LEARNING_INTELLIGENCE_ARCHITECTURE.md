# Alleato Self-Learning Intelligence Architecture

Last updated: 2026-05-07

## Purpose

Alleato should not try to make the model train itself. The durable product value is a feedback system that makes retrieval, project attribution, packet quality, tool decisions, task generation, and user-specific behavior improve over time.

The architecture is:

```text
Raw source
-> project/source attribution
-> structured signal extraction
-> packet/card compilation
-> assistant/tool response
-> user action, correction, rejection, or outcome
-> feedback event
-> promotion review
-> active memory, retrieval weight, prompt constraint, or workflow rule
```

The learning system must keep four layers separate:

| Layer | Purpose | Primary storage |
|---|---|---|
| Source truth | Raw evidence and retrievable text | `document_metadata`, `document_chunks`, source-specific tables |
| Project intelligence | Current interpreted project state | `intelligence_targets`, `insight_cards`, `intelligence_packets` |
| Feedback and outcomes | What users accepted, changed, rejected, or completed | existing feedback tables plus new unified feedback events |
| Promoted learning | Reusable constraints, preferences, examples, and ranking rules | `agent_learnings`, `ai_memories`, new promotion records |

Do not collapse these into one embeddings table. Vectors are recall infrastructure, not the source of truth.

## Current Tables To Build On

### Raw Knowledge And Retrieval

| Table | Current role | Self-learning role |
|---|---|---|
| `document_metadata` | Source-level records for meetings, emails, Teams, SharePoint/OneDrive files, uploads, and summaries. Includes `project_id`, `source_system`, `source_metadata`, source IDs, title, summary, raw text, participants, and timestamps. | The attribution target and source identity ledger. Feedback should improve `project_id`, source classification, source importance, and source trust. |
| `document_chunks` | Chunked/vectorized text with `chunk_id`, `document_id`, `source_type`, `metadata`, `content_hash`, and `embedding`. | Retrieval scoring should record which chunks were used, ignored, cited, or corrected. |
| `document_rows` | Structured rows tied to a document dataset. | Useful for spreadsheet/table evidence and future extraction quality checks. |
| `project_emails` | Project-linked email records. | Outcome feedback should improve email-to-project linking and attachment handling. |
| `team_chat_messages` / Teams rows represented through `document_metadata` | Raw communications source. | Should be grouped into conversation/day/thread documents, then attributed and scored. |

### Packet-First Project Intelligence

| Table | Current role | Self-learning role |
|---|---|---|
| `intelligence_targets` | Durable target for project/client/internal intelligence. | Learning scope anchor. Most feedback should resolve to a target, not only a chat session. |
| `insight_cards` | Current project signals: risk, blocker, decision, task, project update, financial exposure, schedule risk, etc. | Learn which cards were accepted, ignored, resolved, contradicted, or converted into actions. |
| `insight_card_evidence` | Evidence excerpts and source links for cards. | Track evidence quality and whether evidence was useful enough to cite again. |
| `insight_card_targets` | Attribution between cards and targets. | Reviewable attribution improvement loop. |
| `intelligence_packets` | Current executive/advisor packet with source coverage, confidence summary, next moves, and packet JSON. | Track whether packet sections were useful, stale, missing, or corrected. |
| `intelligence_packet_cards` | Packet-to-card inclusion and ranking. | Learn which card types and ordering are valuable for different project situations. |
| `intelligence_reviews` | Review queue for packet/card/evidence issues. | Human-in-the-loop gate before risky learnings become durable behavior. |

### Compiler And Attribution Ledgers

These tables already exist in the generated Supabase types and should be treated as first-class infrastructure, not future-only ideas:

| Table | Role |
|---|---|
| `document_attribution_candidates` | Reviewable candidate project/target matches for source documents. |
| `source_intelligence_jobs` | Durable compiler job ledger for attribution, signal extraction, card upsert, and packet refresh. |
| `source_signal_candidates` | Staging records for extracted signals before promotion to `insight_cards`. |
| `packet_refresh_jobs` | Dedupe and audit queue for packet regeneration. |

### Existing Feedback And Memory

| Table | Current role | Self-learning role |
|---|---|---|
| `ai_task_feedback` | Captures task thumbs-up/down with task snapshot, reason, reason category, project, session, task IDs, generated task ID, promoted flag, and optional `learning_id`. | First concrete behavior-learning loop for generated tasks. |
| `ai_review_feedback` | Captures human corrections for AI document/review findings with AI status, corrected status/reason, confidence, source-of-truth ref, and project. | Source-of-truth correction loop for document intelligence. |
| `chat_thread_feedback` | Thread-level thumbs/feedback with item IDs and metadata. | Lightweight chat outcome signal. Needs normalization into a unified event stream. |
| `admin_feedback_items` / `admin_feedback_comments` | App feedback, bug reports, annotation inbox, and triage. | Verified failures can become `agent_learnings` when they describe repeatable AI/tool behavior. |
| `agent_learnings` | Active/candidate prevention prompts from thumbs-down, admin feedback, and eval failures. Includes scope tags, tool/project scope, confidence, occurrence count, evidence, and embeddings. | Behavioral guardrail memory. Use for "do not repeat this failure" instructions. |
| `agent_learning_usages` | Tracks when a learning was injected and later outcome. | Essential for pruning bad learnings and proving whether a learning helped. |
| `ai_memories` | Durable semantic memories with visibility, type, confidence, importance, project/meeting links, and search RPCs. | Personal/team facts, preferences, commitments, and lessons. Must not replace source truth. |
| `chat_history` | Persisted assistant/user messages and metadata. | Session evidence and post-response extraction source, but not the final learning store. |

## Additive Tables To Build First

The current tables are close, but feedback is fragmented. Add a thin normalized event layer instead of replacing existing feedback tables.

### `ai_feedback_events`

Purpose: one append-only event stream for every user/system learning signal. Existing feedback tables stay intact; this table points at them and normalizes cross-surface analysis.

Required columns:

```sql
create table public.ai_feedback_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  project_id integer null references public.projects(id) on delete set null,
  target_id uuid null references public.intelligence_targets(id) on delete set null,
  session_id uuid null,
  source_table text null,
  source_record_id text null,
  event_type text not null,
  event_family text not null,
  surface text not null,
  subject_type text not null,
  subject_id text null,
  signal text not null,
  reason_category text null,
  free_text text null,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  source_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);
```

Allowed `event_family` values:

- `retrieval`
- `attribution`
- `assistant_response`
- `tool_action`
- `task_generation`
- `packet_quality`
- `document_review`
- `user_preference`
- `workflow_outcome`
- `eval_failure`

Allowed `signal` values:

- `positive`
- `negative`
- `corrected`
- `accepted`
- `ignored`
- `completed`
- `failed`
- `needs_review`
- `stale`
- `conflicting`

Indexes:

- `(project_id, event_family, created_at desc)`
- `(target_id, event_family, created_at desc)`
- `(subject_type, subject_id, created_at desc)`
- `(source_table, source_record_id)`
- `(event_type, signal, created_at desc)`

RLS:

- service role writes all events
- users can insert events for their own interactions
- admins can read all
- project members can read project-scoped non-private events
- private preference/memory events require user ownership or admin access

### `ai_learning_promotions`

Purpose: explicit review and promotion ledger. No feedback event should automatically become long-term behavior unless it passes a promotion rule.

Required columns:

```sql
create table public.ai_learning_promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  status text not null default 'candidate',
  promotion_type text not null,
  project_id integer null references public.projects(id) on delete set null,
  target_id uuid null references public.intelligence_targets(id) on delete set null,
  source_event_ids uuid[] not null default '{}',
  destination_table text null,
  destination_record_id text null,
  confidence numeric not null default 0.5,
  risk_level text not null default 'low',
  proposed_learning jsonb not null,
  review_notes text null,
  expires_at timestamptz null,
  superseded_by uuid null references public.ai_learning_promotions(id)
);
```

Allowed `promotion_type` values:

- `agent_prevention_prompt`
- `positive_task_example`
- `user_preference`
- `project_lesson`
- `retrieval_weight`
- `attribution_rule`
- `packet_rule`
- `workflow_rule`

Promotion destinations:

- `agent_learnings` for prevention prompts and repeated failure patterns
- `ai_memories` for user/team facts, preferences, lessons, and commitments
- `ai_task_feedback.promoted = true` for approved positive task examples
- `document_attribution_candidates.status = approved|rejected` for project-linking corrections
- `insight_cards` / `insight_card_evidence` for packet-quality corrections
- future retrieval scoring table for source/chunk ranking rules

### `ai_retrieval_feedback`

Purpose: retrieval-specific learning that is too granular for `agent_learnings`.

Required columns:

```sql
create table public.ai_retrieval_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  project_id integer null references public.projects(id) on delete set null,
  target_id uuid null references public.intelligence_targets(id) on delete set null,
  session_id uuid null,
  tool_name text not null,
  query_text text not null,
  source_document_id text null references public.document_metadata(id) on delete set null,
  source_chunk_id text null,
  rank integer null,
  score numeric null,
  cited boolean not null default false,
  user_referenced boolean not null default false,
  used_in_answer boolean not null default false,
  outcome text not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb
);
```

Allowed `outcome` values:

- `helpful`
- `unhelpful`
- `wrong_project`
- `stale`
- `unsupported`
- `unknown`

## Ingestion Flows

### Flow 1: Microsoft Graph Teams/Outlook/SharePoint

1. Backend Graph service ingests messages/files/attachments.
2. Source row lands in `document_metadata` with source IDs, source URL/path, title/subject, participants, source timestamps, `source_system`, `source_metadata`, and `raw_text` or summary.
3. Text is chunked into `document_chunks` when it has durable retrieval value.
4. Project attribution runs:
   - explicit project ID or existing mapping
   - project number/name/alias/client/address
   - participants tied to project team
   - thread/channel/path/title context
5. Write or update `document_attribution_candidates`.
6. High-confidence attribution updates `document_metadata.project_id`.
7. Medium/low-confidence attribution creates `ai_feedback_events` with `event_family = attribution` and `signal = needs_review`.
8. `source_intelligence_jobs` queues signal extraction.
9. Extracted signals land in `source_signal_candidates`.
10. High-confidence signals promote to `insight_cards` and `insight_card_evidence`.
11. Packet refresh is queued through `packet_refresh_jobs`.

### Flow 2: Fireflies Meetings

1. Transcript/summary lands in `document_metadata`.
2. Transcript content chunks into `document_chunks` with meeting metadata.
3. Meeting participants and title are used for project attribution.
4. Extract decisions, commitments, open questions, schedule risk, financial exposure, and owner/action signals.
5. Promote supported items to cards only when an evidence excerpt exists.
6. If user later corrects a meeting summary or rejects a meeting-derived card, write:
   - `ai_feedback_events.event_family = packet_quality` or `document_review`
   - `ai_retrieval_feedback.outcome = unhelpful|unsupported` for the cited chunks
   - `ai_learning_promotions` candidate if repeated or high-impact

### Flow 3: User Chat / AI Assistant

1. User message enters `frontend/src/app/api/ai-assistant/chat/route.ts`.
2. Intent chooses packet-first advisor path, source lookup path, action/tool path, or memory path.
3. Assistant metadata records tool trace, retrieved sources, response quality, data parts/widgets, and selected learnings.
4. Post-response jobs run:
   - conversation summary/memory extraction
   - agent learning usage recording
   - retrieval trace recording
5. User feedback, edit, regeneration, copied answer, accepted widget, or ignored action writes `ai_feedback_events`.
6. Negative/repeated failures become `ai_learning_promotions` candidates.
7. Approved promotions write to `agent_learnings`, `ai_memories`, or a domain table.

### Flow 4: Task Generation

1. Assistant proposes or creates a task through action tools.
2. Task snapshot is captured in `ai_task_feedback` when user rates it.
3. `good` feedback can become a promoted positive example after review.
4. `bad` feedback creates or updates an `agent_learnings` candidate with a prevention prompt.
5. Future task creation pulls:
   - promoted positive examples
   - active agent learnings scoped to task/tool/project
   - current project packet and source evidence

### Flow 5: Packet And Project Intelligence Pages

1. User views a packet, opens an insight card, expands evidence, follows source links, or marks a card wrong/stale/useful.
2. Each meaningful interaction writes `ai_feedback_events`.
3. Card corrections update `intelligence_reviews`.
4. Approved corrections update `insight_cards`, `insight_card_evidence`, or attribution candidates.
5. Packet refresh job regenerates the target packet and records why.

## Feedback Events To Capture First

### Must Capture In Slice 1

| Event | Surface | Event family | Signal | Destination |
|---|---|---|---|---|
| Assistant thumbs up/down | AI assistant | `assistant_response` | `positive` / `negative` | `ai_feedback_events`, `agent_learning_usages`, possible `agent_learnings` |
| Task thumbs up/down with reason | Tasks / assistant widget | `task_generation` | `positive` / `negative` | `ai_task_feedback`, `ai_feedback_events` |
| Project attribution correction | Admin review / source review | `attribution` | `corrected` | `document_attribution_candidates`, `ai_feedback_events` |
| Packet card marked wrong/stale/useful | Project Intelligence | `packet_quality` | `positive` / `negative` / `stale` | `intelligence_reviews`, `ai_feedback_events` |
| Source/chunk cited in final answer | AI assistant | `retrieval` | `accepted` | `ai_retrieval_feedback` |
| Source/chunk behind rejected answer | AI assistant | `retrieval` | `negative` | `ai_retrieval_feedback` |
| User edited generated owner update/email/summary | Assistant widgets | `assistant_response` | `corrected` | `ai_feedback_events`, promotion candidate |
| Tool action accepted/cancelled/completed | Assistant action preview | `tool_action` | `accepted` / `ignored` / `completed` / `failed` | `ai_feedback_events` |

### Should Capture In Slice 2

| Event | Why |
|---|---|
| User copies assistant output | Stronger than thumbs-up for writing workflows. |
| User regenerates response | Indicates answer quality or format miss. |
| User opens evidence then still downvotes | Indicates retrieval looked plausible but did not answer the real question. |
| Generated task due date/assignee changed | Better task-learning signal than rating alone. |
| AI-created action resolved in workflow | Real outcome tracking. |
| Card ignored across multiple packet refreshes | Ranking or relevance feedback. |
| Repeated source mismatch by project | Attribution rule candidate. |

## Promotion Rules

### General Rule

Feedback is evidence, not learning. A feedback event becomes durable behavior only after one of these promotion paths:

1. Human review approves it.
2. The same failure repeats at least twice with similar signatures.
3. A high-confidence workflow outcome proves it worked.
4. A deterministic eval fails and maps to a clear prevention rule.

### Promote To `agent_learnings`

Use for repeatable AI behavior failures.

Promote when:

- thumbs-down or admin feedback identifies a concrete failure pattern
- event includes tool trace, response excerpt, and prevention prompt
- either reviewed by admin or repeated at least twice
- prevention prompt is actionable

Do not promote when:

- feedback is only mood or preference without example
- root cause is missing data ingestion, not assistant behavior
- the fix belongs in schema/API/frontend code instead of prompt constraints

Required fields:

- `title`
- `source`
- `status`
- `problem_signature`
- `symptoms`
- `root_cause` when known
- `fix_pattern` when known
- `prevention_prompt`
- `scope_tags`
- `project_id` or `tool_id` when scoped
- `evidence`

### Promote To `ai_memories`

Use for stable facts, preferences, lessons, commitments, and context.

Promote when:

- memory is useful across future sessions
- source is user-stated, repeated, or linked to source evidence
- confidence is at least 0.7 for team-visible memory
- visibility is correct: private, team, or project

Do not promote:

- transient requests
- guesses from weak retrieval
- private user preference as team memory
- source facts that belong only in `document_metadata` or project records

### Promote Positive Task Examples

Use `ai_task_feedback.promoted = true` only when:

- task was rated good
- task snapshot is complete enough to reuse
- task was not a duplicate/noise task
- task either got completed or was admin-approved

Inject no more than 3 positive examples into task generation to avoid overfitting.

### Promote Retrieval Weight

Use retrieval feedback to adjust ranking only after aggregation.

Promote when:

- same source/chunk is helpful across multiple answers
- source is cited and user does not reject answer
- source recency and project attribution are valid

Down-rank when:

- wrong project
- stale source
- source cited in rejected answer
- chunk has weak excerpt alignment

Never hide a source solely because one answer failed. Store the signal and let ranking/evals decide.

### Promote Attribution Rules

Promote project-linking rules when:

- correction maps a source to a project with clear evidence
- same alias/path/participant pattern recurs
- no competing project has similar confidence

Do not globally lower confidence thresholds to increase coverage. Add explicit aliases, participant mappings, path rules, or review queues.

### Promote Packet Rules

Promote packet behavior when:

- user repeatedly marks a card type as useful/stale/wrong
- owner-facing summaries are edited in a consistent way
- packet misses a source family with available data

Examples:

- "For owner updates, put financial exposure before schedule commentary."
- "Do not show Teams-only risk as high confidence unless it has a confirming source."
- "Stale cards older than 14 days without new evidence should move below active blockers."

## Fail-Loud Rules

Every learning path must fail loudly.

| Failure | Cause | Detection | Prevention |
|---|---|---|---|
| Feedback write fails | API/schema/RLS issue | Return explicit API error and log table/message | `withApiGuardrails`, route tests, RLS smoke |
| Memory extraction fails | model/provider/Supabase error | Background job logs and `ai_feedback_events` error event | retries with bounded attempts, no silent catch |
| Retrieval trace missing | assistant metadata not persisted | eval checks for tool trace and source IDs | central trace writer |
| Promotion creates bad learning | no review/repetition gate | promotion status stays `candidate` until approved | required `ai_learning_promotions` record |
| Project attribution wrong | fuzzy match over-applied | attribution correction event and candidate review | confidence thresholds, never blanket auto-apply |
| Packet answer ignores packet | route intent fallback | assistant eval for project briefing/source lookup split | packet-first contract test |
| User correction lost | generated output edit not captured | UI/API test for before/after snapshots | unified `ai_feedback_events` writer |

## Verification Gates To Build First

### Gate 1: Schema And RLS

Commands:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
npm run db:migrations:verify-applied -- supabase/migrations/<new_feedback_migration>.sql
```

Checks:

- `ai_feedback_events`, `ai_learning_promotions`, and `ai_retrieval_feedback` exist in generated types.
- FK types match actual tables: `projects.id` is integer, `document_metadata.id` is text, `document_chunks.chunk_id` is text, packet/card IDs are uuid.
- anon/authenticated cannot read private feedback from other users.
- service role can insert events and promotions.

### Gate 2: Feedback Event Writer

Targeted tests:

- assistant thumbs down writes `chat_thread_feedback` if existing path still uses it and always writes `ai_feedback_events`
- task feedback writes `ai_task_feedback` and normalized event
- packet/card feedback writes `intelligence_reviews` and normalized event
- all failures return generic-free error messages with table and cause

### Gate 3: Retrieval Trace

Eval requirements:

- every source lookup answer records searched tool name, query, source document IDs, chunk IDs, rank, cited flag, and answer usage
- downvoted source-grounded answers mark involved chunks as `unknown` or `unhelpful`, not immediately bad forever
- source lookup questions do not answer from packet summary alone

### Gate 4: Promotion Queue

Tests:

- one-off thumbs-down creates candidate only
- repeated similar thumbs-down promotes candidate to `agent_learnings.status = active` only when rule threshold is met
- approved positive task feedback becomes a future few-shot example
- rejected promotion is not injected into prompts
- expired/superseded promotions are ignored

### Gate 5: Packet Improvement Loop

Eval requirements:

- correcting a card creates a review item and feedback event
- approving correction updates card/evidence and enqueues packet refresh
- refreshed packet includes changed card ranking/status
- stale/missing source coverage is visible in packet JSON

### Gate 6: Assistant Prompt Injection Safety

Checks:

- `agent_learnings` context is scoped by project/tool/tags
- private `ai_memories` are only injected for the owning user
- team memories are not created from low-confidence private preferences
- max learning context stays bounded
- injected learning usage is recorded in `agent_learning_usages`

## First Implementation Order

## Implemented Lifecycle: Retrieval Learning

The first complete self-learning loop is now the retrieval learning loop. It is intentionally narrow: it learns source/chunk ranking preferences from observed retrieval outcomes, routes them through admin review, and applies bounded ranking hints only after approval.

### Implemented Tables

| Table | Implemented role |
|---|---|
| `ai_feedback_events` | Append-only normalized audit stream for assistant feedback, task feedback, promotion review, retrieval weight application, and retrieval weight controls. |
| `ai_retrieval_feedback` | Source/chunk-level retrieval traces from assistant tool output, including query text, rank, score, citation/use flags, and outcome. |
| `ai_learning_promotions` | Candidate/approved/rejected/applied/superseded review ledger for learnings before they affect behavior. |
| `ai_retrieval_weights` | Active/paused/superseded retrieval ranking hints created only from approved retrieval-weight promotions. |

### Implemented Services And Routes

| Surface | Path | Role |
|---|---|---|
| Shared feedback service | `frontend/src/lib/ai/services/feedback-event-service.ts` | Writes normalized feedback events, retrieval feedback, promotion candidates, retrieval weights, impact previews, and lifecycle audit events. |
| Scoring helper | `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts` | Pure scoring helpers for query signatures and bounded retrieval-weight multipliers. |
| AI assistant feedback | `frontend/src/app/api/ai-assistant/feedback/route.ts` | Normalizes assistant feedback into `ai_feedback_events`. |
| AI assistant chat | `frontend/src/app/api/ai-assistant/chat/route.ts` | Persists retrieval feedback from tool traces before assistant message storage. |
| Promotion review API | `frontend/src/app/api/admin/ai-learning-promotions/route.ts` | Loads promotions, approves/rejects candidates, applies approved retrieval weights, and pauses/resumes/supersedes applied weights. |
| Candidate generator | `frontend/src/app/api/admin/ai-learning-promotions/run/route.ts` | Scans recent `ai_retrieval_feedback` and creates retrieval-weight promotion candidates. |
| Impact preview | `frontend/src/app/api/admin/ai-learning-promotions/preview/route.ts` | Estimates before/after ranking impact for a retrieval-weight promotion using stored retrieval feedback. |
| Activity feed | `frontend/src/app/api/admin/ai-learning-promotions/activity/route.ts` | Returns normalized learning-control and review audit events. |
| Metrics endpoint | `frontend/src/app/api/admin/ai-learning-promotions/stats/route.ts` | Counts promotion status, retrieval-weight status, and learning activity events. |
| Admin UI | `frontend/src/app/(admin)/ai-learning-promotions/*` | Review queue, metrics strip, impact preview, lifecycle controls, and activity feed. |

### Implemented Review Flow

```text
assistant semantic search
-> tool trace captures source document/chunk IDs
-> chat persistence writes ai_retrieval_feedback
-> admin runs promotion scan
-> generator groups repeated helpful/problem signals by tool, project, source, and query signature
-> candidate is written to ai_learning_promotions
-> admin approves or rejects candidate
-> approved retrieval_weight can be previewed
-> admin applies promotion
-> ai_retrieval_weights row becomes active
-> semanticSearch multiplies matching candidate scores with a bounded 0.65x-1.5x multiplier
-> admin can pause, resume, or supersede the weight
-> every review/control action writes ai_feedback_events
```

### Promotion Rules Now Enforced

- No retrieval ranking hint is active until an admin approves and applies it.
- Retrieval-weight candidates are generated only from repeated grouped signals.
- Boosts require repeated helpful/cited/used retrieval signals without problem signals.
- Down-rank review candidates require repeated unhelpful, wrong-project, stale, or unsupported outcomes.
- Multipliers are bounded between `0.65` and `1.5` so learning cannot dominate semantic similarity.
- Paused and superseded weights are not consumed by semantic search.
- Review, apply, pause, resume, and supersede actions are audit events in `ai_feedback_events`.

### Admin Surface

The dedicated review surface is `/ai-learning-promotions`.

It includes:

- status tabs for candidate, approved, applied, rejected, and superseded promotions
- metrics for candidate, approved, applied, active weights, paused weights, superseded promotions, and audit activity
- Generate action for candidate scans
- approve/reject controls for candidates
- impact preview for retrieval-weight promotions
- apply controls for approved retrieval-weight promotions
- pause/resume/supersede controls for applied retrieval weights
- activity feed sourced from `ai_feedback_events`

### Verification Coverage

Current focused verification for this loop:

- `npm run check:routes`
- focused ESLint over the self-learning API/UI/service files
- focused TypeScript filter over touched self-learning files
- `npm run test:unit -- --runTestsByPath src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts --runInBand`

Current test guardrail:

- query signature normalization
- source/chunk weight matching
- bounded multiplier behavior

### Remaining Gaps

- No browser-level smoke test yet for generate -> approve -> preview -> apply -> pause/resume.
- Impact preview is based on stored retrieval feedback, not a live semantic-search replay.
- Destination writers for `agent_learnings`, `ai_memories`, positive task examples, and attribution rules remain future slices.
- Packet/card feedback has not yet been wired into the normalized event and promotion system.

### Slice 1: Unified Feedback Events

Build:

- migration for `ai_feedback_events`, `ai_learning_promotions`, `ai_retrieval_feedback`
- shared service: `frontend/src/lib/ai/services/feedback-event-service.ts`
- API route helper for authenticated user feedback events
- tests for task feedback, assistant feedback, packet feedback

Definition of done:

- every new feedback path writes one normalized event
- failures return explicit errors
- generated Supabase types are updated
- migration is applied and ledger-verified

### Slice 2: Retrieval Trace And Scoring

Build:

- central retrieval trace writer
- record source/chunk usage from AI assistant tool metadata
- connect downvotes and accepted answers to retrieval outcomes
- add source lookup eval cases for Teams, email, meetings, and documents

Definition of done:

- source lookup answer has trace rows
- rejected answer links back to retrieved chunks
- no source is permanently down-ranked from one event

### Slice 3: Promotion Review

Build:

- promotion candidate generator from feedback events
- admin review page or integration into existing AI/admin review surface
- approve/reject actions
- destination writers for `agent_learnings`, `ai_memories`, `ai_task_feedback.promoted`, attribution candidates

Definition of done:

- no automatic long-term learning without rule/review evidence
- active learnings have source event IDs
- rejected candidates are never injected

### Slice 4: Task Learning Loop

Build on the existing task-training plan:

- thumbs up/down plus optional reason
- positive few-shot injection for approved task examples
- prevention prompt injection for bad-task patterns
- outcome tracking when generated task is completed, reassigned, deleted, or ignored

Definition of done:

- generated task quality improves through examples and prevention prompts
- task feedback is project-scoped
- task-learning eval covers good, bad, duplicate, vague, and wrong-owner tasks

### Slice 5: Packet Feedback Loop

Build:

- card useful/wrong/stale controls on Project Intelligence
- card correction flow into `intelligence_reviews`
- packet refresh after approved review
- packet-quality eval

Definition of done:

- project packet changes after approved correction
- source coverage gaps remain visible
- packet answer uses current packet before raw RAG for strategic questions

## Product Behavior Rules

- Feedback capture must be available in normal product surfaces, not only chat.
- The assistant must say when it is using memory versus source truth.
- Human-approved project facts should become project intelligence, not private memory.
- Personal preferences should not change team-visible outputs unless explicitly promoted.
- Financial, legal, contractual, and client-facing outputs require evidence and review before learning changes behavior.
- The system should prefer a missing-data warning over confident unsupported advice.

## Open Questions

1. Which admin surface should own promotion review: existing feedback inbox, Project Intelligence review queue, or a dedicated AI Training page?
2. Should `ai_feedback_events.session_id` use `chat_history.session_id` UUID only, or support text session IDs from older paths?
3. Which events should be visible to non-admin project members?
4. What is the first owner-facing output to learn from edits: Project Status Report, owner update email, or packet executive summary?
5. How long should low-confidence attribution candidates stay active before archiving?

## Recommended First Build

Start with the smallest complete loop:

1. Add `ai_feedback_events` and write to it from task feedback and assistant thumbs.
2. Add `ai_retrieval_feedback` and record source/chunk usage for source lookup answers.
3. Add `ai_learning_promotions` and promote only reviewed/repeated failures into `agent_learnings`.
4. Extend task generation to use approved positive examples and active prevention prompts.
5. Add packet card feedback after the event and promotion infrastructure is proven.

This gives Alleato a measurable self-learning system without pretending the model is retraining itself.
