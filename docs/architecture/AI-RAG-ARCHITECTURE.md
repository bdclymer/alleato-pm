# Alleato AI/RAG Architecture

**Authoritative reference for all AI work. Read this before touching any file under `frontend/src/lib/ai/` or `backend/src/services/pipeline/`.**

Last verified: 2026-06-14 (**intelligence redesign — Slice 2.2b**: NEW `intelligence/project_synthesizer.py` (`synthesize_project_intelligence(project_id, since=None, max_docs=40)`, `compiler_version='project_synthesizer_v1'`) generalizes the meeting deep-extractor to EMAILS + TEAMS, which produced no intelligence after their compilers were deleted in Step 1. Per email/Teams doc: idempotent candidate clear → raw text from RAG `rag_document_metadata` → `llm.extract_deep_communication_intelligence` (NEW; full-context, evidence-backed, emits risk `severity` 1-5 + a `flags[]` array of forward-looking predictions: potential_change_event / emerging_risk) against `_fetch_project_state` ground truth → `write_source_signal_candidate`/`promote_signal_candidate` (cards) + `_upsert_task` (tasks, now tagged with real `source_system`). Meetings are SKIPPED here (still handled by `pipeline/extractor.py`). New `FlagItem` + `RiskItem.severity` in `pipeline/models.py`; `flag`/`solution`/`milestone` added to `compiler.INSIGHT_CARD_TYPES`. Admin trigger: `POST /api/intelligence/project-synthesize`. The live meeting path (`extract_deep_meeting_intelligence`, `run_extractor`) is byte-for-byte unchanged. No embedding/vector-store change. **Post-deploy fix (verified on project 1009):** the document-fetch SELECT referenced a non-existent `document_metadata.client_id` column (Postgres 42703) that aborted extraction with a silent 200 — column removed (`client_id=None` to `_upsert_task`), and a fatal document-fetch now raises so the endpoint returns 500 instead of a silent empty result. Added a `dry_run` mode to `synthesize_project_intelligence` / the endpoint: runs extraction but writes nothing, returning per-doc structured output (what_changed, signal/task counts, sample items + evidence) so extraction quality can be inspected directly. Added `StructuredData.extraction_failed` (set on the `_extraction_failed` branch) so a silent LLM-call failure is distinguishable from a genuinely-empty communication — surfaced in dry_run samples and treated as a real error (not silent empty) in the write path. Diagnosing email under-extraction — dry_run confirmed extraction_failed=TRUE for 26/26 emails (the LLM call fails, not empty content); added `StructuredData.extraction_error` to surface the underlying provider error (model id / auth / rate-limit) for root-cause.)

Last verified: 2026-06-14 (**intelligence redesign — Slice 2.2a**: card-promotion path (`compiler._upsert_insight_card_from_candidate`) now populates the new `insight_cards` timeline columns: `occurred_at` (source event date) on insert, and `severity` (1-5) on insert+update via `_derive_card_severity` — explicit LLM `severity` else derived from likelihood×impact in `extraction_json`, only for risk-bearing card types. Enriches existing live meeting cards; prereq for the generalized comms synthesizer + flag→outcome loop. No retrieval/embedding/table-structure change beyond the 2.1 migration.)

Last verified: 2026-06-14 (**intelligence redesign — Step 1 rip-out**: removed three premature/competing "intelligence writer" paths in favor of a single full-context project-synthesis spine (see `docs/architecture/INTELLIGENCE-REDESIGN-INVENTORY.md`). DELETED: `intelligence/teams_compiler.py`, `intelligence/email_compiler.py`, `services/task_extraction.py` and all their wiring (`sync.py` Teams-compiler inline step, `main.py` `/api/intelligence/teams-compiler/run` route + `GraphSyncRequest.run_teams_compiler`, `scheduler.py` task-extraction job + inline-compiler arg, `run_graph_sync_phase.py` flags). Prod: suspended `alleato-task-extraction` cron; set `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=false` (the gpt-5.4-mini Deep-Agents packet writer was a competing, weak project-intelligence source). KEPT untouched: Graph/Fireflies ingestion, embedding → `document_chunks`, meeting deep-extraction (`pipeline/extractor.py`) + shared `compiler.promote_signal_candidate`, `operating_summary.py`, `domain_compiler.py`, all `insight_cards`/`intelligence_packets` tables + frontend read surface. The `/api/intelligence/teams-compiler/status` route remains (reads `get_teams_compiler_status` RPC, no deleted-module import). Next: Step 2 builds the generalized rolling-state synthesizer. Tables/columns unchanged in this step.)

Last verified: 2026-06-12 (cost fix: `compiler.py` `enqueue_packet_refresh` was firing for ALL document types (email, Teams, meetings) on any high-confidence signal, triggering a `gpt-5.5` operating summary call (up to 153k chars) per email thread. Both call sites (`process_source_document` at confidence≥0.85 and `promote_signal_candidate`) now gate on `_source_category(...) == "meeting"` before enqueueing a packet refresh. Email and Teams signal candidates still get staged and promoted to insight cards — they just no longer trigger an operating summary rebuild. Only meeting documents trigger the operating summary packet refresh.)

Last verified: 2026-06-11 (Strategist agent tool: added `generateExecutiveDailyBrief` to `createStrategistTools()` via new `frontend/src/lib/ai/tools/executive-brief-tools.ts`. Uses the same production pipeline as the scheduled Teams delivery (`regenerateExecutiveBriefingDraft` from `executive-briefing-workflow.ts`). The tool is available on-demand via AI chat so users can ask "generate the daily brief" without waiting for the cron.)

Last verified: 2026-06-10 (observability: AI SDK telemetry is now centralized in `frontend/src/lib/ai/ai-telemetry.ts` via `aiTelemetry()`, used by `fallback-chain.ts` and `intent-classifier.ts`. The gate is `aiTelemetryEnabled()` = Langfuse configured (`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`) OR `PHOENIX_TRACING=true` — previously only Phoenix gated it, so installed `@langfuse/otel` emitted nothing. The `/ai-assistant/chat` route now calls `flushLangfuse()` via `next/server` `after()` so buffered spans are not dropped when the serverless function suspends. Telemetry/observability only — no change to tools, tables, retrieval flow, models, or embeddings.)

Last verified: 2026-06-10 (fix 4: RAG supplement scan in _fetch_graph_embedding_candidates and _fetch_graph_embedding_candidates_via_supabase only covered email/email_attachment — teams_dm_conversation and teams_dm were excluded, leaving 599 items permanently pending. Added both types to both supplement scans.)

Last verified: 2026-06-10 (RAG client routing hardened — `get_rag_read_client`/`get_rag_write_client` now route to the AI Database whenever `RAG_SUPABASE_URL` is set, ignoring the READS/WRITES cutover flags except as a one-time drift warning. Fixes a Fireflies segmentation outage caused by the sync cron missing those env vars and silently reading `rag_document_metadata` from the PM APP DB. See the "Two Supabase projects" callout + `backend/tests/test_rag_client_routing.py`.)

Last verified: 2026-06-10 (intelligence compiler cost split — `COMPILER_MODEL` (default `gpt-5.5`) and new `COMPILER_MODEL_LIGHT` (default `gpt-4.1-mini`) in `backend/src/services/intelligence/client.py` are now env-configurable. Teams DM (`teams_compiler.extract_intelligence`) and email (`email_compiler.extract_intelligence`) signal extraction route to the LIGHT tier; meeting deep full-transcript extraction (`pipeline/extractor.py`) keeps full `gpt-5.5`. Driver: frontier gpt-5.5 was running on every email/DM — including ~5.5× redundant re-extraction of the same Teams DM conversation as new messages arrived — at ~$60/day. Mini routing cuts per-call cost ~10-20×. Deferred follow-up: debounce per-conversation Teams DM recompiles.)

---

## 1. Overview

The Alleato AI system acts as a 24/7 business intelligence layer for construction project managers. It answers questions in plain English by pulling from every data source simultaneously — project financials, contracts, meeting transcripts, accounting (Acumatica), emails, Teams messages, and company documents. It does not wait to be asked: Phase 2 will surface proactive alerts when margins erode, schedules slip, or cash flow gaps appear.

The architecture is a multi-agent system (C-Suite model) where a Chief Strategist routes questions to domain-specialist agents (CFO, COO, etc.), each of which has its own system prompt, tool set, and model config. All agents run server-side through Next.js API routes via the Vercel AI SDK.

AI SDK public types used by app code, including `ModelMessage`, must be imported from the `ai` package. Do not import those public app-facing types from transitive `@ai-sdk/*` packages; those packages may be present in the lockfile without being directly resolvable by TypeScript.

2026-06-09 update: Microsoft Graph embedding now uses the shared backend AI transport client (`get_openai_client()` plus `retry_ai_call`) instead of a route-local AI Gateway/OpenAI provider loop, so Graph email/Teams vectorization follows the same fail-loud provider path as the rest of the backend. Source-specific RAG adds stricter recent Teams/email routing and an `email-operator-policy` triage layer that suppresses non-operational security/auth/card notifications unless explicitly requested, while operating-summary sources carry richer evidence metadata for project-intelligence packets.

---

## 2. Architecture Diagram

```
User (browser)
    │
    ▼
Chat UI — frontend/src/app/(chat)/ai-assistant/
    │  (streaming via Vercel AI SDK)
    ▼
Chat API Route — frontend/src/app/api/ai-assistant/chat/route.ts
    │
    ▼
Chat Handler v2 — frontend/src/app/api/ai-assistant/chat/handler-v2.ts
    │  (read-heavy project/executive prompts can direct-return Render Deep Agents)
    │
    ├──[personal / Brandon task-register prompts]───────────► PM APP Supabase
    │                                                          public.tasks
    │                                                          (deterministic Tasks page lookup)
    │
    ├──[project status / budget / risk + selected project]──► Render backend
    │                                                          /api/intelligence/deep-agent/project-status
    │
    ├──[executive briefing without selected project]─────────► Render backend
    │                                                          /api/intelligence/deep-agent/executive-briefing
    │                                                          (executive prompt contract ranks canonical blockers/tasks,
    │                                                          separates soft watch-list signals, and closes with
    │                                                          management actions for "waiting on" / priority prompts)
    │
    ├──[Outlook / Teams / Microsoft operator work]───────────► Render backend
    │                                                          /api/intelligence/microsoft-executive-assistant
    │                                                          (specialist owns live Graph reads and review-only drafts;
    │                                                          exact inbox triage prompts can deterministically render
    │                                                          from live Graph payloads to keep urgency/action labels
    │                                                          evidence-only and mailbox-owner-specific)
    │
    ├──[app help / feature status / route questions]─────────► Render backend
    │                                                          /api/intelligence/app-expert
    │                                                          (read-only app docs, sitemap, and feature registry)
    │
    ├──[/ai-assistant-v2 fallback when LangGraph URL is unset]► Next API route
    │                                                          /api/ai-assistant-v2/deep-agent
    │                                                          (resolves project names, then calls Render Deep Agents)
    │
    ▼
Orchestrator — frontend/src/lib/ai/orchestrator.ts
    │  (Strategist system prompt + routing)
    │
    ├──[financial keyword]──► consultCFO tool
    │                              │
    │                              ▼
    │                         CFO sub-agent (own system prompt + financial tools)
    │
    ├──[direct]──────────────► createProjectTools() + all other tool sets
    │
    ▼
Tool Layer (AI SDK tools + backend specialist tools)
    │
    ├── Structured SQL reads from Supabase (projects, budgets, commitments...)
    ├── pgvector semantic search (document_chunks, 24K+ rows)
    ├── Acumatica REST API (live accounting data)
    └── search_all_knowledge / search_knowledge_base RPCs
    │
    ▼
Supabase (PostgreSQL + pgvector)
    ├── document_chunks (halfvec 3072 — unified vector store)
    ├── Project tables (budgets, contracts, commitments, RFIs, submittals...)
    ├── Meeting intelligence (decisions, risks, tasks, opportunities)
    └── company_knowledge / ai_insights / conversation_memories
```

---

## 3. Implementation Phases

| Phase | Name | Status | What's Built |
|-------|------|--------|--------------|
| 1 | Data Foundation | **Complete** | RAG assistant, 30+ tools, C-Suite architecture (Strategist + CFO live), document ingestion pipeline (PDF/DOCX + Azure OCR for scanned PDFs), Acumatica ERP integration (9 tools), company knowledge base, vector embeddings (109K+ chunks in AI Database), chat persistence, guardrails, daily digest, intelligence packet compiler, structured SOP backlog and finance spend tools, contextual retrieval pilot (added 2026-05-17) |
| 2 | Proactive Intelligence | **In progress** | Intelligence packets (project packets now compile through the source-quality-scored `project-operating-summary-v1` path), executive daily briefing (cron-delivered), insight cards (6,900+ rows), packet card feedback, Render-backed Deep Agents bridge for read-heavy project/executive AI assistant answers, backend Microsoft Executive Assistant specialist for Outlook/Teams/calendar operator work, backend App Expert specialist for app-help and feature-status questions, standalone `alleato-ai` tool registry gated into the backend runtime |
| 3 | Workflow Automation | Not started | Auto-classify documents on upload, AI-generated status reports, smart form templates (pre-fill RFIs, change order descriptions) |
| 4 | Strategic Advisory | Not started | Project completion probability models, budget overrun prediction, cross-project pattern recognition, competitive benchmarking |

COO, CHRO, CRO, and VP BD agents are designed (prompts exist at `frontend/src/lib/ai/agents/`) but not wired as live `consult*` tools in the orchestrator. Only `consultCFO` is active.

---

