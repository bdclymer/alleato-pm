# Task: Executive Daily Brief AI Operations Gateway proof workflow

Status: Draft
Owner: Codex
Created: 2026-06-19
Linear Issue: Not created yet - required before coding starts
Related Handoff: TBD

## Objective

Rebuild the Executive Daily Brief as the proof workflow for Alleato's thin AI
Operations layer. The finished workflow must run through one canonical gateway
from schedule or preview request to source adapters, workflow pack, agent
runtime, evidence-linked packet, Teams/email delivery, durable run ledger,
source health, and delivered artifact inspection.

This is not a UI-only or route-only task. It is not done when files exist. It is
done only when the complete workflow can be executed, inspected in the control
UI, traced to sources, and verified end to end.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

No final answer, commit message, Linear update, handoff, or review comment may
say this workflow is done while any checklist item remains unchecked.

## Architecture Decision

Use the practical Hermes/OpenClaw hybrid:

- Do not replace Alleato with Hermes or OpenClaw.
- Do not copy their UI, daemon, local SQLite store, or generic chat shell.
- Borrow Hermes-style workflow packs, tool registry, skill injection, evidence
  discipline, and shared agent runtime.
- Borrow OpenClaw-style operations gateway, typed events, strict config, adapter
  boundaries, durable task/run logs, and control UI.
- Use Supabase-backed ledgers and existing Alleato deployment surfaces unless a
  specific local-first requirement proves otherwise.

## Corrected Implementation Order

ChatGPT's recommendation is directionally right, but the order needs one
correction for this repo: do inventory and contracts before adding or changing
more schema, because `ai_work_runs` already exists and is only partially wired.

1. Inventory current paths.
2. Define canonical contracts.
3. Audit and standardize the existing run ledger.
4. Normalize source events.
5. Build the thin gateway.
6. Centralize tool registry and policy.
7. Package Executive Daily Brief as the first workflow pack.
8. Wire evidence-backed generation.
9. Route Teams/email delivery through the gateway.
10. Add/repair the Operations Control UI.
11. Migrate Project Intelligence touchpoints onto the same runtime where needed.
12. Retire or block old Daily Brief paths.

## Scope Checklist

- [ ] Linear issue created before coding starts.
- [ ] Existing Hermes/OpenClaw comparison re-read:
      `docs/codebase-map/hermes-vs-openclaw-comparison.md`.
- [ ] Pasted ChatGPT recommendation reviewed and accepted with the corrected
      contract-before-schema order.
- [ ] Current Daily Brief paths inventoried:
      `frontend/src/lib/executive/brandon-daily-update.ts`.
- [ ] Current Daily Brief workflow persistence inventoried:
      `frontend/src/lib/executive/executive-briefing-workflow.ts`.
- [ ] Current scheduled runner inventoried:
      `frontend/scripts/run-executive-daily-brief.ts`.
- [ ] Current Teams preview route inventoried:
      `frontend/src/app/api/executive/daily-brief/preview-teams/route.ts`.
- [ ] Current Teams send route inventoried:
      `frontend/src/app/api/executive/daily-brief/send-teams/route.ts`.
- [ ] Current owner briefing delivery path inventoried:
      `frontend/src/lib/executive/owner-briefing-delivery.ts`.
- [ ] Current AI work runs admin API/UI inventoried:
      `frontend/src/app/api/admin/ai-work-runs/route.ts` and
      `frontend/src/app/(admin)/ai-work-runs/*`.
- [ ] Current ledger migration inventoried:
      `supabase/migrations/20260619090000_create_ai_operations_gateway_ledger.sql`.
- [ ] Current source health and RAG/source sync paths inventoried.
- [ ] Deprecated or bypassing paths listed explicitly before replacement.
- [ ] Single source-of-truth owner chosen for run construction.
- [ ] Failure-loudly behavior defined for stale sources, missing evidence,
      disabled delivery, provider failure, quota failure, schedule skip, and
      partial delivery.

## Contract Checklist

- [ ] `AiEvent` contract defined for scheduled runs, preview requests,
      source-sync events, Teams/Graph events, Fireflies events, document/RAG
      events, Acumatica events, and Procore events.
- [ ] `AiRun` contract defined for queued, running, skipped, succeeded,
      partial, failed retryable, failed permanent, disabled, and dry-run states.
