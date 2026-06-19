---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - hermes-agent/ (NousResearch/hermes-agent @ 5e93075fd, MIT)
  - openclaw/ (openclaw/openclaw @ 5a00720de0, MIT)
  - docs/architecture/AI-RAG-ARCHITECTURE.md
  - frontend/src/lib/ai/**
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Audit of hermes-agent and openclaw against Alleato AI assistant architecture'
research_goals: 'Identify highest-leverage code/patterns to copy, adapt, or reference, with license notes, source/target paths, risk, dependencies, tests, an ordered implementation checklist, and an archival plan'
user_name: 'Megan'
date: '2026-06-19'
web_research_enabled: false
source_verification: true
---

# Technical Research Report: Hermes-Agent + OpenClaw → Alleato AI Assistant

**Date:** 2026-06-19
**Author:** Megan
**Research Type:** Technical (local-source audit)
**Method:** Direct source reading of two cloned MIT repos + Alleato's `docs/architecture/AI-RAG-ARCHITECTURE.md` and `frontend/src/lib/ai/`, executed via three parallel deep-read sub-agents (per the verification-delegation rule), synthesized here.

---

## Research Overview

This report audits two third-party, MIT-licensed AI-assistant codebases temporarily cloned into the project root — **`hermes-agent`** (Nous Research, Python) and **`openclaw`** (OpenClaw Foundation, TypeScript/Node monorepo) — against Alleato's current AI assistant (Next.js 15 + Vercel AI SDK + Supabase/pgvector). It identifies the highest-leverage code and patterns to **copy**, **adapt**, or **reference**, and produces an ordered implementation plan with per-candidate license notes, source/target paths, risk, dependencies, required tests, and an explicit **archival plan** for both superseded Alleato code and the temporary source clones.

**Bottom line:** OpenClaw (same language as Alleato) yields the most *copy-ready* wins — chiefly **`tool-call-repair`** (kills a class of silent tool-call failures) and **`net-policy`** (SSRF + secret-redaction hardening for `fetchWithGuardrails`). Hermes-Agent yields the most *differentiated design* wins — chiefly the **closed learning loop** (autonomous skill/memory self-improvement) and **session search** (recall over the agent's own past conversations), both of which Alleato wholly lacks. Most architectural systems in both repos (full gateways, in-process subagent forking, Honcho SaaS, plugin frameworks) are **reference-only** because Alleato already has equivalents or they're too infra-coupled.

---

## Verification Findings (2026-06-19) — added after live data check

Before committing to Phase 1, the C1 (tool-call-repair) failure mode was verified against live data (`chat_history`, PM APP, 1,995 assistant messages, 2026-03-02 → 2026-06-19):

| Signal | Count | Meaning |
|--------|-------|---------|
| Harmony `<\|channel\|>` / `to=` markers | **0** | No Harmony-dialect prose tool calls |
| XML `<function=` / `<parameter=` | **0** | No XML-dialect prose tool calls |
| `[tool_name]\n{json}` bracket shape | **0** | No bracket-dialect prose tool calls |
| `NoSuchTool` / `InvalidToolArgument` / `malformed` in metadata | **0** | No tool-call argument errors |
| `<think>`/`<reasoning>` tags in stored content | **0** | No reasoning-tag leakage |
| **`empty_model_response = true`** | **59 (~3%)** | The *actual* observed reliability issue, already caught by `fallback-chain.ts` |

**Conclusion / decision:**
- **C1 (tool-call-repair) → DEFERRED.** Alleato is 100% OpenAI via the official tool-calling interface, which returns structured `tool_calls`. The prose-tool-call dialects C1 parses are emitted by open-weight/non-OpenAI models. C1 has **zero current surface** — it becomes valuable only when gap **G5 (single provider)** is acted on (a non-OpenAI model is added). Re-prioritize C1 *with* any multi-provider work.
- **C3a (think-scrubber) → DEFERRED** for the same reason (0 reasoning tags leak from OpenAI). C3b (iteration-budget) remains a trivial optional COPY.
- **C2 (net-policy) → PROMOTED to sole Phase-1 lead.** Security hardening is valuable regardless of model behavior and satisfies the standing `fetchWithGuardrails` mandate.
- **New follow-up (out of audit scope):** the measured ~3% empty-model-response rate (59 turns) is the real reliability signal worth a separate root-cause investigation; `fallback-chain.ts` recovers it but does not explain it.

## Technical Research Scope Confirmation

**Research Topic:** Audit of `hermes-agent` and `openclaw` against Alleato's current AI assistant architecture.
**Research Goals:** Implementation-ready plan — per pattern: license note, source path, target Alleato path, leverage rating, risk, dependencies, tests required, ordered checklist, and archival plan.

**Scope confirmed:** 2026-06-19 (user selected **C**).

- Architecture analysis — agent loop, memory/learning, gateway/channels, tool/skill registry, scheduling, subagent delegation.
- Implementation approaches — what transplants cleanly into Next.js + Vercel AI SDK + Supabase vs. reference-only.
- Integration patterns — multi-channel gateway, cron/automation, memory persistence, session search.
- License & provenance — MIT terms, attribution obligations, archival plan.
- Risk / dependencies / tests / ordered checklist per candidate.

---

## 1. Source Repository Profiles & License

| Repo | Origin | Commit | License | Language/Build | Attribution obligation |
|------|--------|--------|---------|----------------|------------------------|
| `hermes-agent` | `github.com/NousResearch/hermes-agent` | `5e93075fd` (2026-06-19) | **MIT**, © 2025 Nous Research | Python; no NOTICE file | Carry MIT notice + credit Nous Research in any copied non-trivial file. Porting *ideas* to fresh TS = no obligation. |
| `openclaw` | `github.com/openclaw/openclaw` | `5a00720de0` (2026-06-19) | **MIT**, © 2026 OpenClaw Foundation | TS ESM strict, **pnpm monorepo**, built with `tsdown`, packages are `0.0.0-private` (`workspace:*`, **not npm-installable** → must copy source) | Carry MIT notice in copied portions. `THIRD_PARTY_NOTICES.md` lists only Pi/pi-mono (terminal UI lineage) — **none of the target patterns are pi-derived**, so the standard OpenClaw MIT notice suffices. |

**Both are MIT and safe for commercial use.** The only mechanical obligation is preserving a short attribution + MIT permission header in files that contain substantially-copied code.

---

## 2. Alleato Baseline — What Already Exists and Works Well

(Ground-truthed against `docs/architecture/AI-RAG-ARCHITECTURE.md` + `frontend/src/lib/ai/`.)

1. **Mature multi-agent C-suite orchestration** — Strategist (`agents/strategist.ts`) + 6 domain specialists (CFO/COO/CRO/CHRO/VPBD/CMO), each a per-specialist `ToolLoopAgent` with scoped tools, parallel fan-out (`orchestrator.ts:1061 consultAgents()`), structured synthesis.
2. **Governed tool layer** — `tool-registry.ts` (1,225 lines), 94 live tools after project-scope filtering, policy filtering by scope/workflow/actor/source-family/write/delivery, **CI guardrail that fails on unregistered tools** (`scripts/verify/verify_ai_assistant_tool_registry.mjs`).
3. **Deterministic intent routing** — `intent-router.ts`, 18-intent regex classifier, packet-first vs. stream decisions.
4. **Strong RAG/retrieval spine** — `retrieval/` planner→executor, weighted scoring, source-specific retrieval, packet-first reuse; vectors in AI Database (`document_chunks` halfvec 3072, `text-embedding-3-large`) via `search_document_chunks`.
5. **Cross-session memory** — `services/ai-memory-service.ts` (`ai_memories`, embedding-dedup > 0.88, team/private, token-capped ranked injection), `services/memory-extraction.ts` (`after()` hook, gpt-4.1-nano).
6. **Feedback → guardrail loop** — `services/agent-learning-service.ts` (`agent_learnings` prevention prompts from thumbs-down/admin/eval-failure).
7. **Human-authored Skill Library** — `services/skill-library-service.ts` (`ai_skills`, scope/keyword selection, prompt injection, usage tracing).
8. **Observability + eval** — Langfuse tracing + PII masking, heuristic + LLM-judge scoring (opt-in), versioned eval suite + verifier, per-model cost telemetry + daily budget guard.
9. **Proactive intelligence** — `intelligence/` packets, `personal-daily-brief.ts`, `insight-cards/`, Render crons.
10. **Cost-controlled provider path** — Vercel AI Gateway BYOK with kill switches + empty-output recovery (`fallback-chain.ts`).
11. **Write-action safety** — Microsoft operator (`action-tools.ts`) all gated behind explicit `confirmed` approval.

---

## 3. Alleato Capability Gaps (the adoption targets)

| # | Gap | Best source pattern | Verdict |
|---|-----|---------------------|---------|
| G1 | **No tool-call repair / self-correction** — zero `experimental_repairToolCall`; models emitting tool calls as prose silently fail | OpenClaw `tool-call-repair` | **COPY** (top win) |
| G2 | **No SSRF/egress guard or secret redaction** on external fetches | OpenClaw `net-policy` | **COPY** (top win) |
| G3 | **No autonomous self-improvement** — skills/learnings 100% human-gated; agent never writes skills from experience | Hermes `background_review.py` + `curator.py` | ADAPT / REFERENCE |
| G4 | **No recall over its own past conversations** (episodic) | Hermes FTS5 session search (anchored windows + bookends) | ADAPT (→ Postgres `tsvector`/`pg_trgm`) |
| G5 | **No inbound multi-channel gateway** — web-chat-only; Microsoft is outbound + human-gated | Hermes gateway registry/delivery; OpenClaw presentation-action model | REFERENCE / partial ADAPT |
| G6 | **Proactivity is cron-only**, no agent-managed scheduling ("remind me in 3 days") | Hermes cron NL parser + blueprints | ADAPT (parser/blueprints only) |
| G7 | **No formal tool-call policy/redaction hook layer** (pending operator approval-policy split) | OpenClaw `agent-core` `beforeToolCall`/`afterToolCall` | ADAPT |
| G8 | **Vector-only RAG ranking** — no recency decay or hybrid dual-score | OpenClaw memory promotion/decay scoring | ADAPT |
| G9 | **No streaming reasoning-tag scrubbing / token-budget hardening** | Hermes `think_scrubber.py` + `iteration_budget.py` | COPY |
| G10 | **Context-window blow-up on long RAG chats** — no turn-boundary compaction | Hermes `context_compressor.py` / OpenClaw `harness/compaction/` | ADAPT |
| G11 | **High token cost on heavy-output tools** (RAG dumps, Acumatica lists, budget tables) | Hermes "code mode" RPC | ADAPT |

> **Deliberately NOT adopted:** Hermes's self-registering tool registry and toolsets (Alleato's `tool-registry.ts` is already stronger — governed + CI-guarded). OpenClaw's `llm-core`/`model-catalog-core` (Alleato already uses Vercel AI Gateway for unified routing + live catalog). Full gateways, in-process subagent forking, Honcho SaaS, plugin frameworks — reference-only.

---

## 4. Candidate Catalog (full implementation detail)

Each candidate carries: source path · target Alleato path · license note · leverage · risk · dependencies · tests required · **archival note** (what original-version code this supersedes).

### TIER 1 — COPY (transplant largely as-is, highest ROI)

#### C1. Tool-call repair (OpenClaw) — fills G1 ⭐ top priority
- **What:** Parses tool calls a model emitted as *plain text* in three dialects — `[tool_name]\n{json}`, OpenAI Harmony channel syntax, and XML-ish `<function=name><parameter=x>…</function>` — validates the JSON (balanced-brace scan, byte cap), promotes them into real tool-call parts, and scrubs the raw blocks from user-visible text. Pure string parsing; no LLM, no network.
- **Source paths:** `openclaw/packages/tool-call-repair/src/{grammar.ts, payload.ts, promote.ts, stream-normalizer.ts, index.ts}` (~2,330 LOC, **zero deps**). Core parse+promote ≈ 940 LOC (`grammar.ts`+`payload.ts`+`promote.ts`).
- **Target Alleato path:** `frontend/src/lib/ai/tool-call-repair/` (new dir); wire into `frontend/src/lib/ai/orchestrator.ts` and the chat handler `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` as a post-model / pre-render normalization step. Resolver hooks (`createToolCallBlock`, `resolveToolName`) bind to the live registry's allowed tool names from `tool-registry.ts`.
- **License note:** MIT © 2026 OpenClaw Foundation — add header to each copied file. Not pi-derived.
- **Leverage:** COPY. **Risk:** Low — additive, no behavior change when models emit well-formed calls; risk is a false-positive promotion of prose that *looks* like a tool block (mitigated by validating against registry tool names + JSON schema before promoting).
- **Dependencies:** none.
- **Tests required:** Port the package's own unit tests; add Alleato cases — (a) gpt-4.1-nano title model emitting a prose tool call gets promoted, (b) ordinary prose containing brackets is NOT mis-promoted, (c) unknown tool name → not promoted, left as text, (d) malformed JSON → scrubbed, surfaced as a loud error not silent drop (CLAUDE.md). Add a regression entry to `scripts/api-smoke-contracts.mjs`.
- **Archival note:** Supersedes nothing today (Alleato has no repair logic). After landing, the empty-output recovery in `fallback-chain.ts` should remain (different failure mode) but its comment should cross-reference repair as the first line of defense.

#### C2. Network egress policy / SSRF + secret redaction (OpenClaw) — fills G2 ⭐ top priority
- **What:** SSRF/credential-leak defense for outbound `fetch`: parses IPv4/IPv6 incl. octal/hex/decimal + IPv6-transition forms (6to4, Teredo, NAT64) that bypass naive checks; blocks loopback/private/link-local/reserved + cloud-metadata IPs (`169.254.169.254`, Aliyun `100.100.100.200`, `fd00:ec2::254`); CIDR matching for DNS-rebinding defense; redacts `user:pass@` userinfo + 39+ sensitive query-param names before logging.
- **Source paths:** `openclaw/packages/net-policy/src/{ip.ts, redact-sensitive-url.ts, url-userinfo.ts}` + colocated `*.test.ts`.
- **Target Alleato path:** `frontend/src/lib/net-policy/` (new); wire into `frontend/src/lib/fetch-with-guardrails.ts` (pre-flight resolved host/IP against block rules; run `redactSensitiveUrl` on every URL before Sentry/PostHog/console). Covers web-search, Acumatica, Microsoft Graph, and future MCP tool fetches.
- **License note:** MIT © 2026 OpenClaw Foundation — add header.
- **Leverage:** COPY. **Risk:** Low–Medium — could block a legitimate internal-host call if Alleato ever fetches a private address on purpose; mitigate with an explicit allowlist param. Directly satisfies CLAUDE.md's "all external calls go through `fetchWithGuardrails`" mandate.
- **Dependencies:** `ipaddr.js@^2.4.0` (single, common).
- **Tests required:** Port package tests; add — (a) metadata IP blocked, (b) octal-encoded localhost blocked, (c) `?token=…&api_key=…` redacted in log output, (d) allowlisted internal host passes. Add to `scripts/api-smoke-contracts.mjs`.
- **Archival note:** If any ad-hoc URL sanitization/host checks exist inline in `fetch-with-guardrails.ts`, archive them in favor of the shared module.

#### C3. Streaming think-scrubber + iteration budget (Hermes) — fills G9
- **What:** (a) `StreamingThinkScrubber` — stateful per-delta machine that strips `<think>`/`<reasoning>` blocks from streamed output, correctly handling tags split across chunk boundaries; (b) `IterationBudget` — thread-safe turn counter with `consume()`/`refund()` (subagents get independent budgets).
- **Source paths:** `hermes-agent/agent/think_scrubber.py` (`feed()` 106–202, `flush()` 204–223; ~220 LOC) · `hermes-agent/agent/iteration_budget.py` (full, 63 LOC).
- **Target Alleato path:** `frontend/src/lib/ai/stream/think-scrubber.ts` + `frontend/src/lib/ai/iteration-budget.ts` (ports to TS; drop the lock — single-threaded JS).
- **License note:** MIT © 2025 Nous Research — these are direct ports; add credit header.
- **Leverage:** COPY (transliterate). **Risk:** Low. Think-scrubber only useful if an Alleato model streams reasoning tags into output (verify per-model first; if none do, defer C3a and keep only C3b).
- **Dependencies:** none.
- **Tests required:** tag split across chunks, unterminated block discarded on flush, no false stripping of literal "`<think>`" in code blocks; budget consume/refund/exhaust.
- **Archival note:** None (additive).

#### C4. Boundary normalization helpers (OpenClaw) — supporting
- **What:** Zero-dep coercion/guards for untrusted boundaries: `normalizeOptionalString`, `asRecord`/`isRecord`, `readStringField`, `normalizeStringifiedEntries`, `normalizeFastMode`.
- **Source paths:** `openclaw/packages/normalization-core/src/` (~300 LOC, no deps).
- **Target Alleato path:** `frontend/src/lib/normalize/` — use where webhooks/model-JSON are parsed (Teams callbacks, Fireflies, Microsoft Graph payloads).
- **License note:** MIT © 2026 OpenClaw Foundation.
- **Leverage:** COPY. **Risk:** Very low. **Dependencies:** none.
- **Tests required:** port package tests.
- **Archival note:** Optional cleanup of ad-hoc `typeof x === "string"` guards in webhook parsers (do opportunistically, not as a blocking step).

### TIER 2 — ADAPT (port the design into Alleato's structure)

#### C5. Tool-call policy/redaction hooks: `beforeToolCall` / `afterToolCall` (OpenClaw) — fills G7
- **What:** `agent-core`'s loop exposes `beforeToolCall` (block/deny with reason — runtime policy gate) and `afterToolCall` (rewrite result content / `isError` / `terminate` — redaction & early-exit). Stock Vercel AI SDK lacks these as first-class hooks.
- **Source paths:** `openclaw/packages/agent-core/src/agent-loop.ts` (hook definitions), `agent.ts`.
- **Target Alleato path:** A thin wrapper around Vercel AI SDK tool definitions in `frontend/src/lib/ai/tool-registry.ts` + a new `frontend/src/lib/ai/tools/outbound-action-policy.ts` (the file MEMORY already flags as pending). This is the clean home for the **operator approval gate** (`needsConfirmedWriteApproval`) and tool-output redaction — instead of scattering policy across 24 `action-tools.ts` tools.
- **License note:** ADAPT (design ported, little verbatim copy) — light obligation; credit in a comment.
- **Leverage:** ADAPT. **Risk:** Medium — touches the write-approval path; must preserve current `confirmed`-gate behavior exactly. Land behind a flag, validate with the eval suite's high-risk-draft-only guard.
- **Dependencies:** none beyond existing SDK.
- **Tests required:** approval gate still blocks unconfirmed writes; redaction strips secrets from tool results pre-trace; `terminate` exits cleanly. Extend `docs/ai-plan/evals/assistant-eval-suite.json`.
- **Archival note:** After centralizing, archive the per-tool ad-hoc `confirmed` checks scattered in `action-tools.ts` (replace with the shared gate), and fold `email-operator-policy.ts` / `action-capabilities.ts` logic into the policy module — archive whatever becomes dead.

#### C6. Portable presentation-action model (OpenClaw) — supports G5/operator
- **What:** Transport-agnostic message UI — `MessagePresentation` (title/tone/blocks), `MessagePresentationButton` (label/action/url/priority/style), `MessagePresentationAction` union (command|callback). Each channel declares capabilities; core adapts/drops affordances per transport (Teams Adaptive Card, Slack Block Kit, Telegram).
- **Source paths:** `openclaw/src/interactive/payload.ts`, `openclaw/src/channels/plugins/{message-capabilities.ts, message-action-names.ts, types.adapters.ts}`.
- **Target Alleato path:** `frontend/src/lib/ai/operator/presentation.ts` (new) — define an `OperatorMessage` envelope (Alleato's `operatorId`/`approvalId`, not OpenClaw's `sessionKey`). Renders one approval/button shape as a Teams Adaptive Card today (pairs with the existing `adaptive-cards-teams` skill) and an Outlook actionable message / future Slack message tomorrow.
- **License note:** ADAPT — types ported. **Leverage:** ADAPT. **Risk:** Low–Medium.
- **Dependencies:** swap their `typebox` for **Zod** (already in Alleato).
- **Tests required:** presentation → Teams Adaptive Card snapshot; unsupported affordance silently dropped, not errored.
- **Archival note:** None initially (additive layer above current Teams send); future channel-specific card builders can be archived as they migrate onto the shared shape.

#### C7. Hermes session search → Postgres recall (Hermes) — fills G4
- **What:** Cross-session recall with **no LLM calls**: FTS index over message content/tool names/tool-call JSON; query returns deduped hits (one per session lineage root), each expanded into an anchored ±5-message window **plus** session bookends (first/last 3 messages). The **anchored-window + bookend retrieval design** is the real asset.
- **Source paths:** `hermes-agent/tools/session_search_tool.py` (`session_search()` 495–616, `_discover()` 394–492) · `hermes-agent/agent/hermes_state.py` (`get_anchored_view()` 2740–2858, `search_messages()` 3331+).
- **Target Alleato path:** A new `searchPastConversations` tool in `frontend/src/lib/ai/tools/` + a Postgres FTS index on `chat_history` (use `tsvector` + `pg_trgm`, **not** SQLite FTS5). Surface in chat UI + daily-brief context.
- **License note:** ADAPT (design only; storage is different engine). **Leverage:** ADAPT. **Risk:** Medium — new index + RPC; must scope by user/team (RLS).
- **Dependencies:** Postgres `pg_trgm` (extension), a `search_chat_history` RPC.
- **Tests required:** anchored window returns correct neighbors; dedup by session; RLS scoping; zero-result path is loud-empty not error.
- **Archival note:** None (new capability). Note: distinct from document RAG — do not route through `document_chunks`.

#### C8. Hybrid dual-score + recency-decay RAG ranking (OpenClaw) — fills G8
- **What:** Multi-factor memory score (frequency, relevance, query diversity, recency with 14-day exponential half-life) + **dual-score ranking** (vector + FTS blended). Frequently-grounded knowledge surfaces higher; stale content fades.
- **Source paths:** `openclaw/extensions/memory-core/src/short-term-promotion.ts` (`DEFAULT_PROMOTION_WEIGHTS`), `openclaw/packages/memory-host-sdk/src/host/types.ts` (`MemorySearchResult.vectorScore`/`textScore`).
- **Target Alleato path:** Extend `search_document_chunks` RPC (AI Database) + `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts`. Add `recall_count` / `last_recalled_at` columns to `document_chunks`.
- **License note:** ADAPT (math only). **Leverage:** ADAPT. **Risk:** Medium — changes retrieval ranking; A/B against the eval suite before defaulting on. **Touches RAG → RAG-DOCS-GATE applies** (update `AI-RAG-ARCHITECTURE.md` + `docs/architecture/tables.yaml`, run `npm run db:inventory`).
- **Dependencies:** Postgres `tsvector` FTS on chunks; existing rerank infra.
- **Tests required:** decay lowers stale-chunk rank; blended score beats vector-only on eval set; migration is reversible.
- **Archival note:** If a pure-cosine ranking branch exists in `retrieval-weight-scoring.ts`, keep it behind a flag for rollback, then archive once hybrid is proven.

#### C9. Context compaction (both repos) — fills G10
- **What:** Turn-boundary, token-budget-aware context compression: protect system prompt + head + budgeted tail; prune old tool results to one-liners; LLM-summarize the middle; refresh a *previous* summary instead of re-summarizing; strip historical images to placeholders.
- **Source paths:** `hermes-agent/agent/context_compressor.py` (`compress()` ~2151+, `_prune_old_tool_results()` 841–1012) · OpenClaw `openclaw/packages/agent-core/src/harness/compaction/compaction.ts` (`shouldCompact`, `compact`, `DEFAULT_COMPACTION_SETTINGS`; ~878 LOC, near-standalone).
- **Target Alleato path:** `frontend/src/lib/ai/stream/compaction.ts` (new) — invoked between turns in the chat handler when token budget exceeded; uses the synthesis model (`gpt-4.1`).
- **License note:** ADAPT (prefer porting OpenClaw's near-standalone TS module). **Leverage:** ADAPT. **Risk:** Medium-High — summarization can drop salient context; gate behind a token threshold and keep last N turns verbatim.
- **Dependencies:** a non-streaming completion fn (wrap `generateText`); a token counter.
- **Tests required:** under-threshold = no-op; over-threshold preserves head/tail + recent turns; summary refresh is idempotent.
- **Archival note:** Archive any naive history-truncation currently in the chat handler in favor of compaction.

#### C10. Code mode — programmatic tool calling via RPC (Hermes) — fills G11
- **What:** Model writes ONE script that calls many tools via RPC; bulky tool outputs never enter the LLM context (only the script's stdout does); if it's the only tool used in a turn, the iteration budget is refunded — a 10-tool script costs one turn.
- **Source paths:** `hermes-agent/tools/code_execution_tool.py` (`generate_hermes_tools_module()` 259–291, `_rpc_server_loop()` 468–593, `_scrub_child_env()` 136–197).
- **Target Alleato path:** A new sandboxed `runToolScript` tool. **Highest-risk item** — needs a JS/TS sandbox (Vercel Sandbox, or Node `vm`/`worker_threads` with a hard egress + env scrub). Defer until a sandbox decision is made.
- **License note:** ADAPT (design; implementation is bespoke). **Leverage:** ADAPT. **Risk:** **High** — arbitrary code execution surface; demands strong isolation + the C2 net-policy egress guard + env scrubbing. Do not ship without a security review.
- **Dependencies:** a sandbox runtime; IPC channel; C2 (net-policy).
- **Tests required:** sandbox escape attempts blocked; env secrets not visible to script; egress restricted; budget refund correct.
- **Archival note:** None (new capability). Lowest-priority of the set despite high token upside.

### TIER 3 — REFERENCE (study; do not transplant)

| Pattern | Source | Why reference-only |
|---------|--------|--------------------|
| Closed learning loop (background self-improvement review + curator) — **G3** | `hermes-agent/agent/background_review.py`, `curator.py` | The *idea* (async post-turn pass that distills durable prefs/procedures + auto-archives stale skills) is high value, but implementation = Python daemon threads + in-process agent forking + `MEMORY.md` files. Alleato already has the human-gated halves (`ai_memories`, `ai_skills`, `agent_learnings`). **Adopt incrementally:** add an opt-in `after()` background job (Render) that *proposes* skill/memory writes into the existing review queues — keep human gate initially, relax later. Treat as a Phase-3 design study, not a copy. |
| MemoryProvider lifecycle ABC | `hermes-agent/agent/memory_provider.py`; Honcho plugin | Honcho is a SaaS dependency. Borrow the `prefetch`/`sync_turn`/`on_session_end` interface + `<memory-context>` stream-scrubbing; back it with Supabase, not Honcho. |
| Multi-channel inbound gateway — **G5** | `hermes-agent/gateway/*`; `openclaw/packages/gateway-protocol`, `gateway-client` | Full control planes. Alleato doesn't need a gateway process. Borrow only the **`PlatformEntry` registry + `DeliveryTarget` routing** abstraction (each surface declares metadata + a send fn; agent emits text + target; router resolves) when unifying Teams/Outlook/digest delivery. |
| Subagent in-process forking | `hermes-agent/tools/delegate_tool.py` | Alleato's harness already delegates to sub-agents (this audit did). Only portable insight: return a compact summary to the parent context, never the child's tool calls. |
| LLM provider abstraction / model catalog | `openclaw/packages/{llm-core,llm-runtime,model-catalog-core}` | Alleato uses Vercel AI Gateway (unified routing + live catalog + fallback). OpenClaw's catalog is static data to maintain. Reference its compat-flag taxonomy / `thinkingLevelMap` only for a per-model quirk Gateway doesn't expose. |
| Plugin SDK / package contract | `openclaw/packages/{plugin-sdk,plugin-package-contract}`, `extensions/brave/` | Overkill for 28 governed tools. Borrow two ideas without the framework: lazy `.runtime.ts` import of heavy execution code (Next.js bundle size), and credential-path-plus-env-fallback metadata. |
| Hermes tool registry + toolsets | `hermes-agent/tools/registry.py`, `toolsets.py` | **Alleato's `tool-registry.ts` is already stronger** (governed + CI-guarded). Reference only the TTL-cached `check_fn` availability probe + `dynamic_schema_overrides` (schema text reflecting live config) if useful. |
| NL schedule parser + blueprints — **G6** | `hermes-agent/cron/jobs.py` (`parse_schedule()` 289–375), `blueprint_catalog.py`, `suggestions.py` | The tick loop is coupled to in-process `AIAgent`; Alleato schedules on Render (intentional). **Adopt only** the pure NL-schedule parser + blueprint/suggestion JSON data model (store as Supabase JSONB) to enable user-facing "every Monday 9am, email me a digest" one-tap automations on top of existing crons. |
| Markdown render-aware chunking | `openclaw/packages/markdown-core/src/` | Adopt only if the embedding pipeline ingests markdown-shaped docs (preserves tables/fences/frontmatter across chunk boundaries). Skip for PDF/HTML/email corpora. |
| Byte-capped response reader | `openclaw/packages/media-core/src/read-response-with-limit.ts` | Small hardening for tools downloading untrusted files; pairs with C2. Fold in opportunistically. |

---

## 5. Ordered Implementation Checklist

Phased by leverage ÷ effort ÷ risk. Each phase is independently shippable. **Per CLAUDE.md:** delegate typecheck/quality/build to a sub-agent; add a regression guardrail with every fix; RAG-touching items trip the RAG-DOCS-GATE.

### Phase 1 — Hardening (COPY, low risk, ship first)
- [x] **C2 net-policy** ✅ DONE 2026-06-19 — vendored `ip.ts`/`redact-sensitive-url.ts` (trimmed of OpenClaw config helpers)/`url-userinfo.ts` into `frontend/src/lib/net-policy/` with MIT headers; added Alleato `assert-url-allowed.ts` egress gate; wired `allowPrivateHosts` + loud-failing redacted egress check into `fetch-with-guardrails.ts`; `ipaddr.js@2.4.0` via pnpm; 44/44 unit tests across 2 suites; typecheck + lint clean for changed files. Egress gate blocks private/loopback/link-local/reserved IPs, always-blocks metadata (`169.254.169.254`/Aliyun/GCP-v6) even with the escape hatch, and defeats IPv4-mapped-IPv6 + legacy octal/hex bypasses. *Regression guardrail = the two jest suites (api-smoke-contracts intentionally not used — it's for endpoint failures, not a lib).*  *Follow-up: DNS-rebinding (resolve host → check resolved IP) deliberately deferred.*
- [ ] **C1 tool-call-repair** → **DEFERRED** (see Verification Findings — zero current surface on OpenAI-only stack). Revisit with gap G5 (multi-provider).
- [ ] **C3a think-scrubber** → **DEFERRED** (0 reasoning-tag leakage). **C3b iteration-budget** → optional trivial COPY.
- [ ] **C4 normalization-core** → copy helpers + tests into `frontend/src/lib/normalize/` *(deferred until a webhook/Teams consumer needs it — no current consumer)*.

### Phase 2 — Tool-policy & operator (ADAPT, medium risk)
- [ ] **C5 before/afterToolCall hooks** → build `outbound-action-policy.ts` + registry wrapper; migrate the `confirmed` write gate; flag-gated; extend eval suite.
- [ ] **C6 presentation-action model** → `operator/presentation.ts` with `OperatorMessage` envelope (Zod); render to Teams Adaptive Card.

### Phase 3 — Retrieval & memory (ADAPT, medium risk; RAG-DOCS-GATE)
- [ ] **C7 session search** → `pg_trgm` index + `search_chat_history` RPC + `searchPastConversations` tool (RLS-scoped).
- [ ] **C8 hybrid dual-score + decay** → `document_chunks` columns + RPC + scoring; A/B vs. eval suite; **update `AI-RAG-ARCHITECTURE.md` + `docs/architecture/tables.yaml` + `npm run db:inventory`**.
- [ ] **C9 context compaction** → port OpenClaw's compaction module; gate on token threshold.

### Phase 4 — Differentiated / high-risk (REFERENCE → incremental ADAPT)
- [ ] **G3 learning loop** → opt-in Render `after()` job that *proposes* skill/memory writes into existing human-gated review queues; relax gate only after confidence data. Borrow MemoryProvider lifecycle interface.
- [ ] **G6 NL schedule parser + blueprints** → port pure parser + blueprint JSON to Supabase JSONB; user-facing "schedule this automation" UX over Render crons.
- [ ] **C10 code-mode RPC** → only after a sandbox decision + security review; depends on C2.
- [ ] **G5 delivery router** → unify Teams/Outlook/digest behind a `PlatformEntry`+`DeliveryTarget` abstraction (study Hermes/OpenClaw gateways, build fresh).

---

## 6. Archival Plan

### 6a. Superseded Alleato code (archive AFTER the replacement lands and verifies)
| Trigger candidate | Archive / fold |
|-------------------|----------------|
| C2 lands | Any inline URL-sanitization/host checks in `fetch-with-guardrails.ts` |
| C5 lands | Per-tool ad-hoc `confirmed` checks scattered in `action-tools.ts`; dead branches of `email-operator-policy.ts` / `action-capabilities.ts` once folded into the policy module |
| C8 proven | Pure-cosine ranking branch in `retrieval-weight-scoring.ts` (keep flag-gated for one release, then remove) |
| C9 lands | Naive history-truncation in the chat handler |

> Archive = move to a clearly-marked deprecated path or delete with the replacement in the same PR, never leave two live paths. Add a guardrail test proving the new path owns the behavior (CLAUDE.md: "never fix a recurring bug without a guardrail").

### 6b. Source-clone cleanup (the temporary clones in the project root)
- `hermes-agent/` and `openclaw/` were cloned into the repo root **temporarily** for this audit and must NOT be committed (they'd violate the FILE-ORGANIZATION-GATE and bloat the repo — `openclaw/CHANGELOG.md` alone is 2.6 MB).
- **After each copied pattern lands:** the originating files for that pattern are no longer needed locally.
- **After the full plan is implemented (or this report is accepted):** delete both `hermes-agent/` and `openclaw/` from the project root. Add both to a local ignore if they must linger.
- The copied source files inside Alleato retain their **MIT attribution headers** — that is the permanent, compliant record of provenance; the clones themselves are disposable.
- This report (`_bmad-output/planning-artifacts/research/technical-hermes-openclaw-vs-alleato-ai-research-2026-06-19.md`) is the durable archive of what was studied and why.

---

## 7. License Compliance Summary

- Both repos **MIT** → copy/adapt/commercial use permitted.
- **Obligation:** preserve MIT copyright + permission notice in any file containing substantially-copied code (C1, C2, C3, C4). Ported *designs* (C5–C10) carry no legal obligation; credit in a comment as courtesy.
- OpenClaw `THIRD_PARTY_NOTICES.md` (Pi/pi-mono) is **not triggered** — no target pattern is pi-derived.
- OpenClaw packages are `0.0.0-private` (`workspace:*`) → **not npm-installable**; transplant = copy source, not add a dependency. Only external dep introduced is `ipaddr.js` (C2).

---

## 8. Risk Register

| Risk | Items | Mitigation |
|------|-------|-----------|
| Arbitrary code execution | C10 | Sandbox + C2 egress guard + env scrub + security review; lowest priority |
| Context loss from summarization | C9 | Token-threshold gate; keep last N turns verbatim; eval-suite check |
| Retrieval-ranking regression | C8 | Flag-gated A/B vs. eval suite before default-on; RAG-DOCS-GATE |
| Write-approval regression | C5 | Preserve `confirmed` gate exactly; high-risk-draft-only eval guard; flag rollout |
| False-positive tool-call promotion | C1 | Validate against registry tool names + JSON schema before promoting |
| Over-blocking legit fetches | C2 | Explicit allowlist param |
| Scope creep on learning loop | G3 | Keep human gate; propose-only into existing review queues first |

---

*End of report. Sub-agent audit IDs (resumable): hermes `a0e68b363c6c92fbe`, openclaw `ac3edc5a83566bb45`, baseline `a854e8c774d36f3fe`.*
