# PRP: Alleato AI Master Plan — Full Implementation

> **Version:** 1.0
> **Created:** 2026-03-04
> **Scope:** All 4 phases — Data Foundation, Proactive Intelligence, Workflow Automation, Strategic Advisory
> **Confidence Score:** 8/10

---

## Goal

**Feature Goal:** Transform Alleato's AI from a reactive chat assistant with 20 tools and 1 specialist agent (CFO) into a fully autonomous business strategist with 5 specialist agents, 40+ tools, proactive insight generation, document intelligence, workflow automation, and predictive analytics.

**Deliverable:** A complete AI platform spanning:
- 5 C-Suite agents (CFO complete, COO, CHRO, CRO, VP BD new)
- 20+ new RAG/data tools across operations, people, risk, growth, and document domains
- Company knowledge base with document ingestion pipeline
- Automated insight generation with cron-driven analysis
- Smart notification system (in-app + email digest)
- Dashboard intelligence (AI briefing, risk heat map, attention queue)
- Document intelligence (auto-classify, extract, link, summarize)
- Meeting intelligence enhancement (agendas, action tracking, pattern detection)
- Report generation (status reports, financial summaries, executive briefs)
- Smart templates (pre-fill RFIs, suggest CO descriptions, auto-draft scopes)
- Cross-project intelligence and predictive analytics
- Strategic recommendations engine

**Success Definition:**
- All 4 phases implemented and operational
- Morning briefing generates in <30 seconds with specific dollar amounts, dates, and names
- Financial surprises reduced from 3-5 per project to 0-1
- Time to understand project status drops from 1-2 hours to 5 minutes
- Margin leakage detected within 48 hours
- All agents route correctly based on intent detection
- Proactive alerts fire automatically for all defined threshold conditions

---

## Why

**Business Value:** The owner (Brandon) needs an AI that acts as the ultimate business strategist — an employee who has been there since day one. Currently the AI only knows meeting transcripts and some financial summaries. It cannot give strategic advice without knowing the full business context.

**User Impact:**
- Owner gets a 5-minute morning briefing instead of 2+ hours of information gathering
- Financial Guardian catches margin leaks worth $15K-$40K per project within 48 hours
- Conversational advisor functions like a seasoned CFO who knows every project inside and out
- Proactive alerts surface problems before they become crises
- Reports generate automatically, saving hours per week

**Problems Solved:**
- AI is blind to 50+ database tables with no RAG tool access
- No company-level knowledge (strategy, goals, competitive landscape)
- No document content search (specs, drawings, submittals)
- No proactive intelligence — only answers when asked
- No workflow automation — reports and templates are manual
- No cross-project pattern recognition or predictive analytics

---

## What

### Pages
- Company Knowledge admin page (enter company info, upload docs)
- Notification center (in-app notification list)
- Notification preferences (user settings)
- AI Briefing dashboard card (project + portfolio level)
- Risk heat map dashboard view
- Attention Queue dashboard section
- Report generation page
- Enhanced AI insights page (already exists at `/insights`)

### Database Schema

#### Existing Tables (DO NOT recreate)
| Table | PK Type | Purpose |
|-------|---------|---------|
| `ai_insights` | INTEGER | Insight storage with severity, financial_impact |
| `ai_tasks` | UUID | AI-generated tasks |
| `ai_models` | UUID | Model registry |
| `ai_analysis_jobs` | UUID | Analysis job tracking |
| `block_embeddings` | UUID | Block-level embeddings |
| `chunks` | UUID | Document chunks with embeddings |
| `document_chunks` | UUID | Alternative chunk storage |
| `documents` | UUID | Document content + embeddings |
| `document_metadata` | UUID | Meeting/document metadata |
| `chat_history` | UUID | Chat messages |
| `chat_messages` | UUID | Chat messages (alt) |
| `chat_sessions` | UUID | Chat sessions |
| `company_context` | UUID | Company strategic context (single-row config) |
| `meeting_digests` | UUID | Meeting digest summaries |
| `fireflies_ingestion_jobs` | UUID | Pipeline job tracking |
| `meeting_segments` | — | Segmented meeting content |
| `decisions` | — | Extracted decisions |
| `risks` | — | Extracted risks |
| `tasks` | — | Extracted tasks |
| `opportunities` | — | Extracted opportunities |

#### New Tables Required
| Table | PK Type | Purpose |
|-------|---------|---------|
| `company_knowledge` | UUID | Company mission, strategy, goals, competitive notes, org structure |
| `company_documents` | UUID | Uploaded company documents (strategy decks, business plans) |
| `notification_preferences` | UUID | User notification settings (severity thresholds, channels) |
| `notifications` | UUID | Individual notification records (in-app) |
| `ai_alert_rules` | UUID | Configurable alert threshold rules per agent |
| `ai_reports` | UUID | Generated reports (status, financial, executive) |
| `document_classifications` | UUID | Auto-classified document metadata |

#### Critical FK Type Rules
- `projects.id` is `INTEGER` → any `project_id` FK must be `INTEGER`/`BIGINT`
- `users.id` is UUID (`string`) → any `user_id` FK must be `UUID`
- `people.id` is UUID (`string`) → any `person_id` FK must be `UUID`
- `companies.id` is UUID (`string`) → any `company_id` FK must be `UUID`
- `document_metadata.id` is UUID (`string`)

### API Endpoints (New)
- `POST /api/company-knowledge` — CRUD for company knowledge
- `POST /api/company-knowledge/documents` — Upload company documents
- `GET/PATCH /api/notifications` — List and update notifications
- `GET/PATCH /api/notification-preferences` — User notification settings
- `POST /api/ai/generate-report` — Generate AI report
- `POST /api/ai/generate-briefing` — Generate daily briefing
- `GET /api/ai/alerts` — Get active alerts
- `POST /api/cron/insight-generation` — Cron endpoint for insight generation
- `POST /api/cron/daily-briefing` — Cron endpoint for daily briefing

### Components (New)
- `CompanyKnowledgeForm` — Admin form for company info
- `CompanyDocumentUploader` — Document upload with ingestion
- `NotificationCenter` — In-app notification list
- `NotificationPreferences` — Settings form
- `AIBriefingCard` — Dashboard briefing widget
- `RiskHeatMap` — Portfolio risk visualization
- `AttentionQueue` — AI-prioritized action items
- `ReportGenerator` — Report configuration and output
- `CashFlowChart` — 90-day cash flow projection
- `FinancialHealthBar` — Per-project color-coded indicator

### Special Features
- Multi-agent orchestration with 5 C-Suite agents
- Parallel agent consultation for cross-domain questions
- Automated proactive insight generation (cron-driven)
- Document ingestion pipeline (PDF, DOCX text extraction → chunk → embed)
- Smart notification routing by severity
- AI-generated reports with financial commentary
- Predictive analytics (completion probability, overrun prediction)

---

## Success Criteria

