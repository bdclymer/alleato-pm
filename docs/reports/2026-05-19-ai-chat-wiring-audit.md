# AI Chat Wiring Audit — 2026-05-19

This audit traces what the **live AI chat** actually loads at runtime versus what code exists under `frontend/src/lib/ai/`. Sources: handler-v2.ts, orchestrator.ts, bot-core.ts, and every file under `frontend/src/lib/ai/tools/`. No code was modified.

---

## 1. Live chat entry point

There are three "chat-shaped" API routes. **Only the first is the production chat the user is complaining about.**

### A. `frontend/src/app/api/ai-assistant/chat/route.ts` — THE LIVE CHAT
- 10-line passthrough that calls `handleChatV2` from `./handler-v2`.
- Hit by `frontend/src/components/ai-assistant/rag-chat-page.tsx:271` and `frontend/src/components/ai-assistant/compact-ai-chat.tsx:303` via `api: "/api/ai-assistant/chat"`.

Imports inside `handler-v2.ts` (lines 1–58) — these are the only modules the live chat actually loads:
```
ai (streamText, stepCountIs, createUIMessageStream, ...)
@/lib/ai/langfuse-trace
@/lib/ai/retrieval/planner            → planRetrieval
@/lib/ai/retrieval/executor           → executeRetrievalPlan
@/lib/ai/retrieval/system-prompt      → assembleSystemPromptFromContext
@/lib/ai/retrieval/deps               → buildExecutorDeps
@/lib/ai/bot-core                     → assembleSystemPrompt, runPostResponseTasks
@/lib/ai/orchestrator                 → createStrategistTools
@/lib/ai/providers                    → getLanguageModel
@/lib/ai/score-response-quality
@/lib/ai/assistant-widgets            (type only)
@/lib/ai/deep-agent-project-status    (many helpers — backend bridge)
@/lib/ai/services/marketing-service   → createWeeklyMarketingContentWorkflow
@/lib/ai/assistant-models
@/lib/supabase/server, @/lib/supabase/service, @/lib/guardrails
```

The strategist model selector lives in `handler-v2.ts:1751–1827` and constructs `tools = createStrategistTools(args.user.id, { pinnedProjectId, sessionId, includeActionTools: true, onTrace })`. That single call is the gateway into the entire tool surface.

### B. `frontend/src/app/api/ai-assistant-v2/deep-agent/route.ts` — Deep-agent bridge
- Calls `fetchDeepAgentProjectStatus` / `fetchDeepAgentExecutiveBriefing` against the Render backend. Used by `frontend/src/components/ai-assistant-v2/advisor-chat.tsx`. Not the main chat.

### C. `frontend/src/app/api/procore-docs/chat/route.ts` — Procore docs chat
- Independent RAG chat for Procore documentation. Uses its own `openai.embeddings.create()` + raw `streamText` with **zero project tools wired**. Not the main chat.

---

## 2. Full inventory of `frontend/src/lib/ai/`

90 files (excluding `__tests__/`, `.test.ts`, `.mock.ts`). Grouped by subdirectory:

