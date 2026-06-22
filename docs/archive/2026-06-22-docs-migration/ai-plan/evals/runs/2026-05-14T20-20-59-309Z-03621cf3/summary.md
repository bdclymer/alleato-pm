# AI Assistant Eval Suite — 2026-05-14T20-20-59-309Z-03621cf3

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Filter: `action-task|task-register|realworld-teams-source-freshness`
- Total: 3
- Passed: 2
- Failed: 1

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| action-task-preview-no-write | action_preview | ✅ | 53810ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, createTask, taskWriteToolOnlyCompletion | — |
| task-register-source-grounded | task_management | ❌ | 22769ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | expected required tool 'getMyTasks' to fire; mustInclude missing: "Sources Checked" |
| realworld-teams-source-freshness | source_health | ✅ | 114429ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, searchTeamsMessages, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 3 |
| `streamingToolPolicy` | 3 |
| `promptContextReducer` | 2 |
| `mcpToolDiscovery` | 2 |
| `taskWriteIntentRouter` | 1 |
| `mcpToolDiscoverySkipped` | 1 |
| `createTask` | 1 |
| `taskWriteToolOnlyCompletion` | 1 |
| `getActionItemsAndInsights` | 1 |
| `assistantSourceHealth` | 1 |
| `messageDrivenToolRouter` | 1 |
| `searchTeamsMessages` | 1 |
| `noToolRetry` | 1 |

## Tools defined but never fired in this run

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
- `searchWeb`
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
