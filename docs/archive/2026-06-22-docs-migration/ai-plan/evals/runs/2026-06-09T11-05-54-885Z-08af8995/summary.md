# AI Assistant Eval Suite — 2026-06-09T11-05-54-885Z-08af8995

- Endpoint: `https://alleato-hub.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 5 failed, 0 errors, avg 2.6 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ❌ | 29160ms | — |
| realworld-urgent-inbox | source_lookup | ❌ | 12185ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 11691ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 8015ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 7369ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 7369ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer lists five recent emails and gives a response path for each, but it does not fully satisfy the rubric because it mixes inbox items with user-owned obligations, includes unsupported judgments, and fails to clearly separate urgent/critical items from routine noise. It also does not explain who specifically needs a response and what happens if ignored in a business-useful way. |
| realworld-urgent-inbox | source_lookup | ❌ | 12185ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The triage is mostly structured and does identify one likely urgent item, but it mixes urgency with generic inbox categorization and contains several unsupported or inconsistent judgments. It also fails to clearly separate confirmed user-owned actions from merely interesting inbox items, and some recommendations are not well evidenced. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 11691ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several morning emails and gives a basic action path, but it mixes important items with low-value notifications, overstates urgency in places, and does not clearly separate confirmed user-owned actions from merely interesting inbox items. It also lacks strong evidence-based prioritization and thread summarization. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 29160ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does separate some actionable emails from informational ones and gives a response path for each. However, it includes weak evidence handling, overstates urgency in places, and does not clearly distinguish confirmed user-owned actions from merely interesting inbox items. It also uses generic reasoning for several items instead of showing why they matter or what happens if ignored. |
| realworld-email-reply-triage | source_lookup | ❌ | 8015ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer identifies a few emails that may need attention, but it does not reliably separate urgent from normal, and it overstates certainty from thin evidence. It also fails the prompt by not clearly showing only emails from today that need a reply, and it includes a delegate item rather than focusing on reply-needed mail. The thread summaries are minimal and mostly generic, with no clear explanation of impact if ignored. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer lists five recent emails and gives a response path for each, but it does not fully satisfy the rubric because it mixes inbox items with user-owned obligations, includes unsupported judgments, and fails to clearly separate urgent/critical items from routine noise. It also does not explain who specifically needs a response and what happens if ignored in a business-useful way.
- Weaknesses: Does not clearly separate urgent/critical emails from normal inbox noise; the ranking is mostly chronological, not operationally prioritized.; Fails to identify who needs a response, why it matters, and the consequence of ignoring each item.; Summaries are thin and sometimes just quote raw email text instead of synthesizing the thread.; Several response-path recommendations are unsupported or questionable, especially 'Reply now' for a terse acknowledgment and 'Watch' for a payment reminder without explaining the risk.; Does not separate confirmed user-owned actions from merely interesting inbox items; the payment reminder is a user obligation, while the ERP summary and sign-in email are inbox noise.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The triage is mostly structured and does identify one likely urgent item, but it mixes urgency with generic inbox categorization and contains several unsupported or inconsistent judgments. It also fails to clearly separate confirmed user-owned actions from merely interesting inbox items, and some recommendations are not well evidenced.
- Weaknesses: Urgency is not consistently evidence-backed; several items are labeled Watch/Ignore/Delegate without enough proof from the quoted text.; Does not clearly identify who specifically needs a response and what happens if ignored for most items.; Thread summaries are uneven and sometimes rely on vague phrases like 'looks like' or 'appears to be asking' without concrete consequences.; The same subject ('Exol Morrisville PA') is split across Reply and Delegate, which is confusing and weakens ownership clarity.; Some recommendations are not concrete enough for Brandon to act on immediately, especially for watch/delegate items.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several morning emails and gives a basic action path, but it mixes important items with low-value notifications, overstates urgency in places, and does not clearly separate confirmed user-owned actions from merely interesting inbox items. It also lacks strong evidence-based prioritization and thread summarization.
- Weaknesses: Does not clearly distinguish truly urgent/critical emails from routine inbox noise; several low-value items are presented alongside important ones.; Fails to explain who specifically needs to respond in a business-useful way for each item and what happens if ignored.; Thread summaries are thin and sometimes rely on vague phrasing rather than concise business context.; Some recommendations are under-justified or generic, especially 'Ignore' and 'Watch' labels.; Does not clearly separate confirmed user-owned actions from emails that merely exist in the inbox.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does separate some actionable emails from informational ones and gives a response path for each. However, it includes weak evidence handling, overstates urgency in places, and does not clearly distinguish confirmed user-owned actions from merely interesting inbox items. It also uses generic reasoning for several items instead of showing why they matter or what happens if ignored.
- Weaknesses: Does not clearly identify the consequence of ignoring each actionable email.; Several judgments are unsupported or too generic, especially 'Reply now' and 'Delegate.'; Does not clearly separate confirmed user-owned actions from items that merely exist in the inbox.; Thread summary is thin and sometimes just repeats subject lines without efficient context.; No explicit handling of suspicious/phishing beyond a generic sign-in note; evidence-backed caution is limited.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer identifies a few emails that may need attention, but it does not reliably separate urgent from normal, and it overstates certainty from thin evidence. It also fails the prompt by not clearly showing only emails from today that need a reply, and it includes a delegate item rather than focusing on reply-needed mail. The thread summaries are minimal and mostly generic, with no clear explanation of impact if ignored.
- Weaknesses: Urgency is asserted without strong evidence; 'Alert now' is not well supported.; It does not clearly distinguish confirmed reply-needed emails from merely interesting inbox items.; It includes a delegate recommendation even though the user asked for emails that need a reply.; The evidence snippets are too thin to justify the conclusions, especially for urgency and reply need.; It does not explain who specifically needs to respond or what could happen if ignored.

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
