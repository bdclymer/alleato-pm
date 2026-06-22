# AI Assistant Eval Suite — 2026-05-19T11-22-37-369Z-4769350a

- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Bundle: `strategic-rag-operator-quality`
- Bundle description: LLM-judge eval for cross-source strategic RAG questions: ASRS sprinkler design time sinks, Microsoft Office importance filtering, and weekly meeting risk synthesis.
- Filter: `strategic-rag-(asrs-sprinkler-time-sink|office-morning-importance|weekly-meeting-risks|cross-source-open-loops)$`
- Total: 4
- Passed: 2
- Failed: 2
- Warnings: 1
- Backend Deep Agents memory candidates: 0
- Judge: 4 judged, 3 passed, 1 failed, 0 errors, avg 4 (openai/gpt-5.4-mini)

## Slowest Cases

| Case | Intent | Status | Duration | Warnings |
|---|---|---|---|---|
| strategic-rag-office-morning-importance | email_query | ❌ | 52699ms | duration 52699ms exceeded warning budget 45000ms |
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 42094ms | — |
| strategic-rag-weekly-meeting-risks | meeting_query | ✅ | 40859ms | — |
| strategic-rag-cross-source-open-loops | strategic_rag | ❌ | 40353ms | — |

## Bundle Criteria

- The assistant must retrieve or explicitly attempt the relevant source families for the prompt.
- The answer must filter important signals from routine source noise.
- The answer must synthesize across sources into a business point of view, not dump raw source summaries.
- The answer must rank issues by time, money, schedule, owner risk, or decision impact.
- The answer must include a concrete next action or verification step and name source gaps honestly.

## Per-case results

| Case | Intent | Status | Duration | Judge | Memory candidates | Tools fired | Failures |
|---|---|---|---|---|---|---|---|
| strategic-rag-asrs-sprinkler-time-sink | strategic_rag | ✅ | 42094ms | strategic_advisor: pass (4/4) | 0 | searchDocuments, searchMeetingsByTopic, semanticSearch | — |
| strategic-rag-office-morning-importance | email_query | ❌ | 52699ms | email_operator: fail (3/4) | 0 | consultMicrosoftExecutiveAssistant | consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live; judge email_operator score 3 < 4: Good prioritization of a genuine Vercel usage warning and some likely actionable project emails, but it overstates certainty in a few places and invents/infers thread details (e.g. ceiling height pending, teammate will respond tomorrow) that are not supported by the prompt. The response also blurs confirmed inbox items versus judgments and does not consistently separate user-owned actions from merely observed messages. It is reasonably useful, but not reliable enough for a passing operational inbox triage. |
| strategic-rag-weekly-meeting-risks | meeting_query | ✅ | 40859ms | strategic_advisor: pass (5/4) | 0 | backendDeepAgentExecutiveBriefing, getMeetingIntelligence, sourceSpecificRagRetrieval | — |
| strategic-rag-cross-source-open-loops | strategic_rag | ❌ | 40353ms | strategic_advisor: pass (4/4) | 0 | getMeetingIntelligence, getActionItemsAndInsights, semanticSearch, sourceSpecificRagRetrieval | expected required tool 'consultMicrosoftExecutiveAssistant' to fire; consultMicrosoftExecutiveAssistant trace sources [(none)] did not include required microsoft_graph_live |

## Judge notes

### strategic-rag-asrs-sprinkler-time-sink

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is appropriately cautious and project-specific: it explicitly says there is no direct Exol Wilmer / 26-103 ASRS sprinkler evidence and refuses to substitute adjacent fire-alarm/electrical material. It gives a clear executive conclusion—evidence is missing—rather than pretending to identify a bottleneck. However, it does not actually answer the underlying question about the most time-consuming part, beyond saying it cannot be proven, so the strategic value is limited. Overall it meets the minimum by handling evidence honestly and anchoring claims to the requested project.
- Weaknesses: Does not identify the most time-consuming part because the evidence is absent; this is a valid limitation but leaves the core question unanswered.; The response is mostly a evidence-status report rather than a strategic interpretation of what the missing evidence implies for next steps or risk.; The suggested follow-up search terms are reasonable but generic; no owner or timing is provided.; It could more explicitly distinguish background project context from proof, though it does so implicitly.

### strategic-rag-office-morning-importance

- Rubric: `email_operator`
- Score: 3 / 4 (fail)
- Summary: Good prioritization of a genuine Vercel usage warning and some likely actionable project emails, but it overstates certainty in a few places and invents/infers thread details (e.g. ceiling height pending, teammate will respond tomorrow) that are not supported by the prompt. The response also blurs confirmed inbox items versus judgments and does not consistently separate user-owned actions from merely observed messages. It is reasonably useful, but not reliable enough for a passing operational inbox triage.
- Weaknesses: Invents unsupported details about thread status and context (for example, 'ceiling height is still pending' and 'teammate will respond tomorrow').; Uses certainty language ('This is the one real alert') without adequately backing it with evidence.; Does not clearly distinguish confirmed user-owned actions from inbox items that merely exist.; The 'watch' and 'reply' labels are somewhat inconsistent with the evidence provided; several items are inferred as actionable without explaining why.; The answer says 'Live Outlook worked' and 'This was not a cache fallback,' which is operational metadata not needed for the triage and not requested.

### strategic-rag-weekly-meeting-risks

- Rubric: `strategic_advisor`
- Score: 5 / 4 (pass)
- Summary: The answer is strong and business-oriented: it identifies concrete risks across operations and specific projects, explains why they matter, and gives actionable next steps. It is not just a meeting recap. The main limitation is that it blends several projects and company-wide themes, but it still generally anchors claims to the requested meeting period and flags operational implications well.
- Weaknesses: Some project-level points are framed broadly and could be more tightly tied to a single meeting artifact or quoted evidence.; A few recommendations could be more operationally precise with explicit decision criteria or deadlines.; The answer mixes company-wide operational issues and project-specific risks in one flow, which is useful strategically but slightly reduces clarity for a pure meeting-insights request.

### strategic-rag-cross-source-open-loops

- Rubric: `strategic_advisor`
- Score: 4 / 4 (pass)
- Summary: The answer is strategically useful and anchored in real meeting evidence. It identifies multiple open loops, distinguishes internal office workflow issues from project-specific risks, and gives operational next steps. The main weakness is that it is somewhat sprawling and occasionally overconfident in tying together meeting and Office-message evidence when it admits the message layer was thin. Still, it meets the bar for a strategic advisor because it prioritizes issues, explains business implications, and avoids obvious fabrication.
- Weaknesses: The ranking of the 'biggest' open loops is somewhat subjective and not tightly justified against all available evidence.; Some next steps are a bit generic (e.g., 'get one owner to confirm') and could be more concrete about who exactly owns each item.; The answer leans heavily on meetings and only lightly on Office messages, despite the prompt asking for both; it admits the gap but still presents a broad conclusion.; A few claims feel aggregated across multiple meetings without always separating what is confirmed versus inferred.; Could do a better job distinguishing project-specific evidence from background operating issues to avoid slight blending of unrelated threads.

## Tool coverage across the suite

| Tool | Hits |
|---|---|
| `semanticSearch` | 2 |
| `getMeetingIntelligence` | 2 |
| `sourceSpecificRagRetrieval` | 2 |
| `searchDocuments` | 1 |
| `searchMeetingsByTopic` | 1 |
| `consultMicrosoftExecutiveAssistant` | 1 |
| `backendDeepAgentExecutiveBriefing` | 1 |
| `getActionItemsAndInsights` | 1 |

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
