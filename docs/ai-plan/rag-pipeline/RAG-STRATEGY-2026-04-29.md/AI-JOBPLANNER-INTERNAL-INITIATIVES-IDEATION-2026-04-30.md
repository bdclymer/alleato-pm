# AI and JobPlanner Internal Initiatives

Initial ideation and requirements document for turning data and operational-system conversations into durable product intelligence and actionable insights.

## Purpose

Alleato needs a way to learn from internal communications the same way the platform learns from client project communications.

The immediate use case is AI and JobPlanner:

- AI-related conversations show what the team is experimenting with and where automation could help.
- JobPlanner-related conversations show the operational pain Alleato is trying to replace with this application.
- Brandon and the team may not always be able to articulate requirements in a structured interview, so the system should compile needs from what they already say in Teams, email, and meetings.

The goal is not only to retrieve messages. The goal is to convert scattered communication into product needs, initiative status, risks, tasks, and evidence.

## Current Planning Surface

Planning page:

- [`frontend/src/app/(main)/intelligence-planning/page.tsx`](<../../frontend/src/app/(main)/intelligence-planning/page.tsx>)

Useful local views:

- [JobPlanner replacement, 180-day lookback](http://localhost:3000/intelligence-planning?theme=jobplanner-replacement&start=2025-11-01&end=2026-04-30&q=JobPlanner)
- [AI implementation, current week](http://localhost:3000/intelligence-planning?theme=ai-implementation&start=2026-04-27&end=2026-04-30)

Evidence artifacts:

- [`tests/agent-browser-runs/2026-04-29-intelligence-planning/VERIFICATION_SUMMARY.md`](../../tests/agent-browser-runs/2026-04-29-intelligence-planning/VERIFICATION_SUMMARY.md)
- [`tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-ai-filter.png`](../../tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-ai-filter.png)
- [`tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-jobplanner-filter.png`](../../tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-jobplanner-filter.png)
- [`tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-jobplanner-180d-product-needs.png`](../../tests/agent-browser-runs/2026-04-29-intelligence-planning/intelligence-planning-jobplanner-180d-product-needs.png)

Related strategy document:

- [`docs/ai-plan/AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md`](AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md)
- [`docs/ai-plan/RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md`](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [`docs/ai-plan/JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md`](JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md)
- [`docs/ai-plan/RAG-STORAGE-MODEL-V1-2026-04-30.md`](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [`docs/ai-plan/RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md`](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [`docs/ai-plan/RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md`](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)

## Recommended Lookback

For AI, JobPlanner, and other internal initiatives:

- 30 days: current operating picture.
- 90 days: recurring pain and near-term trend.
- 180 days: recommended default for product planning.
- 1 year: strategic history and infrequent repeated issues.

Recommendation: start with a 180-day backfill for AI and JobPlanner, then expand to one year after the tagging model is stable.

## What The Current Sample Shows

The 180-day JobPlanner replacement view currently surfaces:

- 14 matching records.
- 6 product-need groupings.
- 12 email signals and 2 Teams signals.
- 64% unmapped to a project.

Detected product needs include:

- Reduce JobPlanner admin and account friction.
- Keep project records current without manual chasing.
- Automatically sort incoming information to the right job.
- Update schedule progress from daily reports.
- Build internal AI capability around agents and workflow automation.

The Colin/Brandon Teams thread is especially important because it describes the desired future system in plain operational terms:

- Keep JobPlanner current.
- Let field personnel use the app as intended.
- Pull information from emails, SharePoint, daily reports, project contacts, drawings, submittals, RFIs, meeting minutes, and schedules.
- Test against real projects such as Allisonville and Union Collective.

## Product Direction

Treat internal initiatives like client projects.

Examples:

- AI Implementation.
- JobPlanner Replacement.
- Accounting Automation.
- Estimating and Quoting Improvements.
- Project Intelligence System.

Each initiative should have:

- Owner.
- Status.
- Current blockers.
- Related communications.
- Related client projects.
- Product needs.
- Tasks.
- Risks.
- Decisions.
- Evidence links.

This lets the assistant answer questions like:

- What is going on with JobPlanner replacement?
- What has Brandon asked for repeatedly?
- What workflows does the team expect AI to automate?
- Which project examples are being used for testing?
- What are the blockers?
- What product needs have enough evidence to prioritize?

## Requirements

### User-facing requirements

- Provide an internal-initiative dashboard similar in importance to project intelligence.
- Support filters for AI, JobPlanner, project attribution, change management, and future internal workstreams.
- Show source records from Teams, email, meetings, and documents.
- Group raw signals into product needs.
- Show evidence count and source mix for each product need.
- Show sentiment/risk/task cues.
- Show current project mapping and candidate project mapping.
- Allow longer lookbacks without making the page unusable.

### Intelligence requirements

- Do not force every communication into a client project.
- Allow one signal to belong to both an internal initiative and one or more client projects.
- Preserve evidence back to the original source document.
- Track confidence separately from final approval.
- Distinguish:
  - raw source document
  - extracted signal
  - initiative
  - product need
  - client project reference
  - task
  - risk
  - decision

### Retrieval requirements

- RAG should not be responsible for rediscovering this from scratch every time.
- Background compilation should create durable initiative/product intelligence.
- Chat should retrieve compiled initiative packets first, then raw source evidence second.
- Long lookbacks should rely on indexed date/source metadata and compiled records, not broad text scans over raw communications.

## Existing Supabase Tables Used Today

Current source-of-truth tables:

- `document_metadata`
  - Stores ingested emails, Teams summaries, meetings, documents, summaries, raw text, project assignment, sentiment, keywords, and source dates.
  - Type reference: [`frontend/src/types/database.types.ts`](../../frontend/src/types/database.types.ts)
- `document_chunks`
  - Stores chunked source text and embeddings for retrieval.
  - Type reference: [`frontend/src/types/database.types.ts`](../../frontend/src/types/database.types.ts)
- `projects`
  - Stores client projects, project numbers, aliases, and project metadata used for candidate matching.
  - Type reference: [`frontend/src/types/database.types.ts`](../../frontend/src/types/database.types.ts)

Generated/schema support files:

- [`frontend/src/types/database.types.ts`](../../frontend/src/types/database.types.ts)
- [`frontend/src/components/dev-tools/page-schema-fk.generated.ts`](../../frontend/src/components/dev-tools/page-schema-fk.generated.ts)

## Proposed Supabase Tables

### `internal_initiatives`

Purpose: durable internal workstreams, treated similarly to projects.

Suggested fields:

- `id`
- `name`
- `slug`
- `description`
- `status`
- `owner_person_id`
- `priority`
- `started_at`
- `last_signal_at`
- `summary`
- `created_at`
- `updated_at`

Example rows:

- AI Implementation
- JobPlanner Replacement
- Project Intelligence System
- Accounting Automation

### `initiative_signals`

**Purpose: one extracted signal from a source communication.**

Suggested fields:

- `id`
- `initiative_id`
- `source_document_id`
- `source_type`
- `occurred_at`
- `title`
- `summary`
- `signal_type`
- `sentiment`
- `confidence`
- `status`
- `evidence_excerpt`
- `created_at`

Signal types:

- product_need
- blocker
- task
- risk
- decision
- question
- requirement
- project_reference

### `initiative_signal_projects`

Purpose: many-to-many mapping between initiative signals and client projects.

Suggested fields:

- `id`
- `initiative_signal_id`
- `project_id`
- `confidence`
- `matched_terms`
- `status`
- `reviewed_by`
- `reviewed_at`

This is what allows one signal to be both:

- Internal initiative: JobPlanner Replacement
- Client project reference: Union Collective

### `product_needs`

Purpose: grouped product requirements inferred from multiple signals.

Suggested fields:

- `id`
- `initiative_id`
- `title`
- `problem`
- `desired_outcome`
- `build_direction`
- `priority`
- `confidence`
- `evidence_count`
- `status`
- `last_evidence_at`
- `created_at`
- `updated_at`

Example row:

- Title: Keep project records current without manual chasing.
- Problem: PMs and field staff cannot trust that JobPlanner/project systems are current.
- Desired outcome: data from emails, SharePoint, daily reports, meetings, contacts, drawings, submittals, and RFIs becomes project intelligence automatically.

### `product_need_evidence`

Purpose: links product needs back to source signals.

Suggested fields:

- `id`
- `product_need_id`
- `initiative_signal_id`
- `source_document_id`
- `evidence_role`
- `created_at`

Evidence roles:

- direct_requirement
- repeated_pain
- blocker
- project_example
- user_quote
- task

### `initiative_tags`

Purpose: stable taxonomy for query and routing.

Suggested fields:

- `id`
- `name`
- `slug`
- `description`

Example tags:

- ai
- jobplanner
- field-mobile
- project-attribution
- document-control
- schedule-progress
- daily-reports
- sharepoint
- project-contacts
- meeting-minutes
- api-integration

## Initial Workflow

1. Backfill 180 days of source communications for AI and JobPlanner.
2. Extract candidate initiative signals from `document_metadata`.
3. Attach each signal to an internal initiative.
4. Infer related projects when possible.
5. Group repeated signals into product needs.
6. Present needs in the planning page for review.
7. Let a reviewer confirm, reject, or edit the initiative/project/product-need assignment.
8. Use confirmed records as the source for assistant answers.

## Open Questions

- Should internal initiatives appear in the main project selector or in a separate initiative selector?
- Who should be allowed to review/approve inferred product needs?
- Should initiative signals be visible to all internal users or only leadership/admin?
- How much raw Teams/email content should be visible in the UI versus summarized evidence?
- Should the assistant proactively notify when a product need gets repeated evidence?

## Recommended Next Build Slice

Build the durable storage layer first:

1. Add `internal_initiatives`.
2. Add `initiative_signals`.
3. Add `initiative_signal_projects`.
4. Add `product_needs`.
5. Add `product_need_evidence`.

Then update the planning page so its compiler can write reviewed product needs instead of only calculating them live.
