# Source Synthesis Operating Record Spec

This spec defines the missing layer between raw source ingestion and the current card/packet/report surfaces.

The goal is to make full-source AI synthesis reusable across:

- Project Intelligence pages
- Brandon's executive daily brief
- Project/team daily reports and daily logs
- Weekly progress reports
- Task generation
- Proactive change-event detection
- AI assistant strategic answers

The manual proof run is here:

- `docs/ai-plan/rag-pipeline/manual-runs/2026-06-17-source-synthesis-dry-run.md`

## Problem Statement

The existing pipeline can ingest, chunk, embed, assign projects, create candidates, promote insight cards, and refresh packets. That is necessary but not sufficient.

The valuable manual workflow was different:

1. Read the full transcript/source.
2. Understand the whole context.
3. Synthesize what changed.
4. Extract actions, risks, commitments, decisions, financial signals, and change-event signals.
5. Produce a useful project brief.

The system currently leans too heavily on cards, chunks, and packets as the primary intelligence source. Those are useful structures, but they are lossy if the full source was never synthesized first.

## Product Principle

One full-source synthesis should be created once and reused many times.

Do not separately ask AI to summarize the same meeting for Project Intelligence, then again for Brandon's brief, then again for the daily log, then again for the weekly progress report.

Instead:

1. Source synthesis captures the source truth.
2. Project daily delta captures what changed for the project.
3. Project operating record keeps the durable current and historical state.
4. Downstream views filter and format the same intelligence for different audiences.

## End-To-End Flow

### Stage 1. Source Intake

Inputs:

- Fireflies transcripts
- Outlook emails and email threads
- Teams messages and Teams threads
- OneDrive/SharePoint documents
- Email attachments
- Field daily logs
- Photos
- Existing app database changes
- Acumatica financial sync snapshots
- Project database snapshots: budget, commitments, change events, change orders, RFIs, submittals, drawings, schedule, invoices, daily logs, and progress reports

Required behavior:

- Store raw source content.
- Normalize source metadata.
- Assign or flag project.
- Mark source family.
- Preserve source URL and evidence identity.
- Fail loudly when source content is only a shell.

Example from manual run:

- `Hillsdale Holdings // Alleato Weekly` had no transcript marker and user confirmed it did not happen. It was marked `deleted_no_transcript` instead of being allowed to pollute RAG health or the daily brief.

### Stage 2. Vectorization

Inputs:

- Raw/full source content.

Outputs:

- `document_chunks` rows with embeddings.
- `rag_document_metadata.embedding_status`.
- Source lifecycle records.

Required behavior:

- Full Fireflies transcripts must create `source_type='meeting_transcript'` chunks.
- Emails, Teams, and docs must have embedded chunks or a terminal reason.
- OCR failures must be visible and carried into confidence warnings.

This stage is for retrieval. It is not the same as synthesis.

### Stage 3. Source-Level Synthesis

This is the missing layer.

One row per meaningful source or source thread.

Proposed table: `source_syntheses`.

Fields:

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `source_document_id` | App/RAG source id |
| `source_family` | `fireflies`, `outlook_email`, `teams`, `onedrive_document`, `daily_log`, etc. |
| `project_id` | Assigned project |
| `source_occurred_at` | Actual event/message/document date |
| `source_title` | Human title |
| `full_source_hash` | Detect content changes |
| `synthesis_model` | Model used |
| `synthesis_status` | `pending`, `succeeded`, `failed`, `skipped_no_content`, `needs_project_review` |
| `executive_summary` | Rich source summary |
| `what_changed` | New facts since prior state |
| `decisions` | Decisions made or needed |
| `risks` | Risks/issues/blockers |
| `commitments` | Promises and commitments |
| `tasks` | Action candidates |
| `financial_signals` | Budget, cost, invoice, margin, payment, exposure signals |
| `schedule_signals` | Dates, milestones, delays, inspections |
| `change_event_signals` | Potential change-event evidence |
| `daily_log_signals` | Field-reportable work, manpower, deliveries, inspections, blockers |
| `progress_report_signals` | Weekly progress-report-ready bullets |
| `confidence` | `high`, `medium`, `low` |
| `confidence_notes` | Missing source, OCR failure, partial transcript, project mismatch, etc. |
| `source_quotes` | Key excerpts with timestamps where available |
| `created_at` / `updated_at` | Audit |

Use:

