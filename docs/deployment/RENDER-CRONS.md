# Render Cron Jobs Reference

## Overview

All scheduled backend jobs run on **Render as Docker cron jobs**, not GitHub Actions. GitHub Actions billing is currently locked — all workflows fail with `startup_failure`. Moving crons back to Actions would require restoring billing at github.com/settings/billing and is not recommended even then: Render crons use the existing Docker image with zero additional cost, while Actions minutes are rate-limited and billed per minute.

Most crons share the same Dockerfile (`./backend/Dockerfile`, context `./backend`) as the `alleato-backend` web service. The executive Daily Brief crons use `./backend/Dockerfile.executive-brief` with the repo root as context so they can run the existing TypeScript brief generator on Render without Vercel function limits.

Config lives in `render.yaml` at the repo root.

---

## Cron Reference Table

| Name | Schedule (UTC) | Purpose | Key File | Exit Behavior |
|------|---------------|---------|----------|---------------|
| `alleato-source-sync-health` | Every 30 min (`*/30 * * * *`) | Recompute source-sync health snapshots and active alerts for operations/readiness pages | `backend/src/services/health/source_sync_health.py` | Exit 1 whenever overall health is not `healthy`, so stale Teams/Graph data fails loudly in Render instead of only writing a passive alert row. |
| `alleato-graph-sync` | Every 2 hours at minute 20 (`20 */2 * * *`) | Microsoft Graph sync: Outlook emails, OneDrive/SharePoint files, attachment promotion, and bounded embedding | `backend/src/services/integrations/microsoft_graph/sync.py` | Exit 1 only if errors **and** `total_synced == 0`. Partial errors with some synced = exit 0. |
| `alleato-teams-channel-sync` | Hourly at minute 10 (`10 * * * *`) | Teams channel-message sync only, isolated from Outlook/OneDrive work | `backend/src/scripts/run_graph_sync_phase.py` | Exit 1 on source-sync errors. Skips embedding and Teams compiler so source freshness is not blocked by downstream work. |
| `alleato-teams-dm-sync` | Hourly at minute 40 (`40 * * * *`) | Teams direct-message export only, isolated from channel/Outlook/OneDrive work | `backend/src/scripts/run_graph_sync_phase.py` | Exit 1 on source-sync errors. Skips embedding and Teams compiler so source freshness is not blocked by downstream work. |
| `alleato-task-extraction` | Daily 7:00 AM (`0 7 * * *`) | Extract action items from communications (window: last 2 days) | `backend/src/services/task_extraction.py` | Exit 1 only if errors **and** `inserted == 0`. |
| `alleato-rag-health` | Daily 12:15 PM (`15 12 * * *`) | RAG meeting vectorization health check. Posts to Slack on failure. | `backend/src/services/health/rag_meeting_health.py` | Standard Python exit code (non-zero on failure). Posts to `SLACK_WEBHOOK_URL`. |
| `alleato-source-rag-health` | Every 4 hours at minute 5 (`5 */4 * * *`) | Multi-source RAG/source watchdog: Fireflies, Outlook, Teams channel, Teams DM, OneDrive, SharePoint, vectorization, compiler backlog, and task extraction | `backend/src/services/health/source_rag_health.py` | Exit 1 if any watched source is stale, unhealthy, or has critical pipeline alerts. Persists `system_alerts`; optionally calls `RAG_HEALTH_REMEDIATION_WEBHOOK_URL` for cloud remediation. |
| `alleato-packet-refresh-periodic` | 4x/day (`0 2,9,15,21 * * *`) | Enqueue project intelligence packet refresh jobs for every active `client_project` target, including quiet projects with no new source messages. | `backend/src/scripts/enqueue_periodic_packet_refresh.py` | Exit 1 only if every target enqueue fails. Dedupes existing queued/running jobs. |
| `alleato-intelligence-compiler-drain` | Hourly (`0 * * * *`) | Drain `source_intelligence_jobs` and `packet_refresh_jobs` from the RAG database into insight cards and current project intelligence packets. This is the intended production compiler loop when the Render cron service exists; it was absent from live Render at the 2026-06-18 read-back. | `backend/src/services/scheduler.py` | Exit 1 if the run times out, if any packet refresh job fails, or if compiler jobs fail with zero successes. Writes compiler-run telemetry through `source_sync_runs`. |
| `alleato-executive-daily-brief-morning` | Weekdays 11:00 AM and noon UTC (`0 11,12 * * 1-5`) | Generate the approved executive Daily Brief on Render. Teams delivery is currently paused with `EXECUTIVE_DAILY_BRIEF_SEND_TEAMS=false`; when re-enabled, sends the CEO Operating Brief Teams message at 7:00 AM America/New_York. One UTC run skips depending on daylight saving time. | `frontend/scripts/run-executive-daily-brief.ts` | Exit 1 on generation, persistence, or enabled Teams delivery failure. Writes `source_sync_runs` with source `executive_daily_brief`. Non-target UTC runs exit 0 before generation. |
| `alleato-executive-daily-brief-evening` | Weekdays 10:30 PM and 11:30 PM UTC (`30 22,23 * * 1-5`) | Same as morning run, targeted at 6:30 PM America/New_York. Teams delivery is currently paused with `EXECUTIVE_DAILY_BRIEF_SEND_TEAMS=false`. One UTC run skips depending on daylight saving time. | `frontend/scripts/run-executive-daily-brief.ts` | Exit 1 on generation, persistence, or enabled Teams delivery failure. Writes `source_sync_runs` with source `executive_daily_brief`. Non-target UTC runs exit 0 before generation. |

