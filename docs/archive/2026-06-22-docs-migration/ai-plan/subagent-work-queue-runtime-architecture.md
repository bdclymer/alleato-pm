# Subagent Work Queue Runtime Architecture

Last updated: 2026-06-18

Linear: AAI-532

## Objective

Build a repo-native subagent delegation runtime that lets the main assistant delegate bounded investigations to child agents, persist the work as visible AI labor, and synthesize child reports without losing permissions, source evidence, or auditability.

This is an architecture/spec only. It does not implement code, migrations, or admin review UI.

## Current Repo Anchors

Do not create a parallel AI platform. The runtime should extend these existing patterns.

| Capability | Current anchor | What to reuse |
|---|---|---|
| Assistant parent run | `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | Persists `chat_history.metadata.tool_trace`, `response_quality`, `source_debug`, `memory_usage`, retrieval plan, model/provider metadata, and direct Deep Agents traces. |
| Frontend specialist delegation | `frontend/src/lib/ai/orchestrator.ts` | Existing AI SDK `consult*` tool pattern, `ToolLoopAgent`, strategist routing, and `onTrace` collection. |
| Backend Deep Agents runtime | `backend/src/services/agents/deep_project_intelligence.py` | Runtime flags, tool gates, backend inventory, Deep Agents harness, memory middleware, backend source probes, and direct bridge response contract. |
| Backend subagent definitions | `backend/src/services/agents/alleato_ai_tools/subagents.py` | Existing financial, schedule, risk, communications, and business-development subagents with scoped tool lists and structured packet formats. |
| Child response contract | `backend/src/services/agents/deep_project_intelligence_contracts.py` | Existing `SourceCoverage`, `EvidenceItem`, `ToolTraceItem`, `MemoryCandidate`, and confidence literals. |
| Frontend backend bridge validation | `frontend/src/lib/ai/deep-agent-project-status.ts` | Zod response schemas, bridge timeout defaults, source/evidence widgets, and direct-response eligibility checks. |
| Feedback event stream | `frontend/src/lib/ai/services/feedback-event-service.ts` | `recordAiFeedbackEvent`, `createLearningPromotion`, promotion status model, and fail-loud insert errors. |
| Learning guardrails | `frontend/src/lib/ai/services/agent-learning-service.ts` | `agent_learnings`, `agent_learning_usages`, RAG chunk sync, occurrence/confidence model, and prevention prompt injection. |
| Write permissions and audits | `frontend/src/lib/ai/tools/action-tools.ts` and `frontend/src/lib/ai/tools/tool-utils.ts` | `confirmed` preview-before-write pattern, pinned project scoping, project access checks, `ai_tool_write_audits`, idempotency keys, and `withWriteTrace` fail-loud behavior. |
| Queue/status precedent | `source_processing_jobs`, `packet_refresh_jobs`, `fireflies_ingestion_jobs` | Durable status states, retry counts, attempt counts, error fields, projection staging, and RAG-side high-churn ownership. |
| Source truth and learning loop | `docs/ai-plan/SELF_LEARNING_INTELLIGENCE_ARCHITECTURE.md` | Separate source truth, interpreted intelligence, feedback/outcomes, and promoted learning. |

## Product Model

The assistant is the parent run. A delegated child run is a bounded unit of AI work with:

- one parent assistant session or scheduled trigger
- one scoped goal
- one allowed agent profile
- explicit tool allowlist
- explicit permission mode
- runtime budget
- source/evidence report
- terminal status
- audit events

The user-facing AI Work Queue should eventually render these runs, but the first safe slice should persist the contract before building UI.

## Parent-Child Run Model

Recommended tables for a future migration:

```text
ai_work_runs
ai_work_run_children
ai_work_run_events
ai_work_run_sources
ai_work_run_tool_calls
```

Use PM APP storage for user-visible orchestration rows because users will inspect and review them. Keep high-churn raw pipeline ledgers in the RAG database. If later child runs become extremely high volume, use a RAG-side execution ledger and project only final reviewable summaries into PM APP, matching `packet_refresh_jobs` projection staging.

### `ai_work_runs`

Parent run row. One row per user-visible AI work item.

Required fields:

```text
id uuid
created_at timestamptz
updated_at timestamptz
created_by uuid null
project_id integer null
target_id uuid null
session_id uuid null
trigger_type text -- chat | scheduled | webhook | manual_admin | system
surface text -- ai_assistant | executive_brief | source_sync | teams | email | admin
title text
user_goal text
normalized_goal text
status text
priority text
permission_mode text
model_policy jsonb
runtime_budget jsonb
tool_scope jsonb
source_policy jsonb
result_summary text null
confidence text null
failure_code text null
failure_message text null
started_at timestamptz null
completed_at timestamptz null
cancelled_at timestamptz null
expires_at timestamptz null
metadata jsonb
```

Status values:

```text
queued
planning
running
waiting_on_child
needs_user_approval
needs_admin_review
succeeded
partial_success
failed_retryable
failed_permanent
cancelled
expired
```

### `ai_work_run_children`

Child run row. One parent can have several children.

Required fields:

```text
id uuid
parent_run_id uuid
created_at timestamptz
started_at timestamptz null
completed_at timestamptz null
agent_name text
agent_version text
goal text
handoff_context jsonb
status text
permission_mode text
tool_allowlist text[]
tool_denylist text[]
model_id text
timeout_ms integer
max_tool_calls integer
max_output_tokens integer
result jsonb
failure_code text null
failure_message text null
metadata jsonb
```

Child status values should be a subset of parent statuses:

```text
queued
running
succeeded
partial_success
failed_retryable
failed_permanent
cancelled
expired
```

### `ai_work_run_events`

Append-only audit events for both parent and child runs.

Required fields:

```text
id uuid
run_id uuid
child_run_id uuid null
created_at timestamptz
actor_type text -- user | assistant | subagent | system | admin
actor_id text null
event_type text
severity text -- info | warning | error
message text
payload jsonb
```

Minimum event types:

```text
run_created
run_planned
child_queued
child_started
tool_call_started
tool_call_succeeded
tool_call_failed
source_checked
child_reported
parent_synthesized
approval_required
approval_granted
approval_rejected
run_failed
run_cancelled
run_completed
feedback_recorded
learning_candidate_created
```

### `ai_work_run_sources`

Evidence/source ledger. This normalizes child report evidence into queryable source rows instead of burying citations inside JSON.

Required fields:

```text
id uuid
run_id uuid
child_run_id uuid null
source_type text
source_table text null
source_record_id text null
source_url text null
title text
excerpt text
occurred_at timestamptz null
confidence text
checked_status text -- checked | missing | stale | failed
metadata jsonb
```

### `ai_work_run_tool_calls`

Tool execution ledger. This should mirror and enrich `chat_history.metadata.tool_trace`.

Required fields:

```text
id uuid
run_id uuid
child_run_id uuid null
created_at timestamptz
agent_name text
tool_name text
status text -- success | failed | skipped | blocked
duration_ms integer
input_snapshot jsonb
output_snapshot jsonb
error_message text null
permission_mode text
project_id integer null
metadata jsonb
```

## Child Report Schema

Child agents must return a structured report. The schema should extend the existing backend `SourceCoverage`, `EvidenceItem`, and `ToolTraceItem` contract.

```ts
type SubagentChildReport = {
  schemaVersion: "2026-06-18";
  childRunId: string;
  parentRunId: string;
  agentName: string;
  agentVersion: string;
  goal: string;
  status: "succeeded" | "partial_success" | "failed_retryable" | "failed_permanent";
  confidence: "high" | "medium" | "low";
  findings: Array<{
    id: string;
    claim: string;
    confidence: "high" | "medium" | "low";
    sourceIds: string[];
    riskLevel: "low" | "medium" | "high";
  }>;
  sourcesChecked: Array<{
    sourceType: string;
    status: "checked" | "missing" | "stale" | "failed";
    recordCount: number;
    latestSourceAt?: string | null;
    notes: string;
  }>;
  evidence: Array<{
    sourceId: string;
    sourceType: string;
    sourceTable?: string | null;
    sourceRecordId?: string | null;
    title: string;
    excerpt: string;
    occurredAt?: string | null;
    confidence: "high" | "medium" | "low";
  }>;
  recommendedActions: Array<{
    label: string;
    ownerRole: string;
    reason: string;
    sourceIds: string[];
    requiresApproval: boolean;
    proposedToolName?: string | null;
  }>;
  openQuestions: string[];
  toolTrace: Array<{
    agent: string;
    tool: string;
    status: "success" | "failed" | "skipped" | "blocked";
    durationMs: number;
    detail?: string | null;
  }>;
  memoryCandidates: Array<{
    scope: "user" | "project" | "organization";
    fact: string;
    requiresApproval: true;
    sourceIds: string[];
  }>;
  failure?: {
    code: string;
    message: string;
    retryable: boolean;
    ownerFile?: string | null;
  } | null;
};
```

Rules:

- `findings[].claim` must cite at least one `sourceId` unless the finding is explicitly a gap.
- `recommendedActions[].requiresApproval` must be `true` for any write or external-send action.
- `memoryCandidates[].requiresApproval` must always be `true`; route to `ai_learning_promotions`, not direct memory writes.
- Failed source checks are reportable evidence. Do not suppress them.
- Child reports should be compact enough to persist and replay in chat history metadata.

## Evidence And Source Model

Use the current RAG architecture separation:

- Source truth remains in source tables such as `document_metadata`, `document_chunks`, `project_emails`, `team_chat_messages`, `project_documents`, `tasks`, `rfis`, `submittals`, and Acumatica tables.
- Child report evidence stores source identity, title, excerpt, and confidence, not copied full documents.
- Parent synthesis can cite normalized `ai_work_run_sources` and child `sourceIds`.
- Missing, stale, and failed source checks are first-class statuses.
- If a child cannot access a source because of permissions, record `checked_status='failed'` with a permission failure code.

The parent response should persist a summary into `chat_history.metadata`:

```json
{
  "delegation": {
    "parentRunId": "...",
    "childRunIds": ["..."],
    "childStatuses": {"financial-analyst": "succeeded"},
    "sourceCount": 8,
    "failureCount": 0
  }
}
```

## Tool Scoping

Tool scope should be explicit and deny-by-default.

Permission modes:

```text
read_only
draft_preview
confirmed_write
external_send_preview
admin_only
```

Initial child agents must run in `read_only` only.

Recommended tool groups:

| Tool group | Examples | Default |
|---|---|---|
| Project structured reads | project briefing, budget, RFIs, submittals, schedule tasks | Allowed for project-scoped children after membership check. |
| RAG/source reads | document search, meetings, emails, Teams, source health | Allowed after source policy and project scope are resolved. |
| SQL tools | `describe_schema`, `query_db` | Disabled by default; admin/runtime flag only. |
| Acumatica reads | AP/AR aging, project budget, bills, vendor spend | Disabled unless the child goal requires finance and env gates permit it. |
| Draft tools | draft RFI, draft commitment, draft task, draft email | Disabled in first slice; later `draft_preview` only. |
| Writes/external sends | create/update records, Teams send, Outlook draft creation | Never available to child agents in first slice. Later only through parent confirmation using existing `confirmed` and `ai_tool_write_audits` patterns. |

Future implementation should map each child profile to a static tool allowlist near the existing agent registries:

- frontend bridge tool registry: `frontend/src/lib/ai/subagent-runtime/tool-scope.ts`
- backend profile registry: `backend/src/services/agents/alleato_ai_tools/subagent_runtime.py`
- existing backend subagents: `backend/src/services/agents/alleato_ai_tools/subagents.py`

## Permissions

Use current permission boundaries instead of a new access system.

Required checks:

- Resolve current user from the route before creating a parent run.
- Project-scoped run requires project membership or admin rights before queueing.
- Child run inherits `user_id`, `project_id`, `session_id`, and `permission_mode`.
- Backend Deep Agents config must include `user_id` and optional `project_id`, matching `_deep_agent_config`.
- Memory recall must follow `DbMemoryMiddleware` and memory store visibility filters.
- Child report sources must not include private memory or private source excerpts outside the caller's scope.
- Parent synthesis must not upgrade permissions. It can only synthesize what children were allowed to see.

## Runtime Bounds

Set hard defaults so child runs cannot become unbounded background work.

Recommended first defaults:

```text
max_children_per_parent = 3
child_timeout_ms = 120000
parent_timeout_ms = 150000 for sync chat bridge
max_tool_calls_per_child = 8
max_output_tokens_per_child = 1200
max_evidence_items_per_child = 12
max_sources_checked_per_child = 12
max_retries = 1 for retryable infrastructure failures
queue_expiry_minutes = 60
```

Model policy:

- Parent synthesis keeps the current assistant model policy.
- Routine child read-only research should default to a cheaper capable model such as the current mini model path.
- Escalate only when the child goal requires synthesis over complex source conflict.
- Record `model_id`, usage, and budget metadata on parent and child rows.
- Respect existing backend model usage/budget guardrails before background model calls.

## Failure States

Failures must be loud, typed, and reviewable.

Failure codes:

```text
PERMISSION_DENIED
PROJECT_NOT_FOUND
SOURCE_UNAVAILABLE
SOURCE_STALE
TOOL_SCOPE_BLOCKED
TOOL_FAILED
MODEL_TIMEOUT
MODEL_UNAVAILABLE
BUDGET_BLOCKED
REPORT_SCHEMA_INVALID
CHILD_TIMEOUT
PARENT_SYNTHESIS_FAILED
AUDIT_WRITE_FAILED
QUEUE_CLAIM_FAILED
```

Rules:

- If a child report fails schema validation, the child is `failed_retryable` or `failed_permanent`; the parent must disclose the missing child result.
- If all children fail, parent is `failed_permanent` unless the failure is clearly retryable infrastructure.
- If some children fail and at least one succeeds, parent is `partial_success` and must include `openQuestions`.
- If an audit/event/source write fails, fail the run rather than silently returning an unsupported answer.
- If a write action is recommended, status becomes `needs_user_approval`; do not execute it.

## Audit And Learning Events

Every work run should write to the future work-run lifecycle, evidence, and tool-call ledgers:

- lifecycle event rows for run, child, tool, source, and synthesis transitions.
- evidence/source rows for normalized citations and failed source checks.
- tool-call rows for detailed tool audit.
- `chat_history.metadata.delegation` for chat replay/debug.
- `ai_feedback_events` when a user accepts, rejects, corrects, or marks child output as wrong.
- `ai_learning_promotions` only for reviewed memory, skill, retrieval, workflow, or prevention candidates.

Recommended event mappings:

| User/system action | `ai_feedback_events.event_family` | Promotion path |
|---|---|---|
| User accepts a child-suggested action | `workflow_outcome` | Optional positive workflow example. |
| User rejects a child finding | assistant response feedback family | Candidate prevention prompt or source-quality review. |
| User corrects a source/project | attribution feedback family | Attribution rule candidate. |
| Child proposes memory | `user_preference` or `workflow_outcome` | Memory review candidate only. |
| Child finds recurring failure | `eval_failure` | `agent_prevention_prompt` candidate. |

## First Safe Implementation Slice

Build the smallest useful runtime without code writes or admin UI changes beyond the necessary route/service surface.

1. Add schema and types for parent/child work runs and normalized child report validation.
2. Add a backend read-only child report runner around existing Deep Agents subagents.
3. Add a frontend service that creates a parent run, calls the backend runner, validates child reports, persists the run, and attaches `chat_history.metadata.delegation`.
4. Expose one read-only assistant tool, `delegateProjectInvestigation`, limited to project-scoped questions and at most two child profiles:
   - `financial-analyst`
   - `risk-analyst`
5. Persist lifecycle events, source rows, and tool-call rows.
6. Parent synthesis uses the existing chat response path; no autonomous writes.
7. Add tests for schema validation, permission-denied failure, partial-success synthesis, and audit-write failure.

Suggested first use case:

```text
"Check Westfield for budget exposure and communication risk, then tell me what changed."
```

This uses existing financial/risk/communications source patterns but starts with only two children to keep the blast radius small.

## Likely Future Implementation Files

Frontend:

- `frontend/src/lib/ai/subagent-runtime/contracts.ts`
- `frontend/src/lib/ai/subagent-runtime/service.ts`
- `frontend/src/lib/ai/subagent-runtime/tool-scope.ts`
- `frontend/src/lib/ai/subagent-runtime/__tests__/contracts.test.ts`
- `frontend/src/lib/ai/subagent-runtime/__tests__/service.test.ts`
- `frontend/src/lib/ai/tools/delegation-tools.ts`
- `frontend/src/lib/ai/orchestrator.ts`
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
- `frontend/src/lib/ai/deep-agent-project-status.ts`
- `frontend/src/types/database.types.ts`

Backend:

- `backend/src/services/agents/subagent_runtime/contracts.py`
- `backend/src/services/agents/subagent_runtime/runner.py`
- `backend/src/services/agents/subagent_runtime/tool_scope.py`
- `backend/src/services/agents/subagent_runtime/events.py`
- `backend/src/services/agents/alleato_ai_tools/subagents.py`
- `backend/src/services/agents/deep_project_intelligence.py`
- `backend/src/api/main.py`
- `backend/tests/test_subagent_runtime.py`

Database and verification:

- `supabase/migrations/<timestamp>_create_ai_work_runs.sql`
- `scripts/verify/verify_ai_work_run_contract.mjs`
- `scripts/verify/verify_ai_subagent_runtime_inventory.mjs`
- `docs/architecture/AI-RAG-ARCHITECTURE.md`
- `docs/ai-plan/TASKS-AI.md`

## Checklist Updates To Make Later

Do not edit `docs/ai-plan/TASKS-AI.md` from this task, but the next checklist update should split "Build AI Work Queue and subagent delegation runtime" into:

- Add subagent/work-run architecture spec.
- Add `ai_work_runs` schema and generated types.
- Add child report schema validation.
- Add read-only backend child runner.
- Add assistant `delegateProjectInvestigation` tool.
- Persist parent-child trace metadata to `chat_history`.
- Persist work-run events, sources, and tool calls.
- Add first AI Work Queue read-only list/detail surface.
- Add browser verification for a read-only delegated project investigation.

## Open Risks

- The current frontend and backend delegation paths are both real. The implementation must choose one canonical persistence contract so AI SDK `consult*` calls and backend Deep Agents reports do not diverge.
- Existing backend subagents do not all return structured response formats. The first implementation should require structured reports for the enabled child profiles before widening coverage.
- SQL and Acumatica tools are powerful and should stay env-gated and disabled for first-slice child runs unless the child profile explicitly requires them.
- A fully user-visible AI Work Queue needs product decisions on filters, retention, review actions, and notification surfaces. Those are intentionally out of scope for this architecture slice.
