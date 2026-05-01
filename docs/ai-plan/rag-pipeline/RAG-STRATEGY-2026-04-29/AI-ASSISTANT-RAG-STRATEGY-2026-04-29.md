# AI RAG Strategy - Make Alleato AI Useful

Date: 2026-04-29
Scope: `/ai-assistant`, strategist chat route, RAG ingestion, retrieval, memory, response quality, and verification.

## The Real Problem

The assistant is not failing because the model is incapable. It is failing because the product runtime is forcing a high-intelligence model to work inside a brittle context pipeline.

The current assistant has several good pieces:

- A strong strategist prompt in `frontend/src/lib/ai/agents/strategist.ts`.
- A deterministic project briefing path in `frontend/src/app/api/ai-assistant/chat/route.ts`.
- A broad `semanticSearch` tool in `frontend/src/lib/ai/tools/operational.ts`.
- Source-specific search for meetings, Teams, email, and external documents.
- Memory, response-quality scoring, and verification scripts.

But those pieces are not yet arranged like a strategic advisor. They are arranged like a tool runner with recovery paths.

The result is predictable:

- The assistant often answers from whatever retrieval happened to return, not from a deliberate business reasoning loop.
- It has too many overlapping retrieval surfaces without a single evidence contract.
- Broad questions like "what is going on?" require synthesis, but the runtime often treats them as search-and-summarize.
- The prompt says "be a business partner," but the code frequently bypasses the model for deterministic briefings or disables tools globally.
- The assistant lacks a stable "conversation brain" that remembers the question, knows what kind of answer is needed, gathers evidence, and then argues a point of view.

The fix is not another prompt tweak. The fix is to rebuild the assistant around an explicit advisor loop:

1. Understand the user intent.
2. Build the right evidence packet.
3. Reason over the packet.
4. Respond with a point of view, evidence, recommendation, and next move.
5. Grade the answer and fail loudly when any source layer is thin, stale, or broken.

### 1. What job is the assistant supposed to be doing in that moment?

“Listen to what Megan is really asking, figure out what kind of help she needs, pull the right facts, understand what changed, form an opinion, and talk back like a strategic partner.”

I think there are five very different modes:

1. **Project advisor**
   “What’s going on with Vermillion Rise?”
   It should brief you like a senior PM who knows the job.

2. **Business strategist**
   “What should I be worried about this week?”
   It should look across projects, money, risk, people, pipeline, and operations.

3. **Thought partner**
   “Help me think through whether we should bid this.”
   It should brainstorm tradeoffs, ask sharp questions, and give an opinion.

4. **Company memory**
   “What did Brandon say about billing?”
   It should search meetings, Teams, email, and answer from actual history.

5. **App helper**
   “How do I create a commitment?”
   It should answer from app help/workflow docs, not act like a strategist.

The current assistant seems to blur all five together. That is probably why it feels like it is “running random tools.” It does not have a clean sense of what kind of conversation it is in.

### 2. RAG should not mean “search everything.” It should mean “prepare the assistant properly.”

For example, if you ask, “What’s the latest on this project?” the assistant should prepare a packet like:

- Project facts: budget, contract, change orders, RFIs, submittals, schedule
- Recent movement: meetings, Teams, email, documents
- Risk signals: delays, cost exposure, unhappy client/vendor, missing approvals
- Memory: what we already discussed before
- Gaps: what it could not confirm

Then the model should answer from that packet.

### 3. The assistant needs to form a point of view.

A bad answer says:

“Here are some recent updates from the project.”

A useful answer says:

“The project is not in crisis, but procurement is becoming the pressure point. The money still looks manageable, but the Teams/email traffic suggests the schedule risk is moving faster than the formal project record shows. I’d focus on getting owner decisions locked this week before this turns into a change-order fight.”

That difference is not just tone. It comes from the system being designed to synthesize, not summarize.

**Done:** We have the strategy doc written, and the core idea is clear: the assistant needs an advisor loop, not just better search.

