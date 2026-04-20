---
description: Run a seeded test suite (smoke or feature) for an Alleato tool in agent-browser watch mode.
argument-hint: <tool> [smoke|feature]
---

Run the test-scenario-run skill at `.claude/skills/testing/test-scenario-run/SKILL.md`.

Read that skill file first, then follow its Process (Phase 0 + the 9 runner steps) exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — a slug that has a seeded suite (e.g. `commitments`, `budget`)
- optional suite: `smoke` (default) | `feature`

Examples:
- `/test-scenario-run commitments`
- `/test-scenario-run budget feature`
