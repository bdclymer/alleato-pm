# Codex Cloud Task Automation Guide

**Last Updated:** 2026-01-11
**Purpose:** Execute large AI-powered tasks in GitHub Actions cloud

---

## 🎯 Quick Start

### Option 1: Manual Workflow Dispatch (Immediate)

**Best for:** Single, well-defined tasks you want to execute now

1. Go to **Actions** tab on GitHub
2. Select **"Codex Task Automation"** workflow
3. Click **"Run workflow"**
4. Fill in the form:
   - **Task type:** Choose from dropdown
   - **Target path:** (optional) File/directory to target
   - **Description:** Detailed instructions
5. Click **"Run workflow"**

**Result:** Codex runs in cloud, creates PR with changes

---

### Option 2: GitHub Issues (For Tracking & Async)

**Best for:** Multiple tasks, team collaboration, async execution

#### Step 1: Create Issue with Codex Template

1. Go to **Issues** → **New Issue**
2. Choose template:
   - **"Codex Feature Request"** - For new features
   - **"Codex Bug Report"** - For bug fixes
   - **"Codex Refactor/Hardening"** - For code quality
3. Fill in all sections (see examples below)
4. Add label: `codex` (auto-added by template)
5. Create issue

#### Step 2: Trigger Codex (Manual - Until Automated)

Currently, you need to manually trigger the workflow:

1. Go to **Actions** → **Codex Task Automation**
2. Click **"Run workflow"**
3. Reference the issue in description: "Implement #123"

**Note:** See "Missing Piece" section below for automated issue handling

---

## 📋 What You Have Set Up

### 1. Codex Task Automation Workflow ✅

**File:** `.github/workflows/codex-task-automation.yml`

**Capabilities:**
- Generate Supabase types
- Generate component tests (Playwright)
- Update documentation
- Refactor code
- Create database migrations

**Quality Gates:**
- TypeScript typecheck
- ESLint
- Build verification
- Playwright tests (for test generation)

**Output:** Creates PR with changes

---

### 2. Codex PR Review ✅

**File:** `.github/workflows/codex-pr-review.yml`

**Triggers:** Automatically on PR open/update
**What it does:**
- Reviews TypeScript/JavaScript/SQL changes
- Posts review comments
- Blocks merge if CRITICAL issues found

**No setup needed - runs automatically**

---

### 3. Codex Auto-Fix CI Failures ✅

**File:** `.github/workflows/codex-autofix.yml`

**Triggers:** When CI fails on a PR
**What it does:**
- Analyzes CI failure logs
- Attempts to fix TypeScript/ESLint errors
- Creates PR with fixes
- Comments on original PR

**No setup needed - runs automatically when CI fails**

---

### 4. Issue Templates ✅

**Templates:**
- `ai_feature.md` - Feature requests
- `ai_bug.md` - Bug reports
- `ai_refactor.md` - Refactoring tasks

**All structured for Codex execution**

---

## ❌ Missing Piece: Issue-Triggered Workflow

**What's missing:** Automatic Codex execution when issues are created

**See:** "Recommended: Issue-Triggered Workflow" section below for implementation

---

## 🔧 Detailed Usage Examples

### Example 1: Generate Playwright Tests for New Component

**Via Workflow Dispatch:**

1. Actions → Codex Task Automation → Run workflow
2. Fill in:
   ```
   Task type: generate-component-tests
   Target path: frontend/src/components/contracts/ContractForm.tsx
   Description: Generate comprehensive E2E tests for the ContractForm component.
   Include:
   - Form validation tests
   - API submission tests
   - Error handling tests
   - Visual regression tests
   ```
3. Run workflow
4. Wait ~5-10 minutes
5. Review PR created by Codex

---

### Example 2: Create Database Migration

**Via Workflow Dispatch:**

1. Actions → Codex Task Automation → Run workflow
2. Fill in:
   ```
   Task type: create-migration
   Target path: N/A
   Description: Add audit_log table with user_id, action, metadata columns.
   Include RLS policies for user access only.
   ```
3. Run workflow
4. Review PR with migration + regenerated types

---

### Example 3: Refactor Legacy Component

**Via GitHub Issue:**

1. Create issue with "Codex Refactor/Hardening" template:
   ```markdown
   ## Objective
   Refactor BudgetTable component to use shared DataTable component

   ## Scope & Starting Points
   - Target files:
     - frontend/src/components/budget/BudgetTable.tsx
     - frontend/src/components/shared/DataTable.tsx
   - Related docs: CLAUDE.md, component-system-consistency

   ## Acceptance Criteria
   - [ ] BudgetTable uses DataTable component
   - [ ] All existing tests pass
   - [ ] No visual regressions
   - [ ] TypeScript strict mode passes

   ## Required Commands
   - npm run quality --prefix frontend
   - npm run test:e2e -- budget
   ```

