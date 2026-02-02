# Claude Code Multi-Project Sub-Agent Guide

## Overview

This guide explains how to run **multiple Claude Code sessions in parallel**, each working on a different project, with automatic verification to prevent false completion claims.

---

## The Core Problems This Solves

### Problem 1: Tracking Multiple Parallel Sessions
When running Claude Code in multiple terminals, it's hard to know:
- Which terminal is working on what
- What progress has been made
- Whether work conflicts with other sessions

### Problem 2: False Completion Claims
Agents often claim work is "done" without:
- Actually running tests
- Verifying the code works
- Checking all requirements

### Problem 3: Context Window Pollution
Long sessions accumulate:
- Stale file contents
- Old error messages
- Forgotten requirements

---

## Solution: Project-Isolated Sessions with Verification

```
┌──────────────────────────────────────────────────────────────────┐
│                    MULTI-PROJECT WORKFLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Terminal 1                Terminal 2              Terminal 3     │
│  ┌────────────┐           ┌────────────┐         ┌────────────┐  │
│  │ change-    │           │ direct-    │         │ directory  │  │
│  │ events     │           │ costs      │         │            │  │
│  │            │           │            │         │            │  │
│  │ Session A  │           │ Session B  │         │ Session C  │  │
│  └─────┬──────┘           └─────┬──────┘         └─────┬──────┘  │
│        │                        │                      │          │
│        ▼                        ▼                      ▼          │
│  .claude/projects/        .claude/projects/      .claude/projects/│
│  change-events/           direct-costs/          directory/       │
│  ├── current-session.md   ├── current-session.md ├── current-... │
│  ├── tasks/               ├── tasks/             ├── tasks/       │
│  └── results/             └── results/           └── results/     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Initialize the Orchestrator

```bash
./scripts/claude-orchestrator.sh init
```

### 2. Start Sessions in Different Terminals

```bash
# Terminal 1
./scripts/claude-orchestrator.sh start --project change-events

# Terminal 2
./scripts/claude-orchestrator.sh start --project direct-costs