**What Remains:** We need to decide what the assistant should feel like in each mode before coding it. Otherwise we’ll keep patching symptoms.

**Recommended Next Step:** Let’s start with one mode and define the ideal behavior. I’d start with this question:

When you ask, **“What’s the latest on this project?”**, what would a truly valuable answer include every single time?

## Current Architecture Read

### Runtime

The live route is `frontend/src/app/api/ai-assistant/chat/route.ts`.

Important current behavior:

- It builds the strategist tools with the selected project pinned into guardrails.
- It injects memory and project context before generation.
- It detects source-specific RAG requests and answers those through a deterministic path before model generation.
- It forces a business retrieval path for briefing-style prompts.
- It retrieves a structured project snapshot, semantic matches, meetings, Teams, email, and OneDrive/document signals.
- It persists response quality, tool trace, memory usage, learning usage, briefing snapshot, and executive retrieval metadata.
- It disables model tools globally because current AI Gateway tool-calling behavior can produce empty `finishReason: other` responses.

That last point is central. The assistant prompt describes a tool-using strategist, but the live route currently does much of the retrieval server-side and then calls the model with `tools: undefined`. That is pragmatic, but it means "natural strategic behavior" has to be designed into the server context pipeline, not left to model tool choice.

### Retrieval

The main semantic search path is `frontend/src/lib/ai/tools/operational.ts`.

It currently:

- Embeds the query with `text-embedding-3-large` at 3072 dimensions.
- Searches `document_chunks`, `search_all_knowledge`, and `search_knowledge_base`.
- Applies project access filtering and admin-only comms gating.
- Merges knowledge, company knowledge, and document chunks.
- Stitches adjacent meeting transcript chunks.
- Applies recency weighting and briefing-specific source boosts.
- Optionally reranks with an LLM.
- Diversifies briefing results by source type.

This is a good foundation. The weakness is that retrieval still acts like a generic result merger. It needs to become an evidence compiler.

### Existing evals

Useful verification exists:

- `npm run rag:verify:chat-architecture`
- `npm run rag:verify:response-contract`
- `npm run rag:verify:source-specific`
- `npm run rag:verify:meetings`
- `npm run rag:verify:latest-briefing`
- `npm run rag:verify:pm-briefing`
- `npm run rag:verify:strategist-frontend`

The problem is that these mostly check wiring, shape, source availability, and coarse response quality. They do not yet enforce "this answer felt like a strategic advisor."

## Product Principle

Alleato AI should not be "search across project data."

It should be:

> A strategic construction business partner that knows the live project record, reads the messy communications layer, remembers how the company works, and turns all of that into an opinionated next move.

That means the assistant must answer differently by intent:

- "What is the latest on X?" -> briefing with changed facts, recent comms, hidden risks, and next decisions.
- "What should I worry about?" -> risk-ranked operating read with likely financial/schedule/relationship impact.
- "Help me think through this." -> conversational advisor mode with tradeoffs, options, and a recommendation.
- "Find what Brandon said about X." -> source-grounded quote/paraphrase with meeting/Teams/email citations.
- "What should we do next week?" -> prioritized action plan across projects, money, schedule, people, and client relationships.
- "How do I use the app?" -> controlled app-help answer, not business RAG.

## Target Architecture

### Layer 1: Intent Router

Create a shared intent classifier, not just scattered regex helpers.

File target:

- `frontend/src/lib/ai/intent-router.ts`

Inputs:

- User message.
- Selected project.
- Conversation history summary.
- Prior briefing packet metadata.

Outputs:

```ts
type AssistantIntent =
  | "project_briefing"
  | "portfolio_briefing"
  | "risk_review"
  | "financial_analysis"
  | "operations_analysis"
  | "people_or_capacity"
  | "business_development"
  | "source_lookup"
  | "document_question"
  | "app_help"
  | "knowledge_capture"
  | "brainstorming"
  | "general_conversation";
```

The intent router should also return:

- Required evidence families.
- Optional evidence families.
- Recency window.
- Whether the model should be free-form conversational or evidence-bound.
- Whether a deterministic fallback is acceptable.

