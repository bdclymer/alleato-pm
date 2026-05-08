# AI Assistant RAG Comprehensive Audit - 2026-05-02

## Executive Verdict

The bad assistant behavior is not explained by "AI SDK is bad" or "we need to switch to OpenAI Agents SDK."

The current evidence points to a repo-side orchestration problem:

1. Tool-use instructions exist, but there is more than one source of truth.
2. The strongest RAG/tool-routing prompt is not wired into the live chat path.
3. The live route mixes deterministic server-side retrieval, model-planned intent routing, prompt-only tool instructions, direct deterministic answers, and fallback model retries.
4. Some fallbacks retry without tools, which can make the assistant sound intelligent while it is disconnected from the actual data sources.
5. The eval suite can pass even when `streamTextError` or `noToolRetry` occurred, so "green" does not always mean "the assistant behaved intelligently."

The provider matrix currently says AI SDK Gateway and direct OpenAI can both call tools successfully. That makes a wholesale SDK migration the wrong first move. The immediate fix is to consolidate the RAG control plane and make retrieval/tool requirements enforceable in code, not just in prompts.

## Live Architecture Map

Current production route:

- API route: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Shared prompt assembly: `frontend/src/lib/ai/bot-core.ts`
- Live strategist prompt: `frontend/src/lib/ai/orchestrator.ts` -> `frontend/src/lib/ai/agents/strategist.ts`
- Unused RAG assistant prompt: `frontend/src/lib/ai/rag-assistant-prompt.ts`
- Deterministic intent fallback: `frontend/src/lib/ai/intent-router.ts`
- Tool definitions: `frontend/src/lib/ai/tools/operational.ts` and sibling tool modules
- Provider decision: `frontend/src/lib/ai/provider-routing.ts`
- Eval harness: `scripts/verify/verify_ai_assistant_eval_suite.mjs`

## What Is Working

- The AI SDK provider path itself is currently validated. The provider matrix says both Gateway and direct OpenAI passed tool-calling checks, and the route default enables streaming tools.
- The route has useful server-side retrieval branches for project briefings, source lookups, Teams/email/meeting/document prechecks, and deterministic source-specific retrieval.
- Core tools exist for meetings, Teams, emails, documents, semantic search, project snapshots, app help, memory, company knowledge, and structured financial/project queries.
- The latest eval summary shows broad tool activity across the route.
- The system already persists `tool_trace`, response quality metadata, provider decisions, and loop diagnostics.

## What Is Broken Or Risky

### P0 - The Best RAG Tool Instructions Are Not Live

`frontend/src/lib/ai/rag-assistant-prompt.ts` contains the clearest tool-routing instructions. It explicitly says "latest on project" must call `searchEmails`, `searchTeamsMessages`, `searchMeetingsByTopic`, and `semanticSearch` in parallel. It also has the clearest SQL-vs-vector rules and source citation rules.

But `frontend/src/lib/ai/bot-core.ts` assembles the system prompt from `getStrategistSystemPrompt()`, and `getStrategistSystemPrompt()` injects `strategistSystemPrompt`, not `ragAssistantSystemPrompt`.

Evidence:

- `rag-assistant-prompt.ts:59-74` says broad project updates must pull all four source families.
- `rag-assistant-prompt.ts:184-246` has the clearest tool selection table.
- `bot-core.ts:110` uses `getStrategistSystemPrompt()`.
- `orchestrator.ts:929-941` builds the live prompt from `strategistSystemPrompt`.
- `rg` only finds `ragAssistantSystemPrompt` exported from its own file, with no live import.

Impact: the repo has instructions, but the live assistant is not consistently using the best ones.

Prevention: create one canonical `assistant-tool-routing-contract.ts` and generate both prompt text and code-level retrieval plans from it.

### P0 - Prompt-Only Tool Rules Are Not A Control Plane

The live strategist prompt says for "latest on project" the model must call Teams, email, and meetings first. The route also has an intent planner, deterministic intent router, packet-first branch, source lookup branch, and model tool calling. Those systems are not unified into one required retrieval plan.

Evidence:

- `agents/strategist.ts:53-65` says latest/update/catch-up must call three tools first.
- `rag-assistant-prompt.ts:62-67` says the same class of query must call four tools, including `semanticSearch`.
- `chat/route.ts:290-349` has a model intent planner with `requiredTools`, but the fallback sets `requiredTools: []`.
- `intent-router.ts:28-84` classifies intent with regex, but does not return required tools, freshness windows, permissions, or source coverage requirements.

Impact: the model can route differently than the deterministic server path, and no single object says "for this user question, these sources must be checked before answering."

Prevention: make intent routing return a retrieval contract:

- `intent`
- `requiredTools`
- `freshnessWindow`
- `sourceFamilies`
- `permissionRequirements`
- `minimumEvidence`
- `allowedFallback`
- `answerContract`

Then execute that contract server-side before synthesis.

### P0 - The Fallback Path Can Remove Tools Entirely

