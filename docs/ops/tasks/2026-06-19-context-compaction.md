# Task: Context Compaction

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-562 - https://linear.app/megankharrison/issue/AAI-562/goal-6-context-compaction-for-long-assistant-chats
Related Handoff: docs/ops/handoffs/2026-06-19-S64-context-compaction.md

## Objective

Implement Goal 6 from `docs/ai-plan/hermes-openclaw-goals/goal-06-context-compaction.md`: long AI assistant chats compact old context at turn boundaries while preserving system/developer instructions, high-value head context, the recent tail, and a refreshable summary of the middle.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Source References

- `docs/ai-plan/hermes-openclaw-goals/goal-06-context-compaction.md`
- `openclaw/packages/agent-core/src/harness/compaction/compaction.ts`
- `openclaw/packages/agent-core/src/harness/compaction/branch-summarization.ts`
- `openclaw/packages/agent-core/src/harness/compaction/utils.ts`
- `openclaw/packages/agent-core/src/harness/compaction/compaction.test.ts`
- `hermes-agent/agent/context_compressor.py`
- `hermes-agent/tests/agent/test_context_compressor.py`

## Scope Checklist

- [x] Local AI SDK docs/source verified before `generateText`, message, or tool-call handling changes.
- [x] Existing `handler-v2.ts` context-building, token-budget, fallback, and naive truncation paths reviewed.
- [x] Existing model/provider helpers reviewed for summarization model selection.
- [x] OpenClaw compaction references reviewed before implementation.
- [x] Hermes context compressor references reviewed before implementation.
- [x] Source-of-truth owner chosen for compaction decisions and compacted payload metadata.
- [x] Deprecated or bypassed naive truncation paths identified.
- [x] Acceptance criteria written as observable behavior.
- [x] Failure-loudly behavior defined for summarization failure, hard token-limit overflow, and malformed message payloads.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Add shared compaction module at `frontend/src/lib/ai/stream/compaction.ts` or justified equivalent.
- [x] Compaction only runs over a token threshold.
- [x] System prompt and safety/developer instructions are preserved verbatim.
- [x] Head context and last N turns remain verbatim.
- [x] Old bulky tool results are reduced to inspectable one-line summaries.
- [x] Existing compaction summary is refreshed instead of accumulating repeated summaries.
- [x] Historical images or large binary references are replaced with safe placeholders.
- [x] Rollout is feature-flagged and default-off until evals pass.
- [x] `handler-v2.ts` uses the canonical compaction module with clear precedence over naive truncation.
- [x] Compacted payload records what was summarized, retained, and dropped.
- [x] Errors are specific and actionable; no silent fallback added.

## Integration Checklist

- [x] Under-threshold chat path remains unchanged.
- [x] Over-threshold chat path can pass compacted messages into the AI SDK stream/generation path.
- [x] Summarization failure continues with un-compacted context only when within hard token limits.
- [x] Summarization failure returns a specific compaction failure when over hard token limits.
- [x] Existing summaries refresh idempotently and do not stack duplicate summary messages.
- [x] Tool call/result pairs remain inspectable enough to debug source evidence.
- [x] Run/task/session ledger records meaningful verification attempts.

## Regression Guardrails

- [x] Unit tests cover under-threshold no-op.
- [x] Unit tests cover over-threshold preservation of system/head/tail.
- [x] Unit tests cover summary refresh idempotency.
- [x] Unit tests cover bulky tool-result pruning.
- [x] Tests fail if recent turns disappear.
- [x] Tests fail if system/developer instructions disappear.
- [x] Guardrail or test covers image/binary placeholder replacement.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated tests run.
- [x] Assistant eval or focused long-context proof run.
- [x] End-to-end proof captured for actual compacted-vs-uncompacted behavior.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| AI SDK docs/source    | `rg -n "generateText\\(|ModelMessage|convertToModelMessages" node_modules/ai/docs node_modules/ai/src node_modules/ai/dist` | Passed | Verified current AI SDK `ModelMessage`, `generateText`, `streamText`, and `convertToModelMessages` shapes before implementation. |
| Reference review      | `openclaw/.../compaction.ts`, `openclaw/.../utils.ts`, `hermes-agent/agent/context_compressor.py`, `hermes-agent/tests/agent/test_context_compressor.py` | Passed | Adopted reference-only summary semantics, head/tail protection, tool-result pruning, binary placeholders, and summary refresh behavior. |
| Static/type/lint      | `cd frontend && npm run quality:changed` | Passed | No new ESLint debt, no new `any`, unsafe-pattern guard passed, no changed API routes. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/stream/__tests__/compaction.test.ts --runInBand` | Passed | 1 suite, 5 tests. |
| Long-context proof    | Focused Jest over threshold/hard-limit cases | Passed | Proves under-threshold no-op, over-threshold compaction, summary refresh, tool/binary pruning, and hard-limit failure. |
| End-to-end proof      | Handler integration through `convertToModelMessages` -> `maybeCompactModelMessages` -> `streamText` | Passed | Feature flag default-off; compacted messages replace model messages only when enabled and over threshold; metadata persists to `chat_history`. |
| Publish               | Git history | Passed | Published to `origin/main` at `32e73c773` (`Add assistant context compaction`). |

## Known Unrelated Worktree Dirt

- Existing unrelated local changes remain outside this task: executive-assistant email triage files, `render.yaml`, generated Supabase types/page schema timestamp, `supabase/.temp/cli-latest`, and `supabase/migrations/20260619220000_outlook_email_triage_columns.sql`.

## Files Expected To Change

- `frontend/src/lib/ai/stream/compaction.ts` - shared compaction implementation.
- `frontend/src/lib/ai/stream/__tests__/compaction.test.ts` or equivalent - targeted compaction tests.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` - feature-flagged integration and naive truncation precedence cleanup.
- Existing token-budget/model/fallback modules discovered during inspection.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` or narrower AI assistant docs if architecture behavior changes.
- `docs/ops/handoffs/2026-06-19-S64-context-compaction.md` - implementation evidence.

## Risks / Gaps

- Compaction must not turn stale summary content into active instructions.
- Tool output pruning must not erase source provenance needed for grounded answers.
- Summarization calls must use the repo's current AI SDK/API patterns, not outdated SDK assumptions.
- Full quality may have unrelated timeout/debt; changed-file gates and targeted tests still must pass.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
