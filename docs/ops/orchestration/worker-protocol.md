# Worker Protocol

Follow this protocol for any active Codex worker session.

## Before Coding

1. Claim exactly one row in `session-board.md`.
2. Link the active Linear issue and the task or handoff path.
3. Record the owned paths precisely enough that another session can avoid
   overlap.

## During Work

1. Keep scope narrow. Do not self-expand into adjacent initiatives.
2. Update `Last update`, `Current status`, and `Next checkpoint` when the state
   materially changes.
3. If the work turns into a different slice, stop and re-claim the board entry.

## Handoff Rules

1. Every worker must create or update a handoff using
   `docs/ops/handoffs/HANDOFF-TEMPLATE.md`.
2. The handoff must include:
   - Session ID
   - Task ID
   - Linear issue
   - Current status
   - Files changed or owned paths
   - Commands run and outcome
   - Evidence artifacts
   - Top findings
   - Recommended next action
3. Before review, run:

```bash
npm run linear:codex:check -- docs/ops/handoffs/<file>.md
```

## Resume Standard

Write the handoff so another session or another computer can resume without
re-reading the full thread. If the next worker still needs to rediscover the
scope, the handoff is incomplete.
