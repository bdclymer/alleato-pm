# Live RAG Post-Sync Regression Repair

Status: In Progress
Owner: Codex
Linear: Not created - continuation of live production RAG verification
Started: 2026-07-07

## Objective

Restore the live source/RAG watchdog after later scheduled sync activity introduced one unembedded Fireflies summary meeting and several zero-content Teams DM rows.

## Scope

- Identify exact post-sync meeting and Teams rows causing degraded health.
- Repair vectorizable meeting content with the guarded recent-meeting chunk backfill.
- Mark zero-content Teams rows as terminal `skipped_low_content`.
- Add or verify guardrails so empty rows do not keep failing vector health.
- Rerun the live health gates.
- Push only task-owned files to `origin/main`.

## Out Of Scope

- Unrelated frontend branch work currently dirty in the checkout.
- Broad Teams sync redesign.
- New database schema or migrations.

## Checklist

- [x] Fresh failure captured.
- [x] Exact missing meeting and Teams rows identified.
- [ ] Summary-bearing meeting embedded.
- [ ] Zero-content Teams rows excluded.
- [ ] Guardrail reviewed or patched.
- [ ] Live meeting/Teams/Graph gates pass.
- [ ] Cross-source source/RAG watchdog passes.
- [ ] Evidence section filled.
- [ ] Task-owned files pushed to `origin/main`.

## Evidence

- Fresh `npm run rag:verify:meetings` result:
  - Failed with `72/73` recent eligible meetings embedded.
  - Missing meeting: `01KWH7GA1CMHR4AP6MV9TCSHF7` - `Quarterly Meeting Review`, `content_len=2224`.
- Fresh source/RAG watchdog:
  - `status='degraded'`, `warningAlerts=2`, `criticalAlerts=0`, `unhealthySources=0`.
  - Warnings: meeting project-intelligence coverage and Teams vectorized coverage.
- Missing zero-content Teams rows:
  - `teamsdm_be216efdb7c22230_2026-07-07` - `Company Vehicle Owners`, `content_len=0`.
  - `teamsdm_17e74a384e5bc3c3_2026-07-07` - `19:meeting_M`, `content_len=0`.
  - `teamsdm_03109b1a9a7954f7_2026-07-07` - `Operations`, `content_len=0`.
  - `teamsdm_f11fb31831cf3cf4_2026-07-07` - `19:19322edea`, `content_len=0`.

