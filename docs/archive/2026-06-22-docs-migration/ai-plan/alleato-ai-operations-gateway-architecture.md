# Alleato AI Operations Gateway Architecture

Last updated: 2026-06-18

Source models:

- `docs/codebase-map/hermes-agent-filetree.md`
- `docs/codebase-map/openclaw-filetree.md`
- `docs/codebase-map/hermes-vs-openclaw-comparison.md`

Existing Alleato anchors:

- `docs/briefs/ceo-daily-update.md`
- `docs/deployment/RENDER-CRONS.md`
- `docs/ai-plan/rag-pipeline/source-synthesis-operating-record-spec.md`
- `docs/ai-plan/subagent-work-queue-runtime-architecture.md`
- `docs/codebase-map/sync-pipeline.md`

## Objective

Create a repo-native AI operations control plane that makes project intelligence, executive briefs, source sync health, Teams/email delivery, and delegated AI work observable, permissioned, evidence-backed, and recoverable.

This is an architecture/spec only. It does not implement code, migrations, routes, or UI.

## Why This Exists

The repo already has useful pieces:

- Executive Daily Brief generation and review workflow.
- Render crons for source sync, RAG health, and executive briefs.
- RAG/source synthesis planning.
- Deep Agents project intelligence runtime.
- AI assistant tool traces, response-quality metadata, source debug, and memory usage.
- Source sync run ledgers.
- Teams delivery helpers and Adaptive Card prototypes.

The gap is ownership. Events, runs, tool scopes, schedules, source health, delivery targets, and evidence need one consistent operational model.

Hermes is the better model for the agent loop and tool/skill/runtime discipline.

OpenClaw is the better model for the control plane: typed events, strict config, source/channel adapters, durable task/run ledgers, and an operations UI.

Alleato should combine those patterns without creating a parallel AI platform.

## Product Boundary

The AI Operations Gateway is not a new user-facing PM page and not another chat shell.

It is the backend/control-plane layer that answers:

1. What event or schedule triggered this AI work?
2. Which agent/workflow is allowed to run?
3. Which tools and sources are visible?
4. Which evidence was used?
5. What did the run produce?
6. Was anything delivered?
7. If it failed, who owns the recovery?

## Core Concepts

### 1. Event Envelope

Every AI-triggering source should normalize into one envelope before any model call.

```text
ai_operation_events
```

Recommended fields:

```text
id uuid
created_at timestamptz
received_at timestamptz
event_source text -- teams | email | fireflies | procore | acumatica | cron | webhook | admin | chat
event_type text -- message_received | meeting_synced | brief_scheduled | source_health_failed | user_requested | etc.
project_id integer null
actor_user_id uuid null
actor_display_name text null
source_record_id text null
source_thread_id text null
source_url text null
delivery_context jsonb
permission_context jsonb
payload jsonb
idempotency_key text
status text -- received | accepted | ignored | rejected | converted_to_run | failed
failure_code text null
failure_message text null
metadata jsonb
```

Source adapters should write this envelope rather than directly starting bespoke AI logic.

### 2. AI Work Run Ledger

Use the subagent architecture's proposed `ai_work_runs` model as the parent ledger for all user-visible AI work, including scheduled briefs.

```text
ai_work_runs
ai_work_run_children
ai_work_run_events
ai_work_run_sources
ai_work_run_tool_calls
```

This should unify:

- Executive Daily Brief generation.
- Project Intelligence refreshes.
- Source sync AI briefs.
- Deep Agents direct bridge calls.
- Scheduled source health audits.
- Teams/email-triggered assistant work.
- Future subagent investigations.

Do not replace existing domain tables immediately. Instead, project key lifecycle events into the ledger:

- `daily_recaps` remains the persisted Daily Brief packet store.
- `source_sync_runs` remains the current source-sync/run ledger.
- RAG-side high-churn job tables remain in the RAG database.
- `ai_work_runs` becomes the user-visible orchestration record that links them.

### 3. Workflow Pack

A workflow pack is the Alleato analog to Hermes/OpenClaw skills, but tied to source policy and output contracts.

Recommended shape:

```text
docs/ai-plan/workflows/<workflow-id>/
  WORKFLOW.md
  source-policy.md
  output-contract.md
  failure-contract.md
  examples/
```

Initial workflow packs:

- `executive-daily-brief`
- `project-intelligence-refresh`
- `source-sync-health-brief`
- `meeting-action-extraction`
- `change-event-signal-review`

Workflow packs should declare:

- primary audience
- trigger types
- source families allowed
- tool allowlist
- evidence requirements
- delivery channels
- fail-loud states
- regression checks

