# AI Assistant Eval Suite — 2026-06-09T10-41-26-671Z-131e3f4b

- Endpoint: `https://alleato-kyfjyfp2v-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `inbox-outlook-regression`
- Bundle description: Agentic-eval guardrail for live inbox/date/triage prompts. The Strategist must delegate Microsoft operator work to consultMicrosoftExecutiveAssistant, the specialist must expose microsoft_graph_live in its trace, and the assistant must avoid direct/stale Outlook tools and source-specific RAG fallback.
- Filter: `realworld-(last-five-emails|urgent-inbox|important-emails-this-morning|outlook-arrived-today|email-reply-triage)$`
- Total: 5
- Passed: 3
- Failed: 2
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 5 judged, 3 passed, 2 failed, 0 errors, avg 3.6 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-outlook-arrived-today | source_lookup | ❌ | 63253ms | duration 63253ms exceeded warning budget 30000ms |
| realworld-important-emails-this-morning | source_lookup | ✅ | 26045ms | — |
| realworld-last-five-emails | source_lookup | ✅ | 20995ms | — |
| realworld-email-reply-triage | source_lookup | ❌ | 14279ms | — |
| realworld-urgent-inbox | source_lookup | ✅ | 11051ms | — |

## Bundle Criteria

- Every case must fire consultMicrosoftExecutiveAssistant and its nested trace must include microsoft_graph_live.
- No case may fire sourceSpecificRagRetrieval, getRecentEmails, getRecentOutlookEmails, or readOutlookEmailThread.
- No tool trace's source may be outlook_email_intake or outlook_email_intake_fallback - Microsoft operator inbox reads must hit live Microsoft Graph through the specialist.
- Answers must not tell the user to wait for live Outlook tools.
- Answers must be long enough to explain the inbox result or failure clearly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| realworld-last-five-emails | source_lookup | ✅ | 20995ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-urgent-inbox | source_lookup | ✅ | 11051ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-important-emails-this-morning | source_lookup | ✅ | 26045ms | email_operator: pass (4/4) | 0 | consultMicrosoftExecutiveAssistant | — |
| realworld-outlook-arrived-today | source_lookup | ❌ | 63253ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer does a decent job separating likely actionable emails from low-priority notifications and gives concrete next steps. However, it has a major evidence-handling problem: it invents or overstates details not clearly supported by the prompt, and it does not cleanly distinguish confirmed inbox items from inferred urgency. It also mixes in unsupported operational context like Teams draft preparation and specific technical scope language without showing the underlying evidence trail. |
| realworld-email-reply-triage | source_lookup | ❌ | 14279ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | judge email_operator score 3 < 4: The answer identifies two likely reply-needed emails from today and separates some non-action items, but it overstates certainty in places and includes unsupported details. It does reasonably well on triage and suggested next steps, but it does not fully satisfy evidence discipline or clearly distinguish confirmed actions from inferred ones. |

## Judge notes

### realworld-last-five-emails

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: Mostly strong inbox triage with clear identification of the most time-sensitive item and practical next steps. It does not invent sent actions, and it distinguishes routine mail from potentially urgent items. Main weakness: it slightly overstates urgency on the ULTA thread without showing enough evidence beyond the subject/snippet, and it includes some extra operational commentary that is not strictly needed for a simple “last five emails” request.
- Weaknesses: The urgency judgment on the ULTA email is somewhat assertive given limited evidence; it should be framed more explicitly as a likely priority based on the deadline mention.; The response path is helpful but slightly generic for a source-lookup request; it could be tighter and more directly tied to the user’s ask.; The assistant mentions a Teams escalation option and capability status, which is extra context not necessary for listing the last five emails.

### realworld-urgent-inbox

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does identify several urgent inbox items and gives concrete next steps, but it mixes confirmed urgency with speculative importance, and it includes some unsupported context (e.g., “Megan,” “Brandon,” and a quarantine review path not directly evidenced by the inbox snippet). It is useful, but not fully disciplined about evidence boundaries.
- Weaknesses: Uses unsupported certainty on some items, especially the private wealth email and quarantine alert, without enough evidence from the snippet.; Does not clearly distinguish confirmed user-owned actions from merely interesting inbox items in all cases.; Includes thread details and interpretations that may go beyond the provided inbox evidence.; The response is not especially concise and includes some generic prioritization language.; Draft-request handling is not demonstrated, so the short/direct practical standard is not evidenced.

### realworld-important-emails-this-morning

- Rubric: `email_operator`
- Score: 4 / 4 (pass)
- Summary: The answer does a decent job separating urgent items from routine inbox noise and identifies several actionable emails with reasons and next steps. It correctly avoids claiming anything was sent and includes a concrete draft for the quarantine escalation. Main weaknesses are some unsupported specificity (e.g., “prevented phish,” “roof penetration,” “MDF room and power requirements”) and a few items that are more like inbox artifacts than confirmed user-owned actions. Overall it meets the minimum threshold, but only narrowly.
- Weaknesses: Some thread details appear invented or over-specific relative to the prompt, especially the content descriptions for ULTA and Exol.; Mixes confirmed inbox items with inferred action items without clearly distinguishing what Brandon must do versus what merely exists.; The draft escalation is short and practical, but it is not clearly tied to a user-owned action beyond a generic security notice.; The answer says file search returned no directly relevant follow-up, which is extraneous and not needed for the email question.; Urgency labels are sometimes asserted without enough evidence from the email content shown.

### realworld-outlook-arrived-today

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer does a decent job separating likely actionable emails from low-priority notifications and gives concrete next steps. However, it has a major evidence-handling problem: it invents or overstates details not clearly supported by the prompt, and it does not cleanly distinguish confirmed inbox items from inferred urgency. It also mixes in unsupported operational context like Teams draft preparation and specific technical scope language without showing the underlying evidence trail.
- Weaknesses: Uses unsupported certainty in places, especially around urgency and scope details.; Does not clearly distinguish confirmed inbox items from inferred interpretations.; Mentions a Teams draft prepared for review without evidence in the prompt.; Fails to explicitly state who must respond for each item and the consequence of ignoring it.; Does not provide a clean, evidence-backed phishing/ignore judgment framework for the lower-priority items.

### realworld-email-reply-triage

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The answer identifies two likely reply-needed emails from today and separates some non-action items, but it overstates certainty in places and includes unsupported details. It does reasonably well on triage and suggested next steps, but it does not fully satisfy evidence discipline or clearly distinguish confirmed actions from inferred ones.
- Weaknesses: Uses unsupported certainty in places, such as calling items 'likely' without clearly grounding the judgment in the visible thread content.; Introduces thread-specific interpretation like 'scope clarifications and feedback' without showing the underlying evidence.; Does not clearly distinguish confirmed user-owned actions from inbox items that merely exist; it mixes triage with inferred recommendations.; The 'urgent escalation check' and capability notes add noise and are not directly responsive to 'show me any emails from today that need a reply.'; Does not explicitly explain what could happen if ignored for each item beyond generic urgency language.

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
