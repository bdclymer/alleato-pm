# AI Tools Inventory — Canonical Reference

**Last verified: 2026-05-19**

This is the synthesis of a four-pass audit of every AI tool in the Alleato codebase. It is the source-of-truth catalog of every `tool({...})` definition, every Python `@tool`, and every agent runtime that wires them. Companion to (not a replacement for) [`AI-RAG-ARCHITECTURE.md`](./AI-RAG-ARCHITECTURE.md). Read that first for the system overview; read this when you need to know what a specific tool does, what it reads, and whether it should stay.

**2026-05-19 follow-up:** Outlook inbox operations have started moving behind the backend Microsoft Executive Assistant specialist. The Strategist now delegates Microsoft operator work through `consultMicrosoftExecutiveAssistant`; stale synced-cache-only tools `getRecentOutlookEmails` and `readOutlookEmailThread` were removed from the active Outlook operations factory. `getRecentEmails` remains the canonical live-first inbox read path for legacy/frontend retrieval, while the specialist owns operator inbox triage and draft/reply workflows.

The audit covers three layers:

- **FE** — Frontend AI orchestration in `frontend/src/lib/ai/` (133 TypeScript tools, ~60 orchestration files, 6 specialist agents)
- **BE** — Python FastAPI backend in `backend/src/services/agents/` (38+ tools, 3 Deep Agents runtimes, 4 sub-agents)
- **SA** — Standalone `alleato-ai/` LangGraph repo (17 orchestrator tools, 4 core sub-agents, plus 3 unrelated example projects)

Source inventories: [`_audit/frontend-tools-inventory.md`](./_audit/frontend-tools-inventory.md), [`_audit/frontend-orchestration-inventory.md`](./_audit/frontend-orchestration-inventory.md), [`_audit/backend-agents-inventory.md`](./_audit/backend-agents-inventory.md), [`_audit/alleato-ai-repo-inventory.md`](./_audit/alleato-ai-repo-inventory.md).

---

## 1. Architecture Map

The three layers do not call each other directly; they overlap in source data and in tool concept, not in runtime invocation.

```
                ┌──────────────────────────────────────────────────────────┐
USER ─chat─▶    │ FRONTEND (FE)                                            │
                │   /api/ai-assistant/chat/route.ts → handler-v2.ts        │
                │     ├─ intent classification (router + model planner)    │
                │     ├─ retrieval/planner.ts → executor.ts → deps.ts      │
                │     ├─ Deep-Agent bridge gates (project/exec/research)   │
                │     │     │                                              │
                │     │     ├─HTTP─▶ Render BACKEND (BE)                   │
                │     │             /api/intelligence/deep-agent/*         │
                │     │             create_deep_agent(gpt-5.4-mini)        │
                │     │              + 4 sub-agents + memory middleware    │
                │     │                                                    │
                │     └─ streamText(Strategist=gpt-5.4)                    │
                │          + createStrategistTools()                       │
                │              ├─ consultCFO/COO/CRO/CHRO/VPBD/CMO         │
                │              │   (each ToolLoopAgent, gpt-5.4-mini)      │
                │              └─ direct project/operational tools         │
                └──────────────────────────────────────────────────────────┘
                                            │
                              shared read   ▼
                ┌──────────────────────────────────────────────────────────┐
                │ DATA LAYER                                               │
                │   PM APP Supabase  (projects, RFIs, change_events…)      │
                │   AI Database      (document_chunks RAG, halfvec 3072)   │
                │   Acumatica REST   (live ERP)                            │
                │   Microsoft Graph  (live inbox/calendar)                 │
                └──────────────────────────────────────────────────────────┘
                                            ▲
                              shared read   │
                ┌──────────────────────────────────────────────────────────┐
                │ STANDALONE (SA)  alleato-ai/                             │
                │   `langgraph.json` exposes one graph `advisor`           │
                │   create_deep_agent(gpt-5.4) + 4 sub-agents + memory     │
                │   Consumed by deep-agents-ui locally; LangGraph deploy   │
                │   No live caller from production FE today                │
                └──────────────────────────────────────────────────────────┘
```

**Entry points by surface:**

| Surface | Path | Layer |
|---|---|---|
| Web chat | `/api/ai-assistant/chat/route.ts` → `handler-v2.ts` | FE |
| Web chat (legacy/simple) | `/api/chat/route.ts` (uses `prompts.ts`, no RAG planner) | FE (legacy) |
| Web chat (v2 fallback) | `/api/ai-assistant-v2/deep-agent/route.ts` | FE → BE |
| Slack/Teams bots | `lib/bot/index.ts`, `lib/bot/teams-chat.ts` → `bot-core.generateBotResponse` | FE |
| Deep-Agent project status | `POST /api/intelligence/deep-agent/project-status` | BE |
| Deep-Agent executive briefing | `POST /api/intelligence/deep-agent/executive-briefing` | BE |
| Deep-Agent research | `POST /api/intelligence/research` | BE |
| Deep-Agent content builder | `POST /api/intelligence/content-builder` | BE |
| Tool inventory introspection | `GET /api/intelligence/deep-agent/tool-inventory` | BE |
| LangGraph SDK | `advisor` graph at `:2024` (local) | SA |

**Where the three runtimes overlap:** SA's `alleato_ai/tools/` is duplicated almost verbatim as BE's `alleato_ai_tools/`. BE adds the FastAPI shell (`deep_project_intelligence.py`) and the content-builder/research agent subdirectories. FE does not import BE or SA Python code — when it wants those capabilities it calls the BE HTTP routes via `deep-agent-project-status.ts`.

---

## 2. Flat Reference Table

Sort: Layer, then File, then tool name. Status legend: `active` = wired into a live runtime; `dead` = stub or known-broken; `unwired` = defined but no caller; `duplicate` = exists in another layer; `misleading-name` = filename or tool name implies a source it does not use.

