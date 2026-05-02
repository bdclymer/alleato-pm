# AI Assistant Eval Suite — 2026-05-02T10-32-47-633Z

- Endpoint: `http://localhost:3000/api/ai-assistant/chat`
- Total: 30
- Passed: 18
- Failed: 12

## Per-case results

| Case | Intent | Status | Duration | Tools fired | Failures |
|---|---|---|---|---|---|
| project-briefing-westfield | project_briefing | ❌ | 9811ms | clientProjectIntelligencePacket | expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did |
| project-briefing-vermillion | project_briefing | ✅ | 67756ms | streamingToolPolicy, searchTeamsMessages, searchEmails, searchMeetingsByTopic, searchEmails, getProjectsWithRisks, getActionItemsAndInsights, findProject, findProject, searchEmails, searchTeamsMessages, findProject, queryDirectCosts, getForecastComparison, getCommitmentsOverview, getChangeOrderDetails, getMarginAnalysis, getCostTrends, getProjectBudgetSummary, getProjectBriefingSnapshot, semanticSearch, searchMeetingsByTopic, searchMeetingsByTopic, getSubmittalStatus, getRFIStatus, getVendorPerformance, getCommitmentsOverview, getScheduleAnalysis, getActionItemsAndInsights, noToolRetry | — |
| portfolio-overview | portfolio_briefing | ✅ | 46997ms | streamingToolPolicy, getCrossProjectComparison, getProjectsWithRisks, getProjectsWithRisks, getProjectsWithRisks, getFinancialAnalysis, getActionItemsAndInsights, getPortfolioOverview, getPortfolioOverview, getPortfolioOverview | — |
| risk-review-single-project | risk_review | ✅ | 44574ms | streamingToolPolicy, getChangeOrderDetails, getSubmittalStatus, getProjectBudgetSummary, getProjectRiskAnalysis, getRFIStatus, getActionItemsAndInsights, searchMeetingsByTopic, findProject, streamTextError, noToolRetry | — |
| financial-budget-summary | financial_analysis | ❌ | 3837ms | clientProjectIntelligencePacket | expected at least one of [getProjectBudgetSummary, queryBudgetData, getBudgetLineItems] to fire — none did |
| financial-commitments | financial_analysis | ❌ | 2963ms | clientProjectIntelligencePacket | expected at least one of [getCommitmentsOverview, queryCommitments] to fire — none did |
| financial-change-orders | financial_analysis | ❌ | 3204ms | clientProjectIntelligencePacket | expected at least one of [getChangeOrderDetails, queryChangeOrders] to fire — none did |
| financial-direct-costs | financial_analysis | ✅ | 32689ms | streamingToolPolicy, getDirectCostsSummary, findProject, getDirectCostsSummary | — |
| financial-margin | financial_analysis | ❌ | 4133ms | clientProjectIntelligencePacket | expected at least one of [getMarginAnalysis, getFinancialAnalysis] to fire — none did; mustInclude missing: "margin" |
| financial-forecast | financial_analysis | ❌ | 2662ms | clientProjectIntelligencePacket | expected at least one of [getForecastComparison, getCostTrends] to fire — none did; mustInclude missing: "forecast" |
| schedule-analysis | operations_analysis | ✅ | 33322ms | streamingToolPolicy, getScheduleAnalysis, findProject, getScheduleAnalysis | — |
| rfis-open | operations_analysis | ✅ | 41137ms | streamingToolPolicy, getRFIStatus, searchTeamsMessages, searchEmails, semanticSearch, searchMeetingsByTopic, findProject, streamTextError, noToolRetry | — |
| submittals-status | operations_analysis | ❌ | 7318ms | clientProjectIntelligencePacket | expected at least one of [getSubmittalStatus] to fire — none did; mustInclude missing: "submittal" |
| people-roles | people_or_capacity | ✅ | 19057ms | streamingToolPolicy, getPeopleAndRoles, findProject, getPeopleAndRoles | — |
| vendor-performance | people_or_capacity | ❌ | 53364ms | streamingToolPolicy, getCompanyKnowledge, getProjectsWithRisks, getPortfolioOverview, getActionItemsAndInsights, getVendorSpendReport, semanticSearch, getPortfolioOverview, getProjectsWithRisks, getCrossProjectComparison, semanticSearch, searchMeetingsByTopic, noToolRetry | expected at least one of [getVendorPerformance] to fire — none did |
| source-lookup-meetings | source_lookup | ✅ | 9209ms | semanticSearch, sourceLookupIntentRouter | — |
| source-lookup-email | source_lookup | ✅ | 14345ms | streamingToolPolicy, searchEmails | — |
| source-lookup-teams | source_lookup | ✅ | 6336ms | semanticSearch, sourceLookupIntentRouter | — |
| meetings-by-date | meeting_query | ❌ | 2907ms | sourceSpecificRagRetrieval | expected at least one of [getMeetingsByDate] to fire — none did |
| documents-search | document_question | ❌ | 7461ms | semanticSearch, sourceLookupIntentRouter | expected at least one of [searchDocuments, searchExternalDocuments, queryDocumentRows] to fire — none did |
| action-items | operations_analysis | ✅ | 30280ms | streamingToolPolicy, getActionItemsAndInsights, searchMeetingsByTopic, getMeetingsByDate | — |
| cross-project-comparison | portfolio_briefing | ✅ | 24638ms | streamingToolPolicy, getFinancialAnalysis, getPortfolioOverview, getAcumaticaProjectList | — |
| historical-trends | financial_analysis | ❌ | 3081ms | clientProjectIntelligencePacket | expected at least one of [getHistoricalTrends, getCostTrends] to fire — none did; mustInclude missing: "trend" |
| company-knowledge | knowledge_capture | ✅ | 18415ms | streamingToolPolicy, searchAppHelp, getCompanyKnowledge | — |
| memory-recall | general_conversation | ✅ | 21058ms | streamingToolPolicy, recallPastConversations | — |
| app-help | app_help | ✅ | 11329ms | streamingToolPolicy, searchAppHelp | — |
| accounting-ap-aging | financial_analysis | ✅ | 21404ms | streamingToolPolicy, getAPAgingReport | — |
| accounting-cash-position | financial_analysis | ✅ | 28154ms | streamingToolPolicy, getCashPositionReport, getFinancialAnalysis, getAPAgingReport, getRecentInvoices, getARAgingReport, getRecentBills | — |
| thought-partner-bid | brainstorming | ✅ | 48908ms | streamingToolPolicy, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCompanyKnowledge, getCrossProjectComparison, getActionItemsAndInsights, getPortfolioOverview, getPortfolioOverview, getPortfolioOverview, getProjectsWithRisks, getPortfolioOverview, searchConstructionMarket | — |
| what-changed | project_briefing | ❌ | 3743ms | clientProjectIntelligencePacket | expected at least one of [semanticSearch, recallPastConversations] to fire — none did |

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `streamingToolPolicy` | 17 |
| `getPortfolioOverview` | 10 |
| `clientProjectIntelligencePacket` | 9 |
| `findProject` | 8 |
| `searchMeetingsByTopic` | 7 |
| `getProjectsWithRisks` | 7 |
| `getActionItemsAndInsights` | 7 |
| `semanticSearch` | 7 |
| `getCompanyKnowledge` | 7 |
| `searchEmails` | 5 |
| `noToolRetry` | 4 |
| `searchTeamsMessages` | 3 |
| `getRFIStatus` | 3 |
| `getScheduleAnalysis` | 3 |
| `getCrossProjectComparison` | 3 |
| `getFinancialAnalysis` | 3 |
| `sourceLookupIntentRouter` | 3 |
| `getCommitmentsOverview` | 2 |
| `getChangeOrderDetails` | 2 |
| `getProjectBudgetSummary` | 2 |
| `getSubmittalStatus` | 2 |
| `streamTextError` | 2 |
| `getDirectCostsSummary` | 2 |
| `getPeopleAndRoles` | 2 |
| `searchAppHelp` | 2 |
| `getAPAgingReport` | 2 |
| `queryDirectCosts` | 1 |
| `getForecastComparison` | 1 |
| `getMarginAnalysis` | 1 |
| `getCostTrends` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `getVendorPerformance` | 1 |
| `getProjectRiskAnalysis` | 1 |
| `getVendorSpendReport` | 1 |
| `sourceSpecificRagRetrieval` | 1 |
| `getMeetingsByDate` | 1 |
| `getAcumaticaProjectList` | 1 |
| `recallPastConversations` | 1 |
| `getCashPositionReport` | 1 |
| `getRecentInvoices` | 1 |
| `getARAgingReport` | 1 |
| `getRecentBills` | 1 |
| `searchConstructionMarket` | 1 |

## Tools defined but never fired in this run

- `getAcumaticaProjectBudget`
- `getBudgetLineItems`
- `getHistoricalTrends`
- `getMeetingDetails`
- `getProjectDetails`
- `queryBudgetData`
- `queryChangeOrders`
- `queryCommitments`
- `queryDocumentRows`
- `queryScheduleTasks`
- `researchCompany`
- `saveInsight`
- `saveToKnowledgeBase`
- `searchDocuments`
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `writeMemory`
