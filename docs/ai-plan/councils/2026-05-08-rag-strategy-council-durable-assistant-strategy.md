# RAG Strategy Council: Durable Assistant Strategy

Date: 2026-05-08
Status: Complete
Council question: What strategy should Alleato use before another RAG fix so the assistant stops cycling through one-off fixes that do not hold?

## Executive Decision

Do not rebuild the RAG stack, replace AI SDK, or start with embeddings.

The current architecture has the right durable shape: packet-first project intelligence for advisory questions, deterministic source-specific lookup for exact evidence questions, and provider/tool-calling gates for AI SDK behavior. The current failure is that those layers are not enforced tightly enough as a product contract.

The next implementation slice should be an advisor-contract hardening pass:

1. Fix `npm run rag:verify:chat-architecture`.
2. Fix `node scripts/verify/verify_ai_advisor_quality.mjs`.
3. Add a retrieval-grounding verifier that fails on wrong-source, wrong-project, uncited, or generic source-lookup answers.
4. Only after those pass should deeper retrieval tuning or ingestion/vectorization work be considered.

## Evidence Packet

| Evidence | Source | What it proves | Gap |
|---|---|---|---|
| Source-specific contract passed | `npm run rag:verify:source-specific` | Static route/source-specific contract is present. | It does not prove source precision, project linkage, citation correctness, or final answer quality. |
| Chat architecture gate failed | `npm run rag:verify:chat-architecture` | Current route/tool contract has known breaks: status parts, missing operational inventory, and default write/action exposure. | Needs implementation fix before strategy can be called stable. |
| Advisor quality gate failed | `node scripts/verify/verify_ai_advisor_quality.mjs` | User-facing advisor output can still expose internal `RAG` language. | Needs product-language guardrail, not only retrieval fixes. |
| Packet-first route exists | `frontend/src/app/api/ai-assistant/chat/route.ts` | Project-intelligence intents load current packets, discard stale packets, and inject packet context before strategist synthesis. | Must verify packet metadata/freshness remains persisted and visible. |
| Source-specific lookup exists | `frontend/src/lib/ai/retrieval/source-specific-rag.ts` | Meetings, email, OneDrive, and Teams lookup paths exist. | Current path is mostly source-filtered lookup, not a strict retrieval-grounding quality gate. |
| Provider policy exists | `frontend/src/lib/ai/provider-routing.ts` and `frontend/src/lib/ai/providers.ts` | AI Gateway/direct provider choice and streaming tool enablement are explicit. | Provider matrix must remain a release gate, not tribal knowledge. |
| Existing RAG verifiers exist | `package.json` scripts `rag:verify:*` | The repo already has many targeted gates. | They need to be sequenced and strengthened around the first failure layer. |

## Role Positions

### Repo Architect

Position:
Preserve the existing architecture. The stack already separates packet-first project advisory behavior, source-specific exact evidence lookup, and provider/tool diagnostics.

Evidence:
- `frontend/src/app/api/ai-assistant/chat/route.ts` classifies intent, handles deterministic source-specific lookup, loads current packets for project-intelligence intents, and records metadata.
- `frontend/src/lib/ai/provider-routing.ts` makes tool-calling enablement explicit.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts` provides source-specific lookup for meetings, emails, OneDrive, and Teams.
- Existing commands include `rag:verify:chat-architecture`, `rag:verify:source-specific`, provider matrix, packet contract, advisor quality, meeting health, and Render AI health.

Risk in the other strategies:
Retrieval-first work could tune embeddings while the route still falls through incorrectly. Provider-first work could overfit AI Gateway behavior while deterministic server-side lookup already bypasses tools for exact-source prompts. Rebuild strategy would discard packet tables, project scoping, metadata, and verifiers.

Minimum viable next step:
Run and fix the narrow architecture gates before touching retrieval infrastructure.

Guardrail required:
A RAG route contract gate must fail when source-specific lookup no longer precedes generic synthesis, packet freshness metadata is missing, provider decisions are not persisted, or source lookup returns generic answers without checked-source counts.

Confidence:
High on preserving architecture; medium on current verifier health because the architecture gate is currently failing.

### RAG Architect

Position:
The retrieval layer already has dense search, reranking, source boosts, packet-first behavior, and source-specific shortcuts. The weak spot is not proving that retrieved evidence is the right evidence.

Evidence:
- `backend/src/services/pipeline/config.py` uses `text-embedding-3-large`, `3072` dimensions, `3000` char chunks, and `500` overlap.
- `backend/src/services/pipeline/embedder.py` creates transcript, meeting summary, segment summary, and Fireflies section chunks.
- `frontend/src/lib/ai/tools/operational.ts` includes `semanticSearch`, source/recency scoring, and LLM reranking.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts` directly queries source-specific `document_metadata` rows.
- `scripts/verify/verify_ai_source_specific_rag_contract.mjs` passes but is a static contract verifier.

