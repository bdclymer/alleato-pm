---
name: procore-complete
description: Canonical autonomous orchestrator for finalizing a Procore tool implementation using one normalized workflow with parallel subagents and strict release gates. Use when the user asks to complete, finalize, retest, or certify a Procore tool implementation for release-readiness.
---

# Procore Complete

Run the canonical Procore implementation finalization workflow end to end.

## Command Contract

Accept invocation in this shape:

`/procore-complete <feature> [--mode full|fast|retest] [--auto] [--project-id <id>] [--max-fix-loops <n>] [--allow-stale-artifacts] [--strict-retest]`

## Workflow Source of Truth

Resolve project root at runtime:

```bash
PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"
```

Always execute:

`$PROJECT_ROOT/.claude/commands/workflow/procore-finalization-orchestrator.md`

If any command or skill text conflicts with that file, the orchestrator file wins.

## Execution Contract

1. Parse args and initialize run context.
2. Execute phases in order:
- `INIT_COMMAND`
- `DISCOVER` (parallel subagents)
- `CAPTURE_SOURCE_OF_TRUTH`
- `RECONCILE_MANIFEST`
- `GAP_ANALYZE` (parallel subagents)
- `REMEDIATE` (autonomous fix loop)
- `VERIFY_IMPLEMENTATION`
- `FINALIZE_AND_REPORT`
3. Persist outputs under run root:
- `_bmad-output/planning-artifacts/<feature>/verification/runs/<run_id>/`
4. Update latest pointer:
- `_bmad-output/planning-artifacts/<feature>/verification/latest.json`
5. Enforce completion gate:
- `critical = 0`
- `high = 0`
- required verification flows pass
- quality checks pass

## Parallel Subagent Policy

Use parallel subagents for independent lanes:
- Discovery lanes (codebase vs Procore reference)
- Gap analysis lanes (db/api/ui)
- Remediation workers with non-overlapping write scopes

Do not parallelize live browser actions that share one session.

## Autonomous Policy

Default to autonomous execution.

Do not pause between phases unless an operation is destructive or there is true ambiguity that requires explicit human input.

## Required Final Output

Produce and report:
- `release-readiness.json`
- `08-final-summary.md`

Include:
- before/after completion percentages
- resolved vs remaining items by severity
- blockers or waivers with owner/date/approver/rationale
