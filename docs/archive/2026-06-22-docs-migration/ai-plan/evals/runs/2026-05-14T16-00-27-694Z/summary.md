# AI Assistant Eval Suite — 2026-05-14T16-00-27-694Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(memory-recall|what-changed|action-task-preview-no-write|ceo-task-create-(throw-on-list|assign-pm)|ceo-task-modify-(reschedule|reassign)|ceo-money-unbilled-changes|ceo-meetings-promised-to-do|ceo-context-aware-decisions-needed)$`
- Total: 10
- Passed: 8
- Failed: 2

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| memory-recall | general_conversation | ✅ | 75431ms | intentPlanner, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, recallPastConversations, noToolRetry | — |
| what-changed | project_briefing | ✅ | 56286ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, recallPastConversations, noToolRetry | — |
| action-task-preview-no-write | action_preview | ❌ | 65939ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createTask, taskWriteToolOnlyCompletion | mustExclude present: "task was created" |
| ceo-task-create-throw-on-list | action_preview | ✅ | 44493ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-assign-pm | action_preview | ✅ | 61734ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-modify-reschedule | action_preview | ✅ | 43867ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-modify-reassign | action_preview | ✅ | 38187ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-money-unbilled-changes | financial_analysis | ✅ | 38943ms | intentPlanner, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getChangeOrderDetails, noToolRetry | — |
| ceo-meetings-promised-to-do | meeting_query | ✅ | 87456ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 62437ms | intentPlanner, assistantWidgetPlanner, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | answer length 78 < min 150 |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 10 |
| `mcpToolDiscovery` | 10 |
| `streamingToolPolicy` | 10 |
| `promptContextReducer` | 6 |
| `messageDrivenToolRouter` | 5 |
| `noToolRetry` | 5 |
| `taskWriteIntentRouter` | 5 |
| `taskWriteToolOnlyCompletion` | 5 |
| `backendDeepAgentProjectStatus` | 2 |
| `clientProjectIntelligencePacket` | 2 |
| `recallPastConversations` | 2 |
| `createGeneratedTask` | 2 |
| `assistantWidgetPlanner` | 2 |
| `updateGeneratedTask` | 2 |
| `createTask` | 1 |
| `getChangeOrderDetails` | 1 |
| `semanticSearch` | 1 |
| `assistantSourceHealth` | 1 |
| `sourceLookupIntentRouter` | 1 |
| `getMeetingsByDate` | 1 |
| `getActionItemsAndInsights` | 1 |

## Tools defined but never fired in this run

- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
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
- `writeMemory`