## 4. Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Primary chat API route. All user messages enter here. Calls orchestrator, streams response, persists to `chat_history`. |
| `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | Current `/ai-assistant` server handler. Plans retrieval, persists chat history, and, when `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED=true`, direct-returns successful Render Deep Agents project, executive, and external-research packets before falling back to local AI SDK synthesis. Selected-project document/source questions now persist prefetch traces for `clientProjectIntelligencePacket`, `getProjectBriefingSnapshot`, semantic drilldown, and document lookup so evals can prove the assistant started from project operating context before searching exact files. `AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS=true` can skip Render bridge latency during local evals, and `AI_EVAL_DOCUMENT_INTELLIGENCE_RESPONSE=true` enables a deterministic document-intelligence response after retrieval completes; this eval-only path persists the normal `tool_trace`, `retrieval_plan`, `source_debug`, and `response_quality` metadata without changing production synthesis behavior. Personal task-register prompts such as "what are my tasks" or Brandon task wording now bypass executive Deep Agents and run a deterministic `public.tasks` lookup first, persisting `getPersonalTaskRegister` plus `getMyTasks`-compatible trace metadata, `response_quality`, and a `task_summary` widget so the answer uses the Tasks page source of truth instead of synthesized executive follow-up snippets. `source_health` intent now has a deterministic fast path through `loadAssistantSourceHealthContext()`, persisting `assistantSourceHealth` trace output and `source_health` metadata instead of falling through to generic semantic search when the user is asking whether Teams, Outlook, meeting, or OneDrive coverage is fresh enough to trust; that fast path now triggers even without a pinned project. The `isSourceHealthRequest` router (`retrieval/planner.ts`) is intentionally stricter than the attach-time `shouldAttachAssistantSourceHealth` check: routing to the fast path requires an explicit data-freshness/sync/trust question, or a freshness SUBJECT (sources/data/sync/embedding/packet/snapshot) paired with a trust SIGNAL — it no longer fires on the bare adjective "current"/"status"/"latest", which previously hijacked content questions like "current AR aging", "current strategic goals", and "current market price" into a source-health report (caught by the tool-coverage eval, fixed 2026-06-09; regression cases in `retrieval/__tests__/planner.test.ts`). App-help intent now prefetches the backend App Expert packet through the retrieval executor so application-behavior answers are grounded in curated help docs, generated sitemap, and feature registry instead of generic project/business RAG. Project/executive Deep Agents responses persist source evidence, memory-candidate widgets, `backend_deep_agent.memory_candidate_count`, and `memory_candidates` before streaming the final direct answer, so persistence failures fail loudly instead of producing an untracked chat response. All direct and fallback response paths persist `response_quality`; normal synthesis also persists `memory_usage` and schedules `runPostResponseTasks()` so conversation summaries and typed memory extraction run after the assistant message is saved. Direct Deep Agents responses schedule the same post-response task path after persistence and emit `ai-assistant-chat` Langfuse traces with `directDeepAgent:*` generation names so direct-return answers are observable even though they bypass `streamText.onFinish`. Deep Agents bridge attempts are recorded in `tool_trace` as the frontend wrapper tools (`backendDeepAgentProjectStatus`, `backendDeepAgentExecutiveBriefing`, `backendDeepAgentResearch`) plus backend-internal packet trace so evals can distinguish real backend routing from local synthesis. When a backend packet is not direct-return eligible, its formatted project, executive, research, or app-expert context is appended to the local AI SDK synthesis prompt instead of being discarded. Date-based Outlook/inbox plans are now deterministically delegated to `/api/intelligence/microsoft-executive-assistant` before local AI SDK synthesis, and the persisted `consultMicrosoftExecutiveAssistant` trace includes nested backend tool trace sources such as `microsoft_graph_live` so evals can prove the specialist, not a stale synced cache, answered the operator request. Exact live-inbox prompt shapes now have deterministic backend answer rendering for `last five`, `important this morning`, `arrived today`, and reply-triage asks, with same-scope filtering and evidence-only response labels so the specialist cannot drift into broader mailbox commentary after the live Graph read succeeds. If that backend specialist fails, the handler now persists an explicit failed `consultMicrosoftExecutiveAssistant` trace and returns the exact failing capability/detail instead of collapsing into the generic empty-provider fallback. Recent Teams source-specific RAG prompts also direct-return after the retrieval step, which removes the extra synthesis/tool loop that had been blowing the source-sync eval latency budget. Legacy/pre-fetched `getRecentEmails` traces still exist for non-specialist fallback diagnostics but are no longer the Strategist-owned inbox path. |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Converts retrieval context into compact model-visible evidence. For client-project operating packets, renders `packet_json.strategicReport`, category coverage, source-quality counts, and linked evidence totals before card snippets so the model sees the synthesized operating read instead of raw card metadata. If packet coverage includes meetings, the prompt explicitly forbids saying no meeting transcripts surfaced; it must distinguish packet meeting coverage from any fresh direct transcript lookup. For app-help questions, renders a dedicated App Expert packet with answer, sources, skills, and backend trace, and instructs the model not to invent app behavior outside those sources. For Microsoft operator work, the no-prefetch routing guidance points the Strategist to `consultMicrosoftExecutiveAssistant` instead of direct Outlook/Teams tools. The older structured Outlook inbox renderer remains for legacy/fallback contexts and intentionally surfaces `latestAvailableFallback`, `requestedWindowEmpty`, and `latestAvailableReceivedAt` so stale synced rows cannot masquerade as live Graph results. |
| `frontend/src/lib/ai/agents/strategist.ts` | Primary strategist prompt. The Outlook Operations Protocol now makes the Strategist an orchestrator, not the Microsoft operator: Outlook inbox triage, reply drafting, Teams escalation, calendar review, and Microsoft file context route through `consultMicrosoftExecutiveAssistant`. Brandon/operator inbox prompts must pass `bclymer@alleatogroup.com`, answer simple inbox lookups with a clean list before caveats, use reply/delegate/watch/ignore labels for triage, and keep drafts grounded only in retrieved email/thread facts. |
| `frontend/src/app/api/ai-assistant-v2/deep-agent/route.ts` | `/ai-assistant-v2` fallback route when no LangGraph URL is configured. Authenticates the user, resolves project names from the prompt when no project ID is supplied, calls the Render Deep Agents project/executive endpoints, and returns packet metadata to the v2 UI. |
| `backend/src/services/agents/research_agent/` | Standalone Alleato Deep Agents research module. Uses public web research tools, read-only Alleato PM/RAG/search tools, Deep Agents subagents, packaged runtime skills, optional local installed skill directories, and fail-loud response metadata. Exposed through `/api/intelligence/research`. |
| `backend/src/services/agents/content_builder/` | Isolated Deep Agents content builder ported from `alleato-ai/alleato_ai/subagents/content-builder-agent`. Packages the example memory file, `blog-post` and `social-media` skills, YAML researcher subagent config, Tavily research tool, and Gemini image tools. Exposed through `/api/intelligence/content-builder` behind `DEEP_AGENTS_CONTENT_BUILDER_ENABLED`; uses AI Gateway/OpenAI for the orchestrator and `GOOGLE_API_KEY` for generated images. |
| `backend/src/services/agents/microsoft_executive_assistant/` | Backend Microsoft operator specialist. Exposed through `/api/intelligence/microsoft-executive-assistant`, delegated by the Strategist via `consultMicrosoftExecutiveAssistant`, and available to Render webhook/scheduled triggers. Owns live Outlook inbox reads, synced email/Teams/file search, calendar review, and review-only email/Teams draft payloads. For the live inbox eval prompts, it can now bypass freeform model wording and render deterministic response shapes directly from the successful `read_live_outlook_inbox` payload so `this morning` and `today` filters stay exact and per-email response paths remain evidence-only. It fails loudly when provider keys, Graph credentials, or source evidence are missing, and its nested tool trace is part of the inbox eval contract. |
| `frontend/src/components/ai-assistant-v2/advisor-chat.tsx` | `/ai-assistant-v2` client surface. Uses the LangGraph SDK only when `NEXT_PUBLIC_LANGGRAPH_API_URL` is configured; otherwise submits through the Render Deep Agents fallback route and displays mode, confidence, source count, and tool-call count. |
| `frontend/src/lib/ai/deep-agent-project-status.ts` | Typed server-side bridge to Render backend Deep Agents endpoints. Owns env gating, request schemas, source-evidence widgets, memory-candidate review widgets, bounded bridge timeout defaults, formatted fallback context for project/executive/research/app-expert packets, and direct-response eligibility for project/executive/research packets. |
| `backend/src/services/agents/app_expert/` | Read-only Deep Agents App Expert module. Exposed through `/api/intelligence/app-expert` behind `DEEP_AGENTS_APP_EXPERT_ENABLED`; uses generated app sitemap, feature registry, curated help articles, and App Expert runtime skills to answer application navigation, feature-status, workflow, permission, and troubleshooting questions. |
| `backend/src/services/agents/alleato_ai_tools/` | Backend-local port of the standalone `alleato-ai` Deep Agents tools: resolvers, SQL schema/query, RAG/meeting/email/Teams search, recent activity, Acumatica reads, draft-preview actions, prompts, and domain subagent definitions. Subagent SQL and Acumatica tools are attached only when their runtime gates are enabled. |
| `backend/src/services/agents/deep_project_intelligence.py` | Render Deep Agents runtime. The narrow PM tools are always present; the standalone registry is enabled by `DEEP_AGENTS_STANDALONE_TOOLS_ENABLED`, with separate SQL, Acumatica, draft-action, and subagent gates. The runtime also packages Deep Agents core/memory/orchestration skills into the store backend, attaches runtime memory instructions and a checkpointer when dependencies are available, and passes those skills to custom subagents so project/executive agents have the same harness surface as the standalone research agent. When `DEEP_AGENTS_MEMORY_ENABLED=true`, project memory is scoped in the existing memory SQL to team-visible rows or rows owned by the caller, avoiding extra per-page or per-tool permission lookups. Backend LangSmith tracing is controlled by the Render env keys `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`, `LANGSMITH_API_KEY`, and the compatibility `LANGCHAIN_*` aliases; the LangChain/LangSmith dependencies are pinned in `backend/requirements.txt` so trace export behavior changes only through deliberate dependency bumps. |
| `backend/src/services/ops/db_pressure_guard.py` | Fail-closed app database pressure guard for background jobs. Render crons that touch app-DB catalog/control-plane rows set `APP_DB_PRESSURE_GUARD_REQUIRED=true` and must provide `DATABASE_URL`; the guard checks `pg_stat_activity` before sync, compiler, health, promotion, executive-assistant, recap, and extraction work can start. This keeps high-churn RAG/Microsoft jobs from competing with employee app traffic when the Supabase pooler or app DB is already saturated. |
| `backend/src/services/agents/memory/store.py` | Deep Agents durable memory SQL layer. Loads user/project memory, recalls user/project/team memory, formats memory entries, and owns the owner/team visibility filters that prevent private project memories from leaking across users. |
| `backend/src/services/agents/memory/middleware.py` | Deep Agents memory middleware. Reads `user_id`, `project_id`, and thread config, loads durable memory from `store.py`, and injects the scoped memory context into the runtime. |
| `backend/src/services/agents/memory/tools.py` | Deep Agents memory recall tools exposed to agents. Binds `user_id` and optional `project_id` from runtime config before calling `store.py`, so tool recall follows the same privacy and project scoping rules as startup injection. |
| `frontend/src/lib/ai/orchestrator.ts` | Registers the agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`, and removes direct Microsoft operator tools from the Strategist in favor of `consultMicrosoftExecutiveAssistant`. Uses public `ai` package exports for AI SDK runtime APIs and types so strict pnpm installs do not depend on transitive package imports. Adding a new agent: add config here + add `consultXxx` tool + add name to `agents/types.ts`. |
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO-specific tool usage instructions. |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP BD system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union type, `AgentResponse` type. Update when adding agents. |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. Includes the `deep-agents/strategist` option, which routes eligible project, executive, and external-research prompts through the backend Deep Agents strategist harness before local synthesis fallback. |
| `frontend/src/lib/ai/tools/project-tools.ts` | Core project tools plus SAIS structured backlog/spend tools (portfolio, risk, budget, meetings, search, SOP backlog, finance spend rollup). |
| `frontend/src/lib/ai/tools/sais.ts` | SAIS tools: `getSopBacklog` for missing accounting/finance SOP requirements and `getFinanceSpendRollup` for trailing Acumatica AP bill spend classification. These are structured SQL reads, not vector/RAG document search. |
| `frontend/src/lib/ai/tools/financial.ts` | 6 financial tools (commitments, change orders, direct costs, budget line items, cost trends, margin). |
| `frontend/src/lib/ai/tools/operational.ts` | 15+ operational tools (people, vendors, RFIs, submittals, cross-project, semantic search, emails, Teams, knowledge base, memories). |
| `frontend/src/lib/ai/tools/acumatica.ts` | 9 Acumatica ERP tools (AP/AR aging, cash position, vendor spend, bills, invoices, POs, project budget). |
| `frontend/src/lib/ai/tools/schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays. |
| `frontend/src/lib/ai/tools/forecast-tools.ts` | `getForecastComparison` — budget vs. actual vs. forecast. |
| `frontend/src/lib/ai/tools/document-intelligence.ts` | Document search tools querying `document_chunks` for specs, OneDrive docs. |
| `frontend/src/lib/ai/tools/tool-utils.ts` | Shared helpers: `EMBEDDING` config registry, `generateEmbedding()`. Source of truth for which embedding model/dimensions go with which table. |
| `frontend/src/lib/ai/soul.ts` | Persona foundation — voice, tone, values. Included in every system prompt. |
| `frontend/src/lib/ai/identity.ts` | Identity layer — who the AI is. Composed with `soul` in system prompt assembly. |
| `frontend/src/lib/ai/persona-and-memory.ts` | `I_DONT_KNOW_REFLEX_PROMPT` and user-profile injection logic. |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | Legacy system prompt. Preserved but not used in the C-Suite path. Do not modify for new work. |
| `frontend/src/lib/ai/services/conversation-memory.ts` | Post-response fact extraction and storage to `conversation_memories`. |
| `backend/src/services/pipeline/orchestrator.py` | Routes ingestion jobs by document type (meeting → parser.py, PDF/DOCX → document_parser.py, CSV/XLSX → financial_parser.py). |
| `backend/src/services/pipeline/parser.py` | Stage 1A: Fireflies meeting markdown → segments, decisions, risks, tasks. |
| `backend/src/services/pipeline/document_parser.py` | Stage 1B: PDF/DOCX/text extraction → meeting_segments. LLM segmentation is the default, but `DOC_SEGMENT_USE_LLM=false` uses deterministic line-window segments for table-heavy technical documents. |
| `backend/src/services/pipeline/financial_parser.py` | Stage 1C: CSV/XLSX → document_rows with text summaries for embedding. |
| `backend/src/services/pipeline/embedder.py` | Stage 2: Chunking (3000 char target, 500 overlap) + embedding via text-embedding-3-small. Generic documents that do not parse as meeting transcripts fall back to source line chunks and write `document_chunks.source_type='document'`. |
| `backend/src/services/pipeline/extractor.py` | Stage 3: Normalizes tasks and routes meeting decisions/risks/opportunities into the packet-first intelligence layer. Tasks upsert to `tasks`. **Decisions/risks/opportunities now flow into `insight_cards` via `_promote_meeting_signals` (added 2026-06-09):** each is staged as a `source_signal_candidate` under `compiler_version = meeting_extractor_compiler_v0_1` and high-confidence ones are promoted through `compiler.promote_signal_candidate` — sharing the same dedup (`normalized_signal_key`), evidence, and target-attribution machinery as the Teams/email compilers. This replaced the deprecated no-op `_upsert_insight` writer (Pipeline A `insights` table, dropped 2026-05-15), so full-transcript meeting intelligence becomes durable, deduped cards instead of being discarded. Per-item confidence is heuristic (content richness); items below the 0.85 promotion bar stay as `needs_review` candidates (review queue). Risk categories map to `schedule_risk`/`financial_exposure`/`risk`; opportunities map to `initiative_signal` (all within the `insight_cards.card_type` CHECK set). Re-extraction clears prior candidates for the meeting first, so promotion updates cards in place rather than duplicating. The Fireflies compatibility enrichment path still preserves direct transcript wording while backfilling missing assignee, due-date, email, and priority fields. **Deep extraction (added 2026-06-10, feature-flagged via `DEEP_EXTRACTION_ENABLED`, default off):** when on, Stage 3 replaces the shallow segment-normalization input with a single large-context call (`llm.extract_deep_meeting_intelligence`, model=`gpt-5.5`/COMPILER_MODEL via `intelligence/client.extract_with_retry`) that reads the **whole transcript** (uncapped except a `DEEP_TRANSCRIPT_MAX_CHARS` safety ceiling) against **deterministic project ground truth** (open `tasks` + tracked `insight_cards` for the project's target, fetched by direct DB read) plus one bounded project-filtered `search_document_chunks` lookup. Each emitted decision/risk/opportunity/`insight`/task carries a verbatim `evidence_quote` (→ card evidence excerpt), a **calibrated** `confidence` that replaces the heuristic and drives the 0.85 promote-vs-`needs_review` gate, and a `status_hint` (new/update/resolved → card `current_status`, so updates supersede and resolutions close via `normalized_signal_key`). Insights route to `project_update`/`open_question`. Deep tasks flow through the existing `_upsert_task` path (assignee resolution, UNIQUE(metadata_id,description) dedup, per-meeting delete+reinsert) merged with the Fireflies-rewriter tasks; deep tasks below `DEEP_TASK_CONFIDENCE_THRESHOLD` (default 0.7) are still written but flagged `extraction_metadata.needs_review=true` (the `tasks.status` CHECK has no needs_review value) so a human promotes them. On any deep-pass error or empty result, Stage 3 falls back to the shallow pass — behavior with the flag off is unchanged. Two silent-failure fixes landed with it in `intelligence/client.py` (which also un-break the Teams compiler on `gpt-5.5`): (1) gpt-5/o-series models reject any non-default `temperature` with a 400 that `extract_with_retry` was swallowing into `_extraction_failed` — temperature is now omitted for those model families; (2) `extract_with_retry` takes an optional `timeout`, and the deep pass passes `DEEP_EXTRACTION_TIMEOUT_SECONDS` (default 300s) because a full 130k-char transcript exceeds the 60s Teams-compiler default. Deep tasks set `extraction_prompt_version='deep_extractor_v0_1'` to satisfy the tasks-quality trigger (migration 20260528000000). Verified live 2026-06-10 on a real 130k-char meeting: deep tasks/cards written with verbatim evidence + calibrated confidence straddling the gate, implied action items caught, no duplicate accumulation on re-run. |
| `backend/src/services/pipeline/digest.py` | Stage 4: Daily digest generation (non-blocking). |
| `backend/src/services/pipeline/llm.py` | Backend LLM/embedding client. Current defaults: chat=gpt-4o-mini, embeddings=text-embedding-3-small. |
| `backend/src/services/daily_digest.py` | Daily meeting digest generation. |
| `scripts/ingestion/ingest_local_documents.py` | Local folder RAG ingestion. Supports stable source IDs, content-hash dedupe, dependency/build folder ignores, category/workflow overrides, and source-labeled storage prefixes. The estimating preset uses this script through `npm run rag:ingest:estimating`. |
| `scripts/verify/verify_estimating_rag_ingest_target.mjs` | Guardrail for the estimating local-folder ingest target. Verifies the npm scripts, stable source IDs, `workflow_target=estimating`, `category=financial_document`, backend `PYTHONPATH`, and a Supabase-free dry run. |
| `backend/src/services/ingestion/fireflies_pipeline.py` | Fireflies sync: fetch transcripts → normalize markdown → upload to Supabase Storage → upsert document_metadata → enqueue ingestion job. |
| `backend/src/services/alleato_agent_workflow/guardrails.py` | PII and jailbreak guardrails. |

---

## 5. RAG Tools Reference

All tools are server-side only (Next.js API routes). They receive `userId` for RLS scoping.

2026-05-19 SAIS update: accounting/finance SOP gaps and Acumatica overhead spend are structured tool reads (`getSopBacklog`, `getFinanceSpendRollup`), not vector-search-only document retrieval.

### Core Project Tools (`project-tools.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getProjectBriefingSnapshot` | projects, budgets, risks, meetings, tasks | Full project briefing: financials, schedule, risks, action items |
| `getPortfolioOverview` | projects, project_health_dashboard | All active projects with health signals |
| `getProjectsWithRisks` | risks, ai_insights, project_issue_summary, project_health_dashboard | Ranked projects by risk score with explicit risk signals |
| `getProjectRiskAnalysis` | risks, open_critical_items, ai_insights | Single-project risk drilldown |
| `getFinancialAnalysis` | budgets, contracts, commitments, change_orders | Cross-project financial overview |
| `getProjectBudgetSummary` | budget lines, cost codes, commitments | Per-project budget health with cost code breakdown |
| `getActionItemsAndInsights` | tasks, decisions, opportunities from meetings | Action items, decisions, follow-up tracking |
| `getMeetingsByDate` | document_metadata, meeting_segments | Meetings filtered by date range |
| `searchDocuments` | document_metadata, document_chunks (full-text) | Keyword search across all ingested documents |
| `getProjectDetails` | projects + related tables | Single project record with team and contract info |
| `getSopBacklog` | sop_backlog, document_metadata, projects | Missing/draft/in-review/published SOP requirements by accounting/finance area, priority, owner, and file-link status |
| `getFinanceSpendRollup` | acumatica_ap_bills, finance_spend_classification_rules | Trailing monthly accounting/finance overhead spend by category/vendor with exclusions and review flags |

### Financial Tools (`financial.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getCommitmentsOverview` | commitments, companies, contract_line_items | All commitments with status, amounts, vendor info, billing summary |
| `getChangeOrderDetails` | change_orders, change_events, prime_contracts | CO lifecycle: approved/pending/rejected with financial impact |
| `getDirectCostsSummary` | direct_costs, companies, cost_codes | Direct costs by category, vendor, time period |
| `getBudgetLineItems` | budget_lines, cost_codes | Granular budget with filterable cost codes and variance |
| `getCostTrends` | direct_costs, commitments (time-bucketed) | Spending velocity and burn rate over time |
| `getMarginAnalysis` | prime_contracts, commitments, change_orders | Margin by contract and project, trend over time |

### Operational Tools (`operational.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getPeopleAndRoles` | project_members, users, companies | Who's on which project, roles, workload signals |
| `getVendorPerformance` | companies, commitments, direct_costs | Delivery history, quality signals, spend by vendor |
| `getRFIStatus` | rfis | Open RFIs, response times, schedule impact flags |
| `getSubmittalStatus` | submittals | Submittal workflow status, overdue items |
| `getCrossProjectComparison` | projects, budgets, commitments | Side-by-side metrics across projects |
| `getHistoricalTrends` | budgets, commitments, projects (time-bucketed) | How metrics have changed over time |
| `semanticSearch` | document_chunks (pgvector), ai_insights, company_knowledge | Unified semantic search across all ingested content |
| `getCompanyKnowledge` | company_knowledge, company_context | Company strategy, goals, competitive landscape |
| `recallPastConversations` | conversation_memories (pgvector) | Semantically relevant facts from past sessions |
| `searchMeetingsByTopic` | document_chunks (meetings category, pgvector) | Meeting content by topic |
| `getMeetingDetails` | document_metadata, meeting_segments, decisions, risks, tasks | Full meeting record with extracted intelligence |
| `getRecentEmails` | Microsoft Graph live inbox first; `outlook_email_intake` fallback | Legacy/frontend recent-email diagnostic path. Date-based inbox/operator prompts now route to the backend Microsoft Executive Assistant specialist through `consultMicrosoftExecutiveAssistant`; direct Strategist use of `getRecentEmails` is blocked by the inbox eval bundle. When this legacy tool is used outside the specialist path, it calls the backend `/api/graph/outlook/live-inbox` endpoint first and returns `source: "microsoft_graph_live"` when Graph succeeds. Synced `outlook_email_intake` rows are fallback only and are labeled `source: "outlook_email_intake_fallback"` with `graphLiveError` / sync-cutoff evidence so evals can fail stale-cache answers loudly. |
| `searchEmails` | document_chunks (email category, pgvector) | Email content by topic — use for subject-based questions |
| `searchTeamsMessages` | document_chunks (teams category, pgvector) | Teams message content by topic |
| `saveInsight` | ai_insights (write) | Persist an AI-generated insight to the insights table |
| `saveToKnowledgeBase` | company_knowledge (write) | Persist a fact to the company knowledge base |
| `writeMemory` | conversation_memories (write) | Persist a durable fact about the user |

### Acumatica ERP Tools (`acumatica.ts`) — Live Accounting Data

| Tool | Acumatica Endpoint | Returns |
|------|-------------------|---------|
| `getAPAgingReport` | AP aging | Who you owe, amounts, aging buckets |
| `getARAgingReport` | AR aging | Who owes you, amounts, days outstanding |
| `getCashPositionReport` | GL cash accounts | Current balances across bank accounts |
| `getVendorSpendReport` | Vendor transactions | Total spend by vendor across all projects |
| `getRecentBills` | Bills | Latest AP bills |
| `getRecentInvoices` | Invoices | Latest AR invoices |
| `getAcumaticaProjectBudget` | Project budget | Live project budget from accounting |
| `getAcumaticaProjectList` | Projects | Project list from Acumatica |
| `getPurchaseOrderSummary` | Purchase orders | Open PO summary |

### Additional Tool Files

| File | Tools |
|------|-------|
| `schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays, look-aheads |
| `forecast-tools.ts` | `getForecastComparison` — budget vs. actual vs. forecast |
| `document-intelligence.ts` | `searchSpecs`, `searchOneDriveDocs` — semantic search of OneDrive/spec documents |
| `action-tools.ts` | Write-back actions: create task, send alert |
| `workspace-tools.ts` | Workspace-scoped queries |
| `progress-report-tools.ts` | Progress report generation |

