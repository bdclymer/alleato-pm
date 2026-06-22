# AI Assistant Eval Suite — 2026-05-19T11-03-49-986Z-1cfff01c

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 1
- Passed: 1
- Failed: 0
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 1 judged, 1 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 45594ms | duration 45594ms exceeded warning budget 30000ms |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 45594ms | strategic_advisor: pass (4/4) | 0 | searchDocuments, searchMeetingsByTopic, semanticSearch | — |

## Judge notes

### strategic-rag-asrs-sprinkler-time-sink

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically strong and evidence-aware. It takes a clear position that the main time sink is coordination/model reconciliation and standards interpretation, not drafting. It connects meeting and email evidence to a business implication (rework risk and iterative design cycles), and it explicitly flags what is not directly confirmed. The main weakness is that it leans slightly on inference rather than a single decisive source that names the bottleneck, but it handles that honestly.
- Weaknesses: Some of the conclusion is inferential rather than directly stated in the sources.; Does not quantify relative time spent across coordination, calculations, and drafting.; Could be more operational by naming who should own the next step and by when.; The final answer is strong, but it does not fully separate confirmed evidence from interpretation in a concise way.; It references several sources, but the strongest direct proof of 'most time-consuming' is still missing.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `searchDocuments` | 1 |
| `searchMeetingsByTopic` | 1 |
| `semanticSearch` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
- `searchEmails`
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
