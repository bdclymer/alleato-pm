# Label Issue

Triage a newly opened GitHub issue: apply the right labels so the autofix
pipeline can route it. Arguments provide `REPO` and `ISSUE_NUMBER`.

## Steps

1. Read the issue: `gh issue view $ISSUE_NUMBER --repo $REPO --json title,body,labels,author`
2. Classify and apply labels with `gh issue edit $ISSUE_NUMBER --repo $REPO --add-label "<labels>"`:
   - **Type** (pick one): `feedback:bug`, `feedback:change_request`, or `feedback:question`.
     Use `bug` / `enhancement` instead when the issue is developer-authored rather than
     client feedback.
   - **Priority** (pick one): `priority:high` for broken core workflows, data loss, money
     math, auth; `priority:medium` for everything else. Skip for questions.
   - **Area**: add `area:frontend` when the issue is clearly about the Next.js app UI.
3. Decide whether the issue is safely automatable, and only then add the `autofix` label:
   - Add `autofix` ONLY when ALL of these hold:
     - The issue body uses the Codex issue form (has `### Automation scope`, `### Problem statement`,
       `### Expected behavior`, `### Reproduction`, `### Acceptance criteria`,
       `### Allowed edit paths`, `### Required guardrail` — all non-empty).
     - Automation scope is `Frontend` and every allowed edit path is under `frontend/src/`
       or `frontend/tests/`.
   - Do NOT add `autofix` to issues labeled `admin-feedback` — the Eve triage agent owns
     routing for those and applies `codex:fix` itself after risk classification.
   - Do NOT add `autofix` for issues touching migrations, auth, RLS, payments/money math,
     provider or deployment configuration, or anything ambiguous.
4. If the issue is a question with no code change implied, comment asking for the missing
   detail (what surface, what expected behavior) and add `feedback:question`.

## Rules

- Never remove existing labels.
- Never close the issue.
- Keep any comment to 1-3 sentences; do not restate the issue back to the author.