---

## 6. Vector Store

> **⚠️ Two Supabase projects.** As of **2026-05-15** the RAG tables (`document_chunks`, `rag_document_metadata`, `rag_pipeline_state`) live in the **"AI Database"** project (`fqcvmfqldlewvbsuxdvz`), reached by backend code via `RAG_SUPABASE_URL` and the `get_rag_read_client()` / `get_rag_write_client()` helpers in `backend/src/services/supabase_helpers.py`. Frontend/server tool code reaches the same AI Database through `createRagServiceClient()` in `frontend/src/lib/supabase/service.ts`; operational semantic-search tools now use that RAG client directly for `document_chunks` while keeping the app service client for PM-app metadata and project tables.
>
> **Client routing is credential-gated, not flag-gated (hardened 2026-06-10).** `get_rag_read_client()` / `get_rag_write_client()` route to the AI Database whenever `RAG_SUPABASE_URL` is configured, **regardless of `RAG_DATABASE_READS_ENABLED` / `RAG_DATABASE_WRITES_ENABLED`**. Those flags are honored only as a one-time drift warning. Rationale: the PM APP copies of the RAG tables were removed after the migration, so the old silent fallback to the PM APP client raised `PGRST205: Could not find the table 'public.rag_document_metadata'`. This caused a same-day outage where the `alleato-fireflies-sync` cron (missing the READS/WRITES env vars in its live Render env despite `render.yaml` declaring them) failed every segmentation job, leaving all Fireflies meetings with zero `meeting_segments`. Regression test: `backend/tests/test_rag_client_routing.py`.
>
> RAG-owned operational ledgers and health tables (`source_sync_runs`, `source_sync_health_snapshots`, `source_signal_candidates`, `source_intelligence_jobs`, `document_attribution_candidates`, ingestion job tables, and packet refresh jobs) must also use `createRagServiceClient()` from frontend/server code. The predeploy gate runs `npm run rag:verify:client-boundary`, which fails if those tables or RAG search RPCs are queried through a file that does not use the RAG service client, or if old RAG/main fallback unions are reintroduced.
>
> The same tables still exist in the **"PM APP"** project (`lgveqfnpkxvzbnnwuled`) but are **legacy / read-only** — a database trigger blocks all writes with `LEGACY TABLE: ...`. Do not point new code at the PM APP copy. If you see stale data, you are likely querying the wrong project.
>
> AI assistant memory is split: the PM APP `ai_memories` table owns text, lifecycle, ownership, project scope, and visibility, while searchable vectors live in the AI Database `document_chunks` table with `source_type='ai_memory'`. PM APP `ai_memories.embedding` remains intentionally empty/blocked after the OOM fix. Runtime memory search hydrates matched chunk IDs back through active, unexpired, owner/team-visible `ai_memories` rows. Semantic recall uses a default 183-day lookback and ranks freshness first, then selected-project fit, global-project usefulness, semantic similarity, and importance; the injected memory debugger metadata records ranking score and reason per selected memory.
>
> **Partial HNSW indexes (added 2026-05-15):** the `search_document_chunks` RPC has its statement_timeout bumped to 60s and `ivfflat.probes` raised to 24. Partial HNSW indexes exist for `meeting_*`, `email`, `onedrive_document`, and `teams_*` source types. Without these the CEO Daily Brief vector search times out.

