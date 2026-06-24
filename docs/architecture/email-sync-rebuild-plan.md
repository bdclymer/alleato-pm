# Email / Microsoft Graph Sync — Controlled Rebuild Plan

**Status:** in progress · **Started:** 2026-06-24 · **Last updated:** 2026-06-24 ~09:40 UTC

> **This file is the live source of truth and MUST be updated in real time as each
> step lands — before moving on, not in a batch afterward.** A stale plan is worthless.
> Current focus: **Phase 1.5 — fixing the embedding-auth (401) failure that makes the
> graph sync fail ~70% of runs.** Cron consolidation (Phase 3) is BLOCKED until sync is healthy.

## Why this exists

The email/Teams/SharePoint ingestion pipeline has broken repeatedly, each time
discovered by accident days later. Root causes are systemic, not in the sync
logic itself:

1. **Silent failures.** Guards/projections that fail without raising — the
   2026-06-17 `document_metadata` block returned `null` for 7 days (~4,085 writes
   dropped); the `project_emails` projection died silently on 2026-06-16. Both
   looked fine from the UI.
2. **Config drift across many crons.** Graph sync is triggered from **two**
   platforms (Render every 2h *and* Vercel daily), and 9 Render crons each carry
   their own env. One drifts → a source goes dark with no alarm.
3. **Interwoven sprawl with no single owner.** `outlook_email_intake` (AI DB) ⊇
   `document_metadata` (PM APP) ⊇ `project_emails` (PM APP, legacy) + the
   `document_chunks` embedding store, spanning two Supabase projects, plus
   hand-applied in-DB triggers that exist nowhere in the repo.

## Target architecture

1. **UI reads Microsoft Graph live** (source of truth). Already proven for Teams
   (`frontend/src/lib/microsoft-graph/teams-live.ts` + `/api/teams-live`). A sync
   hiccup can never again make a page look stale, because the page doesn't depend
   on the synced copy.
2. **One ingestion module feeds RAG only.** Graph → `document_metadata` →
   `document_chunks`. That is the sync's *only* job: feed the AI. Nothing in the
   UI read path depends on it.
3. **One config source, fewer triggers.** Collapse the double-trigger and the 9
   crons toward ~3 (ingest+embed, health, subscription-reconcile) sharing one env.
4. **Silent failure is structurally impossible.** Guards `RAISE EXCEPTION`; writes
   that fail are loud; the existing source-dark alarm (`pipeline_alert_notifier.py`,
   `/api/admin/source-sync/active-alerts`) is the backstop.

## Verified reality (2026-06-24) — what is NOT safe to delete

A read-only inventory initially flagged a lot of "dead/legacy" code. Grep
verification showed most of it is **load-bearing** — do not delete without first
migrating readers:

| Thing | Status | Evidence |
|---|---|---|
| `project_emails` table + writer | **LIVE** — ~25 readers | `/api/emails`, email-thread, advisor-synthesis, assignment-inbox, progress-reports |
| `email_attachments` table | **LIVE** — 6 read routes + `embed.py` | `/api/email-attachments/*`, `/api/projects/*/email-attachments/*` |
| webhook/subscription code | **WIRED** | `scheduler.py`, `api/main.py`, `run_graph_subscription_reconcile` cron |
| `/api/cron/graph-sync`, `/graph-embed` | **ACTIVE Vercel crons** | `frontend/vercel.json` (daily 6am / 7am) — redundant w/ Render every-2h, but live |
| `onedrive_project_assignment_backfill` | **WIRED** | imported by `admin_endpoints.py` |
| `project_document_backfill` (module) | **TESTED** utility | `test_graph_project_document_backfill.py` |

**Genuinely orphaned (deleted 2026-06-24):** 4 one-off scripts with zero
references — `backfill_outlook_rag_metadata_to_app_documents.py`,
`promote_outlook_attachments.py`, `backfill_fireflies_meeting_embeddings.py`,
`microsoft_graph/cli_extract_attachment_text.py`.

## Phased execution — LIVE STATUS (replace-then-remove, never delete-first)

- [x] **Phase 0 — stop the bleeding** *(done 2026-06-24)*. Lifted the 2026-06-17
  silent block via migration `20260624072508_lift_outlook_ingestion_incident_block_2026_06_17.sql`;
  0 block triggers remain; deleted 4 orphan scripts. Committed + on `origin/main`.
- [x] **Phase 1 — backfill the gap** *(done 2026-06-24)*. Verified the real gap was
  **45** project-assigned docs — not the feared ~1,657 (those were duplicate retries
  or already-embedded). Bridged via `backfill_outlook_rag_metadata_to_app_documents.py`
  (`--days 8 --apply true`): `created: 45`; re-run shows `missing_app_rows: 0`.
  Unassigned stragglers intentionally left per the tool's own policy.