| Tool | File | Source | Layer | Status | Recommendation |
|---|---|---|---|---|---|
| createChangeOrder | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:prime_contract_change_orders | FE | active | keep |
| createChangeEvent | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:change_events | FE | active | keep |
| updateProjectStatus | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:projects | FE | active | keep |
| createRFI | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:rfis | FE | active | keep |
| createTask | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:tasks (writes via insert; reads project for FK validation) | FE | active | keep |
| createGeneratedTask | frontend/src/lib/ai/tools/action-tools.ts | supabase_rpc:create_ai_generated_task | FE | active | keep |
| updateGeneratedTask | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:tasks | FE | active | keep |
| deleteGeneratedTask | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:tasks | FE | active | keep |
| flagProjectRisk | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:project_risks (+ ai_insights) | FE | active | keep |
| updateRFIStatus | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:rfis | FE | active | keep |
| createMeetingNote | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:document_metadata | FE | active | keep |
| createSubmittal | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:submittals | FE | active | keep |
| logDailyReport | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:daily_logs | FE | active | keep |
| generateProjectSummary | frontend/src/lib/ai/tools/action-tools.ts | multiple (projects + document_metadata reads, no write) | FE | active | keep |
| createInitiativeCard | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:initiative_cards | FE | active | keep |
| createCommitment | frontend/src/lib/ai/tools/action-tools.ts | multiple (supabase_table:subcontracts or purchase_orders + companies) | FE | active | keep |
| createProjectCompany | frontend/src/lib/ai/tools/action-tools.ts | multiple (project_companies + companies) | FE | active | keep |
| createProjectContact | frontend/src/lib/ai/tools/action-tools.ts | multiple (project_directory_memberships + people) | FE | active | keep |
| submitFeedback | frontend/src/lib/ai/tools/action-tools.ts | multiple (admin_feedback_items + ai_feedback_events) | FE | active | keep |
| addBoardItem | frontend/src/lib/ai/tools/action-tools.ts | supabase_table:admin_feedback_items | FE | active | keep |
| createOutlookCalendarInvite | frontend/src/lib/ai/tools/action-tools.ts | microsoft_graph_live | FE | active | keep |
| draftOutlookEmail | frontend/src/lib/ai/tools/action-tools.ts | microsoft_graph_live | FE | active | keep |
| sendTeamsMessage | frontend/src/lib/ai/tools/action-tools.ts | multiple (microsoft_graph_live for send, graph_chat_resolver lookup) | FE | active | keep |
| getAPAgingReport | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active | keep |
| getARAgingReport | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active (broken upstream — HTTP 500 on AR endpoint per SA notes) | keep; track upstream Acumatica fix |
| getCashPositionReport | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active (broken upstream) | keep; track upstream fix |
| getVendorSpendReport | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active | keep |
| getRecentBills | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active | keep |
| getRecentInvoices | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active (broken upstream) | keep; track upstream fix |
| getAcumaticaProjectBudget | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active | keep |
| getAcumaticaProjectList | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active | keep |
| getPurchaseOrderSummary | frontend/src/lib/ai/tools/acumatica.ts | acumatica_live | FE | active (broken upstream) | keep; track upstream fix |
| searchAppHelp | frontend/src/lib/ai/tools/app-help-tools.ts | internal_state | FE | active | keep |
| createDocument | frontend/src/lib/ai/tools/create-document.ts | internal_state | FE | active | keep |
| getSubmittalLog | frontend/src/lib/ai/tools/document-intelligence.ts | supabase_table:submittals | FE | active | keep |
| getSpecRequirements | frontend/src/lib/ai/tools/document-intelligence.ts | document_chunks_rag | FE | active | keep |
| detectMissingSubmittals | frontend/src/lib/ai/tools/document-intelligence.ts | supabase_table:submittals | FE | active | keep |
| logFeedback | frontend/src/lib/ai/tools/document-intelligence.ts | supabase_table:ai_review_feedback | FE | active | keep |
| reviewDocument | frontend/src/lib/ai/tools/document-intelligence.ts | document_chunks_rag | FE | active | keep |
| findRelatedFeatureRequests | frontend/src/lib/ai/tools/feature-request-tools.ts | supabase_table:feature_requests | FE | active | keep |
| captureFeatureRequestPacket | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (feature_requests + feature_request_events) | FE | active | keep |
| updateFeatureRequestPacket | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (feature_requests + feature_request_events) | FE | active | keep |
| scoreFeatureRequestReadiness | frontend/src/lib/ai/tools/feature-request-tools.ts | supabase_table:feature_requests | FE | active | keep |
| generateImplementationPlan | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (implementation_plans + feature_requests) | FE | active | keep |
| generateClaudeCodeHandoff | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (execution_handoffs + feature_requests) | FE | active | keep |
| draftLinearIssueFromFeatureRequest | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (feature_requests + feature_request_linear_events + external_api:linear) | FE | active | keep |
| draftLinearSubIssuesFromImplementationPlan | frontend/src/lib/ai/tools/feature-request-tools.ts | multiple (implementation_plans + feature_request_linear_sub_issues + external_api:linear) | FE | active | keep |
| attachLinearIssueToFeatureRequest | frontend/src/lib/ai/tools/feature-request-tools.ts | supabase_table:feature_requests | FE | active | keep |
| attachLinearSubIssueToFeatureRequest | frontend/src/lib/ai/tools/feature-request-tools.ts | supabase_table:feature_request_linear_sub_issues | FE | active | keep |
| recordLinearStatusUpdateForFeatureRequest | frontend/src/lib/ai/tools/feature-request-tools.ts | supabase_table:feature_request_linear_events | FE | active | keep |
| getCommitmentsOverview | frontend/src/lib/ai/tools/financial.ts | multiple (subcontracts + purchase_orders + schedule_of_values + sov_line_items + companies) | FE | active | keep |
| getChangeOrderDetails | frontend/src/lib/ai/tools/financial.ts | multiple (prime_contract_change_orders + contract_change_orders + change_events + prime_contracts) | FE | active | keep |
| getDirectCostsSummary | frontend/src/lib/ai/tools/financial.ts | multiple (direct_costs + direct_cost_line_items + companies) | FE | active | keep |
| getBudgetLineItems | frontend/src/lib/ai/tools/financial.ts | multiple (v_budget_lines + budget_lines + cost_codes + cost_code_types + budget_line_forecasts + direct_cost_line_items) | FE | active | keep |
| getCostTrends | frontend/src/lib/ai/tools/financial.ts | multiple (direct_costs + owner_invoices + budget_snapshots + prime_contract_change_orders) | FE | active | keep |
| getMarginAnalysis | frontend/src/lib/ai/tools/financial.ts | multiple (prime_contract_financial_summary + direct_costs + schedule_of_values + budget_line_forecasts + prime_contract_change_orders) | FE | active | keep |
| getForecastComparison | frontend/src/lib/ai/tools/forecast-tools.ts | supabase_table:v_budget_lines | FE | active | keep |
| getWeather | frontend/src/lib/ai/tools/get-weather.ts | external_api:open-meteo | FE | unwired | delete (not registered in any tool factory) |
| listDomainIntelligence | frontend/src/lib/ai/tools/intelligence-tools.ts | supabase_table:intelligence_targets | FE | active | keep |
| getDomainIntelligence | frontend/src/lib/ai/tools/intelligence-tools.ts | multiple (intelligence_targets + intelligence_packets + insight_cards) | FE | active | keep |
| findMarketingSourceCandidates | frontend/src/lib/ai/tools/marketing.ts | multiple (document_metadata + insight_cards + projects) | FE | active | keep |
| createMarketingIntelligenceItem | frontend/src/lib/ai/tools/marketing.ts | supabase_table:marketing_intelligence_items | FE | active | keep |
| createMarketingIntelligenceFromCandidate | frontend/src/lib/ai/tools/marketing.ts | supabase_table:marketing_intelligence_items | FE | active | keep |
| createContentCalendarDraft | frontend/src/lib/ai/tools/marketing.ts | multiple (marketing_content_calendar_items + marketing_content_assets + marketing_intelligence_items) | FE | active | keep |
| createMarketingContentAsset | frontend/src/lib/ai/tools/marketing.ts | supabase_table:marketing_content_assets | FE | active | keep |
| getMarketingCalendar | frontend/src/lib/ai/tools/marketing.ts | multiple (marketing_content_calendar_items + marketing_content_assets) | FE | active | keep |
| getPeopleAndRoles | frontend/src/lib/ai/tools/operational.ts | supabase_table:project_directory_memberships | FE | active | keep |
| getVendorPerformance | frontend/src/lib/ai/tools/operational.ts | multiple (subcontracts + purchase_orders + companies) | FE | active | keep |
| getRFIStatus | frontend/src/lib/ai/tools/operational.ts | supabase_table:rfis | FE | active | keep |
| getSubmittalStatus | frontend/src/lib/ai/tools/operational.ts | supabase_table:submittals | FE | active | keep |
| getCrossProjectComparison | frontend/src/lib/ai/tools/operational.ts | multiple (projects + prime_contract_financial_summary + project_issue_summary) | FE | active | keep |
| getHistoricalTrends | frontend/src/lib/ai/tools/operational.ts | multiple (budget_snapshots + change_events + rfis + submittals) | FE | active | keep |
| semanticSearch | frontend/src/lib/ai/tools/operational.ts | document_chunks_rag (primary) + supabase_table:ai_insights + supabase_table:company_context (fallbacks) | FE | active | keep |
| getCompanyKnowledge | frontend/src/lib/ai/tools/operational.ts | supabase_table:company_context | FE | active | keep |
| recallPastConversations | frontend/src/lib/ai/tools/operational.ts | supabase_rpc:search_conversation_memories | FE | active | keep |
| searchMeetingsByTopic | frontend/src/lib/ai/tools/operational.ts | multiple (document_chunks_rag semantic + supabase_table:document_metadata ILIKE) | FE | active | keep |
| getMeetingDetails | frontend/src/lib/ai/tools/operational.ts | multiple (document_metadata + meeting_segments + meeting_action_items joins) | FE | active | keep |
| saveToKnowledgeBase | frontend/src/lib/ai/tools/operational.ts | internal_state (underlying table dropped — always returns error) | FE | dead | delete |
| saveInsight | frontend/src/lib/ai/tools/operational.ts | multiple (ai_insights + insight_cards) | FE | active | keep |
| searchMemories | frontend/src/lib/ai/tools/operational.ts | supabase_rpc:search_conversation_memories | FE | active | merge with `recallPastConversations` (same RPC) |
| writeMemory | frontend/src/lib/ai/tools/operational.ts | supabase_table:memories | FE | active | keep |
| findProject | frontend/src/lib/ai/tools/operational.ts | multiple (projects ILIKE + project_aliases) | FE | active | keep |
| **getRecentEmails** | frontend/src/lib/ai/tools/operational.ts | **microsoft_graph_live PRIMARY, falls back to supabase_table:outlook_email_intake** | FE | active | keep — but see Tier 1 recommendation #1 |
| searchEmails | frontend/src/lib/ai/tools/operational.ts | document_chunks_rag (source_types filter) | FE | active | keep |
| searchTeamsMessages | frontend/src/lib/ai/tools/operational.ts | document_chunks_rag (source_types filter) | FE | active | keep |
| searchExternalDocuments | frontend/src/lib/ai/tools/operational.ts | document_chunks_rag (source_types filter) | FE | active | keep |
| getRecentOutlookEmails | frontend/src/lib/ai/tools/outlook-operations.ts | outlook_email_intake_synced (synced cache only) | FE | removed from active factory | replaced by `consultMicrosoftExecutiveAssistant` and canonical `getRecentEmails` |
| readOutlookEmailThread | frontend/src/lib/ai/tools/outlook-operations.ts | outlook_email_intake_synced | FE | removed from active factory | delegated to Microsoft Executive Assistant |
| getOutlookOperationsStatus | frontend/src/lib/ai/tools/outlook-operations.ts | multiple (graph_sync_state + graph_subscriptions) | FE | active | keep |
| getOutlookCalendarEvents | frontend/src/lib/ai/tools/outlook-operations.ts | microsoft_graph_live | FE | active | keep |
| createWeeklyProgressReportDraft | frontend/src/lib/ai/tools/progress-report-tools.ts | multiple (project_progress_reports + projects + document_metadata + project_emails + project_photos + user_profiles) | FE | active | keep |
| updateProgressReportSections | frontend/src/lib/ai/tools/progress-report-tools.ts | supabase_table:project_progress_reports | FE | active | keep |
| listProgressReportPhotos | frontend/src/lib/ai/tools/progress-report-tools.ts | multiple (project_progress_report_photos + project_photos + project_progress_reports) | FE | active | keep |
| selectProgressReportPhotos | frontend/src/lib/ai/tools/progress-report-tools.ts | supabase_table:project_progress_report_photos | FE | active | keep |
| generateProgressReportPdf | frontend/src/lib/ai/tools/progress-report-tools.ts | multiple (project_progress_reports + project_progress_report_photos) | FE | active | keep |
| getMeetingIntelligence | frontend/src/lib/ai/tools/project-tools.ts | multiple (document_metadata + meeting_segments + meeting_action_items + projects) | FE | active | keep |
| getProjectBriefingSnapshot | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + prime_contract_financial_summary + change_events + prime_contract_change_orders + contract_change_orders + rfis + submittals + schedule_tasks + commitments_unified + collaboration_notifications + document_metadata) | FE | active | keep |
| getPortfolioOverview | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + prime_contract_financial_summary + change_events_summary + project_issue_summary + document_metadata + project_health_dashboard) | FE | active | keep |
| getProjectsWithRisks | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + project_issue_summary + project_health_dashboard + document_metadata + risks) | FE | active | keep |
| getProjectRiskAnalysis | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + risks + document_metadata) | FE | active | keep |
| getFinancialAnalysis | frontend/src/lib/ai/tools/project-tools.ts | multiple (prime_contract_change_orders + rfis + schedule_tasks + projects + v_budget_lines + document_metadata) | FE | active | keep |
| getProjectBudgetSummary | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + v_budget_lines + prime_contract_financial_summary) | FE | active | keep |
| getActionItemsAndInsights | frontend/src/lib/ai/tools/project-tools.ts | multiple (document_metadata + rfis + tasks) | FE | active | keep |
| getMeetingsByDate | frontend/src/lib/ai/tools/project-tools.ts | supabase_table:document_metadata | FE | active | keep |
| findProjectDocuments | frontend/src/lib/ai/tools/project-tools.ts | supabase_table:document_metadata | FE | active | keep |
| searchDocuments | frontend/src/lib/ai/tools/project-tools.ts | supabase_table:document_metadata | FE | active | keep |
| getProjectDetails | frontend/src/lib/ai/tools/project-tools.ts | multiple (projects + prime_contracts + schedule_tasks + rfis + document_metadata) | FE | active | keep |
| requestSuggestions | frontend/src/lib/ai/tools/request-suggestions.ts | internal_state | FE | active | keep |
| getScheduleAnalysis | frontend/src/lib/ai/tools/schedule-tools.ts | multiple (schedule_tasks + projects) | FE | active | keep |
| extractStructuredActionBrief | frontend/src/lib/ai/tools/structured-output.ts | internal_state | FE | active | keep |
| queryBudgetData | frontend/src/lib/ai/tools/structured-queries.ts | supabase_table:budget_lines | FE | active | keep |
| queryChangeOrders | frontend/src/lib/ai/tools/structured-queries.ts | multiple (prime_contract_change_orders + contract_change_orders) | FE | active | keep |
| queryCommitments | frontend/src/lib/ai/tools/structured-queries.ts | supabase_table:commitments_unified | FE | active | keep |
| queryDirectCosts | frontend/src/lib/ai/tools/structured-queries.ts | supabase_table:direct_costs | FE | active | keep |
| queryScheduleTasks | frontend/src/lib/ai/tools/structured-queries.ts | supabase_table:schedule_tasks | FE | active | keep |
| queryDocumentRows | frontend/src/lib/ai/tools/structured-queries.ts | multiple (document_metadata + ai_insights) | FE | active | keep |
| searchStructuredFinancialRows | frontend/src/lib/ai/tools/structured-queries.ts | multiple (budget_lines + commitments_unified + direct_costs) | FE | active | keep |
| updateDocument | frontend/src/lib/ai/tools/update-document.ts | internal_state | FE | active | keep |
| searchWeb | frontend/src/lib/ai/tools/web-search.ts | external_api:tavily | FE | active | keep |
| researchCompany | frontend/src/lib/ai/tools/web-search.ts | external_api:tavily | FE | active | keep |
| searchConstructionMarket | frontend/src/lib/ai/tools/web-search.ts | external_api:tavily | FE | active | keep |
| listWorkspaceArtifacts | frontend/src/lib/ai/tools/workspace-tools.ts | supabase_table:workspace_artifacts | FE | active | keep |
| getDraftArtifact | frontend/src/lib/ai/tools/workspace-tools.ts | supabase_table:workspace_artifacts | FE | active | keep |
| saveWorkspaceArtifact | frontend/src/lib/ai/tools/workspace-tools.ts | multiple (workspace_artifacts + document_chunks_rag for embedding sync) | FE | active | keep |
| promoteWorkspaceArtifact | frontend/src/lib/ai/tools/workspace-tools.ts | supabase_table:workspace_artifacts | FE | active | keep |
| describeAssistantCapabilities | frontend/src/lib/ai/assistant-self-knowledge.ts | internal_state | FE | active | keep |
| explainAssistantRetrievalOrder | frontend/src/lib/ai/assistant-self-knowledge.ts | internal_state | FE | active | keep |
| explainLastAnswerSources | frontend/src/lib/ai/assistant-self-knowledge.ts | supabase_table:chat_history | FE | active | keep |
| draft_email | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state (preview payload) | BE | active | merge with SA copy (Tier 2) |
| draft_teams_message | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state | BE | active | merge with SA copy |
| draft_rfi | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state | BE | active | merge with SA copy |
| draft_commitment | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state | BE | active | merge with SA copy |
| draft_change_event | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state | BE | active | merge with SA copy |
| draft_task | backend/src/services/agents/alleato_ai_tools/actions.py | internal_state | BE | active | merge with SA copy |
| acumatica_ap_aging | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_ar_aging | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active (broken upstream) | merge with SA copy |
| acumatica_cash_position | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active (broken upstream) | merge with SA copy |
| acumatica_vendor_spend | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_recent_bills | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_recent_invoices | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active (broken upstream) | merge with SA copy |
| acumatica_project_budget | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_project_pnl (alias) | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_project_list | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active | merge with SA copy |
| acumatica_purchase_orders | backend/src/services/agents/alleato_ai_tools/acumatica.py | acumatica_live | BE | active (broken upstream) | merge with SA copy |
| describe_schema | backend/src/services/agents/alleato_ai_tools/db.py | supabase_table:* (information_schema) | BE | active | merge with SA copy |
| query_db | backend/src/services/agents/alleato_ai_tools/db.py | supabase_table:* (PM APP via DATABASE_URL) | BE | active | merge with SA copy |
| search_teams_messages | backend/src/services/agents/alleato_ai_tools/graph_api.py | document_chunks_rag (NOT live Graph) | BE | active, misleading-name | rename file to `rag_comms.py` (Tier 3) |
| search_emails | backend/src/services/agents/alleato_ai_tools/graph_api.py | document_chunks_rag (NOT live Graph) | BE | active, misleading-name | rename file to `rag_comms.py` |
| project_budget_summary | backend/src/services/agents/alleato_ai_tools/pm.py | multiple (projects + v_budget_lines + prime_contract_financial_summary) — SQLAlchemy | BE | active, canonical | canonical PM implementation |
| project_briefing_snapshot | backend/src/services/agents/alleato_ai_tools/pm.py | multiple (projects + financial views + rfis + submittals + schedule_tasks + commitments_unified + change_events + document_metadata) — SQLAlchemy | BE | active, canonical | canonical PM implementation |
| project_risk_snapshot | backend/src/services/agents/alleato_ai_tools/pm.py | multiple (projects + rfis + submittals + schedule_tasks + change_events) — SQLAlchemy | BE | active, canonical | canonical PM implementation |
| portfolio_overview | backend/src/services/agents/alleato_ai_tools/pm.py | multiple (projects + prime_contract_financial_summary + project_issue_summary + document_metadata) — SQLAlchemy | BE | active, canonical | canonical PM implementation |
| search_meeting_transcripts | backend/src/services/agents/alleato_ai_tools/rag.py | supabase_rpc:search_document_chunks (AI DB) | BE | active | merge with SA copy (but resolve embedding-client divergence first) |
| list_recent_meetings | backend/src/services/agents/alleato_ai_tools/rag.py | supabase_table_rag:document_chunks | BE | active | merge with SA copy |
| search_unstructured | backend/src/services/agents/alleato_ai_tools/rag.py | supabase_rpc:search_document_chunks | BE | active | merge with SA copy |
| recent_activity | backend/src/services/agents/alleato_ai_tools/recent.py | multiple (rfis + change_orders + change_events + submittals + owner_invoices + subcontractor_invoices + outlook_email_intake + daily_logs) | BE | active | merge with SA copy |
| resolve_project_by_name | backend/src/services/agents/alleato_ai_tools/resolvers.py | supabase_table:projects | BE | active | merge with SA copy |
| resolve_vendor_by_name | backend/src/services/agents/alleato_ai_tools/resolvers.py | supabase_table:subcontractors | BE | active | merge with SA copy |
| resolve_contract | backend/src/services/agents/alleato_ai_tools/resolvers.py | supabase_table:commitments_unified | BE | active | merge with SA copy |
| resolve_cost_code | backend/src/services/agents/alleato_ai_tools/resolvers.py | supabase_table:cost_codes | BE | active | merge with SA copy |
| think_tool | backend/src/services/agents/alleato_ai_tools/think.py | internal_state | BE | active | merge with SA copy |
| recall_user_memory | backend/src/services/agents/memory/tools.py | supabase_table:ai_memories | BE | active | keep |
| recall_project_memory | backend/src/services/agents/memory/tools.py | supabase_table:ai_memories | BE | active | keep |
| recall_team_memory | backend/src/services/agents/memory/tools.py | supabase_table:ai_memories | BE | active | keep |
| propose_memory_candidate | backend/src/services/agents/memory/tools.py | internal_state (in-memory sink, not DB) | BE | active | keep |
| web_search | backend/src/services/agents/research_agent/tools.py | external_api:tavily | BE | active | keep |
| fetch_url | backend/src/services/agents/research_agent/tools.py | external_api:web | BE | active | keep |
| web_search | backend/src/services/agents/content_builder/tools.py | external_api:tavily | BE | active | keep |
| generate_cover | backend/src/services/agents/content_builder/tools.py | external_api:gemini | BE | active | keep |
| generate_social_image | backend/src/services/agents/content_builder/tools.py | external_api:gemini | BE | active | keep |
| source_coverage (closure) | backend/src/services/agents/deep_project_intelligence.py | multiple (9 source probes per project) | BE | active | keep |
| pm_budget_summary (closure) | backend/src/services/agents/deep_project_intelligence.py | binds request project_id and invokes canonical `alleato_ai_tools/pm.py` tool | BE | active, wrapper | keep as request-bound tool |
| pm_briefing_snapshot (closure) | backend/src/services/agents/deep_project_intelligence.py | binds request project_id and invokes canonical `alleato_ai_tools/pm.py` tool | BE | active, wrapper | keep as request-bound tool |
| pm_risk_snapshot (closure) | backend/src/services/agents/deep_project_intelligence.py | binds request project_id and invokes canonical `alleato_ai_tools/pm.py` tool | BE | active, wrapper | keep as request-bound tool |
| draft_email | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | designate SA as canonical; backend imports |
| draft_teams_message | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | same |
| draft_rfi | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | same |
| draft_commitment | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | same |
| draft_change_event | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | same |
| draft_task | alleato-ai/alleato_ai/tools/actions.py | internal_state | SA | active, duplicate | same |
| acumatica_* (10) | alleato-ai/alleato_ai/tools/acumatica.py | acumatica_live | SA | active, duplicate | same |
| describe_schema | alleato-ai/alleato_ai/tools/db.py | supabase_table:* | SA | active, duplicate | same |
| query_db | alleato-ai/alleato_ai/tools/db.py | supabase_table:* | SA | active, duplicate | same |
| search_teams_messages | alleato-ai/alleato_ai/tools/graph_api.py | document_chunks_rag (NOT live Graph) | SA | active, misleading-name, duplicate | same |
| search_emails | alleato-ai/alleato_ai/tools/graph_api.py | document_chunks_rag (NOT live Graph) | SA | active, misleading-name, duplicate | same |
| project_budget_summary | alleato-ai/alleato_ai/tools/pm.py | multiple — SQLAlchemy | SA | active, duplicate | same |
| project_briefing_snapshot | alleato-ai/alleato_ai/tools/pm.py | multiple — SQLAlchemy | SA | active, duplicate | same |
| project_risk_snapshot | alleato-ai/alleato_ai/tools/pm.py | multiple — SQLAlchemy | SA | active, duplicate | same |
| portfolio_overview | alleato-ai/alleato_ai/tools/pm.py | multiple — SQLAlchemy | SA | active, duplicate | same |
| search_meeting_transcripts | alleato-ai/alleato_ai/tools/rag.py | supabase_rpc:search_document_chunks | SA | active, duplicate (diverged: langchain_openai embeddings) | resolve embedding-client divergence (Tier 2) |
| list_recent_meetings | alleato-ai/alleato_ai/tools/rag.py | supabase_table_rag:document_chunks | SA | active, duplicate | same |
| search_unstructured | alleato-ai/alleato_ai/tools/rag.py | supabase_rpc:search_document_chunks | SA | active, duplicate | same |
| recent_activity | alleato-ai/alleato_ai/tools/recent.py | multiple | SA | active, duplicate | same |
| resolve_project_by_name | alleato-ai/alleato_ai/tools/resolvers.py | supabase_table:projects | SA | active, duplicate | same |
| resolve_vendor_by_name | alleato-ai/alleato_ai/tools/resolvers.py | supabase_table:subcontractors | SA | active, duplicate | same |
| resolve_contract | alleato-ai/alleato_ai/tools/resolvers.py | supabase_table:commitments_unified | SA | active, duplicate | same |
| resolve_cost_code | alleato-ai/alleato_ai/tools/resolvers.py | supabase_table:cost_codes | SA | active, duplicate | same |
| think_tool | alleato-ai/alleato_ai/tools/think.py | internal_state | SA | active, duplicate | same |

