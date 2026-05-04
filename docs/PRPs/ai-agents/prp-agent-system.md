# AI Agent System — Construction Document Intelligence

**Date:** 2026-05-03
**Status:** Implementation Plan
**Owner:** Alleato Engineering

---

## Overview

This PRP defines the agent architecture for Alleato's construction document intelligence
system. The goal is to move from reactive query-answering to proactive document review,
change detection, and institutional learning — without requiring Brandon's involvement
to get started.

The foundation (230-table Supabase schema, `document_chunks` with 24K+ rows, RAG
pipeline, Commander Agent with 20+ tools) is complete. This plan layers agents on top.

---

## Core Principle: Agents vs Tools

**Agent** — has its own system prompt, context window, and reasoning loop. Runs
independently and can be invoked by the Commander Agent or on a schedule.

**Tool** — a function that fetches data or performs an action. No reasoning of its own.
Called by an agent and returns a result.

The existing chat route (`/api/ai-assistant/chat`) IS the Commander Agent. Everything
below extends it without replacing it.

---

## Architecture

```
Commander Agent  (/api/ai-assistant/chat — existing)
├── Existing tools (semanticSearch, queryBudgetData, createRFI, etc.)
│
├── NEW Phase 1 Tools (added to Commander Agent)
│   ├── getSubmittalLog
│   ├── getSpecRequirements
│   ├── detectMissingSubmittals
│   └── reviewDocument  →  calls Document Intelligence Agent
│
├── NEW Phase 2: Document Intelligence Agent  (/api/ai-assistant/document-review)
│   └── Submittal × Spec × Drawing comparison pipeline
│
├── NEW Phase 3: Change Event Detection Agent  (/api/ai-assistant/change-detection)
│   └── Cron-triggered monitor for RFIs, field notes, meetings, drawing revisions
│
└── Existing scheduled agents (Daily Briefing, Progress Report — already built)
```

---

## Phase 1 — New Tools in Commander Agent

**Goal:** Give the existing Commander Agent visibility into submittals and specs so users
can ask "what submittals are missing for this project?" and get a real answer.

No new agent route needed. These are tool functions added to the existing tool registry.

### Tool: `getSubmittalLog`

Fetches the submittal register for a project.

```typescript
// Input
{ projectId: number }

// Output
{
  required: SubmittalItem[];   // from spec/contract requirements
  submitted: SubmittalItem[];  // what has been received
  approved: SubmittalItem[];   // what has been approved
  pending: SubmittalItem[];    // received but not yet reviewed
  missing: SubmittalItem[];    // required but never received
}

interface SubmittalItem {
  id: string;
  title: string;
  specSection: string;         // e.g., "15100 — HVAC Equipment"
  trade: string;
  status: "required" | "submitted" | "approved" | "rejected" | "missing";
  dueDate: string | null;
  submittedDate: string | null;
  approvedDate: string | null;
  vendor: string | null;
}
```

**Data source:** `submittals` table in Supabase. If `submittals` table is sparse,
supplement with `document_metadata` filtered to `type = 'submittal'`.

---

### Tool: `getSpecRequirements`

RAG search over spec sections. Returns a structured requirement list for a given
trade, spec section, or product type.

```typescript
// Input
{ query: string; projectId?: number; topK?: number }

// Output
{
  requirements: SpecRequirement[];
  sourceChunks: string[];  // document_chunks IDs used
}

interface SpecRequirement {
  id: string;
  text: string;               // exact requirement text
  requirementType:            // classification
    | "material"
    | "manufacturer"
    | "performance"
    | "documentation"
    | "code_reference"
    | "installation"
    | "warranty";
  specSection: string;        // e.g., "15100"
  specTitle: string;          // e.g., "HVAC Equipment"
  source: string;             // document title
  confidence: number;         // 0–1
}
```

**Data source:** `document_chunks` table via pgvector similarity search. Filter by
`source_type = 'specification'` or `category = 'spec'`.

---

### Tool: `detectMissingSubmittals`

Cross-references the spec requirement list against the submittal log. Returns gaps.

```typescript
// Input
{ projectId: number; specSections?: string[] }

// Output
{
  missingCount: number;
  missing: MissingSubmittal[];
  partialCount: number;
  partial: PartialSubmittal[];  // submitted but incomplete
}

interface MissingSubmittal {
  specSection: string;
  requirementSummary: string;
  trade: string;
  urgency: "critical" | "high" | "medium" | "low";
  daysUntilNeeded: number | null;
}
```

