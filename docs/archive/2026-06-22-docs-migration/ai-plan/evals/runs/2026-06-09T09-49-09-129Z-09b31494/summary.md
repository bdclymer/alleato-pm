# AI Assistant Eval Suite — 2026-06-09T09-49-09-129Z-09b31494

- Endpoint: `https://alleato-5y4fbd5ji-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 5 failed, 0 errors, avg 1.2 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-urgent-inbox | source_lookup | ❌ | 16567ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 2834ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 971ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 945ms | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 827ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 2834ms | email_operator: fail (1/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 1 < 4: The response is a tool-failure notice, not an email operator answer. It does not identify any emails, recipients, urgency, or action path, and it includes internal runtime/debug details instead of user-facing inbox handling. No thread evidence is provided, so it fails the source_lookup task. |
| realworld-urgent-inbox | source_lookup | ❌ | 16567ms | email_operator: fail (1/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 1 < 4: The answer does not inspect inbox content or identify any urgent email. It only reports a tool failure and internal debugging notes, so it fails the core task of separating urgent items from noise and providing actionable inbox guidance. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 945ms | email_operator: fail (1/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 1 < 4: The answer does not identify any important emails, does not separate urgent from normal, and provides only a tool failure explanation. It contains no inbox evidence, no thread summaries, no response recommendations, and no actionable judgment about what Brandon should do. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 827ms | email_operator: fail (1/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 1 < 4: The answer does not inspect Outlook content at all. It only reports a tool/runtime failure and a billing error, so it fails the core task of identifying what needs attention. There is no inbox triage, no urgency assessment, no owner/action mapping, and no evidence-backed recommendation for Brandon. |
| realworld-email-reply-triage | source_lookup | ❌ | 971ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | mustIncludeAny missing one of: "email", "reply", "received", "today", "no emails"; judge email_operator score 2 < 4: The assistant did not answer the user’s email question. It reported a tool/runtime failure and internal debugging notes instead of identifying today’s emails needing replies, prioritizing them, or recommending actions. No inbox evidence was provided. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The response is a tool-failure notice, not an email operator answer. It does not identify any emails, recipients, urgency, or action path, and it includes internal runtime/debug details instead of user-facing inbox handling. No thread evidence is provided, so it fails the source_lookup task.
- Weaknesses: Does not answer the user’s request to tell them the last five emails.; No separation of urgent vs normal inbox items because no emails are summarized.; No identification of who needs a response, why it matters, or consequences of ignoring anything.; No concrete recommendation such as reply, delegate, watch, draft, or ignore.; Includes internal failure/debug text that is not useful to Brandon and not a proper email summary.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The answer does not inspect inbox content or identify any urgent email. It only reports a tool failure and internal debugging notes, so it fails the core task of separating urgent items from noise and providing actionable inbox guidance.
- Weaknesses: No urgent vs normal inbox triage was performed.; No specific email, sender, or thread was identified as needing a response.; No explanation of why any item matters or what happens if ignored.; No concrete recommendation such as reply now, delegate, watch, draft, or ignore.; Includes internal failure/debug details rather than a user-facing inbox summary.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The answer does not identify any important emails, does not separate urgent from normal, and provides only a tool failure explanation. It contains no inbox evidence, no thread summaries, no response recommendations, and no actionable judgment about what Brandon should do.
- Weaknesses: Fails the core task: no emails are identified as important.; No separation of urgent/critical items from routine inbox noise.; No explanation of who needs a response, why it matters, or consequences of ignoring it.; No concise thread summary or concrete action path is provided.; Does not distinguish confirmed user-owned actions from mere inbox items.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 1 / 4 (fail)
- Summary: The answer does not inspect Outlook content at all. It only reports a tool/runtime failure and a billing error, so it fails the core task of identifying what needs attention. There is no inbox triage, no urgency assessment, no owner/action mapping, and no evidence-backed recommendation for Brandon.
- Weaknesses: Does not separate urgent/critical email from normal inbox noise.; Does not identify who needs a response, why it matters, or consequences of ignoring it.; Does not summarize any email threads because none were actually retrieved.; Does not recommend a concrete response path for any inbox item.; Does not provide a usable draft or practical next step for Brandon.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The assistant did not answer the user’s email question. It reported a tool/runtime failure and internal debugging notes instead of identifying today’s emails needing replies, prioritizing them, or recommending actions. No inbox evidence was provided.
- Weaknesses: Did not separate urgent/critical emails from normal inbox noise because no emails were actually summarized.; Did not identify who needs a response, why it matters, or consequences of ignoring anything.; Did not summarize any thread content efficiently; it only returned failure diagnostics.; Did not recommend a concrete response path such as reply now, delegate, watch, draft, or ignore.; Did not provide a draft or any Brandon-ready response.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `consultMicrosoftExecutiveAssistant` | 5 |

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
