# Task: Goal 7 C10 - Code-Mode RPC Security Decision

Status: Published
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-566 - https://linear.app/megankharrison/issue/AAI-566/goal-7-c10-code-mode-rpc-security-review-and-sandbox-decision
Related Handoff: docs/ops/handoffs/2026-06-19-S67-code-mode-rpc-security-decision.md

## Objective

Complete the required security review and sandbox decision for Goal 7 C10 before
any arbitrary-code-execution or Code-Mode RPC runtime is implemented, and add a
repo guardrail that fails loudly if runtime work appears before approval.

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

## Acceptance Criteria

- Hermes `code_execution_tool.py` is reviewed and documented as REFERENCE only.
- C10 does not implement arbitrary code execution in this slice.
- The security decision explicitly approves, rejects, or defers Code-Mode RPC.
- If deferred/not approved, the doc states what controls and escape tests are
  required before implementation.
- A verifier fails loudly if Code-Mode RPC runtime paths or flags appear while
  the decision is not approved.
- The decision names the required sandbox, env scrubbing, tool allowlist,
  net-policy, timeouts, output caps, observability, and failure-status controls.

## Failure-Loudly Behavior

If a future change introduces Code-Mode RPC runtime markers before the decision
is approved, `scripts/verify/verify_code_mode_rpc_guardrail.mjs` exits non-zero
with the path or marker that violated the gate. If the decision document is
missing required sections or source usage, the same verifier exits non-zero
before any runtime implementation can be treated as safe.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Planned Files

- `docs/ai-plan/security/code-mode-rpc-security-decision.md` - C10 decision and required controls.
- `scripts/verify/verify_code_mode_rpc_guardrail.mjs` - focused guardrail verifier.
- `docs/ops/tasks/2026-06-19-code-mode-rpc-security-decision.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S67-code-mode-rpc-security-decision.md` - handoff evidence.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture decision note.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` - orchestration ledger.

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
| Static/type/lint      | `node --check scripts/verify/verify_code_mode_rpc_guardrail.mjs` | PASS | Verifier parses as ESM after fixing initial CommonJS `require` mistake. Cause: `.mjs` runs in ES module scope. Detection gap: first run caught it before publish. Prevention: syntax check is now recorded evidence. |
| Targeted tests        | `node scripts/verify/verify_code_mode_rpc_guardrail.mjs` | PASS | Decision is not approved and no runtime implementation markers were found. |
| Browser/user-flow     | Not applicable | PASS | No frontend UI added; this is a security decision/guardrail slice. |
| DB/provider read-back | Not applicable | PASS | No schema, migration, provider, or environment change. |
| End-to-end proof      | `docs/ai-plan/security/code-mode-rpc-security-decision.md`; `node scripts/verify/verify_code_mode_rpc_guardrail.mjs`; `npm run linear:codex:check -- docs/ops/handoffs/2026-06-19-S67-code-mode-rpc-security-decision.md` | PASS | Required decision exists, runtime remains blocked, and handoff contract passes. |
| Publish               | `npm run codex:finish -- --message "Add code-mode RPC security decision" --files ...` | PASS | Published to `origin/main` at `e9d736b2df`; route/nonprod gates passed and `HEAD == origin/main` verified. |

## Files Changed

- `docs/ai-plan/security/code-mode-rpc-security-decision.md` - security/sandbox decision.
- `scripts/verify/verify_code_mode_rpc_guardrail.mjs` - verifier that blocks premature runtime implementation.
- `docs/ops/tasks/2026-06-19-code-mode-rpc-security-decision.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S67-code-mode-rpc-security-decision.md` - handoff evidence.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture/security decision note.
- `docs/ops/orchestration/session-board.md` - S67 ownership row.
- `docs/ops/orchestration/review-queue.md` - S67 review row.

## Risks / Gaps

- Code-Mode RPC remains intentionally deferred. A future build still needs a
  dedicated implementation issue after sandbox approval.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
