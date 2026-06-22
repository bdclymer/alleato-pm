# AI Assistant Eval Suite — 2026-05-14T20-02-42-791Z-ee61dded

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Filter: `owner-strategy|action-task|task-register|source-freshness`
- Total: 5
- Passed: 0
- Failed: 5

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| owner-strategy-ulta-action-plan | project_briefing | ❌ | 67665ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch, searchMeetingsByTopic, searchEmails, searchTeamsMessages] to fire — none did; mustIncludeAny missing one of: "Ulta", "project", "snapshot"; mustIncludeAny missing one of: "risk", "blocked", "issue", "cost"; answer length 0 < min 500; required metadata missing: tool_trace; required metadata missing: response_quality; required metadata missing: provider_decision; response_quality.score missing; response_quality.sourceQuality (missing) < medium |
| action-task-preview-no-write | action_preview | ❌ | 57781ms | intentPlanner, taskSourceReview | expected required tool 'createTask' to fire |
| task-register-source-grounded | task_management | ❌ | 38479ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | expected required tool 'getMyTasks' to fire; mustInclude missing: "Sources Checked" |
| source-freshness-rag-health | source_health | ❌ | 45889ms | getMeetingsByDate | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustInclude missing: "Outlook"; mustInclude missing: "meeting"; mustInclude missing: "packet"; mustIncludeAny missing one of: "stale", "fresh", "up to date", "unembedded", "uncompiled", "source health"; answer length 0 < min 250; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |
| realworld-teams-source-freshness | source_health | ❌ | 2ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustIncludeAny missing one of: "stale", "fresh", "current", "sync", "source health", "unembedded"; answer length 0 < min 160; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 2 |
| `taskSourceReview` | 1 |
| `promptContextReducer` | 1 |
| `mcpToolDiscovery` | 1 |
| `streamingToolPolicy` | 1 |
| `getActionItemsAndInsights` | 1 |
| `getMeetingsByDate` | 1 |

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
- `semanticSearch`
- `updateGeneratedTask`
- `writeMemory`
