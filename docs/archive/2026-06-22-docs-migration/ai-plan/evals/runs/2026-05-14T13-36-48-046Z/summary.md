# AI Assistant Eval Suite — 2026-05-14T13-36-48-046Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 5
- Passed: 5
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 4271ms | intentPlanner, getRecentEmails | — |
| realworld-urgent-inbox | source_lookup | ✅ | 3032ms | intentPlanner, promptContextReducer, getRecentEmails | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 7590ms | intentPlanner, getRecentEmails | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 5954ms | intentPlanner, getRecentEmails | — |
| realworld-email-reply-triage | source_lookup | ✅ | 6853ms | intentPlanner, getRecentEmails | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 5 |
| `getRecentEmails` | 5 |
| `promptContextReducer` | 1 |

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