Why this matters:

- It prevents random tool behavior.
- It lets the route gather the right packet before generation.
- It gives evals a stable thing to assert.

### Layer 2: Evidence Compiler

Replace "run a few tools and inject text" with a single evidence packet builder.

File target:

- `frontend/src/lib/ai/evidence/evidence-compiler.ts`

Core contract:

```ts
type EvidencePacket = {
  intent: AssistantIntent;
  query: string;
  project?: {
    id: number;
    name: string;
    confidence: "exact" | "inferred" | "missing";
  };
  structuredFacts: EvidenceSourceBlock;
  recentCommunications: EvidenceSourceBlock;
  meetings: EvidenceSourceBlock;
  documents: EvidenceSourceBlock;
  financials: EvidenceSourceBlock;
  risks: EvidenceSourceBlock;
  memories: EvidenceSourceBlock;
  companyKnowledge: EvidenceSourceBlock;
  sourceHealth: SourceHealthBlock;
  gaps: EvidenceGap[];
  citations: Citation[];
};
```

Each `EvidenceSourceBlock` should include:

- status: `loaded`, `empty`, `failed`, `skipped`, or `not_applicable`.
- source name.
- rows/results.
- max age of data.
- confidence.
- exact error if failed.
- why the source was or was not used.

This becomes the one object passed into model synthesis, deterministic fallback, persistence, and evals.

### Layer 3: Retrieval Router

Create one retrieval router that chooses retrieval mode by intent and source.

File target:

- `frontend/src/lib/ai/retrieval/retrieval-router.ts`

Modes:

1. Structured SQL first.
   - Budgets, commitments, change orders, direct costs, schedule, RFIs, submittals, risks.
   - Never answer numeric financial questions from vector chunks first.

2. Source-specific semantic.
   - Meetings, Teams, email, OneDrive/documents.
   - Use source-specific tools and project filters.

3. Hybrid chunk retrieval.
   - Vector plus lexical/full-text search for proper nouns, cost codes, companies, people, dates, and acronyms.
   - Use reciprocal rank fusion or a simple weighted merge.

4. Conversation/thread retrieval.
   - Teams and email should retrieve conversation clusters, not isolated one-line messages.

5. Memory retrieval.
   - User preferences, durable project lessons, team/company learnings, and recent conversation summaries.

The router should return source blocks, not prose.

### Layer 4: Advisor Synthesis

Create a small, explicit synthesis module.

File target:

- `frontend/src/lib/ai/synthesis/advisor-synthesis.ts`

Inputs:

- User message.
- Intent.
- Evidence packet.
- Conversation style settings.

Outputs:

- System prompt fragment.
- Evidence prompt fragment.
- Response contract for that intent.

The response contract should vary:

- Project briefing: Hard Facts, What Changed, Insider Analysis, Recommended Actions, Confidence/Data Gaps, Next Step.
- Brainstorming: framing, options, tradeoffs, recommendation, follow-up question if needed.
- Risk review: ranked risks, evidence, impact, owner, mitigation.
- Source lookup: answer, citations, what was not found.
- App help: steps and route references from help center only.

This is where the assistant starts feeling intelligent. The assistant should not merely list facts. It should say what the facts mean.

### Layer 5: Response Quality Gate

Extend `frontend/src/lib/ai/score-response-quality.ts`.

Current quality checks catch empty and filler responses. Add advisor-specific checks:

- Has a clear point of view.
- Includes at least one concrete recommendation when the intent is business-related.
- Names concrete evidence, not generic claims.
- Does not expose implementation language like "RAG", "tool call", or "retrieval" unless the user asks about the system.
- Acknowledges gaps without sounding broken.
- Avoids "I found X results" as the main answer.
- Uses citations when citing source-specific facts.
- Does not ask the user for IDs.
- Does not end with a vague "let me know."

Persist these dimensions in `chat_history.metadata.response_quality`.

### Layer 6: Advisor Eval Harness

The system needs an eval set that tests the feel of the assistant, not only source wiring.

