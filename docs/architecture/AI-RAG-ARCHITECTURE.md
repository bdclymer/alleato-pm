# Alleato AI/RAG Architecture

**Authoritative reference for all AI work. Read this before touching any file under `frontend/src/lib/ai/` or `backend/src/services/pipeline/`.**

Last verified: 2026-05-19

---

## 1. Overview

The Alleato AI system acts as a 24/7 business intelligence layer for construction project managers. It answers questions in plain English by pulling from every data source simultaneously — project financials, contracts, meeting transcripts, accounting (Acumatica), emails, Teams messages, and company documents. It does not wait to be asked: Phase 2 will surface proactive alerts when margins erode, schedules slip, or cash flow gaps appear.

The architecture is a multi-agent system (C-Suite model) where a Chief Strategist routes questions to domain-specialist agents (CFO, COO, etc.), each of which has its own system prompt, tool set, and model config. All agents run server-side through Next.js API routes via the Vercel AI SDK.

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
    ├──[project status / budget / risk + selected project]──► Render backend
    │                                                          /api/intelligence/deep-agent/project-status
    │
    ├──[executive briefing without selected project]─────────► Render backend
    │                                                          /api/intelligence/deep-agent/executive-briefing
    │
    ├──[Outlook / Teams / Microsoft operator work]───────────► Render backend
    │                                                          /api/intelligence/microsoft-executive-assistant
    │                                                          (specialist owns live Graph reads and review-only drafts)
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
| 1 | Data Foundation | **Complete** | RAG assistant, 28+ tools, C-Suite architecture (Strategist + CFO live), document ingestion pipeline (PDF/DOCX + Azure OCR for scanned PDFs), Acumatica ERP integration (9 tools), company knowledge base, vector embeddings (109K+ chunks in AI Database), chat persistence, guardrails, daily digest, intelligence packet compiler, contextual retrieval pilot (added 2026-05-17) |
| 2 | Proactive Intelligence | **In progress** | Intelligence packets (project packets now compile through the source-quality-scored `project-operating-summary-v1` path), executive daily briefing (cron-delivered), insight cards (6,900+ rows), packet card feedback, Render-backed Deep Agents bridge for read-heavy project/executive AI assistant answers, backend Microsoft Executive Assistant specialist for Outlook/Teams/calendar operator work, standalone `alleato-ai` tool registry gated into the backend runtime |
| 3 | Workflow Automation | Not started | Auto-classify documents on upload, AI-generated status reports, smart form templates (pre-fill RFIs, change order descriptions) |
| 4 | Strategic Advisory | Not started | Project completion probability models, budget overrun prediction, cross-project pattern recognition, competitive benchmarking |

COO, CHRO, CRO, and VP BD agents are designed (prompts exist at `frontend/src/lib/ai/agents/`) but not wired as live `consult*` tools in the orchestrator. Only `consultCFO` is active.

---

