# AI Assistant Eval Suite — 2026-06-09T09-49-09-043Z-c822212b

- Endpoint: `https://alleato-5y4fbd5ji-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `task-action-items-regression`
- Bundle description: Agentic-eval guardrail for task and action-item prompts. The assistant must recognize common owner phrasing for tasks, action items, open loops, and waiting-on-team questions without requiring exact wording.
- Filter: `(tasks-list-of-action-items-canonical|tasks-what-do-i-need-to-do-today|tasks-open-loops-all|tasks-whats-on-my-list|realworld-most-important-tasks|realworld-waiting-on-team)$`
- Total: 6
- Passed: 5
- Failed: 1
- Warnings: 3
- Backend Deep Agents memory candidates: 0
- Judge: 2 judged, 1 passed, 1 failed, 0 errors, avg 3.5 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-most-important-tasks | task_management | ✅ | 57462ms | global forbidden phrase: "retrieval"; duration 57462ms exceeded warning budget 30000ms |
| realworld-waiting-on-team | task_management | ❌ | 49921ms | duration 49921ms exceeded warning budget 30000ms |
| tasks-list-of-action-items-canonical | task_management | ✅ | 3056ms | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 447ms | — |
| tasks-open-loops-all | task_management | ✅ | 411ms | — |
| tasks-whats-on-my-list | task_management | ✅ | 358ms | — |

## Bundle Criteria

- Every task-list variant must use a source-backed task or action-item tool.
- The assistant must not ask which list, project, or action item source the user means.
- Owner phrasing like open loops, my list, and waiting on my team must route as task/action-item retrieval.
- Answers must be direct and useful enough for morning triage, not generic planning advice.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| tasks-list-of-action-items-canonical | task_management | ✅ | 3056ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 447ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 411ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-whats-on-my-list | task_management | ✅ | 358ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| realworld-most-important-tasks | task_management | ✅ | 57462ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ❌ | 49921ms | strategic_advisor: fail (3/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | judge strategic_advisor score 3 < 4: The answer is operationally useful and mostly grounded in extracted tasks, but it reads more like a task dump than an executive assessment. It identifies overdue follow-ups and flags some uncertainty, yet it does not clearly prioritize what matters most, distinguish owner-specific blockers from background noise, or translate the list into a sharper management action plan. |

## Judge notes

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically useful and not just a recap: it identifies the most urgent business risks, distinguishes personal tasks from noisy cross-project items, and gives concrete next actions. It is strongest on evidence handling and operational prioritization, though it could be more decisive about the single highest-priority action and more explicit about ownership/timing for each item.
- Weaknesses: Could be more forceful about the single most important task right now instead of presenting several items with similar weight.; Operational next steps are useful but not always fully specified with owner/timing beyond 'today' or 'immediately'.; The answer still reads somewhat like a triage summary; it could better synthesize second-order risks into a sharper executive recommendation.; It mentions a project-resolution tool limitation, which is honest, but the response could better explain how that affects confidence in the prioritization.; Some items are framed as likely priorities rather than clearly verified personal tasks, which slightly weakens the direct answer to 'my most important tasks right now.'

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 3 / 4 (fail)
- Summary: The answer is operationally useful and mostly grounded in extracted tasks, but it reads more like a task dump than an executive assessment. It identifies overdue follow-ups and flags some uncertainty, yet it does not clearly prioritize what matters most, distinguish owner-specific blockers from background noise, or translate the list into a sharper management action plan.
- Weaknesses: Does not lead with a crisp executive point of view; it starts as a list rather than a prioritized answer to 'what am I waiting on?'; Weak business judgment: it fails to rank the blockers by urgency, client impact, or dependency risk.; Operational next steps are generic and lack owners, timing, or escalation thresholds beyond a broad same-day ask.; Includes adjacent-project material and candidate follow-ups without clearly separating them from the core answer, which dilutes project specificity.; Some phrasing is hedged and repetitive, making it sound like a retriever of extracted items rather than a strategist.

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
