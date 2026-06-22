# HANDOFF: Make the insight_cards Daily Brief actually live

You're picking up a multi-session effort. The code is **merged to `main`** but the
feature is **not activated yet**. Your job is to take it from "merged" to "live and
verified." Read this whole doc before acting. Follow the repo's CLAUDE.md and the
gates in `.claude/rules/` (design system, RAG-docs, file-organization, FK-validation).

## Repo / environment facts
- Repo: `meganharrison/alleato-pm`. Work on `main` (the feature already merged via PR #482, squash commit `80b6603`).
- Two Supabase projects (do not mix them up):
  - PM APP (primary app DB): ref `lgveqfnpkxvzbnnwuled` — holds `insight_cards`, `intelligence_packets`, `intelligence_targets`, `insight_card_evidence`, `tasks`, `document_metadata`, `daily_recaps`.
  - AI/RAG DB: ref `fqcvmfqldlewvbsuxdvz` — holds `source_signal_candidates`, `document_chunks`, `rag_document_metadata`.
- Frontend: Next.js on Vercel. Project `alleato-hub`, project_id `prj_eWVjvq6iYieADQy8xvjm3hmwRSnj`, team `meganharrisons-projects` (`team_lZighRY9Xpkb6qZBqDApczKZ`), Hobby plan.
- Backend: Python FastAPI on Render (the meeting extractor pipeline runs here).
- Frontend install gotcha: there is **no lockfile** and `npm install` fails on a peer-dep conflict (`@langfuse/otel` wants `@opentelemetry/exporter-trace-otlp-http >=0.202.0`). Use `npm install --legacy-peer-deps` in `frontend/`.

## What the feature is (intent)
The owner-facing daily/executive brief was generated from RAG vector search over
900-char document chunks → shallow ("compression drift"). The strategy: generate
daily intelligence from the curated typed layer (`insight_cards`, "Pipeline B"),
not lossy retrieval. Full plan + status: `docs/PRPs/intelligence/daily-briefs-extraction-strategy.md`.

## What's already DONE (merged in PR #482 + CodeRabbit follow-up)
1. **Operating-summary dedup** (`backend/src/services/intelligence/operating_summary.py`): `_persist_operating_cards` dedups insight_cards per `normalized_signal_key`/legacy `key`, updates in place, supersedes stale cards, and cleans up pre-existing duplicates.
2. **Meeting extraction → insight_cards** (`backend/src/services/pipeline/extractor.py`): `_promote_meeting_signals` routes meeting decisions/risks/opportunities through the candidate→`promote_signal_candidate` path under `compiler_version = "meeting_extractor_compiler_v0_1"`. Heuristic confidence; <0.85 stays `needs_review`.
3. **Brief sourced from insight_cards, flag-guarded** (`frontend/src/lib/executive/brandon-daily-update.ts`): flag `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` (default OFF). When on, `generateBrandonDailyUpdate` skips RAG chunk search + chunk-synthesis and builds sections from `buildOwnerBriefingData` (`frontend/src/lib/executive/owner-briefing-builder.ts`) via `bucketInsightCardBriefSections`. No LLM re-summarization. Also reads optional `EXECUTIVE_BRIEF_RECIPIENT_NAME` (defaults "Brandon").
4. **Cross-time recurrence** (`owner-briefing-builder.ts` + brief): surfaces `insight_cards.source_count`; recurring issues rank higher and get a "Recurring: surfaced in N updates since {date}" fact.

Tests (all green locally): `backend/tests/test_project_operating_summary.py`,
`backend/tests/test_meeting_signal_promotion.py`,
`frontend/src/lib/executive/__tests__/brandon-daily-update.test.ts`.

## YOUR TASK: make it live, in this order

### 1. Confirm cards are actually being populated (do this FIRST)
The card-sourced brief is only as good as the cards. Before activating:
- Query PM APP `insight_cards`: are there recent rows with `current_status` in (open/blocked/needs_review/stale) and `attribution_status` in (approved/auto_assigned)? `buildOwnerBriefingData` only surfaces owner-relevant card types (risk/blocker/financial_exposure/schedule_risk/decision/change_management/open_question/task) and skips `needs_review` attribution.
- Check whether the **backend extractor change is deployed on Render** and has run on recent meetings — look for `source_signal_candidates` rows in the RAG DB with `compiler_version = 'meeting_extractor_compiler_v0_1'`, and promoted `insight_cards`. If the Render service hasn't redeployed since PR #482 merged, trigger/verify a deploy.
- If few/no owner-relevant cards exist yet, activating the flag will produce a sparse brief. Decide with the user whether to backfill (re-run the extractor/compilers on recent meetings) before flipping the flag.

### 2. Activate the flag (you're local now, so you can use the Vercel CLI)
- You need a real **Vercel Access Token** (NOT an OIDC token — an OIDC token was tried last session and rejected with `invalidToken:true`). Create one at https://vercel.com/account/settings/tokens scoped to `meganharrisons-projects`, or just use `vercel login`.
- Set the env var on **Preview first**, then Production:
  - `vercel env add EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS preview` → value `true`
  - `vercel env add EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS production` → value `true`
  - (or via API: `POST https://api.vercel.com/v10/projects/prj_eWVjvq6iYieADQy8xvjm3hmwRSnj/env?teamId=team_lZighRY9Xpkb6qZBqDApczKZ` with `{"key":"EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS","value":"true","type":"plain","target":["preview"]}` etc.)
- Redeploy so the env var takes effect (env changes don't apply to existing deployments).

### 3. Verify it's actually live (don't just assume)
- Trace how the brief is generated/sent: find the cron/route that calls `generateBrandonDailyUpdate` (check `frontend/src/lib/executive/executive-briefing-workflow.ts` and `frontend/src/app/api/cron/*`). Trigger it (or wait for the cron) on the preview deploy.
- Confirm the output packet's `retrievalNotes[0]` is the "Daily Brief source: curated insight_cards (Pipeline B)..." line — that's the proof it took the card path, not RAG.
- Confirm a `daily_recaps` row (recap_kind=executive_briefing) is produced and that items have real card content (titles/why-it-matters), and recurrence facts appear for `source_count > 1` cards.
- Eyeball the preview brief WITH the user before flipping Production (or flip prod and watch the next run). Rollback = set the env var back to `false` / remove it.

## Verification commands
```bash
# backend
cd backend && python -m pytest tests/test_project_operating_summary.py tests/test_meeting_signal_promotion.py -q

# frontend
cd frontend && npm install --legacy-peer-deps
npx jest src/lib/executive/__tests__/brandon-daily-update.test.ts
npm run typecheck   # bounded wrapper; if it times out use: TYPECHECK_NO_TIMEOUT=1 npx tsc --noEmit
```

## Known noise (don't chase these)
- CI `changed-quality` shows ~7 API-smoke failures in `change-events`/`commitments`/`contracts/payments`/`acumatica-sync` endpoints — **pre-existing, unrelated** to this work (financial domain). `design-system-guardrails`/`review-with-tracking` failed at a `git merge-base`/external step (CI infra), not real violations.
- `backend/tests/test_teams_compiler_packet.py` makes an **unmocked live OpenAI call**; it fails without OpenAI egress. Unrelated.

## Open follow-ups (in the PRP; do only if asked)
- Phase 1: lift the Teams 6k-char cap (`teams_compiler.py` MAX_LLM_CONVERSATION_CHARS) — cost decision; inject deterministic project state (budget/schedule/open items) into extraction so it's judged against ground truth.
- Phase 3 v2: full-transcript LLM read of the day's meetings (new cost-bearing subsystem); populate the currently-empty `importantUpdates` section (needs a query for `project_update`/`initiative_signal` cards, which the owner-briefing loader currently excludes).
- Phase 4: confidence-gating/evidence-required guardrails + a smoke entry (`scripts/api-smoke-contracts.mjs`).

## Hard rules
- Don't ask the user to do external-service work you can do with a CLI/token/MCP (Vercel, Supabase, Render). If blocked, state the exact missing credential.
- RAG-docs gate: touching `backend/src/services/pipeline/**`, `intelligence/**`, or AI paths requires updating `docs/architecture/AI-RAG-ARCHITECTURE.md` or `tables.yaml` (+ `npm run db:inventory`).
- Never claim UI/feature works without verifying in the running app.
