# AI Assistant Eval Suite — 2026-05-14T21-07-08-290Z-983a979c

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^source-lookup-teams$`
- Total: 1
- Passed: 1
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 27298ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `assistantSourceHealth` | 1 |
| `semanticSearch` | 1 |
| `sourceLookupIntentRouter` | 1 |
| `messageDrivenToolRouter` | 1 |
| `mcpToolDiscoverySkipped` | 1 |
| `streamingToolPolicy` | 1 |
| `noToolRetry` | 1 |

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
- `updateGeneratedTask`
- `writeMemory`
