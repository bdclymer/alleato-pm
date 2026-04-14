# Migration Audit — Patterns Batch 2

Date: 2026-04-14
Scope:

- `docs/patterns/errors/fk-constraint-user.md`
- `docs/patterns/solutions/*`

## Outcome Summary

- Migrated: FK profile guard and navigation helper conventions.
- Adapted (not directly adopted): verification-gate checksum tooling.
- Deprecated legacy files with canonical replacements.

## Decisions

| Legacy File | Decision | Canonical Destination | Notes |
|---|---|---|---|
| `docs/patterns/errors/fk-constraint-user.md` | Migrated | `docs/ops/patterns/fk-created-by-profile-guard.md` | Kept core FK guard, removed stale references |
| `docs/patterns/solutions/domcontentloaded-pattern.md` | Migrated | `docs/ops/patterns/playwright-navigation-helpers.md` + `playwright-navigation-wait-strategy.md` | Kept helper approach and wait strategy |
| `docs/patterns/solutions/auth-fixture-pattern.md` | Already covered | `docs/ops/patterns/playwright-authenticated-api-requests.md` | No extra migration needed |
| `docs/patterns/solutions/verification-gate-pattern.md` | Adapted | `docs/ops/patterns/evidence-based-completion.md` + orchestration review queue | Checksum tool/paths were over-engineered and stale |
| `docs/patterns/solutions/index.md` | Deprecated | `docs/ops/patterns/index.md` | Single canonical index |

## Why Verification-Gate Tool Was Not Adopted As-Is

1. References stale `.agents/*` and legacy documentation paths.
2. Adds high process overhead with low practical enforcement value compared to leader review + evidence requirements.
3. Existing PR templates + orchestration queue provide enforceable completion control with less complexity.