**Logic:** Calls `getSubmittalLog` + `getSpecRequirements` internally, then compares.
Does not use LLM for the comparison — deterministic cross-reference.

---

### Tool: `reviewDocument`

Invokes the Document Intelligence Agent (Phase 2) and returns its structured report.
This is the bridge between the Commander Agent and the specialist agent.

```typescript
// Input
{
  submittalId?: string;        // existing submittal record
  documentUrl?: string;        // OneDrive URL or storage path
  specSections?: string[];     // which spec sections to compare against
  projectId: number;
}

// Output
{
  reportId: string;            // stored in ai_review_feedback
  summary: string;
  requirementsChecked: number;
  matchCount: number;
  missingCount: number;
  conflictCount: number;
  unclearCount: number;
  findings: ReviewFinding[];
  suggestedQuestions: string[];
  recommendedAction: "looks_consistent" | "needs_clarification" | "missing_info" | "conflict_found" | "human_review_required";
}
```

---

### Tool: `logFeedback`

Records human corrections to AI document reviews. Feeds the learning loop.

```typescript
// Input
{
  reviewId: string;
  finding: string;              // the AI's finding being corrected
  feedbackCategory:
    | "correct"
    | "missed_requirement"
    | "wrong_document_match"
    | "bad_interpretation"
    | "hallucinated_issue"
    | "too_vague"
    | "useful_low_priority"
    | "needs_expert_review";
  correctedStatus?: string;
  correctedReason?: string;
  sourceOfTruthReference?: string;
}
```

---

## Phase 1 — Database: `ai_review_feedback` Table

**Migration:** `supabase/migrations/20260503_ai_review_feedback.sql`

```sql
create table ai_review_feedback (
  id                      uuid primary key default gen_random_uuid(),
  project_id              integer references projects(id),
  document_id             text,                   -- document_metadata.id or submittal id
  review_type             text not null,          -- 'submittal_review', 'spec_comparison', etc.
  ai_finding              text not null,          -- what the AI said
  ai_status               text not null,          -- match | missing | conflict | unclear
  ai_confidence           float,                  -- 0–1
  human_feedback          text,                   -- what the human corrected it to
  feedback_category       text,                   -- enum above
  corrected_status        text,
  corrected_reason        text,
  source_of_truth_ref     text,                   -- document/section that settles it
  created_by              uuid references auth.users(id),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index on ai_review_feedback (project_id);
create index on ai_review_feedback (document_id);
create index on ai_review_feedback (feedback_category);
```

This table is the learning loop. Every Document Intelligence Agent review writes a row.
Every human correction updates it. Over time, patterns emerge about what the AI gets
wrong (bad spec section matching, hallucinated manufacturer requirements, etc.) that
feed prompt and retrieval improvements.

---

## Phase 2 — Document Intelligence Agent

**Route:** `POST /api/ai-assistant/document-review`

This is a separate API route with its own system prompt. It is NOT a conversational
agent — it takes a document + context and returns a structured review report. The
Commander Agent calls it via `reviewDocument` tool.

### Why a separate agent (not a tool)

- Needs its own long context window (multiple documents simultaneously)
- Has domain-specific system prompt distinct from the Commander Agent
- Runs a multi-step pipeline (extract requirements → extract claims → compare → score)
- Expensive enough that it should not block the main chat stream

### System Prompt

```
You are a construction document review specialist. Your job is to compare a submitted
document against project specification requirements and flag anything that needs human
review.

You are NOT approving or rejecting submittals. You are pre-reviewing them to surface
issues for the human reviewer.

For every finding:
1. Cite the exact source document and section
2. Quote or summarize the requirement
3. Identify the submitted value or evidence
4. Mark match status: Match | Missing | Conflict | Unclear | Not Applicable
5. Assign confidence 0–1
6. Recommend next action

Rules:
- Only mark Match if you have explicit evidence. Absence of contradiction is NOT evidence of compliance.
- If evidence is not found, mark Missing or Unclear — never infer compliance
- Never invent requirements. If it is not in the spec, do not list it
- Quote exact text from documents rather than paraphrasing when possible
```

### Comparison Pipeline

