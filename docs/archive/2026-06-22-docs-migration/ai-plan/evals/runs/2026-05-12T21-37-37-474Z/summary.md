# AI Assistant Eval Suite — 2026-05-12T21-37-37-474Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 1
- Passed: 1
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| risk-review-single-project | risk_review | ✅ | 72817ms | intentPlanner, assistantWidgetPlanner, clientProjectIntelligencePacket, streamingToolPolicy, semanticSearch, searchEmails, getProjectRiskAnalysis, getActionItemsAndInsights, searchTeamsMessages, searchMeetingsByTopic, consultCRO, consultCOO | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `assistantWidgetPlanner` | 1 |
| `clientProjectIntelligencePacket` | 1 |
| `streamingToolPolicy` | 1 |
| `semanticSearch` | 1 |
| `searchEmails` | 1 |
| `getProjectRiskAnalysis` | 1 |
| `getActionItemsAndInsights` | 1 |
| `searchTeamsMessages` | 1 |
| `searchMeetingsByTopic` | 1 |
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
- `getProjectsWithRisks`
- `getRFIStatus`
- `getRecentBills`
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
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `updateGeneratedTask`
- `writeMemory`