File target:

- `scripts/verify/verify_ai_advisor_quality.mjs`

Use existing scripts as base:

- `scripts/verify/verify_rag_pm_briefing_quality.mjs`
- `backend/src/scripts/rag_e2e_eval.py`
- `scripts/verify/verify_ai_assistant_latest_briefing_shape.mjs`

Eval dimensions:

- Groundedness: claims trace to evidence packet.
- Strategic judgment: answer has a useful point of view.
- Specificity: names projects, people, dates, dollars, source types.
- Actionability: gives the next decision/action/owner.
- Conversation quality: sounds like a business partner, not a report generator.
- Graceful thin-data behavior: useful partial answer with clear source gaps.
- Tool restraint: only required sources were checked.

Add a golden prompt set:

1. "What is the latest on Vermillion Rise?"
2. "What should I worry about this week?"
3. "Help me think through whether we should bid this."
4. "What did Brandon say about billing?"
5. "Why does this project feel stuck?"
6. "What changed since the last time I asked?"
7. "What are we missing in our data?"
8. "Give me the owner-meeting prep version."
9. "What is the most important thing I am not seeing?"
10. "Search emails and Teams for schedule pressure."

Each prompt should have scoring criteria and required evidence families.

## Source Strategy

### Meetings

Keep the current multi-granularity meeting strategy.

Meetings should support:

- Summary-level retrieval for broad project updates.
- Segment-level retrieval for decisions, risks, costs, tasks.
- Transcript retrieval for exact speaker context.
- Date-aware retrieval for "today", "this week", and "recent".

Do not collapse meetings into only summaries. The assistant needs both breadth and quotes.

### Teams

Teams should not be treated as isolated single-message chunks.

Target pattern:

- Teams channel: thread root plus replies.
- Teams DM: chat/day conversation document.
- Add a minimum substantive-content gate.
- Separate `teams_channel` and `teams_dm` source types.
- Re-embed conversation documents when new messages append.
- Add conversation-level extraction:
  - issue
  - decision
  - blocker
  - urgency
  - project inference
  - people involved

The assistant should use Teams mostly for fresh operational signal, not canonical facts.

### Email

Email should be thread-based.

Target pattern:

- Group by Microsoft Graph `conversationId`.
- Strip quoted history and signatures before embedding.
- Store participant, sender, recipient, date range, subject, and project inference.
- Re-embed when a thread gets a new reply.
- Add email-thread summaries for high-volume threads.

The assistant should use email for commitments, approvals, client/vendor position, and recent unstructured updates.

### Documents and OneDrive

Documents should be parsed by document family:

- Contracts: clauses, obligations, dates, notices, risk terms.
- Specs: division/section hierarchy and requirements.
- Financial spreadsheets: structured rows first, semantic second.
- Drawings: title block, sheet metadata, revisions, OCR chunks.
- General PDFs/docs: semantic chunks with source metadata.

The assistant should not answer spreadsheet numbers from semantic chunks if `document_rows` exists.

### Structured App Data

Structured app data remains the operating scoreboard.

Use SQL first for:

- Budget.
- Prime contracts.
- Commitments.
- Change events.
- Change orders.
- Direct costs.
- RFIs.
- Submittals.
- Schedule.
- Risks.
- Directory/team.

The assistant should treat structured app data as the "book of record" and communications/documents as "what is changing around the record."

### Memory

Memory should not be mixed into RAG as just another search result.

Memory roles:

- User preferences: how Megan wants answers, formats, priorities.
- Company/team learnings: durable operating patterns.
- Project lessons: remembered risks, decisions, causes, outcomes.
- Recent conversation continuity: what the assistant already answered.

Memory should influence tone, assumptions, and continuity. It should not override live project data.

## Implementation Plan

### Phase 0: Freeze the Baseline

Goal: know exactly how bad the assistant is before changing it.

Tasks:

1. Run current advisor prompts through the live `/ai-assistant`.
2. Save assistant responses, tool traces, response quality, and screenshots.
3. Record which sources loaded, failed, or returned zero rows.
4. Score each answer manually once against the advisor rubric.
5. Add the current failures to a baseline JSON fixture.

Evidence:

- `frontend/tests/agent-browser-runs/<timestamp>-ai-advisor-baseline/`
- `docs/ai-plan/evals/advisor-baseline-2026-04-29.json`

Done when:

- We have at least 10 baseline prompts with captured answers and source traces.

### Phase 1: Create the Intent Router

Goal: stop random retrieval decisions.

Tasks:

1. Extract current regex/intention helpers into `intent-router.ts`.
2. Add explicit intent output and required evidence families.
3. Add tests for the golden prompt set.
4. Wire the chat route to use the intent router before retrieval.

Validation:

- Unit tests for intent classification.
- Existing `rag:verify:source-specific` still passes.
- Existing `rag:verify:response-contract` still passes.

Done when:

- Every user turn has a persisted `metadata.intent`.

### Phase 2: Build the Evidence Packet

Goal: make source gathering explicit, inspectable, and reusable.

Tasks:

1. Create `evidence-compiler.ts`.
2. Move project snapshot, semantic search, executive source checks, memory usage, and source health into packet builders.
3. Persist `metadata.evidence_packet_summary`.
4. Keep large raw content out of metadata; persist compact summaries and source references.
5. Add status for every source: loaded, empty, failed, skipped, not applicable.

Validation:

- `npm run rag:verify:chat-architecture`
- `npm run rag:verify:latest-briefing`
- New unit test for packet source statuses.

Done when:

- A failed source cannot disappear silently.
- A thin answer can explain exactly what was missing without exposing implementation internals.

### Phase 3: Retrieval Router and Source Policies

Goal: use the right retrieval mode for the question.

Tasks:

1. Create `retrieval-router.ts`.
2. Implement SQL-first financial/structured retrieval.
3. Implement source-specific retrieval plans for meetings, Teams, email, and documents.
4. Add source quotas for broad briefings:
   - structured facts required
   - at least one recent communication source when available
   - at least one meeting/document source when available
   - cap low-signal Teams/DM results
5. Add hybrid retrieval RPC for `document_chunks`:
   - vector rank
   - full-text rank
   - reciprocal rank fusion
   - metadata filters
6. Update `semanticSearch` to call the router or become a lower-level helper.

Validation:

- `npm run rag:verify:pm-briefing`
- `npm run rag:verify:source-specific`
- New retrieval-router unit tests.
- Live DB check for source diversity and project filtering.

Done when:

- Broad project questions consistently produce structured facts plus recent source signal.
- Numeric questions never depend on vector chunks as the first source.

### Phase 4: Conversation Intelligence for Teams and Email

Goal: make messy communications useful instead of noisy.

Tasks:

1. Teams:
   - Ensure DM aggregation by chat/day.
   - Split `teams_channel` and `teams_dm`.
   - Add minimum-content gate.
   - Reset status to `raw_ingested` or equivalent when aggregated docs change.
   - Add project inference from participants, aliases, subject/channel names, and conversation text.

2. Email:
   - Group by `conversationId`.
   - Strip quoted history, signatures, and boilerplate.
   - Store thread-level document metadata.
   - Re-embed changed threads.
   - Backfill existing per-message email docs into threads.

3. Conversation extraction:
   - Create lightweight summaries for issue, decision, blocker, ask, owner, deadline, and sentiment.
   - Store extracted signals in a structured table linked to source document ids.

Validation:

- `npm run rag:verify:teams-ingestion`
- `npm run rag:verify:graph-embedding`
- Source coverage check showing no stale raw-ingested rows older than 24 hours.

Done when:

- Teams/email are useful recent signal sources instead of low-content vector noise.

### Phase 5: Advisor Synthesis

Goal: make the answer sound like a strategic partner.

Tasks:

1. Create `advisor-synthesis.ts`.
2. Convert evidence packets into intent-specific synthesis prompts.
3. Add natural answer contracts:
   - lead with the point
   - evidence second
   - recommendation third
   - data gaps only where relevant
