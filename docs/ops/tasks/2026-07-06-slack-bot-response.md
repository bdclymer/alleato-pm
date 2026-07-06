# Task: Slack bot response wiring

Status: In Progress
Owner: Codex
Created: 2026-07-06
Linear Issue: Not created - single-session provider/runtime verification
Related Handoff: Not created - single-session verification

## Objective

Make the Chat SDK Slack bot respond in the intended Alleato PM Slack channel,
starting from the newly added local Slack credentials and proving the inbound
and outbound path separately.

## Scope Checklist

- [x] Confirm local Slack env vars are present without exposing secrets.
- [x] Confirm Slack bot token can authenticate and post outbound.
- [x] Identify the target Slack channel.
- [x] Confirm inbound Slack event delivery reaches the active runtime.
- [x] Confirm the runtime has Slack credentials loaded.
- [x] Record whether production Vercel env/redeploy is required.

## Verification Checklist

- [x] Slack `auth.test` succeeds with token-safe output.
- [x] Slack `chat.postMessage` succeeds in the target channel.
- [x] Local `/api/bot/slack` receives a signed app mention event.
- [x] App mention receives an AI response or fails with a concrete error.

## Acceptance Criteria

- The target channel is known by name and ID.
- The bot can send to the target channel.
- The reason a user mention did not receive a response is identified with
  evidence.
- If a provider/runtime change is required, it is applied through CLI/API and
  verified with a read-back, or explicitly marked blocked with the missing
  capability.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Local env presence | Node read of `frontend/.env.local` | Pass | `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` present; values not printed. |
| Slack auth | Slack Web API `auth.test` | Pass | Bot identity is `nash` in workspace `Megan Harrison LLC`. |
| Channel membership | Slack Web API `conversations.list` | Pass | Bot is a member of private `#leo-proj-alleato-pm` (`C0AF59GQ9B9`). |
| Outbound message | Slack Web API `chat.postMessage` | Pass | Message posted to `C0AF59GQ9B9` at `1783312984.845269`. |
| Signed URL verification | Local signed POST to `http://127.0.0.1:3001/api/bot/slack` | Pass | Route returned the expected challenge response. |
| Unmapped-user failure | Signed synthetic `app_mention` to local route | Pass | Route acknowledged, then posted a fail-loud unlinked-account message instead of silently dying. |
| Slack user mapping | Supabase REST upsert to `bot_user_mappings` | Pass | `slack:U04TJGRRL` mapped to the matching `megan@megankharrison.com` profile. |
| AI reply proof | Replayed signed app mention using real Slack message timestamp `1783313111.566889` | Pass | Bot replied in the Slack thread at `1783313799.415219`. |
| Vercel env add | `vercel env add SLACK_BOT_TOKEN production` and `vercel env add SLACK_SIGNING_SECRET production` | Pass | Secret values were piped from local env and not printed. |
| Vercel env read-back | `vercel env ls --scope team_lZighRY9Xpkb6qZBqDApczKZ` | Pass | Production shows `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` as encrypted env vars. |

## Risks / Gaps

- Local `.env.local` changes do not affect an already-running dev server.
- Local `.env.local` changes do not affect Vercel production.
- Slack can only deliver event callbacks to a public HTTPS request URL, not to
  `localhost` unless a tunnel is configured in the Slack app.
- A synthetic Slack event with a fake timestamp is useful for route ack testing
  but cannot prove `thread.post`, because Slack rejects fake roots with
  `invalid_thread_ts`.
- Production needs a redeploy after adding Vercel env vars before Slack events
  can use the new runtime configuration.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and
  next action.
- [ ] Final response includes what is done, what remains, and recommended next
  steps.