- [ ] All 5 C-Suite agents (CFO, COO, CHRO, CRO, VP BD) operational with correct routing
- [ ] 40+ tools covering all data domains
- [ ] Company knowledge base populated and queryable
- [ ] Document ingestion pipeline processing PDF/DOCX → chunks → embeddings
- [ ] Semantic search working via existing RPCs (search_all_knowledge, match_meeting_chunks)
- [ ] Automated insight generation running on daily cron
- [ ] Budget alerts firing at 80%/90%/100% thresholds
- [ ] Schedule risk alerts for critical path delays
- [ ] In-app notification center with preference controls
- [ ] Email digest generating and sending daily
- [ ] AI Briefing card rendering on dashboard
- [ ] Risk heat map displaying across projects
- [ ] Report generation producing weekly status reports
- [ ] Document auto-classification on upload
- [ ] Meeting action item tracking across sessions
- [ ] Cross-project comparison engine operational
- [ ] `npm run quality` passes with zero errors
- [ ] `npm run build` succeeds

---

## All Needed Context

### Context Completeness Check

_This PRP includes all file paths, patterns, interfaces, and architecture decisions needed for implementation. An agent with no prior knowledge of this codebase can implement all phases using only this document and file access._

### Documentation & References

```yaml
# MUST READ — Architecture & Vision
- file: docs/AI-MASTER-PLAN.md
  why: Single source of truth for all AI tasks and their completion status
  pattern: Task checklist with [x] for completed, [ ] for pending
  gotcha: Always update checkboxes when completing tasks

- file: docs/AI-CSUITE-ARCHITECTURE.md
  why: Defines multi-agent architecture, routing table, tool assignments per agent
  pattern: Strategist orchestrator → specialist agents → tools → synthesize
  gotcha: Each agent gets its own system prompt, tools, and model config

- file: docs/AI-VISION-USER-EXPERIENCE.md
  why: Business requirements and user experience specifications
  pattern: Owner-centric scenarios with specific metrics
  gotcha: Must give specifics with dollar amounts, dates, names — never generalities

- file: docs/AI-RAG-TOOLS-AUDIT.md
  why: Current tool gaps, known bugs, priority fix list
  pattern: P0 fixes → P1 new tools → P2 new tools → P3 nice-to-have
  gotcha: getActionItemsAndInsights has a known RPC bug (get_priority_insights)

# MUST READ — Current Implementation
- file: frontend/src/lib/ai/orchestrator.ts
  why: Orchestrator with agent registry, routing, consultation pattern
  pattern: agentRegistry → detectRoute → consultAgent → synthesize
  gotcha: Currently only CFO registered; COO/CHRO/CRO/VPBD are commented placeholders

- file: frontend/src/lib/ai/tools/project-tools.ts
  why: Master tool factory, withTrace wrapper, asNumber helper, resolveProject pattern
  pattern: createProjectTools() spreads financial + acumatica + base tools
  gotcha: All tools use createServiceClient() which bypasses RLS

- file: frontend/src/lib/ai/tools/financial.ts
  why: 6 financial tools with resolveProject helper
  pattern: Return structured {summary, items[], alerts[]} objects
  gotcha: Use asNumber() for all numeric fields from Supabase

- file: frontend/src/lib/ai/agents/cfo.ts
  why: CFO system prompt pattern to follow for all new agents
  pattern: Role definition → analytical lenses → tool strategy → proactive alerts → hard rules

- file: frontend/src/lib/ai/agents/strategist.ts
  why: Strategist system prompt with routing rules
  pattern: Single-domain → one specialist; cross-domain → parallel; no match → generalist

- file: frontend/src/lib/ai/agents/types.ts
  why: Agent type system — AGENT_NAMES, AgentResponse, RoutingDecision, AgentAlert
  pattern: Add new agents to AGENT_NAMES, AGENT_LABELS, AGENT_DESCRIPTIONS

- file: frontend/src/lib/ai/providers.ts
  why: Model factory with AI Gateway routing
  pattern: getLanguageModel(modelId) routes through @ai-sdk/gateway
  gotcha: Reasoning models need -thinking suffix for middleware wrapping

- file: frontend/src/app/api/ai-assistant/chat/route.ts
  why: Chat API route — entry point for all AI chat
  pattern: Auth → persist → createStrategistTools → streamText → persist response
  gotcha: maxDuration=120, stopWhen stepCountIs(7) for Strategist

# MUST READ — Backend Pipeline
- file: backend/src/workers/ingest/index.ts
  why: Document ingestion entry point (Fireflies, Storage, manual)
  pattern: Parse → deduplicate → upload to storage → create document_metadata

- file: backend/src/workers/parser/index.ts
  why: Meeting transcript segmentation via GPT-4o-mini
  pattern: parseFirefliesMarkdown → generateMeetingSummary → segmentTranscript → upsert segments

- file: backend/src/workers/embedder/index.ts
  why: Chunking and embedding pipeline
  pattern: createMeetingChunks (3000 chars, 500 overlap) → batchEmbed (text-embedding-3-small) → upsert documents

- file: backend/src/workers/extractor/index.ts
  why: Structured data extraction (decisions, risks, tasks, opportunities)
  pattern: Collect raw → GPT-4o-mini normalize/deduplicate → embed → upsert to structured tables

- file: backend/src/services/daily_digest.py
  why: Daily digest generation pattern
  pattern: Fetch meetings → extract signals per meeting → generate recap → save daily_recaps
  gotcha: Uses APScheduler CronTrigger, configurable via DAILY_DIGEST_HOUR env var

# MUST READ — Chat UI
- file: frontend/src/components/ai-assistant/rag-chat-page.tsx
  why: Top-level chat orchestrator — session management, message loading, auto-send
  pattern: RagChatPage → ChatWithSession (useChat hook) → ChatArea
  gotcha: Re-mounts ChatWithSession via key prop on session switch

- file: frontend/src/components/ai-assistant/chat-area.tsx
  why: Main chat rendering — messages, streaming, suggestions, tool calls
  pattern: WelcomeScreen (no messages) OR Conversation + pinned input
  gotcha: showStreamingIndicator logic depends on last message role and tool status

# External Documentation
- url: https://ai-sdk.dev/docs/agents/overview
  why: AI SDK agent patterns — subagents, workflow patterns, parallel execution
  critical: Subagent pattern maps directly to our consultAgent() implementation

- url: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
  why: Tool definition patterns, streaming, maxSteps
  critical: prepareStep callback for dynamic context injection per step

- url: https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes
  why: HNSW index optimization for vector search performance
  critical: Index must match distance operator; ORDER BY must use <=> directly

- url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
  why: Claude tool use best practices
  critical: Token-efficient tool definitions, strict schema validation

- url: https://www.anthropic.com/engineering/multi-agent-research-system
  why: Multi-agent architecture patterns from Anthropic
  critical: 3-5 agents optimal; Opus as lead + Sonnet subagents outperformed single agent by 90%
```

### Current Codebase Tree (AI-Relevant)

