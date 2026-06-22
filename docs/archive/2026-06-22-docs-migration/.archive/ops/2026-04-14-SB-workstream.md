# Handoff: 2026-04-14 — SB workstream

## Intake Block (ORCH-FE-012)

- Session ID: `SB`
- Task ID: `ORCH-FE-012`
- Current status: `Pending Review`
- Scope: `Fix post-project-create Create Budget CTA route-state mismatch to canonical project-scoped budget route`
- Owned paths:
  - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/create-project/page.tsx`
  - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/project/ProjectCreatedModal.tsx`
  - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/project/__tests__/ProjectCreatedModal.test.tsx`
  - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SB-workstream.md`

## Findings (ORCH-FE-012)

- Root cause: clicking a next-step link in `ProjectCreatedModal` executed two competing navigations:
  - `Link` click to `/${projectId}/budget`
  - shared `onClose` callback in create-project page that also forced `router.push(\`/${projectId}/home\`)`
- Result: non-deterministic post-create route state and occasional redirect mismatch after selecting `Create Budget`.

## Implementation Summary

- Separated modal actions into:
  - `onClose` for dismiss-only behavior (no route mutation)
  - `onViewDashboard` for explicit dashboard navigation
- Updated create-project page wiring so home navigation happens only from `View Dashboard`.
- Added canonical path helper in modal (`buildProjectPath`) and used explicit relative step paths (`budget`, `directory`, etc.) to avoid malformed links.
- Added focused unit tests to lock behavior:
  - `Create Budget` points to `/123/budget` and does not trigger dashboard callback.
  - `View Dashboard` triggers dashboard callback.

### Commands Run and Outcome

- `cd frontend && npm run test:unit -- src/components/project/__tests__/ProjectCreatedModal.test.tsx` -> pass (2 tests)
- `cd frontend && npm run typecheck -- --pretty false` -> did not complete within session window (no error output captured before timeout)

### Evidence Artifacts

- Jest output captured in terminal run for:
  - `src/components/project/__tests__/ProjectCreatedModal.test.tsx`

### Top 3 Findings

1. Modal next-step links were not isolated from close behavior, causing competing navigation side effects.
2. The budget CTA should always be canonical project-scoped (`/[projectId]/budget`) and free of additional redirect callbacks.
3. Dashboard navigation must be an explicit user action, not an implicit modal close side effect.

### Recommended Next Action

Run full project typecheck/quality in the main integration session, then execute a quick browser check of `/create-project -> Project Created modal -> Create Budget` to confirm stable URL and reload behavior.

## Files changed (absolute paths)

- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/create-project/page.tsx`
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/project/ProjectCreatedModal.tsx`
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/project/__tests__/ProjectCreatedModal.test.tsx`
- `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SB-workstream.md`

## Handoff file path

`/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SB-workstream.md`