- [x] **Phase 5 — guardrail** *(done + DEPLOYED LIVE 2026-06-24, commit `ad54606aa`)*.
  `backend/src/services/health/outlook_promotion_freshness.py` detects "intake fresh
  but document store stale"; wired into `pipeline_alert_notifier.py` (run_pipeline_alert_check)
  (15-min cron `alleato-pipeline-alert`, confirmed live with all creds). DMs Teams +
  `/rag` banner + auto-resolve. Verified healthy, no false page.
- [ ] **Phase 1.5 — FIX EMBEDDING AUTH (CRITICAL · IN PROGRESS).** Run ledger:
  `microsoft_graph` is failing **~70% of runs** (464 failed / 116 ok / 87 warn over
  8 days), ALL in the **vectorization** stage. Root cause: **231 docs stuck
  `embedding_status='error'` with `401 Authentication failed … AI_GATEWAY_API_KEY`**
  (last 2026-06-24 09:35 UTC). The graph-sync cron's gateway key is dead and the
  gateway→OpenAI failover isn't rescuing it; `document_pipeline`/fireflies embedding
  *succeeds*, so a working key exists on a peer cron. **Action:** converge graph-sync
  (and peer embedding crons + web) onto a known-good provider key/path, re-drive the
  231 stuck docs, verify the failure rate collapses. *(Same class as
  `incident_graph_embed_gateway_cron_drift` — per-cron key drift recurred.)*
- [ ] **Phase 2 — emails-live.** Mirror `teams-live.ts` for Outlook so the inbox
  reads Graph directly (additive; no deletion). Repoint the emails UI off
  `project_emails` / synced copies.
- [ ] **Phase 3 — consolidate triggers.** **BLOCKED until Phase 1.5** — Render
  `alleato-graph-sync` is NOT healthy, so the redundant Vercel `graph-sync`/`graph-embed`
  crons stay as backup for now. After sync is healthy: remove the Vercel duplicates +
  routes, collapse 9 crons → ~3 with shared config.
- [ ] **Phase 4 — retire legacy tables.** Once all readers are on the live model,
  remove `project_emails` / `email_attachments` write paths and tables.

### Live log
- 2026-06-24 09:25 — Phase 0/1/5 landed (block lifted, 45 bridged, guardrail live).
- 2026-06-24 09:40 — Phase 3 health-check surfaced the embedding-auth 401 → opened
  **Phase 1.5** as a blocker; began converging provider creds across embedding crons.
- 2026-06-24 09:50 — Confirmed embedding **flatlined today**: June 23 = 14 embedded / 0
  errors; June 24 = 1 embedded / **234 errors** (gateway 401). NOT old poison-pill noise —
  the provider auth broke today and ~all queued embeddings are failing now. Active outage.
- 2026-06-24 10:00 — Root cause: BOTH provider keys had hit an auth wall (code tries
  direct OpenAI first per `AI_PROVIDER_PATH=openai`, fails over to the gateway, records
  the gateway 401). Megan refreshed the **Vercel AI Gateway** key. Direct test now:
  OpenAI `HTTP 200` + gateway `HTTP 200`. Cron holds these same keys → auth wall cleared.
  REMAINING: re-drive the ~231 docs parked at `embedding_status='error'` (some at 8
  attempts, past the 6 cap — verify they get re-pulled, not stranded) + confirm failure
  rate collapses on the next runs.
- 2026-06-24 10:15 — Recovery underway. 211 PM-APP docs un-parked (`embed_failed` →
  `raw_ingested`) + 234 RAG records cleared (`embedding_status`/attempts/error reset).
  First drain batch: **embedded 40 / errors 0** — pipeline confirmed working with the
  refreshed key. Draining the remaining ~190 now.
- TODO (still open before Phase 1.5 is "done"): (a) confirm queue → 0 / error rate
  collapses; (b) add an **embedding-freshness guardrail** — today's outage failed ~70%
  of runs but did NOT page, because interleaved partial-success ("warning") runs kept
  `pipeline_alert_notifier.py`'s "nothing-through" gate from firing. The promotion guardrail
  watches promotion, not embedding, so neither alarm caught this. Needs its own check.

## Hard rules for this rebuild

- No new in-DB trigger that isn't also a committed migration file.
- No guard that returns `null` to reject a write — `RAISE EXCEPTION` only.
- Replace readers before removing their source table.
- Verify against the DB before claiming any path is dead.
