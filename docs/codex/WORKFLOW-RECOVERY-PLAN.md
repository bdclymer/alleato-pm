# AI Workflow Recovery Plan (Claude Code + Codex)

## Goal
Get both Claude and Codex automations to a known-good state with deterministic validation so broken workflows are caught before merge.

## What we are standardizing immediately

### 1) Claude workflows
- Use `anthropics/claude-code-action@v1` with both supported auth inputs wired:
  - `ANTHROPIC_API_KEY`
  - `CLAUDE_CODE_OAUTH_TOKEN`
- Gate Claude jobs so they only run when at least one auth secret exists.
- Remove unsupported action input keys and use the current `additional_permissions` contract.

### 2) Codex workflows
- Keep Codex and Claude in separate workflow files with independent triggers and secrets.
- Codex jobs should require only `OPENAI_API_KEY` and fail-fast with a clear error if missing.
- Trigger Codex on explicit intent only (`@codex` comment, `codex` label, or manual dispatch) to avoid accidental spend.

### 3) Deterministic validation gates
- Add a workflow lint check in CI (`actionlint` + YAML parse).
- Add trigger simulation checks using `act` or equivalent dry-run where possible.
- Add a required check named `workflow-health` so broken workflow syntax/config cannot merge.

## One-time fix sequence (recommended order)
1. Stabilize Claude workflows and verify trigger conditions.
2. Add/repair Codex workflow(s) and verify with `workflow_dispatch` smoke run.
3. Add `workflow-health` CI gate.
4. Run end-to-end smoke tests in a test PR:
   - `@claude` comment on PR
   - PR open/synchronize auto-review
   - `codex` label issue trigger
   - `@codex` PR comment trigger
5. Lock branch protection so these checks are required before merge.

## Runbook for future breakages
1. Check Actions run logs for failed trigger predicates.
2. Verify secret presence and repository/environment scoping.
3. Confirm action input keys against upstream action docs.
4. Re-run manual dispatch smoke test.
5. If still failing, rollback to last known-good workflow commit and re-apply changes one file at a time.

## Definition of done
- Claude PR review posts on PR open/sync.
- `@claude` comment responses work on issues/PRs.
- Codex explicit trigger path executes and posts result.
- `workflow-health` check blocks invalid workflow changes.
- All checks documented in repository onboarding docs.
