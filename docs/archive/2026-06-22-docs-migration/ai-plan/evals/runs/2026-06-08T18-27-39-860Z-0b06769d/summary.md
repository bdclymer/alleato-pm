# AI Assistant Eval Suite — 2026-06-08T18-27-39-860Z-0b06769d

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Bundle: `project-document-intelligence-regression`
- Bundle description: Agentic-eval guardrail for selected-project document intelligence. The assistant must preload the project operating packet/snapshot, use document/source lookup only as drilldown, and disclose stale or missing context layers instead of answering from a cold search.
- Filter: `project-document-(broad-briefing|exact-spec-lookup|stale-packet-check|missing-context-disclosure)$`
- Total: 4
- Passed: 3
- Failed: 1
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 57767ms | duration 57767ms exceeded warning budget 30000ms |
| project-document-exact-spec-lookup | document_question | ❌ | 40584ms | duration 40584ms exceeded warning budget 30000ms |
| project-document-stale-packet-check | source_health | ✅ | 12233ms | — |
| project-document-missing-context-disclosure | document_question | ✅ | 11771ms | — |

## Bundle Criteria

- Selected-project document questions must preload clientProjectIntelligencePacket and getProjectBriefingSnapshot.
- Exact document/spec questions must also use semanticSearch, sourceSpecificRagRetrieval, searchDocuments, or another document-capable lookup.
- Answers must separate the project operating baseline from exact source proof.
- Answers must disclose stale, missing, or thin packet/snapshot/document coverage when relevant.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-document-broad-briefing | document_question | ✅ | 57767ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |
| project-document-exact-spec-lookup | document_question | ❌ | 40584ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | mustExclude present: "generic document guidance" |
| project-document-stale-packet-check | source_health | ✅ | 12233ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, assistantSourceHealth, loadIntelligencePacket | — |
| project-document-missing-context-disclosure | document_question | ✅ | 11771ms | — | 0 | clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, searchDocuments, loadIntelligencePacket | — |

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
