# AI Assistant Eval Suite — 2026-05-12T19-14-11-931Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 92
- Passed: 16
- Failed: 76

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ❌ | 90003ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did |
| project-briefing-vermillion | project_briefing | ❌ | 15180ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot] to fire — none did; mustInclude missing: "Vermillion"; answer length 0 < min 200 |
| portfolio-overview | portfolio_briefing | ❌ | 75272ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getProjectsWithRisks] to fire — none did |
| risk-review-single-project | risk_review | ❌ | 90004ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getProjectRiskAnalysis] to fire — none did |
| financial-budget-summary | financial_analysis | ✅ | 60667ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getForecastComparison, getProjectBudgetSummary, getBudgetLineItems, getForecastComparison, getProjectBudgetSummary, getMarginAnalysis | — |
| financial-commitments | financial_analysis | ✅ | 37140ms | intentPlanner, assistantSourceHealth, clientProjectIntelligencePacket, streamingToolPolicy, getCommitmentsOverview | — |
| financial-change-orders | financial_analysis | ❌ | 9957ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did; mustInclude missing: "change order"; answer length 0 < min 150 |
| financial-direct-costs | financial_analysis | ✅ | 66973ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, queryDirectCosts | — |
| financial-margin | financial_analysis | ✅ | 51415ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, getProjectBudgetSummary, getMarginAnalysis, getMarginAnalysis | — |
| financial-forecast | financial_analysis | ❌ | 10838ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [getForecastComparison, getCostTrends] to fire — none did; mustInclude missing: "forecast"; answer length 0 < min 120 |
| schedule-analysis | operations_analysis | ✅ | 49262ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy, queryScheduleTasks, getScheduleAnalysis, getActionItemsAndInsights | — |
| rfis-open | operations_analysis | ❌ | 13709ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getRFIStatus] to fire — none did; mustInclude missing: "RFI"; answer length 0 < min 100 |
| submittals-status | operations_analysis | ❌ | 11630ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getSubmittalStatus] to fire — none did; mustInclude missing: "submittal"; answer length 0 < min 100 |
| people-roles | people_or_capacity | ❌ | 11926ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getPeopleAndRoles] to fire — none did; answer length 0 < min 100 |
| vendor-performance | people_or_capacity | ❌ | 10836ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getVendorPerformance, semanticSearch, getPortfolioOverview] to fire — none did; mustIncludeAny missing one of: "vendor", "performance", "subcontractor", "sub", "no vendor data"; answer length 0 < min 150 |
| source-lookup-meetings | source_lookup | ✅ | 30803ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, streamingToolPolicy, noToolRetry | — |
| source-lookup-email | source_lookup | ✅ | 24536ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, streamingToolPolicy, noToolRetry | — |
| source-lookup-teams | source_lookup | ❌ | 25949ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [searchTeamsMessages, semanticSearch] to fire — none did; answer length 0 < min 80 |
| meetings-by-date | meeting_query | ✅ | 37729ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | — |
| recent-emails-synthesis | source_lookup | ❌ | 4618ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [semanticSearch, searchEmails] to fire — none did; mustInclude missing: "email"; answer length 0 < min 400 |
| recent-meetings-portfolio | meeting_query | ✅ | 40492ms | intentPlanner, streamingToolPolicy, getMeetingIntelligence | — |
| documents-search | document_question | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [searchDocuments, searchExternalDocuments, queryDocumentRows] to fire — none did; answer length 0 < min 120 |
| action-items | operations_analysis | ❌ | 57313ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights] to fire — none did |
| cross-project-comparison | portfolio_briefing | ✅ | 80357ms | intentPlanner, streamingToolPolicy, getAcumaticaProjectList, getAcumaticaProjectList, getPortfolioOverview, getProjectsWithRisks, getFinancialAnalysis, getRFIStatus, getSubmittalStatus, getRFIStatus, getSubmittalStatus, getSubmittalStatus, getRFIStatus, getProjectDetails, getScheduleAnalysis, getScheduleAnalysis, getScheduleAnalysis, getProjectDetails, getProjectDetails, getAcumaticaProjectList, getCrossProjectComparison, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getProjectBriefingSnapshot, getCostTrends, getCostTrends, getCostTrends, getProjectBudgetSummary, getProjectBudgetSummary, getProjectBudgetSummary | — |
| historical-trends | financial_analysis | ❌ | 66477ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [getHistoricalTrends, getCostTrends] to fire — none did; mustInclude missing: "trend"; answer length 0 < min 100 |
| company-knowledge | knowledge_capture | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; answer length 0 < min 50 |
| memory-recall | general_conversation | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [recallPastConversations, searchMemories] to fire — none did; answer length 0 < min 60 |
| app-help | app_help | ❌ | 26529ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [searchAppHelp] to fire — none did |
| accounting-ap-aging | financial_analysis | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getAPAgingReport] to fire — none did; answer length 0 < min 80 |
| accounting-cash-position | financial_analysis | ❌ | 2ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getCashPositionReport] to fire — none did; mustInclude missing: "cash"; answer length 0 < min 80 |
| thought-partner-bid | brainstorming | ❌ | 2792ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; mustInclude missing: "tradeoff"; answer length 0 < min 250 |
| what-changed | project_briefing | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [semanticSearch, recallPastConversations] to fire — none did; answer length 0 < min 120 |
| owner-strategy-ulta-action-plan | project_briefing | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch, searchMeetingsByTopic, searchEmails, searchTeamsMessages] to fire — none did; mustIncludeAny missing one of: "Ulta", "project", "snapshot"; mustIncludeAny missing one of: "risk", "blocked", "issue", "cost"; answer length 0 < min 500; required metadata missing: tool_trace; required metadata missing: response_quality; required metadata missing: provider_decision; response_quality.score missing; response_quality.sourceQuality (missing) < medium |
| action-task-preview-no-write | action_preview | ❌ | 2218ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'createTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustInclude missing: "AC1"; mustIncludeAny missing one of: "not created", "No task was created", "Reply confirm", "confirmed: false"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: provider_decision; required metadata missing: response_quality |
| task-register-source-grounded | task_management | ❌ | 2ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustInclude missing: "Sources Checked"; mustIncludeAny missing one of: "overdue", "due soon", "blocked", "task"; answer length 0 < min 180; required metadata missing: tool_trace; required metadata missing: response_quality; response_quality.score missing |
| source-freshness-rag-health | source_health | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'assistantSourceHealth' to fire; mustInclude missing: "Teams"; mustInclude missing: "Outlook"; mustInclude missing: "meeting"; mustInclude missing: "packet"; mustIncludeAny missing one of: "stale", "fresh", "up to date", "unembedded", "uncompiled", "source health"; answer length 0 < min 250; required metadata missing: source_health; required metadata missing: tool_trace; required metadata missing: response_quality |
| ceo-task-list-plain | task_management | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustIncludeAny missing one of: "task", "to-do", "open", "overdue", "due"; answer length 0 < min 120 |
| ceo-task-list-plate | task_management | ❌ | 4ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustIncludeAny missing one of: "task", "to-do", "open", "this week", "due"; answer length 0 < min 120 |
| ceo-task-list-todo | task_management | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustIncludeAny missing one of: "task", "to-do", "todo", "open", "due"; answer length 0 < min 100 |
| ceo-task-list-owe | task_management | ❌ | 1ms | (none) | stream error: fetch failed; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "task", "action item", "follow", "open", "owe"; answer length 0 < min 120 |
| ceo-task-list-pending | task_management | ✅ | 26928ms | intentPlanner, getMyTasks | — |
| ceo-task-list-overdue | task_management | ✅ | 32261ms | intentPlanner, getMyTasks | — |
| ceo-task-list-handle | task_management | ✅ | 50905ms | intentPlanner, getMyTasks | — |
| ceo-task-list-project-scoped | task_management | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, queryScheduleTasks, getRFIStatus, getSubmittalStatus] to fire — none did; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "open", "outstanding", "pending", "task", "action"; answer length 0 < min 150 |
| ceo-task-create-direct | action_preview | ❌ | 43928ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, createGeneratedTask | mustIncludeAny missing one of: "AC1", "Ulta", "owner", "Friday"; answer length 69 < min 160 |
| ceo-task-create-remind | action_preview | ❌ | 76115ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "Jesse", "Vermillion", "change order", "Monday"; answer length 0 < min 160; required metadata missing: tool_trace |
| ceo-task-create-note-to-self | action_preview | ❌ | 83826ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, createGeneratedTask | answer length 98 < min 160 |
| ceo-task-create-throw-on-list | action_preview | ❌ | 53040ms | intentPlanner, getMyTasks | expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "Acme", "submittal", "Thursday", "EOD" |
| ceo-task-create-flag-for-followup | action_preview | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "inspector", "permit", "Vermillion", "follow"; answer length 0 < min 160 |
| ceo-task-create-assign-pm | action_preview | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "AC1", "solar", "Ulta", "Wednesday", "PM"; answer length 0 < min 180 |
| ceo-task-create-action-item | action_preview | ❌ | 90003ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, createGeneratedTask | stream error: stream read error: This operation was aborted; mustIncludeAny missing one of: "Jesse", "GMP", "owner", "Friday"; answer length 67 < min 160 |
| ceo-task-create-schedule-activity | action_preview | ❌ | 52434ms | (none) | assistant message was not persisted to chat_history; expected required tool 'createTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "mobilization", "June", "Gantt", "schedule"; answer length 0 < min 160 |
| ceo-task-modify-mark-done | action_preview | ❌ | 15218ms | (none) | assistant message was not persisted to chat_history; expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did; mustIncludeAny missing one of: "AC1", "preview", "confirm", "complete", "done"; answer length 0 < min 120 |
| ceo-task-modify-close | action_preview | ❌ | 89950ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, getActionItemsAndInsights | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-reschedule | action_preview | ✅ | 35043ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, updateGeneratedTask | — |
| ceo-task-modify-reassign | action_preview | ✅ | 47817ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, updateGeneratedTask | — |
| ceo-task-modify-bump-priority | action_preview | ❌ | 67758ms | intentPlanner, taskWriteIntentRouter, streamingToolPolicy, createGeneratedTask | expected at least one of [getMyTasks, updateGeneratedTask] to fire — none did |
| ceo-task-modify-cancel | action_preview | ❌ | 61194ms | intentPlanner, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask, deleteGeneratedTask] to fire — none did |
| ceo-money-bleeding | financial_analysis | ❌ | 16512ms | (none) | stream error: stream read error: terminated; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getCashPositionReport, getAPAgingReport, getProjectsWithRisks] to fire — none did; mustIncludeAny missing one of: "cash", "exposure", "margin", "burn", "AP", "risk"; answer length 0 < min 200 |
| ceo-money-margin-leak | financial_analysis | ❌ | 90005ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getMarginAnalysis, getCrossProjectComparison] to fire — none did; mustIncludeAny missing one of: "margin", "project", "eroded", "shrinking", "below", "underperform"; answer length 0 < min 200 |
| ceo-money-unbilled-changes | financial_analysis | ❌ | 90003ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did; mustInclude missing: "change order"; mustIncludeAny missing one of: "unbilled", "approved", "outstanding", "not invoiced", "billing"; answer length 0 < min 150 |
| ceo-money-cash-quick | financial_analysis | ❌ | 70817ms | intentPlanner, streamingToolPolicy, noToolRetry | expected required tool 'getCashPositionReport' to fire; answer length 51 < min 80 |
| ceo-decisions-what-to-do-today | project_briefing | ❌ | 90003ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getProjectsWithRisks, getMyTasks, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "focus", "priority", "today", "most important", "top"; answer length 0 < min 250 |
| ceo-decisions-fires-today | project_briefing | ❌ | 90003ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getProjectsWithRisks, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "urgent", "critical", "fire", "today", "risk", "blocked"; answer length 0 < min 200 |
| ceo-decisions-should-i-bid | brainstorming | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; mustIncludeAny missing one of: "tradeoff", "consider", "depends", "risk", "fit", "capacity"; answer length 0 < min 300 |
| ceo-decisions-pm-accountability | people_or_capacity | ❌ | 90002ms | (none) | stream error: stream read error: This operation was aborted; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getPeopleAndRoles] to fire — none did |
| ceo-draft-email-owner-update | action_preview | ✅ | 59878ms | intentPlanner, clientProjectIntelligencePacket, streamingToolPolicy | — |
| ceo-draft-email-sub-warning | action_preview | ❌ | 24301ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"75176e5d-7fbc-424a-97f0-45538e0a0961","timestamp":"2026-05-12T20:14:17.926Z"}; HTTP 401; assistant message was not persisted to chat_history; mustIncludeAny missing one of: "Acme", "submittal", "draft", "subject" |
| ceo-meetings-what-happened | meeting_query | ❌ | 8997ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"3ad1e0cc-c66e-4e08-962b-628320b6fb42","timestamp":"2026-05-12T20:14:41.985Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMeetingsByDate, searchMeetingsByTopic, getActionItemsAndInsights, getMeetingIntelligence] to fire — none did; mustIncludeAny missing one of: "OAC", "meeting", "decision", "action", "yesterday" |
| ceo-meetings-promised-to-do | meeting_query | ❌ | 4241ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"91b2caec-e4d5-4877-8b4b-eaec5f24cf3b","timestamp":"2026-05-12T20:15:01.836Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMeetingsByDate, getActionItemsAndInsights, getMeetingIntelligence, searchMeetingsByTopic] to fire — none did; mustIncludeAny missing one of: "promise", "committed", "action", "owe", "meeting" |
| ceo-meetings-prep-next | meeting_query | ❌ | 4285ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"f21648f0-df27-4923-8d47-a7b13124bc31","timestamp":"2026-05-12T20:15:21.487Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [searchMeetingsByTopic, getMeetingsByDate, getProjectBriefingSnapshot, getActionItemsAndInsights] to fire — none did; mustIncludeAny missing one of: "Ulta", "open", "follow", "prep", "agenda", "action"; answer length 210 < min 250 |
| ceo-portfolio-status-summary | portfolio_briefing | ❌ | 9076ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"d3ea25eb-ce14-4fba-8f1e-9a6750140de9","timestamp":"2026-05-12T20:15:46.080Z"}; HTTP 401; assistant message was not persisted to chat_history; expected required tool 'getPortfolioOverview' to fire; mustIncludeAny missing one of: "project", "active", "status", "summary" |
| ceo-portfolio-watchlist | portfolio_briefing | ❌ | 2474ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"52192a50-45e6-4cc1-a7c8-7b35f61428f7","timestamp":"2026-05-12T20:16:04.292Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getProjectsWithRisks] to fire — none did; mustIncludeAny missing one of: "risk", "watch", "concern", "exposed", "trouble" |
| ceo-context-aware-blocked | operations_analysis | ❌ | 4191ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"78a7b7ea-3221-4fd4-8bb9-50849a43a25c","timestamp":"2026-05-12T20:16:24.147Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getRFIStatus, getSubmittalStatus] to fire — none did; mustIncludeAny missing one of: "blocked", "waiting", "approval", "you", "open" |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 2208ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"318d8944-7716-4aa8-9dc0-665dd14372f0","timestamp":"2026-05-12T20:16:41.746Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getRFIStatus] to fire — none did; mustIncludeAny missing one of: "decision", "approval", "pending", "waiting", "open" |
| ceo-task-list-tomorrow | task_management | ❌ | 3316ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"99ea0b09-1252-4e1e-be39-160be3434f7c","timestamp":"2026-05-12T20:17:00.450Z"}; HTTP 401; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire; mustIncludeAny missing one of: "tomorrow", "due", "task" |
| ceo-task-create-conversational-no-context | action_preview | ❌ | 804ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"034dadab-fd6f-46d9-af48-d20c194f2b66","timestamp":"2026-05-12T20:17:16.667Z"}; HTTP 401; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "Mark", "bonding", "Thursday", "call" |
| ceo-task-create-batch | action_preview | ❌ | 427ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"e0b51760-8a36-4937-9ec0-cdfe8b6c02ca","timestamp":"2026-05-12T20:17:32.614Z"}; HTTP 401; assistant message was not persisted to chat_history; expected required tool 'createGeneratedTask' to fire; mustInclude missing: "Preview"; mustInclude missing: "confirm"; mustIncludeAny missing one of: "Vermillion", "COI", "insurance", "Acme", "bank", "loan"; answer length 210 < min 250 |
| ceo-task-modify-snooze | action_preview | ❌ | 632ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"14c44a7d-6070-44e3-9463-b93f2ac9f6fc","timestamp":"2026-05-12T20:17:48.565Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, updateGeneratedTask, deleteGeneratedTask] to fire — none did; mustIncludeAny missing one of: "COI", "Vermillion", "complete", "close", "preview", "confirm" |
| tasks-list-of-action-items-canonical | task_management | ❌ | 568ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"bd885ee7-55e8-42cd-badb-e6b002cd0389","timestamp":"2026-05-12T20:18:04.540Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did |
| tasks-what-do-i-need-to-do-today | task_management | ❌ | 267ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"c3f08bc7-b73b-4f6b-b9e0-7f04b451ce46","timestamp":"2026-05-12T20:18:20.119Z"}; HTTP 401; assistant message was not persisted to chat_history; expected required tool 'getMyTasks' to fire |
| tasks-open-loops-all | task_management | ❌ | 547ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"de878042-aee5-4caf-9872-65bdcb3c2014","timestamp":"2026-05-12T20:18:35.984Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did |
| tasks-whats-on-my-list | task_management | ❌ | 356ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"f1adac02-0eb1-479c-95c2-1605d20ef278","timestamp":"2026-05-12T20:18:51.644Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did |
| portfolio-morning-standup | portfolio_briefing | ❌ | 331ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"3964d606-4cb3-4740-8bce-d90f23ec70eb","timestamp":"2026-05-12T20:19:07.316Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getProjectsWithRisks] to fire — none did; answer length 210 < min 250 |
| portfolio-red-flags-now | portfolio_briefing | ❌ | 296ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"c81b23f7-b02b-408f-a184-bdeeef03294e","timestamp":"2026-05-12T20:19:22.948Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getProjectsWithRisks, getPortfolioOverview] to fire — none did |
| catch-me-up-everything | portfolio_briefing | ❌ | 622ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"a64336b1-60f7-41e1-891f-40c312175c36","timestamp":"2026-05-12T20:19:38.901Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getPortfolioOverview, getMyTasks] to fire — none did; answer length 210 < min 300 |
| financial-are-we-profitable | financial_analysis | ❌ | 681ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"6dbe47a5-70df-4472-87cf-0c4547654c10","timestamp":"2026-05-12T20:19:54.917Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMarginAnalysis, getProjectBudgetSummary, getFinancialAnalysis] to fire — none did; mustIncludeAny missing one of: "margin", "profit", "loss", "revenue", "cost", "budget" |
| vendor-subs-behind-portfolio | people_or_capacity | ❌ | 287ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"a1b4b7da-13d4-4c5a-b996-fdb9634f6f36","timestamp":"2026-05-12T20:20:10.537Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getVendorPerformance, getScheduleAnalysis] to fire — none did; mustIncludeAny missing one of: "sub", "vendor", "subcontractor", "schedule", "behind", "delay", "on track" |
| schedule-anything-slipping-portfolio | operations_analysis | ❌ | 519ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"be490cf4-c1eb-4528-9bad-47d063714797","timestamp":"2026-05-12T20:20:26.432Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getScheduleAnalysis, getProjectsWithRisks] to fire — none did; mustIncludeAny missing one of: "schedule", "slip", "delay", "behind", "on track", "milestone" |
| i-was-out-what-did-i-miss | source_lookup | ❌ | 402ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"70e7e66e-11e1-4d48-ba82-011c000f34a4","timestamp":"2026-05-12T20:20:42.147Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getMeetingsByDate, searchEmails, searchTeamsMessages, getMeetingIntelligence] to fire — none did |
| decisions-what-needs-my-signoff | operations_analysis | ❌ | 394ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"a8b61118-de5f-43f4-9d0f-aa5658590392","timestamp":"2026-05-12T20:20:57.882Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getActionItemsAndInsights, getRFIStatus, getSubmittalStatus] to fire — none did; mustIncludeAny missing one of: "approval", "decision", "sign", "waiting", "open", "pending" |
| owner-prep-call-westfield | project_briefing | ❌ | 532ms | (none) | stream error: HTTP 401: {"success":false,"error_code":"AUTH_EXPIRED","error_message":"Unauthorized","where_it_failed":"ai-assistant/chat#POST","request_id":"b2fb3ba5-a31a-409f-b711-cf9443136e49","timestamp":"2026-05-12T20:21:13.895Z"}; HTTP 401; assistant message was not persisted to chat_history; expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did; mustInclude missing: "Westfield"; mustIncludeAny missing one of: "schedule", "budget", "status", "progress", "tell", "update", "talking point" |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 24 |
| `streamingToolPolicy` | 19 |
| `taskWriteIntentRouter` | 7 |
| `clientProjectIntelligencePacket` | 6 |
| `getProjectBudgetSummary` | 6 |
| `getScheduleAnalysis` | 4 |
| `getMyTasks` | 4 |
| `createGeneratedTask` | 4 |
| `getMarginAnalysis` | 3 |
| `assistantSourceHealth` | 3 |
| `noToolRetry` | 3 |
| `getAcumaticaProjectList` | 3 |
| `getRFIStatus` | 3 |
| `getSubmittalStatus` | 3 |
| `getProjectDetails` | 3 |
| `getProjectBriefingSnapshot` | 3 |
| `getCostTrends` | 3 |
| `getForecastComparison` | 2 |
| `getActionItemsAndInsights` | 2 |
| `semanticSearch` | 2 |
| `sourceLookupIntentRouter` | 2 |
| `updateGeneratedTask` | 2 |
| `getBudgetLineItems` | 1 |
| `getCommitmentsOverview` | 1 |
| `queryDirectCosts` | 1 |
| `queryScheduleTasks` | 1 |
| `sourceSpecificRagRetrieval` | 1 |
| `assistantComponentRegistry` | 1 |
| `getMeetingIntelligence` | 1 |
| `getPortfolioOverview` | 1 |
| `getProjectsWithRisks` | 1 |
| `getFinancialAnalysis` | 1 |
| `getCrossProjectComparison` | 1 |

## Tools defined but never fired in this run

- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createInitiativeCard`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `findProject`
- `getAPAgingReport`
- `getARAgingReport`
- `getAcumaticaProjectBudget`
- `getCashPositionReport`
- `getChangeOrderDetails`
- `getCompanyKnowledge`
- `getDirectCostsSummary`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMeetingDetails`
- `getMeetingsByDate`
- `getPeopleAndRoles`
- `getProjectRiskAnalysis`
- `getRecentBills`
- `getRecentInvoices`
- `getVendorPerformance`
- `getVendorSpendReport`
- `queryBudgetData`
- `queryChangeOrders`
- `queryCommitments`
- `queryDocumentRows`
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
- `writeMemory`
