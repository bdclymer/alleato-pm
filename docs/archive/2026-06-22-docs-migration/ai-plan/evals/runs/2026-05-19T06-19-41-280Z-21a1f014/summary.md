# AI Assistant Eval Suite — 2026-05-19T06-19-41-280Z-21a1f014

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `email-operator-quality`
- Bundle description: LLM-judge eval for Brandon inbox monitoring, urgent email triage, morning/evening brief usefulness, and draft-readiness.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage|draft-email-response|brandon-email-critical-monitor|brandon-email-morning-brief|brandon-email-draft-like-brandon)$`
- Total: 9
- Passed: 1
- Failed: 8
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 9 judged, 2 passed, 7 failed, 0 errors, avg 3.11 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-urgent-inbox | source_lookup | ❌ | 67663ms | duration 67663ms exceeded warning budget 30000ms |
| realworld-draft-email-response | email_action | ❌ | 17099ms | duration 17099ms exceeded warning budget 15000ms |
| realworld-brandon-email-critical-monitor | source_lookup | ❌ | 12807ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 12261ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 11334ms | — |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 10788ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 10243ms | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 9170ms | — |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 8142ms | — |

## Bundle Criteria

- The assistant must use structured recent Outlook retrieval for inbox questions.
- The assistant must separate urgent response-needed email from normal inbox noise.
- The assistant must provide a concise executive brief suitable for Teams/morning/evening reporting.
- Draft requests must produce short, direct Brandon-style drafts or approval previews, never claim sent email.
- The answer must make the next action obvious: reply, draft, delegate, watch, or ignore.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 12261ms | email_operator: fail (3/4) | 0 | getRecentEmails | getRecentEmails mailbox (missing) did not match required bclymer@alleatogroup.com; getRecentEmails missing sync cutoff or error evidence; judge email_operator score 3 < 4: The answer retrieves five recent emails and gives brief takeaways, but it does not fully satisfy the prompt or the rubric. It adds unsupported detail about Outlook sync timing and includes a claim (“have been resolved”) that may be plausible but is not clearly grounded in the visible prompt. It also does not distinguish urgent from non-urgent beyond light summarization, and it only partially addresses the email-operator goals. |
| realworld-urgent-inbox | source_lookup | ❌ | 67663ms | email_operator: pass (4/4) | 0 | getRecentEmails | getRecentEmails mailbox (missing) did not match required bclymer@alleatogroup.com; getRecentEmails missing sync cutoff or error evidence |
| realworld-important-emails-this-morning | source_lookup | ❌ | 11334ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is honest about source limits and avoids fabricating email content, but it does not actually identify important emails received this morning because it reports none verified. It provides a useful sync-status caveat and next-step options, but little inbox triage value for the prompt asked. |
| realworld-outlook-arrived-today | source_lookup | ✅ | 9170ms | email_operator: pass (4/4) | 0 | getRecentEmails | — |
| realworld-email-reply-triage | source_lookup | ❌ | 10243ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is cautious and does not fabricate a sent email, but it fails the core task: it does not actually identify any emails from today needing a reply. It treats lack of synced data as a generic sync issue instead of answering the user’s request from the available mailbox results. The response path is also weak because it offers tooling follow-up rather than classifying any email as reply/ignore/watch. There are no thread-specific details, which is appropriate only if none were found, but the answer does not clearly distinguish “no emails” from “no synced data.” |
| realworld-draft-email-response | email_action | ❌ | 17099ms | email_operator: fail (2/4) | 0 | getRecentEmails, draftOutlookEmail | judge email_operator score 2 < 4: The response identifies a likely thread, but it invents context (meeting yesterday, background, reconstruction/remediation) and is not clearly an update reply. It also asks for confirmation to save a draft instead of directly providing the draft, which is weak for the requested action. |
| realworld-brandon-email-critical-monitor | source_lookup | ❌ | 12807ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is cautious and avoids inventing urgency, but it does not fully satisfy the task because it cannot actually identify whether anything is critical enough for a Teams alert now. It also leans on sync-health diagnostics instead of delivering a concrete inbox-monitor decision from today's emails. No false claim of sending occurred, and it does handle stale-data uncertainty honestly. |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 10788ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is cautious and correctly flags stale sync risk, but it does not deliver a usable morning brief. It reports no visible emails without distinguishing confirmed inbox state from missing data, and it gives no concrete response/delegation recommendations because it found nothing. It also avoids inventing thread details, which is good, but overall it is too thin for an operator brief. |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 8142ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is cautious and avoids inventing a reply, but it does not complete the task. It focuses on sync staleness instead of identifying the most important email from today or drafting a response in Brandon’s voice. No concrete response path is recommended for an actual email, and it provides no thread-specific evidence because it claims there is nothing to flag. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer retrieves five recent emails and gives brief takeaways, but it does not fully satisfy the prompt or the rubric. It adds unsupported detail about Outlook sync timing and includes a claim (“have been resolved”) that may be plausible but is not clearly grounded in the visible prompt. It also does not distinguish urgent from non-urgent beyond light summarization, and it only partially addresses the email-operator goals.
- Weaknesses: The case prompt asked for the last five emails; the response goes beyond that with an unsupported note about sync cutoff time.; Does not separate urgent/critical messages from routine inbox items in any meaningful way.; Does not identify who needs a response, why it matters, or consequences of ignoring the emails.; No concrete action recommendation per email (reply now, delegate, watch, draft, ignore).; Thread summaries include some inference that may not be fully supported by the visible message snippet.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Good handling of urgency triage with an important caveat about stale inbox data. The answer separates likely-business-relevant threads from obvious noise, avoids claiming an email was sent, and does not invent details beyond the previews provided. It is somewhat weaker on concrete action-path guidance because it stops at “worth checking” rather than clearly recommending reply/delegate/watch for each item.
- Weaknesses: Does not clearly state who specifically needs a response on each urgent item.; Does not strongly articulate consequences if ignored beyond general business impact.; Only partially recommends concrete next steps; several items are described as 'worth checking' rather than reply now/delegate/watch/ignore.; Thread summaries are efficient but a bit generic for some items.; Could be more decisive on whether any item is truly urgent versus merely important.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is honest about source limits and avoids fabricating email content, but it does not actually identify important emails received this morning because it reports none verified. It provides a useful sync-status caveat and next-step options, but little inbox triage value for the prompt asked.
- Weaknesses: Fails the core task of separating important emails from noise because it reports no specific emails at all.; Does not identify who needs a response, why it matters, or what could happen if ignored.; No thread summary or concrete disposition of any actual email; only a null result.; Does not provide a draft, delegate, watch, or ignore recommendation for any message because none are surfaced.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer correctly avoids inventing email content and clearly separates verified inbox status from uncertainty caused by stale sync. It gives a concrete caveat and next-step options, but it does not identify any actual urgent sender/thread because none were visible in the synced data.
- Weaknesses: No urgent/critical email is actually identified, so dimension 1 is only partially demonstrated.; Does not name who would need a response, why it matters, or consequences if ignored because no messages were surfaced.; Does not provide a response path tied to a specific email thread, only general troubleshooting options.; This is more a system-status report than an email-operator triage answer.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is cautious and does not fabricate a sent email, but it fails the core task: it does not actually identify any emails from today needing a reply. It treats lack of synced data as a generic sync issue instead of answering the user’s request from the available mailbox results. The response path is also weak because it offers tooling follow-up rather than classifying any email as reply/ignore/watch. There are no thread-specific details, which is appropriate only if none were found, but the answer does not clearly distinguish “no emails” from “no synced data.”
- Weaknesses: Does not separate urgent emails from normal inbox noise because it does not identify any actual emails.; Does not identify who needs a response, why it matters, or the consequence of ignoring anything.; Does not summarize any thread or email because none are surfaced, despite the prompt asking for emails from today.; Does not recommend a concrete action for any email; it only suggests checking sync status or searching by topic.; Fails to provide a direct answer to the user’s request and appears to rely on stale sync status rather than current email evidence.

### realworld-draft-email-response

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The response identifies a likely thread, but it invents context (meeting yesterday, background, reconstruction/remediation) and is not clearly an update reply. It also asks for confirmation to save a draft instead of directly providing the draft, which is weak for the requested action.
- Weaknesses: Invents thread details not present in the prompt, including a meeting yesterday and specific background comments.; Does not clearly separate urgent or important email from inbox noise; it simply guesses at the latest message.; Fails to explain who needs a response, why it matters, or what happens if ignored.; Does not provide a concrete action path; it asks for confirmation instead of directly drafting for review.; The draft is generic and not clearly tailored to a simple update request.

### realworld-brandon-email-critical-monitor

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is cautious and avoids inventing urgency, but it does not fully satisfy the task because it cannot actually identify whether anything is critical enough for a Teams alert now. It also leans on sync-health diagnostics instead of delivering a concrete inbox-monitor decision from today's emails. No false claim of sending occurred, and it does handle stale-data uncertainty honestly.
- Weaknesses: Fails the main decision question: it does not clearly classify any item as critical vs. wait for evening brief because it found no emails in the stale feed.; No concrete response path for an actual email because none are summarized or assessed.; Does not identify who needs a response, why it matters, or consequences of ignoring any specific message.; No efficient thread summary because there were no thread details, but the answer does not compensate by clearly stating the monitoring limitation relative to today's inbox.; The recommendation drifts into system troubleshooting rather than inbox triage, which is off-target for Brandon's alert decision.

### realworld-brandon-email-morning-brief

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is cautious and correctly flags stale sync risk, but it does not deliver a usable morning brief. It reports no visible emails without distinguishing confirmed inbox state from missing data, and it gives no concrete response/delegation recommendations because it found nothing. It also avoids inventing thread details, which is good, but overall it is too thin for an operator brief.
- Weaknesses: Does not separate urgent/critical items from normal noise because it effectively says there are no items.; Does not identify who needs a response, why it matters, or consequences if ignored.; Does not summarize any threads efficiently because there were no thread details presented and no attempt to distinguish confirmed emptiness from incomplete sync.; Does not recommend a concrete action path for actual emails; everything is labeled as nothing to classify.; Fails the practical morning-brief goal by not giving Brandon a decision-oriented inbox triage.

### realworld-brandon-email-draft-like-brandon

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is cautious and avoids inventing a reply, but it does not complete the task. It focuses on sync staleness instead of identifying the most important email from today or drafting a response in Brandon’s voice. No concrete response path is recommended for an actual email, and it provides no thread-specific evidence because it claims there is nothing to flag.
- Weaknesses: Fails the core request: no identification of the most important email from today.; No draft response is provided.; Does not separate urgent email from normal noise because it says there is nothing actionable.; No response path is recommended for a real email (reply now, delegate, watch, draft, ignore).; The explanation is about mailbox sync status, not email importance or business impact.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `getRecentEmails` | 9 |
| `draftOutlookEmail` | 1 |

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
- `getRecentInvoices`
- `getRecentOutlookEmails`
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
- `readOutlookEmailThread`
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
