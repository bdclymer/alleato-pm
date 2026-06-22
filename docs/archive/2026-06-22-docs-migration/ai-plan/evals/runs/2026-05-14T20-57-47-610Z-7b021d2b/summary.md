# AI Assistant Eval Suite — 2026-05-14T20-57-47-610Z-7b021d2b

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `(source-lookup-teams|realworld-teams-this-week-signal|source-freshness-rag-health|realworld-teams-source-freshness)$`
- Total: 4
- Passed: 3
- Failed: 1

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ❌ | 31977ms | intentPlanner, promptContextReducer, assistantSourceHealth, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, noToolRetry | expected at least one of [sourceSpecificRagRetrieval, searchTeamsMessages, semanticSearch] to fire — none did |
| realworld-teams-this-week-signal | source_lookup | ✅ | 30138ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| source-freshness-rag-health | source_health | ✅ | 31580ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-teams-source-freshness | source_health | ✅ | 7598ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 4 |
| `assistantSourceHealth` | 4 |
| `messageDrivenToolRouter` | 4 |
| `streamingToolPolicy` | 4 |
| `noToolRetry` | 4 |
| `mcpToolDiscovery` | 2 |
| `semanticSearch` | 2 |
| `sourceLookupIntentRouter` | 2 |
| `mcpToolDiscoverySkipped` | 2 |
| `promptContextReducer` | 1 |
| `backendDeepAgentProjectStatus` | 1 |
| `clientProjectIntelligencePacket` | 1 |

## Tools defined but never fired in this run

- `backendDeepAgentExecutiveBriefing`
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
- `updateGeneratedTask`
- `writeMemory`