---

## Required Env Vars Per Cron

Set these in the Render dashboard under each cron's **Environment** tab. All are marked `sync: false` in `render.yaml` — they are not synced from a group and must be set manually.

### `alleato-graph-sync`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key) |
| `MICROSOFT_CLIENT_ID` | Azure app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration client secret |
| `MICROSOFT_TENANT_ID` | Azure tenant ID |
| `MICROSOFT_SYNC_USERS` | Comma-separated UPNs to sync (e.g. `user@domain.com,user2@domain.com`) |
| `GRAPH_SYNC_ENABLED` | Set to `"true"` (already defaulted in render.yaml) |
| `GRAPH_SYNC_OUTLOOK` | Set to `"true"` |
| `GRAPH_SYNC_TEAMS` | Set to `"true"` |
| `GRAPH_SYNC_ONEDRIVE` | Set to `"true"` |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-teams-channel-sync`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `MICROSOFT_CLIENT_ID` | Azure app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration client secret |
| `MICROSOFT_TENANT_ID` | Azure tenant ID |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-teams-dm-sync`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `MICROSOFT_CLIENT_ID` | Azure app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration client secret |
| `MICROSOFT_TENANT_ID` | Azure tenant ID |
| `MICROSOFT_SYNC_USERS` | Comma-separated UPNs to sync. Missing/empty means the cron can run but will export no Teams DMs. |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-task-extraction`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (falls back to direct OpenAI if unset) |
| `OPENAI_API_KEY` | Direct OpenAI key (fallback) |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-rag-health`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key |
| `OPENAI_API_KEY` | Direct OpenAI key (fallback) |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL for failure alerts |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-source-rag-health`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `RAG_HEALTH_REMEDIATION_WEBHOOK_URL` | Optional webhook for Trigger.dev/Codex/cloud remediation dispatch. If unset, Render failure plus persisted `system_alerts` are still created. |
| `RAG_HEALTH_REMEDIATION_WEBHOOK_TOKEN` | Optional bearer token for the remediation webhook |
| `PYTHONPATH` | `/app:/app/src:/app/src/services` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-packet-refresh-periodic`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Main app Supabase project URL |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Main app service role key, used to read active `intelligence_targets` |
| `RAG_SUPABASE_URL` | Split RAG Supabase project URL |
| `RAG_SUPABASE_SERVICE_ROLE_KEY` | RAG service role key, used to enqueue `packet_refresh_jobs` |
| `RAG_DATABASE_READS_ENABLED` | Set to `"true"` |
| `RAG_DATABASE_WRITES_ENABLED` | Set to `"true"` |
| `PYTHONPATH` | `/app:/app/src:/app/src/services:/app/src/workers` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-intelligence-compiler-drain`

| Var | Notes |
|-----|-------|
| `SUPABASE_URL` | Main app Supabase project URL |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Main app service role key, used for packet/card writes |
| `RAG_SUPABASE_URL` | Split RAG Supabase project URL |
| `RAG_SUPABASE_SERVICE_ROLE_KEY` | RAG service role key, used to claim/update compiler queues |
| `RAG_DATABASE_READS_ENABLED` | Set to `"true"` |
| `RAG_DATABASE_WRITES_ENABLED` | Set to `"true"` |
| `AI_GATEWAY_API_KEY` | Primary AI provider key for operating-summary packet generation |
| `OPENAI_API_KEY` | Direct OpenAI fallback |
| `PYTHONPATH` | `/app:/app/src:/app/src/services:/app/src/workers` (set in render.yaml) |
| `PYTHONUNBUFFERED` | `1` (set in render.yaml) |

### `alleato-executive-daily-brief-morning` / `alleato-executive-daily-brief-evening`

| Var | Notes |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY` | Service role key |
| `AI_GATEWAY_API_KEY` | Primary AI provider key for generation |
| `OPENAI_API_KEY` | Direct OpenAI fallback |
| `CRON_SECRET` | Shared bearer secret used by the thin Teams delivery endpoint |
| `EXECUTIVE_DAILY_BRIEF_FRONTEND_BASE_URL` | Production frontend URL, currently `https://projects.alleatogroup.com` |
| `EXECUTIVE_DAILY_BRIEF_SEND_TEAMS` | Set to `"false"` while Teams delivery is paused for review; restore to `"true"` only after the CEO Operating Brief Teams message has been approved |
| `EXECUTIVE_DAILY_BRIEF_SCHEDULE` | Human-readable schedule label persisted into `source_sync_runs.metadata` |
| `EXECUTIVE_DAILY_BRIEF_TARGET_TIMEZONE` | `America/New_York`; used by the worker to handle daylight saving time correctly |
| `EXECUTIVE_DAILY_BRIEF_TARGET_LOCAL_TIME` | `07:00` for morning, `18:30` for evening |
| `EXECUTIVE_DAILY_BRIEF_TARGET_WEEKDAYS` | `1,2,3,4,5` for Monday-Friday in the target timezone |

