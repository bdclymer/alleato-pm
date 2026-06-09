# AI Assistant — Tool → Eval Question Coverage Map

> Goal: every tool the AI Assistant can call, the deep-research agent, and every memory
> mechanism has at least one eval question that *directly* exercises it. "Direct" = the
> eval passes only if that specific tool fires (asserted via `chat_history.metadata.tool_trace`)
> AND the answer reflects the tool's output.
>
> Source of truth for tools: `frontend/src/lib/ai/tools/` (~99 tools across 23 files) +
> `assistant-self-knowledge.ts`. Existing harness:
> `docs/ai-plan/evals/assistant-eval-suite.json` (runner: `scripts/verify/verify_ai_assistant_eval_suite.mjs`).
>
> **How to read the Status column:**
> - ✅ covered — a case in the existing suite already asserts this tool
> - 🟡 partial — capability is tested but not this exact tool, or tool fires but no quality assertion
> - ❌ gap — no direct eval exists; add one
> (Status is a starting estimate from the suite's bundle structure; confirm per-tool when wiring.)

---

## 1. Tasks & Action Items (create / update / complete / delete)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `createGeneratedTask` | action-tools.ts:1024 | "Create a task for Vermillion Rise: follow up with the steel sub on the missing shop drawings, due Friday." | `createGeneratedTask` fires; new row in `public.tasks` with correct title/due date; assistant confirms with the created task id. | 🟡 |
| `updateGeneratedTask` | action-tools.ts:1545 | "Mark the 'follow up with steel sub' task as complete." | `updateGeneratedTask` fires with status→done on the right task id; DB reflects status change. | ❌ |
| `deleteGeneratedTask` | action-tools.ts:1644 | "Delete the duplicate 'follow up with steel sub' task." | Preview-first confirmation, then `deleteGeneratedTask` fires; row removed only after confirm. | ❌ |
| `createTask` (schedule/Gantt) | action-tools.ts:915 | "Add a schedule task 'Pour foundation' starting Monday, 5-day duration, on Union Collective." | `createTask` fires; row in `schedule_tasks` with dates/duration. | ❌ |
| `getActionItemsAndInsights` | project-tools.ts:2043 | "What are my open action items and the top AI insights for Union Collective?" | `getActionItemsAndInsights` fires; answer lists real open tasks + insights, not a generic list. | ✅ |
| `extractStructuredActionBrief` | structured-output.ts:75 | "Turn these meeting notes into action items with owners and due dates: <paste notes>." | `extractStructuredActionBrief` fires; typed brief with owner+due per item. | 🟡 |

> ⚠️ Per memory: **task/schedule data is mid-migration — every task is `status=open`**. Do
> NOT write read-side evals like "show overdue tasks." Write-side eval (create/complete/delete)
> is fine because it asserts the mutation, not preexisting data quality.

---

## 2. Project Intelligence & Insights

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getProjectBriefingSnapshot` | project-tools.ts:572 | "Give me a full briefing on Union Collective." | `getProjectBriefingSnapshot` fires; answer cites budget/schedule/risk facts from the snapshot. | ✅ |
| `getMeetingIntelligence` | project-tools.ts:427 | "What risks, decisions, and action items came out of recent meetings on Union Collective?" | `getMeetingIntelligence` fires; structured risks/decisions/actions returned. | ✅ |
| `getProjectRiskAnalysis` | project-tools.ts:1479 | "What are the biggest risks on Vermillion Rise right now?" | `getProjectRiskAnalysis` fires; risks tied to evidence. | ✅ |
| `getProjectsWithRisks` | project-tools.ts:1223 | "Which projects across the portfolio have active risks?" | `getProjectsWithRisks` fires; portfolio-wide list. | 🟡 |
| `getPortfolioOverview` | project-tools.ts:1002 | "Give me a strategic overview of the current portfolio." | `getPortfolioOverview` fires; current-phase projects summarized. | ✅ |
| `getProjectDetails` | project-tools.ts:2789 | "What's the contract value and current phase of Union Collective?" | `getProjectDetails` fires; structured project facts. | 🟡 |
| `getProjectBudgetSummary` | project-tools.ts:1884 | "What's the true budget status on Union Collective from the budget lines?" | `getProjectBudgetSummary` fires; numbers reconcile to budget line data. | 🟡 |
| `getFinancialAnalysis` | project-tools.ts:1740 | "Analyze financial performance across active projects." | `getFinancialAnalysis` fires; cross-project financial read. | 🟡 |
| `listDomainIntelligence` | intelligence-tools.ts:27 | "What cross-project business domains do you have prebuilt intelligence for?" | `listDomainIntelligence` fires; lists domains. | ❌ |
| `getDomainIntelligence` | intelligence-tools.ts:61 | "Pull the prebuilt intelligence synthesis for the <domain> domain." | `getDomainIntelligence` fires; returns the synthesis. | ❌ |
| `flagProjectRisk` | action-tools.ts:1715 | "Flag a schedule risk on Vermillion Rise: the steel delivery slipped two weeks." | `flagProjectRisk` fires (write); risk/insight persisted. | ❌ |
| `saveInsight` | operational.ts:2572 | "Save this insight: the owner prefers weekly Friday updates." | `saveInsight` fires; structured insight stored. | 🟡 |
| `generateProjectSummary` | action-tools.ts:2210 | "Generate a status summary for Union Collective covering budget, schedule, and open items." | `generateProjectSummary` fires; multi-section summary. | 🟡 |

---

## 3. Meetings — recap, search, detail, invites

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getMeetingsByDate` | project-tools.ts:2295 | "What meetings happened last week on Union Collective?" | `getMeetingsByDate` fires; real meetings in the date range. | ✅ |
| `searchMeetingsByTopic` | operational.ts:2155 | "Find meetings where we discussed the change order backlog." | `searchMeetingsByTopic` fires; topic-relevant meetings. | ✅ |
| `getMeetingDetails` | operational.ts:2325 | "Recap the <specific meeting> — decisions, attendees, and follow-ups." | `getMeetingDetails` fires; full recap from transcript. | ✅ |
| `createMeetingNote` | action-tools.ts:1942 | "Log a meeting note on Union Collective: owner approved the revised schedule on today's call." | `createMeetingNote` fires (write); note persisted to project. | ❌ |
| `createOutlookCalendarInvite` ⚙️ | action-tools.ts:3179 | "Create a calendar invite for a coordination meeting Thursday 2pm with the Union Collective team." | Operator-gated: preview → on confirm `createOutlookCalendarInvite` fires via Graph; invite created. | ❌ |
| `getOutlookCalendarEvents` | outlook-operations.ts:147 | "What's on the calendar for next week?" | `getOutlookCalendarEvents` fires; events for the window. | 🟡 |

> ⚙️ = Microsoft operator tool. Stripped from the Strategist by `omitMicrosoftOperatorTools`;
> only reachable through the operator path behind the approval gate. Evals must run against
> the operator-enabled surface (see `email-operator-quality` bundle).

---

## 4. Brandon's Email — monitor & draft responses

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getRecentEmails` | operational.ts:3059 | "What emails came into Brandon's inbox today?" | `getRecentEmails` fires (date-window query on `outlook_email_intake`); real emails listed. | ✅ |
| `searchEmails` | operational.ts:3428 | "Find emails about the steel delivery delay." | `searchEmails` fires (semantic); topic-relevant emails. | ✅ |
| `draftOutlookEmail` ⚙️ | action-tools.ts:3378 | "Draft a reply to the owner's email about the schedule slip, in Brandon's voice." | Preview → on confirm `draftOutlookEmail` fires; draft created in Outlook (NOT sent — there is intentionally **no send tool**). Voice matches Brandon profile. | 🟡 |
| `getOutlookOperationsStatus` | outlook-operations.ts:79 | "Is the Outlook sync healthy and how fresh is the inbox data?" | `getOutlookOperationsStatus` fires; subscription + freshness reported. | ❌ |

> Eval must assert the **no-send invariant**: a prompt like "send this email to the owner"
> must NOT produce a send (no `sendOutlookEmail` tool exists) — it should draft + tell the user to send.

---

## 5. Teams messages

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `searchTeamsMessages` | operational.ts:3473 | "What did the field team say in Teams about the inspection?" | `searchTeamsMessages` fires; relevant threads. | ✅ |
| `sendTeamsMessage` ⚙️ | action-tools.ts:3580 | "Send a Teams DM to <linked user> asking for the updated submittal log." | Preview → on confirm `sendTeamsMessage` fires via Archon bot; requires recipient with linked Teams account. | ❌ |

---

## 6. Acumatica / Accounting — real-time ERP sync

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getAPAgingReport` | acumatica.ts:76 | "Pull the current AP aging from Acumatica." | `getAPAgingReport` fires; live aging buckets. | 🟡 |
| `getARAgingReport` | acumatica.ts:109 | "What's our AR aging right now?" | `getARAgingReport` fires; live AR buckets. | ❌ |
| `getCashPositionReport` | acumatica.ts:142 | "What's our current cash position?" | `getCashPositionReport` fires; net cash summary. | ❌ |
| `getVendorSpendReport` | acumatica.ts:183 | "Which vendors have we spent the most with this year?" | `getVendorSpendReport` fires; vendor spend ranking. | ❌ |
| `getRecentBills` | acumatica.ts:236 | "Show me the most recent AP bills from Acumatica." | `getRecentBills` fires; recent vendor invoices. | ❌ |
| `getRecentInvoices` | acumatica.ts:296 | "What customer invoices went out recently?" | `getRecentInvoices` fires; recent AR invoices. | ❌ |
| `getAcumaticaProjectBudget` | acumatica.ts:364 | "Pull the Acumatica project budget for Union Collective." | `getAcumaticaProjectBudget` fires; ERP budget. | ❌ |
| `getAcumaticaProjectList` | acumatica.ts:473 | "List all projects in Acumatica." | `getAcumaticaProjectList` fires; project list. | ❌ |
| `getPurchaseOrderSummary` | acumatica.ts:519 | "Summarize open purchase orders from Acumatica." | `getPurchaseOrderSummary` fires; PO summary. | ❌ |
| `getFinanceSpendRollup` | sais.ts:66 | "What's our trailing monthly accounting spend?" | `getFinanceSpendRollup` fires; monthly rollup from AP bills. | ❌ |
| `getSopBacklog` | sais.ts:16 | "What's the accounting SOP backlog, including missing SOPs?" | `getSopBacklog` fires; backlog incl. placeholders. | ❌ |

> ⚠️ Acumatica evals must run with live ERP credentials and **never use OData `$filter`**.
> Coverage is thin here — biggest gap cluster after action-tools.

---

## 7. Financials (internal — budget / commitments / change orders / costs)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getCommitmentsOverview` | financial.ts:185 | "Show all commitments (subs and POs) on Union Collective." | `getCommitmentsOverview` fires; subs+POs with values. | 🟡 |
| `getChangeOrderDetails` | financial.ts:362 | "Give me the change order details for Union Collective." | `getChangeOrderDetails` fires; CO numbers/titles/amounts. | 🟡 |
| `getDirectCostsSummary` | financial.ts:570 | "Break down direct costs by type and vendor on Union Collective." | `getDirectCostsSummary` fires; categorized costs. | 🟡 |
| `getBudgetLineItems` | financial.ts:744 | "Show the budget line items for Union Collective." | `getBudgetLineItems` fires; granular lines. | 🟡 |
| `getCostTrends` | financial.ts:946 | "How has spending trended on Union Collective over time?" | `getCostTrends` fires; time-series costs. | ❌ |
| `getMarginAnalysis` | financial.ts:1156 | "What's the margin on Union Collective — revenue vs cost?" | `getMarginAnalysis` fires; revenue (prime+owner COs) vs cost. | 🟡 |
| `getForecastComparison` | forecast-tools.ts:37 | "Compare original vs revised budget vs actual on Union Collective." | `getForecastComparison` fires; three-way comparison. | ❌ |
| `getScheduleAnalysis` | schedule-tools.ts:37 | "What's overdue and which milestones are at risk on Union Collective?" | `getScheduleAnalysis` fires; overdue/at-risk analysis. | 🟡 |

---

## 8. Structured queries (typed data over financial/schedule/doc rows)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `queryBudgetData` | structured-queries.ts:42 | "Query budget line items over $50k on Union Collective." | `queryBudgetData` fires; filtered rows. | ❌ |
| `queryChangeOrders` | structured-queries.ts:108 | "List approved change orders on Union Collective." | `queryChangeOrders` fires. | ❌ |
| `queryCommitments` | structured-queries.ts:201 | "Query all subcontract commitments on Union Collective." | `queryCommitments` fires. | ❌ |
| `queryDirectCosts` | structured-queries.ts:257 | "Query direct costs tagged to division 3 on Union Collective." | `queryDirectCosts` fires. | ❌ |
| `queryScheduleTasks` | structured-queries.ts:317 | "Query schedule tasks in the foundation phase." | `queryScheduleTasks` fires. | ❌ |
| `queryDocumentRows` | structured-queries.ts:385 | "Pull the rows from the uploaded SOV spreadsheet." | `queryDocumentRows` fires; tabular rows. | ❌ |
| `searchStructuredFinancialRows` | structured-queries.ts:464 | "Search the structured financial rows for line items mentioning 'concrete'." | `searchStructuredFinancialRows` fires on `document_rows`. | ❌ |

---

## 9. RAG / semantic search & knowledge

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `semanticSearch` | operational.ts:1439 | "Search everything we know about the foundation waterproofing issue." | `semanticSearch` fires; cross-source hits from `document_chunks`. | ✅ |
| `searchDocuments` | project-tools.ts:2656 | "Find where the spec talks about expansion joints." | `searchDocuments` fires (vector); content snippets. | 🟡 |
| `findProjectDocuments` | project-tools.ts:2457 | "Find the latest geotech report for Union Collective." | `findProjectDocuments` fires; specific file located. | 🟡 |
| `searchExternalDocuments` | operational.ts:3518 | "Search OneDrive and uploaded docs for the executed prime contract." | `searchExternalDocuments` fires; OneDrive/upload hits. | ❌ |
| `getCompanyKnowledge` | operational.ts:1956 | "What is Alleato's mission and current strategic goals?" | `getCompanyKnowledge` fires; company context. | 🟡 |
| `saveToKnowledgeBase` | operational.ts:2512 | "Save this lesson learned: pre-order long-lead steel before GMP signing." | `saveToKnowledgeBase` fires (write); persisted. | ❌ |
| `searchAppHelp` | app-help-tools.ts:26 | "How do I create a change order in this app?" | `searchAppHelp` fires; how-to from help center. | 🟡 |

---

## 10. Document intelligence (submittals / specs)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getSubmittalLog` | document-intelligence.ts:69 | "Show the submittal register for Union Collective." | `getSubmittalLog` fires. | 🟡 |
| `getSpecRequirements` | document-intelligence.ts:184 | "What does the spec require for the masonry trade?" | `getSpecRequirements` fires; spec search hits. | ❌ |
| `detectMissingSubmittals` | document-intelligence.ts:311 | "Which submittals are we missing versus the scope?" | `detectMissingSubmittals` fires; register-vs-scope gaps. | ❌ |
| `reviewDocument` | document-intelligence.ts:518 | "Pre-review this submittal PDF for completeness." | `reviewDocument` fires (write); structured review requested. | ❌ |
| `logFeedback` | document-intelligence.ts:411 | "That review finding was wrong — the spec section is 03 30 00." | `logFeedback` fires; correction recorded. | ❌ |

---

## 11. Directory / people / vendors

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getPeopleAndRoles` | operational.ts:532 | "Who's on the Union Collective team and what are their roles?" | `getPeopleAndRoles` fires; directory. | 🟡 |
| `getVendorPerformance` | operational.ts:623 | "How is the concrete sub performing on Union Collective?" | `getVendorPerformance` fires; performance read. | ❌ |
| `createProjectCompany` | action-tools.ts:1141 | "Add Acme Steel as a subcontractor on Union Collective." | `createProjectCompany` fires (write); company linked. | ❌ |
| `createProjectContact` | action-tools.ts:1289 | "Add John Doe (john@acme.com) as the Acme Steel PM contact." | `createProjectContact` fires (write); contact added. | ❌ |
| `findProject` | operational.ts:2882 | "Find the project called Vermillion." | `findProject` fires; resolves to the right project. | ✅ |

---

## 12. RFIs / Submittals / Commitments / Change orders (create + status)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `createRFI` | action-tools.ts:818 | "Open an RFI on Union Collective asking the architect to confirm the door schedule." | `createRFI` fires (write); RFI created. | ❌ |
| `updateRFIStatus` | action-tools.ts:1845 | "Mark RFI #12 as answered." | `updateRFIStatus` fires; status updated. | ❌ |
| `getRFIStatus` | operational.ts:788 | "What's the status of open RFIs on Union Collective?" | `getRFIStatus` fires; status analysis. | 🟡 |
| `createSubmittal` | action-tools.ts:2029 | "Create a submittal for structural steel shop drawings on Union Collective." | `createSubmittal` fires (write). | ❌ |
| `getSubmittalStatus` | operational.ts:933 | "Which submittals are overdue on Union Collective?" | `getSubmittalStatus` fires. | 🟡 |
| `createCommitment` | action-tools.ts:2650 | "Create a subcontract commitment to Acme Steel for $250k on Union Collective." | `createCommitment` fires (write). | ❌ |
| `createChangeOrder` | action-tools.ts:532 | "Create a PCCO on Union Collective for the added site work, $80k." | `createChangeOrder` fires (write). | ❌ |
| `createChangeEvent` | action-tools.ts:633 | "Log a change event on Union Collective: owner requested an extra loading dock." | `createChangeEvent` fires (write). | ❌ |
| `updateProjectStatus` | action-tools.ts:732 | "Set Union Collective's status to Active." | `updateProjectStatus` fires. | ❌ |
| `logDailyReport` | action-tools.ts:2123 | "Log a daily report for Union Collective: 12 workers on site, footings poured." | `logDailyReport` fires (write). | ❌ |

---

## 13. Cross-project / historical analysis

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `getCrossProjectComparison` | operational.ts:1070 | "Compare budget and schedule health across Union Collective and Vermillion Rise." | `getCrossProjectComparison` fires; side-by-side. | 🟡 |
| `getHistoricalTrends` | operational.ts:1265 | "How has Union Collective trended over the last quarter?" | `getHistoricalTrends` fires; trend over time. | ❌ |

---

## 14. Progress reports

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `createWeeklyProgressReportDraft` | progress-report-tools.ts:59 | "Draft this week's progress report for Union Collective." | `createWeeklyProgressReportDraft` fires (write); draft created. | ❌ |
| `updateProgressReportSections` | progress-report-tools.ts:124 | "Update the schedule section of the progress report to note the 2-week steel slip." | `updateProgressReportSections` fires. | ❌ |
| `listProgressReportPhotos` | progress-report-tools.ts:200 | "What photos are available for this week's report?" | `listProgressReportPhotos` fires. | ❌ |
| `selectProgressReportPhotos` | progress-report-tools.ts:241 | "Add the three foundation photos to the report." | `selectProgressReportPhotos` fires. | ❌ |
| `generateProgressReportPdf` | progress-report-tools.ts:351 | "Generate the PDF for this week's Union Collective report." | `generateProgressReportPdf` fires; download/view link returned. | ❌ |

---

## 15. Workspace artifacts (drafts → saved to "research and past work")

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `saveWorkspaceArtifact` | workspace-tools.ts:199 | "Draft an owner update memo and save it to my workspace." | `saveWorkspaceArtifact` fires; versioned draft stored. | ❌ |
| `listWorkspaceArtifacts` | workspace-tools.ts:59 | "What drafts do I have in my workspace?" | `listWorkspaceArtifacts` fires; lists drafts. | ❌ |
| `getDraftArtifact` | workspace-tools.ts:126 | "Pull up the owner update memo draft." | `getDraftArtifact` fires; full content by id/search. | ❌ |
| `promoteWorkspaceArtifact` | workspace-tools.ts:306 | "Finalize the owner update memo and promote it." | `promoteWorkspaceArtifact` fires; promoted/archived. | ❌ |
| `createDocument` | create-document.ts:16 | "Write a project kickoff brief for Union Collective." | `createDocument` artifact stream created. | 🟡 |
| `updateDocument` | update-document.ts:14 | "Update that brief to add a risks section." | `updateDocument` fires on the artifact. | ❌ |
| `requestSuggestions` | request-suggestions.ts:19 | "Suggest improvements to this brief." | `requestSuggestions` fires; suggestions returned. | ❌ |

---

## 16. Feature requests / build handoff

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `findRelatedFeatureRequests` | feature-request-tools.ts:52 | "Is there already a feature request for bulk-editing budget lines?" | `findRelatedFeatureRequests` fires; dedupe search. | ❌ |
| `captureFeatureRequestPacket` | feature-request-tools.ts:79 | "Capture a feature request: add a Gantt export to PDF." | `captureFeatureRequestPacket` fires (write). | ❌ |
| `updateFeatureRequestPacket` | feature-request-tools.ts:130 | "Add acceptance criteria to the Gantt-export request." | `updateFeatureRequestPacket` fires. | ❌ |
| `scoreFeatureRequestReadiness` | feature-request-tools.ts:171 | "Is the Gantt-export request ready to build?" | `scoreFeatureRequestReadiness` fires; readiness score. | ❌ |
| `generateImplementationPlan` | feature-request-tools.ts:196 | "Generate an implementation plan for the Gantt-export request." | `generateImplementationPlan` fires (write). | ❌ |
| `generateClaudeCodeHandoff` | feature-request-tools.ts:237 | "Produce a Claude Code handoff for the Gantt-export request." | `generateClaudeCodeHandoff` fires; markdown handoff. | ❌ |
| `draftLinearIssueFromFeatureRequest` | feature-request-tools.ts:265 | "Draft a Linear issue for the Gantt-export request." | tool fires; parent issue draft persisted. | ❌ |
| `draftLinearSubIssuesFromImplementationPlan` | feature-request-tools.ts:294 | "Break the plan into Linear sub-issues." | tool fires; sub-issue drafts persisted. | ❌ |
| `attachLinearIssueToFeatureRequest` | feature-request-tools.ts:331 | "Attach Linear ALL-123 to the Gantt-export request." | tool fires; real issue id/url attached. | ❌ |
| `attachLinearSubIssueToFeatureRequest` | feature-request-tools.ts:362 | "Attach sub-issue ALL-124 to the packet." | tool fires. | ❌ |
| `recordLinearStatusUpdateForFeatureRequest` | feature-request-tools.ts:389 | "Record that ALL-123 moved to In Progress." | tool fires; status event logged. | ❌ |
| `submitFeedback` | action-tools.ts:2860 | "File a bug: the budget page crashes on export." | `submitFeedback` fires (write). | ❌ |
| `addBoardItem` | action-tools.ts:3069 | "Add 'mobile daily logs' to the product board." | `addBoardItem` fires. | ❌ |
| `createInitiativeCard` | action-tools.ts:2509 | "Create a Command Center initiative card for the GMP push." | `createInitiativeCard` fires. | ❌ |

---

## 17. Marketing intelligence

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `findMarketingSourceCandidates` | marketing.ts:79 | "Find source-backed marketing angles from recent project wins." | `findMarketingSourceCandidates` fires. | ❌ |
| `createMarketingIntelligenceItem` | marketing.ts:105 | "Save a marketing opportunity: the Union Collective topping-out milestone." | `createMarketingIntelligenceItem` fires (write). | ❌ |
| `createMarketingIntelligenceFromCandidate` | marketing.ts:154 | "Save that found candidate as a marketing intelligence item." | tool fires. | ❌ |
| `createContentCalendarDraft` | marketing.ts:196 | "Draft next week's content calendar." | `createContentCalendarDraft` fires (write). | ❌ |
| `createMarketingContentAsset` | marketing.ts:244 | "Draft a LinkedIn post for the topping-out calendar item." | `createMarketingContentAsset` fires. | ❌ |
| `getMarketingCalendar` | marketing.ts:285 | "Show the marketing calendar and its review states." | `getMarketingCalendar` fires. | ❌ |

---

## 18. Web search / external research tools (in-chat)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `searchWeb` | web-search.ts:74 | "What's the current price trend for structural steel?" | `searchWeb` fires; real-time results with sources. | 🟡 |
| `researchCompany` | web-search.ts:165 | "Research the company Turner Construction." | `researchCompany` fires; company profile. | ❌ |
| `searchConstructionMarket` | web-search.ts:254 | "What's happening in the commercial construction market this quarter?" | `searchConstructionMarket` fires; market intel. | ❌ |

---

## 19. Assistant self-knowledge (meta)

| Tool | File:line | Eval question | Pass criteria | Status |
|---|---|---|---|---|
| `describeAssistantCapabilities` | assistant-self-knowledge.ts:294 | "What can you do?" | `describeAssistantCapabilities` fires; capability groups + real tool names. | 🟡 |
| `explainAssistantRetrievalOrder` | assistant-self-knowledge.ts:321 | "How do you decide where to look for an answer?" | `explainAssistantRetrievalOrder` fires; classify→scope→retrieve→answer. | ❌ |
| `explainLastAnswerSources` | assistant-self-knowledge.ts:330 | "Where did that last answer come from?" | `explainLastAnswerSources` fires; prior tool trace + model + source health. | ❌ |
| `getWeather` (demo) | get-weather.ts:32 | "What's the weather in Indianapolis?" | `getWeather` fires. | ❌ (consider removing from prod toolset) |

---

## 20. Deep Research Agent (separate subsystem)

The deep-research agent is **not** one of the chat tools above — it's a `deepagents`-based
multi-source agent reached when chat classifies intent as `external_research`
(`handler-v2.ts` → `fetchDeepAgentResearch()` → backend `POST /api/intelligence/research`).
Artifacts for the long-lived **LLM-wiki** variant persist to the **filesystem**
(`$LLM_WIKI_OUTPUT_ROOT`, default `/tmp/alleato-llm-wiki/<userId>/<topicSlug>/<sessionId>/`
with `raw/`, `wiki/`, `log.md`), browsable at `/deep-research` (admin) via
`GET /api/admin/deep-research/archive`.

| Capability | Eval question | Pass criteria |
|---|---|---|
| Triggers the research agent (not a normal tool loop) | "Do deep research on tilt-up vs precast concrete for a 200k sqft warehouse and give me a recommendation." | Intent classified `external_research`; `fetchDeepAgentResearch` POSTs to `/api/intelligence/research`; response has `mode`, `toolTrace`, `orchestrator`. |
| Web + internal source fan-out | (same run) | `toolTrace` shows both `web_researcher` (web_search/fetch_url) and `alleato_internal_researcher` tools used. |
| Inline citations | (same run) | Answer contains real source URLs; `sources[]` populated from regex extraction. |
| Adversarial verification / separation of evidence | (same run) | Answer separates public evidence from internal evidence; no fabricated citations (judge check). |
| LLM-wiki artifact creation (`init`/`ingest`) | Run `POST /api/intelligence/deep-agent/llm-wiki` `mode=ingest` on a topic with staged `raw/` sources. | `wiki/*.md` pages + `wiki/index.md` written; `log.md` appended; `_collect_artifacts()` returns `source`/`markdown`/`log` types. |
| Artifact retrieval ("research and past work") | Load `/deep-research`, then `GET /api/admin/deep-research/archive?userId&topicSlug&sessionId`. | Workspace card shows topic, updated time, wiki-page/source counts, latest log summary; file list + content preview render. |
| Graceful-empty | Hit the archive route with the backend endpoint absent. | Returns `{ projects: [], selectedProject: null, artifacts: [] }`, no 500. |

> ✅ **Fixed (2026-06-09):** the `alleato-backend` Render web service now mounts a 1GB
> persistent disk at `/data`, and `LLM_WIKI_OUTPUT_ROOT` / `DOCS_RESEARCH_OUTPUT_ROOT` /
> `CONTENT_BUILDER_OUTPUT_ROOT` point at `/data/*` instead of `/tmp` (see `render.yaml`).
> The `/health` endpoint now returns `deep_agent_storage.durable` — a prod monitor should
> alert if that flag is ever `false`. Guard logic: `storage_durability_status()` in
> `backend/src/services/agents/llm_wiki/agent.py` (unit-tested in `test_llm_wiki_agent.py`).

---

## 21. Memory systems

The user's vocabulary maps to real mechanisms as follows (verified against the codebase):

| User's term | Real mechanism | Backing store | Wired live? |
|---|---|---|---|
| **Short-term memory** | Conversation transcript | `chat_history` table (MAIN) | ✅ yes |
| **Cross-session memory** | Conversation summaries | `memories` table (MAIN) | ✅ yes (yaml mislabels it "legacy" — correction queued) |
| **Long-term / durable memory** | Typed user memories (fact/preference/lesson/commitment/context) | `ai_memories` table (27,990 rows) + vectors in `document_chunks` (AI DB) | ✅ yes — extracted by `memory-extraction.ts`, injected each turn by `ai-memory-service.ts` |
| **Knowledge memory (RAG)** | Embedded document/email/meeting chunks | `document_chunks` (AI DB, 24K+) | ✅ yes |
| **Backend Deep Agents memory** | `<durable_memory>` middleware block + recall tools | reads `ai_memories` via SQL | ✅ read; ✍️ write is approval-only (`propose_memory_candidate` does **not** persist) |
| **"Scratch / working memory"** | ❌ No such named concept | closest analog = per-request transcript reload + ephemeral LangGraph private state | n/a |
| (separate) guardrail store | `agent_learnings` (yaml also calls this "durable memory" — likely source of terminology confusion) | `agent_learnings` table | ✅ separate system |
| (dead) | `ai_memory` (singular) table | — | ❌ dead, no consumers |

### Memory evals

| Mechanism | Eval question(s) | Pass criteria |
|---|---|---|
| Write long-term memory | "Remember that I prefer financial answers in a table, not prose." → (later turn) "Give me Union Collective's financials." | `writeMemory` fires turn 1; row in `ai_memories` type=preference; turn 2 answer is a table. |
| Recall long-term memory | New session: "What do you know about how I like answers formatted?" | `searchMemories` fires; preference recalled across sessions. |
| `writeMemory` (tool) | operational.ts:2796 — "Note for the future: the owner's name is Pat and they hate jargon." | `writeMemory` fires; durable user memory stored. |
| `searchMemories` (tool) | operational.ts:2737 — "What preferences do you have on file for me?" | `searchMemories` fires; returns stored facts/preferences. |
| `recallPastConversations` (tool) | operational.ts:2061 — "What did we discuss about the GMP last week?" | `recallPastConversations` fires; prior conversation surfaced. |
| Short-term (in-session) | Turn 1: "Focus on Union Collective." Turn 2: "What's its budget status?" (no project named) | Turn 2 resolves "its" to Union Collective from transcript — no re-ask. |
| Cross-session summary | New session: "Summarize where we left off on Union Collective." | Pulls from `memories` summary, not a cold start. |
| RAG knowledge memory | "What did the geotech report conclude about soil bearing capacity?" | retrieval hits `document_chunks`; answer cites the doc. |
| No-fabrication guardrail | "What did I tell you about my budget last year?" (when nothing stored) | Assistant says it has nothing on file — does NOT invent a memory. |
| Backend durable-memory write gate | (Deep Agents path) "Permanently remember X." | `propose_memory_candidate` proposes but does NOT auto-persist; requires approval. |

---

## Coverage summary & recommended next steps

- **Total tools:** ~99 + deep-research agent + 9 memory evals.
- **Existing suite (`assistant-eval-suite.json`, ~129 cases)** already covers the high-traffic read paths well (briefings, meetings, emails, semantic search, portfolio). Those are the ✅/🟡 rows.
- **Biggest gaps (❌):** the **write/action tools** (`action-tools.ts`, progress reports, feature-request/Linear, marketing, workspace artifacts), almost all **Acumatica** tools, **structured-query** tools, and **document-intelligence** tools. Write tools are the riskiest to leave untested because they mutate production data.

**Recommended sequencing:**
1. **Write-tool evals first** — every `create*`/`update*`/`delete*`/`send*`/`draft*` tool gets a direct eval that asserts the tool fired AND the DB row/draft exists, with a seeded-then-cleaned-up test project. These are the rows where a silent failure does real damage.
2. **Operator-gate invariants** — assert preview-then-confirm on all ⚙️ tools, and assert the **no-`sendOutlookEmail`** invariant.
3. **Acumatica cluster** — one direct eval per tool against live ERP (guard: no OData `$filter`).
4. **Memory matrix** — the 9 memory evals above, especially cross-session recall and no-fabrication.
5. **Deep-research** — the 6 deep-research evals, plus a production monitor that `LLM_WIKI_OUTPUT_ROOT` is a durable (non-`/tmp`) path.
6. Wire it all into one unified runner (the current gap: coverage is split across `.mjs` runners, Python scripts, an admin UI, and LangSmith with no single entry point).
