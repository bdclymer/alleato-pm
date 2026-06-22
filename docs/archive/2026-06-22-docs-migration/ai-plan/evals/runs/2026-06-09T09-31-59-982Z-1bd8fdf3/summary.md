# AI Assistant Eval Suite — 2026-06-09T09-31-59-982Z-1bd8fdf3

- Endpoint: `https://alleato-ih4s3lmtz-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
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
| realworld-urgent-inbox | source_lookup | ❌ | 15404ms | expected family 'communications' not represented |
| realworld-last-five-emails | source_lookup | ❌ | 4077ms | expected family 'communications' not represented |
| realworld-email-reply-triage | source_lookup | ❌ | 1303ms | expected family 'communications' not represented |
| realworld-important-emails-this-morning | source_lookup | ❌ | 967ms | expected family 'communications' not represented |
| realworld-outlook-arrived-today | source_lookup | ❌ | 906ms | expected family 'communications' not represented |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 4077ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email lookup was performed. The response is a provider error message about billing/credits, not an answer to the request for the last five emails. |
| realworld-urgent-inbox | source_lookup | ❌ | 15404ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "urgent", "email", "inbox", "reply", "no urgent"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No inbox analysis was performed. The response is a provider failure notice, not an answer to whether anything urgent exists in the inbox. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 967ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "morning", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email analysis was provided. The response is a provider error message unrelated to the inbox, so it does not identify important emails, urgency, actions, or risks. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 906ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "Outlook", "received", "attention", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: The response does not answer the inbox question at all. It reports a provider failure and billing speculation instead of identifying any Outlook items, urgency, owners, or recommended actions. |
| realworld-email-reply-triage | source_lookup | ❌ | 1303ms | email_operator: fail (1/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "reply", "received", "today", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 1 < 4: No email analysis was performed. The assistant returned a provider/billing failure message instead of identifying today’s emails needing a reply, so it did not satisfy the task at all. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email lookup was performed. The response is a provider error message about billing/credits, not an answer to the request for the last five emails.
- Weaknesses: Fails to separate urgent from normal inbox items because no inbox content was analyzed.; Does not identify who needs a response, why it matters, or consequences of ignoring anything.; Does not summarize any email threads or provide a usable inbox overview.; Does not recommend any action path such as reply, delegate, watch, draft, or ignore.; Does not answer the user’s actual request to tell them their last five emails.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No inbox analysis was performed. The response is a provider failure notice, not an answer to whether anything urgent exists in the inbox.
- Weaknesses: Fails to separate urgent email from normal inbox noise because no inbox items were reviewed.; Does not identify who needs a response, why it matters, or consequences of ignoring anything.; Does not summarize any thread or email content.; Does not recommend a concrete action path for any inbox item.; Does not address draft quality because no draft was produced.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email analysis was provided. The response is a provider error message unrelated to the inbox, so it does not identify important emails, urgency, actions, or risks.
- Weaknesses: Fails to separate urgent email from normal inbox noise.; Does not identify who needs a response, why it matters, or consequences of ignoring.; Does not summarize any email threads.; Does not recommend a response path.; Does not provide a draft or any practical next step for Brandon.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The response does not answer the inbox question at all. It reports a provider failure and billing speculation instead of identifying any Outlook items, urgency, owners, or recommended actions.
- Weaknesses: Does not separate urgent email from normal inbox noise because it provides no inbox analysis.; Does not identify who needs a response, why it matters, or consequences of ignoring anything.; Does not summarize any email threads or even mention actual messages.; Does not recommend a response path such as reply, delegate, watch, draft, or ignore.; Does not address draft quality because no draft was produced.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: No email analysis was performed. The assistant returned a provider/billing failure message instead of identifying today’s emails needing a reply, so it did not satisfy the task at all.
- Weaknesses: Did not separate urgent/critical email from normal inbox noise.; Did not identify who needs a response, why it matters, or consequences of ignoring it.; Did not summarize any email threads.; Did not recommend any response path.; Did not provide a draft or any actionable email handling guidance.

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
