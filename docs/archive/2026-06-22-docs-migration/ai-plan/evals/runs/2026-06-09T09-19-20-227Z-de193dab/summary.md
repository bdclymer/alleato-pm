# AI Assistant Eval Suite — 2026-06-09T09-19-20-227Z-de193dab

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 5
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 5 failed, 0 errors, avg 1 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-urgent-inbox | source_lookup | ❌ | 14980ms | expected family 'communications' not represented |
| realworld-last-five-emails | source_lookup | ❌ | 4864ms | expected family 'communications' not represented |
| realworld-outlook-arrived-today | source_lookup | ❌ | 1211ms | expected family 'communications' not represented |
| realworld-important-emails-this-morning | source_lookup | ❌ | 984ms | expected family 'communications' not represented |
| realworld-email-reply-triage | source_lookup | ❌ | 831ms | expected family 'communications' not represented |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 4864ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email lookup was performed. The response is a provider error message about billing/credits, not an answer to the user’s request for their last five emails. It does not separate urgent from normal mail, identify actions, summarize threads, or provide any evidence-based email judgment. |
| realworld-urgent-inbox | source_lookup | ❌ | 14980ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "urgent", "email", "inbox", "reply", "no urgent"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No inbox analysis was performed. The response is a provider failure notice, not an email triage answer, so it does not identify urgency, owners, actions, or risks. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 984ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "morning", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email analysis was provided. The response is a provider error message, not an inbox summary, so it fails the task entirely. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 1211ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "Outlook", "received", "attention", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: The response does not answer the inbox question at all. It reports a provider failure and billing speculation instead of identifying Outlook items, urgency, owners, or next actions. No email triage, no evidence handling, and no actionable guidance are present. |
| realworld-email-reply-triage | source_lookup | ❌ | 831ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "reply", "received", "today", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email analysis was performed. The assistant returned a provider/billing failure message instead of identifying today’s emails needing a reply, so it did not satisfy the task at all. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email lookup was performed. The response is a provider error message about billing/credits, not an answer to the user’s request for their last five emails. It does not separate urgent from normal mail, identify actions, summarize threads, or provide any evidence-based email judgment.
- Weaknesses: Fails to answer the source_lookup request for the last five emails.; Provides irrelevant provider/billing troubleshooting instead of inbox content.; Does not separate urgent/critical mail from normal inbox noise.; Does not identify who needs a response or why it matters.; Does not summarize any email threads.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No inbox analysis was performed. The response is a provider failure notice, not an email triage answer, so it does not identify urgency, owners, actions, or risks.
- Weaknesses: Fails to separate urgent email from normal inbox noise.; Does not identify who needs a response, why it matters, or consequences of ignoring it.; Does not summarize any thread or inbox content.; Does not recommend any response path.; Does not address the user’s actual question about urgency in the inbox.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email analysis was provided. The response is a provider error message, not an inbox summary, so it fails the task entirely.
- Weaknesses: Does not identify any important emails from this morning.; Does not separate urgent from normal inbox items.; Does not explain who needs a response or why it matters.; Does not summarize any thread content.; Does not recommend any action path.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The response does not answer the inbox question at all. It reports a provider failure and billing speculation instead of identifying Outlook items, urgency, owners, or next actions. No email triage, no evidence handling, and no actionable guidance are present.
- Weaknesses: Fails to separate urgent email from normal inbox noise because it does not inspect any inbox content.; Does not identify who needs a response, why it matters, or consequences of ignoring anything.; Does not summarize any email threads.; Provides no concrete response path such as reply, delegate, watch, draft, or ignore.; Not suitable as a draft for Brandon because no draft is produced.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email analysis was performed. The assistant returned a provider/billing failure message instead of identifying today’s emails needing a reply, so it did not satisfy the task at all.
- Weaknesses: Did not separate urgent/critical email from normal inbox noise.; Did not identify who needs a response, why it matters, or consequences of ignoring it.; Did not summarize any email threads.; Did not recommend any response path.; Did not provide a draft or practical reply.

## Tool coverage across the suite

| Tool | Hits |
|---|---|

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
- `getMeetingIntelligence`
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
