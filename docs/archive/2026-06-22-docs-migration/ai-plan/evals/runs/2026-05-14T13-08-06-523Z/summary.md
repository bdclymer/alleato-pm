# AI Assistant Eval Suite — 2026-05-14T13-08-06-523Z

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Total: 106
- Passed: 61
- Failed: 45

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ✅ | 47811ms | intentPlanner, promptContextReducer, assistantSourceHealth, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | — |
| project-briefing-vermillion | project_briefing | ✅ | 42370ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | — |
| portfolio-overview | portfolio_briefing | ✅ | 25770ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, getPortfolioOverview, getProjectsWithRisks | — |
| risk-review-single-project | risk_review | ✅ | 61691ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectRiskAnalysis, getProjectBriefingSnapshot, getActionItemsAndInsights | — |
| financial-budget-summary | financial_analysis | ✅ | 39716ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getChangeOrderDetails, getCommitmentsOverview, getProjectBudgetSummary, getDirectCostsSummary, getMarginAnalysis | — |
| financial-commitments | financial_analysis | ❌ | 79514ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getChangeOrderDetails, getFinancialAnalysis, getProjectBriefingSnapshot | expected at least one of [getCommitmentsOverview, queryCommitments] to fire — none did |
| financial-change-orders | financial_analysis | ✅ | 48637ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getChangeOrderDetails, getFinancialAnalysis, getProjectRiskAnalysis | — |
| financial-direct-costs | financial_analysis | ✅ | 26492ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, queryDirectCosts | — |
| financial-margin | financial_analysis | ✅ | 20883ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getMarginAnalysis | — |
| financial-forecast | financial_analysis | ❌ | 18440ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBudgetSummary, getMarginAnalysis | expected at least one of [getForecastComparison, getCostTrends] to fire — none did |
| schedule-analysis | operations_analysis | ❌ | 31398ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [getScheduleAnalysis, queryScheduleTasks] to fire — none did |
| rfis-open | operations_analysis | ❌ | 85543ms | intentPlanner, promptContextReducer, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, semanticSearch, searchEmails, searchTeamsMessages, getActionItemsAndInsights, searchMeetingsByTopic | expected at least one of [getRFIStatus] to fire — none did |
| submittals-status | operations_analysis | ❌ | 89521ms | intentPlanner, promptContextReducer, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, getActionItemsAndInsights, semanticSearch, streamTextError, noToolRetry | expected at least one of [getSubmittalStatus] to fire — none did |
| people-roles | people_or_capacity | ❌ | 48666ms | intentPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectDetails | expected at least one of [getPeopleAndRoles] to fire — none did |
| vendor-performance | people_or_capacity | ✅ | 35018ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis, getProjectsWithRisks, getPortfolioOverview | — |
| source-lookup-meetings | source_lookup | ❌ | 7874ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [searchMeetingsByTopic, semanticSearch] to fire — none did |
| source-lookup-email | source_lookup | ✅ | 31889ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| source-lookup-teams | source_lookup | ❌ | 40098ms | intentPlanner, promptContextReducer, assistantSourceHealth, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy | expected at least one of [searchTeamsMessages, semanticSearch] to fire — none did |
| meetings-by-date | meeting_query | ❌ | 44293ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectDetails | expected at least one of [getMeetingsByDate, getMeetingIntelligence, sourceSpecificRagRetrieval] to fire — none did |
| recent-emails-synthesis | source_lookup | ✅ | 84872ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| union-collective-location-followup-context | project_location_followup | ❌ | 99022ms | intentPlanner, projectLocationContextLookup, mcpToolDiscovery, streamingToolPolicy, searchEmails, searchExternalDocuments, findProject, semanticSearch, streamTextError, noToolRetry | forbidden tool fired: 'noToolRetry'; mustIncludeAny missing one of: "Kentucky", "RAG", "semantic search", "source rows" |
| recent-meetings-portfolio | meeting_query | ❌ | 47124ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getPortfolioOverview | expected at least one of [getMeetingsByDate, searchMeetingsByTopic, getMeetingIntelligence] to fire — none did |
| documents-search | document_question | ❌ | 53679ms | intentPlanner, promptContextReducer, assistantSourceHealth, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectDetails | expected at least one of [searchDocuments, searchExternalDocuments, queryDocumentRows] to fire — none did |
| action-items | operations_analysis | ❌ | 28583ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getActionItemsAndInsights] to fire — none did |
| cross-project-comparison | portfolio_briefing | ❌ | 36248ms | intentPlanner, assistantWidgetPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis, getAcumaticaProjectList, getCostTrends | expected at least one of [getCrossProjectComparison, getPortfolioOverview] to fire — none did |
| historical-trends | financial_analysis | ✅ | 25839ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getCostTrends | — |
| company-knowledge | knowledge_capture | ✅ | 69451ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, semanticSearch, searchEmails, searchMeetingsByTopic | — |
| memory-recall | general_conversation | ❌ | 45057ms | intentPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy | expected at least one of [recallPastConversations, searchMemories] to fire — none did |
| app-help | app_help | ✅ | 15699ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, searchAppHelp | — |
| accounting-ap-aging | financial_analysis | ✅ | 47799ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getAPAgingReport, getRecentBills | — |
| accounting-cash-position | financial_analysis | ✅ | 16771ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getCashPositionReport | — |
| thought-partner-bid | brainstorming | ❌ | 44429ms | intentPlanner, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, getFinancialAnalysis, getPortfolioOverview, consultVPBD | mustInclude missing: "tradeoff" |
| what-changed | project_briefing | ❌ | 40773ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [semanticSearch, recallPastConversations] to fire — none did |
| owner-strategy-ulta-action-plan | project_briefing | ✅ | 31794ms | intentPlanner, promptContextReducer, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, getActionItemsAndInsights | — |
| action-task-preview-no-write | action_preview | ❌ | 4990ms | intentPlanner, promptContextReducer, taskSourceReview | expected required tool 'createTask' to fire |
| task-register-source-grounded | task_management | ❌ | 8922ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | expected required tool 'getMyTasks' to fire; mustInclude missing: "Sources Checked" |
| source-freshness-rag-health | source_health | ✅ | 39888ms | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| ceo-task-list-plain | task_management | ✅ | 5451ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-plate | task_management | ✅ | 3947ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-todo | task_management | ✅ | 2720ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-owe | task_management | ✅ | 3080ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-pending | task_management | ✅ | 3154ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-overdue | task_management | ✅ | 3324ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-handle | task_management | ✅ | 4265ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-list-project-scoped | task_management | ✅ | 44593ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, getProjectBriefingSnapshot | — |
| ceo-task-create-direct | action_preview | ❌ | 7218ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "AC1", "Ulta", "call", "owner", "approval"; answer length 69 < min 80 |
| ceo-task-create-remind | action_preview | ❌ | 8513ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "Jesse", "Vermillion", "change order", "Monday", "follow"; answer length 69 < min 80 |
| ceo-task-create-note-to-self | action_preview | ❌ | 6440ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "Westfield", "budget", "PM", "tomorrow"; answer length 69 < min 80 |
| ceo-task-create-throw-on-list | action_preview | ❌ | 3598ms | intentPlanner, promptContextReducer, getMyTasks | expected at least one of [createGeneratedTask] to fire — none did; mustIncludeAny missing one of: "Acme", "submittal", "Thursday", "EOD" |
| ceo-task-create-flag-for-followup | action_preview | ❌ | 8726ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "inspector", "permit", "Vermillion", "follow", "city"; answer length 69 < min 80 |
| ceo-task-create-assign-pm | action_preview | ❌ | 6937ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | answer length 69 < min 80 |
| ceo-task-create-action-item | action_preview | ❌ | 7278ms | intentPlanner, promptContextReducer, taskSourceReview | expected required tool 'createGeneratedTask' to fire |
| ceo-task-create-schedule-activity | action_preview | ❌ | 7012ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | expected required tool 'createTask' to fire; forbidden tool fired: 'createGeneratedTask'; mustIncludeAny missing one of: "mobilization", "June", "Gantt", "schedule"; answer length 69 < min 160 |
| ceo-task-modify-mark-done | action_preview | ❌ | 13069ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-task-modify-close | action_preview | ❌ | 10972ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, updateGeneratedTask, taskWriteToolOnlyCompletion | answer length 69 < min 80 |
| ceo-task-modify-reschedule | action_preview | ❌ | 7076ms | intentPlanner, promptContextReducer, taskSourceReview | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did |
| ceo-task-modify-reassign | action_preview | ❌ | 10503ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getMyTasks, updateGeneratedTask, getActionItemsAndInsights] to fire — none did; answer length 77 < min 80 |
| ceo-task-modify-bump-priority | action_preview | ❌ | 8010ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | mustIncludeAny missing one of: "high", "priority", "Ulta", "inspector", "preview", "confirm" |
| ceo-task-modify-cancel | action_preview | ✅ | 8702ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| ceo-money-bleeding | financial_analysis | ✅ | 23951ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getCashPositionReport, getAPAgingReport, getRecentInvoices, getRecentBills, getARAgingReport | — |
| ceo-money-margin-leak | financial_analysis | ❌ | 21106ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getAcumaticaProjectList | expected at least one of [getPortfolioOverview, getMarginAnalysis, getCrossProjectComparison] to fire — none did |
| ceo-money-unbilled-changes | financial_analysis | ❌ | 11229ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getFinancialAnalysis | expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did |
| ceo-money-cash-quick | financial_analysis | ✅ | 11534ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getCashPositionReport | — |
| ceo-decisions-what-to-do-today | project_briefing | ✅ | 12018ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| ceo-decisions-fires-today | project_briefing | ✅ | 26617ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights, getPortfolioOverview, getProjectsWithRisks | — |
| ceo-decisions-should-i-bid | brainstorming | ❌ | 5039ms | intentPlanner, featureRequestPacketRouter | mustIncludeAny missing one of: "tradeoff", "consider", "depends", "risk", "fit", "capacity" |
| ceo-decisions-pm-accountability | people_or_capacity | ✅ | 71478ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getPeopleAndRoles, getCrossProjectComparison, getActionItemsAndInsights, getPortfolioOverview, getProjectsWithRisks, semanticSearch, consultCHRO | — |
| ceo-draft-email-owner-update | action_preview | ✅ | 6827ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy | — |
| ceo-draft-email-sub-warning | action_preview | ✅ | 7742ms | intentPlanner, emailActionIntentRouter, mcpToolDiscoverySkipped, streamingToolPolicy | — |
| ceo-meetings-what-happened | meeting_query | ❌ | 35179ms | intentPlanner, semanticSearch, assistantSourceHealth, sourceLookupIntentRouter, mcpToolDiscovery, streamingToolPolicy, metaCommentaryRetry | expected at least one of [getMeetingsByDate, searchMeetingsByTopic, getActionItemsAndInsights, getMeetingIntelligence] to fire — none did |
| ceo-meetings-promised-to-do | meeting_query | ❌ | 7441ms | intentPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | expected at least one of [getMeetingsByDate, getActionItemsAndInsights, getMeetingIntelligence, searchMeetingsByTopic] to fire — none did |
| ceo-meetings-prep-next | meeting_query | ✅ | 38549ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot, findProject | — |
| ceo-portfolio-status-summary | portfolio_briefing | ✅ | 23978ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getPortfolioOverview | — |
| ceo-portfolio-watchlist | portfolio_briefing | ✅ | 25700ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getProjectRiskAnalysis | — |
| ceo-context-aware-blocked | operations_analysis | ✅ | 9692ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| ceo-context-aware-decisions-needed | operations_analysis | ❌ | 3433ms | intentPlanner, featureRequestPacketRouter | expected at least one of [getActionItemsAndInsights, getRFIStatus] to fire — none did |
| ceo-task-list-tomorrow | task_management | ✅ | 3401ms | intentPlanner, promptContextReducer, getMyTasks | — |
| ceo-task-create-conversational-no-context | action_preview | ❌ | 6532ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "Mark", "bonding", "Thursday", "call", "lender", "capacity"; answer length 69 < min 80 |
| ceo-task-create-batch | action_preview | ❌ | 13299ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, createGeneratedTask, taskWriteToolOnlyCompletion | mustIncludeAny missing one of: "Vermillion", "COI", "insurance", "Acme", "bank", "loan"; answer length 69 < min 100 |
| ceo-task-modify-snooze | action_preview | ❌ | 8432ms | intentPlanner, promptContextReducer, taskWriteIntentRouter, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | mustIncludeAny missing one of: "COI", "Vermillion", "complete", "close", "preview", "confirm"; answer length 75 < min 80 |
| tasks-list-of-action-items-canonical | task_management | ✅ | 4155ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 3703ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 12673ms | intentPlanner, promptContextReducer, getMyTasks | — |
| tasks-whats-on-my-list | task_management | ✅ | 5046ms | intentPlanner, promptContextReducer, getMyTasks | — |
| portfolio-morning-standup | portfolio_briefing | ✅ | 27095ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getPortfolioOverview, getProjectsWithRisks, getActionItemsAndInsights | — |
| portfolio-red-flags-now | portfolio_briefing | ✅ | 24417ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getProjectRiskAnalysis, getPortfolioOverview | — |
| catch-me-up-everything | portfolio_briefing | ✅ | 33587ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getPortfolioOverview, getActionItemsAndInsights, getProjectsWithRisks | — |
| financial-are-we-profitable | financial_analysis | ✅ | 29747ms | intentPlanner, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getMarginAnalysis | — |
| vendor-subs-behind-portfolio | people_or_capacity | ❌ | 38347ms | intentPlanner, promptContextReducer, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [getVendorPerformance, getScheduleAnalysis] to fire — none did |
| schedule-anything-slipping-portfolio | operations_analysis | ✅ | 28703ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getProjectRiskAnalysis | — |
| i-was-out-what-did-i-miss | source_lookup | ❌ | 23723ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getPortfolioOverview, getProjectsWithRisks, getActionItemsAndInsights | expected at least one of [getMeetingsByDate, searchEmails, searchTeamsMessages, getMeetingIntelligence] to fire — none did |
| decisions-what-needs-my-signoff | operations_analysis | ❌ | 14334ms | intentPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | expected at least one of [getActionItemsAndInsights, getRFIStatus, getSubmittalStatus] to fire — none did |
| owner-prep-call-westfield | project_briefing | ❌ | 46248ms | intentPlanner, backendDeepAgentProjectStatus, clientProjectIntelligencePacket, mcpToolDiscovery, streamingToolPolicy | expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did |
| realworld-todays-meetings | meeting_query | ✅ | 4141ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, sourceSpecificRagRetrieval, assistantComponentRegistry | — |
| realworld-most-important-tasks | task_management | ✅ | 7820ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 7704ms | intentPlanner, promptContextReducer, mcpToolDiscovery, streamingToolPolicy, getActionItemsAndInsights | — |
| realworld-business-risks | risk_review | ✅ | 25458ms | intentPlanner, promptContextReducer, assistantWidgetPlanner, mcpToolDiscovery, streamingToolPolicy, getProjectsWithRisks, getFinancialAnalysis, getActionItemsAndInsights, getPortfolioOverview | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 74830ms | intentPlanner, assistantSourceHealth, mcpToolDiscovery, streamingToolPolicy, getCompanyKnowledge, semanticSearch, noToolRetry | — |
| realworld-last-five-emails | source_lookup | ✅ | 14123ms | intentPlanner, getRecentEmails | — |
| realworld-urgent-inbox | source_lookup | ✅ | 17340ms | intentPlanner, getRecentEmails | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 4215ms | intentPlanner, getRecentEmails | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 5541ms | intentPlanner, getRecentEmails | — |
| realworld-email-reply-triage | source_lookup | ✅ | 5619ms | intentPlanner, getRecentEmails | — |
| realworld-draft-email-response | email_action | ✅ | 13363ms | intentPlanner, emailActionIntentRouter, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, emailActionFastPath | — |
| realworld-meeting-invite-clarify | calendar_action | ✅ | 6123ms | intentPlanner, calendarActionIntentRouter, mcpToolDiscovery, streamingToolPolicy | — |
| realworld-meeting-invite-preview | calendar_action | ✅ | 4173ms | intentPlanner, assistantSourceHealth, calendarActionIntentRouter, createOutlookCalendarInvite, calendarActionFastPath | — |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `intentPlanner` | 106 |
| `streamingToolPolicy` | 78 |
| `mcpToolDiscovery` | 76 |
| `promptContextReducer` | 63 |
| `clientProjectIntelligencePacket` | 25 |
| `getActionItemsAndInsights` | 21 |
| `backendDeepAgentProjectStatus` | 15 |
| `getProjectBriefingSnapshot` | 14 |
| `getMyTasks` | 13 |
| `taskWriteIntentRouter` | 13 |
| `getPortfolioOverview` | 12 |
| `getProjectsWithRisks` | 11 |
| `semanticSearch` | 11 |
| `assistantSourceHealth` | 10 |
| `taskWriteToolOnlyCompletion` | 9 |
| `createGeneratedTask` | 8 |
| `assistantWidgetPlanner` | 7 |
| `getFinancialAnalysis` | 7 |
| `getProjectRiskAnalysis` | 5 |
| `sourceLookupIntentRouter` | 5 |
| `getRecentEmails` | 5 |
| `getMarginAnalysis` | 4 |
| `getChangeOrderDetails` | 3 |
| `searchEmails` | 3 |
| `noToolRetry` | 3 |
| `getProjectDetails` | 3 |
| `sourceSpecificRagRetrieval` | 3 |
| `assistantComponentRegistry` | 3 |
| `getCashPositionReport` | 3 |
| `taskSourceReview` | 3 |
| `emailActionIntentRouter` | 3 |
| `getProjectBudgetSummary` | 2 |
| `searchMeetingsByTopic` | 2 |
| `streamTextError` | 2 |
| `findProject` | 2 |
| `getAcumaticaProjectList` | 2 |
| `getCostTrends` | 2 |
| `getAPAgingReport` | 2 |
| `getRecentBills` | 2 |
| `getCompanyKnowledge` | 2 |
| `featureRequestPacketRouter` | 2 |
| `mcpToolDiscoverySkipped` | 2 |
| `calendarActionIntentRouter` | 2 |
| `getCommitmentsOverview` | 1 |
| `getDirectCostsSummary` | 1 |
| `queryDirectCosts` | 1 |
| `searchTeamsMessages` | 1 |
| `projectLocationContextLookup` | 1 |
| `searchExternalDocuments` | 1 |
| `searchAppHelp` | 1 |
| `consultVPBD` | 1 |
| `updateGeneratedTask` | 1 |
| `getRecentInvoices` | 1 |
| `getARAgingReport` | 1 |
| `getPeopleAndRoles` | 1 |
| `getCrossProjectComparison` | 1 |
| `consultCHRO` | 1 |
| `metaCommentaryRetry` | 1 |
| `getRecentOutlookEmails` | 1 |
| `readOutlookEmailThread` | 1 |
| `draftOutlookEmail` | 1 |
| `emailActionFastPath` | 1 |
| `createOutlookCalendarInvite` | 1 |
| `calendarActionFastPath` | 1 |

## Tools defined but never fired in this run

- `captureFeatureRequest`
- `createChangeEvent`
- `createChangeOrder`
- `createCommitment`
- `createInitiativeCard`
- `createRFI`
- `createTask`
- `deleteGeneratedTask`
- `getAcumaticaProjectBudget`
- `getBudgetLineItems`
- `getForecastComparison`
- `getGeneratedTasksToday`
- `getHistoricalTrends`
- `getMeetingDetails`
- `getMeetingsByDate`
- `getRFIStatus`
- `getScheduleAnalysis`
- `getSubmittalStatus`
- `getVendorPerformance`
- `getVendorSpendReport`
- `queryBudgetData`
- `queryChangeOrders`
- `queryCommitments`
- `queryDocumentRows`
- `queryScheduleTasks`
- `recallPastConversations`
- `researchCompany`
- `saveInsight`
- `saveToKnowledgeBase`
- `searchConstructionMarket`
- `searchDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `writeMemory`
