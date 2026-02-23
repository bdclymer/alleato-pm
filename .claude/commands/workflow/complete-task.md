# Complete Task with Verification

This command completes a task and automatically runs verification to ensure it's actually done correctly.

## Usage

```bash
# After completing any task, run:
npx tsx scripts/complete-task.ts "Description of what you did"

# Example:
npx tsx scripts/complete-task.ts "Updated executive page to use full-width dashboard layout"
```
## What It Does

1. **Generates Task Manifest** - Analyzes git changes and creates verification plan
2. **Runs Verification** - Executes appropriate checks based on task type
3. **Reports Results** - Shows what passed/failed
4. **Blocks if Failed** - Won't mark task complete if verification fails

## Task Types Detected

- **UI Change** - Visual verification, responsive checks, layout metrics
- **API Change** - Endpoint tests, contract validation, error handling
- **Database Change** - Migration tests, rollback verification
- **Feature** - Functional tests, integration checks
- **Bug Fix** - Regression tests, fix validation

## Example Output

```yaml
🔍 Analyzing task: Updated executive page layout
📋 Task type detected: ui-change
📁 Files modified: 3

Generated verification manifest:

- Need visual verification: ✓
- Need functional verification: ✓
- Success criteria: 4 items

Starting verification...

📝 Verifying code quality...
  Checking TypeScript... ✅ No TypeScript errors
  Checking ESLint... ✅ No linting errors
  Checking Build... ✅ Build successful

🎨 Verifying visual changes...
  Visual - /executive (desktop)... ❌ Dashboard only using 65.2% of viewport
  Visual - /executive (tablet)... ✅ Visual verification passed
  Visual - /executive (mobile)... ✅ Visual verification passed

✅ Verifying success criteria...
  Criterion: Dashboard uses >95% of viewport width... ❌

==================================================
📊 VERIFICATION COMPLETE
==================================================

Status: ❌ FAILED
Report saved to: .claude/verification/reports/task-123-report.md

❌ Task cannot be marked complete due to verification failures.

```

## Integration with Claude Code

When using Claude Code, always run this command after completing a task:

1. Make your changes
2. Test manually if needed
3. Run: `npx tsx scripts/complete-task.ts "What you did"`
4. Only proceed if verification passes

This ensures "common sense" issues are caught automatically before claiming completion.
