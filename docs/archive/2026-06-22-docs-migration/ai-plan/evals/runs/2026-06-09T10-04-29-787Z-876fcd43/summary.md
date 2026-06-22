# AI Assistant Eval Suite — 2026-06-09T10-04-29-787Z-876fcd43

- Endpoint: `https://alleato-2jh3a338a-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `task-action-items-regression`
- Bundle description: Agentic-eval guardrail for task and action-item prompts. The assistant must recognize common owner phrasing for tasks, action items, open loops, and waiting-on-team questions without requiring exact wording.
- Filter: `(tasks-list-of-action-items-canonical|tasks-what-do-i-need-to-do-today|tasks-open-loops-all|tasks-whats-on-my-list|realworld-most-important-tasks|realworld-waiting-on-team)$`
- Total: 6
- Passed: 6
- Failed: 0
- Warnings: 3
- Backend Deep Agents memory candidates: 0
- Judge: 2 judged, 2 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-waiting-on-team | task_management | ✅ | 61985ms | global forbidden phrase: "retrieval"; duration 61985ms exceeded warning budget 30000ms |
| realworld-most-important-tasks | task_management | ✅ | 55663ms | duration 55663ms exceeded warning budget 30000ms |
| tasks-list-of-action-items-canonical | task_management | ✅ | 2381ms | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 564ms | — |
| tasks-open-loops-all | task_management | ✅ | 522ms | — |
| tasks-whats-on-my-list | task_management | ✅ | 362ms | — |

## Bundle Criteria

- Every task-list variant must use a source-backed task or action-item tool.
- The assistant must not ask which list, project, or action item source the user means.
- Owner phrasing like open loops, my list, and waiting on my team must route as task/action-item retrieval.
- Answers must be direct and useful enough for morning triage, not generic planning advice.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| tasks-list-of-action-items-canonical | task_management | ✅ | 2381ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 564ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 522ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-whats-on-my-list | task_management | ✅ | 362ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| realworld-most-important-tasks | task_management | ✅ | 55663ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 61985ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |

## Judge notes

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically useful and not just a recap: it identifies the highest-leverage live items, distinguishes project work from stale/noisy tasks, and flags Westfield as an unresolved risk cluster. It is honest about evidence quality and gives a practical triage order, though it could be more decisive and operationally specific about owners/timing.
- Weaknesses: Operational next steps are only partially specific; owners and timing are implied more than assigned.; Some prioritization is still somewhat generic ('clean closeout push', 'triage list') rather than a crisp executive action plan.; Could better separate immediate personal tasks from project-critical tasks with a tighter ranking and rationale.; Does not quantify impact or urgency beyond overdue status, so the business case for the top order could be sharper.

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is operationally useful and mostly anchored to task data, with a clear read that the user is waiting on overdue follow-through from specific people. It goes beyond a neutral recap by prioritizing bottlenecks and calling out duplicate task records and stalled accountability. The main weakness is that it mixes in adjacent-project/background material and some speculative framing, but it does acknowledge a retrieval gap and avoids obvious fabrication.
- Weaknesses: Includes adjacent-project/background material (for example Westfield Collective and prior Teams messages) that is not clearly tied to the immediate request.; Some claims are framed more strongly than the evidence supports, such as implying broader stalled accountability from duplicate tasks alone.; Does not fully separate what is directly actionable from what is merely contextual background.; Operational next steps are helpful but not assigned with clear owners/timing beyond general prioritization.; The response is somewhat verbose for a simple 'what am I waiting on' question and could be tighter.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `getPersonalTaskRegister` | 4 |
| `getMyTasks` | 4 |
| `backendDeepAgentExecutiveBriefing` | 2 |
| `executive_briefing_reader` | 2 |
| `tasks_reader` | 2 |
| `executive_follow_ups_reader` | 2 |
| `emails_reader` | 2 |
| `teams_reader` | 2 |
| `meetings_reader` | 2 |
| `documents_reader` | 2 |
| `projects_reader` | 2 |
| `financials_reader` | 2 |
| `schedule_reader` | 2 |
| `deepagents_runtime` | 2 |
| `clientProjectIntelligencePacket` | 2 |
| `getProjectBriefingSnapshot` | 2 |
| `semanticSearch` | 2 |
| `getActionItemsAndInsights` | 2 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
- `backendDeepAgentProjectStatus`
- `captureFeatureRequest`
- `consultMicrosoftExecutiveAssistant`
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
- `getMeetingIntelligence`
- `getMeetingsByDate`
- `getPeopleAndRoles`
- `getPortfolioOverview`
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
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
