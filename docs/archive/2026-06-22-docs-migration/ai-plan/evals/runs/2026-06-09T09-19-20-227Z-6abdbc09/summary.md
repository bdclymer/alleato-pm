# AI Assistant Eval Suite — 2026-06-09T09-19-20-227Z-6abdbc09

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `task-action-items-regression`
- Bundle description: Agentic-eval guardrail for task and action-item prompts. The assistant must recognize common owner phrasing for tasks, action items, open loops, and waiting-on-team questions without requiring exact wording.
- Filter: `(tasks-list-of-action-items-canonical|tasks-what-do-i-need-to-do-today|tasks-open-loops-all|tasks-whats-on-my-list|realworld-most-important-tasks|realworld-waiting-on-team)$`
- Total: 6
- Passed: 1
- Failed: 5
- Warnings: 7
- Backend Deep Agents memory candidates: 0
- Judge: 2 judged, 1 passed, 1 failed, 0 errors, avg 3.5 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-waiting-on-team | task_management | ❌ | 75032ms | duration 75032ms exceeded warning budget 30000ms |
| realworld-most-important-tasks | task_management | ✅ | 52077ms | duration 52077ms exceeded warning budget 30000ms |
| tasks-list-of-action-items-canonical | task_management | ❌ | 3181ms | expected family 'task_management' not represented |
| tasks-what-do-i-need-to-do-today | task_management | ❌ | 498ms | expected family 'task_management' not represented |
| tasks-open-loops-all | task_management | ❌ | 366ms | expected family 'task_management' not represented; expected family 'actions' not represented |
| tasks-whats-on-my-list | task_management | ❌ | 336ms | expected family 'task_management' not represented |

## Bundle Criteria

- Every task-list variant must use a source-backed task or action-item tool.
- The assistant must not ask which list, project, or action item source the user means.
- Owner phrasing like open loops, my list, and waiting on my team must route as task/action-item retrieval.
- Answers must be direct and useful enough for morning triage, not generic planning advice.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| tasks-list-of-action-items-canonical | task_management | ❌ | 3181ms | — | 0 | getPersonalTaskRegister | expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did; required metadata missing: response_quality |
| tasks-what-do-i-need-to-do-today | task_management | ❌ | 498ms | — | 0 | getPersonalTaskRegister | expected required tool 'getMyTasks' to fire; required metadata missing: response_quality |
| tasks-open-loops-all | task_management | ❌ | 366ms | — | 0 | getPersonalTaskRegister | expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did; required metadata missing: response_quality |
| tasks-whats-on-my-list | task_management | ❌ | 336ms | — | 0 | getPersonalTaskRegister | expected at least one of [getMyTasks, getActionItemsAndInsights] to fire — none did; required metadata missing: response_quality |
| realworld-most-important-tasks | task_management | ✅ | 52077ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ❌ | 75032ms | strategic_advisor: fail (3/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | duration 75032ms exceeded max budget 75000ms; judge strategic_advisor score 3 < 4: The answer is operationally useful and mostly anchored to task data, but it overreaches by elevating Westfield as a dominant theme without clearly tying that to the user’s direct question. It gives some concrete open items and notes duplicates, but it reads more like a task dump than an executive answer about what the user is waiting on from the team. The honesty about source limits is a plus. |

## Judge notes

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically useful and not just a task dump: it identifies Westfield closeout/accountability and insurance follow-up as the real priorities, calls out stale/duplicative task noise, and explicitly notes a data gap. It is strongest on business judgment and honesty about evidence quality. It is weaker on operational specificity because it does not assign clear owners/timing beyond generic next steps, and some claims lean on mixed-source task/insight feeds rather than a clean user-specific task list.
- Weaknesses: Operational next steps are only partially specific; owners are named loosely (Andrew/Chad/Ty) but timing and exact deliverables are not tightly defined.; Some evidence handling is a bit messy: it mixes Teams, email, and action-item insights without clearly separating what is confirmed current versus merely indicative.; The answer does not produce a crisp ranked list of the user's personal tasks; it instead infers priorities from surrounding project signals.; It could better distinguish between tasks the user owns directly and tasks that are merely project noise or delegated follow-ups.; A few statements are broad ('multiple unresolved risk/update signals keep surfacing') without enough concrete proof to fully justify the severity.

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 3 / 4 (fail)
- Summary: The answer is operationally useful and mostly anchored to task data, but it overreaches by elevating Westfield as a dominant theme without clearly tying that to the user’s direct question. It gives some concrete open items and notes duplicates, but it reads more like a task dump than an executive answer about what the user is waiting on from the team. The honesty about source limits is a plus.
- Weaknesses: Does not lead with a crisp executive point of view; it starts with a broad recap instead of the bottom line.; Overweights Westfield and adjacent project patterns without clearly separating them from the direct answer to the user’s question.; Provides limited business implications; it lists tasks but rarely explains why they matter or what risk they create.; Operational next steps are generic and not assigned with clear owners, timing, or escalation logic beyond a broad same-day sweep.; Some claims feel like synthesis from multiple sources rather than tightly anchored to the requested project context.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `getPersonalTaskRegister` | 4 |
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
- `getMyTasks`
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