## 4. Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Primary chat API route. All user messages enter here. Calls orchestrator, streams response, persists to `chat_history`. |
| `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | Current `/ai-assistant` server handler. Plans retrieval, persists chat history, and, when `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED=true`, direct-returns successful Render Deep Agents project, executive, and external-research packets before falling back to local AI SDK synthesis. Project/executive Deep Agents responses persist source evidence, memory-candidate widgets, `backend_deep_agent.memory_candidate_count`, and `memory_candidates` before streaming the final direct answer, so persistence failures fail loudly instead of producing an untracked chat response. All direct and fallback response paths persist `response_quality`; normal synthesis also persists `memory_usage` and schedules `runPostResponseTasks()` so conversation summaries and typed memory extraction run after the assistant message is saved. Direct Deep Agents responses schedule the same post-response task path after persistence and emit `ai-assistant-chat` Langfuse traces with `directDeepAgent:*` generation names so direct-return answers are observable even though they bypass `streamText.onFinish`. Deep Agents bridge attempts are recorded in `tool_trace` as the frontend wrapper tools (`backendDeepAgentProjectStatus`, `backendDeepAgentExecutiveBriefing`, `backendDeepAgentResearch`) plus backend-internal packet trace so evals can distinguish real backend routing from local synthesis. When a backend packet is not direct-return eligible, its formatted project, executive, or research context is appended to the local AI SDK synthesis prompt instead of being discarded. Date-based Outlook/inbox plans are now deterministically delegated to `/api/intelligence/microsoft-executive-assistant` before local AI SDK synthesis, and the persisted `consultMicrosoftExecutiveAssistant` trace includes nested backend tool trace sources such as `microsoft_graph_live` so evals can prove the specialist, not a stale synced cache, answered the operator request. Legacy/pre-fetched `getRecentEmails` traces still exist for non-specialist fallback diagnostics but are no longer the Strategist-owned inbox path. |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Converts retrieval context into compact model-visible evidence. For client-project operating packets, renders `packet_json.strategicReport`, category coverage, source-quality counts, and linked evidence totals before card snippets so the model sees the synthesized operating read instead of raw card metadata. If packet coverage includes meetings, the prompt explicitly forbids saying no meeting transcripts surfaced; it must distinguish packet meeting coverage from any fresh direct transcript lookup. For Microsoft operator work, the no-prefetch routing guidance points the Strategist to `consultMicrosoftExecutiveAssistant` instead of direct Outlook/Teams tools. The older structured Outlook inbox renderer remains for legacy/fallback contexts and intentionally surfaces `latestAvailableFallback`, `requestedWindowEmpty`, and `latestAvailableReceivedAt` so stale synced rows cannot masquerade as live Graph results. |
| `frontend/src/lib/ai/agents/strategist.ts` | Primary strategist prompt. The Outlook Operations Protocol now makes the Strategist an orchestrator, not the Microsoft operator: Outlook inbox triage, reply drafting, Teams escalation, calendar review, and Microsoft file context route through `consultMicrosoftExecutiveAssistant`. Brandon/operator inbox prompts must pass `bclymer@alleatogroup.com`, answer simple inbox lookups with a clean list before caveats, use reply/delegate/watch/ignore labels for triage, and keep drafts grounded only in retrieved email/thread facts. |
| `frontend/src/app/api/ai-assistant-v2/deep-agent/route.ts` | `/ai-assistant-v2` fallback route when no LangGraph URL is configured. Authenticates the user, resolves project names from the prompt when no project ID is supplied, calls the Render Deep Agents project/executive endpoints, and returns packet metadata to the v2 UI. |
| `backend/src/services/agents/research_agent/` | Standalone Alleato Deep Agents research module. Uses public web research tools, read-only Alleato PM/RAG/search tools, Deep Agents subagents, packaged runtime skills, optional local installed skill directories, and fail-loud response metadata. Exposed through `/api/intelligence/research`. |
| `backend/src/services/agents/content_builder/` | Isolated Deep Agents content builder ported from `alleato-ai/alleato_ai/subagents/content-builder-agent`. Packages the example memory file, `blog-post` and `social-media` skills, YAML researcher subagent config, Tavily research tool, and Gemini image tools. Exposed through `/api/intelligence/content-builder` behind `DEEP_AGENTS_CONTENT_BUILDER_ENABLED`; uses AI Gateway/OpenAI for the orchestrator and `GOOGLE_API_KEY` for generated images. |
| `backend/src/services/agents/microsoft_executive_assistant/` | Backend Microsoft operator specialist. Exposed through `/api/intelligence/microsoft-executive-assistant`, delegated by the Strategist via `consultMicrosoftExecutiveAssistant`, and available to Render webhook/scheduled triggers. Owns live Outlook inbox reads, synced email/Teams/file search, calendar review, and review-only email/Teams draft payloads. It fails loudly when provider keys, Graph credentials, or source evidence are missing, and its nested tool trace is part of the inbox eval contract. |
| `frontend/src/components/ai-assistant-v2/advisor-chat.tsx` | `/ai-assistant-v2` client surface. Uses the LangGraph SDK only when `NEXT_PUBLIC_LANGGRAPH_API_URL` is configured; otherwise submits through the Render Deep Agents fallback route and displays mode, confidence, source count, and tool-call count. |
| `frontend/src/lib/ai/deep-agent-project-status.ts` | Typed server-side bridge to Render backend Deep Agents endpoints. Owns env gating, request schemas, source-evidence widgets, memory-candidate review widgets, bounded bridge timeout defaults, formatted fallback context for project/executive/research packets, and direct-response eligibility for project/executive/research packets. |
| `backend/src/services/agents/alleato_ai_tools/` | Backend-local port of the standalone `alleato-ai` Deep Agents tools: resolvers, SQL schema/query, RAG/meeting/email/Teams search, recent activity, Acumatica reads, draft-preview actions, prompts, and domain subagent definitions. Subagent SQL and Acumatica tools are attached only when their runtime gates are enabled. |
| `backend/src/services/agents/deep_project_intelligence.py` | Render Deep Agents runtime. The narrow PM tools are always present; the standalone registry is enabled by `DEEP_AGENTS_STANDALONE_TOOLS_ENABLED`, with separate SQL, Acumatica, draft-action, and subagent gates. The runtime also packages Deep Agents core/memory/orchestration skills into the store backend, attaches runtime memory instructions and a checkpointer when dependencies are available, and passes those skills to custom subagents so project/executive agents have the same harness surface as the standalone research agent. When `DEEP_AGENTS_MEMORY_ENABLED=true`, project memory is scoped in the existing memory SQL to team-visible rows or rows owned by the caller, avoiding extra per-page or per-tool permission lookups. Backend LangSmith tracing is controlled by the Render env keys `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`, `LANGSMITH_API_KEY`, and the compatibility `LANGCHAIN_*` aliases; the LangChain/LangSmith dependencies are pinned in `backend/requirements.txt` so trace export behavior changes only through deliberate dependency bumps. |
| `backend/src/services/agents/memory/store.py` | Deep Agents durable memory SQL layer. Loads user/project memory, recalls user/project/team memory, formats memory entries, and owns the owner/team visibility filters that prevent private project memories from leaking across users. |
| `backend/src/services/agents/memory/middleware.py` | Deep Agents memory middleware. Reads `user_id`, `project_id`, and thread config, loads durable memory from `store.py`, and injects the scoped memory context into the runtime. |
| `backend/src/services/agents/memory/tools.py` | Deep Agents memory recall tools exposed to agents. Binds `user_id` and optional `project_id` from runtime config before calling `store.py`, so tool recall follows the same privacy and project scoping rules as startup injection. |
| `frontend/src/lib/ai/orchestrator.ts` | Registers the agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`, and removes direct Microsoft operator tools from the Strategist in favor of `consultMicrosoftExecutiveAssistant`. Adding a new agent: add config here + add `consultXxx` tool + add name to `agents/types.ts`. |
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO-specific tool usage instructions. |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP BD system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union type, `AgentResponse` type. Update when adding agents. |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. Includes the `deep-agents/strategist` option, which routes eligible project, executive, and external-research prompts through the backend Deep Agents strategist harness before local synthesis fallback. |
| `frontend/src/lib/ai/tools/project-tools.ts` | 9 core project tools (portfolio, risk, budget, meetings, search). |
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
| `backend/src/services/pipeline/extractor.py` | Stage 3: Normalizes and upserts decisions, risks, tasks, opportunities. |
| `backend/src/services/pipeline/digest.py` | Stage 4: Daily digest generation (non-blocking). |
| `backend/src/services/pipeline/llm.py` | Backend LLM/embedding client. Current defaults: chat=gpt-4o-mini, embeddings=text-embedding-3-small. |
| `backend/src/services/daily_digest.py` | Daily meeting digest generation. |
| `backend/src/services/ingestion/fireflies_pipeline.py` | Fireflies sync: fetch transcripts → normalize markdown → upload to Supabase Storage → upsert document_metadata → enqueue ingestion job. |
| `backend/src/services/alleato_agent_workflow/guardrails.py` | PII and jailbreak guardrails. |

