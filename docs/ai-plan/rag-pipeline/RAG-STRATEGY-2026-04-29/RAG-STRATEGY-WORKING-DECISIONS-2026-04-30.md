# RAG Strategy Working Decisions

Date: 2026-04-30
Status: Working planning document
Scope: Alleato AI assistant, project intelligence, internal initiative intelligence, source compilation, memory packets, and RAG behavior.

Related documents:

- [AI Assistant RAG Strategy - 2026-04-29](AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md)
- [Current AI Assistant Diagnosis And Validation Gate](CURRENT-AI-ASSISTANT-DIAGNOSIS-AND-VALIDATION-GATE-2026-04-30.md)
- [Client Project Intelligence PRP Scope](CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md)
- [Client Project Gold-Standard Chat Examples](CLIENT-PROJECT-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [AI and JobPlanner Internal Initiatives](AI-JOBPLANNER-INTERNAL-INITIATIVES-IDEATION-2026-04-30.md)
- [JobPlanner Replacement Intelligence Packet V1](JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md)
- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [RAG Gold-Standard Chat Examples](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [Intelligence Planning page](../../frontend/src/app/(main)/intelligence-planning/page.tsx)

## Core Principle

Alleato AI should not behave like a search box.

It should behave like a prepared strategic advisor that already understands the current project or initiative context, knows what changed recently, can explain why it matters, and can recommend the next move with evidence.

Traditional RAG is not enough by itself. The system needs a compiler layer that turns messy communications into structured intelligence before the user asks a question.

## Primary PRP Focus

The first PRP should start by diagnosing and validating the current AI assistant tool-calling path, then implement **client construction project intelligence** as the first packet-first intelligence layer.

The primary value is helping Alleato manage real client projects by surfacing:

- project status
- financial exposure
- change-management risk
- schedule and operational blockers
- decisions from meetings and communication
- likely missed follow-ups
- early warning signs before problems become crises

Internal initiatives such as JobPlanner Replacement and AI Implementation use the same architecture, but they should be treated as a secondary extension path, not the lead acceptance example for V1.

The packet-first client project layer is part of a broader Alleato intelligence system. It should not replace existing valuable tools for financial analysis, Acumatica, memory, company knowledge, raw source lookup, specialist agents, or app help.

## Decisions Made So Far

### 1. Intent comes before retrieval

The assistant should first determine what the user is trying to do before deciding what evidence to gather.

Examples:

- "What's the latest on this project?" needs a current briefing.
- "What should I worry about?" needs risk analysis.
- "What did Brandon say about JobPlanner?" needs source-grounded communication retrieval.
- "Help me think through this" needs advisor mode, not a rigid source summary.

This is the main reason the current assistant can feel robotic: it retrieves before it truly understands the job the user is asking it to do.

### 2. Raw source data should be compiled before chat

Emails, Teams messages, meetings, daily reports, and documents should not be reinterpreted from scratch every time.

The system should run a background compiler that creates structured records from raw source data.

The chat assistant should usually read compiled intelligence first, then use raw source records only when it needs evidence, quotes, verification, or deeper investigation.

### 3. Internal initiatives should be treated like projects

Internal workstreams are first-class intelligence targets.

Examples:

- AI Implementation
- JobPlanner Replacement
- Project Intelligence System
- Accounting Automation
- Estimating Improvements

They should have status, owners, blockers, decisions, tasks, risks, related source records, related client projects, and current intelligence packets.

This matters because some of the most valuable operational insight is not tied to one client project. JobPlanner replacement and AI implementation are examples of internal initiatives that need the same rigor as client projects.

### 4. One source record can belong to multiple targets

A Teams message, email thread, or meeting segment may be relevant to:

- one internal initiative
- one client project
- multiple client projects
- a company process
- a vendor platform

Example:

A conversation about testing a JobPlanner plugin on Union Collective should connect to:

- Internal initiative: JobPlanner Replacement
- Internal initiative: AI Implementation
- Client project: Union Collective
- Vendor platform: JobPlanner

The system should not force every record into a single project ID.

### 5. The compiler should create Insight Cards

An Insight Card is not a summary.

It is a structured claim about the business, backed by evidence.

Example of a weak summary:

> There were emails about JobPlanner users.

Example of an insight:

> JobPlanner is creating admin friction around users, invoices, API access, and support responsiveness.

The second version is useful because it explains the business meaning, not just the topic.

### 6. Intelligence packets should be the assistant's first briefing layer

Each project or internal initiative should have a current intelligence packet.

When the user asks "what's the latest?", the assistant should not start with raw search. It should read the packet first.

The packet should tell the assistant:

- current status
- recent changes
- active blockers
- risks
- decisions
- open questions
- owners and next actions
- confidence level
- supporting evidence
- stale or uncertain items

### 7. Confidence must be explicit

Project and initiative attribution should use confidence levels.

Recommended model:

- `auto_assigned`: strong evidence supports the target.
- `candidate`: likely target, but needs review or stronger evidence.
- `needs_review`: weak, vague, conflicting, or multi-project evidence.
- `rejected`: reviewed and confirmed not relevant.

The system should store why it made the assignment, not only the final target ID.

## Target Architecture

### Layer 1: Raw Sources

Inputs:

- emails
- Teams messages
- meeting transcripts
- documents
- daily reports
- SharePoint files
- JobPlanner exports or API data
- project database facts

Purpose:

Keep original source records intact and traceable.

### Layer 2: Compiler

Purpose:

Read raw sources on a schedule and extract structured intelligence.

The compiler should identify:

- project references
- initiative references
- decisions
- blockers
- risks
- tasks
- product needs
- process issues
- owner signals
- sentiment or urgency
- source evidence

Recommended cadence:

- twice daily for active communications
- daily for lower-priority sources
- manual backfill for first implementation windows

### Layer 3: Insight Cards

Purpose:

Store individual business-level insights extracted from source data.

Working schema:

```ts
type InsightCard = {
  id: string;
  title: string;
  type:
    | "risk"
    | "decision"
    | "blocker"
    | "task"
    | "product_need"
    | "process_issue"
    | "project_update"
    | "question";
  targetType:
    | "client_project"
    | "internal_initiative"
    | "company_process"
    | "vendor_platform"
    | "unknown";
  targetId: string | number | null;
  summary: string;
  whyItMatters: string;
  currentStatus: "open" | "resolved" | "blocked" | "needs_review" | "stale";
  confidence: "high" | "medium" | "low";
  attributionStatus: "auto_assigned" | "candidate" | "needs_review" | "rejected";
  evidence: Array<{
    sourceType: "email" | "teams" | "meeting" | "document" | "daily_report" | "database";
    sourceId: string;
    occurredAt: string;
    excerpt: string;
    relevanceReason: string;
  }>;
  peopleInvolved: string[];
  suggestedOwner: string | null;
  nextAction: string | null;
  sourceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  staleAfter: string | null;
};
```

### Layer 4: Intelligence Packets

Purpose:

Give the assistant a current briefing before it responds.

Working schema:

```ts
type IntelligencePacket = {
  targetType: "client_project" | "internal_initiative" | "company_process" | "vendor_platform";
  targetId: string | number;
  targetName: string;
  generatedAt: string;
  coveredDateRange: {
    start: string;
    end: string;
  };
  executiveSummary: string;
  currentStatus: string;
  recentChanges: string[];
  activeRisks: InsightCard[];
  activeBlockers: InsightCard[];
  decisions: InsightCard[];
  openTasks: InsightCard[];
  productNeeds: InsightCard[];
  openQuestions: InsightCard[];
  recommendedNextMoves: string[];
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
    needsReview: number;
  };
  sourceCoverage: {
    email: number;
    teams: number;
    meeting: number;
    document: number;
    dailyReport: number;
    database: number;
  };
  staleItems: InsightCard[];
  reviewQueue: InsightCard[];
};
```

### Layer 5: Assistant Reasoning

Purpose:

Use the packet and evidence according to intent.

The assistant should follow this loop:

1. Determine user intent.
2. Identify the target project, initiative, process, or platform.
3. Load the current intelligence packet.
4. Check whether the packet is fresh enough and complete enough.
5. Pull raw evidence only if needed.
6. Respond with a point of view, not a generic summary.
7. Clearly separate known facts, likely inferences, and unknowns.
8. Recommend the next step.

## First Gold-Standard Targets

### Internal initiative: JobPlanner Replacement

Gold-standard packet draft:

- [JobPlanner Replacement Intelligence Packet V1](JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md)

Why this target:

- It has real Teams and email evidence.
- It connects internal product strategy to real operational pain.
- It has clear source signals around APIs, project contacts, drawings, RFIs, submittals, daily reports, meeting minutes, schedules, user management, and invoices.
- It overlaps with AI Implementation, which tests multi-target attribution.

Questions this packet should answer:

- What is the latest on JobPlanner replacement?
- What has Brandon repeatedly asked for or reacted to?
- What workflows does the team want automated?
- What is blocked?
- What should the replacement app do better than JobPlanner?
- Which client projects are being used as examples or tests?

### Client project: Westfield Collective

Why this target:

- It has more project data than Union Collective.
- It can validate whether the compiler works for actual client project intelligence, not just internal initiative analysis.
- It is a better proof target for project status, financial exposure, change-management risk, meetings, communication signals, and early issue surfacing.
- It forces the system to distinguish between project-specific evidence and broader initiative references.

Questions this packet should answer:

- What is the latest on Westfield Collective?
- What changed recently?
- What risks or blockers were mentioned?
- What decisions were made?
- What source records support the latest status?
- Which internal initiatives reference this project?

Union Collective should remain a secondary attribution example because it appears in JobPlanner/AI planning context, but it should not be the primary V1 client-project proof target.

## Attribution Rules

### Auto-assign

Use when there is strong evidence:

- exact project name
- project number
- known alias
- email subject includes project name
- meeting title includes project name
- source folder/path includes project name
- source system has project ID
- repeated strong terms point to one target

### Candidate

Use when there is medium evidence:

- location
- client name
- vendor or subcontractor strongly tied to a project
- people pattern strongly tied to a project
- scope language strongly tied to a project
- related message thread references one likely target

### Needs review

Use when evidence is weak or conflicting:

- executive meeting covers multiple projects
- operations meeting covers multiple projects
- vague references like "the job" or "that project"
- multiple plausible projects
- source record is mostly about a company process
- source record is mostly about an internal initiative

## Open Decisions

These still need to be decided:

1. Final database table names for Insight Cards and intelligence packets.
2. Whether internal initiatives live in a new table or reuse a generalized target model.
3. How much confidence is required before a card updates a packet automatically.
4. Whether packet generation is stored as snapshots, current-state rows, or both.
5. How the assistant should show uncertainty to the user without sounding weak or robotic.
6. How human review should approve, reject, or correct candidate attribution.
7. How source evidence should be displayed in the UI without clutter.

## Recommended Implementation Path

### Phase 1: Planning and gold standards

- Finalize Insight Card schema.
- Finalize Intelligence Packet schema.
- Manually create one JobPlanner Replacement packet.
- Manually create one Westfield Collective client project packet.
- Use Union Collective only as a secondary attribution example unless stronger project-specific source data is added.
- Use those as the target output for the compiler.

### Phase 2: Storage

- Add tables for internal initiatives.
- Add tables for insight cards.
- Add tables for source-to-target attribution.
- Add review status and confidence fields.
- Preserve source document IDs for traceability.

Storage model draft:

- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)

### Phase 3: Compiler

- Build a scheduled compiler that reads new records.
- Extract insight cards.
- Assign targets with confidence.
- Add uncertain records to review queue.
- Update current intelligence packets.

Compiler and assistant behavior draft:

- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)

### Phase 4: Assistant integration

- Add intent router.
- Load packet before raw RAG for briefing/advisor questions.
- Use raw RAG for evidence, source lookup, and deeper investigation.
- Make responses separate facts, inferences, risks, and recommendations.

### Phase 5: Review workflow and evals

- Add UI for candidate attribution review.
- Add packet freshness checks.
- Add evals for "strategic advisor" answer quality.
- Add failure modes when source coverage is thin, stale, or broken.

## Current Working Summary

The assistant will close the quality gap when it stops acting like a tool runner and starts acting like a prepared advisor.

The core change is not just better retrieval. The core change is a source compiler that creates durable intelligence cards and current packets for each project and internal initiative.

RAG remains important, but it becomes supporting evidence instead of the primary brain.
