# RAG Refactor Task List

Diagnosis source: live code audit of `route.ts`, `orchestrator.ts`, `operational.ts`, and all tool files.
Last updated: 2026-05-08

---

## Problem 1 — Three Competing Retrieval Paths

The model receives context injected into the system prompt via two server-side preflights AND can call `semanticSearch` itself as a tool. These paths produce duplicate or conflicting context and the model doesn't know which to trust.

- [ ] Remove server-side deterministic `buildSourceHealthPreflight()` injection from system prompt — let model call tools instead
- [ ] Remove server-side `buildBusinessContextPreflight()` context injection from system prompt — let model call tools instead
- [ ] Remove the "semantic search floor" (`shouldForceBusinessRetrieval` block in `route.ts`) that calls `semanticSearch` before `streamText`
- [ ] Remove `deterministicRetrieval` variable and all references to `formatRetrievedSourceContext()`
- [ ] Verify `semanticSearch` tool is still registered and callable by the model after preflight removal
- [ ] Test: ask a broad question ("project status update") — confirm model calls `semanticSearch` tool itself, not from injected context
- [ ] Test: ask a source-specific question ("last 5 emails") — confirm `detectSourceSpecificRagRequest` still works correctly without conflicting with injected context

---

## Problem 2 — Sub-Agents Have No Conversation History

CFO, COO, CRO, CHRO, and VP BD sub-agents receive only `[{ role: "user", content: currentQuestion }]` — zero prior turns. Follow-up questions break silently.

- [ ] Update `ToolLoopAgent` in `orchestrator.ts` to accept a `conversationHistory` parameter
- [ ] Pass filtered conversation history (last N turns, not full thread) from `consultAgent()` to `ToolLoopAgent`
- [ ] Update all five `consultXxx` tool `execute` functions in `orchestrator.ts` to extract and forward conversation history from tool context
- [ ] Test: ask CFO a question, then ask "what about project X specifically?" — confirm sub-agent references prior context
- [ ] Test: multi-turn financial analysis — confirm numbers are consistent across turns

---

## Problem 3 — `route.ts` is 5,300 Lines

This file has grown into a monolith. Edge cases interact unpredictably and the fallback chain exists because the primary path fails regularly.

- [ ] Extract intent classification logic into `frontend/src/lib/ai/intent-classifier.ts`
- [ ] Extract preflight builders (`buildBusinessContextPreflight`, `buildSourceHealthPreflight`, `buildSourceSpecificRagAnswer`) into `frontend/src/lib/ai/preflights.ts`
- [ ] Extract agent dispatch and `streamText` wiring into `frontend/src/lib/ai/chat-handler.ts`
- [ ] Extract fallback chain (`generateSourceGroundedSynthesis`, `generateRecoveryResponse`) into `frontend/src/lib/ai/fallback-chain.ts`
- [ ] Extract system prompt assembly (`assembleSystemPrompt`, `getStrategistSystemPrompt`) into `frontend/src/lib/ai/system-prompt.ts`
- [ ] After extraction, `route.ts` should be an orchestration shell under 300 lines — validate this
- [ ] Run `npm run quality` after refactor — zero new TypeScript errors

---

## Problem 4 — `maxOutputTokens: 1500` Is Too Small

1,500 output tokens causes truncated or vague responses when the system prompt is large.

- [ ] Find `maxOutputTokens: 1500` in `route.ts` and raise to `4000`
- [ ] Audit system prompt total size — log token count in dev mode to confirm context isn't overflowing
- [ ] Test: ask a complex multi-part question — confirm response is complete, not cut off mid-sentence

---

## Problem 5 — Tool Failures Silently Returned as Data

`withTrace()` in `tool-utils.ts` catches all errors and returns `{ error: "..." }` as a successful tool result. The model treats error messages as content.

- [ ] Update `withTrace()` to re-throw errors after logging, rather than returning `{ error: string }`
- [ ] Add a structured `ToolError` type the model system prompt can recognize: update strategist prompt to say "if a tool result contains `{ error: ... }`, tell the user that data is unavailable — do not summarize the error as data"
- [ ] Test: call a tool against a broken endpoint — confirm model says "that data is unavailable" not a hallucinated summary

---

## Problem 6 — Embedding Dimension Inconsistency

`searchMeetingsByTopic` uses `text-embedding-3-small` (1536 dims) against `conversation_memories.embedding`. All other search uses `text-embedding-3-large` (3072 dims) against `document_chunks`. Mixed dimensions produce garbage similarity scores or silent errors.

- [ ] Check `conversation_memories.embedding` column actual dimension in Supabase — run `SELECT octet_length(embedding::text) FROM conversation_memories LIMIT 1`
- [ ] If `conversation_memories` is populated and used: migrate embeddings to 3072-dim using `text-embedding-3-large`
- [ ] If `conversation_memories` is legacy/unused: deprecate `searchMeetingsByTopic` and point meeting queries at `document_chunks` (where meetings already live)
- [ ] Update `searchMeetingsByTopic` to use `EMBEDDING.LARGE` (3072) to match the stored embeddings, whichever path is chosen
- [ ] Verify no other tool uses `EMBEDDING.SMALL` against a 3072-dim column

---

## Validation Checklist (run after all fixes)

- [ ] Basic retrieval: "What happened on the Vermillion Rise project this week?" — returns actual meeting/email content
- [ ] Follow-up: ask a financial question, then "break down the top cost code" — sub-agent uses prior context
- [ ] Tool failure: disconnect DB, ask a financial question — model says data unavailable, does not hallucinate
- [ ] Long answer: ask for a full project briefing — response is complete, not truncated at 1,500 tokens
- [ ] Source-specific: "What emails came in today?" — returns real emails, not injected preflight data
- [ ] `npm run quality` passes with zero errors
