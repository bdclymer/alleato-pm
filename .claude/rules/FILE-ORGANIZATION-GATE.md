# FILE ORGANIZATION GATE (MANDATORY)

## The Rule

**BEFORE creating ANY file, check where it belongs. Files in the wrong location waste the user's time organizing them.**

---

## Folder Ownership (Decision Tree)

Before creating any file, identify which bucket it belongs to:

| Folder | Purpose | Put Here |
|--------|---------|----------|
| `.claude/` | Agent behavior | Rules, commands, agent definitions, investigations |
| `docs/` | Project reference knowledge | Architecture docs, data models, dev guide, AI context |
| `_bmad-output/` | BMAD workflow outputs | PRPs, feature specs, stories, sprint plans |
| `docs-ai/` | **DOCS SITE ONLY** ⚠️ | Published user-facing documentation |
| `scripts/` | Automation | Build scripts, crawlers, seeders |
| `frontend/src/` | App code | React components, hooks, services, API routes |
| `supabase/migrations/` | DB schema | SQL migration files |

> **`docs-ai/` is a SYMLINK to a separate git repository (the documentation website).** Do NOT put internal implementation specs, PRPs, or AI context files there. Changes require a separate commit in that repo.

---

## Where Files Must Go

| File Type | Required Location | Never Put In |
|-----------|------------------|--------------|
| Scripts (.js, .ts, .py, .sh) | `scripts/` (with appropriate subdirs) | Project root |
| Project reference docs (.md) | `docs/` | Project root, `docs-ai/` |
| PRPs / feature specs | `_bmad-output/planning-artifacts/<feature>/` | `docs-ai/`, project root |
| Published user docs | `docs-ai/contents/docs/` | `docs/`, `_bmad-output/` |
| Unfiled / needs review | `DOCS_NEED_TO_FILE/` | Project root |
| Claude rules | `.claude/rules/` | Root, `docs/` |
| Claude commands | `.claude/commands/` | Root |
| SQL migrations | `supabase/migrations/` | Root, `scripts/` |
| Frontend source code | `frontend/src/` | Root |
| Playwright tests | `frontend/tests/` | Root, `scripts/` |
| Config files (tailwind, next, etc.) | `frontend/` (Next.js configs) | Root (unless monorepo-level) |

### Allowed Root Files (Exceptions)

These files ARE allowed at project root:

- `CLAUDE.md` — Claude Code instructions
- `README.md` — Repository readme
- `CONTRIBUTING.md` — Contribution guide
- `package.json` / `package-lock.json` — Monorepo package config
- `.gitignore`, `.env`, `.env.local` — Git/env config
- `docker-compose.yml` — Docker config
- `tsconfig.json` — Root TypeScript config (if monorepo)

**Everything else goes in a subdirectory.**

---

## Pre-Creation Checklist

Before creating ANY new file, answer these questions:

1. **Is this a script?** → `scripts/` (use or create an appropriate subdirectory)
2. **Is this a PRP or feature spec?** → `_bmad-output/planning-artifacts/<feature>/`
3. **Is this project reference knowledge (architecture, data model, guide)?** → `docs/`
4. **Is this published user-facing documentation?** → `docs-ai/contents/docs/` *(separate git repo — be careful)*
5. **Is this a Claude rule?** → `.claude/rules/`
6. **Is this a Claude command?** → `.claude/commands/`
7. **Is this a migration?** → `supabase/migrations/`
8. **Is this frontend code?** → `frontend/src/`
9. **Is this a test?** → `frontend/tests/`
10. **Unsure?** → `DOCS_NEED_TO_FILE/` and tell the user

If none of the above match, **ask the user** where it should go.

---

## Script Subdirectories

The `scripts/` directory has organized subdirectories:

| Script Type | Location |
|-------------|----------|
| Screenshot capture / crawlers | `scripts/screenshot-capture/` |
| Database seeding | `scripts/seed/` |
| Build utilities | `scripts/build/` |
| General utilities | `scripts/` (root of scripts dir) |

**DO NOT** dump all scripts into `scripts/` root. Use or create appropriate subdirectories.

---

## Documentation Subdirectories

| Doc Type | Location |
|----------|----------|
| Project reference knowledge | `docs/` (architecture, data models, AI context) |
| Feature PRPs / implementation specs | `_bmad-output/planning-artifacts/<feature>/` |
| BMAD workflow outputs | `_bmad-output/` |
| Published user-facing docs | `docs-ai/contents/docs/` *(separate repo)* |
| Unfiled / needs review | `DOCS_NEED_TO_FILE/` |
| Agent behavior patterns | `docs-ai/contents/docs/patterns/` *(incident logs, etc.)* |

---

## Violations

**DO NOT:**

- Create `.md` files at project root (except CLAUDE.md, README.md, CONTRIBUTING.md)
- Create `.js`, `.ts`, `.py`, or `.sh` files at project root
- Create documentation files inside `.claude/` (rules go there, not docs)
- Create SQL files outside `supabase/migrations/`
- Create test files outside `frontend/tests/`

---

## Why This Exists

The user spends significant time manually organizing files that agents create in the wrong location. Common offenders:

1. **Markdown docs at project root** — Should be in `docs-ai/` or `DOCS_NEED_TO_FILE/`
2. **Scripts at project root** — Should be in `scripts/`
3. **Random analysis/report files** — Should be in `DOCS_NEED_TO_FILE/`

**Every misplaced file = manual cleanup time for the user.**