```
frontend/src/
├── app/
│   ├── (chat)/
│   │   └── ai-assistant/
│   │       ├── page.tsx              # Entry: renders <RagChatPage />
│   │       └── layout.tsx            # Hides footer, adjusts padding
│   ├── api/
│   │   └── ai-assistant/
│   │       ├── chat/route.ts         # POST streaming chat
│   │       ├── conversations/route.ts # CRUD conversations
│   │       └── messages/[sessionId]/route.ts # GET messages
│   └── (tables)/
│       └── insights/page.tsx         # AI insights table view
├── components/
│   ├── ai-assistant/                 # Chat page components
│   │   ├── rag-chat-page.tsx         # Top orchestrator
│   │   ├── chat-area.tsx             # Message rendering
│   │   ├── conversation-sidebar.tsx  # Session list
│   │   ├── welcome-screen.tsx        # Empty state
│   │   ├── trace-panel.tsx           # Tool trace display
│   │   └── source-citations.tsx      # Source references
│   ├── ai-elements/                  # Primitive chat components
│   │   ├── message.tsx               # Message bubble
│   │   ├── conversation.tsx          # Scroll container
│   │   ├── reasoning.tsx             # Thinking display
│   │   ├── suggestion.tsx            # Follow-up chips
│   │   ├── sources.tsx               # Source references
│   │   └── loader.tsx                # Spinner
│   └── chat/
│       └── prompt-input.tsx          # Input component
├── hooks/
│   └── use-rag-conversations.ts     # Conversation CRUD hooks
├── lib/
│   └── ai/
│       ├── orchestrator.ts           # C-Suite orchestrator
│       ├── providers.ts              # Model factory
│       ├── agents/
│       │   ├── types.ts              # Agent type system
│       │   ├── strategist.ts         # Strategist prompt
│       │   └── cfo.ts               # CFO prompt
│       └── tools/
│           ├── project-tools.ts      # 7 base RAG tools
│           ├── financial.ts          # 6 financial tools
│           └── acumatica.ts          # 7 Acumatica ERP tools
└── types/
    └── database.types.ts             # Generated Supabase types

backend/src/
├── workers/
│   ├── ingest/index.ts              # Fireflies ingestion
│   ├── parser/index.ts              # Meeting segmentation
│   ├── embedder/index.ts            # Chunking + embedding
│   ├── extractor/index.ts           # Structured extraction
│   └── shared/                      # Shared utilities
│       ├── types.ts
│       ├── openai.ts
│       ├── supabase.ts
│       ├── parser.ts
│       └── chunker.ts
└── services/
    ├── daily_digest.py              # Daily digest generator
    ├── scheduler.py                 # APScheduler config
    ├── pipeline/orchestrator.py     # Python pipeline
    └── insights/                    # Insight generation
        ├── InsightGenerationService.ts
        ├── ProjectAssignmentService.ts
        └── ProjectsInsightsService.ts
```

### Desired Codebase Tree (Files to Add)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/
│   │   └── company-knowledge/       # Phase 1A
│   │       └── page.tsx             # Company knowledge admin
│   ├── api/
│   │   ├── company-knowledge/       # Phase 1A
│   │   │   ├── route.ts            # CRUD company knowledge
│   │   │   └── documents/route.ts  # Upload company docs
│   │   ├── notifications/           # Phase 2B
│   │   │   └── route.ts            # List/update notifications
│   │   ├── notification-preferences/ # Phase 2B
│   │   │   └── route.ts            # User preferences
│   │   └── ai/
│   │       ├── generate-report/route.ts   # Phase 3C
│   │       ├── generate-briefing/route.ts # Phase 2C
│   │       └── alerts/route.ts            # Phase 2A
│   └── (cron)/
│       ├── insight-generation/route.ts    # Phase 2A
│       └── daily-briefing/route.ts        # Phase 2C
├── components/
│   ├── company-knowledge/           # Phase 1A
│   │   ├── CompanyKnowledgeForm.tsx
│   │   └── CompanyDocumentUploader.tsx
│   ├── notifications/               # Phase 2B
│   │   ├── NotificationCenter.tsx
│   │   └── NotificationPreferences.tsx
│   └── dashboard/                   # Phase 2C
│       ├── AIBriefingCard.tsx
│       ├── RiskHeatMap.tsx
│       ├── AttentionQueue.tsx
│       ├── CashFlowChart.tsx
│       └── FinancialHealthBar.tsx
├── hooks/
│   ├── use-company-knowledge.ts     # Phase 1A
│   ├── use-notifications.ts         # Phase 2B
│   └── use-ai-briefing.ts          # Phase 2C
├── lib/
│   └── ai/
│       ├── agents/
│       │   ├── coo.ts               # Phase 1B — COO agent
│       │   ├── chro.ts              # Phase 1B — CHRO agent
│       │   ├── cro.ts               # Phase 1B — CRO agent
│       │   └── vpbd.ts             # Phase 1B — VP BD agent
│       └── tools/
│           ├── operations.ts        # Phase 1B — COO tools
│           ├── people.ts            # Phase 1B — CHRO tools
│           ├── risk.ts              # Phase 1B — CRO tools
│           ├── growth.ts            # Phase 1B — VP BD tools
│           └── shared.ts           # Phase 1B — Cross-agent tools
└── services/
    ├── insight-generation.ts        # Phase 2A
    ├── notification-service.ts      # Phase 2B
    ├── report-generator.ts          # Phase 3C
    └── document-classifier.ts       # Phase 3A

supabase/migrations/
├── YYYYMMDD_company_knowledge.sql   # Phase 1A
├── YYYYMMDD_notifications.sql       # Phase 2B
├── YYYYMMDD_ai_alert_rules.sql      # Phase 2A
├── YYYYMMDD_ai_reports.sql          # Phase 3C
└── YYYYMMDD_document_classifications.sql # Phase 3A
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Next.js 15 async params
// Page components must declare: params: Promise<{ projectId: string }>
// Then: const { projectId } = await params;

// CRITICAL: Route parameter naming
// ALWAYS use [projectId], [contractId], etc. — NEVER [id]
// Check with: find frontend/src/app -type d -name "[*]"

// CRITICAL: Supabase types must be regenerated before database work
// npm run db:types (or: npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts)

// CRITICAL: All AI tools use createServiceClient() which bypasses RLS
// This is intentional — the AI needs full read access

// CRITICAL: withTrace() wrapper is REQUIRED for all tool execute functions
// Pattern: withTrace("toolName", options, async (input) => { ... })

// CRITICAL: resolveProject() helper handles both projectId (number) and projectName (string)
// All tools accepting project scope should use this

// CRITICAL: asNumber() for all numeric Supabase fields
// Handles nulls, strings, NaN → returns 0 for non-finite values

// CRITICAL: Tool return shape must include { summary: {...}, items: [...] }
// Never return raw Supabase rows — always structure with summary

// CRITICAL: AI SDK stopWhen pattern
// Strategist: stepCountIs(7) — up to 7 tool calls
// Sub-agents: stepCountIs(5) — up to 5 tool calls

// CRITICAL: Agent registration requires 3 steps:
// 1. Add to agentRegistry in orchestrator.ts
// 2. Add consultXxx tool in createStrategistTools()
// 3. Add to AGENT_NAMES, AGENT_LABELS, AGENT_DESCRIPTIONS in types.ts

// GOTCHA: Embedding model MUST be text-embedding-3-small (1536 dim)
// Mixing models produces meaningless similarity scores

