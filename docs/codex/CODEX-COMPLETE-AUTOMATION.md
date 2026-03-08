# Codex Complete Automation Pipeline

**Created:** 2026-01-11
**Status:** ✅ FULLY IMPLEMENTED

Your complete end-to-end automation pipeline is now ready.

---

## 🎯 What You Asked For

> "I want to be able to tell codex or claude code what I want to have done, have you or codex automatically create the issue that is synced with github, the tasks are completed and a PR is automatically created. this then triggers the Codex pr review to double check it work."

**✅ THIS IS NOW POSSIBLE**

---

## 🔄 Complete Flow (End-to-End)

```bash
┌─────────────────────────────────────────────────────────────┐
│  YOU: Describe what you want done                          │
│  "Add user profile page with avatar upload"                │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐
│ Option 1:        │            │ Option 2:        │
│ Claude Code      │            │ Terminal Script  │
│ /codex-task      │            │ ./scripts/...    │
└──────────────────┘            └──────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         ▼
        ┌────────────────────────────────┐
        │  GitHub Issue Created          │
        │  • Labeled: 'codex'            │
        │  • Formatted from template     │
        │  • Synced to GitHub            │
        └────────────────────────────────┘
                         │
                         ▼ (AUTO-TRIGGERS)
        ┌────────────────────────────────┐
        │  Codex Issue Handler Workflow  │
        │  (.github/workflows/           │
        │   codex-issue-handler.yml)     │
        │                                │
        │  1. Reads issue requirements   │
        │  2. Creates task branch        │
        │  3. Executes Codex in cloud    │
        │  4. Runs quality checks        │
        │  5. Comments on issue          │
        └────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
        ┌─────────────┐   ┌─────────────┐
        │  Success    │   │  Failure    │
        │  Creates PR │   │  Comments   │
        └─────────────┘   │  with logs  │
                │         └─────────────┘
                ▼
        ┌────────────────────────────────┐
        │  Pull Request Created          │
        │  • Links to issue              │
        │  • Contains changes            │
        │  • All quality checks passed   │
        └────────────────────────────────┘
                         │
                         ▼ (AUTO-TRIGGERS)
        ┌────────────────────────────────┐
        │  Codex PR Review Workflow      │
        │  (.github/workflows/           │
        │   codex-pr-review.yml)         │
        │                                │
        │  1. Reviews code changes       │
        │  2. Posts review comments      │
        │  3. Blocks if CRITICAL issues  │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  YOU: Review and Merge         │
        │  • Check implementation        │
        │  • Review Codex comments       │
        │  • Merge when satisfied        │
        └────────────────────────────────┘
```diff
**Total automation:** From describing task → Merged PR
**Your involvement:** Initial description + final review/merge

---

## 🚀 How to Use (Two Methods)

### Method 1: Claude Code Slash Command (Recommended)

**From any terminal with Claude Code:**

```bash
# Interactive prompt-based creation
/codex-task
```text
**Example session:**
```

$ /codex-task

🤖 Create Codex Task

Task type:

  1. Feature
  2. Bug
  3. Refactor
  4. Tests
  5. Migration
  6. Documentation

Choose (1-6): 1

Title: Add user profile page

Target path: frontend/src/app/[projectId]/profile/

Description:
> Create user profile page with:
>
> - Display user info (name, email, role)
> - Edit profile form
> - Avatar upload
> (Press Enter twice to finish)

Creating issue... ✓

Issue created: <https://github.com/user/repo/issues/123>
Codex will start automatically (watch for comments on issue)

```diff
**Advantages:**
- Integrated with Claude Code workflow
- Can use within Claude Code session
- Familiar `/` command interface

---

### Method 2: Direct Script Execution

**From terminal:**

```bash
./scripts/create-codex-task.sh
```yaml
**Same interactive prompts as Method 1**

**Advantages:**

- No Claude Code required
- Can use from any terminal
- Can be called from other scripts/automation

---

