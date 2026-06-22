# AI Assistant Eval Suite — 2026-05-14T15-51-05-316Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 3
- Failed: 1

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 85869ms | intentPlanner, promptContextReducer, assistantSourceHealth, messageDrivenToolRouter, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, searchTeamsMessages, noToolRetry | — |
| realworld-teams-this-week-signal | source_lookup | ✅ | 55338ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, getPeopleAndRoles, noToolRetry | — |
| source-freshness-rag-health | source_health | ❌ | 120003ms | searchMeetingsByTopic | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustInclude missing: "Outlook"; mustInclude missing: "meeting"; mustInclude missing: "packet"; mustIncludeAny missing one of: "stale", "fresh", "up to date", "unembedded", "uncompiled", "source health"; answer length 0 < min 250; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |
| realworld-teams-source-freshness | source_health | ✅ | 51764ms | intentPlanner, assistantSourceHealth, messageDrivenToolRouter, mcpToolDiscovery, streamingToolPolicy, searchTeamsMessages, noToolRetry | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 3 |
| `assistantSourceHealth` | 3 |
| `messageDrivenToolRouter` | 3 |
| `mcpToolDiscovery` | 3 |
| `streamingToolPolicy` | 3 |
| `noToolRetry` | 3 |
| `searchTeamsMessages` | 2 |
| `promptContextReducer` | 1 |
| `backendDeepAgentProjectStatus` | 1 |
| `clientProjectIntelligencePacket` | 1 |
| `semanticSearch` | 1 |
| `sourceLookupIntentRouter` | 1 |
| `getPeopleAndRoles` | 1 |
| `searchMeetingsByTopic` | 1 |

## Tools defined but never fired in this run

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
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `updateGeneratedTask`
- `writeMemory`
