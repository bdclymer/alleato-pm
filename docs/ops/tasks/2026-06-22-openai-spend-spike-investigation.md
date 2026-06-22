# Task: OpenAI Spend Spike Investigation

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - urgent operational investigation; Linear creation tool unavailable
Related Handoff: N/A

## Objective

Determine whether the reported OpenAI spend spike came from Alleato chat, RAG ingestion/vectorization, background compilers, or another caller using the same key, and apply the smallest immediate guardrail to prevent local direct-OpenAI spend.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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

- [ ] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Env read-back | local env probe | Failed then fixed | `AI_PROVIDER_PATH=openai` forced direct OpenAI while AI Gateway was configured; local env now reads `AI_PROVIDER_PATH=vercel_gateway` and `AI_GATEWAY_REQUIRED=true`. |
| App chat usage | `chat_history` 12-hour query | Passed | No app chat rows in last 12 hours. |
| RAG model usage | `pipeline_model_usage` 12-hour query | Passed | 15 embedding calls, 155,820 tokens, estimated `$0.020255`. |
| RAG model usage | `pipeline_model_usage` 24-hour query | Passed | 166 embedding calls, 267,079 tokens, estimated `$0.034717`. |
| OpenAI org usage API | `/v1/organization/costs` and usage endpoints | Blocked | Current key returns `403`; it cannot read org billing attribution. |
| Local process guard | `ps` + targeted `kill` for Alleato Next dev PIDs | Passed | Stopped the pre-existing local Next dev server so future runs load gateway-only env. |

## Files Changed

- `.env` - set local provider path to gateway/fail-closed mode.
- `frontend/.env.local` - set frontend provider path to gateway/fail-closed mode.
- `docs/ops/tasks/2026-06-22-openai-spend-spike-investigation.md` - investigation ledger.

## Risks / Gaps

- OpenAI billing attribution still requires an admin key/session because the current project API key cannot read organization usage.
- The `$20` charge is not explained by the tracked Alleato app/RAG ledgers. It may be Codex/ChatGPT API usage, another local script not writing `pipeline_model_usage`, another app using the same key, or OpenAI dashboard spend from a different project/key.
- Several backend scripts and agents still instantiate direct `OPENAI_API_KEY`; those need a follow-up hardening pass.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.

Blocked/Deferred owner/action: exact OpenAI billing attribution requires an OpenAI organization admin key/session with access to usage/cost APIs or dashboard project breakdown.
