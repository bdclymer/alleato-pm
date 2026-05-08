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
