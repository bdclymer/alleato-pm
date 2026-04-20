---
name: test-scenario-audit
description: Regenerate smoke + feature test suites for a given Alleato tool (seeds Supabase, writes consolidated markdown).
argument-hint: <tool> [smoke|feature|all]
---

Run the test-scenario-audit skill at `.claude/skills/testing/test-scenario-audit/SKILL.md`.

Read that skill file first, then follow its Process (Steps 1–8) exactly for tool `$ARGUMENTS`.

Expected arguments:
- `<tool>` — a slug from `procore_tools.slug` (e.g. `budget`, `commitments`, `rfis`, `change-events`)
- optional mode: `smoke` | `feature` | `all` (default `all`)

Examples:
- `/test-scenario-audit change-events`
- `/test-scenario-audit budget smoke`
- `/test-scenario-audit rfis feature`
