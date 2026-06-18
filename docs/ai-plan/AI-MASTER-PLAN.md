# Alleato AI Master Plan

> **Purpose:** Single source of truth for all AI implementation work. Pick up where you left off by checking the task list at the bottom.
>
> **Last updated:** 2026-03-04
> **Status:** Phase 1 nearly complete — C-Suite architecture operational, CFO agent live, document ingestion pipeline built

---

## Vision

Alleato's AI acts as the **ultimate business strategist** — an employee who has been there since day one. It knows every project, every contract, every person, every financial decision, every meeting, and every risk. It doesn't just answer questions — it proactively surfaces insights, predicts problems, and recommends actions.

---

## Task List

### Phase 1: Data Foundation (Current Phase)

#### 1A. Company Knowledge Base

- [x] Design `company_knowledge` table schema (mission, strategy, goals, competitive notes, org structure) → expanded `company_context` + new `company_knowledge` table
- [x] Create Supabase migration for the table → `supabase/migrations/20260304000001_expand_company_context_for_ai.sql`
- [x] Build admin UI for entering company information → `frontend/src/app/(main)/admin/company-knowledge/page.tsx`
- [x] Create RAG tool: `getCompanyKnowledge` → `frontend/src/lib/ai/tools/operational.ts`
- [x] Add company document upload + ingestion (strategy decks, business plans) → Upload API + Documents tab + `document_parser.py` pipeline
- [x] Chunk and embed company documents into vector store → Full pipeline: document_parser → embedder → extractor (auto-triggered on upload)

#### 1B. Expand RAG Tools

- [x] Audit current RAG tools — document what each returns and gaps → `docs/AI-RAG-TOOLS-AUDIT.md`
- [x] Build `getCommitmentsOverview` tool → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getChangeOrderDetails` tool → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getDirectCostsSummary` tool → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getScheduleAnalysis` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getPeopleAndRoles` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getVendorPerformance` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getRFIStatus` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getSubmittalStatus` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getCrossProjectComparison` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build `getHistoricalTrends` tool → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build semantic search tool (wrap existing `search_all_knowledge` RPC) → `frontend/src/lib/ai/tools/operational.ts`
- [x] Build C-Suite agent architecture (Strategist + CFO) → `frontend/src/lib/ai/orchestrator.ts`
- [x] Build CFO agent system prompt → `frontend/src/lib/ai/agents/cfo.ts`
- [x] Build agent types → `frontend/src/lib/ai/agents/types.ts`
- [x] Build Strategist system prompt → `frontend/src/lib/ai/agents/strategist.ts`
- [x] Wire orchestrator into chat route → `frontend/src/app/api/ai-assistant/chat/route.ts`
- [x] Test C-Suite flow end-to-end in the chat assistant — **VERIFIED WORKING** (2026-03-04)

#### 1C. Document Ingestion Pipeline

- [x] Implement PDF text extraction → `backend/src/services/pipeline/document_parser.py` (pypdf)
- [x] Implement DOCX text extraction → `backend/src/services/pipeline/document_parser.py` (python-docx)
- [x] Build chunking strategy with metadata (project, doc type, section, date) → LLM semantic segmentation in `document_parser.py`
- [x] Connect to embedding pipeline (text-embedding-3-small) → Orchestrator auto-routes to `run_document_parser` → `run_embedder` → `run_extractor`
- [x] Store chunks in `block_embeddings` with rich metadata → Reuses existing embedder stage
- [x] Build ingestion trigger (on document upload + batch backfill) → Upload API at `frontend/src/app/api/documents/upload/route.ts`, DB trigger auto-creates pipeline job
- [x] Add `file_name`, `file_path`, `storage_bucket`, `raw_text` columns to `document_metadata` → `supabase/migrations/20260304000002_document_metadata_file_columns.sql`
- [x] Build frontend document upload UI → Documents tab in `frontend/src/app/(main)/admin/company-knowledge/page.tsx`
- [x] Verify "documents" Supabase storage bucket exists → Confirmed via script
- [x] Backfill existing documents into vector store — **No existing PDF/DOCX files to backfill** (upload feature is new). 4,550 vector chunks already exist from meeting transcripts. 10 Fireflies meetings with null status can be re-processed on demand.

#### 1D. Financial Data Enrichment

