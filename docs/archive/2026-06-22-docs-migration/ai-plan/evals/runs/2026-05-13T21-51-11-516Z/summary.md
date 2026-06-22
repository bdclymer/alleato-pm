# AI Assistant Eval Suite — 2026-05-13T21-51-11-516Z

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Total: 10
- Passed: 6
- Failed: 4

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-todays-meetings | meeting_query | ✅ | 20441ms | intentPlanner, assistantWidgetPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | — |
| realworld-most-important-tasks | task_management | ✅ | 21708ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 23767ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-business-risks | risk_review | ✅ | 42038ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getPortfolioOverview | — |
| realworld-systems-processes-needed | implementation_planning | ❌ | 52180ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, semanticSearch | expected at least one of [getPortfolioOverview, getActionItemsAndInsights, assistantSourceHealth] to fire — none did |
| realworld-last-five-emails | source_lookup | ❌ | 10329ms | (none) | stream error: HTTP 404: <!DOCTYPE html><html lang="en" class="__variable_f367f3 font-sans" data-scroll-behavior="smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=1778709244251" data-precedence="next_static/css/app/layout.css"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chun; HTTP 404; assistant message was not persisted to chat_history; expected at least one of [sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails] to fire — none did; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "no emails" |
| realworld-urgent-inbox | source_lookup | ✅ | 18950ms | intentPlanner, sourceSpecificRagRetrieval | — |
| realworld-draft-email-response | email_action | ❌ | 23957ms | intentPlanner, assistantSourceHealth, assistantWidgetPlanner, sourceSpecificRagRetrieval | expected at least one of [draftOutlookEmail, getRecentEmails, getRecentOutlookEmails, readOutlookEmailThread] to fire — none did |
| realworld-meeting-invite-clarify | calendar_action | ❌ | 24107ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy | expected at least one of [createOutlookCalendarInvite, getPeopleAndRoles] to fire — none did |
| realworld-meeting-invite-preview | calendar_action | ✅ | 23368ms | intentPlanner, assistantSourceHealth, mcpToolDiscovery, streamingToolPolicy, createOutlookCalendarInvite | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 9 |
| `mcpToolDiscovery` | 6 |
| `streamingToolPolicy` | 6 |
| `assistantWidgetPlanner` | 3 |
| `sourceSpecificRagRetrieval` | 3 |
| `promptContextReducer` | 3 |
| `getActionItemsAndInsights` | 2 |
| `assistantSourceHealth` | 2 |
| `assistantComponentRegistry` | 1 |
| `getProjectsWithRisks` | 1 |
| `getPortfolioOverview` | 1 |
| `getCompanyKnowledge` | 1 |
| `semanticSearch` | 1 |
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
- `draftOutlookEmail`
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
- `getFinancialAnalysis`
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