**Counts:** 133 FE tools (24 files) + 38 BE tools + 28 SA tools (+ 3 self-knowledge tools, + 4 memory tools, + reranker/retry/rerank not counted) = **~206 tool registrations** spread across the three layers; ~28 SA tools are effectively the same code as 28 of the BE tools.

---

## 3. Per-Tool Dossiers

Grouped by file. Each entry: 1-line purpose, source, current caller, `Recommendation`, `Why`.

### Frontend — `frontend/src/lib/ai/tools/`

#### action-tools.ts — 23 write/action tools

All write tools. Test coverage is comprehensive (`__tests__/action-tools.test.ts`). Every tool returns a preview payload that the chat UI confirms before performing the write through the same Supabase client.

- **createChangeOrder / createChangeEvent / createRFI / createSubmittal / createTask / createGeneratedTask / updateGeneratedTask / deleteGeneratedTask / updateRFIStatus / createCommitment / createMeetingNote / logDailyReport / createInitiativeCard / createProjectCompany / createProjectContact / addBoardItem / submitFeedback / flagProjectRisk / updateProjectStatus / generateProjectSummary** — all `keep`. Why: every one has user-facing call paths and tests.
- **createOutlookCalendarInvite / draftOutlookEmail / sendTeamsMessage** — `keep`. Why: only live-Graph write tools in FE; they are the canonical write path for outbound comms and are referenced explicitly by `agents/strategist.ts` Outlook Operations Protocol.

