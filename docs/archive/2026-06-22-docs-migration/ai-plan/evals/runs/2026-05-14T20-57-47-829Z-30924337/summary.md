# AI Assistant Eval Suite — 2026-05-14T20-57-47-829Z-30924337

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `deep-agents-executive-regression`
- Bundle description: Agentic-eval guardrail for broad business prompts. The assistant must use the backend executive Deep Agents packet for no-project executive questions while keeping deterministic write tools out of read-only synthesis.
- Filter: `realworld-(most-important-tasks|waiting-on-team|business-risks|systems-processes-needed)$`
- Total: 4
- Passed: 4
- Failed: 0

## Bundle Criteria

- Every broad no-project executive prompt must fire backendDeepAgentExecutiveBriefing.
- The assistant must still use source-backed task/action/source-health tools where appropriate.
- No read-only executive prompt may fire email, calendar, or task write tools.
- Answers must be specific and operational, not generic best-practice advice.

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-most-important-tasks | task_management | ✅ | 28776ms | intentPlanner, promptContextReducer, backendDeepAgentExecutiveBriefing, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-waiting-on-team | task_management | ✅ | 32520ms | intentPlanner, promptContextReducer, messageDrivenToolRouter, backendDeepAgentExecutiveBriefing, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-business-risks | risk_review | ✅ | 29747ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, backendDeepAgentExecutiveBriefing, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 49992ms | intentPlanner, assistantSourceHealth, backendDeepAgentExecutiveBriefing, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 4 |
| `backendDeepAgentExecutiveBriefing` | 4 |
| `mcpToolDiscoverySkipped` | 4 |
| `streamingToolPolicy` | 4 |
| `noToolRetry` | 4 |
| `promptContextReducer` | 3 |
| `messageDrivenToolRouter` | 1 |
| `assistantWidgetPlanner` | 1 |
| `assistantSourceHealth` | 1 |

## Tools defined but never fired in this run

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
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
