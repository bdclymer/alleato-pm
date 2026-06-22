# AI Assistant Eval Suite — 2026-06-08T18-24-41-997Z-d73780d9

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Bundle: `project-document-intelligence-regression`
- Bundle description: Agentic-eval guardrail for selected-project document intelligence. The assistant must preload the project operating packet/snapshot, use document/source lookup only as drilldown, and disclose stale or missing context layers instead of answering from a cold search.
- Filter: `project-document-(broad-briefing|exact-spec-lookup|stale-packet-check|missing-context-disclosure)$`
- Total: 4
- Passed: 2
- Failed: 2
- Warnings: 4
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 13779ms | — |
| project-document-missing-context-disclosure | document_question | ❌ | 13250ms | expected family 'documents' not represented; expected family 'semantic' not represented |
| project-document-stale-packet-check | source_health | ✅ | 11461ms | — |
| project-document-exact-spec-lookup | document_question | ❌ | 11328ms | expected family 'documents' not represented; expected family 'semantic' not represented |

## Bundle Criteria

- Selected-project document questions must preload clientProjectIntelligencePacket and getProjectBriefingSnapshot.
- Exact document/spec questions must also use semanticSearch, sourceSpecificRagRetrieval, searchDocuments, or another document-capable lookup.
- Answers must separate the project operating baseline from exact source proof.
- Answers must disclose stale, missing, or thin packet/snapshot/document coverage when relevant.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 13779ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |
| project-document-exact-spec-lookup | document_question | ❌ | 11328ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, assistantSourceHealth, loadIntelligencePacket | expected at least one of [searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did; expected required tool 'semanticSearch' to fire |
| project-document-stale-packet-check | source_health | ✅ | 11461ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, assistantSourceHealth, loadIntelligencePacket | — |
| project-document-missing-context-disclosure | document_question | ❌ | 13250ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, assistantSourceHealth, loadIntelligencePacket | expected at least one of [semanticSearch, searchDocuments, sourceSpecificRagRetrieval, queryDocumentRows] to fire — none did |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `clientProjectIntelligencePacket` | 4 |
| `getProjectBriefingSnapshot` | 4 |
| `loadIntelligencePacket` | 4 |
| `assistantSourceHealth` | 3 |
| `semanticSearch` | 1 |
| `searchDocuments` | 1 |

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