### 4. Tool Registry And Toolsets

Alleato already has distributed tools across frontend AI services, backend Deep Agents, and scripts. The Gateway plan should introduce a single registry contract before moving code.

Recommended conceptual contract:

```ts
type AiOperationTool = {
  id: string
  owner: "frontend" | "backend" | "script" | "external"
  description: string
  inputSchema: unknown
  outputSchema: unknown
  availabilityCheck: () => Promise<ToolAvailability>
  permissionCheck: (context: AiOperationContext) => Promise<ToolPermission>
  failureModes: ToolFailureMode[]
}
```

Initial toolsets:

| Toolset | Use |
| --- | --- |
| executive brief read | Read email, Teams, meetings, docs, source syntheses, current Daily Brief packet |
| executive brief write | Persist draft, update follow-ups, send approved Teams/email delivery |
| project intelligence read | Read project data, RAG, source syntheses, task/project facts |
| source sync ops | Read run ledgers, source health, pipeline status, retryable errors |
| admin repair | Run controlled remediation scripts and provider checks |
| financial read | Read Acumatica/app financial signals with stricter evidence requirements |
| delivery | Send Teams/email/webhook messages through approved routes |

Tool visibility must be decided before the model call.

### 5. Source Adapter Layer

Treat high-value inputs as source adapters:

| Adapter | Existing anchors | Gateway responsibility |
| --- | --- | --- |
| Microsoft Graph email | RAG pipeline, executive brief retrieval | Normalize thread events, source URLs, actor, project hints, stale/403 states |
| Teams DM/channel | Teams compiler, recent Teams Graph path | Normalize direct/channel/thread events and delivery targets |
| Fireflies | transcript ingestion and RAG chunks | Normalize meeting source identity, transcript availability, deletion/no-transcript states |
| OneDrive/SharePoint | document metadata/chunks | Normalize document source, URL, OCR/extraction state |
| Procore | parity crawlers and project data | Normalize external PM events and project identity |
| Acumatica | financial sync/workflows | Normalize finance snapshots and reconciliation evidence |
| Render cron | `source_sync_runs`, Render cron docs | Normalize scheduled trigger, local target time, skipped vs failed vs succeeded |
| Admin UI | future control plane | Normalize manual run, rerun, approve, reject, and repair actions |

### 6. Source Synthesis As First-Class Evidence

The source synthesis spec should be the evidence layer between raw ingestion and downstream briefs.

Gateway runs should prefer:

1. full-source synthesis rows when available
2. raw source record metadata and excerpts
3. RAG chunks for drilldown/retrieval
4. broad knowledge only as secondary context

This matches the Daily Brief rule that recent email, Teams, meetings, and documents outrank stale broad memory.

### 7. AI Operations Config

Borrow OpenClaw's strict config posture, but store it in repo/app-native form.

Recommended config domains:

```text
ai_operations.providers
ai_operations.workflows
ai_operations.toolsets
ai_operations.schedules
ai_operations.delivery_targets
ai_operations.source_health
ai_operations.fail_loud_thresholds
ai_operations.model_policy
```

Config changes must:

- validate against schema
- fail closed on unknown fields
- redact secrets
- expose read-back health
- keep last known good config
- record who changed it

Do not put this into scattered env-only logic unless the value is truly a secret.

## Executive Daily Brief First Slice

The Daily Brief already exists and should become the proof slice for the Gateway model.

### Current Anchors

- Source of truth packet: `daily_recaps.recap_kind = executive_briefing`
- Generator: `frontend/src/lib/executive/daily-brief.ts`
- Legacy internals: `frontend/src/lib/executive/brandon-daily-update.ts`
- Workflow persistence: `frontend/src/lib/executive/executive-briefing-workflow.ts`
- Teams delivery: `frontend/src/lib/executive/executive-briefing-teams-delivery.ts`
- API route: `frontend/src/app/api/executive/daily-brief/route.ts`
- Teams route: `frontend/src/app/api/executive/daily-brief/send-teams/route.ts`
- Cron script: `frontend/scripts/run-executive-daily-brief.ts`
- Run ledger: `source_sync_runs.source = executive_daily_brief`

### Target Flow

```text
Render cron target time
  -> ai_operation_events row
  -> ai_work_runs row: workflow = executive-daily-brief
  -> toolset = executive_brief_read
  -> source health preflight
  -> generateDailyBrief({ preset: "brandon" })
  -> persist daily_recaps packet
  -> attach evidence/source rows to ai_work_run_sources
  -> if approved/delivery-enabled: toolset += delivery
  -> send Teams/email through approved route
  -> mark delivery evidence
  -> terminal run status
```

