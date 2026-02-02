# Agent Session Protocol

**Purpose:** Ensure consistent handoffs between Claude Code sessions and prevent lost work.

---

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        SESSION START                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Read PROJECT_MONITORING.md                                   │
│ 2. Read assigned project's TASKS.md                             │
│ 3. Read PROGRESS.md for context                                 │
│ 4. Register session in monitoring                               │
│ 5. Identify next uncompleted task                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DURING SESSION                            │
├─────────────────────────────────────────────────────────────────┤
│ For each task:                                                  │
│   1. Update TodoWrite with current task                         │
│   2. Write code                                                 │
│   3. Run: npm run quality --prefix frontend                     │
│   4. If GATE task: run gate command                             │
│   5. Update TASKS.md checkbox if gate passes                    │
│   6. Commit with descriptive message                            │
│                                                                 │
│ Every 30 minutes:                                               │
│   - Update PROJECT_MONITORING.md with progress                  │
│   - Commit work-in-progress if significant                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SESSION END                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Run verification: ./scripts/verify-project.sh [project]     │
│ 2. Update TASKS.md with gate statuses                           │
│ 3. Write handoff notes in PROGRESS.md                          │
│ 4. Update SESSION LOG in TASKS.md                               │
│ 5. Update PROJECT_MONITORING.md                                 │
│ 6. Commit all changes                                           │
│ 7. Push to remote                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Start Checklist

When starting a new session on any project, the agent MUST:

```markdown
## Session Start: [Project Name]
Date: [YYYY-MM-DD HH:MM]
Agent: [agent-type]

### Pre-Work Verification
- [ ] Read PROJECT_MONITORING.md
- [ ] Read project TASKS.md
- [ ] Read project PROGRESS.md (last 3 entries)
- [ ] Understand current state
- [ ] Identify blockers from previous session
- [ ] Identify next task to work on

### Environment Check
- [ ] `git pull` - latest code
- [ ] `npm install --prefix frontend` - dependencies current
- [ ] `npm run quality --prefix frontend` - clean starting state

### Session Registration
- [ ] Added session to PROJECT_MONITORING.md
- [ ] Updated TASKS.md with session start
```

---

## During Session: Task Completion Flow

```
┌────────────────────┐
│   Pick Next Task   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Mark In-Progress │◄──────────────────┐
│   in TodoWrite     │                    │
└─────────┬──────────┘                    │
          │                               │
          ▼                               │
┌────────────────────┐                    │
│   Write Code       │                    │
└─────────┬──────────┘                    │
          │                               │
          ▼                               │
┌────────────────────┐     ┌──────────┐   │
│ npm run quality    │────▶│  FAIL?   │───┘
└─────────┬──────────┘     └──────────┘
          │ PASS
          ▼
┌────────────────────┐
│  Is this a GATE?   │
└─────────┬──────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  NO           YES
    │           │
    │           ▼
    │    ┌────────────────────┐
    │    │  Run Gate Command  │
    │    └─────────┬──────────┘
    │              │
    │        ┌─────┴─────┐
    │        │           │
    │        ▼           ▼
    │      PASS        FAIL
    │        │           │
    │        │           ▼
    │        │    ┌────────────────┐
    │        │    │ Fix and Retry  │
    │        │    └────────────────┘
    │        │
    ▼        ▼
┌────────────────────┐
│ Update TASKS.md    │
│ - Check box        │
│ - Update gate      │
│   status table     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Commit Changes     │
│ "feat: [desc]"     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Next Task         │
└────────────────────┘
```

---

## Session End Checklist

Before ending any session, the agent MUST:

```markdown
## Session End: [Project Name]
Date: [YYYY-MM-DD HH:MM]
Duration: [X hours]

### Verification Run
- [ ] Ran: `./scripts/verify-project.sh [project]`
- [ ] Saved results to: `test-results/verification-[timestamp].json`

### Gate Status Updates
- [ ] Updated all gate statuses in TASKS.md
- [ ] Updated Verification Summary table

### Documentation Updates
- [ ] Added session entry to Session Log in TASKS.md
- [ ] Wrote handoff notes in PROGRESS.md
- [ ] Updated PROJECT_MONITORING.md

### Git
- [ ] All changes committed
- [ ] Pushed to remote
- [ ] No uncommitted work left

### Handoff Notes Written
What was accomplished:
-

What's next:
-

Blockers or issues:
-

Questions for user:
-
```

