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
npx eve info
npx eve eval
```

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

`agent/schedules/weekday-maintainer-scan.ts` is a report-only weekday handler
schedule. It does not mutate data or send notifications in v1. Wire Slack or
Linear delivery by adding a channel and handing the schedule run to that channel;
the maintainer tools do not need to change.

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
