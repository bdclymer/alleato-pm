# AI Assistant Eval Suite — 2026-05-14T20-09-14-930Z-647685f4

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Filter: `owner-strategy|action-task|task-register|source-freshness`
- Total: 5
- Passed: 0
- Failed: 5

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| owner-strategy-ulta-action-plan | project_briefing | ❌ | 47671ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, queryCommitments, getProjectBudgetSummary, getMarginAnalysis, queryChangeOrders | expected at least one of [getProjectBriefingSnapshot, semanticSearch, searchMeetingsByTopic, searchEmails, searchTeamsMessages] to fire — none did |
| action-task-preview-no-write | action_preview | ❌ | 15005ms | createTask | stream error: stream read error: terminated; assistant message was not persisted to chat_history; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustInclude missing: "AC1"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: provider_decision; required metadata missing: response_quality |
| task-register-source-grounded | task_management | ❌ | 2ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustInclude missing: "Sources Checked"; mustIncludeAny missing one of: "overdue", "due soon", "blocked", "task"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: response_quality; response_quality.score missing |
| source-freshness-rag-health | source_health | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustInclude missing: "Outlook"; mustInclude missing: "meeting"; mustInclude missing: "packet"; mustIncludeAny missing one of: "stale", "fresh", "up to date", "unembedded", "uncompiled", "source health"; answer length 0 < min 250; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |
| realworld-teams-source-freshness | source_health | ❌ | 2ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustIncludeAny missing one of: "stale", "fresh", "current", "sync", "source health", "unembedded"; answer length 0 < min 160; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 1 |
| `clientProjectIntelligencePacket` | 1 |
| `mcpToolDiscovery` | 1 |
| `streamingToolPolicy` | 1 |
| `queryCommitments` | 1 |
| `getProjectBudgetSummary` | 1 |
| `getMarginAnalysis` | 1 |
| `queryChangeOrders` | 1 |
| `createTask` | 1 |

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
- `getMeetingDetails`
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getPortfolioOverview`
- `getProjectBriefingSnapshot`
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
