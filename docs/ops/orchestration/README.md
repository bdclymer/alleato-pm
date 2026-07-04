# Codex Orchestration Control Plane

This directory is the repo-side control plane for multi-session Codex work.

Use these files together:

- `session-board.md`: one active row per session with explicit ownership
- `review-queue.md`: pending review, accept/reject, and rework queue
- `leader-runbook.md`: leader responsibilities and operating loop
- `worker-protocol.md`: worker claiming, handoff, and resume contract

Rules:

1. Every active worker must claim exactly one row in `session-board.md` before coding.
2. Every worker must maintain one handoff doc with evidence and next action.
3. No session is “done” until its review item is accepted in `review-queue.md`.
4. The command center route reads these files directly. Missing or malformed
   entries should be treated as a broken control plane, not as empty work.
5. Linear owns issue truth; these files own current execution state and evidence.
