# AI Assistant Eval Suite — 2026-06-09T14-39-29-493Z-cf9adf03

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `tool-coverage-read-regression`
- Bundle description: Direct per-tool coverage for runtime READ tools that no other case asserts (getProjectDetails, searchStructuredFinancialRows, getCompanyKnowledge, the Acumatica AR/vendor/bills/invoices/project-list/project-budget reads, web search/research/market, getGeneratedTasksToday). Safe to run against prod — no state is mutated. Each case passes only if its single target tool fires and the answer is grounded.
- Filter: `^toolcov-read-`
- Total: 13
- Passed: 5
- Failed: 8
- Warnings: 9
- Backend Deep Agents memory candidates: 0
- Judge: 0 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| toolcov-read-construction-market | web_research | ❌ | 87874ms | expected family 'web' not represented; duration 87874ms exceeded warning budget 45000ms |
| toolcov-read-vendor-spend | accounting | ✅ | 33930ms | — |
| toolcov-read-structured-financial-rows | structured_financial | ❌ | 33185ms | expected family 'structured' not represented |
| toolcov-read-acumatica-project-list | accounting | ✅ | 26780ms | — |
| toolcov-read-recent-invoices | accounting | ✅ | 26044ms | — |
| toolcov-read-acumatica-project-budget | accounting | ❌ | 23181ms | expected family 'accounting' not represented |
| toolcov-read-research-company | web_research | ❌ | 18325ms | expected family 'web' not represented |
| toolcov-read-recent-bills | accounting | ✅ | 17373ms | — |
| toolcov-read-project-details | project_details | ❌ | 1531ms | expected family 'project' not represented |
| toolcov-read-generated-tasks-today | task_management | ✅ | 900ms | — |

## Bundle Criteria

- Every case must fire its single expectedToolName — the prompt must route to that exact tool, not a sibling.
- Acumatica cases must hit the live ERP read path, not a cached/structured fallback.
- Answers must reflect the tool's output (real numbers / names / facts), not a generic deferral.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| toolcov-read-project-details | project_details | ❌ | 1531ms | — | 0 | assistantSourceHealth | expected at least one of [getProjectDetails] to fire — none did; mustInclude missing: "Westfield" |
| toolcov-read-structured-financial-rows | structured_financial | ❌ | 33185ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [searchStructuredFinancialRows] to fire — none did |
| toolcov-read-company-knowledge | company_knowledge | ❌ | 402ms | — | 0 | assistantSourceHealth | expected at least one of [getCompanyKnowledge] to fire — none did |
| toolcov-read-ar-aging | accounting | ❌ | 284ms | — | 0 | assistantSourceHealth | expected at least one of [getARAgingReport] to fire — none did |
| toolcov-read-vendor-spend | accounting | ✅ | 33930ms | — | 0 | getVendorSpendReport | — |
| toolcov-read-recent-bills | accounting | ✅ | 17373ms | — | 0 | getRecentBills | — |
| toolcov-read-recent-invoices | accounting | ✅ | 26044ms | — | 0 | getRecentInvoices | — |
| toolcov-read-acumatica-project-list | accounting | ✅ | 26780ms | — | 0 | getAcumaticaProjectList | — |
| toolcov-read-acumatica-project-budget | accounting | ❌ | 23181ms | — | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [getAcumaticaProjectBudget] to fire — none did |
| toolcov-read-web-search | web_research | ❌ | 450ms | — | 0 | assistantSourceHealth | expected at least one of [searchWeb] to fire — none did |
| toolcov-read-research-company | web_research | ❌ | 18325ms | — | 0 | backendDeepAgentResearch, deepagents_research_runtime | expected at least one of [researchCompany] to fire — none did |
| toolcov-read-construction-market | web_research | ❌ | 87874ms | — | 0 | searchDocuments, semanticSearch, searchMeetingsByTopic, getCompanyKnowledge | expected at least one of [searchConstructionMarket] to fire — none did |
| toolcov-read-generated-tasks-today | task_management | ✅ | 900ms | — | 0 | getGeneratedTasksToday | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `assistantSourceHealth` | 4 |
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
| `getVendorSpendReport` | 1 |
| `getRecentBills` | 1 |
| `getRecentInvoices` | 1 |
| `getAcumaticaProjectList` | 1 |
| `backendDeepAgentResearch` | 1 |
| `deepagents_research_runtime` | 1 |
| `searchDocuments` | 1 |
| `semanticSearch` | 1 |
| `searchMeetingsByTopic` | 1 |
| `getCompanyKnowledge` | 1 |
| `getGeneratedTasksToday` | 1 |

## Tools defined but never fired in this run

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
- `getBudgetLineItems`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCommitmentsOverview`
- `getCostTrends`
- `getCrossProjectComparison`
- `getDirectCostsSummary`
- `getFinancialAnalysis`
- `getForecastComparison`
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
- `getRecentEmails`
- `getScheduleAnalysis`
- `getSubmittalStatus`
- `getVendorPerformance`
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
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
