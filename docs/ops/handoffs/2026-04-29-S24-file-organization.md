# Handoff: 2026-04-29 — File organization cleanup

## Intake Block

1) Session ID: S24
2) Task ID: AAI-247
3) Linear issue: AAI-247
4) Linear URL: https://linear.app/megankharrison/issue/AAI-247/review-and-clean-up-repo-file-organization
5) Current status: Pending Review
6) Files changed (absolute paths):
   - `/Users/meganharrison/Documents/alleato-pm/.gitignore`
   - `/Users/meganharrison/Documents/alleato-pm/.husky/pre-commit`
   - `/Users/meganharrison/Documents/alleato-pm/docs/BUDGET_LINE_ITEMS_IMPL.md`
   - `/Users/meganharrison/Documents/alleato-pm/docs/reference/budget/BudgetLineItems.reference.jsx`
   - `/Users/meganharrison/Documents/alleato-pm/scripts/testing/liveblocks-seed.spec.ts`
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-29-S24-file-organization.md`
7) Commands run and outcome (pass/fail counts):
   - PASS: `rg -n "BudgetLineItems\\.jsx|liveblocks-seed\\.spec\\.ts" . --glob '!node_modules/**' --glob '!frontend/.next/**' --glob '!logs/**' --glob '!output/**' --glob '!verify-output/**'` returned only handoff explanatory mentions.
   - PASS: `git diff --check -- .gitignore .husky/pre-commit docs/BUDGET_LINE_ITEMS_IMPL.md docs/reference/budget/BudgetLineItems.reference.jsx scripts/testing/liveblocks-seed.spec.ts docs/ops/handoffs/2026-04-29-S24-file-organization.md`
   - PASS: `sh -n .husky/pre-commit`
   - PASS: root-file guard sample matched `BudgetLineItems.jsx`, `Example.tsx`, and `script.mjs` while excluding `README.md` and nested frontend files.
   - BLOCKED/UNRELATED: full `git diff --check` fails on pre-existing conflict markers in unrelated app files.
8) Evidence artifacts (screenshot/video/report/log paths):
   - `docs/ops/handoffs/2026-04-29-S24-file-organization.md`
9) Top 3 findings (frontend-visible issues first):
   - No frontend-visible behavior was intentionally changed.
   - Root `BudgetLineItems.jsx` was a reference artifact, not imported app code, and belonged under documentation reference assets.
   - Root `liveblocks-seed.spec.ts` was a one-off utility spec and belonged under scripts/testing instead of project root.
10) Recommended next action (one line): Run the root-file guard and decide separately whether stale tracked generated artifacts under `.playwright-mcp/` should be archived or deleted.
11) Handoff file path: `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-29-S24-file-organization.md`
12) Migration ledger evidence: Not applicable; no migration was created or changed for this cleanup.

## Linear Updates

- Kickoff comment: Posted to AAI-247.
- Milestone comments: Pending completion comment.
- Completion/blocker comment: Pending.

## Current Status

The safe root cleanup moved two misplaced tracked files into owned folders and tightened the pre-commit root-file guard so `.jsx`, `.tsx`, `.mjs`, and `.cjs` root files cannot slip through the same gap again.

## Exact Next Step

Post the completion evidence to Linear AAI-247.

## Known Pitfalls

- The worktree had many unrelated modified/deleted/untracked files before this cleanup. This handoff only covers the file-management changes listed above.
- `docs/ops/orchestration/session-board.md`, `docs/ops/orchestration/review-queue.md`, and unrelated app files currently contain unresolved conflict markers, so this task did not edit them.
- `render.yaml` remains at the repo root because moving deployment configuration needs a separate Render validation step.

## Resume Commands

```bash
git status --short
rg -n "BudgetLineItems\\.jsx|liveblocks-seed\\.spec\\.ts" . --glob '!node_modules/**' --glob '!frontend/.next/**'
git diff -- .husky/pre-commit .gitignore docs/BUDGET_LINE_ITEMS_IMPL.md docs/reference/budget/BudgetLineItems.reference.jsx scripts/testing/liveblocks-seed.spec.ts docs/ops/handoffs/2026-04-29-S24-file-organization.md
```

## Evidence

Targeted file-management checks passed. Full-worktree `git diff --check` is blocked by unrelated conflict markers in:

- `frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx`
- `frontend/src/app/api/document-center/[recordType]/[recordId]/email/route.ts`
