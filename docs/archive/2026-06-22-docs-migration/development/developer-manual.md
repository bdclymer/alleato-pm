# Developer Manual

Last updated: 2026-03-21

This manual is the maintained entrypoint for contributors working in the Alleato-PM repository.

## What This Repo Contains

- `frontend/`: Next.js 15 App Router application
- `backend/`: FastAPI services and supporting scripts
- `supabase/`: migrations and SQL helpers
- `scripts/`: repo-level automation and verification utilities
- `docs/`: maintained documentation
- `docs/`: generated reports, PRPs, and research artifacts
- `_bmad/`: BMAD agents and workflows used by the project

## Read These First

1. `AGENTS.md`
2. `docs/project-overview/index.md`
3. `docs/project-overview/project-context.md`
4. `docs/design/AI-UI-BASELINE.md`

## Local Development

### Install

```bash
npm install
cd frontend && npm install
```

### Environment

- Copy `frontend/.env.example` to `frontend/.env.local`
- Copy `backend/.env.template` to `backend/.env`

### Run

```bash
# repo root
npm run dev
npm run dev:frontend
npm run dev:backend
```

## Required Gates

### Supabase Types

Before database-facing changes:

```bash
npm run db:types
```

Generated types live in `frontend/src/types/database.types.ts`.

### Route Conflict Check

After adding or renaming dynamic routes:

```bash
npm run check:routes
```

Use specific dynamic segment names such as `[projectId]`, `[contractId]`, and `[companyId]`. Do not introduce generic `[id]` routes in app pages.

### Frontend Quality

```bash
cd frontend
npm run quality
```

## Testing

### Default Verification Path

```bash
# repo root
npm run verify:browser
```

Artifacts are written to `tests/agent-browser-runs/`.

### Additional Tests

```bash
# repo root
npm run test

# frontend
cd frontend
npm run test
npm run test:unit
```

## Documentation Rules

- Keep canonical docs in `docs/`
- Treat `docs/` as generated or workflow output unless a file is intentionally curated
- Do not commit generated reports, screenshots, or local OS artifacts as permanent documentation unless they are part of a specific maintained reference
- Update this manual and the root `README.md` when onboarding steps or core commands change

## Current Cleanup Notes

- Some older indexes and generated documentation artifacts have drifted out of date over time
- Favor the `docs/project-overview/` and `docs/design/` trees over legacy one-off notes when looking for current guidance