#### acumatica.ts — 9 ERP read tools

All call `frontend/src/lib/acumatica/client.ts` (cookie-session). None can be replaced by Supabase reads. Several upstream endpoints currently return HTTP 500 (`acumatica_ar_aging`, `cash_position`, `recent_invoices`, `purchase_orders`); the tools themselves work — they surface the upstream error.

- `keep` all 9. Why: only live ERP read path; broken cases are upstream bugs, not tool problems.

#### app-help-tools.ts — `searchAppHelp`

In-memory keyword match over a static help-article registry. `keep`.

#### create-document.ts / update-document.ts / request-suggestions.ts

Generic document scaffolding for the artifact UI. Wired into chat handler via `tools` injection. `keep` all 3.

#### document-intelligence.ts — 5 tools

Submittal-focused intelligence + RAG-backed spec lookup.

- **getSubmittalLog / detectMissingSubmittals** — `keep` (supabase_table:submittals reads).
- **getSpecRequirements / reviewDocument** — `keep` (only `document_chunks_rag` tools dedicated to spec/review work).
- **logFeedback** — `keep` (records `ai_review_feedback`).

#### feature-request-tools.ts — 11 tools (UNKNOWN sources resolved)

All delegate to `frontend/src/lib/feature-requests/server.ts`. Tables touched: `feature_requests`, `feature_request_events`, `implementation_plans`, `execution_handoffs`, `feature_request_linear_events`, `feature_request_linear_sub_issues`. Linear tools additionally call `external_api:linear`.

