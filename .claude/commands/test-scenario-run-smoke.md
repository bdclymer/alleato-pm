---
description: Fast API endpoint sweep for an Alleato tool — discovers all GET routes, curls each one, flags 500s, screenshots failures, persists results to Supabase. Runs in under 30 seconds.
argument-hint: <tool>
---

Run the test-scenario-run-smoke skill at `.claude/skills/testing/test-scenario-run-smoke/SKILL.md`.

Read that skill file first, then follow every step exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — tool slug to sweep (e.g. `commitments`, `budget`, `change-events`)

Examples:
- `/test-scenario-run-smoke commitments`
- `/test-scenario-run-smoke budget`
