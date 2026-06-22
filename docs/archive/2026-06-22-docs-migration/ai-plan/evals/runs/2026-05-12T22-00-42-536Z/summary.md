# AI Assistant Eval Suite — 2026-05-12T22-00-42-536Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 1
- Passed: 1
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ✅ | 85366ms | intentPlanner, assistantSourceHealth, clientProjectIntelligencePacket, streamingToolPolicy, getProjectBriefingSnapshot, searchTeamsMessages, searchEmails, searchMeetingsByTopic | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `assistantSourceHealth` | 1 |
| `clientProjectIntelligencePacket` | 1 |
| `streamingToolPolicy` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `searchTeamsMessages` | 1 |
| `searchEmails` | 1 |
| `searchMeetingsByTopic` | 1 |

## Tools defined but never fired in this run

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
- `getMyTasks`
- `getPeopleAndRoles`
- `getPortfolioOverview`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
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
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