- Project Intelligence reads this as the source truth before cards.
- Daily brief reads this for "what matters today."
- Progress reports read this for weekly highlights/upcoming/open items.
- Daily logs read this for field/project report drafts.
- Assistant uses this for fast source-aware answers and drills into transcript/chunks only when needed.

### Stage 4. Project Daily Delta

One row per project per day.

Proposed table: `project_daily_deltas`.

Fields:

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `project_id` | Project |
| `business_date` | Date |
| `source_synthesis_ids` | Sources included |
| `database_snapshot_id` | Structured data snapshot used |
| `headline` | Daily project headline |
| `what_changed` | New project-level changes |
| `decisions` | Decisions made/needed |
| `risks` | Current/new risks |
| `issues` | Issues/blockers |
| `milestones` | Milestone movement |
| `financial_changes` | Cost/budget/change/payment movement |
| `schedule_changes` | Dates/delays/recovery |
| `change_event_candidates` | Candidate ids or inline candidates |
| `task_candidates` | Candidate ids or inline candidates |
| `daily_report_draft` | Draft daily report content |
| `progress_report_updates` | Weekly report contribution |
| `confidence` | Overall confidence |
| `source_coverage` | Counts/gaps by source family |

Use:

- Project Intelligence "What changed since last update."
- Daily brief project sections.
- Progress report weekly accumulation.
- Daily report generation.

### Stage 5. Structured Database Snapshot

Project Intelligence must include authoritative data, not only source synthesis.

Proposed table: `project_operating_snapshots`.

Created during each daily project delta or refreshed on demand.

Required data:

- Project name, number, client
- Start date
- Substantial completion date
- Schedule/milestones
- Budget
- Original budget
- Current budget
- Committed costs
- Actual costs
- Forecast to complete
- Estimated cost at completion
- Project over/under
- Current projected profit/margin
- Remaining buyout
- Commitments
- Commitment change orders
- Prime contract change orders
- Change events
- PCOs/PCCOs
- Open/closed RFIs
- Open/closed submittals
- Drawings and revisions
- Invoices/pay applications
- Daily logs
- Progress reports
- Acumatica sync timestamp and financial source status
- Database snapshot freshness by subsystem
- Known gaps or stale sync warnings

Use:

- Project Intelligence top snapshot.
- Brandon brief financial confidence.
- Progress report project information and open item sections.
- Assistant financial/project-manager answers.
- Daily report context when field activity needs to be interpreted against current project state.

Rule:

AI may interpret this data, but it must not invent it.

Snapshot contract:

- Financial totals must come from app/Acumatica-backed database fields, not transcript language.
- Counts must include open and closed statuses where operationally meaningful: RFIs, submittals, change events, change orders, daily logs, progress reports, drawings, commitments, and invoices.
- Dates must include start date, substantial completion date, and the latest available schedule milestone set.
- Each snapshot must carry source timestamps so stale Acumatica or app data is visible to the user and to the assistant.

### Stage 6. Timeline Event Generation

The Project Intelligence page should be a running project timeline in reverse chronological order.

Proposed table: `project_intelligence_timeline_events`.

Fields:

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `project_id` | Project |
| `event_at` | Date/time event occurred |
| `event_type` | `decision`, `risk`, `issue`, `milestone`, `idea`, `cost_exposure`, `schedule_impact`, `change_event_signal`, `client_concern`, `daily_log`, `progress_update`, `rfi`, `submittal`, `drawing`, `commitment`, `financial` |
| `title` | Short headline |
| `summary` | What happened |
| `why_it_matters` | Operational impact |
| `current_status` | `open`, `resolved`, `monitoring`, `needs_decision`, `converted`, `dismissed` |
| `owner_label` | Suggested owner |
| `priority` | `urgent`, `high`, `medium`, `low` |
| `source_synthesis_id` | Source synthesis link |
| `source_document_id` | Raw source link |
| `related_event_ids` | Causal chain |
| `related_record_type` / `related_record_id` | RFI/submittal/CE/etc. link |
| `confidence` | Confidence |

Use:

- Project Intelligence timeline.
- Assistant historical reasoning.
- Change-event evidence chain.
- Progress report weekly history.
- Daily report generation when source-level events describe field work, blockers, manpower, inspections, or deliveries.

Timeline behavior:

- New events append.
- Prior events can be updated as resolved/worsened/unchanged.
- Related events create a causality chain.

Example:

1. Owner asks for patio concept.
2. Glass/accordion enclosure discussed.
3. Fire access/parking/FDC conflict appears.
4. Cost or scope conflict emerges.
5. AI flags change-event candidate.

