# AI Assistant Eval Suite — 2026-05-14T15-11-06-939Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(financial-commitments|financial-forecast|schedule-analysis|rfis-open|submittals-status|people-roles|source-lookup-meetings|source-lookup-teams|meetings-by-date|recent-meetings-portfolio|documents-search|action-items|cross-project-comparison|memory-recall|what-changed|action-task-preview-no-write|ceo-task-create-(direct|remind|note-to-self|throw-on-list|flag-for-followup|assign-pm|action-item|schedule-activity)|ceo-task-modify-(mark-done|close|reschedule|reassign|bump-priority|snooze)|ceo-money-margin-leak|ceo-money-unbilled-changes|ceo-meetings-(what-happened|promised-to-do)|ceo-context-aware-decisions-needed|vendor-subs-behind-portfolio|i-was-out-what-did-i-miss|decisions-what-needs-my-signoff|owner-prep-call-westfield)$`
- Total: 39
- Passed: 15
- Failed: 24

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| financial-commitments | financial_analysis | ✅ | 63126ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getCommitmentsOverview, noToolRetry | — |
| financial-forecast | financial_analysis | ❌ | 34093ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getMarginAnalysis, getProjectBudgetSummary | expected at least one of [getForecastComparison, getCostTrends] to fire — none did |
| schedule-analysis | operations_analysis | ✅ | 38439ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getScheduleAnalysis, noToolRetry | — |
| rfis-open | operations_analysis | ✅ | 24990ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getRFIStatus, noToolRetry | — |
| submittals-status | operations_analysis | ✅ | 37704ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getSubmittalStatus, noToolRetry | — |
| people-roles | people_or_capacity | ✅ | 73776ms | intentPlanner, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getPeopleAndRoles, noToolRetry | — |
| source-lookup-meetings | source_lookup | ❌ | 6019ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [searchMeetingsByTopic, semanticSearch] to fire — none did |
| source-lookup-teams | source_lookup | ✅ | 114015ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, searchTeamsMessages, noToolRetry | — |
| meetings-by-date | meeting_query | ✅ | 38017ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| recent-meetings-portfolio | meeting_query | ✅ | 25119ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| documents-search | document_question | ❌ | 120003ms | searchDocuments | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; answer length 0 < min 120 |
| action-items | operations_analysis | ❌ | 47994ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getPeopleAndRoles, noToolRetry | expected at least one of [getActionItemsAndInsights] to fire — none did |
| cross-project-comparison | portfolio_briefing | ❌ | 35639ms | intentPlanner, assistantWidgetPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis, getAcumaticaProjectList, getCostTrends | expected at least one of [getCrossProjectComparison, getPortfolioOverview] to fire — none did |
| memory-recall | general_conversation | ❌ | 47495ms | intentPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy | expected at least one of [recallPastConversations, searchMemories] to fire — none did |
| what-changed | project_briefing | ❌ | 32824ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [semanticSearch, recallPastConversations] to fire — none did |
| action-task-preview-no-write | action_preview | ❌ | 3895ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustInclude missing: "AC1"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: provider_decision; required metadata missing: response_quality |
| ceo-task-create-direct | action_preview | ❌ | 3334ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustIncludeAny missing one of: "AC1", "Ulta", "call", "owner", "approval"; answer length 0 < min 80; required metadata missing: tool_trace |
| ceo-task-create-remind | action_preview | ✅ | 29395ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-note-to-self | action_preview | ✅ | 33127ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-throw-on-list | action_preview | ❌ | 3560ms | intentPlanner, promptContextReducer, getMyTasks | expected at least one of [createGeneratedTask] to fire — none did; mustIncludeAny missing one of: "Acme", "submittal", "Thursday", "EOD" |
| ceo-task-create-flag-for-followup | action_preview | ✅ | 26671ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | — |
| ceo-task-create-assign-pm | action_preview | ❌ | 3050ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustIncludeAny missing one of: "AC1", "solar", "Ulta", "Wednesday", "PM", "confirm", "approval"; answer length 0 < min 80 |
| ceo-task-create-action-item | action_preview | ❌ | 2611ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustIncludeAny missing one of: "Preview", "confirm", "task", "created", "title", "Jesse", "GMP"; answer length 0 < min 80 |
| ceo-task-create-schedule-activity | action_preview | ❌ | 2806ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "mobilization", "June", "Gantt", "schedule"; answer length 0 < min 160 |
| ceo-task-modify-mark-done | action_preview | ❌ | 29135ms | intentPlanner, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | forbidden tool fired: 'noToolRetry'; answer length 62 < min 80 |
| ceo-task-modify-close | action_preview | ❌ | 23711ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-task-modify-reschedule | action_preview | ❌ | 2911ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "AC1", "Tuesday", "reschedule", "due date", "preview", "confirm"; answer length 0 < min 80 |
| ceo-task-modify-reassign | action_preview | ❌ | 2795ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "Megan", "reassign", "submittal", "preview", "confirm"; answer length 0 < min 80 |
| ceo-task-modify-bump-priority | action_preview | ❌ | 27498ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-money-margin-leak | financial_analysis | ❌ | 23471ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getAcumaticaProjectList | expected at least one of [getPortfolioOverview, getMarginAnalysis, getCrossProjectComparison] to fire — none did |
| ceo-money-unbilled-changes | financial_analysis | ❌ | 12766ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis | expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did |
| ceo-meetings-what-happened | meeting_query | ✅ | 44999ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| ceo-meetings-promised-to-do | meeting_query | ❌ | 8121ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [getMeetingsByDate, getActionItemsAndInsights, getMeetingIntelligence, searchMeetingsByTopic] to fire — none did |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 3678ms | intentPlanner, featureRequestPacketRouter | expected at least one of [getActionItemsAndInsights, getRFIStatus] to fire — none did |
| ceo-task-modify-snooze | action_preview | ❌ | 27975ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected at least one of [getMyTasks, updateGeneratedTask, deleteGeneratedTask, getActionItemsAndInsights] to fire — none did |
| vendor-subs-behind-portfolio | people_or_capacity | ✅ | 42914ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getScheduleAnalysis, noToolRetry | — |
| i-was-out-what-did-i-miss | source_lookup | ✅ | 19916ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| decisions-what-needs-my-signoff | operations_analysis | ✅ | 25250ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | — |
| owner-prep-call-westfield | project_briefing | ❌ | 61720ms | intentPlanner, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 31 |
| `mcpToolDiscovery` | 27 |
| `streamingToolPolicy` | 27 |
| `promptContextReducer` | 17 |
| `messageDrivenToolRouter` | 15 |
| `noToolRetry` | 15 |
| `clientProjectIntelligencePacket` | 12 |
| `backendDeepAgentProjectStatus` | 9 |
| `taskWriteIntentRouter` | 6 |
| `createGeneratedTask` | 6 |
| `taskWriteToolOnlyCompletion` | 6 |
| `getMeetingsByDate` | 4 |
| `assistantSourceHealth` | 3 |
| `semanticSearch` | 3 |
| `sourceLookupIntentRouter` | 3 |
| `getActionItemsAndInsights` | 3 |
| `getScheduleAnalysis` | 2 |
| `getPeopleAndRoles` | 2 |
| `sourceSpecificRagRetrieval` | 2 |
| `assistantComponentRegistry` | 2 |
| `getFinancialAnalysis` | 2 |
| `getAcumaticaProjectList` | 2 |
| `getCommitmentsOverview` | 1 |
| `getMarginAnalysis` | 1 |
| `getProjectBudgetSummary` | 1 |
| `getRFIStatus` | 1 |
| `getSubmittalStatus` | 1 |
| `searchTeamsMessages` | 1 |
| `searchDocuments` | 1 |
| `assistantWidgetPlanner` | 1 |
| `getCostTrends` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `getMyTasks` | 1 |
| `featureRequestPacketRouter` | 1 |

## Tools defined but never fired in this run

- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createInitiativeCard`
- `createOutlookCalendarInvite`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `draftOutlookEmail`
- `findProject`
- `getAPAgingReport`
- `getARAgingReport`
- `getAcumaticaProjectBudget`
- `getBudgetLineItems`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCompanyKnowledge`
- `getCrossProjectComparison`
- `getDirectCostsSummary`
- `getForecastComparison`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMeetingDetails`
- `getPortfolioOverview`
- `getProjectDetails`
- `getProjectRiskAnalysis`
- `getProjectsWithRisks`
- `getRecentBills`
- `getRecentEmails`
- `getRecentInvoices`
- `getRecentOutlookEmails`
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
- `searchEmails`
- `searchExternalDocuments`
- `searchMeetingsByTopic`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `updateGeneratedTask`
- `writeMemory`
