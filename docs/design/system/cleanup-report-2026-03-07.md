# Design Docs Cleanup Report (2026-03-07)

## Objective

Reduce conflicting design documentation and establish a single, enforceable source of truth.

## Contradictions Found

1. Brand/accent conflict: some docs enforce orange brand, others enforce purple/indigo.
2. Token source conflict: some docs treat TS token files as canonical while runtime tokens are in CSS variables.
3. Pattern conflict: older docs allow patterns now explicitly deprecated by the latest audit rules.
4. Broken references: multiple docs reference `frontend/src/design-system/*.md` files that do not exist.

## Keep

1. `.claude/design-audit/design-system-rules.md`
2. `docs-ai/contents/docs/reports/design-audit-2026-03-07.md`
3. `.claude/design-audit/violations.json`
4. `docs/design/research/PROJECT-HOMEPAGE-UX-ANALYSIS.md` (research only)

## Merge/Create

1. `docs/design/README.md` as root entrypoint
2. `docs/design/AI-UI-BASELINE.md`
3. `docs/design/system/new-page-workflow.md`
4. `docs/design/system/audit-governance.md`
5. `docs/design/system/tokens-components.md`

## Archive

Moved to `docs/design/archived-design/2026-03-07/`:

- `docs/design/*` legacy design-system guides/specs/checklists
- `frontend/design-system/*.md` legacy/contradictory design docs

## Result

The active design-system instruction path is now explicit and non-ambiguous:

`docs/design/README.md` -> `.claude/design-audit/design-system-rules.md` + audit artifacts