---

## PROGRESS.md Format

Each project should have a PROGRESS.md that captures session-by-session updates:

```markdown
# Progress Log: [Project Name]

---

## Session: 2026-01-09 18:00 - 20:30
**Agent:** backend-architect
**Duration:** 2.5 hours

### Completed
- Created migration for change_events table
- Implemented RLS policies
- Generated TypeScript types
- Created GET /api/change-events endpoint

### Gates Passed
- [x] Migration: PASSED
- [x] TypeScript: PASSED
- [x] ESLint: PASSED

### Tests Run
- `npm run quality`: PASSED
- `npx playwright test --grep change-events`: 0 tests (none written yet)

### Not Completed
- POST endpoint (started but not finished)
- Frontend page

### Blockers
- None

### Next Session Should
1. Complete POST endpoint
2. Start DELETE endpoint
3. Begin frontend list view

### Questions for User
- None

---

## Session: 2026-01-09 14:00 - 17:30
[Previous session...]
```

---

## Cross-Session Verification

### Independent Verification Rule

> A task is NOT considered complete until a different session (or agent) has verified it.

### Verification Session Protocol

When assigned to verify another session's work:

```markdown
## Verification Session: [Project Name]
Date: [YYYY-MM-DD HH:MM]
Verifying work from: [Date of work session]

### Pre-Verification
- [ ] Pull latest code
- [ ] Read claimed completed tasks from TASKS.md
- [ ] Read PROGRESS.md from work session

### Execute All Gates
For each gate marked "PASSED" by work session:
- [ ] Re-run the gate command
- [ ] Record actual result
- [ ] Compare to claimed result

### Browser Verification (if applicable)
- [ ] Start dev server: `npm run dev --prefix frontend`
- [ ] Navigate to feature page
- [ ] Test each claimed functionality
- [ ] Check console for errors
- [ ] Take screenshots for evidence

### Verification Result
- [ ] VERIFIED: All claims confirmed
- [ ] PARTIAL: Some claims failed (list which)
- [ ] FAILED: Critical issues found

### Evidence
- Test output: [file path]
- Screenshots: [file path]
- Console logs: [file path]

### Verdict
[Write verification conclusion]
```

---

## Conflict Resolution

### When Two Sessions Work on Same Project

This should NOT happen. The PROJECT_MONITORING.md should show active sessions.

If it does happen:
1. First session to push wins
2. Second session must rebase and resolve conflicts
3. Both sessions must verify their work still passes

### When Work is Blocked

If a task cannot be completed:
1. Mark as BLOCKED in TASKS.md
2. Add blocker to Blockers table
3. Move to next task
4. Document in PROGRESS.md
5. Flag in PROJECT_MONITORING.md

---

## Quality Gates Reference

### Always Run (Every Code Change)
```bash
npm run quality --prefix frontend
```

### Before Marking Task Complete
Run the specific gate command listed in TASKS.md

### Before Marking Phase Complete
```bash
./scripts/verify-project.sh [project-name]
```

### Before Marking Project Complete
```bash
./scripts/verify-project.sh [project-name]
# Plus independent verification session
```

---

## Forbidden Actions

Agents are NOT ALLOWED to:

1. **Mark tasks complete without running gate commands**
2. **Skip the session end checklist**
3. **Leave uncommitted work**
4. **Work on multiple projects in one session**
5. **Override another session's verification**
6. **Claim "tested" without actual test output**
7. **Push code that fails `npm run quality`**

Violations must be logged in RULE-VIOLATION-LOG.md.

---

## Quick Reference: Commands

```bash
# Start of session
git pull
npm install --prefix frontend
npm run quality --prefix frontend

# During work
npm run quality --prefix frontend

# Project-specific tests
npx playwright test --grep "change-events"
npx playwright test --grep "change-orders"
npx playwright test --grep "direct-costs"
npx playwright test --grep "directory"

# End of session
./scripts/verify-project.sh [project-name]
git add .
git commit -m "feat: [description]"
git push

# Full verification
npm run test --prefix frontend
```

---

*This protocol ensures no work is lost and all claims are verifiable.*
