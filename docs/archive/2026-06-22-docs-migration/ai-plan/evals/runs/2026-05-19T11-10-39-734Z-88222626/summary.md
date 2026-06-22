# AI Assistant Eval Suite — 2026-05-19T11-10-39-734Z-88222626

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
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 60177ms | duration 60177ms exceeded warning budget 30000ms |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 60177ms | strategic_advisor: pass (4/4) | 0 | searchMeetingsByTopic, searchDocuments, semanticSearch, findProjectDocuments | — |

## Judge notes

### strategic-rag-asrs-sprinkler-time-sink

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is honest and appropriately refuses to overstate evidence. It clearly says direct Exol Wilmer / 26-103 ASRS sprinkler evidence is missing, avoids using another project as proof, and keeps claims anchored to the project. The main limitation is that it does not provide a real strategic conclusion about the most time-consuming design step because the evidence gap prevents it.
- Weaknesses: Does not identify the most time-consuming part of ASRS sprinkler design, so it cannot fully satisfy the business question.; The response is more evidence-status report than executive strategic analysis.; Some cited items are useful only as negative evidence and do not advance the core decision.; Could have been more explicit about what would be needed to answer the question definitively from meetings/emails/messages.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `searchMeetingsByTopic` | 1 |
| `searchDocuments` | 1 |
| `semanticSearch` | 1 |
| `findProjectDocuments` | 1 |

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