- [x] Build `getBudgetLineItems` tool (granular, filterable) → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getCostTrends` tool (spending velocity, burn rate) → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getMarginAnalysis` tool (by contract, by project) → `frontend/src/lib/ai/tools/financial.ts`
- [x] Build `getForecastComparison` tool (budget vs. actual vs. forecast) → `frontend/src/lib/ai/tools/operational.ts`
- [x] Test financial tools with real project data → Fixed 2 bugs: `schedule_dependencies` missing `project_id` filter, `prime_contracts` wrong column names (`contract_amount`→`original_contract_value`, `executed_date`→`executed_at`). Best test project: 43 (Westfield Collective, 725 records)

---

### Phase 2: Proactive Intelligence

#### 2A. Automated Insight Generation

- [ ] Design insight generation pipeline (cron → gather data → Claude analysis → store)
- [ ] Implement budget alert insights
- [ ] Implement schedule risk insights
- [ ] Implement commitment gap detection
- [ ] Implement vendor risk scoring
- [ ] Implement cash flow alerts
- [ ] Implement cross-project pattern detection
- [ ] Implement meeting follow-up tracking
- [ ] Build cron job scheduler (daily run for all active projects)
- [ ] Test insight quality and tune prompts

#### 2B. Smart Notifications

- [ ] Design notification preferences schema
- [ ] Build notification center UI (in-app)
- [ ] Implement email digest (daily summary of top insights)
- [ ] Route insights by severity (critical → immediate, warning → daily digest)
- [ ] Add notification preferences to user settings

#### 2C. Dashboard Intelligence

- [ ] Design "AI Briefing" card component
- [ ] Build daily briefing generation (top 3 things to know per project)
- [ ] Add risk heat map to portfolio dashboard
- [ ] Build "Attention Needed" queue with AI-prioritized items
- [ ] Add financial health indicator (AI-assessed score)

---

### Phase 3: Workflow Automation

#### 3A. Document Intelligence

- [ ] Auto-classify documents on upload (spec, submittal, drawing, contract, etc.)
- [ ] Extract key metadata from documents (dates, amounts, parties)
- [ ] Auto-link documents to relevant entities (project, contract, budget line)
- [ ] Generate document summaries on upload

#### 3B. Meeting Intelligence Enhancement

- [ ] Auto-generate meeting agendas from open items + risks + deadlines
- [ ] Auto-create tasks from meeting action items
- [ ] Track commitment fulfillment across meetings
- [ ] Flag recurring issues (same topic 3+ meetings)

#### 3C. Report Generation

- [ ] Build weekly project status report template with AI commentary
- [ ] Build financial summary report with variance explanations
- [ ] Build client-ready executive summary generator
- [ ] Add "Generate Report" action to project dashboard

#### 3D. Smart Templates

- [ ] Pre-fill RFIs based on similar historical RFIs
- [ ] Suggest change order descriptions from change events
- [ ] Auto-draft commitment scopes from contract terms
- [ ] Template submittal review responses

---

### Phase 4: Strategic Advisory

#### 4A. Cross-Project Intelligence

- [ ] Build project comparison engine (current vs. historical baselines)
- [ ] Identify systemic vs. project-specific issues
- [ ] Resource allocation optimization recommendations
- [ ] Portfolio health scoring

#### 4B. Predictive Analytics

- [ ] Project completion probability model
- [ ] Budget overrun prediction
- [ ] Schedule delay prediction
- [ ] Vendor risk scoring model

#### 4C. Strategic Recommendations

- [ ] Quarterly focus area recommendations
- [ ] Resource reallocation suggestions
- [ ] Client relationship health scoring
- [ ] Project type profitability analysis

#### 4D. Competitive Intelligence

- [ ] Company benchmarking data entry UI
- [ ] Performance vs. industry comparison
- [ ] Differentiator tracking
- [ ] Market opportunity identification

---

## What Already Exists (Don't Rebuild This)

