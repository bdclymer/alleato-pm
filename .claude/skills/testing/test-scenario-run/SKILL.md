---
name: test-scenario-run
description: >
  Dispatcher: run smoke tests, feature tests, or both for an Alleato tool.
  Delegates to test-scenario-run-smoke and/or test-scenario-run-feature.
  Use when: "test X", "run tests for X", "smoke test X", "feature test X".
argument-hint: <tool> [smoke|feature|all]
---

# test-scenario-run (dispatcher)

This skill routes to the correct sub-skill based on the suite argument.

## Routing

| Invocation | What runs |
|------------|-----------|
| `/test-scenario-run <tool>` | smoke only (default) |
| `/test-scenario-run <tool> smoke` | smoke only |
| `/test-scenario-run <tool> feature` | feature only |
| `/test-scenario-run <tool> all` | smoke first, then feature |

## How to dispatch

### smoke or default

Read `.claude/skills/testing/test-scenario-run-smoke/SKILL.md` and follow it for `<tool>`.

### feature

Read `.claude/skills/testing/test-scenario-run-feature/SKILL.md` and follow it for `<tool>`.

### all

Run smoke first (full completion), then run feature. Two separate `test_runs` rows, two separate reports.

## Flags passthrough

`--case N.N.N` and `--priority HIGH|MEDIUM|LOW` pass through to the feature skill only (smoke has no individual cases).

## Sub-skill locations

- Smoke: `.claude/skills/testing/test-scenario-run-smoke/SKILL.md`
- Feature: `.claude/skills/testing/test-scenario-run-feature/SKILL.md`
- Fix: `.claude/skills/testing/test-scenario-fix/SKILL.md` — run after feature/smoke to fix failures
