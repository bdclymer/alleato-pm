# AI Assistant Eval Suite — 2026-05-14T20-31-09-018Z-ae832439

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 1
- Passed: 0
- Failed: 1

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| action-task-preview-no-write | action_preview | ❌ | 33242ms | intentPlanner, taskSourceReview | stream error: stream read error: terminated; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "AC1"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false" |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `taskSourceReview` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
