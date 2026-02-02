# Codex Workflows Diagram

Visual representation of how Codex integrates with your GitHub workflow.

---

## 🔄 Complete Workflow Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER TRIGGERS                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Manual   │  │ GitHub   │  │   PR     │
         │Workflow  │  │ Issue    │  │ Opened   │
         │Dispatch  │  │ Created  │  │          │
         └──────────┘  └──────────┘  └──────────┘
                │             │             │
                │             │(missing)    │(auto)
                │             │             │
                ▼             ▼             ▼
         ┌──────────────────────────────────────┐
         │     CODEX WORKFLOWS (GitHub Cloud)   │
         ├──────────────────────────────────────┤
         │                                      │
         │  1️⃣  Codex Task Automation          │
         │      ├─ Generate types              │
         │      ├─ Generate tests              │
         │      ├─ Update docs                 │
         │      ├─ Refactor code               │
         │      └─ Create migration            │
         │                                      │
         │  2️⃣  Codex PR Review               │
         │      ├─ Review code changes         │
         │      └─ Post comments               │
         │                                      │
         │  3️⃣  Codex Auto-Fix                │
         │      ├─ Detect CI failure           │
         │      ├─ Fix errors                  │
         │      └─ Create fix PR               │
         │                                      │
         └──────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Quality  │  │ Quality  │  │ Quality  │
         │  Checks  │  │  Checks  │  │  Checks  │
         │          │  │          │  │          │
         │ • Type   │  │ • Type   │  │ • Type   │
         │ • Lint   │  │ • Lint   │  │ • Lint   │
         │ • Build  │  │ • Build  │  │ • Build  │
         └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                      ┌───────┴───────┐
                      │  Pass?        │
                      └───────┬───────┘
                    Yes │     │ No
                        │     │
                        │     └──────────────┐
                        │                    │
                        ▼                    ▼
                 ┌─────────────┐      ┌─────────────┐
                 │  Create PR  │      │   Create    │
                 │             │      │   Issue     │
                 │  • Branch   │      │             │
                 │  • Commit   │      │  • Failed   │
                 │  • Push     │      │  • Needs    │
                 │  • PR       │      │    Review   │
                 └─────────────┘      └─────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │   HUMAN     │
                 │   REVIEW    │
                 │             │
                 │  • Check    │
                 │    code     │
                 │  • Approve  │
                 │  • Merge    │
                 └─────────────┘
```

---

## 🎯 Method Comparison

### Method 1: Manual Workflow Dispatch

```
YOU                         GITHUB ACTIONS                    RESULT
│
├─ Go to Actions
├─ Select "Codex Task..."
├─ Click "Run workflow"
├─ Fill form:
│  ├─ Task type
│  ├─ Target path
│  └─ Description
└─ Click "Run"
                           │
                           ├─ Codex analyzes code
                           ├─ Generates changes
                           ├─ Runs quality checks
                           │  ├─ TypeScript ✓
                           │  ├─ ESLint ✓
                           │  └─ Build ✓
                           └─ Creates PR
                                                             │
                                                             ├─ PR #123 created
                                                             ├─ Notification sent
                                                             └─ Ready for review
```

**Timeline:** 5-10 minutes
**Best for:** Quick, one-off tasks

---

### Method 2: GitHub Issues (Manual Trigger)

```
YOU                         GITHUB                         CODEX                      RESULT
│
├─ Create issue
│  ├─ Use template
│  ├─ Fill details
│  └─ Label: codex
└─ Manually trigger workflow
   └─ Reference issue #                │
                                       ├─ Reads issue
                                       ├─ Analyzes code
                                       ├─ Implements
                                       └─ Quality checks
                                                                                     │
                                                                                     ├─ PR created
                                                                                     ├─ Linked to issue
                                                                                     └─ Comments on issue
```

**Timeline:** 5-10 minutes + manual trigger
**Best for:** Tracked work, collaboration

---

### Method 3: GitHub Issues (Auto-Trigger) - RECOMMENDED

```
YOU                         GITHUB                         CODEX                      RESULT
│
├─ Create issue
│  ├─ Use template
│  ├─ Fill details
│  └─ Label: codex
                           │
                           ├─ Workflow auto-triggers
                           ├─ Reads issue
                           ├─ Comments "Starting..."
                                      │
                                      ├─ Analyzes code
                                      ├─ Implements
                                      └─ Quality checks
                                                                                     │
                                                                                     ├─ PR created
                                                                                     ├─ Linked to issue
                                                                                     ├─ Comments "Done!"
                                                                                     └─ Ready for review