## 📋 What Happens Automatically

### 1. Issue Creation (Your Action)

**You provide:**

- Task type (feature/bug/refactor/tests/migration/docs)
- Title
- Target path
- Description

**Tool creates:**

- GitHub issue with proper formatting
- Auto-labels with 'codex' + task type
- Structured acceptance criteria
- Required commands section

### 2. Codex Execution (Automatic)

**Workflow triggers when issue labeled 'codex'**

**Codex does:**

- Adds 'codex-processing' label
- Creates branch: `codex/issue-{number}-{type}`
- Comments: "🤖 Codex Task Started"
- Reads CLAUDE.md for project standards
- Analyzes target code area
- Implements requirements
- Runs quality checks:
  - TypeScript typecheck
  - ESLint
  - Build verification

### 3. Quality Gate (Automatic)

**If quality checks PASS:**

- Commits changes with structured message
- Pushes branch
- Creates PR with:
  - Link to original issue
  - Implementation summary
  - Verification checklist
  - Auto-includes "Closes #{issue-number}"
- Comments on issue: "✅ PR created"
- Removes 'codex-processing' label
- Adds 'codex-completed' label

**If quality checks FAIL:**

- Comments on issue with error details
- Branch remains (you can manually fix)
- Removes 'codex-processing' label
- Adds 'codex-failed' label
- Includes link to workflow logs

### 4. PR Review (Automatic)

**PR creation auto-triggers Codex PR Review**

**Review checks:**

- Code quality and SOLID principles
- Security vulnerabilities (OWASP)
- Consistency with existing patterns
- Performance issues
- Maintainability concerns

**Posts review comment with:**

- Overall assessment
- Specific issues found
- Severity levels (CRITICAL/HIGH/MEDIUM/LOW)
- BLOCKS merge if CRITICAL issues found

### 5. Human Review (Your Action)

**You:**

- Review implementation
- Check Codex review comments
- Verify acceptance criteria met
- Merge when satisfied

---

## 🎯 Task Types & Templates

### 1. Feature Request

**When to use:** New functionality, new components, new pages

**Auto-includes:**

- Objective section
- Scope & Starting Points
- Acceptance Criteria checklist
- Required Commands

**Example:**

```yaml
Title: Add budget export to Excel
Target: frontend/src/app/[projectId]/budget/
Description: Create export button that downloads budget as .xlsx
```

### 2. Bug Report

**When to use:** Fixing broken functionality, errors, unexpected behavior

**Auto-includes:**

- Bug Description
- Location
- Expected vs Current Behavior
- Regression prevention requirements

**Example:**

```yaml
Title: Budget totals incorrect when filtering
Target: frontend/src/components/budget/BudgetTable.tsx
Description: Totals don't update when filters applied
```yaml
### 3. Refactor

**When to use:** Code quality improvements, pattern consistency, tech debt

**Auto-includes:**

- Refactoring Goal
- No-breaking-changes requirement
- Test coverage maintenance

**Example:**

```yaml
Title: Refactor legacy DirectoryList to use shared components
Target: frontend/src/components/directories/DirectoryList.tsx
```

### 4. Tests

**When to use:** Adding missing test coverage

**Auto-includes:**

- Test Coverage Requirements
- E2E, edge cases, error handling
- Playwright test commands

**Example:**

```yaml
Title: Add E2E tests for contract form
Target: frontend/tests/e2e/contract-form.spec.ts
```yaml
### 5. Migration

**When to use:** Database schema changes

**Auto-includes:**

- Migration requirements
- RLS policy reminder
- Type regeneration commands

**Example:**

```yaml
Title: Add audit_log table
Description: Track user actions with metadata
```

### 6. Documentation

**When to use:** Creating/updating documentation

**Auto-includes:**

- Documentation standards reference
- Validation command
- Examples requirement

---

## 🔍 Monitoring & Tracking

### Watch Issue for Updates

**Codex posts comments at each stage:**

