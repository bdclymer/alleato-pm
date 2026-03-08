# Audit Governance

## Audit Levels

1. File-level check: run during implementation for touched pages/components.
2. Full design audit: run before release and after large UI migrations.

## Recommended Cadence

1. Per PR: design check on changed files.
2. Weekly: full audit of `frontend/src/app/(main)/`.
3. Pre-release: full audit + fix loop until no critical/high violations remain.

## Severity Policy

1. Critical: must be fixed before merge.
2. High: must be fixed before merge unless explicitly deferred with owner/date.
3. Medium/Low: can defer with issue link and target sprint.

## Required Artifacts

1. Rules: `.claude/design-audit/design-system-rules.md`
2. Latest report: `docs-ai/contents/docs/reports/design-audit-2026-03-07.md`
3. Violations log: `.claude/design-audit/violations.json`

## Deferred Violation Process

For each deferment include:

1. Violation ID
2. Reason blocked
3. Owner
4. Target date
5. Replacement ticket/link
