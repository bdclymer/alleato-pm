# Task Markdown Gate

Every non-trivial Codex task must have a task markdown file before implementation starts.

Use `docs/ops/tasks/TASK-TEMPLATE.md` and save the task as:

```text
docs/ops/tasks/YYYY-MM-DD-<short-slug>.md
```

This file is the working definition of done. A task cannot be described as
complete, done, shipped, finished, or ready to close unless every checklist item
in the task file is marked complete, or the task is explicitly marked
`Blocked/Deferred` with evidence, owner, and next action.

## Required Behavior

- Create the task file before coding or configuration changes.
- Break the work into concrete checklist items, not broad phase labels.
- Include integration and verification checklist items up front.
- Update the checklist while working; do not backfill it only at the end.
- Record exact command, browser, database, provider, or artifact evidence.
- Do not mark verification complete from assumptions, screenshots alone, or
  successful compilation alone when the workflow requires live behavior.
- If a checklist item is intentionally deferred, mark the whole task
  `Blocked/Deferred`, explain why, and name the next owner action.

## Done Gate

Before any final answer, commit, push, Linear status change, or review handoff
that says the work is done, the task file must show:

- Scope checklist complete.
- Implementation checklist complete.
- Integration checklist complete.
- Regression guardrail checklist complete.
- Verification checklist complete, including end-to-end proof when applicable.
- Known gaps either resolved or explicitly listed under `Blocked/Deferred`.

If any required item is unchecked, the correct status is not done.