Risk in the other strategies:
Packet-only strategy can make stale or weak evidence sound authoritative. Provider/model strategy can blame model behavior when the assistant may be receiving wrong rows. UI/product strategy can make uncited answers look polished.

Minimum viable next step:
Add a retrieval-grounding verifier that asserts source, source type, project ID, document ID, chunk ID when available, citation text, and final-answer citation behavior for source-lookup cases.

Guardrail required:
Create a gate shaped like:

```bash
npm run rag:verify:retrieval-grounding -- source-lookup-meetings
npm run rag:verify:retrieval-grounding -- source-lookup-email
npm run rag:verify:retrieval-grounding -- source-lookup-teams
```

Confidence:
Medium-high. Static source-specific routing is present, but live precision/recall and attribution quality remain under-verified.

### AI SDK And Provider Specialist

Position:
Keep AI SDK plus AI Gateway as the primary path. Do not move to raw OpenAI as the default. Provider/tool behavior should be a gated runtime contract.

Evidence:
- `frontend/src/lib/ai/providers.ts` uses AI Gateway when `AI_GATEWAY_API_KEY` is present and falls back to direct OpenAI.
- `frontend/src/lib/ai/providers.ts` deliberately uses `openai.chat()` for chat-completions tool calling.
- `frontend/src/lib/ai/provider-routing.ts` enables streaming tools by default unless `AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS=true`.
- `frontend/src/app/api/ai-assistant/chat/route.ts` records `onStepFinish` diagnostics and handles empty output with a no-tool retry/recovery path.
- `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs` fails on empty final text, missing tool calls, missing tool results, or `finishReason: "other"`.

Risk in the other strategies:
Gateway-only without verification risks repeating empty-output or `finishReason: "other"` regressions. Direct OpenAI-only loses Gateway observability and does not fix route/tool inventory issues. Raw OpenAI-only throws away AI SDK streaming/tool contracts and existing diagnostics.

Minimum viable next step:
Run provider matrix before any provider rewrite decision and fix the current architecture failures first:

```bash
npm run rag:verify:chat-architecture
node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs
npm run rag:verify:assistant-routing
```

Guardrail required:
Provider matrix must be a release gate. It should fail on empty text, zero expected tool calls, zero tool results, `finishReason: "other"`, or missing `tool_trace`, `provider_decision`, `loop_diagnostic`, and `response_quality` metadata.

Confidence:
High on architecture direction; medium on live provider health until the provider matrix is rerun.

### Failure-Mode Reviewer

Position:
The same failure will recur if the assistant can silently degrade from packet-first or source-specific behavior into generic model synthesis while still returning a plausible answer.

Evidence:
- `npm run rag:verify:chat-architecture` currently fails.
- `node scripts/verify/verify_ai_advisor_quality.mjs` currently fails on forbidden internal language.
- Source-specific verification passes, but it does not prove answer-level citation quality.
- Packet freshness is handled in route code, but the guardrail must verify metadata and user-facing freshness language.

Risk in the other strategies:
Any strategy without a fail-loud route contract will produce another "fixed forever" patch that only works for the tested prompt. A retrieval rewrite without answer-level attribution gates can still return wrong-source or wrong-project context. A provider fix without user-facing quality gates can still produce internal implementation language.

Minimum viable next step:
Make current failure modes impossible to miss:

1. Fix chat architecture gate.
2. Fix advisor quality gate.
3. Add retrieval-grounding gate.
4. Add or tighten eval cases so generic answers fail when exact evidence was requested.

Guardrail required:
Every assistant response path should expose enough metadata to diagnose: intent, provider decision, packet freshness, source counts, tool trace, response quality, and loop diagnostic. User-facing answers should explicitly say when the packet is missing/stale or source evidence is thin.

Confidence:
Medium. This role was synthesized inline after the delegated failure-mode agent timed out, using the same verifier and route evidence gathered in this run.

### Product Advisor

Position:
The assistant should feel like a project advisor for strategic project questions and like exact evidence lookup for source questions. Internal terms and implementation narration should be treated as product failures.

