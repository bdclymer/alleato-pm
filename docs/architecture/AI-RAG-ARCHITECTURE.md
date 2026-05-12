# Alleato AI/RAG Architecture

**Authoritative reference for all AI work. Read this before touching any file under `frontend/src/lib/ai/` or `backend/src/services/pipeline/`.**

Last verified: 2026-05-07

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
Tool Layer (28 registered tools across 4 files)
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
| 1 | Data Foundation | **Complete** | RAG assistant, 28 tools, C-Suite architecture (Strategist + CFO live), document ingestion pipeline (PDF/DOCX), Acumatica ERP integration (7 tools), company knowledge base, vector embeddings (24K+ chunks), chat persistence, guardrails, daily digest |
| 2 | Proactive Intelligence | Not started | Automated insight generation (budget alerts, schedule risk, vendor risk), morning briefing, smart notifications, dashboard AI cards |
| 3 | Workflow Automation | Not started | Auto-classify documents on upload, AI-generated status reports, smart form templates (pre-fill RFIs, change order descriptions) |
| 4 | Strategic Advisory | Not started | Project completion probability models, budget overrun prediction, cross-project pattern recognition, competitive benchmarking |

COO, CHRO, CRO, and VP BD agents are designed (prompts exist at `frontend/src/lib/ai/agents/`) but not wired as live `consult*` tools in the orchestrator. Only `consultCFO` is active.

---

## 4. Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Primary chat API route. All user messages enter here. Calls orchestrator, streams response, persists to `chat_history`. |
| `frontend/src/lib/ai/orchestrator.ts` | Registers the agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`. Adding a new agent: add config here + add `consultXxx` tool + add name to `agents/types.ts`. |
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO-specific tool usage instructions. |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP BD system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union type, `AgentResponse` type. Update when adding agents. |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. |
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
| `backend/src/services/pipeline/document_parser.py` | Stage 1B: PDF/DOCX text extraction → LLM segmentation → meeting_segments. |
| `backend/src/services/pipeline/financial_parser.py` | Stage 1C: CSV/XLSX → document_rows with text summaries for embedding. |
| `backend/src/services/pipeline/embedder.py` | Stage 2: Chunking (3000 char target, 500 overlap) + embedding via text-embedding-3-small. |
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
| `getRecentEmails` | outlook_email_intake (by date) | Recent emails — use for "what emails today?" questions |
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

### Primary Table: `document_chunks`

| Property | Value |
|----------|-------|
| Embedding model | `text-embedding-3-large` |
| Dimensions | `halfvec(3072)` |
| Row count | 24K+ |
| Index | pgvector cosine similarity (IVFFlat or HNSW) |
| Content types | Meeting transcripts, emails, Teams messages, OneDrive docs, company documents |

### Search RPCs

| RPC | Usage |
|-----|-------|
| `search_document_chunks` | Primary semantic search over all content in `document_chunks`. Accepts `query_embedding` (halfvec 3072), optional `category` filter, `match_count`. |
| `search_document_chunks_by_category` | Filtered variant — same as above with mandatory category. |
| `search_all_knowledge` | Searches structured intelligence tables: decisions, risks, opportunities, ai_insights. |
| `search_knowledge_base` | Searches `company_knowledge` table only. |

### Secondary Embedding Table

`conversation_memories.embedding` uses `vector(1536)` with `text-embedding-3-small`. This is the legacy short-term memory table — do not change its dimensions without a matching pgvector index migration. The `EMBEDDING` constants in `tool-utils.ts` are the source of truth.

### Embedding Config (tool-utils.ts)

```ts
EMBEDDING.LARGE = { model: "text-embedding-3-large", dimensions: 3072 }  // document_chunks, document_metadata, ai_memories, knowledge tables
EMBEDDING.SMALL = { model: "text-embedding-3-small", dimensions: 1536 }  // conversation_memories (legacy)
```

Always use `generateEmbedding(openai, input, EMBEDDING.LARGE)` for new tools querying `document_chunks`.

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
2. **Sub-agent delegation**: For financial questions (detected by keyword matching in `orchestrator.ts`), the Strategist calls `consultCFO`, which spawns a CFO `ToolLoopAgent` with its own system prompt and financial tools, then returns the CFO's analysis.

### Currently Live Agents

| Agent | Status | System Prompt | Model | Trigger |
|-------|--------|---------------|-------|---------|
| Strategist | Live (orchestrator) | `agents/strategist.ts` | `openai/gpt-5.4` (user-selectable) | All messages |
| CFO | Live (`consultCFO` tool) | `agents/cfo.ts` | `openai/gpt-5.4-mini` | Financial keywords |

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
    PDF/DOCX/TXT → document_parser.py (Stage 1B)
    CSV/XLSX → financial_parser.py (Stage 1C)
→ embedder.py (Stage 2): chunk (3000 char, 500 overlap) + embed → document_chunks
→ extractor.py (Stage 3): upsert decisions, risks, tasks, opportunities
→ digest.py (Stage 4, non-blocking)
```