- [ ] `AiRunStep` or equivalent event log contract defined for generation,
      source fetch, synthesis, artifact persistence, delivery, and verification.
- [ ] `AiArtifact` contract defined for generated brief packet, Teams payload,
      email payload, source health report, and delivered artifact.
- [ ] `EvidenceRef` contract defined with source family, source id, source URL,
      source title, occurred-at timestamp, excerpt, confidence, and project
      linkage.
- [ ] `ToolDefinition` contract defined with tool name, description, input
      schema, output schema, owning adapter, and failure shape.
- [ ] `ToolPolicy` contract defined for role, project, channel, workflow,
      source access, write permission, and delivery permission.
- [ ] `WorkflowDefinition` contract defined with workflow id, version, allowed
      tools, source policy, evidence policy, delivery policy, runtime budget,
      prompt contract, and failure modes.
- [ ] `DeliveryAttempt` contract defined for Teams/email recipient, channel,
      payload artifact, sent/skipped/blocked/failed/dry-run status, provider
      response, and retryability.
- [ ] Contracts are shared from one stable module, not copied into routes.
- [ ] Contracts have unit or type-level tests that fail when required fields are
      omitted.

## Ledger Checklist

- [ ] Existing `ai_operation_events`, `ai_work_runs`, and `ai_work_run_sources`
      tables audited against the contracts.
- [ ] Decision recorded: keep, migrate, extend, or replace each existing AI
      ledger table.
- [ ] `daily_recaps` relationship standardized so every generated Executive
      Daily Brief draft links to exactly one `ai_work_runs` record.
- [ ] Preview generation writes a run ledger row.
- [ ] Scheduled generation writes a run ledger row.
- [ ] Dry-run delivery writes a run ledger row and delivery attempt.
- [ ] Real Teams delivery writes a run ledger row and delivery attempt.
- [ ] Email delivery writes a run ledger row and delivery attempt, or the task is
      explicitly blocked/deferred with owner and reason.
- [ ] Skipped schedules are recorded as skipped runs with reason.
- [ ] Disabled delivery is recorded as disabled, not silently successful.
- [ ] Failure state records exact failure code, failure message, owning step, and
      retryability.
- [ ] Source health snapshot is stored with each run.
- [ ] Generated artifact id and delivered artifact id are stored with each run.
- [ ] Migration applied and remote ledger verified if schema changes are needed.
- [ ] Generated Supabase types updated after schema changes, if applicable.

## Source Adapter Checklist

- [ ] Source adapter interface created for normalized fetch and health output.
- [ ] Fireflies/meeting adapter implemented or wrapped.
- [ ] Outlook/email adapter implemented or wrapped.
- [ ] Teams message adapter implemented or wrapped.
- [ ] Documents/RAG adapter implemented or wrapped.
- [ ] Acumatica adapter implemented or wrapped.
- [ ] Procore/project data adapter implemented or wrapped if used by this brief.
- [ ] Project Intelligence packet adapter implemented or wrapped.
- [ ] Each adapter returns typed source records and typed health state.
- [ ] Each adapter reports loaded, stale, missing, degraded, failed, and skipped.
- [ ] Adapter failures fail loudly into the run ledger.
- [ ] No route-level source query remains as a bypass for this workflow.

## Tool Registry And Policy Checklist

- [ ] Central tool registry module created or selected.
- [ ] Executive Daily Brief tools registered once.
- [ ] Source adapter tools registered once.
- [ ] Delivery adapter tools registered once.
- [ ] Tool visibility filtered before model calls.
- [ ] Policy filters by workflow id.
- [ ] Policy filters by actor/role.
- [ ] Policy filters by project/source access.
- [ ] Policy filters by channel.
- [ ] Policy filters by delivery permission.
- [ ] Tool calls record success/failure and source evidence in the run ledger.
- [ ] Tests prove forbidden tools are hidden from the workflow.
- [ ] Tests prove disabled delivery tools cannot send.

## Workflow Pack Checklist

