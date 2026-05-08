# AI RAG Tools Audit

**Original audit date:** 2026-03-04
**Last updated:** 2026-03-23
**Audited by:** Claude Code
**Scope:** All AI assistant tools in the Alleato PM codebase

---

## Executive Summary

The AI assistant has undergone a complete architectural transformation since the March 4 audit. What was **6 tools** in a flat RAG pattern is now a **C-Suite Strategist + Specialist Agent** pattern with **~50 tools** across 4 files. The Strategist routes questions to domain specialists (CFO, COO, CRO, CHRO, VP BD), each with their own dedicated tool suite. A live Acumatica ERP integration (9 tools) and Microsoft 365 integration (emails, Teams, OneDrive) have been added. The semantic search and commitment data gaps that were the #1 and #2 P1 recommendations are now implemented.

**Key remaining gaps:** Daily logs/field operations, punch list, drawing log, specification tracking, and the `get_priority_insights` RPC bug likely still exists in the legacy `getActionItemsAndInsights` tool.

---

## Architecture Overview

### Current Architecture (March 2026): Strategist + Specialists

```
User Message
  -> POST /api/ai-assistant/chat/route.ts
    -> createStrategistTools(userId, { onTrace })      [orchestrator.ts]
         ├── consultCFO   → consultAgent("cfo",  ...)  → CFO agent with financialTools + acumaticaTools
         ├── consultCOO   → consultAgent("coo",  ...)  → COO agent with operationalTools
         ├── consultCRO   → consultAgent("cro",  ...)  → CRO agent with risk/operational tools
         ├── consultCHRO  → consultAgent("chro", ...)  → CHRO agent with people/org tools
         ├── consultVPBD  → consultAgent("vpbd", ...)  → VP BD agent with BD/pipeline tools
         └── baseTools    (project-tools.ts, minus portfolio/risk tools)
    -> streamText() with ragAssistantSystemPrompt
    -> Strategist routes questions to specialists or answers directly
    -> Specialist agent calls its own tools -> Supabase/Acumatica queries -> returns analysis
    -> Strategist synthesizes and responds
    -> Response + tool trace persisted to chat_history
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/ai/orchestrator.ts` | `createStrategistTools()`, `consultAgent()`, specialist agent definitions |
| `frontend/src/lib/ai/tools/project-tools.ts` | Core tools: portfolio, risk analysis, financial analysis, budget, action items, meetings, search, project details |
| `frontend/src/lib/ai/tools/financial.ts` | CFO tools: commitments, change orders, direct costs, budget lines, cost trends, margin analysis |
| `frontend/src/lib/ai/tools/operational.ts` | COO tools: schedule, people, vendor performance, RFI, submittal, semantic search, Microsoft 365, memory, company knowledge |
| `frontend/src/lib/ai/tools/acumatica.ts` | Live ERP tools: AP/AR aging, cash position, vendor spend, POs, bills, invoices |
| `frontend/src/lib/ai/tools/web-search.ts` | Web search (available directly to Strategist for external research) |
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Chat route — uses `createStrategistTools`, `stepCountIs(7)` |
| `frontend/src/lib/ai/providers.ts` | Model configuration |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | System prompt |

### Architecture Change from March 4

The original audit found `createProjectTools()` with 6 tools wired directly into the chat route. As of March 2026:

- The chat route uses `createStrategistTools()` from `orchestrator.ts`
- The Strategist has access to `consultCFO`, `consultCOO`, `consultCRO`, `consultCHRO`, `consultVPBD` tools that delegate to specialist agents
- Portfolio/risk tools (`getPortfolioOverview`, `getProjectsWithRisks`, `getProjectRiskAnalysis`) are **removed from the Strategist's direct tools** to force routing through the appropriate specialist
- Base project tools (budget, action items, meetings, search) remain accessible directly to the Strategist

---

## Tool Inventory

### Group 1: project-tools.ts (Core / Strategist-accessible)

