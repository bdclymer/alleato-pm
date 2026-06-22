# AI Assistant Eval Suite — 2026-05-14T16-14-44-109Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(action-task-preview-no-write|ceo-context-aware-decisions-needed)$`
- Total: 2
- Passed: 2
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| action-task-preview-no-write | action_preview | ✅ | 31319ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createTask, taskWriteToolOnlyCompletion | — |
| ceo-context-aware-decisions-needed | operations_analysis | ✅ | 26975ms | intentPlanner, assistantWidgetPlanner, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 2 |
| `mcpToolDiscovery` | 2 |
| `streamingToolPolicy` | 2 |
| `promptContextReducer` | 1 |
| `taskWriteIntentRouter` | 1 |
| `createTask` | 1 |
| `taskWriteToolOnlyCompletion` | 1 |
| `assistantWidgetPlanner` | 1 |
| `messageDrivenToolRouter` | 1 |
| `getActionItemsAndInsights` | 1 |
| `noToolRetry` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createGeneratedTask`
- `createInitiativeCard`
- `createOutlookCalendarInvite`
- `createRFI`
- `deleteGeneratedTask`
- `draftOutlookEmail`
- `findProject`
- `getAPAgingReport`
- `getARAgingReport`
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
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
