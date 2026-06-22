# AI Assistant Eval Suite — 2026-06-09T10-41-26-706Z-f1e1983e

- Endpoint: `https://alleato-hub.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 1
- Failed: 4
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 1 passed, 4 failed, 0 errors, avg 3 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ❌ | 52451ms | duration 52451ms exceeded warning budget 30000ms |
| realworld-email-reply-triage | source_lookup | ❌ | 32458ms | duration 32458ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16254ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 13272ms | — |
| realworld-urgent-inbox | source_lookup | ✅ | 10230ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 13272ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is mostly a mailbox listing with light triage, but it misses the core ask in a few ways: it does not clearly separate confirmed inbox items from speculative importance, it includes unsupported extra claims, and it introduces a name mismatch in the recommendation section. It does identify some urgent vs normal items and gives basic next-step guidance, but the evidence handling is not tight enough for a passing email-operator response. |
| realworld-urgent-inbox | source_lookup | ✅ | 10230ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16254ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer identifies a few potentially important emails, but it mixes inbox items with user actions, overstates certainty in places, and does not cleanly separate urgent items from routine noise. It also includes unsupported escalation/draft language and some thread details that are not clearly evidenced. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 52451ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is useful and mostly grounded, but it overreaches in a few places and mixes inbox triage with unsupported assumptions. It does separate urgent items from lower-priority noise and gives concrete next steps, but it also introduces a draft Teams escalation and approval framing that were not requested, and it does not clearly distinguish confirmed user-owned actions from merely interesting inbox items. The biggest issue is that it presents several judgments as if they are confirmed without enough evidence, especially around urgency and ownership. |
| realworld-email-reply-triage | source_lookup | ❌ | 32458ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify several likely reply-needed emails and gives some prioritization, but it is weakened by unsupported certainty, thread-detail inflation, and mixed-in items that are not clearly user-owned reply tasks. It also includes a security/quarantine item without enough evidence to classify it confidently, and it does not cleanly separate confirmed inbox items from inferred actions. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is mostly a mailbox listing with light triage, but it misses the core ask in a few ways: it does not clearly separate confirmed inbox items from speculative importance, it includes unsupported extra claims, and it introduces a name mismatch in the recommendation section. It does identify some urgent vs normal items and gives basic next-step guidance, but the evidence handling is not tight enough for a passing email-operator response.
- Weaknesses: Introduces unsupported details not present in the prompt, such as the Microsoft 365 quarantine notice and the claim that no Graph failure or stale context was detected.; Fails to clearly distinguish confirmed user-owned actions from inbox items that merely exist; the recommendation section shifts to 'Brandon' and 'Megan' inconsistently.; Does not explain who specifically needs a response and what could happen if ignored for each item in a disciplined way.; The 'last five emails' request is answered with a list, but the assistant adds extra operational commentary that is not grounded in the provided email data.; Suspicious/security labeling is not evidence-backed; the quarantine notice is mentioned as security-related without being part of the last five and without enough context.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does identify urgent items and gives a usable prioritization, with the ULTA deadline correctly treated as the clearest client-facing urgency. It also avoids claiming anything was sent. Main weaknesses are that it includes some speculative urgency framing (especially the investment/compliance email) without enough evidence, and it mixes inbox items with a Teams escalation draft that is not clearly separated from confirmed user-owned actions.
- Weaknesses: The 'Action Required: Welcome to Innovative Private Wealth' item is treated as potentially urgent/compliance-sensitive without enough evidence from the thread content shown.; The answer blends inbox assessment with a drafted Teams escalation, which is not clearly separated from the actual inbox findings.; It does not clearly distinguish confirmed user-owned actions from items that merely exist in the inbox; the 'Recommended next steps for Megan' section is especially confusing because Megan is not the inbox owner.; The urgency labels are somewhat broad and could overstate certainty for the quarantine and investment emails.; It does not explicitly classify some items as 'watch' versus 'ignore' with strong evidence-backed rationale.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer identifies a few potentially important emails, but it mixes inbox items with user actions, overstates certainty in places, and does not cleanly separate urgent items from routine noise. It also includes unsupported escalation/draft language and some thread details that are not clearly evidenced.
- Weaknesses: Does not clearly separate confirmed user-owned actions from items that merely exist in the inbox; it turns inbox content into recommended actions without distinguishing ownership.; Uses unsupported certainty in places, e.g. 'This looks operationally important' and 'likely non-client' without enough evidence.; Thread summaries are somewhat compressed but still include extra detail and speculative interpretation rather than a clean executive summary.; The 'Teams escalation draft prepared for Megan' is not clearly tied to a user-owned action and risks implying workflow state not evidenced by the email data.; The answer does not robustly distinguish urgent/critical from normal noise; it lists several low-priority items alongside important ones without a strong triage hierarchy.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is useful and mostly grounded, but it overreaches in a few places and mixes inbox triage with unsupported assumptions. It does separate urgent items from lower-priority noise and gives concrete next steps, but it also introduces a draft Teams escalation and approval framing that were not requested, and it does not clearly distinguish confirmed user-owned actions from merely interesting inbox items. The biggest issue is that it presents several judgments as if they are confirmed without enough evidence, especially around urgency and ownership.
- Weaknesses: Does not clearly separate confirmed user-owned actions from items that merely exist in the inbox.; The draft Teams message is not clearly tied to a user request and adds an extra workflow step.; Some urgency judgments are stated too confidently relative to the evidence shown.; The response mixes inbox triage with approval language ('Approval to draft/send') that was not asked for.; A few items are labeled as needing attention without enough explanation of who specifically must act and what happens if ignored.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify several likely reply-needed emails and gives some prioritization, but it is weakened by unsupported certainty, thread-detail inflation, and mixed-in items that are not clearly user-owned reply tasks. It also includes a security/quarantine item without enough evidence to classify it confidently, and it does not cleanly separate confirmed inbox items from inferred actions.
- Weaknesses: Uses unsupported certainty in places like 'This looks like a clear reply needed' and 'Reply appears needed' without showing enough evidence from the thread.; Invents or overstates thread details not clearly present, such as 'follow-up at 02:20 UTC' and specific scope alignment implications.; Does not consistently distinguish confirmed user-owned reply obligations from merely interesting inbox items; the quarantine and investment emails are more speculative.; The response path is not consistently concrete per item; it mixes reply, review, escalation, and watch without clearly recommending one action for each email.; The draft-request criterion is not really tested, but the answer does not provide short practical draft language either.

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