| Tool | Purpose | Status |
|------|---------|--------|
| `getProjectBudgetSummary` | Budget summary from v_budget_lines vs contract values | Unchanged since March 4 |
| `getActionItemsAndInsights` | Action items, unresolved insights, overdue RFIs | Unchanged — known RPC bug still present |
| `searchDocuments` | Full-text search of meeting transcripts and documents | Unchanged — keyword only |
| `getFinancialAnalysis` | Financial analysis from prime contract data | Unchanged — prime contracts only |
| `getMeetingsByDate` | Meetings filtered by date range | NEW since March 4 |
| `getProjectDetails` | Detailed project info including schedule, issues, milestones | NEW since March 4 |
| `getProjectsWithRisks` | Portfolio-level risk radar across all active projects | NEW since March 4 |
| `getPortfolioOverview` | Strategic portfolio overview (routed via CRO/COO specialists) | Unchanged but now gated |
| `getProjectRiskAnalysis` | Deep risk analysis for a single project (routed via CRO) | Unchanged but now gated |

---

### Group 2: financial.ts (CFO Specialist Tools)

These tools are available to the CFO agent when `consultCFO` is invoked.

| Tool | Purpose | Tables/Sources |
|------|---------|----------------|
| `getCommitmentsOverview` | All subcontracts and POs with values, COs, billed/remaining | `commitments_unified`, `subcontracts_with_totals`, `purchase_orders_with_totals` |
| `getChangeOrderDetails` | CO details including commitment CO lines, approval dates | `change_orders`, commitment CO tables |
| `getDirectCostsSummary` | Direct costs by type/vendor/time period with cost codes | `direct_costs`, `direct_cost_line_items` |
| `getBudgetLineItems` | Granular budget lines with original/revised/forecast/variance | `v_budget_lines`, `budget_line_forecasts` |
| `getCostTrends` | Monthly spend trends, burn rate, cost acceleration | `budget_snapshots`, direct cost dates, invoice data |
| `getMarginAnalysis` | Revenue vs cost comparison, margin trend, where margin is won/lost | prime contracts, commitments, direct costs |

**Addresses these March 4 gaps:** P1 commitments tool ✅, P2 direct costs tool ✅, P2 budget forecast ✅, P3 invoice status (via Acumatica) ✅

---

### Group 3: acumatica.ts (CFO Specialist Tools — Live ERP)

Live data from the Acumatica ERP system. Available to the CFO agent.

| Tool | Purpose |
|------|---------|
| `getAPAgingReport` | AP aging: outstanding vendor bills by days overdue |
| `getARAgingReport` | AR aging: outstanding customer invoices by days overdue |
| `getCashPositionReport` | Net cash flow, AR received vs AP paid, rolling window |
| `getVendorSpendReport` | Vendor invoice totals, outstanding amounts, payment status |
| `getRecentBills` | Latest AP bills with vendor, amount, balance, due date |
| `getRecentInvoices` | Latest AR invoices with amounts, balances, due dates |
| `getAcumaticaProjectBudget` | Full project budget from ERP with original/revised/actuals |
| `getAcumaticaProjectList` | All ERP projects with high-level financial totals |
| `getPurchaseOrderSummary` | POs by vendor with totals, billed amounts, status |

**Note:** Auth is cookie-based (POST /entity/auth/login). Never use OData `$filter` — causes HTTP 500. Filter in-memory. Company name must be exact: `"Alleato Group LLC"`.

---

### Group 4: operational.ts (COO Specialist Tools + Knowledge/Memory)

These tools are available to the COO agent and some are also accessible to other specialists.

#### Operational Data Tools

| Tool | Purpose | Tables/Sources |
|------|---------|----------------|
| `getScheduleAnalysis` | Schedule health: overdue tasks, milestones at risk, completion % | `schedule_tasks` |
| `getPeopleAndRoles` | Project directory: team members, roles, companies, contacts | `project_directory_memberships`, `companies`, `people` |
| `getVendorPerformance` | Active vendors, contract values, performance across portfolio | `subcontractors`, `vendors`, `companies` |
| `getRFIStatus` | RFI status: overdue, response times, ball-in-court distribution | `rfis` |
| `getSubmittalStatus` | Submittal pipeline: overdue, approval status, lead times | `submittals`, `submittal_project_dashboard` |
| `getCrossProjectComparison` | Side-by-side comparison of budget/schedule/RFI/submittal across projects | Multiple tables |
| `getHistoricalTrends` | How project metrics have changed over time | `rfis`, `submittals`, `change_orders` |
| `getForecastComparison` | Original vs revised vs actual costs line-by-line | `v_budget_lines`, cost tables |

