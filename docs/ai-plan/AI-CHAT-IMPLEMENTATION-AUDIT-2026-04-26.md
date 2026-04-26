# AI Chat Implementation Audit - 2026-04-26

This audit maps what is actually wired into the `/ai-assistant` chat experience, using the local AI SDK skill instructions and the installed AI SDK docs/source as the reference point.

## Scope

- Live frontend chat route: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Live AI SDK client UI: `frontend/src/components/ai-assistant/rag-chat-page.tsx`
- Live agent/tool registry: `frontend/src/lib/ai/orchestrator.ts`
- Live tool factories: `frontend/src/lib/ai/tools/*`
- Live AI SDK MCP adapter: `frontend/src/lib/ai/tools/mcp-tools.ts`
- Older backend agent workflow only where it still supports ingestion/backfill utilities
- Microsoft/Graph, RAG, Acumatica, and tool observability paths only as they affect chat capability

## AI SDK Reference Checked

- Installed package: `ai@6.0.105`
- Installed packages used by chat:
  - `ai`
  - `@ai-sdk/react`
  - `@ai-sdk/openai`
  - `@ai-sdk/mcp`
  - `@ai-sdk/devtools`

Relevant local docs checked:

- `frontend/node_modules/ai/docs/04-ai-sdk-ui/20-streaming-data.mdx`
- `frontend/node_modules/ai/docs/03-ai-sdk-core/16-mcp-tools.mdx`
- `frontend/node_modules/ai/docs/07-reference/01-ai-sdk-core/16-tool-loop-agent.mdx`
- `frontend/node_modules/ai/docs/09-troubleshooting/*use-chat*`

## Executive Verdict

The AI chat is not a simple broken chatbot anymore, but it is not yet the fully-audited "best employee with every company system connected" implementation either.

What is real:

- `/ai-assistant` uses current AI SDK v6 primitives: `useChat`, `DefaultChatTransport`, `createUIMessageStream`, `createUIMessageStreamResponse`, `streamText`, `generateText`, `tool`, and `stepCountIs`.
- `/ai-assistant` has an AI SDK MCP adapter in `frontend/src/lib/ai/tools/mcp-tools.ts`.
- The MCP adapter connects through `@ai-sdk/mcp`, exposes only read-style tools, and filters SQL/write/migration-style tools out of the live chat.
- The live chat has a large AI SDK tool surface wired through `createStrategistTools`.
- The live chat has a C-suite-style architecture with the Strategist plus CFO, COO, CRO, CHRO, and VP BD specialist consult tools.
- The specialist consult agents use AI SDK `ToolLoopAgent`.
- The live chat can retrieve from Supabase-backed project data, RAG chunks, Microsoft Graph-ingested chunks, meetings, memories, Acumatica tools, web search when Tavily is configured, and optional read-only MCP tools.
- Broad project updates inject source-health context for Microsoft Graph, Fireflies, and Acumatica before synthesis.

What is not real or not correct:

- The live MCP adapter currently exposes Supabase MCP when credentials are configured. Linear MCP is still conditional on `LINEAR_MCP_SERVER_URL` plus token env. Microsoft 365 and Acumatica are still reached through first-party sync/tools, not MCP servers.
- The Strategist top-level stream still uses `streamText`; only specialist consult agents have been converted to `ToolLoopAgent`.
- Write/action tools still exist in `action-tools.ts`, but they are no longer exposed in the default Strategist tool set. A future explicit approval UX can re-enable them safely.

## Live User Path

User interaction enters here:

- Client: `frontend/src/components/ai-assistant/rag-chat-page.tsx`
- API: `frontend/src/app/api/ai-assistant/chat/route.ts`

The client uses:

- `useChat` from `@ai-sdk/react`
- `DefaultChatTransport`
- `prepareSendMessagesRequest`
- `onData` for `data-status`

The server uses:

- `createUIMessageStream`
- `createUIMessageStreamResponse`
- `streamText`
- `generateText`
- `convertToModelMessages`
- AI SDK `tool`
- `stepCountIs`