```markdown
🤖 **Codex Task Started**

**Branch:** `codex/issue-123-feature`
**Task Type:** feature
**Target:** frontend/src/app/[projectId]/profile/

I'm working on this now. I'll create a PR when complete.
```diff
**Then later:**

```markdown
🤖 **Codex Task Complete** ✅

**Pull Request:** #456
**Branch:** `codex/issue-123-feature`

### What I Did
- ✅ Analyzed issue requirements
- ✅ Implemented changes
- ✅ Passed TypeScript typecheck
- ✅ Passed ESLint
- ✅ Build successful
- ✅ Created pull request

The PR is ready for your review!
```diff
**Or if failed:**

```markdown
🤖 **Codex Task Failed - Quality Checks** ❌

I attempted to complete the task but the code didn't pass quality checks.

### Quality Check Results
- ❌ TypeScript typecheck
- ✅ ESLint
- ✅ Build

### What Happened
The implementation has errors that need to be fixed before creating a PR.

### Next Steps
1. Check the workflow logs for detailed error messages
2. The branch `codex/issue-123-feature` has the changes
3. You can manually fix the errors and push
```markdown
### Check Workflow Progress

**GitHub Actions tab:**
```

<https://github.com/USER/REPO/actions>

```yaml
**Filter by workflow:**
- "Codex Issue Handler" - See task execution
- "Codex PR Review" - See review results

### Labels Track Status

| Label | Meaning |
|-------|---------|
| `codex` | Issue is eligible for Codex execution |
| `codex-processing` | Currently being worked on |
| `codex-completed` | Successfully completed, PR created |
| `codex-failed` | Execution failed, manual intervention needed |

---

## 🎪 Example Workflows

### Example 1: Add New Feature

**1. Create issue:**
```bash
/codex-task

Task type: 1 (Feature)
Title: Add user search to directory page
Target: frontend/src/app/[projectId]/directory/
Description: Add search input that filters users by name/email
```yaml
**2. Automatic execution:**

- Issue #200 created with 'codex' label
- Workflow triggers in ~5 seconds
- Codex comments: "🤖 Codex Task Started"
- Branch created: `codex/issue-200-feature`

**3. Wait 5-10 minutes:**

- Codex implements search component
- Runs quality checks
- All pass ✓

**4. PR created automatically:**

- PR #201 created
- Links to issue #200
- Codex PR Review auto-runs
- Review comment posted

**5. You review and merge:**

- Check implementation
- Verify search works
- Merge PR
- Issue #200 auto-closes

**Total time:** 5-10 minutes (mostly automated)
**Your time:** 2 minutes (create issue + review)

---

### Example 2: Fix Bug

**1. Create issue:**

```bash
./scripts/create-codex-task.sh

Task type: 2 (Bug)
Title: Budget totals incorrect when filtering by cost code
Target: frontend/src/components/budget/BudgetTable.tsx
Description:
> When filtering by cost code, the totals row shows
> total for ALL rows instead of just filtered rows.
> Expected: Totals should update with filters.
```diff
**2. Automatic execution:**
- Issue #201 created
- Workflow triggers
- Codex analyzes filtering logic
- Identifies root cause: totals calculated before filter applied

**3. Quality checks:**
- ✅ TypeScript
- ✅ ESLint
- ✅ Build

**4. PR created:**
- Includes fix to recalculate totals after filter
- Adds test to prevent regression
- Links to issue #201

**5. Codex PR Review:**
- Reviews fix
- Confirms proper handling
- No CRITICAL issues
- Merge allowed

**6. You verify and merge:**
- Check fix works
- Merge PR
- Bug resolved

---

### Example 3: Batch Multiple Tasks

**Create 5 issues at once:**

```bash
# Issue 1: Add feature
/codex-task
...

# Issue 2: Add tests
/codex-task
...

# Issue 3: Refactor
/codex-task
...

# Issue 4: Fix bug
/codex-task
...

# Issue 5: Update docs
/codex-task
...
```

