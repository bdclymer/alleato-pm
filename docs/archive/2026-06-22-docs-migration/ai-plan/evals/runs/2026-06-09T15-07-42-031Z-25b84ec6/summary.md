# AI Assistant Eval Suite — 2026-06-09T15-07-42-031Z-25b84ec6

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^toolcov-read-(structured-financial-rows|acumatica-project-budget|research-company)$`
- Total: 3
- Passed: 3
- Failed: 0
- Warnings: 4
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| toolcov-read-structured-financial-rows | structured_financial | ✅ | 42575ms | expected family 'structured' not represented; duration 42575ms exceeded warning budget 30000ms |
| toolcov-read-acumatica-project-budget | accounting | ✅ | 29584ms | expected family 'accounting' not represented |
| toolcov-read-research-company | web_research | ✅ | 16185ms | expected family 'web' not represented |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| toolcov-read-structured-financial-rows | structured_financial | ✅ | 42575ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |
| toolcov-read-acumatica-project-budget | accounting | ✅ | 29584ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |
| toolcov-read-research-company | web_research | ✅ | 16185ms | — | 0 | backendDeepAgentResearch, deepagents_research_runtime | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `backendDeepAgentProjectStatus` | 2 |
| `project_lookup` | 2 |
| `packet_reader` | 2 |
| `teams_reader` | 2 |
| `meetings_reader` | 2 |
| `emails_reader` | 2 |
| `documents_reader` | 2 |
| `financials_reader` | 2 |
| `schedule_reader` | 2 |
| `rfi_reader` | 2 |
| `submittal_reader` | 2 |
| `deepagents_runtime` | 2 |
| `backendDeepAgentResearch` | 1 |
| `deepagents_research_runtime` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentExecutiveBriefing`
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
- `getProjectBriefingSnapshot`
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
