# Handoff: 2026-04-29 — Help Visibility Policy

## Intake Block

1) Session ID: S23
2) Task ID: AAI-209
3) Linear issue: AAI-209
4) Linear URL: https://linear.app/megankharrison/issue/AAI-209/define-help-center-permissions-audience-and-clientinternal-visibility
5) Current status: Implemented, pending review
6) Files changed (absolute paths):
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-visibility.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-articles.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tools/operational.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/docs/[[...slug]]/page.tsx
- /Users/meganharrison/Documents/alleato-pm/docs/help/README.md
7) Commands run and outcome (pass/fail counts):
- PASS: `npm run docs:validate-help`
- PASS: policy smoke proving `audience: internal` is blocked from client Help Center and default AI help while `audience: client` is allowed.
- PASS: `cd frontend && npm run typecheck`
- PASS: Playwright rendered `/docs` after policy enforcement and confirmed the starter articles still appear.
8) Evidence artifacts (screenshot/video/report/log paths):
- /Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/2026-04-29-help-center/index-policy-visibility.png
9) Top 3 findings (frontend-visible issues first):
- `/docs` now uses a policy helper instead of raw `client_visible` checks.
- Direct `/docs/[slug]` access now also uses the same client-safe policy helper before rendering.
- AI app-help retrieval now uses the default AI help policy instead of raw `ai_visible` checks.
10) Recommended next action (one line): Start AAI-210 to add regression tests/guardrails around the completed Help Center and AI help stack.
11) Handoff file path: docs/ops/handoffs/2026-04-29-S23-help-visibility-policy.md
12) Migration ledger evidence: N/A — no database migration in this slice.

## Linear Updates

- Kickoff comment: AAI-209 moved to In Progress.
- Milestone comments: Pending because the Linear comment helper was unavailable in this session.
- Completion/blocker comment: Pending because the Linear comment helper was unavailable in this session.

## Current Status

AAI-209 is implemented:

- Added `HELP_AUDIENCE_POLICIES` for `client`, `subcontractor`, `admin`, and `internal`.
- Added `canArticleAppearInClientHelpCenter()` and `canArticleAppearInDefaultAiHelp()`.
- Added validation so admin/internal docs cannot set `client_visible: true` or `ai_visible: true` until role-aware retrieval exists.
- Updated `/docs` listing, direct article routing, and AI app-help retrieval to use policy helpers.

## Exact Next Step

Add regression coverage for metadata validation, route rendering, direct-route visibility, and AI help retrieval filtering.

## Known Pitfalls

- Role-aware internal/admin Help Center access is intentionally not implemented yet. This slice blocks those audiences from default client and AI surfaces.
- If internal/admin articles are needed for the internal team soon, add an authenticated admin-only docs surface rather than loosening `/docs`.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` already contain conflict markers, so this handoff was created without editing those ledgers.

## Resume Commands

```bash
npm run docs:validate-help
cd frontend && npm run typecheck
```

## Evidence

Policy smoke output:

```json
{
  "internalClient": false,
  "internalAi": false,
  "clientClient": true,
  "clientAi": true
}
```
