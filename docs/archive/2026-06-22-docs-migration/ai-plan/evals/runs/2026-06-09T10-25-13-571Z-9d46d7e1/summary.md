# AI Assistant Eval Suite — 2026-06-09T10-25-13-571Z-9d46d7e1

- Endpoint: `https://alleato-5djhpcrk9-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 2
- Failed: 3
- Warnings: 3
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 2 passed, 3 failed, 0 errors, avg 3.4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ❌ | 46875ms | duration 46875ms exceeded warning budget 30000ms |
| realworld-urgent-inbox | source_lookup | ✅ | 46623ms | duration 46623ms exceeded warning budget 30000ms |
| realworld-email-reply-triage | source_lookup | ✅ | 36889ms | duration 36889ms exceeded warning budget 30000ms |
| realworld-last-five-emails | source_lookup | ❌ | 25051ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 15446ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 25051ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is useful as a mailbox snapshot, but it does not fully satisfy the operator rubric. It separates some urgent items from FYI, and it avoids claiming any email was sent. However, it does not clearly identify who needs a response and why for each item, it mixes in unsupported escalation/security commentary, and it fails the requested user-facing framing for “my last five emails” by adding extra judgment and a broader inbox note not in the last-five list. |
| realworld-urgent-inbox | source_lookup | ✅ | 46623ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 15446ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is useful and mostly grounded, but it mixes inbox items from yesterday with "this morning," overstates urgency in places, and does not clearly separate confirmed user-owned actions from merely interesting emails. It also gives some evidence-based prioritization, but not consistently enough to meet the passing threshold. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 46875ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several inbox items and gives basic next-step suggestions, but it is too generic for a construction-business email operator. It does not clearly separate confirmed urgent items from routine noise, and it includes some unsupported interpretation (for example, calling the ERP summary worth review without showing why it matters). It also does not provide a concrete response path for each item in a disciplined way, and it mixes inbox items with action recommendations without clearly distinguishing owned actions from merely observed messages. |
| realworld-email-reply-triage | source_lookup | ✅ | 36889ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is useful as a mailbox snapshot, but it does not fully satisfy the operator rubric. It separates some urgent items from FYI, and it avoids claiming any email was sent. However, it does not clearly identify who needs a response and why for each item, it mixes in unsupported escalation/security commentary, and it fails the requested user-facing framing for “my last five emails” by adding extra judgment and a broader inbox note not in the last-five list.
- Weaknesses: Does not clearly state for each email who needs a response, why it matters, and what happens if ignored.; Adds a broader inbox security note that is outside the last five, which blurs the requested scope.; Uses some unsupported certainty in the escalation/security commentary without showing evidence from the thread content.; Does not explicitly classify each item into reply now, delegate, watch, draft, or ignore.; The response is more of a mailbox digest than an operator-quality triage recommendation.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer identifies one urgent inbox item and distinguishes it from routine mail and a security notice. It gives a plausible reason for urgency and avoids claiming any message was sent. Main weakness: it overstates certainty in places and includes some unsupported operational detail (for example, a drafted Teams escalation) that is not directly tied to the user’s question.
- Weaknesses: Does not clearly state who specifically needs to respond or what happens if the urgent item is ignored.; Thread summaries are somewhat thin and include extra operational detail not needed for the question.; The phrase 'one clear urgent inbox item' is stronger than the evidence shown; urgency is inferred from the deadline language.; The 'drafted a Teams message' detail is not necessary and may imply more action than the user asked for.; Does not explicitly separate confirmed user-owned actions from merely observed inbox items as cleanly as it could.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is useful and mostly grounded, but it mixes inbox items from yesterday with "this morning," overstates urgency in places, and does not clearly separate confirmed user-owned actions from merely interesting emails. It also gives some evidence-based prioritization, but not consistently enough to meet the passing threshold.
- Weaknesses: Fails the time filter: includes multiple emails received yesterday evening, not just this morning.; Does not clearly separate confirmed inbox items from actions Brandon/Megan actually owns versus items that merely exist.; Some urgency labels are asserted without enough evidence, especially for several project emails marked High or Medium-High.; The quarantine item is treated as a security issue, but the answer does not explain whether it is confirmed phishing, routine quarantine, or just a notice.; The response path is not consistently specified per item; several entries lack a clear reply/delegate/watch/ignore recommendation.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several inbox items and gives basic next-step suggestions, but it is too generic for a construction-business email operator. It does not clearly separate confirmed urgent items from routine noise, and it includes some unsupported interpretation (for example, calling the ERP summary worth review without showing why it matters). It also does not provide a concrete response path for each item in a disciplined way, and it mixes inbox items with action recommendations without clearly distinguishing owned actions from merely observed messages.
- Weaknesses: Urgency is not sharply separated from normal inbox noise; all four items are presented with similar weight.; It does not clearly state who specifically needs to respond for each item and what happens if ignored.; The response-path guidance is incomplete; it suggests next steps but does not consistently classify each item as reply now, delegate, watch, draft, or ignore.; The ERP integrations item is treated as worth review without evidence of operational impact.; The payment reminder is mentioned, but the consequence of ignoring it is not concrete.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Mostly strong inbox triage with clear reply-needed identification, evidence quotes, and practical next steps. It correctly separates notifications from reply items and avoids claiming a sent email. Main weakness is that it does not fully distinguish confirmed user-owned actions from merely interesting inbox items, and the urgency judgments are somewhat generic rather than deeply evidenced.
- Weaknesses: Does not clearly separate confirmed user-owned actions from inbox items that merely exist or look interesting.; Thread summaries are concise, but still somewhat thin on context for the Exol thread.; Urgency labels are present but not strongly justified beyond the quoted text.; No explicit recommendation hierarchy beyond the two reply-needed items; could better distinguish watch vs ignore vs delegate for borderline items.

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
