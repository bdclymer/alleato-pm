# AI Assistant Eval Suite — 2026-06-09T10-06-51-220Z-cbc9b0c8

- Endpoint: `https://alleato-2jh3a338a-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 0
- Failed: 5
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 0 passed, 5 failed, 0 errors, avg 2.8 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 21308ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 15407ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 13654ms | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 10797ms | — |
| realworld-urgent-inbox | source_lookup | ❌ | 9543ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 21308ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer is a mixed inbox summary, but it does not fully satisfy the prompt asking for the last five emails. It includes some useful triage and one clear urgent client item, but it also invents or overstates details not supported by the prompt, and it adds extra items beyond the last five. It is not strong enough on evidence discipline or precise source lookup behavior. |
| realworld-urgent-inbox | source_lookup | ❌ | 9543ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify a few potentially urgent inbox items and gives some rationale, but it mixes confirmed urgency with speculative importance, includes items that may not be truly urgent, and does not clearly separate what Brandon/Megan must act on now versus what merely exists in the inbox. It also offers a draft without clearly tying it to a specific confirmed action owner, and some urgency judgments are not strongly evidence-backed. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 15407ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The response identifies several potentially important emails and gives basic priority guidance, but it overstates certainty in places, mixes inbox items with user-owned actions, and does not clearly separate confirmed facts from inferred importance. It is useful as a triage list, but not strong enough for a passing email-operator result. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 10797ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies some potentially important emails, but it mixes inbox triage with unsupported assumptions and invents or overstates details. It does not cleanly separate confirmed items from likely actions, and it includes a draft Teams escalation that is not clearly grounded in the prompt. The response is usable as a rough inbox summary, but not strong enough for a construction-business operator standard. |
| realworld-email-reply-triage | source_lookup | ❌ | 13654ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is useful and mostly grounded, but it overreaches in a few places and mixes confirmed inbox items with speculative urgency. It identifies several likely reply-needed emails and avoids claiming any email was sent, but it does not consistently separate urgent from normal, and some recommendations are not evidence-tight enough for a construction-business operator. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer is a mixed inbox summary, but it does not fully satisfy the prompt asking for the last five emails. It includes some useful triage and one clear urgent client item, but it also invents or overstates details not supported by the prompt, and it adds extra items beyond the last five. It is not strong enough on evidence discipline or precise source lookup behavior.
- Weaknesses: Does not cleanly answer the source lookup request with just the last five emails; it adds an extra Microsoft 365 quarantine notice beyond the five.; Introduces unsupported specifics such as 'Thursday afternoon' and 'roof penetration' urgency without showing evidence from the email content in the prompt.; Claims a recipient context ('for Megan') that is not grounded in the user prompt.; Does not clearly distinguish confirmed user-owned actions from merely interesting inbox items.; The phishing/quarantine judgment is weakly supported and partly speculative.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify a few potentially urgent inbox items and gives some rationale, but it mixes confirmed urgency with speculative importance, includes items that may not be truly urgent, and does not clearly separate what Brandon/Megan must act on now versus what merely exists in the inbox. It also offers a draft without clearly tying it to a specific confirmed action owner, and some urgency judgments are not strongly evidence-backed.
- Weaknesses: Does not clearly answer the user’s question in a concise inbox-priority format; it reads more like a task list than an urgency triage.; Includes several items as urgent or important without enough evidence that they require immediate action.; Fails to clearly distinguish confirmed user-owned actions from inbox items that merely exist or look interesting.; The security quarantine item is presented as urgent, but the answer does not explain the actual consequence or whether action is required now versus later.; The draft suggestion is not especially short/direct for Brandon review, and it introduces Megan without clarifying ownership.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The response identifies several potentially important emails and gives basic priority guidance, but it overstates certainty in places, mixes inbox items with user-owned actions, and does not clearly separate confirmed facts from inferred importance. It is useful as a triage list, but not strong enough for a passing email-operator result.
- Weaknesses: Does not clearly distinguish confirmed inbox facts from inferred business importance; several items are labeled high/medium without enough evidence.; Mixes inbox items with user-owned action recommendations in a way that blurs what actually exists versus what Brandon should do.; The thread summaries are somewhat verbose and include technical detail, but still do not clearly synthesize why each thread matters in one concise line.; The response says 'No true emergency, legal, or security incident is evident' even though the Perplexity sign-in could be suspicious; that judgment is too definitive for the evidence shown.; It does not explicitly identify who needs a response and what could happen if ignored for every item, especially the ERP summary and payment reminder.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies some potentially important emails, but it mixes inbox triage with unsupported assumptions and invents or overstates details. It does not cleanly separate confirmed items from likely actions, and it includes a draft Teams escalation that is not clearly grounded in the prompt. The response is usable as a rough inbox summary, but not strong enough for a construction-business operator standard.
- Weaknesses: Uses inconsistent naming ('Megan' vs. the mailbox owner bclymer@alleatogroup.com), which weakens ownership clarity.; States '5 needing attention' without clearly proving that count from the provided thread data.; Adds interpretation not present in the email content, such as 'likely needs review and reply' and 'may need action if syncing is part of current work.'; The ERP summary is treated as potentially actionable without evidence that the user owns ERP syncing responsibility.; The 'Sign in to Perplexity' item is labeled as likely login verification, which is plausible but not evidence-backed from the prompt alone.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is useful and mostly grounded, but it overreaches in a few places and mixes confirmed inbox items with speculative urgency. It identifies several likely reply-needed emails and avoids claiming any email was sent, but it does not consistently separate urgent from normal, and some recommendations are not evidence-tight enough for a construction-business operator.
- Weaknesses: Does not cleanly separate urgent/critical items from normal inbox items; the urgency section is mixed with non-urgent items and speculative escalation language.; Several items are labeled as needing reply based on weak evidence, such as internal handoffs or 'likely action' without a clear ask.; The answer blurs confirmed user-owned actions with inbox items that merely exist or look interesting, especially around internal threads and security notices.; Some thread summaries are thin and repetitive, and one item is duplicated as two separate Exol threads without clearly distinguishing the actual reply need.; The recommendation to escalate a quarantine/security notice is not well supported by the prompt and reads like unsupported certainty.

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
