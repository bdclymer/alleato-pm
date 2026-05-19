# Handoff: 2026-05-19 — Project Intelligence Compiler Synthesis

## Intake Block

1) Session ID: S46
2) Task ID: AAI-386
3) Linear issue: AAI-386
4) Linear URL: https://linear.app/megankharrison/issue/AAI-386/rebuild-project-intelligence-packet-compiler-for-source-backed
5) Current status: Pending Review
6) Files changed (absolute paths): /Users/meganharrison/Documents/alleato-pm/backend/src/services/intelligence/compiler.py; /Users/meganharrison/Documents/alleato-pm/backend/src/services/intelligence/operating_summary.py; /Users/meganharrison/Documents/alleato-pm/backend/tests/test_intelligence_compiler.py; /Users/meganharrison/Documents/alleato-pm/backend/tests/test_project_operating_summary.py; /Users/meganharrison/Documents/alleato-pm/scripts/verify/verify_ai_packet_synthesis_quality.mjs; /Users/meganharrison/Documents/alleato-pm/scripts/verify/verify_ai_intelligence_compiler_health.mjs; /Users/meganharrison/Documents/alleato-pm/package.json; /Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-RAG-ARCHITECTURE.md; /Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md; /Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/review-queue.md; /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-05-19-S46-project-intelligence-compiler-synthesis.md
7) Commands run and outcome (pass/fail counts): `backend/.venv/bin/python -m py_compile backend/src/services/intelligence/compiler.py backend/src/services/intelligence/operating_summary.py` pass; `node --check scripts/verify/verify_ai_packet_synthesis_quality.mjs && node --check scripts/verify/verify_ai_intelligence_compiler_health.mjs` pass; `backend/.venv/bin/python -m pytest backend/tests/test_intelligence_compiler.py backend/tests/test_project_operating_summary.py` pass 16/16; `npm run rag:verify:packet-synthesis-quality -- --project-id 1009` failed before refresh because packet compilerVersion was `ai_intelligence_compiler_v0_1`; direct Union refresh through `refresh_project_operating_packet(..., 1009)` pass; rerun `npm run rag:verify:packet-synthesis-quality -- --project-id 1009` pass; `npm run rag:verify:intelligence-compiler -- --max-queued-minutes 180 --max-running-minutes 180 --recent-failure-hours 72` fail due unrelated/backlog compiler health debt.
8) Evidence artifacts (screenshot/video/report/log paths): Terminal evidence in current Codex run; live packet ID `6e6558f3-b8b9-42fa-931a-c4cfafee4036`; generated at `2026-05-19T13:44:36.133Z`.
9) Top 3 findings (frontend-visible issues first): Current packet UI was exposing real compiler weakness; Union Collective had a fresh packet but mostly raw-source cards; scheduled packet refresh path bypassed the richer operating-summary compiler.
10) Recommended next action (one line): Drain stale compiler jobs and refresh remaining high-value project packets through the operating-summary compiler.
11) Handoff file path: docs/ops/handoffs/2026-05-19-S46-project-intelligence-compiler-synthesis.md
12) Migration ledger evidence: N/A, no migration in this slice.

## Linear Updates

- Kickoff comment: Posted 2026-05-19.
- Milestone comments: Posted 2026-05-19.
- Completion/blocker comment: Posted 2026-05-19.

## Current Status

Implemented and locally verified. Client-project packet refreshes now use the operating-summary synthesis compiler by default, source imports enqueue rather than immediately spending a packet LLM call per source, source-quality scoring is stored in the selected source set/coverage, and Union Collective was refreshed through the new compiler.

## Exact Next Step

Run a bounded compiler repair/drain for stale jobs, then refresh the next highest-value project packets.

## Known Pitfalls

Existing stale failed compiler jobs remain backlog debt. The broad compiler-health check still fails on stale running/failed queue rows, two stuck high-confidence candidates, and active cards missing from non-refreshed current packets.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/alleato-pm
backend/.venv/bin/python -m pytest backend/tests/test_intelligence_compiler.py backend/tests/test_project_operating_summary.py
npm run rag:verify:packet-synthesis-quality -- --project-id 1009
npm run rag:verify:intelligence-compiler -- --max-queued-minutes 180 --max-running-minutes 180 --recent-failure-hours 72
```

## Evidence

- Before refresh: `npm run rag:verify:packet-synthesis-quality -- --project-id 1009` failed because current packet compilerVersion was `ai_intelligence_compiler_v0_1`.
- Refresh result: Union Collective packet `6e6558f3-b8b9-42fa-931a-c4cfafee4036`; `card_count=10`; `linked_evidence_count=90`; `available_sources=96`; `compiler_version=project-operating-summary-v1`; headline `Union Collective is moving from concept to permit-ready design, but schedule, financing, and scope-control remain the main pressure points.`
- After refresh: packet synthesis verifier passed with `placeholderCount=0`, `placeholderRatio=0`, and source quality counts `clean_source=63`, `metadata_only=33`, `raw_dump=0`, `stale_or_failed=0`.
- Broad compiler health remains failing: `sourceStaleRunning=2`, `sourceRecentFailed=8`, `packetRecentFailed=4`, `highConfidenceUnpromoted=2`, `activeCardsMissingCurrentPacket=351`.
