# AI Assistant Eval Suite — 2026-06-10T01-38-03-487Z-b1195b4c

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^toolcov-read-(project-details|company-knowledge|ar-aging|web-search)$`
- Total: 4
- Passed: 0
- Failed: 4
- Warnings: 5
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| toolcov-read-company-knowledge | company_knowledge | ❌ | 55530ms | expected family 'knowledge' not represented; duration 55530ms exceeded warning budget 30000ms |
| toolcov-read-project-details | project_details | ❌ | 39086ms | duration 39086ms exceeded warning budget 30000ms |
| toolcov-read-ar-aging | accounting | ❌ | 23651ms | expected family 'accounting' not represented |
| toolcov-read-web-search | web_research | ❌ | 18808ms | expected family 'web' not represented |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| toolcov-read-project-details | project_details | ❌ | 39086ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [getProjectDetails] to fire — none did |
| toolcov-read-company-knowledge | company_knowledge | ❌ | 55530ms | — | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime | expected at least one of [getCompanyKnowledge] to fire — none did |
| toolcov-read-ar-aging | accounting | ❌ | 23651ms | — | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime | expected at least one of [getARAgingReport] to fire — none did |
| toolcov-read-web-search | web_research | ❌ | 18808ms | — | 0 | backendDeepAgentResearch, deepagents_research_runtime | expected at least one of [searchWeb] to fire — none did |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `teams_reader` | 3 |
| `meetings_reader` | 3 |
| `emails_reader` | 3 |
| `documents_reader` | 3 |
| `financials_reader` | 3 |
| `schedule_reader` | 3 |
| `deepagents_runtime` | 3 |
| `backendDeepAgentExecutiveBriefing` | 2 |
| `executive_briefing_reader` | 2 |
| `tasks_reader` | 2 |
| `executive_follow_ups_reader` | 2 |
| `projects_reader` | 2 |
| `backendDeepAgentProjectStatus` | 1 |
| `project_lookup` | 1 |
| `packet_reader` | 1 |
| `rfi_reader` | 1 |
| `submittal_reader` | 1 |
| `backendDeepAgentResearch` | 1 |
| `deepagents_research_runtime` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