### Primary Table: `document_chunks` (in AI Database project)

| Property | Value |
|----------|-------|
| Project | `fqcvmfqldlewvbsuxdvz` ("AI Database") |
| Embedding model | `text-embedding-3-large` |
| Dimensions | `halfvec(3072)` |
| Row count | ~109K (May 2026) |
| Index | pgvector cosine similarity — IVFFlat (general) + partial HNSW (per source_type) |
| Content types | Meeting transcripts, emails, Teams messages, OneDrive docs, company documents |

### Search RPCs

| RPC | Usage |
|-----|-------|
| `search_document_chunks` | Primary semantic search over all content in `document_chunks`. Accepts `query_embedding` (halfvec 3072), optional `category` filter, `match_count`. |
| `search_document_chunks_by_category` | Filtered variant — same as above with mandatory category. |
| `search_all_knowledge` | Searches structured intelligence tables: decisions, risks, opportunities, ai_insights. |
| `search_knowledge_base` | Searches `company_knowledge` table only. |

### Contextual Retrieval Pilot (added 2026-05-17)

`document_chunks` now carries two additional columns for the Anthropic Contextual Retrieval technique:

| Column | Purpose |
|--------|---------|
| `contextual_prefix` | LLM-generated context sentence prepended to each chunk before embedding to reduce ambiguity |
| `is_contextualized` | bool flag — `true` once the chunk has been through the context enrichment step |

**Backfill:** `POST /admin/documents/contextual-backfill` triggers the enrichment pipeline. Batch size capped at 128 per run (raised from earlier default). Template-only fast path skips LLM for simple short chunks.

**RPC impact:** The `search_document_chunks` RPC returns higher-quality results for ambiguous queries (e.g. "project budget" now returns the right project, not a random one) because the context prefix removes chunk-level ambiguity.

### Legacy `documents` table — DROPPED 2026-05-18

The pre-Pipeline-B `public.documents` table (PM APP) was dropped along with its
dependent objects: `documents_access_audit`, `documents_ordered_view`, the
`chunks` and `private.document_processing_queue` FK tables, and 6 RPCs
(`match_documents` ×2, `match_documents_full`, `match_documents_enhanced`,
`match_recent_documents`, `search_by_category`, `search_by_participants`).
`project_health_dashboard` was recreated WITHOUT the dependency. Code consumers
moved to `document_metadata` (raw metadata, PM APP) and `document_chunks` (RAG
vectors, AI Database via `_rag_read_client.rpc('search_document_chunks', ...)`).
Migration: `supabase/migrations/20260518120000_drop_legacy_documents_table.sql`.

### Secondary Embedding Table

`conversation_memories.embedding` uses `vector(1536)` with `text-embedding-3-small`. This is the legacy short-term memory table — do not change its dimensions without a matching pgvector index migration. The `EMBEDDING` constants in `tool-utils.ts` are the source of truth.

### Embedding Config (tool-utils.ts)

```ts
EMBEDDING.LARGE = { model: "text-embedding-3-large", dimensions: 3072 }  // document_chunks, document_metadata, knowledge tables
EMBEDDING.SMALL = { model: "text-embedding-3-small", dimensions: 1536 }  // conversation_memories (legacy)
```

Always use `generateEmbedding(openai, input, EMBEDDING.LARGE)` for new tools querying `document_chunks`. AI assistant long-term memory vectors should be written to AI Database `document_chunks` with `source_type='ai_memory'`; do not revive PM APP `ai_memories.embedding` writes.

---

## 7. Providers

### OpenAI Client (`ai_transport.py`)

All backend LLM and embedding calls use `get_openai_client()` from `backend/src/services/ai_transport.py`. This returns a plain `openai.OpenAI` client using `OPENAI_API_KEY` — no gateway, no provider fallback loop.

```
OPENAI_API_KEY → direct to api.openai.com
```

The Vercel AI Gateway (`AI_GATEWAY_API_KEY`, `ai-gateway.vercel.sh`) was removed 2026-06-09. All payments flow to OpenAI only.

For frontend/Next.js AI SDK calls, `providers.ts` still handles `getLanguageModel(modelId)`. Model IDs must include the provider prefix: `openai/gpt-5.4`.

### Model Registry

| Model | ID | Used For |
|-------|----|----------|
| GPT-5.4 | `openai/gpt-5.4` | Default Strategist model |
| GPT-5.5 | `openai/gpt-5.5` | Newest general model (user-selectable) |
| GPT-5.4 Mini | `openai/gpt-5.4-mini` | CFO sub-agent, faster lightweight responses |
| GPT-4.1 | `openai/gpt-4.1` | Chat route fallback / synthesis retry |
| GPT-4.1 Nano | `openai/gpt-4.1-nano` | Title generation, artifact generation |

User-selectable models are defined in `assistant-models.ts`. The agent registry in `orchestrator.ts` sets per-agent model IDs.

### Embeddings

Backend embeddings use `get_openai_client()` directly. Call `generateEmbedding()` from `tool-utils.ts` in frontend tool code — never the raw OpenAI SDK directly.

---

## 8. Agent Architecture

### How It Works

Every user message enters the chat route, which runs the Strategist agent. The Strategist has two paths:

1. **Direct tool use**: For non-financial questions, the Strategist calls project/operational tools directly and responds.
2. **Sub-agent delegation**: For financial questions (detected by keyword matching in `orchestrator.ts`), the Strategist calls `consultCFO`, which spawns a CFO `ToolLoopAgent` with its own system prompt and financial tools, then returns the CFO's analysis. For Microsoft operator work, the Strategist calls `consultMicrosoftExecutiveAssistant`, which posts to the Render backend specialist instead of directly owning Outlook/Teams/calendar workflows.

### Currently Live Agents

| Agent | Status | System Prompt | Model | Trigger |
|-------|--------|---------------|-------|---------|
| Strategist | Live (orchestrator) | `agents/strategist.ts` | `openai/gpt-5.4` (user-selectable) | All messages |
| CFO | Live (`consultCFO` tool) | `agents/cfo.ts` | `openai/gpt-5.4-mini` | Financial keywords |
| Microsoft Executive Assistant | Live backend specialist (`consultMicrosoftExecutiveAssistant`) | `backend/src/services/agents/microsoft_executive_assistant/agent.py` + packaged Microsoft skills when present | `openai/gpt-5.4-mini` | Outlook inbox triage, email drafts/replies, Teams escalation, calendar review, Microsoft files |

### Designed but Not Wired

COO, CHRO, CRO, VP BD — prompts exist in `frontend/src/lib/ai/agents/`. To activate one:
1. Add its config to `agentRegistry` in `orchestrator.ts`
2. Add a `consultXxx` tool in `createStrategistTools`
3. Add the agent name to `AGENT_NAMES` in `agents/types.ts`
4. Update the Strategist prompt routing rules

### Persona and Memory

System prompt assembly order (highest to lowest priority):

```
soul.ts content
+ identity.ts content
+ USER CONTEXT block (per-user profile from user_profiles table, if set)
+ REMEMBERED CONTEXT (conversation_memories, top-k by relevance + recent N)
+ Operational instructions (strategist.ts or agent-specific prompt)
+ RETRIEVED PROJECT DATA (from tool calls during the conversation)
+ USER MESSAGE
```

The persona (`soul.ts`, `identity.ts`) never changes per user. The memory layer (`conversation_memories`) personalizes delivery without changing voice.

Post-response, `conversation-memory.ts` runs a fact extraction job (async) to distill durable facts from the conversation into `conversation_memories`.

---

## 9. Ingestion Pipeline

### Document Flow

```
Source
  ├── Fireflies.ai transcript → Fireflies sync (backend cron)
  ├── Manual upload (PDF/DOCX/TXT) → /api/documents/upload (frontend API)
  ├── Local folder → scripts/ingestion/ingest_local_documents.py
  └── Estimating folder preset → npm run rag:ingest:estimating
      (defaults to docs/PRPs/estimates; override with RAG_ESTIMATING_SOURCE_DIR)

→ document_metadata row created/updated
→ DB trigger enqueues fireflies_ingestion_jobs row
→ POST /api/pipeline/process (backend FastAPI)
→ pipeline/orchestrator.py routes by document type:
    Meeting → parser.py (Stage 1A)
    PDF/DOCX/TXT/MD → document_parser.py (Stage 1B)
    CSV/XLSX → financial_parser.py (Stage 1C)
→ embedder.py (Stage 2): chunk (3000 char, 500 overlap) + embed → document_chunks
→ extractor.py (Stage 3): upsert tasks; promote decisions/risks/opportunities → insight_cards (candidate → promote)
→ digest.py (Stage 4, non-blocking)
```

Embedding exclusion rule: any source row with `Interview` in the title is an
intentional non-RAG source. Fireflies backlog replay, the Fireflies sync path,
the full pipeline embedder, Microsoft Graph embedding, and manual meeting
backfill scripts must skip provider calls for those rows. The app catalog row is
marked `status='intentionally_excluded'`, and the AI Database
`rag_document_metadata.embedding_status` is marked `intentionally_excluded` with
`processing_metadata.embedding_exclusion.code='interview_title_excluded'`. These
rows are not vectorization failures and health checks must not count them as
unembedded backlog.

The estimating preset stamps files as `category=financial_document` and
`workflow_target=estimating`, stores raw files under `local/estimating`, and uses
stable source IDs derived from source label + source directory + relative path.
Exact duplicate content still skips through `document_metadata.content_hash`;
changed files at the same path update and re-queue the same `document_metadata`
row. The live estimating command intentionally uses `--reindex-all` so the local
manifest cannot hide rows that are unchanged on disk but still not
`embedded`/`complete` in the database.

Stage 1B must tolerate first-time uploads that do not yet have a `rag_document_metadata`
row. The parser reads optional RAG metadata when present, otherwise downloads the
stored source file from Supabase Storage and writes extracted text into
`rag_document_metadata`. For table-heavy PDFs, extract to structured Markdown first
with `scripts/ingestion/prepare_pdf_for_rag.py` and run ingestion with
`DOC_SEGMENT_USE_LLM=false`; this produces deterministic line-window segments and
prevents invalid LLM JSON from collapsing a long technical document into one
summary-only segment. The prep script can also render figure-heavy pages and create
a separate vision-caption Markdown file for diagram-aware retrieval. The embedder
must then chunk generic document lines directly and store those chunks with
`source_type='document'`. Re-indexed generic documents reset prior
`meeting_segments`, and Stage 2 resets prior `document_chunks` for the document
before writing the regenerated chunk set so stale chunks cannot remain searchable
after a source file changes.

### App DB Pressure Guard for Background RAG and Sync Jobs

The AI/RAG database owns heavy document bodies, chunks, embeddings, and high-churn
pipeline state, but several background jobs still need small app-DB reads/writes
for catalog rows, source sync health, project attribution, alerts, and operator
outputs. Those jobs must call `enforce_app_db_pressure_guard()` before creating
Supabase clients or starting app-DB work. In production Render crons, the guard is
required by env (`APP_DB_PRESSURE_GUARD_REQUIRED=true`) and uses `DATABASE_URL` to
query `pg_stat_activity`; missing credentials or failed guard queries block the
job instead of running blind.

The guard is wired through the scheduler wrappers and direct cron scripts for
Fireflies, Microsoft Graph, Teams channel/DM sync, source/RAG health checks,
packet compilation, daily recap, Outlook attachment promotion, executive-assistant
checks, task extraction, and Acumatica financial sync. `render.yaml`,
`backend/render.yaml`, and `scripts/verify/verify-render-web-scheduler-disabled.mjs`
are the enforcement surface: every Alleato Render cron must keep the guard envs,
and live safe-restart checks must validate those envs before any suspended cron is
resumed.

### Embedding in the Pipeline

The backend pipeline (`embedder.py`) uses `text-embedding-3-small` (1536 dim) by default per `llm.py`. This is separate from the frontend tools which embed queries using `text-embedding-3-large` (3072 dim) via the gateway. The `document_chunks` table stores halfvec(3072) — meaning the backend embedder must be using large dimensions too (verify `embedder.py` if there is a mismatch between stored and query dimensions).

### Fireflies Sync

Runs automatically every 30 minutes via the `alleato-graph-sync` Render cron. The Fireflies pipeline (`fireflies_pipeline.py`) fetches transcripts, normalizes to markdown, uploads to Supabase Storage (`meetings` bucket), upserts `document_metadata`, and enqueues the ingestion job. Interview-title transcripts are marked `intentionally_excluded` before chunk or summary embeddings are requested.

### Graph Embed Candidate Query — post-RAG-split rule

`embed_pending_graph_documents` in `backend/src/services/integrations/microsoft_graph/embed.py` finds `document_metadata` rows that need embedding by filtering on `status IN ('raw_ingested', 'segmented', 'compiled', 'error')` **only**. It must NOT filter by `length(content) > 0` because `SupabaseRagStore.upsert_document_metadata` (in `supabase_helpers.py`) strips `content`/`raw_text` from the app-DB write — full content lives in `rag_document_metadata` in the RAG project. The embed step hydrates content from the RAG DB and marks empty docs as `embedded` so they aren't retried.

