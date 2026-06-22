# Work Log Page — Design

**Date:** 2026-06-21
**Author:** Megan (via Claude Code)
**Status:** Approved design, pending spec review

## Problem

After a few days away from building the app, Megan loses the thread of where she left
off. She needs a single owner-only page that, on open, answers three questions:

1. **Is anything broken while I was gone?** (AI / RAG / sync pipeline health)
2. **What was I doing and what's the current state?** (recent commits + working context)
3. **What did I tell myself to do next?** (my own running notes)

This is a personal operator/dev-continuity dashboard — **not** a project-management
feature for end users. It deliberately excludes construction-project/PM activity
(emails, meetings, insights, change orders, etc.).

## Scope

In scope:
- New owner-only page at `/work-log` under `(admin)`.
- Freeform notes (create / edit / delete / pin) backed by a new Supabase table.
- Recent git commits (GitHub API in production, local `git log` on localhost).
- "Where I left off" — rendered from `WORKING_CONTEXT.md`.
- Compact pipeline/system health strip (RAG embedding backlog, last sync, stuck jobs).

Out of scope (YAGNI / noise gate):
- Any PM/project-level activity feed.
- Charts, decorative cards, badges, or wrapper panels.
- Multi-user notes / sharing / mentions. Single owner only.
- Editing `WORKING_CONTEXT.md` from the UI (read-only render).

## Users & access

Single user: the workspace owner (`OWNER_EMAIL = "megan@megankharrison.com"`).
Gated with the existing `NavigationTool.ownerOnly` flag in
`frontend/src/lib/navigation-config.ts` (same pattern as `/ai-vision`). The page
itself also verifies the session email server-side and returns 403 for non-owners on
its API routes.

## Page layout

`PageShell variant="dashboard"`, single column, signal-first top-to-bottom:

1. **System health strip** (thin, top). RAG embedding pending counts by type, last
   sync timestamp, count of stuck/in-flight jobs. Quiet/neutral when all clear; goes
   loud (destructive token) only when something is pending or stuck. Numbers + a
   status color only — no chart, no card chrome. Uses `KpiRow`/`KpiBlock` from
   `@/components/ds/kpi` where it fits.
2. **Where I left off**. Renders `WORKING_CONTEXT.md`'s "Current focus" section plus
   "Last updated" / "Last worked on by". Read-only markdown.
3. **Notes** (primary interactive section). An add-note textarea at the top, then a
   newest-first list. Each note: markdown body, pin toggle, inline edit, delete (via
   `ConfirmDeleteDialog`). Pinned notes sort to the top. Empty state via `EmptyState`.
4. **Recent commits**. Last ~30 commits grouped by calendar day. Each row: short sha
   (links to GitHub commit), message subject, relative time, author initials.

Section headings use `SectionRuleHeading`; section-header actions (e.g. "Add note"
when the list is non-empty) use `SectionAction`. No nested cards; separation by
spacing and tonal backgrounds per the design-system gate.

## Data model

New table in the **MAIN** Supabase project (PM APP, ref lgveqfnpkxvzbnnwuled):