#### Semantic / Knowledge Tools

| Tool | Purpose | Sources |
|------|---------|---------|
| `semanticSearch` | Semantic vector search across ALL project knowledge | `match_meeting_chunks`, `match_meeting_segments`, `search_all_knowledge` RPCs |
| `getCompanyKnowledge` | Company-level context: mission, OKRs, strategy, org structure | Company knowledge base table |
| `searchMeetingsByTopic` | Semantic meeting search with speaker quotes, decisions, risks, tasks | `document_metadata`, `document_chunks` |
| `getMeetingDetails` | Full meeting details: digest, segments, speaker topics, decisions | `document_metadata`, meeting segments |
| `saveToKnowledgeBase` | Save lessons learned, best practices to company KB | Company knowledge base |
| `saveInsight` | Save structured insight extracted from meetings/conversations | `ai_insights` |

#### Microsoft 365 Integration Tools

| Tool | Purpose | Sources |
|------|---------|---------|
| `searchEmails` | Semantic search across synced Outlook email threads | `document_metadata` (category: outlook_email) |
| `searchTeamsMessages` | Semantic search across Teams channel messages and DMs | `document_metadata` (category: teams_message, type: teams_dm) |
| `searchExternalDocuments` | Search OneDrive files and uploaded PDFs/Word docs | `document_metadata` (source: microsoft_graph) |

#### Memory Tools

| Tool | Purpose |
|------|---------|
| `recallPastConversations` | Search prior conversation memories for this user |
| `searchMemories` | Search durable memories about this user (preferences, project facts) |
| `writeMemory` | Store a durable memory about this user for future sessions |

#### Utility / Query Tools

| Tool | Purpose |
|------|---------|
| `findProject` | Look up project by name (partial match) or list all active projects |
| `queryBudgetData` | Raw budget line query (cost codes, original/changes/revised/committed) |
| `queryChangeOrders` | Raw CO query (number, title, status, amount) |
| `queryCommitments` | Raw commitment query (type, title, status, contract numbers) |
| `queryDirectCosts` | Raw direct cost query (type, amount, vendor, date) |
| `queryScheduleTasks` | Raw schedule task query (name, dates, % complete, WBS) |
| `queryDocumentRows` | Query structured rows extracted from uploaded spreadsheets/docs |

---

### Group 5: Strategist-level Specialist Consultations (orchestrator.ts)

The Strategist calls these "consult" tools, which spawn specialist agents:

| Tool | Specialist | Delegates to |
|------|-----------|--------------|
| `consultCFO` | Chief Financial Officer | financialTools + acumaticaTools |
| `consultCOO` | Chief Operating Officer | operationalTools (schedule, RFI, submittal, vendor, people, forecast) |
| `consultCRO` | Chief Risk Officer | risk + operational tools |
| `consultCHRO` | Chief Human Resources Officer | people/org tools |
| `consultVPBD` | VP Business Development | BD/pipeline tools |

---

## Gap Analysis: March 4 Recommendations vs Current Status

### P0: Critical Fixes

| Recommendation | Status |
|---------------|--------|
| Fix `getActionItemsAndInsights` to return `action_items` and `bullet_points` | ⚠️ **Likely still unresolved** — tool unchanged since March 4 |
| Add semantic search to `searchDocuments` | ✅ **Implemented** — `semanticSearch` tool added in operational.ts using `match_meeting_chunks` RPC |
| Fix `get_priority_insights` RPC bug | ⚠️ **Likely still unresolved** — `getActionItemsAndInsights` not rewritten |

### P1: New Tools (Highest Value)

| Recommendation | Status |
|---------------|--------|
| `getCommitmentsSummary` (commitments/subcontracts/POs) | ✅ **Implemented** as `getCommitmentsOverview` in financial.ts |
| `getProjectTeamAndDirectory` (people, companies, roles) | ✅ **Implemented** as `getPeopleAndRoles` in operational.ts |
| `getSubmittalStatus` | ✅ **Implemented** in operational.ts |
| `semanticSearch` wrapper | ✅ **Implemented** in operational.ts |

### P2: New Tools (High Value)

