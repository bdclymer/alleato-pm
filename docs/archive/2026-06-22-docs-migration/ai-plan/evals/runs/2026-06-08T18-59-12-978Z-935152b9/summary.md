# AI Assistant Eval Suite — 2026-06-08T18-59-12-978Z-935152b9

- Endpoint: `http://localhost:3002/api/ai-assistant/chat`
- Bundle: `project-document-intelligence-regression`
- Bundle description: Agentic-eval guardrail for selected-project document intelligence. The assistant must preload the project operating packet/snapshot, use document/source lookup only as drilldown, and disclose stale or missing context layers instead of answering from a cold search.
- Filter: `project-document-(broad-briefing|exact-spec-lookup|stale-packet-check|missing-context-disclosure)$`
- Total: 4
- Passed: 4
- Failed: 0
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 14464ms | — |
| project-document-exact-spec-lookup | document_question | ✅ | 13778ms | — |
| project-document-stale-packet-check | source_health | ✅ | 11296ms | — |
| project-document-missing-context-disclosure | document_question | ✅ | 10241ms | — |

## Bundle Criteria

- Selected-project document questions must preload clientProjectIntelligencePacket and getProjectBriefingSnapshot.
- Exact document/spec questions must also use semanticSearch, sourceSpecificRagRetrieval, searchDocuments, or another document-capable lookup.
- Answers must separate the project operating baseline from exact source proof.
- Answers must disclose stale, missing, or thin packet/snapshot/document coverage when relevant.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 14464ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |
| project-document-exact-spec-lookup | document_question | ✅ | 13778ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |
| project-document-stale-packet-check | source_health | ✅ | 11296ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, assistantSourceHealth, loadIntelligencePacket | — |
| project-document-missing-context-disclosure | document_question | ✅ | 10241ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `clientProjectIntelligencePacket` | 4 |
| `getProjectBriefingSnapshot` | 4 |
| `loadIntelligencePacket` | 4 |
| `semanticSearch` | 3 |
| `searchDocuments` | 3 |
| `assistantSourceHealth` | 1 |

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
- `searchEmails`
- `searchExternalDocuments`
- `searchMeetingsByTopic`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
