# AI Assistant Eval Suite — 2026-06-09T10-49-09-804Z-18cc050b

- Endpoint: `https://alleato-mivb9j8oc-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
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
| realworld-outlook-arrived-today | source_lookup | ❌ | 60774ms | duration 60774ms exceeded warning budget 30000ms |
| realworld-urgent-inbox | source_lookup | ❌ | 36162ms | duration 36162ms exceeded warning budget 30000ms |
| realworld-last-five-emails | source_lookup | ❌ | 19859ms | — |
| realworld-email-reply-triage | source_lookup | ✅ | 16940ms | — |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16116ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 19859ms | email_operator: fail (2/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 2 < 4: The answer does provide five recent emails and avoids claiming any message was sent, but it fails the prompt’s core ask by adding unsupported urgency and action guidance, mixing in items outside the last five, and introducing thread details not evidenced in the mailbox listing. It is more of a prioritized inbox digest than a clean “last five emails” lookup. |
| realworld-urgent-inbox | source_lookup | ❌ | 36162ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does identify several potentially urgent inbox items and gives some next-step guidance, but it overstates certainty in places, mixes confirmed items with speculative ones, and does not cleanly separate urgent from merely interesting. It also includes a draft escalation that is not clearly requested by the user’s question. |
| realworld-important-emails-this-morning | source_lookup | ❌ | 16116ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies a few likely important emails and gives basic next steps, but it overstates certainty, mixes in unsupported details, and does not cleanly separate confirmed inbox facts from inferred importance. It is usable as a rough triage, not a strong operator-quality inbox summary. |
| realworld-outlook-arrived-today | source_lookup | ❌ | 60774ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies several inbox items and gives some prioritization, but it overreaches by mixing live inbox findings with inferred context, user-owned actions, and speculative urgency. It also fails the prompt’s core ask by not cleanly separating what actually came in today from what merely looks related or interesting. The quarantine item is the strongest evidence-backed urgent flag, but several other items are presented with more certainty than the evidence supports. |
| realworld-email-reply-triage | source_lookup | ✅ | 16940ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 2 / 4 (fail)
- Summary: The answer does provide five recent emails and avoids claiming any message was sent, but it fails the prompt’s core ask by adding unsupported urgency and action guidance, mixing in items outside the last five, and introducing thread details not evidenced in the mailbox listing. It is more of a prioritized inbox digest than a clean “last five emails” lookup.
- Weaknesses: Adds items not in the last five ('Microsoft 365 security message' and 'Capital One spend-limit alert'), which violates the source lookup scope.; Introduces unsupported thread detail ('confirm by Thursday afternoon on the roof penetration') that is not clearly evidenced by the provided email metadata.; Mixes in urgency judgments and next-step recommendations that were not requested and are not consistently evidence-backed.; Does not clearly separate confirmed mailbox items from speculative or merely interesting alerts.; The response is addressed to 'Megan' despite the mailbox being bclymer@alleatogroup.com, creating identity confusion.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does identify several potentially urgent inbox items and gives some next-step guidance, but it overstates certainty in places, mixes confirmed items with speculative ones, and does not cleanly separate urgent from merely interesting. It also includes a draft escalation that is not clearly requested by the user’s question.
- Weaknesses: Does not clearly distinguish confirmed urgent items from items that are only possibly important or routine.; Uses unsupported certainty in phrasing like 'look urgent' and 'should be reviewed' without enough evidence detail for every item.; Includes speculative items such as 'Innovative Private Wealth' and 'Perplexity sign-in' without strong urgency justification.; Does not explicitly state who needs to respond for each item and what happens if ignored in a disciplined way.; The draft escalation is not directly responsive to the user's simple question and adds noise.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies a few likely important emails and gives basic next steps, but it overstates certainty, mixes in unsupported details, and does not cleanly separate confirmed inbox facts from inferred importance. It is usable as a rough triage, not a strong operator-quality inbox summary.
- Weaknesses: Does not clearly distinguish confirmed facts from inferred judgments; phrases like 'Why it matters' and 'Priority: High' are asserted without showing evidence beyond the subject/preview.; Includes thread details that may be incomplete or speculative, especially the Exol technical scope summary, without indicating uncertainty.; Fails to explicitly identify who needs a response and what happens if ignored for each important email.; The response path is only partially concrete; it suggests actions but does not consistently choose among reply now, delegate, watch, draft, or ignore for each item.; The draft-request criterion is not really met because no actual draft is provided and the offer is generic.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies several inbox items and gives some prioritization, but it overreaches by mixing live inbox findings with inferred context, user-owned actions, and speculative urgency. It also fails the prompt’s core ask by not cleanly separating what actually came in today from what merely looks related or interesting. The quarantine item is the strongest evidence-backed urgent flag, but several other items are presented with more certainty than the evidence supports.
- Weaknesses: Does not cleanly distinguish confirmed inbox items from context-derived or inferred items; several bullets rely on Outlook/Teams records rather than the email itself.; Overstates certainty on urgency and ownership in places, especially where the evidence is thin.; Summaries are somewhat verbose and include raw-ish thread context instead of concise operational summaries.; Fails to clearly identify who specifically needs to respond for each item and what happens if ignored.; Includes items that may be interesting but not necessarily actionable today, without strong evidence-based justification.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer correctly identifies one clear reply-needed email, distinguishes it from non-actionable inbox items, and avoids claiming any message was sent. It gives a concrete next step and includes evidence-based caution about what was and was not inspected. The main weakness is that it adds some unsupported operational detail (e.g., an urgent escalation draft for Megan) without clearly tying it to the user’s request, and it does not fully explain impact/priority beyond the single client email.
- Weaknesses: Adds an escalation draft for Megan that is not directly requested and may be extraneous.; Does not strongly explain consequences if the email is ignored beyond the implied client follow-up.; Thread summaries are concise, but some items are summarized at a high level without enough specificity to prove no action is needed.; The response could better separate confirmed user-owned actions from merely observed inbox items.

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
