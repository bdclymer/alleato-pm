# Leader Runbook

Use this in the single leader session only.

## Goal

Create order across parallel sessions by controlling ownership, evidence, and acceptance.

## Start Of Day

1. Open `docs/ops/memory/current-state.md`.
2. Reset/confirm `session-board.md` statuses.
3. Prioritize top tasks and assign one owner per task.
4. Ensure each task has a clear definition of done.

## Assignment Rules

- One worker session = one active task.
- Do not assign overlapping file ownership unless explicitly coordinated.
- Every assignment must include:
  - Scope
  - Required evidence
  - Stop condition

## Review Rules

A handoff is `Accepted` only if it includes:

- Exact commands run
- Pass/fail outcome summary
- Artifact paths (logs/screenshots/reports)
- Files changed
- Known risks and next step

If any are missing, mark `Needs Rework` with explicit reason.

## Fast Intake (No Manual Copy/Paste)

Use filesystem-driven intake instead of chat relays:

```bash
node scripts/ops/worker-status.mjs
# Optional date override:
node scripts/ops/worker-status.mjs 2026-04-14
```

This reports missing handoff sections per worker session so you can disposition quickly.

## Enforcement

- Worker cannot start a new task while previous handoff is `Pending Review` or `Needs Rework`.
- Unclaimed work is invalid and not merged.
- "Fixed" without evidence is automatically rejected.

## End Of Day

1. Move unresolved items into tomorrow's priorities.
2. Confirm `review-queue.md` statuses are current.
3. Update `docs/ops/memory/current-state.md`.
4. Add a weekly log entry in `docs/ops/logs/`.
