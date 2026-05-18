# AI Assistant Architecture Reference

> This document maps the complete AI Assistant system in the alleato-pm repository.
> Use it as a reference when building a new AI backend so you can extract and reuse
> the right pieces without re-reading the entire codebase.

---

## System Overview

The AI Assistant is a multi-agent construction PM AI built on **Vercel AI SDK v6**.
A "Chief Strategist" orchestrator (`gpt-5.4`) routes questions to six domain-specialist
sub-agents (CFO, COO, CRO, CHRO, VP BD, CMO), each running as an in-process
`ToolLoopAgent` with `gpt-5.4-mini`. All LLM calls go through the **Vercel AI Gateway**
(BYOK mode against OpenAI).

Before calling `streamText`, a **retrieval planner** classifies intent and pre-fetches
context in parallel — injecting it into the system prompt so the LLM often has the data
it needs without making tool calls. This is the most important architectural pattern to replicate.

Main chat API route: `POST /api/ai-assistant/chat`

---

## Prompt Layer

Three composable files are assembled at runtime by `assembleSystemPrompt()` in `bot-core.ts`.
They are pure text with no runtime dependencies — easiest things to port.

| Layer | File | Purpose |
|-------|------|---------|
| Soul | `frontend/src/lib/ai/soul.ts` | Personality, voice, tone — how the AI feels |
| Identity | `frontend/src/lib/ai/identity.ts` | Self-concept, domain expertise, construction PM framing |
| Strategist | `frontend/src/lib/ai/agents/strategist.ts` | Operational routing instructions, tool selection rules, response contract |

`assembleSystemPrompt()` composes them as:
```
{soul}

{identity}

{I_DONT_KNOW_REFLEX_PROMPT}

{strategistSystemPrompt}

## Runtime Date Context
Today is {today}
```

Then dynamically appends (via `---` separators):
- Recent conversation summaries
- User memory block (from `ai_memories` table)
- Agent learning block
- Workspace artifacts (active drafts)
- Selected project context
- Portfolio risk routing override (if keyword-matched)
- Council mode injection (if `councilMode: true`)

---

## Sub-Agent Prompts (6 C-Suite Specialists)

Each specialist has its own system prompt file. All use `gpt-5.4-mini`.

| Agent | File | Domain |
|-------|------|--------|
| CFO | `frontend/src/lib/ai/agents/cfo.ts` | Financial analysis: margin, cash, exposure, CO lifecycle, billing/collections |
| COO | `frontend/src/lib/ai/agents/coo.ts` | Operations: schedule, procurement, subcontractor execution, accountability |
| CRO | `frontend/src/lib/ai/agents/cro.ts` | Risk: exposure, claims, unpriced change events |
| CHRO | `frontend/src/lib/ai/agents/chro.ts` | People, capacity, accountability, lessons learned |
| VP BD | `frontend/src/lib/ai/agents/vpbd.ts` | Pipeline, client relationships, revenue trajectory |
| CMO | `frontend/src/lib/ai/agents/cmo.ts` | Brand, content, marketing |

Each prompt is appended with `SPECIALIST_WEB_SEARCH_INSTRUCTIONS` (instructions for using
`searchWeb`, `researchCompany`, `searchConstructionMarket`).

---

## Orchestrator

**File:** `frontend/src/lib/ai/orchestrator.ts`

Key exports:
- `agentRegistry` — `Record<string, AgentConfig>` with all six specialists
- `createStrategistTools(userId, options)` — assembles the full Strategist tool set
- `consultAgent(agentId, question, userId, context, options)` — runs a specialist as a `ToolLoopAgent`
- `consultAgents()` — runs multiple specialists in parallel via `Promise.all`
- `makeConsultTool()` — factory that creates each `consultXxx` Zod-typed tool
- `getStrategistSystemPrompt()` — composes the three prompt layers
- `STRATEGIST_MODEL = "openai/gpt-5.4"`

### How Sub-Agent Invocation Works

1. Strategist calls a `consultXxx` tool (e.g., `consultCFO`)
2. `consultAgent()` looks up the specialist config in `agentRegistry`
3. Builds that specialist's tool set via `createSpecialistAgentTools()`
4. Constructs a `ToolLoopAgent` with `stopWhen: stepCountIs(5)`, 15-second timeout
5. Forwards up to 6 recent text turns of conversation history (tool call/result messages stripped)
6. Returns `AgentResponse` with `agent`, `content`, `confidence`, `toolsCalled[]`, `durationMs`

