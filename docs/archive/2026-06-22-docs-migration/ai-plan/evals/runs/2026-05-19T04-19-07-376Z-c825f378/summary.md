# AI Assistant Eval Suite — 2026-05-19T04-19-07-376Z-c825f378

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `strategic-advisor-quality`
- Bundle description: LLM-judge eval for whether the assistant sounds like an intelligent executive strategist instead of a document retriever.
- Filter: `(realworld-most-important-tasks|realworld-waiting-on-team|realworld-business-risks|realworld-systems-processes-needed|portfolio-morning-standup|owner-prep-call-westfield)$`
- Total: 6
- Passed: 0
- Failed: 6
- Warnings: 15
- Backend Deep Agents memory candidates: 0
- Judge: 6 judged, 0 passed, 0 failed, 6 errors, avg 0 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| portfolio-morning-standup | portfolio_briefing | ❌ | 71214ms | duration 71214ms exceeded warning budget 45000ms |
| realworld-systems-processes-needed | implementation_planning | ❌ | 70227ms | expected family 'project' not represented; expected family 'actions' not represented; expected family 'source_health' not represented; duration 70227ms exceeded warning budget 45000ms |
| realworld-business-risks | risk_review | ❌ | 68855ms | expected family 'project' not represented; expected family 'risk' not represented; expected family 'financial' not represented; expected family 'source_health' not represented; duration 68855ms exceeded warning budget 45000ms |
| realworld-waiting-on-team | task_management | ❌ | 57896ms | duration 57896ms exceeded warning budget 45000ms |
| realworld-most-important-tasks | task_management | ❌ | 53834ms | duration 53834ms exceeded warning budget 45000ms |
| owner-prep-call-westfield | project_briefing | ❌ | 25303ms | expected family 'project' not represented; expected family 'semantic' not represented; expected family 'communications' not represented |

## Bundle Criteria

- The answer must lead with a clear business point of view.
- The answer must connect evidence into implications, not just list retrieved facts.
- The answer must include specific next actions or decisions.
- The answer must sound like a high-level Alleato strategist, not a generic RAG summary.
- The answer must acknowledge source gaps without hiding behind them.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| portfolio-morning-standup | portfolio_briefing | ❌ | 71214ms | strategic_advisor: error (0/4) | 0 | getPortfolioOverview, getProjectsWithRisks, getActionItemsAndInsights, semanticSearch | judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| owner-prep-call-westfield | project_briefing | ❌ | 25303ms | strategic_advisor: error (0/4) | 0 | project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did; judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-most-important-tasks | task_management | ❌ | 53834ms | strategic_advisor: error (0/4) | 0 | getActionItemsAndInsights, semanticSearch | expected required tool 'backendDeepAgentExecutiveBriefing' to fire; required metadata missing: response_quality; judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-waiting-on-team | task_management | ❌ | 57896ms | strategic_advisor: error (0/4) | 0 | getActionItemsAndInsights, semanticSearch | expected required tool 'backendDeepAgentExecutiveBriefing' to fire; required metadata missing: response_quality; judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-business-risks | risk_review | ❌ | 68855ms | strategic_advisor: error (0/4) | 0 | listDomainIntelligence, getDomainIntelligence, semanticSearch | expected at least one of [backendDeepAgentExecutiveBriefing, getProjectsWithRisks, getPortfolioOverview, getFinancialAnalysis, assistantSourceHealth] to fire — none did; expected required tool 'backendDeepAgentExecutiveBriefing' to fire; judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-systems-processes-needed | implementation_planning | ❌ | 70227ms | strategic_advisor: error (0/4) | 0 | semanticSearch | expected at least one of [backendDeepAgentExecutiveBriefing, getPortfolioOverview, getActionItemsAndInsights, assistantSourceHealth] to fire — none did; expected required tool 'backendDeepAgentExecutiveBriefing' to fire; judge strategic_advisor error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |

## Judge notes

### portfolio-morning-standup

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### owner-prep-call-westfield

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-business-risks

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-systems-processes-needed

- Rubric: `strategic_advisor`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 5 |
| `getActionItemsAndInsights` | 3 |
| `getPortfolioOverview` | 1 |
| `getProjectsWithRisks` | 1 |
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
| `listDomainIntelligence` | 1 |
| `getDomainIntelligence` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentExecutiveBriefing`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
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
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getProjectBriefingSnapshot`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
- `getRFIStatus`
- `getRecentBills`
- `getRecentEmails`
- `getRecentInvoices`
- `getRecentOutlookEmails`
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
- `readOutlookEmailThread`
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