---

## 5. RAG Tools Reference

All tools are server-side only (Next.js API routes). They receive `userId` for RLS scoping.

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

## 7. Providers and AI Gateway

### Gateway Setup (`providers.ts`)

All LLM calls route through `getLanguageModel(modelId)`. Never call the OpenAI SDK directly from tool or agent code.

```
AI_GATEWAY_API_KEY set → routes to https://ai-gateway.vercel.sh/v1
                         (BYOK: billing stays with OpenAI, observability via Vercel)
AI_GATEWAY_API_KEY absent → direct to OpenAI via OPENAI_API_KEY
                            (local dev fallback only)
```

Model IDs must include the provider prefix: `openai/gpt-5.4`, not `gpt-5.4`. `ensureProviderPrefix()` in `providers.ts` adds it automatically.

The gateway uses `/v1/chat/completions` (not `/v1/responses`) — the Responses API has validation bugs with multi-step tool calling in the gateway.

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

Embeddings are generated via the same OpenAI client (routes through gateway when `AI_GATEWAY_API_KEY` is set). Call `generateEmbedding()` from `tool-utils.ts`, never the raw OpenAI SDK directly in tool code.

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
  └── Local folder → scripts/ingestion/ingest_local_documents.py

→ document_metadata row created/updated
→ DB trigger enqueues fireflies_ingestion_jobs row
→ POST /api/pipeline/process (backend FastAPI)
→ pipeline/orchestrator.py routes by document type:
    Meeting → parser.py (Stage 1A)
    PDF/DOCX/TXT/MD → document_parser.py (Stage 1B)
    CSV/XLSX → financial_parser.py (Stage 1C)
