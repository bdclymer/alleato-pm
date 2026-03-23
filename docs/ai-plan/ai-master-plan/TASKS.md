# AI Master Plan — Implementation Tasks

> **PRP:** [prp-ai-master-plan.md](./prp-ai-master-plan.md)
> **Status:** Not Started
> **Last Updated:** 2026-03-04

## Progress Summary

| Phase | Total | Done | In Progress | Blocked |
|-------|-------|------|-------------|---------|
| Phase 1: Data Foundation | 20 | 0 | 0 | 0 |
| Phase 2: Proactive Intelligence | 15 | 0 | 0 | 0 |
| Phase 3: Workflow Automation | 14 | 0 | 0 | 0 |
| Phase 4: Strategic Advisory | 10 | 0 | 0 | 0 |
| **Total** | **59** | **0** | **0** | **0** |

---

## Phase 1: Data Foundation

### 1A. Company Knowledge Base

- [ ] **1.1** Create Supabase migration for `company_knowledge` + `company_documents` tables
  - FK: company_id → companies.id (UUID)
  - Include embedding column (vector(1536))
  - Enable RLS
  - File: `supabase/migrations/YYYYMMDD_company_knowledge.sql`

- [ ] **1.2** Create `getCompanyKnowledge` RAG tool
  - Query company_knowledge, optional semantic search
  - Follow pattern: financial.ts (resolveProject, withTrace, structured return)
  - File: `frontend/src/lib/ai/tools/shared.ts`

- [ ] **1.3** Create company knowledge admin page
  - Form for entering company info by category (mission, strategy, goals, competitive, org)
  - Use FormSection, Input, Textarea from design system
  - File: `frontend/src/app/(main)/company-knowledge/page.tsx`

- [ ] **1.4** Create company document upload + ingestion
  - Upload to Supabase Storage → extract text (PDF/DOCX) → chunk → embed
  - Use text-embedding-3-small for embeddings
  - Files: API route + CompanyDocumentUploader component

### 1B. Expand RAG Tools

- [ ] **1.5** Create COO operations tools
  - `getScheduleAnalysis`: schedule_tasks, milestones, critical path
  - `getSubmittalStatus`: submittals, submittal_project_dashboard
  - `getRFIStatus`: rfis with response times, blockers
  - `getVendorPerformance`: vendors with delivery history
  - `getPeopleAndRoles`: people, project_directory_memberships
  - File: `frontend/src/lib/ai/tools/operations.ts`

- [ ] **1.6** Create CHRO people tools
  - `getTeamWorkload`: people across project assignments
  - File: `frontend/src/lib/ai/tools/people.ts`

- [ ] **1.7** Create CRO risk tools
  - `getContractAnalysis`, `getComplianceStatus`, enhanced `getProjectRiskAnalysis`
  - File: `frontend/src/lib/ai/tools/risk.ts`

- [ ] **1.8** Create VP BD growth tools
  - Enhanced `getPortfolioOverview`, `getHistoricalTrends`, `getCrossProjectComparison`
  - File: `frontend/src/lib/ai/tools/growth.ts`

- [ ] **1.9** Create COO agent system prompt
  - VP of Operations persona, schedule/vendor/resource lenses
  - Proactive alerts: critical path late, submittal overdue, RFI >7 days
  - File: `frontend/src/lib/ai/agents/coo.ts`

- [ ] **1.10** Create CHRO agent system prompt
  - Head of People persona, workload/performance/knowledge risk lenses
  - File: `frontend/src/lib/ai/agents/chro.ts`

- [ ] **1.11** Create CRO agent system prompt
  - Chief Risk Officer persona, contract/compliance/insurance lenses
  - File: `frontend/src/lib/ai/agents/cro.ts`

- [ ] **1.12** Create VP BD agent system prompt
  - Business growth persona, market/profitability/client health lenses
  - File: `frontend/src/lib/ai/agents/vpbd.ts`

- [ ] **1.13** Register all agents in orchestrator
  - Add COO, CHRO, CRO, VPBD to agentRegistry
  - Add consultCOO, consultCHRO, consultCRO, consultVPBD tools
  - Update detectRoute keyword lists
  - File: `frontend/src/lib/ai/orchestrator.ts`

