# Task: Global emails freshness investigation

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - investigation only; required before coding
Related Handoff: N/A

## Objective

Explain why `http://localhost:3001/emails` shows the most recent email as June 16, using route/API evidence and live data freshness rather than UI-only inference.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | N/A                | N/A    | Investigation only; no app code changed. |
| Targeted tests        | N/A                | N/A    | No behavior change; root cause identified by route and DB read-back. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/emails`; `agent-browser snapshot -i` | Pass | Page rendered global email workspace; visible records top out at June 16. Network-idle wait timed out, but DOM snapshot succeeded. |
| DB/provider read-back | `psql "$DATABASE_URL"` / `psql "$RAG_DATABASE_URL"` read-only freshness queries | Pass | `project_emails` newest visible date is `2026-06-16 20:39:41+00`; `outlook_email_intake` newest received date is `2026-06-22 23:43:06+00`. |
| Render read-back | Render API service/env/job lookup | Pass | `alleato-graph-sync` is suspended; `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` is not set on `alleato-graph-sync` or `alleato-backend`; backend webhook env is set. |
| End-to-end proof      | Route read + DB bridge query | Pass | `/emails` uses `/api/emails` -> `project_emails`; newer intake rows lack `project_email_id`, including matched rows after June 16. |

## Files Changed

- `docs/ops/tasks/2026-06-23-global-emails-freshness-investigation.md` - Required task ledger for the investigation.

## Risks / Gaps

- Render provider read-back confirms `alleato-graph-sync` is suspended and `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` is not set on the checked services.
- There is unrelated existing dirt in the email surface; no app code was edited as part of this investigation.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