| Component | Status | Location |
|-----------|--------|----------|
| RAG Chat Assistant (Claude) | Working | `frontend/src/app/(chat)/ai-assistant/` |
| AI Gateway (multi-model routing) | Working | `frontend/src/lib/ai/providers.ts` |
| Vector embeddings (1536 dim) | Working | `block_embeddings` table |
| Text chunking for search | Working | `search_text_chunks` table |
| AI Insights storage | Schema ready | `ai_insights` table |
| Daily Digest (meeting transcripts) | Working | `backend/src/services/daily_digest.py` |
| Guardrails (PII, jailbreak) | Working | `backend/src/services/alleato_agent_workflow/guardrails.py` |
| Chat persistence | Working | `chat_history`, `chat_messages`, `chat_sessions` tables |
| 6 RAG + 6 financial + 7 Acumatica ERP + 9 operational (28 total) | Working | `project-tools.ts` + `financial.ts` + `acumatica.ts` + `operational.ts` |
| C-Suite Architecture (Strategist + CFO) | Working | `frontend/src/lib/ai/orchestrator.ts` |
| Agent Types & Routing | Working | `frontend/src/lib/ai/agents/types.ts` |
| Document ingestion pipeline (PDF/DOCX → parse → embed → extract) | Working | `backend/src/services/pipeline/document_parser.py` |
| Document upload API + frontend UI | Working | `frontend/src/app/api/documents/upload/route.ts` + company-knowledge page |
| Supabase "documents" storage bucket | Working | 50MB limit, PDF/DOCX/TXT allowed |

**Current AI model config:**

- Chat: `anthropic/claude-sonnet-4.5` via AI Gateway
- Titles: `google/gemini-2.5-flash-lite`
- Artifacts: `anthropic/claude-haiku-4.5`

---

## The Gap: What the AI Doesn't Know Yet

The assistant currently draws from **meeting transcripts and project summaries**. To become a true business strategist, it needs access to everything. Here's what's missing:

### Data the AI Cannot Currently Access

| Data Category | What's Missing | Why It Matters |
|--------------|---------------|----------------|
| **Company Profile** | Company goals, strategy docs, org structure, competitive landscape | Can't give strategic advice without knowing the business |
| **People Intelligence** | Employee roles, skills, workload, performance patterns | Can't optimize resource allocation or flag burnout |
| **Financial Deep Dive** | Line-item budget details, cost trends, margin analysis, cash flow | Currently has summary tools but not granular financial intelligence |
| **Document Content** | Specs, drawings, submittals, RFI content (full text) | Can't answer "what did the structural spec say about load bearing?" |
| **Communication History** | Email threads, Slack messages, client communications | Can't track commitments, sentiment shifts, or dropped balls |
| **Schedule Intelligence** | Task dependencies, critical path, delay patterns | Can't predict schedule slippage or suggest optimization |
| **Historical Patterns** | Past project outcomes, recurring issues, lessons learned | Can't say "last time we had this situation, here's what happened" |
| **External Context** | Market conditions, material prices, regulatory changes | Can't factor in external risks |

---

## Architecture: How It All Fits Together

```
                    ┌─────────────────────────────┐
                    │      USER INTERFACE          │
                    │  Chat / Dashboard / Alerts   │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │      AI ORCHESTRATOR         │
                    │  (Claude via AI Gateway)     │
                    │  - Tool calling              │
                    │  - Context assembly          │
                    │  - Multi-step reasoning      │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────┐ ┌───────▼──────┐ ┌───────▼──────┐
    │  RAG TOOLS    │ │  DATA TOOLS  │ │  ACTION TOOLS│
    │ (read-only)   │ │ (analytics)  │ │ (write-back) │
    │               │ │              │ │              │
    │ - Search docs │ │ - Run queries│ │ - Create task│
    │ - Get context │ │ - Aggregate  │ │ - Send alert │
    │ - Find similar│ │ - Compare    │ │ - Draft email│
    └───────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                 │
    ┌───────▼────────────────▼─────────────────▼───────┐
    │              KNOWLEDGE LAYER                      │
    │                                                   │
    │  ┌────────────┐  ┌──────────┐  ┌──────────────┐ │
    │  │ Vector DB  │  │ Supabase │  │ Document     │ │
    │  │ (semantic) │  │ (struct) │  │ Store (files)│ │
    │  └────────────┘  └──────────┘  └──────────────┘ │
    └──────────────────────────────────────────────────┘
            ▲                ▲                ▲
    ┌───────┴────────────────┴─────────────────┴───────┐
    │              INGESTION PIPELINE                   │
    │                                                   │
    │  Meetings → Chunk → Embed → Store                │
    │  Documents → Extract → Chunk → Embed → Store     │
    │  Financials → Summarize → Embed → Store          │
    │  Emails → Parse → Chunk → Embed → Store          │
    │  Company docs → Parse → Chunk → Embed → Store    │
    └──────────────────────────────────────────────────┘
```