### Council Mode

When `councilMode: true`, `buildCouncilModePromptInjection()` appends ~60 lines to the
system prompt. The Strategist presents each specialist's analysis verbatim in their own
labeled voice, then adds a 1-2 sentence synthesis.

---

## Tool Files

All in `frontend/src/lib/ai/tools/`. Each file exports a factory function
`create*Tools(userId, options)` that returns a `Record<string, tool>`.

### `project-tools.ts` — Main composite factory

`createProjectTools(userId, options)` assembles tools from all sub-modules plus adds:

| Tool | What it does | Tables queried |
|------|-------------|----------------|
| `getMeetingIntelligence` | Meeting records + insight cards | `document_metadata`, `insight_cards` |
| `getProjectBriefingSnapshot` | Full project briefing | `projects`, `rfis`, `submittals`, `subcontracts`, `budget_lines`, `change_events` |
| `getPortfolioOverview` | Cross-project portfolio summary | `projects` |
| `getProjectsWithRisks` | Portfolio risk radar by score | `projects`, `insight_cards` |
| `getProjectRiskAnalysis` | Deep risk: AI insights, RFI aging, CO exposure | `projects`, `rfis`, `insight_cards`, `change_events` |
| `getFinancialAnalysis` | Cross-project financial overview | `projects`, `budget_lines`, `change_events` |
| `getProjectBudgetSummary` | Single-project budget health | `budget_lines`, `v_budget_lines` |
| `getActionItemsAndInsights` | Action items + insight cards | `insight_cards`, `insight_card_targets` |
| `getMeetingsByDate` | Meetings filtered by date range | `document_metadata` |
| `findProjectDocuments` | Document search with source filter | `document_metadata` |
| `searchDocuments` | Full-text document search | `document_metadata` |
| `getProjectDetails` | Core project metadata | `projects`, `people`, `companies` |

Also calls: `createFinancialTools`, `createAcumaticaTools`, `createOperationalTools`,
`createScheduleTools`, `createAppHelpTools`, `createForecastTools`, `createOutlookOperationsTools`

---

### `operational.ts` — Email, Teams, search, memory

`createOperationalTools(userId, options)`:

| Tool | What it does | Tables / RPCs |
|------|-------------|---------------|
| `getPeopleAndRoles` | Project team composition | `people`, `project_companies`, `companies` |
| `getVendorPerformance` | Subcontractor billing pace, disputes | `subcontracts`, `purchase_orders`, `companies` |
| `getRFIStatus` | RFI pipeline: open/closed, aging, BIC | `rfis` |
| `getSubmittalStatus` | Submittal pipeline with approval aging | `submittals` |
| `getCrossProjectComparison` | Cross-project metric comparison | varies by metric |
| `getHistoricalTrends` | Cost/schedule trend data | `budget_lines`, `change_events` |
| `semanticSearch` | Vector similarity search | `document_chunks` via `search_document_chunks` RPC |
| `getCompanyKnowledge` | Company knowledge base | `knowledge_base` via `search_all_knowledge` RPC |
| `recallPastConversations` | Search past conversation summaries | `conversation_summaries` |
| `searchMeetingsByTopic` | Keyword/semantic search across transcripts | `document_metadata`, `document_chunks` |
| `getMeetingDetails` | Full transcript by meeting ID or title | `document_metadata` |
| `saveToKnowledgeBase` | Insert into knowledge base | `knowledge_base` |
| `saveInsight` | Insert insight | `insights` |
| `searchMemories` | Query AI memory | `ai_memories` |
| `writeMemory` | Insert AI memory | `ai_memories` |
| `findProject` | Resolve project by name | `projects` |
| `getRecentEmails` | Query emails by date/sender/recipient | `outlook_email_intake` |
| `searchEmails` | Semantic search across emails | `document_chunks` via RPC |
| `searchTeamsMessages` | Semantic search across Teams | `document_chunks` via RPC |
| `searchExternalDocuments` | Search OneDrive/SharePoint docs | `document_metadata` |

---

### `financial.ts` — Financial data tools

`createFinancialTools(userId, options)`:

| Tool | What it does | Tables |
|------|-------------|--------|
| `getCommitmentsOverview` | Subcontracts + POs with SOV billing | `subcontracts`, `purchase_orders`, `schedule_of_values`, `sov_line_items`, `companies` |
| `getChangeOrderDetails` | Change order lifecycle (CE → CO → commitment) | `change_events`, `prime_contract_change_orders`, `change_order_lines` |
| `getDirectCostsSummary` | Direct costs by category | `direct_costs` |
| `getBudgetLineItems` | Line-item budget detail | `v_budget_lines` (view), `budget_lines` (fallback) |
| `getCostTrends` | Spending velocity over time | `budget_lines` |
| `getMarginAnalysis` | Margin erosion: original vs. current | `budget_lines`, `change_events` |

---

### `acumatica.ts` — Live ERP data

`createAcumaticaTools(userId, options)` — all calls go through `createAcumaticaClient()`:

| Tool | What it does |
|------|-------------|
| `getAPAgingReport` | Accounts payable aging buckets |
| `getARAgingReport` | Accounts receivable aging buckets |
| `getCashPositionReport` | Net cash flow (AR received vs AP issued), `windowDays?` param |
| `getVendorSpendReport` | Vendor spend breakdown from GL, `topN?` param |
| `getRecentBills` | Recent AP bills, `limit?` param |
| `getRecentInvoices` | Recent AR invoices, `limit?` param |
| `getAcumaticaProjectBudget` | Project budget by project code string (e.g. `"25108"`) |
| `getAcumaticaProjectList` | All Acumatica projects |
| `getPurchaseOrderSummary` | PO summary, `projectCode?` param |

**Auth:** Cookie-based (POST `/entity/auth/login` → 204 + cookies). NOT bearer token.
**Company:** `"Alleato Group LLC"` (exact casing required).
**NEVER use OData `$filter`** — causes HTTP 500. Filter in-memory. Safe: `$select`, `$top`, `$expand`.

---

### `action-tools.ts` — All write/mutation tools

`createActionTools(userId, options)` — 2900+ lines, the largest file.

#### The Preview/Confirm Pattern

Every write tool accepts `confirmed: boolean` (default `false`). When `false`, it returns:
```json
{ "action": "preview", "message": "...", "preview": { "table": "...", "fields": {} } }
```
Without writing anything. The UI shows a confirmation card. When `confirmed: true`, it proceeds with the INSERT. All writes are recorded to `ai_tool_write_audits` with a SHA-256 idempotency key.

#### Tool Schemas

**`createCommitment`**
```typescript
z.object({
  projectId: z.number(),
  type: z.enum(["subcontract", "purchase_order"]),
  title: z.string(),
  vendorName: z.string().optional(),
  contractNumber: z.string().optional(),
  status: z.enum(["Draft","Out for Bid","Out for Signature","Approved","Complete","Terminated","Void"]).default("Draft"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  estimatedCompletionDate: z.string().optional(),
  defaultRetainagePercent: z.number().optional(),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
})
```
Writes to `subcontracts` or `purchase_orders`. Auto-generates contract numbers (`SC-001`, `PO-001`). Resolves `vendorName` → `contract_company_id` via `companies` table.

**`createRFI`**
```typescript
z.object({
  projectId: z.number(),
  subject: z.string(),
  question: z.string(),
  ballInCourt: z.string().optional(),
  dueDate: z.string().optional(),
  costImpact: z.enum(["yes","no","tbd"]).optional(),
  scheduleImpact: z.enum(["yes","no","tbd"]).optional(),
  confirmed: z.boolean().default(false),
})
```
Writes to `rfis` with `status: "open"`, `is_private: false`.

**`createSubmittal`**
```typescript
z.object({
  projectId: z.number(),
  title: z.string(),
  submittalNumber: z.string().optional(),
  specSection: z.string().optional(),
  submittalType: z.string().optional(),
  dueDate: z.string().optional(),
  confirmed: z.boolean().default(false),
})
```

**`createChangeEvent`**
```typescript
z.object({
  projectId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  costImpact: z.string().optional(),
  scheduleImpact: z.string().optional(),
  confirmed: z.boolean().default(false),
})
```

**`createChangeOrder`**
```typescript
z.object({
  projectId: z.number(),
  changeEventId: z.string().optional(),
  title: z.string(),
  amount: z.number(),
  status: z.string().optional(),
  confirmed: z.boolean().default(false),
})
```
Writes to `prime_contract_change_orders`.