### Top-level (`frontend/src/lib/ai/`)
| File | Role |
|---|---|
| `action-capabilities.ts` | Catalog of write-action capabilities the assistant advertises |
| `assistant-models.ts` | Model id whitelist (`DEFAULT_AI_ASSISTANT_MODEL`, `isAiAssistantModelId`, `isDeepAgentsStrategistModelId`) |
| `assistant-self-knowledge.ts` | `createAssistantSelfInspectionTools` — 3 tools (`describeAssistantCapabilities`, `explainAssistantRetrievalOrder`, `explainLastAnswerSources`) |
| `assistant-widgets.ts` | UIMessage data-part shapes (task summary, intelligence packet, etc.) |
| `bot-core.ts` | `assembleSystemPrompt`, `runPostResponseTasks`, `generateBotResponse`, `loadConversationHistory`. Adds memory + learning + workspace + project context to system prompt |
| `calendar-invite-parser.ts` | **ORPHAN** — 0 consumers |
| `deep-agent-project-status.ts` | Fetch + format Render-backend Deep Agent responses (research, project, executive) |
| `detect-rag-request.ts` | Helper used by some routes to decide if RAG retrieval should fire |
| `entitlements.ts` | **ORPHAN** — 0 consumers |
| `fallback-chain.ts` | Defines model-fallback chain; **1 consumer** (assistant-models) — load minimal |
| `identity.ts` | Static "who you are" string injected into strategist prompt |
| `intent-classifier.ts` | Older keyword-based classifier — **1 consumer** (intent-router test) |
| `intent-router.ts` | `classifyAssistantIntent`, `shouldUsePacketFirstIntent` — used by `retrieval/planner.ts` |
| `langfuse-trace.ts` | `traceChatCompletion` |
| `meeting-insight-signals.ts` | Heuristics for meeting risk/decision tagging |
| `model-pricing.ts` | Per-model $/token rates |
| `models.ts` | Provider model registry |
| `onboarding-insights.ts` | **ORPHAN** — 0 consumers |
| `orchestrator.ts` | `createStrategistTools` (THE function the live chat calls), `consultAgent`, agentRegistry (CFO, COO, CRO, CHRO, VPBD, CMO), `STRATEGIST_MODEL`, `getStrategistSystemPrompt` |
| `persona-and-memory.ts` | `I_DONT_KNOW_REFLEX_PROMPT` (one static string injected into strategist prompt) |
| `personal-daily-brief.ts` | **ORPHAN** — 0 consumers |
| `preflights.ts` | **ORPHAN** — 0 consumers (imports `./tools/guardrails`) |
| `prompt-diagnostics.ts` | Helper for `/admin/ai-assistant/prompt-diagnostics` |
| `prompts.ts` | Misc prompt fragments |
| `provider-config.ts` | OpenAI-compatible client config (AI Gateway + BYOK) |
| `provider-routing.ts` | **ORPHAN** — 0 consumers |
| `providers.ts` | `getLanguageModel(modelId)` — used everywhere |
| `rag-assistant-prompt.ts` | **ORPHAN** — 2 historical refs but no live importer |
| `score-response-quality.ts` | Heuristic scoring of assistant response |
| `session-id.ts` | `toSessionUuid` |
| `soul.ts` | Personality string injected into strategist prompt |
| `source-health.ts` | Reads `source_signal_candidates` |
| `strategist-failure-response.ts` | Fallback canned answer when strategist errors |
| `system-prompt.ts` | **ORPHAN** — 2 historical refs, no live importer (the LIVE prompt assembler is `bot-core.ts` + `retrieval/system-prompt.ts`) |
| `task-feedback-types.ts` | Type shapes for task feedback |
| `task-source-review.ts` | **ORPHAN** — 0 consumers |

### `agents/` — C-Suite specialist prompts
`cfo.ts`, `chro.ts`, `cmo.ts`, `coo.ts`, `cro.ts`, `strategist.ts`, `vpbd.ts`, `types.ts` — all imported by `orchestrator.ts`. All LIVE.

### `insight-cards/`
`index.ts` — **declared orphan** by import name, but the symbols it re-exports (`RISK_CARD_TYPES`, `findInsightCardIdsBySourceDocuments`, etc.) ARE used by `tools/project-tools.ts` and `tools/operational.ts` via `@/lib/ai/insight-cards` path. **LIVE.**

### `intelligence/`
| File | Status |
|---|---|
| `packet-service.ts` | LIVE — used by `tools/intelligence-tools.ts` + several services |
| `page-state.ts` | LIVE — used by intelligence page client |
| `types.ts` | LIVE — type definitions |
| `advisor-synthesis.ts` | **ORPHAN** — 0 consumers (only its own test) |

### `prompts/`
`meeting-prep.ts`, `progress-report.ts` — both consumed by route handlers. LIVE.

### `retrieval/` — THE retrieval planner used by handler-v2
| File | Role |
|---|---|
| `planner.ts` | `planRetrieval` — returns `{ intent, reason, sources, responseFormat }` |
| `executor.ts` | `executeRetrievalPlan` — executes the plan against Supabase + RAG |
| `system-prompt.ts` | `assembleSystemPromptFromContext` — merges retrieval result into system prompt |
| `deps.ts` | `buildExecutorDeps` — wires `createProjectTools` + `createOperationalTools` for retrieval |
| `retrieval-weight-scoring.ts` | Scoring helper |
| `reusable-briefing.ts` | Briefing builder |
| `source-specific-rag.ts` | Source-specific RAG routing |
| `types.ts` | **ORPHAN** — 0 importers |

