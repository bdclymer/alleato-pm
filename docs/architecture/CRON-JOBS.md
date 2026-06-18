# Cron Jobs — Complete Reference

All jobs run on Render as Docker cron jobs using the `alleato-backend` image.
Defined in `render.yaml` at the repo root.

**Last updated: 2026-06-18**

---

## Summary Table

| Cron name | Schedule | Freq/day | AI model | AI calls/run | Est. cost/day | Status |
|---|---|---|---|---|---|---|
| `alleato-graph-sync` | every 30 min | 48× | text-embedding-3-large only | ≤50 embeddings | Low | ✅ Active |
| `alleato-teams-channel-sync` | :10 every hour | 24× | none | 0 | None | ✅ Active |
| `alleato-teams-dm-sync` | :40 every hour | 24× | none | 0 | None | ✅ Active |
| `alleato-fireflies-sync` | :15 every hour | 24× | embeddings only during ingest | 0 inline GPT calls | Low | ✅ Active |
| `alleato-microsoft-executive-assistant-check` | every 15 min | 96× | gpt-5.4-mini | ≤25 per run | Medium | ✅ Active |
| `alleato-intelligence-compiler-drain` | hourly | 24× | bounded source compiler | capped by queue limits | Low-medium when present | ⚠️ Defined hourly; absent from live Render at last check |
| `alleato-source-sync-health` | every 30 min | 48× | none | 0 | None | ✅ Active |
| `alleato-source-rag-health` | every 4 hr | 6× | none | 0 | None | ✅ Active |
| `alleato-rag-health` | daily 12:15 UTC | 1× | none | 0 | None | ✅ Active |
| `alleato-task-extraction` | daily 07:00 UTC | 1× | gpt-5.5 | ≤25 docs | Low-medium | ✅ Active |
| `alleato-daily-recap` | daily 09:30 UTC | 1× | unknown (see below) | 1 | Low | ✅ Active |
| `alleato-packet-refresh-periodic` | 02/09/15/21 UTC | 4× | **none (dry-run)** | 0 | **$0** | ⚠️ Disabled (dry-run) |
| `alleato-domain-packet-compiler` | 02:30/09:30/15:30/21:30 UTC | 4× | gpt-5.4-mini | ≤150 docs | Low | ✅ Active |
| `alleato-acumatica-financial-sync` | Jan 1 only | 0 | none | 0 | None | ⚠️ Disabled (echo stub) |

---

## Job Details

### `alleato-graph-sync` — every 30 min
**What it does:** Syncs Outlook email, OneDrive, SharePoint from Microsoft Graph. Embeds up to 50 new documents per run via `text-embedding-3-large`.
**AI cost:** Embeddings only — cheap.
**Does NOT:** Run Teams sync, Teams compiler, or any intelligence compiler.
**Key env flags:** `GRAPH_SYNC_OUTLOOK=true`, `GRAPH_SYNC_TEAMS=false`, `embed_limit=50`

---

### `alleato-teams-channel-sync` — :10 every hour
**What it does:** Syncs Teams channel messages from Microsoft Graph. No embedding, no compiler.
**AI cost:** None.
**Key flags:** `--skip-embedding --skip-teams-compiler`

---

### `alleato-teams-dm-sync` — :40 every hour
**What it does:** Syncs Teams DM conversations. No embedding, no compiler.
**AI cost:** None.
**Key flags:** `--skip-embedding --skip-teams-compiler`, max 1 user, 2 pages of 25 messages

---

### `alleato-fireflies-sync` — :15 every hour
**What it does:** Fetches recent Fireflies meeting transcripts (up to 25 per run), stores canonical transcript text, chunks it, embeds chunks, and records source lifecycle/sync evidence.
**AI cost:** Embeddings only during ingest. The cron command forces `FIREFLIES_REWRITE_TASKS_DURING_INGEST=false`, so the GPT-5.5 task rewriter is not called inline while polling transcripts. Task/risk/change-order extraction belongs to the bounded downstream intelligence stage.
**Note:** Unchanged transcript content is skipped by content hash and does not re-embed or call LLMs.

---

### `alleato-microsoft-executive-assistant-check` — every 15 min
**What it does:** Checks Brandon's mailbox for new emails requiring executive action. Processes up to 25 messages per run.
**AI model:** gpt-5.4-mini
**AI cost:** Medium — 96 runs/day × up to 25 messages. Cost scales with email volume.

