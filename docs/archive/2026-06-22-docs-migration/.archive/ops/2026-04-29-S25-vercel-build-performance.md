# Handoff: 2026-04-29 — Vercel Build Performance

## Intake Block

1) Session ID: S25
2) Task ID: AAI-249
3) Linear issue: AAI-249
4) Linear URL: https://linear.app/megankharrison/issue/AAI-249/reduce-vercel-frontend-build-time-and-bundle-weight
5) Current status: Pending Review
6) Files changed (absolute paths):
- `/Users/meganharrison/Documents/alleato-pm/frontend/package.json`
- `/Users/meganharrison/Documents/alleato-pm/frontend/pnpm-lock.yaml`
- `/Users/meganharrison/Documents/alleato-pm/frontend/vercel.json`
- `/Users/meganharrison/Documents/alleato-pm/frontend/tailwind.config.ts`
- `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/layout.tsx`
- `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/root-client-widgets.tsx`
- `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/bot/[platform]/route.ts`
- `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/docs/[[...slug]]/page.tsx`
- `/Users/meganharrison/Documents/alleato-pm/scripts/build/nonprod-routes.json`
- `/Users/meganharrison/Documents/alleato-pm/scripts/build/disable-nonprod-routes.mjs`
- `/Users/meganharrison/Documents/alleato-pm/scripts/build/restore-nonprod-routes.mjs`
- `/Users/meganharrison/Documents/alleato-pm/scripts/build/check-nonprod-routes.mjs`
- `/Users/meganharrison/Documents/alleato-pm/scripts/predeploy-quality-gate.sh`
- `/Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md`
7) Commands run and outcome (pass/fail counts):
- Pass: `pnpm --dir frontend remove @mantine/core @mantine/hooks @emotion/react formik yup apexcharts react-apexcharts react-quill react-select easymde react-simplemde-editor @x1mrdonut1x/nouislider-react yet-another-react-lightbox sweetalert2-react-content @tippyjs/react tippy.js @vercel/blob @supabase/storage-js @react-email/components`
- Pass: `pnpm --dir frontend install --frozen-lockfile --ignore-scripts`
- Pass: `pnpm --dir frontend run quality:build-routes`
- Pass: `npm run check:routes`
- Pass: targeted ESLint on touched files
- Pass: disable/restore smoke reduced page route files from 228 to 214 and API route files from 462 to 432 during production-build preparation, then restored source files
- False fail: one route-manifest check ran concurrently while disable/restore smoke was mid-flight; rerun passed after restore
- Pass: verification worker ran `pnpm --dir frontend run typecheck`
- Pass after targeted fix: verification worker ran `pnpm --dir frontend run build:production`
- Pass: `npm run linear:codex:check -- docs/ops/handoffs/2026-04-29-S25-vercel-build-performance.md`
8) Evidence artifacts (screenshot/video/report/log paths):
- Linear issue: `AAI-249`
- Handoff: `docs/ops/handoffs/2026-04-29-S25-vercel-build-performance.md`
9) Top 3 findings (frontend-visible issues first):
- Root layout imported dev/feedback/Ask Alleato widgets directly; moved them behind dynamic client boundaries to reduce root import graph pressure.
- Vercel production build compiled internal/demo/testing/admin routes; production build now temporarily disables 44 non-production route files and restores them afterward.
- Frontend had 19 unused direct production dependencies; removed them and regenerated `frontend/pnpm-lock.yaml`.
10) Recommended next action (one line): Review verification worker results, then push if typecheck and production build pass.
11) Handoff file path: `docs/ops/handoffs/2026-04-29-S25-vercel-build-performance.md`
12) Migration ledger evidence: Not applicable; no migrations were created or changed.

## Linear Updates

- Kickoff comment: Posted to AAI-249 as Linear comment `792f1472-184f-4db1-a669-074b4bb7f47e`.
- Milestone comments: Build blocker found and fixed locally; final completion comment pending.
- Completion/blocker comment: Posted to AAI-249 as Linear comment `45e3d895-73e6-4261-b0c7-06038e9664e3`.

## Current Status

Implemented dependency pruning, production route isolation, root import deferral, bot route lazy import, docs dynamic rendering, Tailwind config warning cleanup, and predeploy guardrail wiring. Verification is ready for review.

## Exact Next Step

Post final Linear completion comment and submit for review.

## Known Pitfalls

- `build:production` temporarily renames route files; always let the restore command run after local build attempts.
- The route manifest check is intentionally strict and will fail if a route file is left renamed.
- Existing worktree has unrelated changes outside this task; do not revert them.
- `docs/ops/orchestration/session-board.md` and `review-queue.md` already contain pre-existing merge-conflict markers from unrelated work; this task appended S25 rows without resolving unrelated conflicts.

## Resume Commands

```bash
pnpm --dir frontend run quality:build-routes
npm run check:routes
pnpm --dir frontend run typecheck
pnpm --dir frontend run build:production
```

## Evidence

- `pnpm --dir frontend run quality:build-routes` passed.
- `npm run check:routes` passed.
- Targeted ESLint on touched files passed.
- `pnpm --dir frontend run typecheck` passed in verification worker.
- `pnpm --dir frontend run build:production` passed in verification worker after the Tailwind plugin default-export fix.
- `npm run linear:codex:check -- docs/ops/handoffs/2026-04-29-S25-vercel-build-performance.md` passed.