This is broadly aligned with AI SDK v6 streaming data docs. The new `data-status` parts are valid AI SDK UI data parts. One implementation detail to keep: status data parts must not be resent as normal history; the client strips them before sending the next request.

## Provider and Model Routing

Provider setup:

- File: `frontend/src/lib/ai/providers.ts`
- Uses `@ai-sdk/openai` `createOpenAI`.
- Routes through AI Gateway when `AI_GATEWAY_API_KEY` exists.
- Falls back to direct OpenAI when no Gateway key exists.
- Uses `openai.chat(...)` instead of default Responses API path because the code comments identify Gateway validation issues with multi-step tool calling.

Models currently referenced:

- Strategist: `openai/gpt-5.4`
- Specialists: `openai/gpt-5.4-mini`
- Synthesis fallback: `openai/gpt-4.1`
- Reranking: `openai/gpt-4.1-mini`
- Title/artifact helpers: `openai/gpt-4.1-nano`
- Backend legacy agents: `gpt-4o-mini`, `gpt-5.1`, `gpt-5.1-chat-latest`

Audit note: model IDs were verified earlier against AI Gateway availability during implementation, but this audit should become a repeatable automated check because model availability changes.

## Live Agents

Live Next.js AI SDK chat agents:

| Agent | File | Execution Pattern | Live in `/ai-assistant` |
|---|---|---:|---:|
| Strategist | `frontend/src/lib/ai/agents/strategist.ts` | `streamText` in route | Yes |
| CFO | `frontend/src/lib/ai/agents/cfo.ts` | `generateText` through `consultCFO` | Yes |
| COO | `frontend/src/lib/ai/agents/coo.ts` | `generateText` through `consultCOO` | Yes |
| CRO | `frontend/src/lib/ai/agents/cro.ts` | `generateText` through `consultCRO` | Yes |
| CHRO | `frontend/src/lib/ai/agents/chro.ts` | `generateText` through `consultCHRO` | Yes |
| VP BD | `frontend/src/lib/ai/agents/vpbd.ts` | `generateText` through `consultVPBD` | Yes |

Implementation note:

- These prompts are now executed through the AI SDK strategist route and specialist consult helpers.
- Specialist consults use AI SDK `ToolLoopAgent` so each executive agent can run multi-step tool loops independently.
- The outer strategist still uses `streamText` because it owns UI streaming, progress updates, persistence, and source-health diagnostics for the chat surface.

Older backend agents:

The prior Python demo agent stack has been removed from application code. The production AI strategist path is now the Next.js AI SDK route at `frontend/src/app/api/ai-assistant/chat/route.ts`.

## Live Tool Surface

### Strategist Consult Tools

Defined in `frontend/src/lib/ai/orchestrator.ts`:

- `consultCFO`
- `consultCOO`
- `consultCRO`
- `consultCHRO`
- `consultVPBD`

Each consult tool calls `consultAgent(...)`, which runs `generateText` with the specialist prompt and its own tool set.

### Project Snapshot and Project Data Tools

Defined in `frontend/src/lib/ai/tools/project-tools.ts`:

- `getProjectBriefingSnapshot`
- `getPortfolioOverview`
- `getProjectsWithRisks`
- `getProjectRiskAnalysis`
- `getFinancialAnalysis`
- `getProjectBudgetSummary`
- `getActionItemsAndInsights`
- `getMeetingsByDate`
- `searchDocuments`
- `getProjectDetails`

Strategist direct exposure intentionally removes:

- `getPortfolioOverview`
- `getProjectsWithRisks`
- `getProjectRiskAnalysis`

Those are still available to specialists because specialists receive the full `createProjectTools` set.

### Operational and RAG Tools

Defined in `frontend/src/lib/ai/tools/operational.ts`:

- `getScheduleAnalysis`
- `getPeopleAndRoles`
- `getVendorPerformance`
- `getRFIStatus`
- `getSubmittalStatus`
- `getCrossProjectComparison`
- `getHistoricalTrends`
- `getForecastComparison`
- `semanticSearch`
- `getCompanyKnowledge`
- `recallPastConversations`
- `searchMeetingsByTopic`
- `getMeetingDetails`
- `saveToKnowledgeBase`
- `saveInsight`
- `searchMemories`
- `writeMemory`
- `findProject`
- `searchEmails`
- `searchTeamsMessages`
- `searchExternalDocuments`
- `queryBudgetData`
- `queryChangeOrders`
- `queryCommitments`
- `queryDirectCosts`
- `queryScheduleTasks`
- `queryDocumentRows`

RAG implementation:

- `semanticSearch` creates a 3072-dimension embedding.
- It calls:
  - `search_document_chunks`
  - `search_all_knowledge`
  - `search_knowledge_base`
- It merges results across document chunks, insights, and knowledge base.
- It applies briefing-query recall widening, recency scoring, and source boosts.
- Specific email/Teams/document tools use `search_document_chunks_by_category`.

### Financial Tools

Defined in `frontend/src/lib/ai/tools/financial.ts`:

- `getCommitmentsOverview`
- `getChangeOrderDetails`
- `getDirectCostsSummary`
- `getBudgetLineItems`
- `getCostTrends`
- `getMarginAnalysis`

### Acumatica ERP Tools

Defined in `frontend/src/lib/ai/tools/acumatica.ts`:

- `getAPAgingReport`
- `getARAgingReport`
- `getCashPositionReport`
- `getVendorSpendReport`
- `getRecentBills`
- `getRecentInvoices`
- `getAcumaticaProjectBudget`
- `getAcumaticaProjectList`
- `getPurchaseOrderSummary`

Audit note: these call the Acumatica client live. They are not a guarantee that the Acumatica mirror tables or scheduled sync are healthy. They need their own runtime health verifier.

### Action and Write Tools

Defined in `frontend/src/lib/ai/tools/action-tools.ts`:

- `createChangeOrder`
- `createChangeEvent`
- `updateProjectStatus`
- `createRFI`
- `createTask`
- `flagProjectRisk`
- `updateRFIStatus`
- `createMeetingNote`
- `createSubmittal`
- `logDailyReport`
- `generateProjectSummary`
- `createInitiativeCard`
- `createCommitment`

Current safety behavior:

- Most write tools have `confirmed: false` by default and return previews until confirmed.
- Idempotency keys are supported.
- Writes are audited to `ai_tool_write_audits`.
- Project access guardrails exist through `createToolGuardrails`.

Risk:

- AI SDK tool execution is server-side. If the model emits `confirmed: true`, the tool can write. The prompt and schemas discourage casual writes, but the approval flow is not a first-class AI SDK user approval flow.
- This needs a stricter client-visible approval mechanism or activeTools gating where write tools are only enabled after explicit user approval.

### Web Search Tools

Defined in `frontend/src/lib/ai/tools/web-search.ts`:

- `searchWeb`
- `researchCompany`
- `searchConstructionMarket`

These are only returned if `TAVILY_API_KEY` is configured. If not configured, `createWebSearchTools` returns `{}`.

### Unused/Legacy AI SDK Tool Files

These exist but are not wired into `createStrategistTools` for `/ai-assistant`:

- `frontend/src/lib/ai/tools/create-document.ts`
- `frontend/src/lib/ai/tools/update-document.ts`
- `frontend/src/lib/ai/tools/request-suggestions.ts`
- `frontend/src/lib/ai/tools/get-weather.ts`

## MCP Server Audit

### Live `/ai-assistant` MCP

The live AI SDK MCP adapter is implemented in:

- `frontend/src/lib/ai/tools/mcp-tools.ts`

It uses `@ai-sdk/mcp` `createMCPClient` with HTTP transport and request-scoped cleanup. It exposes only read-style tool names and filters out write, SQL, migration, mutation, delete, update, and upsert-style tool names before merging MCP tools into the live chat tool set.

Evidence:

- `@ai-sdk/mcp` is installed in `frontend/package.json`.
- `createMCPClient` is used in `frontend/src/lib/ai/tools/mcp-tools.ts`.
- `createAiAssistantMcpTools()` is called from `frontend/src/app/api/ai-assistant/chat/route.ts`.
- Runtime local verification connected to Supabase MCP, discovered 20 tools, and exposed 10 read-only tools.
- MCP clients are closed after the stream text is consumed.

Current scope:

- Supabase MCP: enabled when Supabase access token env is present, unless `AI_ASSISTANT_DISABLE_SUPABASE_MCP=true`.
- Linear MCP: enabled only when `LINEAR_MCP_SERVER_URL` and a token are configured.
- Microsoft Graph, OneDrive, Outlook, Teams, and Acumatica: still reached through first-party ingestion/tools, not MCP servers.

### Removed Legacy Backend AI Paths

The stale Python agent demo, Python MCP compatibility module, old frontend demo chat pages, and old frontend chat packages were removed from application code. Project-assignment utilities that were still useful for ingestion were moved into `backend/src/services/ingestion/`.

This removes the hard-coded legacy configuration and makes the Next.js AI SDK route plus `frontend/src/lib/ai/tools/mcp-tools.ts` the only production AI strategist implementation path in the application code.

## Source Systems Actually Reachable by Live Chat

| Source | Mechanism | Live Tool(s) | Proven Working? | Known Gaps |
|---|---|---|---:|---|
| Supabase project tables | Direct service client queries | Many tools | Partially | Needs automated per-tool contract tests |
| Meeting transcripts/summaries | `document_chunks`, `document_metadata`, Fireflies pipeline | `semanticSearch`, `searchMeetingsByTopic`, `getMeetingDetails` | Partially | Health check exists for meetings, but should be part of chat gate |
| Outlook email | Microsoft Graph ingestion into `document_metadata`/`document_chunks` | `semanticSearch`, `searchEmails` | Partially | Not all rows embedded; only configured users verified |
| Teams messages/DMs | Microsoft Graph ingestion into RAG chunks | `semanticSearch`, `searchTeamsMessages` | Partially | Some Teams chat resources have Graph `403` errors |
| OneDrive files | Microsoft Graph ingestion into RAG chunks | `semanticSearch`, `searchExternalDocuments` | Partially | Some pending/error rows |
| SharePoint files | Same intended path as OneDrive | `semanticSearch`, `searchExternalDocuments` | No proof | Zero SharePoint rows found in latest check |
| Acumatica ERP | Live Acumatica client + mirror tables elsewhere | Acumatica tools | Not fully audited in this pass | Needs health verifier |
| Web/current external info | Tavily | Web search tools | Conditional | Only if `TAVILY_API_KEY` exists |
| Linear | Legacy backend MCP only | None in live chat | No | Not connected to `/ai-assistant` |
| Calendar | No live tool found in AI chat | None | No | Needs implementation if expected |
| Microsoft live API direct search | Graph ingestion only, not live per-query Graph tools | None | No | Chat searches indexed chunks, not live Graph on demand |

## Persistence, Trace, and Observability

Implemented:

- User and assistant messages persist to `chat_history`.
- Assistant metadata includes:
  - `tool_trace`
  - `memory_usage`
  - `learning_usage`
  - `response_quality`
  - `loop_diagnostic`
  - `council_mode`
- `onStepFinish` records:
  - finish reason
  - warnings
  - tool calls
  - token usage
- UI has trace/source display components.
- `data-status` streams live progress messages.

Gaps:

- Tool traces are metadata, not a strict pass/fail gate.
- There is no unified "source availability contract" that blocks or flags an answer when Microsoft/Acumatica/meetings are unhealthy.
- No live UI indicator says "Microsoft source partially unavailable" or "SharePoint not indexed."
- No automated audit currently verifies every expected tool remains wired.

## AI SDK Correctness Assessment

Aligned with AI SDK v6:

- Uses `useChat` with `DefaultChatTransport`.
- Uses `prepareSendMessagesRequest` instead of stale hook-level body.
- Uses `createUIMessageStream` and `createUIMessageStreamResponse` for custom status data.
- Uses `streamText` and `result.toUIMessageStream`.
- Uses `tool({ inputSchema, execute })`.
- Uses `stepCountIs`.
- Uses `onStepFinish` and experimental step-start diagnostics.