### Required Fail-Loud Gates

The run must not produce polished unsupported output when:

- no current source evidence is available
- source attribution is missing
- evidence excerpts are blank
- source dates are missing or stale
- Teams/email source health fails
- RAG query returns only stale broad memory
- packet persistence fails
- Teams delivery route fails
- configured target local time does not match current cron execution

### Minimum Run Evidence

Each run should record:

```text
event_id
workflow_id = executive-daily-brief
trigger_type = scheduled
target_local_time
window_days
model
toolset
source_counts_by_family
source_health_warnings
daily_recaps.id
packet_generated_at
delivery_enabled
delivery_target
delivery_status
failure_code
failure_message
artifact_urls
```

## Control UI Surface

The first UI should be an internal operations console, not a project dashboard.

Primary user:

- internal operator/admin responsible for AI source health and executive delivery

Primary job:

- answer whether AI work ran, what evidence it used, what it delivered, and what failed

Tier 1 content:

- latest Executive Daily Brief run
- source health by family
- active failures
- latest delivery state
- rerun/approve actions when allowed

Hide until requested:

- raw prompt
- raw source excerpts
- full tool trace
- model/provider internals
- RAG chunk lists

Do not add:

- top-of-page KPI cards
- decorative agent avatars
- duplicate regenerate/send buttons
- generic "AI insights" panels
- nested cards

## Implementation Phases

### Phase 0. Documentation And Ownership

Status: this document.

Outputs:

- architecture doc
- decision boundary for existing Daily Brief vs Gateway plan
- Hermes/OpenClaw mapping docs

### Phase 1. Event And Run Projection

Add projection around the existing Daily Brief cron without changing generation behavior.

Owned behavior:

- write `ai_operation_events` for scheduled brief triggers
- write `ai_work_runs` for brief run lifecycle
- link `daily_recaps` and `source_sync_runs`
- record source counts and retrieval warnings

No new AI behavior in this phase.

### Phase 2. Source Health Preflight

Before generation, run source health checks and decide:

- proceed
- proceed with warnings
- fail before generation

This should reuse existing source/RAG health logic rather than querying every table ad hoc.

### Phase 3. Workflow Pack

Create `docs/ai-plan/workflows/executive-daily-brief/` and move the stable audience/source/failure contract there.

The generator can then reference the workflow pack as the human-readable contract.

### Phase 4. Tool Registry Contract

Create a typed inventory of existing tools and route them into initial toolsets.

This is a registry/contract pass before major rewiring.

### Phase 5. Operations Console

Add an admin-only page for runs, source health, and delivery evidence.

Noise gate:

- table/list first
- no stat cards
- no decorative wrappers
- one primary action per row
- error states must include cause, detection gap, and prevention step

## Failure Model

Every failure should explain:

| Field | Meaning |
| --- | --- |
| `failure_code` | Stable machine-readable cause |
| `failure_message` | Human-readable cause |
| `detection_gap` | Why this was not caught earlier |
| `prevention_step` | Guardrail that prevents recurrence |
| owner surface | Source adapter, workflow, tool, delivery, provider, config |
| `related_to_user_task` | Whether failure affects the current requested run |
| `retryable` | Whether operator/admin retry is allowed |

Example codes:

```text
SOURCE_HEALTH_EMAIL_FAILED
SOURCE_HEALTH_TEAMS_FAILED
NO_CURRENT_EVIDENCE
MISSING_SOURCE_ATTRIBUTION
STALE_ONLY_RETRIEVAL
PACKET_PERSISTENCE_FAILED
TEAMS_DELIVERY_FAILED
CONFIG_INVALID
MODEL_PROVIDER_UNAVAILABLE
TARGET_TIME_SKIPPED
```

## Decisions

1. Do not replace `daily_recaps`; link to it.
2. Do not replace `source_sync_runs`; project from it.
3. Do not start with a broad Gateway service; start with event/run projection around Executive Daily Brief.
4. Do not expose new autonomous tools to the model until tool visibility and permission checks are explicit.
5. Do not add user-facing UI until run/evidence/delivery data is durable.
6. Do not call a run successful unless source evidence, packet persistence, and delivery state are all known.

## Recommended Next Implementation Task

Create the Phase 1 projection migration and write path for Executive Daily Brief:

- `ai_operation_events`
- `ai_work_runs`
- `ai_work_run_sources`
- update `frontend/scripts/run-executive-daily-brief.ts` to write lifecycle rows
- preserve current generation behavior
- add focused unit tests around skipped, failed, and succeeded run projection

This is the smallest useful slice because it creates operational visibility without changing the brief generation contract.
