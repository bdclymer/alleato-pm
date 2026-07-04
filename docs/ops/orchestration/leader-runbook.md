# Leader Runbook

Use this runbook when one Codex session is coordinating other worker sessions.

## Responsibilities

1. Prioritize work into explicit initiatives and child tasks.
2. Ensure every active worker has one non-overlapping ownership slice.
3. Update `session-board.md` before or when work is assigned.
4. Route every pending handoff into `review-queue.md`.
5. Accept, reject, or re-scope review items with concrete notes.
6. Keep Linear issue state and repo-side evidence aligned.

## Review Loop

Run this loop every 30 to 60 minutes when multiple sessions are active:

1. Check `session-board.md` for stale `Last update` timestamps.
2. Run `npm run worker-status` to validate handoff completeness.
3. Open any `Pending Review` items in `review-queue.md`.
4. Accept only when the evidence is independently believable.
5. Reject with an explicit rework note when status claims are vague, evidence is
   missing, or scope drift occurred.

## Acceptance Standard

Accept only if the review item includes:

- clear owned scope
- linked Linear issue
- linked task doc or handoff
- exact commands and outcome
- evidence artifact path
- next action or explicit closeout state

## Failure-Loudly Rule

If a worker does not have a board row, handoff, or review item, treat that as
invalid progress and fix the control plane first.
