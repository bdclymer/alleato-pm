# Source Embedding Health - 2026-06-22

## Summary

The embedding store is internally consistent and the requested source families are covered after terminal exclusions. `document_chunks` has no missing embeddings across the checked source types, and `/ai-system-health` now exposes the source-by-source coverage operators need before trusting AI answers.

The remaining downstream gap is Project Intelligence packet freshness: source embeddings are healthy, but current packets have not been regenerated within the 36-hour lifecycle threshold.

## 14-Day Coverage

| Source | Embedded / Required | Coverage | Intentional / terminal exclusions | Actionable missing |
| --- | ---: | ---: | ---: | ---: |
| Meeting transcripts | 102 / 102 | 100.0% | 9 | 0 |
| Emails | 294 / 294 | 100.0% | 14 | 0 |
| Teams messages | 161 / 161 | 100.0% | 77 | 0 |
| SharePoint documents | 18 / 18 | 100.0% | 0 | 0 |
| OneDrive documents | 38 / 38 | 100.0% | 7 | 0 |

## Verification Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `npm run rag:verify:graph-embedding` | Passed | Contract now validates the shared `ai_transport.py` provider path. |
| `npm run rag:verify:teams-ingestion` | Passed | Teams DM aggregation and low-content loud-skip behavior are guarded. |
| `npm run rag:verify:chunk-integrity` | Passed | Existing chunk rows all have embeddings; warnings are non-sequential chunk indices only. |
| `npm run rag:verify:meetings` | Passed | 77/77 eligible recent meetings have embedded chunks; 1/1 transcript-bearing recent meeting has embedded transcript chunks. |
| `npm run rag:verify:source-lifecycle -- --days 14 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Failed/Downstream | Embedding-required rows are 100% covered; remaining failure is stale current Project Intelligence packets, newest `2026-06-17T12:32:08.088Z`. |
| `cd frontend && npx eslint 'src/app/api/admin/ai-system-health/route.ts' 'src/components/ai-intelligence/ai-system-health-panel.tsx'` | Passed | Targeted static check for changed frontend files. |
| `node --check scripts/verify/verify_source_lifecycle_health.mjs && node --check scripts/verify/verify_meeting_vectorization_health.mjs && node --check scripts/verify/verify_graph_embedding_contract.mjs` | Passed | Syntax check for changed verifier scripts. |
| `cd frontend && npm run typecheck -- --pretty false` | Timed out | Existing full-program bounded timeout after 60s; no changed-file error emitted. |
| Browser artifact | Passed | `tests/agent-browser-runs/2026-06-22-source-embedding-health/ai-system-health-source-coverage-post-remediation.png` |

## Communication Recommendation

Use `/ai-system-health` as the primary operator surface. It should show:

- Per-source coverage for meeting transcripts, emails, Teams messages, SharePoint documents, and OneDrive documents.
- Embedded / required count, coverage percentage, terminal exclusions, newest source age, and sample missing records.
- A distinction between "covered", "intentionally skipped", and "actionable missing embeddings".
- Recent pipeline failures directly above the coverage table.

Do not communicate this as a single green/red "AI is synced" badge. Operators need to know which sources are trustworthy, which rows were intentionally skipped, and whether downstream packets are fresh before relying on assistant answers or Project Intelligence packets.

## Remaining Remediation

- Regenerate current Project Intelligence packets or repair the scheduled compiler drain so the source lifecycle verifier passes the 36-hour freshness threshold.
- Investigate the 1 Microsoft Graph vectorization run failure reported on `/ai-system-health`; the source coverage table currently classifies the resulting rows as terminal exclusions where applicable.
- Decide whether old Fireflies ingestion-job error rows should remain warning-only or be archived/summarized so the meeting health output is quieter.