### `services/`
| File | Role |
|---|---|
| `agent-learning-service.ts` | LIVE — `getRelevantAgentLearnings`, `buildAgentLearningContextBlock` (used in bot-core system prompt) |
| `ai-memory-service.ts` | LIVE — `writeMemory`, `searchMemories`, `getMemoriesForSession`, `buildMemoryContextPayload` (used by bot-core + operational + memory-extraction) |
| `conversation-memory.ts` | LIVE — `generateConversationMemory`, `getRecentConversationSummaries`, `buildRecentConversationsBlock` |
| `feedback-event-service.ts` | LIVE — promotes feedback into ai_memories |
| `marketing-service.ts` | LIVE — `createWeeklyMarketingContentWorkflow` (called from handler-v2) |
| `memory-extraction.ts` | LIVE — `extractAndStoreMemories`, called from `runPostResponseTasks` |
| `project-intelligence-summary.ts` | LIVE — admin/intelligence routes |
| `project-operating-summary-sources.ts` | LIVE — backend compiler |
| `source-sync-summary.ts` | LIVE — admin pages |
| `task-training-service.ts` | LIVE — `shouldLoadTaskTrainingContext`, `buildTaskGenerationTrainingBlock` in bot-core |
| `workspace-artifact-service.ts` | LIVE — workspace artifacts |

### `tools/` — see Section 4 for tool-level wiring

---

## 3. Import graph from the live chat entry point

Starting at `handler-v2.ts` and walking transitively:

### LIVE in the chat (reachable from `createStrategistTools`)
- `bot-core.ts` → memory, learning, workspace, task-training context blocks
- `orchestrator.ts` → consult tools, agent registry, strategist prompt
- `agents/*` → all 7 specialist prompts
- `retrieval/{planner,executor,system-prompt,deps,retrieval-weight-scoring,reusable-briefing,source-specific-rag}.ts`
- `tools/project-tools.ts` → spreads in financial, acumatica, operational, schedule, app-help, forecast, outlook-operations, structured-queries
- `tools/financial.ts`, `tools/acumatica.ts`, `tools/operational.ts`, `tools/schedule-tools.ts`, `tools/app-help-tools.ts`, `tools/forecast-tools.ts`, `tools/outlook-operations.ts`, `tools/structured-queries.ts` (via project-tools and operational composition)
- `tools/action-tools.ts` (when `includeActionTools: true`, which handler-v2 sets at line 1712)
- `tools/feature-request-tools.ts`, `tools/marketing.ts`, `tools/progress-report-tools.ts`, `tools/workspace-tools.ts`, `tools/web-search.ts`, `tools/structured-output.ts`, `tools/document-intelligence.ts`, `tools/intelligence-tools.ts`
- `tools/tool-utils.ts`, `tools/guardrails.ts` (helpers)
- `assistant-self-knowledge.ts` (self-inspection tools)
- `deep-agent-project-status.ts` (Render backend bridge)
- `services/{ai-memory-service,conversation-memory,memory-extraction,agent-learning-service,workspace-artifact-service,task-training-service,marketing-service}.ts`
- `score-response-quality.ts`, `langfuse-trace.ts`, `assistant-models.ts`, `providers.ts`, `provider-config.ts`
- `soul.ts`, `identity.ts`, `persona-and-memory.ts`, `intent-router.ts`, `meeting-insight-signals.ts`, `models.ts`, `model-pricing.ts`, `session-id.ts`, `source-health.ts`, `insight-cards/index.ts`, `intelligence/{packet-service,types,page-state}.ts`

### ORPHANS (in `lib/ai/` but never reach the chat or any route)
Verified by grepping ALL `*.ts`/`*.tsx` consumers (excluding the file itself, tests, mocks, and generated db-inventory).

