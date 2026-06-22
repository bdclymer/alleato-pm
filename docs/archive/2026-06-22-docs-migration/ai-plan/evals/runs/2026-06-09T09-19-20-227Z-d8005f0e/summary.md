# AI Assistant Eval Suite — 2026-06-09T09-19-20-227Z-d8005f0e

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `source-sync-teams-regression`
- Bundle description: Agentic-eval guardrail for Teams/source-sync prompts. The assistant must distinguish live source-health questions from Teams content lookup and must expose stale source state instead of pretending coverage is complete.
- Filter: `(source-lookup-teams|source-freshness-rag-health|realworld-teams-source-freshness|realworld-teams-this-week-signal)$`
- Total: 4
- Passed: 0
- Failed: 4
- Warnings: 6
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| source-lookup-teams | source_lookup | ❌ | 121257ms | duration 121257ms exceeded warning budget 30000ms |
| realworld-teams-this-week-signal | source_lookup | ❌ | 66480ms | duration 66480ms exceeded warning budget 30000ms |
| source-freshness-rag-health | source_health | ❌ | 42575ms | expected family 'source_health' not represented; duration 42575ms exceeded warning budget 30000ms |
| realworld-teams-source-freshness | source_health | ❌ | 15416ms | expected family 'source_health' not represented; global forbidden phrase: "retrieval" |

## Bundle Criteria

- Source-health trust questions must fire assistantSourceHealth.
- Teams content questions must fire a Teams-capable retrieval path.
- Answers must not claim complete evidence coverage when source freshness is uncertain.
- Answers must give a direct operational read instead of generic AI/RAG caveats.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| source-lookup-teams | source_lookup | ❌ | 121257ms | — | 0 | searchMeetingsByTopic, semanticSearch, searchDocuments, getProjectBriefingSnapshot, loadIntelligencePacket | assistant message was not persisted to chat_history; answer length 0 < min 80; duration 121257ms exceeded max budget 60000ms |
| realworld-teams-this-week-signal | source_lookup | ❌ | 66480ms | — | 0 | sourceSpecificRagRetrieval, searchAppHelp, semanticSearch, searchDocuments | duration 66480ms exceeded max budget 60000ms |
| source-freshness-rag-health | source_health | ❌ | 42575ms | — | 0 | semanticSearch, getOutlookOperationsStatus, searchMemories | expected required tool 'assistantSourceHealth' to fire; required metadata missing: source_health |
| realworld-teams-source-freshness | source_health | ❌ | 15416ms | — | 0 | semanticSearch | expected required tool 'assistantSourceHealth' to fire; required metadata missing: source_health |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 4 |
| `searchDocuments` | 2 |
| `searchMeetingsByTopic` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `loadIntelligencePacket` | 1 |
| `sourceSpecificRagRetrieval` | 1 |
| `searchAppHelp` | 1 |
| `getOutlookOperationsStatus` | 1 |
| `searchMemories` | 1 |

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
- `searchConstructionMarket`
- `searchEmails`
- `searchExternalDocuments`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