// GOTCHA: The consultAgent() function uses generateText (not streaming)
// Sub-agents are synchronous calls within the streaming Strategist

// GOTCHA: chat_history.metadata stores { tool_trace, model, architecture: "csuite" }
// This is how the UI reconstructs trace panels for historical messages

// GOTCHA: Design system ESLint rules are ERRORS, not warnings
// no-hardcoded-colors, no-arbitrary-spacing, require-semantic-colors
// Use bg-background, bg-card, bg-muted, text-foreground, etc.
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// === Phase 1A: Company Knowledge ===
interface CompanyKnowledge {
  id: string; // UUID
  company_id: string; // FK to companies.id (UUID)
  category: 'mission' | 'strategy' | 'goals' | 'competitive' | 'org_structure' | 'differentiators';
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  embedding: string | null; // pgvector
  created_at: string;
  updated_at: string;
}

interface CompanyDocument {
  id: string; // UUID
  company_id: string; // FK to companies.id (UUID)
  title: string;
  file_path: string; // Supabase Storage path
  file_type: 'pdf' | 'docx' | 'txt' | 'md';
  processing_status: 'pending' | 'processing' | 'complete' | 'error';
  chunk_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// === Phase 2A: Alert Rules ===
interface AIAlertRule {
  id: string; // UUID
  agent: 'cfo' | 'coo' | 'chro' | 'cro';
  alert_type: string; // e.g., 'budget_threshold', 'schedule_delay', 'vendor_risk'
  threshold_config: Record<string, unknown>; // e.g., { percentage: 80 }
  severity: 'critical' | 'warning' | 'info';
  is_active: boolean;
  created_at: string;
}

// === Phase 2B: Notifications ===
interface Notification {
  id: string; // UUID
  user_id: string; // FK to users.id (UUID)
  project_id: number | null; // FK to projects.id (INTEGER)
  title: string;
  body: string;
  severity: 'critical' | 'warning' | 'info';
  source_agent: string | null;
  source_insight_id: number | null; // FK to ai_insights.id (INTEGER)
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface NotificationPreference {
  id: string; // UUID
  user_id: string; // FK to users.id (UUID)
  channel: 'in_app' | 'email' | 'slack';
  min_severity: 'critical' | 'warning' | 'info';
  categories: string[]; // e.g., ['budget', 'schedule', 'vendor']
  digest_frequency: 'immediate' | 'daily' | 'weekly';
  is_active: boolean;
}

// === Phase 3C: Reports ===
interface AIReport {
  id: string; // UUID
  project_id: number | null; // FK to projects.id (INTEGER)
  report_type: 'weekly_status' | 'financial_summary' | 'executive_brief' | 'variance_analysis';
  title: string;
  content_markdown: string;
  content_html: string | null;
  metadata: Record<string, unknown> | null;
  generated_by_model: string;
  generation_time_ms: number | null;
  created_at: string;
}

// === Phase 3A: Document Classification ===
interface DocumentClassification {
  id: string; // UUID
  document_id: string; // FK to document_metadata.id (UUID)
  classification: 'spec' | 'submittal' | 'drawing' | 'contract' | 'rfi' | 'report' | 'correspondence';
  confidence: number;
  extracted_metadata: Record<string, unknown> | null; // dates, amounts, parties
  linked_entities: Record<string, unknown> | null; // project_id, contract_id, budget_line_id
  created_at: string;
}

// === Agent System Types (extend existing types.ts) ===
// Add to AGENT_NAMES: 'coo' | 'chro' | 'cro' | 'vpbd'
// Add corresponding AGENT_LABELS and AGENT_DESCRIPTIONS
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
# ============================================================
# PHASE 1: DATA FOUNDATION
# ============================================================

# --- Phase 1A: Company Knowledge Base ---

Task 1.1: CREATE supabase migration for company_knowledge table
  - IMPLEMENT: company_knowledge + company_documents tables
  - FK: company_id → companies.id (UUID)
  - Include embedding column (vector(1536))
  - Enable RLS with service role bypass
  - PLACEMENT: supabase/migrations/

Task 1.2: CREATE frontend/src/lib/ai/tools/shared.ts
  - IMPLEMENT: getCompanyKnowledge tool
  - Queries company_knowledge table, optionally with semantic search
  - FOLLOW pattern: financial.ts (resolveProject, withTrace, structured return)
  - NAMING: getCompanyKnowledge
  - PLACEMENT: frontend/src/lib/ai/tools/shared.ts

Task 1.3: CREATE company knowledge admin page
  - IMPLEMENT: Page + form for entering company info by category
  - FOLLOW pattern: existing admin pages
  - Use FormSection, Input, Textarea from design system
  - PLACEMENT: frontend/src/app/(main)/company-knowledge/page.tsx

Task 1.4: CREATE company document upload + ingestion
  - IMPLEMENT: Upload to Supabase Storage → extract text → chunk → embed
  - PDF: use pdf-parse or similar library
  - DOCX: use mammoth or similar library
  - Chunk with metadata (company, doc type, section)
  - Embed with text-embedding-3-small
  - Store in company_knowledge with embedding
  - PLACEMENT: API route + upload component

# --- Phase 1B: Expand RAG Tools ---

Task 1.5: CREATE frontend/src/lib/ai/tools/operations.ts
  - IMPLEMENT: COO tools
  - getScheduleAnalysis: query schedule_tasks, milestones
  - getSubmittalStatus: query submittals, submittal_project_dashboard
  - getRFIStatus: query rfis with response times, blockers
  - getVendorPerformance: query vendors with delivery history
  - getPeopleAndRoles: query people, project_directory_memberships
  - FOLLOW pattern: financial.ts (withTrace, resolveProject, structured return)
  - DEPENDENCIES: project-tools.ts (shared patterns)

Task 1.6: CREATE frontend/src/lib/ai/tools/people.ts
  - IMPLEMENT: CHRO tools
  - getTeamWorkload: query people across project assignments
  - FOLLOW pattern: financial.ts
  - DEPENDENCIES: operations.ts (shares getPeopleAndRoles)

Task 1.7: CREATE frontend/src/lib/ai/tools/risk.ts
  - IMPLEMENT: CRO tools
  - getContractAnalysis: query contracts for risk clauses
  - getComplianceStatus: query compliance deadlines
  - getProjectRiskAnalysis: enhanced version of existing
  - FOLLOW pattern: financial.ts

Task 1.8: CREATE frontend/src/lib/ai/tools/growth.ts
  - IMPLEMENT: VP BD tools
  - getPortfolioOverview: enhanced cross-project comparison
  - getHistoricalTrends: query metrics over time
  - getCrossProjectComparison: compare metrics across projects
  - FOLLOW pattern: financial.ts

Task 1.9: CREATE frontend/src/lib/ai/agents/coo.ts
  - IMPLEMENT: COO system prompt
  - Define: VP of Operations persona, 20+ year construction operations
  - Analytical lenses: Schedule Health, Resource Optimization, Quality Control, Vendor Management
  - Tool strategy mapping question types to tool sequences
  - Proactive alerts: critical path late, submittal overdue, RFI >7 days, resource conflict
  - FOLLOW pattern: cfo.ts (exact same prompt structure)

Task 1.10: CREATE frontend/src/lib/ai/agents/chro.ts
  - IMPLEMENT: CHRO system prompt
  - Define: Head of People persona
  - Analytical lenses: Workload Balance, Performance Patterns, Knowledge Risk, Team Dynamics
  - Proactive alerts: person on 3+ projects, response times up 30%, action items overdue
  - FOLLOW pattern: cfo.ts

Task 1.11: CREATE frontend/src/lib/ai/agents/cro.ts
  - IMPLEMENT: CRO system prompt
  - Define: Chief Risk Officer persona
  - Analytical lenses: Contract Risk, Compliance, Dispute Resolution, Insurance
  - Proactive alerts: LD threshold, insurance expiring, unusual liability clause
  - FOLLOW pattern: cfo.ts

Task 1.12: CREATE frontend/src/lib/ai/agents/vpbd.ts
  - IMPLEMENT: VP Business Development system prompt
  - Define: Business growth persona
  - Analytical lenses: Market Analysis, Profitability, Client Health, Competitive Position
  - FOLLOW pattern: cfo.ts

Task 1.13: UPDATE frontend/src/lib/ai/orchestrator.ts
  - Register COO, CHRO, CRO, VPBD in agentRegistry (uncomment + configure)
  - Add consultCOO, consultCHRO, consultCRO, consultVPBD tools in createStrategistTools
  - Update detectRoute keyword lists for each new agent
  - Multi-agent routing: parallel consultation for cross-domain questions
  - DEPENDENCIES: Tasks 1.9-1.12 (agent prompts), Tasks 1.5-1.8 (tools)

Task 1.14: UPDATE frontend/src/lib/ai/agents/types.ts
  - Add 'coo', 'chro', 'cro', 'vpbd' to AGENT_NAMES
  - Add labels and descriptions for each

Task 1.15: FIX existing tool bugs
  - Fix getActionItemsAndInsights: return action_items and bullet_points from document_metadata
  - Fix searchDocuments: add semantic search via match_meeting_chunks or search_all_knowledge RPCs
  - Fix or remove dead get_priority_insights RPC call
  - PLACEMENT: frontend/src/lib/ai/tools/project-tools.ts

Task 1.16: ADD semantic search tool
  - IMPLEMENT: semanticSearch tool wrapping search_all_knowledge RPC
  - Generate embedding from query using text-embedding-3-small
  - Call search_all_knowledge with embedding, match_count, match_threshold
  - Return structured results with source_table, content, similarity
  - PLACEMENT: frontend/src/lib/ai/tools/shared.ts

# --- Phase 1C: Document Ingestion Pipeline ---

Task 1.17: EXTEND backend document ingestion for non-meeting documents
  - IMPLEMENT: PDF text extraction (pdf-parse or pdfjs-dist)
  - IMPLEMENT: DOCX text extraction (mammoth)
  - Chunk with metadata (project, doc type, section, date)
  - Embed and store in documents table (same as meeting chunks)
  - FOLLOW pattern: backend/src/workers/embedder/index.ts
  - GOTCHA: Use same embedding model (text-embedding-3-small)

Task 1.18: CREATE document upload trigger
  - IMPLEMENT: On document upload to Supabase Storage, trigger ingestion
  - Similar to existing trg_enqueue_document_metadata_rag_job trigger
  - Stage flow: pending → text_extracted → chunked → embedded → complete

# --- Phase 1D: Financial Data Enrichment ---

Task 1.19: CREATE getForecastComparison tool
  - IMPLEMENT: Budget vs. actual vs. forecast comparison
  - Query: v_budget_lines, budget_line_forecasts, direct_costs, change_orders
  - Return: { budgetTotal, actualTotal, forecastTotal, variance, byCategory[] }
  - PLACEMENT: frontend/src/lib/ai/tools/financial.ts

Task 1.20: TEST all financial tools with real project data
  - Verify all 7 financial tools return correct data for project 67
  - Document any data gaps or query issues

# ============================================================
# PHASE 2: PROACTIVE INTELLIGENCE
# ============================================================

# --- Phase 2A: Automated Insight Generation ---

Task 2.1: CREATE frontend/src/services/insight-generation.ts
  - IMPLEMENT: Insight generation pipeline
  - For each active project, gather data via tool calls
  - Run Claude analysis on gathered data
  - Detect: budget alerts, schedule risks, commitment gaps, vendor risks
  - Store insights in ai_insights table with severity, financial_impact
  - DEPENDENCIES: All Phase 1 tools must exist

Task 2.2: CREATE cron endpoint for insight generation
  - IMPLEMENT: POST /api/cron/insight-generation
  - Runs daily at midnight (or configurable)
  - Iterates all active projects
  - Calls insight-generation service for each
  - Can be triggered by Vercel Cron or external scheduler
  - PLACEMENT: frontend/src/app/api/cron/insight-generation/route.ts

Task 2.3: CREATE ai_alert_rules migration
  - IMPLEMENT: Configurable alert thresholds per agent
  - Default rules for CFO: budget 80%/90%/100%, margin drop >2%, cash gap
  - Default rules for COO: critical path late, submittal overdue, RFI >7 days
  - PLACEMENT: supabase/migrations/

# --- Phase 2B: Smart Notifications ---

Task 2.4: CREATE notifications migration
  - IMPLEMENT: notifications + notification_preferences tables
  - notifications: user_id (UUID FK), project_id (INTEGER FK), severity, is_read
  - notification_preferences: user_id (UUID FK), channel, min_severity, categories
  - Enable RLS: users see only their own notifications
  - PLACEMENT: supabase/migrations/

Task 2.5: CREATE notification service
  - IMPLEMENT: Route insights to notifications based on user preferences
  - Critical → immediate in-app + email
  - Warning → in-app, included in daily digest
  - Info → daily digest only
  - PLACEMENT: frontend/src/services/notification-service.ts

Task 2.6: CREATE notification API routes
  - IMPLEMENT: GET/PATCH /api/notifications (list, mark read, dismiss)
  - IMPLEMENT: GET/PATCH /api/notification-preferences
  - PLACEMENT: frontend/src/app/api/notifications/

Task 2.7: CREATE notification center UI
  - IMPLEMENT: NotificationCenter component (bell icon + dropdown/panel)
  - Show unread count badge
  - List notifications by severity with timestamps
  - Mark as read/dismiss actions
  - FOLLOW pattern: existing sidebar/dropdown patterns
  - PLACEMENT: frontend/src/components/notifications/

Task 2.8: CREATE notification preferences UI
  - IMPLEMENT: Settings form for notification preferences
  - Channel toggles, severity threshold, category selection, digest frequency
  - PLACEMENT: frontend/src/components/notifications/

Task 2.9: CREATE email digest service
  - IMPLEMENT: Daily email with top insights
  - Generate HTML email from insights
  - Send via existing email infrastructure
  - DEPENDENCIES: notification service, insight generation

# --- Phase 2C: Dashboard Intelligence ---

Task 2.10: CREATE AI Briefing card component
  - IMPLEMENT: Top 3 things to know per project
  - Fetches from ai_insights (today's insights, ordered by severity)
  - Renders as a card with icon + severity color + text
  - FOLLOW pattern: existing dashboard cards
  - PLACEMENT: frontend/src/components/dashboard/AIBriefingCard.tsx

Task 2.11: CREATE daily briefing generation endpoint
  - IMPLEMENT: POST /api/ai/generate-briefing
  - For a given project, call tools → Claude summary → store
  - Returns structured briefing with sections
  - PLACEMENT: frontend/src/app/api/ai/

Task 2.12: CREATE Risk Heat Map component
  - IMPLEMENT: Portfolio-level risk visualization
  - Query ai_insights aggregated by project + severity
  - Render as a grid/matrix with color coding
  - PLACEMENT: frontend/src/components/dashboard/RiskHeatMap.tsx

Task 2.13: CREATE Attention Queue component
  - IMPLEMENT: AI-prioritized action items
  - Query ai_insights + ai_tasks, sort by urgency/financial impact
  - Render as a prioritized list with actions
  - PLACEMENT: frontend/src/components/dashboard/AttentionQueue.tsx

Task 2.14: CREATE Financial Health Bar component
  - IMPLEMENT: Per-project color-coded health indicator
  - Green/yellow/red based on budget consumption vs. completion %
  - PLACEMENT: frontend/src/components/dashboard/FinancialHealthBar.tsx

Task 2.15: CREATE Cash Flow Chart component
  - IMPLEMENT: 90-day cash flow projection
  - Query commitments, billing periods, payment history
  - Render with Recharts or similar
  - PLACEMENT: frontend/src/components/dashboard/CashFlowChart.tsx

# ============================================================
# PHASE 3: WORKFLOW AUTOMATION
# ============================================================

# --- Phase 3A: Document Intelligence ---

Task 3.1: CREATE document classifier service
  - IMPLEMENT: Auto-classify documents on upload
  - Use Claude to classify: spec, submittal, drawing, contract, RFI, report, correspondence
  - Extract key metadata: dates, amounts, parties, requirements
  - Store in document_classifications table
  - PLACEMENT: frontend/src/services/document-classifier.ts

Task 3.2: CREATE document classification migration
  - IMPLEMENT: document_classifications table
  - document_id FK to document_metadata.id (UUID)
  - classification enum, confidence float, extracted_metadata JSONB
  - PLACEMENT: supabase/migrations/

Task 3.3: IMPLEMENT document auto-linking
  - IMPLEMENT: Link documents to relevant entities
  - Match by project, contract, budget line based on extracted metadata
  - Update document_metadata with linked entity IDs

Task 3.4: IMPLEMENT document summary generation
  - IMPLEMENT: Generate summaries for uploaded documents
  - Use Claude with extracted text
  - Store in document_metadata.summary

# --- Phase 3B: Meeting Intelligence Enhancement ---

Task 3.5: IMPLEMENT meeting agenda auto-generation
  - IMPLEMENT: Generate agenda from open items, risks, deadlines
  - Query ai_insights, ai_tasks, schedule_tasks for upcoming items
  - Generate structured agenda with Claude
  - Store as a document or return via API

Task 3.6: IMPLEMENT action item auto-creation
  - IMPLEMENT: Post-meeting, create ai_tasks from action items
  - Parse meeting segments for tasks
  - Create ai_tasks with assignee, due_date, source_document_id
  - DEPENDENCIES: extractor worker already extracts tasks

Task 3.7: IMPLEMENT commitment tracking across meetings
  - IMPLEMENT: Track whether commitments from previous meetings were fulfilled
  - Compare current meeting's status updates against previous tasks
  - Flag unfulfilled commitments

Task 3.8: IMPLEMENT recurring issue detection
  - IMPLEMENT: Flag when same topic appears in 3+ consecutive meetings
  - Query meeting_segments for topic similarity across meetings
  - Generate alert when threshold exceeded

# --- Phase 3C: Report Generation ---

Task 3.9: CREATE ai_reports migration
  - IMPLEMENT: ai_reports table
  - project_id FK to projects.id (INTEGER)
  - report_type enum, content_markdown, content_html
  - PLACEMENT: supabase/migrations/

Task 3.10: CREATE report generator service
  - IMPLEMENT: Generate reports using AI
  - Weekly status: gather schedule + budget + risks → Claude narrative
  - Financial summary: gather financials + variances → Claude commentary
  - Executive brief: synthesize across all domains
  - PLACEMENT: frontend/src/services/report-generator.ts

Task 3.11: CREATE report generation API endpoint
  - IMPLEMENT: POST /api/ai/generate-report
  - Accept report_type, project_id, date_range
  - Call report generator → store in ai_reports → return
  - PLACEMENT: frontend/src/app/api/ai/generate-report/route.ts

# --- Phase 3D: Smart Templates ---

Task 3.12: IMPLEMENT RFI pre-fill from history
  - IMPLEMENT: Search historical RFIs for similar topics
  - Use semantic search on RFI content
  - Suggest description, response based on similar past RFIs

Task 3.13: IMPLEMENT change order description suggestion
  - IMPLEMENT: Auto-suggest CO descriptions from change events
  - Query related change events, extract key details
  - Generate draft description with Claude

Task 3.14: IMPLEMENT commitment scope auto-draft
  - IMPLEMENT: Draft commitment scopes from contract terms
  - Extract relevant contract clauses
  - Generate scope draft with Claude

# ============================================================
# PHASE 4: STRATEGIC ADVISORY
# ============================================================

# --- Phase 4A: Cross-Project Intelligence ---

Task 4.1: IMPLEMENT project comparison engine
  - IMPLEMENT: Compare current project against historical baselines
  - Query metrics across all projects, normalize by project type/size
  - Identify systemic vs. project-specific patterns

Task 4.2: IMPLEMENT resource allocation optimization
  - IMPLEMENT: Recommend optimal resource distribution
  - Query workloads, project priorities, skill requirements
  - Generate recommendations with Claude

# --- Phase 4B: Predictive Analytics ---

Task 4.3: IMPLEMENT project completion probability model
  - IMPLEMENT: Predict completion probability based on current trajectory
  - Analyze schedule progress, budget burn, risk indicators
  - Generate probability score with confidence intervals

Task 4.4: IMPLEMENT budget overrun prediction
  - IMPLEMENT: Predict budget overrun likelihood
  - Analyze cost trends, change order velocity, commitment gaps
  - Generate prediction with contributing factors

Task 4.5: IMPLEMENT schedule delay prediction
  - IMPLEMENT: Predict schedule delay probability
  - Analyze critical path, task completion velocity, resource constraints
  - Generate prediction with risk factors

Task 4.6: IMPLEMENT vendor risk scoring
  - IMPLEMENT: Score vendors based on historical performance
  - Analyze delivery timeliness, quality issues, communication patterns
  - Generate risk score with contributing factors

# --- Phase 4C: Strategic Recommendations ---

Task 4.7: IMPLEMENT quarterly focus recommendations
  - IMPLEMENT: "Based on your portfolio, here's where to focus this quarter"
  - Synthesize across all agents' data
  - Generate prioritized recommendations

Task 4.8: IMPLEMENT client relationship health scoring
  - IMPLEMENT: Score client relationships based on interaction patterns
  - Analyze communication frequency, issue resolution, payment patterns
  - Generate health score with recommendations

# --- Phase 4D: Competitive Intelligence ---

Task 4.9: CREATE company benchmarking data entry UI
  - IMPLEMENT: Form for entering competitive data manually
  - Store in company_knowledge table with category='competitive'

Task 4.10: IMPLEMENT performance vs. industry comparison
  - IMPLEMENT: Compare company metrics against industry benchmarks
  - Generate comparison report with Claude
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Adding a New Tool (follow for ALL new tools)
// ============================================================
import { tool } from "ai";
import { z } from "zod";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// In the tool factory function:
export function createOperationsTools(
  _userId: string,
  options?: { onTrace?: (trace: ToolTraceItem) => void }
) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  return {
    getScheduleAnalysis: tool({
      description: "Analyzes schedule tasks, critical path, delays, and upcoming deadlines for a project",
      parameters: z.object({
        projectId: z.number().optional().describe("Project ID (number)"),
        projectName: z.string().optional().describe("Project name for fuzzy matching"),
      }),
      execute: withTrace("getScheduleAnalysis", options, async ({ projectId, projectName }) => {
        const project = await resolveProject(supabase, projectId, projectName);
        if ("error" in project) return project;

        const { data: tasks } = await supabase
          .from("schedule_tasks")
          .select("*")
          .eq("project_id", project.id);

        const items = (tasks || []) as AnyRow[];
        // ... compute summary ...

        return {
          project: { id: project.id, name: project.name },
          summary: {
            totalTasks: items.length,
            completedTasks: items.filter(t => t.status === "completed").length,
            overdueTasks: items.filter(t => /* overdue logic */).length,
            // ...
          },
          tasks: items.slice(0, 50), // Limit return size
          alerts: overdueTasks.length > 0 ? [{ type: "schedule_risk", message: "..." }] : [],
        };
      }),
    }),
    // ... more tools ...
  };
}

// ============================================================
// PATTERN 2: Adding a New Agent (follow for COO, CHRO, CRO, VPBD)
// ============================================================

// Step 1: Create agents/coo.ts
export const cooSystemPrompt = `You are the Chief Operations Officer (COO) of Alleato...

## Your Role
You are a 20+ year construction operations executive...

## Analytical Lenses
1. Schedule Health — ...
2. Resource Optimization — ...
3. Quality Control — ...
4. Vendor Management — ...

## Available Tools
- getScheduleAnalysis: [when to use]
- getSubmittalStatus: [when to use]
- getRFIStatus: [when to use]
...

## Tool Strategy
- Schedule question → getScheduleAnalysis FIRST, then getVendorPerformance if delays involve subs
- Submittal question → getSubmittalStatus FIRST, then getRFIStatus for related items
...

## Proactive Alerts
When you detect ANY of these conditions, flag immediately:
- Critical path task is late or trending late
- Submittal overdue by >5 business days
- RFI open >7 days without response
...

## Hard Rules
- NEVER estimate completion dates without schedule data
- NEVER claim a project is on track without checking critical path
...`;

// Step 2: Register in orchestrator.ts agentRegistry
coo: {
  name: "coo",
  systemPrompt: cooSystemPrompt,
  modelId: "anthropic/claude-sonnet-4.5",
  description: "Chief Operations Officer - schedule, submittals, RFIs, vendors, resources",
  triggerKeywords: [
    "schedule", "timeline", "deadline", "milestone", "critical path",
    "submittal", "rfi", "vendor", "subcontractor", "resource",
    "delay", "overdue", "behind schedule", "on track",
    // ... 30+ keywords
  ],
  createTools: (userId: string) => ({
    ...createOperationsTools(userId),
    ...createProjectTools(userId), // Base tools always included
  }),
},

// Step 3: Add consultCOO tool in createStrategistTools
consultCOO: tool({
  description: "Consult the COO for operations, schedule, submittal, RFI, and vendor questions",
  parameters: z.object({
    question: z.string(),
    context: z.string().optional(),
  }),
  execute: async ({ question, context }) => {
    const response = await consultAgent("coo", question, userId, context);
    return { agent: "coo", ...response };
  },
}),

// Step 4: Add to types.ts
// AGENT_NAMES: add 'coo'
// AGENT_LABELS: { coo: "COO" }
// AGENT_DESCRIPTIONS: { coo: "Chief Operations Officer" }

// ============================================================
// PATTERN 3: Insight Generation (Phase 2A)
// ============================================================
async function generateProjectInsights(projectId: number): Promise<void> {
  const supabase = createServiceClient(/* ... */);
  const tools = createProjectTools("system");

  // Gather data from multiple tools
  const [budget, schedule, commitments] = await Promise.all([
    tools.getProjectBudgetSummary.execute({ projectId }),
    tools.getScheduleAnalysis.execute({ projectId }),
    tools.getCommitmentsOverview.execute({ projectId }),
  ]);

  // Analyze with Claude
  const analysis = await generateText({
    model: getLanguageModel("anthropic/claude-sonnet-4.5"),
    system: `You are an AI insight generator. Analyze the following project data and identify:
      - Budget alerts (over 80%/90%/100% of any line item)
      - Schedule risks (overdue tasks, critical path delays)
      - Commitment gaps (approved COs without matching commitments)
      - Cash flow concerns
      Return as JSON array of { type, severity, title, description, financial_impact, recommended_action }`,
    prompt: JSON.stringify({ budget, schedule, commitments }),
  });

  // Parse and store insights
  const insights = JSON.parse(analysis.text);
  for (const insight of insights) {
    await supabase.from("ai_insights").insert({
      project_id: projectId,
      insight_type: insight.type,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      financial_impact: insight.financial_impact,
      status: "new",
    });
  }
}

// ============================================================
// PATTERN 4: Cron Endpoint (Phase 2A)
// ============================================================
// frontend/src/app/api/cron/insight-generation/route.ts
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 min for batch processing

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient(/* ... */);
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("status", "active");

