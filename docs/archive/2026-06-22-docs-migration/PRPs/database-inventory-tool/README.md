# Database Inventory Tool — Handoff

> **For Claude Code (new session):** read [PRP.md](./PRP.md) before writing any code. It's the complete spec.

## What this is

An internal admin page at `/admin/database-inventory` that replaces the 770-line `docs/architecture/TABLE-INVENTORY.md` with a filterable, searchable, always-fresh UI. Combines human-authored YAML metadata + live SQL row counts + grep-derived writer/reader references into one tool.

## How to assign this

Open a new Claude Code session in the repo root. Paste:

> Read `docs/PRPs/database-inventory-tool/PRP.md` and implement it. Recommended model is in the PRP header. Ship one commit per phase, push to main as you go. Stop and ask before doing anything in the "Out of scope" list.

## Model

**Sonnet 4.6, no reasoning mode.** This is pattern-following implementation work. Reasoning would burn tokens re-deliberating decisions already made in the PRP.

If a phase escalates into design discussion (e.g., the user changes their mind on the schema), the session can switch to Opus for that decision and back to Sonnet for the rest.

## Required context the session must load

The PRP lists these in section 3, but the highest-leverage:

1. `docs/architecture/TABLE-INVENTORY.md` — the source content
2. `docs/architecture/DATABASE-ARCHITECTURE.md` — the why
3. `scripts/dev-tools/generate-page-schema-fk-map.mjs` — the proven generator pattern to mirror
4. `frontend/src/components/dev-tools/page-schema-fk.generated.ts` — the proven output-file shape
5. `frontend/src/app/(main)/[projectId]/commitments/page.tsx` — the proven UnifiedTablePage implementation

## Effort

- MVP (phases 1–3): 5–6 hours
- Full ship (phases 1–5): 10–12 hours

## Phases at a glance

| Phase | Deliverable | Time |
|---|---|---|
| 1 | `docs/architecture/tables.yaml` ported from the markdown | 2–3h |
| 2 | `scripts/dev-tools/generate-db-inventory.mjs` + `frontend/src/components/dev-tools/db-inventory.generated.ts` | 2–3h |
| 3 | `/admin/database-inventory` page with filter/search/detail drawer | 3–4h |
| 4 | Live refresh API + GitHub Action for schema drift | 2h |
| 5 | CI gate that fails on un-documented new tables | 1h |

## Out of scope (do not let scope creep)

- Dropping any tables
- Backfilling `projects.address` or `document_metadata.category`
- Fixing the `user_profiles` privilege gap (separate work item)
- Postgres triggers
- AI tools that consume the generated file

If the implementer thinks any of those are needed mid-task, they STOP and ask the user.

## Verification before declaring done

See PRP section 10. Summary:
- `npm run quality` green
- `npm run db:inventory` regenerates cleanly
- Page loads at `/admin/database-inventory`, all interactions work
- GitHub Action runs cleanly via `workflow_dispatch`
- Schema-drift CI catches a deliberately removed YAML entry

## After it ships

PRP section 14. Summary: reduce the markdown to a redirect, add a MEMORY.md entry, update CLAUDE.md reference docs, open follow-up tickets for the critical findings the inventory surfaced.
