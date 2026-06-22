# AI Assistant Eval Suite — 2026-06-08T18-40-12-497Z-529ef395

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Total: 1
- Passed: 0
- Failed: 1
- Warnings: 4
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-document-broad-briefing | document_question | ❌ | 120271ms | expected family 'project' not represented; expected family 'documents' not represented; expected family 'semantic' not represented; duration 120271ms exceeded warning budget 30000ms |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-document-broad-briefing | document_question | ❌ | 120271ms | — | 0 | (none) | stream error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [semanticSearch, searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did; expected required tool 'clientProjectIntelligencePacket' to fire; expected required tool 'getProjectBriefingSnapshot' to fire; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "document", "documents", "drawing", "spec", "RFI", "submittal"; mustIncludeAny missing one of: "obligation", "required", "approval", "due", "conflict", "revision"; mustIncludeAny missing one of: "PM", "risk", "action", "impact", "matters"; answer length 0 < min 220; duration 120271ms exceeded max budget 75000ms; required metadata missing: tool_trace; required metadata missing: retrieval_plan; required metadata missing: source_debug |

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
