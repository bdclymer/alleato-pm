# AI Assistant Eval Suite — 2026-06-09T09-49-09-043Z-d15be8c9

- Endpoint: `https://alleato-5y4fbd5ji-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 4
- Failed: 0
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 20490ms | expected family 'communications' not represented |
| realworld-teams-this-week-signal | source_lookup | ✅ | 19744ms | expected family 'communications' not represented |
| source-freshness-rag-health | source_health | ✅ | 485ms | — |
| realworld-teams-source-freshness | source_health | ✅ | 280ms | — |

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ✅ | 20490ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, sourceSpecificRagRetrieval, loadIntelligencePacket | — |
| realworld-teams-this-week-signal | source_lookup | ✅ | 19744ms | — | 0 | sourceSpecificRagRetrieval | — |
| source-freshness-rag-health | source_health | ✅ | 485ms | — | 0 | assistantSourceHealth | — |
| realworld-teams-source-freshness | source_health | ✅ | 280ms | — | 0 | assistantSourceHealth | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `sourceSpecificRagRetrieval` | 2 |
| `assistantSourceHealth` | 2 |
| `clientProjectIntelligencePacket` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `loadIntelligencePacket` | 1 |

## Tools defined but never fired in this run

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
- `getMeetingIntelligence`
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