| File | Consumer refs outside itself | Notes |
|---|---|---|
| `calendar-invite-parser.ts` | 0 | Has its own test, no live consumer |
| `entitlements.ts` | 0 | No consumer |
| `onboarding-insights.ts` | 0 | No consumer |
| `personal-daily-brief.ts` | 0 | Has its own test, no live consumer |
| `preflights.ts` | 0 | No consumer |
| `provider-routing.ts` | 0 | Has its own test only |
| `task-source-review.ts` | 0 | Has its own test only |
| `intelligence/advisor-synthesis.ts` | 0 | Has its own test only |
| `rag-assistant-prompt.ts` | 0 live (2 string refs in soul/audit notes) | Older prompt module replaced by strategist + retrieval system prompts |
| `system-prompt.ts` | 0 live | Replaced by `retrieval/system-prompt.ts` + `bot-core.ts` |
| `retrieval/types.ts` | 0 importers found | Either dead or imported only via type-only path that grep missed |
| `tools/mcp-tools.ts` | 0 (test only) | MCP tool plumbing never connected |
| `tools/get-weather.ts` | 0 | Demo tool from AI-SDK starter |
| `tools/create-document.ts` | 0 | Document-tool starter — not wired to chat |
| `tools/update-document.ts` | 0 | Same |
| `tools/request-suggestions.ts` | 0 | Same |
| `fallback-chain.ts` | 1 | Used by `assistant-models.ts`; lightweight, retain |
| `intent-classifier.ts` | 1 | Used by `intent-router.ts`; retain |

