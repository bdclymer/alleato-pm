# AI Assistant Eval Suite — 2026-05-19T15-57-30-731Z-a2b2ce18

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(project-briefing-westfield|project-briefing-vermillion|project-briefing-union-meeting-coverage)$`
- Total: 3
- Passed: 3
- Failed: 0
- Warnings: 7
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ✅ | 45960ms | expected family 'semantic' not represented; expected family 'communications' not represented; duration 45960ms exceeded warning budget 30000ms |
| project-briefing-vermillion | project_briefing | ✅ | 35087ms | expected family 'semantic' not represented; duration 35087ms exceeded warning budget 30000ms |
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 15019ms | expected family 'semantic' not represented; expected family 'communications' not represented |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ✅ | 45960ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |
| project-briefing-vermillion | project_briefing | ✅ | 35087ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 15019ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `backendDeepAgentProjectStatus` | 3 |
| `project_lookup` | 3 |
| `packet_reader` | 3 |
| `teams_reader` | 3 |
| `meetings_reader` | 3 |
| `emails_reader` | 3 |
| `documents_reader` | 3 |
| `financials_reader` | 3 |
| `schedule_reader` | 3 |
| `rfi_reader` | 3 |
| `submittal_reader` | 3 |
| `deepagents_runtime` | 3 |

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
