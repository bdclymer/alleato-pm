# AI Assistant Eval Suite — 2026-06-09T10-25-13-571Z-541d79a2

- Endpoint: `https://alleato-hub.vercel.app/api/ai-assistant/chat`
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
| realworld-email-reply-triage | source_lookup | ❌ | 49368ms | duration 49368ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ✅ | 44989ms | duration 44989ms exceeded warning budget 30000ms |
| realworld-outlook-arrived-today | source_lookup | ❌ | 32676ms | duration 32676ms exceeded warning budget 30000ms |
| realworld-urgent-inbox | source_lookup | ✅ | 18525ms | — |
| realworld-last-five-emails | source_lookup | ❌ | 12027ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ❌ | 12027ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer is mostly a mailbox listing, but it does not fully satisfy the rubric for email operator quality. It identifies some urgency and gives a few next steps, yet it misses the user’s actual request framing, includes unsupported capability claims, and contains a likely name mismatch in the recommendation section. It also does not clearly separate confirmed user-owned actions from merely observed inbox items. |
| realworld-urgent-inbox | source_lookup | ✅ | 18525ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 44989ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 32676ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does a decent job separating urgent from non-urgent items and gives concrete next steps, but it overstates certainty in places, mixes inbox items with inferred ownership, and includes thread details that are not clearly evidenced. It is useful operationally, but not strong enough on evidence discipline and response-path precision to pass. |
| realworld-email-reply-triage | source_lookup | ❌ | 49368ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: Good triage on the urgent Ulta email, but the answer overstates certainty on several thread details and mixes inbox items with reply-needed judgments without enough evidence. It also includes a likely fabricated or unsupported Teams draft/action framing, which hurts trust for an email operator task. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer is mostly a mailbox listing, but it does not fully satisfy the rubric for email operator quality. It identifies some urgency and gives a few next steps, yet it misses the user’s actual request framing, includes unsupported capability claims, and contains a likely name mismatch in the recommendation section. It also does not clearly separate confirmed user-owned actions from merely observed inbox items.
- Weaknesses: Does not answer the user’s request in a clean source-lookup style; it adds operational commentary instead of simply presenting the last five emails.; Includes an unsupported capability check and claims about live Outlook access that are not needed and may be unverifiable from the response.; Uses a different recipient name in the recommendation section ('Megan') despite the mailbox being bclymer@alleatogroup.com, which is a credibility issue.; Does not clearly distinguish confirmed user-owned actions from inbox items that merely exist.; Urgency labels are somewhat arbitrary and not strongly evidence-backed; no explicit reasoning is given for why each item matters or what happens if ignored.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer identifies several potentially urgent inbox items and gives a concrete escalation draft. It is strongest on urgency triage and response path, but it overstates certainty on the phishing/quarantine item and mixes business and personal alerts without clearly separating confirmed owner actions from merely interesting inbox noise.
- Weaknesses: Does not clearly separate confirmed user-owned actions from inbox items that merely exist or may be irrelevant to Brandon/Megan.; The Microsoft 365 quarantine item is treated as a likely phishing issue with moderate/high urgency, but the evidence only supports a quarantine notice; the judgment is stronger than the evidence.; The Capital One and ThriveCart items are mentioned without clearly explaining whether they are business-critical, personal, or owned by the user.; The response says 'notify the project owner immediately' but does not identify the owner from evidence, which weakens specificity.; The summary is decent but still somewhat generic and could be tighter about what actually needs a response now versus what can be watched.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a decent job separating the clearly important client email from routine inbox noise and gives a practical next step for the Ulta item. It also avoids claiming anything was sent. However, it is weaker on evidence handling and thread summarization: the Exol thread is summarized somewhat, but the response does not clearly distinguish confirmed user-owned actions from merely interesting inbox items, and it introduces a likely wrong name (“Megan”) instead of the user context. The urgency assessment is mostly cautious and evidence-based, but some recommendations are generic rather than tightly tied to consequences if ignored.
- Weaknesses: Introduces an apparent name mismatch ('Megan') that is not supported by the prompt.; Does not clearly distinguish confirmed user-owned actions from inbox items that merely exist.; Thread summary for Exol is somewhat repetitive and not especially efficient.; Does not explicitly state what could happen if the Ulta email is ignored beyond generic time sensitivity.; Some recommendations are broad ('review comments') rather than sharply tied to a specific response path.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does a decent job separating urgent from non-urgent items and gives concrete next steps, but it overstates certainty in places, mixes inbox items with inferred ownership, and includes thread details that are not clearly evidenced. It is useful operationally, but not strong enough on evidence discipline and response-path precision to pass.
- Weaknesses: Uses unsupported certainty in places, such as calling the Ulta item the only client-action escalation and labeling some items as likely active without enough evidence.; Mixes confirmed inbox items with inferred user-owned actions, especially in the 'Recommended next steps' section.; Thread summaries sometimes include extra detail that may not be necessary and could be interpreted as thread reconstruction beyond the prompt.; Does not consistently distinguish between what Brandon/Megan owns versus what merely exists in the inbox.; Suspicious/security-related items are labeled as needing review, but the phishing/compliance judgment is not strongly evidence-backed.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: Good triage on the urgent Ulta email, but the answer overstates certainty on several thread details and mixes inbox items with reply-needed judgments without enough evidence. It also includes a likely fabricated or unsupported Teams draft/action framing, which hurts trust for an email operator task.
- Weaknesses: Uses unsupported certainty on several items labeled 'likely reply-needed' without showing enough evidence for why they need a reply.; Includes thread details and operational interpretations that may not be fully grounded in the provided inbox evidence.; The Teams private message draft for Megan is an extra action not requested by the user and is not clearly tied to a confirmed inbox item.; Does not cleanly separate confirmed user-owned actions from merely interesting inbox items.; Some summaries are too vague ('additional scope comments and request for review') to justify reply-needed status.

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
