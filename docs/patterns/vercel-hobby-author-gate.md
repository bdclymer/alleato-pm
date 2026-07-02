# Vercel Hobby Plan — Commit Author Gate

## What goes wrong

Vercel deployments fail with this error when a commit's author is not the
Vercel project owner:

> The deployment was blocked because the commit author did not have
> contributing access to the project on Vercel. The Hobby Plan does not
> support collaboration for private repositories. Please upgrade to Pro
> to add team members.

This is **not** a build failure. The build never even starts. Vercel
inspects the commit metadata, sees an unrecognized author email, and
refuses to deploy.

## Why it kept happening

The `git config user.email` on machines (and inside Claude Code sessions)
defaults to `noreply@anthropic.com` or other automation emails. Local
commits then go up to GitHub with that author. When GitHub merges those
commits to `main`, Vercel sees a commit author it doesn't recognize and
blocks the deploy.

There is no way to disable this check on the Hobby Plan.

## What Vercel actually accepts

The Vercel project is owned by the GitHub account `MeganHarrison`
(GitHub user ID `109628141`). Use the GitHub-provided noreply email tied
to that account ID:

- `109628141+MeganHarrison@users.noreply.github.com`

Do not add personal/custom emails unless a live Vercel deployment proves
that exact email maps to the Hobby project owner. The full allowlist lives
in `.github/vercel-author-allowlist.json`.

## The fix

Set git author config to an allowlisted email **before** committing:

```bash
git config user.email "109628141+MeganHarrison@users.noreply.github.com"
git config user.name  "MeganHarrison"
```

A pre-commit hook (`scripts/check-commit-author.mjs`) reads the allowlist
and blocks any commit whose author is not on it. New contributors must
either be added to the allowlist or upgrade the Vercel project to Pro.

## What to do if `main` already has a bad commit

If a commit was pushed to `main` with an unauthorized author and Vercel
is refusing to deploy:

1. Push a new commit to `main` from an authorized author (the easiest
   way is to merge a PR via the GitHub UI — the merge commit is authored
   by whoever clicks Merge).
2. Vercel re-runs and deploys the new HEAD.

Do **not** try to amend or rewrite history on `main`. That requires a
force push and breaks every other contributor's local clone.

## Where the bug came from

CLAUDE.md rule 5: *for every failure, explain cause, detection gap, and
prevention step.*

- **Cause:** The local `git config user.email` was `noreply@anthropic.com`
  (Claude Code default), which is not an allowed Vercel author. Commits
  with that author silently broke deploys after merge.
- **Detection gap:** Nothing in the local toolchain (lint, typecheck,
  tests, CI) verifies the commit author. Vercel's failure surfaced only
  after merge, when the deploy was already broken.
- **Prevention step:** `scripts/check-commit-author.mjs` runs in
  `.husky/pre-commit` and refuses to make a commit unless the author
  email is on the allowlist. The bug class can no longer escape locally.
