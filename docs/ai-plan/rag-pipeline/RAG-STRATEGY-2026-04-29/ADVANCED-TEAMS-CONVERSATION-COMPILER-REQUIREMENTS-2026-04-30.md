# Advanced Teams Conversation Compiler Requirements

Date: 2026-04-30

Status: Initial requirements document

Related source table: `document_metadata`

Primary source type: `type = 'teams_dm_conversation'`

## Purpose

The Teams conversation compiler should turn raw Teams direct-message activity into useful project and business intelligence.

The current system already does part of this:

1. Microsoft Graph imports individual Teams messages.
2. The backend groups direct messages into daily conversation documents.
3. The generic document pipeline can generate an `overview`.
4. The assistant can search these records through RAG.

The gap is that the generic document pipeline is not designed for messy Teams conversations. It can summarize, but it does not reliably produce the kind of intelligence we need: project attribution, issue detection, task extraction, sentiment, root-cause signals, and business implications.

## Current Behavior

### What already exists

Teams direct messages are grouped into daily compiled records in `document_metadata`.

Important fields:

- `id`: stable compiled conversation/day ID, usually `teamsdm_<chat_hash>_<date>`
- `type`: `teams_dm_conversation`
- `category`: `teams_message`
- `source`: `microsoft_graph`
- `content`: raw compiled conversation text
- `overview`: AI-generated summary, when the full pipeline has run
- `project_id`: assigned project, when attribution exists
- `project`: project name, when attribution exists
- `participants`: conversation participants
- `date`: conversation date
- `status`: pipeline status
- `tags`: source/system/project assignment tags

The compiled conversation format is roughly:

```text
[Teams Direct Message Conversation: <chat name or chat id>]
Date: YYYY-MM-DD

[message:<id>] [YYYY-MM-DD HH:MM:SS] Person Name: message text
[message:<id>] [YYYY-MM-DD HH:MM:SS] Person Name: message text
```

### What the generic compiler does

The current generic compiler can:

- Generate an `overview`
- Create fallback `meeting_segments`
- Embed the content for RAG search
- Attempt structured extraction into tasks, risks, decisions, and insights

### Current limitations

The generic compiler is noisy for Teams conversations.

Observed during manual batch runs:

- Some segmentation calls returned invalid JSON.
- Some structured extraction calls returned non-JSON.
- The fallback path preserved an overview, but structured risks/tasks/decisions were often skipped.
- The generated summaries sometimes sound like generic document summaries instead of operational intelligence.
- Project attribution is still incomplete.
- Multi-project conversations are not split into separate project-specific extracts.

### Batch Evidence From 2026-04-30

Two controlled runs were completed against `teams_dm_conversation` rows that were missing `overview`.

Run 1:

- Batch size: 10
- Processed successfully: 10
- Result: `overview` count increased from 26 to 36
- Hard failures: 0
- Observed issue: repeated fallback behavior when segmentation or structured extraction returned non-JSON

Run 2:

- Batch size: 25
- Processed successfully: 25
- Result: `overview` count increased from 36 to 61
- Hard failures: 0
- Remaining rows missing overview after run: 419 total, 381 eligible by content length
- Observed issue: repeated fallback behavior continued across the batch

Attribution correction found during verification:

- Rows titled `Teams DM Conversation: Ulta Fresno` were incorrectly assigned to `Ulta Dallas`.
- 12 rows were corrected to project `761` / `Ulta Beauty Fresno`.
- Requirement: exact conversation title aliases must override stale or wrong inferred project IDs, and corrections should feed the attribution model.

## Target Outcome

The advanced compiler should create a trusted intelligence layer from Teams conversations.

The goal is not just:

> "Here is a summary of this chat."

The goal is:

> "Here is what this chat tells us about projects, risks, blockers, decisions, tasks, team sentiment, internal initiatives, and what leadership should pay attention to."

## Compiler Outputs

