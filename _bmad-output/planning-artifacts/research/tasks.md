# Implementation Tasks — Hermes-Agent + OpenClaw → Alleato AI Assistant

**Companion to:** [`technical-hermes-openclaw-vs-alleato-ai-research-2026-06-19.md`](technical-hermes-openclaw-vs-alleato-ai-research-2026-06-19.md)
**Created:** 2026-06-19 · **Owner:** Megan
**Convention:** every discrete action is its own checkbox. Check items only when verified, not when written. Sub-agent for all `typecheck`/`lint`/`build`/full-test runs (never the main thread). RAG-touching items must satisfy the RAG-DOCS-GATE.

Legend: `[x]` done · `[ ]` todo · `⏸️` deferred (with trigger) · ⭐ next-up

---

## Phase 0 — Audit, verification, scoping  ✅ COMPLETE

- [x] Audit `hermes-agent` (MIT) for high-leverage patterns → report §4
- [x] Audit `openclaw` (MIT) for high-leverage patterns → report §4
- [x] Map Alleato current AI architecture baseline → report §2
- [x] Produce gap → source crosswalk → report §3
- [x] Write technical research report + implementation plan
- [x] **Verify C1 failure mode against live data** (`chat_history`, 1,995 msgs) → 0 prose-tool-call markers; C1/C3a deferred, C2 promoted, ~3% empty-response follow-up flagged
- [x] Record verification findings + dispositions in the report
- [x] Spawn follow-up task: investigate ~3% empty-model-response rate (`task_c7a95faf`)

---

## Phase 1 — Hardening

### C2 · net-policy (SSRF egress + secret redaction)  ✅ COMPLETE
- [x] Confirm no existing `fetchWithGuardrails` caller passes a literal private IP (safe to block-by-default)
- [x] Confirm package manager (pnpm) + that only a transitive `ipaddr.js@1.9.1` existed
- [x] Add `ipaddr.js@2.4.0` to `frontend/package.json` via pnpm; verify 2.x range classification
- [x] Vendor `ip.ts` (SSRF IP classifier) with MIT attribution header
- [x] Vendor `redact-sensitive-url.ts`, trimmed of OpenClaw config-UI helpers, MIT header
- [x] Vendor `url-userinfo.ts` with MIT header
- [x] Author `assert-url-allowed.ts` egress gate (`checkUrlEgress` + `UrlEgressPolicy`)
- [x] Author `index.ts` barrel
- [x] Wire `allowPrivateHosts` option + pre-flight egress check into `fetch-with-guardrails.ts`
- [x] Ensure block path fails loudly (`GuardrailError`) and redacts the URL (no secret leak)
- [x] Always-block cloud metadata (`169.254.169.254`/Aliyun/GCP-v6) before the escape hatch
- [x] Defeat IPv4-mapped-IPv6 (`::ffff:127.0.0.1`) + legacy octal/hex (`0177.0.0.1`) bypasses
- [x] Unit suite `net-policy/__tests__/net-policy.test.ts` (classification + redaction)
- [x] Integration suite `__tests__/fetch-with-guardrails-egress.test.ts` (block/allow/redact/escape)
- [x] Run targeted tests → 44/44 pass
- [x] Delegate typecheck + lint to sub-agent → changed files clean
- [ ] Sub-agent clears pre-existing typecheck errors blocking the gate (in progress)
- [ ] Commit type-error fixes (separate commit)
- [ ] Commit C2 to `main`
- [ ] Push to `origin/main`

#### C2 follow-ups (separate, not blocking)
- [ ] ⏸️ DNS-rebinding hardening: resolve host → check resolved IP → optionally pin. *Trigger: when a tool fetches fully arbitrary user/model URLs (web-fetch/MCP) goes live.*
- [ ] Adopt `allowPrivateHosts: true` on any intentional internal-IP caller (none today)
- [ ] Consider routing Sentry/PostHog URL logging through `redactSensitiveUrl` globally

