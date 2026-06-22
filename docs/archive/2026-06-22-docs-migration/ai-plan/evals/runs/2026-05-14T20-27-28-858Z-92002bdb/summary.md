# AI Assistant Eval Suite — 2026-05-14T20-27-28-858Z-92002bdb

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `realworld-(draft-email-response|meeting-invite-preview|business-risks)$`
- Total: 3
- Passed: 3
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-business-risks | risk_review | ✅ | 27905ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, backendDeepAgentExecutiveBriefing, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |
| realworld-draft-email-response | email_action | ✅ | 8012ms | intentPlanner, messageDrivenToolRouter, emailActionIntentRouter, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, emailActionFastPath | — |
| realworld-meeting-invite-preview | calendar_action | ✅ | 5174ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, calendarActionIntentRouter, createOutlookCalendarInvite, calendarActionFastPath | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 3 |
| `messageDrivenToolRouter` | 2 |
| `promptContextReducer` | 1 |
| `assistantWidgetPlanner` | 1 |
| `backendDeepAgentExecutiveBriefing` | 1 |
| `mcpToolDiscovery` | 1 |
| `streamingToolPolicy` | 1 |
| `noToolRetry` | 1 |
| `emailActionIntentRouter` | 1 |
| `getRecentOutlookEmails` | 1 |
| `readOutlookEmailThread` | 1 |
| `draftOutlookEmail` | 1 |
| `emailActionFastPath` | 1 |
| `assistantSourceHealth` | 1 |
| `calendarActionIntentRouter` | 1 |
| `createOutlookCalendarInvite` | 1 |
| `calendarActionFastPath` | 1 |

## Tools defined but never fired in this run

- `backendDeepAgentProjectStatus`
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
- `updateGeneratedTask`
- `writeMemory`
