# AI Assistant Eval Suite — 2026-05-14T13-25-45-572Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 13
- Passed: 8
- Failed: 5

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-todays-meetings | meeting_query | ✅ | 10057ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, sourceSpecificRagRetrieval, assistantSourceHealth, assistantComponentRegistry | — |
| realworld-most-important-tasks | task_management | ✅ | 9506ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 9506ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-business-risks | risk_review | ✅ | 24978ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getFinancialAnalysis, getPortfolioOverview | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 69497ms | intentPlanner, assistantSourceHealth, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, semanticSearch | — |
| realworld-last-five-emails | source_lookup | ❌ | 24597ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getRecentEmails, getRecentOutlookEmails] to fire — none did; expected required tool 'getRecentEmails' to fire |
| realworld-urgent-inbox | source_lookup | ❌ | 13618ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-important-emails-this-morning | source_lookup | ❌ | 32332ms | intentPlanner, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getRecentEmails, getRecentOutlookEmails] to fire — none did; expected required tool 'getRecentEmails' to fire |
| realworld-outlook-arrived-today | source_lookup | ❌ | 20010ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-email-reply-triage | source_lookup | ❌ | 13147ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-draft-email-response | email_action | ✅ | 7026ms | intentPlanner, emailActionIntentRouter, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, emailActionFastPath | — |
| realworld-meeting-invite-clarify | calendar_action | ✅ | 9535ms | intentPlanner, calendarActionIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| realworld-meeting-invite-preview | calendar_action | ✅ | 6040ms | intentPlanner, assistantSourceHealth, calendarActionIntentRouter, createOutlookCalendarInvite, calendarActionFastPath | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 13 |
| `streamingToolPolicy` | 10 |
| `mcpToolDiscovery` | 7 |
| `promptContextReducer` | 4 |
| `assistantSourceHealth` | 4 |
| `emailActionIntentRouter` | 4 |
| `getRecentOutlookEmails` | 4 |
| `semanticSearch` | 3 |
| `mcpToolDiscoverySkipped` | 3 |
| `assistantWidgetPlanner` | 2 |
| `getActionItemsAndInsights` | 2 |
| `sourceLookupIntentRouter` | 2 |
| `calendarActionIntentRouter` | 2 |
| `sourceSpecificRagRetrieval` | 1 |
| `assistantComponentRegistry` | 1 |
| `getProjectsWithRisks` | 1 |
| `getFinancialAnalysis` | 1 |
| `getPortfolioOverview` | 1 |
| `getCompanyKnowledge` | 1 |
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
