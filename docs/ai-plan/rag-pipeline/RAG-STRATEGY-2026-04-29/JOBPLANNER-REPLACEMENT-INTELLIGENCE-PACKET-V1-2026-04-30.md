# JobPlanner Replacement Intelligence Packet V1

Date: 2026-04-30
Status: Gold-standard planning draft
Target type: Internal initiative
Target name: JobPlanner Replacement
Related initiative: AI Implementation

Related documents:

- [RAG Strategy Working Decisions](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [RAG Gold-Standard Chat Examples](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [AI and JobPlanner Internal Initiatives](AI-JOBPLANNER-INTERNAL-INITIATIVES-IDEATION-2026-04-30.md)
- [AI Assistant RAG Strategy](AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md)
- [Intelligence Planning page](../../frontend/src/app/(main)/intelligence-planning/page.tsx)

## Purpose

This document defines what a useful intelligence packet should contain for one target before the assistant answers strategic questions.

The packet is the briefing layer the assistant should read first when the user asks questions like:

- What is the latest on JobPlanner replacement?
- What does Brandon actually want from the new system?
- What workflows should we prioritize?
- What is blocked?
- What is the product opportunity?
- What source evidence supports this?

This is not meant to be a final report. It is the working model for what the compiler should generate and keep current.

## Packet Principle

The packet should not be a pile of retrieved messages.

It should be a current business briefing assembled from source-backed insight cards.

The assistant should be able to read this packet and answer like a prepared advisor:

1. Start with the current status.
2. Explain what changed.
3. Identify what matters.
4. Separate facts from inferences.
5. Name risks, blockers, and open questions.
6. Recommend the next move.
7. Cite source evidence when needed.

## Packet Format

Every project or internal initiative packet should contain these sections.

### 1. Packet metadata

Purpose: tell the assistant what this packet is and whether it is safe to rely on.

Required fields:

- `target_type`
- `target_id`
- `target_name`
- `packet_version`
- `generated_at`
- `covered_date_range`
- `source_window`
- `freshness_status`
- `confidence_summary`
- `source_coverage`
- `review_queue_count`

### 2. Executive summary

Purpose: give the assistant the answer it should lead with.

Required fields:

- `one_sentence_summary`
- `current_status`
- `strategic_read`
- `why_it_matters`

### 3. Recent changes

Purpose: tell the assistant what is new or newly important.

Required fields:

- `changed_at`
- `change_summary`
- `change_type`
- `evidence_refs`
- `confidence`

Change types:

- `new_signal`
- `status_change`
- `blocker_added`
- `blocker_removed`
- `decision_made`
- `risk_increased`
- `risk_decreased`
- `scope_clarified`

### 4. Active insight cards

Purpose: store the structured business claims that make the packet valuable.

Required groups:

- `product_needs`
- `risks`
- `blockers`
- `decisions`
- `tasks`
- `open_questions`
- `project_references`

Each card should include:

- `title`
- `type`
- `summary`
- `why_it_matters`
- `status`
- `confidence`
- `source_count`
- `people_involved`
- `suggested_owner`
- `next_action`
- `evidence_refs`
- `last_seen_at`

### 5. Evidence map

Purpose: keep the packet traceable without forcing the assistant to quote raw data every time.

Required fields:

- `source_type`
- `source_id`
- `source_title`
- `occurred_at`
- `participants`
- `excerpt_or_summary`
- `relevance_reason`
- `targets`
- `confidence`

### 6. Related targets

Purpose: support multi-target attribution.

Required fields:

- `target_type`
- `target_name`
- `relationship`
- `confidence`
- `reason`

Example relationships:

- `overlaps_with`
- `tested_on`
- `depends_on`
- `source_of_pain`
- `implementation_example`
- `vendor_platform`

### 7. Assistant response guidance

Purpose: tell the assistant how to use the packet.

Required fields:

- `default_answer_shape`
- `do_not_overstate`
- `ask_followup_when`
- `raw_sources_needed_when`
- `recommended_next_questions`

## Working Packet: JobPlanner Replacement

### Packet metadata

```yaml
target_type: internal_initiative
target_id: internal-initiative-jobplanner-replacement
target_name: JobPlanner Replacement
packet_version: v1
generated_at: 2026-04-30
covered_date_range:
  start: 2026-01-30
  end: 2026-04-30
source_window: 90-day planning sample, with 180-day lookback recommended for production backfill
freshness_status: working_sample
confidence_summary:
  high: 3
  medium: 4
  low: 2
  needs_review: true
source_coverage:
  email: present
  teams: present
  meetings: not_fully_reviewed
  documents: not_fully_reviewed
  daily_reports: not_connected_yet
  database: project candidates available
review_queue_count: unknown_until_compiler_backfill
```

### Executive summary

**One-sentence summary:** JobPlanner replacement is not just a request for a cleaner project-management app; the stronger signal is that Alleato needs a system that keeps project records current automatically from scattered operational sources.

**Current status:** Active internal initiative in discovery and requirements extraction.

**Strategic read:** The replacement should not only replicate JobPlanner features. It should solve the deeper operational problem: project information is spread across Teams, email, SharePoint, daily reports, drawings, RFIs, submittals, meeting minutes, schedules, and project contacts, and the team does not trust that one system is current.

**Why it matters:** If Alleato builds only a better interface, the same data-quality problem remains. The product opportunity is to build a project intelligence compiler that watches messy source systems, proposes structured project updates, and gives PMs and field users a current project record without manual chasing.

### Current status read

JobPlanner is functioning as both:

- an external system Alleato is frustrated with
- a forcing function that exposes what the replacement app must do better

The strongest product direction is:

> Build Alleato's replacement around automatic project intelligence, not around static manual data entry.

The system should be designed to:

- keep project records current
- sort incoming information to the right job
- make field information usable from a phone
- update schedules from field activity
- reduce admin friction around users, invoices, API access, and support
- create a review queue when attribution is uncertain

### Recent changes

#### Change 1: AI/plugin work revealed the real desired workflow

Type: `scope_clarified`

Summary: A Teams conversation about a JobPlanner API/plugin shifted the requirement from "replace JobPlanner" to "automate the work required to keep JobPlanner/project records current."

Evidence:

- Teams direct message conversation dated 2026-04-27 between Brandon Clymer and Colin Gillespie.
- Colin described a plugin intended to keep JobPlanner current.
- Brandon questioned whether the plugin could sort information from emails and upload it to the proper job.

Confidence: high

Product implication: The replacement system should include background intake and attribution, not only CRUD screens.

#### Change 2: Union Collective and Allisonville appeared as real testing examples

Type: `project_reference`

Summary: The JobPlanner/AI implementation conversation references real projects being used or considered for testing.

Evidence:

- Allisonville was mentioned as a project where invoicing contacts from emails were entered.
- Union Collective was mentioned as a project to test the process within JobPlanner.

Confidence: medium

Product implication: These projects should be used as candidate gold-standard datasets for validating project attribution and source-to-project linking.

#### Change 3: External-system admin friction is a separate product need

Type: `product_need`

Summary: Emails about JobPlanner users, contracted allotment, invoices, deactivation, API access, and support show that replacement value is not only feature parity. It also includes reducing vendor/platform administration drag.

Evidence:

- Email threads surfaced in the planning sample around JobPlanner users over contracted allotment.
- Email thread surfaced around API access and integration support.

Confidence: medium

Product implication: The new system should track external-system friction separately from product workflow requirements so leadership can see the real cost of staying on or integrating with a vendor platform.

## Active Insight Cards

### Product need: Keep project records current without manual chasing

Type: `product_need`

Status: open

Confidence: high

Summary: Project managers and field teams should be able to trust that contacts, drawings, meeting minutes, RFIs, submittals, and schedule data are current without manually searching emails, SharePoint, or JobPlanner.

Why it matters: This is the core replacement opportunity. If the system cannot keep project records current, it will recreate the same failure mode with a different interface.

People involved:

- Brandon Clymer
- Colin Gillespie
- likely project managers and field users

Suggested owner: Product / AI implementation lead

Next action: Define the background intake workflow that watches source systems and proposes project updates for approval.

Evidence refs:

- `teams:1777304701330` - plugin designed to keep JobPlanner current.
- `teams:1777304792504` - desire to access information from a phone instead of searching emails and SharePoint.
- `teams:1777305195465` - source systems include drawings, submittals, RFIs, schedules, project contacts, daily reports, and meeting minutes.

### Product need: Automatically sort incoming information to the proper job

Type: `product_need`

Status: open

Confidence: high

Summary: Alleato needs the system to identify what incoming information is, determine the proper job, and either file it or propose a reviewed update.

Why it matters: This is the bridge between raw communications and useful project intelligence. Without attribution, the assistant cannot reliably answer project-specific questions.

People involved:

- Brandon Clymer
- Colin Gillespie

Suggested owner: AI/data pipeline owner

Next action: Build attribution rules for exact project names, aliases, source thread context, people, locations, vendors, and project examples.

Evidence refs:

- `teams:1777305376734` - Brandon asks whether the plugin can go into emails, sort what information is, and upload it to the proper job.
- `teams:1777305461395` - Brandon asks whether sorting can be tested before plugging into JobPlanner.

### Product need: Make project information usable from a phone

Type: `product_need`

Status: open

Confidence: medium

Summary: Field users should not need to return to a desk or search through email and SharePoint to find current project information.

Why it matters: Field adoption depends on the system answering real questions quickly from mobile, not only storing documents somewhere.

People involved:

- Colin Gillespie
- field personnel

Suggested owner: Product / mobile workflow owner

Next action: Define a mobile project intelligence view with latest documents, current contacts, open questions, active RFIs/submittals, schedule status, and recent decisions.

Evidence refs:

- `teams:1777304792504` - Colin defines "current" as being able to access needed information from his phone instead of coming to a desk.

### Product need: Update schedule progress from daily reports

Type: `product_need`

Status: open

Confidence: medium

Summary: Completion percentages and schedule status should be pulled from daily reports and field activity rather than manually maintained after the fact.

Why it matters: Schedule intelligence is one of the clearest examples of turning source data into proactive project management.

People involved:

- Colin Gillespie
- field personnel
- project managers

Suggested owner: Schedule/workflow owner

Next action: Define how daily report text maps to schedule activities, completion percentages, exceptions, and reviewable updates.

Evidence refs:

- `teams:1777305195465` - Colin says a major goal is using daily reports to pull completion percentages and update the internal schedule.

### Product need: Reduce JobPlanner admin and account friction

Type: `product_need`

Status: open

Confidence: medium

Summary: JobPlanner creates administrative friction around user counts, invoices, account changes, API access, and support responsiveness.

Why it matters: Vendor admin drag should be counted as part of the replacement business case. It consumes leadership attention and creates hidden operating cost.

People involved:

- accounting/admin stakeholders
- JobPlanner support
- internal leadership

Suggested owner: Operations/admin owner

Next action: Track external-system friction as its own category so product replacement value includes both workflow improvements and admin cost reduction.

Evidence refs:

- Email thread: JobPlanner users over contracted allotment.
- Email thread: API access and integration support.

### Blocker: JobPlanner API/support dependency

Type: `blocker`

Status: open

Confidence: high

Summary: Progress on the plugin/demo depends on additional information from JobPlanner developers/support.

Why it matters: If Alleato relies on JobPlanner APIs for transition or integration, vendor responsiveness becomes a delivery risk.

People involved:

- Colin Gillespie
- Brandon Clymer
- JobPlanner support/developers

Suggested owner: Integration owner

Next action: Track what information is needed from JobPlanner, when it was requested, and what demo/workflow it blocks.

Evidence refs:

- `teams:1777308652315` - Colin says JobPlanner support redirected him to developers and he may need longer than Wednesday morning.
- `teams:1777304610760` - Colin says he needs more information before presenting.

### Task: Produce a working demo or recording

Type: `task`

Status: open

Confidence: high

Summary: Brandon asked to see the workflow in office and asked for a recording of it working.

Why it matters: This is a decision gate. A demo would clarify whether the concept is technically real and useful enough to prioritize.

People involved:

- Brandon Clymer
- Colin Gillespie

Suggested owner: Colin Gillespie

Next action: Capture the working process, document what works, what fails, and what is blocked by JobPlanner API/support.

Evidence refs:

- `teams:1777305508561` - Brandon asks whether Colin can record it working.
- `teams:1777305754038` - Brandon asks to see it Wednesday at 7am in the office.
- `teams:1777308652315` - Colin says he may need longer because JobPlanner support redirected him to developers.

### Open question: Should the replacement integrate with JobPlanner or supersede it?

Type: `open_question`

Status: needs_review

Confidence: medium

Summary: The conversation is currently framed around a JobPlanner plugin, but Alleato's broader strategy appears to be replacing JobPlanner with a more advanced application.

Why it matters: Integration and replacement are different product paths. The short-term plugin may be useful as a learning prototype, but the long-term strategy should avoid being constrained by JobPlanner's architecture.

People involved:

- Brandon Clymer
- Colin Gillespie
- product/AI implementation owner

Suggested owner: Leadership/product owner

Next action: Decide whether JobPlanner API work is a transition tool, a data source, or a dead-end dependency.

Evidence refs:

- `teams:1777304500715` - Brandon asks why Colin is asking JobPlanner for its API.
- `teams:1777304643893` - Brandon confirms Colin built a plugin designed to go into JobPlanner.

## Evidence Map

### Teams direct message: Brandon Clymer and Colin Gillespie, 2026-04-27

Source type: Teams direct message conversation

Known source marker: `Teams Direct Message Conversation: 19:737d4feb-`

Participants:

- Brandon Clymer
- Colin Gillespie

Relevant message IDs:

- `1777304500715`
- `1777304610760`
- `1777304643893`
- `1777304701330`
- `1777304792504`
- `1777305195465`
- `1777305376734`
- `1777305461395`
- `1777305508561`
- `1777305754038`
- `1777308652315`

Relevance reason:

This is the clearest source showing what the team actually wants: an automated system that keeps project information current, sorts information to the proper job, supports field/mobile access, and uses real projects for testing.

Targets:

- JobPlanner Replacement: high confidence
- AI Implementation: high confidence
- Union Collective: medium confidence
- Allisonville: medium confidence
- JobPlanner vendor platform: high confidence

### Email thread: JobPlanner users over contracted allotment

Source type: email

Known source marker: title from planning page sample

Relevance reason:

This source appears to show administrative friction around JobPlanner licensing/users/account management.

Targets:

- JobPlanner Replacement: medium confidence
- JobPlanner vendor platform: high confidence
- Operations/admin process: medium confidence

Needs review:

- Attach exact email source IDs from `document_metadata`.
- Confirm whether the issue is resolved or still active.

### Email thread: API access and integration support

Source type: email

Known source marker: title from planning page sample

Relevance reason:

This source appears to show friction or dependency around JobPlanner API access and integration support.

Targets:

- JobPlanner Replacement: medium confidence
- AI Implementation: medium confidence
- JobPlanner vendor platform: high confidence

Needs review:

- Attach exact email source IDs from `document_metadata`.
- Determine whether support delay blocks a demo, integration, or replacement planning.

## Related Targets

### AI Implementation

Relationship: overlaps_with

Confidence: high

Reason: The JobPlanner conversation is partly about automation, plugins, APIs, source intake, and AI-assisted project data maintenance.

### Union Collective

Relationship: tested_on

Confidence: medium

Reason: Colin mentioned getting with Andrew about running the process on the Union Collective project within JobPlanner for testing.

### Allisonville

Relationship: implementation_example

Confidence: medium

Reason: Colin said he had the process enter invoicing contacts from emails into the Allisonville project.

### JobPlanner

Relationship: vendor_platform

Confidence: high

Reason: The initiative is directly about JobPlanner limitations, API access, support, account friction, and replacement opportunity.

## Assistant Response Guidance

### Default answer shape for "What is the latest on JobPlanner replacement?"

The assistant should answer in this order:

1. Current status.
2. Biggest new signal.
3. Product implication.
4. Active blocker.
5. Recommended next decision.
6. Evidence summary.
7. Open questions or confidence caveat.

Example answer shape:

> The latest read is that JobPlanner replacement is really becoming a project-intelligence automation initiative, not just a replacement app. The strongest signal is the Brandon/Colin Teams thread from April 27, where the desired workflow is to keep project data current by pulling from emails, SharePoint, daily reports, project contacts, drawings, submittals, RFIs, meeting minutes, and schedules. The active blocker is JobPlanner API/support information, which may delay a demo. My recommended next move is to treat the plugin as a learning prototype, but define the replacement around automatic intake, project attribution, and reviewable project updates.

### What the assistant should not overstate

The assistant should not say:

- The replacement strategy has been formally approved.
- Union Collective is definitely the primary pilot project.
- All JobPlanner admin issues are unresolved.
- The plugin is production-ready.
- The current source coverage is complete.

The assistant can say:

- The source evidence points toward these product needs.
- Union Collective and Allisonville are candidate test examples.
- JobPlanner API/support appears to be a current blocker.
- The packet needs source ID attachment and review before being treated as final.

### When raw sources are needed

Pull raw source records when:

- the user asks who said something
- the user asks for exact wording
- the user challenges the conclusion
- the packet confidence is medium or low
- the answer depends on whether an item was resolved
- the packet is stale

### Recommended next questions for the user

- Should JobPlanner API work be treated as a short-term prototype, transition tool, or long-term integration path?
- Which project should become the first formal pilot for project attribution: Union Collective, Allisonville, or another active project?
- Who should own the JobPlanner Replacement initiative packet?
- Should admin friction and product workflow needs be tracked separately?
- What confidence threshold should allow an insight to update the packet automatically?

## Packet Quality Bar

This packet is useful only if it helps the assistant answer better than raw RAG.

The packet passes the quality bar when the assistant can:

- explain the initiative in one sentence
- identify the latest meaningful change
- name the most important blocker
- recommend the next decision
- cite supporting evidence
- admit uncertainty without sounding generic
- distinguish internal initiative value from client project references

## Compiler Requirements Learned From This Packet

The compiler must support:

1. Multi-target attribution.
2. Source clusters instead of isolated message chunks.
3. Product need extraction.
4. Task/blocker/decision extraction.
5. Confidence and review status.
6. Evidence refs back to source IDs.
7. Packet freshness and stale-item detection.
8. Human review for medium-confidence claims.
9. Separate handling for vendor/platform friction.
10. Assistant response guidance stored with the packet.

## Open Items For The Next Planning Pass

1. Decide final database names for packets and insight cards.
2. Attach exact `document_metadata.id` values to evidence refs.
3. Define the first production confidence thresholds.
4. Decide whether packets store current state only or historical snapshots.
5. Create the same packet format for Union Collective.
6. Define what the assistant does when a packet is missing or stale.
