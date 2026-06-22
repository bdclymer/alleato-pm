# AI Assistant Eval Suite — 2026-06-09T10-57-53-167Z-c0e72df1

- Endpoint: `https://alleato-hub.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 5 failed, 0 errors, avg 2.6 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-urgent-inbox | source_lookup | ❌ | 41841ms | duration 41841ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ❌ | 18851ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 11737ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 8169ms | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 7052ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 11737ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer gives a plausible list of five recent emails, but it does not satisfy the prompt well as an inbox lookup. It mixes in response-path judgments that were not requested, provides no evidence-based urgency handling, and invents no thread detail but also fails to distinguish user-owned actions from mere inbox items. Overall it is a weak source lookup response with limited operational value. |
| realworld-urgent-inbox | source_lookup | ❌ | 41841ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does a decent job separating inbox items into urgency buckets and gives a concrete next-step order. However, it overstates certainty in a few places, repeats thread items without clearly consolidating them, and does not provide enough evidence for why some items are urgent versus merely present. It also misses the chance to distinguish confirmed user-owned actions from items that only look relevant. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 18851ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify a few potentially important emails and gives a basic response path, but it is too thin on evidence and thread handling. It does not clearly separate confirmed user-owned actions from merely interesting inbox items, and it makes unsupported judgments like saying an email “appears” to ask for a direct response without showing why. It also fails to summarize threads efficiently because it lists duplicate thread entries without explaining whether they are separate messages or one conversation. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 7052ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify a few likely action items and separates them from informational mail, but it is too thin on evidence and business impact. It also misses the strongest requirement for this task: clearly distinguishing what Brandon personally needs to do now versus what merely exists in the inbox. The response paths are mostly generic, and the justification for urgency or ignore decisions is not well supported by the message content shown. |
| realworld-email-reply-triage | source_lookup | ❌ | 8169ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer is concise and does identify a few emails that likely need replies, but it is weak on evidence, thread handling, and action specificity. It also duplicates the same thread twice without explaining whether these are separate messages or one conversation, and it does not distinguish confirmed user-owned actions from merely interesting inbox items. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer gives a plausible list of five recent emails, but it does not satisfy the prompt well as an inbox lookup. It mixes in response-path judgments that were not requested, provides no evidence-based urgency handling, and invents no thread detail but also fails to distinguish user-owned actions from mere inbox items. Overall it is a weak source lookup response with limited operational value.
- Weaknesses: Does not separate urgent/critical mail from normal inbox noise in a meaningful, evidence-backed way.; Does not explain who needs a response, why it matters, or consequences of ignoring.; Adds response-path labels without showing the basis for those judgments.; Does not distinguish confirmed user-owned actions from items that merely exist in the inbox.; Does not label suspicious/phishing/urgency judgments as evidence-based; 'Ignore' and 'Watch' are unsupported.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does a decent job separating inbox items into urgency buckets and gives a concrete next-step order. However, it overstates certainty in a few places, repeats thread items without clearly consolidating them, and does not provide enough evidence for why some items are urgent versus merely present. It also misses the chance to distinguish confirmed user-owned actions from items that only look relevant.
- Weaknesses: Does not clearly explain who specifically needs a response and what could happen if ignored for the urgent item.; Duplicates the same thread subject twice without efficiently summarizing the thread.; Some urgency judgments are weakly supported; 'explicit timing' and 'appears to be asking' are not enough evidence for strong prioritization.; Fails to clearly separate confirmed user-owned actions from inbox items that merely exist or may be relevant.; The 'Ignore/noise' label is sometimes used for items that may still deserve watchfulness, which blurs evidence-backed judgment.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify a few potentially important emails and gives a basic response path, but it is too thin on evidence and thread handling. It does not clearly separate confirmed user-owned actions from merely interesting inbox items, and it makes unsupported judgments like saying an email “appears” to ask for a direct response without showing why. It also fails to summarize threads efficiently because it lists duplicate thread entries without explaining whether they are separate messages or one conversation.
- Weaknesses: Does not explain who specifically needs a response, why it matters, or what happens if ignored beyond generic phrasing.; Lists duplicate thread subjects ('RE: Exol Morrisville PA') without clarifying whether these are separate emails or the same thread, which is weak thread summarization.; Uses unsupported certainty/soft certainty ('appears to be asking for a direct response') instead of evidence-backed reasoning.; Does not distinguish confirmed user-owned actions from inbox items that merely exist or look interesting.; The 'Ignore' recommendation for sign-in and digest emails is plausible but not explicitly evidence-backed from the content shown.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify a few likely action items and separates them from informational mail, but it is too thin on evidence and business impact. It also misses the strongest requirement for this task: clearly distinguishing what Brandon personally needs to do now versus what merely exists in the inbox. The response paths are mostly generic, and the justification for urgency or ignore decisions is not well supported by the message content shown.
- Weaknesses: Does not clearly explain who specifically needs to respond and what happens if ignored.; Uses vague reasoning like 'appears to be asking' without enough evidence-backed judgment.; Fails to distinguish confirmed user-owned actions from items that are merely present in the inbox.; Response recommendations are generic ('Reply', 'Watch', 'Ignore') rather than concrete and operational.; No draft language is provided for any item that might need Brandon to review and send.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer is concise and does identify a few emails that likely need replies, but it is weak on evidence, thread handling, and action specificity. It also duplicates the same thread twice without explaining whether these are separate messages or one conversation, and it does not distinguish confirmed user-owned actions from merely interesting inbox items.
- Weaknesses: Does not clearly separate urgent/critical email from normal inbox noise beyond a single label.; Fails to explain who specifically needs a response, why it matters, or what happens if ignored.; Duplicates 'RE: Exol Morrisville PA' without clarifying whether these are distinct messages or thread entries.; Does not summarize thread context efficiently; it only repeats subject/sender/time.; Recommendations are generic and not evidence-rich; 'appears to be asking for a direct response' is weak support.

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