---

### `alleato-intelligence-compiler-drain` — hourly
**What it does:** Drains queued RAG source-intelligence jobs (bounded signal extraction from source records) and packet-refresh jobs when explicitly enabled.
**Current config:** `source_limit=15, packet_limit=0`
**AI cost (current):** Source signal extraction only when queue rows exist. Packet refresh is OFF (`packet_limit=0`).
**⚠️ WARNING:** Raising `packet_limit` above 0 re-enables expensive operating summary calls. Do not change without understanding the cost impact.

---

### `alleato-source-sync-health` — every 30 min
**What it does:** Recomputes source sync health scores and persists them. DB reads/writes only.
**AI cost:** None.

---

### `alleato-source-rag-health` — every 4 hours
**What it does:** Checks embedding backlog, compiler backlog, task extraction freshness. Writes health alerts. No AI calls.
**AI cost:** None.

---

### `alleato-rag-health` — daily 12:15 UTC
**What it does:** RAG meeting vectorization health check. Posts to Slack on failure.
**AI cost:** None.

---

### `alleato-task-extraction` — daily 07:00 UTC
**What it does:** Extracts action items from meetings, emails, and Teams messages from the past 2 days. Up to 25 docs.
**AI model:** **gpt-5.5** (`TASK_EXTRACTION_MODEL` in `task_extraction.py`)
**AI cost:** Low-medium. 1 call per doc, capped at 25/day.

---

### `alleato-daily-recap` — daily 09:30 UTC
**What it does:** Generates an AI daily project recap from meeting transcripts of the prior 24 hours. Written to `daily_recaps` table.
**AI model:** Check `scripts/generate_daily_recap.py` for model.
**AI cost:** Low — 1 run/day.

---

### `alleato-packet-refresh-periodic` — 02:00/09:00/15:00/21:00 UTC
**What it does:** Enqueues `packet_refresh_jobs` for every active `intelligence_target` (currently 100 projects).
**Current config:** `--dry-run` — **NO jobs are enqueued. Zero cost.**
**⚠️ WARNING:** Removing `--dry-run` immediately queues 100 gpt-5.5 operating summary calls, 4×/day = 400 calls/day. Do not re-enable without a per-project freshness gate (only refresh if last packet > N hours AND new meetings exist since last refresh).

---

### `alleato-domain-packet-compiler` — 02:30/09:30/15:30/21:30 UTC
**What it does:** Synthesizes cross-project communications by business function (accounting, operations, BD, people). Reads up to 150 docs from last 60 days.
**AI model:** gpt-5.4-mini (`DOMAIN_PACKET_MODEL`)
**AI cost:** Low — mini model, 4×/day, bounded doc count.

---

### `alleato-acumatica-financial-sync` — disabled (Jan 1 only)
**What it does:** Nothing — the command is an `echo` stub while the DB incident guard is active.
**AI cost:** None.

---

## What Triggers `packet_refresh_jobs` (Operating Summary = gpt-5.5)

This is the most expensive path. A `packet_refresh_job` is created in three ways:

| Trigger | Gated? | Notes |
|---|---|---|
| `process_source_document` in compiler — confidence ≥ 0.85 | ✅ **Meetings only** | Fixed 2026-06-12 |
| `promote_signal_candidate` in compiler | ✅ **Meetings only** | Fixed 2026-06-12 |
| `alleato-packet-refresh-periodic` cron | ⚠️ **Disabled (dry-run)** | Was firing for all 100 projects 4×/day |
| Manual API: `POST /api/intelligence/operating-summary/refresh` | No gate | Admin-only endpoint |

Packet refresh jobs are executed by `alleato-intelligence-compiler-drain` (`packet_limit=0` = currently not executing any).

---

## Cost Kill Switches

| To stop... | Change in `render.yaml` |
|---|---|
| All operating summaries | Keep `packet_limit=0` in compiler-drain |
| Periodic blanket refresh | Keep `--dry-run` on packet-refresh-periodic |
| Deep meeting extraction | Set `DEEP_EXTRACTION_ENABLED=false` in fireflies-sync envVars |
| Executive assistant | Set `MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED=false` |
| Task extraction | Remove/stub the alleato-task-extraction cron |
