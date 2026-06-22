# AI Assistant Eval Suite — 2026-06-09T09-31-59-982Z-9d8ad6cd

- Endpoint: `https://alleato-ih4s3lmtz-meganharrisons-projects.vercel.app/api/ai-assistant/chat`
- Bundle: `task-action-items-regression`
- Bundle description: Agentic-eval guardrail for task and action-item prompts. The assistant must recognize common owner phrasing for tasks, action items, open loops, and waiting-on-team questions without requiring exact wording.
- Filter: `(tasks-list-of-action-items-canonical|tasks-what-do-i-need-to-do-today|tasks-open-loops-all|tasks-whats-on-my-list|realworld-most-important-tasks|realworld-waiting-on-team)$`
- Total: 6
- Passed: 6
- Failed: 0
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 2 judged, 2 passed, 0 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| realworld-waiting-on-team | task_management | ✅ | 68081ms | duration 68081ms exceeded warning budget 30000ms |
| realworld-most-important-tasks | task_management | ✅ | 64240ms | duration 64240ms exceeded warning budget 30000ms |
| tasks-list-of-action-items-canonical | task_management | ✅ | 4346ms | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 350ms | — |
| tasks-whats-on-my-list | task_management | ✅ | 303ms | — |
| tasks-open-loops-all | task_management | ✅ | 258ms | — |

## Bundle Criteria

- Every task-list variant must use a source-backed task or action-item tool.
- The assistant must not ask which list, project, or action item source the user means.
- Owner phrasing like open loops, my list, and waiting on my team must route as task/action-item retrieval.
- Answers must be direct and useful enough for morning triage, not generic planning advice.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| tasks-list-of-action-items-canonical | task_management | ✅ | 4346ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-what-do-i-need-to-do-today | task_management | ✅ | 350ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-open-loops-all | task_management | ✅ | 258ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| tasks-whats-on-my-list | task_management | ✅ | 303ms | — | 0 | getPersonalTaskRegister, getMyTasks | — |
| realworld-most-important-tasks | task_management | ✅ | 64240ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |
| realworld-waiting-on-team | task_management | ✅ | 68081ms | strategic_advisor: pass (4/4) | 0 | backendDeepAgentExecutiveBriefing, executive_briefing_reader, tasks_reader, executive_follow_ups_reader, emails_reader, teams_reader, meetings_reader, documents_reader, projects_reader, financials_reader, schedule_reader, deepagents_runtime, clientProjectIntelligencePacket, getProjectBriefingSnapshot, semanticSearch, getActionItemsAndInsights | — |

## Judge notes

### realworld-most-important-tasks

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically useful and mostly anchored to live action items, not just a recap. It prioritizes overdue client-blocking work, distinguishes verified tasks from risk signals, and admits a data gap. The main weakness is that it mixes project-specific items with broader risk commentary without always making the owner/next-step structure crisp enough, and some recommendations are still a bit generic.
- Weaknesses: Operational next steps are directionally good but not fully specific enough; owners and timing are only partially explicit beyond 'today' and 'next'.; Some items are framed as 'most important' based on inferred strategic risk rather than direct task ownership, which is useful but slightly less rigorous.; The answer could better separate confirmed tasks from adjacent risk signals to avoid blending evidence tiers.; It does not fully prioritize across all items with a crisp executive ranking tied to impact and urgency.; A few phrases sound like a competent task summary rather than a high-level operating plan, especially in the cleanup section.

### realworld-waiting-on-team

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer gives a strong executive read: the user is waiting on overdue follow-through, not just a list of open items. It identifies specific people, tasks, and some operational implications like duplicate tasks and task hygiene. The main weakness is that it mixes solid project-specific evidence with broader noise and a few unsupported generalizations, but it stays mostly anchored and honest about one data gap.
- Weaknesses: Some claims drift into broad interpretation, such as saying the team is updating inside conversations but not closing issues, without strong direct evidence for every project.; The Westfield Collective section feels adjacent and somewhat noisy relative to the direct question of what the user is waiting on from the team.; It does not assign owners/timing for the recommended follow-up actions beyond same-day, which weakens operational specificity.; The answer could better distinguish between the most critical blockers and lower-priority open items.; A few statements about recurring patterns are more strategic than evidentiary, which slightly reduces rigor.

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
