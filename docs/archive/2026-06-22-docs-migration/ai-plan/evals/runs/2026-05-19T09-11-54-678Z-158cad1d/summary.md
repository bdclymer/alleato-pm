# AI Assistant Eval Suite — 2026-05-19T09-11-54-678Z-158cad1d

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 5
- Failed: 0
- Warnings: 6
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 0 failed, 0 errors, avg n/a (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ✅ | 40590ms | duration 40590ms exceeded warning budget 30000ms; judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-urgent-inbox | source_lookup | ✅ | 27460ms | judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-important-emails-this-morning | source_lookup | ✅ | 22759ms | judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-last-five-emails | source_lookup | ✅ | 15906ms | judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |
| realworld-email-reply-triage | source_lookup | ✅ | 11743ms | judge email_operator skipped: Judge disabled with AI_EVAL_JUDGE_ENABLED=false. |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 15906ms | email_operator: skipped (n/a/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-urgent-inbox | source_lookup | ✅ | 27460ms | email_operator: skipped (n/a/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 22759ms | email_operator: skipped (n/a/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 40590ms | email_operator: skipped (n/a/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-email-reply-triage | source_lookup | ✅ | 11743ms | email_operator: skipped (n/a/4) | 0 | consultMicrosoftExecutiveAssistant | — |

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