| Recommendation | Status |
|---------------|--------|
| `getDailyLogSummary` (daily logs, manpower, equipment) | ❌ **Not implemented** |
| `getPunchListStatus` (punch items) | ❌ **Not implemented** |
| `getBudgetForecast` (forecasts, EAC, snapshots) | ✅ **Implemented** as `getCostTrends` + `getForecastComparison` in financial.ts |
| `getDirectCostsSummary` | ✅ **Implemented** in financial.ts |

### P3: Nice-to-Have Tools

| Recommendation | Status |
|---------------|--------|
| `getDrawingLog` (drawings, revisions) | ❌ **Not implemented** |
| `getSpecificationStatus` (specs, sections) | ❌ **Not implemented** |
| `getMeetingAnalytics` (frequency, categories, participation) | ✅ **Partially implemented** via `searchMeetingsByTopic` and `getMeetingDetails` |
| `getInvoiceStatus` (invoice aging, outstanding amounts) | ✅ **Implemented** via Acumatica: `getARAgingReport`, `getRecentInvoices` |

---

## New Capabilities Not in March 4 Audit

These are additions that go beyond what was recommended:

| Capability | Tool(s) | Impact |
|-----------|---------|--------|
| **C-Suite Specialist Routing** | `consultCFO`, `consultCOO`, `consultCRO`, etc. | Questions get domain-expert treatment, not generic RAG responses |
| **Live Acumatica ERP data** | 9 acumatica tools | Real AP/AR aging, cash flow, POs from live accounting system |
| **Microsoft 365 search** | `searchEmails`, `searchTeamsMessages`, `searchExternalDocuments` | 298+ Teams DMs, Outlook email threads, OneDrive files now searchable |
| **User memory system** | `writeMemory`, `searchMemories`, `recallPastConversations` | AI remembers user preferences and past context across sessions |
| **Company knowledge base** | `getCompanyKnowledge`, `saveToKnowledgeBase` | Institutional knowledge (strategy, OKRs, SOPs) accessible to AI |
| **Margin analysis** | `getMarginAnalysis` | Revenue vs cost profitability view — not in original recommendations |
| **Cross-project comparison** | `getCrossProjectComparison` | Side-by-side project benchmarking |

---

## Remaining Gaps (As of March 2026)

### Still No Tool Access

| Data | Tables Available | Why It Matters |
|------|-----------------|----------------|
| **Daily logs** | `daily_logs`, `daily_log_notes`, `daily_log_manpower`, `daily_log_equipment` | Field progress, labor counts, equipment usage — invisible to AI |
| **Punch list** | `punch_items` | Completion tracking at project closeout |
| **Drawing log** | `drawings`, `drawing_revisions`, `drawing_log` view | Drawing status and revision tracking |
| **Specifications** | `specifications`, `specification_sections` | Technical requirement tracking |
| **Payment applications** | `schedule_of_values`, `sov_line_items_with_percentage` | Progress billing detail |

### Known Bugs Still Present

1. **`get_priority_insights` RPC** in `getActionItemsAndInsights` — SQL type bug means priority ordering never works; always falls back to basic `ai_insights` query with no due dates.
2. **`getActionItemsAndInsights` doesn't return structured action items** — the `action_items` and `bullet_points` fields on `document_metadata` are populated (especially now with richer Fireflies sync), but the tool still only returns the truncated `summary` field.
3. **`searchDocuments` keyword-only path** — the legacy full-text search path still exists and doesn't use the new semantic search infrastructure.

---

## Updated Gap Analysis: What Users Ask vs What Tools Can Answer