Not aligned with the AI SDK skill recommendation:

- The top-level Strategist stream still uses `streamText`; only specialist consult agents use `ToolLoopAgent`.
- Does not use `InferAgentUIMessage<typeof agent>` for the chat UI yet.
- Does not use typed custom `UIMessage` definitions for `data-status`; current code uses runtime type guards instead.

## Highest-Priority Findings

### Resolved - MCP is implemented in the live AI chat

The live AI chat now has AI SDK MCP support through `frontend/src/lib/ai/tools/mcp-tools.ts`.

Guardrails now in place:

- MCP tools are discovered at runtime.
- MCP tools are prefixed by server name.
- MCP tools are filtered to read-style names only.
- MCP clients are closed after the request.
- `npm run rag:verify:chat-architecture` fails if the live MCP adapter is removed.

### Partially Resolved - Source health is a prompt contract, not a UI gate

The AI may answer from available chunks even when an upstream system is partially broken.

Implemented:

- Source-health preflight is injected for broad strategy/project questions:
  - Microsoft Graph freshness
  - Microsoft Graph error count
  - pending embedding backlog
  - Acumatica sync freshness
  - Fireflies/vectorization freshness
- Source-health is persisted in the tool trace.

Remaining fix:

- Add RAG RPC health to the source-health preflight.
- Show source-health in the UI when a source is degraded.
- Persist source-health with the message.

### Partially Resolved - Write tools are removed from the default Strategist set

The write tools still exist for future use, but they are no longer exposed to the default Strategist tool set.

Implemented:

- Remove write tools from the default Strategist tool set.

Remaining fix:

- Expose write tools only in an explicit "action approval" phase.
- Require a client-side approval part/button before the server executes a write.
- Keep idempotency and audit logging.

### Partially Resolved - Specialist agents use AI SDK ToolLoopAgent

The specialist consult agents use `ToolLoopAgent`. The top-level Strategist stream still uses `streamText` because it has custom deterministic preflight, status streaming, persistence, and fallback behavior.

Remaining fix:

- Export `InferAgentUIMessage` types for the UI.
- Use `createAgentUIStream` or agent `.stream()` where appropriate.
- Keep deterministic briefing preflight as a separate tool/context step.

### Resolved - Tool inventory and architecture docs are enforced

The repository now has `scripts/verify/verify_ai_chat_architecture.mjs` and `npm run rag:verify:chat-architecture`.

Remaining fix:

- Fail CI if docs claim a tool/source that is not wired.

### P1 - Microsoft Graph is partially available, not complete

Latest runtime verification found Outlook, Teams DMs, and OneDrive chunks in RAG. It also found Teams DM `403` errors, SharePoint zero rows, and some unembedded/error rows.

Required fix:

- Add `scripts/verify/verify_microsoft_rag_health.mjs`.
- Check Graph auth, sync state freshness, per-source row counts, embedding counts, error rows, and retrieval probes.
- Add scheduled GitHub action.

## Recommended Implementation Order

1. Add Microsoft/Acumatica/Fireflies source-health verifier.
2. Add source-health UI display for degraded sources.
3. Add response latency telemetry and MCP tool-discovery caching.
4. Move write tools behind explicit approval gating when write actions are reintroduced.
5. Install and wire AI SDK MCP only for sources that truly need MCP access.
6. Convert agents to `ToolLoopAgent` and add typed `InferAgentUIMessage`.
7. Update docs to distinguish live implementation, legacy backend agents, and planned features.

## Bottom Line

The AI chat has a large internal tool stack and a working AI SDK v6 streaming path. It does not currently have live MCP servers, and it does not yet have the guardrails needed to prove every source the Strategist is supposed to know about is healthy before answering.

The next engineering move is not another prompt rewrite. It is a source/tool contract: every claimed capability must have a live tool, a health check, a trace entry, and a user-visible degraded-state message when it is unavailable.
