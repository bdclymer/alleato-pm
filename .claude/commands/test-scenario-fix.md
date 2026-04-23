---
description: Fix all FAIL results from a test-scenario-run. Reads failures, diagnoses from screenshots/notes, fixes code, re-runs until all pass.
argument-hint: <tool> [--run <run_id>] [--case N.N.N]
---

Run the test-scenario-fix skill at `.claude/skills/testing/test-scenario-fix/SKILL.md`.

Read that skill file first, then follow its process exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — the tool slug with failing test results (e.g. `change-events`, `budget`)
- optional `--run <run_id>` — target a specific run ID
- optional `--case N.N.N` — fix a single case (e.g. `--case 2.1.3`)

Examples:
- `/test-scenario-fix change-events`
- `/test-scenario-fix budget --run abc123`
- `/test-scenario-fix commitments --case 3.2.1`