**`createGeneratedTask`**
```typescript
z.object({
  projectId: z.number().optional(),
  projectName: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["open","in_progress","completed","done","blocked","cancelled"]).optional(),
  priority: z.enum(["low","normal","medium","high","critical","urgent"]).optional(),
  dueDate: z.string().optional(),
  assignee: z.string().optional(),
  sourceSystem: z.string().optional(),
  confirmed: z.boolean().default(false),
})
```
Writes to `tasks` table. Resolves assignee name → `people.id` via fuzzy match.

#### All Write Tools

| Tool | Writes to | Key params |
|------|-----------|-----------|
| `createChangeOrder` | `prime_contract_change_orders` | projectId, title, amount |
| `createChangeEvent` | `change_events` | projectId, title |
| `updateProjectStatus` | `projects` | projectId, healthStatus?, phase? |
| `createRFI` | `rfis` | projectId, subject, question |
| `createTask` | `schedule_tasks` | projectId, title |
| `createGeneratedTask` | `tasks` | projectId/Name, title |
| `createProjectCompany` | `project_companies` | projectId, companyName |
| `createProjectContact` | `people` | projectId, firstName, lastName |
| `updateGeneratedTask` | `tasks` | taskId |
| `deleteGeneratedTask` | `tasks` | taskId |
| `flagProjectRisk` | `insight_cards` | projectId, title, severity |
| `updateRFIStatus` | `rfis` | rfiId, status |
| `createMeetingNote` | `document_metadata` | projectId, title, content |
| `createSubmittal` | `submittals` | projectId, title |
| `logDailyReport` | `document_metadata` | projectId, date, content |
| `generateProjectSummary` | `knowledge_base` (optional) | projectId/Name |
| `createInitiativeCard` | `initiative_cards` | title, description |
| `createCommitment` | `subcontracts` or `purchase_orders` | projectId, type, title |
| `submitFeedback` | `admin_feedback` + GitHub issue | title, description |
| `createOutlookCalendarInvite` | Outlook Calendar via Graph API | subject, startDateTime, endDateTime, attendees[] |
| `draftOutlookEmail` | Outlook Drafts via Graph API | to[], subject, body |
| `sendTeamsMessage` | Teams Channel via Graph API | teamName, channelName, message |

---

### Other Tool Files

| File | Factory | Purpose |
|------|---------|---------|
| `schedule-tools.ts` | `createScheduleTools` | `getScheduleAnalysis` — health from `schedule_tasks` + `schedule_dependencies` |
| `forecast-tools.ts` | `createForecastTools` | `getForecastComparison` — budget vs. actual vs. forecast |
| `web-search.ts` | `createWebSearchTools` | `searchWeb`, `researchCompany`, `searchConstructionMarket` via Tavily |
| `app-help-tools.ts` | — | `searchAppHelp` — searches published help articles |
| `workspace-tools.ts` | `createWorkspaceTools` | AI workspace artifacts (drafts, documents) |
| `document-intelligence.ts` | `createDocumentIntelligenceTools` | Document analysis |
| `intelligence-tools.ts` | `createIntelligenceTools` | Domain intelligence packets |
| `marketing.ts` | `createMarketingTools` | CMO-specific tools |
| `progress-report-tools.ts` | `createProgressReportTools` | Project progress report generation |

---

## AI Provider Setup

**File:** `frontend/src/lib/ai/providers.ts`
**Config:** `frontend/src/lib/ai/provider-config.ts`

### Model IDs

| Use | Model ID |
|-----|----------|
| Strategist (main) | `openai/gpt-5.4` |
| All 6 specialists | `openai/gpt-5.4-mini` |
| Title generation | `gpt-4.1-nano` |
| Artifact generation | `gpt-4.1-nano` |

### Provider Routing

`getAiProviderPath()` returns:
- `"vercel_gateway"` if `AI_GATEWAY_API_KEY` is set (default)
- `"openai"` if `AI_PROVIDER_PATH=openai`

When using Vercel AI Gateway:
- Base URL: `https://ai-gateway.vercel.sh/v1`
- Model IDs get `openai/` prefix prepended (e.g., `openai/gpt-5.4`)

When using direct OpenAI: strips `openai/` prefix.

### Dev Tools

In development, `@ai-sdk/devtools` wraps all models via `withDevTools()`. Dev server: `http://localhost:4983`.

---

## Chat API Routes