---

## Phases

### Phase 1: Complete the Data Foundation

**Goal:** Get ALL company data accessible to the AI so it has the full picture.
**Timeline:** 2-3 weeks
**Priority:** HIGHEST — nothing else works without this.

#### 1A. Company Knowledge Base

Create a structured way to store and retrieve company-level information that doesn't live in project tables.

**What to build:**

- `company_knowledge` table (or expand `companies`): mission, strategy, competitive advantages, key differentiators, org structure notes
- Company document ingestion: strategy decks, business plans, org charts → chunked + embedded
- Competitive landscape data entry (manual initially, automated later)

**Why first:** The AI literally cannot give strategic advice without knowing what the company is trying to achieve.

#### 1B. Expand RAG Tool Coverage

The assistant has 7 tools. It needs 15-20 to cover the full data model.

**New tools needed:**

| Tool | What It Provides |
|------|-----------------|
| `getCommitmentsOverview` | All commitments with status, amounts, vendor info |
| `getChangeOrderDetails` | Change order history, approval status, cost impact |
| `getDirectCostsSummary` | Direct costs by category, vendor, time period |
| `getScheduleAnalysis` | Task status, critical path, delays, upcoming deadlines |
| `getDocumentSearch` | Full-text search across specs, submittals, RFIs |
| `getPeopleAndRoles` | Who's on which project, their roles, workload |
| `getVendorPerformance` | Vendor history, on-time delivery, quality issues |
| `getCompanyKnowledge` | Company strategy, goals, competitive landscape |
| `getRFIStatus` | Open RFIs, response times, blockers |
| `getSubmittalStatus` | Submittal workflows, approvals pending, overdue |
| `getCrossProjectComparison` | Compare metrics across projects |
| `getHistoricalTrends` | How metrics have changed over time |

#### 1C. Document Ingestion Pipeline

Get the content of specs, submittals, drawings, and other documents into the vector store.

**What to build:**

- Extract text from uploaded PDFs, DOCX, images (OCR)
- Chunk with metadata (project, document type, section, date)
- Embed and store in `block_embeddings`
- Make searchable via the `getDocumentSearch` RAG tool

#### 1D. Financial Data Enrichment

The current `getFinancialAnalysis` tool gives summaries. The AI needs granular access.

**What to build:**

- Budget line-item tool with filtering (by cost code, vendor, status)
- Cost trend analysis tool (spending velocity, burn rate)
- Margin calculator tool (across contracts, by project)
- Forecast comparison tool (budget vs. actual vs. forecast)

---

### Phase 2: Proactive Intelligence

**Goal:** AI doesn't wait for questions — it watches data and surfaces insights automatically.
**Timeline:** 2-3 weeks (after Phase 1)
**Depends on:** Phase 1 (data must be in place)

#### 2A. Automated Insight Generation

Build on the existing `ai_insights` table and daily digest.

**Insight categories to implement:**

| Category | Trigger | Example |
|----------|---------|---------|
| Budget Alert | Cost exceeds % of budget | "Project X is at 87% of budget with 40% of work remaining" |
| Schedule Risk | Tasks overdue or trending late | "3 critical path tasks are behind schedule on Vermillion Rise" |
| Commitment Gap | Approved change orders without matching commitments | "CO-005 approved for $45K but no commitment created" |
| Vendor Risk | Late deliveries, quality issues | "ABC Electric has missed 3 of last 5 deadlines" |
| Cash Flow Alert | Large payments upcoming, revenue gaps | "Next 30 days: $280K in payments due, $120K in receivables" |
| Cross-Project Pattern | Same issue appearing on multiple projects | "Concrete delays affecting 3 active projects" |
| Meeting Follow-up | Action items not completed | "5 action items from Monday's meeting still unresolved" |

**Implementation:**

- Cron job (daily) that runs insight generation across all active projects
- Uses the RAG tools to gather data, Claude to analyze patterns
- Stores in `ai_insights` with severity, financial_impact, urgency
- Surfaces on dashboard + sends notifications for critical items

#### 2B. Smart Notifications

Route insights to the right people at the right time.

**What to build:**

