# AI Assistant Eval Suite — 2026-06-27T05-02-53-708Z-409e073e

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 5
- Failed: 0
- Warnings: 0
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 5 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ✅ | 22556ms | — |
| realworld-email-reply-triage | source_lookup | ✅ | 14644ms | — |
| realworld-last-five-emails | source_lookup | ✅ | 14208ms | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 13113ms | — |
| realworld-urgent-inbox | source_lookup | ✅ | 8561ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 14208ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-urgent-inbox | source_lookup | ✅ | 8561ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 13113ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-outlook-arrived-today | source_lookup | ✅ | 22556ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-email-reply-triage | source_lookup | ✅ | 14644ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Good source lookup with concrete thread-level summaries, response-path recommendations, and cautious handling of ownership/urgency. It does not invent sent mail or hidden details, and it flags security items as watch-worthy rather than certain threats. Main weakness: the prompt asks for the last five emails, and the answer adds interpretive labels that are plausible but sometimes overstated relative to the limited inbox row evidence.
- Weaknesses: For a pure 'last five emails' request, response-path commentary is more than necessary and may distract from retrieval.; Some judgments are only weakly supported by the provided row data, especially 'potential construction risk' and 'reply candidate'.; No explicit acknowledgement of whether these are unread, starred, or sent items; it assumes inbox ordering without stating that clearly.; Security items are labeled 'Watch' rather than a more direct 'reply now' or 'ignore', but the recommendation is still reasonable and cautious.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Mostly strong triage. It clearly separates reply/watch/ignore buckets, avoids claiming a sent email, and flags user-owned action as unconfirmed. The main gap is that it does not explicitly isolate a true urgent/critical item; the answer says no confirmed urgent action was proven, but still buries potentially urgent security items in Watch instead of stating whether anything is time-sensitive right now.
- Weaknesses: Does not clearly answer the user’s core question with a crisp urgent/critical yes-no; it implies no confirmed urgent action but then lists several potentially urgent watch items without prioritization.; The response path recommendations are a bit generic; for an inbox triage question, it should distinguish what needs immediate attention today versus what can wait.; Some thread summaries are thin and repetitive, relying on template language instead of concise business relevance.; The urgent/security judgments are cautious, but not always sharply explained in terms of impact if ignored; for example, the Vercel login code and new sign-in deserve clearer urgency framing if unexpected.; The final next-step section is generic and not tied to the actual high-priority items identified.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a solid job separating a likely reply-needed email from a watch item, explains why each matters, and gives concrete next-step guidance. It also avoids claiming anything was sent and flags ownership uncertainty. The main weakness is that the response is somewhat repetitive and the urgency assessment is conservative rather than strongly evidence-backed, but it meets the minimum bar.
- Weaknesses: Does not clearly identify whether the 'Maintenance needed Westfield' thread is truly urgent versus merely reply-worthy.; The ownership language is cautious but repetitive, which reduces usefulness.; Could better prioritize which item is most important this morning and why.; The evidence-backed judgment on risk is decent, but the phrasing is still somewhat generic for a construction-business workflow.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Mostly strong Outlook triage. It separates a likely reply candidate from watch items, avoids claiming anything was sent, and flags ownership uncertainty. The main weakness is limited evidence handling on urgency/criticality and slightly overconfident watch labels for the construction thread.
- Weaknesses: Does not clearly distinguish urgent/critical email from ordinary noise beyond broad categories; nothing is explicitly marked urgent.; The construction thread is labeled as a watch item with risk language, but the evidence for why Brandon specifically needs to act is thin.; The GitHub notice is treated as a watch item, but the response path could be more explicitly tied to whether it is expected vs unexpected.; Draft guidance is not exercised here, so dimension 5 cannot be strongly validated from this sample.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer correctly separated one likely reply candidate from watch/no-reply items and avoided claiming a sent email or inventing thread details. It also flagged uncertainty about ownership, which is good evidence handling. The main weakness is that it did not clearly surface urgency/criticality and the recommendation language was a bit generic for a construction-business inbox triage assistant.
- Weaknesses: Did not strongly distinguish urgent/critical emails from normal inbox noise.; Did not clearly explain who specifically needs a response in operational terms or what business impact could follow if ignored.; The response-path recommendation is reasonable but not deeply evidenced beyond a generic reply-thread indicator.; The 'watch' and 'noise' categories are present, but the logic behind them is thin and somewhat formulaic.; Could be more direct about whether Brandon should act now versus delegate or ignore based on actual evidence.

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
