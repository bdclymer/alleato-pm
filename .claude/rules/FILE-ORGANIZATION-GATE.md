# FILE ORGANIZATION GATE (MANDATORY)

## The Rule

**BEFORE creating ANY file, check where it belongs. Files in the wrong location waste the user's time organizing them.**

---

## Where Files Must Go

| File Type | Required Location | Never Put In |
|-----------|------------------|--------------|
| Scripts (.js, .ts, .py, .sh) | `scripts/` (with appropriate subdirs) | Project root |
| Documentation (.md, .mdx) | `docs-ai/` or `DOCS_NEED_TO_FILE/` | Project root |
| PRPs | `docs-ai/contents/docs/PRPs/<domain>/` | Root, `.claude/`, `PRPs/` (legacy) |
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
2. **Is this documentation?** → `docs-ai/contents/docs/` or `DOCS_NEED_TO_FILE/`
3. **Is this a Claude rule?** → `.claude/rules/`
4. **Is this a Claude command?** → `.claude/commands/`
5. **Is this a migration?** → `supabase/migrations/`
6. **Is this frontend code?** → `frontend/src/`
7. **Is this a test?** → `frontend/tests/`
8. **Is this a PRP?** → `docs-ai/contents/docs/PRPs/<domain>/`

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
| Technical docs (patterns, guides) | `docs-ai/contents/docs/` |
| Unfiled / needs review | `DOCS_NEED_TO_FILE/` |
| API documentation | `docs-ai/contents/docs/api/` |
| Architecture docs | `docs-ai/contents/docs/architecture/` |
| Pattern documentation | `docs-ai/contents/docs/patterns/` |

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