```
1. Parse submittal
   └── Extract: product name, manufacturer, model, spec values, certifications,
                submitted documentation types, any deviation notices

2. Identify applicable spec sections
   └── Search document_chunks for matching spec content
   └── Filter: same project, type=specification, matching CSI division

3. Extract requirements from spec
   └── LLM structures requirements into typed list (material, manufacturer,
       performance, documentation, code_reference, installation, warranty)

4. Cross-reference drawings (if available)
   └── Search document_chunks for relevant drawing references
   └── Check: quantities, locations, dimensions, equipment tags

5. Pull RFI and meeting context
   └── searchMeetingsByTopic + searchEmails for same product/system
   └── Surface any prior decisions or clarifications

6. Generate comparison matrix
   └── For each requirement: find evidence in submittal → classify → score

7. Write to ai_review_feedback
   └── One row per finding

8. Return structured report
```

### Response Shape

```typescript
{
  reportId: string;
  projectId: number;
  submittalTitle: string;
  specSectionsReviewed: string[];
  drawingSheetsReviewed: string[];
  priorRFIsFound: number;

  summary: {
    requirementsChecked: number;
    matchCount: number;
    missingCount: number;
    conflictCount: number;
    unclearCount: number;
    overallConfidence: number;
  };

  findings: Array<{
    requirementText: string;
    requirementType: string;
    specSection: string;
    submittedValue: string | null;
    evidenceQuote: string | null;
    evidencePage: string | null;
    status: "Match" | "Missing" | "Conflict" | "Unclear" | "Not Applicable";
    confidence: number;
    notes: string | null;
  }>;

  suggestedQuestions: string[];  // questions for the reviewer to ask the sub

  recommendedAction:
    | "looks_consistent"        // all requirements satisfied
    | "needs_clarification"     // unclear items need follow-up
    | "missing_info"            // documentation gaps
    | "conflict_found"          // direct contradictions
    | "human_review_required";  // agent not confident enough to classify
}
```

---

## Phase 3 — Change Event Detection Agent

**Route:** `POST /api/ai-assistant/change-detection`
**Trigger:** Cron job (daily at 6am) + manual trigger via Commander Agent tool

This agent monitors project documents for conditions that may constitute a change
event: scope changes, differing site conditions, owner-directed changes, design errors,
and ambiguous contract language.

### Why a separate agent

- Runs on a schedule, not in response to a user query
- Has its own monitoring scope and thresholds
- Writes flagged conditions to the DB for human review
- Should not consume the Commander Agent's context or token budget

### What it monitors

| Source | What it looks for |
|--------|-------------------|
| New RFIs | Questions that imply scope beyond contract |
| Meeting transcripts | Phrases: "that wasn't in our scope", "owner requested", "unforeseen condition" |
| Field daily reports | Issues, delays, site conditions, weather impacts |
| Drawing revisions | Delta drawings issued after contract execution |
| Emails | Owner or design team requests that imply scope change |
| Change order log | Unpriced events older than 14 days |

### Output

Writes to a `change_event_candidates` table (or existing `change_events` table with a
`source = 'ai_detection'` flag):

```sql
-- Fields to add to change_events or new table
ai_detected        boolean default false,
ai_detection_date  timestamptz,
ai_evidence        text[],     -- source document IDs that triggered detection
ai_confidence      float,      -- 0–1
ai_reasoning       text,       -- why the agent thinks this is a change event
human_reviewed     boolean default false,
human_decision     text        -- 'confirmed_change' | 'not_a_change' | 'needs_more_info'
```

Commander Agent surfaces these with `flagChangeCondition` tool when users ask about
change event exposure.

---

## Commander Agent Prompt Updates

Add to the system prompt's tool selection table:

```
| "Are there missing submittals?" / "What submittals do we need?" | getSubmittalLog + detectMissingSubmittals |
| "Review this submittal" / "Check this against the spec" | reviewDocument |
| "What change events might we be missing?" | flagChangeCondition (reads ai_detected=true rows) |
```

Add to the write actions section:

```
| "Log my correction to that review" / "That finding was wrong because..." | logFeedback |
```

---

## Build Order

### Phase 1 (build first — no new routes needed)

1. Create migration: `ai_review_feedback` table
2. Add `getSubmittalLog` tool — query `submittals` table
3. Add `getSpecRequirements` tool — pgvector search on `document_chunks`
4. Add `detectMissingSubmittals` tool — cross-reference logic
5. Add `logFeedback` tool — write to `ai_review_feedback`
6. Add stub `reviewDocument` tool — returns placeholder until Phase 2 is built
7. Update Commander Agent system prompt with new tool routing instructions
8. Test: "What submittals are missing for Vermillion Rise?" should return real data