**Primary:** `POST /api/ai-assistant/chat`
- File: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Handler: `handler-v2.ts` → `handleChatV2()` → `runChatV2()`
- Auth: `getApiRouteUser()` required, throws 401 if missing
- `maxDuration = 120` seconds
- Request: `{ id: sessionId, messages: UIMessage[], selectedProjectId?: number, selectedModel?: string }`

**Retrieval planner (runs BEFORE streamText):**
1. `planRetrieval()` — classifies intent, determines retrieval sources
2. `executeRetrievalPlan()` — runs sources in parallel (intelligence packet, project snapshot, semantic vector results, recent emails, source-specific RAG)
3. Retrieved context injected into system prompt via `assembleSystemPromptFromContext()`
4. Only then: `streamText` called

**Other routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai-assistant/conversations` | GET | List conversations |
| `/api/ai-assistant/conversations/[sessionId]` | GET, DELETE | Single conversation |
| `/api/ai-assistant/messages/[sessionId]` | GET | Message history |
| `/api/ai-assistant/memories` | GET, POST | List/create memories |
| `/api/ai-assistant/memories/[memoryId]` | GET, PATCH, DELETE | Single memory CRUD |
| `/api/ai-assistant/workspace` | GET, POST | Workspace artifacts |
| `/api/ai-assistant/workspace/[artifactId]` | GET, PATCH, DELETE | Single artifact |
| `/api/ai-assistant/feedback` | POST | Thumbs up/down |
| `/api/ai-assistant/speech` | POST | TTS |
| `/api/ai-assistant/usage-stats` | GET | Usage statistics |

---

## Database Tables Used by AI

### Read tables

| Table | Used by |
|-------|---------|
| `projects` | All tools via `resolveProject()`, system prompt context |
| `document_metadata` | Meeting intel, document search, Teams messages |
| `document_chunks` | Semantic search, email search, Teams search via RPC |
| `outlook_email_intake` | `getRecentEmails` (direct date-based query) |
| `insight_cards` | Project briefing, meeting intel, action items |
| `insight_card_targets` | Joined with `insight_cards` for project scoping |
| `rfis` | RFI status, risk analysis |
| `submittals` | Submittal status |
| `subcontracts` | Commitments overview |
| `purchase_orders` | Commitments overview |
| `schedule_of_values` | Commitments overview (SOV billing) |
| `sov_line_items` | Commitments overview |
| `budget_lines` / `v_budget_lines` | Budget line items, margin analysis |
| `change_events` | Change order details, risk analysis |
| `prime_contract_change_orders` | Change order details |
| `direct_costs` | Direct costs summary |
| `schedule_tasks` | Schedule analysis |
| `schedule_dependencies` | Schedule analysis |
| `people` | Team composition, assignee resolution |
| `companies` | Vendor performance, commitment vendor lookup |
| `project_companies` | Team composition |
| `knowledge_base` | Company knowledge |
| `ai_memories` | User memory |
| `conversation_summaries` | Past conversation recall |
| `chat_history` | Conversation persistence |
| `tasks` | AI-generated tasks |

### Write tables

| Table | Written by |
|-------|-----------|
| `rfis` | `createRFI`, `updateRFIStatus` |
| `submittals` | `createSubmittal` |
| `subcontracts` | `createCommitment` (type: subcontract) |
| `purchase_orders` | `createCommitment` (type: purchase_order) |
| `change_events` | `createChangeEvent` |
| `prime_contract_change_orders` | `createChangeOrder` |
| `schedule_tasks` | `createTask` |
| `tasks` | `createGeneratedTask`, `updateGeneratedTask`, `deleteGeneratedTask` |
| `project_companies` | `createProjectCompany` |
| `people` | `createProjectContact` |
| `projects` | `updateProjectStatus` |
| `document_metadata` | `createMeetingNote`, `logDailyReport` |
| `knowledge_base` | `saveToKnowledgeBase`, `generateProjectSummary` |
| `insights` | `saveInsight` |
| `ai_memories` | `writeMemory` |
| `insight_cards` | `flagProjectRisk`, `createInitiativeCard` |
| `ai_tool_write_audits` | Every write tool (idempotency + audit log) |

### RPC Functions

| RPC | Used by | Description |
|-----|---------|-------------|
| `search_document_chunks` | `semanticSearch`, `searchEmails`, `searchTeamsMessages` | pgvector cosine similarity search |
| `search_all_knowledge` | `getCompanyKnowledge` | Cross-source knowledge search |

---

## Microsoft Graph Integration (Python Backend)

**Location:** `backend/src/services/integrations/microsoft_graph/`

### Authentication

App-only (client credentials) flow in `client.py`:
- Env vars: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- Token endpoint: `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`
- Grant type: `client_credentials`, scope: `https://graph.microsoft.com/.default`
- Token cached with 60-second safety margin before expiry

