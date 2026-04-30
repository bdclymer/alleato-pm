# RAG Pipeline & AI Assistant Tools — Alleato-PM

> Generated: 2026-03-22 | Source: `backend/src/services/pipeline/`, `frontend/src/lib/ai/`

---

## Overview

The AI system has two tightly connected halves:

1. **RAG Ingestion Pipeline** (Python backend) — ingests meeting transcripts and documents into Supabase pgvector, creating vector embeddings for semantic search.
2. **AI Assistant Chat** (Next.js frontend) — a C-Suite Strategist agent that consults 5 domain-specialist sub-agents (CFO, COO, CRO, CHRO, VP BD), each equipped with tools that query Supabase and Acumatica ERP.

---

## Part 1: RAG Ingestion Pipeline

### Entry Point

```
POST /api/documents/trigger-pipeline
  → backend/src/services/pipeline/orchestrator.py → run_full_pipeline(metadata_id)
```

**Input:** `metadata_id` (UUID in `document_metadata` table)
**Tracking:** `fireflies_ingestion_jobs` table (stage: `chunked` → `embedded` → `done` / `error`)

---

### Stage 1 — Parser (Document Type Routing)

The orchestrator inspects `document_metadata` to select a parser:

| Condition | Parser |
|-----------|--------|
| `source == "fireflies"` OR `category in {meeting, transcript, meeting_transcript}` | **Meeting Parser** (`ingestion/fireflies_pipeline.py`) |
| `.pdf`, `.docx`, `.doc` OR non-meeting category | **Generic Document Parser** (`document_parser.py`) |
| `category in {financial, budget, estimate}` AND `.csv`, `.tsv`, `.xls`, `.xlsx` | **Financial Parser** (`financial_parser.py`) |

**Meeting Parser** (primary — all meetings come from Fireflies.ai):
- Parses Fireflies markdown format: `[HH:MM] **Speaker**: text` lines via regex
- Extracts rich sections: Summary, Short Summary, Action Items, Shorthand Bullet, Outline, Bullet Gist, Gist, Notes (with sub-topics)
- Produces `ParsedTranscript` → `transcript_segments`, `rich_sections`, `notes_topics`, `attendees`, `overview`
- Calls `gpt-4o-mini` to segment transcript into semantic units
- **Output:** Writes rows to `meeting_segments` table

---

### Stage 2 — Embedder (`pipeline/embedder.py`)

Reads `meeting_segments`, creates overlapping chunks, batch-embeds, and stores.

**Chunking parameters:**

| Parameter | Value |
|-----------|-------|
| Target chunk size | 3,000 characters (~750 tokens) |
| Overlap | 500 characters (~125 tokens) |
| Split boundary | Sentence boundaries (`[.!?]` + uppercase) |

**Chunk types produced:**

| `doc_type` | Description |
|------------|-------------|
| `chunk` | Overlapping transcript lines (speaker-prefixed) |
| `meeting_summary` | Full meeting-level summary |
| `segment_summary` | Per-segment summary |
| `section_summary` | Fireflies "Summary" section |
| `section_short_summary` | Fireflies "Short Summary" |
| `section_action_items` | Fireflies "Action Items" |
| `section_shorthand` | Fireflies "Shorthand Bullet" |
| `section_outline` | Fireflies "Outline" |
| `section_bullet_gist` | Fireflies "Bullet Gist" |
| `section_gist` | Fireflies "Gist" |
| `notes_topic` | Individual Notes sub-heading chunks |

Each chunk is prefixed: `[Meeting Title] Section Name:` for better retrieval.

**Embedding model:**

| Use | Model | Dimensions | Storage |
|-----|-------|------------|---------|
| Pipeline primary (all chunks) | `text-embedding-3-large` | **3072** | `halfvec(3072)` |
| Segment summaries | `text-embedding-3-large` | 3072 | `meeting_segments.summary_embedding` |
| AI memories (`ai_memories`) | `text-embedding-3-large` | 3072 | `halfvec(3072)` |
| Conversation memory summary | `text-embedding-3-small` | 1536 | `halfvec(1536)` |

