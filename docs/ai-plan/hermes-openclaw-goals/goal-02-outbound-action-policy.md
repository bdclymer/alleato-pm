# Goal 2 - Outbound Action Policy

## Outcome

Alleato has a central AI tool policy hook layer that preserves the current confirmed-write gate, redacts tool outputs before tracing/rendering, and gives the runtime a clean before/after tool-call contract.

## Source Material

REFERENCE/ADAPT source:

- `openclaw/packages/agent-core/src/agent-loop.ts`
- `openclaw/packages/agent-core/src/agent.ts`
- `openclaw/packages/agent-core/src/agent-loop.test.ts`

Alleato target/current files:

- `frontend/src/lib/ai/tool-registry.ts`
- `frontend/src/lib/ai/tools/action-tools.ts`
- `frontend/src/lib/ai/email-operator-policy.ts`
- `frontend/src/lib/ai/action-capabilities.ts`
- `frontend/src/lib/ai/tools/outbound-action-policy.ts` (new)
- `docs/ai-plan/evals/assistant-eval-suite.json`

## AI SDK Requirement

This goal touches Vercel AI SDK tool execution. Use the AI SDK skill and verify current APIs in local `node_modules/ai/docs` or `node_modules/ai/src` before writing wrappers. Do not rely on memory for tool-call shape, stream behavior, or agent APIs.

## Acceptance Criteria

- A central policy module owns write approval and tool-output redaction.
- Existing `confirmed` write behavior remains exact: unconfirmed external writes are blocked or draft-only.
- Tool execution has explicit `beforeToolCall` and `afterToolCall` semantics even if implemented as Alleato-native wrappers.
- Secret-bearing tool output is redacted before traces, UI, or logs.
- The rollout is feature-flagged and defaults off until verified.
- Per-tool ad-hoc confirmed checks are archived only after the shared gate proves ownership.

## Failure-Loudly Behavior

- A blocked write returns a typed denial reason, not an empty tool result.
- Redaction failures fail the tool result safely instead of leaking secrets.
- The eval suite catches high-risk write attempts that bypass confirmation.

## Verification

Main-thread targeted checks:

- Unit tests for unconfirmed write blocked.
- Unit tests for redaction before trace/UI content.
- Unit tests for terminate/deny behavior.
- Eval-suite extension for high-risk draft-only guard.

Delegated verification:

- `npm run quality`
- Eval-suite verifier for assistant write tools.

## Archive/Deletion Rule

Only remove per-tool `confirmed` checks from `action-tools.ts` after the central policy module has a guardrail test proving it owns that behavior. Dead branches in `email-operator-policy.ts` and `action-capabilities.ts` should be deleted or marked deprecated in the same goal.
