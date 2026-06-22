---
title: Development Gates
description: Mandatory development gates and quality standards that prevent common errors and ensure code quality in Alleato-Procore.
---

# Development Gates

Development gates are **mandatory checkpoints** that must be followed before performing specific types of work. These gates exist because they prevent hours of debugging and rework. Violating them wastes significant time.

<Callout type="danger">
**These gates are NON-NEGOTIABLE**. Each one exists because we've experienced incidents where skipping it caused major issues.
</Callout>

## Overview of All Gates

| Gate | When to Use | Time Saved |
|------|-------------|------------|
| [Supabase Types Gate](#supabase-types-gate) | Before ANY database code | Hours of debugging type mismatches |
| [Route Naming Gate](#route-naming-gate) | Before creating dynamic routes | Dev server crashes prevented |
| [Playwright Gate](#playwright-gate) | Before diagnosing test failures | Stop guessing, see actual output |
| [Root Cause Gate](#root-cause-gate) | Before modifying code | Avoid fixing wrong problems |
| [Use Available Tools Gate](#use-available-tools-gate) | Before asking user to run commands | Do your job with available tools |
| [Bash Execution Gate](#bash-execution-gate) | Before running bash commands | Prevent path and escaping errors |
| [Scaffolding Gate](#scaffolding-gate) | Before writing CRUD features | Use validated templates |
| [E2E Testing Gate](#e2e-testing-gate) | Before claiming tests pass | Real user workflows, not smoke tests |

---

## 1. Supabase Types Gate

<Callout type="error">
**CRITICAL**: This gate MUST be followed before writing ANY database code.
</Callout>

### The Rule (5 seconds to read, saves hours of debugging)

**BEFORE writing ANY database code:**

<Steps>

### Step 1: Generate Types

```bash
cd frontend
npm run db:types
```bash
This generates `frontend/src/types/database.types.ts` from your Supabase schema.

### Step 2: Read the Generated Types

```bash
cat frontend/src/types/database.types.ts | grep -A 20 "your_table_name"
```typescript
Or use your editor to open and search the file.

### Step 3: Verify Schema

Check that:

- ✅ Table exists in `Tables` interface
- ✅ Column names match exactly (case-sensitive)
- ✅ **FK column types match PK column types**

### Step 4: Write Code

Only AFTER verifying the schema should you write queries, services, hooks, or migrations.

</Steps>

### Critical: Foreign Key Type Matching

When creating a table with a foreign key, the FK column type MUST match the PK type:

| Referenced Table | PK Type | Your FK Column Type |
|-----------------|---------|---------------------|
| `projects` | `id: number` (INTEGER) | `project_id INTEGER` |
| `users` | `id: string` (UUID) | `user_id UUID` |
| `companies` | `id: number` (INTEGER) | `company_id INTEGER` |

<Callout type="warning">
**Historical Incident (2026-01-28)**: A developer created `schedule_tasks.project_id` as UUID, but `projects.id` is INTEGER. This broke ALL queries silently and wasted hours of debugging.
</Callout>

### Triggers

This gate applies when your task involves:

- Supabase queries
- SQL or migrations
- API routes with database calls
- React hooks fetching data
- Any file importing from `@/types/database.types`
- Creating new tables with foreign keys

### Violations (DO NOT DO)

- ❌ Writing `.from('some_table')` without verifying `some_table` exists
- ❌ Referencing `.select('column_name')` without checking the column exists
- ❌ Creating migrations that reference non-existent tables
- ❌ Assuming schema from memory or past conversations
- ❌ Creating FK with wrong type (UUID vs INTEGER)
- ❌ Modifying service code based on grep searches without reading types

---

## 2. Route Naming Gate

<Callout type="error">
**CRITICAL**: Generic `[id]` parameters will crash the Next.js dev server.
</Callout>

### The Rule

**ALWAYS** use specific parameter names in Next.js dynamic routes:

```typescript
// ✅ CORRECT
/app/[projectId]/budget/page.tsx
/app/api/projects/[projectId]/route.ts

// ❌ WRONG - Will crash dev server
/app/[id]/budget/page.tsx
/app/api/projects/[id]/route.ts
```markdown
### Standard Parameter Names

| Resource | Standard Name | Never Use |
|----------|---------------|-----------|
| Project | `[projectId]` | ~~`[id]`~~ |
| Company | `[companyId]` | ~~`[id]`~~ |
| Contract | `[contractId]` | ~~`[id]`~~ |
| User | `[userId]` | ~~`[id]`~~ |
| Record (Admin) | `[recordId]` | ~~`[id]`~~ |

### The Error

When you violate this rule, you'll see:

```

[Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId').]

```typescript
This error is a **HARD BLOCKER**. The dev server will refuse to start.

### Verification Checklist

Before creating ANY dynamic route:

<Steps>

### Step 1: Check Existing Routes

```bash
find frontend/src/app -type d -name "[*]" | grep <resource>
```markdown
### Step 2: Use Consistent Naming

If routes already exist for your resource, use the SAME parameter name.

### Step 3: Run Route Check

```bash
npm run check:routes
```markdown
### Step 4: Start Dev Server

```bash
npm run dev:frontend
```

Verify no error about "different slug names".

</Steps>

<Callout type="info">
See [`.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`](/.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md) for complete documentation.
</Callout>

---

## 3. Playwright Gate

<Callout type="error">
**CRITICAL**: Never guess what's happening in tests. Observe actual browser output.
</Callout>

### The Rule

**BEFORE diagnosing test failures:**

<Steps>

### Step 1: Run the Test

```bash
cd frontend
npm run test:headed -- tests/e2e/your-test.spec.ts
```diff
Run with browser visible so you can SEE what's happening.

### Step 2: Observe the DOM

Watch what actually renders:
- What elements appear?
- What text is displayed?
- What's the actual DOM structure?

### Step 3: Gather Evidence

Take screenshots, check console logs, inspect network requests.

### Step 4: Diagnose

Only AFTER seeing actual behavior should you form hypotheses.

</Steps>

### Banned Before Evidence

These phrases are **BANNED** before you've run the test:

- ❌ "if"
- ❌ "might"
- ❌ "likely"
- ❌ "assuming"
- ❌ "it seems"

Use of conditional language before gathering evidence = **HARD FAILURE**.

### Phase-Based Approach

```mermaid
graph LR
    A[Phase 1: Execute] --> B[Phase 2: State Facts]
    B --> C[Phase 3: Diagnose & Fix]
    style A fill:#ff6b6b
    style B fill:#ffd93d
    style C fill:#6bcf7f
```typescript
**Phase 1** - Execute tools, no reasoning
**Phase 2** - State only confirmed facts
**Phase 3** - Now diagnosis is allowed

---

## 4. Root Cause Gate

<Callout type="error">
**CRITICAL**: Do NOT modify code until the root cause is CONFIRMED through evidence.
</Callout>

### The Rule

Grep searches and assumptions are NOT evidence. Actual runtime output IS evidence.

### Required Process

<Steps>

### Step 1: Gather Evidence (NO CODE CHANGES)

Before ANY code modification:

```bash
# Test API directly
curl -v "http://localhost:3000/api/endpoint"

# Check Supabase directly
node -e 'const { createClient } = require("@supabase/supabase-js"); ...'

# Read error logs
# Check browser console
# Check server-side logs
```markdown
### Step 2: State Root Cause as Fact

Before modifying code, write:

> "The root cause is **X**. Evidence: [specific output/error showing X]."

If you cannot write this statement with evidence, GO BACK TO STEP 1.

### Step 3: Make Targeted Fix

Only modify code directly related to the confirmed root cause.

</Steps>

### Red Flags (STOP and Verify)

If you find yourself doing any of these, **STOP**:

- ⚠️ Making multiple unrelated code changes
- ⚠️ Saying "might be", "could be", "let me try"
- ⚠️ Modifying code based on grep search alone
- ⚠️ Changing code without testing the change
- ⚠️ Chasing multiple hypotheses without confirming any

### Historical Incident (2026-01-28)

**What happened**: A developer modified `scheduling-service.ts` THREE TIMES based on assumptions:
1. Removed `created_by`/`updated_by` (assumed columns don't exist)
2. Investigated `dependency_type` (assumed values wrong)
3. Investigated `is_overdue` (assumed missing property)

**Actual root cause**: `project_id` was UUID but `projects.id` was INTEGER.

**Time wasted**: Multiple unnecessary changes that didn't fix anything.

---

## 5. Use Available Tools Gate

<Callout type="error">
**CRITICAL**: If a tool can do it, USE THE TOOL. Don't tell users to do your job.
</Callout>

### The Rule

Don't make users run commands manually when you have tools available.

### Available Tools

| Task | Use This Tool |
|------|---------------|
| Run SQL in Supabase | `mcp__supabase__execute_sql` or `mcp__supabase__apply_migration` |
| Generate types | `npx supabase gen types ...` via Bash tool |
| Read a file | Read tool |
| Run a command | Bash tool |
| Search for files | Glob tool |

### Decision Tree

```mermaid
graph TD
    A[Need to do something?] --> B{Can I do it with a tool?}
    B -->|YES| C[USE THE TOOL]
    B -->|NO| D[Search for a tool]
    D --> E{Found one?}
    E -->|YES| C
    E -->|NO| F[THEN ask user]
```

### Historical Incident (2026-01-28)

**What happened**: Claude dumped 150+ lines of SQL and told the user:
> "You need to run this SQL in Supabase..."

**User's response**:
> "why can't you run it with the supabase cli or mcp? Get your shit together."

**Lesson**: The user was RIGHT. Tools were available and not used.

---

## 6. Bash Execution Gate

<Callout type="warning">
**IMPORTANT**: Bash commands need careful path and escaping handling.
</Callout>

### Rule 1: Check pwd FIRST

Before running commands with relative paths:

```bash
pwd
```text
Always verify your current directory.

### Rule 2: Use Absolute Paths

```bash
# ❌ WRONG
npx supabase gen types ... > src/types/database.types.ts

# ✅ CORRECT
npx supabase gen types ... > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```javascript
### Rule 3: Don't Chain with cd

```bash
# ❌ WRONG (fails in zsh)
cd frontend && npm run something

# ✅ CORRECT
npm run something --prefix /path/to/frontend
```javascript
### Rule 4: Use Single Quotes for node -e

```bash
# ❌ WRONG
node -e "console.log('Key:', !!process.env.VAR)"  # !! gets interpreted

# ✅ CORRECT
node -e 'console.log("Key:", !!process.env.VAR)'  # Single quotes outer
```

---

## 7. Scaffolding Gate

<Callout type="info">
**BEST PRACTICE**: Use validated templates instead of writing from scratch.
</Callout>

### The Rule

**BEFORE writing new CRUD features from scratch:**

<Steps>

### Step 1: Check for Scaffold

```bash
ls .claude/scaffolds/
```text
Look for a template that matches your pattern.

### Step 2: Use the Scaffold

```bash
# Read templates
cat .claude/scaffolds/crud-resource/migration.sql
cat .claude/scaffolds/crud-resource/service.ts
cat .claude/scaffolds/crud-resource/hook.ts
```sql
### Step 3: Replace Placeholders

Replace `__ENTITY__`, `__entity__`, etc. with your entity names.

### Step 4: Verify Types

```bash
npm run db:types
cat frontend/src/types/database.types.ts | grep your_table
```sql
### Step 5: Customize

Add domain-specific fields and business logic.

</Steps>

### What Scaffolds Guarantee

When using scaffolds, you automatically get:

✅ Correct FK types (INTEGER for project_id)
✅ RLS policies that check project membership
✅ Indexes on foreign keys
✅ `updated_at` triggers
✅ Pagination pattern in services
✅ Error handling in hooks
✅ Form reset on dialog open
✅ Toast notifications for feedback

**Writing from scratch = missing 2-3 of these every time.**

---

## 8. E2E Testing Gate

<Callout type="error">
**CRITICAL**: E2E tests MUST simulate real user actions, not just page loads.
</Callout>

### The Rule

**E2E tests MUST walk through a complete user workflow:**

<Steps>

### Step 1: Navigate to Page

```typescript
await page.goto('/31/directory/users');
await page.waitForLoadState('domcontentloaded');
```

### Step 2: Interact with UI

```typescript
await page.getByRole('button', { name: /add/i }).click();
await page.locator('#first-name').fill('Jane');
```markdown
### Step 3: Submit Form

```typescript
await page.getByRole('button', { name: /create person/i }).click();
```markdown
### Step 4: Verify Result in UI

```typescript
await expect(page.getByText('Jane TestUser')).toBeVisible();
```markdown
### Step 5: Verify Persistence

```typescript
await page.reload();
await expect(page.getByText('Jane TestUser')).toBeVisible();
```

### Step 6: Clean Up

```typescript
test.afterAll(async () => {
  await supabase.from('people').delete().eq('id', testPersonId);
});
```javascript
</Steps>

### What is NOT an E2E Test

These are **smoke tests**, not E2E tests:

```typescript
// ❌ WRONG - Smoke test
test('page loads without errors', async ({ page }) => {
  await page.goto('/some-page');
  await expect(page.locator('h1')).toBeVisible();
});

// ❌ WRONG - Database check, no UI interaction
test('data exists in database', async () => {
  const { data } = await supabase.from('people').select('id');
  expect(data.length).toBeGreaterThan(0);
});
```

### Required for Every Feature

- [ ] At least one **Create** test (fill form, submit, verify)
- [ ] At least one **Read** test (verify data renders correctly)
- [ ] At least one **Edit** test (change field, save, verify)
- [ ] At least one **Delete** test (remove record, verify disappears)
- [ ] Form **validation** test (empty fields, error messages)

<Callout type="info">
See [`.claude/rules/E2E-TESTING-STANDARDS.md`](/.claude/rules/E2E-TESTING-STANDARDS.md) for complete standards.
</Callout>

---

## Gate Enforcement

### Pre-Action Checklist

Before starting any work, check:

- [ ] I know which gates apply to my task
- [ ] I have read the relevant gate documentation
- [ ] I have the necessary tools/access ready
- [ ] I understand why the gate exists

### During Development

- [ ] I am following the gate steps in order
- [ ] I am not skipping steps to save time
- [ ] I am documenting any issues encountered
- [ ] I am gathering evidence before making changes

### Before Committing

- [ ] All applicable gates were followed
- [ ] All quality checks pass (`npm run quality`)
- [ ] All tests pass (`npm run test`)
- [ ] Types are up to date (`npm run db:types`)
- [ ] No dead code or debug statements remain

---

## Why Gates Matter

### Time Savings

Following gates saves hours:

| Gate Followed | Time Saved per Incident |
|---------------|-------------------------|
| Supabase Types | 2-4 hours debugging |
| Route Naming | 1-2 hours troubleshooting |
| Playwright | 1-3 hours guessing |
| Root Cause | 2-6 hours fixing wrong things |
| Bash Execution | 30-60 minutes path issues |

### Quality Improvements

Gates ensure:

- ✅ Type safety throughout the codebase
- ✅ Consistent naming conventions
- ✅ Evidence-based debugging
- ✅ Proper tool usage
- ✅ Real E2E test coverage

### Team Alignment

Everyone following gates means:

- 📝 Predictable code patterns
- 🔍 Easier code review
- 🐛 Fewer bugs in production
- 🚀 Faster onboarding for new devs

---

## Getting Help with Gates

If you're unsure about a gate:

1. Read the full documentation in `.claude/rules/<GATE-NAME>.md`
2. Check the [Patterns Documentation](/docs/patterns) for examples
3. Look for historical incidents in the gate docs
4. Ask your team lead

**Remember**: These gates exist because we learned the hard way. Following them is not optional.

---

**Next**: Learn about [Development Patterns](/docs/patterns) and [Testing Standards](/docs/testing).