> **Critical:** pgvector search functions for pipeline content require `text-embedding-3-large` (3072-dim). Do NOT use `text-embedding-3-small` — dimensions must match.

**Storage:** All chunks are upserted into the `documents` table (NOT `document_chunks`):
```python
{
  "file_id": metadata_id,       # FK → document_metadata
  "content": chunk.content,
  "embedding": [...],            # halfvec(3072)
  "source": "fireflies",
  "project_id": project_id,
  "processing_status": "complete",
  "metadata": {
    "doc_type": "chunk",
    "chunk_index": 0,
    "segment_index": 1,
    "segment_id": "uuid",
    "content_hash": "sha256[:16]"
  }
}
```

Duplicate detection: content-hash map loaded once per `metadata_id` (avoids per-chunk SELECTs).

---

### Stage 3 — Extractor (`pipeline/extractor.py`)

Reads all `meeting_segments`, calls `gpt-4o-mini` (JSON mode, temperature 0.3) to normalize and deduplicate extracted items, then writes structured output.

**Outputs:**

| Table | Content |
|-------|---------|
| `insights` | Normalized decisions, risks, opportunities (type column distinguishes) |
| `tasks` | Action items with assignee, email, due date, priority |

**Priority logic:** `urgent` (health/safety/compliance/hard deadline) → `high` (financial impact >$10k or blocking) → `medium` (standard follow-ups) → `low` (nice-to-haves)

**Due date inference:** Relative dates calculated from meeting date (`"by Friday"` → next Friday, `"ASAP"` → +2 business days).

---

### LLM Models Used in Pipeline

| Stage | Model | Purpose | API |
|-------|-------|---------|-----|
| Stage 1 (segmentation) | `gpt-4o-mini` | Semantic segment detection | Direct OpenAI |
| Stage 2 (embedding) | `text-embedding-3-large` | Vector embeddings (3072-dim) | Direct OpenAI |
| Stage 3 (extraction) | `gpt-4o-mini` | Normalize decisions/risks/tasks | Direct OpenAI |
| Digest generation | `gpt-4o-mini` | Executive post-meeting digest | Direct OpenAI |

> All backend LLM calls use direct `openai.OpenAI(api_key=OPENAI_API_KEY)` — **not** through AI Gateway. The AI Gateway is used by the frontend tools only.

---

### Error Handling & Retry

- Transient DB errors (statement timeout 57014, 502) trigger exponential backoff
- Default: 2 retries (`PIPELINE_TRANSIENT_RETRIES` env var)
- Backoff: `2^(attempt+1)` seconds
- On final failure: `fireflies_ingestion_jobs.stage = "error"`, exception re-raised

---

### Frontend API Routes (Pipeline-Facing)

| Route | Description |
|-------|-------------|
| `POST /api/documents/upload` | Upload to Vercel Blob + create `document_metadata` row |
| `POST /api/documents/trigger-pipeline` | Trigger backend pipeline for a `metadata_id` |
| `POST /api/documents/status` | Check pipeline processing status |
| `POST /api/rag-chat` | RAG-enhanced chat (Next.js route) |
| `POST /api/rag-chatkit` | OpenAI ChatKit-compatible endpoint (proxied to backend port 8051) |
| `POST /api/procore-docs/ask` | Query Procore documentation RAG |
| `GET /api/knowledge` | Knowledge base management |

---

## Part 2: Database Tables

### Pipeline Tables (Ingestion)

| Table | Role |
|-------|------|
| `document_metadata` | Pipeline input — one row per document/meeting; holds content, title, participants, status, source |
| `meeting_segments` | Stage 1 output — semantic segments; each has decisions, risks, tasks, `summary_embedding` |
| `documents` | Stage 2 output — all vector chunks (halfvec 3072); queried by pgvector search |
| `fireflies_ingestion_jobs` | Job tracking — stage: `chunked` → `embedded` → `done` / `error` |
| `insights` | Stage 3 output — decisions, risks, opportunities (type column distinguishes) |
| `tasks` | Stage 3 output — action items with assignee, email, due date, priority |

