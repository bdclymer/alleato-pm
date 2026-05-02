# AI Assistant Eval Suite — First Real Run Findings

**Date:** 2026-05-02
**Run:** `docs/ai-plan/evals/runs/2026-05-02T10-32-47-633Z/`
**Endpoint:** `http://localhost:3000/api/ai-assistant/chat`
**Result:** 18 passed / 12 failed (60%)

## Headline

The AI SDK fix from 2026-05-01 (re-enabling streaming model tools) is working. When `streamText` is invoked, the strategist calls many tools across multiple steps — `project-briefing-vermillion` fired **30 tool calls** in 67s. The Vercel AI Gateway + tool calling hop is healthy.

**The remaining failure mode is not the SDK. It is a server-side deterministic intercept that bypasses the model entirely for project-pinned briefing/financial questions.** This is exactly the dynamic the 2026-04-29 RAG strategy doc identified.

## Failure breakdown

| Pattern | Count | What happened |
|---|---|---|
| **Deterministic packet intercept** | 9 | Only `clientProjectIntelligencePacket` fired; `streamText` was never called. The route short-circuits to a pre-rendered packet for Westfield (project 43) briefing-style prompts. |
| **Source-specific RAG intercept** | 1 | `meetings-by-date` returned via `sourceSpecificRagRetrieval` without invoking `getMeetingsByDate`. Same shape as #1, different intercept. |
| **Reasonable tool substitution** | 1 | `vendor-performance` fired 13 tools but used `getVendorSpendReport` instead of `getVendorPerformance`. Eval expectation may be too narrow. |
| **Document-search intercept** | 1 | `documents-search` ran `semanticSearch` via `sourceLookupIntentRouter` instead of the dedicated document tools. |

### The 9 deterministic-bypass cases (all duration < 10s, all tools = `[clientProjectIntelligencePacket]`)

```
project-briefing-westfield     (10s)  "What's the latest on Westfield Collective?"
financial-budget-summary        (4s)  "What does the budget look like on Westfield?"
financial-commitments           (3s)  "Show me an overview of commitments on Westfield"
financial-change-orders         (3s)  "Walk me through the open change orders on Westfield"
financial-margin                (4s)  "What's the projected margin on Westfield Collective?"
financial-forecast              (3s)  "How is our forecast tracking against the original budget on Westfield?"
submittals-status               (7s)  "Give me the submittal status on Westfield"
historical-trends               (3s)  "Show me cost trends on Westfield over the last six months"
what-changed                    (4s)  "What changed on Westfield since the last time I asked?"
```

These are exactly the question shapes that should feel most strategic — and the route is intercepting them all with a packet renderer that produces shorter responses (often missing keywords like "budget", "trend", "forecast", "submittal" because the packet template doesn't include them).

## What's working well

| Pattern | Cases | Evidence |
|---|---|---|
| **Multi-step tool orchestration** | `project-briefing-vermillion` | 30 tools across 4+ steps, 67s, full strategist behaviour |
| **Portfolio-level reasoning** | `portfolio-overview`, `cross-project-comparison` | `getPortfolioOverview`, `getCrossProjectComparison`, `getProjectsWithRisks` chain correctly |
| **Risk synthesis** | `risk-review-single-project` | 11 tools fired, includes `getProjectRiskAnalysis` + supporting evidence |
| **Source-specific retrieval (some shapes)** | `source-lookup-meetings`, `source-lookup-email`, `source-lookup-teams` | Correct source tools fire |
| **Acumatica accounting** | `accounting-ap-aging`, `accounting-cash-position` | Both work end-to-end. `cash-position` even chains 7 accounting tools. |
| **Brainstorming mode** | `thought-partner-bid` | 14 tools fired including `searchConstructionMarket`. Strategist behaves like a thought partner, not a search engine. |

## Tool coverage stats

- **43 unique tools fired** out of 56 catalogued (77% coverage in a single 30-prompt run).
- **19 tools never fired**: mostly `query*` SQL-first variants (the model prefers higher-level wrappers) and write tools (`saveInsight`, `writeMemory`, `searchMemories`, etc.) which would require more agentic prompts.
- Most-used tool in this run: `streamingToolPolicy` (17), `getPortfolioOverview` (10), `clientProjectIntelligencePacket` (9 — all failures).

## Recommended next changes (ordered by leverage)

1. **Make the deterministic packet path additive, not exclusive.** When `clientProjectIntelligencePacket` fires, it should still pass tools to `streamText` so the model can layer commentary, recommendations, and follow-ups on top of the packet — instead of returning the packet alone. This is the single biggest UX win available right now.
2. **Loosen the briefing-intent detector** OR **always run streamText after the packet** so the strategist can actually be a strategist on Westfield questions.
3. **Add a coverage gate to the eval suite**: any failure with `tools.length === 1 && tools[0] === 'clientProjectIntelligencePacket'` should print a specific diagnostic instead of a generic "expected tool didn't fire."
4. Catalog `clientProjectIntelligencePacket`, `sourceLookupIntentRouter`, `sourceSpecificRagRetrieval`, `streamingToolPolicy`, `noToolRetry`, and `streamTextError` as **route-level instruments** in the suite's `toolFamilyMap` so the report distinguishes them from real tool calls.
5. Broaden a few `expectedToolNames` lists: `vendor-performance` should accept `getVendorSpendReport`; `documents-search` should accept `semanticSearch` as a substitute when document-specific tools aren't available.

## Verdict on the 2026-04-29 RAG strategy

The strategy doc's central diagnosis is **confirmed by data now**:

> "The assistant often answers from whatever retrieval happened to return, not from a deliberate business reasoning loop... the prompt says 'be a business partner,' but the code frequently bypasses the model for deterministic briefings."

That's exactly what 9 of 12 failing cases demonstrate. The path forward proposed in the strategy doc — intent router + evidence packet + advisor synthesis loop — would specifically address this by making the packet be **input** to the model, not the output.

## How to reproduce

```bash
# refresh auth (Supabase JWTs expire roughly every 60 minutes)
cd frontend && npx playwright test tests/auth.setup.ts --config=config/playwright/playwright.config.ts && cd ..

# run full suite
node scripts/verify/verify_ai_assistant_eval_suite.mjs

# single case
node scripts/verify/verify_ai_assistant_eval_suite.mjs --case project-briefing-westfield

# regex filter
node scripts/verify/verify_ai_assistant_eval_suite.mjs --filter '^financial-'
```
