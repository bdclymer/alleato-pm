# Inbox Agent — Task List

## Accurate Diagnosis

Everything is more complete than expected. Here is what actually exists vs what's broken.

### What Exists and Works (Do Not Rebuild)

| Component | File | Notes |
|-----------|------|-------|
| 15-min scheduled exec assistant cron | `render.yaml` → `alleato-microsoft-executive-assistant-check` | Runs every 15 min |
| Executive assistant agent | `agents/microsoft_executive_assistant/agent.py` | LLM-driven, reads inbox live |
| Live inbox read via Graph | `tools.py::read_live_outlook_inbox` → `live_mail.py::list_live_outlook_inbox` | No webhooks needed |
| Email draft tool (preview JSON) | `tools.py::draft_outlook_email_for_review` | Returns payload for review |
| Teams message draft tool (preview JSON) | `tools.py::draft_teams_message_for_review` | Returns payload for review |
| Inbox triage skill | `runtime/skills/inbox-triage/SKILL.md` | Full classification logic |
| Webhook notification handler | `webhooks.py::handle_graph_notifications` | FastAPI route exists |
| Subscription lifecycle | `subscriptions.py::ensure_subscriptions` | Code complete |
| Webhook-triggered exec assistant | `triggers.py::run_outlook_event_microsoft_executive_assistant` | Code complete, gated by env var |
| Graph subscription table | `graph_subscriptions` in RAG DB | Schema exists |

### What Is Broken / Missing

**Root cause of "stopped working":** The agent runs but its draft/alert actions are never
executed — `draft_outlook_email_for_review` and `draft_teams_message_for_review` produce
preview JSON payloads that are only logged by the cron script. Nothing actually writes to
Outlook Drafts or sends a Teams DM. The agent's `actions[]` are never acted upon.

**Additional gaps:**
1. No Graph subscription reconcile cron → real-time webhooks never activate
2. `draft_outlook_email_for_review` doesn't call Graph API — it returns JSON only
3. `draft_teams_message_for_review` doesn't send Teams message — it returns JSON only
4. No Outlook categories written back to mailbox items
5. No daily email digest (daily_digest.py is meetings-only)

---

## Tasks

### Task 0 — Verify env vars are set in Render [IMMEDIATE CHECK]

The 15-min cron will silently return `"blocked"` if `MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX`
is not set in the Render dashboard (it's `sync: false`, meaning Render-managed, not in this
repo).

- [ ] Verify `MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX` is set to `bclymer@alleatogroup.com` in
  Render for `alleato-microsoft-executive-assistant-check`
- [ ] Verify `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` are set
  in Render for the same cron
- [ ] Check recent cron logs: Render dashboard → `alleato-microsoft-executive-assistant-check`
  → latest run → confirm status is `"completed"` not `"blocked"` or `"failed"`

---

### Task 1 — Wire the agent's draft actions to actual Graph API calls [BACKEND]
**This is the core missing piece — the agent thinks it drafts, but nothing actually executes.**

The `run_scheduled_microsoft_executive_assistant_check` function calls the agent and gets back
a response with `actions[]`. Those actions currently just get printed and discarded.

**1a — Create Outlook draft via Graph API**
- [ ] Add `create_outlook_draft_reply(mailbox, reply_to_message_id, subject, body) -> dict`
  to `outlook.py` using:
  - `POST /users/{mailbox}/messages/{id}/createReply` to create a threaded draft
  - `PATCH /users/{mailbox}/messages/{draft_id}` to set the body
- [ ] Update `draft_outlook_email_for_review` in `tools.py` to actually call the Graph API
  when `reply_to_graph_message_id` is provided (threaded reply) or create a standalone draft
  otherwise, using `POST /users/{mailbox}/messages` with `isDraft: true`
- [ ] Only create the draft if the agent's action payload has `approvalRequired: false` OR
  use a new `MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_DRAFT` flag (default `"true"`) to allow
  automatic draft creation

**1b — Send urgent Teams alerts via existing bot**
- [ ] Update `draft_teams_message_for_review` in `tools.py` to actually send the Teams DM
  for `urgency: "urgent"` items using the existing Teams bot infrastructure
  (`teams.py::send_teams_dm` or equivalent)
- [ ] Add `MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_TEAMS_ALERT` flag (default `"true"`) to
  control this — only auto-send for `urgency: "urgent"`, not `"normal"`
- [ ] Gate: never auto-send if the same subject/sender was alerted in the last 2 hours
  (check `outlook_email_intake.teams_alert_sent_at` or a simple in-memory dedup on the
  cron run)

---

