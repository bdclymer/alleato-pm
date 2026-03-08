# Tokens and Components Inventory

This inventory defines where tokens and reusable components are sourced from.

## Token Sources

1. CSS semantic tokens (authoritative runtime source): `frontend/src/app/globals.css`
2. Spacing profile tokens (TS): `frontend/design-system/spacing.ts`
3. Re-export for app usage: `frontend/src/design-system/spacing.ts`
4. Legacy static token object (reference only): `frontend/src/lib/design-tokens.ts`

## Component Sources

1. Layout primitives: `frontend/src/components/layout/`
2. Design-system composites: `frontend/src/components/ds/`
3. Base primitives: `frontend/src/components/ui/`
4. Table system: `frontend/src/components/tables/unified/`

## Gaps Closed in This Cleanup

1. Missing baseline doc referenced by AGENTS: added `docs/design/AI-UI-BASELINE.md`.
2. Missing explicit page creation procedure: added `docs/design/system/new-page-workflow.md`.
3. Missing audit operations policy: added `docs/design/system/audit-governance.md`.

## Follow-up Technical Debt

1. Consolidate `frontend/src/lib/design-tokens.ts` with CSS token source, or mark it deprecated in code comments.
2. Remove remaining deprecated layout usages listed in `.claude/design-audit/violations.json`.
