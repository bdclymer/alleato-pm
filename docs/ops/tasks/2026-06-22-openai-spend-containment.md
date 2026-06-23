# Task: OpenAI spend containment and recurring AI cron audit

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - incident containment happened before issue setup
Related Handoff: Not created yet

## Objective

Stop recurring OpenAI spend from Alleato scheduled jobs, identify the live spend path, and define the guardrails required before suspended AI crons can be re-enabled.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, keep `Status` as `Blocked/Deferred` and document the blocker, owner, and next action.

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

- [ ] End-to-end path wired through one owner, not separate disconnected pieces.
- [ ] All entry points for the workflow use the same canonical service/runtime.
- [ ] Source adapters or external dependencies return typed, inspectable results.
- [ ] Run/task/session ledger records every meaningful attempt.
- [ ] Artifacts link back to source evidence and run logs.
- [ ] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [ ] Unit or integration test added/updated for the core behavior.
- [ ] Contract test added/updated for cross-module or source/delivery boundaries.
- [ ] Guardrail added so the same class of bug fails loudly next time.
- [ ] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [ ] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Static/type/lint | Not run | Deferred | No code behavior change in this containment slice. |
| Targeted tests | Not run | Deferred | Durable guardrails still need implementation. |
| Browser/user-flow | Not applicable | Deferred | No frontend change. |
| DB/provider read-back | `vercel env pull /tmp/alleato-vercel-prod.env --environment=production --yes` | Pass | Production has `AI_GATEWAY_API_KEY` set and `OPENAI_API_KEY` set; `AI_PROVIDER_PATH` pulled as empty, so frontend shared provider code should choose gateway when the gateway key is present. Secret values were not recorded. |
| Provider read-back | `render services --output json` filtered to AI crons | Pass | `alleato-microsoft-executive-assistant-check` and `alleato-fireflies-sync` now read back as `suspended`. |
| End-to-end proof | `render logs --resources crn-d8orvmmrnols73etajrg --start 2026-06-22T16:45:00Z --text "Microsoft Executive Assistant produced an answer,insufficient_quota,model"` | Pass | Logs show Microsoft Executive Assistant succeeded before 17:00 UTC, then hit OpenAI `429 insufficient_quota` every 15 minutes from 17:00 through 18:00 UTC. |

## Files Changed

- `docs/ops/tasks/2026-06-22-openai-spend-containment.md` - Incident containment record, evidence, and deferred guardrails.

## Risks / Gaps

- Root cause is contained but not fully remediated: the Microsoft Executive Assistant cron still needs budget gating, provider-path enforcement, and model-cost limits before re-enable.
- OpenAI dashboard attribution still needs owner review or API access to confirm project/key-level spend for the $91 charge.
- The Fireflies cron was also suspended as a precaution; it needs re-enable criteria so transcript ingestion does not stay off longer than intended.
- Linear issue and handoff were not created before containment because this was an active spend incident.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