### Deferred Phase-1 candidates
- [ ] ⏸️ **C1 tool-call-repair** — *Trigger: gap G5 (a non-OpenAI model added). Zero surface on OpenAI-only stack.*
- [ ] ⏸️ **C3a think-scrubber** — *Trigger: a model that streams `<think>`/`<reasoning>` into content is added.*
- [ ] **C3b iteration-budget** — optional trivial COPY (`agent/iteration_budget.py` → TS); low priority
- [ ] ⏸️ **C4 normalization-core** — *Trigger: next webhook/Teams-callback parsing work needs it. No current consumer.*

---

## Phase 2 — Tool-policy & operator  ⭐ NEXT

### C5 · beforeToolCall / afterToolCall hook layer + outbound-action-policy
- [ ] Read OpenClaw `packages/agent-core/src/agent-loop.ts` hook semantics
- [ ] Design a Vercel-AI-SDK-compatible tool wrapper exposing `beforeToolCall` (deny w/ reason) + `afterToolCall` (rewrite/redact/terminate)
- [ ] Create `frontend/src/lib/ai/tools/outbound-action-policy.ts` (the pending policy module)
- [ ] Migrate the operator `confirmed`-write gate (`needsConfirmedWriteApproval`) into the central policy
- [ ] Fold `email-operator-policy.ts` / `action-capabilities.ts` write-policy logic into the module
- [ ] Add tool-output redaction (reuse `net-policy` `redactSensitiveUrl` + secret scrub) in `afterToolCall`
- [ ] Ship behind a feature flag; default off until verified
- [ ] Unit tests: unconfirmed write blocked; redaction strips secrets pre-trace; `terminate` exits cleanly
- [ ] Extend `docs/ai-plan/evals/assistant-eval-suite.json` (high-risk draft-only guard still passes)
- [ ] Sub-agent: typecheck + lint + eval-suite verifier
- [ ] **Archive:** per-tool ad-hoc `confirmed` checks in `action-tools.ts` (replace with shared gate); dead branches of `email-operator-policy.ts`/`action-capabilities.ts`
- [ ] Commit + push

### C6 · Portable presentation-action model (cross-channel operator)
- [ ] Read OpenClaw `src/interactive/payload.ts` + `src/channels/plugins/{message-capabilities,message-action-names,types.adapters}.ts`
- [ ] Define `frontend/src/lib/ai/operator/presentation.ts` `OperatorMessage` envelope (Alleato `operatorId`/`approvalId`; Zod, not typebox)
- [ ] Port button/priority/truncation/normalization logic (no OpenClaw runtime coupling)
- [ ] Renderer: `OperatorMessage` → Teams Adaptive Card (reuse `adaptive-cards-teams` skill)
- [ ] Unit/snapshot tests: presentation → card; unsupported affordance dropped not errored
- [ ] Sub-agent verify
- [ ] Commit + push

---

## Phase 3 — Retrieval & memory (independent workstreams → parallelizable)

### C7 · Session search (recall over past conversations)
- [ ] Add Postgres FTS to `chat_history` (PM APP): `tsvector` column + `pg_trgm` index (migration)
- [ ] Create `search_chat_history` RPC (anchored ±N window + session bookends, RLS-scoped by user/team)
- [ ] Add `searchPastConversations` tool in `frontend/src/lib/ai/tools/` (registered in `tool-registry.ts`)
- [ ] Surface in chat UI + daily-brief context assembly
- [ ] Tests: anchored window neighbors correct; dedup by session; RLS scoping; empty = loud-empty not error
- [ ] `db:types` regen; sub-agent verify
- [ ] **RAG-DOCS-GATE:** update `docs/architecture/tables.yaml` (+ `npm run db:inventory`); note it is NOT document RAG
- [ ] Commit + push

### C8 · Hybrid dual-score + recency-decay RAG ranking
- [ ] Add `recall_count` / `last_recalled_at` columns to `document_chunks` (AI Database; migration)
- [ ] Add `tsvector` FTS on chunks; blend pgvector cosine + FTS in `search_document_chunks` RPC
- [ ] Port decay/recency scoring math into `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts`
- [ ] Flag-gate hybrid vs. pure-cosine for A/B
- [ ] A/B vs. eval suite; confirm hybrid ≥ cosine before default-on
- [ ] Tests: decay lowers stale rank; blended beats vector-only on eval set; migration reversible
- [ ] **RAG-DOCS-GATE:** update `AI-RAG-ARCHITECTURE.md` + `docs/architecture/tables.yaml` + `npm run db:inventory`
- [ ] **Archive:** pure-cosine branch after hybrid proven (keep flag one release, then remove)
- [ ] Commit + push

