# AI Assistant Eval Suite — 2026-05-19T06-14-59-071Z-14cd9844

- Endpoint: `http://localhost:3001/api/ai-assistant/chat`
- Total: 1
- Passed: 0
- Failed: 1
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 1 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-business-risks | risk_review | ❌ | 82471ms | duration 82471ms exceeded warning budget 30000ms; judge strategic_advisor skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-business-risks | risk_review | ❌ | 82471ms | strategic_advisor: skipped (n/a/4) | 0 | backendDeepAgentExecutiveBriefing, getProjectsWithRisks, getDomainIntelligence, semanticSearch | duration 82471ms exceeded max budget 75000ms |

## Judge notes

### realworld-business-risks

- Rubric: `strategic_advisor`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `backendDeepAgentExecutiveBriefing` | 1 |
| `getProjectsWithRisks` | 1 |
| `getDomainIntelligence` | 1 |
| `semanticSearch` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getPortfolioOverview`
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
