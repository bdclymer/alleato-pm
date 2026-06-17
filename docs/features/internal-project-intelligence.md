# Internal Project Intelligence

This document defines how Alleato should handle internal projects and operational initiatives inside the Project Intelligence system.

The core decision is simple:

- Keep one intelligence engine.
- Do not treat internal work as a weaker version of a client project.
- Introduce explicit target modes, packet contracts, and page structures for internal initiatives and company processes.

## Why This Exists

The current Project Intelligence shape is optimized for `client_project` targets. That works when the user needs to understand a construction job:

- what changed
- what is at risk
- what decisions are open
- what may hit cost, schedule, or client trust

It is the wrong shape for internal efforts like Alleato Finance, where the real need is to understand:

- what systems are breaking
- what issues keep repeating
- what the root causes are
- who owns the fix
- what prevention work is active
- whether the system is actually improving

If internal work is forced through the client-project lens, the result is usually noisy summaries, vague "updates," and weak accountability.

## Product Decision

Alleato should support multiple intelligence target modes with different operating contracts.

### Target Modes

| Target mode | Purpose | Example | Primary question |
|---|---|---|---|
| `client_project` | External project delivery intelligence | Westfield Collective | What on this job needs attention right now? |
| `internal_initiative` | Cross-functional improvement effort | Alleato Finance | What internal problems are blocking performance, and what do we do next? |
| `company_process` | Persistent operating system or workflow | AP approvals, invoice review, data sync health | Where is this process failing and recurring? |
| `vendor_platform` | External dependency / product capability | Acumatica sync, Procore parity | What dependency gaps are creating operational drag? |

This matches the existing `intelligence_targets.target_type` direction and should be treated as a first-class product concept, not an implementation detail.

## Core Principle

One evidence model, multiple synthesis contracts.

Shared across all modes:

- `intelligence_targets`
- `intelligence_packets`
- `insight_cards`
- evidence citations and source drilldowns
- task/decision/risk primitives
- feedback and learning loops

Different by mode:

- packet schema
- scorecards
- homepage sections
- severity definitions
- default queries
- success metrics

## Internal Intelligence Contract

Internal intelligence should be optimized for operational control, not project storytelling alone.

### Top-Level Questions

Every internal packet should answer:

1. What is failing now?
2. What keeps recurring?
3. What is the root cause?
4. Who owns the next move?
5. What is blocked by system/process/people?
6. What change prevents this from happening again?
7. Is the system getting better or worse?

### Required Sections

Internal packets should use these sections in this order:

1. Executive read
2. Critical failures now
3. Recurring issue clusters
4. Workflow breakdown map
5. Decisions and blocked dependencies
6. Active prevention bets
7. Trendline and proof of improvement
8. Evidence drilldowns

### Executive Read

The opening summary should be short and operator-focused. It should answer:

- what is most broken
- what is getting worse
- what is newly improving
- what leadership must decide or fund

This is not a narrative report. It is a control summary.

## Internal Scorecard

Internal targets need different KPIs than client projects.

### Do Not Lead With

- RFI counts
- change-order counts
- budget shell metrics unless directly relevant
- generic project freshness tiles only

### Lead With

- open critical failures
- recurring issue count
- oldest unresolved issue age
- ownerless issue count
- blocked-dependency count
- prevention-bet completion rate
- reappearance rate after "resolved"
- source freshness by system

For Alleato Finance specifically, likely top metrics are:

- overdue approval queue size
- invoice aging exceptions
- unresolved workflow blockers
- repeat issue count by category
- mean time to resolution
- issues reopened after closure

## Insight Types For Internal Work

Client-project cards are not enough. Internal targets should prioritize these card types:

- `process_issue`
- `root_cause`
- `initiative_signal`
- `task`
- `decision`
- `blocker`
- `requirement`
- `sentiment`
- `project_update`

Recommended additions to the internal packet contract:

- `failure_mode`
- `detection_gap`
- `prevention_step`
- `owner_gap`
- `workflow_bottleneck`

These can be introduced first in packet JSON and promoted to first-class card types only if they prove durable.

## Workflow Map

The internal page should include an explicit workflow breakdown instead of only cards and timelines.

Example for Alleato Finance:

1. Intake
2. Review
3. Approval
4. Data correction
5. Posting
6. Communication back to stakeholders

For each step, show:

- current status
- failure points
- aging work
- repeated friction
- source-backed examples
- owner

This is the clearest way to prevent internal intelligence from becoming a pile of complaints.

## Recurrence Model

