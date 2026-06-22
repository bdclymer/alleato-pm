# AI Assistant Eval Suite — 2026-06-09T10-49-09-836Z-7b0ff65b

- Endpoint: `https://alleato-hub.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 2
- Failed: 3
- Warnings: 3
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 2 passed, 3 failed, 0 errors, avg 3 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-email-reply-triage | source_lookup | ❌ | 40314ms | duration 40314ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ✅ | 37944ms | duration 37944ms exceeded warning budget 30000ms |
| realworld-outlook-arrived-today | source_lookup | ❌ | 36608ms | duration 36608ms exceeded warning budget 30000ms |
| realworld-urgent-inbox | source_lookup | ✅ | 14642ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 10686ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 10686ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The response lists five recent emails, but it mixes in unsupported urgency claims, invents thread details not shown in the email list, and includes irrelevant operational commentary. It does not cleanly separate confirmed inbox items from inferred actions, and it fails the evidence standard for a source lookup request. |
| realworld-urgent-inbox | source_lookup | ✅ | 14642ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 37944ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 36608ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several inbox items and gives some urgency cues, but it overstates certainty, mixes verified items with speculative importance, and does not cleanly separate what needs a response from what merely exists. It also includes a draft-like escalation without clearly tying it to a concrete response path for each item. The security item is handled cautiously, but overall the response is too generic and not evidence-tight enough for a construction-business inbox operator. |
| realworld-email-reply-triage | source_lookup | ❌ | 40314ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer identifies several likely reply-needed emails, but it overstates certainty, mixes inbox items with confirmed action items, and includes unsupported thread details and speculative urgency labels. It does not cleanly separate what Brandon/Megan actually needs to do from what merely exists in the inbox. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The response lists five recent emails, but it mixes in unsupported urgency claims, invents thread details not shown in the email list, and includes irrelevant operational commentary. It does not cleanly separate confirmed inbox items from inferred actions, and it fails the evidence standard for a source lookup request.
- Weaknesses: Invents thread content not present in the listed emails, such as Walter Allen asking to confirm roof penetration by Thursday afternoon.; Introduces a Microsoft 365 quarantine notice that is not one of the five emails shown, creating confusion between inbox items and other system alerts.; Uses the wrong recipient name ('Megan') in next steps, which suggests template leakage and weak evidence handling.; Adds urgency judgments without showing the underlying email content, so the recommendations are not well supported.; Fails to clearly distinguish confirmed user-owned actions from merely observed inbox items.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a decent job separating urgent items from routine inbox noise and gives concrete next steps. It is strongest on security/quarantine, payment timing, and client urgency. It also avoids claiming any email was sent. Main weaknesses are some unsupported urgency framing and a few thread details that may be inferred rather than fully evidenced from the preview.
- Weaknesses: Some urgency judgments are a bit speculative, especially 'could be financial / investor-related' without stronger evidence.; The 'RE: ULTA update needed' item includes a specific deadline and roof penetration detail that may be too detailed if not directly supported by the preview.; Does not clearly distinguish which items are confirmed user-owned obligations versus merely interesting inbox items in a structured way.; The response mentions 'Teams escalation draft' even though the prompt only asks whether anything urgent is in the inbox; this is slightly off-target.; Could be more explicit about whether each item should be replied to now, delegated, watched, or ignored.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Good inbox triage with concrete actions and clear separation of urgent items from routine notices. It identifies likely response owners and gives practical next steps, but it includes some unsupported certainty and a few thread details that are more verbose than necessary.
- Weaknesses: Some thread details may be over-specific relative to the prompt, especially around the Exol and pay app messages.; The phrase 'phish message held in quarantine' is a bit stronger than the evidence shown; it should be framed as a suspected or quarantined phishing item.; The response mixes inbox summary with operational recommendations for Megan, which is slightly less clean than a pure morning-email answer.; Could be tighter on thread summarization; a few bullets read like raw message paraphrase rather than executive triage.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several inbox items and gives some urgency cues, but it overstates certainty, mixes verified items with speculative importance, and does not cleanly separate what needs a response from what merely exists. It also includes a draft-like escalation without clearly tying it to a concrete response path for each item. The security item is handled cautiously, but overall the response is too generic and not evidence-tight enough for a construction-business inbox operator.
- Weaknesses: Does not clearly separate urgent/critical items from normal inbox noise; several items are labeled important without strong evidence.; Fails to identify who specifically needs to respond for each item and what happens if ignored.; Summaries are still somewhat dumpy and repetitive, especially for the Exol thread cluster.; Concrete response paths are inconsistent; some items are marked urgent or follow-up without a clear reply/delegate/watch/draft/ignore recommendation.; The draft text is not clearly framed as a short, practical email for Brandon to review and send; it is more of an escalation note.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer identifies several likely reply-needed emails, but it overstates certainty, mixes inbox items with confirmed action items, and includes unsupported thread details and speculative urgency labels. It does not cleanly separate what Brandon/Megan actually needs to do from what merely exists in the inbox.
- Weaknesses: It does not clearly separate urgent/critical items from normal inbox noise with evidence-based criteria; several urgency labels are speculative.; It invents or overstates thread context in places (for example, implying open budget/proposal coordination or substantive project response items without showing the underlying evidence).; It does not consistently identify who specifically needs to respond, why it matters, and what could happen if ignored.; The thread summaries are somewhat verbose and occasionally drift into raw-detail style instead of concise operational summaries.; It does not provide a concrete response path for each item (reply now, delegate, watch, draft, ignore) in a disciplined way.

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