- Notification preferences per user (what they care about, urgency threshold)
- Email digest (daily/weekly) with top insights
- In-app notification center
- Slack integration (optional, high value)

#### 2C. Dashboard Intelligence

Add an AI-powered layer to the existing dashboard.

**What to build:**

- "AI Briefing" card on project dashboard: top 3 things to know today
- Risk heat map across projects
- Financial health indicator (AI-assessed, not just numbers)
- "Attention needed" queue prioritized by AI

---

### Phase 3: Workflow Automation

**Goal:** AI takes action, not just reports. Reduces manual work by automating routine tasks.
**Timeline:** 3-4 weeks (after Phase 2)
**Depends on:** Phase 2 (insights layer must work)

#### 3A. Document Intelligence

- Auto-classify uploaded documents (spec, submittal, drawing, contract)
- Extract key data from documents (dates, amounts, parties, requirements)
- Auto-link documents to relevant projects, contracts, and budget lines
- Generate document summaries

#### 3B. Meeting Intelligence (Enhance Existing)

- Auto-generate meeting agendas from open items, risks, and deadlines
- Post-meeting: auto-create tasks from action items
- Track commitment fulfillment from meeting to meeting
- Flag when the same issue appears in 3+ consecutive meetings

#### 3C. Report Generation

- AI-generated project status reports (weekly/monthly)
- Financial summary reports with AI commentary
- Client-ready executive summaries
- Variance analysis reports with explanations

#### 3D. Smart Templates

- Pre-fill RFIs based on similar past RFIs
- Suggest change order descriptions based on change events
- Auto-draft commitment scopes based on contract terms
- Template responses for common submittal review comments

---

### Phase 4: Strategic Advisory (The Ultimate Goal)

**Goal:** AI operates as a true business strategist with full organizational awareness.
**Timeline:** 4-6 weeks (after Phase 3)
**Depends on:** All previous phases

#### 4A. Cross-Project Pattern Recognition

- "Projects with this profile tend to experience X"
- Compare current project metrics to historical baselines
- Identify systemic issues vs. project-specific ones
- Resource allocation optimization across portfolio

#### 4B. Predictive Analytics

- Project completion probability based on current trajectory
- Budget overrun prediction
- Schedule delay probability
- Vendor risk scoring based on historical performance

#### 4C. Strategic Recommendations

- "Based on your portfolio, here's where to focus this quarter"
- Resource reallocation suggestions
- Client relationship health scoring
- Business development insights (which project types are most profitable)

#### 4D. Competitive Intelligence

- Track competitive landscape (manual input initially, web scraping later)
- Compare company performance to industry benchmarks
- Identify differentiators and areas for improvement
- Market opportunity analysis

---

## Tech Decisions (Locked In)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary LLM | Claude (Anthropic) via AI Gateway | Already integrated, best reasoning |
| Embeddings | text-embedding-3-small (1536 dim) | Already in use, good balance of quality/cost |
| Vector storage | Supabase pgvector | Already in use, no additional infrastructure |
| AI SDK | Vercel AI SDK v6 | Already integrated, streaming, tool calling |
| Chat UI | Custom (existing components) | 29+ components already built |
| Backend processing | Cloudflare Workers | Already scaffolded for embed/extract/ingest |
| Model routing | AI Gateway | Already configured for multi-model |

---

## How to Pick Up Where You Left Off

1. Open this file: `docs/ai-plan/AI-MASTER-PLAN.md`
2. Find the first `[ ]` (unchecked) task
3. That's your next task
4. When done, mark it `[x]` and move to the next one
5. If blocked, mark `[!]` and add a note about why

## Related Strategy Docs