- [ ] **1.14** Update agent types
  - Add new agents to AGENT_NAMES, AGENT_LABELS, AGENT_DESCRIPTIONS
  - File: `frontend/src/lib/ai/agents/types.ts`

- [ ] **1.15** Fix existing tool bugs
  - Fix getActionItemsAndInsights: return action_items/bullet_points from document_metadata
  - Fix searchDocuments: add semantic search via RPCs
  - Fix/remove dead get_priority_insights RPC call
  - File: `frontend/src/lib/ai/tools/project-tools.ts`

- [ ] **1.16** Add semantic search tool
  - Wrap search_all_knowledge RPC
  - Generate embedding → call RPC → return structured results
  - File: `frontend/src/lib/ai/tools/shared.ts`

### 1C. Document Ingestion Pipeline

- [ ] **1.17** Extend document ingestion for PDFs and DOCX
  - PDF text extraction (pdf-parse)
  - DOCX text extraction (mammoth)
  - Chunk with metadata → embed with text-embedding-3-small
  - Follow pattern: backend/src/workers/embedder/index.ts

- [ ] **1.18** Create document upload trigger
  - On upload to Supabase Storage → trigger ingestion pipeline
  - Similar to existing trg_enqueue_document_metadata_rag_job

### 1D. Financial Data Enrichment

- [ ] **1.19** Create `getForecastComparison` tool
  - Budget vs. actual vs. forecast comparison
  - Query: v_budget_lines, budget_line_forecasts, direct_costs, change_orders
  - File: `frontend/src/lib/ai/tools/financial.ts`

- [ ] **1.20** Test all financial tools with real project data
  - Verify all 7 financial tools for project 67
  - Document data gaps

---

## Phase 2: Proactive Intelligence

### 2A. Automated Insight Generation

- [ ] **2.1** Create insight generation service
  - For each project: gather data via tools → Claude analysis → detect alerts
  - Store in ai_insights with severity, financial_impact
  - File: `frontend/src/services/insight-generation.ts`

- [ ] **2.2** Create cron endpoint for insight generation
  - POST /api/cron/insight-generation
  - Iterate all active projects, generate insights
  - File: `frontend/src/app/api/cron/insight-generation/route.ts`

- [ ] **2.3** Create ai_alert_rules migration
  - Configurable thresholds per agent (budget %, schedule days, etc.)
  - File: `supabase/migrations/YYYYMMDD_ai_alert_rules.sql`

### 2B. Smart Notifications

- [ ] **2.4** Create notifications migration
  - notifications + notification_preferences tables
  - RLS: users see only their own
  - File: `supabase/migrations/YYYYMMDD_notifications.sql`

- [ ] **2.5** Create notification service
  - Route insights to notifications by severity + user preferences
  - Critical → immediate, Warning → daily, Info → digest only
  - File: `frontend/src/services/notification-service.ts`

- [ ] **2.6** Create notification API routes
  - GET/PATCH /api/notifications
  - GET/PATCH /api/notification-preferences
  - File: `frontend/src/app/api/notifications/route.ts`

- [ ] **2.7** Create notification center UI
  - Bell icon + dropdown, unread badge, severity colors
  - File: `frontend/src/components/notifications/NotificationCenter.tsx`

- [ ] **2.8** Create notification preferences UI
  - Channel toggles, severity threshold, category selection
  - File: `frontend/src/components/notifications/NotificationPreferences.tsx`

- [ ] **2.9** Create email digest service
  - Daily email with top insights, formatted HTML
  - File: `frontend/src/services/email-digest.ts`

### 2C. Dashboard Intelligence

- [ ] **2.10** Create AI Briefing card
  - Top 3 things to know per project
  - File: `frontend/src/components/dashboard/AIBriefingCard.tsx`

- [ ] **2.11** Create daily briefing generation endpoint
  - POST /api/ai/generate-briefing
  - File: `frontend/src/app/api/ai/generate-briefing/route.ts`

