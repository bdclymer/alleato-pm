# AI Assistant Eval Suite — 2026-05-19T08-43-15-434Z-3fa84e5f

- Endpoint: `http://localhost:3002/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 10
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 1372ms | expected family 'communications' not represented; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-urgent-inbox | source_lookup | ❌ | 540ms | expected family 'communications' not represented; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 451ms | expected family 'communications' not represented; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 446ms | expected family 'communications' not represented; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-email-reply-triage | source_lookup | ❌ | 419ms | expected family 'communications' not represented; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 1372ms | email_operator: skipped (n/a/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |
| realworld-urgent-inbox | source_lookup | ❌ | 540ms | email_operator: skipped (n/a/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "urgent", "email", "inbox", "reply", "no urgent"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |
| realworld-important-emails-this-morning | source_lookup | ❌ | 446ms | email_operator: skipped (n/a/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "inbox", "Outlook", "received", "morning", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |
| realworld-outlook-arrived-today | source_lookup | ❌ | 451ms | email_operator: skipped (n/a/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "Outlook", "received", "attention", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |
| realworld-email-reply-triage | source_lookup | ❌ | 419ms | email_operator: skipped (n/a/4) | 0 | (none) | expected at least one of [consultMicrosoftExecutiveAssistant] to fire — none did; expected required tool 'consultMicrosoftExecutiveAssistant' to fire; mustIncludeAny missing one of: "email", "reply", "received", "today", "no emails"; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: n/a / 4 (skipped)
- Summary: Judge disabled with AI_EVAL_JUDGE_ENABLED=false.
- Weaknesses: —

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