**All execute in parallel:**

- 5 separate workflow runs
- 5 separate branches
- 5 separate PRs (if all succeed)
- All running simultaneously in cloud

**Result:** 5 PRs ready for review in ~10 minutes

---

## ⚙️ Configuration & Secrets

### Required GitHub Secrets

**Must be set in repository settings:**

```text
OPENAI_API_KEY
```bash
**How to set:**

1. GitHub repo → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key
5. Save

**Without this secret:** Workflow will fail at execution step

### Required Tools (Local)

**For slash command / script:**

- GitHub CLI (`gh`) - Install: `brew install gh`
- Authenticated with GitHub: `gh auth login`

**For Codex execution:**

- None (runs entirely in GitHub Actions cloud)

---

## 🔧 Customization

### Modify Task Types

**Edit:** `scripts/create-codex-task.sh`

**Add new task type:**

```bash
# Around line 60
echo "  7. Performance"

# Around line 75
7) TASK_TYPE="performance" ;;

# Add template around line 200
elif [ "$TASK_TYPE" = "performance" ]; then
    LABELS="codex,performance"
    BODY=$(cat <<EOF
## Performance Issue
...
EOF
)
fi
```markdown
### Modify Codex Prompt

**Edit:** `.github/workflows/codex-issue-handler.yml`

**Section:** "Create Codex prompt from issue" (line ~140)

**Customize:**
- Project context
- Quality requirements
- Forbidden patterns
- Additional instructions

### Modify Quality Checks

**Edit:** `.github/workflows/codex-issue-handler.yml`

**Section:** "Run quality checks" (line ~210)

**Add checks:**
```yaml
- name: Run quality checks
  run: |
    npm run typecheck
    npm run lint
    npm run build
    npm run test  # Add test requirement
```

---

## 🛡️ Safety & Quality

### Multiple Safety Layers

**1. Quality Gates (Automatic):**

- TypeScript must pass (zero errors)
- ESLint must pass (zero errors)
- Build must succeed

**2. Branch Protection:**

- Never commits to main
- Always creates PR
- Requires review before merge

**3. Codex PR Review:**

- Automatic code review
- Security vulnerability scanning
- Pattern consistency checking
- BLOCKS merge if CRITICAL issues

**4. Human Review (You):**

- Final verification
- Functional testing
- Business logic validation

### Cost Controls

**Automatic limits:**

- Workflow timeout: 30 minutes max
- Single task execution
- No recursive triggers

**Monitoring:**

- Check OpenAI dashboard for usage
- Set up billing alerts
- Monitor workflow execution times

**Estimated costs (moderate usage):**

- ~$0.10-0.50 per task
- ~$5-10/month for 20 tasks
- ~$15-30/month for 50 tasks

---

## 📊 Success Metrics

**Track these metrics:**

| Metric | Target | How to Check |
|--------|--------|--------------|
| Task completion rate | >70% | Count codex-completed vs codex-failed labels |
| Quality check pass rate | >85% | Review workflow logs |
| Review-to-merge time | <1 day | PR creation to merge timestamp |
| Critical issues found | 0 per PR | Codex PR Review comments |

**Review monthly:**

- Total tasks executed
- Success/failure ratio
- Common failure patterns
- API costs vs budget

---

## 🆘 Troubleshooting

### Issue Not Auto-Triggering

**Symptoms:** Issue created but workflow doesn't start

**Check:**

1. Issue has 'codex' label?
2. Workflow file exists: `.github/workflows/codex-issue-handler.yml`?
3. GitHub Actions enabled for repo?
4. Check Actions tab for error messages

**Fix:**

```bash
# Manually add label
gh issue edit 123 --add-label codex
```markdown
### Workflow Failing Immediately

**Symptoms:** Workflow starts but fails in first step

**Common causes:**
- Missing `OPENAI_API_KEY` secret
- Branch creation failed (check permissions)
- npm install failed (check package.json)