---

## How to Check if a Cron Ran

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Select the cron by name (e.g. `alleato-graph-sync`)
3. Click the **Logs** tab — each run shows as a timestamped log stream
4. The run history shows start time, duration, and exit code
5. Exit code `0` = success. Exit code `1` = failure (see exit behavior in table above)

For `alleato-graph-sync`, the startCommand prints a JSON result object before exiting — look for `total_synced`, `total_embedded`, and `errors` fields in the log output.

---

## How to Trigger a Cron Manually

### Via Render Dashboard

1. Open the cron service in the Render dashboard
2. Click **Trigger Run** (top-right button on the cron's Overview page)
3. Watch the Logs tab for output

### Via Render CLI

```bash
# Install Render CLI if needed
npm install -g @render/cli

# List services to find the service ID
render services list

# Trigger a cron run (replace <service-id> with the cron's srv-* ID)
render jobs create --service <service-id>
```

### Direct Python (local, for debugging)

```bash
cd /path/to/alleato-pm/backend

# Graph sync
python3 -c "
import json, os, sys
sys.path.insert(0, '.')
from src.services.supabase_helpers import get_supabase_client
from src.services.integrations.microsoft_graph.sync import run_graph_sync
client = get_supabase_client()
result = run_graph_sync(client)
print(json.dumps(result, indent=2))
"

# Task extraction
python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.services.task_extraction import run_task_extraction
result = run_task_extraction(window_days=2)
print(json.dumps(result, indent=2))
"

# RAG health
python3 -m src.services.health.rag_meeting_health

# Project intelligence packet refresh enqueue + compiler drain
python3 src/scripts/enqueue_periodic_packet_refresh.py --dry-run
python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.services.scheduler import _run_intelligence_compiler
result = _run_intelligence_compiler(source_limit=15, packet_limit=10, max_processing_time_ms=600000)
print(json.dumps(result, indent=2, default=str))
"
```

For AI/RAG data quality follow-up after `alleato-rag-health` or
`alleato-source-rag-health` fails, run these repo-side checks from a configured
developer or ops shell:

```bash
npm run rag:verify:chunk-integrity -- --days=1
npm run rag:verify:repaired-meeting-retrieval
```

Expected result:

- `RAG chunk integrity: PASS`
- `Repaired meeting transcript retrieval: PASS`

These are not Render cron start commands today. They are operator verification
checks that prove the split RAG database has embedded chunks and that repaired
Fireflies meeting transcripts are retrievable through `search_document_chunks`.

---

## How to Add a New Cron

Add a block to `render.yaml` following this pattern:

```yaml
- type: cron
  name: alleato-<job-name>
  runtime: docker
  dockerfilePath: ./backend/Dockerfile
  dockerContext: ./backend
  schedule: "<cron expression>"  # standard 5-field cron
  startCommand: >-
    python3 -c "
    import json, sys;
    sys.path.insert(0, '/app');
    from src.services.<module> import <function>;
    result = <function>();
    print(json.dumps(result, indent=2));
    sys.exit(1 if result.get('errors', 0) > 0 and result.get('inserted', 0) == 0 else 0)
    "
  envVars:
    - key: PYTHONPATH
      value: /app:/app/src:/app/src/services
    - key: PYTHONUNBUFFERED
      value: 1
    - key: SUPABASE_URL
      sync: false
    - key: SUPABASE_SERVICE_KEY
      sync: false
    # Add any additional vars the job needs
    - key: MY_VAR
      sync: false
```

**Rules:**
- `sync: false` on all secret vars — Render will not set them automatically; you must add them in the dashboard.
- Exit code must be explicit. Never let a cron exit 0 silently on total failure — check both error count and output count before deciding exit code.
- Use `/app` as the Python root (matches `WORKDIR` in the Dockerfile), not a relative path.
- After adding, push to `main` and confirm the new cron appears in the Render dashboard within a few minutes.

---

## Failure Runbook

When a cron exits with code 1 or produces unexpected output, check in this order:

### 1. Render Logs

Open the cron's Logs tab. Look for:
- Python tracebacks (`Traceback (most recent call last)`)
- `KeyError`, `TypeError`, `ConnectionError` — usually a missing env var or unreachable service
- The printed JSON result object (if the job got far enough to produce one) — check `errors` array

### 2. Missing Env Vars

The most common failure cause. Symptoms: `KeyError: 'SUPABASE_URL'`, `None` being passed where a string is expected, or `AuthenticationError`.

Check: Render dashboard → cron → Environment. Verify all required vars from the table above are present and non-empty.

### 3. Supabase

If logs show Supabase errors (PostgREST errors, RLS violations, `relation does not exist`):
- Check [app.supabase.com](https://app.supabase.com) → project → Logs → API/Database
- Verify the service key has the right permissions (service role bypasses RLS)
- Check if a migration ran that changed a table name or column

### 4. Microsoft Graph (graph-sync only)

If sync shows 0 items synced and errors reference 401/403:
- Check that `MICROSOFT_CLIENT_SECRET` has not expired (Azure app registrations have secret expiry dates)
- Verify `MICROSOFT_SYNC_USERS` contains valid UPNs with active licenses
- Check Azure portal → App registrations → API permissions — required permissions: `Mail.Read`, `ChannelMessage.Read.All`, `Files.Read.All` (application permissions, admin-consented)

### 5. OpenAI / AI Gateway (task-extraction, rag-health)

If errors reference rate limits or authentication:
- Verify `AI_GATEWAY_API_KEY` is set and valid
- Verify `OPENAI_API_KEY` is set as fallback
- Check [platform.openai.com/usage](https://platform.openai.com/usage) for quota exhaustion

### 6. Slack Alerts Not Arriving (rag-health)

- Verify `SLACK_WEBHOOK_URL` is set and points to an active incoming webhook
- Test the webhook: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' <SLACK_WEBHOOK_URL>`
- If the webhook was deleted, create a new one in Slack → Apps → Incoming Webhooks

---

## Known Limitations

### GitHub Actions Billing Locked

As of 2026-05-06, GitHub Actions billing is locked — all workflows fail immediately with `startup_failure`. This affects CI (typecheck, lint, deploy) and any workflows that remain in `.github/workflows/`. **Do not move Render crons back to GitHub Actions** until billing is restored at github.com/settings/billing.

Expensive workflows already deleted: `rag-meeting-vectorization-health.yml` (now `alleato-rag-health` on Render), `chromatic.yml` (deleted).

### Teams Chat 403s (Permanent)

The `alleato-graph-sync` cron permanently fails to sync ~10 Teams chats. These are cross-tenant chats (`@unq.gbl.spaces`) and meeting chats (`@thread.v2`) that the Microsoft Graph API blocks for app-only auth. There is no workaround — this is a hard Graph API limitation. Partial errors on these items do not cause an exit 1 as long as other items sync successfully.

### No Review UI for Low-Confidence Attribution

Items that the sync cannot confidently assign to a project (confidence < 0.70) go to `document_attribution_candidates` in Supabase. There is no UI for reviewing these items yet.
