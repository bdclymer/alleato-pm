# Worker Protocol

Mandatory protocol for every coding/testing session.

## Before Work

1. Claim a task in `session-board.md`.
2. Create handoff file from template:
   - `docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md`
3. Record:
   - task scope
   - expected outputs
   - files/modules owned

## During Work

Update the handoff at each milestone with:

- What changed
- Command evidence
- Risks discovered

## Required Intake Block (No Chat Relay Needed)

Each worker handoff must include this exact block so the leader can auto-review from files:

1) Session ID
2) Task ID
3) Current status: In Progress | Pending Review | Blocked
4) Files changed (absolute paths)
5) Commands run and outcome (pass/fail counts)
6) Evidence artifacts (screenshot/video/report/log paths)
7) Top 3 findings (frontend-visible issues first)
8) Recommended next action (one line)
9) Handoff file path

## Completion Rules

Do not mark complete without:

- command output summary
- artifact paths
- list of changed files
- next step for leader/reviewer

## Status Labels

- `In Progress`
- `Pending Review`
- `Needs Rework`
- `Accepted`
- `Blocked`

## Hard Stops

- If ownership conflicts appear, stop and request reassignment in `session-board.md`.
- If evidence is missing, do not claim done.
