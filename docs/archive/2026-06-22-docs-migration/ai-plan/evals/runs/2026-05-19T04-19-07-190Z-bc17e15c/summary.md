# AI Assistant Eval Suite — 2026-05-19T04-19-07-190Z-bc17e15c

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `email-operator-quality`
- Bundle description: LLM-judge eval for Brandon inbox monitoring, urgent email triage, morning/evening brief usefulness, and draft-readiness.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage|draft-email-response|brandon-email-critical-monitor|brandon-email-morning-brief|brandon-email-draft-like-brandon)$`
- Total: 9
- Passed: 0
- Failed: 9
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 9 judged, 0 passed, 0 failed, 9 errors, avg 0 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 15889ms | — |
| realworld-draft-email-response | email_action | ❌ | 14262ms | — |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 10729ms | — |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 10137ms | — |
| realworld-urgent-inbox | source_lookup | ❌ | 9433ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 8414ms | — |
| realworld-brandon-email-critical-monitor | source_lookup | ❌ | 8403ms | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 7451ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 6729ms | — |

## Bundle Criteria

- The assistant must use structured recent Outlook retrieval for inbox questions.
- The assistant must separate urgent response-needed email from normal inbox noise.
- The assistant must provide a concise executive brief suitable for Teams/morning/evening reporting.
- Draft requests must produce short, direct Brandon-style drafts or approval previews, never claim sent email.
- The answer must make the next action obvious: reply, draft, delegate, watch, or ignore.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 15889ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-urgent-inbox | source_lookup | ❌ | 9433ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-important-emails-this-morning | source_lookup | ❌ | 6729ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-outlook-arrived-today | source_lookup | ❌ | 7451ms | email_operator: error (0/4) | 0 | getRecentEmails | mustExclude present: "semantic search"; judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-email-reply-triage | source_lookup | ❌ | 8414ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-draft-email-response | email_action | ❌ | 14262ms | email_operator: error (0/4) | 0 | getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail, getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-brandon-email-critical-monitor | source_lookup | ❌ | 8403ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 10137ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 10729ms | email_operator: error (0/4) | 0 | getRecentEmails | judge email_operator error: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}} |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-draft-email-response

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-brandon-email-critical-monitor

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-brandon-email-morning-brief

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

### realworld-brandon-email-draft-like-brandon

- Rubric: `email_operator`
- Score: 0 / 4 (error)
- Summary: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}
- Weaknesses: HTTP 400: {"error":{"message":"Invalid input","type":"invalid_request_error","param":"response_format","code":"invalid_request_error"}}

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `getRecentEmails` | 9 |
| `getRecentOutlookEmails` | 1 |
| `readOutlookEmailThread` | 1 |
| `draftOutlookEmail` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentExecutiveBriefing`
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
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