### Stage 7. Change-Event Candidate Generation

Proposed table: `change_event_candidates`.

Fields:

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `project_id` | Project |
| `title` | Suggested change event title |
| `description` | Draft scope/issue description |
| `reason` | Why this may be a change event |
| `potential_cost_impact` | Text or amount |
| `potential_schedule_impact` | Text/date |
| `source_synthesis_ids` | Evidence sources |
| `timeline_event_ids` | Historical chain |
| `confidence` | Confidence |
| `missing_information` | What is needed before creating CE |
| `status` | `candidate`, `reviewing`, `draft_created`, `dismissed`, `converted` |
| `created_change_event_id` | If converted |

Project Intelligence UI:

- Show proactive candidates near the top.
- Button: `Create Change Event with AI`.
- Opens sidebar/modal prefilled with:
  - title
  - description
  - cause
  - source evidence
  - potential cost/schedule impact
  - missing information
  - related timeline
  - create/dismiss/needs-review actions

Rule:

AI creates candidates, not official change events. A user approves conversion.

### Stage 8. Project Current State

Proposed table: `project_current_state`.

One row per project.

Fields:

| Field | Purpose |
| --- | --- |
| `project_id` | Project |
| `current_summary` | Executive current read |
| `health_status` | `on_track`, `watch`, `at_risk`, `critical`, `unknown` |
| `what_changed_since_last_update` | Latest delta |
| `needs_attention` | Top active issues |
| `open_decisions` | Current decisions |
| `active_risks` | Current risks |
| `financial_read` | Current financial narrative |
| `schedule_read` | Current schedule narrative |
| `field_read` | Current field/jobsite narrative |
| `source_confidence` | Confidence and gaps |
| `last_delta_id` | Latest daily delta |
| `last_snapshot_id` | Latest database snapshot |
| `updated_at` | Last update |

Use:

- Top of Project Intelligence.
- AI assistant project briefing.
- Brandon daily brief.

### Stage 9. Report-Specific Outputs

The same daily project delta should feed multiple report outputs.

Do not re-read every full transcript separately for each report. Read the full source once, synthesize once, then render audience-specific outputs from the operating record.

Outputs:

| Output | Audience | Source |
| --- | --- | --- |
| Executive daily brief | Brandon and Megan | `project_daily_deltas`, `project_operating_snapshots`, urgent timeline events, Brandon email reviews |
| Project daily report draft | Project team / field admin | `daily_report_draft`, daily-log signals, field activity, blockers, inspections, deliveries, manpower notes |
| Field daily log assist | Field crew / PM | Source-level daily-log signals plus user-entered crew logs |
| Weekly progress report draft | Client / ownership / project team | Rolling `progress_report_updates`, structured snapshot, timeline events from the week |

Progress-report behavior:

- Keep a rolling week-to-date draft that updates as new source syntheses and snapshots arrive.
- Preserve the user-editable progress-report structure from the existing progress report page.
- Pull factual project metrics from `project_operating_snapshots`.
- Pull narrative bullets from `project_daily_deltas.progress_report_updates`.
- Pull risks, upcoming work, change exposure, RFIs, submittals, schedule, and financial changes from timeline events and the latest current state.
- Never overwrite user-edited report sections without storing the AI suggestion separately.

Daily-log behavior:

- Field crews still submit their own daily logs.
- The AI-generated daily report is a draft or assist layer, not a replacement for field-confirmed facts.
- If source synthesis identifies field activity without a submitted daily log, create a timeline event and a daily-log draft cue.

Proposed table: `project_report_suggestions`.

Fields:

| Field | Purpose |
| --- | --- |
| `id` | UUID |
| `project_id` | Project |
| `report_type` | `executive_daily_brief`, `project_daily_report`, `field_daily_log`, `weekly_progress_report` |
| `business_date` / `week_start_date` | Reporting period |
| `source_delta_id` | Project daily delta used |
| `source_snapshot_id` | Structured snapshot used |
| `title` | Suggestion title |
| `suggestion_payload` | Draft sections and structured recommendations |
| `source_timeline_event_ids` | Evidence events |
| `status` | `suggested`, `reviewing`, `applied`, `partially_applied`, `dismissed`, `superseded` |
| `applied_record_type` / `applied_record_id` | Daily log, progress report, or brief row created/updated |
| `reviewed_by` / `reviewed_at` | Human review audit |
| `confidence` | Confidence |

Rule:

AI suggestions can be applied to reports, but they should not silently overwrite human-authored daily logs or progress reports.