4. Remove committee-style output except in explicit council mode.
5. Add anti-pattern checks:
   - no "I found X results" as the lead
   - no "I need to search" after retrieval already happened
   - no generic PM advice when evidence exists
   - no source/tool internals unless requested
6. Keep deterministic fallback only for true failure recovery or controlled briefing format.

Validation:

- New `verify_ai_advisor_quality.mjs`.
- Existing response contract verification.
- Agent-browser conversation run with screenshots and persisted message metadata.

Done when:

- The assistant can answer the 10 golden prompts with a useful point of view and evidence.

### Phase 6: UI Transparency Without Making It Robotic

Goal: show useful confidence without exposing plumbing.

Tasks:

1. Add a compact "Sources checked" disclosure in message metadata UI.
2. Show source families, not raw tool names:
   - Project controls
   - Meetings
   - Teams
   - Email
   - Documents
   - Company memory
3. Show data freshness and gaps only when relevant.
4. Keep the main answer human and uncluttered.

Validation:

- Agent-browser screenshot on `/ai-assistant`.
- Mobile and desktop visual check.

Done when:

- Users can trust the answer without feeling like they are reading logs.

### Phase 7: Guardrails and Monitoring

Goal: keep this from degrading again.

Tasks:

1. Add daily RAG health checks:
   - embedding provider health
   - raw-ingested backlog by source
   - recent meeting chunk coverage
   - Teams/email project assignment coverage
   - failed source-specific RPCs
2. Add response-quality trend tracking:
   - advisor score
   - source diversity
   - fallback rate
   - empty/thin source rate
   - no-recommendation rate
3. Add CI guardrails:
   - route architecture contract
   - advisor prompt contract
   - evidence packet schema tests
   - retrieval router tests
   - source-specific RAG tests

Done when:

- A regression fails loudly before a user has to say "this still sucks."

## Data Model Additions

Likely new/changed tables:

```sql
assistant_evidence_packets
assistant_eval_cases
assistant_eval_runs
assistant_eval_results
communication_threads
communication_thread_messages
communication_signals
rag_source_health_snapshots
```

Keep `chat_history.metadata` as the compact per-message telemetry path. Do not stuff full retrieved documents into chat metadata.

## Definition of Done

This work is not done when the assistant responds.

It is done when:

1. The assistant answers the 10 golden prompts with grounded, useful, opinionated responses.
2. Every answer has an intent, evidence packet summary, source health, and response-quality score persisted.
3. Broad project briefings include structured facts plus recent unstructured signal when available.
4. Source failures are explicit and recoverable.
5. Teams and email retrieval operate on conversations/threads, not noisy isolated fragments.
6. Numeric and financial answers use structured data first.
7. The frontend conversation feels natural and useful in an agent-browser run.
8. Verification scripts can catch the most likely regressions without manual inspection.

## Recommended Build Order

1. Baseline advisor evals.
2. Intent router.
3. Evidence packet compiler.
4. Retrieval router.
5. Advisor synthesis.
6. Teams/email conversation cleanup.
7. Hybrid retrieval RPC.
8. UI source transparency.
9. Daily health monitoring.

This order matters. If we fix chunking first, the assistant may retrieve better data but still sound bad. If we fix the prompt first, it will sound better while still reasoning over weak packets. The first durable win is to control the loop: intent -> evidence -> synthesis -> quality gate.

## Immediate Next Implementation Slice

The first implementation slice should be small and high-leverage:

1. Add `intent-router.ts`.
2. Add `evidence-compiler.ts` with only the existing current sources.
3. Persist `intent` and `evidence_packet_summary` in `chat_history.metadata`.
4. Add `verify_ai_advisor_quality.mjs` with the 10 golden prompts in offline/mock mode first.
5. Rewire the chat route to build an evidence packet before project briefing synthesis.

Do not start by changing the UI. The product experience is bad because the assistant brain is under-specified, not because the chat surface needs decoration.

