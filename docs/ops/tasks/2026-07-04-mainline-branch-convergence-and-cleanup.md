# Task: Mainline Branch Convergence And Cleanup

Status: Blocked/Deferred
Owner: Codex
Created: 2026-07-04
Linear Issue: AAI-932 - https://linear.app/megankharrison/issue/AAI-932/audit-and-publish-all-active-alleato-pm-worktree-changes-to-main
Related Handoff: `docs/ops/handoffs/2026-07-04-S113-mainline-branch-convergence-and-cleanup.md`

## Objective

Reduce the current branch/worktree sprawl to one truthful ledger: identify which
branches still contain work not on `origin/main`, publish or defer only the real
remaining bundles, and delete the branches/worktrees already proven redundant.

## Non-Negotiable Done Rule

This task is not done until every required checklist item below is checked and
evidence is filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document cause, detection gap, prevention step, owner,
and next action.

## Attention Brief

Primary user: Megan managing multiple Codex/Claude worktrees in one repo.
Primary job: know exactly what is still unpublished, what is already on `main`,
and what can be deleted without losing work.
Primary decision: which remaining branches are true merge candidates versus
branch/worktree noise.
Tier 1: branch truth, worktree ownership, publish truth, delete-safe branches.
Tier 2: docs/checkpoint branches, duplicate refs, stale remotes, review state.
Hide until requested: raw git logs, repeated patch-equivalent refs, long branch
lists without classification.
Remove: stale remotes, patch-equivalent local refs, orphaned named worktrees,
and ambiguous "maybe important" branches.
Primary action: classify, publish or defer, then delete redundant refs.
Failure-loudly behavior: if any branch still has unique non-main commits or an
attached worktree, the cleanup must stop with the exact branch, owner files, and
next action instead of deleting optimistically.

## Acceptance Criteria

- [ ] Every non-`main` local/remote branch is classified as `already on main`,
      `subset of another branch`, `real outstanding work`, or `checkpoint/docs only`.
- [ ] Local `main` is fast-forwarded to `origin/main` before any delete claims.
- [ ] Branches already proven patch-equivalent to `origin/main` are deleted
      locally once their attached worktrees are removed.
- [ ] Stale remote-tracking refs are pruned.
- [ ] Any branch with real outstanding work has a concrete disposition:
      publish now, defer with owner, or preserve intentionally.
- [ ] The final ledger states exactly what remains and why.

## Implementation Plan

1. Bind the existing Linear issue, handoff, and session-board claim to this run.
2. Fast-forward the primary checkout to `origin/main` and re-run the branch/worktree audit.
3. Remove stale remote refs and classify all local branches against
   `origin/main` with commit-level comparisons.
4. Remove only delete-safe local branches after confirming they are not attached
   to active worktrees.
5. Record remaining merge candidates, checkpoints, and blockers in the handoff.

## Task List

- [x] Existing branch/worktree inventory captured against `origin/main`.
- [x] Create the task artifact and worker handoff ledger.
- [x] Claim one active cleanup session in `docs/ops/orchestration/session-board.md`.
- [x] Post kickoff update to `AAI-932`.
- [ ] Fast-forward local `main` to `origin/main`.
- [x] Recompute patch-equivalent branch list after the initial cleanup pass.
- [x] Remove delete-safe worktrees that only point at already-landed branches.
- [x] Delete local branches already proven patch-equivalent to `origin/main`.
- [x] Record outstanding merge/defer candidates with exact branch names and file scope.
- [ ] Validate the handoff with `npm run linear:codex:check -- ...`.

## Files To Change

- `docs/ops/tasks/2026-07-04-mainline-branch-convergence-and-cleanup.md`
- `docs/ops/handoffs/2026-07-04-S113-mainline-branch-convergence-and-cleanup.md`
- `docs/ops/orchestration/session-board.md`
- `docs/ops/orchestration/review-queue.md` if review submission happens in this run

## Scope Checklist

- [x] Existing branch/worktree architecture reviewed before cleanup.
- [x] Existing publish/process docs identified before deleting anything.
- [x] Source-of-truth chosen as `origin/main` plus commit-level diffing.
- [x] Stale or duplicate paths identified separately from real merge candidates.
- [x] Acceptance criteria written as observable branch/worktree outcomes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] External system owner chosen for issue/workflow tracking (`AAI-932`).
- [ ] Local `main` updated to the remote source of truth.
- [ ] Branch cleanup limited to delete-safe refs only.
- [x] Branch cleanup limited to delete-safe refs only.
- [ ] No unrelated feature work is reverted or silently discarded.
- [x] No unrelated feature work is reverted or silently discarded.
- [ ] Checkpoint/docs branches are separated from product-code merge candidates.
- [x] Checkpoint/docs branches are separated from product-code merge candidates.
- [ ] Errors remain specific and actionable; no silent git cleanup.
- [x] Errors remain specific and actionable; no silent git cleanup.

