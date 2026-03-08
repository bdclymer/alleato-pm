# Claude Task Tracking System

This directory contains task tracking and verification state for Claude Code agents.

## Directory Structure

```bash
.claude/
├── README.md                # This file
├── task-log.md              # Append-only log of all task completions
├── current-task.md          # Active task for current session (optional)
├── tasks/                   # Individual task definitions
│   └── task-[id].md
├── sessions/                # Session tracking files
│   └── session-[id].md
├── templates/               # Templates for creating new tasks/reports
│   ├── task.md             # Task definition template
│   ├── worker-done.md      # Worker completion report template
│   └── verified.md         # Verification report template
├── worker-done-[id].md      # Worker completion signals
└── verified-[id].md         # Verification reports

## Helper Script

Location: `scripts/claude-helpers.sh`

### Commands

```
# Initialize tracking system
bash scripts/claude-helpers.sh init

# Generate new task ID
TASK_ID=$(bash scripts/claude-helpers.sh new-task)
# Output: task-20240110-143000-abc123

# Generate new session ID
SESSION_ID=$(bash scripts/claude-helpers.sh new-session)
# Output: session-20240110-143000-12345

# Log task completion
bash scripts/claude-helpers.sh log \
  "task-20240110-143000-abc123" \
  "Implement user auth" \
  "VERIFIED" \
  ".claude/verified-task-20240110-143000-abc123.md"

# Check status
bash scripts/claude-helpers.sh status
```yaml
## Workflow

### 1. Main Claude Creates Task

```
# Generate ID
TASK_ID=$(bash scripts/claude-helpers.sh new-task)

# Create task file (customize from template)
cp .claude/templates/task.md .claude/tasks/$TASK_ID.md
# Edit the file with actual requirements
```yaml
### 2. Main Claude Spawns Worker (Task Tool)

```
Task({
  subagent_type: "backend-architect",
  prompt: `WORKER AGENT MODE

  Task: .claude/tasks/${TASK_ID}.md
  [paste task content]

  When done: create .claude/worker-done-${TASK_ID}.md`,
  description: "Implement feature"
})
```

### 3. Worker Signals Completion

Worker creates: `.claude/worker-done-${TASK_ID}.md`

### 4. Main Claude Spawns Verifier (Task Tool)

```
Task({
  subagent_type: "debugger",
  prompt: `VERIFIER AGENT MODE

  Task: .claude/tasks/${TASK_ID}.md
  Worker Report: .claude/worker-done-${TASK_ID}.md

  VERIFY INDEPENDENTLY. Create .claude/verified-${TASK_ID}.md`,
  description: "Verify feature"
})
```bash
### 5. Main Claude Logs Result

```
# Read verification status
if grep -q "VERIFIED ✓" .claude/verified-${TASK_ID}.md; then
  STATUS="VERIFIED"
else
  STATUS="FAILED"
fi

# Log to task log
bash scripts/claude-helpers.sh log \
  "$TASK_ID" \
  "Feature description" \
  "$STATUS" \
  ".claude/verified-${TASK_ID}.md"
```

## Key Principles

1. **Worker agents implement** - they do NOT test or verify
2. **Verifier agents verify** - with FRESH CONTEXT (independent)
3. **Main Claude orchestrates** - using Task tool (not bash)
4. **Files are state** - all state stored in .claude/ files
5. **Evidence required** - no claims without proof

## Anti-Patterns

❌ Worker runs tests → Verifier should run tests
❌ Same agent verifies own work → Spawn fresh verifier
❌ Trust worker claims → Verify independently
❌ "Tests should pass" → Show actual test output

## Status Indicators

| Icon | Meaning |
|------|---------|
| ⏳ | Task created, work not started |
| 🔨 | Worker in progress |
| 🔍 | Worker done, awaiting verification |
| ✓ | Verified successfully |
| ✗ | Verification failed |

## See Also

- `/CLAUDE.md` - Main project instructions
- `/documentation/SUBAGENT-GUIDE.md` - Detailed sub-agent patterns
- `scripts/claude-helpers.sh` - Helper utilities
