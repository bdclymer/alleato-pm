# AI Assistant Eval Suite — 2026-06-08T17-14-26-044Z-5f1dc65d

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Bundle: `project-document-intelligence-regression`
- Bundle description: Agentic-eval guardrail for selected-project document intelligence. The assistant must preload the project operating packet/snapshot, use document/source lookup only as drilldown, and disclose stale or missing context layers instead of answering from a cold search.
- Filter: `project-document-(broad-briefing|exact-spec-lookup|stale-packet-check|missing-context-disclosure)$`
- Total: 4
- Passed: 0
- Failed: 4
- Warnings: 15
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-document-exact-spec-lookup | document_question | ❌ | 158890ms | expected family 'project' not represented; expected family 'documents' not represented; expected family 'semantic' not represented; duration 158890ms exceeded warning budget 30000ms |
| project-document-broad-briefing | document_question | ❌ | 121223ms | expected family 'project' not represented; expected family 'documents' not represented; expected family 'semantic' not represented; duration 121223ms exceeded warning budget 30000ms |
| project-document-stale-packet-check | source_health | ❌ | 120952ms | expected family 'project' not represented; expected family 'source_health' not represented; duration 120952ms exceeded warning budget 30000ms |
| project-document-missing-context-disclosure | document_question | ❌ | 120464ms | expected family 'project' not represented; expected family 'documents' not represented; expected family 'semantic' not represented; duration 120464ms exceeded warning budget 30000ms |

## Bundle Criteria

- Selected-project document questions must preload clientProjectIntelligencePacket and getProjectBriefingSnapshot.
- Exact document/spec questions must also use semanticSearch, sourceSpecificRagRetrieval, searchDocuments, or another document-capable lookup.
- Answers must separate the project operating baseline from exact source proof.
- Answers must disclose stale, missing, or thin packet/snapshot/document coverage when relevant.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-document-broad-briefing | document_question | ❌ | 121223ms | — | 0 | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [semanticSearch, searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did; expected required tool 'clientProjectIntelligencePacket' to fire; expected required tool 'getProjectBriefingSnapshot' to fire; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "document", "documents", "drawing", "spec", "RFI", "submittal"; mustIncludeAny missing one of: "obligation", "required", "approval", "due", "conflict", "revision"; mustIncludeAny missing one of: "PM", "risk", "action", "impact", "matters"; answer length 0 < min 220; duration 121223ms exceeded max budget 90000ms; required metadata missing: tool_trace; required metadata missing: retrieval_plan; required metadata missing: source_debug |
| project-document-exact-spec-lookup | document_question | ❌ | 158890ms | — | 0 | (none) | stream error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did; expected required tool 'clientProjectIntelligencePacket' to fire; expected required tool 'getProjectBriefingSnapshot' to fire; expected required tool 'semanticSearch' to fire; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "spec", "document", "source", "evidence", "clause", "excerpt"; mustIncludeAny missing one of: "door", "finish", "warranty", "closeout", "submittal"; mustIncludeAny missing one of: "packet", "context", "baseline", "operating"; answer length 0 < min 220; duration 158890ms exceeded max budget 90000ms; required metadata missing: tool_trace; required metadata missing: retrieval_plan; required metadata missing: source_debug |
| project-document-stale-packet-check | source_health | ❌ | 120952ms | — | 0 | (none) | stream error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [clientProjectIntelligencePacket, getProjectBriefingSnapshot] to fire — none did; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "packet", "snapshot", "document", "source"; mustIncludeAny missing one of: "stale", "missing", "thin", "fresh", "current", "coverage"; answer length 0 < min 180; duration 120952ms exceeded max budget 90000ms; required metadata missing: tool_trace; required metadata missing: response_quality; required metadata missing: source_debug |
| project-document-missing-context-disclosure | document_question | ❌ | 120464ms | — | 0 | (none) | stream error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [semanticSearch, searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did; expected required tool 'clientProjectIntelligencePacket' to fire; expected required tool 'getProjectBriefingSnapshot' to fire; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "packet", "snapshot", "document intelligence", "operating context"; mustIncludeAny missing one of: "missing", "thin", "available", "loaded", "coverage"; answer length 0 < min 200; duration 120464ms exceeded max budget 90000ms; required metadata missing: tool_trace; required metadata missing: retrieval_plan; required metadata missing: source_debug |

## Tool coverage across the suite

| Tool | Hits |
|---|---|

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentExecutiveBriefing`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
- `consultMicrosoftExecutiveAssistant`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createGeneratedTask`
- `createInitiativeCard`
- `createOutlookCalendarInvite`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `draftOutlookEmail`
- `findProject`
- `getAPAgingReport`
- `getARAgingReport`
- `getActionItemsAndInsights`
- `getAcumaticaProjectBudget`
- `getAcumaticaProjectList`
- `getBudgetLineItems`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCommitmentsOverview`
- `getCompanyKnowledge`
- `getCostTrends`
- `getCrossProjectComparison`
- `getDirectCostsSummary`
- `getFinancialAnalysis`
- `getForecastComparison`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMarginAnalysis`
- `getMeetingDetails`
- `getMeetingIntelligence`
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getPortfolioOverview`
- `getProjectBriefingSnapshot`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
- `getProjectsWithRisks`
- `getRFIStatus`
- `getRecentBills`
- `getRecentEmails`
- `getRecentInvoices`
- `getScheduleAnalysis`
- `getSubmittalStatus`
- `getVendorPerformance`
- `getVendorSpendReport`
- `queryBudgetData`
- `queryChangeOrders`
- `queryCommitments`
- `queryDirectCosts`
- `queryDocumentRows`
- `queryScheduleTasks`
- `recallPastConversations`
- `researchCompany`
- `saveInsight`
- `saveToKnowledgeBase`
- `searchAppHelp`
- `searchConstructionMarket`
- `searchDocuments`
- `searchEmails`
- `searchExternalDocuments`
- `searchMeetingsByTopic`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `semanticSearch`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