### Embedding in the Pipeline

The backend pipeline (`embedder.py`) uses `text-embedding-3-small` (1536 dim) by default per `llm.py`. This is separate from the frontend tools which embed queries using `text-embedding-3-large` (3072 dim) via the gateway. The `document_chunks` table stores halfvec(3072) — meaning the backend embedder must be using large dimensions too (verify `embedder.py` if there is a mismatch between stored and query dimensions).

### Fireflies Sync

Runs automatically every 30 minutes via the `alleato-graph-sync` Render cron. The Fireflies pipeline (`fireflies_pipeline.py`) fetches transcripts, normalizes to markdown, uploads to Supabase Storage (`meetings` bucket), upserts `document_metadata`, and enqueues the ingestion job.

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
| `frontend/src/lib/ai/langfuse-trace.ts` | Langfuse observability wrapper. `traceChatCompletion` records each chat completion with tokens, model, session, and metadata. | chat-handler.ts |
| `frontend/src/lib/ai/entitlements.ts` | Feature-flag and tier-gate checks for AI features. | route.ts |
| `frontend/src/lib/ai/session-id.ts` | Session ID UUID coercion helper used by memory/learning services. | conversation-memory.ts, ai-memory-service.ts |

### Intent Routing & Retrieval Planning

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/intent-router.ts` | `AssistantIntent` union and regex-based intent classification. Defines task-write patterns that must beat task-followup routing. | intent-classifier.ts, planner.ts |
| `frontend/src/lib/ai/intent-classifier.ts` | LLM-based intent classifier using `generateObject`. Wraps with `withTimeout`. Falls back to regex router on timeout. | intent-router.ts, planner.ts |
| `frontend/src/lib/ai/detect-rag-request.ts` | Source-specific RAG request detection (meetings-on-date, recent-emails, recent-teams, recent-onedrive). Workaround module for AI Gateway `finishReason:other` bug when tools are disabled. | preflights.ts, planner.ts |
| `frontend/src/lib/ai/retrieval/planner.ts` | Builds a `RetrievalPlan` from message + selected project: classifies intent, detects source-specific RAG, picks sub-agent, decides external sources. | intent-router.ts, detect-rag-request.ts, types.ts |
| `frontend/src/lib/ai/retrieval/executor.ts` | Executes a `RetrievalPlan` via the `ExecutorDeps` interface (packet, snapshot, semantic, source-specific, Brandon daily, reusable briefing). Pure of route dependencies. | planner.ts, deps.ts |
| `frontend/src/lib/ai/retrieval/deps.ts` | Wires `ExecutorDeps` to real loaders (Supabase + intelligence packet service). Call once per request. | executor.ts, packet-service.ts |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Renders the `RetrievalContext` (packet, semantic results, external rows) into the agent system prompt blocks. | executor.ts, types.ts |
| `frontend/src/lib/ai/retrieval/source-specific-rag.ts` | Source-specific RAG retrieval extracted from chat route. Loads rows from `document_metadata` for meetings/emails/teams/onedrive. | preflights.ts, detect-rag-request.ts |
| `frontend/src/lib/ai/retrieval/reusable-briefing.ts` | Loads cached reusable briefing context for a session so multi-turn briefing flows reuse retrieval. | executor.ts |
| `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts` | Re-ranks retrieval results using stored boost/downrank weights per (query_signature, source). Backs admin retrieval feedback. | feedback-event-service.ts |
| `frontend/src/lib/ai/retrieval/types.ts` | `RetrievalPlan`, `RetrievalContext`, `SubAgent`, `ResponseFormat`, `ExternalSource` types — shared by planner/executor. | planner.ts, executor.ts |
| `frontend/src/lib/ai/intelligence/packet-service.ts` | Loads and resolves the project intelligence packet (cards, evidence, confidence, freshness) from `intelligence_packets` and related tables. | deps.ts, types.ts, compiler.py |
| `frontend/src/lib/ai/intelligence/advisor-synthesis.ts` | Synthesizes packet cards into a final advisor-style answer per intent. Joins moves and falls back to source-verification phrasing. | packet-service.ts, types.ts |
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
| `frontend/src/lib/ai/services/conversation-memory.ts` | After each chat response, summarizes the conversation with gpt-4.1-nano, embeds (3072 dims), upserts into `memories` keyed by session. Provides `recallPastConversations`. | memory-extraction.ts, operational.ts |
| `frontend/src/lib/ai/services/ai-memory-service.ts` | Core read/write layer for `ai_memories`. Deduplicates near-duplicates (sim > 0.88), commitment bridge to `ai_insights`, team-visibility scoping. | conversation-memory.ts, memory-extraction.ts |
| `frontend/src/lib/ai/services/memory-extraction.ts` | Extracts typed memories (fact, preference, lesson, commitment, context) post-conversation via gpt-4.1-nano. Called from chat route `after()` hook. | ai-memory-service.ts |
| `frontend/src/lib/ai/services/agent-learning-service.ts` | Records agent-learning events (thumbs_down, admin_feedback, eval_failure) and trains few-shot examples for future routing. | feedback-event-service.ts, task-training-service.ts |
| `frontend/src/lib/ai/services/feedback-event-service.ts` | Records AI feedback events and writes corresponding memories. Single entry point from feedback API route. | agent-learning-service.ts, ai-memory-service.ts |
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
| `backend/src/services/intelligence/compiler.py` | Job/staging helpers — durable control plane between RAG sources (`document_metadata`, `document_chunks`) and packet tables. Job queue contract for intelligence compilation. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/teams_compiler.py` | Teams direct-message conversation compiler. Runs at end of every graph sync (batch 25, 170s budget). Writes to `project_insights`, `tasks`, `insights`, `source_signal_candidates`. | compiler.py, prompts.py, client.py |
| `backend/src/services/intelligence/email_compiler.py` | Outlook email thread compiler. Mirrors Teams compiler but operates on threads (grouped by `conversation_id`), anchors artifacts to thread head. | compiler.py, prompts.py |
| `backend/src/services/intelligence/operating_summary.py` | Backend-owned project operating summary packet refresh — production path on Render/FastAPI. | project-operating-summary-sources.ts |
| `backend/src/services/intelligence/client.py` | OpenAI client wrapped to route through Vercel AI Gateway. Defines `COMPILER_MODEL = gpt-5.5`, retry helper `extract_with_retry`. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/prompts.py` | Prompt templates and JSON schemas for the Teams/email compilers. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/__init__.py` | Package init. | — |