- [ ] Executive Daily Brief workflow pack created with explicit version.
- [ ] Workflow pack declares allowed tools.
- [ ] Workflow pack declares required source families.
- [ ] Workflow pack declares freshness thresholds.
- [ ] Workflow pack declares minimum evidence requirements per claim.
- [ ] Workflow pack declares prompt contract.
- [ ] Workflow pack declares packet schema.
- [ ] Workflow pack declares delivery rules.
- [ ] Workflow pack declares degraded-output behavior.
- [ ] Workflow pack declares hard-fail conditions.
- [ ] Workflow pack declares runtime budget and timeout behavior.
- [ ] Workflow pack is used by schedule, preview, dry-run, and send paths.
- [ ] Existing prompt and generation logic migrated into the pack or explicitly
      deprecated.

## Evidence-Linked Packet Checklist

- [ ] Packet schema includes structured `sourceRefs` for every surfaced claim.
- [ ] `sourceRefs` include source family, id, title, URL or internal route,
      excerpt, occurred-at, confidence, and project linkage.
- [ ] Every `needsBrandon` item has at least one source ref.
- [ ] Every `waitingOnOthers` item has at least one source ref.
- [ ] Every `importantUpdates` item has at least one source ref.
- [ ] Financial claims include Acumatica/source ref or are excluded.
- [ ] Meeting claims include transcript/summary/source ref or are excluded.
- [ ] Email claims include email/source ref or are excluded.
- [ ] Teams claims include message/thread/source ref or are excluded.
- [ ] Document/RAG claims include document/chunk/source ref or are excluded.
- [ ] Placeholder-only source panels count as incomplete.
- [ ] Generated packet stores source coverage and source health.
- [ ] Generated packet can be inspected from the run ledger.
- [ ] Tests fail if a claim lacks source refs.

## Delivery Checklist

- [ ] Teams delivery adapter accepts only a gateway-created delivery attempt.
- [ ] Email delivery adapter accepts only a gateway-created delivery attempt, or
      email is explicitly deferred with owner and reason.
- [ ] Preview/dry-run produces the exact Teams payload without sending.
- [ ] Real Teams send records provider response and recipient result.
- [ ] Real email send records provider response and recipient result, or is
      deferred with owner and reason.
- [ ] Disabled delivery records disabled state and reason.
- [ ] Blocked delivery records blocked state and reason.
- [ ] Partial recipient failure records partial success.
- [ ] Delivered artifact links to run, packet, recipient/channel, and source
      health.
- [ ] Delivery route cannot bypass the ledger.

## Operations Control UI Checklist

- [ ] `/ai-work-runs` reads the canonical run ledger.
- [ ] UI shows scheduled, preview, dry-run, skipped, failed, disabled, partial,
      and succeeded runs.
- [ ] UI shows source health per run.
- [ ] UI shows generated artifact per run.
- [ ] UI shows delivery attempts per run.
- [ ] UI shows source refs/evidence drilldown per generated packet.
- [ ] UI shows exact failure code/message and owning step.
- [ ] UI shows retryability and next action.
- [ ] UI does not imply success when a run is skipped, disabled, or partial.
- [ ] Browser verification proves a real generated brief appears without direct
      Supabase querying.

## Legacy Retirement Checklist

- [ ] Old preview path either routes through the gateway or is removed.
- [ ] Old scheduled runner either routes through the gateway or is removed.
- [ ] Old Teams delivery path either routes through the gateway or is removed.
- [ ] Old source coverage fields that bypass canonical source health are removed
      or marked deprecated.
- [ ] Duplicate Daily Brief scripts are removed, blocked, or documented as
      wrappers.
- [ ] Route-level model calls for this workflow are removed or blocked.
- [ ] Any remaining legacy path logs a loud deprecation warning and cannot claim
      success without a canonical run id.

## Regression Guardrails

- [ ] Unit tests cover contract validation.
- [ ] Unit tests cover source adapter health states.
- [ ] Unit tests cover tool policy filtering.
- [ ] Unit tests cover workflow pack validation.
- [ ] Unit tests cover packet source-ref requirements.
- [ ] Integration tests cover preview generation writing `ai_work_runs`.
- [ ] Integration tests cover scheduled generation writing `ai_work_runs`.
- [ ] Integration tests cover dry-run delivery writing delivery attempts.
- [ ] Integration tests cover disabled delivery writing disabled state.
- [ ] Integration tests cover source-health degraded/failure behavior.
- [ ] Browser or API verification covers `/ai-work-runs` showing the generated
      run.