Recurring issue tracking is mandatory for internal targets.

Every surfaced issue should be tracked across packet runs with:

- stable issue key
- first seen
- last seen
- occurrence count
- current status
- owner
- root-cause hypothesis
- linked prevention work
- evidence set

Internal intelligence should not treat every packet run as a fresh summary. It should behave like an operating memory.

## Page Experience

Internal intelligence should not live only inside `/[projectId]/intelligence`.

That route assumes:

- a `project_id`
- project-centric navigation
- project-centric KPI and timeline semantics

Internal targets need a dedicated route model, for example:

- `/intelligence/targets/[slug]`
- `/operations/intelligence/[slug]`

### Recommended Page Structure

1. Header
2. Executive read
3. Failures now
4. Recurring patterns
5. Workflow map
6. Blocked decisions
7. Prevention work in flight
8. Timeline and evidence

### Noise Gate Requirements

The page must stay quiet:

- no nested cards
- no decorative dashboard wrappers
- no generic "AI insight" filler
- no duplicate summary strips

This page should feel like an operator command center, not an AI showcase.

## Comparison: Client vs Internal

| Area | Client project | Internal initiative |
|---|---|---|
| Primary goal | Protect project outcome | Improve the operating system |
| Default lens | Cost / schedule / scope / client trust | Root cause / recurrence / accountability / prevention |
| Main unit of analysis | Job | Workflow or initiative |
| Most important output | Risks, decisions, next actions | Failures, causes, owners, prevention steps |
| Success signal | Fewer surprises on the job | Fewer repeats and faster recovery |
| Timeline meaning | Project events and commitments | Failure chronology and improvement history |

## Alleato Finance Example

Alleato Finance should behave as an `internal_initiative` with strong `company_process` linkages.

It likely needs two layers:

1. Initiative packet
   Focus: the broader finance-improvement program, leadership priorities, major blocked work, major wins, major decisions.

2. Process packets
   Focus: AP approvals, invoice processing, reconciliation, billing review, source-sync inputs, handoff gaps.

The initiative page should roll up the process pages rather than flatten everything into one stream.

## Compiler Requirements

Internal target compilers should do more than summarize recent evidence.

They should:

- cluster repeated signals into durable issue records
- separate symptom from root-cause hypothesis
- link issues to owners and prevention work
- detect when an issue reappears after resolution
- score whether evidence is broad or narrow
- fail loudly when freshness is poor or a source system is stale

## Failure-Loudly Rules

Internal intelligence is dangerous if it looks authoritative while source coverage is weak.

Required failure states:

- source stale
- packet partial
- recurrence uncertain
- owner missing
- root cause unproven
- workflow step unmapped

Do not quietly imply that the system understands an internal issue if it only has one or two weak signals.

## Guardrails

1. Do not reuse the client-project packet template for internal targets with light copy edits.
2. Do not allow issue lists without owner, cause, and next prevention step.
3. Do not mark an issue resolved just because it disappeared from one packet run.
4. Do not let internal intelligence become a complaint inbox.
5. Do not hide source weakness; missing evidence must degrade confidence visibly.
6. Do not create a separate intelligence stack; reuse shared primitives and evidence infrastructure.

## Rollout Plan

### Phase 1: Contract

- define target-mode-specific packet schemas
- define shared vs mode-specific card types
- define recurrence model for internal issues

### Phase 2: Pilot

- pilot on Alleato Finance
- start with one initiative page plus 2-3 process lenses
- compare packet quality against known pain points and live operator review

### Phase 3: UX

- add dedicated internal target route
- build quiet operator layout
- support workflow map, recurring issue clusters, and decision queue

### Phase 4: Learning Loop

- add feedback controls for wrong issue clustering, wrong owner, wrong cause, and false resolution
- track whether surfaced issues actually lead to reduced recurrence

## Definition Of Success

Internal Project Intelligence is working when:

- leadership can scan the page in under a minute and know what is most broken
- recurring issues are obvious without rereading past packets
- each major issue has owner, cause, and prevention path
- the page shows whether the operating system is improving over time
- the system fails loudly when evidence is weak or stale

## Recommended Next Build Slice

Build a narrow first version for Alleato Finance:

1. Introduce an internal packet schema for `internal_initiative`
2. Add recurring issue cluster support
3. Create a dedicated internal intelligence page route by target slug
4. Ship five sections only:
   - executive read
   - critical failures now
   - recurring issue clusters
   - workflow breakdown
   - blocked decisions and next moves

That is enough to prove the model without overbuilding.
