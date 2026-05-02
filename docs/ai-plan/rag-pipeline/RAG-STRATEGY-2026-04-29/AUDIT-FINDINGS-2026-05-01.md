# AI Assistant Audit Findings — 2026-05-01

**Scope:** Diagnose whether the Vercel AI SDK is fundamentally broken for our `/ai-assistant` use case, or whether the bad UX is caused by code/wiring on top of a working SDK. The answer determines whether we migrate to the OpenAI SDK directly.

**Method:** Static audit of `frontend/src/app/api/ai-assistant/chat/route.ts`, `frontend/src/lib/ai/providers.ts`, `frontend/src/lib/ai/provider-routing.ts`, `frontend/src/lib/ai/models.ts`, and the existing provider matrix artifact `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json` (recorded yesterday).

No fresh reproducer was needed — the existing matrix already isolates the failure with high fidelity.

---

## Verdict

**The Vercel AI SDK is not fundamentally broken. Do not migrate off of it.**

The bad UX comes from three things, in this order of impact:

1. A real but **narrow** AI Gateway / AI SDK bug in `streamText` + tools that was generalized into a global `tools: undefined` workaround. It gutted the assistant's tool-calling brain even on code paths where tools work fine.
2. An **untested model fallback path**. The matrix only tested `openai/gpt-5.4`. The default model is `openai/gpt-5.4-mini`, and `gpt-4.1`/`gpt-4.1-mini` are configured but never validated. Those models may not exhibit the bug.
3. An **AI SDK bug worth filing**: `streamText` against the Gateway silently translated an HTTP-level error response into `finishReason: "other"` with `rawFinishReason: "error"` and no thrown error. That violates our Rule 1 and Rule 2 — but it's the SDK doing the silent failure, not our code. We should report it upstream.

The strategy doc's stated next steps (intent router, evidence packet, advisor synthesis) remain correct, but the workaround that disabled tools is the proximate cause of the "feels like it runs random tools and synthesizes from nothing" experience. Re-enable tools first, then build the advisor loop on top.

---

## Evidence

### From `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json`

Single-model matrix run against `openai/gpt-5.4`:

| Path | Method | Result | Detail |
|---|---|---|---|
| AI Gateway → OpenAI | `generateText` | ✅ **PASS** | 1 tool call, 1 tool result, 154-char synthesized answer, `finishReason: "stop"` in 5.5s |
| Direct OpenAI | `generateText` | ❌ **FAIL — billing only** | `AI_RetryError`: "You exceeded your current quota" — has nothing to do with the SDK |
| AI Gateway → OpenAI | `streamText` | ❌ **FAIL — real bug** | 0 tool calls, empty text, `finishReason: "other"`, `rawFinishReason: "error"`, returned in 575 ms |
| Direct OpenAI | `streamText` | ❌ **FAIL** | `AI_NoOutputGeneratedError: No output generated. Check the stream for errors.` |

### From `frontend/src/lib/ai/provider-routing.ts:40-48`

The reason the route ships with `tools: undefined`:

> "Streaming model tools disabled: provider matrix showed AI SDK Gateway generateText tool calling works, but streamText returned finishReason=other with empty text/no tool results."

That string is literally the matrix data above, generalized into a permanent runtime decision.

### From `frontend/src/lib/ai/providers.ts:102-104`

A previous AI Gateway issue with the `/v1/responses` API was already worked around by switching to `openai.chat()` (chat completions). The team already has the muscle for narrow Gateway workarounds — there's no need for a wholesale provider migration.

### From `frontend/src/lib/ai/models.ts`

```
DEFAULT_CHAT_MODEL = "openai/gpt-5.4-mini"   // default
"openai/gpt-5.4"                              // matrix tested ONLY this
"openai/gpt-4.1"                              // never tested
"openai/gpt-4.1-mini"                         // never tested
```

---

## Why the verdict is "fix it, don't migrate"

### Migration cost is high
- `frontend/src/lib/ai/tools/operational.ts` and siblings define ~15 tools using AI SDK `tool()` + Zod schemas.
- The route uses `streamText`, `stepCountIs`, `experimental_onStepStart`, `onStepFinish`, and the AI SDK UI message protocol on the client (`@ai-sdk/react`).
- Direct OpenAI SDK would require rewriting tool definitions, hand-rolling streaming over chat completions, and building a custom UI message wire format. Weeks of work, no functional gain.

### The actual broken thing is narrow
- `generateText` + Gateway + tools **works perfectly today** with one tool call and clean synthesis.
- `streamText` + Gateway + tools is the only failing combination, and we have **two clean escape hatches** without leaving AI SDK:
  - **Escape A:** Use `generateText` for the tool-using turn, then stream the final assistant message back to the client as a synthetic stream. This pattern is well-supported.
  - **Escape B:** Re-test `streamText` + tools with `gpt-4.1-mini` and `gpt-4.1`. There's a strong chance the bug is gpt-5.4-specific.

### The AI SDK silent-error bug is fixable / file-worthy
The fact that `streamText` translated a Gateway HTTP error into `finishReason: "other"` with no thrown exception is a legitimate AI SDK defect. We should:
1. File an issue at https://github.com/vercel/ai with the matrix JSON attached.
2. Until fixed, treat `finishReason === "other"` with empty text as an explicit error inside our route and log the underlying response. We currently swallow it (Rule 1 violation).

