# RAG Compiler And Assistant Behavior V1

Date: 2026-04-30
Status: Planning draft for PRP preparation
Scope: How raw communications become source clusters, insight cards, intelligence packets, review items, and assistant answers.

Related documents:

- [RAG Strategy Working Decisions](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [Current AI Assistant Diagnosis And Validation Gate](CURRENT-AI-ASSISTANT-DIAGNOSIS-AND-VALIDATION-GATE-2026-04-30.md)
- [Client Project Intelligence PRP Scope](CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md)
- [Client Project Gold-Standard Chat Examples](CLIENT-PROJECT-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [JobPlanner Replacement Intelligence Packet V1](JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md)
- [RAG Gold-Standard Chat Examples](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [AI and JobPlanner Internal Initiatives](AI-JOBPLANNER-INTERNAL-INITIATIVES-IDEATION-2026-04-30.md)
- [AI Assistant RAG Strategy](AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md)

## Purpose

This document defines the behavior between raw source data and assistant response quality.

The goal is to make Alleato AI feel like a prepared advisor, not a retrieval bot.

V1 should first validate and stabilize the current assistant tool-calling path. After that, it should optimize this behavior for active client construction projects. Internal initiatives should use the same pipeline, but client project status, financial exposure, change-management risk, schedule risk, decisions, and follow-ups are the primary acceptance path.

The system should follow this path:

```text
raw source records
  -> source clusters
  -> insight card candidates
  -> target attribution
  -> review or auto-approval
  -> intelligence packet update
  -> assistant packet-first response
```

## Core Behavior Decision

The assistant should not search raw Teams, email, and meeting records first for strategic questions.

For strategic questions, it should:

1. Determine intent.
2. Resolve the target.
3. Load the current intelligence packet.
4. Check freshness and confidence.
5. Use raw RAG only when the packet is missing, stale, thin, challenged, or needs exact evidence.

For source lookup questions, it can go directly to raw source search.

## Compiler V1 Responsibilities

The compiler is a background process that turns source chaos into durable intelligence.

It should be responsible for:

- reading new raw records
- grouping related records into source clusters
- extracting insight card candidates
- assigning target candidates
- linking evidence
- creating review items
- updating intelligence packets
- failing loudly when source layers break

The compiler should not be responsible for:

- making irreversible business decisions
- hiding uncertainty
- replacing human review for low-confidence attribution
- copying full raw messages into compiled tables
- treating every communication as project-specific

## Source Inputs

V1 source inputs:

- `document_metadata`
- `document_chunks`
- email rows represented in `document_metadata`
- Teams rows represented in `document_metadata`
- meeting transcript rows represented in `document_metadata`
- existing `projects` table for project matching

Later inputs:

- daily reports
- SharePoint file metadata
- JobPlanner exports or API data
- direct schedule/budget/change-management database facts

## Step 1: Read New Source Records

The compiler should process records incrementally.

Minimum inputs per source record:

- source ID
- source type
- title or subject
- raw text or summary
- participants
- occurred date
- existing `project_id`, if any
- source system
- source thread/conversation identifier, if available
- existing sentiment or keywords, if available

V1 rule:

If a source record is missing text, date, and title, it should be skipped with a logged reason. It should not silently disappear.

## Step 2: Create Source Clusters

The compiler should not interpret every row in isolation.

Emails and Teams messages are often valuable because of the conversation arc, not because of one message.

Cluster by:

- Teams conversation ID
- email thread subject or conversation ID
- meeting transcript or meeting segment
- source document ID
- source date window
- participant group
- existing project ID
- likely target terms

Cluster examples:

- Brandon and Colin Teams DM about JobPlanner plugin and API.
- Email thread about JobPlanner users over contracted allotment.
- Email thread about API access and integration support.
- Operations meeting segment that discusses multiple projects.

Cluster output:

```ts
type SourceCluster = {
  id: string;
  sourceType: "email" | "teams" | "meeting" | "document" | "daily_report";
  sourceIds: string[];
  title: string;
  occurredStartAt: string | null;
  occurredEndAt: string | null;
  participants: string[];
  textForAnalysis: string;
  existingProjectIds: number[];
  candidateTerms: string[];
  sourceHealth: "complete" | "partial" | "thin" | "failed";
};
```

## Step 3: Classify Intent Of The Cluster

Each cluster should be classified before extraction.

Cluster categories:

- project update
- product need
- process issue
- blocker
- task
- decision
- risk
- open question
- vendor/platform friction
- source lookup only
- noise or not relevant

Why this matters:

The system should not treat every communication as a task or project update. A JobPlanner billing thread may be more important as vendor friction than as a project update.

## Step 4: Extract Insight Card Candidates

For each cluster, the compiler should extract zero or more insight card candidates.

Extraction output:

```ts
type InsightCardCandidate = {
  title: string;
  cardType:
    | "risk"
    | "decision"
    | "blocker"
    | "task"
    | "product_need"
    | "process_issue"
    | "project_update"
    | "open_question"
    | "requirement";
  summary: string;
  whyItMatters: string | null;
  currentStatus: "open" | "resolved" | "blocked" | "needs_review" | "stale";
  confidence: "high" | "medium" | "low";
  suggestedOwnerLabel: string | null;
  nextAction: string | null;
  evidenceRefs: Array<{
    sourceDocumentId: string | null;
    sourceChunkId: string | null;
    sourceMessageId: string | null;
    sourceType: string;
    excerpt: string;
    relevanceReason: string;
    evidenceRole: string;
  }>;
};
```

Extraction rule:

The compiler should prefer fewer, higher-quality cards over many shallow cards.

Bad card:

> There was a conversation about JobPlanner.

Good card:

> JobPlanner replacement needs automated project-data intake because the team wants emails, SharePoint, daily reports, contacts, drawings, RFIs, submittals, meeting minutes, and schedules to keep project records current.

## Step 5: Resolve Targets

The compiler should assign each card to one primary target and zero or more related targets.

Target types:

- `client_project`
- `internal_initiative`
- `vendor_platform`
- `company_process`

Target resolution signals:

- exact project name
- project number
- project alias
- existing `document_metadata.project_id`
- email subject
- Teams conversation title
- meeting title
- file path or source folder
- participant patterns
- location
- client name
- vendor/platform name
- repeated terms
- source cluster context

V1 attribution levels:

- `auto_assigned`: strong enough to trust without review.
- `candidate`: useful, but should be labeled.
- `needs_review`: not trusted enough for packet inclusion.
- `rejected`: reviewed and not relevant.

Recommended V1 rules:

- Exact project name, project number, or existing source `project_id` can be auto-assigned if there is no conflict.
- Internal initiative terms like JobPlanner, AI implementation, RAG, or change management can auto-assign to matching seeded targets if the cluster is clearly about that workstream.
- Project mentions inside internal initiative conversations should be related targets, not necessarily the primary target.
- Executive or operations meetings with multiple projects should usually create candidate links or review items, not auto-assign one project.

## Step 6: Deduplicate Or Update Existing Cards

Before writing a new card, the compiler should check for similar open cards on the same target.

Match by:

- primary target
- card type
- normalized title
- overlapping evidence source IDs
- similar summary
- recurring terms

If similar card exists:

- update `last_seen_at`
- increase `source_count`
- add new evidence
- update confidence if appropriate
- add a packet change event only if the meaning changed

If meaning is meaningfully different:

- create a new card

Rule:

The system should avoid creating five separate cards for the same recurring JobPlanner admin friction unless each card represents a distinct business issue.

## Step 7: Create Review Items

The compiler should create review items when confidence is not strong enough or when a card could materially affect decisions.

Create review item when:

- confidence is low
- multiple targets are plausible
- target attribution conflicts with existing project ID
- source cluster includes multiple projects
- source evidence is thin
- source text is sensitive
- card suggests a major financial, schedule, legal, or client-facing risk
- card would materially change the current packet

Review item should include:

- what the compiler thinks
- why it thinks that
- what evidence it used
- what human decision is needed

## Step 8: Update Intelligence Packet

Packet generation should happen after card extraction and review item creation.

The current packet should include:

- approved cards
- high-confidence auto-assigned cards
- medium-confidence candidate cards only when clearly labeled
- review queue count
- stale/thin source warnings

Packet should exclude:

- rejected cards
- low-confidence claims
- vague cards
- sensitive raw details not safe for broad display

Packet update behavior:

- Update `current` packet for the target.
- Create `snapshot` packet only when meaningful changes occur.
- Store `manual_gold_standard` packets separately and never overwrite them automatically.

Meaningful packet changes:

- new high-confidence blocker
- new decision
- new risk
- resolved blocker
- major change in current status
- new recommended next move
- source coverage becomes stale or fails

## Step 9: Fail Loudly

The compiler must not silently succeed when it skipped important source layers.

It should record source health:

- source unavailable
- query failed
- embedding missing
- no new rows
- missing source text
- target lookup failed
- packet write failed
- review write failed

Packet freshness should reflect source health.

Example:

If Teams ingestion fails, the packet should say `partial`, not `fresh`.

## Assistant Behavior V1

### Intent router

The assistant should first classify the user's request.

V1 intents:

- `target_briefing`
- `latest_status`
- `risk_review`
- `decision_lookup`
- `task_followup`
- `source_lookup`
- `strategy_brainstorm`
- `implementation_planning`
- `app_help`
- `general_conversation`

### Target resolution

The assistant should identify whether the user is asking about:

- selected project
- named client project
- named internal initiative
- vendor/platform
- company process
- no target

Examples:

- "What's the latest on JobPlanner replacement?" -> `internal_initiative: JobPlanner Replacement`
- "What did Brandon say about JobPlanner?" -> source lookup, likely `vendor_platform: JobPlanner` plus `internal_initiative: JobPlanner Replacement`
- "What's the latest on Westfield Collective?" -> `client_project: Westfield Collective`
- "Is the JobPlanner conversation related to Union Collective?" -> candidate attribution review, likely `internal_initiative: JobPlanner Replacement` plus candidate `client_project: Union Collective`
- "What should we worry about across all jobs?" -> portfolio/risk intent, no single target

### Packet-first response path

Use this path for:

- latest status
- strategic read
- risk review
- blocker review
- decision summary
- next-step planning

Flow:

1. Resolve target.
2. Load current packet.
3. Check packet freshness and source coverage.
4. Load active cards if needed.
5. Pull raw evidence only if needed.
6. Answer with status, meaning, risk/blocker, recommendation, and confidence.

Default response shape:

1. Current read.
2. What changed.
3. Why it matters.
4. Open blocker/risk.
5. Recommended next step.
6. Evidence basis.
7. Caveat if source coverage is incomplete.

### Raw source response path

Use this path for:

- "who said"
- "show me where"
- "what was the exact wording"
- "find the Teams/email/meeting discussion"
- "summarize this thread"

Flow:

1. Resolve target if helpful.
2. Search source evidence and raw records.
3. Return source-grounded answer.
4. Do not overgeneralize into a strategic recommendation unless asked.

### Missing packet behavior

If no packet exists:

The assistant should say it does not yet have a compiled packet, then fall back to raw evidence if available.

It should not pretend to be fully briefed.

Example:

> I do not have a compiled intelligence packet for this yet, so this is based on raw source retrieval rather than the prepared briefing layer.

Then it should recommend creating or refreshing the packet.

### Stale packet behavior

If packet exists but is stale:

The assistant should use it as background, then pull newer raw evidence.

Example:

> The compiled packet is stale as of April 25, so I am using it as baseline context and checking newer source records before giving the latest read.

### Thin packet behavior

If packet has low source coverage:

The assistant should answer cautiously and name the gap.

Example:

> This read is strongest for Teams and email. Meetings and daily reports are not fully represented yet, so I would treat this as a directional operating read rather than a complete project record.

### Uncertainty language

The assistant should avoid robotic caveats like:

> I cannot determine that from the available information.

Better:

> The evidence points toward Union Collective as a candidate project, but I would not auto-assign it yet because the source is an internal JobPlanner discussion and not a project-specific thread.

The assistant should separate:

- known facts
- likely inferences
- open questions
- recommended next action

## JobPlanner Replacement Example Flow

User asks:

> What is the latest on JobPlanner replacement?

Assistant should:

1. Resolve target: `internal_initiative: JobPlanner Replacement`.
2. Load packet: JobPlanner Replacement current packet.
3. Detect current packet status: working sample or fresh, depending implementation stage.
4. Use active cards:
   - automated project data intake
   - proper-job sorting
   - mobile field access
   - daily report schedule updates
   - JobPlanner admin friction
   - API/support blocker
   - demo/recording task
5. Answer:
   - "This is becoming a project-intelligence automation initiative, not just a JobPlanner replacement."
   - "The strongest signal is the Brandon/Colin thread about keeping project records current from emails, SharePoint, daily reports, contacts, drawings, RFIs, submittals, meeting minutes, and schedules."
   - "The active blocker is JobPlanner API/support dependency."
   - "The next decision is whether JobPlanner API work is a prototype, transition tool, or integration path."
6. Cite evidence if requested or if confidence is challenged.

## Acceptance Criteria For V1 Planning

The planning is ready for PRP when these are defined:

- packet format
- storage model
- compiler write flow
- assistant read flow
- missing/stale/thin packet behavior
- confidence/review rules
- first gold-standard target
- first implementation slice
- open decisions for PRP

## Recommended First Implementation Slice

The first PRP should not attempt the entire fully automated compiler.

Recommended V1 implementation:

1. Add storage tables.
2. Seed intelligence targets:
   - JobPlanner Replacement
   - AI Implementation
   - JobPlanner
3. Create manual gold-standard cards from the JobPlanner packet.
4. Create manual/current JobPlanner packet row.
5. Add packet-first assistant lookup for named internal initiative questions.
6. Add stale/missing/thin packet language.
7. Add basic review queue rows for candidate attribution.
8. Add focused tests/evals for:
   - "What's the latest on JobPlanner replacement?"
   - "What did Brandon say about JobPlanner?"
   - "What project is this related to?"

Why:

This proves the value of the new intelligence layer before trying to automate every part of compilation.

## What Should Wait Until V2

Defer these until after V1 proves packet-first answers improve assistant quality:

- fully automated multi-source compiler
- daily/twice-daily scheduler
- full review UI
- portfolio-wide packet generation
- daily report ingestion
- SharePoint enrichment
- complex duplicate-card merging
- full source-cluster visualization

## Remaining Open Decisions

These are the remaining planning decisions before official PRP creation:

1. Should medium-confidence cards be included in packets by default when labeled as candidate?
   - Recommended V1 answer: yes, but only when useful and clearly labeled.
2. Should snapshots be generated every compiler run or only on meaningful changes?
   - Recommended V1 answer: only on meaningful changes.
3. Should review live in the intelligence planning page or a separate queue?
   - Recommended V1 answer: planning page first, separate queue later.
4. Should V1 include a real compiler or manual seed cards first?
   - Recommended V1 answer: manual seed cards plus packet-first assistant integration first.
5. Should internal initiatives appear in the main project selector?
   - Recommended V1 answer: not yet. Resolve by assistant target search first, then design selector behavior separately.

## PRP Handoff Summary

The official PRP should implement a narrow proof of the strategy:

> Add the compiled intelligence storage layer, seed the JobPlanner Replacement target with gold-standard cards and packet data, and update the assistant to read the packet before raw RAG when answering strategic questions about that target.

The PRP should not promise a perfect automated compiler in the first pass.

The first pass succeeds if the assistant can answer "What is the latest on JobPlanner replacement?" like a prepared strategic advisor using the packet, while preserving evidence traceability and honest uncertainty.

Response-quality benchmark:

- [RAG Gold-Standard Chat Examples](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