The route correctly attaches tools to `streamText` when provider policy allows it. But when the stream returns empty content, the route can retry with `generateText` and no tools.

Evidence:

- `chat/route.ts:3573-3591` conditionally attaches tools to `streamText`.
- `chat/route.ts:3664-3728` handles empty content.
- `chat/route.ts:3690-3701` documents and runs `generateText()` with no tools.
- Latest eval summary includes `noToolRetry` in passing cases.

Impact: the user may receive a fluent answer produced after the tool loop failed. That is exactly the type of failure that makes the assistant feel unintelligent or untrustworthy.

Prevention: a no-tool retry should only be allowed when a complete server-side evidence packet already exists. Otherwise the route should fail loudly with source coverage, cause, detection gap, and next repair action.

### P0 - The Eval Suite Can Pass Through Tool-Loop Failures

The latest eval run passed 9/9, but one passing case included `streamTextError` and two passing cases included `noToolRetry`.

Evidence:

- `docs/ai-plan/evals/runs/2026-05-02T14-17-58-507Z/summary.md:12-20` shows passing cases with `streamTextError` and `noToolRetry`.
- `scripts/verify/verify_ai_assistant_eval_suite.mjs:283-293` uses any-of expected tool semantics.
- `scripts/verify/verify_ai_assistant_eval_suite.mjs:295-306` treats expected tool families as warnings, not failures.

Impact: a green eval can still mask the exact failure mode the user feels: sources not checked, fallback answer used, or the model routed around the real tool plan.

Prevention: evals must fail when:

- `streamTextError` occurs on a tool-required case.
- `noToolRetry` occurs without a complete server-side evidence packet.
- a required tool family is missing.
- the answer lacks current-date/source-window disclosure for temporal questions.
- the answer cites older data when a recent window is required.

### P1 - Source Freshness Is Not First-Class Everywhere

The user-visible failure happened because the assistant answered a May question from February evidence. I patched the specific Teams communication-diagnosis path to force a recent Teams window, but that is still a targeted repair, not a general freshness contract.

Evidence:

- `detect-rag-request.ts:221-260` now detects communication-diagnosis questions and defaults Teams retrieval to a 30-day window.
- `chat/route.ts:2797-2812` injects that recent Teams window as primary evidence.
- `chat/route.ts:2815-2823` still also runs broad `semanticSearch` with no date window.
- `operational.ts:946-957` describes `semanticSearch` as broad cross-source search.

Impact: broad semantic search can still surface older matches that are semantically strong but temporally wrong.

Prevention: every current-state/source-lookup intent needs a freshness window and source sorting rule. For temporal questions, older matches should be unavailable or explicitly marked "historical pattern context."

### P1 - Semantic Search Is Too Overloaded To Be The Only Brain

`semanticSearch` blends document chunks, insights, and company knowledge. That is useful for recall, but risky for questions that need source-specific truth, exact chronology, or channel-specific analysis.

Evidence:

- `operational.ts:946-957` says it searches meetings, emails, Teams, OneDrive, insights, company knowledge, and other content.
- `operational.ts:1036-1040` blends `search_document_chunks`, `search_all_knowledge`, and `search_knowledge_base`.

Impact: broad semantic retrieval can produce a plausible but wrong answer when the question demands "messages," "Teams," "emails," "what did someone say," "latest," or "last 30 days."

Prevention: use source-specific retrievers first, then optionally call semantic search as a supplemental catch-all.

### P1 - Permissions Can Make Critical Sources Disappear

Email and Teams tools are admin-only. The source-specific retrieval branch also blocks email and Teams for non-admin users.

Evidence:

- `operational.ts:2479-2489` requires admin access for email search.
- `operational.ts:2523-2533` requires admin access for Teams search.
- `chat/route.ts:1666-1693` blocks recent email/Teams source-specific retrieval for non-admin scope.

Impact: a non-admin user can ask a communications question and receive an answer that sounds complete while the most relevant sources were unavailable or filtered.

Prevention: the answer contract must include source coverage: checked, unavailable, empty, stale, blocked by permission.

### P1 - Some Source-Specific Paths Are Still Hand-Built Around Old Failure Modes

`detect-rag-request.ts` still says all AI tools are globally disabled as a workaround. That is now stale because `provider-routing.ts` defaults to `supportsToolCalling: true`.

Evidence:

- `detect-rag-request.ts:8-16` still documents globally disabled model tools.
- `provider-routing.ts:51-59` says streaming model tools are enabled by default.

Impact: comments and architecture drift make it harder to reason about whether a branch is still necessary, permanent, or a workaround.

Prevention: convert workarounds into named feature flags or delete stale workaround comments once provider behavior is revalidated.

### P2 - Response Quality Can Overstate Source Quality

The current response-quality scoring can rate source quality as high based on source-bearing records in the trace even when the final answer lacks inline citations.

Evidence:

- `score-response-quality.ts:137-170` treats source-bearing record count as source-quality signal even without inline citations.
- The tests now explicitly allow source-specific retrieval rows to produce high source quality without inline source tags.