## Integration Checklist

- [ ] Linear issue, task doc, handoff, and session-board row all agree on scope.
- [x] Linear issue, task doc, handoff, and session-board row all agree on scope.
- [ ] Worktree inventory and branch inventory resolve to one canonical ledger.
- [x] Worktree inventory and branch inventory resolve to one canonical ledger.
- [ ] Delete actions occur only after worktree ownership is cleared.
- [x] Delete actions occur only after worktree ownership is cleared.
- [ ] Deferred branches have explicit next owner action.
- [x] Deferred branches have explicit next owner action.

## Regression Guardrails

- [ ] Branch truth is based on `git log --cherry-pick --right-only` or equivalent,
      not only `git branch --no-merged`.
- [x] Branch truth is based on `git log --cherry-pick --right-only` or equivalent,
      not only `git branch --no-merged`.
- [ ] Cleanup fails loudly when a branch is still attached to a worktree.
- [x] Cleanup fails loudly when a branch is still attached to a worktree.
- [ ] Cleanup ledger is written so future sessions can avoid repeating the audit.
- [x] Cleanup ledger is written so future sessions can avoid repeating the audit.

## Verification Checklist

- [ ] Static/process verification: task doc, handoff, session board, Linear kickoff.
- [ ] Targeted git verification on branch divergence and worktree ownership.
- [ ] Final handoff validation command run.
- [ ] Evidence artifacts recorded below.
- [ ] Known unrelated blockers documented with exact branch/worktree names.
- [x] Static/process verification: task doc, handoff, session board, Linear kickoff.
- [x] Targeted git verification on branch divergence and worktree ownership.
- [ ] Final handoff validation command run.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated blockers documented with exact branch/worktree names.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Initial branch audit | `git fetch origin --prune`; `git branch -vv`; `git branch -r`; commit-level comparison script | Pass | Found 47 non-main refs, 25 patch-equivalent to `origin/main`, and a smaller set of real outstanding work bundles. |
| Worktree ownership audit | `git worktree list` | Pass | Confirmed several named branches still mounted in active worktrees and therefore not delete-safe yet. |
| Linear binding | `AAI-932` | Pass | Existing issue matches this cleanup scope and remains the canonical tracker. |
| Control-plane setup | Task doc, handoff, session-board row, Linear kickoff comment | Pass | Claimed `S113` against `AAI-932` and recorded the cleanup scope in repo + Linear. |
| Redundant worktree cleanup | `git worktree remove /private/tmp/alleato-feedback-slice-check`; `git worktree remove /private/tmp/alleato-publish-prime-invoices` | Pass | Removed two clean, already-landed worktrees so their branches became delete-safe. |
| Delete-safe branch cleanup | `git branch -D ...` | Pass | Deleted 22 local branches already proven patch-equivalent to `origin/main` and not attached to active worktrees. |
| Redundant remote cleanup | `git push origin --delete codex/feedback-category-filter-checkpoint` | Pass | Removed the one clearly redundant remote checkpoint branch after confirming its patch-equivalent content was already on `main`. |
| Post-cleanup branch audit | commit-level comparison script; `git worktree list`; `git status --short --branch`; `git diff --name-only HEAD..origin/main` | Partial | Remaining blockers are now explicit: dirty attached redundant worktrees and a dirty `main` checkout that overlaps the one-commit remote fast-forward. |

## Risks / Gaps

- Several patch-equivalent branches are still attached to named worktrees, so
  deletion must be sequenced through worktree removal first.
- Some remaining non-main branches are mixed checkpoint/docs bundles; deleting
  them is safe only after their evidence is captured or intentionally deferred.
- Meetings branches overlap and have subset relationships; deleting the smaller
  branches before deciding on the superset publish path could hide useful review
  history.

## Blocked / Deferred

- Cause: local `main` is behind `origin/main` by one commit, but that remote
  commit touches files that are already dirty in this checkout
  (`frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`,
  `.../types.ts`, and
  `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractInvoicesTab.tsx`),
  so a fast-forward would risk colliding with unrelated in-progress work.
- Detection gap: `main` drift was easy to see, but only the file-level diff to
  `origin/main` exposed that the fast-forward overlaps current dirty files.
- Prevention step: keep branch cleanup in a clean checkout or detached worktree
  so `main` can be fast-forwarded before repo-state cleanup begins.
- Owner: Codex for a later clean-checkout cleanup pass, or Megan if those
  overlapping dirty files should be published/rebased first.
- Next action: either publish/rehome the overlapping prime-contract dirt, or
  resume this cleanup from a clean checkout and then remove the remaining
  attached redundant worktrees:
  `codex/commitment-cco-email-delivery`,
  `codex/nightly-tight-checks-20260703`,
  `codex/nightly-tight-checks-20260704-020227`.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