| User Question | Can Answer? | Which Tool(s) | Notes |
|---------------|-------------|---------------|-------|
| "Tell me about our projects" | YES | getPortfolioOverview → CRO | Now routed through specialist |
| "What's the budget for Project X?" | YES | getProjectBudgetSummary / getBudgetLineItems → CFO | Line-level detail now available |
| "What was discussed in meetings about X?" | YES | semanticSearch, searchMeetingsByTopic | Semantic search now implemented |
| "What needs my attention?" | PARTIAL | getActionItemsAndInsights | Still missing structured action_items field |
| "How much are we spending on subs?" | YES | getCommitmentsOverview → CFO | Implemented |
| "Who's working on Project X?" | YES | getPeopleAndRoles | Implemented |
| "Show me overdue submittals" | YES | getSubmittalStatus | Implemented |
| "What happened on site today?" | NO | — | No daily log tool |
| "How many punch items are open?" | NO | — | No punch list tool |
| "What's our EAC for Project X?" | YES | getForecastComparison, getBudgetLineItems | Implemented |
| "Compare this month vs last month" | YES | getCostTrends, getHistoricalTrends | Implemented |
| "What did [person] say about [topic]?" | YES | semanticSearch (with participant filter via search_by_participants RPC) | Implemented |
| "What risks have been identified?" | YES | getProjectRiskAnalysis → CRO, semanticSearch | Risk specialist routing now in place |
| "What decisions were made about X?" | YES | semanticSearch, getMeetingDetails | match_decisions RPC now wired up |
| "Show me drawing revisions" | NO | — | No drawing/spec tool |
| "What change orders affect our subs?" | YES | getChangeOrderDetails → CFO | Implemented |
| "How is [subcontractor] performing?" | YES | getVendorPerformance | Implemented |
| "What invoices are outstanding?" | YES | getARAgingReport, getRecentInvoices → CFO | Live Acumatica data |
| "Prepare me for the OAC meeting" | YES | consultCFO + consultCOO + semanticSearch | Specialist routing makes this much stronger |
| "What emails came in about X?" | YES | searchEmails | Microsoft 365 integration |
| "What was discussed in Teams about X?" | YES | searchTeamsMessages | Microsoft Graph Teams sync |
| "Show me the cash position" | YES | getCashPositionReport → CFO | Live Acumatica data |

---

## Technical Notes

### Tool Registration

The chat route imports `createStrategistTools` from `orchestrator.ts`. The Strategist has access to `consultCFO`, `consultCOO`, `consultCRO`, `consultCHRO`, `consultVPBD`, web search tools, and the base project tools (minus portfolio/risk tools).

To add a new tool:
1. Add to the appropriate domain file (`financial.ts`, `operational.ts`, or `acumatica.ts`)
2. Ensure it's included in the `createXxxTools` function return
3. The tool will automatically be available to the appropriate specialist agent

### Step Limit

`stopWhen: stepCountIs(7)` — the Strategist can call up to 7 tools per response. Each `consultXxx` call counts as one step; the specialist internally may call multiple tools. Consider increasing if multi-specialist queries are being cut off.

### Data Sources Summary

| Source | How Accessed | Coverage |
|--------|-------------|---------|
| Supabase (project data) | Direct queries via `createServiceClient()` | All project/financial/operational tables |
| Acumatica ERP | REST API via `frontend/src/lib/acumatica/client.ts` | Live AP/AR/cash/PO/projects |
| Fireflies (meetings) | Synced to `document_metadata` + `document_chunks` | All meeting transcripts with embeddings |
| Microsoft Outlook | Synced via Graph API to `document_metadata` | Email threads since 2024-01-01 |
| Microsoft Teams | Synced via Graph API to `document_metadata` | Channel messages + 298+ DMs |
| OneDrive / SharePoint | Synced via Graph API to `document_metadata` | `/Alleato Group/2026 Jobs` + `/SOP` |
| Company knowledge base | Direct table | Strategy, OKRs, SOPs, institutional memory |

### Semantic Search Infrastructure

The `semanticSearch` tool and related meeting tools use:
- **Embedding model:** `text-embedding-3-large` at 3072 dimensions
- **Vector table:** `document_chunks` (24K+ rows)
- **RPCs:** `match_meeting_chunks`, `match_meeting_segments`, `search_all_knowledge`, `match_risks`, `match_decisions`, `match_tasks`, `search_by_participants`, `search_by_category`

### Service Client

All tools use `createServiceClient()` which bypasses RLS — full read access regardless of user permissions. Intentional for AI advisor use case.

---

## Appendix: Complete Tool Count

| File | Tools | Specialist |
|------|-------|-----------|
| `project-tools.ts` | 9 | Strategist-direct + gated tools |
| `financial.ts` | 6 | CFO |
| `acumatica.ts` | 9 | CFO (live ERP) |
| `operational.ts` | ~30 | COO + all specialists |
| `orchestrator.ts` | 5 consult tools + web search | Strategist |
| **Total** | **~50** | |
