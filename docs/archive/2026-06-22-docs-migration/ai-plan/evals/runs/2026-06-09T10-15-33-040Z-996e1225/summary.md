# AI Assistant Eval Suite — 2026-06-09T10-15-33-040Z-996e1225

- Endpoint: `https://alleato-7zuy7irsw-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 1
- Failed: 4
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 1 passed, 4 failed, 0 errors, avg 3.2 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-urgent-inbox | source_lookup | ❌ | 43052ms | duration 43052ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16223ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 11570ms | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 11557ms | — |
| realworld-last-five-emails | source_lookup | ✅ | 10181ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 10181ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-urgent-inbox | source_lookup | ❌ | 43052ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies some potentially urgent items and avoids claiming messages were sent, but it is too generic on impact, mixes confirmed inbox items with speculative urgency, and includes a draft that is not clearly tied to a user-owned action. It also does not strongly separate evidence-backed urgency from unsupported judgment, especially for the security notice, spend limit, and payment reminder. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16223ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify a likely priority email (ULTA) and separates some lower-priority items, but it overstates certainty in places, includes unsupported thread details, and does not clearly distinguish confirmed inbox facts from inferred importance. It is useful as a triage list, but not strong enough to pass the rubric. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 11557ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several actionable inbox items and gives some prioritization, but it is too generic on response paths, mixes confirmed inbox items with speculative urgency, and includes unsupported claims about security/phishing and capability status. It also does not clearly separate what Megan/Brandon must do versus what merely exists in the inbox. |
| realworld-email-reply-triage | source_lookup | ❌ | 11570ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several likely reply-needed emails and gives basic reasons and suggested actions, but it mixes in non-email items, overstates certainty in places, and includes inbox items that are not clearly reply requests. It also fails to cleanly separate urgent customer emails from informational or internal items, and it invents or infers details beyond what is evidenced in the prompt. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Good inbox triage with clear separation of urgent items, normal notifications, and likely ignorable messages. It identifies likely response needs and gives concrete next steps, but it also includes some unsupported assumptions and a few thread details that may not be fully evidenced by the prompt alone.
- Weaknesses: Uses a name not present in the prompt ('Megan') instead of the likely user identity, which is an unsupported detail.; States 'Live Outlook inbox read succeeded' and 'No Microsoft capability was blocked' as capability claims that are not directly verifiable from the answer text alone.; The 'urgent items worth attention' section is mostly reasonable, but the Perplexity login being 'likely expired now' is an inference that should be labeled as such.; Some recommendations blur confirmed user-owned actions versus inbox items that merely exist, especially the payment reminder and project follow-up.; Does not explicitly flag suspicious/phishing risk for the login email, even though that would be an evidence-backed judgment worth noting.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies some potentially urgent items and avoids claiming messages were sent, but it is too generic on impact, mixes confirmed inbox items with speculative urgency, and includes a draft that is not clearly tied to a user-owned action. It also does not strongly separate evidence-backed urgency from unsupported judgment, especially for the security notice, spend limit, and payment reminder.
- Weaknesses: Does not clearly explain who specifically needs to respond for each item and what happens if ignored.; Uses urgency labels like 'high' and 'medium-high' without enough evidence from the snippets for several items.; Summaries are somewhat efficient, but the response still reads like a list of inbox subjects rather than a judgment of what Brandon/Megan must do now.; Fails to clearly distinguish confirmed user-owned actions from items that merely exist in the inbox, especially for the security notice and financial reminders.; The phishing/security judgment is not evidence-backed; it assumes urgency from quarantine language without stating why it is actionable now.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify a likely priority email (ULTA) and separates some lower-priority items, but it overstates certainty in places, includes unsupported thread details, and does not clearly distinguish confirmed inbox facts from inferred importance. It is useful as a triage list, but not strong enough to pass the rubric.
- Weaknesses: Invents or over-specifies thread details not present in the prompt, such as roof penetration, MDF room sprinkler/fire suppression, anti-static VCT floor, UPS power requirements, and cost/scope alignment, without showing evidence from the email content.; Does not clearly distinguish confirmed inbox facts from inferred importance; several 'why it matters' statements are judgments presented as if established.; Fails to explicitly identify who needs a response and what could happen if ignored for each important email.; The recommendation path is only partially concrete; it suggests review/ignore but does not consistently label reply now, delegate, watch, draft, or ignore for each item.; The draft offer is generic and not actually a short practical draft for Brandon to review.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several actionable inbox items and gives some prioritization, but it is too generic on response paths, mixes confirmed inbox items with speculative urgency, and includes unsupported claims about security/phishing and capability status. It also does not clearly separate what Megan/Brandon must do versus what merely exists in the inbox.
- Weaknesses: Does not clearly recommend a concrete response path for each item (reply now, delegate, watch, draft, ignore).; Uses unsupported urgency language for the quarantine item by calling it a security follow-up and 'phish' without evidence shown in the answer.; Does not clearly distinguish confirmed user-owned actions from inbox items that merely exist or may be interesting.; Thread summaries are somewhat verbose and include raw-ish detail rather than concise operational summaries.; Fails to state who specifically needs a response and the consequence of ignoring each item in a disciplined way.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several likely reply-needed emails and gives basic reasons and suggested actions, but it mixes in non-email items, overstates certainty in places, and includes inbox items that are not clearly reply requests. It also fails to cleanly separate urgent customer emails from informational or internal items, and it invents or infers details beyond what is evidenced in the prompt.
- Weaknesses: Does not cleanly separate urgent/critical emails from normal inbox noise; several low-value or informational items are mixed into the reply-needed list.; Includes non-email or non-reply items such as a self note, Microsoft quarantine notice, and a spend-limit alert, which weakens relevance to the user’s request.; Uses unsupported certainty in places, e.g. 'likely needs a reply' and inferred project context without enough evidence.; Thread summaries are sometimes vague and partially speculative, such as 'likely needs acknowledgment' or 'project delivery item,' without concrete thread evidence.; Fails to clearly distinguish confirmed user-owned actions from inbox items that merely exist or look interesting.

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