Guardrail: when the candidate fetch returns zero docs, `_count_pending_status_rows` re-counts rows still matching the status filter **within the same 365-day date window** as the candidate query. If that count is > 0, the run is logged as `warning` with `unfetchable_pending` in the metadata. The date scoping matters — without it, very old `error`-status rows (pre-existing tech debt that the embed pipeline intentionally skips by date) would generate false alarms on every run. This guardrail catches the failure mode where a column filter goes stale after a schema change (the 2026-05-14 incident where 220 emails sat unembedded for five days because the candidate query still filtered `document_metadata.content`).

### Fireflies Meeting Embed Gap (fixed 2026-06-09)

Fireflies meetings (`source='fireflies'`, `status='processed'`) were never picked up by `embed_pending_graph_documents` because that function filters on `source='microsoft_graph'` only. They also have no `meeting_segments` rows so the segment-based `run_embedder` would raise `ValueError`. Content exists in `rag_document_metadata` but `embedding_status` stays `null` indefinitely.

**Fix:** `embed_pending_fireflies_meetings()` in `embed.py` — queries `rag_document_metadata` directly for `type='meeting'` and `embedding_status=null`, chunks content via `_split_text`, embeds via OpenAI, writes chunks to `document_chunks` with `source_type='meeting_transcript'`, and marks `embedding_status='embedded'` in both DBs. Capped at 25 per sync run. Called from `run_graph_sync()` after the attachment embed step.

Backfill script: `backend/src/scripts/backfill_fireflies_meeting_embeddings.py`

### Manual Commands

```bash
# Ingest a local folder
python3 scripts/ingestion/ingest_local_documents.py --source-dir "/absolute/path" --process-now

# Dry-run scan
python3 scripts/ingestion/ingest_local_documents.py --source-dir "/absolute/path" --dry-run

# Manually trigger pipeline for one document
curl -X POST "$BACKEND_URL/api/pipeline/process" \
  -H "Content-Type: application/json" \
  -d '{"metadataId":"<uuid>"}'
```

---

## 10. Adding a New RAG Tool

1. Decide which tool file it belongs in (`financial.ts`, `operational.ts`, `project-tools.ts`, or a new file).
2. Read an existing tool in that file to understand the pattern: `tool({ description, parameters: z.object({...}), execute: async (...) => {...} })`.
3. All tools receive `userId` (for RLS) and `options` from the factory function.
4. Use `createServiceClient()` for database access (server-side only).
5. For vector search: use `generateEmbedding(openai, query, EMBEDDING.LARGE)` then call `supabase.rpc("search_document_chunks", {...})`.
6. Add the tool to the factory function's return object (`createFinancialTools`, `createOperationalTools`, etc.).
7. If the tool should be available to a specific agent only: add it only to that agent's `createTools` factory in `orchestrator.ts`. If all agents should have it: add it to `createProjectTools`.
8. Update the Strategist or agent system prompt to describe when to call the new tool.
9. If a new specialist agent needs to call it: add the tool to that agent's tool factory in the registry.

---

## 11. Debugging Bad Answers

The chat route is the only production path. Do not debug `rag-chat/route.ts` or backend FastAPI chat endpoints — those are legacy.

1. Find the session in `chat_history`. Check `metadata.tool_trace` for which tools were called.
2. If the wrong tool was called → fix the Strategist prompt routing instructions first, not the SQL.
3. If the right tool was called but returned thin results → check table freshness: `risks`, `ai_insights`, `document_metadata`, `project_health_dashboard`.
4. If data is stale → re-run ingestion for the affected document metadata IDs.
5. Risk portfolio queries must call `getProjectsWithRisks`, not `getPortfolioOverview`. If that routing is wrong, fix `agents/strategist.ts`.

---

## 12. Current Gaps

These are not hypothetical — they are confirmed missing based on Phase 1 completion status.

| Gap | Impact | Phase |
|-----|--------|-------|
| COO, CHRO, CRO, VP BD agents not wired | Operational, people, risk, and business development questions fall through to Strategist with general-purpose tools | 2+ |
| No proactive insight generation | AI only answers questions; no automated budget/schedule/cash flow alerts | 2A |
| No notification system | Insights are stored in `ai_insights` but not routed to users | 2B |
| No AI briefing card on dashboard | Users must open chat to see AI analysis | 2C |
| Document auto-classification | Uploaded docs are ingested but not auto-classified by type | 3A |
| Report generation | No "Generate Status Report" action | 3C |
| Smart template pre-filling | RFI and change order forms have no AI pre-fill | 3D |
| Predictive analytics | No project completion probability or budget overrun prediction models | 4B |
| `conversation_memory` admin UI | `/admin/users/[id]` profile editor designed but not confirmed built | — |
| Low-confidence email attribution UI | Now surfaced in the **Assignment Inbox** (`/assignment-inbox`) — unified worklist of unassigned meetings, emails, Teams messages, and documents with AI suggestions from `document_attribution_candidates`. | Done |

The `ai_insights` table schema exists and is ready for Phase 2 insert operations. The `project_health_dashboard` and `project_issue_summary` views exist and are queried by risk tools.

---

## 13. AI File Map

Exhaustive inventory of every file that meaningfully touches AI assistant logic — chat routing, orchestration, agents, tools, retrieval, RAG, evals, UI, and background services. Paths are relative to the repo root.

### Core Orchestration

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/orchestrator.ts` | Registers agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`. Defines `STRATEGIST_MODEL`, `createStrategistTools`, `getStrategistSystemPrompt`, council-mode injection. Adding a new agent starts here. | strategist.ts, cfo.ts, bot-core.ts, types.ts |
| `frontend/src/lib/ai/chat-handler.ts` | Legacy chat handler extracted from route.ts. Holds special-case agent dispatch branches (executive brief metadata, personal task register, Brandon daily widget, source-specific RAG, source-lookup synthesis, RFI preview, packet-first intent) plus the `streamText` fallback chain. | route.ts, fallback-chain.ts, preflights.ts |
| `frontend/src/lib/ai/bot-core.ts` | Shared bot core used by web chat route and external channel adapters (Slack, Teams, Telegram). Extracts the common orchestrator setup: system prompt assembly, tool creation, memory injection. | orchestrator.ts, system-prompt.ts, conversation-memory.ts |
| `frontend/src/lib/ai/system-prompt.ts` | Single source of truth for system-prompt assembly. Wraps `assembleSystemPrompt` with dev-only token-count logging for context bloat detection. | bot-core.ts, soul.ts, identity.ts, persona-and-memory.ts |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. Adds `openai/` provider prefix automatically. | provider-config.ts, provider-routing.ts, models.ts |
| `frontend/src/lib/ai/provider-config.ts` | OpenAI-compatible client config (gateway base URL vs direct OpenAI), provider-failure formatting helpers. | providers.ts |
| `frontend/src/lib/ai/provider-routing.ts` | Cross-provider routing logic (fallbacks, retries, model substitution). | providers.ts, fallback-chain.ts |
| `frontend/src/lib/ai/fallback-chain.ts` | `generateRecoveryResponse` — hard fallback when the Strategist returns empty/garbled text. Always uses `openai/gpt-4.1` because the active model just failed. | strategist-failure-response.ts, score-response-quality.ts |
| `frontend/src/lib/ai/strategist-failure-response.ts` | Builds the user-facing failure message with cause, project hint, and tool trace summary. Regression-guarded against bare generic strings. | fallback-chain.ts |
| `frontend/src/lib/ai/score-response-quality.ts` | Detects meta-commentary stalling phrases ("let me search for…") and scores response confidence/source quality. Triggers fallback on low scores. | chat-handler.ts |
| `frontend/src/lib/ai/preflights.ts` | Pre-retrieval source-specific RAG executor. Loads documents from `document_metadata` filtered by source/date/category, returns rows + trace for tool-disabled gateway path. | detect-rag-request.ts, source-health.ts, guardrails.ts |
| `frontend/src/lib/ai/models.ts` | Model registry — full list of selectable models with metadata. | assistant-models.ts, model-pricing.ts |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. | models.ts |
| `frontend/src/lib/ai/model-pricing.ts` | Per-model input/output token pricing for cost telemetry. | langfuse-trace.ts |
| `frontend/src/lib/ai/langfuse-trace.ts` | Langfuse observability wrappers. **As of 2026-06-10 the main streamText chat path is fully OTel-native:** `handler-v2.ts` wraps synthesis in `propagateAttributes` (sets trace `userId`/`sessionId`/`tags`/name) + `startActiveObservation` (root span, `endOnExit:false`), and the `@langfuse/otel` processor auto-captures the generation, tool spans, model, and token usage from `experimental_telemetry`. `scoreChatTrace({traceId, output, toolCallNames, toolTrace})` then attaches `response_quality`/`answered`/`tool_failure` scores to that SAME trace id via `lf.score()` — no v3 trace or generation is created on this path, so there is exactly one trace per chat (verified: `lf.score()` attaches to an OTel-owned trace, but `lf.trace({id})` does NOT override its tags/metadata, so trace-level attributes come only from the OTel path). `traceChatCompletion` is RETAINED for the **direct Render Deep Agents return path** (`persistDirectDeepAgentResponse`), which bypasses `streamText` and thus has no OTel span — there it still records a full v3 trace + `directDeepAgent:*` generation + scores, with no duplication risk. Streamed AI SDK synthesis uses the default `streamText` generation; direct Render Deep Agents returns pass explicit `directDeepAgent:*` generation names so bypass paths remain traceable. As of 2026-06-10 it also attaches **online trace scores** from `computeTraceScores()` (in `score-response-quality.ts`) with no extra LLM calls: `response_quality` (NUMERIC 0–1), `answered` (BOOLEAN — false on empty/meta-commentary deflection), and `tool_failure` (BOOLEAN, only when a rich `toolTrace` is passed). A `deflected` tag is added when `answered` is false. The deep-agent direct-return path passes the full `toolTrace` for the rich score; the streamText path uses the lightweight output+tool-name fallback. Turns production traffic from observed-only into continuously scored (Langfuse project `alleato-ai`, us.cloud). `scoreUserFeedback()` mirrors chat thumbs-up/down onto the originating trace as a `user_feedback` BOOLEAN score — the handler now persists `langfuse_trace_id` into the assistant message's `chat_history` metadata, and `/api/ai-assistant/feedback` looks it up to attach the score (highest-trust eval signal, unified with the automated scores). `maybeJudgeAndScore()` additionally runs a sampled, code-owned LLM judge (`llm-judge.ts`) and attaches `llm_relevance`/`llm_specificity`/`llm_completeness` (NUMERIC 0–1) — the semantic counterpart to the heuristic `answered`, catching deflection/off-topic answers. OFF by default: `LANGFUSE_LLM_JUDGE_ENABLED=true` + `LANGFUSE_LLM_JUDGE_SAMPLE_RATE` (0–1) + optional `LANGFUSE_LLM_JUDGE_MODEL` (default gpt-4.1-mini). | chat-handler.ts, score-response-quality.ts, llm-judge.ts |
| `frontend/src/lib/ai/langfuse-mask.ts` | PII redaction before egress to Langfuse (us.cloud). `maskLangfuse({data})` redacts emails/SSN/card/phone in strings; deliberately does NOT mask dollar amounts/financials (business data, not PII — masking it would gut observability). Wired into both egress paths: `LangfuseSpanProcessor({mask})` in `instrumentation.ts` (OTel main path) and `new Langfuse({mask})` in `langfuse-trace.ts` (v3 deep-agent path). | instrumentation.ts, langfuse-trace.ts |
| `frontend/src/lib/ai/llm-judge.ts` | Code-owned LLM-as-a-judge. `judgeChatResponse({question, answer})` scores relevance/specificity/completeness (0–1) via `generateObject` on a cheap model; `shouldRunJudge()` is the env-gated, sampled safety gate (OFF by default). Chosen over Langfuse's UI-centric/unstable online-eval feature for full control of model, sampling, and cost. Provider import is lazy so the off path stays light. | langfuse-trace.ts, providers.ts |
| `frontend/src/instrumentation.ts` | Next.js server-startup hook. As of 2026-06-10 registers the **Langfuse OTel span processor** (`LangfuseSpanProcessor` from `@langfuse/otel`) on a `NodeTracerProvider` when `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are set, so any AI SDK call with `experimental_telemetry` exports model/tokens/tool-spans/hierarchy automatically. Exports `flushLangfuse()` for route handlers. Langfuse takes precedence over the dev-only Phoenix path (both register a single global tracer provider). **OTel version note:** `@langfuse/otel@5` requires the `0.20x` experimental line (`exporter-trace-otlp-http`, `sdk-node`) paired with stable `sdk-trace-base@2.x`; the old `0.57.x` exporter crashes on export (`instrumentationLibrary` undefined). Pinned via package.json overrides. | ai-telemetry.ts, langfuse-trace.ts |
| `frontend/src/lib/ai/ai-telemetry.ts` | Single source of truth for `experimental_telemetry`. `aiTelemetry({functionId, metadata})` returns the AI SDK telemetry config, enabled when Langfuse is configured (or `PHOENIX_TRACING=true`). Wired into the main chat `streamText` (`ai-assistant-chat-v2`), `intent-classifier.ts` (`intent-planner`), and `fallback-chain.ts` (`recovery-response`). | instrumentation.ts |
| `frontend/src/lib/ai/entitlements.ts` | Feature-flag and tier-gate checks for AI features. | route.ts |
| `frontend/src/lib/ai/session-id.ts` | Session ID UUID coercion helper used by memory/learning services. | conversation-memory.ts, ai-memory-service.ts |

### Intent Routing & Retrieval Planning

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/intent-router.ts` | `AssistantIntent` union and regex-based intent classification. Defines task-write patterns that must beat task-followup routing and external-research patterns for public web/current market/trend prompts that must route to the Render Deep Agents research endpoint instead of internal executive briefing. As of 2026-06-09 the external-research patterns also match market/industry/economy conditions and material-price questions phrased without an explicit "web"/"research" verb (e.g. "what's happening in the construction market?", "outlook for lumber prices nationally") so they reach live web search instead of being answered from internal RAG; the patterns stay anchored on market/industry/economy/commodity/named-material terms so internal project questions ("cost trends on Westfield", "budget forecast") are not sent to the web (regression coverage in `__tests__/intent-router.test.ts`). | intent-classifier.ts, planner.ts |
| `frontend/src/lib/ai/intent-classifier.ts` | LLM-based intent classifier using `generateObject`. Wraps with `withTimeout`. Falls back to regex router on timeout. | intent-router.ts, planner.ts |
| `frontend/src/lib/ai/detect-rag-request.ts` | Source-specific RAG request detection (meetings-on-date, recent-emails, recent-teams, recent-onedrive). Workaround module for AI Gateway `finishReason:other` bug when tools are disabled. | preflights.ts, planner.ts |
| `frontend/src/lib/ai/retrieval/planner.ts` | Builds a `RetrievalPlan` from message + selected project: classifies intent, detects source-specific RAG, picks sub-agent, decides external sources. When `selectedProjectId` is present, source lookup and source-specific RAG plans preload the project operating packet and structured project snapshot before semantic/document drilldown. Selected-project source-health wording routes to packet/snapshot checks instead of a cold conversational path, but exact document/spec lookup keeps semantic drilldown so source proof is still available. As of 2026-06-10, two checks sit just above the packet-first briefing so they intercept the status-dump default: (1) `hasAttachments` (the handler detects file parts / inlined-readable markers) routes to a conversational answer that works WITH the files; (2) `isTransactionalCreateRequest` (create/open a commitment/change-order/RFI/etc., or migrate/import/cross-over data) routes to conversational so the model reaches its create-* tools. Both fixed the Goodwill Noblesville session where "create the commitment" and "I attached exports, help me migrate" got a generic project-health dump instead of action. The handler also injects an `## Attached files` system note for unreadable formats (xlsx/pdf) telling the model to ask for a CSV/TXT/JSON export rather than fabricate or status-dump. Regression cases in `retrieval/__tests__/planner.test.ts`. | intent-router.ts, detect-rag-request.ts, types.ts |
| `frontend/src/lib/ai/retrieval/executor.ts` | Executes a `RetrievalPlan` via the `ExecutorDeps` interface (packet, snapshot, semantic, source-specific, Brandon daily, reusable briefing). Pure of route dependencies. Requested project operating context fails loudly through retrieval warnings when the packet or structured snapshot is unavailable, so assistant answers can disclose missing/thin context instead of silently falling back to cold RAG. | planner.ts, deps.ts |
| `frontend/src/lib/ai/retrieval/deps.ts` | Wires `ExecutorDeps` to real loaders (Supabase + intelligence packet service). Call once per request. | executor.ts, packet-service.ts |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Renders the `RetrievalContext` (packet, semantic results, external rows) into the agent system prompt blocks. Operating packets expose the strategic report, category/source-quality coverage, and linked evidence counts first, with card snippets as fallback detail. | executor.ts, types.ts |
| `frontend/src/lib/ai/retrieval/source-specific-rag.ts` | Source-specific RAG retrieval extracted from chat route. Loads rows from `document_metadata` for meetings/emails/teams/onedrive. | preflights.ts, detect-rag-request.ts |
| `frontend/src/lib/ai/retrieval/reusable-briefing.ts` | Loads cached reusable briefing context for a session so multi-turn briefing flows reuse retrieval. | executor.ts |
| `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts` | Re-ranks retrieval results using stored boost/downrank weights per (query_signature, source). Backs admin retrieval feedback. | feedback-event-service.ts |
| `frontend/src/lib/ai/retrieval/types.ts` | `RetrievalPlan`, `RetrievalContext`, `SubAgent`, `ResponseFormat`, `ExternalSource` types — shared by planner/executor. | planner.ts, executor.ts |
| `frontend/src/lib/ai/intelligence/packet-service.ts` | Loads and resolves the project intelligence packet (cards, evidence, confidence, freshness) from `intelligence_packets` and related tables. | deps.ts, types.ts, compiler.py |
| `frontend/src/lib/ai/intelligence/advisor-synthesis.ts` | Synthesizes packet strategic reports into final advisor-style answers per intent, including meeting/source coverage and linked citation counts. Falls back to packet cards only when `packet_json.strategicReport` is absent. | packet-service.ts, types.ts |
| `frontend/src/lib/ai/intelligence/page-state.ts` | Pure page-state guard for project intelligence pages. Separates fatal synthesis/source-quality failures from normal `source_coverage.gaps` evidence limitations so a valid strategic report is not mislabeled as needing resynthesis. | `[projectId]/intelligence/page.tsx`, intelligence-page-state.test.ts |
| `frontend/src/lib/ai/intelligence/types.ts` | `ClientProjectIntelligencePacket`, `InsightCard`, `ResolvedIntelligenceTarget`, freshness/confidence types. | packet-service.ts, advisor-synthesis.ts |