**Tool-file orphans that ARE live via composition** (initial grep missed because they're spread inside `createProjectTools` / `createOperationalTools`):
- `tools/financial.ts` (in `project-tools.ts:4`)
- `tools/acumatica.ts` (in `project-tools.ts:5`)
- `tools/schedule-tools.ts` (in `project-tools.ts:7`)
- `tools/app-help-tools.ts` (in `project-tools.ts:8`)
- `tools/forecast-tools.ts` (in `project-tools.ts:9`)
- `tools/outlook-operations.ts` (in `project-tools.ts:10`)
- `tools/structured-queries.ts` (in `operational.ts:8`)

---

## 4. Tool inventory — claimed vs actually registered

### Tools DEFINED in `frontend/src/lib/ai/tools/`
Counted by grepping `^\s+name:\s*(tool|defineReadTool|defineWriteTool)\(` plus `const ... = tool({` patterns.

| File | Tools defined |
|---|---|
| `action-tools.ts` | 23 |
| `operational.ts` | 20 |
| `project-tools.ts` | 12 (own) |
| `feature-request-tools.ts` | 11 |
| `acumatica.ts` | 9 |
| `structured-queries.ts` | 7 |
| `marketing.ts` | 6 |
| `financial.ts` | 6 |
| `document-intelligence.ts` | 5 |
| `progress-report-tools.ts` | 5 |
| `workspace-tools.ts` | 4 |
| `web-search.ts` | 3 |
| `intelligence-tools.ts` | 2 |
| `outlook-operations.ts` | 2 |
| `app-help-tools.ts` | 1 |
| `forecast-tools.ts` | 1 |
| `schedule-tools.ts` | 1 |
| `structured-output.ts` | 1 |
| `create-document.ts` | 1 (orphan) |
| `update-document.ts` | 1 (orphan) |
| `request-suggestions.ts` | 1 (orphan) |
| `get-weather.ts` | 1 (orphan) |
| `mcp-tools.ts` | 0 active (policy stub only) |
| `assistant-self-knowledge.ts` (top-level) | 3 |

**Total tool definitions: ~124** (vs the memory's "28+ across 6 files" claim — memory is badly out of date).

### Tools ACTUALLY REGISTERED on the live strategist
Built by `createStrategistTools` (orchestrator.ts:991–1172) with `includeActionTools: true` (handler-v2.ts:1712):

```
strategistTools = {
  ...createAssistantSelfInspectionTools  → 3
  ...createWebSearchTools                → 3   (searchWeb, researchCompany, searchConstructionMarket)
  ...createStructuredOutputTools         → 1   (extractStructuredActionBrief)
  ...createActionTools                   → 23  WITH Microsoft tools omitted (line 1004) → 21
  ...createFeatureRequestTools           → 11
  ...createProgressReportTools           → 5
  ...createWorkspaceTools                → 4
  ...createDocumentIntelligenceTools     → 5
  ...createIntelligenceTools             → 2   (listDomainIntelligence, getDomainIntelligence)
  consultCFO, consultCOO, consultCRO,
  consultCHRO, consultVPBD, consultCMO,
  consultMicrosoftExecutiveAssistant     → 7
  ...createProjectTools  (Microsoft tools omitted)
       financial (6) + acumatica (9) + operational (20 → minus 4 Microsoft = 16)
       + schedule (1) + app-help (1) + forecast (1) + outlook-operations (2, ALSO Microsoft-omitted = 0)
       + structured-queries (7) + project-tools own (12)
       → ~52 after Microsoft filtering
}
```

**Live strategist tool count: ~117 tools.**

### The "rot" delta
- Defined in `lib/ai/tools/`: **124**
- Wired into the live strategist: **~117**
- Truly orphaned tools (defined but never reachable from the chat): **4** — `get-weather`, `create-document`, `update-document`, `request-suggestions`. All four are vestigial AI-SDK starter examples; the dedicated `document.tsx` UI component still references their string names but no API route imports the tool factories.
- 9 Microsoft-operator tools are **defined but filtered out** of strategist tools by `MICROSOFT_OPERATOR_TOOL_NAMES` (orchestrator.ts:83–98). The strategist must delegate to the Microsoft Executive Assistant (Python backend) via `consultMicrosoftExecutiveAssistant` instead of calling them directly.

So the headline complaint ("28+ tools across 6 files") is wildly under-counted. The real story is that the chat has **a LOT of tools** but most are leaf-level retrieval / write helpers — the structured query coverage is thin (see Section 6).

---

## 5. Memory system audit

**Memory IS still wired.** Every claim that "memory features that used to work no longer do" needs a different root cause than missing code.

### What loads on every chat turn

`handler-v2.ts:1662–1678` calls `assembleSystemPrompt(...)` from `bot-core.ts`, which **always** does (`bot-core.ts:126–193`):
1. `getMemoriesForSession({ userId, firstMessage })` from `services/ai-memory-service.ts` → reads `ai_memories` table, returns preferences + relevant + team memories.
2. `getRecentConversationSummaries(userId, sessionId, 3)` from `services/conversation-memory.ts` → reads cross-session memories (only on first turn).
3. `listArtifacts({ userId, projectId, status: "draft", limit: 5 })` from `services/workspace-artifact-service.ts` → workspace artifacts (only on first turn).
4. `getRelevantAgentLearnings({ messageText, projectId, limit: 4 })` from `services/agent-learning-service.ts` → injects "lessons learned" patterns.
5. `buildMemoryContextPayload(...)` + `buildAgentLearningContextBlock(...)` + `buildRecentConversationsBlock(...)` + `buildWorkspaceContextBlock(...)` are concatenated onto the strategist system prompt.

`runPostResponseTasks(sessionId, userId)` is also fire-and-forget on every response (`bot-core.ts:571–586`), which runs:
- `generateConversationMemory(sessionId, userId)` — summarises the session and upserts into `memories`.
- `extractAndStoreMemories(sessionId, userId)` — extracts atomic facts/preferences and writes to `ai_memories`.

### Tools the AI can call mid-conversation

In `operational.ts`:
- `writeMemory` (line 2779) — writes to `ai_memories`
- `searchMemories` (line 2720) — vector search of `ai_memories`
- `recallPastConversations` (line 2044) — searches conversation summaries
- `saveToKnowledgeBase` (line 2495), `saveInsight` (line 2555) — durable knowledge writes

### Tables

| Table | Migrations | Used by |
|---|---|---|
| `ai_memories` | `20260313000004_ai_memories.sql`, `20260313000005_ai_memories_enhancements.sql`, `20260429*_secure/bound/...sql`, `20260518020000_drop_ai_memories_hnsw_and_clear_embeddings.sql` | `ai-memory-service.ts` (read/write), `memory-extraction.ts` (write), `feedback-event-service.ts` (promote), workspace promotion |
| `memories` (conversation summaries) | `20260306000001_conversation_memories.sql` | `conversation-memory.ts` (write), `recallPastConversations` tool (read via RPC) |
| `chat_history` | (existing) | every turn writes user + assistant rows in handler-v2 |
| `document_chunks` (AI DB) | RAG embeddings | `ai-memory-service.ts:73` syncs memory embeddings into the AI Database via `syncMemoryChunkToAiDb` |

### What did historically change

Git log on memory files shows three relevant recent commits that **could** explain regressions even though the code is still wired:

- `d3d1029a9` **Harden AI memory privacy lifecycle** — tightened RLS on memory reads; if the user's session user_id mismatches, memories silently return empty.
- `6902a1137` **fix(ai-memories): strip embeddings from all PM APP writes, drop HNSW index** — `ai_memories.embedding` is now always NULL in PM APP. Vector search **only works through the AI Database mirror** (`document_chunks` in `fqcvmfqldlewvbsuxdvz`). If the dual-write fails silently, `searchMemories` returns nothing.
- `d190329d5` **fix(vector): strip embeddings from ALL PM APP write paths, drop every vector index** — same risk surface, broader.
- `5d1037c38` **fix(ai): persistChatMessage silently dropped every bot message — UUID type mismatch and swallowed error** — earlier root cause; fixed but indicates a recent class of silent-drop regressions in chat persistence.

No memory-related file was deleted recently — `git log --diff-filter=D` shows only `backend/src/services/memory_store.py` (Python backend memory store, removed in `345033a9c Clean up AI strategist architecture`) and OS / vendored `.venv` files.

**Hypothesis for the user's complaint:** memory is still loaded and surfaced into the system prompt on every turn, but (a) if the AI-Database dual-write breaks, `searchMemories` returns 0 rows; (b) the memory **injection block** is bounded — `bot-core.ts:159` slices `usedMemories.slice(0, 12)`, so even with a healthy table the strategist only sees the top 12 by importance × recency. If older important memories now lose the importance race, they "disappear" from the prompt.

---

## 6. The structured-data gap — why the chat is dumb

For each high-value structured table, is there a tool that queries it **directly** (not via vector search of `document_chunks`)?

| Table | Direct-query tool? | Notes |
|---|---|---|
| `project_emails` (project-matched emails) | **MISSING** — no tool calls `.from("project_emails")`. Email retrieval only goes via `getRecentEmails`/`searchEmails`, which both hit `outlook_email_intake` + `document_chunks`. The strategist cannot answer "show me every email on project X about retainage" without semantic guesswork. |
| `document_metadata_meetings` | **MISSING** — meetings are surfaced via `getMeetingIntelligence`/`searchMeetingsByTopic`, which query `document_metadata` (the generic table) filtered by source. There is no tool that hits a dedicated meeting-only structured view. |
| `tasks` | **PARTIAL** — `handler-v2.ts:806–924` has a hard-coded `isGeneratedTasksTodayRequest` shortcut that queries `tasks` directly for the SINGLE phrase "generated tasks today". `createGeneratedTask` / `updateGeneratedTask` / `deleteGeneratedTask` write to `tasks`. **No generic `queryTasks` read tool exists** for the strategist to use freely (e.g., "all open tasks for Cedar Park", "tasks owned by Brandon overdue this week"). |
| `project_timeline_events` | **MISSING** — `/api/ai-assistant/timeline/route.ts` reads this for the UI timeline view, but no AI tool queries it. The strategist cannot list "what changed on project X over the past 30 days". |
| `meeting_segments` (with `decisions`/`risks`/`tasks` JSONB) | **MISSING** — only the UI pages read `meeting_segments`. AI retrieval uses `document_chunks`. The granular per-segment decisions/risks/tasks JSONB is never surfaced. |
| `actionable_insights` | **MISSING** — no tool, no consumer in `lib/ai/tools/`. |
| `project_insights` | **MISSING** — same. Sister table `insight_cards` (Pipeline B) **is** queried (operational.ts:2667, project-tools.ts:1285+, etc.) so insights flow through that path instead. |

**`structured-queries.ts` (created but thin):** the only generic structured-query tools that exist hit:
`budget_lines` (queryBudgetData), `prime_contract_change_orders`/`contract_change_orders` (queryChangeOrders), `commitments_unified` (queryCommitments), `direct_costs` (queryDirectCosts), `schedule_tasks` (queryScheduleTasks), `document_metadata` + `document_rows` (queryDocumentRows, searchStructuredFinancialRows). **All financial + schedule + document-metadata.** Zero coverage of communications, tasks, insights, or timeline.

This is the answer to "why is the chat dumb." The strategist has a wall of finance/schedule structured tools and a sea of vector-retrieval tools, but **no aggregation tools for the user's actual operational questions** — emails by project, open tasks by owner, meetings with unresolved decisions, recent timeline events. Every such question gets routed through `document_chunks` semantic search and returns paraphrased prose instead of a list.

---

## 7. The fix shortlist

Five concrete file-specific changes, ranked by impact:

### Fix 1 — Add `queryProjectEmails` to `tools/structured-queries.ts`
- **File:** `frontend/src/lib/ai/tools/structured-queries.ts`
- **What to add:** `queryProjectEmails` tool that runs `supabase.from("project_emails").select(...)` with filters for `project_id`, `from`, `to`, sender, date range, search-in-subject/body, and a flag for `has_attachments`. Mirror the shape of `queryCommitments`.
- **Restores:** "show every email on project X about retainage", "who emailed me about Cedar Park yesterday" — answered with a list, not a vector-search summary.

### Fix 2 — Add `queryTasks` to `tools/structured-queries.ts`
- **File:** `frontend/src/lib/ai/tools/structured-queries.ts`
- **What to add:** generic `queryTasks` tool that reads `tasks` table with filters for `project_id`, `assignee_email`, `status`, `priority`, `due_date` range, `source_system`. Returns id/title/status/owner/due_date/project_id.
- **Restores:** "all open tasks for project X", "tasks overdue this week", "tasks owned by Brandon". Today only the single phrase "generated tasks today" works (via the hardcoded shortcut at handler-v2.ts:806).

### Fix 3 — Add `getProjectTimeline` to `tools/project-tools.ts`
- **File:** `frontend/src/lib/ai/tools/project-tools.ts`
- **What to add:** a `getProjectTimeline` tool that reads `project_timeline_events` (the same table the `/api/ai-assistant/timeline/route.ts` route uses for the UI) with `project_id`, date range, and event-type filters. Return id/event_type/title/summary/occurred_at/source_ref.
- **Restores:** "what changed on project X over the past 30 days" — answered with an actual changelog instead of a vector guess.

### Fix 4 — Wire `queryMeetingSegments` to expose decisions/risks/tasks JSONB
- **File:** new `frontend/src/lib/ai/tools/meeting-segments.ts`, register inside `tools/project-tools.ts`'s composition
- **What to add:** a tool that selects from `meeting_segments` with `meeting_id`, `project_id`, and JSONB-field filters (`decisions`, `risks`, `tasks`) — return the segment text + the structured arrays. The UI already reads this (`frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx:47`) so SQL access is proven.
- **Restores:** "what decisions came out of yesterday's OAC meeting" — returns the actual JSONB decisions array, not a paraphrase from `document_chunks`.

### Fix 5 — Delete the four vestigial starter tools to remove confusion
- **Files:** `tools/get-weather.ts`, `tools/create-document.ts`, `tools/update-document.ts`, `tools/request-suggestions.ts` plus the dead `components/ai-chat/document.tsx` references
- **What to do:** delete the four files; they have zero non-self consumers and are AI-SDK template leftovers that show up in audits as "wired" but never run. Removing them also lets `mcp-tools.ts` be cleaned up (also unused) and shrinks the rot delta.
- **Restores:** clarity. The agent no longer has dead tool definitions polluting its inventory and lessons-learned files claiming "28+ tools across 6 files" become easier to keep accurate.

---

## Appendix — Quick repro commands

```
# Live chat entry
sed -n '1,20p' frontend/src/app/api/ai-assistant/chat/route.ts

# Tool counts
grep -nE "^\s+[a-zA-Z][a-zA-Z0-9]*:\s*(tool|defineReadTool|defineWriteTool)\(" \
  frontend/src/lib/ai/tools/*.ts | awk -F: '{print $1}' | sort | uniq -c | sort -rn

# Strategist tool wiring
sed -n '991,1172p' frontend/src/lib/ai/orchestrator.ts

# Memory pipeline
sed -n '99,288p' frontend/src/lib/ai/bot-core.ts
```
