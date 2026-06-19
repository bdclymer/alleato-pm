# Task: Executive Daily Brief AI Operations Gateway proof workflow

Status: In Progress
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-551 - https://linear.app/megankharrison/issue/AAI-551/rebuild-executive-daily-brief-as-ai-operations-gateway-proof-workflow
Related Handoff: docs/ops/handoffs/2026-06-19-S57-executive-daily-brief-ai-ops-gateway.md

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

- [x] Linear issue created before coding starts.
- [x] Existing Hermes/OpenClaw comparison re-read:
      `docs/codebase-map/hermes-vs-openclaw-comparison.md`.
- [x] Pasted ChatGPT recommendation reviewed and accepted with the corrected
      contract-before-schema order.
- [x] Current Daily Brief paths inventoried:
      `frontend/src/lib/executive/brandon-daily-update.ts`.
- [x] Current Daily Brief workflow persistence inventoried:
      `frontend/src/lib/executive/executive-briefing-workflow.ts`.
- [x] Current scheduled runner inventoried:
      `frontend/scripts/run-executive-daily-brief.ts`.
- [x] Current Teams preview route inventoried:
      `frontend/src/app/api/executive/daily-brief/preview-teams/route.ts`.
- [x] Current Teams send route inventoried:
      `frontend/src/app/api/executive/daily-brief/send-teams/route.ts`.
- [x] Current owner briefing delivery path inventoried:
      `frontend/src/lib/executive/owner-briefing-delivery.ts`.
- [x] Current AI work runs admin API/UI inventoried:
      `frontend/src/app/api/admin/ai-work-runs/route.ts` and
      `frontend/src/app/(admin)/ai-work-runs/*`.
- [x] Current ledger migration inventoried:
      `supabase/migrations/20260619090000_create_ai_operations_gateway_ledger.sql`.
- [x] Current source health and RAG/source sync paths inventoried.
- [x] Deprecated or bypassing paths listed explicitly before replacement.
- [x] Single source-of-truth owner chosen for run construction.
- [x] Failure-loudly behavior defined for stale sources, missing evidence,
      disabled delivery, provider failure, quota failure, schedule skip, and
      partial delivery.

## Current Path Inventory

