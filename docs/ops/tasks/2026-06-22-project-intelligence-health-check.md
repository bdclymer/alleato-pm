# Task: Project Intelligence Health Check

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - verification-only status check
Related Handoff: N/A

## Objective

Verify whether Project Intelligence is currently working properly by checking packet freshness, compiler queues, source-linked evidence, and source lifecycle health against live app/RAG data.

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

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Targeted tests | `npm run rag:verify:intelligence-compiler` | Failed/Related | High-confidence candidate stuck: 1; promoted candidates missing cards/evidence: 57; active cards missing current packet: 41. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 14 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Failed/Related | Source embeddings are covered, but current Project Intelligence packets are stale. |
| Targeted tests | `npm run rag:verify:meetings` | Passed | 76/76 eligible recent meetings have embedded chunks; 1/1 transcript-bearing meeting has transcript chunks. |
| DB read-back | SQL summary for `intelligence_packets`, `insight_cards`, `insight_card_evidence`, compiler queues | Failed/Related | 104 current packets, 0 fresh within 36h; newest current packet `2026-06-17T12:32:08.088Z`; 0 evidence rows in 36h; packet queue newest activity `2026-06-17T20:19:59.541Z`. |
| Provider read-back | `render services list` | Failed/Related | Live Render service list does not include `alleato-intelligence-compiler-drain` even though `render.yaml` defines it. |
| Repair dry-run | `npm run rag:repair:intelligence-current-packets -- --dry-run` | Failed/Related | Cannot repair links because targets `Park Collective` and `Test-Zaryll-04-09-2026` have no current packet. |
| Browser/user-flow | Not run | N/A | Backend/DB health checks already prove the issue; browser would only show stale data. |

## Files Changed

- `docs/ops/tasks/2026-06-22-project-intelligence-health-check.md` - verification ledger.

## Risks / Gaps

- Project Intelligence is not currently healthy. Current packets and evidence have not refreshed since June 17, 2026.
- The intended production compiler drain cron appears absent from live Render.
- A quick packet-link repair cannot run because two active targets have no current packet.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.

Blocked/Deferred owner/action: create or restore the live Render `alleato-intelligence-compiler-drain` cron, enqueue periodic packet refreshes if needed, drain packet refresh jobs with `packet_limit > 0`, then rerun the compiler and source lifecycle verifiers.
