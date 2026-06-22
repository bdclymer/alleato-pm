# AI Assistant Eval Suite — 2026-05-14T20-38-12-542Z-458aef0c

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Filter: `owner-strategy|action-task|task-register|source-freshness`
- Total: 5
- Passed: 3
- Failed: 2

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| owner-strategy-ulta-action-plan | project_briefing | ✅ | 32858ms | intentPlanner, promptContextReducer, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |
| action-task-preview-no-write | action_preview | ❌ | 9130ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustInclude missing: "AC1"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: provider_decision; required metadata missing: response_quality |
| task-register-source-grounded | task_management | ✅ | 19502ms | intentPlanner, promptContextReducer, getMyTasks | — |
| source-freshness-rag-health | source_health | ❌ | 43332ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | mustIncludeAny missing one of: "stale", "fresh", "up to date", "unembedded", "uncompiled", "source health" |
| realworld-teams-source-freshness | source_health | ✅ | 23395ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 4 |
| `mcpToolDiscovery` | 3 |
| `streamingToolPolicy` | 3 |
| `noToolRetry` | 3 |
| `promptContextReducer` | 2 |
| `assistantSourceHealth` | 2 |
| `messageDrivenToolRouter` | 2 |
| `clientProjectIntelligencePacket` | 1 |
| `getMyTasks` | 1 |
| `semanticSearch` | 1 |
| `sourceLookupIntentRouter` | 1 |

## Tools defined but never fired in this run

- `backendDeepAgentExecutiveBriefing`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
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
- `getMeetingsByDate`
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
- `getRecentOutlookEmails`
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
- `readOutlookEmailThread`
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
- `updateGeneratedTask`
- `writeMemory`
