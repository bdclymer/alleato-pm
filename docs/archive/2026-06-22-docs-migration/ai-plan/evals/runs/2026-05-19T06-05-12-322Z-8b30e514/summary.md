# AI Assistant Eval Suite — 2026-05-19T06-05-12-322Z-8b30e514

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `strategic-advisor-quality`
- Bundle description: LLM-judge eval for whether the assistant sounds like an intelligent executive strategist instead of a document retriever.
- Filter: `(realworld-most-important-tasks|realworld-waiting-on-team|realworld-business-risks|realworld-systems-processes-needed|portfolio-morning-standup|owner-prep-call-westfield)$`
- Total: 6
- Passed: 5
- Failed: 1
- Warnings: 7
- Backend Deep Agents memory candidates: 0
- Judge: 6 judged, 6 passed, 0 failed, 0 errors, avg 4.17 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-systems-processes-needed | implementation_planning | ✅ | 76544ms | duration 76544ms exceeded warning budget 45000ms |
| portfolio-morning-standup | portfolio_briefing | ✅ | 73297ms | duration 73297ms exceeded warning budget 45000ms |
| realworld-business-risks | risk_review | ✅ | 61708ms | duration 61708ms exceeded warning budget 45000ms |
| realworld-waiting-on-team | task_management | ✅ | 57748ms | duration 57748ms exceeded warning budget 45000ms |
| realworld-most-important-tasks | task_management | ✅ | 53607ms | duration 53607ms exceeded warning budget 45000ms |
| owner-prep-call-westfield | project_briefing | ❌ | 26639ms | expected family 'semantic' not represented; expected family 'communications' not represented |

## Bundle Criteria

- The answer must lead with a clear business point of view.
- The answer must connect evidence into implications, not just list retrieved facts.
- The answer must include specific next actions or decisions.
- The answer must sound like a high-level Alleato strategist, not a generic RAG summary.
- The answer must acknowledge source gaps without hiding behind them.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| portfolio-morning-standup | portfolio_briefing | ✅ | 73297ms | strategic_advisor: pass (5/4) | 0 | getPortfolioOverview, getProjectsWithRisks, getActionItemsAndInsights, semanticSearch | — |
| owner-prep-call-westfield | project_briefing | ❌ | 26639ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentProjectStatus, project_lookup, packet_reader, teams_reader, meetings_reader, emails_reader, documents_reader, financials_reader, schedule_reader, rfi_reader, submittal_reader, deepagents_runtime | expected at least one of [getProjectBriefingSnapshot, semanticSearch] to fire — none did |
| realworld-most-important-tasks | task_management | ✅ | 53607ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, getActionItemsAndInsights, semanticSearch | — |
| realworld-waiting-on-team | task_management | ✅ | 57748ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, getActionItemsAndInsights, semanticSearch | — |
| realworld-business-risks | risk_review | ✅ | 61708ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, listDomainIntelligence, getDomainIntelligence, semanticSearch | — |
| realworld-systems-processes-needed | implementation_planning | ✅ | 76544ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, semanticSearch | — |

## Judge notes

### portfolio-morning-standup

- Rubric: `strategic_advisor`
- Score: 5 / 4 (pass)
- Summary: Strong strategic operating read. It leads with a clear judgment that the portfolio is active but not clean, ties risk concentration to specific jobs and business implications, calls out process weakness in task capture, and gives operational next steps. It also stays honest about the weak structured-task evidence and flags a data gap instead of pretending otherwise.
- Weaknesses: Could be even sharper on a single portfolio-level verdict beyond the detailed job-by-job commentary.; Some next steps are strong but not fully assigned to named owners or exact timing beyond 'today' or implied responsibility.; A few sections are somewhat long for a 'quick operating read,' though the substance remains high quality.