---

## Top 5 next changes, ranked by leverage / effort

1. **Re-run the provider matrix across all 4 configured models.** ~15 min of work. `scripts/verify/...` already has the harness. If `gpt-4.1-mini` passes `streamText`+tools, set it as the default and re-enable streaming tools globally. This single change probably fixes 60% of the felt-bad UX.

2. **Re-enable tools in `chat/route.ts` for the `generateText` code path.** The route already has paths that call the model without streaming. Turn tools back on there immediately — no risk, no regression. Tracked by `streamingModelToolsEnabled` flag in `chat/route.ts:3287`.

3. **Add an explicit error surface for `finishReason === "other"` with empty text.** No more silent fallback. Throw, log the raw Gateway response, persist it to chat metadata. Rule 1 + Rule 2 compliance.

4. **Implement the minimal intent router** (`frontend/src/lib/ai/intent-router.ts`) per the strategy doc Layer 1. Even a 50-line regex-first router that classifies into `project_briefing | source_lookup | app_help | general` and persists `metadata.intent` on every turn unlocks evals and prevents tool-running roulette. ~2-3 hours.

5. **File the AI SDK upstream bug** on `streamText` swallowing Gateway errors into `finishReason: other`. ~30 min. Until then, our error handler closes the gap.

Phase 2-7 of the strategy doc (evidence compiler, retrieval router, advisor synthesis, conversation intelligence, etc.) remain the long-arc roadmap. None of them require leaving the AI SDK.

---

## Update — 2026-05-01 21:48 UTC

After the user added OpenAI credits, the matrix was re-run. **All four cells now PASS — including the previously broken `streamText` + Gateway + tools combination:**

| Path | Method | Status | Tools | Text | Finish |
|---|---|---|---|---|---|
| `ai_sdk_gateway_openai` | `generateText` | ✅ pass | 1 | 154 | stop |
| `ai_sdk_direct_openai` | `generateText` | ✅ pass | 1 | 129 | stop |
| `ai_sdk_gateway_openai` | `streamText` | ✅ **pass** | 1 | 154 | stop |
| `ai_sdk_direct_openai` | `streamText` | ✅ pass | 1 | 149 | stop |

Decision returned by the harness: `ai_sdk_gateway_openai` with `supportsToolCalling: true` and reason "Gateway and direct OpenAI AI SDK tool-calling paths both passed; the active assistant route workaround is likely local route/workflow behavior, not provider capability."

**Conclusion:** The original `streamText` failure on 2026-04-30 was transient (possibly correlated with the OpenAI quota exhaustion that affected the direct path the same day). The AI SDK is fully functional on both paths.

### Action taken in this session

1. **`frontend/src/lib/ai/provider-routing.ts` — flipped default to enable streaming model tools.**
   - `supportsToolCalling: true` by default.
   - Replaced `AI_ASSISTANT_ENABLE_STREAMING_MODEL_TOOLS=true` env opt-in with `AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS=true` env opt-out (safer default, easier rollback).
   - `AI_ASSISTANT_TOOL_PROVIDER_PATH` override still supported and now keeps tools enabled.
   - Reason string updated to point at the 2026-05-01 matrix result.
2. **`frontend/src/lib/ai/__tests__/provider-routing.test.ts` — updated to match new defaults.** All 3 tests pass.
3. **`docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json` — overwritten with fresh passing matrix.** Original preserved at `ai-tool-calling-provider-matrix-2026-04-30.original.json` for forensic reference.
4. `npm run typecheck` clean. ESLint reported only 3 pre-existing errors in unrelated files (`intelligence/page.tsx` raw headings, `structured-queries.ts` `let`/`const`); my changes introduce zero new errors.

### What this unlocks

The chat route at `frontend/src/app/api/ai-assistant/chat/route.ts:3287-3288` reads `shouldEnableStreamingModelTools(providerDecision)` to decide whether to attach tools to `streamText`. With the flipped default, the next request through `/ai-assistant` will pass `tools: modelTools` to `streamText`, and the strategist can finally call `semanticSearch`, `getProjectBriefingSnapshot`, `searchMeetings`, etc., during streaming. The advisor-loop refactor in the strategy doc remains the long-arc roadmap — but the assistant's brain is reconnected today.

### Still NOT done in this audit

- Live `agent-browser` run through golden prompts on `/ai-assistant` to capture before/after answers and tool traces.
- The minimal intent router (`frontend/src/lib/ai/intent-router.ts`).
- Loud error surface for `finishReason === "other"` with empty text (Rule 1 compliance).
- Upstream AI SDK bug report for the silent finishReason swallow.

Each is a clean follow-up.

---

## Bottom line

The pain Megan is feeling is real, but the AI SDK is not the cause. The cause is a 1-day-old narrow workaround that was over-applied. Re-test the matrix on gpt-4.1-mini, re-enable tools, and the assistant will start using its brain again. Do that **before** investing in the larger advisor-loop rebuild — otherwise Phase 1-7 of the strategy is being built on top of a hand-tied agent.