Impact: this is useful for internal observability, but it can overstate user-visible evidence quality. A user does not experience "trace has sources"; they experience whether the answer cites and explains the right sources.

Prevention: split response quality into internal retrieval quality and final answer citation quality.

### P2 - Typecheck Is Still Blocked By Repo-Wide Drift

A focused unit and lint pass can pass while full typecheck is blocked by unrelated repo debt. That matters because RAG code touches generated Supabase types, tool contracts, and schema-backed tables.

Observed in this audit:

- Focused RAG tests passed.
- Focused ESLint passed.
- Full frontend typecheck failed on unrelated baseline issues, including generated DB type drift around tables used by AI/ops code.

Impact: schema drift weakens confidence in RAG table/tool contracts even when the immediate patch compiles locally in focused checks.

Prevention: restore the full type gate or create a narrower mandatory `ai:quality` gate that typechecks all AI/RAG modules and their DB type dependencies.

## Direct Answer To The Tool-Instructions Question

Yes, the files contain instructions for when to use which tool.

But they are split across at least four layers:

1. `rag-assistant-prompt.ts` - best explicit RAG/tool table, apparently not live.
2. `agents/strategist.ts` - live strategist prompt, similar but not identical.
3. `intent-router.ts` and `planAssistantIntent()` - classifies intent but does not fully enforce retrieval.
4. Tool descriptions in `operational.ts` - useful, but only matter if the model reaches the tool loop and chooses correctly.

That fragmentation is the root problem. The system has instructions, but it does not have a single enforceable retrieval contract.

## What The Exact Failed Prompt Should Have Done

For:

> Based on all the employees' messages and teams, where do you think is the biggest source of confusion or lack of communication or frustration?

The assistant should have:

1. Classified this as `source_lookup` plus `communication_diagnosis`.
2. Set an implicit current window, probably last 30 days unless the user asked otherwise.
3. Searched recent Teams messages first.
4. Searched recent emails if authorized.
5. Searched recent meetings for matching communication/frustration/confusion terms.
6. Reported source coverage: date window, counts, blocked sources, empty sources.
7. Used older matches only as historical pattern evidence.
8. Answered from current evidence first.
9. If current evidence was thin, said so directly instead of reaching back to February.

The February answer happened because the system lacked a hard recency gate for this intent.

## Fix Plan

### Phase 1 - Make Routing Enforceable

Create a single `assistant-retrieval-contract.ts`.

For every major intent, define:

- required sources
- source freshness window
- structured tools
- vector tools
- permission requirements
- fallback rules
- user-visible source coverage requirements

Then make `classifyAssistantIntent()` return this contract, not just a string.

### Phase 2 - Server-Side Evidence Packet Before Synthesis

For tool-required intents, execute required retrieval server-side before model synthesis.

The model should receive:

- structured project snapshot
- source packets by family
- dates/counts/status for every source
- explicit "do not answer from older evidence unless marked historical" instruction

### Phase 3 - Turn Fallbacks Into Loud Failures

Replace generic no-tool retry with:

- source-grounded retry if evidence packet exists
- explicit failure answer if evidence packet is missing
- persisted diagnostic with cause, detection gap, prevention step

No tool-required question should silently become a no-tool answer.

### Phase 4 - Fix Evals So Green Means Intelligent

Make evals fail on:

- missing required tool families
- `streamTextError` in tool-required cases
- `noToolRetry` without evidence packet
- stale-source answers for current/recent questions
- no source coverage line for source lookup questions
- source citations missing from final answer when source evidence was used

### Phase 5 - Clean Prompt And Workaround Drift

Decide whether `ragAssistantSystemPrompt` should be the live prompt or delete it after migrating its useful sections into the strategist prompt/retrieval contract.

Also update stale comments in `detect-rag-request.ts` that still describe globally disabled tools.

## SDK Decision

Do not switch to OpenAI Agents SDK as the first fix.

Use this decision gate:

- Keep AI SDK if provider matrix continues to pass `streamText` and `generateText` with tool calls.
- Use a server-side retrieval contract to remove prompt-only uncertainty.
- Consider OpenAI Agents SDK only if the remaining failure is specifically model/tool-loop orchestration that AI SDK cannot support after the retrieval contract is enforced.

Right now the broken part is control flow and evidence contracts, not the SDK.

## Recommended Next Implementation Slice

Build `assistant-retrieval-contract.ts` and wire it into the chat route for these intents first:

1. `source_lookup`
2. `latest_status`
3. `risk_review`
4. `financial_analysis`
5. `task_followup`

Acceptance criteria:

- The failed communication-diagnosis prompt must search the current Teams window and disclose the date window.
- A "latest on project" prompt must check project snapshot, Teams, email, meetings, documents, and semantic fallback.
- A source lookup must not answer from broad semantic search alone when a source-specific retriever exists.
- Eval suite must fail if tool-required cases use `noToolRetry` without evidence.
- Final answers must include source coverage, not just citations.

