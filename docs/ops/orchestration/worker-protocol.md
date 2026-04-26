# Worker Protocol

Mandatory protocol for every coding/testing session.

## Before Work

1. Confirm or create the Linear issue for the task.
2. If the work has independent slices, create Linear sub-issues before coding.
3. Claim exactly one Linear issue or sub-issue in `session-board.md`.
4. Create handoff file from template:
   - `docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md`
5. Record:
   - Linear issue ID and URL
   - task scope
   - expected outputs
   - files/modules owned
6. Post a kickoff comment to Linear with scope, owned paths, stop condition, and handoff path.

## During Work

Update the handoff at each milestone with:

- What changed
- Command evidence
- Risks discovered
- Evidence artifacts

Then run:

```bash
npm run linear:codex:comment -- docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md
```

Post the generated body to the linked Linear issue with the Linear connector.

## Required Intake Block (No Chat Relay Needed)

Each worker handoff must include this exact block so the leader can auto-review from files:

1) Session ID
2) Task ID
3) Linear issue
4) Linear URL
5) Current status: In Progress | Pending Review | Blocked
6) Files changed (absolute paths)
7) Commands run and outcome (pass/fail counts)
8) Evidence artifacts (screenshot/video/report/log paths)
9) Top 3 findings (frontend-visible issues first)
10) Recommended next action (one line)
11) Handoff file path

## Completion Rules

Do not mark complete without:

- command output summary
- artifact paths
- list of changed files
- next step for leader/reviewer
- Linear issue update comment

Run this before submitting:

```bash
npm run linear:codex:check -- docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md
```

## Status Labels

- `In Progress`
- `Pending Review`
- `Needs Rework`
- `Accepted`
- `Blocked`

## Hard Stops

- If ownership conflicts appear, stop and request reassignment in `session-board.md`.
- If evidence is missing, do not claim done.
- If there is no Linear issue, do not code until one exists.