Each compiled Teams conversation should produce the following outputs.

### 1. Conversation Overview

A concise summary of what happened in the conversation.

Required fields:

- `overview`
- `conversation_topic`
- `primary_participants`
- `date_range`
- `source_message_count`
- `confidence`

Rules:

- Avoid filler phrases like "The document is a transcript..."
- Say what the conversation was actually about.
- Preserve uncertainty when the topic is unclear.

### 2. Project Attribution

The compiler must determine whether the conversation belongs to one or more projects.

Required fields:

- `project_id`
- `project_name`
- `attribution_confidence`
- `attribution_method`
- `evidence_terms`
- `candidate_projects`
- `needs_human_review`

Attribution methods:

- Exact project name match
- Job number match
- Known alias match
- Location match
- Participant/project-role association
- Source folder/path match
- Mention of client/vendor tied to a project
- Topic match against recent project packet
- Prior conversation continuity

Confidence rules:

- Auto-assign only when confidence is high.
- Use candidate attribution when multiple projects are plausible.
- Never force a single `project_id` for mixed-project meetings or broad operations conversations.
- Preserve multi-project relationships when the conversation clearly touches multiple jobs.
- If a specific source title contains a high-confidence project alias, that evidence should override a weaker stale or inferred assignment.
- If an existing `project_id` conflicts with stronger evidence, create a correction event or review item instead of silently preserving the wrong assignment.

### 3. Insight Cards

The compiler should generate project-specific insight cards when the conversation contains a meaningful signal.

Required fields:

- `target_type`: `client_project` or `internal_initiative`
- `target_id`
- `target_name`
- `insight_type`
- `severity`
- `summary`
- `strategic_read`
- `why_it_matters`
- `recommended_action`
- `watch_items`
- `source_document_ids`
- `source_message_ids`
- `confidence`

Insight types:

- Schedule risk
- Financial risk
- Change-order risk
- Procurement risk
- Field coordination issue
- Client/vendor relationship issue
- Decision needed
- Task/action item
- Internal initiative/product signal
- Process breakdown
- Root-cause signal
- Team sentiment signal

### 4. Tasks And Commitments

The compiler should extract action items and commitments.

Required fields:

- `task_text`
- `owner`
- `due_date`
- `project_id`
- `source_message_id`
- `status`
- `confidence`
- `needs_review`

Rules:

- Do not create tasks from vague chatter.
- Distinguish "someone mentioned doing something" from a real commitment.
- Preserve who asked for the task and who accepted it, when visible.
- If no owner is clear, mark `needs_review = true`.

### 5. Risks And Issues

The compiler should identify early warning signs.

Required fields:

- `risk_title`
- `risk_category`
- `severity`
- `project_id`
- `evidence`
- `likely_impact`
- `recommended_action`
- `confidence`
- `needs_review`

Risk categories:

- Schedule
- Cost
- Cash flow
- Subcontractor/vendor
- Owner/client
- Design coordination
- Permitting
- Procurement
- Quality/rework
- System/process
- People/communication

### 6. Decisions

The compiler should capture decisions and decision requests.

Required fields:

- `decision_text`
- `decision_status`: proposed, decided, blocked, reversed, needs approval
- `decider`
- `project_id`
- `source_message_id`
- `impact`
- `confidence`

### 7. Sentiment And Friction Signals

The compiler should detect tone that matters operationally.

Required fields:

- `sentiment`: positive, neutral, concerned, frustrated, urgent, conflict
- `sentiment_reason`
- `people_or_team_involved`
- `project_id`
- `business_implication`
- `confidence`

Examples:

- Repeated frustration with a tool or workflow
- A PM repeatedly chasing the same missing information
- A vendor/client seeming unhappy
- Leadership pressure escalating
- Team confusion over ownership

### 8. Internal Initiative Signals

The compiler should treat internal initiatives as first-class intelligence targets, similar to client projects.

