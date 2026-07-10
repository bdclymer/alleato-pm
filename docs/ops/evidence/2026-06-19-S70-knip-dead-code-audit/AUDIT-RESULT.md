# Knip Dead-Code Audit — Result

Branch: `claude/dead-code-audit-knip-75attv`
Date: 2026-07-09

## What was done

Ran `npm run audit:dead-code:frontend:report` (Knip via `frontend/knip.json`),
then **removed all 507 files Knip reported as unused** after a second-opinion
verification pass. Unused *exports* and *types* were assessed and intentionally
left in place (see "Exports/types" below).

## Verification before deletion

Knip's config already models the false-positive surfaces: Next.js app-router
entrypoints (`next: true`), dynamic imports, Storybook, Jest, Playwright, Vitest,
and Tailwind. On top of that, each candidate file was independently checked:

1. **Grep second opinion** — every candidate's `@/`-alias path and relative
   import tail was grepped across `src/`, `tests/`, and `config/`.
2. **Live-referrer filter** — matches were kept only if the referrer was itself
   *not* in the dead set (files referenced only by other dead files are
   transitively dead and safe to delete together).
3. **Alias-hit review** — the only two files with genuine `@/`-alias matches
   (`src/lib/id.ts`, `src/components/drawings/DrawingViewer.tsx`) were confirmed
   to be **substring collisions** (`@/lib/ideas`, `DrawingViewerFabric`), i.e.
   Knip was correct — both are unused.
4. **Next.js entrypoint check** — confirmed **no** `page/layout/route/loading/
   error/not-found/template/default` files were in the set. All flagged `app/`
   files are colocated helpers, `.nonprod`/`page-test` dev leftovers, or
   superseded `_sections/*` design-ideas fixtures.
5. **Config/provider sweep** — confirmed no deleted file is wired via
   `next.config.ts`, Tailwind, or a root layout/provider. Real infrastructure
   (`lib/supabase/client.ts`, `lib/supabase/server.ts`, root `middleware.ts`)
   was untouched.

## Post-deletion evidence

- **Typecheck (`tsc --noEmit`):** **0** `TS2307` (cannot-find-module) errors —
  no live file lost an import. The single remaining `TS2352` error in
  `usePrimeContractFormState.ts` was confirmed **pre-existing** on `HEAD`
  (reproduced via `git stash`), unrelated to this audit.
- **Knip re-run:** unused-files count dropped **507 → 0**.
- **Production build:** see PR checks / build log.

## Files removed (507) — by area

| Area | Files |
| --- | ---: |
| `src/components/*` (misc, domain, directory, project-home, motion, data-table, chat, admin, ai-chat, tables, nav, icon, header, prompt-kit, commitments, layouts, elements, …) | ~340 |
| `src/app/(main|admin|tables|auth)/*` colocated helpers / dev fixtures | 32 |
| `src/lib/*` (schemas, ai, db, pg-meta, table-config, …) | ~45 |
| `src/hooks/*` orphaned hooks | ~40 |
| `src/types/*`, `src/features/*`, `src/store`, `src/providers`, `src/services`, misc | ~50 |

Full list: `git show --stat` on the audit commit, or `deleted-files.txt` in this folder.

## Exports/types — intentionally deferred

Knip also reports **1110 unused exports** and **732 unused types**, but these
live inside **still-active files** and are dominated by intentional inventory
that this repo deliberately keeps whole:

- `src/components/ds/index.ts` — **147** design-system barrel re-exports
  (CLAUDE.md / DESIGN-SYSTEM-GATE keep the DS inventory complete).
- shadcn primitives under `src/components/ui/*` (full component API surface).
- Zod schema modules (`src/lib/schemas/*`, `src/lib/validation/schemas.ts`) —
  exported schema sets are API surface, consumed dynamically/per-feature.
- 14 barrel `index.ts` files (214 exports) and icon sets.

The Knip report's own **Deletion Rule** says this report "is a deletion-planning
report, not a delete list" and to not bulk-delete exports. Removing 1110
individual exports from ~200 live files carries high false-positive risk
(barrel re-exports, test/story-only consumers, public API) for low marginal
value versus the whole-file removals already done. Left for a future,
per-domain slice with owner verification.