### owner-prep-call-westfield

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer gives a clear executive stance: tell the owner the project has execution drag and unapproved change exposure, and avoid committing to a recovery or turnover date. It uses concrete project facts, distinguishes what is known from what is not, and warns against overpromising. It is slightly less strong on strategic depth because it does not fully frame the commercial/schedule tradeoff or the best owner-facing message beyond the immediate cautions.
- Weaknesses: Could be more strategic about the business implication: schedule slippage plus unapproved change exposure creates owner-trust and cash-flow risk.; Recommendations are directionally useful but not fully operationalized with owners/timing.; Does not surface additional owner concerns like payment timing, critical-path recovery plan, or decision log discipline.; The framing is strong but somewhat formulaic; it could better sound like a senior project executive advising on relationship management and risk posture.

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is operationally useful and mostly grounded in the task data. It prioritizes overdue blockers, identifies specific owners and due dates, and calls out a few second-order risks like schedule drift and repeated unresolved items. It is not purely a data recap. The main weakness is that it sometimes overreaches into broader risk narratives and candidate follow-ups without clearly separating verified task items from inferred concerns.
- Weaknesses: The executive point of view is somewhat buried under task listing; it could be sharper about what matters most now.; Several recommendations are generic ('do a quick cleanup pass', 'force resolution') without concrete next-step mechanics beyond the priority order.; The response blurs the line between confirmed tasks and inferred risk signals, which weakens evidence discipline.; It mentions broader metrics like open tasks, overdue items, and RFIs without tying them directly to the user's immediate decision framework.; Some language reads like a task dump with commentary rather than a concise strategist's diagnosis.

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer gives a useful, operationally grounded list of who the user is waiting on, flags overdue items and duplicates, and distinguishes team-owned items from user-owned or stale work. It is not perfect because it leans on system labels without enough evidence checking, but it does provide an executive-style prioritization and next steps.
- Weaknesses: Does not fully justify why the named items are the correct set beyond citing the action-item source; evidence handling is acceptable but thin.; The response mixes in potentially irrelevant items the user is waiting on without clearly separating true team blockers from other open items until later.; No explicit owner/timing for the recommended follow-ups beyond a generic priority order.; Some phrasing suggests certainty about duplicates and stale carryover without showing enough underlying evidence to verify each claim.; Could be sharper strategically about which blocker matters most to business outcomes, not just operational overdue status.

### realworld-business-risks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically strong and clearly not a generic recap. It leads with a point of view, ties evidence to business implications, and surfaces hidden risks like system fragility, people dependency, and scale risk. It is also appropriately honest about missing live financial evidence. The main limitation is that some next steps are broad rather than tightly operationalized with owners/timing, and the response could rank risks more explicitly by urgency or severity.
- Weaknesses: Operational next steps are directionally good but not fully specific on owner, timing, or sequencing.; Risk prioritization is implied rather than explicitly ranked by severity and immediacy.; Some claims rely on cited packets without showing enough proof detail to independently validate the magnitude of each risk.; The response could more directly separate near-term existential risks from chronic inefficiencies.

### realworld-systems-processes-needed

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: Strong operational advice with clear point of view, concrete systems, and honest caveats. It goes beyond recap by prioritizing ownership, SOPs, workflow status, testing, and onboarding architecture. The main weakness is that it is still somewhat generic at the execution level: owners, timing, and sequencing are suggested but not fully assigned in a way that would make this immediately implementable without follow-up.
- Weaknesses: Some recommendations are still broad and would benefit from exact owners, deadlines, and implementation sequencing.; A few phrases are slightly generic/consultative in tone rather than sharply strategic, especially in the closing roll-up.; The answer assumes the company can operationalize a broad stack of systems without discussing capacity, change management, or which leader should own the program.; Evidence citations are present but not tightly tied to each recommendation in a way that fully proves priority or urgency.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 5 |
| `backendDeepAgentExecutiveBriefing` | 4 |
| `getActionItemsAndInsights` | 3 |
| `getPortfolioOverview` | 1 |
| `getProjectsWithRisks` | 1 |
| `backendDeepAgentProjectStatus` | 1 |
| `project_lookup` | 1 |
| `packet_reader` | 1 |
| `teams_reader` | 1 |
| `meetings_reader` | 1 |
| `emails_reader` | 1 |
| `documents_reader` | 1 |
| `financials_reader` | 1 |
| `schedule_reader` | 1 |
| `rfi_reader` | 1 |
| `submittal_reader` | 1 |
| `deepagents_runtime` | 1 |
| `listDomainIntelligence` | 1 |
| `getDomainIntelligence` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
- `getProjectBriefingSnapshot`
- `getProjectBudgetSummary`
- `getProjectDetails`
- `getProjectRiskAnalysis`
- `getRFIStatus`
- `getRecentBills`
- `getRecentEmails`
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
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