2. Then manually trigger workflow (for now):
   - Actions → Codex Task Automation → Run workflow
   - Task type: refactor-code
   - Target path: frontend/src/components/budget/BudgetTable.tsx
   - Description: "Implement issue #XXX"

---

## 🚀 Recommended: Issue-Triggered Workflow

**What this does:** Automatically executes Codex when issue is created with `codex` label

**Create:** `.github/workflows/codex-issue-handler.yml`

```yaml
name: Codex Issue Handler

on:
  issues:
    types: [opened, labeled]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  handle_codex_task:
    # Only run if issue has 'codex' label
    if: contains(github.event.issue.labels.*.name, 'codex')
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend

      - name: Setup git identity
        run: |
          git config --global user.email "codex[bot]@users.noreply.github.com"
          git config --global user.name "Codex Issue Bot"

      - name: Parse issue type
        id: issue_type
        run: |
          LABELS=$(echo '${{ toJSON(github.event.issue.labels.*.name) }}')

          if echo "$LABELS" | grep -q "feature"; then
            echo "task_type=feature" >> $GITHUB_OUTPUT
          elif echo "$LABELS" | grep -q "bug"; then
            echo "task_type=bug" >> $GITHUB_OUTPUT
          elif echo "$LABELS" | grep -q "refactor"; then
            echo "task_type=refactor" >> $GITHUB_OUTPUT
          else
            echo "task_type=general" >> $GITHUB_OUTPUT
          fi

      - name: Create task branch
        id: branch
        run: |
          ISSUE_NUM=${{ github.event.issue.number }}
          BRANCH_NAME="codex-issue-${ISSUE_NUM}-$(date +%s)"
          git checkout -b "$BRANCH_NAME"
          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT

      - name: Comment on issue - Starting
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: ${{ github.event.issue.number }},
              body: `🤖 **Codex Starting Task**

              Branch: \`${{ steps.branch.outputs.branch_name }}\`
              Task Type: ${{ steps.issue_type.outputs.task_type }}

              I'll post a PR when complete.`
            });

      - name: Install Codex CLI
        run: npm install -g @openai/codex

      - name: Execute Codex Task
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          # Extract issue body
          ISSUE_BODY=$(cat << 'ISSUE_EOF'
          ${{ github.event.issue.body }}
          ISSUE_EOF
          )

          # Create Codex prompt
          cat > /tmp/codex_issue_prompt.txt << 'PROMPT_EOF'
          $(cat .github/prompts/task-automation.txt)

          **GitHub Issue Task**

          Issue #${{ github.event.issue.number }}: ${{ github.event.issue.title }}
          Type: ${{ steps.issue_type.outputs.task_type }}

          **Issue Description:**
          ${ISSUE_BODY}

          **Instructions:**
          1. Read the issue carefully
          2. Implement all acceptance criteria
          3. Run all required commands listed in issue
          4. Ensure quality checks pass
          5. Generate tests if specified

          Complete this task following all requirements in the issue.
          PROMPT_EOF

          codex exec \
            --prompt-file /tmp/codex_issue_prompt.txt \
            --workspace ./ \
            --full-auto

      - name: Run quality checks
        id: quality
        run: |
          cd frontend
          npm run quality
          npm run build
          echo "quality_status=success" >> $GITHUB_OUTPUT

      - name: Commit changes
        if: steps.quality.outputs.quality_status == 'success'
        run: |
          git add .
          git commit -m "feat(issue-${{ github.event.issue.number }}): ${{ github.event.issue.title }}

          Implements #${{ github.event.issue.number }}

          Automated by Codex CLI
          Verified: typecheck ✓ lint ✓ build ✓" || echo "No changes"

      - name: Push branch
        if: steps.quality.outputs.quality_status == 'success'
        run: |
          git push origin ${{ steps.branch.outputs.branch_name }}

      - name: Create PR
        if: steps.quality.outputs.quality_status == 'success'
        id: create_pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🤖 Implement: ${{ github.event.issue.title }}`,
              head: '${{ steps.branch.outputs.branch_name }}',
              base: 'main',
              body: `## Implements #${{ github.event.issue.number }}

              **Original Issue:** #${{ github.event.issue.number }}

              ### Changes
              This PR implements the requirements specified in the issue.

              ### Verification
              - ✅ TypeScript type check passed
              - ✅ ESLint check passed
              - ✅ Build successful

              ### Review Checklist
              - [ ] All acceptance criteria met
              - [ ] Tests pass
              - [ ] No breaking changes
              - [ ] Documentation updated (if needed)

              ---
              🤖 *Automated by Codex CLI*

              Closes #${{ github.event.issue.number }}`
            });

            core.setOutput('pr_number', pr.data.number);
            return pr.data.number;

      - name: Comment on issue - Success
        if: steps.quality.outputs.quality_status == 'success'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: ${{ github.event.issue.number }},
              body: `🤖 **Codex Task Complete**

              ✅ Implementation created: #${process.env.PR_NUMBER}

              Please review and merge if acceptable.`
            });

      - name: Comment on issue - Failure
        if: steps.quality.outputs.quality_status != 'success'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: ${{ github.event.issue.number }},
              body: `🤖 **Codex Task Failed**

              ❌ Unable to complete task - quality checks failed

              Please check workflow logs and adjust requirements if needed.`
            });