Evidence:
- `frontend/src/lib/ai/agents/strategist.ts` requires point of view, evidence, recommendation, and explicit gaps.
- `frontend/src/lib/ai/intelligence/advisor-synthesis.ts` formats packet answers around current read, changes, exposure, risks, next action, evidence, confidence, and target resolution.
- `frontend/src/components/ai-assistant/source-citations.tsx` maps source evidence into visible citation links.
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` supports durable decision packet rendering.
- `node scripts/verify/verify_ai_advisor_quality.mjs` currently fails because the answer can expose `RAG`.

Risk in the other strategies:
Retrieval-first work can improve hidden mechanics while still producing generic or internally worded answers. Packet-only work can sound confident with stale context. UI-only work can make weak advice look polished.

Minimum viable next step:
Fix advisor quality so project-advisor answers never expose internal `RAG`, `tool call`, or `retrieval` language, and add an eval case that checks packet-first answer, source-lookup answer, freshness/confidence, and durable packet/page/widget routing.

Guardrail required:
Fail when a project-advisor answer lacks evidence, recommendation, confidence, or freshness; when source lookup falls back to generic project summary; when internal terms appear in user-facing advisory text; or when write/action tools are exposed without preview/confirmation routing.

Confidence:
Medium-high. Product primitives exist, but current verifier failures show the product contract is not locked down.

## Disagreements And Resolution

| Disagreement | Positions | Resolution method | Decision |
|---|---|---|---|
| Should the next fix be retrieval-first? | RAG Architect wants stronger retrieval-grounding; Repo/Product warn against embedding-first work. | Compare current gates. Source-specific static gate passes, architecture/advisor gates fail. | Fix architecture/advisor gates first, then add retrieval-grounding verifier before deeper tuning. |
| Is provider/tool behavior the core blocker? | AI SDK specialist says provider health must be gated; others see current failures in route/product contract. | Run provider matrix only after chat architecture gate is addressed or alongside it if tool behavior is questioned. | Keep AI SDK + AI Gateway; do not switch provider architecture. |
| Are packets enough? | Repo Architect defends packet-first; RAG/Product warn packets can become stale or mask source gaps. | Require packet freshness/status metadata plus source lookup challenge path. | Preserve packet-first, but make freshness and evidence gaps explicit. |
| Is this a strategy or implementation task? | Skill implementation is complete; council found concrete next coding slice. | Save report and use it as source of truth for the next slice. | Next coding slice is advisor-contract hardening. |

## Consensus Implementation Sequence

1. Fix `npm run rag:verify:chat-architecture`.
   - Strip non-history status parts before resend.
   - Reconcile expected operational tool inventory.
   - Gate write/action tools so default strategist turns do not expose unsafe actions.

2. Fix `node scripts/verify/verify_ai_advisor_quality.mjs`.
   - Remove internal `RAG` language from user-facing advisor output.
   - Keep implementation language in metadata/logs/docs, not assistant answers.

3. Add retrieval-grounding verification.
   - Assert source type, project linkage, document/chunk identity when available, citation text, and final answer citation.
   - Cover meetings, email, and Teams first.

4. Run provider matrix and assistant-routing checks.
   - Keep AI SDK + AI Gateway unless current provider evidence contradicts it.
   - Fail on empty output, missing tool calls, missing tool results, and `finishReason: "other"`.

5. Only then consider deeper retrieval changes.
   - Chunking, hybrid search, reranking, and ingestion/vectorization changes should be driven by grounding failures, not generic dissatisfaction.

## Verification Gates

| Gate | Command or evidence | Required result | Owner layer |
|---|---|---|---|
| Source-specific static contract | `npm run rag:verify:source-specific` | Pass | source lookup |
| Chat architecture contract | `npm run rag:verify:chat-architecture` | Pass | route/tool contract |
| Advisor language quality | `node scripts/verify/verify_ai_advisor_quality.mjs` | Pass | product answer contract |
| Provider/tool matrix | `node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs` | Pass, no empty text, no `finishReason: "other"` | provider/tool calling |
| Packet contract | `node scripts/verify/verify_ai_intelligence_packet_contract.mjs` | Pass | packet-first intelligence |
| Retrieval grounding | `npm run rag:verify:retrieval-grounding -- <case>` | New gate required | source attribution |
| Targeted eval cases | `npm run rag:verify:eval-suite:case -- source-lookup-meetings` and sibling cases | Pass with source-bearing citations | answer quality |

## Fail-Loud And Recurrence Guardrails

- Cause: RAG fixes were treated as single-layer bugs even though failures can come from routing, provider/tool behavior, packet freshness, source attribution, ingestion, or product-language contracts.
- Detection gap: Existing gates prove some contracts exist, but do not fully prove final answer grounding, project linkage, citation quality, or product language.
- Prevention step: Make the advisor-contract gate and retrieval-grounding gate part of the default RAG implementation sequence before deeper retrieval changes.
- Fail-loud behavior: The assistant should persist and expose intent, provider decision, packet freshness, source counts, tool trace, response quality, and loop diagnostic metadata; user-facing answers should clearly state stale/missing/thin evidence instead of quietly falling back to generic synthesis.

## Open Questions

- Which write/action tools should remain visible to the default strategist, and which must move behind preview/confirmation-only routing?
- Should retrieval-grounding be implemented as a new script or folded into `verify_ai_assistant_eval_suite.mjs`?
- Should model catalog freshness be a standalone gate for `frontend/src/lib/ai/assistant-models.ts`?

## Recommended Next Step

Implement the advisor-contract hardening slice: make `rag:verify:chat-architecture` and `verify_ai_advisor_quality.mjs` pass, then add the first retrieval-grounding verifier before touching chunking, embeddings, or provider architecture.
