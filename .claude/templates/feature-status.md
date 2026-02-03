# Status: {Feature}

> Auto-maintained status file. Updated by `/implement-feature` command.
> Last refreshed by session: {session-id}

## Current State

| Field | Value |
|-------|-------|
| **Phase** | {RESEARCH / PLAN / ANALYZE / IMPLEMENT / TEST / VERIFY / COMPLETE} |
| **Last Updated** | {ISO timestamp} |
| **Session Count** | {number of sessions that have worked on this} |
| **Progress** | {completed}/{total} tasks |

---

## Gate Files

Track which workflow gates have been passed:

| Gate | Status | File | Last Check |
|------|--------|------|------------|
| Research | {PASS / PENDING} | `.claude/research/{feature}.md` | {timestamp} |
| Planning | {PASS / PENDING} | `TASKS.md` + `PLANS.md` | {timestamp} |
| Analysis | {PASS / PENDING} | TASKS.md has `[x]` markers | {timestamp} |
| Implementation | {X/Y tasks} | `.claude/worker-done-{feature}-*.md` | {timestamp} |
| Testing | {PASS / PENDING} | `.claude/tests-passing-{feature}-*.md` | {timestamp} |
| Verification | {PASS / PENDING} | `VERIFICATION-*.md` with VERIFIED | {timestamp} |

---

## Task Progress

### Completed Tasks
<!-- Updated as tasks are completed -->
- [x] {task-1} - Completed {timestamp}
- [x] {task-2} - Completed {timestamp}

### In Progress
<!-- Currently being worked on -->
- [ ] {current-task} - Session: {session-id} - Started: {timestamp}

### Pending
<!-- Not yet started -->
- [ ] {pending-task-1}
- [ ] {pending-task-2}

---

## Active Locks

Current task locks (for parallel session coordination):

| Task ID | Session | Started | Task Description |
|---------|---------|---------|------------------|
| {task-id} | {session-id} | {timestamp} | {description} |

Lock files location: `.claude/locks/{feature}/`

---

## Quality Metrics

| Metric | Status | Last Run |
|--------|--------|----------|
| TypeScript | {PASS / FAIL / NOT RUN} | {timestamp} |
| ESLint | {PASS / FAIL / NOT RUN} | {timestamp} |
| Playwright Tests | {X/Y passing} | {timestamp} |
| Procore Parity | {percentage or notes} | {timestamp} |

---

## Blockers

<!-- Any issues preventing progress -->

| Blocker | Severity | Description | Added |
|---------|----------|-------------|-------|
| {blocker-id} | {HIGH / MEDIUM / LOW} | {description} | {timestamp} |

**Current Status:** {BLOCKED / CLEAR}

---

## Session History

<!-- Append-only log of session activity -->

### Session: {session-id}

- **Started:** {timestamp}
- **Phase:** {phase-worked-on}
- **Tasks Completed:**
  - {task-1}
  - {task-2}
- **Notes:** {any-relevant-notes}
- **Ended:** {timestamp}

---

### Session: {previous-session-id}

- **Started:** {timestamp}
- **Phase:** {phase}
- **Tasks Completed:**
  - {task}
- **Ended:** {timestamp}

---

## Verification Reports

| Task | Status | Report | Date |
|------|--------|--------|------|
| {task-1} | {VERIFIED / FAILED} | `VERIFICATION-{task-1}.md` | {date} |
| {task-2} | {VERIFIED / FAILED} | `VERIFICATION-{task-2}.md` | {date} |

---

## Notes

<!-- Ongoing notes and observations -->

{Add notes here as implementation progresses}
