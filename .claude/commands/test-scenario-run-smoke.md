---
description: Fast API sweep for an Alleato tool — curls all GET endpoints, flags 500s, persists results to Supabase. Takes < 30s. No browser required unless a 500 is found.
argument-hint: <tool>
---

Run the test-scenario-run-smoke skill at `.claude/skills/testing/test-scenario-run-smoke/SKILL.md`.

Read that skill file first, then follow its steps exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — a tool slug (e.g. `commitments`, `invoicing`, `change-events`)

Examples:
- `/test-scenario-run-smoke invoicing`
- `/test-scenario-run-smoke change-events`
