# AI Assistant Eval Suite — 2026-05-19T15-53-19-632Z-1f40e6b2

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Filter: `^(project-briefing-westfield|project-briefing-vermillion|project-briefing-union-meeting-coverage)$`
- Total: 3
- Passed: 1
- Failed: 2
- Warnings: 5
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ❌ | 60002ms | duration 60002ms exceeded warning budget 30000ms |
| project-briefing-vermillion | project_briefing | ❌ | 37942ms | expected family 'semantic' not represented; duration 37942ms exceeded warning budget 30000ms |
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 14201ms | expected family 'semantic' not represented; expected family 'communications' not represented |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ❌ | 60002ms | — | 0 | getProjectBriefingSnapshot, consultCFO, consultCOO, consultCRO, loadIntelligencePacket, semanticSearch | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history |
| project-briefing-vermillion | project_briefing | ❌ | 37942ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [getProjectBriefingSnapshot] to fire — none did |
| project-briefing-union-meeting-coverage | project_briefing | ✅ | 14201ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | — |

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
| `getProjectBriefingSnapshot` | 1 |
| `consultCFO` | 1 |
| `consultCOO` | 1 |
| `consultCRO` | 1 |
| `loadIntelligencePacket` | 1 |
| `semanticSearch` | 1 |

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
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