### Phase 2 (after Phase 1 is stable)

1. Create `/api/ai-assistant/document-review` route
2. Implement comparison pipeline (extract → cross-reference → classify → score)
3. Wire `reviewDocument` tool to call the new route
4. Test with one real submittal + one real spec section
5. Build simple review UI (optional — Commander Agent can surface findings in chat)

### Phase 3 (after Phase 2 is shipping)

1. Design `change_event_candidates` schema (or extend `change_events`)
2. Create `/api/ai-assistant/change-detection` route
3. Create cron job trigger (`/api/admin/cron/change-detection`)
4. Wire `flagChangeCondition` tool in Commander Agent
5. Test: run against Vermillion Rise, verify flagged conditions look real

---

## Test Scenarios

### Phase 1

| Prompt | Expected behavior |
|--------|------------------|
| "What submittals are missing for Vermillion Rise?" | Calls `getSubmittalLog` + `detectMissingSubmittals`, returns gap list |
| "What does the spec require for HVAC equipment?" | Calls `getSpecRequirements`, returns typed requirement list with citations |
| "I corrected that — it was a hallucinated issue" | Calls `logFeedback`, writes to `ai_review_feedback` |

### Phase 2

| Input | Expected behavior |
|-------|-----------------|
| Single submittal PDF + spec section | Returns requirements matrix with Match/Missing/Conflict for each requirement |
| Submittal with 175 PSI pipe vs spec requiring 300 PSI minimum | Flags as Conflict with confidence ≥ 0.9 |
| Submittal missing installation instructions | Flags as Missing (documentation type) |
| Manufacturer "ABC Fire Products" vs spec "Victaulic or approved equal" | Flags as Unclear, suggests reviewer question |

### Phase 3

| Scenario | Expected behavior |
|----------|-----------------|
| RFI asking about work not in drawings | Agent flags as potential change event candidate |
| Meeting transcript with "owner requested additional lighting" | Flagged, evidence quoted, confidence ≥ 0.8 |
| Daily report noting unforeseen rock at grade | Flagged as potential differing site condition |

---

## Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260503_ai_review_feedback.sql` | Learning loop table |
| `frontend/src/lib/ai/tools/document-intelligence.ts` | Phase 1 tools |
| `frontend/src/app/api/ai-assistant/document-review/route.ts` | Phase 2 agent route |
| `frontend/src/app/api/ai-assistant/change-detection/route.ts` | Phase 3 agent route |
| `frontend/src/app/api/admin/cron/change-detection/route.ts` | Phase 3 cron trigger |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | Add new tool routing instructions |
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Register Phase 1 tools |

---

## Success Criteria

**Phase 1 complete when:**
- Commander Agent can answer "What submittals are missing for [project]?" with real data
- `ai_review_feedback` table exists and `logFeedback` writes to it
- `getSpecRequirements` returns typed requirements from `document_chunks`

**Phase 2 complete when:**
- One real submittal reviewed against one real spec section
- Report correctly identifies at least one Missing or Conflict finding
- Finding is stored in `ai_review_feedback`
- A human can correct it via `logFeedback`

**Phase 3 complete when:**
- Cron runs daily and writes flagged candidates to DB
- Commander Agent surfaces flagged conditions when asked about change event exposure
- Human can confirm or dismiss each flagged condition

---

## Open Questions

1. **Spec documents in `document_chunks`?** Are OneDrive spec PDFs already chunked and
   embedded, or do they need to be ingested first? The Phase 1 `getSpecRequirements` tool
   depends on this. Check: `select count(*) from document_chunks where source_type = 'specification'`.

2. **Submittal records in `submittals` table?** How populated is this table? If sparse,
   `getSubmittalLog` may need to fall back to `document_metadata` filtered by type.

3. **Teams data gap.** The highest-signal unarchived data (phone calls, texts, field
   conversations) is not yet in the system. A lightweight interim fix: require field
   staff to leave a 30-second voice note after hard conversations, auto-transcribed via
   Fireflies. This feeds the Change Event Detection Agent with the most critical signals.

4. **Brandon involvement for estimating.** Estimating is Phase 4+ and requires his
   tribal knowledge. Do not block the above three phases on his availability. The
   Document Intelligence Agent builds trust on its own.
