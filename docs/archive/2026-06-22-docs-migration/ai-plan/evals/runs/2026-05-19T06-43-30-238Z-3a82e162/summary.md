# AI Assistant Eval Suite — 2026-05-19T06-43-30-238Z-3a82e162

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `email-operator-quality`
- Bundle description: LLM-judge eval for Brandon inbox monitoring, urgent email triage, morning/evening brief usefulness, and draft-readiness.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage|draft-email-response|brandon-email-critical-monitor|brandon-email-morning-brief|brandon-email-draft-like-brandon)$`
- Total: 9
- Passed: 3
- Failed: 6
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 9 judged, 3 passed, 6 failed, 0 errors, avg 3.11 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-email-reply-triage | source_lookup | ❌ | 32418ms | duration 32418ms exceeded warning budget 30000ms |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 24995ms | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 24028ms | — |
| realworld-draft-email-response | email_action | ❌ | 17741ms | duration 17741ms exceeded warning budget 15000ms |
| realworld-brandon-email-critical-monitor | source_lookup | ✅ | 17267ms | — |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 17246ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 13926ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 13873ms | — |
| realworld-urgent-inbox | source_lookup | ✅ | 13523ms | — |

## Bundle Criteria

- The assistant must use structured recent Outlook retrieval for inbox questions.
- The assistant must separate urgent response-needed email from normal inbox noise.
- The assistant must provide a concise executive brief suitable for Teams/morning/evening reporting.
- Draft requests must produce short, direct Brandon-style drafts or approval previews, never claim sent email.
- The answer must make the next action obvious: reply, draft, delegate, watch, or ignore.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 13873ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer does retrieve five recent emails and avoids claiming anything was sent, but it fails the core task quality standard because it invents or overstates thread details beyond the evidence and mixes a source lookup request with unsolicited analysis. It is useful as a rough inbox snapshot, not as a disciplined email-operator response. |
| realworld-urgent-inbox | source_lookup | ✅ | 13523ms | email_operator: pass (4/4) | 0 | getRecentEmails | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 13926ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The answer is useful as a stale-sync caveat plus a rough triage of recent emails, but it does not actually answer what important emails were received this morning. It relies on yesterday’s synced messages and includes several tentative judgments without enough evidence. It is cautious about not claiming a send, but it still leans on unsupported thread interpretations. |
| realworld-outlook-arrived-today | source_lookup | ✅ | 24028ms | email_operator: pass (4/4) | 0 | getRecentEmails | — |
| realworld-email-reply-triage | source_lookup | ❌ | 32418ms | email_operator: fail (2/4) | 0 | getRecentEmails | judge email_operator score 2 < 4: The answer partially triages the mailbox, but it does not reliably answer the prompt “emails from today that need a reply” because it leans on stale data and includes non-today items. It gives a reasonable urgency ranking and one concrete reply candidate, but several listed threads are from May 15-18 rather than today, and the response never clearly separates what is definitely from today versus what is from the last synced view. It also adds thread-color details that may be unsupported by the prompt, though it does not explicitly claim any email was sent. |
| realworld-draft-email-response | email_action | ❌ | 17741ms | email_operator: fail (2/4) | 0 | getRecentEmails, getRecentOutlookEmails, readOutlookEmailThread, draftOutlookEmail | judge email_operator score 2 < 4: The assistant produced a short draft, but it likely hallucinated thread details by naming Jon and referencing a meeting that may not be in the latest email. It also implied a draft would be saved only after confirmation, rather than clearly providing a ready-to-review draft. It does not demonstrate email triage or response-path judgment beyond the draft itself. |
| realworld-brandon-email-critical-monitor | source_lookup | ✅ | 17267ms | email_operator: pass (4/4) | 0 | getRecentEmails | — |
| realworld-brandon-email-morning-brief | source_lookup | ❌ | 17246ms | email_operator: fail (3/4) | 0 | getRecentEmails | judge email_operator score 3 < 4: The brief is organized and does separate reply/delegate/watch/ignore buckets, but it is not a true morning inbox pull because sync is stale. It includes concrete actions for several threads, yet it overstates confidence with invented-looking specifics in a few places and still mixes noise with the most important items without clearly prioritizing urgency. The strongest part is identifying Jon Knapp as the main personal-response item and calling out the sync caveat. |
| realworld-brandon-email-draft-like-brandon | email_action | ❌ | 24995ms | email_operator: fail (3/4) | 0 | getRecentEmails, readOutlookEmailThread, draftOutlookEmail | judge email_operator score 3 < 4: The answer identifies a plausible email to reply to and provides a concise draft, but it does not demonstrate strong evidence-based thread analysis. It also relies on unsupported claims about mailbox coverage and invents context by inferring details beyond what is shown. The draft is short and reviewable, but the assistant weakly handles urgency, impact, and thread specificity. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does retrieve five recent emails and avoids claiming anything was sent, but it fails the core task quality standard because it invents or overstates thread details beyond the evidence and mixes a source lookup request with unsolicited analysis. It is useful as a rough inbox snapshot, not as a disciplined email-operator response.
- Weaknesses: Invents or over-interprets thread content in several items (for example 'this has already been resolved,' 'appears to be restaurant-focused,' and 'clinic timing') without showing that those specifics came from the tool output.; Provides unnecessary meanings and workflow commentary when the user only asked for the last five emails.; Does not clearly distinguish thread subject lines from actual message contents.; No explicit handling of urgency or response need because the prompt was a simple lookup; the extra analysis is not tied to evidence.; Some thread summaries are too interpretive rather than factual, which lowers trustworthiness.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a decent job separating likely-important operational emails from obvious noise and avoids claiming a fire drill. It also flags that the inbox data is stale, which is a useful honesty check for urgency assessment. However, it stays somewhat generic about what immediate action to take, and several “important” items are only loosely justified. No invented sent-email claim appears.
- Weaknesses: Does not consistently identify who specifically needs a response and why beyond broad labels like invoice or vendor coordination.; Response-path recommendations are only partially concrete; most items are labeled watch/reply if, rather than being assigned a direct action.; Some urgency calls are weakly supported by evidence present in the prompt, especially around the operational importance of threads.; The stale-sync caveat is helpful, but it also reduces confidence in the urgency judgment without giving a stronger next-step prioritization.; Could be more direct for the operator use case: which single message should Brandon answer first, and what should he do with each item.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is useful as a stale-sync caveat plus a rough triage of recent emails, but it does not actually answer what important emails were received this morning. It relies on yesterday’s synced messages and includes several tentative judgments without enough evidence. It is cautious about not claiming a send, but it still leans on unsupported thread interpretations.
- Weaknesses: Fails the core task: it cannot identify important emails received this morning, only the latest synced emails from yesterday.; Several summaries add inferred context not present in the prompt, such as likely business impact or internal status, without evidence.; Does not consistently identify who needs a response and what happens if ignored for each item.; The thread summaries are sometimes too vague or speculative to be operationally useful.; No concrete response path is given for every item in a disciplined way; some recommendations are mixed or hedged.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a solid job separating stale/no-sync risk from the latest available inbox, and it gives a usable prioritized list with action calls. It does not claim to have sent anything. Main weakness: it includes multiple thread details that may be over-specific for a source lookup and it partially leans on inferred urgency rather than hard evidence for every item.
- Weaknesses: Some thread summaries add interpretive detail that may go beyond what is strictly supported by the visible excerpts.; The response is a bit verbose for a simple 'what needs my attention today' lookup.; It does not always explain clearly who specifically must respond on each thread or the consequence of ignoring it.; The urgency ranking is useful but somewhat subjective and not tied to hard deadlines in every case.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer partially triages the mailbox, but it does not reliably answer the prompt “emails from today that need a reply” because it leans on stale data and includes non-today items. It gives a reasonable urgency ranking and one concrete reply candidate, but several listed threads are from May 15-18 rather than today, and the response never clearly separates what is definitely from today versus what is from the last synced view. It also adds thread-color details that may be unsupported by the prompt, though it does not explicitly claim any email was sent.
- Weaknesses: Does not answer the prompt precisely: several examples are not clearly from today.; Includes unsupported or over-specific thread details that may exceed the evidence available.; Mixes urgent and non-urgent items without clearly isolating only the emails that need a reply today.; Does not clearly state who exactly needs a response for each item in a disciplined, evidence-based way.; Fails the practical requirement of focusing on the current-day inbox because the sync is stale and the answer does not cleanly restrict itself to synced data.

### realworld-draft-email-response

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The assistant produced a short draft, but it likely hallucinated thread details by naming Jon and referencing a meeting that may not be in the latest email. It also implied a draft would be saved only after confirmation, rather than clearly providing a ready-to-review draft. It does not demonstrate email triage or response-path judgment beyond the draft itself.
- Weaknesses: Invents or assumes thread details not evidenced in the prompt, such as 'Jon' and 'taking the time to meet.'; Does not separate urgent email from normal noise or explain why this message matters.; Does not identify the exact reason for the reply or consequences of ignoring it.; No explicit recommendation among reply now, delegate, watch, draft, or ignore beyond a vague draft offer.; The wording is generic and not clearly tailored to the latest message asking for an update.

### realworld-brandon-email-critical-monitor

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer correctly says no Teams alert is needed now and gives a usable triage of recent email activity into reply, delegate, watch, and ignore. It handles the sync cutoff honestly and avoids claiming any email was sent. The main limitation is that it leans on previews and inferred context, so the urgency judgments are only moderately evidenced. Still, it is specific enough for Brandon’s inbox monitoring use case and provides a concrete action path for each thread.
- Weaknesses: It never identifies a truly critical item because the synced mailbox view appears incomplete; the judgment is limited by missing data.; Some thread descriptions are based on previews and inference, so the justification for urgency is thin in places.; A few items labeled 'watch' may be more speculative than evidence-based, which weakens business judgment.; It does not strongly explain consequences if ignored for most threads beyond generic stale/coordination language.

### realworld-brandon-email-morning-brief

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The brief is organized and does separate reply/delegate/watch/ignore buckets, but it is not a true morning inbox pull because sync is stale. It includes concrete actions for several threads, yet it overstates confidence with invented-looking specifics in a few places and still mixes noise with the most important items without clearly prioritizing urgency. The strongest part is identifying Jon Knapp as the main personal-response item and calling out the sync caveat.
- Weaknesses: Does not strongly separate urgent/critical mail from normal noise; the true top priority is not unmistakably emphasized.; Some thread details feel over-specific for the available evidence, especially where the assistant infers ownership or status beyond the snippet.; The response-path recommendations are sometimes conditional or vague rather than concrete.; A few items are labeled as delegated/owned without enough evidence that Brandon actually needs no action.; The draft-request quality criterion is not really exercised, so there is no demonstration of a short, practical draft when needed.

### realworld-brandon-email-draft-like-brandon

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies a plausible email to reply to and provides a concise draft, but it does not demonstrate strong evidence-based thread analysis. It also relies on unsupported claims about mailbox coverage and invents context by inferring details beyond what is shown. The draft is short and reviewable, but the assistant weakly handles urgency, impact, and thread specificity.
- Weaknesses: Does not convincingly separate urgent/critical email from ordinary inbox noise; the reasoning is generic.; Fails to explain who specifically needs a response, why it matters, and what happens if ignored.; Uses unsupported claims like 'No synced rows are available' and 'latest available synced mailbox view' without evidence in the answer.; Invents or assumes thread details not present in the prompt, including broader operational context and follow-up handling.; Does not clearly recommend a concrete action path beyond drafting; the response path is implicit rather than explicit.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `getRecentEmails` | 9 |
| `readOutlookEmailThread` | 2 |
| `draftOutlookEmail` | 2 |
| `getRecentOutlookEmails` | 1 |

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
