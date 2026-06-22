# AI Assistant Eval Suite — 2026-05-19T04-23-04-166Z-f130e740

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `strategic-advisor-quality`
- Bundle description: LLM-judge eval for whether the assistant sounds like an intelligent executive strategist instead of a document retriever.
- Filter: `(realworld-most-important-tasks|realworld-waiting-on-team|realworld-business-risks|realworld-systems-processes-needed|portfolio-morning-standup|owner-prep-call-westfield)$`
- Total: 6
- Passed: 2
- Failed: 4
- Warnings: 13
- Backend Deep Agents memory candidates: 0
- Judge: 6 judged, 6 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| owner-prep-call-westfield | project_briefing | ✅ | 89176ms | duration 89176ms exceeded warning budget 45000ms |
| portfolio-morning-standup | portfolio_briefing | ✅ | 71775ms | duration 71775ms exceeded warning budget 45000ms |
| realworld-business-risks | risk_review | ❌ | 67260ms | expected family 'project' not represented; expected family 'financial' not represented; expected family 'source_health' not represented; duration 67260ms exceeded warning budget 45000ms |
| realworld-most-important-tasks | task_management | ❌ | 30537ms | expected family 'task_management' not represented; expected family 'actions' not represented |
| realworld-waiting-on-team | task_management | ❌ | 25128ms | expected family 'task_management' not represented; expected family 'actions' not represented |
| realworld-systems-processes-needed | implementation_planning | ❌ | 22826ms | expected family 'project' not represented; expected family 'actions' not represented; expected family 'source_health' not represented |

## Bundle Criteria

- The answer must lead with a clear business point of view.
- The answer must connect evidence into implications, not just list retrieved facts.
- The answer must include specific next actions or decisions.
- The answer must sound like a high-level Alleato strategist, not a generic RAG summary.
- The answer must acknowledge source gaps without hiding behind them.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| portfolio-morning-standup | portfolio_briefing | ✅ | 71775ms | strategic_advisor: pass (4/4) | 0 | getPortfolioOverview, getProjectsWithRisks, getRecentEmails, getMeetingIntelligence, semanticSearch | — |
| owner-prep-call-westfield | project_briefing | ✅ | 89176ms | strategic_advisor: pass (4/4) | 0 | searchEmails, searchTeamsMessages, searchMeetingsByTopic, getProjectBriefingSnapshot, consultCOO, consultCFO, consultCRO, loadIntelligencePacket, semanticSearch | — |
| realworld-most-important-tasks | task_management | ❌ | 30537ms | strategic_advisor: pass (4/4) | 0 | executive_briefing_reader, tasks_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime | expected at least one of [backendDeepAgentExecutiveBriefing, getMyTasks, getActionItemsAndInsights] to fire — none did; expected required tool 'backendDeepAgentExecutiveBriefing' to fire; required metadata missing: response_quality |
| realworld-waiting-on-team | task_management | ❌ | 25128ms | strategic_advisor: pass (4/4) | 0 | executive_briefing_reader, tasks_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime | expected at least one of [backendDeepAgentExecutiveBriefing, getMyTasks, getActionItemsAndInsights, getPeopleAndRoles] to fire — none did; expected required tool 'backendDeepAgentExecutiveBriefing' to fire; required metadata missing: response_quality |
| realworld-business-risks | risk_review | ❌ | 67260ms | strategic_advisor: pass (4/4) | 0 | listDomainIntelligence, getProjectsWithRisks, getDomainIntelligence, semanticSearch | expected required tool 'backendDeepAgentExecutiveBriefing' to fire |
| realworld-systems-processes-needed | implementation_planning | ❌ | 22826ms | strategic_advisor: pass (4/4) | 0 | executive_briefing_reader, tasks_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime | expected at least one of [backendDeepAgentExecutiveBriefing, getPortfolioOverview, getActionItemsAndInsights, assistantSourceHealth] to fire — none did; expected required tool 'backendDeepAgentExecutiveBriefing' to fire |

## Judge notes

### portfolio-morning-standup

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strong on portfolio triage and business implications. It leads with a clear point of view, prioritizes the right jobs, and distinguishes structural risks from routine execution noise. It also handles evidence honestly by flagging stale inputs and missing same-day data. The main gap is that the operating actions are still somewhat high level and not fully owner/timing specific.
- Weaknesses: The action list is directionally useful but not fully operationalized with clear owners, exact timing, and measurable deliverables.; Some claims are very specific, but the answer does not always show enough traceability for why those specific jobs outrank others beyond the provided risk scores.; Could be sharper about portfolio-wide implications beyond the top four jobs, such as cash flow, margin erosion, or management bandwidth allocation.; A few phrases read like polished commentary rather than hard business recommendation, which slightly weakens the strategist tone.; The answer admits stale inputs, but it does not strongly compensate by specifying what should be verified first this morning.

