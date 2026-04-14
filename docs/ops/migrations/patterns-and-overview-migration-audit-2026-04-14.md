# Migration Audit — Legacy Patterns And Project Overview

Date: 2026-04-14
Scope:

- `docs/patterns`
- `docs/project-overview`

## Executive Assessment

- `docs/patterns` contains high-value failure history and prevention logic, but has duplication and at least one critical guidance conflict.
- `docs/project-overview` is high-value as reference context, but portions are stale and should not be treated as source-of-truth without validation dates.
- Recommendation: migrate selectively, preserve history, and add explicit deprecation markers for stale or conflicting docs.

## Keep / Migrate / Archive Decisions

### docs/patterns

| File | Decision | Reason | Action |
|---|---|---|---|
| `readme.md` | Rewrite | References `.agents/patterns` path that is not current canonical location | Replace with `docs/ops` conventions |
| `overview.md` and `PATTERNS.md` | Merge then deprecate duplicate | Same content duplicated; increases drift risk | Keep one canonical pattern index in `docs/ops/patterns/` |
| `HISTORICAL-ISSUES-AND-PREVENTION-STRATEGIES.md` | Migrate (curated) | Valuable incident context and prevention thinking | Extract repeatable guardrails into `lessons/` |
| `INCIDENT-LOG.md` | Keep as historical log | High signal for recurring failures and trust/process issues | Keep read-only; use new weekly logs for ongoing work |
| `error-patterns.md` | Migrate with validation pass | Strong anti-pattern catalog; needs freshness checks | Port validated entries to `docs/ops/patterns/` with dates |
| `playwright-patterns.md` | Partial migrate, partial reject | Contains useful selectors/auth examples but conflicts on wait strategy (`networkidle`) | Keep valid parts; remove conflicting wait guidance |
| `index.json` | Optional keep | Useful for future automation indexing | Keep if auto-injection automation is planned |
| domain-specific error files (`errors/*`, `solutions/*`) | Migrate selectively | Many entries are actionable and reusable | Move proven entries and tag by validation date |

### docs/project-overview

| File | Decision | Reason | Action |
|---|---|---|---|
| `index.md` | Keep as top-level catalog | Good map of docs and system surfaces | Add validation timestamp + stale sections disclaimer |
| `project-overview.md` | Keep with refresh cycle | Useful executive snapshot but generated and date-bound | Add quarterly refresh owner/checklist |
| `project-context.md` | Keep, but treat as policy snapshot | Strong ruleset but can drift from code and AGENTS/CLAUDE docs | Cross-link with canonical guardrails file and last-verified date |
| `development-guide.md` | Keep with spot validation | Useful commands and workflow; can drift quickly | Validate critical commands monthly |
| `technology-stack.md` | Keep with strict freshness note | High-value architecture references with version drift risk | Add generated date + trust boundaries at top |
| `source-tree-analysis.md` | Keep as orientation artifact | Good onboarding aid, not source-of-truth | Mark as approximate structure snapshot |
| `SOLUTIONS.md` | Merge into new lessons/patterns where relevant | Useful fixes but may duplicate incident content | Extract active fixes into `docs/ops` and retain old file as archive |

## High-Value Content To Reuse Immediately

1. Route naming and route conflict prevention rules.
2. Supabase type regeneration + FK type validation workflow.
3. Evidence-based completion requirement (no "fixed" without runtime proof).
4. Auth fixture usage and selector specificity patterns for Playwright.
5. Incident-to-guardrail loop (root cause, detection gap, prevention step).

## Content To Deprecate Or Correct

1. Playwright guidance advocating `waitForLoadState('networkidle')` where project standards require `domcontentloaded`.
2. Any references to stale paths like `.agents/patterns` when `docs/ops` is canonical.
3. Configuration claims that conflict with current code (for example provider or gateway assumptions) unless re-verified.

## Migration Plan

1. Create canonical docs in `docs/ops` (done).
2. Port validated patterns in small batches with `Last validated` dates.
3. Add deprecation headers to replaced legacy docs.
4. Add PR checklist item: update `current-state`, weekly log, and any affected lesson/ADR.
