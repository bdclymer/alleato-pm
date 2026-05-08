# Render Cron Jobs Reference

## Overview

All scheduled backend jobs run on **Render as Docker cron jobs**, not GitHub Actions. GitHub Actions billing is currently locked — all workflows fail with `startup_failure`. Moving crons back to Actions would require restoring billing at github.com/settings/billing and is not recommended even then: Render crons use the existing Docker image with zero additional cost, while Actions minutes are rate-limited and billed per minute.

The three crons share the same Dockerfile (`./backend/Dockerfile`, context `./backend`) as the `alleato-backend` web service. They run Python directly inside the container — no HTTP calls to the web service, so they work even when the web service is spun down or sleeping.

Config lives in `render.yaml` at the repo root.

---

## Cron Reference Table

| Name | Schedule (UTC) | Purpose | Key File | Exit Behavior |
|------|---------------|---------|----------|---------------|
| `alleato-graph-sync` | Every 30 min (`*/30 * * * *`) | Microsoft Graph sync: Outlook emails, Teams messages, OneDrive files → embed → teams compiler | `backend/src/services/integrations/microsoft_graph/sync.py` | Exit 1 only if errors **and** `total_synced == 0`. Partial errors with some synced = exit 0. |
| `alleato-task-extraction` | Daily 7:00 AM (`0 7 * * *`) | Extract action items from communications (window: last 2 days) | `backend/src/services/task_extraction.py` | Exit 1 only if errors **and** `inserted == 0`. |
| `alleato-rag-health` | Daily 12:15 PM (`15 12 * * *`) | RAG meeting vectorization health check. Posts to Slack on failure. | `backend/src/services/health/rag_meeting_health.py` | Standard Python exit code (non-zero on failure). Posts to `SLACK_WEBHOOK_URL`. |

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
```

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
