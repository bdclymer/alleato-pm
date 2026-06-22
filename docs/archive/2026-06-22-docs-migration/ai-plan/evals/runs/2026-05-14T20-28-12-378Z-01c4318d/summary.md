# AI Assistant Eval Suite — 2026-05-14T20-28-12-378Z-01c4318d

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Filter: `owner-strategy|action-task|task-register|source-freshness`
- Total: 5
- Passed: 4
- Failed: 1

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| owner-strategy-ulta-action-plan | project_briefing | ✅ | 26438ms | intentPlanner, promptContextReducer, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |
| action-task-preview-no-write | action_preview | ❌ | 21638ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | expected required tool 'createTask' to fire; forbidden tool fired: 'noToolRetry' |
| task-register-source-grounded | task_management | ✅ | 10845ms | intentPlanner, promptContextReducer, getMyTasks | — |
| source-freshness-rag-health | source_health | ✅ | 44467ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |
| realworld-teams-source-freshness | source_health | ✅ | 25153ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 5 |
| `streamingToolPolicy` | 4 |
| `noToolRetry` | 4 |
| `promptContextReducer` | 3 |
| `mcpToolDiscovery` | 3 |
| `assistantSourceHealth` | 2 |
| `messageDrivenToolRouter` | 2 |
| `clientProjectIntelligencePacket` | 1 |
| `taskWriteIntentRouter` | 1 |
| `mcpToolDiscoverySkipped` | 1 |
| `getMyTasks` | 1 |
| `semanticSearch` | 1 |
| `sourceLookupIntentRouter` | 1 |

## Tools defined but never fired in this run

- `backendDeepAgentExecutiveBriefing`
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
- `updateGeneratedTask`
- `writeMemory`