# Terminal 3
./scripts/claude-orchestrator.sh start --project directory
```

### 3. View the Dashboard

```bash
./scripts/claude-orchestrator.sh dashboard
```

### 4. End Sessions

```bash
./scripts/claude-orchestrator.sh end --project change-events
```

---

## Available Projects

| Project | Description | Task File |
|---------|-------------|-----------|
| `change-events` | Change Events implementation | `documentation/*project-mgmt/in-progress/change-events/TASKS-CHANGE-EVENTS.md` |
| `change-orders` | Change Orders implementation | `documentation/*project-mgmt/in-progress/change-orders/specs-change-orders.md` |
| `direct-costs` | Direct Costs module | `documentation/*project-mgmt/in-progress/direct-costs/TASKS-DIRECT-COSTS.md` |
| `directory` | Directory Tool enhancement | `documentation/*project-mgmt/in-progress/directory/TASKS-DIRECTORY-TOOL.md` |
| `forms` | Form Testing framework | `documentation/*project-mgmt/in-progress/forms/TASKS-FORM-TESTING.md` |

---

## The Verification System

### Why Sub-Agents for Verification?

```
┌─────────────────────────────────────────┐
│  SAME AGENT = SAME CONTEXT = SAME BIAS │
│                                         │
│  Agent implements feature               │
│  Agent "checks" own work                │
│  Agent confirms it's "done"             │
│  → Circular validation (unreliable)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DIFFERENT AGENT = FRESH CONTEXT = UNBIASED │
│                                            │
│  Worker Agent implements feature           │
│  Verifier Agent (new context) checks work  │
│  Verifier has NO memory of implementation  │
│  → Independent validation (reliable)       │
└────────────────────────────────────────────┘
```

### Using the Worker/Verifier Pattern

```bash
# 1. Create a task
./scripts/claude-orchestrator.sh create-task \
  --project change-events \
  --desc "Implement GET /api/change-events endpoint"

# Returns: task-20260110-123456-abc1

# 2. Spawn a worker agent (implements the task)
./scripts/claude-orchestrator.sh worker \
  --project change-events \
  --task task-20260110-123456-abc1

# 3. Spawn a verifier agent (checks the work with fresh context)
./scripts/claude-orchestrator.sh verify \
  --project change-events \
  --task task-20260110-123456-abc1

# OR: Auto-verify (watches for worker completion, then verifies)
./scripts/claude-orchestrator.sh auto-verify \
  --project change-events \
  --task task-20260110-123456-abc1 \
  --timeout 600
```

---

## Folder Structure

```
.claude/
├── active-sessions.md           # Shows all active sessions across terminals
├── projects/
│   ├── README.md                # Overview of project structure
│   ├── change-events/
│   │   ├── project.md           # Project config and key files
│   │   ├── current-session.md   # Active session (if any)
│   │   ├── last-session.md      # Previous session for context
│   │   ├── sessions/            # Session history archive
│   │   ├── tasks/               # Task definitions
│   │   │   └── task-xxx.md
│   │   ├── results/             # Verification results
│   │   │   └── verified-xxx.md
│   │   └── worker-done-xxx.md   # Worker completion signals
│   ├── direct-costs/
│   │   └── (same structure)
│   └── ...
```

---

## Session Protocol

### Starting a Session

1. **Register the session:**
   ```bash
   ./scripts/claude-orchestrator.sh start --project <name>
   ```

2. **Read project context:**
   - `.claude/projects/<name>/project.md` - Key files and test commands
   - Task file in `documentation/*project-mgmt/in-progress/<name>/`

3. **Find next task:**
   - Look for unchecked `- [ ]` items in the TASKS file
   - Update TodoWrite with your current task

### During the Session

1. **After every code change:**
   ```bash
   npm run quality --prefix frontend
   ```

2. **When completing a task:**
   - Run feature tests: `npx playwright test --grep "<project>"`
   - Check the checkbox in the TASKS file
   - Update progress notes

3. **Every 30 minutes:**
   - Update `current-session.md` with progress
   - Commit work-in-progress if significant

### Ending a Session

1. **End properly:**
   ```bash
   ./scripts/claude-orchestrator.sh end --project <name>
   ```

2. **Before ending, ensure:**
   - All code changes committed
   - TASKS file updated with completed items
   - Progress notes written

---

## Verification Patterns

### Pattern 1: Skeptical Verifier

The verifier assumes the worker LIED and must prove otherwise:

```
Verification Prompt:

SKEPTICAL VERIFIER MODE

Assume the previous agent LIED about completion.
Assume tests were NOT actually run.
Assume requirements are NOT actually met.

Your job: PROVE these assumptions wrong, or confirm them.

1. Read the requirements from: [file]
2. Check if code exists: [paths]
3. ACTUALLY RUN: npm run quality --prefix frontend
4. ACTUALLY RUN: npx playwright test --grep "[project]"
5. Show me the REAL output

If anything fails, the task is NOT complete.
```

### Pattern 2: Checklist Verifier

Verify each item with evidence:

```
CHECKLIST VERIFICATION

Task: [description]

Verify EACH item. Mark with evidence:

[ ] Code file exists: ls -la path/to/file
[ ] Code compiles: npm run quality --prefix frontend 2>&1
[ ] Tests exist: ls -la tests/
[ ] Tests pass: npx playwright test --grep "[project]" 2>&1 | tail -50
[ ] Feature works: [specific verification command]

For each checkbox, show the ACTUAL command output.
No checkmarks without evidence.
```

### Pattern 3: Adversarial Tester

Try to break the implementation:

```
ADVERSARIAL TESTING MODE

The implementation claims to handle: [feature]

Your job: TRY TO BREAK IT

1. Test edge cases
2. Test invalid inputs
3. Test boundary conditions
4. Test error handling
5. Test concurrent access (if applicable)

Write and run tests that the original developer probably missed.
Report any failures found.
```

---

## Context Window Management

### Signs Your Context is Degraded

1. Claude starts forgetting earlier instructions
2. Responses become less coherent
3. It repeats mistakes you already corrected
4. It loses track of the overall goal

### Strategies

1. **Project Isolation:** Each project has its own session with focused context
2. **File-Based State:** Don't rely on conversation memory; write to files
3. **Fresh Verifiers:** Verification agents start with zero context
4. **Session Rotation:** End and restart sessions for fresh context

---

## Conflict Prevention

### Project Locking

The orchestrator prevents two sessions from working on the same project:

```bash
$ ./scripts/claude-orchestrator.sh start --project change-events
✗ Project 'change-events' already has an active session!

# Active Session: change-events
**Session ID:** session-20260110-123456-12345
**Started:** 2026-01-10T12:34:56-05:00
...

⚠ Wait for the other session to end, or use 'force-release' if it's stale
```

### Force Release

If a session becomes stale (terminal closed without ending):

```bash
./scripts/claude-orchestrator.sh force-release --project change-events
```

---

## Integration with Project Management

The orchestrator connects to your existing project management:

```
.claude/projects/          ←→  documentation/*project-mgmt/in-progress/
├── change-events/              ├── change-events/
│   └── project.md (links to)   │   ├── TASKS-CHANGE-EVENTS.md
│                               │   └── specs, crawl data, etc.
├── direct-costs/               ├── direct-costs/
│   └── project.md (links to)   │   ├── TASKS-DIRECT-COSTS.md
│                               │   └── specs, crawl data, etc.
```

**Task tracking stays in `documentation/*project-mgmt/in-progress/`**
**Session tracking lives in `.claude/projects/`**

---

## Command Reference

| Command | Description |
|---------|-------------|
| `init` | Initialize orchestrator and create project folders |
| `start --project <name>` | Start a session for a project |
| `end --project <name>` | End a session |
| `force-release --project <name>` | Force release a stuck session |
| `dashboard` | Show status of all projects and sessions |
| `create-task --project <name> --desc "..."` | Create a tracked task |
| `worker --project <name> --task <id>` | Spawn worker agent |
| `verify --project <name> --task <id>` | Spawn verifier agent |
| `auto-verify --project <name> --task <id>` | Watch and auto-verify |

---

## Best Practices

1. **One project per terminal** - Never mix projects in a single session
2. **Start before coding** - Always register your session first
3. **End properly** - Don't just close the terminal
4. **Verify complex work** - Use verifier agents for anything non-trivial
5. **Check the dashboard** - Know what else is running before you start
6. **Quality gates are mandatory** - Run `npm run quality` after every change
7. **Update TASKS files** - Check boxes as you complete work

---

## Troubleshooting

### "Project already has an active session"
- Check the dashboard to see who's using it
- If stale, use `force-release`

### Verifier can't find worker completion signal
- Ensure worker created `.claude/projects/<project>/worker-done-<task>.md`
- Check the task file exists

### Context getting polluted
- End the session and start fresh
- Use the verifier pattern to get fresh perspective

---

*This system ensures parallel execution, prevents conflicts, and enforces verification through independent agents.*