### AI Assistant / Memory Tables

| Table | Role |
|-------|------|
| `conversations` | One row per chat session; tracks `last_message_at`, project context |
| `chat_history` | All user + assistant messages; stores tool call traces in `metadata` |
| `ai_insights` | AI-generated project insights (risk flags, decisions surfaced by agents) |
| `ai_memories` | Long-term typed memories (project, decision, relationship, risk); `halfvec(3072)` for semantic recall |
| `document_chunks` (source_type='knowledge') | Company-level knowledge base entries; queried by `getCompanyKnowledge` tool (migrated from `company_knowledge` in PR #303) |
| `company_context` | Structured company context (mission, differentiators, values) |

### Project Data Tables (Queried by Tools)

| Table / View | Role |
|-------------|------|
| `projects` | Core project records; phase, name, status, archived |
| `prime_contracts` | Prime contracts per project |
| `prime_contract_financial_summary` | View — rolled-up contract financials per project |
| `prime_contract_change_orders` | Prime contract change orders |
| `change_events` | Raw change events |
| `change_events_summary` | View — change events with status counts |
| `subcontracts` | Subcontractor commitments |
| `purchase_orders` | PO commitments |
| `schedule_of_values` | SOV for billing |
| `sov_line_items` | Individual SOV line items |
| `contract_change_orders` | Change orders against subcontracts/POs |
| `change_order_lines` | Line items within change orders |
| `direct_costs` | Direct cost records |
| `direct_cost_line_items` | Line items within direct costs |
| `owner_invoices` | Owner-facing invoices |
| `v_budget_lines` | View — budget line items with cost code, original/revised/actual/forecast |
| `cost_codes` | Cost code definitions |
| `cost_code_types` | Cost code type categories |
| `budget_line_forecasts` | Budget forecast overrides per line item |
| `budget_snapshots` | Historical budget snapshots |
| `rfis` | Request for Information records |
| `submittals` | Submittal tracking records |
| `schedule_tasks` | Schedule / task records with dependencies |
| `schedule_dependencies` | Task-to-task dependencies |
| `risks` | Project risk register |
| `project_directory_memberships` | Team member ↔ project relationships |
| `vendors` | Vendor / company records |
| `companies` | Directory companies |
| `project_health_dashboard` | View — rolled-up health indicators per project |
| `project_issue_summary` | View — open issue counts per project |

---

## Part 3: pgvector Search Functions

Called via `supabase.rpc(...)`. All require matching embedding dimensions.

| Function | Model Required | Use Case |
|----------|----------------|----------|
| `match_documents` | `text-embedding-3-large` (3072-dim) | General document semantic search |
| `match_meeting_chunks_with_project` | `text-embedding-3-large` (3072-dim) | Project-scoped meeting chunk search |
| `match_memories` | `text-embedding-3-large` (3072-dim) | AI memory retrieval |
| `hybrid_search` | `text-embedding-3-large` (3072-dim) | Semantic + BM25 full-text combined |
| `full_text_search_meetings` | N/A (FTS only) | Keyword meeting search |
| `match_document_metadata_by_summary` | `text-embedding-3-large` (3072-dim) | Semantic match on meeting summaries |
| `search_all_knowledge` | `text-embedding-3-large` (3072-dim) | Search across all knowledge sources |
| `search_knowledge_base` | `text-embedding-3-large` (3072-dim) | Company knowledge base search (removed — knowledge now stored in `document_chunks` with source_type='knowledge'; use `search_document_chunks_by_category` instead) |
| `search_document_chunks_by_category` | `text-embedding-3-large` (3072-dim) | Category-filtered chunk search |
| `search_ai_memories` | `text-embedding-3-large` (3072-dim) | AI memory semantic search |
| `search_team_memories` | `text-embedding-3-large` (3072-dim) | Team-scoped memory search |
| `find_duplicate_memory` | `text-embedding-3-large` (3072-dim) | Dedup check before writing memory |
| `touch_ai_memories` | N/A | Update `last_accessed_at` on recalled memories |

---

## Part 4: AI Assistant Chat Architecture

### Entry Point

```
POST /api/ai-assistant/chat
  → frontend/src/app/api/ai-assistant/chat/route.ts
```

### C-Suite Strategist Architecture

The chat uses a **two-tier agent hierarchy**:

```
User message
  └─ Strategist (gpt-5.4, stopWhen: stepCountIs(7))
       ├─ consultCFO tool  → CFO agent (gpt-5.4-mini, stopWhen: stepCountIs(5))
       ├─ consultCOO tool  → COO agent (gpt-5.4-mini, stopWhen: stepCountIs(5))
       ├─ consultCRO tool  → CRO agent (gpt-5.4-mini, stopWhen: stepCountIs(5))
       ├─ consultCHRO tool → CHRO agent (gpt-5.4-mini, stopWhen: stepCountIs(5))
       ├─ consultVPBD tool → VP BD agent (gpt-5.4-mini, stopWhen: stepCountIs(5))
       └─ Direct tools (base project tools, web search)
```

**Models:**
- Strategist: `openai/gpt-5.4` (via AI Gateway)
- All sub-agents: `openai/gpt-5.4-mini` (via AI Gateway)

**Council Mode:** When `councilMode: true` is passed, the Strategist presents each specialist's response in their own voice (multi-voice output) rather than a single synthesized answer. Active format: `[icon] **[Role]** → [analysis] → --- → ⚡ **Chief Strategist** [1-2 sentence synthesis]`.

**Portfolio risk detection:** `isPortfolioRiskQuery()` forces `consultCFO` first for risk-related questions.

### Memory Injection (Per Request)

Before calling `streamText`, the chat route injects:
- `getMemoriesForSession(userId, sessionId)` → typed memories from `ai_memories`
- `getRecentConversationSummaries(userId, sessionId)` → prior conversation digests
- `buildMemoryContextBlock(...)` → formatted context block prepended to system prompt

### Post-Response Processing (`after()`)

After streaming completes:
- `generateConversationMemory(userId, sessionId, messages)` → writes conversation summary embedding
- `extractAndStoreMemories(userId, sessionId, messages)` → extracts and stores typed memories to `ai_memories`

### Chat Persistence

| Action | Table |
|--------|-------|
| User message received | Insert to `chat_history` |
| Assistant response streamed | Insert to `chat_history` |
| Tool call traces | Stored in `chat_history.metadata` |
| Session context | Updated in `conversations.last_message_at` |

---

## Part 5: AI Assistant Tools

All tools are available to all specialist agents (CFO, COO, CRO, CHRO, VP BD) via `createProjectTools`. The Strategist receives a subset (base tools + consult tools; risk radar tools excluded to force routing through specialists).

### Base Project Tools (`project-tools.ts`)

| Tool | Description | Tables Queried |
|------|-------------|----------------|
| `getPortfolioOverview` | Strategic overview of all active projects: contracts, change events, meeting activity, action items | `projects`, `prime_contract_financial_summary`, `change_events_summary`, `project_issue_summary`, `document_metadata`, `project_health_dashboard` |
| `getProjectsWithRisks` | Risk radar across the portfolio: projects ranked by risk score | `projects`, `risks`, `ai_insights`, `project_issue_summary`, `project_health_dashboard`, `document_metadata` |
| `getProjectRiskAnalysis` | Deep risk analysis for a single project: financial exposure, unpriced CEs, aging RFIs | `projects`, `ai_insights`, `prime_contract_change_orders`, `rfis`, `schedule_tasks`, `v_budget_lines`, `document_metadata` |
| `getFinancialAnalysis` | Financial health of a project or portfolio: budget vs actual, margins, change order exposure | `prime_contract_financial_summary`, `change_events_summary`, `projects` |
| `getProjectBudgetSummary` | Budget line detail: original, revised, actual, forecast per cost code | `projects`, `v_budget_lines`, `prime_contract_financial_summary` |
| `getActionItemsAndInsights` | Open action items, decisions, and risks extracted from meetings | `ai_insights`, `document_metadata`, `rfis` |
| `getMeetingsByDate` | List meetings for a project in a date range | `projects`, `document_metadata` |
| `searchDocuments` | Full-text search across project documents and meeting summaries | `projects`, `document_metadata` |
| `getProjectDetails` | Full project record: team, schedule status, contract value, recent meetings | `projects`, `prime_contracts`, `schedule_tasks`, `rfis`, `document_metadata` |

### Financial Tools (`financial.ts`)

| Tool | Description | Tables Queried |
|------|-------------|----------------|
| `getCommitmentsOverview` | All subcontracts and POs: vendor, status, value, billed, remaining | `subcontracts`, `purchase_orders`, `schedule_of_values`, `vendors`, `sov_line_items` |
| `getChangeOrderDetails` | Prime and commitment change orders with status, amounts, linked change events | `prime_contract_change_orders`, `contract_change_orders`, `change_events`, `contracts`, `change_order_lines` |
| `getDirectCostsSummary` | Direct costs: vendor, amount, status, category | `direct_costs`, `vendors`, `direct_cost_line_items` |
| `getBudgetLineItems` | Budget lines with cost codes, actuals, forecasts, and variance | `v_budget_lines`, `cost_codes`, `cost_code_types`, `budget_line_forecasts`, `direct_cost_line_items` |
| `getCostTrends` | Historical cost trends: budget growth, spending velocity, change order accumulation | `direct_costs`, `owner_invoices`, `budget_snapshots`, `prime_contract_change_orders` |
| `getMarginAnalysis` | Margin analysis: contract value, cost, gross margin, and forecast to complete | `prime_contract_financial_summary`, `v_budget_lines`, `direct_costs`, `schedule_of_values`, `budget_line_forecasts`, `prime_contract_change_orders` |

### Acumatica ERP Tools (`acumatica.ts`) — Live ERP Data

> These tools call the Acumatica REST API directly (cookie-based auth). They provide live accounting data not in Supabase.

| Tool | Description | Data Source |
|------|-------------|-------------|
| `getAPAgingReport` | Accounts payable aging: overdue bills grouped by aging bucket | Acumatica `/APBill` |
| `getARAgingReport` | Accounts receivable aging: outstanding invoices by bucket | Acumatica `/ARInvoice` |
| `getCashPositionReport` | Net cash position: cash inflows vs outflows | Acumatica `/GLTran` or summary |
| `getVendorSpendReport` | Spend by vendor: total billed, outstanding, YTD | Acumatica `/APBill` |
| `getRecentBills` | Recent AP bills: vendor, amount, due date, status | Acumatica `/APBill` |
| `getRecentInvoices` | Recent AR invoices: client, amount, due date, status | Acumatica `/ARInvoice` |
| `getAcumaticaProjectBudget` | Live ERP project budget vs committed costs | Acumatica `/PMProject` |
| `getAcumaticaProjectList` | List of projects in Acumatica ERP | Acumatica `/PMProject` |
| `getPurchaseOrderSummary` | Open purchase orders: vendor, amount, status | Acumatica `/POOrder` |

### Schedule Tools (`schedule-tools.ts`)

| Tool | Description | Tables / Functions |
|------|-------------|-------------------|
| `getScheduleAnalysis` | Schedule health: overdue tasks, milestones at risk, critical path, % complete | `schedule_tasks`, `schedule_dependencies` |

### Forecast Tools (`forecast-tools.ts`)

| Tool | Description | Tables / Functions |
|------|-------------|-------------------|
| `getForecastComparison` | Budget forecast vs actuals comparison per cost code | `v_budget_lines` |

### App Help Tools (`app-help-tools.ts`)

| Tool | Description | Tables / Functions |
|------|-------------|-------------------|
| `searchAppHelp` | Search the Alleato OS help center for instructions; returns articles + matched navigation actions | `help_articles` (static), `getHelpActionsForIds` |

### Operational Tools (`operational.ts`)

| Tool | Description | Tables / Functions |
|------|-------------|-------------------|
| `getPeopleAndRoles` | Team composition for a project: names, roles, companies | `project_directory_memberships` |
| `getVendorPerformance` | Vendor/subcontractor performance: billing rate, change orders, payment status | `subcontracts`, `companies`, `schedule_of_values` |
| `getRFIStatus` | RFI pipeline: open, overdue, ball-in-court, average response time | `rfis` |
| `getSubmittalStatus` | Submittal pipeline: open, overdue, approval status | `submittals` |
| `getCrossProjectComparison` | Side-by-side comparison of 2+ projects across financial and operational KPIs | `projects`, `prime_contract_financial_summary`, `rfis`, `submittals`, `schedule_tasks`, `change_events_summary` |
| `getHistoricalTrends` | Trend lines over time: RFIs opened/closed, COs issued, schedule variance | `rfis`, `submittals`, `prime_contract_change_orders`, `ai_insights`, `v_budget_lines` |
| `getForecastComparison` | Budget forecast vs actuals comparison per cost code | `v_budget_lines` |
| `semanticSearch` | pgvector semantic search across meeting chunks and documents | `search_all_knowledge`, `search_document_chunks_by_category` (RPC) |
| `getCompanyKnowledge` | Retrieve company-level knowledge base entries (lessons learned, best practices, standards) | `company_context`, `document_chunks` (source_type='knowledge') |
| `recallPastConversations` | Search prior AI conversation history for relevant context | `ai_memories` (via `search_ai_memories` RPC) |
| `searchMeetingsByTopic` | Semantic + keyword search across meeting transcripts | `document_metadata`, `full_text_search_meetings` RPC, `match_document_metadata_by_summary` RPC |
| `getMeetingDetails` | Full meeting transcript, sections, action items, and decisions for a specific meeting | `document_metadata`, `insights` |
| `saveToKnowledgeBase` | Write a lesson learned or best practice to the company knowledge base | `document_chunks` (source_type='knowledge') |
| `saveInsight` | Save an AI-generated insight (decision, risk, opportunity) for a project | `ai_insights` |
| `searchMemories` | Search typed AI memories for a user (semantic + filter by type/project) | `search_ai_memories` RPC, `search_team_memories` RPC |
| `writeMemory` | Write a new typed memory to `ai_memories` (project, decision, relationship, risk, etc.) | `ai_memories` (via `writeAiMemory` service) |
| `findProject` | Resolve a project by name or partial match | `projects` |
| `searchEmails` | (Placeholder) Search email communications — not yet fully implemented | — |
| `searchTeamsMessages` | (Placeholder) Search Microsoft Teams messages — not yet fully implemented | — |
| `searchExternalDocuments` | (Placeholder) Search external document sources — not yet fully implemented | — |

### Web Search Tools (`web-search.ts`)

Available to: **Strategist** (directly) and **VP BD** (via `createWebSearchTools`).

| Tool | Description |
|------|-------------|
| `searchWeb` | General web search using Tavily or similar provider |
| `researchCompany` | Research a company: news, financials, recent projects, reputation |
| `searchConstructionMarket` | Search for construction market data: material costs, labor rates, regional trends |

### Strategist Consultation Tools (`orchestrator.ts`)

The Strategist uses these to delegate to sub-agents. Each `consult*` tool creates a new `generateText` call with the specialist's system prompt and full tool set.

| Tool | Routes To | When to Use |
|------|-----------|-------------|
| `consultCFO` | CFO agent | Any financial question: budgets, costs, cash flow, invoicing, contracts, margins |
| `consultCOO` | COO agent | Any operational question: schedule, RFIs, submittals, subcontractor performance, action items |
| `consultCRO` | CRO agent | Any risk question: exposure, unpriced CEs, claim signals, budget overrun risk, "what could go wrong?" |
| `consultCHRO` | CHRO agent | Any people question: team composition, capacity, accountability, lessons learned |
| `consultVPBD` | VP BD agent | Any business development question: pipeline, client relationships, proposals, competitive positioning |

---

## Part 6: Agent Registry

| Agent | Model | Icon | Domain |
|-------|-------|------|--------|
| **Strategist** | `openai/gpt-5.4` | ⚡ | Master orchestrator — synthesizes specialist input, handles general questions directly |
| **CFO** | `openai/gpt-5.4-mini` | 💰 | Financial: budgets, cash flow, margins, contracts, change orders, invoicing, Acumatica ERP |
| **COO** | `openai/gpt-5.4-mini` | 🏗️ | Operations: schedule, RFIs, submittals, procurement, subcontractors, action items, field progress |
| **CRO** | `openai/gpt-5.4-mini` | 🛡️ | Risk: financial exposure, unpriced CEs, contract risk, claim signals, dispute patterns |
| **CHRO** | `openai/gpt-5.4-mini` | 👥 | People: team composition, capacity, accountability, institutional knowledge, lessons learned |
| **VP BD** | `openai/gpt-5.4-mini` | 🤝 | Business development: pipeline, client relationships, revenue trajectory, competitive positioning |

---

## Part 7: Memory System

### Memory Types (`ai_memories` table)

| Type | What It Stores |
|------|----------------|
| `project` | Key facts about a project (status, decisions, risks) |
| `decision` | Strategic decisions made by the team |
| `relationship` | Observations about client, vendor, or team relationships |
| `risk` | Known risks flagged during conversations |
| `preference` | User preferences for how the AI should interact |
| `lesson_learned` | Lessons from past projects |

### Memory Operations

| Service Function | Description |
|-----------------|-------------|
| `writeMemory(userId, type, content, ...)` | Write a new memory; checks duplicates via `find_duplicate_memory` RPC before insert |
| `searchMemories(userId, query, options)` | Semantic search via `search_ai_memories` RPC |
| `searchTeamMemories(userId, query)` | Team-scoped memory search via `search_team_memories` RPC |
| `extractAndStoreMemories(userId, sessionId, messages)` | LLM call to extract memorable facts from a conversation and write them to `ai_memories` |
| `generateConversationMemory(userId, sessionId, messages)` | Summarize conversation and store embedding for future `recallPastConversations` |
| `getMemoriesForSession(userId, sessionId)` | Load relevant memories to inject into Strategist system prompt |
| `getRecentConversationSummaries(userId, sessionId)` | Load recent conversation digests for context injection |

### Memory Embeddings

- `ai_memories.embedding` → `halfvec(3072)` (text-embedding-3-large)
- Conversation summaries → `halfvec(1536)` (text-embedding-3-small)

---

## Part 8: Key Configuration

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Direct OpenAI (backend pipeline only) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway BYOK key (frontend tools) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS in all tool queries |
| `ACCOUNTING_USER` | Acumatica ERP username |
| `ACCOUNTING_PASSWORD` | Acumatica ERP password |
| `PIPELINE_TRANSIENT_RETRIES` | Number of retries for transient DB errors (default: 2) |

### AI Gateway Routing

Frontend tools use the Vercel AI Gateway at `https://ai-gateway.vercel.sh/v1`:
- **BYOK mode:** billing stays with OpenAI, gateway provides observability (cost tracking, latency, token usage)
- Falls back to direct `OPENAI_API_KEY` if `AI_GATEWAY_API_KEY` is not set
- Model strings format: `"openai/gpt-5.4"`, `"openai/gpt-5.4-mini"` (routed automatically)

---

## Summary: Tool Count by Category

| Category | Tool Count |
|----------|-----------|
| Base project tools | 9 |
| Financial tools | 6 |
| Acumatica ERP tools | 9 |
| Operational tools | 17 |
| Web search tools | 3 |
| Strategist consultation tools | 5 |
| **Total** | **49** |
