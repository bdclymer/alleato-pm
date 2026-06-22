# AI Assistant Eval Suite — 2026-05-14T19-02-58-997Z-f6879603

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `task-action-items-regression`
- Bundle description: Agentic-eval guardrail for task and action-item prompts. The assistant must recognize common owner phrasing for tasks, action items, open loops, and waiting-on-team questions without requiring exact wording.
- Filter: `(tasks-list-of-action-items-canonical|tasks-what-do-i-need-to-do-today|tasks-open-loops-all|tasks-whats-on-my-list|realworld-most-important-tasks|realworld-waiting-on-team)$`
- Total: 6
- Passed: 6
- Failed: 0

## Bundle Criteria

- Every task-list variant must use a source-backed task or action-item tool.
- The assistant must not ask which list, project, or action item source the user means.
- Owner phrasing like open loops, my list, and waiting on my team must route as task/action-item retrieval.
- Answers must be direct and useful enough for morning triage, not generic planning advice.

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| tasks-list-of-action-items-canonical | task_management | ✅ | 17709ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 18099ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 7105ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-whats-on-my-list | task_management | ✅ | 4428ms | intentPlanner, promptContextReducer, getMyTasks | — |
| realworld-most-important-tasks | task_management | ✅ | 15140ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 40160ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 6 |
| `promptContextReducer` | 6 |
| `getMyTasks` | 4 |
| `mcpToolDiscovery` | 2 |
| `streamingToolPolicy` | 2 |
| `getActionItemsAndInsights` | 2 |
| `messageDrivenToolRouter` | 1 |
| `noToolRetry` | 1 |

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