- [ ] Guardrail added so no future Executive Daily Brief route can call
      generation or delivery without a canonical run id.

## Verification Checklist

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper
      sub-agent.
- [ ] Targeted contract tests run.
- [ ] Targeted workflow tests run.
- [ ] Targeted ledger tests run.
- [ ] Targeted delivery adapter tests run.
- [ ] Supabase migration ledger verified if migrations changed.
- [ ] Generated Supabase types verified if schema changed.
- [ ] Local or staging preview run executed through the gateway.
- [ ] Local or staging scheduled run executed through the gateway.
- [ ] No-send Teams preview/dry-run verified.
- [ ] Real Teams delivery verified only if explicitly safe and enabled.
- [ ] Email delivery verified or explicitly blocked/deferred.
- [ ] `/ai-work-runs` browser verification shows the run and artifact.
- [ ] Generated packet manually inspected for claim-level source refs.
- [ ] Source health manually inspected for loaded/stale/missing/degraded states.
- [ ] End-to-end proof captured with exact run id, artifact id, packet id,
      source count, delivery status, and screenshot/report path.
- [ ] Long-running full checks delegated to cheaper sub-agent if needed.
- [ ] Known unrelated failures documented with exact command, error, owner files,
      and relation to this task.

## Acceptance Criteria

- [ ] One command or scheduled trigger can run the Executive Daily Brief through
      the gateway.
- [ ] The same gateway path is used by preview, dry-run, scheduled run, and
      delivery.
- [ ] Every generated brief has a canonical `ai_work_runs` row.
- [ ] Every run has source health.
- [ ] Every surfaced claim has structured source refs.
- [ ] Every generated packet is stored as an inspectable artifact.
- [ ] Every Teams/email delivery attempt is stored as an inspectable artifact or
      explicit skipped/blocked state.
- [ ] The Operations Control UI can inspect the run without querying Supabase
      directly.
- [ ] Old bypass paths cannot silently generate or deliver outside the ledger.
- [ ] End testing proves the actual generated brief is accurate enough to trace
      each claim back to evidence.

## Evidence

| Check                 | Command / artifact | Result  | Notes                                         |
| --------------------- | ------------------ | ------- | --------------------------------------------- |
| Static/type/lint      | Pending            | Pending | Required before implementation can be closed. |
| Targeted tests        | Pending            | Pending | Required before implementation can be closed. |
| Browser/user-flow     | Pending            | Pending | `/ai-work-runs` proof required.               |
| DB/provider read-back | Pending            | Pending | Required for ledger/config/migrations.        |
| End-to-end proof      | Pending            | Pending | Must include run id, packet id, and artifact. |

## Files Expected To Change

- `docs/ops/tasks/2026-06-19-executive-daily-brief-ai-ops-gateway.md` - source
  of truth for this work.
- `frontend/src/lib/ai-ops/**` or selected canonical equivalent - gateway,
  contracts, registry, workflow, adapters, delivery, artifacts.
- `frontend/src/lib/executive/**` - migrate or retire existing Daily Brief code.
- `frontend/src/app/api/executive/daily-brief/**` - route through the gateway.
- `frontend/scripts/run-executive-daily-brief.ts` - route through the gateway or
  replace with thin wrapper.
- `frontend/src/app/api/admin/ai-work-runs/route.ts` - read canonical run data.
- `frontend/src/app/(admin)/ai-work-runs/**` - show source health, artifacts,
  delivery attempts, and evidence drilldown.
- `supabase/migrations/**` - only if ledger/artifact/evidence schema gaps remain
  after audit.
- `frontend/src/types/database.types.ts` - regenerate if schema changes.
- Tests under the relevant `__tests__` folders.

## Risks / Gaps

- Current brief generation can produce `daily_recaps` without an `ai_work_runs`
  record. This is the main bypass to eliminate.
- Current evidence is not guaranteed as structured claim-level `sourceRefs`.
- Current Teams delivery is gated by environment config and has not been proven
  as a ledger-backed send.
- Current email delivery for this workflow is not proven.
- Existing source/RAG health is split across multiple systems and must be
  normalized, not hidden behind UI-only status.
- This task intentionally does not implement the work yet; it prevents the next
  implementation from being called done until the full checklist is complete.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and
      next action.
- [ ] Final response includes what is done, what remains, and recommended next
      steps.
