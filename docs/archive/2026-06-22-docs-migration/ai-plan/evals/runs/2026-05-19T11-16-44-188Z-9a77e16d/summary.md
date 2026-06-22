# AI Assistant Eval Suite — 2026-05-19T11-16-44-188Z-9a77e16d

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `strategic-rag-operator-quality`
- Bundle description: LLM-judge eval for cross-source strategic RAG questions: ASRS sprinkler design time sinks, Microsoft Office importance filtering, and weekly meeting risk synthesis.
- Filter: `strategic-rag-(asrs-sprinkler-time-sink|office-morning-importance|weekly-meeting-risks|cross-source-open-loops)$`
- Total: 4
- Passed: 2
- Failed: 2
- Warnings: 2
- Backend Deep Agents memory candidates: 0
- Judge: 4 judged, 3 passed, 1 failed, 0 errors, avg 4.25 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| strategic-rag-weekly-meeting-risks | meeting_query | ✅ | 44932ms | expected family 'meetings' not represented |
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ❌ | 42276ms | — |
| strategic-rag-cross-source-open-loops | strategic_rag | ✅ | 40780ms | expected family 'actions' not represented |
| strategic-rag-office-morning-importance | email_query | ❌ | 38984ms | — |

## Bundle Criteria

- The assistant must retrieve or explicitly attempt the relevant source families for the prompt.
- The answer must filter important signals from routine source noise.
- The answer must synthesize across sources into a business point of view, not dump raw source summaries.
- The answer must rank issues by time, money, schedule, owner risk, or decision impact.
- The answer must include a concrete next action or verification step and name source gaps honestly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ❌ | 42276ms | strategic_advisor: pass (5/4) | 0 | searchDocuments, searchMeetingsByTopic, semanticSearch | response_quality.sourceQuality low < medium |
| strategic-rag-office-morning-importance | email_query | ❌ | 38984ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 3 < 4: The response does a decent job separating routine noise from a few actionable items, but it still invents certainty and includes unsupported judgments. It is useful as a triage list, yet not reliable enough for an operator-grade email summary because several claims go beyond the visible evidence and it does not clearly distinguish what Brandon personally must handle versus what merely exists in the inbox. |
| strategic-rag-weekly-meeting-risks | meeting_query | ✅ | 44932ms | strategic_advisor: pass (5/4) | 0 | backendDeepAgentExecutiveBriefing, getMeetingIntelligence, sourceSpecificRagRetrieval | — |
| strategic-rag-cross-source-open-loops | strategic_rag | ✅ | 40780ms | strategic_advisor: pass (4/4) | 0 | getMeetingIntelligence, getDomainIntelligence, searchMeetingsByTopic, semanticSearch, sourceSpecificRagRetrieval | — |

## Judge notes

### strategic-rag-asrs-sprinkler-time-sink

- Rubric: `strategic_advisor`
- Score: 5 / 4 (pass)
- Summary: The answer does the most important thing correctly: it refuses to manufacture a project-specific conclusion for Exol Wilmer / 26-103 when the direct ASRS sprinkler evidence is missing. It cleanly separates adjacent fire-alarm/permitting material from ASRS sprinkler design and explicitly warns against using the Exotec In-Rack Sprinkler CO-01 thread as proof. That is strong evidence discipline and project anchoring.
- Weaknesses: Does not identify the actual most time-consuming part because the record appears insufficient; this is appropriate, but leaves the user without the requested substantive answer.; Could have been slightly more specific about which source types were checked and which exact artifacts were negative hits, though it is still adequate.; No owners/timing next steps are provided, but the prompt did not require them given the evidence gap.

### strategic-rag-office-morning-importance

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: The response does a decent job separating routine noise from a few actionable items, but it still invents certainty and includes unsupported judgments. It is useful as a triage list, yet not reliable enough for an operator-grade email summary because several claims go beyond the visible evidence and it does not clearly distinguish what Brandon personally must handle versus what merely exists in the inbox.
- Weaknesses: Claims 'Nothing needs an immediate Teams alert' without evidence that Teams alerts are relevant or that urgency was assessed against Brandon’s actual priorities.; Adds unsupported interpretations such as 'real project movement,' 'likely needs acknowledgment if you own it,' and 'somebody should review the file' without clear thread evidence.; Does not clearly identify why each item matters in business terms or what could happen if ignored beyond generic drift language.; The 'Ignore / noise' section includes a phishing accusation that is plausible but not proven from the visible content; that is too assertive for the available data.; The response says 'What I’d do next' but does not give a crisp operator queue or owner-specific next step for every actionable item.

### strategic-rag-weekly-meeting-risks

- Rubric: `strategic_advisor`
- Score: 5 / 4 (pass)
- Summary: Strong executive synthesis with clear prioritization, concrete project-level risks, and honest uncertainty. It does more than recap meetings: it identifies a cross-cutting pattern of low slack, then ties that pattern to specific implications for schedule, cost, closeout, and staffing. The answer is appropriately anchored to the cited projects and distinguishes background process issues from project-specific risks. It also avoids overclaiming by explicitly noting what cannot be confirmed from the summary alone.
- Weaknesses: Operational next steps are directional but not consistently owner/timing specific; only the prioritization list is concrete, not a full action plan.; Some phrasing is still broad at the executive level and could be sharper on what leadership should decide this week versus monitor.; The answer relies on meeting intelligence aggregation counts, but does not explain which counts map to which projects or actions, limiting auditability.; Could have been even more explicit about tradeoffs, for example where cost-cutting redesign may reduce scope quality or future change-order risk.

### strategic-rag-cross-source-open-loops

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategic and specific enough to pass: it identifies recurring execution risks, explains why they matter, and is honest about evidence limits. It loses points for mixing project-adjacent examples without fully anchoring every claim to the requested week, and for giving only partial ownership/timing detail.
- Weaknesses: Several bullets reference adjacent-project or domain synthesis material without enough project-specific grounding for the exact requested weekly open loops.; Operational next steps are directionally useful but not specific enough on named owners, exact deadlines, or decision points.; The answer reads a bit like a synthesized operations memo rather than a tight extract of 'this week's meetings and Office messages.'; It could separate confirmed open loops from inferred systemic risks more cleanly to avoid blurring evidence with interpretation.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `searchMeetingsByTopic` | 2 |
| `semanticSearch` | 2 |
| `getMeetingIntelligence` | 2 |
| `sourceSpecificRagRetrieval` | 2 |
| `searchDocuments` | 1 |
| `consultMicrosoftExecutiveAssistant` | 1 |
| `backendDeepAgentExecutiveBriefing` | 1 |
| `getDomainIntelligence` | 1 |

## Tools defined but never fired in this run

- `assistantSourceHealth`
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
- `searchEmails`
- `searchExternalDocuments`
- `searchMemories`
- `searchStructuredFinancialRows`
- `searchTeamsMessages`
- `searchWeb`
- `sourceLookupIntentRouter`
- `updateGeneratedTask`
- `writeMemory`
