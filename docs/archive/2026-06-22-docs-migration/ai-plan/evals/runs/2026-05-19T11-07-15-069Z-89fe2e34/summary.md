# AI Assistant Eval Suite — 2026-05-19T11-07-15-069Z-89fe2e34

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 1
- Passed: 0
- Failed: 1
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 1 judged, 1 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ❌ | 45428ms | duration 45428ms exceeded warning budget 30000ms |

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ❌ | 45428ms | strategic_advisor: pass (4/4) | 0 | searchMeetingsByTopic, semanticSearch, searchDocuments | mustIncludeAny missing one of: "missing", "not direct", "no direct", "could not confirm", "evidence gap" |

## Judge notes

### strategic-rag-asrs-sprinkler-time-sink

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is appropriately cautious and does not fabricate a project-specific ASRS sprinkler bottleneck for Exol Wilmer. It clearly states the direct evidence is missing, distinguishes adjacent fire alarm material from the requested ASRS sprinkler scope, and avoids using another project as proof. The main weakness is that it does not provide a decisive business conclusion beyond the absence of evidence, but that is acceptable given the prompt constraints.
- Weaknesses: Does not identify the most time-consuming ASRS sprinkler design activity because the evidence base is missing, so the strategic value is limited.; Could have been sharper about the likely next investigative path or specific stakeholders to query, but the prompt mainly asked for evidence handling.; Some references to fire alarm scope are informative but do not materially answer the ASRS sprinkler question.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `searchMeetingsByTopic` | 1 |
| `semanticSearch` | 1 |
| `searchDocuments` | 1 |

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
