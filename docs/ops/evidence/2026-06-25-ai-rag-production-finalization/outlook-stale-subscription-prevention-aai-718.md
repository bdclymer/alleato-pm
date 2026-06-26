# AAI-718 Outlook Stale Subscription Prevention Evidence

Generated: 2026-06-26T12:58:44Z

## Render Configuration Read-Back

- `alleato-graph-subscription-reconcile`: `MICROSOFT_SYNC_USERS` present, 11 users, includes `mharrison@alleatogroup.com`, includes `cgillespie@alleatogroup.com`, missing expected users `[]`.
- `alleato-graph-sync`: `MICROSOFT_SYNC_USERS` present, 11 users, includes `mharrison@alleatogroup.com`, includes `cgillespie@alleatogroup.com`, missing expected users `[]`.
- `alleato-teams-dm-sync`: `MICROSOFT_SYNC_USERS` present, 11 users, includes `mharrison@alleatogroup.com`, missing expected users `[]`.
- `alleato-teams-channel-sync`: `MICROSOFT_SYNC_USERS` present, 11 users, includes `mharrison@alleatogroup.com`, missing expected users `[]`.
- `alleato-source-sync-health`: `MICROSOFT_SYNC_USERS` present, 11 users, includes `mharrison@alleatogroup.com`, missing expected users `[]`.

Expected users:

```text
bclymer@alleatogroup.com
acannon@alleatogroup.com
awehner@alleatogroup.com
crusin@alleatogroup.com
accounting@alleatogroup.com
ctragesser@alleatogroup.com
jdawson@alleatogroup.com
mparsons@alleatogroup.com
njepson@alleatogroup.com
cgillespie@alleatogroup.com
mharrison@alleatogroup.com
```

## Live Subscription Reconcile

Manual Render cron trigger:

```json
{
  "service": "alleato-graph-subscription-reconcile",
  "trigger": "manual",
  "run": {
    "id": "crn-d8qo05egvqtc73e1fd30-1782478358",
    "status": "pending",
    "triggeredBy": "support@megankharrison.com"
  }
}
```

Local production-helper repair using Render webhook env values:

```json
{
  "checked": 11,
  "created": 1,
  "renewed": 0,
  "skipped": 10,
  "failed": 0,
  "stale_removed": 0,
  "errors": []
}
```

Note: Microsoft Graph returned 404 while deleting Megan's expired old subscription id, so the helper continued with a fresh create. This is expected stale-ID behavior and is now covered by the helper tests.

## Strict Subscription Verifier

Command:

```bash
bash -lc 'set -a; source /Users/meganharrison/Documents/alleato-pm/.env; set +a; export MICROSOFT_SYNC_USERS="bclymer@alleatogroup.com,acannon@alleatogroup.com,awehner@alleatogroup.com,crusin@alleatogroup.com,accounting@alleatogroup.com,ctragesser@alleatogroup.com,jdawson@alleatogroup.com,mparsons@alleatogroup.com,njepson@alleatogroup.com,cgillespie@alleatogroup.com,mharrison@alleatogroup.com"; npm run verify:graph-subscriptions -- --json'
```

Result:

```json
{
  "ok": true,
  "checkedAt": "2026-06-26T12:56:56.383Z",
  "source": "outlook_email",
  "minActiveSubscriptions": 11,
  "expectedTargetCount": 11,
  "missingActiveTargets": [],
  "subscriptionCount": 11,
  "activeSubscriptionCount": 11,
  "staleSubscriptionCount": 0,
  "unconfiguredSubscriptionCount": 0,
  "syncStateCount": 12,
  "erroredSyncStateCount": 0
}
```

## Megan Mailbox Sync Proof

First scoped mailbox sync:

```json
{
  "status": "succeeded",
  "user_email": "mharrison@alleatogroup.com",
  "items_synced": 7,
  "persisted_delta": 7,
  "delta_token_saved": true,
  "error": null,
  "reason": "manual_stale_subscription_prevention_verification"
}
```

Second scoped mailbox sync after ledger-path correction:

```json
{
  "status": "succeeded",
  "user_email": "mharrison@alleatogroup.com",
  "items_synced": 0,
  "persisted_delta": 0,
  "delta_token_saved": true,
  "error": null,
  "reason": "manual_stale_subscription_prevention_ledger_verification"
}
```

Live read-back:

```json
{
  "syncState": {
    "source": "outlook_email",
    "resource_id": "mharrison@alleatogroup.com",
    "resource_name": "Outlook: mharrison@alleatogroup.com",
    "sync_status": "success",
    "last_sync_at": "2026-06-26T12:57:54.566226+00:00",
    "items_synced": 0,
    "error_message": null
  },
  "latestRun": {
    "source": "outlook_email",
    "resource_id": "mharrison@alleatogroup.com",
    "stage": "source_sync",
    "status": "succeeded",
    "started_at": "2026-06-26T12:57:51.566721+00:00",
    "finished_at": "2026-06-26T12:57:54.837861+00:00",
    "items_seen": 0,
    "items_synced": 0,
    "items_failed": 0,
    "error_message": null,
    "metadata": {
      "reason": "manual_stale_subscription_prevention_ledger_verification",
      "persisted_delta": 0
    }
  }
}
```

## Delegated Verification

Subagent `019f0402-449c-7060-92c3-08b4295a2db3` reported PASS:

```text
PYTHONPATH=backend /Users/meganharrison/Documents/alleato-pm/backend/.venv/bin/python -m pytest backend/tests/test_graph_subscriptions.py backend/tests/test_source_sync_health.py -q
29 passed, 6 warnings in 0.05s

PYTHONPATH=backend /Users/meganharrison/Documents/alleato-pm/backend/.venv/bin/python -m py_compile backend/src/services/integrations/microsoft_graph/subscriptions.py backend/src/services/health/source_sync_health.py backend/tests/test_graph_subscriptions.py backend/tests/test_source_sync_health.py
PASS

node --check scripts/verify/verify_graph_subscriptions.mjs
PASS
```

Warnings were FastAPI `on_event` deprecations in `backend/src/api/main.py`, unrelated to this slice.

## DB Pressure Guard

A full `run_graph_sync` attempt was blocked by the existing app DB pressure guard:

```text
App DB pressure guard blocked graph_sync: total_connections=42>35
```

This is expected protection. The scoped mailbox delta sync was used instead and succeeded.