| What | Where | Use When |
|------|-------|----------|
| AI OS gap matrix and adoption roadmap | `docs/ai-plan/AI-OS-GAP-MATRIX.md` | Explaining which OpenClaw/Hermes-style capabilities Alleato should absorb: visible memory, skill library, learning loop, subagents, work queue, and field innovation intake |
| AI OS phase 1 implementation plan | `docs/ai-plan/AI-OS-PHASE-1-IMPLEMENTATION-PLAN.md` | Building the first concrete slice: Memory Center, Skill Library, Teach Alleato intake, and learning review queue |
| Original best-in-class commercial construction AI vision | `docs/ai-plan/ai-plan.md` | Re-grounding on the six-month/gold-standard operating model and first flagship agents |
| AI operating model | `docs/ai-plan/AI_OPERATING_MODEL_FOR_ALLEATO.md` | Defining authority levels, source evidence, guided approvals, Jesse Mode, and adoption strategy |
| Construction workflow roadmap | `docs/ai-plan/AI_CONSTRUCTION_WORKFLOW_ROADMAP.md` | Prioritizing roadmap slices by profit, time, risk, and workflow impact |
| Codex handoff summary | `docs/ai-plan/CODEX_HANDOFF_SUMMARY_AI_CONSTRUCTION_WORKFLOWS.md` | Starting a new Codex implementation thread without re-reading the original conversation |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Start with Phase 1 (Data Foundation) | AI can't be strategic without data access |
| 2026-03-04 | Use existing Supabase pgvector for vectors | No need for separate vector DB, already works |
| 2026-03-04 | Claude as primary LLM | Already integrated, best reasoning for strategic tasks |
| 2026-03-04 | Expand RAG tools before building new features | More tools = smarter assistant immediately |
| 2026-03-04 | C-Suite multi-agent architecture | Specialized agents (CFO first) outperform generalist — deep domain expertise with scoped tools |
| 2026-03-04 | Strategist as orchestrator, not specialist | Strategist routes questions to domain experts, synthesizes responses, adds cross-functional insight |
| 2026-03-04 | Financial tools integrated into base project tools | All tools available to both the CFO specialist and the Strategist fallback path |
| 2026-03-04 | Acumatica ERP tools (7) added for live accounting data | AP/AR aging, cash position, vendor spend, recent bills/invoices, PO summary |
| 2026-03-04 | Operational tools (9) completed Phase 1B/1D | Schedule, people, vendor, RFI, submittal, cross-project, trends, forecast, semantic search |
| 2026-03-04 | Document ingestion pipeline complete (Phase 1C) | PDF/DOCX parser → LLM segmentation → embedder → extractor; auto-routed by orchestrator; upload UI + API + storage bucket ready |

---

## Quick Reference: File Locations

| What | Where |
|------|-------|
| This plan | `docs/ai-plan/AI-MASTER-PLAN.md` |
| RAG assistant | `frontend/src/app/(chat)/ai-assistant/` |
| AI providers config | `frontend/src/lib/ai/providers.ts` |
| Strategist prompt | `frontend/src/lib/ai/agents/strategist.ts` |
| CFO agent prompt | `frontend/src/lib/ai/agents/cfo.ts` |
| Agent types | `frontend/src/lib/ai/agents/types.ts` |
| Orchestrator | `frontend/src/lib/ai/orchestrator.ts` |
| Base RAG tools (6) | `frontend/src/lib/ai/tools/project-tools.ts` |
| Financial tools (6) | `frontend/src/lib/ai/tools/financial.ts` |
| Acumatica ERP tools (7) | `frontend/src/lib/ai/tools/acumatica.ts` |
| Operational tools (9) | `frontend/src/lib/ai/tools/operational.ts` |
| Chat API route | `frontend/src/app/api/ai-assistant/chat/route.ts` |
| Legacy system prompt | `frontend/src/lib/ai/rag-assistant-prompt.ts` (preserved, not used in C-Suite path) |
| RAG tools audit | `docs/AI-RAG-TOOLS-AUDIT.md` |
| User experience vision | `docs/ai-plan/AI-VISION.md` |
| C-Suite architecture design | `docs/ai-plan/AI-CSUITE-ARCHITECTURE.md` |
| AI database tables | `ai_insights`, `ai_tasks`, `ai_models`, `block_embeddings`, `chat_*` |
| Document parser (PDF/DOCX) | `backend/src/services/pipeline/document_parser.py` |
| Pipeline orchestrator (auto-routing) | `backend/src/services/pipeline/orchestrator.py` |
| Document upload API | `frontend/src/app/api/documents/upload/route.ts` |
| Document metadata migration | `supabase/migrations/20260304000002_document_metadata_file_columns.sql` |
| Embedding pipeline | `backend/src/services/pipeline/embedder.py` |
| Ingestion pipeline | `backend/src/services/ingestion/fireflies_pipeline.py` |
| Daily digest | `backend/src/services/daily_digest.py` |
| Guardrails | `backend/src/services/alleato_agent_workflow/guardrails.py` |
| Insight services | `backend/src/services/insights/` |
