# AI Assistant Eval Suite — 2026-05-14T13-38-20-222Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 13
- Passed: 13
- Failed: 0

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-todays-meetings | meeting_query | ✅ | 4299ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, sourceSpecificRagRetrieval, assistantSourceHealth, assistantComponentRegistry | — |
| realworld-most-important-tasks | task_management | ✅ | 8767ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 7718ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-business-risks | risk_review | ✅ | 30788ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getFinancialAnalysis, getActionItemsAndInsights, getPortfolioOverview | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 89740ms | intentPlanner, assistantSourceHealth, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, getActionItemsAndInsights, getPortfolioOverview, getProjectsWithRisks, semanticSearch | — |
| realworld-last-five-emails | source_lookup | ✅ | 5417ms | intentPlanner, getRecentEmails | — |
| realworld-urgent-inbox | source_lookup | ✅ | 4359ms | intentPlanner, getRecentEmails | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 4011ms | intentPlanner, getRecentEmails | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 4337ms | intentPlanner, getRecentEmails | — |
| realworld-email-reply-triage | source_lookup | ✅ | 4222ms | intentPlanner, getRecentEmails | — |
| realworld-draft-email-response | email_action | ✅ | 6118ms | intentPlanner, emailActionIntentRouter, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, emailActionFastPath | — |
| realworld-meeting-invite-clarify | calendar_action | ✅ | 6453ms | intentPlanner, calendarActionIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| realworld-meeting-invite-preview | calendar_action | ✅ | 5421ms | intentPlanner, assistantSourceHealth, calendarActionIntentRouter, createOutlookCalendarInvite, calendarActionFastPath | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 13 |
| `mcpToolDiscovery` | 5 |
| `streamingToolPolicy` | 5 |
| `getRecentEmails` | 5 |
| `promptContextReducer` | 4 |
| `getActionItemsAndInsights` | 4 |
| `assistantSourceHealth` | 3 |
| `assistantWidgetPlanner` | 2 |
| `getProjectsWithRisks` | 2 |
| `getPortfolioOverview` | 2 |
| `calendarActionIntentRouter` | 2 |
| `sourceSpecificRagRetrieval` | 1 |
| `assistantComponentRegistry` | 1 |
| `getFinancialAnalysis` | 1 |
| `getCompanyKnowledge` | 1 |
| `semanticSearch` | 1 |
| `emailActionIntentRouter` | 1 |
| `getRecentOutlookEmails` | 1 |
| `readOutlookEmailThread` | 1 |
| `draftOutlookEmail` | 1 |
| `emailActionFastPath` | 1 |
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
