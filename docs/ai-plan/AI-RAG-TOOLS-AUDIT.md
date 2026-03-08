# AI RAG Tools Audit

**Date:** 2026-03-04
**Audited by:** Claude Code
**Scope:** All AI assistant tools in the Alleato PM codebase

---

## Executive Summary

The Alleato AI assistant currently has **6 active RAG tools** registered in the chat route, plus **3 artifact tools** (createDocument, updateDocument, requestSuggestions) and **1 demo tool** (getWeather) that are defined but NOT wired into the RAG assistant. The 6 active tools cover projects, financials, budgets, meetings, risk analysis, and action items. However, **massive data gaps exist**: the tools cannot access commitments/subcontracts, purchase orders, submittals, daily logs, punch items, specifications, drawings, the company directory, direct costs, owner invoices, or any vector/semantic search capabilities despite those RPC functions existing in Supabase.

**Key Finding:** The tools are meeting-centric (strong) and contract-financial-centric (adequate), but completely blind to field operations, procurement, quality control, and people/company data.

---

## Architecture Overview

### Data Flow

```
User Message
  -> POST /api/ai-assistant/chat/route.ts
    -> createProjectTools(userId, { onTrace })   [project-tools.ts]
    -> streamText() with ragAssistantSystemPrompt
    -> Claude calls tool(s) -> Supabase queries -> results returned to Claude
    -> Claude generates response
    -> Response + tool trace persisted to chat_history table
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | System prompt defining AI personality and tool usage patterns |
| `frontend/src/lib/ai/tools/project-tools.ts` | **All 6 active RAG tools** — the only tools wired into the chat route |
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Chat API route — imports and registers tools |
| `frontend/src/lib/ai/providers.ts` | Model configuration (default: `anthropic/claude-sonnet-4.5`) |
| `frontend/src/lib/ai/tools/create-document.ts` | Artifact tool (NOT used by RAG assistant) |
| `frontend/src/lib/ai/tools/update-document.ts` | Artifact tool (NOT used by RAG assistant) |
| `frontend/src/lib/ai/tools/request-suggestions.ts` | Artifact tool (NOT used by RAG assistant) |
| `frontend/src/lib/ai/tools/get-weather.ts` | Demo tool (NOT used by RAG assistant) |

### Important: Tools NOT Wired to RAG Assistant

The chat route at `frontend/src/app/api/ai-assistant/chat/route.ts` (line 70) ONLY imports `createProjectTools`. The artifact tools (`createDocument`, `updateDocument`, `requestSuggestions`) and `getWeather` exist in `frontend/src/lib/ai/tools/` but are **not registered** with the RAG assistant. They appear to belong to a separate chat system (the tool-calling demo route at `/api/tool-calling/route.ts` or an artifact-based chat).

---

## Tool-by-Tool Audit

### Tool 1: `getPortfolioOverview`

**Purpose:** Strategic overview of the project portfolio.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `phase` | string (optional) | `"Current"` | Phase filter: Current, Complete, Estimating, Planning, or "all" |

**Supabase Tables/Views Queried:**
1. `projects` — filtered by phase, archived=false, limit 50
2. `prime_contract_financial_summary` (view) — contract values per project
3. `change_events_summary` (view) — change event counts and amounts
4. `project_issue_summary` (view) — issue counts and costs
5. `document_metadata` — recent meetings (last 100), ordered by date desc
6. `project_health_dashboard` (view) — health scores and critical items

**Data Returned:**
- `portfolioSummary`: total projects, contract value, open CEs, meeting counts
- `projects[]`: enriched list with contract value, open CEs, meeting activity, health
- `recentMeetingInsights[]`: last 15 meetings with summaries (truncated to 400 chars)
- `recentMeetings[]`: last 10 meetings with title, date, participants, summary

**Strengths:**
- Pulls from 6 data sources in parallel (fast)
- Sorts projects by meeting activity (most active first)
- Rich meeting context included
- Portfolio-level aggregations (total contract value, open CEs)

**Weaknesses:**
- **No budget data** — uses contract values only, no v_budget_lines
- **Limit 50 projects** — could miss projects in large portfolios
- **Meeting summaries truncated** to 400 chars — may lose critical details
- **No commitment/subcontract data** — missing a huge financial dimension
- **No schedule data** — cannot surface schedule concerns at portfolio level
- **No submittal/RFI counts** — only gets issues from project_issue_summary
- **Phase field** only supports exact string match, not fuzzy

---

### Tool 2: `getProjectRiskAnalysis`

**Purpose:** Deep risk analysis for a single project.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `projectId` | number (optional) | — | Project ID if known |
| `projectName` | string (optional) | — | Project name (partial match via ILIKE) |

**Supabase Tables/Views Queried:**
1. `projects` — for name resolution and project details
2. `ai_insights` — unresolved insights, sorted by severity, limit 20
3. `change_orders` — recent COs with amounts, limit 20
4. `rfis` — open RFIs sorted by due date, limit 20
5. `schedule_tasks` — all tasks for the project, limit 50
6. `v_budget_lines` (view) — budget line items
7. `document_metadata` — last 10 meetings

**Data Returned:**
- `project`: basic info + health status/score + completion %
- `riskSummary`: overall risk level (HIGH/MEDIUM/LOW), counts of overdue tasks/milestones/RFIs, pending CO exposure, budget growth %
- `criticalInsights[]`: up to 10 critical/high severity insights with financial/timeline impact
- `overdueItems`: overdue tasks (up to 10) and overdue RFIs (up to 10)
- `changeOrderExposure`: pending vs approved CO amounts
- `budgetAnalysis`: original vs revised budget, growth %, line count
- `recentMeetings[]`: last 5 meetings with summaries

**Strengths:**
- Most comprehensive single-project tool
- Computes risk level algorithmically
- Identifies overdue milestones specifically
- Budget growth percentage calculation
- Meeting context included

**Weaknesses:**
- **Risk level algorithm is simplistic** — only uses insight count + overdue RFI count thresholds
- **No commitment exposure** — does not include subcontract change orders or pending commitment amounts
- **Schedule tasks limited to 50** — larger projects may have hundreds of tasks; critical path not identified
- **No submittal risk** — submittals in review or overdue are invisible
- **No daily log data** — cannot assess field progress vs schedule
- **ai_insights filter** uses `.in("resolved", [0])` which is a strange pattern for a boolean/integer field
- **Change orders** queried from `change_orders` table but change events from a different table — potential confusion about what's a PCO vs CCO vs PCCO

---

### Tool 3: `getFinancialAnalysis`

**Purpose:** Financial analysis across projects or for a single project.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `projectId` | number (optional) | — | Scope to one project (if omitted, all projects) |

**Supabase Tables/Views Queried:**
1. `prime_contract_financial_summary` (view) — all financial data
2. `change_events_summary` (view) — change event status and amounts
3. `projects` — for project name lookups

**Data Returned:**
- `summary`: original/revised contract values, invoiced, payments received, collection rate, approved/pending COs, open CE count
- `financialConcerns[]`: auto-generated warning strings (contract growth >10%, pending COs >5%, collection rate <80%)
- `contracts[]`: per-contract detail with all financial fields

**Strengths:**
- Auto-generates financial concern warnings
- Collection rate calculation
- Contract growth percentage
- Works at both portfolio and project level

**Weaknesses:**
- **ONLY uses prime contract data** — completely ignores commitment/subcontract financials (the cost side)
- **No budget data** — cannot compare budget vs actual
- **No direct costs** — direct cost line items are invisible
- **No owner invoice detail** — only aggregate invoiced amount from the view
- **No cost-to-complete or EAC** — no forecasting data used
- **No payment application detail** — cannot identify aging receivables
- **Does not distinguish contract types** — lumps all prime contracts together
- **Missing:** commitment change orders, purchase orders, subcontract totals

---

### Tool 4: `getProjectBudgetSummary`

**Purpose:** True budget summary from budget line data (not contract value).

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `projectId` | number (optional) | — | Project ID if known |
| `projectName` | string (optional) | — | Project name (partial match) |

**Supabase Tables/Views Queried:**
1. `projects` — name resolution
2. `v_budget_lines` (view) — budget line items with CO totals and modifications
3. `prime_contract_financial_summary` (view) — contract context

**Data Returned:**
- `project`: id, name, phase
- `budgetSummary`: original budget, revised budget, approved changes, modifications, delta, growth %, line count
- `contractContext`: contract values and invoicing for comparison
- `dataNotes[]`: explanatory strings distinguishing budget from contract values

**Strengths:**
- Explicitly separates budget from contract values (addresses a recurring confusion)
- Includes budget modifications separately from CO-driven changes
- Clear data notes to guide the AI's response
- Uses the `asNumber()` helper for safe numeric conversion

**Weaknesses:**
- **No cost code breakdown** — returns only totals, not by division/cost code
- **No individual budget line details** — cannot answer "what's the biggest budget line?"
- **No forecast data** — no projected costs, projected over/under, or EAC
- **No committed costs vs budget** — cannot show how much of budget is committed
- **No direct cost actuals** — budget vs actual comparison impossible
- **No historical comparison** — budget_snapshots table exists but is unused
- **Cannot compare budget views** — budget_views and budget_view_columns tables exist but unused

---

### Tool 5: `getActionItemsAndInsights`

**Purpose:** Priority action items from meetings, unresolved insights, and overdue RFIs.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `projectId` | number (optional) | — | Filter by project |
| `maxResults` | number (optional) | 20 | Max results to return |

**Supabase Tables/Views Queried:**
1. `get_priority_insights` RPC — prioritized insights with due dates (has known SQL type bug, falls back gracefully)
2. `ai_insights` — unresolved insights, ordered by created_at desc
3. `document_metadata` — recent meetings with summaries
4. `rfis` — overdue open RFIs (due_date < today)

**Data Returned:**
- `priorityItems[]`: from RPC — insights with assignee, due date, days until due
- `unresolvedInsights[]`: from ai_insights — with severity, financial impact, timeline impact
- `meetingInsights[]`: recent meeting summaries (truncated to 400 chars)
- `overdueRFIs[]`: overdue RFIs with number, subject, ball-in-court

**Strengths:**
- Graceful fallback when RPC fails
- Combines multiple sources of "things needing attention"
- Meeting action items recognized as the richest data source
- Overdue RFIs are a practical, actionable inclusion

**Weaknesses:**
- **RPC `get_priority_insights` has a known bug** — comment says "SQL type bug" so the primary data source may never work
- **No actual action items extracted** — the `action_items` field from document_metadata is available but NOT queried/returned. Only meeting summaries are returned, not structured action items
- **No task/todo data** — the `tasks` and `todos` tables exist but are unused
- **No overdue schedule items** — schedule_tasks with past due dates are not included
- **No pending submittals** — submittals needing review are invisible
- **No punch list items** — punch_items table exists but unused
- **Meeting insights truncated** to 400 chars — may miss critical action items in longer summaries
- **document_metadata action_items and bullet_points fields** exist with structured data but are NOT selected or returned

---

### Tool 6: `searchDocuments`

**Purpose:** Search meeting transcripts and documents by keyword.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | — | Search keywords or phrases |
| `projectId` | number (optional) | — | Scope search to a project |
| `maxResults` | number (optional) | 10 | Max results |

**Supabase Tables/Views Queried:**
1. `document_metadata` — full-text search with `textSearch()` (when projectId provided)
2. `full_text_search_meetings` RPC — full-text search across all meetings (fallback)

**Data Returned:**
- When projectId-scoped: id, title, date, participants, category, summary, actionItems, bulletPoints
- When global: id, title, date, category, participants, content (truncated to 1000 chars)

**Strengths:**
- Two-tier search: project-scoped uses Supabase textSearch, global uses RPC
- Returns action_items and bullet_points when project-scoped (the only tool that does!)
- Full-text search across meeting content

**Weaknesses:**
- **No semantic/vector search** — only keyword matching despite extensive vector search infrastructure in Supabase (match_meeting_chunks, match_meeting_segments, search_all_knowledge, etc.)
- **Global search path does NOT return action_items or bullet_points** — inconsistent with project-scoped path
- **Content truncated to 1000 chars** in global path — may miss relevant information
- **No search across other document types** — only searches document_metadata (meetings). Cannot search change events, RFIs, submittals, etc.
- **textSearch format** uses `query.split(" ").join(" & ")` — forces AND between all words. "drywall procurement" requires BOTH words, cannot do OR or phrase matching
- **No date range filtering** — cannot search "what was discussed about X in January?"
- **No participant filtering** — cannot search "what did John say about X?"
- **No ranking/relevance score** in project-scoped results

---

## Tables/Views with NO Tool Access

The following significant tables and views exist in Supabase but **no RAG tool can query them**:

### Financial (High Impact)

| Table/View | What It Contains | Why It Matters |
|------------|-----------------|----------------|
| `commitments_unified` (view) | All subcontracts and purchase orders unified | The entire cost side of project financials |
| `subcontracts` | Subcontract details, amounts, status | Commitment tracking |
| `subcontracts_with_totals` (view) | Subcontracts with SOV totals | Aggregated commitment data |
| `purchase_orders` | PO details with amounts | Material procurement tracking |
| `purchase_orders_with_totals` (view) | POs with SOV totals | Aggregated PO data |
| `direct_costs` | Direct cost entries | Cost tracking outside contracts |
| `direct_cost_line_items` | Individual cost line items | Detailed cost breakdown |
| `owner_invoices` | Invoices sent to owners | Revenue/billing tracking |
| `owner_invoice_line_items` | Invoice line item details | Billing detail |
| `contract_payments` | Payment records | Cash flow tracking |
| `payment_transactions` | Payment transaction details | Payment history |
| `budget_line_forecasts` | Cost forecasting data | Forward-looking financial data |
| `budget_snapshots` | Historical budget snapshots | Budget trend analysis |
| `cost_forecasts` | Cost projection data | Forecasting |
| `schedule_of_values` | SOV data | Payment application basis |
| `sov_line_items_with_percentage` (view) | SOV with % complete | Progress billing data |
| `contract_financial_summary` (view) | Commitment financial summaries | Old-style contract financials |

### Field Operations (High Impact)

| Table/View | What It Contains | Why It Matters |
|------------|-----------------|----------------|
| `daily_logs` | Daily construction logs | Field progress tracking |
| `daily_log_notes` | Notes from daily logs | Field observations |
| `daily_log_equipment` | Equipment usage | Resource tracking |
| `daily_log_manpower` | Labor counts/hours | Workforce tracking |
| `daily_recaps` | Daily recap summaries | Summarized field activity |
| `punch_items` | Punch list items | Quality/completion tracking |
| `issues` | Project issues | Problem tracking |

### Quality & Compliance (Medium Impact)

| Table/View | What It Contains | Why It Matters |
|------------|-----------------|----------------|
| `submittals` | Submittal packages | Material/shop drawing approvals |
| `submittal_project_dashboard` (view) | Submittal status dashboard | Approval pipeline status |
| `specifications` | Project specifications | Technical requirements |
| `specification_sections` | Spec section details | Section-level tracking |
| `drawings` | Drawing records | Design document tracking |
| `drawing_revisions` | Revision history | Design change tracking |
| `drawing_log` (view) | Drawing log view | Drawing status overview |
| `discrepancies` | Design discrepancies | Conflict tracking |

### People & Directory (Medium Impact)

| Table/View | What It Contains | Why It Matters |
|------------|-----------------|----------------|
| `companies` | Company directory | Vendor/sub/client lookup |
| `people` | People directory | Contact lookup |
| `project_companies` | Company-project associations | Who's on which project |
| `project_directory_memberships` | Project team memberships | Team composition |
| `subcontractors` | Subcontractor details | Sub management |
| `subcontractors_summary` (view) | Sub performance summary | Sub evaluation |
| `vendors` | Vendor directory | Vendor management |

### AI Infrastructure (Unused Capabilities)

| RPC Function | What It Does | Why It Matters |
|--------------|-------------|----------------|
| `search_all_knowledge` | Vector search across ALL knowledge | Semantic search across everything |
| `match_meeting_chunks` | Semantic search of meeting transcript chunks | Find specific discussions by meaning |
| `match_meeting_segments` | Semantic search of meeting segments with decisions/risks/tasks | Structured meeting intelligence |
| `match_meeting_segments_by_project` | Project-scoped semantic meeting search | Targeted meeting intelligence |
| `match_risks` / `match_risks_by_project` | Semantic search of identified risks | Risk discovery |
| `match_opportunities` | Semantic search of opportunities | Opportunity discovery |
| `match_decisions` / `match_decisions_by_project` | Semantic search of decisions | Decision tracking |
| `match_tasks` | Semantic search of tasks | Task discovery |
| `search_by_category` | Vector search filtered by meeting category | Category-filtered search |
| `search_by_participants` | Vector search filtered by participant | Person-filtered search |
| `get_meeting_analytics` | Meeting frequency, duration, category stats | Meeting pattern analysis |
| `get_meeting_statistics` | Total meetings, participants, pending actions, open risks | Dashboard-level stats |
| `compare_budget_snapshots` | Compare two budget snapshots | Budget trend analysis |

---

## Gap Analysis: What Users Ask vs What Tools Can Answer

| User Question | Can Answer? | Which Tool | What's Missing |
|---------------|-------------|------------|----------------|
| "Tell me about our projects" | YES | getPortfolioOverview | Adequate |
| "What's the budget for Project X?" | YES | getProjectBudgetSummary | No cost code breakdown, no forecast |
| "What was discussed in meetings about X?" | PARTIAL | searchDocuments | No semantic search, keyword only |
| "What needs my attention?" | PARTIAL | getActionItemsAndInsights | Missing: action_items field, schedule items, submittals |
| "How much are we spending on subcontractors?" | NO | — | No commitment/subcontract tool |
| "Who's working on Project X?" | NO | — | No people/directory tool |
| "Show me overdue submittals" | NO | — | No submittal tool |
| "What happened on site today?" | NO | — | No daily log tool |
| "How many punch items are open?" | NO | — | No punch list tool |
| "What's our EAC for Project X?" | NO | — | No forecasting tool |
| "Compare this month's budget to last month" | NO | — | compare_budget_snapshots RPC exists but unused |
| "What did [person] say about [topic]?" | NO | — | search_by_participants RPC exists but unused |
| "What risks have been identified?" | PARTIAL | getProjectRiskAnalysis | Only ai_insights, not match_risks semantic search |
| "What decisions were made about X?" | NO | — | match_decisions RPC exists but unused |
| "Show me drawing revisions for Phase 2" | NO | — | No drawing/spec tool |
| "What change orders affect our subcontractors?" | NO | — | No commitment CO tool |
| "How is [subcontractor] performing?" | NO | — | subcontractors_summary view exists but unused |
| "What invoices are outstanding?" | NO | — | No invoice detail tool |
| "Prepare me for the OAC meeting" | PARTIAL | Multiple tools | Cannot pull structured action items, pending submittals, pending decisions |

---

## Priority Recommendations

### P0: Critical Fixes to Existing Tools

1. **Fix `getActionItemsAndInsights` to return action_items and bullet_points** from document_metadata. These fields exist and contain structured action item data, but the tool only returns the summary field (truncated). This is the single highest-impact quick fix.

2. **Add semantic search to `searchDocuments`**. The `match_meeting_chunks`, `match_meeting_segments`, and `search_all_knowledge` RPC functions exist and work. Adding a vector search fallback when keyword search returns poor results would dramatically improve search quality. Requires generating embeddings for the query (text-embedding-3-small model is already configured per AI-MASTER-PLAN.md).

3. **Fix the `get_priority_insights` RPC bug** or remove the dead code. The tool currently always falls back to the basic ai_insights query, meaning priority ordering with due dates never works.

### P1: New Tools (Highest Value)

4. **`getCommitmentsSummary`** — Query `commitments_unified`, `subcontracts_with_totals`, `purchase_orders_with_totals`. Return commitment values, pending COs, remaining to invoice. This fills the biggest financial gap.

5. **`getProjectTeamAndDirectory`** — Query `project_companies`, `project_directory_memberships`, `people`, `companies`. Return who's on the project, their roles, contact info. Enables "who's responsible for X?" questions.

6. **`getSubmittalStatus`** — Query `submittals`, `submittal_project_dashboard` view. Return counts by status, overdue submittals, average review time. Critical for procurement tracking.

7. **`semanticSearch`** — Wrapper around `search_all_knowledge` or `match_meeting_segments`. Accept natural language query, generate embedding, return semantically matched content. This would be the biggest single improvement to the AI's intelligence.

### P2: New Tools (High Value)

8. **`getDailyLogSummary`** — Query `daily_logs`, `daily_log_notes`, `daily_log_manpower`, `daily_log_equipment`. Return recent field activity, manpower trends, equipment usage. Enables field progress tracking.

9. **`getPunchListStatus`** — Query `punch_items`. Return counts by status, overdue items, assignment distribution. Enables completion tracking.

10. **`getBudgetForecast`** — Query `budget_line_forecasts`, `cost_forecasts`, `budget_snapshots`. Return projected costs, EAC, and budget trend over time. Enables forward-looking financial questions.

11. **`getDirectCostsSummary`** — Query `direct_costs`, `direct_cost_line_items`. Return direct cost totals by type, recent entries. Fills the gap for non-contract costs.

### P3: Nice-to-Have Tools

12. **`getDrawingLog`** — Query `drawings`, `drawing_revisions`, `drawing_log` view. Return drawing status, recent revisions, pending reviews.

13. **`getSpecificationStatus`** — Query `specifications`, `specification_sections`. Return spec status, pending reviews, recent revisions.

14. **`getMeetingAnalytics`** — Use `get_meeting_analytics` and `get_meeting_frequency_stats` RPCs. Return meeting frequency trends, top participants, category breakdown.

15. **`getInvoiceStatus`** — Query `owner_invoices`, `owner_invoice_line_items`, `prime_contract_payment_applications`. Return invoice aging, outstanding amounts, payment history.

---

## Technical Notes

### Tool Registration

All tools must be added to the `createProjectTools()` function in `frontend/src/lib/ai/tools/project-tools.ts`. The function returns an object where each key is the tool name. The chat route imports this via `createProjectTools(user.id, { onTrace })`.

### Tracing

All tools use the `withTrace()` wrapper which logs tool name, input, output, and timestamp. This trace is persisted in the `chat_history.metadata.tool_trace` field.

### Step Limit

The chat route uses `stopWhen: stepCountIs(7)` meaning the AI can call up to 7 tools in a single response. This is generous but may need increasing if more tools are added and the AI needs to call several in sequence.

### System Prompt Budget Routing

The chat route has special logic: if the user's message matches the pattern for a budget question (contains "budget" + amount/status words, but NOT portfolio-level), it appends extra instructions to the system prompt forcing the AI to call `getProjectBudgetSummary` first. This was added to fix a recurring issue where the AI used contract values instead of budget values.

### Service Client

All tools use `createServiceClient()` which bypasses RLS. This means the tools have full read access to all data regardless of the user's permissions. This is intentional for the AI advisor use case but should be reviewed if role-based access control is needed for the AI.

---

## Appendix: Complete Table Inventory

### Tables Accessed by RAG Tools (13 total)

| Table/View | Which Tool(s) |
|------------|--------------|
| `projects` | getPortfolioOverview, getProjectRiskAnalysis, getFinancialAnalysis, getProjectBudgetSummary, getProjectDetails |
| `prime_contract_financial_summary` (view) | getPortfolioOverview, getFinancialAnalysis, getProjectBudgetSummary |
| `change_events_summary` (view) | getPortfolioOverview, getFinancialAnalysis |
| `project_issue_summary` (view) | getPortfolioOverview |
| `project_health_dashboard` (view) | getPortfolioOverview |
| `document_metadata` | getPortfolioOverview, getProjectRiskAnalysis, getActionItemsAndInsights, searchDocuments, getProjectDetails |
| `ai_insights` | getProjectRiskAnalysis, getActionItemsAndInsights |
| `change_orders` | getProjectRiskAnalysis |
| `rfis` | getProjectRiskAnalysis, getActionItemsAndInsights |
| `schedule_tasks` | getProjectRiskAnalysis, getProjectDetails |
| `v_budget_lines` (view) | getProjectRiskAnalysis, getProjectBudgetSummary |
| `prime_contracts` | getProjectDetails |
| `get_priority_insights` (RPC) | getActionItemsAndInsights |
| `full_text_search_meetings` (RPC) | searchDocuments |

### Tables NOT Accessed by Any RAG Tool (50+ significant tables)

See "Tables/Views with NO Tool Access" section above for the categorized list.