### Task 2 — Add subscription reconcile cron [RENDER CONFIG]
**Required for real-time webhook delivery (<30 sec) instead of 15-min polling.**

Currently there is no cron to create/renew Graph subscriptions. The scheduler code exists
in `subscriptions.py::ensure_subscriptions` but the APScheduler that was supposed to call
it is disabled (`DISABLE_SCHEDULER: "true"` on alleato-backend).

- [ ] Add new cron in `render.yaml`: `alleato-graph-subscription-reconcile`
  - Schedule: `0 */6 * * *` (every 6 hours — subscriptions last 48 hours for mail)
  - Command: call `ensure_subscriptions` from `subscriptions.py`
  - Env vars needed: `GRAPH_WEBHOOK_NOTIFICATION_URL`, `GRAPH_WEBHOOK_CLIENT_STATE`,
    `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`, `MICROSOFT_SYNC_USERS`
- [ ] Set `GRAPH_WEBHOOK_NOTIFICATION_URL` in Render to
  `https://alleato-backend-rbnj.onrender.com/api/graph/webhooks/notifications`
- [ ] Set `GRAPH_WEBHOOK_CLIENT_STATE` in Render to a secure random string
- [ ] Flip `GRAPH_SUBSCRIPTIONS_ENABLED` in the backend web service from `"false"` → `"auto"`
  (so the webhook endpoint can receive and queue notifications)
- [ ] Flip `GRAPH_WEBHOOK_DRAIN_ENABLED` from `"false"` → `"auto"` on the backend web service
- [ ] Wire `run_outlook_event_microsoft_executive_assistant` into the webhook drain path in
  `webhooks.py` or `sync.py` so real-time notifications trigger the exec assistant

---

### Task 3 — Add triage columns and Outlook category write-back [DB + BACKEND]

- [ ] Migration: add to `outlook_email_intake`:
  - `triage_action text` — `urgent | reply_needed | delegate | fyi | delete | watch`
  - `triage_reason text`
  - `triage_at timestamptz`
  - `teams_alert_sent_at timestamptz`
- [ ] Run `npm run db:types` after migration
- [ ] After exec assistant classifies an email, write `triage_action` + `triage_reason` +
  `triage_at` back to `outlook_email_intake` by `graph_message_id`
- [ ] Add `patch_message_categories(mailbox, message_id, categories)` to `outlook.py`
  using `PATCH /users/{mailbox}/messages/{id}` with `{"categories": [...]}`
- [ ] Map triage actions → Outlook category names and call after triage write

---

### Task 4 — Daily email digest via Teams [BACKEND + RENDER]

- [ ] Add `generate_email_digest(mailbox, date) -> str` to `daily_digest.py` that queries
  `outlook_email_intake` grouped by `triage_action` for the prior day
- [ ] Format as structured Teams message:
  - `⚡ Urgent (N)` — subjects + senders
  - `↩ Reply Needed (N)` — subjects + senders
  - `→ Delegate (N)` — count
  - `📋 FYI/Watch (N)` — count
  - `📬 Total unread` — count
- [ ] Wire into the existing `alleato-daily-recap` cron or add a new `alleato-email-digest`
  cron at 7:00 AM ET (`12 0 * * *` UTC)
- [ ] Send via Teams DM using existing Teams bot

---

## Order of Operations

1. **Task 0** — Check Render dashboard. If `MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX` isn't set,
   that's the entire reason "it stopped." Fix that first, verify the 15-min cron succeeds.
2. **Task 1** — Make draft/alert actions actually execute (biggest ROI, agent already works).
3. **Task 2** — Add subscription reconcile cron for real-time delivery.
4. **Task 3** — DB migration + Outlook category write-back (nice polish).
5. **Task 4** — Daily digest (last, least urgent).

---

## Key Env Vars (verify in Render)

| Cron service | Var | Required value |
|---|---|---|
| `alleato-microsoft-executive-assistant-check` | `MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX` | `bclymer@alleatogroup.com` |
| `alleato-microsoft-executive-assistant-check` | `MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED` | `"true"` ✅ already set |
| `alleato-microsoft-executive-assistant-check` | `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID` | Must be set via `sync: false` |
| `alleato-backend` (web) | `MICROSOFT_EXECUTIVE_ASSISTANT_WEBHOOK_ENABLED` | `"true"` ✅ already set |
| New subscription reconcile cron | `GRAPH_WEBHOOK_NOTIFICATION_URL` | `https://alleato-backend-rbnj.onrender.com/api/graph/webhooks/notifications` |
| New subscription reconcile cron | `GRAPH_WEBHOOK_CLIENT_STATE` | Secret random string |