- [ ] **2.12** Create Risk Heat Map
  - Portfolio-level risk visualization
  - File: `frontend/src/components/dashboard/RiskHeatMap.tsx`

- [ ] **2.13** Create Attention Queue
  - AI-prioritized action items
  - File: `frontend/src/components/dashboard/AttentionQueue.tsx`

- [ ] **2.14** Create Financial Health Bar
  - Per-project color-coded indicator
  - File: `frontend/src/components/dashboard/FinancialHealthBar.tsx`

- [ ] **2.15** Create Cash Flow Chart
  - 90-day cash flow projection with Recharts
  - File: `frontend/src/components/dashboard/CashFlowChart.tsx`

---

## Phase 3: Workflow Automation

### 3A. Document Intelligence

- [ ] **3.1** Create document classifier service
  - Auto-classify on upload: spec, submittal, drawing, contract, RFI
  - Extract metadata: dates, amounts, parties
  - File: `frontend/src/services/document-classifier.ts`

- [ ] **3.2** Create document_classifications migration
  - document_id FK → document_metadata.id (UUID)
  - File: `supabase/migrations/YYYYMMDD_document_classifications.sql`

- [ ] **3.3** Implement document auto-linking
  - Link to project, contract, budget line based on extracted metadata

- [ ] **3.4** Implement document summary generation
  - Generate summaries with Claude, store in document_metadata.summary

### 3B. Meeting Intelligence Enhancement

- [ ] **3.5** Implement meeting agenda auto-generation
  - Generate from open items, risks, deadlines

- [ ] **3.6** Implement action item auto-creation
  - Create ai_tasks from meeting action items

- [ ] **3.7** Implement commitment tracking across meetings
  - Track fulfillment of commitments from previous meetings

- [ ] **3.8** Implement recurring issue detection
  - Flag topics appearing in 3+ consecutive meetings

### 3C. Report Generation

- [ ] **3.9** Create ai_reports migration
  - project_id FK → projects.id (INTEGER)
  - File: `supabase/migrations/YYYYMMDD_ai_reports.sql`

- [ ] **3.10** Create report generator service
  - Weekly status, financial summary, executive brief templates
  - File: `frontend/src/services/report-generator.ts`

- [ ] **3.11** Create report generation API endpoint
  - POST /api/ai/generate-report
  - File: `frontend/src/app/api/ai/generate-report/route.ts`

### 3D. Smart Templates

- [ ] **3.12** Implement RFI pre-fill from history
  - Semantic search on historical RFIs, suggest description/response

- [ ] **3.13** Implement change order description suggestion
  - Auto-suggest CO descriptions from related change events

- [ ] **3.14** Implement commitment scope auto-draft
  - Draft scopes from contract terms

---

## Phase 4: Strategic Advisory

### 4A. Cross-Project Intelligence

- [ ] **4.1** Implement project comparison engine
  - Compare against historical baselines, identify patterns

- [ ] **4.2** Implement resource allocation optimization
  - Recommend optimal resource distribution

### 4B. Predictive Analytics

- [ ] **4.3** Implement project completion probability model
  - Based on schedule progress, budget burn, risk indicators

- [ ] **4.4** Implement budget overrun prediction
  - Based on cost trends, CO velocity, commitment gaps

- [ ] **4.5** Implement schedule delay prediction
  - Based on critical path, task velocity, resource constraints

- [ ] **4.6** Implement vendor risk scoring
  - Based on delivery timeliness, quality, communication patterns

### 4C. Strategic Recommendations

- [ ] **4.7** Implement quarterly focus recommendations
  - Synthesize across all agents, generate prioritized list

- [ ] **4.8** Implement client relationship health scoring
  - Based on interaction patterns, issue resolution, payment history

### 4D. Competitive Intelligence

- [ ] **4.9** Create company benchmarking data entry UI
  - Form for competitive data, store in company_knowledge

- [ ] **4.10** Implement performance vs. industry comparison
  - Compare metrics against benchmarks

---

## Session Log

| Date | Session | Tasks Completed | Notes |
|------|---------|----------------|-------|
| | | | |