- `keep` all 11. Why: cohesive product feature, all writes are well-bounded to dedicated tables.

#### financial.ts — 6 tools

All read PM APP financial tables/views; no Acumatica calls inside this file (those live in `acumatica.ts`).

- `keep` all 6. Why: each backs a documented agent workflow (CFO + Strategist). Heavy joins are intentional.

#### forecast-tools.ts — `getForecastComparison`

Reads `v_budget_lines` view. `keep`.

#### get-weather.ts — `getWeather`

External API to open-meteo.

- `delete`. Why: defined with `needsApproval: true` (literal boolean — wrong signature) and never imported by `orchestrator.ts` or any other factory file. No caller. Dead.

#### intelligence-tools.ts — 2 tools

- **listDomainIntelligence / getDomainIntelligence** — `keep`. Why: feed the daily-brief surface and intelligence-packet flows.

#### marketing.ts — 6 tools (UNKNOWN sources resolved)

All delegate to `services/marketing-service.ts`. Tables: `marketing_intelligence_items`, `marketing_content_calendar_items`, `marketing_content_assets`, plus reads from `document_metadata`, `insight_cards`, `projects`.

- `keep` all 6. Why: composed into `consultCMO` sub-agent; not duplicated elsewhere.

#### operational.ts — 22 own tools + 7 spread structured-query tools

