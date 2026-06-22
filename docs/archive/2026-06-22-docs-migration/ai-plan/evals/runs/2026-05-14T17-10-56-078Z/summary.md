# AI Assistant Eval Suite — 2026-05-14T17-10-56-078Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 4
- Failed: 0

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 73879ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, noToolRetry | — |
| realworld-teams-this-week-signal | source_lookup | ✅ | 57091ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, noToolRetry | — |
| source-freshness-rag-health | source_health | ✅ | 54271ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getMeetingsByDate, noToolRetry | — |
| realworld-teams-source-freshness | source_health | ✅ | 67950ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, searchTeamsMessages, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 4 |
| `assistantSourceHealth` | 4 |
| `messageDrivenToolRouter` | 4 |
| `mcpToolDiscovery` | 4 |
| `streamingToolPolicy` | 4 |
| `noToolRetry` | 4 |
| `semanticSearch` | 3 |
| `sourceLookupIntentRouter` | 3 |
| `getProjectBriefingSnapshot` | 2 |
| `getMeetingsByDate` | 1 |
| `searchTeamsMessages` | 1 |

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
- `getMyTasks`
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
- `searchWeb`
- `updateGeneratedTask`
- `writeMemory`