### Agents & Prompts

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. | orchestrator.ts, cfo.ts |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO tool usage. Live agent via `consultCFO`. | orchestrator.ts, financial.ts, acumatica.ts |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). Operations focus. | strategist.ts, operational.ts |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). People focus. | strategist.ts |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). Risk focus. | strategist.ts |
| `frontend/src/lib/ai/agents/cmo.ts` | CMO system prompt — marketing intelligence and content advisory. | marketing.ts, marketing-service.ts |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP Business Development system prompt (designed, not live). | strategist.ts |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union, `AgentResponse` type, `AGENT_NAMES` array. Update when adding agents. | orchestrator.ts |
| `frontend/src/lib/ai/soul.ts` | Persona foundation — voice, tone, values. Included in every system prompt at top priority. | identity.ts, system-prompt.ts |
| `frontend/src/lib/ai/identity.ts` | Identity layer — who the AI is. Composed with `soul` below it. | soul.ts, system-prompt.ts |
| `frontend/src/lib/ai/persona-and-memory.ts` | `I_DONT_KNOW_REFLEX_PROMPT` and user-profile injection logic into system prompt. | system-prompt.ts |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | Legacy RAG-only system prompt. Preserved for backward compatibility; not used in the C-Suite path. | — |
| `frontend/src/lib/ai/prompts.ts` | Misc prompt building blocks and templates. | prompts/meeting-prep.ts, prompts/progress-report.ts |
| `frontend/src/lib/ai/prompts/meeting-prep.ts` | Meeting-prep generator prompt — extracts attendees, agenda, prior decisions. | progress-report-tools.ts |
| `frontend/src/lib/ai/prompts/progress-report.ts` | Weekly progress report generator prompt. | progress-report-tools.ts |
| `frontend/src/lib/ai/prompt-diagnostics.ts` | Token-counter, prompt-block size profiling, dev-mode warnings for prompt bloat. | system-prompt.ts |
| `frontend/src/lib/ai/action-capabilities.ts` | Static catalog of write-back actions the assistant can perform (create RFIs, submittals, change events, tasks, etc.). Surfaced in onboarding + welcome screen. | welcome-screen.tsx |
| `frontend/src/lib/ai/assistant-widgets.ts` | `AssistantWidgetKind` union and widget field types — generative UI contracts (task summary, project picker, financial pulse, etc.). | assistant-widget-renderer.tsx |

### Tools

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/tools/project-tools.ts` | Core project tools plus SAIS structured tools: portfolio overview, risk analysis, briefing snapshot, financial analysis, budget summary, action items, meetings by date, document search, project details, SOP backlog, finance spend rollup. | orchestrator.ts, financial.ts, sais.ts |
| `frontend/src/lib/ai/tools/sais.ts` | `getSopBacklog`, `getFinanceSpendRollup` — structured accounting/finance leadership tools backed by `sop_backlog`, `acumatica_ap_bills`, and `finance_spend_classification_rules`. | project-tools.ts, rag-assistant-prompt.ts |
| `frontend/src/lib/ai/tools/financial.ts` | 6 financial tools: commitments, change orders, direct costs, budget line items, cost trends, margin analysis. | cfo.ts, acumatica.ts |
| `frontend/src/lib/ai/tools/operational.ts` | 15+ operational tools: people/roles, vendor performance, RFIs, submittals, cross-project, semantic search, recent emails, search emails, search Teams, save insight, write memory, recall conversations. | coo.ts, document-intelligence.ts |
| `frontend/src/lib/ai/tools/acumatica.ts` | 9 Acumatica ERP tools: AP/AR aging, cash position, vendor spend, recent bills/invoices, project budget/list, PO summary. Cookie auth. | financial.ts |
| `frontend/src/lib/ai/tools/schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays, look-aheads. | project-tools.ts |
| `frontend/src/lib/ai/tools/forecast-tools.ts` | `getForecastComparison` — budget vs actual vs forecast across cost codes. | financial.ts |
| `frontend/src/lib/ai/tools/document-intelligence.ts` | `searchSpecs`, `searchOneDriveDocs` — semantic search against `document_chunks` filtered by category. | tool-utils.ts |
| `frontend/src/lib/ai/tools/action-tools.ts` | Write-back actions: createGeneratedTask, send alert, create record. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/workspace-tools.ts` | Workspace artifact CRUD tools (drafts, briefings, owner updates). | workspace-artifact-service.ts |
| `frontend/src/lib/ai/tools/marketing.ts` | Marketing intelligence/content tools used by CMO agent. | cmo.ts, marketing-service.ts |
| `frontend/src/lib/ai/tools/progress-report-tools.ts` | Progress report generation tool. | prompts/progress-report.ts |
| `frontend/src/lib/ai/tools/app-help-tools.ts` | In-app help / how-to tool — answers "how do I…" questions about the Alleato app itself. | help/articles |
| `frontend/src/lib/ai/tools/feature-request-tools.ts` | Captures user feature requests as structured records. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/structured-output.ts` | Generic `generateObject` helpers with Zod schemas for structured tool outputs. | structured-queries.ts |
| `frontend/src/lib/ai/tools/structured-queries.ts` | SQL-style structured queries used as tool primitives. | tool-utils.ts |
| `frontend/src/lib/ai/tools/create-document.ts` | Generative UI tool to create a new document artifact in chat. | update-document.ts, workspace-tools.ts |
| `frontend/src/lib/ai/tools/update-document.ts` | Generative UI tool to update an existing document artifact. | create-document.ts |
| `frontend/src/lib/ai/tools/request-suggestions.ts` | Generative UI tool to request next-step suggestions. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/web-search.ts` | Web search tool (external knowledge). | mcp-tools.ts |
| `frontend/src/lib/ai/tools/mcp-tools.ts` | MCP (Model Context Protocol) tool adapter. | — |
| `frontend/src/lib/ai/tools/get-weather.ts` | Weather lookup demo tool. | — |
| `frontend/src/lib/ai/tools/guardrails.ts` | Tool-scope guardrails: PII filters, jailbreak detection, RLS-scoped row filters. | guardrails.py |
| `frontend/src/lib/ai/tools/tool-utils.ts` | Shared helpers: `EMBEDDING` config (LARGE 3072 vs SMALL 1536), `generateEmbedding()`. Source of truth for embedding model/dim per table. | providers.ts |

### Services (Memory, Learning, Workspace)

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/bot-core.ts` | Shared prompt assembly for web chat and bot adapters. Loads assistant memories, recent conversation summaries, workspace artifacts, and agent learnings; passes selected project into memory recall; emits `memory_usage` metadata with selected-memory ranking/debug reasons. | ai-memory-service.ts, conversation-memory.ts, memory-extraction.ts |
| `frontend/src/lib/ai/services/conversation-memory.ts` | After each chat response, summarizes the conversation with gpt-4.1-nano, embeds (3072 dims), upserts into `memories` keyed by session. Provides `recallPastConversations`. | memory-extraction.ts, operational.ts |
| `frontend/src/lib/ai/services/ai-memory-service.ts` | Core read/write layer for PM APP `ai_memories` plus AI Database memory chunks. Handles exact-content dedupe, commitment bridge to `ai_insights`, active/expiry hydration filters, owner/team visibility scoping, selected-project recall, default 183-day semantic lookback, freshness-first ranking, and AI Database chunk sync/delete for `source_type='ai_memory'`. | conversation-memory.ts, memory-extraction.ts |
| `frontend/src/lib/ai/services/memory-extraction.ts` | Extracts typed memories (fact, preference, lesson, commitment, context) from the latest 40 chat messages after conversation response persistence via gpt-4.1-nano. Scheduled by `handler-v2.ts` through `runPostResponseTasks()`. | ai-memory-service.ts |
| `frontend/src/lib/ai/services/agent-learning-service.ts` | Records agent-learning events (thumbs_down, admin_feedback, eval_failure) and trains few-shot examples for future routing. | feedback-event-service.ts, task-training-service.ts |
| `frontend/src/lib/ai/services/feedback-event-service.ts` | Records AI feedback events and writes corresponding memories. Single entry point from feedback API route. Brandon email draft feedback stores the active voice profile version and points future agents to the companion operating profile and drafting playbook under `docs/ai-plan/`. **Project-attribution learning loop:** `recordAttributionAssignmentFeedback` logs every manual Assignment-Inbox assignment (event_family `attribution`); `generateAttributionRulePromotionCandidates` mines those events for recurring sender-domain / sender-email / title-keyword → project patterns and proposes `attribution_rule` promotions; `applyAttributionRulePromotion` branches on `proposed_learning.ruleKind` to upsert generalizable rules into `project_attribution_rules` (the table the backend ProjectAssigner reads at highest priority). | agent-learning-service.ts, ai-memory-service.ts |
| `frontend/src/lib/ai/services/task-training-service.ts` | Task-specific feedback training — categorized reasons (wrong_project, wrong_owner, etc.) for task extraction failures. | task-feedback-types.ts |
| `frontend/src/lib/ai/services/marketing-service.ts` | CRUD for marketing intelligence items, content calendar, content assets. Backs CMO agent and marketing routes. | cmo.ts, marketing.ts |
| `frontend/src/lib/ai/services/project-intelligence-summary.ts` | `summarizeProjectIntelligence` — runs `generateObject` over project sources to produce a cited summary with confidence scores. The prompt now explicitly prioritizes Brandon-specific responsibilities first and pushes immediate-attention/current-focus output toward owner-actionable items instead of generic recap text. | project-operating-summary-sources.ts |
| `frontend/src/lib/ai/services/project-operating-summary-sources.ts` | Loads the source set (meetings, decisions, risks, tasks, emails) feeding the project operating summary. | project-intelligence-summary.ts, operating_summary.py |
| `frontend/src/lib/ai/services/source-sync-summary.ts` | Generates an LLM summary of source sync health for the admin source-sync UI. | source-health.ts |
| `frontend/src/lib/ai/services/workspace-artifact-service.ts` | CRUD + semantic search for `workspace_artifacts`. Embedding failures are non-fatal. | workspace-tools.ts |
| `frontend/src/lib/ai/source-health.ts` | Loads `source_sync_health_snapshots` and `graph_subscriptions` rows, exposes assistant-facing source health context. | source-sync-summary.ts |
| `frontend/src/lib/ai/onboarding-insights.ts` | Returns onboarding insights (currently Tampa default fallback; per-user attendance RAG not yet wired). | — |
| `frontend/src/lib/ai/personal-daily-brief.ts` | Detects daily-brief critique requests ("format the daily brief differently") and routes accordingly. | brandon-daily-update.ts |
| `frontend/src/lib/ai/task-feedback-types.ts` | Typed reason categories/labels for task feedback (used by training service and feedback API). | task-training-service.ts |