The largest single file in the AI stack (142 KB). Multiple distinct concerns are bundled together — synthesis-pass note: this file is a strong candidate for future split.

- **getPeopleAndRoles / getRFIStatus / getSubmittalStatus / getCompanyKnowledge / recallPastConversations / writeMemory / searchEmails / searchTeamsMessages / searchExternalDocuments / getVendorPerformance / getCrossProjectComparison / getHistoricalTrends / saveInsight / findProject** — `keep` all. Why: cohesive PM read surface, used heavily.
- **searchMeetingsByTopic / getMeetingDetails** — `keep`. Why: hybrid semantic + ILIKE search is the only way agents get meeting details by topic without exact ID.
- **semanticSearch** — `keep`. Why: the unified RAG entry point. Searches `document_chunks` first with project + admin filters, falls back to `ai_insights` and `company_context`.
- **getRecentEmails** — `keep` with caveats (see Tier 1 #1). Why: this is the only inbox tool that does live Graph first. Code path verified at `operational.ts:3172-3224` — calls `readLiveOutlookInbox()`, returns with `source: "microsoft_graph_live"` on success, falls through to `outlook_email_intake` only on failure. The trace metadata emitted by `withTrace` is `getRecentEmails` (not split by source), which is what `handler-v2.ts` then normalizes into the inbox widget. Trustworthy.
- **searchMemories** — `merge with recallPastConversations`. Why: both call the identical `search_conversation_memories` RPC with the same signature. Keeping both creates the impression they do different things.
- **saveToKnowledgeBase** — `delete`. Why: returns a hard-coded error indicating the underlying table was dropped. Code lines 4138 onward — dead stub.

#### outlook-operations.ts — 4 tools

Created as the "operator inbox" surface, but currently inconsistent.

- **getRecentOutlookEmails** — removed from the active factory. Why: it read only `outlook_email_intake_synced`, so any timely operator query could return stale cache data. Use the backend Microsoft Executive Assistant specialist or canonical `getRecentEmails` instead.
- **readOutlookEmailThread** — removed from the active factory. Why: it pulled a specific thread only from the synced cache. Reply/thread grounding now belongs to the Microsoft Executive Assistant specialist.
- **getOutlookOperationsStatus** — `keep`. Why: legitimate diagnostic — reads `graph_sync_state` and `graph_subscriptions`.
- **getOutlookCalendarEvents** — `keep`. Why: live Graph, correct.

> Tier 1 #1 calls out the file-level inconsistency: calendar reads live, emails read synced.

#### progress-report-tools.ts — 5 tools (UNKNOWN sources resolved)

All delegate to `frontend/src/lib/progress-reports/server.ts`. Tables: `project_progress_reports`, `project_progress_report_photos`, `project_photos`, `projects`, `document_metadata`, `project_emails`, `user_profiles`. PDF generation is internal.

- `keep` all 5. Why: cohesive feature, well-bounded.

#### project-tools.ts — 12 own tools + 7 sub-factory spreads (pure barrel)

The orchestrator-facing surface. Re-exports `createFinancialTools`, `createAcumaticaTools`, `createOperationalTools`, `createScheduleTools`, `createAppHelpTools`, `createForecastTools`, `createOutlookOperationsTools`, then defines 12 own multi-source tools.

- **getProjectBriefingSnapshot** — `keep`. Why: canonical "give me a project status" tool. Reads 11+ tables; code verified at `project-tools.ts:569-704`. Hits PM APP only.
- **getPortfolioOverview** — `keep`. Why: cross-project equivalent of briefing snapshot. Reads 6 sources; code at `1028-1069`.
- **getProjectsWithRisks / getProjectRiskAnalysis** — `keep`. Why: feed CRO sub-agent.
- **getFinancialAnalysis** — `keep`. Why: anchor financial read tool for Strategist + CFO. Reads PM APP only (financial summary + change orders + budgets + supporting `document_metadata`). Does NOT call Acumatica; that path goes through `acumatica.ts`. Code verified at `1737-1955`.
- **getProjectBudgetSummary / getMeetingsByDate / findProjectDocuments / searchDocuments / getProjectDetails / getMeetingIntelligence / getActionItemsAndInsights** — `keep`.

#### schedule-tools.ts — `getScheduleAnalysis`

Reads `schedule_tasks` + `projects`. `keep`.

#### structured-output.ts — `extractStructuredActionBrief`

LLM-only — uses `Output.object(schema)`. `keep`.

#### structured-queries.ts — 7 tools

Spread into `createOperationalTools`. Each is a fast SQL read scoped to a single table/view.

- `keep` all 7. Why: deterministic SQL fast-path for when semantic search is overkill.

#### web-search.ts — 3 tools (Tavily)

`searchWeb / researchCompany / searchConstructionMarket`. `keep` all 3.

#### workspace-tools.ts — 4 tools (UNKNOWN sources resolved)

All delegate to `services/workspace-artifact-service.ts`. Tables: PM APP `workspace_artifacts` (CRUD), AI DB `document_chunks` (semantic embedding sync). `saveWorkspaceArtifact` syncs embeddings to RAG.

- `keep` all 4.

#### assistant-self-knowledge.ts — 3 introspection tools

`describeAssistantCapabilities / explainAssistantRetrievalOrder / explainLastAnswerSources`. The last one reads `chat_history.metadata.tool_trace`. `keep` all 3.

---

### Backend — `backend/src/services/agents/`

#### alleato_ai_tools/ (11 files, 29 tools)

Near-verbatim copy of `alleato-ai/alleato_ai/tools/`. See Tier 2 #1 for the consolidation plan. Per-tool fidelity:

- `actions.py` (6 draft tools), `db.py` (2), `graph_api.py` (2 — misleading filename, see Tier 1 #3), `pm.py` (4 — canonical backend PM implementation), `rag.py` (3 — diverged from SA copy), `recent.py` (1), `resolvers.py` (4), `think.py` (1), `acumatica.py` (10), `rerank.py` (utility, not a tool), `_retry.py` (utility).
- All: `merge with SA copy` once a canonical source is picked.

#### pm_advisor_tools.py — removed

The duplicate Supabase-client PM adapter was removed. `deep_project_intelligence.py` now invokes the canonical `alleato_ai_tools/pm.py` LangChain tools for project budget, briefing, risk, and portfolio summaries, matching the subagent runtime surface.

#### memory/tools.py — 4 memory tools

`recall_user_memory / recall_project_memory / recall_team_memory / propose_memory_candidate`. Bound to the Deep Agents runtime via `DbMemoryMiddleware`. `keep` all 4.

#### content_builder/tools.py — 3 tools

`web_search` (Tavily), `generate_cover` (Gemini image), `generate_social_image` (Gemini image). `keep` all 3. Note: `web_search` here is independent of `research_agent/tools.py:web_search` — same name, separate registration; harmless but worth a rename if both ever appear in the same agent.

#### research_agent/tools.py — 2 tools

`web_search` (Tavily), `fetch_url` (httpx + BeautifulSoup). `keep` both.

#### deep_project_intelligence.py — 4 closure tools

`source_coverage`, `pm_budget_summary`, `pm_briefing_snapshot`, `pm_risk_snapshot`. Defined inline inside `_run_deep_agents_runtime` and passed to `create_deep_agent()`. The PM ones delegate to the canonical `alleato_ai_tools/pm.py` LangChain tools.

- `keep source_coverage`. Why: bespoke for the coverage protocol.
- `keep the 3 PM closures`. Why: they bind the current request/project context while reusing the canonical PM tool implementation.

---

### Standalone — `alleato-ai/alleato_ai/`

#### tools/ — 17 orchestrator tools

Already enumerated in the flat table. Verdicts:

- `actions.py` (6), `db.py` (2), `pm.py` (4), `rag.py` (3), `recent.py` (1), `resolvers.py` (4), `think.py` (1), `acumatica.py` (10), `graph_api.py` (2) — total 33 tool registrations; orchestrator selects 17 via `agent.py`.
- Recommendation: SA becomes the canonical source for these tools. Backend imports as a package or via git submodule once SA is stable.

#### subagents/__init__.py — 4 sub-agent definitions

`financial-analyst / schedule-analyst / risk-analyst / communications-analyst`. Each is a dict consumed by `create_deep_agent(subagents=...)`. Backend has a near-identical `subagents.py` (114 vs 121 lines).

- `merge` with backend `subagents.py`. Why: same agents, same tool sets, marginal import-path drift.

#### subagents/content-builder-agent / llm-wiki / deep_research

Standalone Deep Agents example projects, unrelated to the `advisor` graph. Each has its own venv (`deep_research`) or skill bundle.

- `delete from repo or move to a separate examples/ repo`. Why: these are not part of the `advisor` graph runtime, they shadow real BE agent code (the BE has its own production `content_builder/` and `research_agent/`), and they confuse the inventory.

#### memory/ — store + middleware

Backed by `ai_memories` table; provides `DbMemoryMiddleware` for the LangGraph runtime. Backend has its own `memory/` directory that is functionally similar but separately maintained.

- `keep both for now`. Why: BE memory is wired into the FastAPI Deep Agents; SA memory is wired into LangGraph. Consolidation possible but lower priority than tool consolidation.

#### prompts/ — orchestrator + 4 sub-agent prompts

Same 8 markdown files exist verbatim in `backend/src/services/agents/alleato_ai_tools/prompts/`.

- `merge`. Why: identical markdown; should be a single canonical set.

---

## 4. Cross-Cutting Issues

Numbered for reference in the consolidation plan.

1. **Misleading `graph_api.py` filename in two layers.** Both `backend/src/services/agents/alleato_ai_tools/graph_api.py` and `alleato-ai/alleato_ai/tools/graph_api.py` define `search_teams_messages` and `search_emails` that read from `document_chunks_rag`, not Microsoft Graph. The only live-Graph reads in the Python layers happen via `tools/actions.py` writes. Filename should be `rag_comms.py` (or similar) in both layers.

2. **`getRecentEmails` (FE operational.ts) vs old `getRecentOutlookEmails` (FE outlook-operations.ts) — split inbox-read implementations.**
   - `getRecentEmails` (FE, fixed in the prior conversation): live Graph first, then synced fallback. Returns `source: "microsoft_graph_live"` when live succeeds.
   - `getRecentOutlookEmails` was synced cache only. It is no longer registered by `createOutlookOperationsTools`.
   - The Strategist now delegates operator inbox work to `consultMicrosoftExecutiveAssistant`; the legacy live-first `getRecentEmails` remains available where the frontend retrieval stack still needs it.

3. **`outlook-operations.ts` mixes live and synced sources within a single file.**
   - `getOutlookCalendarEvents` → live `microsoft_graph_live`
   - `getRecentOutlookEmails` → removed from active factory
   - `readOutlookEmailThread` → removed from active factory
   - `getOutlookOperationsStatus` → status table
   This violates the principle the email-audit was supposed to fix: every tool in a "live operator" file should be live-first.

4. **Resolved: `pm_advisor_tools.py` duplicate removed.** Project/executive Deep Agents closure tools and subagents now use `alleato_ai_tools/pm.py` as the canonical PM implementation.

5. **`rag.py` divergence between BE and SA.** Backend uses `openai.OpenAI` + `get_rag_read_client()` (Supabase helper); standalone uses `langchain_openai.OpenAIEmbeddings` + its own SQLAlchemy engine. Both target the same AI Database `document_chunks` table and the same `search_document_chunks` RPC. Embedding output dimensions match (3072), but the embedding-call retry/timeout behaviour differs. Risk: a question that succeeds in one runtime can time out in the other.

6. **`preflights.ts` (legacy) vs `retrieval/source-specific-rag.ts` (new).** Both handle "what meetings happened on X date" and "recent emails" prefetch. The newer file in `retrieval/` is the one wired through `buildExecutorDeps`. The newer file already does the live-Microsoft-Graph-first read for Teams discussions that this audit's email-side equivalent (#2) has only partially adopted. `preflights.ts` is referenced only by legacy paths.

7. **Two parallel chat API routes.**
   - `/api/ai-assistant/chat/route.ts` — uses `handler-v2.ts`, the full retrieval planner, Deep-Agent bridge, Strategist+specialists.
   - `/api/chat/route.ts` — uses `prompts.ts` legacy prompts, simpler `streamText`, no retrieval planner.
   Unclear which surfaces still call the second route; it has not been removed.

8. **Two competing assistant prompts.**
   - `rag-assistant-prompt.ts` (453 lines) — `ragAssistantSystemPrompt` exporting "operational instructions for Alleato AI assistant".
   - `agents/strategist.ts` (216 lines) — `strategistSystemPrompt`, the one actually loaded by `getStrategistSystemPrompt()` in `orchestrator.ts`.
   `rag-assistant-prompt.ts` is referenced by legacy chat paths only.

9. **`getWeather` unwired.** Defined in `get-weather.ts`. No factory imports it. Has a clearly-wrong `needsApproval: true` (literal) declaration.

10. **`saveToKnowledgeBase` dead.** Returns a hard-coded error message saying the underlying table was dropped. Still registered in `createOperationalTools`.

11. **26 service-delegating tools' data sources resolved during this synthesis** — see flat table updates for feature-request-tools.ts (11), progress-report-tools.ts (5), workspace-tools.ts (4), marketing.ts (6).

12. **`searchMemories` vs `recallPastConversations` — duplicate RPC.** Both call `search_conversation_memories` with the same args. Different tool names, same effect.

13. **Three "subagent example" subdirectories live inside the production SA repo.** `subagents/content-builder-agent/`, `subagents/llm-wiki/`, `subagents/deep_research/`. Not part of the `advisor` graph. Shadow real production agent code in the BE.

14. **Backend `subagents.py` (114 lines) and SA `subagents/__init__.py` (121 lines) are 95% identical** — minor import-path drift, otherwise the same four agent dicts.

---

## 5. Recommended Consolidation Plan

Three tiers, ranked by impact.

### Tier 1 — Correctness fixes (these change runtime behaviour)

**1.1 Unify Outlook inbox reads to live-first across all tools.** Initial specialist-routing slice complete.
- `getRecentOutlookEmails` and `readOutlookEmailThread` were removed from `outlook-operations.ts` active registration.
- The Strategist now uses `consultMicrosoftExecutiveAssistant` for operator inbox/reply/draft workflows.
- `getRecentEmails` remains the canonical live-first frontend inbox-read path where direct retrieval still exists.
- Remaining guardrail: eval/tool-trace assertions should verify Microsoft operator answers expose whether `microsoft_graph_live`, `outlook_email_intake_synced`, or a blocked specialist path actually answered.

**1.2 Email-side parity with the Teams live-first pattern in `retrieval/source-specific-rag.ts`.** Complete.
- `recent_emails` now calls live Microsoft Graph Outlook inbox first through `listOutlookInboxMessages`, merges live rows with `document_metadata` rows, and records `liveEmails` trace metadata.
- The source-specific email answer now reports whether live Graph checked, failed, or fell back to stored rows.

**1.3 Rename both `graph_api.py` files.** Currently 100% misleading. Either rename to `rag_comms.py` (preferred — describes what the tools do) or split: real live-Graph tool wrappers in `graph_api.py`, RAG-backed comms search in `rag_comms.py`. Either way the file name should match the source.

### Tier 2 — Architectural debt (no behaviour change, large cleanup)

**2.1 Consolidate `backend/src/services/agents/alleato_ai_tools/` and `alleato-ai/alleato_ai/tools/` into a single package.** Pick one source of truth — SA is the natural choice because it owns the LangGraph deploy and has the cleanest layout. BE imports from SA via `pip install -e ../alleato-ai` or a published wheel. Eliminates ~3000 lines of duplicated code and the embedding-client divergence in `rag.py`.

**2.2 Merge `pm_advisor_tools.py` (Supabase Client) and `alleato_ai_tools/pm.py` (SQLAlchemy).** Complete. `pm_advisor_tools.py` was removed and `deep_project_intelligence.py` closure tools call `alleato_ai_tools/pm.py`.

**2.3 Merge `backend/.../subagents.py` and `alleato-ai/.../subagents/__init__.py`.** Same four agents. Single source.

**2.4 Consolidate `prompts/` markdown across BE and SA.** Identical files. Single source.

**2.5 Decide on the `preflights.ts` legacy path.** If the only remaining caller is `/api/chat/route.ts`, delete both together.

### Tier 3 — Cleanup (low-risk hygiene)

**3.1 Delete `frontend/src/lib/ai/tools/get-weather.ts`.** Unwired and has a malformed declaration.

**3.2 Delete the `saveToKnowledgeBase` stub from `operational.ts`.** Returns an error every time; underlying table is gone.

**3.3 Merge `searchMemories` into `recallPastConversations` in `operational.ts`.** Same RPC, same shape.

**3.4 Delete or relocate `alleato-ai/alleato_ai/subagents/content-builder-agent/`, `subagents/llm-wiki/`, `subagents/deep_research/`.** None are part of the `advisor` graph; production content-builder and research agents live in BE.

**3.5 Decide on the second prompt file.** Delete `frontend/src/lib/ai/rag-assistant-prompt.ts` if no live caller; keep `agents/strategist.ts` only.

**3.6 Decide on the second chat route.** Audit `/api/chat/route.ts` callers; either fold into `/api/ai-assistant/chat/` or document its role.

**3.7 Cosmetic: split `frontend/src/lib/ai/tools/operational.ts` (142 KB, 22 tools + 7 spreads).** Memory tools, search tools, structured-query spreads, and inbox tools are all unrelated; the file is too big to navigate.

---

## 6. Final Summary

**By layer:**
- FE: 133 tools + 3 self-knowledge tools = 136 tool registrations across 25 files
- BE: 38 tool registrations (29 in `alleato_ai_tools/` + 4 memory + 2 research + 3 content-builder) + 4 deep-project-intelligence closures
- SA: 33 tool definitions; 17 wired into the `advisor` orchestrator + 4 sub-agent definitions

**By source enum (FE only):**
- `microsoft_graph_live`: 4 confirmed (createOutlookCalendarInvite, draftOutlookEmail, getOutlookCalendarEvents, getRecentEmails primary path)
- `outlook_email_intake_synced`: 0 active Outlook operation tools after specialist-routing cleanup; synced cache remains as a fallback source under live-first paths/specialist responses.
- `document_chunks_rag`: 7+ (searchEmails, searchTeamsMessages, searchExternalDocuments, semanticSearch primary, getSpecRequirements, reviewDocument, saveWorkspaceArtifact sync)
- `acumatica_live`: 9 (all Acumatica)
- `external_api:tavily`: 3 (web-search)
- `external_api:open-meteo`: 1 (unwired getWeather)
- `external_api:linear`: 2 (Linear draft tools)
- `supabase_table:*` direct reads: ~40
- `supabase_rpc:*`: 3
- `internal_state` / config-only: ~9
- `multiple` (genuinely composes multiple sources): ~50

**By status:**
- `active`: ~195 tools
- `dead`: 1 (`saveToKnowledgeBase`)
- `unwired`: 1 (`getWeather`)
- `misleading-name`: 4 (both `graph_api.py` files: `search_teams_messages` + `search_emails` × 2 layers)
- `duplicate`: ~29 (entire `alleato_ai_tools/` ↔ `alleato-ai/.../tools` mirror, plus `searchMemories` vs `recallPastConversations`)

**Top consolidation wins by line-count:** Tier 2.1 (BE/SA tool dir merge) removes ~3000 duplicated lines. Tier 2.2 (PM driver merge) removes ~350 lines. Tier 3.1-3.4 cleanup removes ~600 lines. Tier 1.1-1.2 corrects ~2 documented production bugs (stale inbox reads, missing live-Graph email fallback).

---

## RAG-DOCS-GATE compliance

This file is RAG-touching documentation. Companion to `AI-RAG-ARCHITECTURE.md`. Update both when any of these changes:
- Tool count by layer
- Tool source enum for any inbox/Teams/document_chunks-touching tool
- A duplicate is resolved (remove the merged tool from the duplication table)
- A new tool is added to any of the three layers

When updating: bump the `Last verified:` line at the top, and confirm the flat table count matches the current grep of `tool({` / `@tool` declarations across the three trees.
