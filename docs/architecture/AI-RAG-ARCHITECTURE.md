# Alleato AI/RAG Architecture

**Authoritative reference for all AI work. Read this before touching any file under `frontend/src/lib/ai/` or `backend/src/services/pipeline/`.**

Last verified: 2026-06-24 (**Outlook ingestion silent-block lifted + promotion-freshness guardrail added**: A hand-applied, untracked DB trigger (installed 2026-06-17 during the document_type_classifier rebuild) had been silently dropping Outlook writes to `document_metadata` for 7 days — `RETURN null`, no exception — freezing email/attachment promotion into the AI document store while the inbox UI (reads `outlook_email_intake` live) looked current. ~4,085 writes (649 distinct docs) blocked; lifted via migration `20260624072508_lift_outlook_ingestion_incident_block_2026_06_17.sql`. 45 project-assigned stragglers recovered with `backfill_outlook_rag_metadata_to_app_documents.py` (the RAG→app-catalog bridge). New guardrail `backend/src/services/health/outlook_promotion_freshness.py` detects the exact signature — `outlook_email_intake` fresh but newest Outlook `document_metadata` doc stale — and is wired into `pipeline_alert_notifier.run_pipeline_alert_check` (15-min cron) so a promotion freeze now DMs Teams + shows on `/rag` + auto-resolves, instead of being discovered days later. Best-effort, only pages on hard "blocked". No embedding model, vector dimensions, search RPC contract, or chunking strategy changed.)

Last verified: 2026-06-23 (**Embedding pipeline hardened against provider drift + poison-pill loop**: The graph embedding path (`embed.py`) now (1) **automatically fails over** between the Vercel AI Gateway and direct OpenAI on any auth/credit error — `_batch_embed` catches a provider auth/credit failure (`ai_transport.is_auth_or_credit_error`), and if the alternate provider is configured (`ai_transport.alternate_provider_path`) retries the batch there. This makes a gateway spend-cap-out (the recurring root cause of silent embedding outages) a non-event instead of a 100%-failure. `get_openai_client(force_path=...)` is the new enabler. (2) A failed embed no longer leaves `rag_document_metadata.embedding_status` at NULL forever (the "poison-pill" that re-failed and re-billed the same ~25 docs every run, invisibly). `_record_embed_failure` persists the real error + a bounded `embedding_attempts` counter (new columns on `rag_document_metadata`: `embedding_attempts`, `embedding_error`, `embedding_last_attempt_at`), and after `EMBED_MAX_ATTEMPTS` (6) parks the doc at terminal app status `embed_failed` so it stops being re-pulled and surfaces loudly in health + the `/rag` dashboard. The candidate query already excludes any status not in `raw_ingested/segmented/compiled/error/ocr_partial`, so `embed_failed` is correctly skipped. No embedding model (text-embedding-3-large), vector dimensions (3072), search RPC contract, or chunking strategy changed.)

Last verified: 2026-06-23 (**Drawing upload OCR pipeline gap fixed**: Drawing PDFs uploaded via the app UI were stored in Supabase Storage but never had `document_metadata` records created, so the OCR worker had nothing to process. Fixed in two upload routes (`POST /api/.../drawings` and `POST /api/.../drawings/[id]/revisions`): after the revision is created, a `document_metadata` row is now inserted with `status='no_text'`, `source_system='drawing_upload'`, `document_type='drawing'`, `source_web_url=fileUrl` (the public Supabase Storage URL), and `document_metadata_id` is set on both the `drawing_revisions` and `drawings` rows. The OCR worker (`ocr_worker.py`) is extended to detect Supabase Storage URLs (`supabase.co/storage/v1/object/public/`) and download them via direct HTTP (`requests.get`) instead of via Microsoft Graph — OneDrive files are unaffected. 311 existing Exol Morrisville drawings were backfilled via SQL. No embedding model, vector dimensions, search RPC contract, chunking strategy, or RAG DB schema changed.)

Last verified: 2026-06-23 (**spec_drawing_links table + identifySubmittalPackages AI tool**: New junction table `spec_drawing_links` (MAIN DB) links `specifications.id` (uuid) to `drawings.id` (uuid) with `link_method` (manual/ai_suggested/auto_keyword) and `confidence` score. Enables the triangle: spec → drawings (via `spec_drawing_links`), spec → submittals (via `submittals.specification_id`). New `identifySubmittalPackages` AI tool (document-intelligence.ts, registered in tool-registry) has three query paths: (1) spec section → fetch linked drawings + submittals per spec, surfaces sections with no drawings or no submittals as missing packages; (2) drawing → find linked spec sections, check submittal coverage per section, flag uncovered sections; (3) discipline scan → project-wide count of drawings with/without spec links and without vectorized content. Tool count in `document_intelligence_tools` is now 7 (getSubmittalLog, getSpecRequirements, detectMissingSubmittals, reviewSubmittalAgainstDrawings, identifySubmittalPackages, logFeedback, reviewDocument). No embedding model, vector dimensions, search RPC contract, chunking strategy, or RAG DB schema changed.)

Last verified: 2026-06-23 (**Drawings OCR→embed pipeline fix + reviewSubmittalAgainstDrawings AI tool**: Two pipeline gaps closed. (1) `embed.py` candidate status filters now include `'ocr_partial'` (4 sites: `_count_pending_status_rows`, SQL fast-path query, Supabase fallback query, and second SQL block). Previously scanned PDFs promoted by Azure Document Intelligence OCR to `ocr_partial` were silently skipped by the embedder because that status was never in the `IN()` list — they had text but no chunks. (2) `sync.py` adds a second `embed_pending_graph_documents` call immediately after `run_ocr_pass`, bounded to the number of docs OCR just promoted (`ocr_full + ocr_partial`). Previously newly-OCR'd drawings waited a full 30-minute cron cycle before embedding. (3) New `reviewSubmittalAgainstDrawings` tool in `document-intelligence.ts` (registered in `tool-registry.ts`). Fetches a submittal's details and its linked drawings via `submittal_linked_drawings → drawings.document_metadata_id → document_chunks`. Pulls up to 8 chunks per linked drawing, runs a semantic similarity search (`search_document_chunks` RPC filtered to `document_type='drawing'`) for additional relevant drawing context, and returns a structured comparison payload for the AI to analyze. `embed.py` also now fetches `document_type` from `document_metadata` and stores it in `document_chunks.metadata.document_type` for all new chunks — enabling type-filtered vector search without a JOIN. No embedding model, vector dimensions, search RPC contract, chunking strategy, or RAG table schema changed.)

Last verified: 2026-06-23 (**RAG lifecycle drill-down (per-document)**: The `/rag?tab=lifecycle` matrix (source × stage counts) is now clickable down to the underlying documents. Each matrix cell shows a chevron affordance and opens a detail panel listing the actual `document_metadata` rows behind that source row, each annotated with a five-stage indicator (synced → vectorized → assigned → tasks → intelligence), project, and date; meeting rows link to `/meetings/{id}`. New read endpoint `GET /api/admin/source-sync/lifecycle-documents?source=<meetings|teams|emails|sharepoint>&{days|start&end}&stage=<stageKey>` returns the family cohort with per-stage booleans, sorting documents stuck at the requested stage first (cap 500). To keep the drill-down and the matrix numerically identical, the family-matching predicates (`SOURCE_FAMILIES`) and per-document stage evaluation (`computeDocumentStages`) are extracted into `frontend/src/app/api/admin/source-sync/_lifecycle.ts` and consumed by both `status/route.ts` (aggregate counts) and the new `lifecycle-documents/route.ts`. Reads only: app `document_metadata`/`tasks`/`insight_card_evidence`/`projects` + RAG `document_chunks`/`rag_document_metadata`/`source_processing_jobs`/`source_intelligence_jobs`. No embedding model, vector dimensions, search RPC, chunking contract, RAG table schema, or retrieval policy changed.)

