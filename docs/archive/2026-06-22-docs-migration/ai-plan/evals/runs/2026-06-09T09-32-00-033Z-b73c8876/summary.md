# AI Assistant Eval Suite — 2026-06-09T09-32-00-033Z-b73c8876

- Endpoint: `https://alleato-ih4s3lmtz-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 0
- Failed: 4
- Warnings: 8
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-teams-this-week-signal | source_lookup | ❌ | 103719ms | duration 103719ms exceeded warning budget 30000ms |
| source-lookup-teams | source_lookup | ❌ | 67399ms | global forbidden phrase: "retrieval"; duration 67399ms exceeded warning budget 30000ms |
| source-freshness-rag-health | source_health | ❌ | 48086ms | expected family 'source_health' not represented; global forbidden phrase: "retrieval"; duration 48086ms exceeded warning budget 30000ms |
| realworld-teams-source-freshness | source_health | ❌ | 17263ms | expected family 'source_health' not represented; global forbidden phrase: "retrieval" |

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ❌ | 67399ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, searchMeetingsByTopic, loadIntelligencePacket | duration 67399ms exceeded max budget 60000ms |
| realworld-teams-this-week-signal | source_lookup | ❌ | 103719ms | — | 0 | sourceSpecificRagRetrieval, searchAppHelp, searchMeetingsByTopic, semanticSearch, getMeetingIntelligence, searchDocuments | duration 103719ms exceeded max budget 60000ms |
| source-freshness-rag-health | source_health | ❌ | 48086ms | — | 0 | semanticSearch, getOutlookOperationsStatus, getMeetingIntelligence, searchDocuments | expected required tool 'assistantSourceHealth' to fire; required metadata missing: source_health |
| realworld-teams-source-freshness | source_health | ❌ | 17263ms | — | 0 | semanticSearch | expected required tool 'assistantSourceHealth' to fire; mustIncludeAny missing one of: "stale", "fresh", "current", "sync", "source health", "unembedded"; required metadata missing: source_health |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 4 |
| `searchDocuments` | 3 |
| `searchMeetingsByTopic` | 2 |
| `getMeetingIntelligence` | 2 |
| `clientProjectIntelligencePacket` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `loadIntelligencePacket` | 1 |
| `sourceSpecificRagRetrieval` | 1 |
| `searchAppHelp` | 1 |
| `getOutlookOperationsStatus` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentExecutiveBriefing`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
- `consultMicrosoftExecutiveAssistant`
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
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
- `getProjectsWithRisks`
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
- `searchConstructionMarket`
- `searchEmails`
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
