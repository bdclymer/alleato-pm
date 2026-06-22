# AI Assistant Eval Suite — 2026-05-19T14-34-03-883Z-3730eef0

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 1
- Passed: 1
- Failed: 0
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 15987ms | expected family 'semantic' not represented; expected family 'communications' not represented |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 15987ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `backendDeepAgentProjectStatus` | 1 |
| `project_lookup` | 1 |
| `packet_reader` | 1 |
| `teams_reader` | 1 |
| `meetings_reader` | 1 |
| `emails_reader` | 1 |
| `documents_reader` | 1 |
| `financials_reader` | 1 |
| `schedule_reader` | 1 |
| `rfi_reader` | 1 |
| `submittal_reader` | 1 |
| `deepagents_runtime` | 1 |

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
