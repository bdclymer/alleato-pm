# Alleato AI Intelligence System Tasks

Source PRP: `docs/PRPs/alleato-ai-intelligence-system/prp-alleato-ai-intelligence-system.md`
Primary target: Westfield Collective, `projects.id = 43`

## Progress Summary

- Status: Not started
- Current phase: Phase 0 validation
- Last updated: 2026-04-30
- Validation artifact: pending
- Browser evidence: pending

## Phase 0: Tool Validation Gate

- [ ] Create `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs`.
- [ ] Test AI SDK `generateText` + AI Gateway + OpenAI model.
- [ ] Test AI SDK `generateText` + direct OpenAI provider.
- [ ] Test AI SDK `streamText` + AI Gateway + OpenAI model.
- [ ] Test AI SDK `streamText` + direct OpenAI provider.
- [ ] Test raw OpenAI function calling only if the AI SDK/provider tests do not isolate the failure.
- [ ] Record tool calls, tool results, final text, finish reason, warnings, errors, provider path, and model id.
- [ ] Save `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json`.
- [ ] Decide whether to keep Gateway, bypass Gateway for tool-heavy assistant calls, or fix local SDK usage.

## Phase 1: Provider Routing

- [ ] Add `frontend/src/lib/ai/provider-routing.ts`.
- [ ] Add `AssistantProviderPath` and `AssistantToolCallingDecision` types.
- [ ] Persist provider path in `chat_history.metadata.provider_path`.
- [ ] Keep text-only calls on existing path unless validation proves a change is required.
- [ ] Add focused type tests or unit coverage where practical.

## Phase 2: Database Schema

- [ ] Create migration for `intelligence_targets`.
- [ ] Create migration for `insight_cards`.
- [ ] Create migration for `insight_card_targets`.
- [ ] Create migration for `insight_card_evidence`.
- [ ] Create migration for `intelligence_packets`.
- [ ] Create migration for `intelligence_packet_cards`.
- [ ] Create migration for `intelligence_reviews`.
- [ ] Add indexes and one-current-packet unique index.
- [ ] Add RLS policies for project-access-safe reads and service-role compiler writes.
- [ ] Apply migration or explicitly mark it deferred.
- [ ] Run `npm run db:types`.
- [ ] Run `npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_ai_intelligence_packets.sql`.

## Phase 3: Westfield Packet Seed

- [ ] Create `scripts/seed-db/seed-westfield-intelligence-packet.mjs`.
- [ ] Resolve Westfield Collective as `projects.id = 43`.
- [ ] Seed `westfield-collective` as `client_project`.
- [ ] Seed one `manual_gold_standard` packet.
- [ ] Seed one `current` packet.
- [ ] Seed cards for project status, financial exposure, change-management risk, schedule/operational risk, decisions/open questions, and missed follow-ups.
- [ ] Link concise evidence to real `document_metadata.id` rows where available.
- [ ] Create review rows for uncertain attribution and source gaps.
- [ ] Seed secondary compatibility targets: JobPlanner Replacement, AI Implementation, and JobPlanner.
- [ ] Run seed dry-run.
- [ ] Run seed.

## Phase 4: Packet Services

- [ ] Create `frontend/src/lib/ai/intelligence/types.ts`.
- [ ] Create `frontend/src/lib/ai/intelligence/packet-service.ts`.
- [ ] Implement `resolveIntelligenceTarget`.
- [ ] Implement `loadCurrentIntelligencePacket`.
- [ ] Implement `loadPacketCards`.
- [ ] Ensure project name resolution never asks the user for a project id when the selected project or name can resolve it.
- [ ] Add `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts`.

## Phase 5: Intent And Assistant Integration

- [ ] Create or extend `frontend/src/lib/ai/intent-router.ts`.
- [ ] Classify target briefing, latest status, risk review, financial analysis, change-management review, decision lookup, task follow-up, source lookup, strategy brainstorm, implementation planning, app help, and general conversation.
- [ ] Wire packet-first flow into `frontend/src/app/api/ai-assistant/chat/route.ts`.
- [ ] Preserve current source-specific RAG path for exact source lookup.
- [ ] Preserve app-help mode.
- [ ] Preserve memory, financial, Acumatica, company knowledge, raw source lookup, and specialist tools.
- [ ] Limit active tools by intent if tool calling is re-enabled.

## Phase 6: Advisor Synthesis

- [ ] Create `frontend/src/lib/ai/intelligence/advisor-synthesis.ts`.
- [ ] Implement project-status response contract.
- [ ] Implement financial-exposure response contract.
- [ ] Implement change-management response contract.
- [ ] Implement missing packet behavior.
- [ ] Implement stale packet behavior.
- [ ] Implement thin packet behavior.
- [ ] Add `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts`.
- [ ] Update response quality scoring if needed for advisor-specific checks.

## Phase 7: Verification

- [ ] Create `scripts/verify/verify_ai_intelligence_packet_contract.mjs`.
- [ ] Create `scripts/verify/verify_ai_advisor_quality.mjs`.
- [ ] Run `node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs`.
- [ ] Run `node scripts/verify/verify_ai_intelligence_packet_contract.mjs --target westfield-collective`.
- [ ] Run `npm run rag:verify:chat-architecture`.
- [ ] Run `npm run rag:verify:response-contract`.
- [ ] Run `npm run rag:verify:source-specific`.
- [ ] Run `npm run rag:verify:latest-briefing`.
- [ ] Run focused frontend unit tests.
- [ ] Run `cd frontend && npm run typecheck`.
- [ ] Delegate long-running build/lint to a cheaper sub-agent if needed.

## Phase 8: Browser Evidence

- [ ] Start local dev server.
- [ ] Use `agent-browser` to test `/ai-assistant`.
- [ ] Ask `What's the latest on Westfield Collective?`.
- [ ] Capture screenshots, video, snapshots, action log, and `VERIFICATION_SUMMARY.md`.
- [ ] Confirm the answer loads the packet first and includes current read, recent changes, financial/change-management exposure, risk, decisions/follow-ups, confidence, gaps, and next action.

## Session Log

### 2026-04-30

- PRP created.
- Supabase types regenerated.
- Current schema and assistant architecture researched.
- Implementation not started.
- PRP quality validation run — APPROVED WITH NOTES.
  - Fixed: `npm run test` → `npm run test:unit` in Phase 5 and Phase 7 (Playwright vs Jest).
  - Fixed: Added `# Created in Phase 8` comments to three early references to `verify_ai_intelligence_packet_contract.mjs` and `verify_ai_advisor_quality.mjs` so executors don't try to run them before Phase 8.
  - Confirmed: `lint:errors` lives in `frontend/package.json`; existing `cd frontend &&` prefix is correct.
  - Confirmed: all `rag:verify:*`, `verify:browser`, and `db:migrations:verify-applied` npm scripts verified present in root package.json.