```

**To enable:**
1. Create this file
2. Commit and push
3. Now creating issues with `codex` label will auto-trigger Codex

---

## 🎨 Best Practices

### 1. Be Specific in Descriptions

❌ Bad:
```
Description: Fix the budget page
```

✅ Good:
```
Description: Fix BudgetTable component pagination.
Issue: Clicking "Next" loads wrong page.
Expected: Page 2 should show rows 11-20.
Current: Page 2 shows rows 1-10 again.
File: frontend/src/components/budget/BudgetTable.tsx
```

---

### 2. Provide Full Context

Include in description:
- Exact file paths
- Expected behavior
- Current behavior
- Relevant documentation to reference
- Test data/seeds needed

---

### 3. Use Acceptance Criteria

Always include in issues:
```markdown
## Acceptance Criteria
- [ ] Specific, testable outcome 1
- [ ] Specific, testable outcome 2
- [ ] Tests added/updated
- [ ] Screenshots attached (if UI)
```

---

### 4. Reference Related Issues/PRs

```
Description: Implement feature similar to #123 but for contracts.
See PR #456 for reference implementation.
```

---

### 5. Specify Quality Requirements

```
## Required Commands
- npm run quality --prefix frontend
- npm run test:e2e -- contracts
- npm run build --prefix frontend
```

Codex will run these before completing.

---

## 📊 Workflow Comparison

| Method | Best For | Trigger | Time | Creates |
|--------|----------|---------|------|---------|
| **Manual Dispatch** | Quick tasks | Manual | ~5-10min | PR |
| **Issue (manual trigger)** | Tracked work | Manual | ~5-10min | PR + Issue link |
| **Issue (auto trigger)** | Async batch work | Auto | ~5-10min | PR + Comments |
| **PR Review** | Code review | Auto | ~2-3min | Comment |
| **Auto-fix** | CI failures | Auto | ~5-10min | PR |

---

## 🔐 Security & Limits

### API Keys Required

Set in GitHub repository secrets:
- `OPENAI_API_KEY` - For Codex CLI

### Resource Limits

- **Timeout:** 30 minutes per workflow
- **Concurrent:** 1 Codex task at a time (GitHub Actions)
- **Cost:** OpenAI API usage (monitor billing)

### Safety Checks

All Codex-generated code:
- ✅ Must pass TypeScript typecheck
- ✅ Must pass ESLint
- ✅ Must build successfully
- ✅ Creates PR (never commits to main)
- ✅ Requires human review before merge

---

## 📈 Monitoring

### Check Workflow Status

1. Go to **Actions** tab
2. Filter by workflow name
3. Check status: ✅ Success | ❌ Failed | 🟡 In Progress

### Check Codex-Created PRs

Filter PRs by:
- Label: `codex`
- Author: `github-actions[bot]`

---

## 🆘 Troubleshooting

### Issue: Workflow Times Out

**Solution:**
- Break task into smaller subtasks
- Use workflow dispatch instead of issue trigger
- Increase timeout in workflow (max 6 hours)

### Issue: Quality Checks Fail

**Solution:**
- Review Codex output in logs
- Trigger auto-fix workflow
- Manual fix + re-run

### Issue: Codex Doesn't Understand Task

**Solution:**
- Be more specific in description
- Reference existing files
- Include examples
- Break into smaller tasks

---

## 🚀 Next Steps

### Immediate (Do Now)

1. **Test workflow dispatch:**
   - Actions → Codex Task Automation → Run workflow
   - Try "generate-supabase-types"

2. **Create test issue:**
   - Use "Codex Feature Request" template
   - Small task to verify setup

### Short Term (This Week)

1. **Implement issue-triggered workflow** (see above)
2. **Set up monitoring** for Codex API usage
3. **Train team** on using Codex issues

### Long Term (This Month)

1. **Create custom task types** for common patterns
2. **Optimize prompts** based on results
3. **Set up cost alerts** for API usage

---

## 📚 Related Documentation

- **Workflow Files:** `.github/workflows/codex-*.yml`
- **Issue Templates:** `.github/ISSUE_TEMPLATE/ai_*.md`
- **Prompts:** `.github/prompts/task-automation.txt`
- **Project Standards:** `CLAUDE.md`

---

## 💡 Pro Tips

1. **Start small:** Test with simple tasks first
2. **Iterate prompts:** Improve based on results
3. **Review everything:** Never merge Codex PRs without review
4. **Monitor costs:** OpenAI API usage adds up
5. **Use labels:** Tag Codex issues for easy filtering

---

**Questions?** See GitHub Actions docs or ask in #engineering

**Last Updated:** 2026-01-11
