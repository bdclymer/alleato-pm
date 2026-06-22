# AI Assistant Eval Suite — 2026-05-14T21-24-36-720Z-5969890b

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 4
- Failed: 0
- Warnings: 2

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-teams-this-week-signal | source_lookup | ✅ | 33801ms | duration 33801ms exceeded warning budget 30000ms |
| source-lookup-teams | source_lookup | ✅ | 32399ms | duration 32399ms exceeded warning budget 30000ms |
| source-freshness-rag-health | source_health | ✅ | 29425ms | — |
| realworld-teams-source-freshness | source_health | ✅ | 9317ms | — |

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 32399ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-teams-this-week-signal | source_lookup | ✅ | 33801ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| source-freshness-rag-health | source_health | ✅ | 29425ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscoverySkipped, streamingToolPolicy, noToolRetry | — |
| realworld-teams-source-freshness | source_health | ✅ | 9317ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 4 |
| `assistantSourceHealth` | 4 |
| `messageDrivenToolRouter` | 4 |
| `streamingToolPolicy` | 4 |
| `noToolRetry` | 4 |
| `semanticSearch` | 3 |
| `sourceLookupIntentRouter` | 3 |
| `mcpToolDiscoverySkipped` | 3 |
| `mcpToolDiscovery` | 1 |

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
