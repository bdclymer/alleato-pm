# Goal 6 - Context Compaction

## Outcome

Long AI assistant chats compact old context at turn boundaries while preserving system instructions, high-value head context, the recent tail, and a refreshable summary of the middle.

## Source Material

ADAPT source:

- `openclaw/packages/agent-core/src/harness/compaction/compaction.ts`
- `openclaw/packages/agent-core/src/harness/compaction/branch-summarization.ts`
- `openclaw/packages/agent-core/src/harness/compaction/utils.ts`
- `openclaw/packages/agent-core/src/harness/compaction/compaction.test.ts`
- `hermes-agent/agent/context_compressor.py`
- `hermes-agent/tests/agent/test_context_compressor.py`

Alleato target/current files:

- `frontend/src/lib/ai/stream/compaction.ts` (new)
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
- Existing token-budget, model, and fallback modules discovered before implementation.

## AI SDK Requirement

This goal uses generation APIs for summarization and touches chat handler behavior. Use the AI SDK skill and verify current local AI SDK docs/source before writing `generateText`, message, or tool-call handling code.

## Acceptance Criteria

- Compaction only runs over a token threshold.
- System prompt and safety/developer instructions are preserved verbatim.
- Head context and last N turns remain verbatim.
- Old bulky tool results are reduced to inspectable one-line summaries.
- Existing summary can be refreshed instead of accumulating repeated summaries.
- Historical images or large binary references are replaced with safe placeholders.
- Rollout is feature-flagged until evals pass.

## Failure-Loudly Behavior

- If summarization fails, the chat continues with the un-compacted context only when within hard token limits; otherwise returns a specific compaction failure.
- The compacted payload records what was summarized, retained, and dropped.
- Tests fail if recent turns or system instructions disappear.

## Verification

Main-thread targeted checks:

- Under-threshold no-op test.
- Over-threshold preserves system/head/tail test.
- Summary refresh idempotency test.
- Tool-result pruning test.

Delegated verification:

- `npm run quality`
- Assistant eval for long-context chat scenarios.

## Archive/Deletion Rule

After compaction proves ownership, archive naive history truncation in `handler-v2.ts` or adjacent chat handler code. Do not leave both live without a clear precedence test.