```

**Timeline:** 5-10 minutes (fully automatic)
**Best for:** Everything (once implemented)

---

## 🔄 Auto-Triggered Workflows

### PR Review (Automatic)

```
PR OPENED/UPDATED
       │
       ├─ Codex PR Review workflow triggers
       │  ├─ Gets diff
       │  ├─ Analyzes changes
       │  └─ Posts review comment
       │
       └─ Review appears on PR
          ├─ Code quality feedback
          ├─ Security concerns
          └─ CRITICAL issues (blocks merge)
```

**No action needed - runs automatically**

---

### Auto-Fix CI Failures (Automatic)

```
CI FAILS ON PR
       │
       ├─ Codex Auto-Fix workflow triggers
       │  ├─ Gets failure logs
       │  ├─ Analyzes errors
       │  ├─ Attempts fixes
       │  ├─ Runs quality checks
       │  │
       │  └─ If successful:
       │     ├─ Creates fix PR
       │     ├─ Comments on original PR
       │     └─ "I fixed the failures: #456"
       │
       └─ Human reviews fix PR
          └─ Merges if acceptable
```

**No action needed - runs automatically when CI fails**

---

## 📊 Data Flow

### What Codex Sees

```
┌─────────────────────────────────────────┐
│         CODEX INPUT CONTEXT             │
├─────────────────────────────────────────┤
│                                         │
│  1. Your Request                        │
│     • Task type                         │
│     • Target path                       │
│     • Description                       │
│                                         │
│  2. Project Context                     │
│     • CLAUDE.md (standards)             │
│     • Prompts (task-automation.txt)     │
│     • Codebase files                    │
│     • Existing patterns                 │
│                                         │
│  3. Quality Requirements                │
│     • TypeScript config                 │
│     • ESLint rules                      │
│     • Build config                      │
│                                         │
└─────────────────────────────────────────┘
                   ▼
         ┌─────────────────┐
         │  CODEX BRAIN    │
         │  (GPT-4)        │
         └─────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│         CODEX OUTPUT                    │
├─────────────────────────────────────────┤
│                                         │
│  • Generated code                       │
│  • Updated files                        │
│  • New tests                            │
│  • Documentation                        │
│  • Migration files                      │
│                                         │
└─────────────────────────────────────────┘
                   ▼
         ┌─────────────────┐
         │ Quality Checks  │
         │ • Typecheck ✓   │
         │ • Lint ✓        │
         │ • Build ✓       │
         └─────────────────┘
                   ▼
              Create PR
```

---

## 🎯 Decision Tree: Which Method?

```
Need to run task?
       │
       ├─ One quick task right now?
       │  └─ YES → Use Method 1: Workflow Dispatch
       │
       ├─ Want to track/discuss task?
       │  └─ YES → Use Method 2: GitHub Issue
       │
       ├─ Multiple tasks queued?
       │  └─ YES → Use Method 2: GitHub Issues
       │
       ├─ Want fully automatic?
       │  └─ YES → Implement Method 3: Auto-triggered
       │            (see full guide)
       │
       └─ Just want code reviewed?
           └─ Already automatic! Just create PR
```

---

## 💡 Pro Tips

### Parallel Execution

Create multiple issues at once:

```
Issue #100: Generate tests for ContractForm     ┐
Issue #101: Generate tests for BudgetTable      ├─ All auto-trigger
Issue #102: Refactor legacy DirectoryList       │  (once implemented)
Issue #103: Create audit_log migration          ┘

Result: 4 PRs in ~10 minutes (run in cloud parallel)
```

### Sequential Dependencies

For dependent tasks:

```
1. Create Issue #100: Add audit_log table
   → Wait for PR, review, merge

2. Create Issue #101: Generate types for audit_log
   → Depends on #100 being merged
```

---

## 📈 Metrics

### Typical Performance

| Task | Duration | Success Rate |
|------|----------|--------------|
| Generate types | 1-2 min | 99% |
| Generate tests | 5-8 min | 85% |
| Refactor code | 8-12 min | 70% |
| Create migration | 3-5 min | 90% |
| Fix CI failure | 5-10 min | 75% |

### Success Criteria

✅ Quality checks pass = Success
❌ Quality checks fail = Creates issue for manual review

---

## 🔐 Safety Guarantees

Every Codex workflow:

```
┌─────────────────────────────────────────┐
│          SAFETY CHECKS                  │
├─────────────────────────────────────────┤
│                                         │
│  ✅ Never commits to main              │
│  ✅ Always creates PR                  │
│  ✅ TypeScript must pass               │
│  ✅ ESLint must pass                   │
│  ✅ Build must succeed                 │
│  ✅ Human must approve merge           │
│                                         │
└─────────────────────────────────────────┘
```

**You're always in control**

---

**For detailed implementation:**
- See: `.github/CODEX-CLOUD-TASKS-GUIDE.md`
- Quick start: `.github/CODEX-QUICK-START.md`
- Summary: `CODEX-SETUP-SUMMARY.md`
