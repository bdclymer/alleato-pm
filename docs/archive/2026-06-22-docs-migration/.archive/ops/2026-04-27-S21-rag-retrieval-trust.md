# Handoff: 2026-04-27 — RAG/Mem Retrieval Trust Fixes

## Intake Block

1) Session ID: S21
2) Task ID: AAI-185
3) Linear issue: AAI-185
4) Linear URL: https://linear.app/megankharrison/issue/AAI-185/ragmem-retrieval-audit-trust-fixes-alleato-pm
5) Current status: In Progress
6) Files changed (absolute paths):
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-27-S21-rag-retrieval-trust.md
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/services/conversation-memory.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tools/operational.ts
   - /Users/meganharrison/Documents/alleato-pm/package.json
   - /Users/meganharrison/Documents/alleato-pm/supabase/migrations/20260427130000_secure_rag_documents_rls.sql
7) Commands run and outcome (pass/fail counts):
   - `npm run db:types` (PASS)
   - `npm run rag:verify:chat-architecture` (PASS)
   - `npm run rag:verify:source-specific` (PASS)
   - `npm run rag:verify:memory` (PASS)
   - `npm run rag:verify:admin-comms` (PASS)
   - `npm run rag:verify:financial` (PASS; runs via backend `.venv` when present)
8) Evidence artifacts (screenshot/video/report/log paths):
   - `npm run rag:verify:chat-architecture` JSON output (terminal)
   - `npm run rag:verify:financial` JSON output (terminal)
9) Top 3 findings (frontend-visible issues first):
   - Service-role RAG tools were missing consistent project scoping, risking cross-project leakage (meetings/doc chunks/semantic search).
   - Conversation memory embeddings drifted vs DB schema (`memories.embedding` is vector(1536) but code was writing 3072-dim embeddings), causing silent memory degradation and generic answers.
   - DB RLS/policies for core RAG sources were not explicitly enforced in migrations (`document_metadata` / `document_rows`), and `document_chunks` policies were overly permissive.
10) Recommended next action (one line):
   - Finish the audit writeup (table/RPC/index inventory + severity-ranked findings), then decide whether to `supabase db push` the new RLS migration.
11) Handoff file path:
   - docs/ops/handoffs/2026-04-27-S21-rag-retrieval-trust.md

## Linear Updates

- Kickoff comment: posted (see Linear issue AAI-185)
- Milestone comments: pending
- Completion/blocker comment: pending

## Current Status

Repo-first architecture mapping completed + targeted trust fixes implemented in code + schema migration drafted for RLS hardening (not yet pushed).

## Exact Next Step

Write the final audit report (with the full Supabase table/RPC inventory) and decide whether to apply the new RLS migration to Supabase.

## Known Pitfalls

- Tighten permissions (RLS/policies) without breaking server-side ingestion routes that insert/update records.
- Avoid silent fallbacks that produce generic answers; failures must surface as “missing context” signals and be observable.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/alleato-pm
rg -n "ai assistant|rag|embedding|halfvec|pgvector|document_chunks|meeting_chunks|agent_learnings|memory" -S .
ls supabase/migrations | tail -50
npm run rag:verify:chat-architecture
npm run rag:verify:financial
```

## Evidence

- n/a (kickoff)