→ embedder.py (Stage 2): chunk (3000 char, 500 overlap) + embed → document_chunks
→ extractor.py (Stage 3): upsert decisions, risks, tasks, opportunities
→ digest.py (Stage 4, non-blocking)
```

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
`source_type='document'`.

### Embedding in the Pipeline

The backend pipeline (`embedder.py`) uses `text-embedding-3-small` (1536 dim) by default per `llm.py`. This is separate from the frontend tools which embed queries using `text-embedding-3-large` (3072 dim) via the gateway. The `document_chunks` table stores halfvec(3072) — meaning the backend embedder must be using large dimensions too (verify `embedder.py` if there is a mismatch between stored and query dimensions).

### Fireflies Sync

Runs automatically every 30 minutes via the `alleato-graph-sync` Render cron. The Fireflies pipeline (`fireflies_pipeline.py`) fetches transcripts, normalizes to markdown, uploads to Supabase Storage (`meetings` bucket), upserts `document_metadata`, and enqueues the ingestion job.

### Graph Embed Candidate Query — post-RAG-split rule

`embed_pending_graph_documents` in `backend/src/services/integrations/microsoft_graph/embed.py` finds `document_metadata` rows that need embedding by filtering on `status IN ('raw_ingested', 'segmented', 'compiled', 'error')` **only**. It must NOT filter by `length(content) > 0` because `SupabaseRagStore.upsert_document_metadata` (in `supabase_helpers.py`) strips `content`/`raw_text` from the app-DB write — full content lives in `rag_document_metadata` in the RAG project. The embed step hydrates content from the RAG DB and marks empty docs as `embedded` so they aren't retried.

Guardrail: when the candidate fetch returns zero docs, `_count_pending_status_rows` re-counts rows still matching the status filter **within the same 365-day date window** as the candidate query. If that count is > 0, the run is logged as `warning` with `unfetchable_pending` in the metadata. The date scoping matters — without it, very old `error`-status rows (pre-existing tech debt that the embed pipeline intentionally skips by date) would generate false alarms on every run. This guardrail catches the failure mode where a column filter goes stale after a schema change (the 2026-05-14 incident where 220 emails sat unembedded for five days because the candidate query still filtered `document_metadata.content`).

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
| Low-confidence email attribution UI | `document_attribution_candidates` review queue has no frontend | — |

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
| `frontend/src/lib/ai/langfuse-trace.ts` | Langfuse observability wrapper. `traceChatCompletion` records each chat completion with tokens, model, session, generation name, and metadata. Streamed AI SDK synthesis uses the default `streamText` generation; direct Render Deep Agents returns pass explicit `directDeepAgent:*` generation names so bypass paths remain traceable. | chat-handler.ts |
| `frontend/src/lib/ai/entitlements.ts` | Feature-flag and tier-gate checks for AI features. | route.ts |
| `frontend/src/lib/ai/session-id.ts` | Session ID UUID coercion helper used by memory/learning services. | conversation-memory.ts, ai-memory-service.ts |

### Intent Routing & Retrieval Planning

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/intent-router.ts` | `AssistantIntent` union and regex-based intent classification. Defines task-write patterns that must beat task-followup routing and external-research patterns for public web/current market/trend prompts that must route to the Render Deep Agents research endpoint instead of internal executive briefing. | intent-classifier.ts, planner.ts |
| `frontend/src/lib/ai/intent-classifier.ts` | LLM-based intent classifier using `generateObject`. Wraps with `withTimeout`. Falls back to regex router on timeout. | intent-router.ts, planner.ts |
| `frontend/src/lib/ai/detect-rag-request.ts` | Source-specific RAG request detection (meetings-on-date, recent-emails, recent-teams, recent-onedrive). Workaround module for AI Gateway `finishReason:other` bug when tools are disabled. | preflights.ts, planner.ts |
| `frontend/src/lib/ai/retrieval/planner.ts` | Builds a `RetrievalPlan` from message + selected project: classifies intent, detects source-specific RAG, picks sub-agent, decides external sources. | intent-router.ts, detect-rag-request.ts, types.ts |
| `frontend/src/lib/ai/retrieval/executor.ts` | Executes a `RetrievalPlan` via the `ExecutorDeps` interface (packet, snapshot, semantic, source-specific, Brandon daily, reusable briefing). Pure of route dependencies. | planner.ts, deps.ts |
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
| `frontend/src/lib/ai/tools/project-tools.ts` | 10 core project tools: portfolio overview, risk analysis, briefing snapshot, financial analysis, budget summary, action items, meetings by date, document search, project details. | orchestrator.ts, financial.ts |
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
| `frontend/src/lib/ai/services/feedback-event-service.ts` | Records AI feedback events and writes corresponding memories. Single entry point from feedback API route. Brandon email draft feedback stores the active voice profile version and points future agents to the companion operating profile and drafting playbook under `docs/ai-plan/`. | agent-learning-service.ts, ai-memory-service.ts |
| `frontend/src/lib/ai/services/task-training-service.ts` | Task-specific feedback training — categorized reasons (wrong_project, wrong_owner, etc.) for task extraction failures. | task-feedback-types.ts |
| `frontend/src/lib/ai/services/marketing-service.ts` | CRUD for marketing intelligence items, content calendar, content assets. Backs CMO agent and marketing routes. | cmo.ts, marketing.ts |
| `frontend/src/lib/ai/services/project-intelligence-summary.ts` | `summarizeProjectIntelligence` — runs `generateObject` over project sources to produce a cited summary with confidence scores. | project-operating-summary-sources.ts |
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
| `frontend/src/lib/executive/executive-briefing-teams-delivery.ts` | Sends the briefing to MS Teams via adaptive cards / chat message API. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-briefing-email.tsx` | React Email template for the briefing email. | resend |
| `frontend/src/lib/executive/daily-brief.ts` | Daily brief composition entry point used by `/api/executive/daily-brief`. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/brandon-daily-update.ts` | Brandon-specific daily update generator — narrower scope than executive brief, owner-focused. | brandon-daily-update-widget.ts |
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
| `backend/src/services/intelligence/operating_summary.py` | Backend-owned project operating summary packet refresh — production path on Render/FastAPI. Selects up to 96 source capsules with recency and source-priority ordering (project context, then recent meetings, Teams, email, structured controls, documents), scores each source as `clean_source`, `raw_dump`, `metadata_only`, or `stale_or_failed`, asks the model for `whatChanged`, `risks`, `openDecisions`, `moneyImpact`, `promisesMade`, `recommendedActions`, and `evidenceQuality`, and fails if the model returns raw headers/transcript dumps instead of synthesis. Writes `packet_json.strategicReport`, `source_coverage.sourceQualityCounts`, and a `qualityGate` so dashboards and agents can reject weak packets. Source citations are supplied as aliases and remapped back to canonical source IDs, accepting `S001`, `S01`, and `S1` formats for the same source. Generated cards use section-specific `next_action` values so the page and assistant do not repeat one generic recommendation across every section. | project-operating-summary-sources.ts, compiler.py |
| `backend/src/services/intelligence/client.py` | OpenAI client wrapped to route through Vercel AI Gateway. Defines `COMPILER_MODEL = gpt-5.5`, retry helper `extract_with_retry`. | teams_compiler.py, email_compiler.py |
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
