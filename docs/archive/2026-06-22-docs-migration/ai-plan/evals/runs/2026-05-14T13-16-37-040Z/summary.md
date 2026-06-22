# AI Assistant Eval Suite — 2026-05-14T13-16-37-040Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 5
- Passed: 0
- Failed: 5

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 38030ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getRecentEmails, getRecentOutlookEmails] to fire — none did; expected required tool 'getRecentEmails' to fire |
| realworld-urgent-inbox | source_lookup | ❌ | 25526ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-important-emails-this-morning | source_lookup | ❌ | 41395ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getRecentEmails, getRecentOutlookEmails] to fire — none did; expected required tool 'getRecentEmails' to fire |
| realworld-outlook-arrived-today | source_lookup | ❌ | 23848ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |
| realworld-email-reply-triage | source_lookup | ❌ | 15106ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy, getRecentOutlookEmails | expected required tool 'getRecentEmails' to fire |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 5 |
| `streamingToolPolicy` | 5 |
| `emailActionIntentRouter` | 3 |
| `mcpToolDiscoverySkipped` | 3 |
| `getRecentOutlookEmails` | 3 |
| `semanticSearch` | 2 |
| `assistantSourceHealth` | 2 |
| `sourceLookupIntentRouter` | 2 |
| `mcpToolDiscovery` | 2 |

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
- `updateGeneratedTask`
- `writeMemory`