### owner-prep-call-westfield

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer shows a clear executive point of view, ties project evidence to owner-facing risk, and is appropriately cautious about cost/timing commitments. It is strongest where it flags unresolved pricing, technical validation, and stale schedule data. It loses points because it is somewhat long, occasionally reads like a recap of emails rather than a strategic owner briefing, and does not fully prioritize the single most important message the owner should hear first.
- Weaknesses: The opening could be tighter and more executive; it takes several bullets to reach the core message.; Feels partly like a structured evidence dump from recent communications instead of a distilled strategic recommendation.; Next steps are specific but not fully owned or time-bound in a project-control sense.; Does not clearly rank which issue matters most to the owner if pressed for only one headline.; Some details are operationally useful but not fully translated into owner-level business consequences.

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: Good strategic prioritization with explicit business implications and honest uncertainty. It does not just recite inbox items; it identifies active execution threads and explains why they matter (commercial exposure, schedule drag, owner friction). The main weakness is limited operational specificity: next steps are directionally useful but lack owners, sequencing detail, or clear deadlines beyond “today.”
- Weaknesses: Operational next steps are not specific enough: no named owners, no sequence, and no concrete timeboxes beyond 'today.'; Could better distinguish what should be handled personally by the executive versus delegated to project/admin leads.; The recommendation to use the finance/process meeting is plausible but somewhat generic and not tightly supported by the evidence.; Could more explicitly rank the three priorities in order of urgency or risk rather than listing them equally.

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is operationally useful and honest, with a clear read that the team is waiting on closed loops around materials, coordination decisions, access/setup, and a process decision. It does not just recap evidence; it turns it into a practical delay-risk narrative. The main weakness is that the executive point of view is still somewhat generic and the recommendations are broad rather than tightly owned and time-bound.
- Weaknesses: The opening judgment is clear but not especially sharp or differentiated; it reads more like a summary than a decisive executive diagnosis.; Next steps are directionally right but not specific enough on owners, exact deadlines, or sequencing.; The answer could push harder on second-order risks like downstream trade stacking, procurement expediting costs, or client confidence.; It notes open items, but does not prioritize which one is the true critical path versus lower-value admin friction.; Some evidence is older and the answer could better separate stale follow-ups from current blockers.

### realworld-business-risks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: Strong strategic answer with clear executive point of view and credible linkage from evidence to enterprise risk. It identifies a coherent root cause (process fragility/manual workflows/key-person dependency), distinguishes enterprise risks from project-level hot spots, and proposes concrete next steps. The main weakness is some over-specificity on numbers and project rankings without fully showing how material those figures are, but it does acknowledge source limits and avoids obvious fabrication.
- Weaknesses: Some claims feel more asserted than demonstrated, especially the exact severity of the $1.7M revenue issue and the project risk rankings.; The answer mixes enterprise risk review with project-specific diagnostics; useful, but it slightly dilutes the direct response to 'What risks exist in the business right now?'; Next steps are directionally good but not fully operationalized with explicit owners for each action.; A few phrases are high-level and somewhat generic ('heroics instead of a repeatable pursuit process'), though still grounded in the evidence provided.; Could be stronger in distinguishing which risks are confirmed versus inferred from the intelligence sources.

### realworld-systems-processes-needed

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer earns a pass because it moves beyond a generic list and identifies a concrete operating-system gap: weak project controls across documentation, procurement, safety, and cost-code governance. It uses evidence from multiple sources, ties that evidence to business risk, and proposes actionable process changes. The main weakness is that the recommendations are still somewhat broad and lack a sharper implementation sequence with owners/timing.
- Weaknesses: Next steps are directionally good but not prioritized into a phased implementation plan with owners, sequencing, or timing.; Some recommendations are still high-level and not fully tailored to scale, role clarity, or system ownership.; The answer could better distinguish between what should be standardized immediately versus what requires a broader process redesign.; It cites evidence well, but does not quantify impact or identify which gap is most urgent based on business risk.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 3 |
| `executive_briefing_reader` | 3 |
| `tasks_reader` | 3 |
| `emails_reader` | 3 |
| `teams_reader` | 3 |
| `meetings_reader` | 3 |
| `documents_reader` | 3 |
| `projects_reader` | 3 |
| `financials_reader` | 3 |
| `schedule_reader` | 3 |
| `deepagents_runtime` | 3 |
| `getProjectsWithRisks` | 2 |
| `getPortfolioOverview` | 1 |
| `getRecentEmails` | 1 |
| `getMeetingIntelligence` | 1 |
| `searchEmails` | 1 |
| `searchTeamsMessages` | 1 |
| `searchMeetingsByTopic` | 1 |
| `getProjectBriefingSnapshot` | 1 |
| `consultCOO` | 1 |
| `consultCFO` | 1 |
| `consultCRO` | 1 |
| `loadIntelligencePacket` | 1 |
| `listDomainIntelligence` | 1 |
| `getDomainIntelligence` | 1 |

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
- `getMeetingsByDate`
- `getMyTasks`
- `getPeopleAndRoles`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
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
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
