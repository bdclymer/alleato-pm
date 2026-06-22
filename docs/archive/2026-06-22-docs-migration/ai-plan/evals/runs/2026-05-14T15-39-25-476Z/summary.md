# AI Assistant Eval Suite — 2026-05-14T15-39-25-476Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(financial-forecast|source-lookup-meetings|documents-search|action-items|cross-project-comparison|memory-recall|what-changed|action-task-preview-no-write|ceo-task-create-(direct|throw-on-list|assign-pm|action-item|schedule-activity)|ceo-task-modify-(close|reschedule|reassign|bump-priority|snooze)|ceo-money-margin-leak|ceo-money-unbilled-changes|ceo-meetings-promised-to-do|ceo-context-aware-decisions-needed|owner-prep-call-westfield)$`
- Total: 23
- Passed: 13
- Failed: 10

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| financial-forecast | financial_analysis | ✅ | 55363ms | intentPlanner, messageDrivenToolRouter, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getForecastComparison, noToolRetry | — |
| source-lookup-meetings | source_lookup | ✅ | 83428ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, searchMeetingsByTopic, streamTextError, noToolRetry | — |
| documents-search | document_question | ✅ | 50621ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, queryDocumentRows, noToolRetry | — |
| action-items | operations_analysis | ✅ | 80090ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | — |
| cross-project-comparison | portfolio_briefing | ✅ | 36502ms | intentPlanner, assistantWidgetPlanner, messageDrivenToolRouter, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getCrossProjectComparison, noToolRetry | — |
| memory-recall | general_conversation | ❌ | 30077ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [recallPastConversations, searchMemories] to fire — none did |
| what-changed | project_briefing | ❌ | 43351ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy | expected at least one of [semanticSearch, recallPastConversations] to fire — none did |
| action-task-preview-no-write | action_preview | ❌ | 30763ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected required tool 'createTask' to fire; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false" |
| ceo-task-create-direct | action_preview | ✅ | 32444ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-throw-on-list | action_preview | ❌ | 5130ms | intentPlanner, promptContextReducer, getMyTasks | expected at least one of [createGeneratedTask] to fire — none did; mustIncludeAny missing one of: "Acme", "submittal", "Thursday", "EOD" |
| ceo-task-create-assign-pm | action_preview | ❌ | 22849ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-action-item | action_preview | ✅ | 24799ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-schedule-activity | action_preview | ✅ | 23883ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createTask, taskWriteToolOnlyCompletion | — |
| ceo-task-modify-close | action_preview | ✅ | 24611ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-modify-reschedule | action_preview | ❌ | 27635ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-task-modify-reassign | action_preview | ❌ | 27588ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-task-modify-bump-priority | action_preview | ✅ | 25798ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-money-margin-leak | financial_analysis | ✅ | 25624ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getAcumaticaProjectList, getMarginAnalysis | — |
| ceo-money-unbilled-changes | financial_analysis | ❌ | 17581ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis | expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did |
| ceo-meetings-promised-to-do | meeting_query | ❌ | 120006ms | searchMeetingsByTopic | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; mustIncludeAny missing one of: "promise", "committed", "action", "owe", "meeting"; answer length 0 < min 180 |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 10232ms | intentPlanner, featureRequestPacketRouter | expected at least one of [getActionItemsAndInsights, getRFIStatus] to fire — none did |
| ceo-task-modify-snooze | action_preview | ✅ | 23308ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, updateGeneratedTask, taskWriteToolOnlyCompletion | — |
| owner-prep-call-westfield | project_briefing | ✅ | 67743ms | intentPlanner, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 22 |
| `mcpToolDiscovery` | 20 |
| `streamingToolPolicy` | 20 |
| `promptContextReducer` | 12 |
| `taskWriteIntentRouter` | 10 |
| `taskWriteToolOnlyCompletion` | 10 |
| `messageDrivenToolRouter` | 7 |
| `noToolRetry` | 6 |
| `createGeneratedTask` | 5 |
| `clientProjectIntelligencePacket` | 4 |
| `semanticSearch` | 4 |
| `assistantSourceHealth` | 4 |
| `sourceLookupIntentRouter` | 4 |
| `updateGeneratedTask` | 4 |
| `searchMeetingsByTopic` | 2 |
| `assistantWidgetPlanner` | 2 |
| `backendDeepAgentProjectStatus` | 2 |
| `getForecastComparison` | 1 |
| `streamTextError` | 1 |
| `queryDocumentRows` | 1 |
| `getActionItemsAndInsights` | 1 |
| `getCrossProjectComparison` | 1 |
| `getMyTasks` | 1 |
| `createTask` | 1 |
| `getAcumaticaProjectList` | 1 |
| `getMarginAnalysis` | 1 |
| `getFinancialAnalysis` | 1 |
| `featureRequestPacketRouter` | 1 |
| `getProjectBriefingSnapshot` | 1 |

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
- `getBudgetLineItems`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCommitmentsOverview`
- `getCompanyKnowledge`
- `getCostTrends`
- `getDirectCostsSummary`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMeetingDetails`
- `getMeetingsByDate`
- `getPeopleAndRoles`
- `getPortfolioOverview`
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
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `writeMemory`