**Check logs:**
```diff
GitHub → Actions → Failed workflow run → Logs

```markdown
### Quality Checks Failing

**Symptoms:** Codex completes but quality checks fail

**This is expected behavior:**
- Codex attempted implementation
- Code has TypeScript/ESLint errors
- Branch created with changes
- Issue labeled 'codex-failed'

**Next steps:**
1. Check workflow logs for specific errors
2. Checkout branch: `git checkout codex/issue-{number}-{type}`
3. Fix errors manually
4. Push fixes
5. Manually create PR

**Or:**
- Close issue with note
- Create new issue with clearer requirements
- Let Codex try again

### Codex Misunderstood Requirements

**Symptoms:** PR created but implementation is wrong

**This is feedback for improvement:**
- Close PR with explanation
- Update issue with clearer description
- Add examples or references
- Remove 'codex-completed' label
- Re-label with 'codex' to retry

**Tips for better results:**
- Be specific about file locations
- Reference existing patterns
- Include acceptance criteria
- Specify edge cases to handle

---

## 📚 Related Documentation

**Essential reading:**
- `.github/CODEX-QUICK-START.md` - 30-second reference
- `.github/CODEX-CLOUD-TASKS-GUIDE.md` - Comprehensive guide
- `.github/CODEX-WORKFLOWS-DIAGRAM.md` - Visual flow diagrams

**Reference:**
- `CODEX-SETUP-SUMMARY.md` - What you have installed
- `.claude/commands/create-codex-task.md` - Slash command docs
- `.github/workflows/codex-issue-handler.yml` - Workflow source

**Project standards:**
- `CLAUDE.md` - Development standards (what Codex follows)
- `documentation/DOCUMENTATION-STANDARDS.md` - Doc standards

---

## 🎓 Best Practices

### Writing Effective Task Descriptions

**✅ Good:**
```

Title: Add budget export to Excel with custom columns

Target: frontend/src/app/[projectId]/budget/

Description:
Add "Export" button to budget page that:

- Downloads current view as .xlsx file
- Includes all visible columns
- Preserves filters and sorting
- Shows progress indicator during export
- Handles errors gracefully

Follow pattern in frontend/src/lib/excel-export.ts
Use existing Button component from @/components/ui/button

```text
**❌ Bad:**
```yaml
Title: Export feature

Description: Add export

```diff
**Why good example works:**
- Specific location
- Clear requirements
- References existing patterns
- Defines expected behavior
- Includes error handling

### Task Sizing

**Ideal task size:** 1-3 hours of work

**Too large:**
- "Rebuild entire authentication system"
- "Refactor all components to use design system"

**Good size:**
- "Add forgot password flow to login page"
- "Refactor BudgetTable to use DataTable component"

**If task is large:**
- Break into multiple issues
- Create them as sequence (issue 1 → issue 2 → issue 3)
- Let each complete before starting next

### Leveraging Existing Code

**Always reference existing patterns:**

```

Title: Add ContractForm validation

Description:
Add validation to ContractForm following the same pattern as:

- frontend/src/components/budget/BudgetForm.tsx
- Uses zod schemas
- Shows inline error messages
- Validates on blur and submit

```diff
**Codex will:**
- Read referenced files
- Follow established patterns
- Maintain consistency

---

## 🚀 You're Ready!

**Your complete automation pipeline:**

1. ✅ Issue creation (slash command or script)
2. ✅ Auto-triggered execution (workflow)
3. ✅ Quality gates (automated checks)
4. ✅ PR creation (automatic)
5. ✅ Code review (Codex PR Review)
6. ✅ Human verification (you)

**Start with:**
```bash
/codex-task
```text
**Or:**

```bash
./scripts/create-codex-task.sh
```

**Then watch the automation work!**

---

**Questions or issues?**

- Review documentation links above
- Check troubleshooting section
- Create issue with 'codex' label for meta-improvements

**Happy automating! 🤖**