  const results = [];
  for (const project of projects || []) {
    try {
      await generateProjectInsights(project.id);
      results.push({ projectId: project.id, status: "success" });
    } catch (error) {
      results.push({ projectId: project.id, status: "error", error: String(error) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
```

### Integration Points

```yaml
DATABASE:
  - All new tables: UUID PKs except project_id references (INTEGER)
  - company_knowledge: company_id FK → companies.id (UUID)
  - notifications: user_id FK → users.id (UUID), project_id FK → projects.id (INTEGER)
  - notification_preferences: user_id FK → users.id (UUID)
  - ai_reports: project_id FK → projects.id (INTEGER)
  - document_classifications: document_id FK → document_metadata.id (UUID)
  - RLS: Enable on all new tables; service role bypass for AI operations

CONFIG:
  - CRON_SECRET: env var for authenticating cron endpoints
  - DAILY_DIGEST_RECIPIENTS: comma-separated email addresses
  - DAILY_DIGEST_HOUR: hour for daily digest (default 18)
  - No new NEXT_PUBLIC_* vars needed

ROUTES:
  - Company knowledge: /api/company-knowledge/route.ts
  - Notifications: /api/notifications/route.ts
  - Cron: /api/cron/insight-generation/route.ts, /api/cron/daily-briefing/route.ts
  - Reports: /api/ai/generate-report/route.ts
  - All routes use [projectId] parameter naming

EXISTING INTEGRATIONS:
  - AI Gateway: all new agent models route through @ai-sdk/gateway
  - Supabase Storage: company document uploads go to 'company-docs' bucket
  - Embedding pipeline: new documents use same text-embedding-3-small model
  - Chat route: no changes needed — orchestrator.ts handles routing
```

---

## Known Pitfalls & Prevention

### From Pattern Analysis (Mandatory Review)

#### Database Type Mismatches (CRITICAL)
**Historical Error:** Used UUID for project_id when projects.id is INTEGER
**Prevention:** Always verify FK types match PK types before creating migrations. projects.id = INTEGER, users.id = UUID, companies.id = UUID
**Validation:** Check migration SQL: `grep "project_id" migration.sql` → must be INTEGER/BIGINT, not UUID

#### Route Parameter Naming (CRITICAL)
**Historical Error:** Using `[id]` instead of `[projectId]` caused routing conflicts
**Prevention:** Always use specific parameter names: `[projectId]`, `[companyId]`, etc.
**Validation:** `find frontend/src/app -type d -name "[id]"` → must return nothing

#### Next.js Cache (CRITICAL)
**Historical Error:** New page.tsx files showing 404 due to .next cache
**Prevention:** Clear `.next` cache after creating new route files
**Validation:** `cd frontend && rm -rf .next && npm run dev`

#### Stale Supabase Types (HIGH)
**Historical Error:** TypeScript errors from stale types after schema changes
**Prevention:** Run `npm run db:types` after every migration
**Validation:** `npx tsc --noEmit` passes

#### Next.js 15 Async Params (MEDIUM)
**Historical Error:** `params` is async in Next.js 15 page components
**Prevention:** Declare `params: Promise<{ projectId: string }>` and `await params`
**Validation:** TypeScript compilation catches this

#### Premature Completion Claims (CRITICAL)
**Historical Error:** Agent claimed tests pass without running them
**Prevention:** NEVER claim completion without running actual verification commands
**Validation:** Show actual command output, not assertions

#### Foreign Key on created_by (HIGH)
**Historical Error:** Insert fails when user has no profiles record
**Prevention:** Ensure test data has profiles records for all referenced users
**Validation:** Test inserts with the actual user

#### Design System Violations (HIGH)
**Historical Error:** Hardcoded colors and arbitrary spacing break build
**Prevention:** Use semantic tokens only: bg-background, bg-card, text-foreground, etc.
**Validation:** `npm run lint` — ESLint design system rules are ERRORS

---

## Validation Loop

### Level 1: Syntax & Style (After Each File)

```bash
cd frontend && npm run quality    # TypeScript + ESLint
# Expected: Zero errors
```

### Level 2: Existing Test Suite (Regression Check)

```bash
cd frontend && npm run test:unit  # Jest unit tests
# Expected: All existing tests pass
```

### Level 3: Integration Testing

```bash
# Build validation
cd frontend && npm run build
# Expected: Successful production build

# Dev server validation
npm run dev &
sleep 10
curl -I http://localhost:3000/ai-assistant
# Expected: 200 OK
```

### Level 4: Production Readiness

```bash
cd frontend && npx tsc --noEmit   # Strict TypeScript
npm run lint                      # ESLint with design system rules
npm run build                     # Production build
# Expected: All pass with zero errors/warnings
```

---

## Final Validation Checklist

### Technical Validation
- [ ] `npm run quality` passes (TypeScript + ESLint)
- [ ] `npm run build` succeeds
- [ ] Existing unit tests pass
- [ ] No design system ESLint violations
- [ ] All new migrations apply cleanly

### Feature Validation (Phase 1)
- [ ] Company knowledge CRUD working
- [ ] Company document upload → chunk → embed pipeline working
- [ ] All 5 agents registered and routing correctly
- [ ] 20+ new tools returning structured data
- [ ] Semantic search returning relevant results
- [ ] getForecastComparison tool returning budget vs. actual vs. forecast
- [ ] Existing tool bugs fixed (getActionItemsAndInsights, searchDocuments)

### Feature Validation (Phase 2)
- [ ] Insight generation cron running for all active projects
- [ ] Budget alerts firing at threshold conditions
- [ ] Notifications creating and routing by severity
- [ ] Email digest generating and sending
- [ ] AI Briefing card rendering on dashboard
- [ ] Risk heat map displaying across projects
- [ ] Attention queue showing prioritized items

### Feature Validation (Phase 3)
- [ ] Document auto-classification working on upload
- [ ] Document summaries generating
- [ ] Meeting agenda auto-generation working
- [ ] Action item auto-creation from meetings
- [ ] Weekly status report generation working
- [ ] Financial summary report with AI commentary

### Feature Validation (Phase 4)
- [ ] Cross-project comparison engine returning meaningful comparisons
- [ ] Budget overrun prediction generating predictions
- [ ] Vendor risk scores calculating from historical data
- [ ] Quarterly recommendations generating actionable advice

### Code Quality
- [ ] All new tools follow withTrace + resolveProject + structured return pattern
- [ ] All new agents follow cfo.ts prompt structure
- [ ] All new routes use specific parameter names ([projectId], etc.)
- [ ] All new tables use correct FK types (INTEGER for project_id, UUID for user_id)
- [ ] All UI components use design system tokens (no hardcoded colors)

---

## Anti-Patterns to Avoid

- Don't create new patterns when existing ones work — follow financial.ts and cfo.ts exactly
- Don't skip `withTrace()` wrapper on any tool — breaks observability
- Don't use generic `[id]` in any route — use `[projectId]`, `[sessionId]`, etc.
- Don't assume database schema — always check `database.types.ts`
- Don't hardcode colors/spacing — use semantic tokens from design system
- Don't use `any` types — use `AnyRow = Record<string, any>` for Supabase rows (existing pattern)
- Don't return raw Supabase rows from tools — always structure with `{ summary, items[], alerts[] }`
- Don't mix embedding models — always use `text-embedding-3-small` (1536 dim)
- Don't skip `await params` in Next.js 15 page components
- Don't claim completion without running verification commands

---

## Confidence Score: 8/10

**Strengths:**
- Comprehensive architecture already defined in 3 planning documents
- CFO agent pattern proven and operational — can be replicated for 4 more agents
- 20 existing tools provide clear patterns for 20+ new tools
- Backend infrastructure (workers, embeddings, extraction) already operational
- Database schema well-understood with 10+ AI tables already in place

**Risks:**
- Scale: 50+ tasks across 4 phases is enormous — phased execution critical
- Cron/scheduling: Insight generation at scale may need rate limiting
- Token costs: Multi-agent consultation multiplies API costs
- Phase 4 predictive models need sufficient historical data
- Document ingestion for non-meeting docs (PDF/DOCX) needs new library integration
