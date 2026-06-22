# AI Assistant Eval Suite — 2026-05-12T22-02-16-800Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 1
- Passed: 1
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| risk-review-single-project | risk_review | ✅ | 66529ms | intentPlanner, assistantWidgetPlanner, streamingToolPolicy, getProjectRiskAnalysis, getProjectBriefingSnapshot, getRFIStatus, getChangeOrderDetails, getSubmittalStatus, getProjectBudgetSummary, getScheduleAnalysis, searchTeamsMessages, getActionItemsAndInsights, searchEmails, semanticSearch, consultCRO, consultCOO | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `assistantWidgetPlanner` | 1 |
| `streamingToolPolicy` | 1 |
| `getProjectRiskAnalysis` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `getRFIStatus` | 1 |
| `getChangeOrderDetails` | 1 |
| `getSubmittalStatus` | 1 |
| `getProjectBudgetSummary` | 1 |
| `getScheduleAnalysis` | 1 |
| `searchTeamsMessages` | 1 |
| `getActionItemsAndInsights` | 1 |
| `searchEmails` | 1 |
| `semanticSearch` | 1 |
| `consultCRO` | 1 |
| `consultCOO` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createGeneratedTask`
- `createInitiativeCard`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `findProject`
- `getAPAgingReport`
- `getARAgingReport`
- `getAcumaticaProjectBudget`
- `getAcumaticaProjectList`
- `getBudgetLineItems`
- `getCashPositionReport`
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
- `getProjectDetails`
- `getProjectsWithRisks`
- `getRecentBills`
- `getRecentInvoices`
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
- `searchExternalDocuments`
- `searchMeetingsByTopic`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `updateGeneratedTask`
- `writeMemory`