| Path                                                                                             | Current owner                                                  | Keep / wrap / retire                                                          | Inventory finding                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/executive/brandon-daily-update.ts`                                             | Daily Brief generation and source gathering                    | Wrap, then thin/retire internals behind workflow pack and adapters            | Generates packets from operating records, RAG chunks, communications, financial pulse, and enrichment prompts. It owns too many concerns: source fetch, ranking, synthesis, evidence text, source coverage, and product policy. |
| `frontend/src/lib/executive/executive-briefing-workflow.ts`                                      | `daily_recaps` persistence, versioning, approval, follow-ups   | Wrap immediately; later split into artifact persistence and follow-up service | `regenerateExecutiveBriefingDraft()` writes `daily_recaps` and follow-ups but does not create `ai_work_runs`, which is the main bypass.                                                                                         |
| `frontend/src/app/api/executive/daily-brief/route-helpers.ts`                                    | GET packet API and fresh regeneration                          | Wrap through gateway                                                          | `fresh=true` calls `regenerateExecutiveBriefingDraft()` directly and can generate a packet outside the AI operations ledger.                                                                                                    |
| `frontend/src/app/api/executive/daily-brief/preview-teams/route.ts`                              | No-send Teams text/card preview                                | Wrap through gateway                                                          | `fresh=true` regenerates directly and returns a card without a canonical run, artifact, delivery attempt, or claim-level ledger proof.                                                                                          |
| `frontend/scripts/run-executive-daily-brief.ts`                                                  | Scheduled Render runner and partial AI work-run projection     | Keep as thin schedule wrapper only                                            | Creates `ai_operation_events`, `source_sync_runs`, `ai_work_runs`, and `ai_work_run_sources`, but only for this scheduled path. It calls the send route instead of owning generation through a shared runtime.                  |
| `frontend/src/app/api/executive/daily-brief/send-teams/route.ts`                                 | Teams send API                                                 | Wrap through gateway                                                          | Gated by `EXECUTIVE_DAILY_BRIEF_ENABLED`; delegates to owner briefing delivery. Disabled returns HTTP 200 and does not currently guarantee a canonical run row for every call.                                                  |
| `frontend/src/lib/executive/owner-briefing-delivery.ts`                                          | Pipeline B Teams owner briefing delivery                       | Wrap as delivery adapter                                                      | Builds card data from `intelligence_targets`, `intelligence_packets`, and `insight_cards`; audits `source_sync_runs`, not the canonical `ai_work_runs` path.                                                                    |
| `frontend/src/lib/executive/executive-briefing-teams-delivery.ts`                                | Legacy approved `daily_recaps` Teams send                      | Retire or make gateway-only                                                   | Reads latest approved `daily_recaps`, sends to Teams, then sets `sent_teams`; bypasses `ai_work_runs` and delivery attempts.                                                                                                    |
| `frontend/src/app/api/admin/owner-briefing/send-test/route.ts`                                   | Test send route                                                | Retire or make gateway dry-run/test adapter                                   | Bypasses the delivery kill switch and sends a Teams message from `daily_recaps` without a canonical run.                                                                                                                        |
| `frontend/src/app/(main)/actions/executive-briefing-actions.ts`                                  | Executive page actions, approval, source linking, email action | Wrap generation, approval, and email through gateway/artifact services        | Email action uses `sendEmail` from the page action path and `sent_email` flags, not a canonical delivery attempt. Source linking mutates packets/follow-ups directly.                                                           |
| `frontend/src/app/api/admin/ai-work-runs/route.ts` and `frontend/src/app/(admin)/ai-work-runs/*` | AI work-run control UI/API                                     | Keep and expand                                                               | Reads `ai_work_runs`, events, source sync rows, and source rows. It is currently only as complete as the writers; preview/regenerate paths can leave it empty.                                                                  |
| `supabase/migrations/20260619090000_create_ai_operations_gateway_ledger.sql`                     | Phase 1 ledger schema                                          | Keep, audit, likely extend                                                    | Creates `ai_operation_events`, `ai_work_runs`, and `ai_work_run_sources`; explicitly says it does not change underlying generation/delivery. Needs artifact and delivery-attempt coverage or mapped equivalent.                 |
| `frontend/src/app/api/admin/operations-readiness/status/route.ts`                                | Readiness dashboard                                            | Wrap/read canonical ledger                                                    | Daily Brief readiness reads `daily_recaps.sent_teams` and packet source coverage, not canonical run/delivery attempts.                                                                                                          |
| `frontend/src/app/api/admin/source-sync/_contracts.ts` and `status/route.ts`                     | Source sync status contracts/UI API                            | Reuse as source health adapter input                                          | Has typed source health, alerts, recent runs, stuck items, and counts. This should feed run source-health snapshots instead of being UI-only.                                                                                   |
| `frontend/src/lib/ai/tools/executive-brief-tools.ts`                                             | AI assistant tool for brief generation                         | Wrap through tool registry/policy                                             | Tool directly calls `regenerateExecutiveBriefingDraft()`, so assistant-triggered generation can bypass canonical gateway runs.                                                                                                  |
| `frontend/src/lib/ai/tools/project-tools.ts` and sub-tools                                       | Existing broad tool barrel                                     | Reuse selectively through policy                                              | Existing tools are broad and heterogeneous. They need registration/policy before the workflow sees them.                                                                                                                        |
| `backend/src/services/daily_digest.py` and `backend/src/services/scheduler.py`                   | Legacy backend daily digest/email scheduler                    | Retire for Executive Daily Brief unless proven still active                   | Separate Python daily digest path can create conceptual confusion. It should not be treated as the CEO Daily Brief unless explicitly wired through the gateway.                                                                 |

## Inventory Decisions

- Canonical owner for run construction:
  `frontend/src/lib/ai-ops` or the selected equivalent AI operations module.
- Keep `ai_work_runs` as the user-visible operations ledger, but audit/extend it
  before adding tables.
- Keep `daily_recaps` as the current stored brief packet table during migration,
  but it must become an artifact linked to `ai_work_runs`, not the run source of
  truth.
- Keep `/ai-work-runs` as the control UI, but it cannot be considered proof
  until every generation and delivery entry point writes to the same ledger.
- Retire direct model/generation calls from routes and tools after gateway
  wrappers exist.
- Treat disabled delivery, missing evidence, stale sources, provider failures,
  quota failures, and schedule skips as explicit run outcomes, not successful
  no-ops.

## Contract Checklist

- [x] `AiEvent` contract defined for scheduled runs, preview requests,
      source-sync events, Teams/Graph events, Fireflies events, document/RAG
      events, Acumatica events, and Procore events.
- [x] `AiRun` contract defined for queued, running, skipped, succeeded, partial,
      failed retryable, and failed permanent states, with disabled and dry-run
      represented through delivery/run metadata until the ledger audit locks
      exact database statuses.
- [x] `AiRunStep` or equivalent event log contract defined for generation,
      source fetch, synthesis, artifact persistence, delivery, and verification.
- [x] `AiArtifact` contract defined for generated brief packet, Teams payload,
      email payload, source health report, and delivered artifact.
- [x] `EvidenceRef` contract defined with source family, source id, source URL,
      source title, occurred-at timestamp, excerpt, confidence, and project
      linkage.
- [x] `ToolDefinition` contract defined with tool name, description, input
      schema, output schema, owning adapter, and failure shape.
- [x] `ToolPolicy` contract defined for role, project, channel, workflow,
      source access, write permission, and delivery permission.
- [x] `WorkflowDefinition` contract defined with workflow id, version, allowed
      tools, source policy, evidence policy, delivery policy, runtime budget,
      prompt contract, and failure modes.
- [x] `DeliveryAttempt` contract defined for Teams/email recipient, channel,
      payload artifact, sent/skipped/blocked/failed/dry-run status, provider
      response, and retryability.
- [x] Contracts are shared from one stable module, not copied into routes.
- [x] Contracts have unit or type-level tests that fail when required fields are
      omitted.

## Ledger Audit Decision

| Table / surface           | Decision | Reason                                                                                                                | Required follow-up                                                                                                                |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ai_operation_events`     | Keep     | Matches the shared `AiEvent` envelope closely enough for scheduled, preview, source, and delivery-trigger events.     | Route every entry point through this table with explicit idempotency, status, permission context, and failure shape.              |
| `ai_work_runs`            | Extend   | Correct top-level run ledger exists and is already shown in `/ai-work-runs`, but it lacks workflow version and steps. | Add/use metadata for `workflowVersion` now; add first-class step/artifact/delivery attempt rows before end-to-end completion.     |
| `ai_work_run_sources`     | Extend   | Useful evidence projection exists, but current fields are nullable and not enough for claim-level evidence policy.    | Enforce required source identity/excerpt in gateway writes and add artifact/claim linkage when packet persistence is wired.       |
| `daily_recaps`            | Keep     | Existing Executive Daily Brief packet store remains the practical generated packet table during migration.            | Treat as the generated brief packet artifact linked from `ai_work_runs.daily_recap_id`; stop using it as the run source of truth. |
| `/api/admin/ai-work-runs` | Extend   | Current admin API reads runs, events, source sync runs, and evidence rows.                                            | Add step logs, artifacts, delivery attempts, workflow version, and source health detail once ledger rows exist.                   |
| `/ai-work-runs` admin UI  | Extend   | Current UI is useful for top-level run inspection.                                                                    | Add tabs/sections for steps, artifacts, delivery attempts, and claim evidence; keep quiet table-first layout.                     |

## Gateway Foundation Checklist

- [x] Shared AI Ops ledger writer created.
- [x] Ledger writer validates `AiEvent`, `AiRun`, and `EvidenceRef` before
      inserts.
- [x] Ledger writer maps contract fields to existing `ai_operation_events`,
      `ai_work_runs`, and `ai_work_run_sources` columns.
- [x] Ledger writer preserves workflow version, source health, retryability, and
      artifact projections in run metadata until first-class artifact tables are
      added.
- [x] Tests prove invalid run contracts fail before a database write begins.
- [x] Existing scheduled runner uses the shared ledger writer instead of local
      duplicate insert helpers.
- [x] Preview route uses the shared ledger writer.
- [x] Send route uses the shared ledger writer.
- [x] Admin test-send route uses the shared ledger writer or is retired.
- [x] AI tool path uses the shared ledger writer or is retired.

## Ledger Checklist

- [x] Existing `ai_operation_events`, `ai_work_runs`, and `ai_work_run_sources`
      tables audited against the contracts.
- [x] Decision recorded: keep, migrate, extend, or replace each existing AI
      ledger table.
- [ ] `daily_recaps` relationship standardized so every generated Executive
      Daily Brief draft links to exactly one `ai_work_runs` record.
- [x] Preview generation writes a run ledger row.
- [x] Scheduled generation writes a run ledger row.
- [x] Dry-run delivery writes a run ledger row and delivery attempt.
- [ ] Real Teams delivery writes a run ledger row and delivery attempt.
- [x] Email delivery writes a run ledger row and delivery attempt, or the task is
      explicitly blocked/deferred with owner and reason.
- [x] Skipped schedules are recorded as skipped runs with reason.
- [x] Disabled delivery is recorded as disabled, not silently successful.
- [x] Failure state records exact failure code, failure message, owning step, and
      retryability.
- [x] Source health snapshot is stored with each run.
- [x] Generated artifact id and delivered artifact id are stored with each run.
- [x] Migration applied and remote ledger verified if schema changes are needed.
- [x] Generated Supabase types updated after schema changes, if applicable.

## Source Adapter Checklist

- [x] Source adapter interface created for normalized fetch and health output.
- [x] Fireflies/meeting adapter implemented or wrapped.
- [x] Outlook/email adapter implemented or wrapped.
- [x] Teams message adapter implemented or wrapped.
- [x] Documents/RAG adapter implemented or wrapped.
- [x] Acumatica adapter implemented or wrapped.
- [x] Procore/project data adapter implemented or wrapped if used by this brief.
- [x] Project Intelligence packet adapter implemented or wrapped.
- [x] Each adapter returns typed source records and typed health state.
- [x] Each adapter reports loaded, stale, missing, degraded, failed, and skipped.
- [x] Adapter failures fail loudly into the run ledger.
- [ ] No route-level source query remains as a bypass for this workflow.

## Tool Registry And Policy Checklist

- [x] Central tool registry module created or selected.
- [x] Executive Daily Brief tools registered once.
- [x] Source adapter tools registered once.
- [x] Delivery adapter tools registered once.
- [x] Tool visibility filtered before model calls.
- [x] Policy filters by workflow id.
- [ ] Policy filters by actor/role.
- [ ] Policy filters by project/source access.
- [x] Policy filters by channel.
- [x] Policy filters by delivery permission.
- [ ] Tool calls record success/failure and source evidence in the run ledger.
- [x] Tests prove forbidden tools are hidden from the workflow.
- [x] Tests prove disabled delivery tools cannot send.

## Workflow Pack Checklist

- [x] Executive Daily Brief workflow pack created with explicit version.
- [x] Workflow pack declares allowed tools.
- [x] Workflow pack declares required source families.
- [x] Workflow pack declares freshness thresholds.
- [x] Workflow pack declares minimum evidence requirements per claim.
- [x] Workflow pack declares prompt contract.
- [x] Workflow pack declares packet schema.
- [x] Workflow pack declares delivery rules.
- [x] Workflow pack declares degraded-output behavior.
- [x] Workflow pack declares hard-fail conditions.
- [x] Workflow pack declares runtime budget and timeout behavior.
- [x] Workflow pack is used by schedule, preview, dry-run, and send paths.
- [ ] Existing prompt and generation logic migrated into the pack or explicitly
      deprecated.

## Evidence-Linked Packet Checklist

- [x] Packet schema includes structured `sourceRefs` for every surfaced claim.
- [x] `sourceRefs` include source family, id, title, URL or internal route,
      excerpt, occurred-at, confidence, and project linkage.
- [x] Every `needsBrandon` item has at least one source ref.
- [x] Every `waitingOnOthers` item has at least one source ref.
- [x] Every `importantUpdates` item has at least one source ref.
- [ ] Financial claims include Acumatica/source ref or are excluded.
- [ ] Meeting claims include transcript/summary/source ref or are excluded.
- [ ] Email claims include email/source ref or are excluded.
- [ ] Teams claims include message/thread/source ref or are excluded.
- [ ] Document/RAG claims include document/chunk/source ref or are excluded.
- [ ] Placeholder-only source panels count as incomplete.
- [x] Generated packet stores source coverage and source health.
- [x] Generated packet can be inspected from the run ledger.
- [x] Tests fail if a claim lacks source refs.

## Delivery Checklist

- [x] Teams delivery adapter accepts only a gateway-created delivery attempt.
- [x] Email delivery adapter accepts only a gateway-created delivery attempt, or
      email is explicitly deferred with owner and reason.
- [x] Preview/dry-run produces the exact Teams payload without sending.
- [ ] Real Teams send records provider response and recipient result.
- [x] Real email send records provider response and recipient result, or is
      deferred with owner and reason.
- [x] Disabled delivery records disabled state and reason.
- [x] Blocked delivery records blocked state and reason.
- [x] Partial recipient failure records partial success.
- [x] Delivered artifact links to run, packet, recipient/channel, and source
      health.
- [x] Delivery route cannot bypass the ledger.

## Operations Control UI Checklist

- [x] `/ai-work-runs` reads the canonical run ledger.
- [ ] UI shows scheduled, preview, dry-run, skipped, failed, disabled, partial,
      and succeeded runs.
- [x] UI shows source health per run.
- [x] UI shows generated artifact per run.
- [x] UI shows delivery attempts per run.
- [x] UI shows source refs/evidence drilldown per generated packet.
- [x] UI shows exact failure code/message and owning step.
- [x] UI shows retryability and next action.
- [x] UI does not imply success when a run is skipped, disabled, or partial.
- [x] Browser verification proves a real generated brief appears without direct
      Supabase querying.

## Legacy Retirement Checklist

- [x] Old preview path either routes through the gateway or is removed.
- [x] Old scheduled runner either routes through the gateway or is removed.
- [x] Old Teams delivery path either routes through the gateway or is removed.
- [ ] Old source coverage fields that bypass canonical source health are removed
      or marked deprecated.
- [x] Duplicate Daily Brief scripts are removed, blocked, or documented as
      wrappers.
- [x] Route-level model calls for this workflow are removed or blocked.
- [ ] Any remaining legacy path logs a loud deprecation warning and cannot claim
      success without a canonical run id.

## Regression Guardrails

- [x] Unit tests cover contract validation.
- [x] Unit tests cover source adapter health states.
- [x] Unit tests cover tool policy filtering.
- [x] Unit tests cover workflow pack validation.
- [x] Unit tests cover packet source-ref requirements.
- [ ] Integration tests cover preview generation writing `ai_work_runs`.
- [ ] Integration tests cover scheduled generation writing `ai_work_runs`.
- [ ] Integration tests cover dry-run delivery writing delivery attempts.
- [ ] Integration tests cover disabled delivery writing disabled state.
- [x] Integration tests cover source-health degraded/failure behavior.
- [x] Browser or API verification covers `/ai-work-runs` showing the generated
      run.
- [x] Guardrail added so no future Executive Daily Brief route can call
      generation or delivery without a canonical run id.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper
      sub-agent.
- [x] Targeted contract tests run.
- [x] Targeted workflow tests run.
- [x] Targeted ledger tests run.
- [x] Targeted delivery adapter tests run.
- [x] Supabase migration ledger verified if migrations changed.
- [x] Generated Supabase types verified if schema changed.
- [x] Local or staging preview run executed through the gateway.
- [x] Local or staging scheduled run executed through the gateway.
- [x] No-send Teams preview/dry-run verified.
- [ ] Real Teams delivery verified only if explicitly safe and enabled.
- [ ] Email delivery verified or explicitly blocked/deferred.
- [x] `/ai-work-runs` browser verification shows the run and artifact.
- [x] Generated packet manually inspected for claim-level source refs.
- [x] Source health manually inspected for loaded/stale/missing/degraded states.
- [x] End-to-end proof captured with exact run id, artifact id, packet id,
      source count, delivery status, and screenshot/report path.
- [x] Long-running full checks delegated to cheaper sub-agent if needed.
- [x] Known unrelated failures documented with exact command, error, owner files,
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

| Check                 | Command / artifact                                                                                                                                                                        | Result  | Notes                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| AI Ops focused lint   | `cd frontend && npx eslint src/lib/ai-ops/contracts.ts src/lib/ai-ops/ledger.ts src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts`                       | Passed  | Contract and ledger module lint cleanly.                                                           |
| Route ledger lint     | `cd frontend && npx eslint src/lib/ai-ops/executive-daily-brief-ledger.ts src/app/api/executive/daily-brief/preview-teams/route.ts src/app/api/executive/daily-brief/send-teams/route.ts` | Passed  | Preview/send route ledger wiring lint cleanly.                                                     |
| Bypass wrapper lint   | `cd frontend && npx eslint src/app/api/admin/owner-briefing/send-test/route.ts src/lib/ai/tools/executive-brief-tools.ts src/lib/ai-ops/executive-daily-brief-ledger.ts`                  | Passed  | Admin test-send and AI tool bypasses lint cleanly after ledger wrapping.                           |
| App bypass lint       | `cd frontend && npx eslint src/lib/ai-ops/executive-daily-brief-ledger.ts src/app/api/executive/daily-brief/preview-teams/route.ts src/app/api/executive/daily-brief/route-helpers.ts src/app/api/executive/daily-brief/widget/route.ts 'src/app/(main)/actions/executive-briefing-actions.ts' src/app/api/executive/daily-brief/__tests__/route.test.ts src/app/api/executive/brandon-daily-update/__tests__/route.test.ts` | Passed  | Route helper, widget, server action, preview route, and route tests lint cleanly after removing raw app generator imports. |
| Runner forced lint    | `cd frontend && npx eslint --no-ignore scripts/run-executive-daily-brief.ts`                                                                                                              | Passed  | Script is ignored by default ESLint config, so it was linted with `--no-ignore`.                   |
| AI Ops focused tests  | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts --runInBand`                                     | Passed  | 2 suites, 11 tests passed. Required fields and pre-write validation fail loudly.                   |
| App route tests       | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts src/app/api/executive/daily-brief/__tests__/route.test.ts src/app/api/executive/brandon-daily-update/__tests__/route.test.ts --runInBand` | Passed  | 4 suites, 16 tests passed. Fresh packet routes now assert the ledger-backed helper is used.        |
| Gateway guardrail     | `npm run rag:verify:executive-daily-brief-gateway`                                                                                                                                       | Passed  | Blocks raw `regenerateExecutiveBriefingDraft` usage under `frontend/src/app` so route/action generation cannot bypass the AI Ops ledger. |
| Artifact linkage lint | `cd frontend && npx eslint src/lib/ai-ops/contracts.ts src/lib/ai-ops/ledger.ts src/lib/ai-ops/executive-daily-brief-ledger.ts src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts src/lib/ai/tools/executive-brief-tools.ts src/app/api/executive/daily-brief/preview-teams/route.ts src/app/api/admin/owner-briefing/send-test/route.ts src/app/api/admin/ai-work-runs/route.ts 'src/app/(admin)/ai-work-runs/ai-work-runs-client.tsx'` | Passed  | Contract/writer, AI tool, preview/admin send routes, admin API, and run UI lint cleanly after `daily_recap_id` linkage. |
| Artifact linkage tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts --runInBand`                                  | Passed  | 2 suites, 13 tests passed. Tests now prove `dailyRecapId` is accepted and mapped to `ai_work_runs.daily_recap_id`. |
| Run artifact migration | `bash -lc 'set -a; source .env; set +a; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260619183000_add_ai_work_run_artifacts_delivery_attempts.sql'` | Passed | Created `ai_work_run_steps`, `ai_work_run_artifacts`, and `ai_work_run_delivery_attempts` on the linked database. |
| Migration ledger      | `npm run db:migrations:verify-applied -- supabase/migrations/20260619183000_add_ai_work_run_artifacts_delivery_attempts.sql`                                                            | Passed  | Remote Supabase migration ledger reports `20260619183000` applied. |
| Supabase type gate    | `bash -lc 'set -a; source .env; set +a; tmp=$(mktemp); SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > "$tmp" && test -s "$tmp" && mv "$tmp" frontend/src/types/database.types.ts'` | Passed | Generated types now include the new AI work-run step/artifact/delivery tables. |
| Run artifact lint     | `cd frontend && npx eslint src/lib/ai-ops/contracts.ts src/lib/ai-ops/ledger.ts src/lib/ai-ops/executive-daily-brief-ledger.ts src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts src/app/api/executive/daily-brief/preview-teams/route.ts src/app/api/executive/daily-brief/send-teams/route.ts src/app/api/admin/owner-briefing/send-test/route.ts src/app/api/admin/ai-work-runs/route.ts 'src/app/(admin)/ai-work-runs/ai-work-runs-client.tsx'` | Passed | Ledger writers, Daily Brief routes, admin API, and admin UI lint cleanly after first-class artifacts/delivery attempts. |
| Run artifact tests    | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts --runInBand`                                  | Passed  | 2 suites, 17 tests passed. Tests cover step, artifact, delivery-attempt mapping and pre-write validation. |
| Workflow pack lint    | `cd frontend && npx eslint src/lib/ai-ops/source-adapters.ts src/lib/ai-ops/executive-daily-brief-workflow.ts src/lib/ai-ops/tool-registry.ts src/lib/ai-ops/executive-daily-brief-ledger.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts src/lib/ai-ops/__tests__/contracts.test.ts && npx eslint --no-ignore scripts/run-executive-daily-brief.ts` | Passed | Source adapters, workflow pack, tool registry, run helper, workflow tests, and scheduled runner lint cleanly. |
| Workflow pack tests   | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/contracts.test.ts src/lib/ai-ops/__tests__/ledger.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts --runInBand` | Passed | 3 suites, 22 tests passed. Tests prove source adapter health states, workflow pack validation, policy channel filtering, forbidden tool hiding, and disabled delivery send-tool hiding. |
| Evidence policy lint  | `cd frontend && npx eslint src/lib/ai-ops/executive-daily-brief-evidence.ts src/lib/ai-ops/executive-daily-brief-ledger.ts src/lib/ai-ops/__tests__/executive-daily-brief-evidence.test.ts` | Passed | Evidence-policy module, run-ledger integration, and source-ref guardrail tests lint cleanly. |
| Evidence policy tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/executive-daily-brief-evidence.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts src/lib/ai-ops/__tests__/ledger.test.ts --runInBand` | Passed | 3 suites, 17 tests passed. Tests prove all surfaced sections require structured citation evidence and missing/malformed evidence fails before ledger writes. |
| Packet sourceRefs lint | `cd frontend && npx eslint --no-ignore src/lib/ai-ops/executive-daily-brief-evidence.ts src/lib/ai-ops/__tests__/executive-daily-brief-evidence.test.ts src/lib/executive/brandon-daily-update.ts src/lib/executive/executive-briefing-workflow.ts src/lib/executive/__tests__/executive-briefing-workflow.test.ts` | Passed | Packet source-ref type, evidence builder, workflow persistence, and focused tests lint cleanly. |
| Packet sourceRefs tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/executive-daily-brief-evidence.test.ts --runInBand`; `cd frontend && npm run test:unit -- --runTestsByPath src/lib/executive/__tests__/executive-briefing-workflow.test.ts --runInBand` | Passed | 2 suites, 8 tests passed. Tests prove source refs include source family, id, title, internal routes, excerpts, occurred-at, confidence/project linkage, and regenerated packets persist item-level `sourceRefs` into `daily_recaps.briefing_packet`. |
| Gateway guardrail rerun | `npm run rag:verify:executive-daily-brief-gateway` | Passed | Raw app-route generation bypass guard still passes after evidence-policy extraction. |
| Scheduled runner lint | `cd frontend && npx eslint --no-ignore scripts/run-executive-daily-brief.ts scripts/__tests__/run-executive-daily-brief.test.ts` | Passed | Scheduled runner and node test lint cleanly after preserving explicit runtime env over `.env.local`. |
| Scheduled runner tests | `cd frontend && npx tsx --test scripts/__tests__/run-executive-daily-brief.test.ts` | Passed | 3 node tests passed for delivery projection, partial recipient projection, and scheduled source-ref extraction. |
| Skipped schedule proof | `cd frontend && EXECUTIVE_DAILY_BRIEF_ENABLED=true EXECUTIVE_DAILY_BRIEF_TARGET_TIMEZONE=America/Indiana/Indianapolis EXECUTIVE_DAILY_BRIEF_TARGET_LOCAL_TIME=03:17 EXECUTIVE_DAILY_BRIEF_TARGET_WEEKDAYS=1,2,3,4,5 EXECUTIVE_DAILY_BRIEF_TRIGGER=codex_skipped_schedule_proof npx tsx scripts/run-executive-daily-brief.ts --now=2026-06-19T12:00:00.000Z` | Passed | Created skipped scheduled-check run `00f52478-deba-40e6-bac6-e487ceb75778` with reason `Outside target local schedule.` and source-health status skipped. |
| Scheduled trigger proof | `cd frontend && EXECUTIVE_DAILY_BRIEF_ENABLED=true EXECUTIVE_DAILY_BRIEF_FRONTEND_BASE_URL=http://localhost:3001 EXECUTIVE_DAILY_BRIEF_TARGET_TIMEZONE=America/Indiana/Indianapolis EXECUTIVE_DAILY_BRIEF_TARGET_LOCAL_TIME=08:00 EXECUTIVE_DAILY_BRIEF_TARGET_WEEKDAYS=1,2,3,4,5 EXECUTIVE_DAILY_BRIEF_TRIGGER=codex_scheduled_disabled_delivery_proof CRON_SECRET=dummy-nonsecret npx tsx scripts/run-executive-daily-brief.ts --now=2026-06-19T12:00:00.000Z` | Passed | Created scheduled run `4b4bcd6a-a401-4db0-8970-3c96a9c6a2f8`; downstream disabled delivery run `10e04a08-c1dd-4ac3-8847-75950f94bcc4`; no Teams send occurred because the route kill switch remained disabled. |
| Scheduled run SQL readback | SQL readback for triggers `codex_scheduled_disabled_delivery_proof` and `codex_skipped_schedule_proof` | Passed | Latest rows show scheduled run `4b4bcd6a-a401-4db0-8970-3c96a9c6a2f8` as `skipped/disabled`, skipped schedule `00f52478-deba-40e6-bac6-e487ceb75778` as `skipped/skipped`, and the earlier missing-secret failure `d56b69e2-13a1-4efa-9eff-98b15e65167d` as `failed_permanent` with `CRON_SECRET is required.` |
| Teams delivery route lint | `cd frontend && npx eslint src/app/api/executive/daily-brief/__tests__/send-teams-route.test.ts src/app/api/executive/daily-brief/send-teams/route.ts` | Passed | Send route and targeted delivery tests lint cleanly. |
| Teams delivery route tests | `cd frontend && npm run test:unit -- --runTestsByPath src/app/api/executive/daily-brief/__tests__/send-teams-route.test.ts src/app/api/executive/daily-brief/__tests__/route.test.ts src/lib/ai-ops/__tests__/ledger.test.ts --runInBand` | Passed | 3 suites, 17 tests passed. Tests prove disabled delivery records before provider send, dry-run records payload/evidence/completion, blocked provider results record blocked outcomes, partial recipient failures record partial success, and thrown provider errors fail the run. |
| Source adapter lint | `cd frontend && npx eslint src/lib/ai-ops/source-adapters.ts src/lib/ai-ops/executive-daily-brief-ledger.ts src/lib/ai-ops/__tests__/source-adapters.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts` | Passed | Source adapter wrapper, run-ledger integration, and adapter tests lint cleanly. |
| Source adapter tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai-ops/__tests__/source-adapters.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts src/lib/ai-ops/__tests__/ledger.test.ts src/lib/ai-ops/__tests__/executive-daily-brief-evidence.test.ts --runInBand` | Passed | 4 suites, 19 tests passed. Tests prove all Executive Daily Brief adapters map from source health and required missing adapters create failed-retryable source-fetch steps. |
| Source adapter live proof | Authenticated POST to `/api/executive/daily-brief/preview-teams` with `fresh=true` | Passed | Client timed out at 30s, but server completed run `0c3b8979-3a31-4aab-98d0-a975ab845e21` as succeeded/dry-run, linked packet `1399b250-4151-429c-a3ce-156e0a161ba9`, and stored source-health report, brief-packet, and Teams-payload artifacts. |
| Source adapter SQL readback | SQL readback for run `0c3b8979-3a31-4aab-98d0-a975ab845e21` | Passed | Source-fetch steps show Fireflies loaded/succeeded, Outlook missing/failed-retryable, Teams loaded/succeeded, Documents/RAG loaded/succeeded, Acumatica missing/failed-retryable, Procore skipped, and Project Intelligence missing/failed-retryable. |
| Source adapter browser proof | Playwright-authenticated `/ai-work-runs` capture | Passed | Page text shows run `0c3b8979-3a31-4aab-98d0-a975ab845e21`, `source health report`, source-fetch steps, and `SOURCE_ADAPTER_MISSING`. Artifacts: `tests/agent-browser-runs/2026-06-19-executive-daily-brief-source-adapters/page-text.txt`, `ai-work-runs-source-adapters.png`. |
| Legacy Teams path lint | `cd frontend && npx eslint src/app/api/cron/executive-daily-brief/route.ts src/app/api/cron/executive-daily-brief/__tests__/route.test.ts src/lib/executive/executive-briefing-teams-delivery.ts src/lib/executive/__tests__/executive-briefing-teams-delivery.test.ts` | Passed | Cron route and deprecated legacy sender lint cleanly after routing scheduled Teams delivery through the canonical gateway. |
| Legacy Teams path tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/executive/__tests__/executive-briefing-teams-delivery.test.ts src/app/api/cron/executive-daily-brief/__tests__/route.test.ts src/app/api/executive/daily-brief/__tests__/send-teams-route.test.ts --runInBand` | Passed | 3 suites, 12 tests passed. Tests prove the cron route proxies POST/GET to `/api/executive/daily-brief/send-teams`, the deprecated direct Teams sender throws, and canonical delivery route ledger tests still pass. |
| Email delivery action lint | `cd frontend && npx eslint 'src/app/(main)/actions/executive-briefing-actions.ts' 'src/app/(main)/actions/__tests__/executive-briefing-actions.test.ts' src/lib/ai-ops/executive-daily-brief-ledger.ts` | Passed | Executive email action, action test, and email-payload artifact helper lint cleanly. |
| Email delivery action tests | `cd frontend && npm run test:unit -- --runTestsByPath 'src/app/(main)/actions/__tests__/executive-briefing-actions.test.ts' src/lib/ai-ops/__tests__/ledger.test.ts src/lib/ai-ops/__tests__/contracts.test.ts --runInBand` | Passed | 3 suites, 19 tests passed. Tests prove successful email sends start an AI Ops email run, record packet evidence, persist an email payload artifact, record per-recipient provider message attempts, and complete the run; provider errors record failed retryable recipient attempts and a failed run. |
| Admin UI drilldown lint | `cd frontend && npx eslint src/app/api/admin/ai-work-runs/route.ts 'src/app/(admin)/ai-work-runs/ai-work-runs-client.tsx'` | Passed | Admin API and run-inspection UI lint cleanly after exposing source URL/internal route/project linkage and adding Run Guidance plus Packet Evidence Drilldown. |
| Admin UI drilldown browser proof | Playwright-authenticated `/ai-work-runs` capture | Passed | Page stayed on `/ai-work-runs` and rendered `Run Guidance`, `retryability`, `nextAction`, and `Packet Evidence Drilldown` for run `0c3b8979-3a31-4aab-98d0-a975ab845e21`. Artifacts: `tests/agent-browser-runs/2026-06-19-executive-daily-brief-ui-drilldown/page-text-playwright.txt`, `ai-work-runs-ui-drilldown-playwright.png`. |
| Legacy script lint/syntax | `python -m py_compile backend/src/services/scheduler.py backend/scripts/generate_daily_recap.py`; `cd frontend && npx eslint --no-ignore scripts/regenerate-executive-briefing.ts scripts/preview-brandon-teams-message.ts`; `npm run rag:verify:executive-daily-brief-gateway` | Passed | Backend legacy scheduler/script syntax, frontend script lint, and app/script raw-regeneration guardrail pass. |
| Legacy script blocked proof | `python backend/scripts/generate_daily_recap.py 2> /tmp/legacy-daily-recap-blocked.err; exit_code=$?; cat /tmp/legacy-daily-recap-blocked.err; echo "exit_status=$exit_code"; test "$exit_code" -eq 2` | Passed | Standalone backend legacy daily recap script exits 2 by default and tells operators to use `frontend/scripts/run-executive-daily-brief.ts` and the AI Ops gateway ledger. |
| Runner no-write smoke | `cd frontend && npx tsx scripts/run-executive-daily-brief.ts --now=2026-06-19T12:00:00.000Z`                                                                                              | Passed  | Kill switch off; script loaded and exited with `executive_daily_brief_disabled`, no send/write.    |
| Disabled send smoke   | `curl -sS -X POST http://localhost:3001/api/executive/daily-brief/send-teams -H 'content-type: application/json' -d '{}'`                                                                 | Passed  | Kill switch off; route returned disabled state with run id `b88b3b30-b766-4aa2-8e02-84ef175e207b`. |
| Disabled run SQL readback | `select r.id, r.status, r.delivery_status, a.status, a.failure_code, s.step_type, s.status ... where r.id = 'b88b3b30-b766-4aa2-8e02-84ef175e207b'` | Passed | Readback returned `skipped`, `disabled`, delivery attempt `disabled`, failure code `EXECUTIVE_DAILY_BRIEF_DISABLED`, and delivery step `blocked`. |
| Disabled tool-policy readback | `select r.id, r.status, r.delivery_status, r.tool_scope->'visibleToolNames' ? 'build-teams-daily-brief-payload', r.tool_scope->'hiddenToolNames' ? 'send-teams-daily-brief', r.tool_scope->>'allowDelivery', r.source_policy->>'workflowVersion', r.source_policy->>'minimumEvidenceRefsPerClaim' ... where r.id = 'ba4aa0c7-7c6d-41a0-9dd6-20ffe2a20978'` | Passed | Readback returned visible Teams payload builder `true`, hidden Teams send tool `true`, `allowDelivery=false`, workflow version `2026-06-19.ai-ops-gateway-v1`, and minimum evidence refs `1`. |
| Generated preview API | Authenticated browser-context POST to `/api/executive/daily-brief/preview-teams` with `{ fresh: true, windowDays: 3, firstName: "Brandon" }` | Passed | Returned HTTP 200 with run id `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e`, item count `4`, recap date `2026-06-19`, and `generatedFresh=true`. |
| Generated preview ledger readback | SQL aggregate for run `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e` | Passed | Run succeeded, delivery dry-run, packet id `1399b250-4151-429c-a3ce-156e0a161ba9`, source health count `4`, source refs `4`, artifacts `2`, delivery attempts `1`, and Teams send tool hidden. |
| Generated preview artifact linkage | SQL join from `ai_work_run_delivery_attempts` to `ai_work_run_artifacts` for run `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e` | Passed | Delivery attempt `da3274c5-ef33-4a26-83c7-2044fdebc56a` links to `teams_payload` artifact `Executive Daily Brief Teams preview payload`. |
| Generated packet source inspection | SQL extraction from `daily_recaps.briefing_packet` for packet `1399b250-4151-429c-a3ce-156e0a161ba9` | Passed | 4 surfaced items inspected; each item had 1 citation. Sample cited evidence covered operating-record and Acumatica CO claims. |
| Generated source health inspection | SQL `jsonb_array_elements(ai_work_runs.metadata->'sourceHealth')` for run `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e` | Passed | Email source health was missing; Teams, meeting, and document source health were loaded with counts 3, 15, and 63. |
| Generated preview browser proof | Playwright-authenticated browser capture of `/ai-work-runs` | Passed | Page stayed on `/ai-work-runs` and text shows run `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e`, `succeeded`, `dry run`, `brief packet`, `teams payload`, Delivery Attempts, and Evidence Rows. Artifacts: `tests/agent-browser-runs/2026-06-19-executive-daily-brief-generated-preview/page-text-playwright.txt`, `ai-work-runs-generated-preview-playwright.png`. |
| Admin UI/API readback | `agent-browser state load frontend/tests/.auth/user.json && agent-browser open http://localhost:3001/ai-work-runs ...`                                                                    | Passed  | Authenticated page stayed on `/ai-work-runs`; page text shows disabled run `b88b3b30-b766-4aa2-8e02-84ef175e207b`, Delivery Attempts, Run Steps, exact failure code/message, and retryability. Artifacts: `tests/agent-browser-runs/2026-06-19-executive-daily-brief-ai-runs/snapshot-playwright-auth.txt`, `page-text.txt`, `ai-work-runs-playwright-auth.png`. |
| Static/type/lint      | `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`                                                                                                  | Failed  | Current slice diagnostics were fixed. Remaining errors are unrelated repo debt in `src/app/(admin)/admin/page.tsx`, `src/app/(main)/[projectId]/intelligence/page.tsx`, `src/features/ai-agents/ai-agent-dag.tsx`, `src/features/kanban/components/board-column.tsx`, `src/lib/executive/brandon-daily-update.ts`, and `src/lib/progress-reports/ai-generate.ts`. A cheaper sub-agent also ran the default command and hit Node heap OOM before diagnostics. |
| Targeted tests        | Pending                                                                                                                                                                                   | Pending | Gateway/runtime tests still required before implementation can be closed.                          |
| Browser/user-flow     | Pending                                                                                                                                                                                   | Pending | `/ai-work-runs` proof required.                                                                    |
| DB inventory          | `npm run db:inventory`                                                                                                                                                                   | Failed  | The three new AI work-run tables are documented and were not reported missing, but the command fails on pre-existing inventory drift across existing MAIN/RAG tables such as `ai_agents`, `ai_work_runs`, `ai_operation_events`, Graph/Outlook RAG tables, and project intelligence tables. |
| DB/provider read-back | `select table_name from information_schema.tables where table_schema = 'public' and table_name in ('ai_work_run_steps','ai_work_run_artifacts','ai_work_run_delivery_attempts')`          | Passed  | Linked database returned all three new tables.                                                     |
| End-to-end proof      | Pending                                                                                                                                                                                   | Pending | Must include run id, packet id, and artifact.                                                      |
| Planning gate         | Linear AAI-551 plus this task file and S57 handoff                                                                                                                                        | Passed  | Linear issue created before coding; architecture recommendation accepted with corrected order.     |

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
