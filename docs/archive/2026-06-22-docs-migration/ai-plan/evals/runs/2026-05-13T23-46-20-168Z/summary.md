# AI Assistant Eval Suite — 2026-05-13T23-46-20-168Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 10
- Passed: 10
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-todays-meetings | meeting_query | ✅ | 8311ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | — |
| realworld-most-important-tasks | task_management | ✅ | 8579ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 8645ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-business-risks | risk_review | ✅ | 28274ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getPortfolioOverview, getFinancialAnalysis | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 60819ms | intentPlanner, assistantSourceHealth, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, semanticSearch | — |
| realworld-last-five-emails | source_lookup | ✅ | 4519ms | intentPlanner, sourceSpecificRagRetrieval | — |
| realworld-urgent-inbox | source_lookup | ✅ | 4289ms | intentPlanner, sourceSpecificRagRetrieval | — |
| realworld-draft-email-response | email_action | ✅ | 5614ms | intentPlanner, emailActionIntentRouter, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, emailActionFastPath | — |
| realworld-meeting-invite-clarify | calendar_action | ✅ | 6876ms | intentPlanner, calendarActionIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| realworld-meeting-invite-preview | calendar_action | ✅ | 10137ms | intentPlanner, assistantSourceHealth, calendarActionIntentRouter, mcpToolDiscovery, streamingToolPolicy, createOutlookCalendarInvite | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 10 |
| `mcpToolDiscovery` | 6 |
| `streamingToolPolicy` | 6 |
| `promptContextReducer` | 4 |
| `sourceSpecificRagRetrieval` | 3 |
| `assistantWidgetPlanner` | 2 |
| `getActionItemsAndInsights` | 2 |
| `assistantSourceHealth` | 2 |
| `calendarActionIntentRouter` | 2 |
| `assistantComponentRegistry` | 1 |
| `getProjectsWithRisks` | 1 |
| `getPortfolioOverview` | 1 |
| `getFinancialAnalysis` | 1 |
| `getCompanyKnowledge` | 1 |
| `semanticSearch` | 1 |
| `emailActionIntentRouter` | 1 |
| `getRecentOutlookEmails` | 1 |
| `readOutlookEmailThread` | 1 |
| `draftOutlookEmail` | 1 |
| `emailActionFastPath` | 1 |
| `createOutlookCalendarInvite` | 1 |

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
- `getAcumaticaProjectBudget`
- `getAcumaticaProjectList`
- `getBudgetLineItems`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCommitmentsOverview`
- `getCostTrends`
- `getCrossProjectComparison`
- `getDirectCostsSummary`
- `getForecastComparison`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMarginAnalysis`
- `getMeetingDetails`
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getProjectBriefingSnapshot`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
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
- `updateGeneratedTask`
- `writeMemory`