## Project Intelligence Page Layout

The page should reuse the normal app shell and avoid noisy dashboards. It should be information-dense but not decorative.

### Section 1. Operating Snapshot

Purpose:

Answer "where does this project stand right now?"

Content:

- Current summary
- Health status
- Last source update
- Last financial sync
- Project start and substantial completion date
- Schedule/milestone status
- Budget/current budget/committed/actual/forecast/EAC/over-under
- Open counts: RFIs, submittals, change events, PCOs/PCCOs, commitments, drawings, daily logs
- Source confidence warnings

### Section 2. What Changed

Purpose:

Show the latest daily delta.

Content:

- New decisions
- New risks/issues
- New financial changes
- New schedule changes
- New documents/drawings
- New client/team commitments

### Section 3. Needs Attention

Purpose:

Show actionable items that require a decision, escalation, or owner follow-up.

Content:

- Items from current state, daily delta, task candidates, and active cards
- Owner
- Due date if known
- Evidence
- Action buttons

### Section 4. Potential Change Events

Purpose:

Proactively surface change-event candidates before they become retroactive cleanup.

Content:

- Candidate title
- Why it may be a change
- Evidence
- Related timeline chain
- Confidence/missing info
- `Create Change Event with AI`

### Section 5. Reverse-Chronological Timeline

Purpose:

Make project history navigable and causal.

Default sort:

- Newest first.

Filters:

- Decisions
- Risks/issues
- Change-event signals
- Financial
- Schedule
- Daily logs
- RFIs/submittals/drawings
- Ideas/opportunities
- Client concerns

Each row:

- Date/time
- Type
- Headline
- Why it matters
- Current status
- Owner
- Source links
- Related prior events
- Actions

### Section 6. Source Drawer / Evidence

Purpose:

Open the actual evidence without leaving the page.

Content:

- Full source synthesis
- Source excerpts
- Transcript/email/document link
- Related chunks/evidence
- Confidence notes

## Downstream Consumers

### Brandon Executive Daily Brief

Audience:

Brandon.

Input:

- `project_current_state`
- latest `project_daily_deltas`
- `change_event_candidates`
- financial snapshot
- source confidence

Output:

- Needs Brandon
- Waiting on others
- Important updates
- Risk radar
- Cash/margin watch
- Recommended moves

Filter:

Only include items where Brandon needs to decide, escalate, approve, watch risk, or understand business impact.

### Daily Report / Daily Log Draft

Audience:

Project team / field documentation.

Input:

- `source_syntheses.daily_log_signals`
- field daily logs
- photos
- inspections
- manpower
- deliveries
- weather
- project daily delta

Output:

- Work performed today
- Manpower
- Deliveries/materials
- Inspections/tests
- Safety
- Delays/blockers
- Visitors
- Photos
- Next-day plan
- Source-linked notes

Rule:

Field crew still submits their own daily logs. AI can draft, reconcile, and flag missing details, but should not silently replace field reporting.

### Weekly Progress Report

Audience:

Client/project stakeholders.

Input:

- Week-to-date `project_daily_deltas`
- Project operating snapshots
- Daily logs
- Photos
- RFIs/submittals/change orders
- Schedule/milestone changes
- Progress report source snapshot

Output:

- Past week highlights
- Upcoming week activities
- Open items
- Budget/open items/financial table
- Photos
- RFI/submittal/change-order sections

Existing app surfaces:

- `frontend/src/app/(main)/[projectId]/progress-reports`
- `frontend/src/lib/progress-reports/server.ts`
- `frontend/src/components/domain/psr/*`

Rule:

The weekly progress report should update as the week progresses if the draft is still system-owned/cron-owned. Human-edited reports should not be overwritten; AI should suggest changes or show an "Apply latest intelligence" action.

### AI Assistant

Audience:

Internal users.

Input order:

1. Project current state.
2. Project daily deltas.
3. Timeline events.
4. Source syntheses.
5. Structured database snapshot.
6. Raw source/full transcript drilldown if needed.

Behavior:

- Strategic project questions should not start by loading every tool.
- Use the operating record first.
- Use full transcript/source only for high-stakes claims, exact details, or "show me why" questions.
- Always mention source confidence and stale/missing data.

## Model Usage Map

This follows the user's model preferences.