### Evals & Testing

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/__tests__/intent-router.test.ts` | Unit tests for intent classification regex patterns and task-write precedence. | intent-router.ts |
| `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts` | Unit tests for packet loading and confidence resolution. | packet-service.ts |
| `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts` | Unit tests for synthesized advisor responses per intent. | advisor-synthesis.ts |
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
| `scripts/verify/dogfood_ai_assistant.mjs` | Dogfood loop — sends realistic prompts to live chat route and captures traces for regression. | verify_ai_assistant_eval_suite.mjs |
| `scripts/verify/verify_ai_advisor_quality.mjs` | Scores advisor synthesis quality across intents. | advisor-synthesis.ts |
| `scripts/verify/verify_ai_chat_architecture.mjs` | Architecture invariants (chat route uses orchestrator, no legacy paths). | chat/route.ts |
| `scripts/verify/verify_ai_elements_chat_ui.mjs` | Chat UI rendering correctness (citations, widgets, formatting). | chat-area.tsx |
| `scripts/verify/verify_ai_intelligence_packet_contract.mjs` | Intelligence packet shape contract. | packet-service.ts |
| `scripts/verify/verify_ai_intelligence_compiler_health.mjs` | Compiler queue + freshness health check. | compiler.py |
| `scripts/verify/verify_ai_memory_contract.mjs` | Memory storage/recall contract. | ai-memory-service.ts |
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