### What Gets Synced

| Source | File | Destination table | Method |
|--------|------|------------------|--------|
| Outlook emails | `outlook.py` | `outlook_email_intake` → `document_metadata` | Graph delta queries |
| Teams channels | `teams.py` | `document_metadata` | Graph delta queries |
| Teams DMs | `teams.py` | `document_metadata` | Timestamp-based (no delta for app-only auth) |
| OneDrive files | `onedrive.py` | `document_metadata` | Per-folder enumeration |

### Sync Orchestration (`sync.py`)

`run_graph_sync(supabase, ...)` steps:
1. **Outlook** — per user in `MICROSOFT_SYNC_USERS`, stalest first, limited by `OUTLOOK_SYNC_MAX_USERS`
2. **Teams channels** — limited by `TEAMS_CHANNEL_SYNC_MAX_CHANNELS` (default 5)
3. **Teams DMs** — per user, timestamp-based
4. **OneDrive** — per user
5. **Embedding** — `embed_pending_graph_documents()` from `embed.py`:
   - Finds `document_metadata` rows with `status='raw_ingested'` and `source='microsoft_graph'`
   - Chunks to 3000 chars with 400-char overlap
   - Calls OpenAI `text-embedding-3-large` (3072 dims)
   - Writes to `document_chunks` in the **AI Database** Supabase project (separate from main app DB)
6. **Attachment promotion** — `promote_outlook_intake_attachments()`
7. **Teams compiler** — if `run_teams_compiler=True`

Delta tokens saved to `graph_sync_state`. Sync records written to `source_sync_runs`.

### Key Portable Functions

| Function | File | What it does |
|----------|------|-------------|
| `GraphClient._get_token()` | `client.py` | OAuth2 client credentials with auto-refresh |
| `GraphClient._get_with_retry()` | `client.py` | GET with exponential backoff + Retry-After |
| `run_graph_sync()` | `sync.py` | Full orchestration entry point |
| `sync_outlook_mailbox_delta()` | `outlook.py` | Single-mailbox incremental sync |
| `embed_pending_graph_documents()` | `embed.py` | Chunk and embed pipeline |
| `_limit_sync_users()` | `sync.py` | Staleness-aware user rotation for rate limit compliance |

### Known Limitations

Teams DMs: 10 permanent 403s on cross-tenant (`@unq.gbl.spaces`) and meeting chats
(`@thread.v2`). Hard Graph API limitation with app-only auth — not fixable.

---

## Teams Compiler

**File:** `backend/src/services/intelligence/teams_compiler.py`

Compiles Teams DM threads into structured intelligence packets.

| Setting | Value |
|---------|-------|
| Min chars to compile | `MIN_COMPILER_CHARS = 200` |
| Max chars to LLM | `MAX_LLM_CONVERSATION_CHARS = 6000` |
| Batch size | 25 |
| Time limit | 170 seconds |
| Prompt version | `teams_compiler.tasks.v5.gpt-5.5` |

Writes to: `project_insights`, `tasks`, `insights`, `source_signal_candidates`

Uses `get_rag_read_client()` / `get_rag_write_client()` helpers which target the
**AI Database** Supabase project (`fqcvmfqldlewvbsuxdvz`), not the main app DB.

---

## Frontend Chat UI

**Primary component:** `frontend/src/components/ai-assistant/chat-area.tsx`

Uses Vercel AI SDK's `useChat` hook with `DefaultChatTransport` streaming to `/api/ai-assistant/chat`.

### Streaming Parts

The handler uses `createUIMessageStream` + `createUIMessageStreamResponse` (Vercel AI SDK v6):

| Part type | What it carries |
|-----------|----------------|
| `data-status` | Planning stage, retrieval-complete, complete — rendered as status indicator |
| Text delta | Streaming markdown |
| `tool-{toolName}` | Tool call with `toolCallId`, `input`, `state`, `output` |
| `data-assistant-widget` | Widget cards (task summaries, meeting intel, etc.) |

### Widget Types (`assistant-widgets.ts`)