| Stage | Model |
| --- | --- |
| Source-level synthesis for important transcripts/emails/docs | `gpt-5.5 mini` for normal sources; escalate to `gpt-5.5` for high-stakes/long executive synthesis |
| Project daily delta | `gpt-5.4` |
| Project current state / Project Intelligence synthesis | `gpt-5.4` |
| Task/risk/urgent/change-order extraction | `gpt-5.5 mini` |
| Brandon email monitoring/drafts | `gpt-5.5` |
| Brandon morning/evening Teams brief | `gpt-5.5` |
| AI assistant strategist answers | `gpt-5.5` |
| Embeddings | `text-embedding-3-large`, 3072 dimensions |

Cost control:

- Run source synthesis once per content hash.
- Reuse synthesis artifacts everywhere.
- Do not regenerate daily brief/progress report from raw transcripts if source synthesis already exists.
- Do not load raw full transcripts into assistant unless user asks for detail or confidence requires it.
- Store token usage per synthesis row.

## Statuses

### `source_syntheses.synthesis_status`

- `pending`
- `running`
- `succeeded`
- `failed_retryable`
- `failed_permanent`
- `skipped_no_content`
- `needs_project_review`

### `project_daily_deltas.status`

- `pending`
- `running`
- `succeeded`
- `failed`
- `superseded`

### `project_intelligence_timeline_events.current_status`

- `open`
- `monitoring`
- `needs_decision`
- `resolved`
- `converted`
- `dismissed`

### `change_event_candidates.status`

- `candidate`
- `reviewing`
- `draft_created`
- `converted`
- `dismissed`

## Verification Gates

### Source Synthesis Gate

Pass criteria:

- Every meaningful source in the daily window has one `source_syntheses` row.
- Every skipped source has a terminal reason.
- Fireflies transcripts use full RAG transcript content, not only app summaries.
- OCR failures are reflected in confidence warnings.

### Project Delta Gate

Pass criteria:

- Every active project with meaningful daily source activity has a `project_daily_delta`.
- Delta references included source syntheses.
- Delta references the database snapshot used.

### Timeline Gate

Pass criteria:

- Important decisions, risks, issues, milestones, financial signals, schedule signals, and change-event signals create timeline events.
- Timeline events link to evidence.
- Related events can be chained.

### Change Event Candidate Gate

Pass criteria:

- Potential change-event signals create `change_event_candidates`.
- Candidate has evidence and missing-information fields.
- Candidate can be dismissed or converted.

### Report Reuse Gate

Pass criteria:

- Brandon daily brief, daily report draft, and progress report draft all cite the same source synthesis/delta ids.
- The same source is not independently re-summarized for each output.

### Cost Gate

Pass criteria:

- Source synthesis rows store content hash and model usage.
- Re-running the pipeline for unchanged source content is a no-op.
- Assistant project-status prompt uses operating record first, not a huge all-tools context.

## Implementation Sequence

### Slice 1. Tables and Statuses

Create:

- `source_syntheses`
- `project_operating_snapshots`
- `project_daily_deltas`
- `project_intelligence_timeline_events`
- `project_intelligence_timeline_event_sources`
- `change_event_candidates`

Add indexes:

- project/date
- source document id
- status
- event type
- related record

### Slice 2. Manual Run Importer

Turn the June 17 dry-run output into fixture data for two projects:

- Westfield OAC
- Sprinkler Huddle

Use this as acceptance data for UI and downstream report tests.

### Slice 3. Source Synthesis Worker

Build bounded worker:

- Select unsynthesized sources.
- Read full source content from RAG metadata.
- Generate source synthesis.
- Store row.
- Extract task/risk/change-event candidates.
- Fail loudly for no transcript/OCR/no project.

### Slice 4. Project Delta Worker

Build daily project delta:

- Load today's source syntheses by project.
- Load project operating snapshot.
- Compare prior project current state.
- Write delta.
- Append timeline events.
- Update current state.

### Slice 5. Project Intelligence UI

Refactor page around:

- Operating snapshot
- What changed
- Needs attention
- Potential change events
- Timeline
- Source drawer

### Slice 6. Downstream Outputs

Wire consumers:

- Brandon daily brief
- Daily report/daily log draft
- Weekly progress report draft/update
- AI assistant project-status context

### Slice 7. Verification and Cost Controls

Add gates:

- source synthesis coverage
- project delta coverage
- timeline evidence links
- change-event candidate coverage
- report reuse
- assistant context size/cost

## Explicit Non-Goals

- Do not replace existing progress report pages.
- Do not replace daily log submission by field crew.
- Do not auto-create official change events without user approval.
- Do not treat AI cards as the only intelligence source.
- Do not regenerate the same source repeatedly.
