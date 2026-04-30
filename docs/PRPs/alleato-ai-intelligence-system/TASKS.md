# Alleato AI Intelligence System Tasks

Source PRP: `docs/PRPs/alleato-ai-intelligence-system/prp-alleato-ai-intelligence-system.md`
Primary target: Westfield Collective, `projects.id = 43`

## Progress Summary

- Status: Completed pending review
- Current phase: Phase 8 evidence complete
- Follow-up page: Phase 9 complete
- Last updated: 2026-04-30
- Validation artifact: `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json`
- Browser evidence: `tests/agent-browser-runs/2026-04-30T10-23-32-784Z-ai-westfield-intelligence-packet/VERIFICATION_SUMMARY.md`

## Phase 0: Tool Validation Gate

- [x] Create `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs`.
- [x] Test AI SDK `generateText` + AI Gateway + OpenAI model.
- [x] Test AI SDK `generateText` + direct OpenAI provider.
- [x] Test AI SDK `streamText` + AI Gateway + OpenAI model.
- [x] Test AI SDK `streamText` + direct OpenAI provider.
- [x] Skip raw OpenAI function calling because the AI SDK provider matrix isolated the current behavior.
- [x] Record tool calls, tool results, final text, finish reason, warnings, errors, provider path, and model id.
- [x] Save `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json`.
- [x] Decide provider path: keep Gateway generateText available, keep streaming model tools disabled until Gateway/direct streamText failures are fixed.

## Phase 1: Provider Routing

- [x] Add `frontend/src/lib/ai/provider-routing.ts`.
- [x] Add `AssistantProviderPath` and `AssistantToolCallingDecision` types.
- [x] Persist provider path in `chat_history.metadata.provider_path`.
- [x] Keep text-only calls on existing path unless validation proves a change is required.
- [x] Add focused unit coverage.

## Phase 2: Database Schema

- [x] Create migration for `intelligence_targets`.
- [x] Create migration for `insight_cards`.
- [x] Create migration for `insight_card_targets`.
- [x] Create migration for `insight_card_evidence`.
- [x] Create migration for `intelligence_packets`.
- [x] Create migration for `intelligence_packet_cards`.
- [x] Create migration for `intelligence_reviews`.
- [x] Add indexes and one-current-packet unique index.
- [x] Add RLS policies for project-access-safe reads and service-role compiler writes.
- [x] Apply migration.
- [x] Run `npm run db:types`.
- [x] Run `npm run db:migrations:verify-applied -- supabase/migrations/20260430095000_ai_intelligence_packets.sql`.

## Phase 3: Westfield Packet Seed

- [x] Create `scripts/seed-db/seed-westfield-intelligence-packet.mjs`.
- [x] Resolve Westfield Collective as `projects.id = 43`.
- [x] Seed `westfield-collective` as `client_project`.
- [x] Seed one `manual_gold_standard` packet.
- [x] Seed one `current` packet.
- [x] Seed cards for project status, financial exposure, change-management risk, schedule/operational risk, decisions/open questions, and missed follow-ups.
- [x] Link concise evidence to real `document_metadata.id` rows where available.
- [x] Create review rows for uncertain attribution and source gaps.
- [x] Seed secondary compatibility targets: JobPlanner Replacement, AI Implementation, and JobPlanner.
- [x] Run seed dry-run.
- [x] Run seed.

## Phase 4: Packet Services

- [x] Create `frontend/src/lib/ai/intelligence/types.ts`.
- [x] Create `frontend/src/lib/ai/intelligence/packet-service.ts`.
- [x] Implement `resolveIntelligenceTarget`.
- [x] Implement `loadCurrentIntelligencePacket`.
- [x] Implement `loadPacketCards`.
- [x] Ensure project name resolution never asks the user for a project id when the selected project or name can resolve it.
- [x] Add `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts`.

## Phase 5: Intent And Assistant Integration