### C9 · Context compaction (long RAG chats)
- [ ] Port OpenClaw `harness/compaction/compaction.ts` → `frontend/src/lib/ai/stream/compaction.ts`
- [ ] Token-budget trigger; protect system prompt + head + last N turns verbatim; summarize middle via synthesis model
- [ ] Invoke between turns in `handler-v2.ts` when budget exceeded
- [ ] Tests: under-threshold no-op; over-threshold preserves head/tail+recent; summary refresh idempotent
- [ ] Sub-agent verify
- [ ] **Archive:** naive history-truncation in the chat handler
- [ ] Commit + push

---

## Phase 4 — Differentiated / high-risk

### G3 · Learning loop (autonomous self-improvement) — incremental, human-gated first
- [ ] Study Hermes `agent/background_review.py` + `curator.py` (design only; do not transplant Python)
- [ ] Add opt-in Render `after()`/background job that *proposes* skill/memory writes into existing review queues (`ai_skills`, `ai_memories`, `ai_learning_promotions`)
- [ ] Keep human approval gate; collect confidence data before any auto-promotion
- [ ] Borrow MemoryProvider lifecycle interface (`prefetch`/`sync_turn`/`on_session_end`), Supabase-backed
- [ ] Tests + eval-suite guard; **RAG-DOCS-GATE** if it touches retrieval/memory tables
- [ ] Commit + push

### G6 · NL schedule parser + automation blueprints
- [ ] Port Hermes `cron/jobs.py parse_schedule()` (pure fn) → TS
- [ ] Port blueprint/suggestion data model → Supabase JSONB
- [ ] User-facing "schedule this automation" UX on top of existing Render crons (no in-process scheduler)
- [ ] Tests; commit + push

### C10 · Code-mode RPC (token savings) — lowest priority, security-gated
- [ ] Decide sandbox runtime (Vercel Sandbox vs Node `vm`/`worker_threads`)
- [ ] Security review BEFORE build (arbitrary code execution surface)
- [ ] Implement `runToolScript` with env scrub + egress restricted via C2 net-policy
- [ ] Tests: sandbox escape blocked; secrets not visible; egress restricted; budget refund correct
- [ ] Commit + push

### G5 · Unified delivery router (study, build fresh)
- [ ] Study Hermes gateway `PlatformEntry`/`DeliveryTarget` + OpenClaw gateway-protocol (reference)
- [ ] Build `PlatformEntry` + `DeliveryTarget` abstraction unifying Teams/Outlook/digest delivery
- [ ] Migrate existing outbound surfaces onto the router
- [ ] Tests; commit + push

---

## Cross-cutting — license, archival, cleanup

- [x] MIT attribution headers in every copied file (C2: ip.ts, redact-sensitive-url.ts, url-userinfo.ts)
- [ ] Add MIT headers to all future copied files (Nous Research / OpenClaw Foundation)
- [ ] Confirm OpenClaw `THIRD_PARTY_NOTICES.md` (Pi/pi-mono) stays untriggered (no pi-derived code copied)
- [ ] **Archive superseded Alleato code** as each replacement lands (see report §6a) — never leave two live paths; add a guardrail test proving the new path owns the behavior
- [ ] **Remove temporary source clones** `hermes-agent/` and `openclaw/` from repo root after implementation (keep them unstaged meanwhile — they trip the file-organization gate; `openclaw/CHANGELOG.md` is 2.6 MB)
- [ ] Verify copied-file MIT headers remain as the permanent provenance record after clones are deleted

---

## Standing rules for every task above
- [ ] Quality gate (`npm run quality`) via **sub-agent**, never the main thread
- [ ] Every bug fix ships a test/validation/guardrail that would have caught it (CLAUDE.md core principle)
- [ ] RAG-touching change → update `AI-RAG-ARCHITECTURE.md` and/or `docs/architecture/tables.yaml` + `npm run db:inventory`
- [ ] General work → commit directly to `main`; no feature branches; no `Co-Authored-By`