Last verified: 2026-06-23 (**Assistant write-tool availability + `createSubmittal` DB contract fix**: Project-scoped action/write tools (`createSubmittal`, `createRFI`, `createChangeOrder`, `createChangeEvent`, `createCommitment`, `createTask`, `createMeetingNote`, `logDailyReport`, etc.) were being stripped from the model's toolset whenever no project was selected in the composer, because `nonProjectScopedActionTools` in `frontend/src/lib/ai/tool-registry.ts` only listed a handful of tools and the rest got `requiresProjectScope: true`. With no pinned project the registry visibility filter removed them, so the assistant truthfully but misleadingly said it "can't create submittals". These tools resolve their target project from their own `projectId` argument and re-validate access at execution via `enforceProjectWriteAccess`, so they are now in `nonProjectScopedActionTools` and remain available without a selected project (per-project write permission is still enforced at execution). Separately, `createSubmittal` in `frontend/src/lib/ai/tools/action-tools.ts` had two DB-contract bugs that failed every confirmed insert: it wrote the free-text "submittedBy" string into `submittals.submitted_by` (a NOT NULL uuid — now writes the authenticated `userId`, routes the party text to `submitter_company`, and sets `created_by`), and its `status` enum used `pending`/`revise_resubmit` (neither permitted by the `submittals_status_check` DB constraint — now `Draft|Open|Distributed|Closed|submitted|under_review|requires_revision|approved|rejected|superseded`, default `Draft`, matching the real submittals create API). Regression tests added in `action-tools.test.ts`. The composer project picker (`chat-area.tsx`) also loaded only `useProjects({ limit: 50 })`, hiding most of the 112 active projects from its search — raised to 500. This changes assistant write-tool visibility and one tool's DB write shape only; no embedding model, vector dimensions, search RPC, chunking contract, RAG table schema, or retrieval policy changed.)

Last verified: 2026-06-22 (**App Expert help docs source relocation**: App Expert curated help articles now use `docs/alleato-os-docs/help/articles/*.mdx` as the editorial source of truth. `scripts/docs/generate-app-expert-artifacts.mjs` reads that docs-site path, regenerates `docs/architecture/generated/*`, and copies the same article set into `backend/src/services/agents/app_expert/runtime/help/articles` as a deployment-safe runtime cache. `backend/src/services/agents/app_expert/tools.py` accepts article slugs, new docs-site paths, and old archived help paths, but emits the new docs-site path in returned source evidence. This changes App Expert documentation ownership and source-path evidence only; no embedding model, vector dimensions, search RPC, chunking contract, RAG table schema, retrieval ranking, or assistant RAG policy changed.)

Last verified: 2026-06-22 (**Outlook-native Microsoft email assistant hardening**: Graph Outlook notifications remain the realtime entry point, but the FastAPI webhook route now passes accepted Outlook notifications into the Microsoft Executive Assistant event trigger after queueing mailbox delta work. The event trigger is Brandon-scoped, uses live Outlook tools, writes triage with Outlook categories, creates reply drafts in Brandon's Outlook Drafts folder when a safe reply path exists, and sends urgent Teams alerts only through the configured Teams adapter. Outlook category patching now ensures visible master categories and merges with existing message categories instead of replacing user labels. The scheduled 15-minute assistant check has the same native Outlook requirements for unread triage and reply drafts. This changes delivery/orchestration behavior only; no embedding model, vector dimensions, search RPC, chunking contract, or RAG table schema changed.)

Last verified: 2026-06-21 (**Outlook learned non-project rules**: Microsoft Graph Outlook ingestion now treats an enabled email filter rule with the non-project action as an import-and-categorize decision, not junk deletion. Future syncs bypass project inference for matching mail, create/keep the RAG document link when body length qualifies, and write non-project project-assignment metadata with the learned rule id. The admin endpoint `/api/graph/outlook/apply-filter-rule` replays one enabled non-project rule against bounded stored intake rows by mailbox, since timestamp, and limit; it only updates rows without a project assignment so a learned rule cannot unassign already matched project mail. Rule creation/update APIs accept the new action after migration `20260621193000_email_filter_rules_not_project_action.sql`. No embedding model, vector dimensions, chunking contract, search RPC, or Teams/OneDrive ingestion behavior changed.)

Last verified: 2026-06-19 (**Unified delivery router contract**: Goal 7 G5 adds `frontend/src/lib/ai-ops/delivery-router.ts` as the Alleato-native `PlatformEntry`/`DeliveryTarget` contract for Teams, email, digest, and future delivery surfaces. The router is provider-adapter-injected, returns typed `sent`/`dry_run`/`disabled`/`blocked`/`failed` results, converts Teams/email route results into `ai_work_run_delivery_attempts`, and explicitly keeps digest out of the provider-attempt schema until a digest ledger channel exists. `frontend/src/lib/ai-ops/executive-daily-brief-ledger.ts` now resolves delivery permission through this platform registry for existing Executive Daily Brief workflow policy checks without changing provider sends. Hermes `gateway/delivery.py`, `gateway/platform_registry.py`, and `gateway/platforms/base.py` plus OpenClaw gateway protocol/client references were REFERENCE/ADAPT input only; no gateway daemon, pairing model, relay transport, plugin framework, or OpenClaw client dependency was copied. No table/schema, embedding model, RAG chunk sync, search RPC, or provider delivery behavior changed.)

Last verified: 2026-06-19 (**Code-Mode RPC security decision, not approved for implementation**: Goal 7 C10 is documented in `docs/archive/2026-06-22-docs-migration/ai-plan/security/code-mode-rpc-security-decision.md` as `Decision: Not approved for implementation`. Hermes `tools/code_execution_tool.py` was reviewed as REFERENCE only; no Python runtime, UDS/file RPC transport, terminal backend, or generated tool stubs were copied. `scripts/verify/verify_code_mode_rpc_guardrail.mjs` fails while the decision is not approved if Code-Mode RPC runtime paths or the `AI_ASSISTANT_CODE_MODE_RPC_ENABLED` marker appear under app/backend source. A future implementation requires an external isolated runtime, exact environment allowlist, read-only assistant tool allowlist through the existing registry, OpenClaw net-policy enforcement for URL tools, strict time/output/tool-call caps, AI Ops ledger observability, and sandbox escape tests before this decision can be changed to approved. No table/schema, embedding model, RAG chunk sync, search RPC, or assistant runtime changed.)

Last verified: 2026-06-19 (**Automation blueprint schedule planner, default-off**: `frontend/src/lib/ai/automation-blueprints/` adds the Goal 7 G6 draft planner for natural-language schedule requests. `schedule-parser.ts` parses daily, weekdays, weekly, and bounded hourly schedules into typed local-time cron drafts or explicit ambiguity reasons; `catalog.ts` allowlists existing Render cron-backed automation owners (`alleato-daily-recap`, `alleato-task-extraction`, `alleato-source-rag-health`, `alleato-packet-refresh-periodic`, `alleato-microsoft-executive-assistant-check`, `alleato-graph-sync`); and `planner.ts` stores reviewable draft records in `ai_work_runs` with `workflow_id='automation_blueprint_draft'`, `status='needs_admin_review'`, `permission_mode='admin_approved'`, and metadata that blocks direct Render cron mutation. It only runs when `AI_ASSISTANT_AUTOMATION_BLUEPRINTS_ENABLED=true`; unsupported blueprints, ambiguous schedules, invalid timezones, and persistence failures return typed disabled/blocked/failed results. Hermes `cron/blueprint_catalog.py` and `cron/suggestions.py` were ADAPT/REFERENCE input for slot schemas, validation, and consent-first suggestion flow; Hermes `cron/jobs.py` scheduler/runtime was not copied. No table/schema, embedding model, RAG chunk sync, search RPC, or live Render cron changed.)

Last verified: 2026-06-19 (**Human-gated assistant learning proposals, default-off**: `frontend/src/lib/ai/learning-proposals/human-gated-learning.ts` adds the Goal 7 G3 proposal-only learning loop. It runs from `runPostResponseTasks()` only when `AI_ASSISTANT_LEARNING_PROPOSALS_ENABLED=true`, inspects recent `chat_history`, uses AI SDK structured output to propose memory or Skill Library candidates, records one `ai_feedback_events` source event, and creates `ai_learning_promotions` candidates targeting `ai_memories` or `ai_skill_candidates`. It never writes directly to `ai_memories` or `ai_skills`; human review through `/ai/learning-promotions` remains the only apply path. The streamed chat path passes the AI SDK response message id so the background result can be written back to `chat_history.metadata.human_gated_learning_proposals` with skipped/failed/proposed status, reason, counts, duplicate count, promotion ids, and error when applicable. Hermes `background_review.py`, `curator.py`, and `memory_provider.py` were used as REFERENCE/ADAPT input for review prompt intent and hook/lifecycle shape only; the Python daemon/threading model was not copied. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**`findAppPage` find-a-page tool**: `frontend/src/lib/ai/tools/app-help-tools.ts` now exposes a second tool, `findAppPage`, alongside `searchAppHelp`. It lets the assistant answer "where do I…/what page shows…/does the app have a…" by searching a generated inventory of EVERY UI route and AI tool — not just curated help articles — matching on each page's purpose (PageShell title/description) so it locates pages even when the user doesn't know the name, returning route URLs. Search is a deterministic keyword+substring scorer in `frontend/src/lib/app-surface/search.ts` over `frontend/src/lib/app-surface/app-surface.generated.json` (NOT a vector/RAG search — the corpus is ~400 short structured records; quality depends on pages having descriptions). The JSON index is generated by `npm run map:project` (`scripts/dev-tools/generate-project-map.mjs`) and lives outside `lib/ai/` so regenerating it does not trip this gate; a pre-commit gate fails if it is stale. The tool reports coverage and returns a loud no-match message rather than asserting a page does not exist. Registered via the existing `createAppHelpTools()` spread in `createProjectTools()`. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Assistant context compaction, default-off**: `frontend/src/lib/ai/stream/compaction.ts` adds the canonical long-chat compaction helper for `handler-v2.ts`. It runs only when `AI_ASSISTANT_CONTEXT_COMPACTION_ENABLED=true` and estimated prompt tokens exceed the configured threshold. The assembled system prompt stays outside compaction and is preserved verbatim; model messages keep the configured head and recent tail, replace the middle with a reference-only system summary, refresh an existing summary instead of stacking summaries, prune old bulky tool results to inspectable one-line summaries, and replace historical image/file parts with safe text placeholders. If summarization fails below the hard limit, the handler continues un-compacted with explicit compaction metadata; above the hard limit it returns a specific compaction failure rather than silently continuing. Focused tests cover under-threshold no-op, system/head/tail preservation, summary refresh, tool-result pruning, binary placeholders, and hard-limit failure. No table/schema/RPC change.)

Last verified: 2026-06-19 (**Hybrid RAG ranking telemetry**: RAG migration `scripts/database/rag/migrations/20260619223000_hybrid_rag_ranking.sql` is applied to AI Database project `fqcvmfqldlewvbsuxdvz` and recorded in `supabase_migrations.schema_migrations` as `20260619223000|hybrid_rag_ranking`. It adds RAG-owned `document_chunk_retrieval_telemetry` daily recall buckets plus `document_chunk_retrieval_stats`, and replaces `public.search_document_chunks` with one extended optional signature that preserves vector-only defaults while allowing `ranking_mode='hybrid'`, `query_text`, telemetry writes, and returned score components: `vector_score`, `text_score`, `recall_score`, `recency_score`, `hybrid_score`, `ranking_mode_used`, and `score_components`. Frontend semantic search requests hybrid diagnostics only when `RAG_HYBRID_RANKING_ENABLED=true`; recall writes are separately gated by `RAG_RETRIEVAL_TELEMETRY_ENABLED=true`. Live verifier `npm run rag:verify:hybrid-ranking` samples an embedded chunk, compares vector vs hybrid coverage, validates components, and verifies telemetry readback. Hybrid remains default-off until eval evidence justifies default-on.)

Last verified: 2026-06-19 (**Session Search over prior assistant conversations**: migration `20260619210000_search_chat_history.sql` is applied and ledger-verified, adding `chat_history` FTS/trigram indexes plus the scoped `public.search_chat_history` RPC. `frontend/src/lib/ai/tools/search-past-conversations.ts` exposes the governed `searchPastConversations` AI SDK tool through `createProjectTools()` and `frontend/src/lib/ai/tool-registry.ts`. This reads PM APP `chat_history`/`conversations` only, dedupes by session lineage, returns anchored neighboring message windows plus start/end bookends, and returns typed loud-empty results. It does not read or write `document_chunks`, and daily brief/document RAG retrieval remains separate.)

Last verified: 2026-06-19 (**Operator presentation adapter**: `frontend/src/lib/ai/operator/presentation.ts` adds an additive, no-send operator message envelope for AI approval/action prompts with Zod validation, deterministic Teams Adaptive Card rendering, channel capability metadata, and inspectable unsupported-affordance drops. `frontend/src/app/api/ai-operator/presentation-preview/route.ts` exposes a non-production preview route for e2e validation only and does not send Teams messages or mutate provider state. Existing Teams card builders and delivery paths remain unchanged until later parity migration. Focused Jest/snapshot tests, changed-file quality, route checks, and local HTTP e2e preview passed. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Outbound action policy hook layer**: `frontend/src/lib/ai/tools/outbound-action-policy.ts` now provides default-off, feature-flagged before/after tool-call policy semantics for `createActionTools()`, preserving confirmed-write behavior by allowing unconfirmed calls only to return draft/preview/blocked results, returning typed denial envelopes for missing confirmation or bypass attempts, and redacting secret-bearing tool output before policy traces/UI-visible results. `frontend/src/lib/ai/tools/action-tools.ts` wraps its AI SDK tool set through that policy when `ALLEATO_OUTBOUND_ACTION_POLICY_ENABLED=true`; per-tool confirmed branches remain in place until the shared gate is verified in production. Focused Jest policy tests, targeted lint, and eval-suite high-risk draft-only coverage were added. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Global assistant tool registry project/source policy and live smoke**: `frontend/src/lib/ai/tool-registry.ts` now treats optional provider-disabled factories, such as Tavily-backed web search, as explicit registry metadata instead of factory drift, while still failing unregistered tools loudly. The registry policy filters by workflow, actor mode, selected project scope, allowed source families, write permission, delivery permission, and delivery channel. `frontend/src/lib/ai/orchestrator.ts` passes the Strategist's selected project into the registry policy before exposing tools. Focused lint, direct-tool registry guardrail, registry/CMO Jest tests, and a real `/ai` browser smoke on this checkout passed: `POST /api/ai-assistant/chat` returned 200 with session `c1956283-00ed-42ce-9c1a-d8198ef57592`, `tool_count: 94` after project-scope filtering, no tool calls, and no registry errors. Screenshot evidence: `tests/agent-browser-runs/2026-06-19-assistant-tool-registry-smoke/ai-tool-registry-project-policy-smoke.png`. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Global assistant tool registry policy and visibility trace**: `frontend/src/lib/ai/tool-registry.ts` now filters registered runtime tool sets by workflow, actor mode, write permission, delivery permission, and delivery channel, distinguishing policy-hidden registered tools from unregistered factory drift. `frontend/src/lib/ai/orchestrator.ts` emits an `assistantToolVisibility` trace with visible and hidden tool names before the Strategist model call. `scripts/verify/verify_ai_assistant_tool_registry.mjs` now also fails new direct `tool({ ... })` definitions outside approved factory/constructor files or explicit non-assistant allowlist reasons. Focused lint, registry/orchestrator Jest tests, and the registry guardrail passed. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Global assistant tool registry runtime filter for project/action factories**: `frontend/src/lib/ai/tool-registry.ts` now registers the aggregate `createProjectTools()` output, including composed financial, Acumatica, operational/search/memory, schedule, app-help, forecast, Outlook read, and SAIS read tools, plus the `createActionTools()` write/delivery output. `frontend/src/lib/ai/orchestrator.ts` now filters both project and action factory tool sets through `filterRegisteredToolSet()` before the Strategist exposes them to the model, and `scripts/verify/verify_ai_assistant_tool_registry.mjs` fails if those factories are wired directly again. Focused lint, registry Jest tests, and the registry guardrail passed; broader typecheck is delegated under AAI-554. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Global assistant tool registry foundation**: `frontend/src/lib/ai/tool-registry.ts` now owns the canonical assistant tool registry contract for name, owner, category, capabilities, source families, actor/workflow visibility, write/delivery policy, evidence policy, and execution metadata. Executive Daily Brief source, generation, artifact, Teams delivery, and email delivery tools are registered there, while `frontend/src/lib/ai-ops/tool-registry.ts` now consumes a registry-filtered workflow subset instead of owning standalone workflow-local definitions. Focused lint, registry/workflow-pack Jest tests, the Executive Daily Brief registry guardrail, and the Linear handoff check passed. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief legacy generation blocks**: raw frontend `regenerateExecutiveBriefingDraft()` is now explicitly deprecated for route/action/script/tool callers and points to the AI Ops gateway helper. Backend legacy `run_daily_digest()` is default-blocked unless `LEGACY_DAILY_DIGEST_ENABLED=true`, returning `status=disabled`, `reason=legacy_daily_digest_disabled`, and canonical runner `frontend/scripts/run-executive-daily-brief.ts`; `/api/digests/daily/generate` now returns a `LEGACY_DAILY_DIGEST_DISABLED` conflict instead of queueing a direct `daily_recaps` write. Focused frontend lint, backend py_compile, direct disabled-service proof, and the static gateway guardrail passed. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief ledger integration verifier**: `frontend/scripts/verify-executive-daily-brief-ledger-integration.ts` now authenticates against the local app, calls the real Teams preview route, disabled Teams delivery route, and scheduled runner, then reads back Supabase AI Ops ledger rows and generated packet source refs. `npm run rag:verify:executive-daily-brief-ledger-integration` passed against `http://localhost:3001`: preview run `4cc005f3-b1a2-471e-b708-28ccb35aa109` wrote `ai_work_runs`, 4 evidence rows, 3 artifacts, and 1 Teams dry-run delivery attempt; packet inspection found 4 surfaced items and 4 source refs with family counts `document=3`, `acumatica=1`; meeting/fireflies/email/outlook/Teams were absent from surfaced claims and therefore excluded. Disabled delivery run `84c4de07-1d94-4731-8ff0-086b3e77bc6a` wrote a disabled Teams delivery attempt; scheduled proof run `5cfeac2e-7e7e-4817-9a4f-abe6ce0f4b03` wrote a scheduled AI Ops run with status `skipped` and delivery `disabled`. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief canonical packet/run relationship**: migration `20260619195500_add_daily_recaps_ai_work_run_id.sql` is applied and ledger-verified, adding `daily_recaps.ai_work_run_id` as the canonical generation-run pointer back to `ai_work_runs.id`. `frontend/src/lib/ai-ops/daily-brief-canonical-link.ts` updates that pointer from the shared generation helper after evidence is recorded, while `ai_work_runs.daily_recap_id` remains the historical run-to-packet link used by admin inspection. Focused unit tests and lint passed.)

Last verified: 2026-06-19 (**Executive Daily Brief source adapter run steps**: `frontend/src/lib/ai-ops/source-adapters.ts` now maps Executive Daily Brief source health into concrete source-fetch run steps for Fireflies/meeting, Outlook/email, Teams, Documents/RAG, Acumatica, Procore/project data, and Project Intelligence packet adapters. `recordDraftEvidence()` writes those steps plus a `source_health_report` artifact before the brief packet artifact. Focused tests passed, and live run `0c3b8979-3a31-4aab-98d0-a975ab845e21` completed as succeeded/dry-run with source-fetch rows showing loaded adapters and failed-retryable `SOURCE_ADAPTER_MISSING` rows for missing required coverage. `/ai-work-runs` browser evidence in `tests/agent-browser-runs/2026-06-19-executive-daily-brief-source-adapters/` shows the run, source-health report artifact, source-fetch steps, and missing-adapter failures. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief Teams delivery guardrails**: targeted route tests now cover `/api/executive/daily-brief/send-teams` disabled delivery, dry-run payload/evidence completion, blocked provider result, partial recipient failure, and thrown provider failure. The tested route path starts an AI Ops run before provider calls, records disabled delivery attempts before provider calls, records Teams payload artifacts and delivery evidence on dry-runs/sends, records blocked delivery outcomes, records partial recipient failure as partial success, and fails the canonical run when the provider throws. No real Teams send was enabled; the production kill switch remains the safety boundary. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief scheduled-run proof**: `frontend/scripts/run-executive-daily-brief.ts` now preserves explicit runtime environment values over `.env.local`, preventing local env files from overriding `EXECUTIVE_DAILY_BRIEF_ENABLED=true` in scheduled/runtime contexts. Focused scheduler lint and node tests passed. A skipped schedule proof created canonical AI Ops run `00f52478-deba-40e6-bac6-e487ceb75778` with reason `Outside target local schedule.` A matching scheduled trigger created scheduler run `4b4bcd6a-a401-4db0-8970-3c96a9c6a2f8` and downstream disabled delivery run `10e04a08-c1dd-4ac3-8847-75950f94bcc4` without sending Teams because the route kill switch remained disabled. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief claim-level evidence policy**: `frontend/src/lib/ai-ops/executive-daily-brief-evidence.ts` now owns the fail-loud policy that every surfaced `needsBrandon`, `waitingOnOthers`, and `importantUpdates` item must carry structured citation evidence before the run ledger writes evidence refs or packet artifacts. Focused lint and unit tests passed for the evidence module, run-ledger integration, workflow pack, and ledger tests; the gateway bypass guard still passes. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief generated no-send preview proof**: authenticated POST to `/api/executive/daily-brief/preview-teams` with `fresh=true` produced run `676ca1fa-f79d-4b74-9bee-fe7dd6375b0e`, packet `daily_recaps.id=1399b250-4151-429c-a3ce-156e0a161ba9`, 4 surfaced items, 4 evidence rows, 4 source-health snapshots, 2 artifacts (`brief_packet` and `teams_payload`), and 1 dry-run Teams delivery attempt linked to the Teams payload artifact. `/ai-work-runs` browser evidence in `tests/agent-browser-runs/2026-06-19-executive-daily-brief-generated-preview/` shows the generated run, artifacts, delivery attempt, and evidence rows without querying Supabase directly. Source health was intentionally degraded/visible: email missing, Teams/meeting/document loaded. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief workflow pack and tool policy**: `frontend/src/lib/ai-ops/executive-daily-brief-workflow.ts` now declares the versioned workflow pack, allowed tools, source families, freshness/evidence policy, delivery rules, degraded-output behavior, hard-fail conditions, and runtime budget. `source-adapters.ts` centralizes normalized source adapter definitions and required health states for Fireflies/meetings, Outlook/email, Teams, Documents/RAG, Acumatica, Procore, and Project Intelligence packets. `tool-registry.ts` centralizes tool definitions and policy filtering so disabled or dry-run delivery hides send tools before runtime use. `startDailyBriefRun()` records the pack, source policy, runtime budget, and visible/hidden tool scope on every run, and the scheduled runner imports the same workflow id/version. Focused tests prove pack validation, adapter health states, channel filtering, forbidden tool hiding, and disabled delivery send-tool hiding. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief first-class run artifacts and delivery attempts**: migration `20260619183000_add_ai_work_run_artifacts_delivery_attempts.sql` is applied and ledger-verified, creating `ai_work_run_steps`, `ai_work_run_artifacts`, and `ai_work_run_delivery_attempts` for canonical AI workflow inspection. `frontend/src/lib/ai-ops/ledger.ts` now validates and writes those tables, Executive Daily Brief preview/send/admin-test paths record Teams payload artifacts and delivery attempts, and `/api/admin/ai-work-runs` plus `/ai-work-runs` expose steps, artifacts, delivery attempts, exact failure code/message, and retryability. Browser evidence in `tests/agent-browser-runs/2026-06-19-executive-daily-brief-ai-runs/` shows a disabled Teams delivery run with delivery attempt and step rows. Supabase types were regenerated. No embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief generated-artifact linkage**: AI assistant-triggered Executive Daily Brief generation now uses the existing AI Ops run helper instead of importing the raw draft generator directly. The shared `AiRun` contract and ledger writer carry `dailyRecapId` into the existing `ai_work_runs.daily_recap_id` column, and `/api/admin/ai-work-runs` plus `/ai-work-runs` expose that generated `daily_recaps` packet as the run's generated artifact reference. No new table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**Executive Daily Brief AI Ops ledger boundary**: Executive Daily Brief preview, Teams send, admin test-send, and the `generateExecutiveDailyBrief` tool now create durable AI Ops ledger records through `frontend/src/lib/ai-ops/executive-daily-brief-ledger.ts` and `frontend/src/lib/ai-ops/ledger.ts`. The workflow writes `ai_operation_events`, `ai_work_runs`, and evidence/source rows for draft, delivery, skipped, partial, and failed states, and disabled delivery responses return a `runId` for admin inspection. No table/schema, embedding model, RAG chunk sync, search RPC, or retrieval policy changed.)

Last verified: 2026-06-19 (**AI Agent Registry edit controls and run drilldown**: `/ai/admin/agents` now supports a table/graph toggle over the same registry data, keeps graph selection aligned to agent slugs, and the detail sheet can edit status, approval requirement, confidence threshold, failure behavior, and notes through the guarded `PATCH /api/admin/ai-agents` route. `GET /api/admin/ai-agents` now returns the five most recent `ai_agent_runs` per agent so the detail sheet can expand recent runs with status, project, confidence, output count, tokens, errors, timestamps, and metadata. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-19 (**Skill Library eval coverage and high-risk guardrails**: `docs/archive/2026-06-22-docs-migration/ai-plan/evals/assistant-eval-suite.json` now includes the `skill-library-injection-regression` bundle and targeted `skilllib-*` cases for app-help, drawing, estimate, email, pay-app review, RFI, schedule, submittal, task, Teams, and workflow skill categories. `scripts/verify/verify_ai_assistant_eval_suite.mjs` can assert persisted `chat_history.metadata.skill_usage`, expected/forbidden skill categories, expected risk levels, and a `highRiskSkillDraftOnly` guard that fails if write tools fire or draft/review/approval language is missing. Focused unit coverage verifies high-risk approved skills are rendered as drafting/review context only and do not grant irreversible write authority. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-19 (**Project/executive backend Deep Agents approved skill injection**: `/api/ai-assistant/chat` now builds bounded approved Skill Library context before direct Render Deep Agents project-status and executive-briefing bridge calls. Project-status uses `surface: "backend_deep_agent_project"` with only construction/project operating categories (`drawing`, `estimate`, `pay_app_review`, `rfi`, `schedule`, `submittal`, `task`, `workflow`); executive briefing uses `surface: "backend_deep_agent_executive"` with only executive operating categories (`email`, `estimate`, `schedule`, `task`, `teams`, `workflow`). The backend project/executive contracts accept `approvedSkillContext`, include it in the Deep Agents prompt when present, and echo it in packets so additive context formatters show the selected approved skills. Generic external research remains unchanged because there is no safe internal category boundary for broad web research yet. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-19 (**Microsoft Executive Assistant approved email/Teams skill injection**: the Strategist's `consultMicrosoftExecutiveAssistant` tool now builds approved Skill Library context with `surface: "microsoft_executive_assistant"` and `allowedCategories: ["email", "teams"]`, then posts that bounded context to `/api/intelligence/microsoft-executive-assistant`. The backend Microsoft Executive Assistant contract accepts `approvedSkillContext`, includes it in the Deep Agents prompt before the required workflow, and echoes it in the response for traceability. Focused tests verify Microsoft specialist selection can include email and Teams skills while excluding unrelated app-help skills, and backend route tests accept/echo the approved context. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-19 (**App Expert approved app-help skill injection**: the App Expert retrieval dependency now builds approved Skill Library context with `surface: "app_expert"` and `allowedCategories: ["app_help"]`, then posts that bounded context to `/api/intelligence/app-expert`. The backend App Expert contract accepts `approvedSkillContext`, includes it in the read-only Deep Agents prompt, and echoes it in the response so `retrieval/system-prompt.ts` can render an `Approved App-Help Skills` section beside answer, sources, loaded runtime skills, and backend trace. Unit coverage verifies non-app-help skills cannot cross into App Expert selection, frontend bridge request/formatting includes the context, and backend route tests accept/echo the field. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Surface-aware approved skill selection**: `frontend/src/lib/ai/services/skill-injection-service.ts` now accepts an optional `surface` and scores approved skills with bounded surface category hints such as App Expert/app-help, Microsoft/Teams, and Outlook/email. Surface matches are persisted in `skill_usage.selectionSurface` and each selected skill's reasons (for example `surface:app_expert`) so answer traces show why a skill was selected. `assembleSystemPrompt` passes `ai_assistant_chat` for normal web chat and `teams` for Teams platform responses. Unit coverage verifies a generic App Expert-style request can select an `app_help` skill by surface without injecting unrelated pay-app skills. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Assistant Skill used trace and wrong-skill review loop**: assistant history metadata now hydrates persisted `skill_usage` through `frontend/src/components/ai-assistant/skill-usage-metadata.ts`, and `ChatArea` renders `AssistantSkillTrace` under assistant answers beside the existing memory trace. The trace shows selected skill title, version, category, scope, project, and risk, links to `/ai/skills`, and exposes a `Wrong` action. `POST /api/ai-assistant/skills/[skillId]/feedback` authenticates the current user, loads the skill snapshot, writes an `ai_feedback_events` row (`event_type='ai_skill_marked_wrong'`, `source_table='ai_skills'`), and creates an `ai_learning_promotions` candidate targeting `ai_skills` with `action='review_skill'` so reviewers can edit, pause, supersede, narrow, or otherwise correct the skill. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**AI Agent Registry schema and admin surface**: migration `20260618220000_create_ai_agents_registry.sql` is applied and ledger-verified, creating `ai_agents` for human-authored agent definitions/prioritization/gaps and `ai_agent_runs` for runtime history, with RLS read policies and service-role write boundary. The seed inventory currently records 20 pipeline/chat/write/planned agents. Supabase types were regenerated and include `ai_agents`/`ai_agent_runs`. `/ai/admin/agents` lists the registry with status/domain/impact filters, gap count, approval model, trigger, priority, and a detail sheet for purpose, data sources, dependencies, blockers, runtime stats, and undefined fields. `/ai-agents` redirects to `/ai/admin/agents`. The page intentionally avoids top stats cards/summary strips; gap counts stay in the table/detail workflow. No embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Approved Skill Library prompt injection and usage trace metadata**: `frontend/src/lib/ai/services/skill-injection-service.ts` now selects active visible skills by category hints, selected project scope, user/team/company visibility from `listActiveVisibleSkills`, explicit skill/playbook language, and keyword overlap, then injects only the bounded selected set into `assembleSystemPrompt` with explicit priority that source evidence and system/developer instructions outrank skills. The normal `/api/ai-assistant/chat` path captures `skill_usage` in answer debug metadata, persists selected skill IDs/title/version/category/scope/reasons in `chat_history.metadata`, and records best-effort `ai_skill_usage_events` after the assistant response is saved. Skill Library lookup failures now add context-health metadata and do not suppress memory or agent-learning prompt context. Delegated Deep Agents, App Expert, Microsoft-specific injection, answer UI traces, wrong-skill feedback, and first-class eval datasets remain deferred. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**AI section routing**: user-facing AI pages now live under the `/ai` parent section. `/ai` is the assistant entry point, `/ai/teach` is Teach Alleato intake, `/ai/skills` is the user Skill Library, `/ai/learning-promotions` is the reviewed learning queue, and `/ai/admin/skills` is the admin Skill Library surface. The previous `/ai-assistant`, `/ai-assistant/teach`, `/ai-assistant/skills`, `/ai-learning-promotions`, and `/ai-skills` page routes remain as redirects for saved links. API contracts remain unchanged under `/api/ai-assistant/*` and `/api/admin/ai-learning-promotions*`; no table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Teach Alleato intake and review flow**: `/ai/teach` now gives users a reviewed way to submit field workflows, examples, evidence links, scope, risk, and reviewer suggestions. `POST /api/ai-assistant/teach` authenticates the current user, writes `ai_feedback_events`, then stages one or more `ai_learning_promotions` using existing promotion types (`user_preference`, `project_lesson`, `workflow_rule`, `agent_prevention_prompt`) plus a Skill Library-shaped `proposed_learning.skillCandidate` payload until first-class skill tables exist. If event creation succeeds but promotion creation fails, the route fails loudly with the created event id. `/ai/learning-promotions` now recognizes Teach Alleato candidates through `GET /api/admin/ai-learning-promotions?kind=teach`, parsed by `frontend/src/lib/ai/learning-promotion-view-model.ts`, and expands candidates to show source user/route, proposed destination, workflow category, examples, source/evidence link, scope/risk, why-it-matters, and suggested reviewer. Browser evidence: `tests/agent-browser-runs/2026-06-18-teach-alleato-integrated/02-teach-filter.png` and `03-teach-expanded.png`. No schema change, embedding model, RAG chunk sync, or search RPC change.)

Last verified: 2026-06-18 (**Skill Library schema, pages, and apply path**: migration `20260618214000_create_ai_skill_library.sql` is applied and verified, adding `ai_skills` and `ai_skill_usage_events` with personal/project/team/company RLS, review/version/example/source-event fields, usage counters, and usage-event trigger updates. `frontend/src/lib/ai/services/skill-library-service.ts` now lists visible active skills, lists admin skills, creates/updates/reviews skills, and records usage. `/ai/skills` lists visible active skills with category/scope/project filters and a Teach Alleato entry point; `/ai/admin/skills` lists admin skill records by status/scope/category/project. `/ai/learning-promotions` accepts `kind=skill`, classifies legacy `ai_skill_candidates`, new `ai_skills`, `skill_library`, and nested `skillCandidate` payloads, and `POST /api/admin/ai-learning-promotions` now applies approved skill candidates through `applySkillLibraryPromotion({ promotionId, reviewedBy, reviewNotes })`, creating an active `ai_skills` record and marking the promotion applied with destination `ai_skills`. No embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Learning promotions memory review queue**: `/ai/learning-promotions` now has a promotion-kind filter, including a Memory tab for `review_memory` candidates created by wrong-memory feedback. `GET /api/admin/ai-learning-promotions` accepts `kind=memory|retrieval|attribution|agent_prevention|workflow|teach|skill|all`, filters promotions through the shared `frontend/src/lib/ai/learning-promotion-view-model.ts` parser, and hydrates linked `ai_feedback_events` rows so reviewers can see correction text, before-memory snapshot, source route/surface, project scope, and risk. The slice is intentionally read-only for memory corrections: quick edit/deactivate/expire/convert actions remain deferred until audited writers exist against the original `ai_memories` row. No table/schema, embedding model, RAG chunk sync, or search RPC changed.)

Last verified: 2026-06-18 (**Assistant memory trace live-ID mapping**: `/ai-assistant` now extracts persisted assistant `memory_usage` through `frontend/src/components/ai-assistant/memory-usage-metadata.ts`, indexing each trace by both the persisted database message row ID and the response message ID saved in message metadata from the AI SDK stream. This closes the post-stream sync gap where the visible assistant answer kept the streamed message ID while the saved metadata was keyed only by the database row ID. Browser rerun evidence in `tests/agent-browser-runs/2026-06-18-ai-memory-trace-rerun/` confirms the collapsed memory trace renders, expands on desktop/mobile (`390x844`) without overflow, links to Memory Center, and queues wrong-memory feedback from the answer trace. No table/schema, embedding-model, RAG chunk sync, or search-RPC change.)

Last verified: 2026-06-18 (**Assistant answer memory trace + review flow**: `/settings/memory` remains the user-facing Memory Center for active personal/team/project memories, recent memory usage, and same-session review queue counts. Users can edit/delete memories through the existing memory CRUD APIs, and mark a memory wrong through `POST /api/ai-assistant/memories/[memoryId]/feedback`. That route verifies the active `ai_memories` row belongs to the current user, records an `ai_feedback_events` row (`event_family='user_preference'`, `event_type='ai_memory_marked_wrong'`, `surface='memory_center'` or `surface='assistant_answer_memory_trace'`), and creates an `ai_learning_promotions` candidate with `promotion_type='workflow_rule'`, `destination_table='ai_memories'`, and `proposed_learning.action='review_memory'` so correction is reviewable before behavior changes. Assistant messages now render a collapsed "Memory used" disclosure from persisted message `memory_usage`, show concise memory snippets, link back to `/settings/memory`, and send wrong-memory feedback with route, message ID, and session ID source context. `ai-memory-service.ts` type metadata reflects hydrated `last_accessed_at`, `access_count`, and `expires_at` fields already selected by `getUserMemories`. No table/schema, embedding-model, RAG chunk sync, or search-RPC change.)

Last verified: 2026-06-18 (**Bounded source vectorization + Fireflies inline GPT guard**: production source ingestion/vectorization is active through Render cron jobs for Graph/Outlook/OneDrive/SharePoint embedding, Teams channel/DM capture, Fireflies transcript capture, source-sync health, and source-RAG health. `backend/src/services/integrations/microsoft_graph/embed.py` now falls back to RAG-side `rag_document_metadata` when a Graph/Teams/attachment record has no app-side `document_metadata` row, allowing RAG-only records to embed instead of being dropped; RAG-only fallback rows intentionally skip inline source-intelligence compilation because the compiler requires app metadata. `backend/src/services/ingestion/fireflies_pipeline.py` no longer runs the GPT-5.5 Fireflies task rewriter during transcript ingestion unless `FIREFLIES_REWRITE_TASKS_DURING_INGEST=true`; the Render Fireflies cron forces this false so transcript capture/chunking does not burn frontier-model credits. `render.yaml` fixes the Fireflies cron to call scheduler `_run_fireflies_sync(limit=25)` with a real `SupabaseRagStore`, and changes `alleato-intelligence-compiler-drain` from every 15 minutes to hourly (`0 * * * *`). No embedding model/dimensions or search RPC changed.)

Last verified: 2026-06-17 (**Operating-record-first executive brief + Graph ingestion cost controls**: the Brandon/executive daily brief refresh now prefers `source_synthesized` project operating records over per-request vector retrieval when operating records exist. In that mode `frontend/src/lib/executive/brandon-daily-update.ts` seeds the brief from operating-record/timeline/change-event/project-report signals, skips query-embedding generation and vector chunk searches, and performs one GPT-5.5 synthesis pass instead of repeated retrieval/enrichment calls. Retrieval notes explicitly report when no query embeddings/vector searches were used. Graph/Microsoft ingestion changes in `backend/src/services/integrations/microsoft_graph/**` add explicit ingestion-control, subscription/sync state, attachment promotion, and source-health paths that feed the RAG pipeline through the backend/RAG boundary rather than ad hoc frontend calls. No embedding model/dimensions or search RPC changed.)

Last verified: 2026-06-17 (**`create_contact` generative-UI widget + `createContact` tool**: new assistant action tool `createContact` (`frontend/src/lib/ai/tools/action-tools.ts`) creates a global directory contact in `public.people` (not project-scoped — use `createProjectContact` when a project is involved). It reuses an existing person by email and links a company by `companyId` or exact `companyName` (`findCompanyByName`); when the name doesn't match it keeps the denormalized `people.company` string rather than failing or silently dropping it. Like other write tools it is gated by `needsConfirmedWriteApproval` (`confirmed=true`) and audited via `recordWriteAudit`. The tool returns a `widget` payload of type `create_contact` (new `CreateContactWidgetPayload` in `frontend/src/lib/ai/assistant-widgets.ts`) that renders as a brand-themed, assistant-prefilled contact form (company, first/last name, job title, email, single phone→`phone_mobile`, department→`business_unit`, notes) via `CreateContactWidget` + `normalizeCreateContactToolOutput` in `assistant-widget-renderer.tsx`. Field set mirrors `ContactFormSheet`/`POST /api/contacts`; no `document_chunks`, embedding-model/dims, retrieval-RPC, or table-schema change.)

Last verified: 2026-06-17 (**Full-source synthesis + project operating record layer**: new reusable intelligence spine between raw source ingestion and the card/packet/report surfaces, specced in `docs/archive/2026-06-22-docs-migration/ai-plan/rag-pipeline/source-synthesis-operating-record-spec.md` (manual proof run `docs/archive/2026-06-22-docs-migration/ai-plan/rag-pipeline/manual-runs/2026-06-17-source-synthesis-dry-run.md`). Two new RAG tables (migration `scripts/database/rag/migrations/20260617190000_create_source_synthesis_operating_records.sql`, applied to `fqcvmfqldlewvbsuxdvz`): `source_syntheses` (one full-source AI synthesis per source+hash — executive summary, what-changed, decisions, risks, commitments, tasks, financial/schedule/change-event/daily-log/progress signals, confidence + source quotes; `synthesis_status` lifecycle incl. `needs_project_review`) and `project_daily_deltas` (one project/day rollup of those syntheses). Six new PM APP tables (migration `supabase/migrations/20260617190000_create_project_operating_record_tables.sql`): `project_operating_snapshots`, `project_current_state`, `project_intelligence_timeline_events` (+`_event_sources`), `change_event_candidates`, `project_report_suggestions`. `backend/src/services/intelligence/compiler.py` writes a synthesis per processed source (`write_source_synthesis`), then — only when the source has a valid `project_id` and the synthesis succeeded — rolls it into the daily delta (`compile_project_daily_delta`) and projects the operating record (`apply_source_operating_record_projection`). When a synthesis references a missing/invalid project, `mark_source_synthesis_needs_project_review` quarantines it (project_id null, status `needs_project_review`) instead of failing silently — this is the guardrail that caught the 4 Westfield emails whose deleted project 1068 left stale syntheses (remediated to canonical project 43, 2026-06-17). Backfill helpers: `backend/src/scripts/backfill_source_operating_records.py`, `refresh_operating_packet_direct.py`. Contract verifiers: `scripts/verify/verify_source_synthesis_operating_record_contract.mjs`, `verify_source_operating_record_projection.mjs`. No embedding-model/dims or search-RPC change.)

Last verified: 2026-06-17 (**Folder-path document type classification**: SharePoint/OneDrive files are now categorized by a canonical `document_type` (psr, schedule, submittal, pay_app, proposal, estimate, bid, drawing, specification, permit, rfi, change_order, subcontract, contract, safety, closeout, design, photo, other). Source of truth is the SQL function `classify_document_type(path)` (migration `20260617210000_document_type_classifier.sql`), which keys off folder NAME (number-agnostic) and decodes URL-encoded paths. `project_documents` gained a `document_type` column auto-maintained by trigger `trg_project_documents_classify`; `document_metadata` file rows are auto-classified by `trg_document_metadata_classify` (comms rows untouched, keep `type`/`category`). The canonical keys are registered in `document_type_taxonomy` so the `document_metadata.document_type` FK is satisfied. AI: the `findProjectDocuments` tool (`frontend/src/lib/ai/tools/project-tools.ts`) now advertises the canonical keys in its `documentType` enum AND searches `project_documents` (the full ~3,128-file inventory) in addition to `document_metadata`, deduped. UI: a "Doc Type" filter/column was added to the pipeline Documents table (`/api/documents/status` now selects/filters/sorts `document_type`) and the global Project Documents table. No embedding-model/dims or search-RPC change.)

Last verified: 2026-06-17 (**Langfuse OTel tracing fixed — wrong region endpoint + Sentry global-provider conflict**: AI-assistant chat traces silently stopped reaching Langfuse on 2026-06-10 (last trace release `90064185b7`), when the chat handler moved from the `langfuse` SDK-client path (`traceChatCompletion`) to the AI SDK `experimental_telemetry`/OTel path. TWO independent bugs in `frontend/src/instrumentation.ts`, both fixed, verified by a real chat producing a trace (`ai-assistant-chat`, 5 observations) in the US project: (1) **PRIMARY — wrong region.** `@langfuse/otel`'s `LangfuseSpanProcessor` resolves its endpoint from `LANGFUSE_BASE_URL`/`LANGFUSE_BASEURL` only — it does **not** read `LANGFUSE_HOST` (the var actually set in our env) — and otherwise defaults to the **EU** endpoint `https://cloud.langfuse.com`. The processor was constructed with no `baseUrl`, so every OTel span was POSTed to EU with US-project keys and silently dropped. Fixed by passing `baseUrl` (`LANGFUSE_BASE_URL` ?? `LANGFUSE_HOST` ?? `https://us.cloud.langfuse.com`) + keys explicitly to `LangfuseSpanProcessor`. (2) **SECONDARY (prod-only) — Sentry owns the global OTel provider.** `@sentry/nextjs` v9 claims the global `TracerProvider` during `Sentry.init()`; OTel allows one global provider, so Langfuse's `provider.register()` no-opped and AI SDK spans never reached its processor. Fixed by `skipOpenTelemetrySetup: true` in `frontend/sentry.server.config.ts` so Langfuse owns the global provider (whose `provider.register()` also installs the required context manager — an isolated `setLangfuseTracerProvider` provider has none and logs "No active OTEL span in context", exporting nothing). Sentry keeps full error monitoring; it loses OTel performance tracing until `@sentry/opentelemetry` is added for a shared-provider setup. No table, embedding-model, search-RPC, or retrieval-flow change.)

Last verified: 2026-06-16 (**Outlook email importance feedback capture**: the Outlook emails surface now records explicit user training signals for email-priority classification through `frontend/src/app/api/ai-assistant/email-importance-feedback/route.ts` and `frontend/src/lib/ai/services/email-importance-feedback-service.ts`. Feedback is stored in the existing `ai_feedback_events` table under `event_family='user_preference'`, `event_type='email_importance_feedback_recorded'`, `surface='outlook_emails'`, and `subject_type='project_email'`, with the latest per-email user preference hydrated back into the Outlook table/detail UI for follow-on triage. This extends the existing feedback-event architecture for email-priority learning without adding new tables, embedding changes, retrieval RPCs, or RAG pipeline stages.)

Last verified: 2026-06-17 (**Graph embedding content rehydration + ingest-job dual-write**: two pipeline-flow changes, no embedding-model/dims or search-RPC change. (1) `backend/src/services/integrations/microsoft_graph/embed.py` now repairs OneDrive/SharePoint docs whose `rag_document_metadata.content` is empty before giving up: it re-downloads text from Supabase Storage, and if that's absent re-fetches the file directly from the Graph drive item (`onedrive._extract_text`), upserts the recovered text back into `rag_document_metadata` (`content`/`raw_text`/`content_length`/`last_content_loaded_at` + `processing_metadata.rehydrated_from`), persists a `graph-rehydrated/<source_system>/<item>.txt` storage object, and backfills `document_metadata.storage_bucket`/`file_path`. Only when nothing is recoverable does it mark `GRAPH_CONTENT_MISSING` (`document_metadata.status='error'` + `rag_document_metadata.embedding_status='error'`) instead of silently flagging the doc embedded. The candidate scan now forces the Supabase fallback whenever the RAG DB is split out (the local single-connection SQL anti-join can't span both DBs), adds a `completed_without_embeddings` branch (status `embedded`/`complete` but no `document_chunks` rows), and filters by `created_at` rather than `date`. New `sharepoint_document` source_type. (2) `backend/src/services/supabase_helpers.update_ingestion_job_state()` now DUAL-WRITES `fireflies_ingestion_jobs` stage rows into BOTH the PM-app DB and the RAG DB, keyed by `COALESCE(document_metadata.fireflies_id, id)` (on_conflict=fireflies_id) — adopted by parser, document_parser, financial_parser, embedder, extractor, and orchestrator in place of the old RAG-only `metadata_id` update. MAIN.fireflies_ingestion_jobs is therefore no longer a stale orphan (tables.yaml updated). Also: SharePoint sync now resolves a concrete `site_id` before building Graph delta/item paths (`onedrive.sync_sharepoint_folder`) and counts under `summary["sharepoint"]`; project_document_backfill paginates metadata/project_documents scans at 1000/page. Separately, `backend/src/api/main.py` mounts an optional hosted `/mcp` "Alleato system MCP" app behind `ALLEATO_SYSTEM_MCP_ENABLED` + `ALLEATO_SYSTEM_MCP_BEARER_TOKEN`, with `/api/mcp/status`.)

Last verified: 2026-06-17 (**pipeline model routing map**: backend model defaults are now centralized in `backend/src/services/pipeline/config.py`. Source signal extraction (`extract_deep_meeting_intelligence`, `extract_deep_communication_intelligence`, `project_synthesizer`, and daily-digest meeting-signal extraction) routes through `MODEL_SIGNAL_EXTRACTION` / `COMPILER_MODEL_LIGHT`, defaulting to deployable `gpt-5.4-mini` while retaining `PIPELINE_MODEL_SIGNAL_EXTRACTION_TARGET=gpt-5.5-mini` for provider availability. Rolling project-intelligence synthesis routes through `MODEL_PROJECT_INTELLIGENCE` / `COMPILER_MODEL`, defaulting to `gpt-5.4`. Brandon/Outlook executive-assistant review and daily-brief recap generation route through `MODEL_BRANDON_EMAIL` and `MODEL_DAILY_BRIEF`, both defaulting to `gpt-5.5`. The RAG embedding default remains `text-embedding-3-large` at 3072 dimensions because `document_chunks` search uses halfvec(3072). No table/schema/RPC change.)

Last verified: 2026-06-17 (**RAG-side model usage ledger and daily budget guard**: applied RAG migration `scripts/database/rag/migrations/20260617103000_create_pipeline_model_usage.sql` to project `fqcvmfqldlewvbsuxdvz`, creating `pipeline_model_usage` for per-stage model, token, estimated-cost, status, source, and project telemetry. `backend/src/services/pipeline/model_usage.py` now estimates standard OpenAI costs with env-overridable prices, records best-effort usage rows through the RAG client, and blocks background LLM/embedding calls when `PIPELINE_DAILY_MODEL_BUDGET_USD` has been reached. Wired into shared intelligence extraction, project-intelligence synthesis, pipeline embedding/chat helpers, Graph embeddings, Fireflies embeddings, and daily digest generation. This is a RAG-only telemetry/control table; no PM APP write pressure or retrieval RPC change.)

Last verified: 2026-06-17 (**RAG-side source processing lifecycle ledger**: applied RAG migration `scripts/database/rag/migrations/20260617114500_create_source_processing_jobs.sql` to project `fqcvmfqldlewvbsuxdvz`, creating `source_processing_jobs` keyed by `source_system + source_item_id + content_hash`. `backend/src/services/pipeline/source_processing.py` now records per-source status transitions without PM APP write pressure. First slice wiring covers Fireflies ingestion (`captured`, assignment/review, `indexed_for_rag`, `complete`/failure), Microsoft Graph embedding for Outlook/Teams/OneDrive/SharePoint (`indexed_for_rag`/failure), communication signal extraction (`signals_extracted`), and final rolling project-intelligence synthesis (`project_intelligence_updated`). This makes pipeline health queryable by source item instead of inferred from mixed document status fields.)

Last verified: 2026-06-17 (**RAG-side source-health alert sink**: source-health snapshots and runs were already RAG-owned, but `persist_source_sync_alerts()` was still writing `system_alerts` into PM APP. Added RAG migration `scripts/database/rag/migrations/20260617130000_create_system_alerts.sql` and rewired `backend/src/services/health/source_sync_health.py` so source-sync and source-RAG watchdog alerts persist to the AI database through `get_rag_write_client()`. Guardrail: `npm run rag:verify:backend-client-boundary` now fails if backend code accesses RAG-owned tables without an AI DB resolver.)

Last verified: 2026-06-17 (**source lifecycle health verifier + assignment backfills**: `npm run rag:verify:source-lifecycle` now reads the split PM APP/RAG state and fails loudly when recent Fireflies, Teams, Outlook, or OneDrive/SharePoint sources lack lifecycle rows, project assignment/review evidence, embedded chunks, generated-task project assignment, fresh current packets, or recent source-linked Project Intelligence evidence. No model calls are made. Current-state repair helpers are also model-free: `npm run rag:backfill:source-lifecycle` backfills `source_processing_jobs` from existing document/chunk/task/evidence state, `npm run rag:backfill:project-assignments` copies high-confidence `source_intelligence_jobs.output_summary.project_id` back to app-side `document_metadata`/`tasks`, and `npm run rag:backfill:onedrive-project-paths` fills missing OneDrive/SharePoint `project_id` from project numbers in `source_path`. The source compiler now persists newly inferred missing `document_metadata.project_id` values instead of only correcting already-populated wrong assignments. These changes add no tables, no embeddings, and no LLM calls; they make source-to-project-to-packet health auditable and prevent future inferred assignments from remaining invisible in app metadata.)

Last verified: 2026-06-17 (**AI-side packet projection staging worker**: RAG `packet_refresh_jobs` now owns the PM packet projection handoff. Applied RAG migration `scripts/database/rag/migrations/20260617015000_packet_refresh_projection_payload.sql` to project `fqcvmfqldlewvbsuxdvz`, adding `projection_status`, `projection_payload`, `projection_error`, `projection_attempt_count`, `projected_output_packet_id`, and `projected_at`; verified those columns through the Supabase management database query API. `compiler.build_current_packet_projection()` builds the final packet/card payload without PM writes, `process_packet_refresh_job()` stages that payload when `INTELLIGENCE_STAGE_PM_PROJECTION=true`, and `project_pm_intelligence_packet_job()` is the only drain path that applies staged payloads to PM tables through `enforce_pm_app_final_projection_guard()`. The operating-summary compiler remains a direct compile path only; it is intentionally excluded from the projection builder so staging cannot accidentally write PM rows.)

Last verified: 2026-06-17 (**bounded PM projection drain runner**: added `compiler.claim_staged_pm_projection_jobs()` and `compiler.run_pm_intelligence_projection_batch()` so staged RAG packet projections drain into PM in a capped batch instead of inline compiler writes. The claim path only takes `status='succeeded'` + `projection_status='staged'` jobs, marks them `projecting`, increments `projection_attempt_count` once, and then applies each job through `project_pm_intelligence_packet_job()`. Failures are recorded back on the RAG job with `projection_status='failed'` and `projection_error`; batch stats include claimed/succeeded/failed IDs. CLI entrypoint: `python3 src/scripts/run_pm_intelligence_projection_drain.py --limit 5 --max-processing-time-ms 120000`. This still does not resume suspended crons; it is the bounded worker needed before selective resume.)

Last verified: 2026-06-17 (**backend AI Gateway transport + startup guard**: `backend/src/services/ai_transport.py` now uses Vercel AI Gateway first when `AI_GATEWAY_API_KEY` is configured, and `AI_GATEWAY_REQUIRED=true` overrides stale `AI_PROVIDER_PATH=openai` so Render cannot silently burn direct OpenAI credits when the gateway is mandated. Direct OpenAI remains a fallback only when the gateway is not configured or `AI_PROVIDER_PATH=openai` is explicitly selected without the required flag. `/health` now reports `ai_provider_path`, `ai_gateway_configured`, `ai_gateway_required`, `openai_configured`, and `embedding_provider_configured`, which is what `npm run rag:verify:render-ai` checks. `backend/src/services/pipeline/__init__.py` now lazy-loads pipeline exports so importing Fireflies ingestion no longer initializes the full pipeline graph and crashes Render with the `FirefliesIngestionPipeline` circular import. No table/schema/RPC change.)

Last verified: 2026-06-17 (**RAG outage fail-loud guardrails**: `scripts/verify/verify_source_lifecycle_health.mjs` now catches app/RAG database connection failures and exits with an explicit message that source lifecycle health cannot prove ingestion, embeddings, task assignment, or Project Intelligence freshness while the AI/RAG database is unreachable. `backend/src/api/main.py` now preflights `rag_document_metadata` through the RAG read client before `/api/pipeline/process` returns `queued`; if Supabase returns Cloudflare 522/521 or another RAG read failure, the endpoint returns HTTP 503 with a public `RAG pipeline is unavailable` detail instead of accepting work that later fails in a background task. No table/schema/RPC change.)

Last verified: 2026-06-16 (**PM DB high-churn intelligence write block after Supabase health incident**: the AI/RAG database split removed vector/chunk churn from the PM APP database, but app-facing intelligence projections (`source_signal_candidates`, `insight_cards`, `insight_card_evidence`, `intelligence_packets`, `intelligence_packet_cards`, and related task/target updates) were still written by background AI jobs against the PM Supabase project. The 2026-06-16 incident showed this is not safe: Supavisor checkout failures began during the `alleato-domain-packet-compiler` run window, and graph/project synthesis could also write cards/packets inline. Added `enforce_no_pm_app_high_churn_writes()` in `backend/src/services/ops/db_pressure_guard.py`; domain compiler and project synthesizer paths now fail closed unless `ALLOW_PM_APP_HIGH_CHURN_WRITES=true` is set for a controlled one-off run. Render containment also treats AI/RAG/source-sync cron jobs as suspended-by-default when present (`scripts/ops/suspend-render-db-pressure-crons.mjs`, `scripts/verify/verify-render-web-scheduler-disabled.mjs`, `scripts/verify/verify-live-db-incident.mjs`). Root `render.yaml` graph-sync was corrected back to the safer 2-hour cadence with `embed_limit=25` and no inline Teams compiler. No table/schema/embedding/RPC change.)

Last verified: 2026-06-16 (**PM final-projection budget gate**: added `enforce_pm_app_final_projection_guard()` as the controlled path for low-volume PM APP writes after high-churn AI staging/synthesis has been isolated. The guard is separate from the high-churn bypass: it requires `ALLOW_PM_APP_FINAL_PROJECTIONS=true`, enforces `PM_APP_PROJECTION_MAX_TOTAL_ROWS` plus optional per-table budgets such as `PM_APP_PROJECTION_MAX_INSIGHT_CARD_EVIDENCE_ROWS`, and fails closed with a named `AppDbProjectionError`. Wired into `compiler.promote_signal_candidate`, `compiler.compile_current_packet`, `operating_summary.refresh_project_operating_packet`, `project_intelligence.refresh_project_intelligence`, and the domain packet compiler projection step. This still does not resume suspended crons; it creates the bounded PM projection contract needed before selective resume. No table/schema/embedding/RPC change.)

Last verified: 2026-06-21 (**Outlook ingestion boundary — raw capture plus canonical RAG enrichment**: `backend/src/services/integrations/microsoft_graph/outlook.py` owns Outlook raw intake, project-assignment enrichment, RAG document backfill, attachment lineage, and vectorization-status projection. New syncs assign projects through the shared project inference helper before RAG intake when possible, while unmatched messages remain captured with inspectable `project_assignment.status='review_needed'` instead of being dropped. Clear imported non-project mail is now explicitly marked with `project_assignment.status='not_project'` and a category such as `finance_admin`, `business_admin`, `system_admin`, or `personal_admin`; project-looking ambiguity remains `review_needed`. Brandon's approved 14-day window read-back after this categorization: `assigned=149`, `not_project=45`, `review_needed=68`, `missing=0`, `deferred=0`. `sync_outlook_mailbox_delta()` keeps legacy `project_emails` mirroring opt-in via `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS=true`; raw Outlook cache freshness must not depend on project lookup/linking tables. `scripts/verify/verify_microsoft_assistant_health.mjs` (`npm run verify:microsoft-assistant-health`) checks Render cron config/run state, live Graph inbox access, latest actionable cached Outlook intake, and `graph_sync_state` status as separate boundaries. The compatibility entrypoint `backend/src/scripts/backfill_unlinked_intake_emails.py` now delegates to `backfill_outlook_intake_rag_documents()`, `backfill_outlook_intake_project_assignments()`, and `refresh_outlook_intake_vectorization_statuses()` instead of creating app `document_metadata` rows directly. The orphaned TypeScript worker under `scripts/ingestion/microsoft-email-attachments` was removed because it used a competing project-required capture path and 1536-dimension embeddings. No retrieval RPC change.)

Last verified: 2026-06-15 (**intelligence — EVENT-DRIVEN extraction (stop the 2-hourly re-scan)**: email/Teams intelligence extraction was wired ONLY to a 2-hourly cron that (a) re-scanned the same docs, (b) only ever touched the first 10 project IDs (sorted asc — the other ~11 active projects never processed), and (c) relied on a best-effort `source_metadata.synthesized_at_v1` marker for dedup that barely persisted (e.g. 13/712 docs marked on project 43). Rewired to mirror meetings (which are already event-driven via the Fireflies trigger): NEW `synthesize_new_comms_since(since)` in `intelligence/project_synthesizer.py` runs INLINE at the end of `run_graph_sync` (microsoft_graph/sync.py) — it finds projects with docs ingested since the sync watermark, extracts ONLY those new docs (mini model), and refreshes each affected project's L2 synthesis. Dedup is now RELIABLE: `synthesize_project_intelligence` skips a doc if it already has a `source_signal_candidate` for the version (durable) OR carries the marker (covers zero-yield docs) — a failed marker write can no longer cause re-extraction. The standalone sweep (`run_synthesis_sweep`) is demoted from every-2h to a once-DAILY backstop (cron `alleato-project-synthesis-sweep` 0 7 * * *, updated live + render.yaml) covering ALL projects (max_projects 10→200, max_extractions 4→25) — cheap because the candidate-skip + empty-delta L2 guard make already-done docs and unchanged projects free. Net: a new email/Teams message is turned into intelligence once, in the sync cycle it arrives, then never re-processed. No table/schema/embedding/retrieval change.)

Last verified: 2026-06-15 (**intelligence — COST REGRESSION FIX: email/Teams extraction back to the mini model**: commit `b71a70771` ("route Teams DM + email extraction to mini model") had deliberately moved high-volume email/DM extraction off frontier gpt-5.5 to cut a ~$60/day driver ~10-20x. The intelligence redesign's Step 1 rip-out (`10a1af5f0`) DELETED those mini-routed compilers, and Slice 2.2b's replacement `extract_deep_communication_intelligence` (pipeline/llm.py) was wired to `COMPILER_MODEL` (gpt-5.5) — silently reverting the cost fix, so every email and Teams doc went back to frontier reasoning. FIXED: `extract_deep_communication_intelligence` now uses `COMPILER_MODEL_LIGHT` (gpt-4.1-mini, env-overridable). Meetings (`extract_deep_meeting_intelligence`) and the L2 `synthesize_project_state` pass intentionally keep `COMPILER_MODEL`=gpt-5.5 (low-volume, high-value). No Render `COMPILER_MODEL`/`COMPILER_MODEL_LIGHT` override is set, so code defaults govern. No table/schema/retrieval change.)

Last verified: 2026-06-15 (**intelligence — L2 synthesis COST GUARD**: `refresh_project_intelligence` was calling the frontier gpt-5.5 `synthesize_project_state` pass UNCONDITIONALLY — even when a project had zero new documents since the prior packet's `covered_end_at` watermark. The 2-hourly `alleato-project-synthesis-sweep` therefore re-ran a full reasoning pass on every quiet project, paying for zero change. Added an early-return cost guard: when a prior packet exists, the delta is empty, and it's not `force_full`/`dry_run`, skip the LLM call and leave the packet unchanged (`result.skipped_no_new_docs=true`). Rolling-state now actually only pays for the delta. NOTE on the broader cost shape: both `extract_deep_meeting_intelligence` and `extract_deep_communication_intelligence` (pipeline/llm.py) use `COMPILER_MODEL`=gpt-5.5 per meeting AND per email/Teams doc — the dominant spend driver; the cheaper `COMPILER_MODEL_LIGHT` (gpt-4.1-mini) exists and is the 10-20x lever for high-volume email/Teams extraction if cost needs cutting. No table/schema/retrieval change.)

Last verified: 2026-06-15 (**intelligence — Progress Log timeline read fix (L3)**: `loadProjectTimeline` in `frontend/src/lib/ai/intelligence/packet-service.ts` was pulling EVERY `insight_cards` row for a target (all card types, all compiler versions — 1000+ rows) ordered by `occurred_at` and capped at 80, so a single deeply-extracted meeting (40-70 cards/day) consumed the whole limit and silently hid weeks of history (only the latest meeting day rendered). Now filters to curated event types via `TIMELINE_EVENT_CARD_TYPES` (`decision`, `risk`, `schedule_risk`, `financial_exposure`, `blocker`, `change_management`, `open_question`, `flag`, `solution`, `milestone` — drops `project_update`/`task`/`sentiment`/`requirement`/`initiative_signal` noise) and raises the limit to 200. Verified on project 1009: Progress Log spans ~4 weeks again, not one day. No table/schema/embedding/retrieval-RPC change — this is a read-query filter on the existing `insight_cards` evidence log.)

Last verified: 2026-06-14 (**intelligence redesign — L2 + L4 SYNTHESIS layer (the missing core of the redesign)**: the fragment extractor (`project_synthesizer.py` → `insight_cards`/timeline) was real but is NOT the intelligence product; the rolling-state synthesis that turns fragments into one coherent project read was never built. NOW BUILT. **L2:** NEW `backend/src/services/intelligence/project_intelligence.py` — `refresh_project_intelligence(project_id, *, force_full=False, dry_run=False)`. Reads (1) the PRIOR synthesized packet (`compiler_version='project_intelligence_synthesis_v1'`, the rolling watermark `covered_end_at`), (2) the raw text of comms added SINCE that watermark (from RAG `rag_document_metadata.content`, bounded to `MAX_SYNTH_CHARS=220k`, meetings INCLUDED — synthesis only reads, never writes cards), and (3) a deterministic structured snapshot (`projects` budget/phase + RFI/CO counts; Acumatica AR explicitly 'not available in this run' so the model never invents cash) → ONE `gpt-5.5` synthesis pass (`synthesize_project_state` → `client.extract_with_retry(model=COMPILER_MODEL, timeout=300)`). Anti-hallucination: every cited `sourceId` is filtered to the real delta-doc id set (fabricated cites dropped + counted); a silent LLM failure (`_extraction_failed`) RAISES (→ 500) and never writes an empty packet (Pitfall 1 / `incident_openai_quota_backend_ai_down.md`). Writes ONE `intelligence_packets` row, UPDATING the single `packet_type='current'` row in place (the DB enforces one-current-per-target via `intelligence_packets_one_current_per_target`) — so synthesis supersedes the legacy `project-operating-summary-v1` packet the page used to read, and rolls its own state forward each run. `packet_json.summary` is keyed EXACTLY as `[projectId]/intelligence/page.tsx` renders (`currentExecutiveRead`, `immediateAttention`, `currentFocus`, `risks`, `openDecisions`, `recommendedActions`, `whatChanged`, `timeline`, `financialPosition{summary}`, `scheduleAndProcurement{summary}`) → zero frontend change. **Trigger:** admin `POST /api/intelligence/project-intelligence/refresh {project_id, force_full, dry_run}` (`require_admin_api_key`) + wired into `run_synthesis_sweep(refresh_intelligence=True)` (one bounded synthesis pass per swept project, after card extraction; non-fatal). **L4:** NEW `frontend/src/lib/executive/portfolio-synthesis-brief.ts` — `buildPortfolioSynthesisBrief()` loads every active client-project's current `project_intelligence_synthesis_v1` packet, reduces each to a digest (executiveRead/whatChanged/risks/openDecisions/recommendedActions) + the deterministic `financial-pulse.ts` numbers → ONE `gpt-5.5` cross-portfolio pass (synthesis-of-syntheses: one-line → what-changed → needs-Brandon → watch-list → waiting-on). This REPLACES the verbatim-card-dump brief path; gated behind `PORTFOLIO_SYNTHESIS_BRIEF_ENABLED` (delivery stays OFF until human approval — PRP Phase 5). Preview-only review route: `POST /api/admin/portfolio-brief/preview` (Bearer `CRON_SECRET`, returns JSON, never delivers). **Verified on project 1009 (Union Collective):** G1 dry-run = coherent executiveRead + 5 risks w/ reasoning+verbatim evidence+real sourceIds (fabricatedCiteCount=0); G2 real write; G3 rolling-state (2nd run since=1st covered_end_at, processes only newer docs, updates same packet_id, no dup); G4 authenticated page render shows the synthesis narrative (not the stale operating-summary); G5 forced LLM failure → raise + existing packet untouched. PRP: `docs/archive/2026-06-22-docs-migration/PRPs/intelligence-synthesis/prp-intelligence-synthesis.md`. No embedding/vector-store/`document_chunks` change; no new tables — reuses existing `intelligence_packets`/`intelligence_targets`.)

Last verified: 2026-06-14 (assistant action UI: existing `createCommitment` in `frontend/src/lib/ai/tools/action-tools.ts` now returns a typed `commitment_draft` widget for preview-first subcontract / purchase-order creation. The widget is rendered by `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` and blocks final-preview submission when the vendor company is unresolved. Confirmed `createCommitment` writes now fail loudly instead of creating unlinked commitment records, accepts optional SOV line items, validates them before the base commitment write, and creates rows in the existing `subcontract_sov_items` / `purchase_order_sov_items` tables after explicit confirmation. No RAG retrieval, embedding, vector-store, model, or table-schema change.)

Last verified: 2026-06-14 (**intelligence redesign — Slice 2.2b**: NEW `intelligence/project_synthesizer.py` (`synthesize_project_intelligence(project_id, since=None, max_docs=40)`, `compiler_version='project_synthesizer_v1'`) generalizes the meeting deep-extractor to EMAILS + TEAMS, which produced no intelligence after their compilers were deleted in Step 1. Per email/Teams doc: idempotent candidate clear → raw text from RAG `rag_document_metadata` → `llm.extract_deep_communication_intelligence` (NEW; full-context, evidence-backed, emits risk `severity` 1-5 + a `flags[]` array of forward-looking predictions: potential_change_event / emerging_risk) against `_fetch_project_state` ground truth → `write_source_signal_candidate`/`promote_signal_candidate` (cards) + `_upsert_task` (tasks, now tagged with real `source_system`). Meetings are SKIPPED here (still handled by `pipeline/extractor.py`). New `FlagItem` + `RiskItem.severity` in `pipeline/models.py`; `flag`/`solution`/`milestone` added to `compiler.INSIGHT_CARD_TYPES`. Admin trigger: `POST /api/intelligence/project-synthesize`. The live meeting path (`extract_deep_meeting_intelligence`, `run_extractor`) is byte-for-byte unchanged. No embedding/vector-store change. **Post-deploy fix (verified on project 1009):** the document-fetch SELECT referenced a non-existent `document_metadata.client_id` column (Postgres 42703) that aborted extraction with a silent 200 — column removed (`client_id=None` to `_upsert_task`), and a fatal document-fetch now raises so the endpoint returns 500 instead of a silent empty result. Added a `dry_run` mode to `synthesize_project_intelligence` / the endpoint: runs extraction but writes nothing, returning per-doc structured output (what_changed, signal/task counts, sample items + evidence) so extraction quality can be inspected directly. Added `StructuredData.extraction_failed` (set on the `_extraction_failed` branch) so a silent LLM-call failure is distinguishable from a genuinely-empty communication — surfaced in dry_run samples and treated as a real error (not silent empty) in the write path. Diagnosing email under-extraction — dry_run confirmed extraction_failed=TRUE for 26/26 emails (the LLM call fails, not empty content); added `StructuredData.extraction_error` to surface the underlying provider error (model id / auth / rate-limit) for root-cause. Root cause was an external OpenAI `429 insufficient_quota` (backend account unfunded), not code — see `incident_openai_quota_backend_ai_down.md`. Added `max_extractions` param to cap the number of (slow, seconds-each) deep extractions per synchronous call so a large batch can't exceed the request timeout. **Verified end-to-end on project 1009:** 3 emails → 17 promoted cards (incl. a predictive `flag`) + 9 email-sourced tasks, all evidence-backed. **Slice 2.4:** `skip_synthesized` (docs marked `source_metadata.synthesized_at_v1` after a real run are skipped, so cron/repeat runs drain a backlog incrementally) + `run_synthesis_sweep()` cron driver (`python -m ...project_synthesizer`) + `alleato-project-synthesis-sweep` cron in render.yaml (every 2h, self-limiting; per-run LLM ceiling = SYNTHESIS_SWEEP_MAX_PROJECTS x MAX_EXTRACTIONS, default 10x4). NOTE: render.yaml has drifted from live Render — the cron is DEFINED but activation (backlog-drain cost) is a deliberate decision. Sweep cron created live via Render API (`crn-d8ne6u8js32c73dkbre0`, every 2h). **Slice 2.3 — flag→outcome calibration:** `reconcile_project_flags(project_id)` loads each OPEN `flag` card, compares it against subsequent non-flag events via `gpt-4.1-mini` (`COMPILER_MODEL_LIGHT`), and flips `current_status` to `materialized` (+ links realizing events in `related_card_ids`) / `did_not_materialize` / leaves `open`. Exposed via `POST /api/intelligence/reconcile-flags` and run automatically after each project in the sweep. Guardrail: a flag is not marked `did_not_materialize` until `FLAG_DID_NOT_MATERIALIZE_MIN_DAYS` (21) have passed — premature "didn't happen" verdicts on a days-old prediction erode trust (a change event can still occur); younger flags stay `open`.)

Last verified: 2026-06-14 (**intelligence redesign — Slice 2.2a**: card-promotion path (`compiler._upsert_insight_card_from_candidate`) now populates the new `insight_cards` timeline columns: `occurred_at` (source event date) on insert, and `severity` (1-5) on insert+update via `_derive_card_severity` — explicit LLM `severity` else derived from likelihood×impact in `extraction_json`, only for risk-bearing card types. Enriches existing live meeting cards; prereq for the generalized comms synthesizer + flag→outcome loop. No retrieval/embedding/table-structure change beyond the 2.1 migration.)

Last verified: 2026-06-14 (**intelligence redesign — Step 1 rip-out**: removed three premature/competing "intelligence writer" paths in favor of a single full-context project-synthesis spine (see `docs/architecture/INTELLIGENCE-REDESIGN-INVENTORY.md`). DELETED: `intelligence/teams_compiler.py`, `intelligence/email_compiler.py`, `services/task_extraction.py` and all their wiring (`sync.py` Teams-compiler inline step, `main.py` `/api/intelligence/teams-compiler/run` route + `GraphSyncRequest.run_teams_compiler`, `scheduler.py` task-extraction job + inline-compiler arg, `run_graph_sync_phase.py` flags). Prod: suspended `alleato-task-extraction` cron; set `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=false` (the gpt-5.4-mini Deep-Agents packet writer was a competing, weak project-intelligence source). KEPT untouched: Graph/Fireflies ingestion, embedding → `document_chunks`, meeting deep-extraction (`pipeline/extractor.py`) + shared `compiler.promote_signal_candidate`, `operating_summary.py`, `domain_compiler.py`, all `insight_cards`/`intelligence_packets` tables + frontend read surface. The `/api/intelligence/teams-compiler/status` route remains (reads `get_teams_compiler_status` RPC, no deleted-module import). Next: Step 2 builds the generalized rolling-state synthesizer. Tables/columns unchanged in this step.)

Last verified: 2026-06-12 (cost fix: `compiler.py` `enqueue_packet_refresh` was firing for ALL document types (email, Teams, meetings) on any high-confidence signal, triggering a `gpt-5.5` operating summary call (up to 153k chars) per email thread. Both call sites (`process_source_document` at confidence≥0.85 and `promote_signal_candidate`) now gate on `_source_category(...) == "meeting"` before enqueueing a packet refresh. Email and Teams signal candidates still get staged and promoted to insight cards — they just no longer trigger an operating summary rebuild. Only meeting documents trigger the operating summary packet refresh.)

Last verified: 2026-06-11 (Strategist agent tool: added `generateExecutiveDailyBrief` to `createStrategistTools()` via new `frontend/src/lib/ai/tools/executive-brief-tools.ts`. Uses the same production pipeline as the scheduled Teams delivery (`regenerateExecutiveBriefingDraft` from `executive-briefing-workflow.ts`). The tool is available on-demand via AI chat so users can ask "generate the daily brief" without waiting for the cron.)

Last verified: 2026-06-10 (observability: AI SDK telemetry is now centralized in `frontend/src/lib/ai/ai-telemetry.ts` via `aiTelemetry()`, used by `fallback-chain.ts` and `intent-classifier.ts`. The gate is `aiTelemetryEnabled()` = Langfuse configured (`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`) OR `PHOENIX_TRACING=true` — previously only Phoenix gated it, so installed `@langfuse/otel` emitted nothing. The `/ai-assistant/chat` route now calls `flushLangfuse()` via `next/server` `after()` so buffered spans are not dropped when the serverless function suspends. Telemetry/observability only — no change to tools, tables, retrieval flow, models, or embeddings.)

Last verified: 2026-06-10 (fix 4: RAG supplement scan in _fetch_graph_embedding_candidates and _fetch_graph_embedding_candidates_via_supabase only covered email/email_attachment — teams_dm_conversation and teams_dm were excluded, leaving 599 items permanently pending. Added both types to both supplement scans.)

Last verified: 2026-06-10 (RAG client routing hardened — `get_rag_read_client`/`get_rag_write_client` now route to the AI Database whenever `RAG_SUPABASE_URL` is set, ignoring the READS/WRITES cutover flags except as a one-time drift warning. Fixes a Fireflies segmentation outage caused by the sync cron missing those env vars and silently reading `rag_document_metadata` from the PM APP DB. See the "Two Supabase projects" callout + `backend/tests/test_rag_client_routing.py`.)

Last verified: 2026-06-10 (intelligence compiler cost split — `COMPILER_MODEL` (default `gpt-5.5`) and new `COMPILER_MODEL_LIGHT` (default `gpt-4.1-mini`) in `backend/src/services/intelligence/client.py` are now env-configurable. Teams DM (`teams_compiler.extract_intelligence`) and email (`email_compiler.extract_intelligence`) signal extraction route to the LIGHT tier; meeting deep full-transcript extraction (`pipeline/extractor.py`) keeps full `gpt-5.5`. Driver: frontier gpt-5.5 was running on every email/DM — including ~5.5× redundant re-extraction of the same Teams DM conversation as new messages arrived — at ~$60/day. Mini routing cuts per-call cost ~10-20×. Deferred follow-up: debounce per-conversation Teams DM recompiles.)

---

## 1. Overview

The Alleato AI system acts as a 24/7 business intelligence layer for construction project managers. It answers questions in plain English by pulling from every data source simultaneously — project financials, contracts, meeting transcripts, accounting (Acumatica), emails, Teams messages, and company documents. It does not wait to be asked: Phase 2 will surface proactive alerts when margins erode, schedules slip, or cash flow gaps appear.

The architecture is a multi-agent system (C-Suite model) where a Chief Strategist routes questions to domain-specialist agents (CFO, COO, etc.), each of which has its own system prompt, tool set, and model config. All agents run server-side through Next.js API routes via the Vercel AI SDK.

AI SDK public types used by app code, including `ModelMessage`, must be imported from the `ai` package. Do not import those public app-facing types from transitive `@ai-sdk/*` packages; those packages may be present in the lockfile without being directly resolvable by TypeScript.

2026-06-09 update: Microsoft Graph embedding now uses the shared backend AI transport client (`get_openai_client()` plus `retry_ai_call`) instead of a route-local AI Gateway/OpenAI provider loop, so Graph email/Teams vectorization follows the same fail-loud provider path as the rest of the backend. Source-specific RAG adds stricter recent Teams/email routing and an `email-operator-policy` triage layer that suppresses non-operational security/auth/card notifications unless explicitly requested, while operating-summary sources carry richer evidence metadata for project-intelligence packets.

---

## 2. Architecture Diagram

```
User (browser)
    │
    ▼
Chat UI — frontend/src/app/(chat)/ai-assistant/
    │  (streaming via Vercel AI SDK)
    ▼
Chat API Route — frontend/src/app/api/ai-assistant/chat/route.ts
    │
    ▼
Chat Handler v2 — frontend/src/app/api/ai-assistant/chat/handler-v2.ts
    │  (read-heavy project/executive prompts can direct-return Render Deep Agents)
    │
    ├──[personal / Brandon task-register prompts]───────────► PM APP Supabase
    │                                                          public.tasks
    │                                                          (deterministic Tasks page lookup)
    │
    ├──[project status / budget / risk + selected project]──► Render backend
    │                                                          /api/intelligence/deep-agent/project-status
    │
    ├──[executive briefing without selected project]─────────► Render backend
    │                                                          /api/intelligence/deep-agent/executive-briefing
    │                                                          (executive prompt contract ranks canonical blockers/tasks,
    │                                                          separates soft watch-list signals, and closes with
    │                                                          management actions for "waiting on" / priority prompts)
    │
    ├──[Outlook / Teams / Microsoft operator work]───────────► Render backend
    │                                                          /api/intelligence/microsoft-executive-assistant
    │                                                          (specialist owns live Graph reads and review-only drafts;
    │                                                          exact inbox triage prompts can deterministically render
    │                                                          from live Graph payloads to keep urgency/action labels
    │                                                          evidence-only and mailbox-owner-specific)
    │
    ├──[app help / feature status / route questions]─────────► Render backend
    │                                                          /api/intelligence/app-expert
    │                                                          (read-only app docs, sitemap, and feature registry)
    │
    ├──[/ai-assistant-v2 fallback when LangGraph URL is unset]► Next API route
    │                                                          /api/ai-assistant-v2/deep-agent
    │                                                          (resolves project names, then calls Render Deep Agents)
    │
    ▼
Orchestrator — frontend/src/lib/ai/orchestrator.ts
    │  (Strategist system prompt + routing)
    │
    ├──[financial keyword]──► consultCFO tool
    │                              │
    │                              ▼
    │                         CFO sub-agent (own system prompt + financial tools)
    │
    ├──[direct]──────────────► createProjectTools() + all other tool sets
    │
    ▼
Tool Layer (global assistant registry + AI SDK tools + backend specialist tools)
    │
    ├── Structured SQL reads from Supabase (projects, budgets, commitments...)
    ├── pgvector semantic search (document_chunks, 24K+ rows)
    ├── Acumatica REST API (live accounting data)
    └── search_all_knowledge / search_knowledge_base RPCs
    │
    ▼
Supabase (PostgreSQL + pgvector)
    ├── document_chunks (halfvec 3072 — unified vector store)
    ├── Project tables (budgets, contracts, commitments, RFIs, submittals...)
    ├── Meeting intelligence (decisions, risks, tasks, opportunities)
    └── company_knowledge / ai_insights / conversation_memories
```

---

## 3. Implementation Phases

| Phase | Name | Status | What's Built |
|-------|------|--------|--------------|
| 1 | Data Foundation | **Complete** | RAG assistant, 30+ tools, C-Suite architecture (Strategist + CFO live), document ingestion pipeline (PDF/DOCX + Azure OCR for scanned PDFs), Acumatica ERP integration (9 tools), company knowledge base, vector embeddings (109K+ chunks in AI Database), chat persistence, guardrails, daily digest, intelligence packet compiler, structured SOP backlog and finance spend tools, contextual retrieval pilot (added 2026-05-17) |
| 2 | Proactive Intelligence | **In progress** | Intelligence packets (project packets now compile through the source-quality-scored `project-operating-summary-v1` path), executive daily briefing (cron-delivered), insight cards (6,900+ rows), packet card feedback, Render-backed Deep Agents bridge for read-heavy project/executive AI assistant answers, backend Microsoft Executive Assistant specialist for Outlook/Teams/calendar operator work, backend App Expert specialist for app-help and feature-status questions, standalone `alleato-ai` tool registry gated into the backend runtime |
| 3 | Workflow Automation | Not started | Auto-classify documents on upload, AI-generated status reports, smart form templates (pre-fill RFIs, change order descriptions) |
| 4 | Strategic Advisory | Not started | Project completion probability models, budget overrun prediction, cross-project pattern recognition, competitive benchmarking |

COO, CHRO, CRO, and VP BD agents are designed (prompts exist at `frontend/src/lib/ai/agents/`) but not wired as live `consult*` tools in the orchestrator. Only `consultCFO` is active.

---

## 4. Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Primary chat API route. All user messages enter here. Calls orchestrator, streams response, persists to `chat_history`. |
| `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | Current `/ai-assistant` server handler. Plans retrieval, persists chat history, and, when `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED=true`, direct-returns successful Render Deep Agents project, executive, and external-research packets before falling back to local AI SDK synthesis. Selected-project document/source questions now persist prefetch traces for `clientProjectIntelligencePacket`, `getProjectBriefingSnapshot`, semantic drilldown, and document lookup so evals can prove the assistant started from project operating context before searching exact files. `AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS=true` can skip Render bridge latency during local evals, and `AI_EVAL_DOCUMENT_INTELLIGENCE_RESPONSE=true` enables a deterministic document-intelligence response after retrieval completes; this eval-only path persists the normal `tool_trace`, `retrieval_plan`, `source_debug`, and `response_quality` metadata without changing production synthesis behavior. Personal task-register prompts such as "what are my tasks" or Brandon task wording now bypass executive Deep Agents and run a deterministic `public.tasks` lookup first, persisting `getPersonalTaskRegister` plus `getMyTasks`-compatible trace metadata, `response_quality`, and a `task_summary` widget so the answer uses the Tasks page source of truth instead of synthesized executive follow-up snippets. `source_health` intent now has a deterministic fast path through `loadAssistantSourceHealthContext()`, persisting `assistantSourceHealth` trace output and `source_health` metadata instead of falling through to generic semantic search when the user is asking whether Teams, Outlook, meeting, or OneDrive coverage is fresh enough to trust; that fast path now triggers even without a pinned project. The `isSourceHealthRequest` router (`retrieval/planner.ts`) is intentionally stricter than the attach-time `shouldAttachAssistantSourceHealth` check: routing to the fast path requires an explicit data-freshness/sync/trust question, or a freshness SUBJECT (sources/data/sync/embedding/packet/snapshot) paired with a trust SIGNAL — it no longer fires on the bare adjective "current"/"status"/"latest", which previously hijacked content questions like "current AR aging", "current strategic goals", and "current market price" into a source-health report (caught by the tool-coverage eval, fixed 2026-06-09; regression cases in `retrieval/__tests__/planner.test.ts`). App-help intent now prefetches the backend App Expert packet through the retrieval executor so application-behavior answers are grounded in curated help docs, generated sitemap, and feature registry instead of generic project/business RAG. Project/executive Deep Agents responses persist source evidence, memory-candidate widgets, `backend_deep_agent.memory_candidate_count`, and `memory_candidates` before streaming the final direct answer, so persistence failures fail loudly instead of producing an untracked chat response. All direct and fallback response paths persist `response_quality`; normal synthesis also persists `memory_usage` and schedules `runPostResponseTasks()` so conversation summaries and typed memory extraction run after the assistant message is saved. Direct Deep Agents responses schedule the same post-response task path after persistence and emit `ai-assistant-chat` Langfuse traces with `directDeepAgent:*` generation names so direct-return answers are observable even though they bypass `streamText.onFinish`. Deep Agents bridge attempts are recorded in `tool_trace` as the frontend wrapper tools (`backendDeepAgentProjectStatus`, `backendDeepAgentExecutiveBriefing`, `backendDeepAgentResearch`) plus backend-internal packet trace so evals can distinguish real backend routing from local synthesis. When a backend packet is not direct-return eligible, its formatted project, executive, research, or app-expert context is appended to the local AI SDK synthesis prompt instead of being discarded. Date-based Outlook/inbox plans are now deterministically delegated to `/api/intelligence/microsoft-executive-assistant` before local AI SDK synthesis, and the persisted `consultMicrosoftExecutiveAssistant` trace includes nested backend tool trace sources such as `microsoft_graph_live` so evals can prove the specialist, not a stale synced cache, answered the operator request. Exact live-inbox prompt shapes now have deterministic backend answer rendering for `last five`, `important this morning`, `arrived today`, and reply-triage asks, with same-scope filtering and evidence-only response labels so the specialist cannot drift into broader mailbox commentary after the live Graph read succeeds. If that backend specialist fails, the handler now persists an explicit failed `consultMicrosoftExecutiveAssistant` trace and returns the exact failing capability/detail instead of collapsing into the generic empty-provider fallback. Recent Teams source-specific RAG prompts also direct-return after the retrieval step, which removes the extra synthesis/tool loop that had been blowing the source-sync eval latency budget. Legacy/pre-fetched `getRecentEmails` traces still exist for non-specialist fallback diagnostics but are no longer the Strategist-owned inbox path. |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Converts retrieval context into compact model-visible evidence. For client-project operating packets, renders `packet_json.strategicReport`, category coverage, source-quality counts, and linked evidence totals before card snippets so the model sees the synthesized operating read instead of raw card metadata. If packet coverage includes meetings, the prompt explicitly forbids saying no meeting transcripts surfaced; it must distinguish packet meeting coverage from any fresh direct transcript lookup. For app-help questions, renders a dedicated App Expert packet with answer, sources, skills, and backend trace, and instructs the model not to invent app behavior outside those sources. For Microsoft operator work, the no-prefetch routing guidance points the Strategist to `consultMicrosoftExecutiveAssistant` instead of direct Outlook/Teams tools. The older structured Outlook inbox renderer remains for legacy/fallback contexts and intentionally surfaces `latestAvailableFallback`, `requestedWindowEmpty`, and `latestAvailableReceivedAt` so stale synced rows cannot masquerade as live Graph results. |
| `frontend/src/lib/ai/agents/strategist.ts` | Primary strategist prompt. The Outlook Operations Protocol now makes the Strategist an orchestrator, not the Microsoft operator: Outlook inbox triage, reply drafting, Teams escalation, calendar review, and Microsoft file context route through `consultMicrosoftExecutiveAssistant`. Brandon/operator inbox prompts must pass `bclymer@alleatogroup.com`, answer simple inbox lookups with a clean list before caveats, use reply/delegate/watch/ignore labels for triage, and keep drafts grounded only in retrieved email/thread facts. |
| `frontend/src/app/api/ai-assistant-v2/deep-agent/route.ts` | `/ai-assistant-v2` fallback route when no LangGraph URL is configured. Authenticates the user, resolves project names from the prompt when no project ID is supplied, calls the Render Deep Agents project/executive endpoints, and returns packet metadata to the v2 UI. |
| `backend/src/services/agents/research_agent/` | Standalone Alleato Deep Agents research module. Uses public web research tools, read-only Alleato PM/RAG/search tools, Deep Agents subagents, packaged runtime skills, optional local installed skill directories, and fail-loud response metadata. Exposed through `/api/intelligence/research`. |
| `backend/src/services/agents/content_builder/` | Isolated Deep Agents content builder ported from `alleato-ai/alleato_ai/subagents/content-builder-agent`. Packages the example memory file, `blog-post` and `social-media` skills, YAML researcher subagent config, Tavily research tool, and Gemini image tools. Exposed through `/api/intelligence/content-builder` behind `DEEP_AGENTS_CONTENT_BUILDER_ENABLED`; uses AI Gateway/OpenAI for the orchestrator and `GOOGLE_API_KEY` for generated images. |
| `backend/src/services/agents/microsoft_executive_assistant/` | Backend Microsoft operator specialist. Exposed through `/api/intelligence/microsoft-executive-assistant`, delegated by the Strategist via `consultMicrosoftExecutiveAssistant`, and available to Render webhook/scheduled triggers. Owns live Outlook inbox reads, synced email/Teams/file search, calendar review, Outlook category write-back, Outlook Drafts folder reply drafts, and urgent Teams alerts. For live inbox eval prompts, it can bypass freeform model wording and render deterministic response shapes directly from the successful live Outlook inbox tool payload so morning and current-day filters stay exact and per-email response paths remain evidence-only. It fails loudly when provider keys, Graph credentials, or source evidence are missing, and its nested tool trace is part of the inbox eval contract. |
| `frontend/src/components/ai-assistant-v2/advisor-chat.tsx` | `/ai-assistant-v2` client surface. Uses the LangGraph SDK only when `NEXT_PUBLIC_LANGGRAPH_API_URL` is configured; otherwise submits through the Render Deep Agents fallback route and displays mode, confidence, source count, and tool-call count. |
| `frontend/src/lib/ai/deep-agent-project-status.ts` | Typed server-side bridge to Render backend Deep Agents endpoints. Owns env gating, request schemas, source-evidence widgets, memory-candidate review widgets, bounded bridge timeout defaults, formatted fallback context for project/executive/research/app-expert packets, and direct-response eligibility for project/executive/research packets. |
| `backend/src/services/agents/app_expert/` | Read-only Deep Agents App Expert module. Exposed through `/api/intelligence/app-expert` behind `DEEP_AGENTS_APP_EXPERT_ENABLED`; uses generated app sitemap, feature registry, curated help articles, and App Expert runtime skills to answer application navigation, feature-status, workflow, permission, and troubleshooting questions. |
| `backend/src/services/agents/alleato_ai_tools/` | Backend-local port of the standalone `alleato-ai` Deep Agents tools: resolvers, SQL schema/query, RAG/meeting/email/Teams search, recent activity, Acumatica reads, draft-preview actions, prompts, and domain subagent definitions. Subagent SQL and Acumatica tools are attached only when their runtime gates are enabled. |
| `backend/src/services/agents/deep_project_intelligence.py` | Render Deep Agents runtime. The narrow PM tools are always present; the standalone registry is enabled by `DEEP_AGENTS_STANDALONE_TOOLS_ENABLED`, with separate SQL, Acumatica, draft-action, and subagent gates. The runtime also packages Deep Agents core/memory/orchestration skills into the store backend, attaches runtime memory instructions and a checkpointer when dependencies are available, and passes those skills to custom subagents so project/executive agents have the same harness surface as the standalone research agent. When `DEEP_AGENTS_MEMORY_ENABLED=true`, project memory is scoped in the existing memory SQL to team-visible rows or rows owned by the caller, avoiding extra per-page or per-tool permission lookups. Backend LangSmith tracing is controlled by the Render env keys `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`, `LANGSMITH_API_KEY`, and the compatibility `LANGCHAIN_*` aliases; the LangChain/LangSmith dependencies are pinned in `backend/requirements.txt` so trace export behavior changes only through deliberate dependency bumps. |
| `backend/src/services/ops/db_pressure_guard.py` | Fail-closed app database pressure guard for background jobs. Render crons that touch app-DB catalog/control-plane rows set `APP_DB_PRESSURE_GUARD_REQUIRED=true` and must provide `DATABASE_URL`; the guard checks `pg_stat_activity` before sync, compiler, health, promotion, executive-assistant, recap, and extraction work can start. This keeps high-churn RAG/Microsoft jobs from competing with employee app traffic when the Supabase pooler or app DB is already saturated. |
| `backend/src/services/agents/memory/store.py` | Deep Agents durable memory SQL layer. Loads user/project memory, recalls user/project/team memory, formats memory entries, and owns the owner/team visibility filters that prevent private project memories from leaking across users. |
| `backend/src/services/agents/memory/middleware.py` | Deep Agents memory middleware. Reads `user_id`, `project_id`, and thread config, loads durable memory from `store.py`, and injects the scoped memory context into the runtime. |
| `backend/src/services/agents/memory/tools.py` | Deep Agents memory recall tools exposed to agents. Binds `user_id` and optional `project_id` from runtime config before calling `store.py`, so tool recall follows the same privacy and project scoping rules as startup injection. |
| `frontend/src/lib/ai/orchestrator.ts` | Registers the agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`, and removes direct Microsoft operator tools from the Strategist in favor of `consultMicrosoftExecutiveAssistant`. Uses public `ai` package exports for AI SDK runtime APIs and types so strict pnpm installs do not depend on transitive package imports. Adding a new agent: add config here + add `consultXxx` tool + add name to `agents/types.ts`. |
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO-specific tool usage instructions. |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP BD system prompt (designed, not live). |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union type, `AgentResponse` type. Update when adding agents. |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. Includes the `deep-agents/strategist` option, which routes eligible project, executive, and external-research prompts through the backend Deep Agents strategist harness before local synthesis fallback. |
| `frontend/src/lib/ai/tool-registry.ts` | Canonical global assistant tool registry contract and policy metadata layer. Workflow packs request filtered subsets from here; Executive Daily Brief now registers source/generation/artifact/delivery tools here and projects them into AI Ops tool definitions through `toolDefinitionsForWorkflow()`. The Strategist's aggregate and standalone assistant factories pass through `filterRegisteredToolSet()` before model exposure, with actor/write/delivery/channel policy filtering and visibility metadata. Project/source-access enforcement remains tracked under AAI-554. |
| `frontend/src/lib/ai/tools/project-tools.ts` | Core project tools plus SAIS structured backlog/spend tools (portfolio, risk, budget, meetings, search, SOP backlog, finance spend rollup). |
| `frontend/src/lib/ai/tools/sais.ts` | SAIS tools: `getSopBacklog` for missing accounting/finance SOP requirements and `getFinanceSpendRollup` for trailing Acumatica AP bill spend classification. These are structured SQL reads, not vector/RAG document search. |
| `frontend/src/lib/ai/tools/financial.ts` | 6 financial tools (commitments, change orders, direct costs, budget line items, cost trends, margin). |
| `frontend/src/lib/ai/tools/operational.ts` | 15+ operational tools (people, vendors, RFIs, submittals, cross-project, semantic search, emails, Teams, knowledge base, memories). |
| `frontend/src/lib/ai/tools/acumatica.ts` | 9 Acumatica ERP tools (AP/AR aging, cash position, vendor spend, bills, invoices, POs, project budget). |
| `frontend/src/lib/ai/tools/schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays. |
| `frontend/src/lib/ai/tools/forecast-tools.ts` | `getForecastComparison` — budget vs. actual vs. forecast. |
| `frontend/src/lib/ai/tools/document-intelligence.ts` | Document search tools querying `document_chunks` for specs, OneDrive docs. |
| `frontend/src/lib/ai/tools/tool-utils.ts` | Shared helpers: `EMBEDDING` config registry, `generateEmbedding()`. Source of truth for which embedding model/dimensions go with which table. |
| `frontend/src/lib/ai/soul.ts` | Persona foundation — voice, tone, values. Included in every system prompt. |
| `frontend/src/lib/ai/identity.ts` | Identity layer — who the AI is. Composed with `soul` in system prompt assembly. |
| `frontend/src/lib/ai/persona-and-memory.ts` | `I_DONT_KNOW_REFLEX_PROMPT` and user-profile injection logic. |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | Legacy system prompt. Preserved but not used in the C-Suite path. Do not modify for new work. |
| `frontend/src/lib/ai/services/conversation-memory.ts` | Post-response fact extraction and storage to `conversation_memories`. |
| `backend/src/services/pipeline/orchestrator.py` | Routes ingestion jobs by document type (meeting → parser.py, PDF/DOCX → document_parser.py, CSV/XLSX → financial_parser.py). |
| `backend/src/services/pipeline/parser.py` | Stage 1A: Fireflies meeting markdown → segments, decisions, risks, tasks. |
| `backend/src/services/pipeline/document_parser.py` | Stage 1B: PDF/DOCX/text extraction → meeting_segments. LLM segmentation is the default, but `DOC_SEGMENT_USE_LLM=false` uses deterministic line-window segments for table-heavy technical documents. |
| `backend/src/services/pipeline/financial_parser.py` | Stage 1C: CSV/XLSX → document_rows with text summaries for embedding. |
| `backend/src/services/pipeline/embedder.py` | Stage 2: Chunking (3000 char target, 500 overlap) + embedding via `EMBEDDING_MODEL` from `pipeline/config.py`, currently `text-embedding-3-large` at 3072 dimensions to match `document_chunks` halfvec(3072). Generic documents that do not parse as meeting transcripts fall back to source line chunks and write `document_chunks.source_type='document'`. |
| `backend/src/services/pipeline/extractor.py` | Stage 3: Normalizes tasks and routes meeting decisions/risks/opportunities into the packet-first intelligence layer. Tasks upsert to `tasks`. **Decisions/risks/opportunities now flow into `insight_cards` via `_promote_meeting_signals` (added 2026-06-09):** each is staged as a `source_signal_candidate` under `compiler_version = meeting_extractor_compiler_v0_1` and high-confidence ones are promoted through `compiler.promote_signal_candidate` — sharing the same dedup (`normalized_signal_key`), evidence, and target-attribution machinery as the Teams/email compilers. This replaced the deprecated no-op `_upsert_insight` writer (Pipeline A `insights` table, dropped 2026-05-15), so full-transcript meeting intelligence becomes durable, deduped cards instead of being discarded. Per-item confidence is heuristic (content richness); items below the 0.85 promotion bar stay as `needs_review` candidates (review queue). Risk categories map to `schedule_risk`/`financial_exposure`/`risk`; opportunities map to `initiative_signal` (all within the `insight_cards.card_type` CHECK set). Re-extraction clears prior candidates for the meeting first, so promotion updates cards in place rather than duplicating. The Fireflies compatibility enrichment path still preserves direct transcript wording while backfilling missing assignee, due-date, email, and priority fields. **Deep extraction (added 2026-06-10, feature-flagged via `DEEP_EXTRACTION_ENABLED`, default off):** when on, Stage 3 replaces the shallow segment-normalization input with a single large-context call (`llm.extract_deep_meeting_intelligence`, model=`gpt-5.5`/COMPILER_MODEL via `intelligence/client.extract_with_retry`) that reads the **whole transcript** (uncapped except a `DEEP_TRANSCRIPT_MAX_CHARS` safety ceiling) against **deterministic project ground truth** (open `tasks` + tracked `insight_cards` for the project's target, fetched by direct DB read) plus one bounded project-filtered `search_document_chunks` lookup. Each emitted decision/risk/opportunity/`insight`/task carries a verbatim `evidence_quote` (→ card evidence excerpt), a **calibrated** `confidence` that replaces the heuristic and drives the 0.85 promote-vs-`needs_review` gate, and a `status_hint` (new/update/resolved → card `current_status`, so updates supersede and resolutions close via `normalized_signal_key`). Insights route to `project_update`/`open_question`. Deep tasks flow through the existing `_upsert_task` path (assignee resolution, UNIQUE(metadata_id,description) dedup, per-meeting delete+reinsert) merged with the Fireflies-rewriter tasks; deep tasks below `DEEP_TASK_CONFIDENCE_THRESHOLD` (default 0.7) are still written but flagged `extraction_metadata.needs_review=true` (the `tasks.status` CHECK has no needs_review value) so a human promotes them. On any deep-pass error or empty result, Stage 3 falls back to the shallow pass — behavior with the flag off is unchanged. Two silent-failure fixes landed with it in `intelligence/client.py` (which also un-break the Teams compiler on `gpt-5.5`): (1) gpt-5/o-series models reject any non-default `temperature` with a 400 that `extract_with_retry` was swallowing into `_extraction_failed` — temperature is now omitted for those model families; (2) `extract_with_retry` takes an optional `timeout`, and the deep pass passes `DEEP_EXTRACTION_TIMEOUT_SECONDS` (default 300s) because a full 130k-char transcript exceeds the 60s Teams-compiler default. Deep tasks set `extraction_prompt_version='deep_extractor_v0_1'` to satisfy the tasks-quality trigger (migration 20260528000000). Verified live 2026-06-10 on a real 130k-char meeting: deep tasks/cards written with verbatim evidence + calibrated confidence straddling the gate, implied action items caught, no duplicate accumulation on re-run. |
| `backend/src/services/pipeline/digest.py` | Stage 4: Daily digest generation (non-blocking). |
| `backend/src/services/pipeline/llm.py` | Backend LLM/embedding client. Current defaults come from `pipeline/config.py`: source signal extraction/chat helper = `MODEL_SIGNAL_EXTRACTION` (`gpt-5.4-mini` deployable fallback for the `gpt-5.5-mini` target), project synthesis = `MODEL_PROJECT_INTELLIGENCE` (`gpt-5.4`), and embeddings = `text-embedding-3-large` at 3072 dimensions. |
| `backend/src/services/daily_digest.py` | Daily meeting digest generation. |
| `scripts/ingestion/ingest_local_documents.py` | Local folder RAG ingestion. Supports stable source IDs, content-hash dedupe, dependency/build folder ignores, category/workflow overrides, and source-labeled storage prefixes. The estimating preset uses this script through `npm run rag:ingest:estimating`. |
| `scripts/verify/verify_estimating_rag_ingest_target.mjs` | Guardrail for the estimating local-folder ingest target. Verifies the npm scripts, stable source IDs, `workflow_target=estimating`, `category=financial_document`, backend `PYTHONPATH`, and a Supabase-free dry run. |
| `backend/src/services/ingestion/fireflies_pipeline.py` | Fireflies sync: fetch transcripts → normalize markdown → upload to Supabase Storage → upsert document_metadata → enqueue ingestion job. |
| `backend/src/services/alleato_agent_workflow/guardrails.py` | PII and jailbreak guardrails. |

---

## 5. RAG Tools Reference

All tools are server-side only (Next.js API routes). They receive `userId` for RLS scoping.

2026-05-19 SAIS update: accounting/finance SOP gaps and Acumatica overhead spend are structured tool reads (`getSopBacklog`, `getFinanceSpendRollup`), not vector-search-only document retrieval.

### Core Project Tools (`project-tools.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getProjectBriefingSnapshot` | projects, budgets, risks, meetings, tasks | Full project briefing: financials, schedule, risks, action items |
| `getPortfolioOverview` | projects, project_health_dashboard | All active projects with health signals |
| `getProjectsWithRisks` | risks, ai_insights, project_issue_summary, project_health_dashboard | Ranked projects by risk score with explicit risk signals |
| `getProjectRiskAnalysis` | risks, open_critical_items, ai_insights | Single-project risk drilldown |
| `getFinancialAnalysis` | budgets, contracts, commitments, change_orders | Cross-project financial overview |
| `getProjectBudgetSummary` | budget lines, cost codes, commitments | Per-project budget health with cost code breakdown |
| `getActionItemsAndInsights` | tasks, decisions, opportunities from meetings | Action items, decisions, follow-up tracking |
| `getMeetingsByDate` | document_metadata, meeting_segments | Meetings filtered by date range |
| `searchDocuments` | document_metadata, document_chunks (full-text) | Keyword search across all ingested documents |
| `getProjectDetails` | projects + related tables | Single project record with team and contract info |
| `getSopBacklog` | sop_backlog, document_metadata, projects | Missing/draft/in-review/published SOP requirements by accounting/finance area, priority, owner, and file-link status |
| `getFinanceSpendRollup` | acumatica_ap_bills, finance_spend_classification_rules | Trailing monthly accounting/finance overhead spend by category/vendor with exclusions and review flags |

### Financial Tools (`financial.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getCommitmentsOverview` | commitments, companies, contract_line_items | All commitments with status, amounts, vendor info, billing summary |
| `getChangeOrderDetails` | change_orders, change_events, prime_contracts | CO lifecycle: approved/pending/rejected with financial impact |
| `getDirectCostsSummary` | direct_costs, companies, cost_codes | Direct costs by category, vendor, time period |
| `getBudgetLineItems` | budget_lines, cost_codes | Granular budget with filterable cost codes and variance |
| `getCostTrends` | direct_costs, commitments (time-bucketed) | Spending velocity and burn rate over time |
| `getMarginAnalysis` | prime_contracts, commitments, change_orders | Margin by contract and project, trend over time |

### Operational Tools (`operational.ts`)

| Tool | Queries | Returns |
|------|---------|---------|
| `getPeopleAndRoles` | project_members, users, companies | Who's on which project, roles, workload signals |
| `getVendorPerformance` | companies, commitments, direct_costs | Delivery history, quality signals, spend by vendor |
| `getRFIStatus` | rfis | Open RFIs, response times, schedule impact flags |
| `getSubmittalStatus` | submittals | Submittal workflow status, overdue items |
| `getCrossProjectComparison` | projects, budgets, commitments | Side-by-side metrics across projects |
| `getHistoricalTrends` | budgets, commitments, projects (time-bucketed) | How metrics have changed over time |
| `semanticSearch` | document_chunks (pgvector), ai_insights, company_knowledge | Unified semantic search across all ingested content |
| `getCompanyKnowledge` | company_knowledge, company_context | Company strategy, goals, competitive landscape |
| `recallPastConversations` | conversation_memories (pgvector) | Semantically relevant facts from past sessions |
| `searchMeetingsByTopic` | document_chunks (meetings category, pgvector) | Meeting content by topic |
| `getMeetingDetails` | document_metadata, meeting_segments, decisions, risks, tasks | Full meeting record with extracted intelligence |
| `getRecentEmails` | Microsoft Graph live inbox first; `outlook_email_intake` fallback | Legacy/frontend recent-email diagnostic path. Date-based inbox/operator prompts now route to the backend Microsoft Executive Assistant specialist through `consultMicrosoftExecutiveAssistant`; direct Strategist use of `getRecentEmails` is blocked by the inbox eval bundle. When this legacy tool is used outside the specialist path, it calls the backend `/api/graph/outlook/live-inbox` endpoint first and returns `source: "microsoft_graph_live"` when Graph succeeds. Synced `outlook_email_intake` rows are fallback only and are labeled `source: "outlook_email_intake_fallback"` with `graphLiveError` / sync-cutoff evidence so evals can fail stale-cache answers loudly. |
| `searchEmails` | document_chunks (email category, pgvector) | Email content by topic — use for subject-based questions |
| `searchTeamsMessages` | document_chunks (teams category, pgvector) | Teams message content by topic |
| `saveInsight` | ai_insights (write) | Persist an AI-generated insight to the insights table |
| `saveToKnowledgeBase` | company_knowledge (write) | Persist a fact to the company knowledge base |
| `writeMemory` | conversation_memories (write) | Persist a durable fact about the user |

### Acumatica ERP Tools (`acumatica.ts`) — Live Accounting Data

| Tool | Acumatica Endpoint | Returns |
|------|-------------------|---------|
| `getAPAgingReport` | AP aging | Who you owe, amounts, aging buckets |
| `getARAgingReport` | AR aging | Who owes you, amounts, days outstanding |
| `getCashPositionReport` | GL cash accounts | Current balances across bank accounts |
| `getVendorSpendReport` | Vendor transactions | Total spend by vendor across all projects |
| `getRecentBills` | Bills | Latest AP bills |
| `getRecentInvoices` | Invoices | Latest AR invoices |
| `getAcumaticaProjectBudget` | Project budget | Live project budget from accounting |
| `getAcumaticaProjectList` | Projects | Project list from Acumatica |
| `getPurchaseOrderSummary` | Purchase orders | Open PO summary |

### Additional Tool Files

| File | Tools |
|------|-------|
| `schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays, look-aheads |
| `forecast-tools.ts` | `getForecastComparison` — budget vs. actual vs. forecast |
| `document-intelligence.ts` | `searchSpecs`, `searchOneDriveDocs` — semantic search of OneDrive/spec documents |
| `action-tools.ts` | Write-back actions: create task, send alert |
| `workspace-tools.ts` | Workspace-scoped queries |
| `progress-report-tools.ts` | Progress report generation |

---

## 6. Vector Store

> **⚠️ Two Supabase projects.** As of **2026-05-15** the RAG tables (`document_chunks`, `rag_document_metadata`, `rag_pipeline_state`) live in the **"AI Database"** project (`fqcvmfqldlewvbsuxdvz`), reached by backend code via `RAG_SUPABASE_URL` and the `get_rag_read_client()` / `get_rag_write_client()` helpers in `backend/src/services/supabase_helpers.py`. Frontend/server tool code reaches the same AI Database through `createRagServiceClient()` in `frontend/src/lib/supabase/service.ts`; operational semantic-search tools now use that RAG client directly for `document_chunks` while keeping the app service client for PM-app metadata and project tables.
>
> **Client routing is credential-gated, not flag-gated (hardened 2026-06-10).** `get_rag_read_client()` / `get_rag_write_client()` route to the AI Database whenever `RAG_SUPABASE_URL` is configured, **regardless of `RAG_DATABASE_READS_ENABLED` / `RAG_DATABASE_WRITES_ENABLED`**. Those flags are honored only as a one-time drift warning. Rationale: the PM APP copies of the RAG tables were removed after the migration, so the old silent fallback to the PM APP client raised `PGRST205: Could not find the table 'public.rag_document_metadata'`. This caused a same-day outage where the `alleato-fireflies-sync` cron (missing the READS/WRITES env vars in its live Render env despite `render.yaml` declaring them) failed every segmentation job, leaving all Fireflies meetings with zero `meeting_segments`. Regression test: `backend/tests/test_rag_client_routing.py`.
>
> RAG-owned operational ledgers and health tables (`source_sync_runs`, `source_sync_health_snapshots`, `source_signal_candidates`, `source_intelligence_jobs`, `document_attribution_candidates`, ingestion job tables, and packet refresh jobs) must also use `createRagServiceClient()` from frontend/server code. The predeploy gate runs `npm run rag:verify:client-boundary`, which fails if those tables or RAG search RPCs are queried through a file that does not use the RAG service client, or if old RAG/main fallback unions are reintroduced.
>
> The same tables still exist in the **"PM APP"** project (`lgveqfnpkxvzbnnwuled`) but are **legacy / read-only** — a database trigger blocks all writes with `LEGACY TABLE: ...`. Do not point new code at the PM APP copy. If you see stale data, you are likely querying the wrong project.
>
> AI assistant memory is split: the PM APP `ai_memories` table owns text, lifecycle, ownership, project scope, and visibility, while searchable vectors live in the AI Database `document_chunks` table with `source_type='ai_memory'`. PM APP `ai_memories.embedding` remains intentionally empty/blocked after the OOM fix. Runtime memory search hydrates matched chunk IDs back through active, unexpired, owner/team-visible `ai_memories` rows. Semantic recall uses a default 183-day lookback and ranks freshness first, then selected-project fit, global-project usefulness, semantic similarity, and importance; the injected memory debugger metadata records ranking score and reason per selected memory.
>
> **Partial HNSW indexes (added 2026-05-15):** the `search_document_chunks` RPC has its statement_timeout bumped to 60s and `ivfflat.probes` raised to 24. Partial HNSW indexes exist for `meeting_*`, `email`, `onedrive_document`, and `teams_*` source types. Without these the CEO Daily Brief vector search times out.

### Primary Table: `document_chunks` (in AI Database project)

| Property | Value |
|----------|-------|
| Project | `fqcvmfqldlewvbsuxdvz` ("AI Database") |
| Embedding model | `text-embedding-3-large` |
| Dimensions | `halfvec(3072)` |
| Row count | ~109K (May 2026) |
| Index | pgvector cosine similarity — IVFFlat (general) + partial HNSW (per source_type) |
| Content types | Meeting transcripts, emails, Teams messages, OneDrive docs, company documents |

### Retrieval Telemetry Table: `document_chunk_retrieval_telemetry` (in AI Database project)

`document_chunk_retrieval_telemetry` stores daily recall buckets keyed by chunk, date, and retrieval mode. This is intentionally normalized instead of updating `document_chunks` counters directly, so high-frequency retrieval telemetry does not create write contention on vector rows or pressure the PM APP database. The aggregate view `document_chunk_retrieval_stats` feeds recall count and last-recalled-at diagnostics into hybrid ranking.

### Search RPCs

| RPC | Usage |
|-----|-------|
| `search_document_chunks` | Primary semantic search over all content in `document_chunks`. Accepts `query_embedding` (halfvec 3072), optional source/project filters, `match_count`, and `match_threshold`. Defaults to vector-only ranking. Optional `ranking_mode='hybrid'` plus `query_text` returns vector/text/recall/recency/hybrid score components; optional `telemetry_enabled=true` writes RAG-owned daily recall buckets and fails the RPC if telemetry cannot be written. |
| `search_document_chunks_by_category` | Filtered variant — same as above with mandatory category. |
| `search_all_knowledge` | Searches structured intelligence tables: decisions, risks, opportunities, ai_insights. |
| `search_knowledge_base` | Searches `company_knowledge` table only. |

### Contextual Retrieval Pilot (added 2026-05-17)

`document_chunks` now carries two additional columns for the Anthropic Contextual Retrieval technique:

| Column | Purpose |
|--------|---------|
| `contextual_prefix` | LLM-generated context sentence prepended to each chunk before embedding to reduce ambiguity |
| `is_contextualized` | bool flag — `true` once the chunk has been through the context enrichment step |

**Backfill:** `POST /admin/documents/contextual-backfill` triggers the enrichment pipeline. Batch size capped at 128 per run (raised from earlier default). Template-only fast path skips LLM for simple short chunks.

**RPC impact:** The `search_document_chunks` RPC returns higher-quality results for ambiguous queries (e.g. "project budget" now returns the right project, not a random one) because the context prefix removes chunk-level ambiguity.

### Legacy `documents` table — DROPPED 2026-05-18

The pre-Pipeline-B `public.documents` table (PM APP) was dropped along with its
dependent objects: `documents_access_audit`, `documents_ordered_view`, the
`chunks` and `private.document_processing_queue` FK tables, and 6 RPCs
(`match_documents` ×2, `match_documents_full`, `match_documents_enhanced`,
`match_recent_documents`, `search_by_category`, `search_by_participants`).
`project_health_dashboard` was recreated WITHOUT the dependency. Code consumers
moved to `document_metadata` (raw metadata, PM APP) and `document_chunks` (RAG
vectors, AI Database via `_rag_read_client.rpc('search_document_chunks', ...)`).
Migration: `supabase/migrations/20260518120000_drop_legacy_documents_table.sql`.

### Secondary Embedding Table

`conversation_memories.embedding` uses `vector(1536)` with `text-embedding-3-small`. This is the legacy short-term memory table — do not change its dimensions without a matching pgvector index migration. The `EMBEDDING` constants in `tool-utils.ts` are the source of truth.

### Embedding Config (tool-utils.ts)

```ts
EMBEDDING.LARGE = { model: "text-embedding-3-large", dimensions: 3072 }  // document_chunks, document_metadata, knowledge tables
EMBEDDING.SMALL = { model: "text-embedding-3-small", dimensions: 1536 }  // conversation_memories (legacy)
```

Always use `generateEmbedding(openai, input, EMBEDDING.LARGE)` for new tools querying `document_chunks`. AI assistant long-term memory vectors should be written to AI Database `document_chunks` with `source_type='ai_memory'`; do not revive PM APP `ai_memories.embedding` writes.

---

## 7. Providers

### OpenAI Client (`ai_transport.py`)

All backend LLM and embedding calls that use the shared transport call `get_openai_client()` from `backend/src/services/ai_transport.py`. This returns an OpenAI-compatible client routed by provider configuration:

```
AI_GATEWAY_REQUIRED=true + AI_GATEWAY_API_KEY → Vercel AI Gateway
AI_GATEWAY_API_KEY only → Vercel AI Gateway by default
AI_PROVIDER_PATH=openai + OPENAI_API_KEY → direct api.openai.com fallback
```

`AI_GATEWAY_REQUIRED=true` is the production safety rail: it overrides a stale `AI_PROVIDER_PATH=openai` value so ingestion, vectorization, source extraction, project-intelligence synthesis, and backend specialist agents do not silently fall back to direct OpenAI billing. `/health` exposes the active provider path plus gateway/openai readiness, and `npm run rag:verify:render-ai` fails if the Render backend does not report `ai_gateway_configured=true`.

For frontend/Next.js AI SDK calls, `providers.ts` still handles `getLanguageModel(modelId)`. Model IDs must include the provider prefix: `openai/gpt-5.4`.

### Model Registry

| Model | ID | Used For |
|-------|----|----------|
| GPT-5.4 | `openai/gpt-5.4` | Default Strategist model |
| GPT-5.5 | `openai/gpt-5.5` | Newest general model (user-selectable) |
| GPT-5.4 Mini | `openai/gpt-5.4-mini` | CFO sub-agent, faster lightweight responses |
| GPT-4.1 | `openai/gpt-4.1` | Chat route fallback / synthesis retry |
| GPT-4.1 Nano | `openai/gpt-4.1-nano` | Title generation, artifact generation |

User-selectable models are defined in `assistant-models.ts`. The agent registry in `orchestrator.ts` sets per-agent model IDs.

### Embeddings

Backend embeddings use `get_openai_client()` directly. Call `generateEmbedding()` from `tool-utils.ts` in frontend tool code — never the raw OpenAI SDK directly.

---

## 8. Agent Architecture

### How It Works

Every user message enters the chat route, which runs the Strategist agent. The Strategist has two paths:

1. **Direct tool use**: For non-financial questions, the Strategist calls project/operational tools directly and responds.
2. **Sub-agent delegation**: For financial questions (detected by keyword matching in `orchestrator.ts`), the Strategist calls `consultCFO`, which spawns a CFO `ToolLoopAgent` with its own system prompt and financial tools, then returns the CFO's analysis. For Microsoft operator work, the Strategist calls `consultMicrosoftExecutiveAssistant`, which posts to the Render backend specialist instead of directly owning Outlook/Teams/calendar workflows.

### Currently Live Agents

| Agent | Status | System Prompt | Model | Trigger |
|-------|--------|---------------|-------|---------|
| Strategist | Live (orchestrator) | `agents/strategist.ts` | `openai/gpt-5.4` (user-selectable) | All messages |
| CFO | Live (`consultCFO` tool) | `agents/cfo.ts` | `openai/gpt-5.4-mini` | Financial keywords |
| Microsoft Executive Assistant | Live backend specialist (`consultMicrosoftExecutiveAssistant`) | `backend/src/services/agents/microsoft_executive_assistant/agent.py` + packaged Microsoft skills when present | `openai:gpt-5.5` via `MODEL_BRANDON_EMAIL` | Outlook inbox triage, email drafts/replies, Teams escalation, calendar review, Microsoft files |

### Designed but Not Wired

COO, CHRO, CRO, VP BD — prompts exist in `frontend/src/lib/ai/agents/`. To activate one:
1. Add its config to `agentRegistry` in `orchestrator.ts`
2. Add a `consultXxx` tool in `createStrategistTools`
3. Add the agent name to `AGENT_NAMES` in `agents/types.ts`
4. Update the Strategist prompt routing rules

### Persona and Memory

System prompt assembly order (highest to lowest priority):

```
soul.ts content
+ identity.ts content
+ USER CONTEXT block (per-user profile from user_profiles table, if set)
+ REMEMBERED CONTEXT (conversation_memories, top-k by relevance + recent N)
+ Operational instructions (strategist.ts or agent-specific prompt)
+ RETRIEVED PROJECT DATA (from tool calls during the conversation)
+ USER MESSAGE
```

The persona (`soul.ts`, `identity.ts`) never changes per user. The memory layer (`conversation_memories`) personalizes delivery without changing voice.

Post-response, `conversation-memory.ts` runs a fact extraction job (async) to distill durable facts from the conversation into `conversation_memories`.

---

## 9. Ingestion Pipeline

### Document Flow

```
Source
  ├── Fireflies.ai transcript → Fireflies sync (backend cron)
  ├── Manual upload (PDF/DOCX/TXT) → /api/documents/upload (frontend API)
  ├── Local folder → scripts/ingestion/ingest_local_documents.py
  └── Estimating folder preset → npm run rag:ingest:estimating
      (defaults to docs/archive/2026-06-22-docs-migration/PRPs/estimates; override with RAG_ESTIMATING_SOURCE_DIR)

→ document_metadata row created/updated
→ DB trigger enqueues fireflies_ingestion_jobs row
→ POST /api/pipeline/process (backend FastAPI)
→ pipeline/orchestrator.py routes by document type:
    Meeting → parser.py (Stage 1A)
    PDF/DOCX/TXT/MD → document_parser.py (Stage 1B)
    CSV/XLSX → financial_parser.py (Stage 1C)
→ embedder.py (Stage 2): chunk (3000 char, 500 overlap) + embed → document_chunks
→ extractor.py (Stage 3): upsert tasks; promote decisions/risks/opportunities → insight_cards (candidate → promote)
→ digest.py (Stage 4, non-blocking)
```

Embedding exclusion rule: any source row with `Interview` in the title is an
intentional non-RAG source. Fireflies backlog replay, the Fireflies sync path,
the full pipeline embedder, Microsoft Graph embedding, and manual meeting
backfill scripts must skip provider calls for those rows. The app catalog row is
marked `status='intentionally_excluded'`, and the AI Database
`rag_document_metadata.embedding_status` is marked `intentionally_excluded` with
`processing_metadata.embedding_exclusion.code='interview_title_excluded'`. These
rows are not vectorization failures and health checks must not count them as
unembedded backlog.

The estimating preset stamps files as `category=financial_document` and
`workflow_target=estimating`, stores raw files under `local/estimating`, and uses
stable source IDs derived from source label + source directory + relative path.
Exact duplicate content still skips through `document_metadata.content_hash`;
changed files at the same path update and re-queue the same `document_metadata`
row. The live estimating command intentionally uses `--reindex-all` so the local
manifest cannot hide rows that are unchanged on disk but still not
`embedded`/`complete` in the database.

Stage 1B must tolerate first-time uploads that do not yet have a `rag_document_metadata`
row. The parser reads optional RAG metadata when present, otherwise downloads the
stored source file from Supabase Storage and writes extracted text into
`rag_document_metadata`. For table-heavy PDFs, extract to structured Markdown first
with `scripts/ingestion/prepare_pdf_for_rag.py` and run ingestion with
`DOC_SEGMENT_USE_LLM=false`; this produces deterministic line-window segments and
prevents invalid LLM JSON from collapsing a long technical document into one
summary-only segment. The prep script can also render figure-heavy pages and create
a separate vision-caption Markdown file for diagram-aware retrieval. The embedder
must then chunk generic document lines directly and store those chunks with
`source_type='document'`. Re-indexed generic documents reset prior
`meeting_segments`, and Stage 2 resets prior `document_chunks` for the document
before writing the regenerated chunk set so stale chunks cannot remain searchable
after a source file changes.

### Drawing Upload Pipeline — WHERE TEXT LIVES AT EACH STAGE

**Read this before writing any code that reads drawing content.**

```
Drawing PDF uploaded via app UI
  └── POST /api/projects/[projectId]/drawings (or /revisions)
        ├── PDF stored at Supabase Storage (project-files bucket)
        ├── drawing_revisions row created (PM APP)
        ├── document_metadata row inserted (PM APP):
        │     status='no_text', source_system='drawing_upload',
        │     document_type='drawing', source_web_url=<storage URL>
        └── drawings.document_metadata_id + drawing_revisions.document_metadata_id set

→ OCR Worker (ocr_worker.py, runs in alleato-graph-sync cron every 30 min):
      Picks up document_metadata rows WHERE status='no_text'
      Downloads PDF from Supabase Storage URL (direct HTTP, not Graph)
      Azure Document Intelligence extracts text
      Updates document_metadata: status='raw_ingested' (or 'ocr_partial'), content=<text>

→ Embed pass (embed.py, runs immediately after OCR in same cron + again next cycle):
      Picks up document_metadata rows WHERE status IN ('raw_ingested', 'ocr_partial')
      Chunks + embeds → document_chunks in AI Database (fqcvmfqldlewvbsuxdvz)
      document_chunks.document_id = document_metadata.id (PM APP UUID)
```

**Reading drawing text — which source to use:**

| State | Where text lives | How to read |
|-------|-----------------|-------------|
| Just uploaded | nowhere | show "processing" |
| After OCR (≤30 min) | PM APP `document_metadata.content` WHERE `status IN ('raw_ingested','ocr_partial')` | `supabase.from('document_metadata').select('content').eq('id', doc_metadata_id)` |
| After embed cron (≤60 min) | RAG DB `document_chunks` | `ragSupabase.from('document_chunks').select('text').eq('document_id', doc_metadata_id)` |

**Always check PM APP `document_metadata.content` first as the fallback.** The embed cron runs every 30 min; `document_metadata.content` is available immediately after OCR. Any feature that reads drawing text must use both sources (RAG chunks if available, `document_metadata.content` as fallback) — see `reviewSubmittalAgainstDrawings` in `document-intelligence.ts` for the canonical implementation.

**Key IDs:**
- `drawings.document_metadata_id` → PM APP `document_metadata.id`  
- `drawing_revisions.document_metadata_id` → same, per-revision
- These IDs are also `document_chunks.document_id` in the RAG DB

### App DB Pressure Guard for Background RAG and Sync Jobs

The AI/RAG database owns heavy document bodies, chunks, embeddings, and high-churn
pipeline state, but several background jobs still need small app-DB reads/writes
for catalog rows, source sync health, project attribution, alerts, and operator
outputs. Those jobs must call `enforce_app_db_pressure_guard()` before creating
Supabase clients or starting app-DB work. In production Render crons, the guard is
required by env (`APP_DB_PRESSURE_GUARD_REQUIRED=true`) and uses `DATABASE_URL` to
query `pg_stat_activity`; missing credentials or failed guard queries block the
job instead of running blind.

The guard is wired through the scheduler wrappers and direct cron scripts for
Fireflies, Microsoft Graph, Teams channel/DM sync, source/RAG health checks,
packet compilation, daily recap, Outlook attachment promotion, executive-assistant
checks, task extraction, and Acumatica financial sync. Root `render.yaml` (single canonical file — `backend/render.yaml` removed 2026-06-23)
and `scripts/verify/verify-render-web-scheduler-disabled.mjs`
are the enforcement surface: every Alleato Render cron must keep the guard envs,
and live safe-restart checks must validate those envs before any suspended cron is
resumed.

Important distinction after the 2026-06-16 Supabase health incident:
`enforce_app_db_pressure_guard()` only checks whether the PM DB is currently
under pressure. It is not permission for high-churn AI writers to use the PM app
database. Background intelligence writers that create/update cards, packets,
signal candidates, evidence rows, or task projections must call
`enforce_no_pm_app_high_churn_writes()` and fail closed by default. The only
allowed bypass is the explicit operator override `ALLOW_PM_APP_HIGH_CHURN_WRITES=true`
for a bounded one-off run while those writes are being moved to the AI database
or replaced with a controlled final-projection path. Current guarded entrypoints
include the domain compiler service, its cron entrypoint, and the project
synthesizer service (including the graph-sync inline synthesis call).

The controlled final-projection path is `enforce_pm_app_final_projection_guard()`.
It is intentionally a separate switch: `ALLOW_PM_APP_FINAL_PROJECTIONS=true`
allows only bounded card/packet projection writes, not high-churn staging. The
guard enforces `PM_APP_PROJECTION_MAX_TOTAL_ROWS` (default 200) and optional
per-table limits named `PM_APP_PROJECTION_MAX_<TABLE>_ROWS`. It is wired around
candidate promotion, current-packet compilation, operating-summary packet/card
projection, L2 project packet writes, and domain packet projection. Resume plans
must set projection budgets before enabling any compiler path that writes final
PM APP rows.

### Embedding in the Pipeline

The backend pipeline (`embedder.py` and Graph embedding helpers) uses `text-embedding-3-large` at 3072 dimensions via `pipeline/config.py`. Frontend tools that query `document_chunks` must also embed queries with the large 3072-dimensional model. Do not switch backend pipeline embeddings to `text-embedding-3-small` without a matching `document_chunks` vector-dimension migration and RPC/index rebuild.

### Fireflies Sync

Runs automatically every 30 minutes via the `alleato-graph-sync` Render cron. The Fireflies pipeline (`fireflies_pipeline.py`) fetches transcripts, normalizes to markdown, uploads to Supabase Storage (`meetings` bucket), upserts `document_metadata`, and enqueues the ingestion job. Interview-title transcripts are marked `intentionally_excluded` before chunk or summary embeddings are requested.

### Graph Embed Candidate Query — post-RAG-split rule

`embed_pending_graph_documents` in `backend/src/services/integrations/microsoft_graph/embed.py` finds `document_metadata` rows that need embedding by filtering on `status IN ('raw_ingested', 'segmented', 'compiled', 'error')` **only**. It must NOT filter by `length(content) > 0` because `SupabaseRagStore.upsert_document_metadata` (in `supabase_helpers.py`) strips `content`/`raw_text` from the app-DB write — full content lives in `rag_document_metadata` in the RAG project. The embed step hydrates content from the RAG DB and marks empty docs as `embedded` so they aren't retried.

Guardrail: when the candidate fetch returns zero docs, `_count_pending_status_rows` re-counts rows still matching the status filter **within the same 365-day date window** as the candidate query. If that count is > 0, the run is logged as `warning` with `unfetchable_pending` in the metadata. The date scoping matters — without it, very old `error`-status rows (pre-existing tech debt that the embed pipeline intentionally skips by date) would generate false alarms on every run. This guardrail catches the failure mode where a column filter goes stale after a schema change (the 2026-05-14 incident where 220 emails sat unembedded for five days because the candidate query still filtered `document_metadata.content`).

### Fireflies Meeting Embed Gap (fixed 2026-06-09)

Fireflies meetings (`source='fireflies'`, `status='processed'`) were never picked up by `embed_pending_graph_documents` because that function filters on `source='microsoft_graph'` only. They also have no `meeting_segments` rows so the segment-based `run_embedder` would raise `ValueError`. Content exists in `rag_document_metadata` but `embedding_status` stays `null` indefinitely.

**Fix:** `embed_pending_fireflies_meetings()` in `embed.py` — queries `rag_document_metadata` directly for `type='meeting'` and `embedding_status=null`, chunks content via `_split_text`, embeds via OpenAI, writes chunks to `document_chunks` with `source_type='meeting_transcript'`, and marks `embedding_status='embedded'` in both DBs. Capped at 25 per sync run. Called from `run_graph_sync()` after the attachment embed step.

Backfill script: `backend/src/scripts/backfill_fireflies_meeting_embeddings.py`

### Manual Commands

```bash
# Ingest a local folder
python3 scripts/ingestion/ingest_local_documents.py --source-dir "/absolute/path" --process-now

# Dry-run scan
python3 scripts/ingestion/ingest_local_documents.py --source-dir "/absolute/path" --dry-run

# Manually trigger pipeline for one document
curl -X POST "$BACKEND_URL/api/pipeline/process" \
  -H "Content-Type: application/json" \
  -d '{"metadataId":"<uuid>"}'
```

---

## 10. Adding a New RAG Tool

1. Decide which tool file it belongs in (`financial.ts`, `operational.ts`, `project-tools.ts`, or a new file).
2. Read an existing tool in that file to understand the pattern: `tool({ description, parameters: z.object({...}), execute: async (...) => {...} })`.
3. All tools receive `userId` (for RLS) and `options` from the factory function.
4. Use `createServiceClient()` for database access (server-side only).
5. For vector search: use `generateEmbedding(openai, query, EMBEDDING.LARGE)` then call `supabase.rpc("search_document_chunks", {...})`.
6. Add the tool to the factory function's return object (`createFinancialTools`, `createOperationalTools`, etc.).
7. If the tool should be available to a specific agent only: add it only to that agent's `createTools` factory in `orchestrator.ts`. If all agents should have it: add it to `createProjectTools`.
8. Update the Strategist or agent system prompt to describe when to call the new tool.
9. If a new specialist agent needs to call it: add the tool to that agent's tool factory in the registry.

---

## 11. Debugging Bad Answers

The chat route is the only production path. Do not debug `rag-chat/route.ts` or backend FastAPI chat endpoints — those are legacy.

1. Find the session in `chat_history`. Check `metadata.tool_trace` for which tools were called.
2. If the wrong tool was called → fix the Strategist prompt routing instructions first, not the SQL.
3. If the right tool was called but returned thin results → check table freshness: `risks`, `ai_insights`, `document_metadata`, `project_health_dashboard`.
4. If data is stale → re-run ingestion for the affected document metadata IDs.
5. Risk portfolio queries must call `getProjectsWithRisks`, not `getPortfolioOverview`. If that routing is wrong, fix `agents/strategist.ts`.

---

## 12. Current Gaps

These are not hypothetical — they are confirmed missing based on Phase 1 completion status.

| Gap | Impact | Phase |
|-----|--------|-------|
| COO, CHRO, CRO, VP BD agents not wired | Operational, people, risk, and business development questions fall through to Strategist with general-purpose tools | 2+ |
| No proactive insight generation | AI only answers questions; no automated budget/schedule/cash flow alerts | 2A |
| No notification system | Insights are stored in `ai_insights` but not routed to users | 2B |
| No AI briefing card on dashboard | Users must open chat to see AI analysis | 2C |
| Document auto-classification | Uploaded docs are ingested but not auto-classified by type | 3A |
| Report generation | No "Generate Status Report" action | 3C |
| Smart template pre-filling | RFI and change order forms have no AI pre-fill | 3D |
| Predictive analytics | No project completion probability or budget overrun prediction models | 4B |
| `conversation_memory` admin UI | `/admin/users/[id]` profile editor designed but not confirmed built | — |
| Low-confidence email attribution UI | Now surfaced in the **Assignment Inbox** (`/assignment-inbox`) — unified worklist of unassigned meetings, emails, Teams messages, and documents with AI suggestions from `document_attribution_candidates`. | Done |

The `ai_insights` table schema exists and is ready for Phase 2 insert operations. The `project_health_dashboard` and `project_issue_summary` views exist and are queried by risk tools.

---

## 13. AI File Map

Exhaustive inventory of every file that meaningfully touches AI assistant logic — chat routing, orchestration, agents, tools, retrieval, RAG, evals, UI, and background services. Paths are relative to the repo root.

### Core Orchestration

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/orchestrator.ts` | Registers agent registry, constructs Strategist tool set, executes sub-agent calls via `ToolLoopAgent`. Defines `STRATEGIST_MODEL`, `createStrategistTools`, `getStrategistSystemPrompt`, council-mode injection. Adding a new agent starts here. | strategist.ts, cfo.ts, bot-core.ts, types.ts |
| `frontend/src/lib/ai/chat-handler.ts` | Legacy chat handler extracted from route.ts. Holds special-case agent dispatch branches (executive brief metadata, personal task register, Brandon daily widget, source-specific RAG, source-lookup synthesis, RFI preview, packet-first intent) plus the `streamText` fallback chain. | route.ts, fallback-chain.ts, preflights.ts |
| `frontend/src/lib/ai/bot-core.ts` | Shared bot core used by web chat route and external channel adapters (Slack, Teams, Telegram). Extracts the common orchestrator setup: system prompt assembly, tool creation, memory injection. | orchestrator.ts, system-prompt.ts, conversation-memory.ts |
| `frontend/src/lib/ai/system-prompt.ts` | Single source of truth for system-prompt assembly. Wraps `assembleSystemPrompt` with dev-only token-count logging for context bloat detection. | bot-core.ts, soul.ts, identity.ts, persona-and-memory.ts |
| `frontend/src/lib/ai/providers.ts` | AI Gateway provider setup. `getLanguageModel(modelId)` is the single entry point for all LLM calls. Adds `openai/` provider prefix automatically. | provider-config.ts, models.ts |
| `frontend/src/lib/ai/provider-config.ts` | OpenAI-compatible client config (gateway base URL vs direct OpenAI), provider-failure formatting helpers. | providers.ts |
| `frontend/src/lib/ai/fallback-chain.ts` | `generateRecoveryResponse` — hard fallback when the Strategist returns empty/garbled text. Always uses `openai/gpt-4.1` because the active model just failed. | strategist-failure-response.ts, score-response-quality.ts |
| `frontend/src/lib/ai/strategist-failure-response.ts` | Builds the user-facing failure message with cause, project hint, and tool trace summary. Regression-guarded against bare generic strings. | fallback-chain.ts |
| `frontend/src/lib/ai/score-response-quality.ts` | Detects meta-commentary stalling phrases ("let me search for…") and scores response confidence/source quality. Triggers fallback on low scores. | chat-handler.ts |
| `frontend/src/lib/ai/preflights.ts` | Pre-retrieval source-specific RAG executor. Loads documents from `document_metadata` filtered by source/date/category, returns rows + trace for tool-disabled gateway path. | detect-rag-request.ts, source-health.ts, guardrails.ts |
| `frontend/src/lib/ai/models.ts` | Model registry — full list of selectable models with metadata. | assistant-models.ts, model-pricing.ts |
| `frontend/src/lib/ai/assistant-models.ts` | User-selectable model list and `DEFAULT_AI_ASSISTANT_MODEL`. | models.ts |
| `frontend/src/lib/ai/model-pricing.ts` | Per-model input/output token pricing for cost telemetry. | langfuse-trace.ts |
| `frontend/src/lib/ai/langfuse-trace.ts` | Langfuse observability wrappers. **As of 2026-06-10 the main streamText chat path is fully OTel-native:** `handler-v2.ts` wraps synthesis in `propagateAttributes` (sets trace `userId`/`sessionId`/`tags`/name) + `startActiveObservation` (root span, `endOnExit:false`), and the `@langfuse/otel` processor auto-captures the generation, tool spans, model, and token usage from `experimental_telemetry`. `scoreChatTrace({traceId, output, toolCallNames, toolTrace})` then attaches `response_quality`/`answered`/`tool_failure` scores to that SAME trace id via `lf.score()` — no v3 trace or generation is created on this path, so there is exactly one trace per chat (verified: `lf.score()` attaches to an OTel-owned trace, but `lf.trace({id})` does NOT override its tags/metadata, so trace-level attributes come only from the OTel path). `traceChatCompletion` is RETAINED for the **direct Render Deep Agents return path** (`persistDirectDeepAgentResponse`), which bypasses `streamText` and thus has no OTel span — there it still records a full v3 trace + `directDeepAgent:*` generation + scores, with no duplication risk. Streamed AI SDK synthesis uses the default `streamText` generation; direct Render Deep Agents returns pass explicit `directDeepAgent:*` generation names so bypass paths remain traceable. As of 2026-06-10 it also attaches **online trace scores** from `computeTraceScores()` (in `score-response-quality.ts`) with no extra LLM calls: `response_quality` (NUMERIC 0–1), `answered` (BOOLEAN — false on empty/meta-commentary deflection), and `tool_failure` (BOOLEAN, only when a rich `toolTrace` is passed). A `deflected` tag is added when `answered` is false. The deep-agent direct-return path passes the full `toolTrace` for the rich score; the streamText path uses the lightweight output+tool-name fallback. Turns production traffic from observed-only into continuously scored (Langfuse project `alleato-ai`, us.cloud). `scoreUserFeedback()` mirrors chat thumbs-up/down onto the originating trace as a `user_feedback` BOOLEAN score — the handler now persists `langfuse_trace_id` into the assistant message's `chat_history` metadata, and `/api/ai-assistant/feedback` looks it up to attach the score (highest-trust eval signal, unified with the automated scores). `maybeJudgeAndScore()` additionally runs a sampled, code-owned LLM judge (`llm-judge.ts`) and attaches `llm_relevance`/`llm_specificity`/`llm_completeness` (NUMERIC 0–1) — the semantic counterpart to the heuristic `answered`, catching deflection/off-topic answers. OFF by default: `LANGFUSE_LLM_JUDGE_ENABLED=true` + `LANGFUSE_LLM_JUDGE_SAMPLE_RATE` (0–1) + optional `LANGFUSE_LLM_JUDGE_MODEL` (default gpt-4.1-mini). | chat-handler.ts, score-response-quality.ts, llm-judge.ts |
| `frontend/src/lib/ai/langfuse-mask.ts` | PII redaction before egress to Langfuse (us.cloud). `maskLangfuse({data})` redacts emails/SSN/card/phone in strings; deliberately does NOT mask dollar amounts/financials (business data, not PII — masking it would gut observability). Wired into both egress paths: `LangfuseSpanProcessor({mask})` in `instrumentation.ts` (OTel main path) and `new Langfuse({mask})` in `langfuse-trace.ts` (v3 deep-agent path). | instrumentation.ts, langfuse-trace.ts |
| `frontend/src/lib/ai/llm-judge.ts` | Code-owned LLM-as-a-judge. `judgeChatResponse({question, answer})` scores relevance/specificity/completeness (0–1) via `generateObject` on a cheap model; `shouldRunJudge()` is the env-gated, sampled safety gate (OFF by default). Chosen over Langfuse's UI-centric/unstable online-eval feature for full control of model, sampling, and cost. Provider import is lazy so the off path stays light. | langfuse-trace.ts, providers.ts |
| `frontend/src/instrumentation.ts` | Next.js server-startup hook. As of 2026-06-10 registers the **Langfuse OTel span processor** (`LangfuseSpanProcessor` from `@langfuse/otel`) on a `NodeTracerProvider` when `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are set, so any AI SDK call with `experimental_telemetry` exports model/tokens/tool-spans/hierarchy automatically. Exports `flushLangfuse()` for route handlers. Langfuse takes precedence over the dev-only Phoenix path (both register a single global tracer provider). **OTel version note:** `@langfuse/otel@5` requires the `0.20x` experimental line (`exporter-trace-otlp-http`, `sdk-node`) paired with stable `sdk-trace-base@2.x`; the old `0.57.x` exporter crashes on export (`instrumentationLibrary` undefined). Pinned via package.json overrides. | ai-telemetry.ts, langfuse-trace.ts |
| `frontend/src/lib/ai/ai-telemetry.ts` | Single source of truth for `experimental_telemetry`. `aiTelemetry({functionId, metadata})` returns the AI SDK telemetry config, enabled when Langfuse is configured (or `PHOENIX_TRACING=true`). Wired into the main chat `streamText` (`ai-assistant-chat-v2`), `intent-classifier.ts` (`intent-planner`), and `fallback-chain.ts` (`recovery-response`). | instrumentation.ts |
| `frontend/src/lib/ai/entitlements.ts` | Feature-flag and tier-gate checks for AI features. | route.ts |
| `frontend/src/lib/ai/session-id.ts` | Session ID UUID coercion helper used by memory/learning services. | conversation-memory.ts, ai-memory-service.ts |

### Intent Routing & Retrieval Planning

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/intent-router.ts` | `AssistantIntent` union and regex-based intent classification. Defines task-write patterns that must beat task-followup routing and external-research patterns for public web/current market/trend prompts that must route to the Render Deep Agents research endpoint instead of internal executive briefing. As of 2026-06-09 the external-research patterns also match market/industry/economy conditions and material-price questions phrased without an explicit "web"/"research" verb (e.g. "what's happening in the construction market?", "outlook for lumber prices nationally") so they reach live web search instead of being answered from internal RAG; the patterns stay anchored on market/industry/economy/commodity/named-material terms so internal project questions ("cost trends on Westfield", "budget forecast") are not sent to the web (regression coverage in `__tests__/intent-router.test.ts`). | intent-classifier.ts, planner.ts |
| `frontend/src/lib/ai/intent-classifier.ts` | LLM-based intent classifier using `generateObject`. Wraps with `withTimeout`. Falls back to regex router on timeout. | intent-router.ts, planner.ts |
| `frontend/src/lib/ai/detect-rag-request.ts` | Source-specific RAG request detection (meetings-on-date, recent-emails, recent-teams, recent-onedrive). Workaround module for AI Gateway `finishReason:other` bug when tools are disabled. | preflights.ts, planner.ts |
| `frontend/src/lib/ai/retrieval/planner.ts` | Builds a `RetrievalPlan` from message + selected project: classifies intent, detects source-specific RAG, picks sub-agent, decides external sources. When `selectedProjectId` is present, source lookup and source-specific RAG plans preload the project operating packet and structured project snapshot before semantic/document drilldown. Selected-project source-health wording routes to packet/snapshot checks instead of a cold conversational path, but exact document/spec lookup keeps semantic drilldown so source proof is still available. As of 2026-06-10, two checks sit just above the packet-first briefing so they intercept the status-dump default: (1) `hasAttachments` (the handler detects file parts / inlined-readable markers) routes to a conversational answer that works WITH the files; (2) `isTransactionalCreateRequest` (create/open a commitment/change-order/RFI/etc., or migrate/import/cross-over data) routes to conversational so the model reaches its create-* tools. Both fixed the Goodwill Noblesville session where "create the commitment" and "I attached exports, help me migrate" got a generic project-health dump instead of action. The handler also injects an `## Attached files` system note for unreadable formats (xlsx/pdf) telling the model to ask for a CSV/TXT/JSON export rather than fabricate or status-dump. Regression cases in `retrieval/__tests__/planner.test.ts`. | intent-router.ts, detect-rag-request.ts, types.ts |
| `frontend/src/lib/ai/retrieval/executor.ts` | Executes a `RetrievalPlan` via the `ExecutorDeps` interface (packet, snapshot, semantic, source-specific, Brandon daily, reusable briefing). Pure of route dependencies. Requested project operating context fails loudly through retrieval warnings when the packet or structured snapshot is unavailable, so assistant answers can disclose missing/thin context instead of silently falling back to cold RAG. | planner.ts, deps.ts |
| `frontend/src/lib/ai/retrieval/deps.ts` | Wires `ExecutorDeps` to real loaders (Supabase + intelligence packet service). Call once per request. | executor.ts, packet-service.ts |
| `frontend/src/lib/ai/retrieval/system-prompt.ts` | Renders the `RetrievalContext` (packet, semantic results, external rows) into the agent system prompt blocks. Operating packets expose the strategic report, category/source-quality coverage, and linked evidence counts first, with card snippets as fallback detail. | executor.ts, types.ts |
| `frontend/src/lib/ai/retrieval/source-specific-rag.ts` | Source-specific RAG retrieval extracted from chat route. Loads rows from `document_metadata` for meetings/emails/teams/onedrive. | preflights.ts, detect-rag-request.ts |
| `frontend/src/lib/ai/retrieval/reusable-briefing.ts` | Loads cached reusable briefing context for a session so multi-turn briefing flows reuse retrieval. | executor.ts |
| `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts` | Re-ranks retrieval results using stored boost/downrank weights per (query_signature, source). Backs admin retrieval feedback. | feedback-event-service.ts |
| `frontend/src/lib/ai/retrieval/types.ts` | `RetrievalPlan`, `RetrievalContext`, `SubAgent`, `ResponseFormat`, `ExternalSource` types — shared by planner/executor. | planner.ts, executor.ts |
| `frontend/src/lib/ai/intelligence/packet-service.ts` | Loads and resolves the project intelligence packet (cards, evidence, confidence, freshness) from `intelligence_packets` and related tables. | deps.ts, types.ts, compiler.py |
| `frontend/src/lib/ai/intelligence/advisor-synthesis.ts` | Synthesizes packet strategic reports into final advisor-style answers per intent, including meeting/source coverage and linked citation counts. Falls back to packet cards only when `packet_json.strategicReport` is absent. | packet-service.ts, types.ts |
| `frontend/src/lib/ai/intelligence/page-state.ts` | Pure page-state guard for project intelligence pages. Separates fatal synthesis/source-quality failures from normal `source_coverage.gaps` evidence limitations so a valid strategic report is not mislabeled as needing resynthesis. | `[projectId]/intelligence/page.tsx`, intelligence-page-state.test.ts |
| `frontend/src/lib/ai/intelligence/types.ts` | `ClientProjectIntelligencePacket`, `InsightCard`, `ResolvedIntelligenceTarget`, freshness/confidence types. | packet-service.ts, advisor-synthesis.ts |

### Agents & Prompts

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/agents/strategist.ts` | Strategist system prompt — routing rules, synthesis instructions, which tool to call for which question. | orchestrator.ts, cfo.ts |
| `frontend/src/lib/ai/agents/cfo.ts` | CFO system prompt — financial expertise, personality, CFO tool usage. Live agent via `consultCFO`. | orchestrator.ts, financial.ts, acumatica.ts |
| `frontend/src/lib/ai/agents/coo.ts` | COO system prompt (designed, not live). Operations focus. | strategist.ts, operational.ts |
| `frontend/src/lib/ai/agents/chro.ts` | CHRO system prompt (designed, not live). People focus. | strategist.ts |
| `frontend/src/lib/ai/agents/cro.ts` | CRO system prompt (designed, not live). Risk focus. | strategist.ts |
| `frontend/src/lib/ai/agents/cmo.ts` | CMO system prompt — marketing intelligence and content advisory. | marketing.ts, marketing-service.ts |
| `frontend/src/lib/ai/agents/vpbd.ts` | VP Business Development system prompt (designed, not live). | strategist.ts |
| `frontend/src/lib/ai/agents/types.ts` | `AgentName` union, `AgentResponse` type, `AGENT_NAMES` array. Update when adding agents. | orchestrator.ts |
| `frontend/src/lib/ai/soul.ts` | Persona foundation — voice, tone, values. Included in every system prompt at top priority. | identity.ts, system-prompt.ts |
| `frontend/src/lib/ai/identity.ts` | Identity layer — who the AI is. Composed with `soul` below it. | soul.ts, system-prompt.ts |
| `frontend/src/lib/ai/persona-and-memory.ts` | `I_DONT_KNOW_REFLEX_PROMPT` and user-profile injection logic into system prompt. | system-prompt.ts |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | Legacy RAG-only system prompt. Preserved for backward compatibility; not used in the C-Suite path. | — |
| `frontend/src/lib/ai/prompts.ts` | Misc prompt building blocks and templates. | prompts/meeting-prep.ts, prompts/progress-report.ts |
| `frontend/src/lib/ai/prompts/meeting-prep.ts` | Meeting-prep generator prompt — extracts attendees, agenda, prior decisions. | progress-report-tools.ts |
| `frontend/src/lib/ai/prompts/progress-report.ts` | Weekly progress report generator prompt. | progress-report-tools.ts |
| `frontend/src/lib/ai/prompt-diagnostics.ts` | Token-counter, prompt-block size profiling, dev-mode warnings for prompt bloat. | system-prompt.ts |
| `frontend/src/lib/ai/action-capabilities.ts` | Static catalog of write-back actions the assistant can perform (create RFIs, submittals, change events, tasks, etc.). Surfaced in onboarding + welcome screen. | welcome-screen.tsx |
| `frontend/src/lib/ai/assistant-widgets.ts` | `AssistantWidgetKind` union and widget field types — generative UI contracts (task summary, project picker, financial pulse, etc.). | assistant-widget-renderer.tsx |

### Tools

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/tool-registry.ts` | Global assistant tool registry, workflow subset projection, runtime `ToolSet` filtering, and policy visibility helpers. Executive Daily Brief and Strategist/specialist assistant factories are migrated; project/source-access policy enforcement remains open under AAI-554. | ai-ops/tool-registry.ts, orchestrator.ts |
| `frontend/src/lib/ai/tools/project-tools.ts` | Core project tools plus SAIS structured tools: portfolio overview, risk analysis, briefing snapshot, financial analysis, budget summary, action items, meetings by date, document search, project details, SOP backlog, finance spend rollup. | orchestrator.ts, financial.ts, sais.ts |
| `frontend/src/lib/ai/tools/sais.ts` | `getSopBacklog`, `getFinanceSpendRollup` — structured accounting/finance leadership tools backed by `sop_backlog`, `acumatica_ap_bills`, and `finance_spend_classification_rules`. | project-tools.ts, rag-assistant-prompt.ts |
| `frontend/src/lib/ai/tools/financial.ts` | 6 financial tools: commitments, change orders, direct costs, budget line items, cost trends, margin analysis. | cfo.ts, acumatica.ts |
| `frontend/src/lib/ai/tools/operational.ts` | 15+ operational tools: people/roles, vendor performance, RFIs, submittals, cross-project, semantic search, recent emails, search emails, search Teams, save insight, write memory, recall conversations. | coo.ts, document-intelligence.ts |
| `frontend/src/lib/ai/tools/acumatica.ts` | 9 Acumatica ERP tools: AP/AR aging, cash position, vendor spend, recent bills/invoices, project budget/list, PO summary. Cookie auth. | financial.ts |
| `frontend/src/lib/ai/tools/schedule-tools.ts` | `getScheduleAnalysis` — task status, critical path, delays, look-aheads. | project-tools.ts |
| `frontend/src/lib/ai/tools/forecast-tools.ts` | `getForecastComparison` — budget vs actual vs forecast across cost codes. | financial.ts |
| `frontend/src/lib/ai/tools/document-intelligence.ts` | `searchSpecs`, `searchOneDriveDocs` — semantic search against `document_chunks` filtered by category. | tool-utils.ts |
| `frontend/src/lib/ai/tools/action-tools.ts` | Write-back actions: createGeneratedTask, send alert, create record. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/workspace-tools.ts` | Workspace artifact CRUD tools (drafts, briefings, owner updates). | workspace-artifact-service.ts |
| `frontend/src/lib/ai/tools/marketing.ts` | Marketing intelligence/content tools used by CMO agent. | cmo.ts, marketing-service.ts |
| `frontend/src/lib/ai/tools/progress-report-tools.ts` | Progress report generation tool. | prompts/progress-report.ts |
| `frontend/src/lib/ai/tools/app-help-tools.ts` | In-app help / how-to tool — answers "how do I…" questions about the Alleato app itself. | help/articles |
| `frontend/src/lib/ai/tools/feature-request-tools.ts` | Captures user feature requests as structured records. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/structured-output.ts` | Generic `generateObject` helpers with Zod schemas for structured tool outputs. | structured-queries.ts |
| `frontend/src/lib/ai/tools/structured-queries.ts` | SQL-style structured queries used as tool primitives. | tool-utils.ts |
| `frontend/src/lib/ai/tools/create-document.ts` | Generative UI tool to create a new document artifact in chat. | update-document.ts, workspace-tools.ts |
| `frontend/src/lib/ai/tools/update-document.ts` | Generative UI tool to update an existing document artifact. | create-document.ts |
| `frontend/src/lib/ai/tools/request-suggestions.ts` | Generative UI tool to request next-step suggestions. | assistant-widgets.ts |
| `frontend/src/lib/ai/tools/web-search.ts` | Web search tool (external knowledge). | mcp-tools.ts |
| `frontend/src/lib/ai/tools/mcp-tools.ts` | MCP (Model Context Protocol) tool adapter. | — |
| `frontend/src/lib/ai/tools/get-weather.ts` | Weather lookup demo tool. | — |
| `frontend/src/lib/ai/tools/guardrails.ts` | Tool-scope guardrails: PII filters, jailbreak detection, RLS-scoped row filters. | guardrails.py |
| `frontend/src/lib/ai/tools/tool-utils.ts` | Shared helpers: `EMBEDDING` config (LARGE 3072 vs SMALL 1536), `generateEmbedding()`. Source of truth for embedding model/dim per table. | providers.ts |

### Services (Memory, Learning, Workspace)

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/bot-core.ts` | Shared prompt assembly for web chat and bot adapters. Loads assistant memories, recent conversation summaries, workspace artifacts, and agent learnings; passes selected project into memory recall; emits `memory_usage` metadata with selected-memory ranking/debug reasons. | ai-memory-service.ts, conversation-memory.ts, memory-extraction.ts |
| `frontend/src/lib/ai/services/conversation-memory.ts` | After each chat response, summarizes the conversation with gpt-4.1-nano, embeds (3072 dims), upserts into `memories` keyed by session. Provides `recallPastConversations`. | memory-extraction.ts, operational.ts |
| `frontend/src/lib/ai/services/ai-memory-service.ts` | Core read/write layer for PM APP `ai_memories` plus AI Database memory chunks. Handles exact-content dedupe, commitment bridge to `ai_insights`, active/expiry hydration filters, owner/team visibility scoping, selected-project recall, default 183-day semantic lookback, freshness-first ranking, and AI Database chunk sync/delete for `source_type='ai_memory'`. | conversation-memory.ts, memory-extraction.ts |
| `frontend/src/lib/ai/services/memory-extraction.ts` | Extracts typed memories (fact, preference, lesson, commitment, context) from the latest 40 chat messages after conversation response persistence via gpt-4.1-nano. Scheduled by `handler-v2.ts` through `runPostResponseTasks()`. | ai-memory-service.ts |
| `frontend/src/lib/ai/services/agent-learning-service.ts` | Records agent-learning events (thumbs_down, admin_feedback, eval_failure) and trains few-shot examples for future routing. | feedback-event-service.ts, task-training-service.ts |
| `frontend/src/lib/ai/services/feedback-event-service.ts` | Records AI feedback events and writes corresponding memories. Single entry point from feedback API route. Brandon email draft feedback stores the active voice profile version and points future agents to the companion operating profile and drafting playbook under `docs/archive/2026-06-22-docs-migration/ai-plan/`. **Project-attribution learning loop:** `recordAttributionAssignmentFeedback` logs every manual Assignment-Inbox assignment (event_family `attribution`); `generateAttributionRulePromotionCandidates` mines those events for recurring sender-domain / sender-email / title-keyword → project patterns and proposes `attribution_rule` promotions; `applyAttributionRulePromotion` branches on `proposed_learning.ruleKind` to upsert generalizable rules into `project_attribution_rules` (the table the backend ProjectAssigner reads at highest priority). | agent-learning-service.ts, ai-memory-service.ts |
| `frontend/src/lib/ai/services/task-training-service.ts` | Task-specific feedback training — categorized reasons (wrong_project, wrong_owner, etc.) for task extraction failures. | task-feedback-types.ts |
| `frontend/src/lib/ai/services/marketing-service.ts` | CRUD for marketing intelligence items, content calendar, content assets. Backs CMO agent and marketing routes. | cmo.ts, marketing.ts |
| `frontend/src/lib/ai/services/project-intelligence-summary.ts` | `summarizeProjectIntelligence` — runs `generateObject` over project sources to produce a cited summary with confidence scores. The prompt now explicitly prioritizes Brandon-specific responsibilities first and pushes immediate-attention/current-focus output toward owner-actionable items instead of generic recap text. | project-operating-summary-sources.ts |
| `frontend/src/lib/ai/services/project-operating-summary-sources.ts` | Loads the source set (meetings, decisions, risks, tasks, emails) feeding the project operating summary. | project-intelligence-summary.ts, operating_summary.py |
| `frontend/src/lib/ai/services/source-sync-summary.ts` | Generates an LLM summary of source sync health for the admin source-sync UI. | source-health.ts |
| `frontend/src/lib/ai/services/workspace-artifact-service.ts` | CRUD + semantic search for `workspace_artifacts`. Embedding failures are non-fatal. | workspace-tools.ts |
| `frontend/src/lib/ai/source-health.ts` | Loads `source_sync_health_snapshots` and `graph_subscriptions` rows, exposes assistant-facing source health context. | source-sync-summary.ts |
| `frontend/src/lib/ai/onboarding-insights.ts` | Returns onboarding insights (currently Tampa default fallback; per-user attendance RAG not yet wired). | — |
| `frontend/src/lib/ai/personal-daily-brief.ts` | Detects daily-brief critique requests ("format the daily brief differently") and routes accordingly. | brandon-daily-update.ts |
| `frontend/src/lib/ai/task-feedback-types.ts` | Typed reason categories/labels for task feedback (used by training service and feedback API). | task-training-service.ts |

### Executive Briefing & Daily Update

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/executive/executive-briefing-workflow.ts` | Top-level workflow that builds an executive briefing: pulls insights, scores by importance, formats bullets, prepares delivery. | executive-brief-bullets.ts, daily-brief.ts |
| `frontend/src/lib/executive/executive-brief-bullets.ts` | Bullet selection and ordering rules — financial first, then schedule, risk, opportunities. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-intelligence-routing.ts` | Routes briefing requests to the right source set (project, portfolio, owner). | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-briefing-teams-delivery.ts` | Sends the briefing to MS Teams via adaptive cards / chat message API. The current card renderer places Brandon's Top Priorities first and requires every surfaced claim to include a supporting source link, using upstream citations when present and Alleato source drilldown links otherwise. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/executive-briefing-email.tsx` | React Email template for the briefing email. | resend |
| `frontend/src/lib/executive/daily-brief.ts` | Daily brief composition entry point used by `/api/executive/daily-brief`. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/brandon-daily-update.ts` | Brandon-specific daily update generator — narrower scope than executive brief, owner-focused. It now suppresses untrusted accounting-aging and money-due callouts from the briefing layer while preserving project-number-aware owner priorities and per-claim source attribution. | brandon-daily-update-widget.ts |
| `frontend/src/lib/executive/brandon-daily-update-widget.ts` | Builds the generative UI widget payload for Brandon's daily update card. | brandon-daily-update-widget-card.tsx |

### API Routes

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/app/api/ai-assistant/chat/route.ts` | Main POST handler. Orchestrates auth, intent classification, packet retrieval, specialist routing, tool execution, streaming, persistence to `chat_history`. All user messages enter here. | chat-handler.ts, handler-v2.ts, orchestrator.ts |
| `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | V2 chat handler — newer retrieval-plan-driven flow (planner → executor → streamText). Coexists with chat-handler.ts during migration. | planner.ts, executor.ts |
| `frontend/src/app/api/ai-assistant/conversations/route.ts` | List and create chat sessions for the current user. | [sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/conversations/[sessionId]/route.ts` | Get/update/delete a single chat session. | messages/[sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts` | Load messages for a session from `chat_history`. | conversations/[sessionId]/route.ts |
| `frontend/src/app/api/ai-assistant/feedback/route.ts` | Records thumbs-up/down + reason on an assistant message. Drives agent learning. | feedback-event-service.ts |
| `frontend/src/app/api/ai-assistant/task-feedback/route.ts` | Categorized feedback on AI-extracted tasks. | task-training-service.ts |
| `frontend/src/app/api/ai-assistant/packet-card-feedback/route.ts` | Feedback on individual intelligence packet cards (useful / not useful / wrong). | packet-service.ts |
| `frontend/src/app/api/ai-assistant/memories/route.ts` | List/create AI memories for the current user. | ai-memory-service.ts |
| `frontend/src/app/api/ai-assistant/memories/[memoryId]/route.ts` | Update/delete a single memory. | ai-memory-service.ts |
| `frontend/src/app/api/ai-assistant/workspace/route.ts` | List/create workspace artifacts. | workspace-artifact-service.ts |
| `frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts` | Get/update/delete a single workspace artifact. | workspace-artifact-service.ts |
| `frontend/src/app/api/ai-assistant/timeline/route.ts` | Cross-source timeline aggregation (meetings, emails, Teams, documents) for the chat UI. | cross-source-timeline.tsx |
| `frontend/src/app/api/ai-assistant/speech/route.ts` | Speech-to-text and text-to-speech endpoints for voice mode. | audio-waveform.tsx |
| `frontend/src/app/api/ai-assistant/avatar/conversation/route.ts` | Tavus avatar conversation session creation. | tavus-avatar-page.tsx |
| `frontend/src/app/api/ai-assistant/usage-stats/route.ts` | Aggregated AI usage stats (tokens, sessions, costs) for the admin panel. | model-pricing.ts |
| `frontend/src/app/api/ai-assistant/marketing/assets/route.ts` | List/create marketing content assets. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/assets/[assetId]/route.ts` | Get/update/delete a marketing asset. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/calendar/route.ts` | List/create marketing calendar items. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/calendar/[calendarItemId]/route.ts` | Update/delete a single marketing calendar item. | marketing-service.ts |
| `frontend/src/app/api/ai-assistant/marketing/_utils.ts` | Shared zod schemas + helpers for marketing endpoints. | marketing-service.ts |
| `frontend/src/app/api/executive/daily-brief/route.ts` | Generate the executive daily brief on demand. | daily-brief.ts, route-helpers.ts |
| `frontend/src/app/api/executive/daily-brief/route-helpers.ts` | Shared helpers (auth, project resolution, recipient list) for the daily-brief routes. | daily-brief.ts |
| `frontend/src/app/api/executive/daily-brief/send-teams/route.ts` | Sends the daily brief to MS Teams. | executive-briefing-teams-delivery.ts |
| `frontend/src/app/api/executive/daily-brief/preview-teams/route.ts` | Renders a preview of the Teams adaptive card payload without sending. | executive-briefing-teams-delivery.ts |
| `frontend/src/app/api/executive/daily-brief/widget/route.ts` | Returns the daily-brief data shape consumed by the dashboard widget. | daily-brief.ts |
| `frontend/src/app/api/executive/brandon-daily-update/route.ts` | Generates Brandon's owner-focused daily update. | brandon-daily-update.ts |
| `frontend/src/app/api/executive/brandon-daily-update/widget/route.ts` | Returns Brandon daily update as a generative UI widget payload. | brandon-daily-update-widget.ts |
| `frontend/src/app/api/executive/intelligence-stats/route.ts` | Aggregated intelligence stats (packets compiled, insights generated, freshness) for admin dashboards. | packet-service.ts |

### UI Components

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/components/ai-assistant/rag-chat-page.tsx` | Full-page RAG chat experience — sidebar + chat area + welcome screen. Top-level chat surface. | chat-area.tsx, conversation-sidebar.tsx |
| `frontend/src/components/ai-assistant/chat-area.tsx` | Message list + composer + streaming renderer. Consumes `useChat` from Vercel AI SDK. | chat-formatting.ts, source-citations.tsx |
| `frontend/src/components/ai-assistant/chat-formatting.ts` | Message formatting helpers: markdown, code blocks, citation tokens. | chat-area.tsx |
| `frontend/src/components/ai-assistant/conversation-sidebar.tsx` | Left-rail session list with rename/delete. | conversation-list-item.tsx |
| `frontend/src/components/ai-assistant/conversation-list-item.tsx` | Single session row in the sidebar. | conversation-sidebar.tsx |
| `frontend/src/components/ai-assistant/welcome-screen.tsx` | Empty-state for new conversations — quick prompts, capabilities, onboarding insights. | action-capabilities.ts, onboarding-insights.ts |
| `frontend/src/components/ai-assistant/compact-ai-chat.tsx` | Compact embedded chat (drawer / floating widget version). | global-ai-widget.tsx |
| `frontend/src/components/ai-assistant/global-ai-widget.tsx` | App-wide floating chat widget mounted in root layout. | compact-ai-chat.tsx |
| `frontend/src/components/ai-assistant/ai-chat-sidebar.tsx` | Right-rail chat sidebar usable from any page. | compact-ai-chat.tsx |
| `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` | Renders generative-UI widgets (task summary, project picker, financial pulse, etc.) from streamed tool output. | assistant-widgets.ts |
| `frontend/src/components/ai-assistant/brandon-daily-update-widget-card.tsx` | Card UI for Brandon's daily update widget. | brandon-daily-update-widget.ts |
| `frontend/src/components/ai-assistant/source-citations.tsx` | Citation chips and source drawer for inline references. | chat-area.tsx |
| `frontend/src/components/ai-assistant/cross-source-timeline.tsx` | Cross-source timeline view (meetings + emails + Teams + docs). | timeline/route.ts |
| `frontend/src/components/ai-assistant/trace-panel.tsx` | Developer trace panel — shows tool calls, latency, model, tokens for the current message. | langfuse-trace.ts |
| `frontend/src/components/ai-assistant/animated-orb.tsx` | Animated orb avatar shown while assistant is thinking/streaming. | tavus-avatar-page.tsx |
| `frontend/src/components/ai-assistant/audio-waveform.tsx` | Voice-mode waveform visualizer. | speech/route.ts |
| `frontend/src/components/ai-assistant/tavus-avatar-page.tsx` | Tavus video avatar embed page. | avatar/conversation/route.ts |
| `frontend/src/components/ai-intelligence/ai-system-health-panel.tsx` | Admin panel: overall AI system health (provider, gateway, embeddings, vector index). | source-sync-health-panel.tsx |
| `frontend/src/components/ai-intelligence/intelligence-compiler-health-panel.tsx` | Admin panel: compiler job queue health (Teams, email, packet refresh). | compiler.py, teams_compiler.py |
| `frontend/src/components/ai-intelligence/source-sync-health-panel.tsx` | Admin panel: per-source sync freshness and errors. | source-health.ts |
| `frontend/src/components/ai-intelligence/operations-readiness-panel.tsx` | Admin readiness check across all AI subsystems. | ai-system-health-panel.tsx |
| `frontend/src/components/ai-intelligence/project-intelligence-cross-reference.tsx` | Cross-references project intelligence packet against raw sources for accuracy review. | packet-service.ts |
| `frontend/src/components/ai-intelligence/insight-card-showcase.tsx` | Visual showcase / storybook of all insight card types. | packet-service.ts |

### Background Services (Backend Python)

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `backend/src/services/intelligence/compiler.py` | Job/staging helpers — durable control plane between RAG sources (`document_metadata`, `document_chunks`) and packet tables. Source jobs still stage/promote signal candidates, but client-project packet refreshes now default to `project-operating-summary-v1` so the current packet contains synthesized operating-report sections instead of raw promoted-source snippets. Inline per-source packet refresh is disabled by default; source imports enqueue packet refresh jobs for scheduled/batched synthesis to avoid one LLM packet compile per imported message. | teams_compiler.py, email_compiler.py, operating_summary.py |
| `backend/src/services/intelligence/teams_compiler.py` | Teams direct-message conversation compiler. Runs at end of every graph sync (batch 25, 170s budget). Writes to `project_insights`, `tasks`, `insights`, `source_signal_candidates`. | compiler.py, prompts.py, client.py |
| `backend/src/services/intelligence/email_compiler.py` | Outlook email thread compiler. Mirrors Teams compiler but operates on threads (grouped by `conversation_id`), anchors artifacts to thread head. | compiler.py, prompts.py |
| `backend/src/services/intelligence/operating_summary.py` | Backend-owned project operating summary packet refresh — production path on Render/FastAPI. Selects up to 96 source capsules with recency and source-priority ordering (project context, then recent meetings, Teams, email, structured controls, documents), scores each source as `clean_source`, `raw_dump`, `metadata_only`, or `stale_or_failed`, asks the model for `whatChanged`, `risks`, `openDecisions`, `moneyImpact`, `promisesMade`, `recommendedActions`, and `evidenceQuality`, and fails if the model returns raw headers/transcript dumps instead of synthesis. The compiler also derives deterministic document intelligence from selected document sources: latest document/revision signals, obligation candidates, conflict indicators, project-impact summaries, and evidence pointers back to source IDs/pages/snippets. Writes `packet_json.strategicReport`, `packet_json.strategicReport.documentIntelligence`, `source_coverage.sourceQualityCounts`, `source_coverage.documentIntelligence`, and a `qualityGate` so dashboards and agents can reject weak packets. It also emits an `operating-document-intelligence` insight card for assistant/page surfaces. Source citations are supplied as aliases and remapped back to canonical source IDs, accepting `S001`, `S01`, and `S1` formats for the same source. Generated cards use section-specific `next_action` values so the page and assistant do not repeat one generic recommendation across every section. **Insight-card writes are deduped per refresh (`_persist_operating_cards`, added 2026-06-09):** because all operating-summary cards for a target share `compiler_version = project-operating-summary-v1`, each card's stable section key is stored as `metadata.normalized_signal_key` and matched on re-run — existing cards are updated in place (preserving `first_seen_at`, replacing evidence/target child rows), and any prior card whose key is absent from the current refresh is marked `current_status = resolved`. This replaced an unconditional `insert` loop that created a fresh full set of `insight_cards` (+ targets + evidence) on every packet refresh, accumulating duplicates indefinitely. | project-operating-summary-sources.ts, compiler.py |
| `backend/src/services/intelligence/client.py` | OpenAI client helpers for project synthesis and source signal extraction. Uses the ai_transport OpenAI client. Defines `COMPILER_MODEL = MODEL_PROJECT_INTELLIGENCE` (`gpt-5.4`) and `COMPILER_MODEL_LIGHT = MODEL_SIGNAL_EXTRACTION` (`gpt-5.4-mini` deployable fallback for the `gpt-5.5-mini` target), plus the JSON retry helper. | project_intelligence.py, project_synthesizer.py, pipeline/llm.py |
| `backend/src/services/intelligence/prompts.py` | Prompt templates and JSON schemas for the Teams/email compilers. | teams_compiler.py, email_compiler.py |
| `backend/src/services/intelligence/__init__.py` | Package init. | — |

### Evals & Testing

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `frontend/src/lib/ai/__tests__/intent-router.test.ts` | Unit tests for intent classification regex patterns and task-write precedence. | intent-router.ts |
| `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts` | Unit tests for packet loading and confidence resolution. | packet-service.ts |
| `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts` | Unit tests for synthesized advisor responses per intent. | advisor-synthesis.ts |
| `frontend/src/lib/ai/__tests__/intelligence-page-state.test.ts` | Regression test for intelligence page state. Ensures passed strategic reports with evidence limitations do not show fatal resynthesis copy. | page-state.ts |
| `frontend/src/lib/ai/__tests__/cmo-orchestrator.test.ts` | Tests CMO agent registry wiring. | cmo.ts, orchestrator.ts |
| `frontend/src/lib/ai/__tests__/strategist-failure-response.test.ts` | Regression guard — failure response must include cause + tool trace. | strategist-failure-response.ts |
| `frontend/src/lib/ai/__tests__/score-response-quality.test.ts` | Meta-commentary phrase detection coverage. | score-response-quality.ts |
| `frontend/src/lib/ai/__tests__/prompt-diagnostics.test.ts` | Prompt token counting + bloat warning thresholds. | prompt-diagnostics.ts |
| `frontend/src/lib/ai/__tests__/provider-config.test.ts` | Gateway vs direct OpenAI client config switching. | provider-config.ts |
| `frontend/src/lib/ai/__tests__/model-pricing.test.ts` | Pricing table sanity checks. | model-pricing.ts |
| `frontend/src/lib/ai/__tests__/rag-meeting-retrieval.test.ts` | Meeting retrieval shape + filter coverage. | operational.ts |
| `frontend/src/lib/ai/__tests__/personal-daily-brief.test.ts` | Daily-brief critique-request detection. | personal-daily-brief.ts |
| `frontend/src/lib/ai/__tests__/task-feedback-types.test.ts` | Task feedback reason categories shape. | task-feedback-types.ts |
| `frontend/src/lib/ai/retrieval/__tests__/planner.test.ts` | Retrieval plan construction per intent. | planner.ts |
| `frontend/src/lib/ai/retrieval/__tests__/executor.test.ts` | Executor delegation to `ExecutorDeps` mock. | executor.ts |
| `frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts` | System prompt rendering from retrieval context. | retrieval/system-prompt.ts |
| `frontend/src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts` | Weight re-ranking math. | retrieval-weight-scoring.ts |
| `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts` | Write-back action tool contracts. | action-tools.ts |
| `frontend/src/lib/ai/tools/__tests__/project-tools-barrel.test.ts` | All project tools are exported and have expected signatures. | project-tools.ts |
| `frontend/src/lib/ai/tools/__tests__/tool-utils.test.ts` | Embedding config + helper coverage. | tool-utils.ts |
| `frontend/src/lib/ai/services/__tests__/feedback-event-service.test.ts` | Feedback event persistence + memory bridge. | feedback-event-service.ts |
| `frontend/src/lib/ai/services/__tests__/attribution-learning.test.ts` | Attribution rule mining from manual assignments + title keyword extraction. | feedback-event-service.ts |
| `frontend/src/lib/ai/services/__tests__/marketing-service.test.ts` | Marketing CRUD service. | marketing-service.ts |
| `frontend/src/lib/ai/services/__tests__/project-intelligence-summary.test.ts` | Summary `generateObject` output shape. | project-intelligence-summary.ts |
| `frontend/src/lib/ai/services/__tests__/source-sync-summary.test.ts` | Source sync summary generation. | source-sync-summary.ts |
| `frontend/src/lib/ai/services/__tests__/task-training-service.test.ts` | Task training feedback. | task-training-service.ts |
| `frontend/src/lib/executive/__tests__/executive-briefing-workflow.test.ts` | Briefing workflow ordering + selection. | executive-briefing-workflow.ts |
| `frontend/src/lib/executive/__tests__/executive-brief-bullets.test.ts` | Bullet selection logic. | executive-brief-bullets.ts |
| `frontend/src/lib/executive/__tests__/executive-briefing-teams-delivery.test.ts` | Teams adaptive card payload. | executive-briefing-teams-delivery.ts |
| `frontend/src/lib/executive/__tests__/executive-intelligence-routing.test.ts` | Briefing routing per scope. | executive-intelligence-routing.ts |
| `frontend/src/lib/executive/__tests__/brandon-daily-update.test.ts` | Brandon daily update generator. | brandon-daily-update.ts |
| `frontend/src/app/api/executive/daily-brief/__tests__/route.test.ts` | Daily-brief API route contract. | daily-brief/route.ts |
| `frontend/src/app/api/executive/brandon-daily-update/__tests__/route.test.ts` | Brandon update API route contract. | brandon-daily-update/route.ts |
| `frontend/src/components/ai-assistant/__tests__/chat-area-formatting.test.ts` | Message formatting (markdown, citations). | chat-formatting.ts |
| `frontend/src/components/ai-assistant/__tests__/voice-input-error.test.ts` | Voice-input error handling. | audio-waveform.tsx |
| `scripts/verify/verify_ai_assistant_eval_suite.mjs` | Master eval suite runner — exercises chat against curated prompts and scores responses. | dogfood_ai_assistant.mjs |
| `npm run rag:verify:inbox-evals:prod` | Production eval bundle for live Outlook inbox/date/triage regressions. Requires `consultMicrosoftExecutiveAssistant`, asserts the nested trace includes `microsoft_graph_live`, and blocks stale semantic/source fallback answers plus direct `getRecentEmails` / retired Outlook cache tools. | assistant-eval-suite.json, handler-v2.ts, microsoft_executive_assistant |
| `npm run rag:verify:source-sync-evals:prod` | Production eval bundle for Teams/source-health regressions. Requires Teams-capable retrieval and explicit source/packet freshness. | assistant-eval-suite.json, source-health.ts |
| `scripts/verify/dogfood_ai_assistant.mjs` | Dogfood loop — sends realistic prompts to live chat route and captures traces for regression. | verify_ai_assistant_eval_suite.mjs |
| `scripts/verify/verify_ai_advisor_quality.mjs` | Scores advisor synthesis quality across intents. | advisor-synthesis.ts |
| `scripts/verify/verify_ai_chat_architecture.mjs` | Architecture invariants (chat route uses orchestrator, no legacy paths). | chat/route.ts |
| `scripts/verify/verify_ai_elements_chat_ui.mjs` | Chat UI rendering correctness (citations, widgets, formatting). | chat-area.tsx |
| `scripts/verify/verify_ai_intelligence_packet_contract.mjs` | Intelligence packet shape contract. | packet-service.ts |
| `scripts/verify/verify_ai_intelligence_compiler_health.mjs` | Compiler queue + freshness health check. | compiler.py |
| `scripts/verify/verify_ai_packet_synthesis_quality.mjs` | Project operating packet quality gate. Rejects placeholder/raw-dump packets, stale-or-failed dominant source mixes, repeated generic card `next_action` values, and missing meeting coverage when meeting sources exist. | operating_summary.py, intelligence page |
| `scripts/verify/verify_ai_memory_contract.mjs` | Memory storage/recall contract, including lifecycle and visibility hydration filters, AI Database memory chunk sync/delete, latest-message extraction, and chat `memory_usage`/post-response scheduling. | ai-memory-service.ts |
| `scripts/verify/verify_ai_assistant_eval_suite.mjs` | Assistant eval runner. Persists per-case traces, tool coverage, backend Deep Agents metadata, and memory-candidate counts into `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/**`. Includes `project-briefing-union-meeting-coverage`, which fails if Union Collective answers deny meeting transcript coverage when the operating packet exposes it. | assistant-eval-suite.json, handler-v2.ts |
| `scripts/verify/verify_app_expert_eval_suite.mjs` | App Expert golden eval runner. Exercises `/api/intelligence/app-expert` directly against the 50-case app-help suite and requires answer shape, sources, tool trace, and expected route/status text. Production gate: `npm run rag:verify:app-expert-evals:prod`. | app-expert-eval-suite.json, app_expert |
| `scripts/verify/verify_app_expert_prod_smoke.mjs` | Fast App Expert production smoke. Checks active Render backend health, OpenAPI route exposure, Render App Expert env flags when API credentials are available, and one grounded navigation answer before relying on production chat routing. | app_expert, render.yaml |
| `scripts/verify/verify_ai_source_specific_rag_contract.mjs` | Source-specific RAG retrieval contract. | detect-rag-request.ts |
| `scripts/verify/verify_ai_strategist_frontend_conversation.mjs` | End-to-end frontend conversation flow. | chat/route.ts |
| `scripts/verify/verify_ai_assistant_operational_readiness.mjs` | Pre-deploy readiness — all AI deps live. | ai-system-health-panel.tsx |
| `scripts/verify/verify_ai_assistant_response_contract.mjs` | Streamed response shape contract. | chat/route.ts |
| `scripts/verify/verify_ai_assistant_risk_quality.py` | Risk-portfolio answer quality scoring. | project-tools.ts |
| `scripts/verify/verify_ai_assistant_risk_routing.py` | Risk queries route to `getProjectsWithRisks` not `getPortfolioOverview`. | strategist.ts |
| `scripts/verify/verify_ai_assistant_latest_briefing_shape.mjs` | Latest briefing structured-output shape. | executive-briefing-workflow.ts |
| `scripts/verify/verify_ai_admin_comms_guardrails.mjs` | Admin comms guardrails (PII, role scope). | guardrails.ts |
| `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs` | Tool-calling support across providers. | handler-v2.ts, orchestrator.ts |
| `scripts/verify/verify_executive_daily_brief_fresh.mjs` | Daily brief freshness — uses today's data. | daily-brief.ts |
| `scripts/verify/verify_financial_fallback_retrieval.py` | Financial queries fall back to packet/RAG when tools fail. | financial.ts |
| `scripts/verify/verify_financial_numeric_retrieval.py` | Numeric financial answers cite source rows. | financial.ts |
| `scripts/verify/verify_rag_pm_briefing_quality.mjs` | PM briefing RAG quality scoring. | executive-briefing-workflow.ts |
| `scripts/verify/verify_meeting_pipeline_contract.mjs` | Meeting ingestion → segment → embed pipeline contract. | parser.py, embedder.py |
| `scripts/verify/verify_meeting_vectorization_health.mjs` | Meeting embeddings exist for all recent meetings. | embedder.py |
| `scripts/verify/verify_graph_embedding_contract.mjs` | Microsoft Graph (email/Teams) embedding contract. | embedder.py |
| `scripts/verify/verify_teams_conversation_ingestion_contract.mjs` | Teams ingestion shape. | teams_compiler.py |
| `scripts/verify/verify_fireflies_task_integrity.py` | Fireflies-extracted task integrity (project, owner, due date). | task-training-service.ts |
| `scripts/verify/verify_project_attribution_rules.mjs` | Project attribution confidence + low-confidence queue. | email_compiler.py |
| `scripts/verify/verify_render_ai_gateway_health.mjs` | Render-deployed AI gateway connectivity. | providers.ts |
| `scripts/verify/repair_ai_intelligence_current_packet_links.mjs` | Repair script — relinks packet rows orphaned by compiler races. | packet-service.ts |
| `scripts/verify/rag_eval_diff.py` | Diffs RAG eval results between runs to catch regressions. | dogfood_ai_assistant.mjs |

### Documentation

| File Path | What it controls / does | Related files |
|-----------|-------------------------|---------------|
| `docs/architecture/AI-RAG-ARCHITECTURE.md` | This document — authoritative AI/RAG reference. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI-MASTER-PLAN.md` | Phase-by-phase task tracker for the AI roadmap. | AI-VISION.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI-VISION.md` | Long-term vision for proactive intelligence and strategic advisory. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI-CSUITE-ARCHITECTURE.md` | C-Suite multi-agent architecture design. | strategist.ts, cfo.ts |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI_KNOWLEDGE_BASE.md` | Knowledge base schema and ingestion strategy. | semantic search tools |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI_PERSONA_AND_MEMORY.md` | Persona/memory design — soul, identity, conversation memory. | soul.ts, identity.ts |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI_OPERATING_MODEL_FOR_ALLEATO.md` | Operating model for AI inside Alleato's workflows. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/AI_CONSTRUCTION_WORKFLOW_ROADMAP.md` | Roadmap for construction-specific AI workflows. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ALLEATO-AI-PLATFORM-OVERVIEW.md` | Platform overview for stakeholders. | — |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ASK-ALLEATO-WIDGET-PLAN.md` | "Ask Alleato" embedded widget plan. | global-ai-widget.tsx |
| `docs/archive/2026-06-22-docs-migration/ai-plan/SELF_LEARNING_INTELLIGENCE_ARCHITECTURE.md` | Self-learning feedback loop design. | agent-learning-service.ts |
| `docs/archive/2026-06-22-docs-migration/ai-plan/RAG-REFACTOR-TASKS.md` | RAG refactor task list. | — |
| `docs/archive/2026-06-22-docs-migration/ai-plan/GATES.md` | Quality gates for AI feature work. | — |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ai-plan.md` | Top-level AI plan index. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ai-assistant-generative-ui-build-checklist.md` | Generative UI build checklist. | assistant-widgets.ts |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ai-assistant-generative-ui-owner-command-center.md` | Owner command center design. | brandon-daily-update-widget.ts |
| `docs/archive/2026-06-22-docs-migration/ai-plan/CODEX_HANDOFF_SUMMARY_AI_CONSTRUCTION_WORKFLOWS.md` | Codex handoff notes. | — |
| `docs/archive/2026-06-22-docs-migration/ai-plan/ai-master-plan/prp-ai-master-plan.md` | PRP for AI master plan. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/councils/2026-05-08-rag-strategy-council-durable-assistant-strategy.md` | Strategy council notes — durable assistant strategy. | AI-MASTER-PLAN.md |
| `docs/archive/2026-06-22-docs-migration/ai-plan/evals/EVAL-SUITE-FIRST-RUN-RESULTS-2026-05-02.json` | Eval suite first-run baseline. | verify_ai_assistant_eval_suite.mjs |
| `docs/archive/2026-06-22-docs-migration/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json` | Tool-calling provider matrix snapshot. | verify_ai_tool_calling_provider_matrix.mjs |