```sql
create table public.work_notes (
  id           uuid primary key default gen_random_uuid(),
  body         text not null check (char_length(body) between 1 and 20000),
  pinned       boolean not null default false,
  author_email text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

- RLS enabled. Policy: only `OWNER_EMAIL` (matched against `auth.jwt() ->> 'email'`)
  can select/insert/update/delete. (Single-owner table; no per-row ownership needed
  beyond the owner gate.)
- `updated_at` maintained by a `before update` trigger (reuse existing
  `set_updated_at()` if present; otherwise create one).
- Migration file: `supabase/migrations/<ts>_work_notes.sql`.
- After migration: run `npm run db:types` to regenerate `database.types.ts`.

## API routes

All under `frontend/src/app/api/`. Every route verifies the session email ===
`OWNER_EMAIL` server-side and returns 403 otherwise. External calls use
`fetchWithGuardrails`; Supabase uses the server client.

1. `GET/POST /api/work-notes`, `PATCH/DELETE /api/work-notes/[noteId]`
   - CRUD over `work_notes`. POST/PATCH validate body with Zod.
2. `GET /api/work-log/activity`
   - Returns `{ commits: Commit[], workingContext: { focus, lastUpdated, lastWorkedOnBy, raw } }`.
   - **Commits:** in production, GitHub REST `GET /repos/{owner}/{repo}/commits?per_page=30`
     using `GITHUB_TOKEN`. On localhost (no token / `NODE_ENV !== 'production'`), shell
     out to `git log -30 --pretty=...` in the repo root. Detection: prefer local git
     when `process.cwd()` resolves to the repo and `.git` exists; else GitHub API.
   - **Working context:** in production, GitHub contents API for `WORKING_CONTEXT.md`
     (raw); on localhost, read the file from disk. Parse out the "Current focus" block.
3. `GET /api/work-log/health`
   - RAG embedding pending counts grouped by `type` from `rag_document_metadata`
     (RAG project read client / `RAG_SUPABASE_URL`), most-recent sync timestamp, and a
     count of stuck/in-flight intelligence jobs. Returns a compact
     `{ pending: {type: count}, lastSyncAt, stuckJobs, ok: boolean }`.
   - If the RAG read client is unavailable, the route returns `ok: false` with an
     explicit reason rather than a generic error (no silent failure).

## Hooks & client

- `frontend/src/hooks/use-work-notes.ts` — React Query: list + create + update +
  delete mutations with optimistic updates and `apiFetch`.
- `frontend/src/hooks/use-work-log.ts` — React Query for `/activity` and `/health`
  (separate query keys; `/health` with a short `staleTime`).
- Page component composes the four sections; each section is its own component file
  under `frontend/src/features/work-log/` (`health-strip.tsx`, `where-i-left-off.tsx`,
  `notes-panel.tsx`, `commit-timeline.tsx`) so each has one clear purpose and is
  independently readable/testable.

## Navigation

Add one entry to `navigation-config.ts` with `ownerOnly: true`, in an appropriate
section (alongside other owner/admin tools). Label: "Work Log".

## Environment / external service ownership

- `GITHUB_TOKEN` — set in Vercel (all environments) via CLI, sourced from
  `gh auth token`. Used only for read-only commit + file fetches.
- `GITHUB_REPO` — `MeganHarrison/alleato-pm` (or derive from `git remote`).
- Local dev needs neither (falls back to local git + filesystem).
- Never log or echo the token value.

## Error handling & guardrails (CLAUDE.md core principles)

- API routes: explicit 403 for non-owner; typed error payloads, never generic 500
  strings. `/health` degrades to `ok:false` + reason if RAG client is down.
- Commit source: if GitHub API fails in prod, surface the specific failure in the
  commits section (e.g. "GitHub API: 401") rather than an empty list that looks like
  "no work done."
- Zod validation on note write paths (prevents empty/oversized bodies — the
  "should-have-been-prevented" bucket).

## Testing

- Unit (Jest): `work_notes` Zod schema (empty, oversized, valid); WORKING_CONTEXT
  "Current focus" parser (present / missing section).
- Smoke: add `/api/work-notes` and `/api/work-log/health` to
  `scripts/api-smoke-contracts.mjs` (owner-auth happy path + 403 for non-owner).
- E2E (Playwright, optional follow-up): create a note, pin it, reload, confirm it
  persists and sorts to top; delete it.

## Guardrail follow-through

- Prevented: Zod + DB `char_length` check on note body; owner-only RLS.
- Caught pre-deploy: smoke-contract entries for the new routes; unit tests for parser
  and schema.
- Caught post-deploy: `/health` route is itself a monitor — it makes the pipeline
  backlog visible on the page Megan opens first.
