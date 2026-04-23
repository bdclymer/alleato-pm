---
description: Run the full browser-based feature test suite for an Alleato tool using agent-browser. Screenshots at key points, video on failure, results persisted to Supabase.
argument-hint: <tool> [--case N.N.N] [--priority HIGH|MEDIUM|LOW] [--video]
---

Run the test-scenario-run-feature skill at `.claude/skills/testing/test-scenario-run-feature/SKILL.md`.

Read that skill file first, then follow its steps exactly for `$ARGUMENTS`.

Expected arguments:
- `<tool>` — a tool slug that has a seeded feature suite (e.g. `commitments`, `invoicing`)
- `--case N.N.N` — run a single case by number (optional)
- `--priority HIGH|MEDIUM|LOW` — filter by priority (optional)
- `--video` — record video for all cases, not just failures (optional)

Examples:
- `/test-scenario-run-feature invoicing`
- `/test-scenario-run-feature commitments --priority HIGH`
- `/test-scenario-run-feature budget --case 1.1.1`
- `/test-scenario-run-feature change-events --video`