- [x] Create `frontend/src/lib/ai/intent-router.ts`.
- [x] Classify target briefing, latest status, risk review, financial analysis, change-management review, decision lookup, task follow-up, source lookup, strategy brainstorm, implementation planning, app help, and general conversation.
- [x] Wire packet-first flow into `frontend/src/app/api/ai-assistant/chat/route.ts`.
- [x] Preserve current source-specific RAG path for exact source lookup.
- [x] Preserve app-help mode.
- [x] Preserve memory, financial, Acumatica, company knowledge, raw source lookup, and specialist tools.
- [x] Limit active streaming tools by provider decision; streaming model tools stay disabled by default.

## Phase 6: Advisor Synthesis

- [x] Create `frontend/src/lib/ai/intelligence/advisor-synthesis.ts`.
- [x] Implement project-status response contract.
- [x] Implement financial-exposure response contract.
- [x] Implement change-management response contract.
- [x] Implement missing packet behavior.
- [x] Implement stale packet behavior.
- [x] Implement thin packet behavior.
- [x] Add `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts`.
- [x] Update response quality scoring for compiled intelligence packet answers.

## Phase 7: Verification

- [x] Create `scripts/verify/verify_ai_intelligence_packet_contract.mjs`.
- [x] Create `scripts/verify/verify_ai_advisor_quality.mjs`.
- [x] Run `node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs`.
- [x] Run `node scripts/verify/verify_ai_intelligence_packet_contract.mjs --target westfield-collective`.
- [x] Run `npm run rag:verify:chat-architecture`.
- [x] Run `npm run rag:verify:response-contract`.
- [x] Run `npm run rag:verify:source-specific`.
- [x] Run `npm run rag:verify:latest-briefing`.
- [x] Run focused frontend unit tests.
- [x] Run `cd frontend && npm run typecheck`.
- [x] Long-running full build/lint not run; focused gates covered this PRP slice.

## Phase 8: Browser Evidence

- [x] Start local dev server.
- [x] Use `agent-browser` to test `/ai-assistant`.
- [x] Ask `What's the latest on Westfield Collective?`.
- [x] Capture screenshots, video, snapshots, action log, and `VERIFICATION_SUMMARY.md`.
- [x] Confirm the answer loads the packet first and includes current read, recent changes, financial/change-management exposure, risk, decisions/follow-ups, confidence, gaps, and next action.

## Phase 9: Project Intelligence Page

- [x] Create project-scoped page at `frontend/src/app/(main)/[projectId]/intelligence/page.tsx`.
- [x] Surface current packet summary, freshness, confidence, evidence count, recommended moves, insight cards, evidence, and coverage gaps.
- [x] Add `Project Intelligence` to shared navigation.
- [x] Run `npm run check:routes`.
- [x] Run `cd frontend && npm run typecheck -- --pretty false`.
- [x] Verify `http://localhost:3000/43/intelligence` with `agent-browser`.

## Session Log

### 2026-04-30

- PRP created.
- Supabase types regenerated.
- Current schema and assistant architecture researched.
- PRP quality validation run - APPROVED WITH NOTES.
- Executed PRP implementation.
  - Provider matrix showed Gateway `generateText` tool calling works; direct OpenAI is quota-blocked; Gateway `streamText` tool calling still fails empty with `finishReason=other`; direct `streamText` fails with no output.
  - Added provider-routing guardrail and kept streaming model tools disabled by default.
  - Added and applied `supabase/migrations/20260430095000_ai_intelligence_packets.sql`; ledger verification passed.
  - Seeded Westfield Collective current and manual gold-standard packets with six cards, six linked evidence rows, and three review rows.
  - Added packet service, intent router, advisor synthesis, packet-first assistant integration, response scoring, and verifier guardrails.
  - Fixed conversation memory embeddings to use `text-embedding-3-large` with 3072 dimensions so post-response memory writes match the live `memories.embedding` column.
  - Verified `/ai-assistant` with agent-browser evidence at `tests/agent-browser-runs/2026-04-30T10-23-32-784Z-ai-westfield-intelligence-packet/VERIFICATION_SUMMARY.md`.
- Added project-scoped frontend page at `/43/intelligence` so the packet can be viewed outside chat.
  - The page uses the existing packet service and shared design primitives.
  - Browser verification screenshot: `tests/agent-browser-runs/project-intelligence-page-2026-04-30.png`.
