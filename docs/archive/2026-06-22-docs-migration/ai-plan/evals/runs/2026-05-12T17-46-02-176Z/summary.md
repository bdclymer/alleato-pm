# AI Assistant Eval Suite — 2026-05-12T17-46-02-176Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 92
- Passed: 42
- Failed: 50

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ❌ | 9453ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did; mustInclude missing: "Westfield"; answer length 0 < min 200 |
| project-briefing-vermillion | project_briefing | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot] to fire — none did |
| portfolio-overview | portfolio_briefing | ✅ | 65439ms | intentPlanner, streamingToolPolicy, getCrossProjectComparison, getPortfolioOverview, getFinancialAnalysis, getPortfolioOverview, getActionItemsAndInsights, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getProjectRiskAnalysis, getProjectRiskAnalysis, getProjectRiskAnalysis, getPortfolioOverview, getCrossProjectComparison, getMeetingIntelligence, getFinancialAnalysis, getActionItemsAndInsights | — |
| risk-review-single-project | risk_review | ✅ | 66372ms | intentPlanner, assistantWidgetPlanner, clientProjectIntelligencePacket, streamingToolPolicy, searchEmails, searchEmails, getProjectRiskAnalysis, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getActionItemsAndInsights, searchMeetingsByTopic | — |
| financial-budget-summary | financial_analysis | ✅ | 51565ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getProjectBudgetSummary, getForecastComparison, getForecastComparison, getProjectBudgetSummary, getMarginAnalysis | — |
| financial-commitments | financial_analysis | ✅ | 42403ms | intentPlanner, assistantSourceHealth, clientProjectIntelligencePacket, streamingToolPolicy, getCommitmentsOverview | — |
| financial-change-orders | financial_analysis | ✅ | 53456ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getChangeOrderDetails, queryChangeOrders, getProjectBriefingSnapshot, semanticSearch | — |
| financial-direct-costs | financial_analysis | ✅ | 35862ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getDirectCostsSummary, semanticSearch | — |
| financial-margin | financial_analysis | ❌ | 21763ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, noToolRetry | expected at least one of [getMarginAnalysis, getFinancialAnalysis] to fire — none did |
| financial-forecast | financial_analysis | ❌ | 281ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getForecastComparison, getCostTrends] to fire — none did; mustInclude missing: "forecast"; answer length 0 < min 120 |
| schedule-analysis | operations_analysis | ✅ | 59533ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, queryScheduleTasks, getScheduleAnalysis, getActionItemsAndInsights, semanticSearch | — |
| rfis-open | operations_analysis | ✅ | 29888ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getRFIStatus, semanticSearch | — |
| submittals-status | operations_analysis | ✅ | 26449ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getSubmittalLog, getSubmittalStatus, semanticSearch | — |
| people-roles | people_or_capacity | ✅ | 22439ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getPeopleAndRoles | — |
| vendor-performance | people_or_capacity | ❌ | 15950ms | intentPlanner, streamingToolPolicy, noToolRetry | expected at least one of [getVendorPerformance] to fire — none did |
| source-lookup-meetings | source_lookup | ✅ | 21734ms | intentPlanner, semanticSearch, sourceLookupIntentRouter, streamingToolPolicy | — |
| source-lookup-email | source_lookup | ✅ | 18513ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, streamingToolPolicy, noToolRetry | — |
| source-lookup-teams | source_lookup | ❌ | 25309ms | (none) | assistant message was not persisted to chat_history; expected at least one of [searchTeamsMessages, semanticSearch] to fire — none did |
| meetings-by-date | meeting_query | ❌ | 7532ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [getMeetingsByDate] to fire — none did |
| recent-emails-synthesis | source_lookup | ✅ | 24578ms | intentPlanner, semanticSearch, sourceLookupIntentRouter, streamingToolPolicy, getRecentEmails | — |
| recent-meetings-portfolio | meeting_query | ❌ | 36884ms | intentPlanner, streamingToolPolicy, getMeetingIntelligence | expected at least one of [getMeetingsByDate, searchMeetingsByTopic] to fire — none did |
| documents-search | document_question | ❌ | 64637ms | (none) | assistant message was not persisted to chat_history; expected at least one of [searchDocuments, searchExternalDocuments, queryDocumentRows] to fire — none did |
| action-items | operations_analysis | ❌ | 90001ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getMeetingIntelligence, getActionItemsAndInsights, searchMeetingsByTopic | stream error: stream read error: This operation was aborted |
| cross-project-comparison | portfolio_briefing | ❌ | 72920ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getCrossProjectComparison, getPortfolioOverview] to fire — none did |
| historical-trends | financial_analysis | ✅ | 51311ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getCostTrends, getCostTrends | — |
| company-knowledge | knowledge_capture | ❌ | 33434ms | intentPlanner, streamingToolPolicy, noToolRetry | expected at least one of [getCompanyKnowledge, semanticSearch] to fire — none did |
| memory-recall | general_conversation | ✅ | 27221ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, streamingToolPolicy, recallPastConversations, searchMemories, searchMemories, searchMemories | — |
| app-help | app_help | ✅ | 24218ms | intentPlanner, streamingToolPolicy, searchAppHelp | — |
| accounting-ap-aging | financial_analysis | ✅ | 34398ms | intentPlanner, streamingToolPolicy, getAPAgingReport | — |
| accounting-cash-position | financial_analysis | ✅ | 52421ms | intentPlanner, assistantSourceHealth, streamingToolPolicy, getCashPositionReport, getCashPositionReport, getARAgingReport, getAPAgingReport, getCashPositionReport, getARAgingReport, getAPAgingReport, getRecentInvoices, getRecentBills | — |
| thought-partner-bid | brainstorming | ✅ | 31886ms | intentPlanner, streamingToolPolicy, noToolRetry | — |
| what-changed | project_briefing | ❌ | 62935ms | (none) | assistant message was not persisted to chat_history; expected at least one of [semanticSearch, recallPastConversations] to fire — none did |
| owner-strategy-ulta-action-plan | project_briefing | ❌ | 14198ms | intentPlanner, getProjectBriefingSnapshot, ownerSnapshotWidget | mustInclude missing: "Ulta"; mustInclude missing: "blocked"; mustIncludeAny missing one of: "AC1", "solar"; mustIncludeAny missing one of: "sprinkler", "duct"; mustIncludeAny missing one of: "today", "personally", "next action"; answer length 39 < min 500; response_quality.sourceQuality low < medium |
| action-task-preview-no-write | action_preview | ❌ | 14187ms | intentPlanner, streamingToolPolicy | expected required tool 'createTask' to fire; mustInclude missing: "9 AM"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false" |
| task-register-source-grounded | task_management | ❌ | 7829ms | intentPlanner, getMyTasks | response_quality.score 62 < 65 |
| source-freshness-rag-health | source_health | ✅ | 30538ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, streamingToolPolicy | — |
| ceo-task-list-plain | task_management | ✅ | 8266ms | intentPlanner, getMyTasks | — |
| ceo-task-list-plate | task_management | ✅ | 9009ms | intentPlanner, getMyTasks | — |
| ceo-task-list-todo | task_management | ✅ | 10063ms | intentPlanner, getMyTasks | — |
| ceo-task-list-owe | task_management | ❌ | 5714ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "task", "action item", "follow", "open", "owe"; answer length 0 < min 120 |
| ceo-task-list-pending | task_management | ✅ | 30058ms | intentPlanner, getMyTasks | — |
| ceo-task-list-overdue | task_management | ❌ | 6768ms | intentPlanner, getMyTasks | mustIncludeAny missing one of: "overdue", "behind", "late", "past due" |
| ceo-task-list-handle | task_management | ✅ | 7430ms | intentPlanner, getMyTasks | — |
| ceo-task-list-project-scoped | task_management | ✅ | 38650ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getRFIStatus, getSubmittalStatus, queryChangeOrders, queryChangeOrders, getProjectBriefingSnapshot, getActionItemsAndInsights | — |
| ceo-task-create-direct | action_preview | ❌ | 13450ms | intentPlanner, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-remind | action_preview | ❌ | 13762ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-note-to-self | action_preview | ❌ | 15154ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-throw-on-list | action_preview | ❌ | 13051ms | intentPlanner, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-flag-for-followup | action_preview | ❌ | 23506ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-assign-pm | action_preview | ❌ | 13621ms | intentPlanner, assistantWidgetPlanner, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-action-item | action_preview | ❌ | 23609ms | intentPlanner, streamingToolPolicy, writeMemory | expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm" |
| ceo-task-create-schedule-activity | action_preview | ❌ | 14648ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | expected required tool 'createTask' to fire |
| ceo-task-modify-mark-done | action_preview | ❌ | 12852ms | intentPlanner, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-close | action_preview | ❌ | 20676ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getActionItemsAndInsights | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-reschedule | action_preview | ❌ | 14103ms | intentPlanner, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-reassign | action_preview | ❌ | 11593ms | intentPlanner, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-bump-priority | action_preview | ❌ | 18306ms | intentPlanner, streamingToolPolicy, searchMemories | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-cancel | action_preview | ❌ | 15351ms | intentPlanner, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask, deleteGeneratedTask] to fire — none did |
| ceo-money-bleeding | financial_analysis | ✅ | 53031ms | intentPlanner, streamingToolPolicy, getCashPositionReport, getFinancialAnalysis, getFinancialAnalysis, getFinancialAnalysis, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getAPAgingReport, getPortfolioOverview, getPortfolioOverview, getAPAgingReport, getCashPositionReport, getAPAgingReport, getAcumaticaProjectList, getCashPositionReport, getARAgingReport, getARAgingReport, getAcumaticaProjectList, getCashPositionReport, getFinancialAnalysis, getAPAgingReport, getARAgingReport, getChangeOrderDetails, getChangeOrderDetails, getChangeOrderDetails, getChangeOrderDetails, getChangeOrderDetails | — |
| ceo-money-margin-leak | financial_analysis | ✅ | 60235ms | intentPlanner, streamingToolPolicy, getFinancialAnalysis, getProjectsWithRisks, getProjectsWithRisks, getPortfolioOverview, getProjectRiskAnalysis, getProjectRiskAnalysis, getProjectRiskAnalysis, getMarginAnalysis, getMarginAnalysis, getAcumaticaProjectList, getMarginAnalysis, getFinancialAnalysis | — |
| ceo-money-unbilled-changes | financial_analysis | ✅ | 57847ms | intentPlanner, streamingToolPolicy, getChangeOrderDetails, getRecentInvoices, getAcumaticaProjectList, queryChangeOrders, queryChangeOrders, queryChangeOrders, queryChangeOrders, queryChangeOrders, getProjectBriefingSnapshot, queryChangeOrders, getRecentInvoices, getRecentInvoices, getAcumaticaProjectList, getChangeOrderDetails, getChangeOrderDetails, getChangeOrderDetails | — |
| ceo-money-cash-quick | financial_analysis | ✅ | 55797ms | intentPlanner, streamingToolPolicy, getCashPositionReport, getCashPositionReport, getAPAgingReport, getARAgingReport, getCashPositionReport, getARAgingReport, getRecentInvoices, getAPAgingReport, getRecentBills | — |
| ceo-decisions-what-to-do-today | project_briefing | ✅ | 87344ms | intentPlanner, streamingToolPolicy, getProjectBriefingSnapshot, getCrossProjectComparison, getCashPositionReport, getAPAgingReport, getARAgingReport, getFinancialAnalysis, getActionItemsAndInsights, getActionItemsAndInsights, getPortfolioOverview, getPortfolioOverview, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getActionItemsAndInsights, searchEmails, searchTeamsMessages, searchMeetingsByTopic | — |
| ceo-decisions-fires-today | project_briefing | ✅ | 52484ms | intentPlanner, streamingToolPolicy, getCrossProjectComparison, getActionItemsAndInsights, getARAgingReport, getProjectBriefingSnapshot, getAPAgingReport, getCashPositionReport, getPortfolioOverview, getProjectsWithRisks, getProjectsWithRisks, getPortfolioOverview, getProjectsWithRisks, getFinancialAnalysis, getProjectRiskAnalysis, getProjectRiskAnalysis, searchEmails, getSubmittalStatus, getProjectRiskAnalysis, getProjectBudgetSummary, getRFIStatus, getMeetingIntelligence, getFinancialAnalysis, getChangeOrderDetails, getActionItemsAndInsights, searchTeamsMessages | — |
| ceo-decisions-should-i-bid | brainstorming | ✅ | 50925ms | intentPlanner, featureRequestPacketRouter, assistantWidgetPlanner, streamingToolPolicy, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCrossProjectComparison, getProjectsWithRisks, getPortfolioOverview, searchConstructionMarket, researchCompany | — |
| ceo-decisions-pm-accountability | people_or_capacity | ❌ | 58100ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getPeopleAndRoles] to fire — none did |
| ceo-draft-email-owner-update | action_preview | ✅ | 23389ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | — |
| ceo-draft-email-sub-warning | action_preview | ✅ | 15221ms | intentPlanner, streamingToolPolicy | — |
| ceo-meetings-what-happened | meeting_query | ❌ | 40121ms | intentPlanner, streamingToolPolicy, getMeetingIntelligence | expected at least one of [getMeetingsByDate, searchMeetingsByTopic, getActionItemsAndInsights] to fire — none did |
| ceo-meetings-promised-to-do | meeting_query | ❌ | 9894ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [getMeetingsByDate, getActionItemsAndInsights] to fire — none did |
| ceo-meetings-prep-next | meeting_query | ❌ | 89382ms | (none) | assistant message was not persisted to chat_history; expected at least one of [searchMeetingsByTopic, getMeetingsByDate, getProjectBriefingSnapshot, getActionItemsAndInsights] to fire — none did |
| ceo-portfolio-status-summary | portfolio_briefing | ✅ | 54045ms | intentPlanner, streamingToolPolicy, getCrossProjectComparison, getProjectsWithRisks, getFinancialAnalysis, getPortfolioOverview, getPortfolioOverview, getActionItemsAndInsights, getProjectsWithRisks, getProjectsWithRisks, findProject, getProjectBriefingSnapshot, getCrossProjectComparison, getFinancialAnalysis, getAcumaticaProjectList | — |
| ceo-portfolio-watchlist | portfolio_briefing | ❌ | 86726ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getProjectsWithRisks] to fire — none did |
| ceo-context-aware-blocked | operations_analysis | ✅ | 33339ms | intentPlanner, streamingToolPolicy, getActionItemsAndInsights | — |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 49377ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getRFIStatus] to fire — none did |
| ceo-task-list-tomorrow | task_management | ✅ | 25981ms | intentPlanner, getMyTasks | — |
| ceo-task-create-conversational-no-context | action_preview | ❌ | 17325ms | intentPlanner, streamingToolPolicy | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-batch | action_preview | ❌ | 3ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "Vermillion", "COI", "insurance", "Acme", "bank", "loan"; answer length 0 < min 250 |
| ceo-task-modify-snooze | action_preview | ❌ | 42591ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getActionItemsAndInsights | expected at least one of [getMyTasks, updateGeneratedTask, deleteGeneratedTask] to fire — none did |
| tasks-list-of-action-items-canonical | task_management | ❌ | 35133ms | intentPlanner, streamingToolPolicy, getActionItemsAndInsights | expected required tool 'getMyTasks' to fire |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 8732ms | intentPlanner, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 51804ms | intentPlanner, streamingToolPolicy, getScheduleAnalysis, getRFIStatus, getSubmittalStatus, getProjectBriefingSnapshot, getProjectsWithRisks, getFinancialAnalysis, getProjectsWithRisks, getProjectsWithRisks, getActionItemsAndInsights, getActionItemsAndInsights, getPortfolioOverview, getCashPositionReport, getARAgingReport, getAPAgingReport, getCrossProjectComparison, getPortfolioOverview, getProjectBriefingSnapshot, getMeetingIntelligence, getActionItemsAndInsights | — |
| tasks-whats-on-my-list | task_management | ❌ | 34081ms | intentPlanner, streamingToolPolicy, getActionItemsAndInsights | expected required tool 'getMyTasks' to fire |
| portfolio-morning-standup | portfolio_briefing | ✅ | 68948ms | intentPlanner, streamingToolPolicy, getProjectBriefingSnapshot, getCrossProjectComparison, getPortfolioOverview, getAPAgingReport, getCashPositionReport, getARAgingReport, getPortfolioOverview, getFinancialAnalysis, getFinancialAnalysis, getActionItemsAndInsights, getPortfolioOverview, getPortfolioOverview, getPortfolioOverview, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getProjectRiskAnalysis, getProjectRiskAnalysis, getCrossProjectComparison, getProjectRiskAnalysis, getMeetingIntelligence, getPortfolioOverview, getFinancialAnalysis, getActionItemsAndInsights | — |
| portfolio-red-flags-now | portfolio_briefing | ✅ | 73675ms | intentPlanner, streamingToolPolicy, getRFIStatus, getSubmittalStatus, getHistoricalTrends, getScheduleAnalysis, getCrossProjectComparison, getCashPositionReport, getARAgingReport, getAPAgingReport, getActionItemsAndInsights, getFinancialAnalysis, getActionItemsAndInsights, getProjectsWithRisks, getProjectsWithRisks, getPortfolioOverview, getPortfolioOverview, getProjectsWithRisks, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getCrossProjectComparison, getProjectBriefingSnapshot, getMeetingIntelligence, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getActionItemsAndInsights, getFinancialAnalysis | — |
| catch-me-up-everything | portfolio_briefing | ❌ | 90004ms | intentPlanner, streamingToolPolicy, getCompanyKnowledge, getScheduleAnalysis, getCrossProjectComparison, getRFIStatus, getSubmittalStatus, getHistoricalTrends, getFinancialAnalysis, getPortfolioOverview, getPortfolioOverview, searchConstructionMarket, getCashPositionReport, getAPAgingReport, getARAgingReport, getFinancialAnalysis, getCashPositionReport, getPortfolioOverview, getPortfolioOverview, getPortfolioOverview, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getActionItemsAndInsights, getProjectsWithRisks, getARAgingReport, getAPAgingReport, getProjectRiskAnalysis, searchEmails, searchTeamsMessages, findProject, getMeetingIntelligence, getFinancialAnalysis, getActionItemsAndInsights, getProjectRiskAnalysis, getProjectRiskAnalysis | stream error: stream read error: This operation was aborted |
| financial-are-we-profitable | financial_analysis | ❌ | 90001ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getMarginAnalysis, getProjectBudgetSummary, getFinancialAnalysis] to fire — none did; mustIncludeAny missing one of: "margin", "profit", "loss", "revenue", "cost", "budget"; answer length 0 < min 100 |
| vendor-subs-behind-portfolio | people_or_capacity | ❌ | 80815ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getVendorPerformance, getScheduleAnalysis] to fire — none did |
| schedule-anything-slipping-portfolio | operations_analysis | ❌ | 68521ms | intentPlanner, streamingToolPolicy, getCrossProjectComparison, getHistoricalTrends, getCrossProjectComparison, getProjectsWithRisks, getProjectsWithRisks, queryScheduleTasks, queryScheduleTasks, queryScheduleTasks, queryScheduleTasks, queryScheduleTasks, queryScheduleTasks, getPortfolioOverview | mustExclude present: "I cannot" |
| i-was-out-what-did-i-miss | source_lookup | ❌ | 57866ms | intentPlanner, streamingToolPolicy, getMeetingIntelligence | expected at least one of [getMeetingsByDate, searchEmails, searchTeamsMessages] to fire — none did |
| decisions-what-needs-my-signoff | operations_analysis | ❌ | 2898ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"dde88402-7242-4041-820e-26392309a350","timestamp":"2026-05-12T18:45:45.401Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getRFIStatus, getSubmittalStatus] to fire — none did; mustIncludeAny missing one of: "approval", "decision", "sign", "waiting", "open", "pending" |
| owner-prep-call-westfield | project_briefing | ❌ | 3015ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"1c342417-eac8-4a67-ac94-fb28b95d8a19","timestamp":"2026-05-12T18:46:03.928Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "schedule", "budget", "status", "progress", "tell", "update", "talking point" |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 75 |
| `streamingToolPolicy` | 63 |
| `getProjectsWithRisks` | 33 |
| `getPortfolioOverview` | 29 |
| `getActionItemsAndInsights` | 27 |
| `getFinancialAnalysis` | 22 |
| `clientProjectIntelligencePacket` | 20 |
| `getProjectBriefingSnapshot` | 20 |
| `getCashPositionReport` | 17 |
| `getProjectRiskAnalysis` | 16 |
| `getAPAgingReport` | 16 |
| `getCrossProjectComparison` | 15 |
| `getARAgingReport` | 14 |
| `getChangeOrderDetails` | 11 |
| `getMeetingIntelligence` | 10 |
| `semanticSearch` | 10 |
| `queryChangeOrders` | 9 |
| `getMyTasks` | 9 |
| `getCompanyKnowledge` | 8 |
| `queryScheduleTasks` | 7 |
| `getRFIStatus` | 6 |
| `getSubmittalStatus` | 6 |
| `getAcumaticaProjectList` | 6 |
| `searchEmails` | 5 |
| `assistantSourceHealth` | 5 |
| `noToolRetry` | 5 |
| `sourceLookupIntentRouter` | 5 |
| `getRecentInvoices` | 5 |
| `getMarginAnalysis` | 4 |
| `getScheduleAnalysis` | 4 |
| `searchMemories` | 4 |
| `assistantWidgetPlanner` | 3 |
| `searchMeetingsByTopic` | 3 |
| `getProjectBudgetSummary` | 3 |
| `searchTeamsMessages` | 3 |
| `getHistoricalTrends` | 3 |
| `getForecastComparison` | 2 |
| `sourceSpecificRagRetrieval` | 2 |
| `assistantComponentRegistry` | 2 |
| `getCostTrends` | 2 |
| `getRecentBills` | 2 |
| `searchConstructionMarket` | 2 |
| `findProject` | 2 |
| `getCommitmentsOverview` | 1 |
| `getDirectCostsSummary` | 1 |
| `getSubmittalLog` | 1 |
| `getPeopleAndRoles` | 1 |
| `getRecentEmails` | 1 |
| `recallPastConversations` | 1 |
| `searchAppHelp` | 1 |
| `ownerSnapshotWidget` | 1 |
| `writeMemory` | 1 |
| `featureRequestPacketRouter` | 1 |
| `researchCompany` | 1 |

## Tools defined but never fired in this run

- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createGeneratedTask`
- `createInitiativeCard`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `getAcumaticaProjectBudget`
- `getBudgetLineItems`
- `getGeneratedTasksToday`
- `getMeetingDetails`
- `getMeetingsByDate`
- `getProjectDetails`
- `getVendorPerformance`
- `getVendorSpendReport`
- `queryBudgetData`
- `queryCommitments`
- `queryDirectCosts`
- `queryDocumentRows`
- `saveInsight`
- `saveToKnowledgeBase`
- `searchDocuments`
- `searchExternalDocuments`
- `searchStructuredFinancialRows`
- `searchWeb`
- `updateGeneratedTask`