| Widget | Payload type | Displays |
|--------|-------------|---------|
| `task_summary` | `TaskSummaryWidgetPayload` | Table of tasks with links |
| `meeting_intelligence` | `MeetingIntelligenceWidgetPayload` | Meeting cards with risks/decisions/action items |
| `source_evidence` | — | Source attribution cards |

### Confirmation Flow

Write tools render a `<Confirmation>` component. User clicks Accept → sends follow-up message with `confirmed: true`.

### Voice

Web Speech API for voice input. TTS via `POST /api/ai-assistant/speech`.

---

## Key File Index

### Frontend AI Layer
```
frontend/src/lib/ai/
├── orchestrator.ts          # Agent registry, createStrategistTools, consultAgent
├── bot-core.ts              # assembleSystemPrompt, streamBotResponse, persistChatMessage
├── providers.ts             # getLanguageModel, getTitleModel
├── provider-config.ts       # Gateway vs direct OpenAI routing
├── assistant-models.ts      # Model ID enum and defaults
├── soul.ts                  # Personality layer
├── identity.ts              # Self-concept layer
├── agents/
│   ├── strategist.ts        # Main orchestrator prompt
│   ├── cfo.ts
│   ├── coo.ts
│   ├── cro.ts
│   ├── chro.ts
│   ├── vpbd.ts
│   └── cmo.ts
├── tools/
│   ├── project-tools.ts     # Main composite factory
│   ├── operational.ts       # Email, Teams, search, memory
│   ├── financial.ts         # Commitments, change orders, budget
│   ├── acumatica.ts         # Live ERP data
│   ├── action-tools.ts      # All write/mutation tools (2900+ lines)
│   ├── schedule-tools.ts
│   ├── forecast-tools.ts
│   ├── web-search.ts        # Tavily
│   ├── app-help-tools.ts
│   ├── workspace-tools.ts
│   ├── document-intelligence.ts
│   ├── intelligence-tools.ts
│   ├── marketing.ts
│   ├── progress-report-tools.ts
│   └── structured-output.ts
└── retrieval/
    ├── planner.ts           # Intent classification + retrieval plan
    └── executor.ts          # Parallel retrieval execution

frontend/src/app/api/ai-assistant/
├── chat/
│   ├── route.ts             # Entry point, maxDuration=120
│   └── handler-v2.ts        # Full handler: retrieval planner → streamText
├── conversations/
├── messages/
├── memories/
├── workspace/
├── feedback/
└── speech/

frontend/src/components/ai-assistant/
└── chat-area.tsx            # Primary chat UI
```

### Backend AI Layer
```
backend/src/services/
├── integrations/microsoft_graph/
│   ├── client.py            # GraphClient, OAuth2 app-only auth
│   ├── sync.py              # run_graph_sync() — main orchestrator
│   ├── outlook.py           # Email sync with delta queries
│   ├── teams.py             # Teams channels + DMs
│   ├── onedrive.py          # OneDrive file sync
│   └── embed.py             # Chunking + embedding pipeline
└── intelligence/
    └── teams_compiler.py    # Teams DMs → structured intelligence
```

---

## Two Supabase Projects

| Project | Ref | What lives here |
|---------|-----|-----------------|
| PM APP (main DB) | `lgveqfnpkxvzbnnwuled` | All app tables: projects, contracts, budgets, emails, meetings, etc. Uses `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| AI Database (RAG vectors) | `fqcvmfqldlewvbsuxdvz` | `document_chunks`, `rag_document_metadata`, `rag_pipeline_state`. Uses `RAG_SUPABASE_URL` and `get_rag_read_client()` / `get_rag_write_client()` helpers |

Rule: anything RAG/embeddings/chunks → AI Database. Everything else → PM APP.

---

## What's Most Portable to a New Backend

In priority order:

1. **Prompt files** (`soul.ts`, `identity.ts`, `agents/*.ts`) — pure text, zero deps, drop in directly
2. **Microsoft Graph backend** (`backend/src/services/integrations/microsoft_graph/`) — self-contained Python, portable with minimal changes
3. **Teams compiler** (`teams_compiler.py`) — standalone intelligence extraction pipeline
4. **Action tool schemas** — the Zod schemas and preview/confirm pattern from `action-tools.ts`
5. **Retrieval planner pattern** — intent classification before `streamText` with parallel pre-fetch
6. **`ai_tool_write_audits` idempotency pattern** — SHA-256 key + audit log on all writes