Examples:

- Alleato AI
- JobPlanner Replacement
- Financial workflow cleanup
- Project attribution system
- Marketing/content operations
- Internal process improvement

Required fields:

- `initiative_id`
- `initiative_name`
- `signal_type`
- `summary`
- `strategic_read`
- `requested_capability`
- `pain_point`
- `source_message_ids`
- `recommended_product_requirement`

## Storage Requirements

The compiler should not only update `document_metadata.overview`.

It should write structured output to purpose-built tables or existing compatible tables.

Minimum storage targets:

- `document_metadata.overview`: readable conversation summary
- `document_metadata.project_id`: only for high-confidence single-project attribution
- `document_metadata.project`: project name for high-confidence single-project attribution
- `project_insights`: curated project insight cards
- `insights`: structured risks, decisions, opportunities, and issues
- `tasks`: reviewable action items
- Candidate attribution table: project attribution candidates and review state

Recommended candidate attribution fields:

- `source_document_id`
- `source_message_ids`
- `candidate_project_id`
- `candidate_project_name`
- `confidence`
- `evidence_terms`
- `reasoning`
- `status`: pending_review, approved, rejected, auto_assigned
- `reviewed_by`
- `reviewed_at`

## Review And Human Approval Requirements

The compiler must support human review.

Auto-write rules:

- Safe to auto-write `overview`.
- Safe to auto-write embeddings/chunks.
- Safe to auto-assign `project_id` only when confidence is high and no conflicting project evidence exists.
- Safe to create insight cards when confidence is high and source evidence is preserved.

Review-required rules:

- Mixed-project conversations
- Low-confidence project attribution
- Sensitive HR/personnel topics
- Financial claims without clear source context
- Tasks with no explicit owner
- Any write that would change project records, schedule, budget, or commitments

## Quality Bar

A good compiler output sounds like:

> This conversation suggests the project is not blocked yet, but the risk is forming around material delivery and installer sequencing. The formal project record may still look fine, but Teams traffic shows the dependency is moving faster than the schedule record.

A bad compiler output sounds like:

> This document is a Teams direct message conversation discussing project-related topics.

## Batch Processing Requirements

The compiler should run in bounded batches.

Recommended defaults:

- Batch size: 25-50 conversations
- Max retries per row: 2
- Skip rows below minimum useful content length
- Log failures with row ID, stage, and concise error
- Do not let one failed conversation stop the batch
- Track processed count, failed count, overview-created count, cards-created count, and candidate-attribution count

## Monitoring Requirements

The system should expose:

- Total `teams_dm_conversation` rows
- Rows with overview
- Rows missing overview
- Rows with project_id
- Rows with candidate project attribution
- Rows with insight cards generated
- Rows that failed compiler stage
- Last successful compiler run
- Average processing time per row

## Open Questions

1. Should Teams conversations be compiled daily, weekly, or both?
2. Should high-volume low-value chats be excluded automatically?
3. How should private/sensitive messages be permissioned in the assistant?
4. Should internal initiatives live in `projects`, `initiatives`, or both?
5. Should the compiler produce one card per conversation, or one card per project signal?
6. How should corrected human attribution feedback be fed back into future compiler runs?

## Recommended Implementation Direction

Build a dedicated Teams compiler instead of relying on the generic document parser.

The generic parser can remain a fallback, but the Teams-specific path should:

1. Read a compiled conversation/day document.
2. Normalize messages into structured message objects.
3. Identify projects, initiatives, people, dates, and topic clusters.
4. Split multi-project conversations into project-specific extracts.
5. Generate a concise overview.
6. Generate structured outputs: candidate attribution, insight cards, tasks, risks, decisions, sentiment.
7. Write safe fields automatically.
8. Put uncertain or high-impact outputs into a review queue.

This is the compiler that will make Teams data feel like a strategic asset instead of a searchable chat archive.
