# AI Assistant Eval Suite — 2026-05-14T13-29-38-231Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 5
- Passed: 1
- Failed: 4

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 9372ms | intentPlanner, getRecentEmails | — |
| realworld-urgent-inbox | source_lookup | ❌ | 15485ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-important-emails-this-morning | source_lookup | ❌ | 4120ms | intentPlanner, getRecentEmails | mustExclude present: "retrieval bundle" |
| realworld-outlook-arrived-today | source_lookup | ❌ | 11440ms | intentPlanner, assistantSourceHealth, getRecentEmails | mustExclude present: "retrieval bundle"; mustExclude present: "semantic search" |
| realworld-email-reply-triage | source_lookup | ❌ | 13538ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 5 |
| `getRecentEmails` | 3 |
| `emailActionIntentRouter` | 2 |
| `mcpToolDiscoverySkipped` | 2 |
| `streamingToolPolicy` | 2 |
| `getRecentOutlookEmails` | 2 |
| `assistantSourceHealth` | 1 |

## Tools defined but never fired in this run

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
- `getProjectsWithRisks`
- `getRFIStatus`
- `getRecentBills`
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
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
