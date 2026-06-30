# Project Intelligence Maintainer

Eve agent package for maintaining Alleato Project Intelligence health. This
agent orchestrates existing packet-first contracts; it does not replace packet
synthesis or compiler code.

## Source of truth

- Targets: `public.intelligence_targets`
- Packet compile timestamp: `intelligence_packets.generated_at`
- Target source watermark: `intelligence_targets.last_signal_at`
- Evidence proof: `insight_card_evidence`
- Compiler/refresh owner:
  `backend/src/services/intelligence/project_intelligence.py`
- Source lifecycle contract:
  `frontend/src/app/api/admin/source-sync/status/route.ts`

## Local commands

```bash
cd /Users/meganharrison/Documents/alleato-pm/agents/project-intelligence-maintainer
npm install
PATH="/opt/homebrew/opt/node@24/bin:$PATH" npm run info
PATH="/opt/homebrew/opt/node@24/bin:$PATH" npm run eval
```

`npm run eval` uses deterministic Eve fixtures and does not touch the app DB.
Use `PATH="/opt/homebrew/opt/node@24/bin:$PATH" npm run eval:live` only when
you intentionally want the live model and live tool path.

Direct comparison checks from the repo root:

```bash
cd /Users/meganharrison/Documents/alleato-pm
npm run rag:verify:project-intelligence-live-paths
npm run rag:verify:source-lifecycle
npm run rag:verify:project-intelligence-read-proof
```

## Tools

Read-only:

- `inspect_project_intelligence_targets`
- `check_packet_freshness`
- `check_source_coverage`
- `check_stale_project_data`
- `prove_packet_evidence`
- `summarize_maintainer_findings`

Approval-gated repair tools:

- `refresh_project_packet`
- `refresh_stale_project_packets`
- `recompute_source_intelligence`
- `retry_failed_packet_jobs`

Repair tools are dry-run/blocked in v1 unless a bounded scope is supplied and a
human approves the tool call. A repair is not complete until the tool reads back
`intelligence_packets`, source coverage, evidence counts, and failed jobs.

## Schedule

`agent/schedules/weekday-maintainer-scan.ts` runs on weekdays at 13:00 UTC and
hands the maintainer scan to the Eve Linear Agent Session channel.

Required delivery environment:

```bash
EVE_PROJECT_INTELLIGENCE_LINEAR_ISSUE_ID=AAI-774
LINEAR_AGENT_ACCESS_TOKEN=...
LINEAR_WEBHOOK_SECRET=...
```

The Linear channel also accepts `LINEAR_ACCESS_TOKEN` or `LINEAR_API_KEY` as an
access-token fallback, but `LINEAR_AGENT_ACCESS_TOKEN` is preferred because Eve's
Linear channel posts native Agent Activities.

If any delivery value is missing, the schedule logs a blocked delivery message
with the missing configuration flags and exits without claiming success. The
schedule does not mutate Project Intelligence data; repair tools still require
bounded scope and human approval.

## Failure contract

Every failing or blocked result reports:

- cause
- detection gap
- prevention step
- owner file/table
- exact command/API path when available
- next action

Tool outputs are compact and redact common token, key, DSN, and database URL
patterns.