### Executive Briefing & Daily Update

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/executive/executive-briefing-workflow.ts` | Top-level workflow that builds an executive briefing: pulls insights, scores by importance, formats bullets, prepares delivery. | executive-brief-bullets.ts, daily-brief.ts |
| `frontend/src/lib/executive/executive-brief-bullets.ts` | Bullet selection and ordering rules — financial first, then schedule, risk, opportunities. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-intelligence-routing.ts` | Routes briefing requests to the right source set (project, portfolio, owner). | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-briefing-teams-delivery.ts` | Sends the briefing to MS Teams via adaptive cards / chat message API. The current card renderer places Brandon's Top Priorities first and requires every surfaced claim to include a supporting source link, using upstream citations when present and Alleato source drilldown links otherwise. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-briefing-email.tsx` | React Email template for the briefing email. | resend |
| `frontend/src/lib/executive/daily-brief.ts` | Daily brief composition entry point used by `/api/executive/daily-brief`. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/brandon-daily-update.ts` | Brandon-specific daily update generator — narrower scope than executive brief, owner-focused. It now suppresses untrusted accounting-aging and money-due callouts from the briefing layer while preserving project-number-aware owner priorities and per-claim source attribution. | brandon-daily-update-widget.ts |
| `frontend/src/lib/executive/brandon-daily-update-widget.ts` | Builds the generative UI widget payload for Brandon's daily update card. | brandon-daily-update-widget-card.tsx |

### API Routes

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Main POST handler. Orchestrates auth, intent classification, packet retrieval, specialist routing, tool execution, streaming, persistence to `chat_history`. All user messages enter here. | chat-handler.ts, handler-v2.ts, orchestrator.ts |
| `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | V2 chat handler — newer retrieval-plan-driven flow (planner → executor → streamText). Coexists with chat-handler.ts during migration. | planner.ts, executor.ts |
| `frontend/src/app/api/ai-assistant/conversations/route.ts` | List and create chat sessions for the current user. | [sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/conversations/[sessionId]/route.ts` | Get/update/delete a single chat session. | messages/[sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts` | Load messages for a session from `chat_history`. | conversations/[sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/feedback/route.ts` | Records thumbs-up/down + reason on an assistant message. Drives agent learning. | feedback-event-service.ts |
| `frontend/src/app/api/ai-assistant/task-feedback/route.ts` | Categorized feedback on AI-extracted tasks. | task-training-service.ts |
| `frontend/src/app/api/ai-assistant/packet-card-feedback/route.ts` | Feedback on individual intelligence packet cards (useful / not useful / wrong). | packet-service.ts |
| `frontend/src/app/api/ai-assistant/memories/route.ts` | List/create AI memories for the current user. | ai-memory-service.ts |
| `frontend/src/app/api/ai-assistant/memories/[memoryId]/route.ts` | Update/delete a single memory. | ai-memory-service.ts |
| `frontend/src/app/api/ai-assistant/workspace/route.ts` | List/create workspace artifacts. | workspace-artifact-service.ts |
| `frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts` | Get/update/delete a single workspace artifact. | workspace-artifact-service.ts |
| `frontend/src/app/api/ai-assistant/timeline/route.ts` | Cross-source timeline aggregation (meetings, emails, Teams, documents) for the chat UI. | cross-source-timeline.tsx |
| `frontend/src/app/api/ai-assistant/speech/route.ts` | Speech-to-text and text-to-speech endpoints for voice mode. | audio-waveform.tsx |
| `frontend/src/app/api/ai-assistant/avatar/conversation/route.ts` | Tavus avatar conversation session creation. | tavus-avatar-page.tsx |
| `frontend/src/app/api/ai-assistant/usage-stats/route.ts` | Aggregated AI usage stats (tokens, sessions, costs) for the admin panel. | model-pricing.ts |
| `frontend/src/app/api/ai-assistant/marketing/assets/route.ts` | List/create marketing content assets. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/assets/[assetId]/route.ts` | Get/update/delete a marketing asset. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/calendar/route.ts` | List/create marketing calendar items. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/calendar/[calendarItemId]/route.ts` | Update/delete a single marketing calendar item. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/_utils.ts` | Shared zod schemas + helpers for marketing endpoints. | marketing-service.ts |
| `frontend/src/app/api/executive/daily-brief/route.ts` | Generate the executive daily brief on demand. | daily-brief.ts, route-helpers.ts |
| `frontend/src/app/api/executive/daily-brief/route-helpers.ts` | Shared helpers (auth, project resolution, recipient list) for the daily-brief routes. | daily-brief.ts |
| `frontend/src/app/api/executive/daily-brief/send-teams/route.ts` | Sends the daily brief to MS Teams. | executive-briefing-teams-delivery.ts |
| `frontend/src/app/api/executive/daily-brief/preview-teams/route.ts` | Renders a preview of the Teams adaptive card payload without sending. | executive-briefing-teams-delivery.ts |
| `frontend/src/app/api/executive/daily-brief/widget/route.ts` | Returns the daily-brief data shape consumed by the dashboard widget. | daily-brief.ts |
| `frontend/src/app/api/executive/brandon-daily-update/route.ts` | Generates Brandon's owner-focused daily update. | brandon-daily-update.ts |
| `frontend/src/app/api/executive/brandon-daily-update/widget/route.ts` | Returns Brandon daily update as a generative UI widget payload. | brandon-daily-update-widget.ts |
| `frontend/src/app/api/executive/intelligence-stats/route.ts` | Aggregated intelligence stats (packets compiled, insights generated, freshness) for admin dashboards. | packet-service.ts |

### UI Components

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/components/ai-assistant/rag-chat-page.tsx` | Full-page RAG chat experience — sidebar + chat area + welcome screen. Top-level chat surface. | chat-area.tsx, conversation-sidebar.tsx |
| `frontend/src/components/ai-assistant/chat-area.tsx` | Message list + composer + streaming renderer. Consumes `useChat` from Vercel AI SDK. | chat-formatting.ts, source-citations.tsx |
| `frontend/src/components/ai-assistant/chat-formatting.ts` | Message formatting helpers: markdown, code blocks, citation tokens. | chat-area.tsx |
| `frontend/src/components/ai-assistant/conversation-sidebar.tsx` | Left-rail session list with rename/delete. | conversation-list-item.tsx |
| `frontend/src/components/ai-assistant/conversation-list-item.tsx` | Single session row in the sidebar. | conversation-sidebar.tsx |
| `frontend/src/components/ai-assistant/welcome-screen.tsx` | Empty-state for new conversations — quick prompts, capabilities, onboarding insights. | action-capabilities.ts, onboarding-insights.ts |
| `frontend/src/components/ai-assistant/compact-ai-chat.tsx` | Compact embedded chat (drawer / floating widget version). | global-ai-widget.tsx |
| `frontend/src/components/ai-assistant/global-ai-widget.tsx` | App-wide floating chat widget mounted in root layout. | compact-ai-chat.tsx |
| `frontend/src/components/ai-assistant/ai-chat-sidebar.tsx` | Right-rail chat sidebar usable from any page. | compact-ai-chat.tsx |
| `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` | Renders generative-UI widgets (task summary, project picker, financial pulse, etc.) from streamed tool output. | assistant-widgets.ts |
| `frontend/src/components/ai-assistant/brandon-daily-update-widget-card.tsx` | Card UI for Brandon's daily update widget. | brandon-daily-update-widget.ts |
| `frontend/src/components/ai-assistant/source-citations.tsx` | Citation chips and source drawer for inline references. | chat-area.tsx |
| `frontend/src/components/ai-assistant/cross-source-timeline.tsx` | Cross-source timeline view (meetings + emails + Teams + docs). | timeline/route.ts |
| `frontend/src/components/ai-assistant/trace-panel.tsx` | Developer trace panel — shows tool calls, latency, model, tokens for the current message. | langfuse-trace.ts |
| `frontend/src/components/ai-assistant/animated-orb.tsx` | Animated orb avatar shown while assistant is thinking/streaming. | tavus-avatar-page.tsx |
| `frontend/src/components/ai-assistant/audio-waveform.tsx` | Voice-mode waveform visualizer. | speech/route.ts |
| `frontend/src/components/ai-assistant/tavus-avatar-page.tsx` | Tavus video avatar embed page. | avatar/conversation/route.ts |
| `frontend/src/components/ai-intelligence/ai-system-health-panel.tsx` | Admin panel: overall AI system health (provider, gateway, embeddings, vector index). | source-sync-health-panel.tsx |
| `frontend/src/components/ai-intelligence/intelligence-compiler-health-panel.tsx` | Admin panel: compiler job queue health (Teams, email, packet refresh). | compiler.py, teams_compiler.py |
| `frontend/src/components/ai-intelligence/source-sync-health-panel.tsx` | Admin panel: per-source sync freshness and errors. | source-health.ts |
| `frontend/src/components/ai-intelligence/operations-readiness-panel.tsx` | Admin readiness check across all AI subsystems. | ai-system-health-panel.tsx |
| `frontend/src/components/ai-intelligence/project-intelligence-cross-reference.tsx` | Cross-references project intelligence packet against raw sources for accuracy review. | packet-service.ts |
| `frontend/src/components/ai-intelligence/insight-card-showcase.tsx` | Visual showcase / storybook of all insight card types. | packet-service.ts |

### Background Services (Backend Python)

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `backend/src/services/intelligence/compiler.py` | Job/staging helpers — durable control plane between RAG sources (`document_metadata`, `document_chunks`) and packet tables. Source jobs still stage/promote signal candidates, but client-project packet refreshes now default to `project-operating-summary-v1` so the current packet contains synthesized operating-report sections instead of raw promoted-source snippets. Inline per-source packet refresh is disabled by default; source imports enqueue packet refresh jobs for scheduled/batched synthesis to avoid one LLM packet compile per imported message. | teams_compiler.py, email_compiler.py, operating_summary.py |
| `backend/src/services/intelligence/teams_compiler.py` | Teams direct-message conversation compiler. Runs at end of every graph sync (batch 25, 170s budget). Writes to `project_insights`, `tasks`, `insights`, `source_signal_candidates`. | compiler.py, prompts.py, client.py |
| `backend/src/services/intelligence/email_compiler.py` | Outlook email thread compiler. Mirrors Teams compiler but operates on threads (grouped by `conversation_id`), anchors artifacts to thread head. | compiler.py, prompts.py |
| `backend/src/services/intelligence/operating_summary.py` | Backend-owned project operating summary packet refresh — production path on Render/FastAPI. Selects up to 96 source capsules with recency and source-priority ordering (project context, then recent meetings, Teams, email, structured controls, documents), scores each source as `clean_source`, `raw_dump`, `metadata_only`, or `stale_or_failed`, asks the model for `whatChanged`, `risks`, `openDecisions`, `moneyImpact`, `promisesMade`, `recommendedActions`, and `evidenceQuality`, and fails if the model returns raw headers/transcript dumps instead of synthesis. The compiler also derives deterministic document intelligence from selected document sources: latest document/revision signals, obligation candidates, conflict indicators, project-impact summaries, and evidence pointers back to source IDs/pages/snippets. Writes `packet_json.strategicReport`, `packet_json.strategicReport.documentIntelligence`, `source_coverage.sourceQualityCounts`, `source_coverage.documentIntelligence`, and a `qualityGate` so dashboards and agents can reject weak packets. It also emits an `operating-document-intelligence` insight card for assistant/page surfaces. Source citations are supplied as aliases and remapped back to canonical source IDs, accepting `S001`, `S01`, and `S1` formats for the same source. Generated cards use section-specific `next_action` values so the page and assistant do not repeat one generic recommendation across every section. **Insight-card writes are deduped per refresh (`_persist_operating_cards`, added 2026-06-09):** because all operating-summary cards for a target share `compiler_version = project-operating-summary-v1`, each card's stable section key is stored as `metadata.normalized_signal_key` and matched on re-run — existing cards are updated in place (preserving `first_seen_at`, replacing evidence/target child rows), and any prior card whose key is absent from the current refresh is marked `current_status = resolved`. This replaced an unconditional `insert` loop that created a fresh full set of `insight_cards` (+ targets + evidence) on every packet refresh, accumulating duplicates indefinitely. | project-operating-summary-sources.ts, compiler.py |
| `backend/src/services/intelligence/client.py` | OpenAI client helpers for Teams/email intelligence. Uses `get_openai_client()` from `ai_transport`. Defines `COMPILER_MODEL = gpt-5.5`, retry helper `extract_with_retry`. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/prompts.py` | Prompt templates and JSON schemas for the Teams/email compilers. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/__init__.py` | Package init. | — |

### Evals & Testing

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/__tests__/intent-router.test.ts` | Unit tests for intent classification regex patterns and task-write precedence. | intent-router.ts |
| `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts` | Unit tests for packet loading and confidence resolution. | packet-service.ts |
| `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts` | Unit tests for synthesized advisor responses per intent. | advisor-synthesis.ts |
| `frontend/src/lib/ai/__tests__/intelligence-page-state.test.ts` | Regression test for intelligence page state. Ensures passed strategic reports with evidence limitations do not show fatal resynthesis copy. | page-state.ts |
| `frontend/src/lib/ai/__tests__/cmo-orchestrator.test.ts` | Tests CMO agent registry wiring. | cmo.ts, orchestrator.ts |
| `frontend/src/lib/ai/__tests__/strategist-failure-response.test.ts` | Regression guard — failure response must include cause + tool trace. | strategist-failure-response.ts |
| `frontend/src/lib/ai/__tests__/score-response-quality.test.ts` | Meta-commentary phrase detection coverage. | score-response-quality.ts |
| `frontend/src/lib/ai/__tests__/prompt-diagnostics.test.ts` | Prompt token counting + bloat warning thresholds. | prompt-diagnostics.ts |
| `frontend/src/lib/ai/__tests__/provider-config.test.ts` | Gateway vs direct OpenAI client config switching. | provider-config.ts |
| `frontend/src/lib/ai/__tests__/provider-routing.test.ts` | Cross-provider routing/fallback behavior. | provider-routing.ts |
| `frontend/src/lib/ai/__tests__/model-pricing.test.ts` | Pricing table sanity checks. | model-pricing.ts |
| `frontend/src/lib/ai/__tests__/rag-meeting-retrieval.test.ts` | Meeting retrieval shape + filter coverage. | operational.ts |
| `frontend/src/lib/ai/__tests__/personal-daily-brief.test.ts` | Daily-brief critique-request detection. | personal-daily-brief.ts |
| `frontend/src/lib/ai/__tests__/task-feedback-types.test.ts` | Task feedback reason categories shape. | task-feedback-types.ts |
| `frontend/src/lib/ai/retrieval/__tests__/planner.test.ts` | Retrieval plan construction per intent. | planner.ts |
| `frontend/src/lib/ai/retrieval/__tests__/executor.test.ts` | Executor delegation to `ExecutorDeps` mock. | executor.ts |
| `frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts` | System prompt rendering from retrieval context. | retrieval/system-prompt.ts |
| `frontend/src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts` | Weight re-ranking math. | retrieval-weight-scoring.ts |
| `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts` | Write-back action tool contracts. | action-tools.ts |
| `frontend/src/lib/ai/tools/__tests__/project-tools-barrel.test.ts` | All project tools are exported and have expected signatures. | project-tools.ts |
| `frontend/src/lib/ai/tools/__tests__/tool-utils.test.ts` | Embedding config + helper coverage. | tool-utils.ts |
| `frontend/src/lib/ai/services/__tests__/feedback-event-service.test.ts` | Feedback event persistence + memory bridge. | feedback-event-service.ts |
| `frontend/src/lib/ai/services/__tests__/attribution-learning.test.ts` | Attribution rule mining from manual assignments + title keyword extraction. | feedback-event-service.ts |
| `frontend/src/lib/ai/services/__tests__/marketing-service.test.ts` | Marketing CRUD service. | marketing-service.ts |
| `frontend/src/lib/ai/services/__tests__/project-intelligence-summary.test.ts` | Summary `generateObject` output shape. | project-intelligence-summary.ts |
| `frontend/src/lib/ai/services/__tests__/source-sync-summary.test.ts` | Source sync summary generation. | source-sync-summary.ts |
| `frontend/src/lib/ai/services/__tests__/task-training-service.test.ts` | Task training feedback. | task-training-service.ts |
| `frontend/src/lib/executive/__tests__/executive-briefing-workflow.test.ts` | Briefing workflow ordering + selection. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/__tests__/executive-brief-bullets.test.ts` | Bullet selection logic. | executive-brief-bullets.ts |
| `frontend/src/lib/executive/__tests__/executive-briefing-teams-delivery.test.ts` | Teams adaptive card payload. | executive-briefing-teams-delivery.ts |
| `frontend/src/lib/executive/__tests__/executive-intelligence-routing.test.ts` | Briefing routing per scope. | executive-intelligence-routing.ts |
| `frontend/src/lib/executive/__tests__/brandon-daily-update.test.ts` | Brandon daily update generator. | brandon-daily-update.ts |
| `frontend/src/app/api/executive/daily-brief/__tests__/route.test.ts` | Daily-brief API route contract. | daily-brief/route.ts |
| `frontend/src/app/api/executive/brandon-daily-update/__tests__/route.test.ts` | Brandon update API route contract. | brandon-daily-update/route.ts |
| `frontend/src/components/ai-assistant/__tests__/chat-area-formatting.test.ts` | Message formatting (markdown, citations). | chat-formatting.ts |
| `frontend/src/components/ai-assistant/__tests__/voice-input-error.test.ts` | Voice-input error handling. | audio-waveform.tsx |
| `scripts/verify/verify_ai_assistant_eval_suite.mjs` | Master eval suite runner — exercises chat against curated prompts and scores responses. | dogfood_ai_assistant.mjs |
| `npm run rag:verify:inbox-evals:prod` | Production eval bundle for live Outlook inbox/date/triage regressions. Requires `consultMicrosoftExecutiveAssistant`, asserts the nested trace includes `microsoft_graph_live`, and blocks stale semantic/source fallback answers plus direct `getRecentEmails` / retired Outlook cache tools. | assistant-eval-suite.json, handler-v2.ts, microsoft_executive_assistant |
| `npm run rag:verify:source-sync-evals:prod` | Production eval bundle for Teams/source-health regressions. Requires Teams-capable retrieval and explicit source/packet freshness. | assistant-eval-suite.json, source-health.ts |
| `scripts/verify/dogfood_ai_assistant.mjs` | Dogfood loop — sends realistic prompts to live chat route and captures traces for regression. | verify_ai_assistant_eval_suite.mjs |
| `scripts/verify/verify_ai_advisor_quality.mjs` | Scores advisor synthesis quality across intents. | advisor-synthesis.ts |
| `scripts/verify/verify_ai_chat_architecture.mjs` | Architecture invariants (chat route uses orchestrator, no legacy paths). | chat/route.ts |
| `scripts/verify/verify_ai_elements_chat_ui.mjs` | Chat UI rendering correctness (citations, widgets, formatting). | chat-area.tsx |
| `scripts/verify/verify_ai_intelligence_packet_contract.mjs` | Intelligence packet shape contract. | packet-service.ts |
| `scripts/verify/verify_ai_intelligence_compiler_health.mjs` | Compiler queue + freshness health check. | compiler.py |
| `scripts/verify/verify_ai_packet_synthesis_quality.mjs` | Project operating packet quality gate. Rejects placeholder/raw-dump packets, stale-or-failed dominant source mixes, repeated generic card `next_action` values, and missing meeting coverage when meeting sources exist. | operating_summary.py, intelligence page |
| `scripts/verify/verify_ai_memory_contract.mjs` | Memory storage/recall contract, including lifecycle and visibility hydration filters, AI Database memory chunk sync/delete, latest-message extraction, and chat `memory_usage`/post-response scheduling. | ai-memory-service.ts |
| `scripts/verify/verify_ai_assistant_eval_suite.mjs` | Assistant eval runner. Persists per-case traces, tool coverage, backend Deep Agents metadata, and memory-candidate counts into `docs/ai-plan/evals/runs/**`. Includes `project-briefing-union-meeting-coverage`, which fails if Union Collective answers deny meeting transcript coverage when the operating packet exposes it. | assistant-eval-suite.json, handler-v2.ts |
| `scripts/verify/verify_app_expert_eval_suite.mjs` | App Expert golden eval runner. Exercises `/api/intelligence/app-expert` directly against the 50-case app-help suite and requires answer shape, sources, tool trace, and expected route/status text. Production gate: `npm run rag:verify:app-expert-evals:prod`. | app-expert-eval-suite.json, app_expert |
| `scripts/verify/verify_app_expert_prod_smoke.mjs` | Fast App Expert production smoke. Checks active Render backend health, OpenAPI route exposure, Render App Expert env flags when API credentials are available, and one grounded navigation answer before relying on production chat routing. | app_expert, render.yaml |
| `scripts/verify/verify_ai_source_specific_rag_contract.mjs` | Source-specific RAG retrieval contract. | detect-rag-request.ts |
| `scripts/verify/verify_ai_strategist_frontend_conversation.mjs` | End-to-end frontend conversation flow. | chat/route.ts |
| `scripts/verify/verify_ai_assistant_operational_readiness.mjs` | Pre-deploy readiness — all AI deps live. | ai-system-health-panel.tsx |
| `scripts/verify/verify_ai_assistant_response_contract.mjs` | Streamed response shape contract. | chat/route.ts |
| `scripts/verify/verify_ai_assistant_risk_quality.py` | Risk-portfolio answer quality scoring. | project-tools.ts |
| `scripts/verify/verify_ai_assistant_risk_routing.py` | Risk queries route to `getProjectsWithRisks` not `getPortfolioOverview`. | strategist.ts |
| `scripts/verify/verify_ai_assistant_latest_briefing_shape.mjs` | Latest briefing structured-output shape. | executive-briefing-workflow.ts |
| `scripts/verify/verify_ai_admin_comms_guardrails.mjs` | Admin comms guardrails (PII, role scope). | guardrails.ts |
| `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs` | Tool-calling support across providers. | provider-routing.ts |
| `scripts/verify/verify_executive_daily_brief_fresh.mjs` | Daily brief freshness — uses today's data. | daily-brief.ts |
| `scripts/verify/verify_financial_fallback_retrieval.py` | Financial queries fall back to packet/RAG when tools fail. | financial.ts |
| `scripts/verify/verify_financial_numeric_retrieval.py` | Numeric financial answers cite source rows. | financial.ts |
| `scripts/verify/verify_rag_pm_briefing_quality.mjs` | PM briefing RAG quality scoring. | executive-briefing-workflow.ts |
| `scripts/verify/verify_meeting_pipeline_contract.mjs` | Meeting ingestion → segment → embed pipeline contract. | parser.py, embedder.py |
| `scripts/verify/verify_meeting_vectorization_health.mjs` | Meeting embeddings exist for all recent meetings. | embedder.py |
| `scripts/verify/verify_graph_embedding_contract.mjs` | Microsoft Graph (email/Teams) embedding contract. | embedder.py |
| `scripts/verify/verify_teams_conversation_ingestion_contract.mjs` | Teams ingestion shape. | teams_compiler.py |
| `scripts/verify/verify_fireflies_task_integrity.py` | Fireflies-extracted task integrity (project, owner, due date). | task-training-service.ts |
| `scripts/verify/verify_project_attribution_rules.mjs` | Project attribution confidence + low-confidence queue. | email_compiler.py |
| `scripts/verify/verify_render_ai_gateway_health.mjs` | Render-deployed AI gateway connectivity. | providers.ts |
| `scripts/verify/repair_ai_intelligence_current_packet_links.mjs` | Repair script — relinks packet rows orphaned by compiler races. | packet-service.ts |
| `scripts/verify/rag_eval_diff.py` | Diffs RAG eval results between runs to catch regressions. | dogfood_ai_assistant.mjs |

### Documentation

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `docs/architecture/AI-RAG-ARCHITECTURE.md` | This document — authoritative AI/RAG reference. | AI-MASTER-PLAN.md |
| `docs/ai-plan/AI-MASTER-PLAN.md` | Phase-by-phase task tracker for the AI roadmap. | AI-VISION.md |
| `docs/ai-plan/AI-VISION.md` | Long-term vision for proactive intelligence and strategic advisory. | AI-MASTER-PLAN.md |
| `docs/ai-plan/AI-CSUITE-ARCHITECTURE.md` | C-Suite multi-agent architecture design. | strategist.ts, cfo.ts |
| `docs/ai-plan/AI_KNOWLEDGE_BASE.md` | Knowledge base schema and ingestion strategy. | semantic search tools |
| `docs/ai-plan/AI_PERSONA_AND_MEMORY.md` | Persona/memory design — soul, identity, conversation memory. | soul.ts, identity.ts |
| `docs/ai-plan/AI_OPERATING_MODEL_FOR_ALLEATO.md` | Operating model for AI inside Alleato's workflows. | AI-MASTER-PLAN.md |
| `docs/ai-plan/AI_CONSTRUCTION_WORKFLOW_ROADMAP.md` | Roadmap for construction-specific AI workflows. | AI-MASTER-PLAN.md |
| `docs/ai-plan/ALLEATO-AI-PLATFORM-OVERVIEW.md` | Platform overview for stakeholders. | — |
| `docs/ai-plan/ASK-ALLEATO-WIDGET-PLAN.md` | "Ask Alleato" embedded widget plan. | global-ai-widget.tsx |
| `docs/ai-plan/SELF_LEARNING_INTELLIGENCE_ARCHITECTURE.md` | Self-learning feedback loop design. | agent-learning-service.ts |
| `docs/ai-plan/RAG-REFACTOR-TASKS.md` | RAG refactor task list. | — |
| `docs/ai-plan/GATES.md` | Quality gates for AI feature work. | — |
| `docs/ai-plan/ai-plan.md` | Top-level AI plan index. | AI-MASTER-PLAN.md |
| `docs/ai-plan/ai-assistant-generative-ui-build-checklist.md` | Generative UI build checklist. | assistant-widgets.ts |
| `docs/ai-plan/ai-assistant-generative-ui-owner-command-center.md` | Owner command center design. | brandon-daily-update-widget.ts |
| `docs/ai-plan/CODEX_HANDOFF_SUMMARY_AI_CONSTRUCTION_WORKFLOWS.md` | Codex handoff notes. | — |
| `docs/ai-plan/ai-master-plan/prp-ai-master-plan.md` | PRP for AI master plan. | AI-MASTER-PLAN.md |
| `docs/ai-plan/councils/2026-05-08-rag-strategy-council-durable-assistant-strategy.md` | Strategy council notes — durable assistant strategy. | AI-MASTER-PLAN.md |
| `docs/ai-plan/evals/EVAL-SUITE-FIRST-RUN-RESULTS-2026-05-02.json` | Eval suite first-run baseline. | verify_ai_assistant_eval_suite.mjs |
| `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json` | Tool-calling provider matrix snapshot. | verify_ai_tool_calling_provider_matrix.mjs |
