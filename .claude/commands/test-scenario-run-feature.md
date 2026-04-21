---
description: Run the full browser-based feature test suite for an Alleato tool using agent-browser. Screenshots after every step for ALL cases. Video recording per case, saved for ALL failures. Evidence gate blocks marking any FAIL without proof.
argument-hint: <tool> [--case N.N.N] [--priority HIGH|MEDIUM|LOW]
---

Run the test-scenario-run-feature skill at `.claude/skills/testing/test-scenario-run-feature/SKILL.md`.

Read that skill file first, then follow every step exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — tool slug to test (e.g. `commitments`, `budget`, `change-events`)
- `--case N.N.N` — run a single test case by test_number
- `--priority HIGH|MEDIUM|LOW` — filter cases by priority

Examples:
- `/test-scenario-run-feature commitments`
- `/test-scenario-run-feature budget --priority HIGH`
- `/test-scenario-run-feature change-events --case 1.2.3`
